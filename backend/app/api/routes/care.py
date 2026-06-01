import base64
import binascii
import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import and_, desc, func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.alerta import Alerta, AlertaNota
from app.models.consulta import Consulta
from app.models.exame_arquivo import ExameArquivo
from app.models.gestante import Gestante
from app.models.medicamento import Medicamento
from app.models.orientacao import Orientacao
from app.models.prontuario import Prontuario
from app.models.relato import RelatoDiario
from app.models.resumo_ia import ResumoIA
from app.models.user import User
from app.schemas.notifications import (
    NotificationTestOut,
    PushPublicKeyOut,
    PushSubscriptionDeleteIn,
    PushSubscriptionIn,
)
from app.schemas.care import (
    AICalibrationCaseOut,
    AICalibrationRunOut,
    AIStatusOut,
    AlertNoteIn,
    AlertNoteOut,
    AlertOut,
    AlertsKPIOut,
    CadastroGestanteIn,
    CadastroGestanteOut,
    ConsultaIn,
    ConsultaOut,
    ExameArquivoIn,
    ExameArquivoOut,
    MedicoKPIOut,
    MedicoPacienteOut,
    MedicamentoControleIn,
    MedicamentoControleOut,
    MedicamentoIn,
    MedicamentoOut,
    MedicamentoUpdateIn,
    OrientacaoIn,
    OrientacaoOut,
    ProntuarioIn,
    ProntuarioOut,
    ProntuarioUpdateIn,
    RelatoClinicoUpdateIn,
    ResumoGerarIn,
    ResumoOut,
    ResumoReviewIn,
)
from app.services.clinical_ai_service import generate_clinical_summary, get_ai_runtime_status, run_calibration_suite
from app.services.push_service import PushService, require_push_available

router = APIRouter(tags=["Care"])

UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads" / "exames"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _require_role(user: User, role: str):
    if user.role != role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado para esse perfil.")


def _get_gestante_by_user(db: Session, user_id: str) -> Gestante:
    gestante = db.scalar(select(Gestante).where(Gestante.user_id == user_id))
    if not gestante:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gestante nao encontrada.")
    return gestante


def _get_gestante_by_id(db: Session, gestante_id: str) -> Gestante:
    gestante = db.scalar(select(Gestante).where(Gestante.id == gestante_id))
    if not gestante:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gestante nao encontrada.")
    return gestante


def _semaforo_from_alerts(alerts: list[str]) -> str:
    if any(a in {"pressao alta", "edema severo", "sangramento", "convulsao"} for a in alerts):
        return "vermelho"
    if any(a in {"tontura", "contracoes", "cefaleia", "dor de cabeca"} for a in alerts):
        return "amarelo"
    return "verde"


def _map_resumo_out(resumo: ResumoIA, *, for_patient: bool) -> ResumoOut:
    resumo_texto = resumo.resumo_aprovado_texto if for_patient and resumo.resumo_aprovado_texto else resumo.resumo_texto
    recomendacoes = (
        resumo.recomendacoes_aprovadas
        if for_patient and resumo.recomendacoes_aprovadas
        else (resumo.recomendacoes or "")
    )
    return ResumoOut(
        id=resumo.id,
        gestanteId=resumo.gestante_id,
        relatoId=resumo.id,
        data=resumo.gerado_em.date(),
        tipo="semanal",
        semaforo=(resumo.nivel_alerta if resumo.nivel_alerta in {"verde", "amarelo", "vermelho"} else "verde"),
        resumo=resumo_texto,
        sintomasIdentificados=json.loads(resumo.sintomas_identificados_json or "[]"),
        avisos=json.loads(resumo.avisos_json or "[]"),
        recomendacoes=recomendacoes,
        status=(resumo.status if resumo.status in {"pending", "approved"} else "pending"),
        aprovadoEm=resumo.revisado_em,
    )


def _map_ai_status_out() -> AIStatusOut:
    status = get_ai_runtime_status()
    return AIStatusOut(
        enabled=status.enabled,
        provider=status.provider,
        model=status.model,
        baseUrl=status.base_url,
        providerReachable=status.provider_reachable,
        status=status.status,
        calibrationExamples=status.calibration_examples,
        validationCases=status.validation_cases,
        message=status.message,
    )


def _map_ai_calibration_run_out() -> AICalibrationRunOut:
    run = run_calibration_suite()
    return AICalibrationRunOut(
        provider=run.provider,
        model=run.model,
        executedAt=run.executed_at,
        providerReachable=run.provider_reachable,
        totalCases=run.total_cases,
        passedCases=run.passed_cases,
        message=run.message,
        cases=[
            AICalibrationCaseOut(
                name=item.name,
                expectedSemaphore=item.expected_semaphore,
                actualSemaphore=item.actual_semaphore,
                semaphoreMatch=item.semaphore_match,
                expectedSymptoms=item.expected_symptoms,
                actualSymptoms=item.actual_symptoms,
                matchedSymptoms=item.matched_symptoms,
                passed=item.passed,
            )
            for item in run.cases
        ],
    )

