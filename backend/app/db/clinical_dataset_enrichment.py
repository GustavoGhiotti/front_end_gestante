import json
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alerta import Alerta
from app.models.consulta import Consulta
from app.models.gestante import Gestante
from app.models.medicamento import Medicamento
from app.models.orientacao import Orientacao
from app.models.prontuario import Prontuario
from app.models.relato import RelatoDiario
from app.models.resumo_ia import ResumoIA
from app.models.user import User


def enrich_clinical_dataset(db: Session) -> dict[str, int]:
    """
    Enrich demo/test records with realistic pregnancy narratives.

    Clinical patterns were calibrated against institutional patient guidance:
    ACOG on headaches in pregnancy, NHS guidance on edema and labour signs,
    and CDC urgent maternal warning signs.
    """

    counters = {
        "patients_touched": 0,
        "relatos_added": 0,
        "medications_added": 0,
        "consultas_added": 0,
        "orientacoes_added": 0,
        "prontuarios_added": 0,
        "alertas_added": 0,
        "resumos_added": 0,
    }

    doctor = db.scalar(select(User).where(User.email == "doctor@gestacare.com"))
    if not doctor:
        return counters

    users = list(db.scalars(select(User)))
    users_by_id = {user.id: user for user in users}
    gestantes = list(db.scalars(select(Gestante).order_by(Gestante.nome_completo)))
    if not gestantes:
        return counters

    for gestante in gestantes:
        touched = False
        owner = users_by_id.get(gestante.user_id)
        owner_email = owner.email if owner else ""

        if owner_email == "patient@gestacare.com" and gestante.nome_completo == "Juliana Ferreira":
            gestante.nome_completo = "Juliana Fernandes"
            gestante.observacoes = (
                "Paciente de teste principal para validacao clinica do fluxo da IA. "
                "Historico ampliado com sintomas comuns do terceiro trimestre e sinais de alerta que exigem revisao."
            )
            touched = True

        if owner_email == "patient@gestacare.com":
            if _enrich_focus_patient(db, doctor, gestante, counters):
                touched = True
        else:
            if _enrich_general_patient(db, gestante, counters):
                touched = True

        if touched:
            counters["patients_touched"] += 1

    return counters


