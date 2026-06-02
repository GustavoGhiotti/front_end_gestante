from __future__ import annotations

import base64
import json
import threading
import time
from datetime import UTC, datetime
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.gestante import Gestante
from app.models.medicamento import Medicamento
from app.models.push_subscription import PushSubscription
from app.models.user import User

try:
    from pywebpush import WebPushException, webpush
except ImportError:  # pragma: no cover - runtime fallback
    WebPushException = Exception
    webpush = None


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _normalize_push_key(value: str) -> str:
    normalized = (value or "").strip().replace("-", "+").replace("_", "/")
    padding = "=" * ((4 - (len(normalized) % 4)) % 4)
    return f"{normalized}{padding}"


def _ensure_vapid_keys() -> tuple[str, str]:
    private_path = Path(settings.vapid_private_key_path)
    public_path = Path(settings.vapid_public_key_path)
    private_path.parent.mkdir(parents=True, exist_ok=True)

    if private_path.exists() and public_path.exists():
        return private_path.read_text(encoding="utf-8"), public_path.read_text(encoding="utf-8").strip()

    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    public_numbers = private_key.public_key().public_numbers()
    public_bytes = b"\x04" + public_numbers.x.to_bytes(32, "big") + public_numbers.y.to_bytes(32, "big")
    public_key = _b64url(public_bytes)

    private_path.write_text(private_pem, encoding="utf-8")
    public_path.write_text(public_key, encoding="utf-8")
    return private_pem, public_key


_ensure_vapid_keys()
VAPID_PRIVATE_KEY_PATH = settings.vapid_private_key_path
VAPID_PUBLIC_KEY = Path(settings.vapid_public_key_path).read_text(encoding="utf-8").strip()