def _get_medicamento_by_id(db: Session, medicamento_id: str) -> Medicamento:
    med = db.scalar(select(Medicamento).where(Medicamento.id == medicamento_id))
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicamento nao encontrado.")
    return med


def _map_medicamento_out(med: Medicamento) -> MedicamentoOut:
    return MedicamentoOut(
        id=med.id,
        gestanteId=med.gestante_id,
        nome=med.nome,
        dosagem=med.dosagem,
        frequencia=med.frequencia,
        dataInicio=med.data_inicio,
        dataFim=med.data_fim,
        dataPrescricao=(med.data_inicio or date.today()),
        ativo=med.ativo,
        observacoes=med.observacoes,
        lembreteAtivo=bool(med.lembrete_ativo),
        horarioLembrete=med.horario_lembrete,
        tomadoHoje=bool(med.tomado_hoje),
        tomadoHojeEm=med.tomado_hoje_em,
    )


def _map_medicamento_controle_out(med: Medicamento) -> MedicamentoControleOut:
    return MedicamentoControleOut(
        medicamentoId=med.id,
        lembreteAtivo=bool(med.lembrete_ativo),
        horarioLembrete=med.horario_lembrete,
        tomadoHoje=bool(med.tomado_hoje),
        tomadoHojeEm=med.tomado_hoje_em,
    )


def _get_prontuario_by_id(db: Session, prontuario_id: str) -> Prontuario:
    prontuario = db.scalar(select(Prontuario).where(Prontuario.id == prontuario_id))
    if not prontuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prontuario nao encontrado.")
    return prontuario


def _get_relato_by_id(db: Session, relato_id: str) -> RelatoDiario:
    relato = db.scalar(select(RelatoDiario).where(RelatoDiario.id == relato_id))
    if not relato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relato nao encontrado.")
    return relato


def _get_exame_by_id(db: Session, exame_id: str) -> ExameArquivo:
    exame = db.scalar(select(ExameArquivo).where(ExameArquivo.id == exame_id))
    if not exame:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exame nao encontrado.")
    return exame


def _map_exame_out(exame: ExameArquivo) -> ExameArquivoOut:
    return ExameArquivoOut(
        id=exame.id,
        gestanteId=exame.gestante_id,
        titulo=exame.titulo,
        tipoExame=exame.tipo_exame,
        dataExame=exame.data_exame,
        observacoes=exame.observacoes,
        nomeArquivo=exame.nome_arquivo,
        mimeType=exame.mime_type,
        tamanhoBytes=exame.tamanho_bytes,
        enviadoEm=exame.created_at,
    )


def _map_relato_detail_out(relato: RelatoDiario, gestante_id: str) -> dict:
    return {
        "id": relato.id,
        "patientId": gestante_id,
        "date": datetime.combine(relato.data_relato, datetime.min.time()).replace(tzinfo=UTC).isoformat(),
        "description": relato.descricao or "",
        "complementaryNote": relato.nota_complementar or "",
        "mood": relato.humor,
        "symptoms": json.loads(relato.sintomas_json or "[]"),
        "clinicalPriority": (
            relato.prioridade_clinica
            if relato.prioridade_clinica in {"baixa", "normal", "alta", "critica"}
            else "normal"
        ),
        "highlightForConsultation": bool(relato.destaque_consulta),
        "priorityReason": relato.motivo_prioridade,
        "doctorNote": relato.nota_medica,
    }


def _map_prontuario_out(record: Prontuario) -> ProntuarioOut:
    return ProntuarioOut(
        id=record.id,
        gestanteId=record.gestante_id,
        data=record.data.date(),
        descricao=record.descricao,
        medicamentosPrescritos=json.loads(record.medicamentos_prescritos_json or "[]"),
        acoesRealizadas=record.acoes_realizadas or "",
        medicoId=record.medico_id,
    )


def _parse_cadastro_gestante(raw_value: str | None) -> CadastroGestanteOut:
    default = CadastroGestanteOut()
    if not raw_value:
        return default
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        return CadastroGestanteOut(additionalNotes=raw_value)
    if isinstance(parsed, dict) and "profile" in parsed and isinstance(parsed["profile"], dict):
        return CadastroGestanteOut.model_validate(parsed["profile"])
    if isinstance(parsed, dict):
        return CadastroGestanteOut.model_validate(parsed)
    return default


def _serialize_cadastro_gestante(payload: CadastroGestanteIn) -> str:
    return json.dumps({"profile": payload.model_dump()}, ensure_ascii=False)


@router.get("/medicamentos/me", response_model=list[MedicamentoOut])
def medicamentos_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)
    meds = list(db.scalars(select(Medicamento).where(Medicamento.gestante_id == gestante.id).order_by(desc(Medicamento.created_at))))
    return [_map_medicamento_out(m) for m in meds]