def _enrich_focus_patient(db: Session, doctor: User, gestante: Gestante, counters: dict[str, int]) -> bool:
    touched = False

    report_plans = [
        {
            "date": date(2026, 4, 9),
            "humor": "normal",
            "symptoms": ["azia"],
            "description": "Azia leve apos refeicao noturna, sem vomitos e com boa ingestao de liquidos.",
            "note": "Dormiu melhor apos jantar mais leve e cabeceira elevada.",
            "bp": (114, 72),
            "weight": 68.7,
            "temp": 36.5,
            "priority": "normal",
        },
        {
            "date": date(2026, 4, 10),
            "humor": "normal",
            "symptoms": ["cansaco", "sono"],
            "description": "Sono fragmentado durante a madrugada e cansaco no fim do dia, sem febre ou dor intensa.",
            "note": "Manteve movimentacao fetal habitual.",
            "bp": (116, 74),
            "weight": 68.8,
            "temp": 36.4,
            "priority": "normal",
        },
        {
            "date": date(2026, 4, 11),
            "humor": "ansioso",
            "symptoms": ["inchaco"],
            "description": "Inchaco discreto em tornozelos no fim da tarde apos muito tempo sentada, melhorando ao elevar as pernas.",
            "note": "Sem falta de ar e sem dor abdominal.",
            "bp": (118, 76),
            "weight": 69.0,
            "temp": 36.5,
            "priority": "normal",
        },
        {
            "date": date(2026, 4, 12),
            "humor": "normal",
            "symptoms": ["dor de cabeca"],
            "description": "Dor de cabeca leve no meio da tarde, com melhora parcial apos hidratacao, lanche e repouso.",
            "note": "Negou alteracao visual e sangramento.",
            "bp": (124, 80),
            "weight": 69.0,
            "temp": 36.5,
            "priority": "normal",
        },
        {
            "date": date(2026, 4, 13),
            "humor": "ansioso",
            "symptoms": ["dor de cabeca", "visao embacada", "inchaco"],
            "description": "Cefaleia mais forte ao acordar, com visao embaçada por alguns minutos e edema em maos e pes.",
            "note": "Orientada a procurar avaliacao no mesmo dia para excluir agravamento hipertensivo.",
            "bp": (142, 90),
            "weight": 69.1,
            "temp": 36.6,
            "priority": "critica",
            "highlight": True,
            "reason": "Cefaleia com visao embacada e edema no segundo semestre da gestacao.",
            "doctor_note": "Correlacionar com medidas pressoricas, proteinuria e sinais de pre-eclampsia.",
        },
        {
            "date": date(2026, 4, 14),
            "humor": "triste",
            "symptoms": ["cansaco"],
            "description": "Permaneceu mais cansada no dia seguinte, mas sem nova alteracao visual e com cefaleia em regressao.",
            "note": "Manteve repouso relativo e afericoes domiciliares.",
            "bp": (128, 82),
            "weight": 69.0,
            "temp": 36.4,
            "priority": "normal",
        },
        {
            "date": date(2026, 4, 15),
            "humor": "ansioso",
            "symptoms": ["contracoes"],
            "description": "Endurecimento abdominal irregular no inicio da noite, sem perda de liquido e sem sangramento.",
            "note": "Como esta com 30 semanas, recebeu orientacao para contato imediato se as contracoes ficarem ritmadas.",
            "bp": (122, 78),
            "weight": 69.1,
            "temp": 36.5,
            "priority": "alta",
            "highlight": True,
            "reason": "Contracoes irregulares antes de 37 semanas exigem reavaliacao se houver progressao.",
            "doctor_note": "Diferenciar Braxton Hicks de trabalho de parto prematuro conforme evolucao.",
        },
        {
            "date": date(2026, 4, 16),
            "humor": "normal",
            "symptoms": ["inchaco"],
            "description": "Edema leve no fim do dia, sem recorrencia de visao embacada e com bebe mexendo como de costume.",
            "note": "Melhora com descanso e caminhada curta.",
            "bp": (120, 76),
            "weight": 69.2,
            "temp": 36.4,
            "priority": "normal",
        },
    ]

    for plan in report_plans:
        if _ensure_relato(
            db,
            gestante,
            data_relato=plan["date"],
            humor=plan["humor"],
            symptoms=plan["symptoms"],
            description=plan["description"],
            note=plan["note"],
            systolic=plan["bp"][0],
            diastolic=plan["bp"][1],
            weight=plan["weight"],
            temperature=plan["temp"],
            priority=plan["priority"],
            highlight=plan.get("highlight", False),
            reason=plan.get("reason"),
            doctor_note=plan.get("doctor_note"),
        ):
            counters["relatos_added"] += 1
            touched = True

    if _ensure_medicamento(
        db,
        gestante,
        doctor,
        nome="Acido folico",
        dosagem="5 mg",
        frequencia="1x ao dia",
        data_inicio=date(2025, 10, 1),
        observacoes="Suplementacao mantida ao longo do pre-natal.",
    ):
        counters["medications_added"] += 1
        touched = True

    if _ensure_medicamento(
        db,
        gestante,
        doctor,
        nome="Sulfato ferroso",
        dosagem="40 mg",
        frequencia="1x ao dia",
        data_inicio=date(2026, 2, 1),
        observacoes="Tomar apos refeicao principal para melhor tolerancia.",
    ):
        counters["medications_added"] += 1
        touched = True

    if _ensure_consulta(
        db,
        gestante,
        doctor,
        data_hora=datetime(2026, 4, 13, 15, 0, tzinfo=UTC),
        tipo="pressao",
        status="realizada",
        local="Ambulatorio de pre-natal",
        observacoes="Avaliacao no mesmo dia por cefaleia com visao embacada e edema.",
    ):
        counters["consultas_added"] += 1
        touched = True

    if _ensure_consulta(
        db,
        gestante,
        doctor,
        data_hora=datetime(2026, 4, 20, 9, 30, tzinfo=UTC),
        tipo="retorno",
        status="agendada",
        local="Ambulatorio de pre-natal",
        observacoes="Retorno curto para revisar sintomas, pressao arterial e contracoes irregulares.",
    ):
        counters["consultas_added"] += 1
        touched = True

    if _ensure_orientacao(
        db,
        gestante,
        doctor,
        data=datetime(2026, 4, 13, 17, 0, tzinfo=UTC),
        texto=(
            "Medir a pressao duas vezes ao dia, manter hidratacao e procurar atendimento imediatamente "
            "se a dor de cabeca voltar forte, se houver visao embaçada, inchaco subbito, dor abaixo das costelas ou mal-estar importante."
        ),
        prioridade="alta",
    ):
        counters["orientacoes_added"] += 1
        touched = True

    if _ensure_orientacao(
        db,
        gestante,
        doctor,
        data=datetime(2026, 4, 15, 20, 0, tzinfo=UTC),
        texto=(
            "Se as contracoes ficarem regulares, vierem seis ou mais em dez minutos, houver perda de liquido, sangramento "
            "ou reducao da movimentacao fetal, entrar em contato no mesmo momento."
        ),
        prioridade="alta",
    ):
        counters["orientacoes_added"] += 1
        touched = True

    if _ensure_prontuario(
        db,
        gestante,
        doctor,
        data=datetime(2026, 4, 13, 15, 15, tzinfo=UTC),
        descricao=(
            "Atendimento por cefaleia com visao embaçada transitora e edema distal. Paciente chegou orientada, "
            "sem dor abdominal intensa e sem sangramento, com necessidade de seguimento mais proximo."
        ),
        medicamentos=["Acido folico 5 mg", "Sulfato ferroso 40 mg"],
        acoes=(
            "Reforcadas medidas de alarme.\n"
            "Solicitado controle pressorico domiciliar.\n"
            "Mantido retorno precoce para reavaliacao clinica."
        ),
    ):
        counters["prontuarios_added"] += 1
        touched = True

    if _ensure_prontuario(
        db,
        gestante,
        doctor,
        data=datetime(2026, 4, 15, 20, 10, tzinfo=UTC),
        descricao=(
            "Reavaliacao por contracoes irregulares sem perda de liquido e sem sangramento. Quadro compativel com irritabilidade uterina, "
            "mas com orientacao reforcada por idade gestacional ainda inferior a 37 semanas."
        ),
        medicamentos=["Acido folico 5 mg", "Sulfato ferroso 40 mg"],
        acoes=(
            "Orientado repouso relativo.\n"
            "Reforcada hidratacao.\n"
            "Definidos criterios de procura imediata de maternidade."
        ),
    ):
        counters["prontuarios_added"] += 1
        touched = True

    if _ensure_alerta(
        db,
        gestante,
        created_at_event=datetime(2026, 4, 13, 14, 20, tzinfo=UTC),
        tipo="Cefaleia com visao embacada",
        severity="high",
        status="reviewed",
        metric_label="Sintomas relatados",
        metric_value="Dor de cabeca, visao embacada e inchaco em 13/04",
    ):
        counters["alertas_added"] += 1
        touched = True

    if _ensure_alerta(
        db,
        gestante,
        created_at_event=datetime(2026, 4, 15, 19, 45, tzinfo=UTC),
        tipo="Contracoes antes de 37 semanas",
        severity="medium",
        status="pending",
        metric_label="Relato de trabalho de parto",
        metric_value="Endurecimento abdominal irregular sem perda de liquido em 15/04",
    ):
        counters["alertas_added"] += 1
        touched = True

    if _ensure_resumo(
        db,
        gestante,
        doctor,
        periodo_inicio=datetime(2026, 4, 10, 0, 0, tzinfo=UTC),
        periodo_fim=datetime(2026, 4, 16, 23, 59, tzinfo=UTC),
        gerado_em=datetime(2026, 4, 16, 18, 30, tzinfo=UTC),
        nivel_alerta="vermelho",
        sintomas=["dor de cabeca", "inchaco", "visao embacada", "contracoes", "azia"],
        avisos=[
            "Revisar cefaleia com visao embacada e edema relatados em 13/04",
            "Monitorar recorrencia de contracoes antes de 37 semanas",
        ],
        resumo_texto=(
            "Na ultima semana, Juliana Fernandes registrou sintomas comuns do terceiro trimestre, como azia, cansaco e edema leve, "
            "mas tambem apresentou um episodio de cefaleia com visao embacada e edema em 13/04, seguido de contracoes irregulares em 15/04. "
            "O conjunto justifica revisao medica prioritaria e vigilancia de sinais de agravamento hipertensivo e progressao para trabalho de parto prematuro."
        ),
        recomendacoes=(
            "Manter controle pressorico, seguir orientacoes de hidratacao e procurar avaliacao imediata se houver retorno de cefaleia forte, "
            "visao embacada, inchaco subbito, sangramento, perda de liquido ou contracoes ritmadas."
        ),
        resumo_aprovado=(
            "Seus registros mais recentes mostraram sintomas comuns da gravidez, mas tambem dois pontos que merecem mais atencao: "
            "um episodio de dor de cabeca com visao embaçada e inchaco, e contracoes irregulares alguns dias depois. "
            "Sua equipe revisou isso e orientou acompanhamento mais proximo."
        ),
        recomendacoes_aprovadas=(
            "Continue medindo a pressao, se hidrate bem e procure atendimento sem esperar se a dor de cabeca piorar, "
            "a visao embaçar novamente, surgir sangramento, perda de liquido ou contracoes regulares."
        ),
    ):
        counters["resumos_added"] += 1
        touched = True

    return touched


