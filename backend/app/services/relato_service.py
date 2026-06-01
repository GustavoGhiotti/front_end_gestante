import json
from datetime import UTC, date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.alerta import Alerta
from app.models.user import User
from app.repositories.gestante_repository import GestanteRepository
from app.repositories.relato_repository import RelatoRepository
from app.schemas.relato import RelatoCreateRequest, RelatoResponse
from app.services.push_service import PushService


HIGH_RISK_ALERT_SYMPTOMS = {"pressao alta", "visao embacada", "sangramento", "falta de ar", "convulsao"}
MEDIUM_RISK_ALERT_SYMPTOMS = {"dor de cabeca", "cefaleia", "inchaco", "contracoes", "tontura"}


class RelatoService:
    def __init__(self, db: Session):
        self.db = db
        self.gestante_repo = GestanteRepository(db)
        self.relato_repo = RelatoRepository(db)

    def _resolve_gestante_id(self, user: User) -> str:
        if user.role != "gestante":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso permitido apenas para gestantes.")

        gestante = self.gestante_repo.get_by_user_id(user.id)
        if not gestante:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil gestacional não encontrado.")
        return gestante.id

    def list_me(self, user: User, periodo: str = "todos") -> list[RelatoResponse]:
        gestante_id = self._resolve_gestante_id(user)
        relatos = self.relato_repo.list_by_gestante(gestante_id)

        if periodo in {"7d", "30d"}:
            dias = 7 if periodo == "7d" else 30
            cutoff = date.today() - timedelta(days=dias)
            relatos = [r for r in relatos if r.data_relato >= cutoff]

        return [self._to_response(r) for r in relatos]

    def get_me_by_id(self, user: User, relato_id: str) -> RelatoResponse:
        gestante_id = self._resolve_gestante_id(user)
        relato = self.relato_repo.get_by_id_and_gestante(relato_id, gestante_id)
        if not relato:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relato não encontrado.")
        return self._to_response(relato)

    def create_or_update_me(self, user: User, payload: RelatoCreateRequest) -> RelatoResponse:
        gestante_id = self._resolve_gestante_id(user)
        existing = self.relato_repo.get_by_date(gestante_id, payload.data)

        if existing:
            existing.humor = payload.humor
            existing.sintomas_json = json.dumps(payload.sintomas, ensure_ascii=False)
            existing.descricao = payload.descricao or None
            existing.nota_complementar = payload.nota_complementar or None
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
            return self._to_response(existing)

        gestante = self.gestante_repo.get_by_user_id(user.id)
        if not gestante:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil gestacional nÃ£o encontrado.")

        relato = self.relato_repo.create(
            gestante_id=gestante_id,
            data_relato=payload.data,
            humor=payload.humor,
            sintomas_json=json.dumps(payload.sintomas, ensure_ascii=False),
            descricao=payload.descricao or None,
            nota_complementar=payload.nota_complementar or None,
        )
        created_alert = self._maybe_create_doctor_alert(gestante.id, gestante.nome_completo, gestante.semanas_gestacao_atual, payload)
        self.db.commit()
        self.db.refresh(relato)
        if created_alert:
            PushService.notify_new_report_alert(
                self.db,
                gestante,
                payload.sintomas,
                payload.data.isoformat(),
            )
            self.db.commit()
        return self._to_response(relato)

    def _maybe_create_doctor_alert(
        self,
        gestante_id: str,
        patient_name: str,
        gestational_weeks: int | None,
        payload: RelatoCreateRequest,
    ) -> bool:
        if not payload.sintomas:
            return False

        lowered = {item.lower() for item in payload.sintomas}
        severity = "medium"
        if lowered & HIGH_RISK_ALERT_SYMPTOMS:
            severity = "high"
        elif lowered & MEDIUM_RISK_ALERT_SYMPTOMS:
            severity = "medium"
        else:
            severity = "low"

        self.db.add(
            Alerta(
                gestante_id=gestante_id,
                patient_name=patient_name,
                patient_ig=f"{gestational_weeks or 0}s",
                tipo="Novo relato com sintomas",
                severity=severity,
                status="pending",
                metric_label="Sintomas relatados",
                metric_value=", ".join(payload.sintomas[:4]),
                created_at_event=datetime.now(UTC),
            )
        )
        return True

    @staticmethod
    def _to_response(relato) -> RelatoResponse:
        try:
            sintomas = json.loads(relato.sintomas_json) if relato.sintomas_json else []
        except json.JSONDecodeError:
            sintomas = []

        return RelatoResponse(
            id=relato.id,
            gestante_id=relato.gestante_id,
            data=relato.data_relato,
            humor=relato.humor,
            sintomas=sintomas,
            descricao=relato.descricao,
            nota_complementar=relato.nota_complementar,
            created_at=relato.created_at,
            updated_at=relato.updated_at,
        )