@router.get("/notifications/public-key", response_model=PushPublicKeyOut)
def notifications_public_key():
    return PushPublicKeyOut(publicKey=PushService.public_key(), enabled=PushService.is_available())


@router.post("/notifications/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def register_notifications_subscription(
    payload: PushSubscriptionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_push_available()
    PushService.register_subscription(
        db,
        current_user,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.userAgent,
    )
    db.commit()


@router.delete("/notifications/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def remove_notifications_subscription(
    payload: PushSubscriptionDeleteIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PushService.remove_subscription(db, current_user, endpoint=payload.endpoint)
    db.commit()


@router.post("/notifications/test", response_model=NotificationTestOut)
def send_test_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_push_available()
    delivered = PushService.send_test_to_current_user(db, current_user)
    db.commit()
    return NotificationTestOut(
        delivered=delivered,
        detail=("Notificacao de teste enviada." if delivered else "Nenhuma assinatura valida encontrada para este usuario."),
    )


@router.get("/medicamentos/me/controles", response_model=list[MedicamentoControleOut])
def medicamentos_me_controles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)
    meds = list(db.scalars(select(Medicamento).where(Medicamento.gestante_id == gestante.id).order_by(desc(Medicamento.created_at))))
    return [_map_medicamento_controle_out(m) for m in meds]


@router.post("/medicamentos", response_model=MedicamentoOut)
def create_medicamento(payload: MedicamentoIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    _get_gestante_by_id(db, payload.gestanteId)

    med = Medicamento(
        gestante_id=payload.gestanteId,
        medico_id=current_user.id,
        nome=payload.nome,
        dosagem=payload.dosagem,
        frequencia=payload.frequencia,
        data_inicio=payload.dataInicio,
        data_fim=payload.dataFim,
        ativo=payload.ativo,
        observacoes=payload.observacoes,
    )
    db.add(med)
    db.commit()
    db.refresh(med)

    return _map_medicamento_out(med)


@router.patch("/medicamentos/{medicamento_id}", response_model=MedicamentoOut)
def update_medicamento(
    medicamento_id: str,
    payload: MedicamentoUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "medico")
    med = _get_medicamento_by_id(db, medicamento_id)

    if payload.nome is not None:
        med.nome = payload.nome
    if payload.dosagem is not None:
        med.dosagem = payload.dosagem
    if payload.frequencia is not None:
        med.frequencia = payload.frequencia
    if payload.dataInicio is not None:
        med.data_inicio = payload.dataInicio
    if payload.dataFim is not None:
        med.data_fim = payload.dataFim
    if payload.ativo is not None:
        med.ativo = payload.ativo
    if payload.observacoes is not None:
        med.observacoes = payload.observacoes

    db.commit()
    db.refresh(med)
    return _map_medicamento_out(med)


@router.patch("/medicamentos/{medicamento_id}/controle", response_model=MedicamentoControleOut)
def update_medicamento_controle(
    medicamento_id: str,
    payload: MedicamentoControleIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)
    med = _get_medicamento_by_id(db, medicamento_id)
    if med.gestante_id != gestante.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado a este medicamento.")

    if payload.lembreteAtivo is not None:
        med.lembrete_ativo = payload.lembreteAtivo
        if not payload.lembreteAtivo:
            med.horario_lembrete = None
    if payload.horarioLembrete is not None:
        med.horario_lembrete = payload.horarioLembrete or None
    if payload.tomadoHoje is not None:
        med.tomado_hoje = payload.tomadoHoje
        med.tomado_hoje_em = datetime.now(UTC) if payload.tomadoHoje else None

    db.add(med)
    db.commit()
    db.refresh(med)
    return _map_medicamento_controle_out(med)


@router.post("/medicamentos/{medicamento_id}/lembrete-teste", response_model=NotificationTestOut)
def send_medicamento_test_notification(
    medicamento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "gestante")
    require_push_available()
    med = _get_medicamento_by_id(db, medicamento_id)
    gestante = _get_gestante_by_user(db, current_user.id)
    if med.gestante_id != gestante.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado a este medicamento.")

    delivered = PushService.send_medication_test(db, current_user, med)
    db.commit()
    return NotificationTestOut(
        delivered=delivered,
        detail=("Notificacao de teste enviada." if delivered else "Nenhuma assinatura valida encontrada para este usuario."),
    )


@router.delete("/medicamentos/{medicamento_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medicamento(
    medicamento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "medico")
    med = _get_medicamento_by_id(db, medicamento_id)
    db.delete(med)
    db.commit()


@router.get("/consultas/me", response_model=list[ConsultaOut])
def consultas_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)
    consultas = list(db.scalars(select(Consulta).where(Consulta.gestante_id == gestante.id).order_by(desc(Consulta.data_hora))))
    return [
        ConsultaOut(
            id=c.id,
            gestanteId=c.gestante_id,
            data=c.data_hora.date(),
            tipo=(c.tipo if c.tipo in {"ultrassom", "pressao", "rotina", "emergencia"} else "rotina"),
            observacoes=c.observacoes,
            status=c.status,
        )
        for c in consultas
    ]


@router.post("/consultas", response_model=ConsultaOut)
def create_consulta(payload: ConsultaIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    _get_gestante_by_id(db, payload.gestanteId)
    c = Consulta(
        gestante_id=payload.gestanteId,
        medico_id=current_user.id,
        data_hora=datetime.combine(payload.data, datetime.min.time()).replace(tzinfo=UTC),
        tipo=payload.tipo,
        status="agendada",
        observacoes=payload.observacoes,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return ConsultaOut(
        id=c.id,
        gestanteId=c.gestante_id,
        data=c.data_hora.date(),
        tipo=payload.tipo,
        observacoes=c.observacoes,
        status=c.status,
    )


@router.get("/orientacoes/me", response_model=list[OrientacaoOut])
def orientacoes_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)
    data = list(db.scalars(select(Orientacao).where(Orientacao.gestante_id == gestante.id).order_by(desc(Orientacao.data))))
    return [
        OrientacaoOut(
            id=o.id,
            gestanteId=o.gestante_id,
            medicoId=o.medico_id,
            data=o.data.date(),
            texto=o.texto,
        )
        for o in data
    ]


@router.post("/orientacoes", response_model=OrientacaoOut)
def create_orientacao(payload: OrientacaoIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    _get_gestante_by_id(db, payload.gestanteId)
    o = Orientacao(
        gestante_id=payload.gestanteId,
        medico_id=current_user.id,
        data=datetime.combine(payload.data, datetime.min.time()).replace(tzinfo=UTC),
        texto=payload.texto,
        prioridade="normal",
    )
    db.add(o)
    db.commit()
    db.refresh(o)
    return OrientacaoOut(id=o.id, gestanteId=o.gestante_id, medicoId=o.medico_id, data=o.data.date(), texto=o.texto)


@router.get("/exames/me", response_model=list[ExameArquivoOut])
def exames_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)
    exames = list(
        db.scalars(
            select(ExameArquivo)
            .where(ExameArquivo.gestante_id == gestante.id)
            .order_by(desc(ExameArquivo.data_exame), desc(ExameArquivo.created_at))
        )
    )
    return [_map_exame_out(item) for item in exames]


@router.post("/exames", response_model=ExameArquivoOut, status_code=status.HTTP_201_CREATED)
def create_exame(payload: ExameArquivoIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)

    if payload.mimeType != "application/pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas arquivos PDF sao permitidos.")

    raw_base64 = payload.conteudoBase64.split(",", 1)[-1]
    try:
        content = base64.b64decode(raw_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conteudo do arquivo invalido.")

    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O arquivo enviado nao parece ser um PDF valido.")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O PDF excede o limite de 10 MB.")

    saved_name = f"{gestante.id}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}-{Path(payload.nomeArquivo).name}"
    file_path = UPLOADS_DIR / saved_name
    file_path.write_bytes(content)

    exame = ExameArquivo(
        gestante_id=gestante.id,
        uploaded_by_user_id=current_user.id,
        titulo=payload.titulo.strip(),
        tipo_exame=payload.tipoExame.strip() if payload.tipoExame else None,
        data_exame=payload.dataExame,
        observacoes=payload.observacoes.strip() if payload.observacoes else None,
        nome_arquivo=Path(payload.nomeArquivo).name,
        nome_arquivo_salvo=saved_name,
        mime_type=payload.mimeType,
        tamanho_bytes=len(content),
    )
    db.add(exame)
    db.commit()
    db.refresh(exame)
    return _map_exame_out(exame)


@router.get("/medicos/pacientes/{gestante_id}/exames", response_model=list[ExameArquivoOut])
def medico_list_exames(gestante_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    _get_gestante_by_id(db, gestante_id)
    exames = list(
        db.scalars(
            select(ExameArquivo)
            .where(ExameArquivo.gestante_id == gestante_id)
            .order_by(desc(ExameArquivo.data_exame), desc(ExameArquivo.created_at))
        )
    )
    return [_map_exame_out(item) for item in exames]


@router.get("/exames/{exame_id}/download")
def download_exame(exame_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exame = _get_exame_by_id(db, exame_id)

    if current_user.role == "gestante":
        gestante = _get_gestante_by_user(db, current_user.id)
        if exame.gestante_id != gestante.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado para esse exame.")
    elif current_user.role != "medico":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado para esse exame.")

    file_path = UPLOADS_DIR / exame.nome_arquivo_salvo
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo do exame nao encontrado.")

    return FileResponse(path=file_path, media_type=exame.mime_type, filename=exame.nome_arquivo)


@router.get("/prontuarios/me", response_model=list[ProntuarioOut])
def prontuarios_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)
    rows = list(db.scalars(select(Prontuario).where(Prontuario.gestante_id == gestante.id).order_by(desc(Prontuario.data))))
    return [_map_prontuario_out(r) for r in rows]


@router.post("/prontuarios", response_model=ProntuarioOut)
def create_prontuario(payload: ProntuarioIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    _get_gestante_by_id(db, payload.gestanteId)
    r = Prontuario(
        gestante_id=payload.gestanteId,
        medico_id=current_user.id,
        data=datetime.combine(payload.data, datetime.min.time()).replace(tzinfo=UTC),
        descricao=payload.descricao,
        medicamentos_prescritos_json=json.dumps(payload.medicamentosPrescritos, ensure_ascii=False),
        acoes_realizadas=payload.acoesRealizadas,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _map_prontuario_out(r)


@router.patch("/prontuarios/{prontuario_id}", response_model=ProntuarioOut)
def update_prontuario(
    prontuario_id: str,
    payload: ProntuarioUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "medico")
    prontuario = _get_prontuario_by_id(db, prontuario_id)

    if payload.data is not None:
        prontuario.data = datetime.combine(payload.data, datetime.min.time()).replace(tzinfo=UTC)
    if payload.descricao is not None:
        prontuario.descricao = payload.descricao
    if payload.medicamentosPrescritos is not None:
        prontuario.medicamentos_prescritos_json = json.dumps(payload.medicamentosPrescritos, ensure_ascii=False)
    if payload.acoesRealizadas is not None:
        prontuario.acoes_realizadas = payload.acoesRealizadas
    if payload.medicoId is not None:
        prontuario.medico_id = payload.medicoId

    db.commit()
    db.refresh(prontuario)
    return _map_prontuario_out(prontuario)


@router.delete("/prontuarios/{prontuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prontuario(
    prontuario_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "medico")
    prontuario = _get_prontuario_by_id(db, prontuario_id)
    db.delete(prontuario)
    db.commit()


@router.patch("/medicos/relatos/{relato_id}")
def update_relato_clinico(
    relato_id: str,
    payload: RelatoClinicoUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "medico")
    relato = _get_relato_by_id(db, relato_id)

    if payload.clinicalPriority is not None:
        relato.prioridade_clinica = payload.clinicalPriority
    if payload.highlightForConsultation is not None:
        relato.destaque_consulta = payload.highlightForConsultation
    if payload.priorityReason is not None:
        relato.motivo_prioridade = payload.priorityReason or None
    if payload.doctorNote is not None:
        relato.nota_medica = payload.doctorNote or None

    db.commit()
    db.refresh(relato)
    return _map_relato_detail_out(relato, relato.gestante_id)


@router.get("/resumos-ia/me", response_model=list[ResumoOut])
def resumos_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "gestante")
    gestante = _get_gestante_by_user(db, current_user.id)
    rows = list(
        db.scalars(
            select(ResumoIA)
            .where(and_(ResumoIA.gestante_id == gestante.id, ResumoIA.status == "approved"))
            .order_by(desc(ResumoIA.gerado_em))
        )
    )
    return [_map_resumo_out(r, for_patient=True) for r in rows]


@router.post("/resumos-ia/gerar", response_model=ResumoOut)
def gerar_resumo(payload: ResumoGerarIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    gestante = _get_gestante_by_id(db, payload.gestanteId)

    relatos = list(
        db.scalars(
            select(RelatoDiario).where(
                and_(
                    RelatoDiario.gestante_id == gestante.id,
                    RelatoDiario.data_relato >= payload.periodo_inicio.date(),
                    RelatoDiario.data_relato <= payload.periodo_fim.date(),
                )
            )
        )
    )
    ai_result = generate_clinical_summary(
        gestante=gestante,
        relatos=relatos,
        start=payload.periodo_inicio.date(),
        end=payload.periodo_fim.date(),
    )

    resumo = ResumoIA(
        gestante_id=gestante.id,
        periodo_inicio=payload.periodo_inicio,
        periodo_fim=payload.periodo_fim,
        resumo_texto=ai_result.summary_text,
        nivel_alerta=ai_result.semaphore,
        sintomas_identificados_json=json.dumps(ai_result.identified_symptoms, ensure_ascii=False),
        avisos_json=json.dumps(ai_result.alerts, ensure_ascii=False),
        recomendacoes=ai_result.recommendations,
        status="pending",
        gerado_em=datetime.now(UTC),
    )
    db.add(resumo)
    db.commit()
    db.refresh(resumo)

    return _map_resumo_out(resumo, for_patient=False)


@router.get("/medicos/pacientes/{gestante_id}/resumos-ia", response_model=list[ResumoOut])
def medico_resumos_paciente(gestante_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    gestante = _get_gestante_by_id(db, gestante_id)
    rows = list(
        db.scalars(
            select(ResumoIA)
            .where(ResumoIA.gestante_id == gestante.id)
            .order_by(desc(ResumoIA.gerado_em))
        )
    )
    return [_map_resumo_out(r, for_patient=False) for r in rows]


@router.patch("/medicos/resumos-ia/{resumo_id}/aprovar", response_model=ResumoOut)
def aprovar_resumo_ia(
    resumo_id: str, payload: ResumoReviewIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    _require_role(current_user, "medico")
    resumo = db.scalar(select(ResumoIA).where(ResumoIA.id == resumo_id))
    if not resumo:
        raise HTTPException(status_code=404, detail="Resumo nao encontrado")

    resumo.status = "approved"
    resumo.resumo_aprovado_texto = (payload.resumo.strip() if payload.resumo and payload.resumo.strip() else resumo.resumo_texto)
    resumo.recomendacoes_aprovadas = (
        payload.recomendacoes.strip()
        if payload.recomendacoes and payload.recomendacoes.strip()
        else (resumo.recomendacoes or "")
    )
    resumo.revisado_por_medico_id = current_user.id
    resumo.revisado_em = datetime.now(UTC)
    db.add(resumo)
    db.commit()
    db.refresh(resumo)
    return _map_resumo_out(resumo, for_patient=False)


@router.delete("/medicos/resumos-ia/{resumo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resumo_ia(
    resumo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "medico")
    resumo = db.scalar(select(ResumoIA).where(ResumoIA.id == resumo_id))
    if not resumo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resumo nao encontrado")

    db.delete(resumo)
    db.commit()


@router.get("/medicos/ia/status", response_model=AIStatusOut)
def medico_ai_status(current_user: User = Depends(get_current_user)):
    _require_role(current_user, "medico")
    return _map_ai_status_out()


@router.post("/medicos/ia/calibracao/executar", response_model=AICalibrationRunOut)
def medico_ai_calibracao(current_user: User = Depends(get_current_user)):
    _require_role(current_user, "medico")
    return _map_ai_calibration_run_out()


@router.get("/medicos/pacientes", response_model=list[MedicoPacienteOut])
def medicos_pacientes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    gestantes = list(db.scalars(select(Gestante).order_by(Gestante.nome_completo.asc())))
    out: list[MedicoPacienteOut] = []
    for g in gestantes:
        user = db.scalar(select(User).where(User.id == g.user_id))
        last_relato = db.scalar(
            select(RelatoDiario).where(RelatoDiario.gestante_id == g.id).order_by(desc(RelatoDiario.data_relato)).limit(1)
        )
        pending = list(
            db.scalars(select(Alerta).where(and_(Alerta.gestante_id == g.id, Alerta.status == "pending")))
        )
        level = "none"
        if any(a.severity == "high" for a in pending):
            level = "high"
        elif any(a.severity == "medium" for a in pending):
            level = "medium"
        elif any(a.severity == "low" for a in pending):
            level = "low"

        out.append(
            MedicoPacienteOut(
                id=g.id,
                name=g.nome_completo,
                cpf=f"***.{(g.id or '000')[-3:]}.***-**",
                age=30,
                gestationalWeeks=g.semanas_gestacao_atual,
                gestationalDays=0,
                lastReportDate=(
                    datetime.combine(last_relato.data_relato, datetime.min.time()).replace(tzinfo=UTC)
                    if last_relato
                    else None
                ),
                alertLevel=level,
                alertFlags=[a.tipo for a in pending][:4],
                isActive=(user.ativo if user else True),
                dueDate=g.dpp,
            )
        )
    return out


@router.get("/medicos/alerts", response_model=list[AlertOut])
def medicos_alerts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    alerts = list(db.scalars(select(Alerta).order_by(desc(Alerta.created_at_event))))
    out: list[AlertOut] = []
    for a in alerts:
        notes = list(db.scalars(select(AlertaNota).where(AlertaNota.alerta_id == a.id).order_by(AlertaNota.created_at_note.asc())))
        out.append(
            AlertOut(
                id=a.id,
                patientId=a.gestante_id,
                patientName=a.patient_name,
                patientIG=a.patient_ig,
                type=a.tipo,
                severity=(a.severity if a.severity in {"high", "medium", "low"} else "low"),
                status=(a.status if a.status in {"pending", "reviewed"} else "pending"),
                createdAt=a.created_at_event,
                metricLabel=a.metric_label,
                metricValue=a.metric_value,
                notes=[
                    AlertNoteOut(
                        id=n.id,
                        text=n.text,
                        createdAt=n.created_at_note,
                        authorName=n.author_name,
                    )
                    for n in notes
                ],
            )
        )
    return out


@router.get("/medicos/alerts/kpi", response_model=AlertsKPIOut)
def medicos_alerts_kpi(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)

    pending_today = db.scalar(
        select(func.count(Alerta.id)).where(and_(Alerta.status == "pending", Alerta.created_at_event >= today_start))
    ) or 0
    pending_total = db.scalar(select(func.count(Alerta.id)).where(Alerta.status == "pending")) or 0
    critical_total = db.scalar(
        select(func.count(Alerta.id)).where(and_(Alerta.status == "pending", Alerta.severity == "high"))
    ) or 0

    oldest_pending = db.scalar(
        select(Alerta).where(Alerta.status == "pending").order_by(Alerta.created_at_event.asc()).limit(1)
    )
    avg_hours = int((now - oldest_pending.created_at_event).total_seconds() / 3600) if oldest_pending else 0

    return AlertsKPIOut(
        pendingToday=int(pending_today),
        pendingTotal=int(pending_total),
        criticalTotal=int(critical_total),
        avgHoursSinceAlert=max(avg_hours, 0),
    )


@router.patch("/medicos/alerts/{alert_id}/revisar")
def revisar_alert(alert_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    alert = db.scalar(select(Alerta).where(Alerta.id == alert_id))
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    alert.status = "reviewed"
    db.add(alert)
    db.commit()
    return {"message": "ok"}


@router.post("/medicos/alerts/{alert_id}/notes", response_model=AlertNoteOut)
def add_alert_note(alert_id: str, payload: AlertNoteIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    alert = db.scalar(select(Alerta).where(Alerta.id == alert_id))
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")

    note = AlertaNota(
        alerta_id=alert.id,
        text=payload.text,
        author_name=current_user.email,
        created_at_note=datetime.now(UTC),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return AlertNoteOut(id=note.id, text=note.text, createdAt=note.created_at_note, authorName=note.author_name)


@router.get("/medicos/kpi", response_model=MedicoKPIOut)
def medico_kpi(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    today = date.today()
    new_reports = db.scalar(select(func.count(RelatoDiario.id)).where(RelatoDiario.data_relato == today)) or 0
    pending_alerts = db.scalar(select(func.count(Alerta.id)).where(Alerta.status == "pending")) or 0
    active = db.scalar(
        select(func.count(User.id)).join(Gestante, Gestante.user_id == User.id).where(User.ativo == True)  # noqa: E712
    ) or 0
    return MedicoKPIOut(newReportsToday=int(new_reports), pendingAlerts=int(pending_alerts), activePatients=int(active))


@router.get("/medicos/reports")
def medico_reports(period: str = "30d", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    days = 7 if period == "7d" else 90 if period == "90d" else 30
    start = date.today() - timedelta(days=days)

    relatos = list(db.scalars(select(RelatoDiario).where(RelatoDiario.data_relato >= start)))
    alerts = list(db.scalars(select(Alerta).where(Alerta.created_at_event >= datetime.combine(start, datetime.min.time()).replace(tzinfo=UTC))))

    per_day: dict[str, int] = {}
    for r in relatos:
        key = r.data_relato.isoformat()
        per_day[key] = per_day.get(key, 0) + 1

    def series_for(sev: str):
        out: dict[str, int] = {}
        for a in alerts:
            if a.severity == sev:
                k = a.created_at_event.date().isoformat()
                out[k] = out.get(k, 0) + 1
        return [{"date": k, "value": out[k]} for k in sorted(out.keys())]

    patient_summary = []
    gestantes = list(db.scalars(select(Gestante)))
    for g in gestantes:
        rc = len([r for r in relatos if r.gestante_id == g.id])
        ac = len([a for a in alerts if a.gestante_id == g.id])
        patient_summary.append(
            {
                "id": g.id,
                "name": g.nome_completo,
                "ig": f"{g.semanas_gestacao_atual or 0}s",
                "reportCount": rc,
                "alertCount": ac,
                "lastRecord": None,
                "alertLevel": "high" if ac > 3 else "medium" if ac > 1 else "low" if ac == 1 else "none",
            }
        )

    return {
        "period": period,
        "kpi": {
            "activePatients": len(gestantes),
            "totalReports": len(relatos),
            "totalAlerts": len(alerts),
            "reviewedPct": int((len([a for a in alerts if a.status == 'reviewed']) / len(alerts)) * 100) if alerts else 0,
        },
        "reportsPerDay": [{"date": k, "value": per_day[k]} for k in sorted(per_day.keys())],
        "alertsHighPerDay": series_for("high"),
        "alertsMediumPerDay": series_for("medium"),
        "alertsLowPerDay": series_for("low"),
        "alertTypeDist": [
            {"type": t, "count": c}
            for t, c in sorted(
                {
                    a.tipo: len([x for x in alerts if x.tipo == a.tipo])
                    for a in alerts
                }.items(),
                key=lambda x: x[1],
                reverse=True,
            )
        ],
        "patientSummary": patient_summary,
    }

@router.get("/medicos/pacientes/{gestante_id}/detalhe")
def medico_paciente_detalhe(gestante_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_role(current_user, "medico")
    g = _get_gestante_by_id(db, gestante_id)

    relatos = list(db.scalars(select(RelatoDiario).where(RelatoDiario.gestante_id == g.id).order_by(desc(RelatoDiario.data_relato))))
    meds = list(db.scalars(select(Medicamento).where(Medicamento.gestante_id == g.id).order_by(desc(Medicamento.created_at))))
    records = list(db.scalars(select(Prontuario).where(Prontuario.gestante_id == g.id).order_by(desc(Prontuario.data))))
    top_symptoms: dict[str, int] = {}
    for r in relatos:
        for s in json.loads(r.sintomas_json or "[]"):
            top_symptoms[s] = top_symptoms.get(s, 0) + 1

    sorted_symptoms = sorted(top_symptoms.items(), key=lambda x: x[1], reverse=True)
    summary_text = (
        f"Paciente com {len(relatos)} relato(s) no periodo recente. "
        + (f"Sintomas frequentes: {', '.join([k for k, _ in sorted_symptoms[:3]])}." if sorted_symptoms else "Sem sintomas relevantes.")
    )

    patient = {
        "id": g.id,
        "name": g.nome_completo,
        "cpf": f"***.{g.id[-3:]}.***-**",
        "age": 30,
        "gestationalWeeks": g.semanas_gestacao_atual,
        "gestationalDays": 0,
        "lastReportDate": (datetime.combine(relatos[0].data_relato, datetime.min.time()).replace(tzinfo=UTC).isoformat() if relatos else None),
        "alertLevel": "high" if any(s.lower() in {"pressao alta", "edema severo"} for s in top_symptoms.keys()) else "medium" if len(top_symptoms) > 0 else "none",
        "alertFlags": [k for k, _ in sorted_symptoms[:3]],
        "isActive": True,
        "dueDate": (g.dpp.isoformat() if g.dpp else None),
        "phone": g.telefone,
        "address": "",
        "bloodType": g.tipo_sanguineo,
        "firstAppointmentDate": None,
    }

    reports = [_map_relato_detail_out(r, g.id) for r in relatos]
    medications = [
        {
            "id": m.id,
            "patientId": g.id,
            "name": m.nome,
            "dose": m.dosagem,
            "frequency": m.frequencia,
            "duration": "continuo",
            "startDate": (m.data_inicio.isoformat() if m.data_inicio else date.today().isoformat()),
            "endDate": (m.data_fim.isoformat() if m.data_fim else None),
            "notes": m.observacoes,
            "isActive": m.ativo,
            "prescribedBy": "Dr. Responsavel",
        }
        for m in meds
    ]
    medical_records = [
        {
            "id": r.id,
            "patientId": g.id,
            "date": r.data.isoformat(),
            "summary": r.descricao,
            "actions": [r.acoes_realizadas or ""],
            "nextAppointment": None,
            "doctorId": r.medico_id,
            "doctorName": "Dr. Responsavel",
        }
        for r in records
    ]

    timeline = [
        {
            "id": f"t-{r.id}",
            "patientId": g.id,
            "date": datetime.combine(r.data_relato, datetime.min.time()).replace(tzinfo=UTC).isoformat(),
            "type": "report",
            "description": (r.descricao or "Relato registrado"),
            "hasFlag": len(json.loads(r.sintomas_json or "[]")) > 0,
        }
        for r in relatos[:20]
    ]

    return {
        "patient": patient,
        "reports": reports,
        "medications": medications,
        "medicalRecords": medical_records,
        "prenatalProfile": _parse_cadastro_gestante(g.observacoes).model_dump(),
        "summary": {
            "patientId": g.id,
            "generatedAt": datetime.now(UTC).isoformat(),
            "summaryText": summary_text,
            "changesDetected": [k for k, _ in sorted_symptoms[:5]],
            "dataPoints": len(reports),
        },
        "timeline": timeline,
    }


@router.get("/medicos/pacientes/{gestante_id}/cadastro-prenatal", response_model=CadastroGestanteOut)
def medico_get_cadastro_prenatal(
    gestante_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "medico")
    gestante = _get_gestante_by_id(db, gestante_id)
    return _parse_cadastro_gestante(gestante.observacoes)


@router.patch("/medicos/pacientes/{gestante_id}/cadastro-prenatal", response_model=CadastroGestanteOut)
def medico_update_cadastro_prenatal(
    gestante_id: str,
    payload: CadastroGestanteIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "medico")
    gestante = _get_gestante_by_id(db, gestante_id)
    gestante.observacoes = _serialize_cadastro_gestante(payload)
    db.commit()
    db.refresh(gestante)
    return _parse_cadastro_gestante(gestante.observacoes)