def _enrich_general_patient(db: Session, gestante: Gestante, counters: dict[str, int]) -> bool:
    relatos = list(
        db.scalars(
            select(RelatoDiario)
            .where(RelatoDiario.gestante_id == gestante.id)
            .order_by(RelatoDiario.data_relato.desc())
        )
    )
    if not relatos:
        return False

    existing_dates = {relato.data_relato for relato in relatos}
    if date(2026, 4, 16) in existing_dates and date(2026, 4, 17) in existing_dates:
        return False

    track = _infer_track(relatos)
    base_weight = _latest_weight(relatos, gestante)
    templates = _general_templates(track)
    touched = False

    for index, template in enumerate(templates):
        target_date = date(2026, 4, 16) + timedelta(days=index)
        if _ensure_relato(
            db,
            gestante,
            data_relato=target_date,
            humor=template["humor"],
            symptoms=template["symptoms"],
            description=template["description"],
            note=template["note"],
            systolic=template["bp"][0],
            diastolic=template["bp"][1],
            weight=round(base_weight + (0.1 * (index + 1)), 1),
            temperature=template["temp"],
            priority=template["priority"],
            highlight=template.get("highlight", False),
            reason=template.get("reason"),
            doctor_note=template.get("doctor_note"),
        ):
            counters["relatos_added"] += 1
            touched = True

    return touched