class PushService:
    _scheduler_started = False
    _scheduler_lock = threading.Lock()

    @staticmethod
    def is_available() -> bool:
        return settings.notifications_enabled and webpush is not None

    @staticmethod
    def public_key() -> str:
        return VAPID_PUBLIC_KEY

    @staticmethod
    def register_subscription(db: Session, user: User, endpoint: str, p256dh: str, auth: str, user_agent: str | None) -> None:
        normalized_p256dh = _normalize_push_key(p256dh)
        normalized_auth = _normalize_push_key(auth)
        existing = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == endpoint))
        if existing:
            existing.user_id = user.id
            existing.p256dh = normalized_p256dh
            existing.auth = normalized_auth
            existing.user_agent = user_agent
            db.add(existing)
            return

        db.add(
            PushSubscription(
                user_id=user.id,
                endpoint=endpoint,
                p256dh=normalized_p256dh,
                auth=normalized_auth,
                user_agent=user_agent,
            )
        )

    @staticmethod
    def remove_subscription(db: Session, user: User, endpoint: str) -> None:
        sub = db.scalar(
            select(PushSubscription).where(
                PushSubscription.endpoint == endpoint,
                PushSubscription.user_id == user.id,
            )
        )
        if sub:
            db.delete(sub)

    @staticmethod
    def send_to_user(db: Session, user_id: str, payload: dict) -> bool:
        subscriptions = list(db.scalars(select(PushSubscription).where(PushSubscription.user_id == user_id)))
        return PushService._send_to_subscriptions(db, subscriptions, payload)

    @staticmethod
    def diagnose_send_to_user(db: Session, user_id: str, payload: dict) -> dict:
        subscriptions = list(db.scalars(select(PushSubscription).where(PushSubscription.user_id == user_id)))
        return PushService._send_to_subscriptions_result(db, subscriptions, payload)

    @staticmethod
    def count_user_subscriptions(db: Session, user_id: str) -> int:
        return len(list(db.scalars(select(PushSubscription.id).where(PushSubscription.user_id == user_id))))

    @staticmethod
    def send_to_role(db: Session, role: str, payload: dict) -> bool:
        user_ids = list(db.scalars(select(User.id).where(User.role == role, User.ativo == True)))  # noqa: E712
        if not user_ids:
            return False
        subscriptions = list(db.scalars(select(PushSubscription).where(PushSubscription.user_id.in_(user_ids))))
        return PushService._send_to_subscriptions(db, subscriptions, payload)

    @staticmethod
    def send_test_to_current_user(db: Session, user: User) -> bool:
        payload = {
            "title": "GestaCare ativo neste dispositivo",
            "body": "As notificacoes web foram habilitadas para este usuario.",
            "url": "/doctor/alerts" if user.role == "medico" else "/gestante/medicamentos",
            "tag": f"gestacare-test-{user.role}",
        }
        return PushService.send_to_user(db, user.id, payload)

    @staticmethod
    def send_medication_test(db: Session, user: User, medication: Medicamento) -> bool:
        return PushService.send_to_user(
            db,
            user.id,
            {
                "title": "Lembrete de medicamento",
                "body": f"Hora de conferir {medication.nome} ({medication.dosagem}).",
                "url": "/gestante/medicamentos",
                "tag": f"medication-{medication.id}",
            },
        )

    @staticmethod
    def notify_new_report_alert(db: Session, gestante: Gestante, symptoms: list[str], report_date: str) -> bool:
        body = ", ".join(symptoms[:4]) if symptoms else "novo relato registrado"
        return PushService.send_to_role(
            db,
            "medico",
            {
                "title": "Novo alerta clinico",
                "body": f"{gestante.nome_completo} registrou relato com sintomas em {report_date}: {body}.",
                "url": "/doctor/alerts",
                "tag": f"doctor-alert-{gestante.id}-{report_date}",
            },
        )

    @staticmethod
    def _send_to_subscriptions(db: Session, subscriptions: list[PushSubscription], payload: dict) -> bool:
        return PushService._send_to_subscriptions_result(db, subscriptions, payload)["delivered"]

    @staticmethod
    def _send_to_subscriptions_result(db: Session, subscriptions: list[PushSubscription], payload: dict) -> dict:
        if not PushService.is_available() or not subscriptions:
            return {
                "delivered": False,
                "subscription_count": len(subscriptions),
                "delivered_count": 0,
                "errors": [],
            }

        delivered = False
        delivered_count = 0
        errors: list[str] = []
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {
                            "p256dh": _normalize_push_key(subscription.p256dh),
                            "auth": _normalize_push_key(subscription.auth),
                        },
                    },
                    data=json.dumps(payload, ensure_ascii=False),
                    vapid_private_key=VAPID_PRIVATE_KEY_PATH,
                    vapid_claims={"sub": settings.web_push_subject},
                )
                delivered = True
                delivered_count += 1
            except WebPushException as exc:  # pragma: no cover - network/runtime path
                status_code = getattr(getattr(exc, "response", None), "status_code", None)
                body = getattr(getattr(exc, "response", None), "text", "")
                detail = f"push provider error{f' {status_code}' if status_code else ''}"
                if body:
                  detail = f"{detail}: {str(body).strip()[:180]}"
                else:
                  detail = f"{detail}: {str(exc).strip()[:180]}"
                errors.append(detail)
                if status_code in {404, 410}:
                    db.delete(subscription)
            except Exception as exc:
                errors.append(f"unexpected push error: {str(exc).strip()[:180]}")
                continue
        return {
            "delivered": delivered,
            "subscription_count": len(subscriptions),
            "delivered_count": delivered_count,
            "errors": errors,
        }

    @staticmethod
    def start_scheduler() -> None:
        if not PushService.is_available():
            return
        with PushService._scheduler_lock:
            if PushService._scheduler_started:
                return
            thread = threading.Thread(target=PushService._scheduler_loop, name="gestacare-push-scheduler", daemon=True)
            thread.start()
            PushService._scheduler_started = True

    @staticmethod
    def _scheduler_loop() -> None:  # pragma: no cover - background loop
        while True:
            try:
                PushService._dispatch_due_medication_reminders()
            except Exception:
                pass
            time.sleep(max(settings.medication_reminder_poll_seconds, 15))

    @staticmethod
    def _dispatch_due_medication_reminders() -> None:  # pragma: no cover - background loop
        now = datetime.now()
        current_slot = now.strftime("%H:%M")
        db = SessionLocal()
        try:
            meds = list(
                db.scalars(
                    select(Medicamento).where(
                        Medicamento.ativo == True,  # noqa: E712
                        Medicamento.lembrete_ativo == True,  # noqa: E712
                        Medicamento.horario_lembrete == current_slot,
                    )
                )
            )
            for med in meds:
                if med.ultimo_lembrete_enviado_em and med.ultimo_lembrete_enviado_em.date() == datetime.now(UTC).date():
                    last_slot = med.ultimo_lembrete_enviado_em.strftime("%H:%M")
                    if last_slot == current_slot:
                        continue
                gestante = db.scalar(select(Gestante).where(Gestante.id == med.gestante_id))
                if not gestante:
                    continue
                owner = db.scalar(select(User).where(User.id == gestante.user_id))
                if not owner:
                    continue
                delivered = PushService.send_to_user(
                    db,
                    owner.id,
                    {
                        "title": "Hora do medicamento",
                        "body": f"Lembrete: {med.nome} ({med.dosagem}) agora as {current_slot}.",
                        "url": "/gestante/medicamentos",
                        "tag": f"medication-reminder-{med.id}",
                    },
                )
                if delivered:
                    med.ultimo_lembrete_enviado_em = datetime.now(UTC)
                    db.add(med)
            db.commit()
        finally:
            db.close()


def require_push_available() -> None:
    if not settings.notifications_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Notificacoes desativadas.")
    if webpush is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dependencia pywebpush nao instalada no backend.",
        )