def _infer_track(relatos: list[RelatoDiario]) -> str:
    symptoms: set[str] = set()
    for relato in relatos:
        try:
            items = json.loads(relato.sintomas_json or "[]")
        except json.JSONDecodeError:
            items = []
        for item in items:
            symptoms.add(str(item).lower())

    if "sangramento" in symptoms:
        return "bleeding"
    if "pressao alta" in symptoms:
        return "pressure"
    if "contracoes" in symptoms:
        return "contractions"
    if "dor de cabeca" in symptoms or "cefaleia" in symptoms or "inchaco" in symptoms:
        return "headache_edema"
    if "azia" in symptoms or "cansaco" in symptoms or "sono" in symptoms:
        return "common"
    return "routine"


def _general_templates(track: str) -> list[dict]:
    templates = {
        "routine": [
            {
                "humor": "normal",
                "symptoms": ["cansaco"],
                "description": "Cansaco leve ao final do dia apos atividades habituais, sem queixas novas.",
                "note": "Boa hidratacao e movimentacao fetal habitual.",
                "bp": (112, 72),
                "temp": 36.5,
                "priority": "normal",
            },
            {
                "humor": "feliz",
                "symptoms": [],
                "description": "Dia estavel, sem dor, sem sangramento e com bebe mexendo normalmente.",
                "note": "Refere ter conseguido descansar melhor.",
                "bp": (110, 70),
                "temp": 36.4,
                "priority": "normal",
            },
        ],
        "common": [
            {
                "humor": "normal",
                "symptoms": ["azia", "cansaco"],
                "description": "Azia leve apos o jantar e cansaco no fim da tarde, sem vomitos ou falta de ar.",
                "note": "Melhora parcial com refeicoes menores.",
                "bp": (118, 76),
                "temp": 36.5,
                "priority": "normal",
            },
            {
                "humor": "normal",
                "symptoms": ["inchaco"],
                "description": "Inchaco discreto em tornozelos no fim do dia, com alivio ao elevar as pernas.",
                "note": "Sem cefaleia e sem alteracao visual.",
                "bp": (116, 74),
                "temp": 36.4,
                "priority": "normal",
            },
        ],
        "headache_edema": [
            {
                "humor": "ansioso",
                "symptoms": ["inchaco"],
                "description": "Edema leve em pes no fim da tarde apos longo periodo em pe, sem piora importante.",
                "note": "Manteve boa movimentacao fetal.",
                "bp": (128, 82),
                "temp": 36.5,
                "priority": "normal",
            },
            {
                "humor": "normal",
                "symptoms": ["dor de cabeca"],
                "description": "Dor de cabeca leve no fim do dia, melhorando com agua, lanche e repouso.",
                "note": "Sem visao embacada e sem dor abdominal.",
                "bp": (132, 84),
                "temp": 36.5,
                "priority": "alta",
                "highlight": True,
                "reason": "Recorrencia de cefaleia em seguimento gestacional.",
                "doctor_note": "Checar padrao da cefaleia e relacao com edema referido nos relatos anteriores.",
            },
        ],
        "pressure": [
            {
                "humor": "ansioso",
                "symptoms": ["pressao alta", "dor de cabeca"],
                "description": "Nova afericao acima do habitual no fim da tarde, associada a cefaleia leve.",
                "note": "Sem escotomas, mas com orientacao para contato no mesmo dia se houver piora.",
                "bp": (144, 92),
                "temp": 36.6,
                "priority": "critica",
                "highlight": True,
                "reason": "Recorrencia de pico pressorico com cefaleia.",
                "doctor_note": "Priorizar revisao do controle pressorico e da resposta ao tratamento.",
            },
            {
                "humor": "normal",
                "symptoms": ["inchaco"],
                "description": "Edema discreto em membros inferiores no dia seguinte, sem nova cefaleia importante.",
                "note": "Afericoes mais proximas do habitual apos repouso.",
                "bp": (134, 86),
                "temp": 36.4,
                "priority": "alta",
                "highlight": True,
                "reason": "Seguimento apos relato recente de pressao elevada.",
                "doctor_note": "Manter observacao ate estabilizacao consistente.",
            },
        ],
        "bleeding": [
            {
                "humor": "normal",
                "symptoms": [],
                "description": "Sem novo sangramento e com movimentacao fetal preservada ao longo do dia.",
                "note": "Manteve repouso relativo.",
                "bp": (120, 76),
                "temp": 36.4,
                "priority": "normal",
            },
            {
                "humor": "ansioso",
                "symptoms": ["contracoes"],
                "description": "Percebeu endurecimentos abdominais esporadicos, sem perda de liquido e sem nova perda sanguinea.",
                "note": "Orientada a procurar atendimento se ficarem ritmadas.",
                "bp": (122, 78),
                "temp": 36.5,
                "priority": "alta",
                "highlight": True,
                "reason": "Contracoes em seguimento de sangramento recente.",
                "doctor_note": "Diferenciar irritabilidade uterina de trabalho de parto prematuro.",
            },
        ],
        "contractions": [
            {
                "humor": "ansioso",
                "symptoms": ["contracoes"],
                "description": "Contracoes irregulares no periodo noturno, sem perda de liquido e com alivio parcial apos hidratacao.",
                "note": "Sem sangramento e com boa movimentacao fetal.",
                "bp": (124, 78),
                "temp": 36.5,
                "priority": "alta",
                "highlight": True,
                "reason": "Recorrencia de contracoes irregulares.",
                "doctor_note": "Avaliar progressao, frequencia e duracao das contracoes.",
            },
            {
                "humor": "normal",
                "symptoms": [],
                "description": "No dia seguinte nao repetiu o padrao de contracoes, mantendo-se estavel.",
                "note": "Movimentacao fetal referida como habitual.",
                "bp": (120, 76),
                "temp": 36.4,
                "priority": "normal",
            },
        ],
    }
    return templates[track]


def _latest_weight(relatos: list[RelatoDiario], gestante: Gestante) -> float:
    for relato in relatos:
        if relato.peso_kg is not None:
            return float(relato.peso_kg)
    weeks = gestante.semanas_gestacao_atual or 28
    return round(56.0 + (weeks * 0.55), 1)


def _ensure_relato(
    db: Session,
    gestante: Gestante,
    *,
    data_relato: date,
    humor: str,
    symptoms: list[str],
    description: str,
    note: str,
    systolic: int,
    diastolic: int,
    weight: float,
    temperature: float,
    priority: str,
    highlight: bool = False,
    reason: str | None = None,
    doctor_note: str | None = None,
) -> bool:
    existing = db.scalar(
        select(RelatoDiario).where(
            RelatoDiario.gestante_id == gestante.id,
            RelatoDiario.data_relato == data_relato,
        )
    )
    if existing:
        return False

    day_offset = max((data_relato - date(2026, 4, 1)).days, 0)
    db.add(
        RelatoDiario(
            gestante_id=gestante.id,
            data_relato=data_relato,
            humor=humor,
            sintomas_json=json.dumps(symptoms, ensure_ascii=False),
            descricao=description,
            nota_complementar=note,
            pressao_sistolica=systolic,
            pressao_diastolica=diastolic,
            frequencia_cardiaca=82 + (day_offset % 8),
            saturacao_oxigenio=98,
            peso_kg=weight,
            temperatura_c=temperature,
            prioridade_clinica=priority,
            destaque_consulta=highlight,
            motivo_prioridade=reason,
            nota_medica=doctor_note,
        )
    )
    return True


def _ensure_medicamento(
    db: Session,
    gestante: Gestante,
    doctor: User,
    *,
    nome: str,
    dosagem: str,
    frequencia: str,
    data_inicio: date,
    observacoes: str,
) -> bool:
    existing = db.scalar(
        select(Medicamento).where(
            Medicamento.gestante_id == gestante.id,
            Medicamento.nome == nome,
            Medicamento.dosagem == dosagem,
            Medicamento.frequencia == frequencia,
        )
    )
    if existing:
        return False

    db.add(
        Medicamento(
            gestante_id=gestante.id,
            medico_id=doctor.id,
            nome=nome,
            dosagem=dosagem,
            frequencia=frequencia,
            data_inicio=data_inicio,
            ativo=True,
            observacoes=observacoes,
        )
    )
    return True


def _ensure_consulta(
    db: Session,
    gestante: Gestante,
    doctor: User,
    *,
    data_hora: datetime,
    tipo: str,
    status: str,
    local: str,
    observacoes: str,
) -> bool:
    existing = db.scalar(
        select(Consulta).where(
            Consulta.gestante_id == gestante.id,
            Consulta.data_hora == data_hora,
            Consulta.tipo == tipo,
        )
    )
    if existing:
        return False

    db.add(
        Consulta(
            gestante_id=gestante.id,
            medico_id=doctor.id,
            data_hora=data_hora,
            tipo=tipo,
            status=status,
            local=local,
            observacoes=observacoes,
        )
    )
    return True


def _ensure_orientacao(
    db: Session,
    gestante: Gestante,
    doctor: User,
    *,
    data: datetime,
    texto: str,
    prioridade: str,
) -> bool:
    existing = db.scalar(
        select(Orientacao).where(
            Orientacao.gestante_id == gestante.id,
            Orientacao.data == data,
            Orientacao.texto == texto,
        )
    )
    if existing:
        return False

    db.add(
        Orientacao(
            gestante_id=gestante.id,
            medico_id=doctor.id,
            data=data,
            texto=texto,
            prioridade=prioridade,
        )
    )
    return True


def _ensure_prontuario(
    db: Session,
    gestante: Gestante,
    doctor: User,
    *,
    data: datetime,
    descricao: str,
    medicamentos: list[str],
    acoes: str,
) -> bool:
    existing = db.scalar(
        select(Prontuario).where(
            Prontuario.gestante_id == gestante.id,
            Prontuario.data == data,
            Prontuario.descricao == descricao,
        )
    )
    if existing:
        return False

    db.add(
        Prontuario(
            gestante_id=gestante.id,
            medico_id=doctor.id,
            data=data,
            descricao=descricao,
            medicamentos_prescritos_json=json.dumps(medicamentos, ensure_ascii=False),
            acoes_realizadas=acoes,
        )
    )
    return True


def _ensure_alerta(
    db: Session,
    gestante: Gestante,
    *,
    created_at_event: datetime,
    tipo: str,
    severity: str,
    status: str,
    metric_label: str,
    metric_value: str,
) -> bool:
    existing = db.scalar(
        select(Alerta).where(
            Alerta.gestante_id == gestante.id,
            Alerta.created_at_event == created_at_event,
            Alerta.tipo == tipo,
        )
    )
    if existing:
        return False

    db.add(
        Alerta(
            gestante_id=gestante.id,
            patient_name=gestante.nome_completo,
            patient_ig=f"{gestante.semanas_gestacao_atual or 0}s",
            tipo=tipo,
            severity=severity,
            status=status,
            metric_label=metric_label,
            metric_value=metric_value,
            created_at_event=created_at_event,
        )
    )
    return True


def _ensure_resumo(
    db: Session,
    gestante: Gestante,
    doctor: User,
    *,
    periodo_inicio: datetime,
    periodo_fim: datetime,
    gerado_em: datetime,
    nivel_alerta: str,
    sintomas: list[str],
    avisos: list[str],
    resumo_texto: str,
    recomendacoes: str,
    resumo_aprovado: str,
    recomendacoes_aprovadas: str,
) -> bool:
    existing = db.scalar(
        select(ResumoIA).where(
            ResumoIA.gestante_id == gestante.id,
            ResumoIA.periodo_inicio == periodo_inicio,
            ResumoIA.periodo_fim == periodo_fim,
        )
    )
    if existing:
        return False

    db.add(
        ResumoIA(
            gestante_id=gestante.id,
            periodo_inicio=periodo_inicio,
            periodo_fim=periodo_fim,
            resumo_texto=resumo_texto,
            nivel_alerta=nivel_alerta,
            sintomas_identificados_json=json.dumps(sintomas, ensure_ascii=False),
            avisos_json=json.dumps(avisos, ensure_ascii=False),
            recomendacoes=recomendacoes,
            status="approved",
            resumo_aprovado_texto=resumo_aprovado,
            recomendacoes_aprovadas=recomendacoes_aprovadas,
            revisado_por_medico_id=doctor.id,
            revisado_em=datetime.combine(periodo_fim.date(), time(19, 0), tzinfo=UTC),
            gerado_em=gerado_em,
        )
    )
    return True
