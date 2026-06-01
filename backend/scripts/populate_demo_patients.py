from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import delete, select

from app.core.security import get_password_hash
from app.db.clinical_dataset_enrichment import enrich_clinical_dataset
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.consulta import Consulta
from app.models.gestante import Gestante
from app.models.medicamento import Medicamento
from app.models.orientacao import Orientacao
from app.models.prontuario import Prontuario
from app.models.relato import RelatoDiario
from app.models.user import User
from app.models.alerta import Alerta, AlertaNota
from app.models.chat_gestante_message import ChatGestanteMessage
from app.models.exame_arquivo import ExameArquivo
from app.models.resumo_ia import ResumoIA
from sqlalchemy import func


PASSWORD = "123456"
EMAIL_PREFIX = "demo.gestante"


@dataclass(frozen=True)
class Scenario:
    key: str
    observation: str
    orientation: str
    report_plan: list[dict]
    extra_medications: list[dict]
    next_consult_type: str
    next_consult_days: int


SCENARIOS: dict[str, Scenario] = {
    "rotina_estavel": Scenario(
        key="rotina_estavel",
        observation="Gestacao sem intercorrencias relevantes, com queixas leves esperadas do periodo.",
        orientation="Manter hidratacao, atividade leve conforme tolerancia e registrar sintomas usuais no aplicativo.",
        report_plan=[
            {"day_offset": 1, "humor": "normal", "symptoms": ["cansaco"], "description": "Dia produtivo, cansaco no fim da tarde, boa movimentacao fetal.", "bp": (112, 72), "priority": "normal"},
            {"day_offset": 2, "humor": "feliz", "symptoms": ["azia"], "description": "Azia leve apos o jantar, melhorou com fracionamento alimentar.", "bp": (110, 70), "priority": "normal"},
            {"day_offset": 4, "humor": "normal", "symptoms": ["sono"], "description": "Sono irregular durante a madrugada, sem dor ou sangramento.", "bp": (114, 72), "priority": "normal"},
            {"day_offset": 6, "humor": "normal", "symptoms": [], "description": "Sem queixas importantes, boa hidratacao e movimentacao fetal habitual.", "bp": (108, 68), "priority": "normal"},
            {"day_offset": 8, "humor": "normal", "symptoms": ["cansaco"], "description": "Cansaco leve apos caminhada longa, melhorou com repouso.", "bp": (111, 71), "priority": "normal"},
            {"day_offset": 10, "humor": "feliz", "symptoms": [], "description": "Dia tranquilo, sem sintomas novos.", "bp": (109, 69), "priority": "normal"},
        ],
        extra_medications=[],
        next_consult_type="rotina",
        next_consult_days=10,
    ),
    "queixas_comuns": Scenario(
        key="queixas_comuns",
        observation="Sintomas comuns do terceiro trimestre, sem sinais de alarme ate o momento.",
        orientation="Priorizar hidratacao, elevar membros inferiores ao descansar e comentar as queixas na proxima consulta.",
        report_plan=[
            {"day_offset": 1, "humor": "normal", "symptoms": ["azia", "cansaco"], "description": "Azia apos refeicao volumosa e cansaco no fim do dia.", "bp": (116, 74), "priority": "normal"},
            {"day_offset": 2, "humor": "ansioso", "symptoms": ["inchaco"], "description": "Inchaco leve em pes ao final da tarde, sem cefaleia ou alteracao visual.", "bp": (118, 76), "priority": "normal"},
            {"day_offset": 4, "humor": "normal", "symptoms": ["azia"], "description": "Mantem azia leve, sem vomitos.", "bp": (114, 72), "priority": "normal"},
            {"day_offset": 5, "humor": "normal", "symptoms": ["cansaco", "sono"], "description": "Mais cansaco depois de rotina intensa em casa, sem tontura.", "bp": (117, 75), "priority": "normal"},
            {"day_offset": 7, "humor": "normal", "symptoms": ["inchaco"], "description": "Edema discreto em pernas no fim do dia, melhora ao elevar membros.", "bp": (118, 78), "priority": "normal"},
            {"day_offset": 9, "humor": "feliz", "symptoms": [], "description": "Relata sentir-se melhor apos organizar repouso e hidratacao.", "bp": (115, 74), "priority": "normal"},
        ],
        extra_medications=[],
        next_consult_type="rotina",
        next_consult_days=8,
    ),
    "cefaleia_edema": Scenario(
        key="cefaleia_edema",
        observation="Necessita observacao por edema e cefaleia recorrentes, sem pico pressorico grave ate aqui.",
        orientation="Medir pressao diariamente, reduzir excesso de sodio e procurar atendimento se houver piora da cefaleia ou alteracao visual.",
        report_plan=[
            {"day_offset": 1, "humor": "ansioso", "symptoms": ["dor de cabeca", "inchaco"], "description": "Cefaleia frontal leve no fim da tarde e edema discreto em tornozelos.", "bp": (132, 84), "priority": "alta", "highlight": True, "reason": "Cefaleia com edema no contexto gestacional."},
            {"day_offset": 2, "humor": "normal", "symptoms": ["inchaco"], "description": "Mantem edema leve em membros inferiores, sem dor abdominal.", "bp": (130, 82), "priority": "alta", "highlight": True, "reason": "Persistencia de edema."},
            {"day_offset": 4, "humor": "triste", "symptoms": ["cefaleia"], "description": "Cefaleia persistente ao acordar, melhorou parcialmente apos repouso.", "bp": (134, 86), "priority": "alta", "highlight": True, "reason": "Cefaleia recorrente."},
            {"day_offset": 5, "humor": "normal", "symptoms": ["inchaco", "cansaco"], "description": "Cansaco e inchaco discreto ao final do dia, sem alteracao visual.", "bp": (128, 82), "priority": "normal"},
            {"day_offset": 7, "humor": "ansioso", "symptoms": ["dor de cabeca"], "description": "Nova cefaleia leve em periodo da tarde.", "bp": (133, 85), "priority": "alta", "highlight": True, "reason": "Recorrencia de cefaleia."},
            {"day_offset": 9, "humor": "normal", "symptoms": [], "description": "Dia melhor, sem dor de cabeca importante.", "bp": (126, 80), "priority": "normal"},
        ],
        extra_medications=[],
        next_consult_type="pressao",
        next_consult_days=5,
    ),
    "hipertensao_alerta": Scenario(
        key="hipertensao_alerta",
        observation="Gestacao com monitoramento pressorico intensificado por episodios recentes de PA elevada.",
        orientation="Aferir pressao duas vezes ao dia e procurar atendimento no mesmo dia se houver cefaleia forte, escotomas ou dor abdominal.",
        report_plan=[
            {"day_offset": 1, "humor": "triste", "symptoms": ["pressao alta", "dor de cabeca"], "description": "PA elevada em casa com cefaleia persistente pela manha.", "bp": (148, 96), "priority": "critica", "highlight": True, "reason": "Pico pressorico com cefaleia.", "note": "Correlacionar com sinais de pre-eclampsia."},
            {"day_offset": 2, "humor": "ansioso", "symptoms": ["tontura", "pressao alta"], "description": "Tontura ao levantar e nova afericao acima do habitual.", "bp": (144, 92), "priority": "critica", "highlight": True, "reason": "Tontura associada a hipertensao.", "note": "Manter vigilancia domiciliar."},
            {"day_offset": 3, "humor": "normal", "symptoms": ["inchaco"], "description": "Edema em maos e pes no fim do dia.", "bp": (140, 90), "priority": "alta", "highlight": True, "reason": "Edema com PA limitrofe."},
            {"day_offset": 5, "humor": "normal", "symptoms": ["cefaleia"], "description": "Cefaleia mais leve, sem alteracao visual.", "bp": (136, 88), "priority": "alta", "highlight": True, "reason": "Persistencia de cefaleia."},
            {"day_offset": 7, "humor": "normal", "symptoms": [], "description": "Melhora clinica apos ajuste da rotina e medicacao.", "bp": (130, 84), "priority": "normal"},
            {"day_offset": 9, "humor": "normal", "symptoms": ["pressao alta"], "description": "Afericao isolada um pouco acima do habitual, sem sintomas associados.", "bp": (142, 90), "priority": "alta", "highlight": True, "reason": "Nova PA elevada."},
        ],
        extra_medications=[
            {"nome": "Metildopa", "dosagem": "250 mg", "frequencia": "8/8h", "observacoes": "Uso por controle pressorico domiciliar."},
        ],
        next_consult_type="pressao",
        next_consult_days=3,
    ),
    "contracoes_monitor": Scenario(
        key="contracoes_monitor",
        observation="Queixas uterinas intermitentes que exigem acompanhamento, sem criterios claros de trabalho de parto ativo nos registros atuais.",
        orientation="Observar regularidade das contracoes, manter hidratacao e procurar maternidade se houver ritmo progressivo ou perda de liquido.",
        report_plan=[
            {"day_offset": 1, "humor": "ansioso", "symptoms": ["contracoes"], "description": "Referiu endurecimento abdominal esporadico, sem perda de liquido.", "bp": (118, 74), "priority": "alta", "highlight": True, "reason": "Contracoes referidas no fim do dia."},
            {"day_offset": 2, "humor": "normal", "symptoms": ["dor lombar"], "description": "Desconforto lombar leve apos ficar muito tempo sentada.", "bp": (116, 72), "priority": "normal"},
            {"day_offset": 4, "humor": "ansioso", "symptoms": ["contracoes"], "description": "Novas contracoes irregulares, sem sangramento.", "bp": (120, 76), "priority": "alta", "highlight": True, "reason": "Repeticao de contracoes."},
            {"day_offset": 6, "humor": "normal", "symptoms": [], "description": "Dia tranquilo apos repouso e hidratacao.", "bp": (114, 72), "priority": "normal"},
            {"day_offset": 8, "humor": "normal", "symptoms": ["contracoes"], "description": "Contracoes isoladas no inicio da noite, sem progressao.", "bp": (119, 75), "priority": "alta", "highlight": True, "reason": "Persistencia de contracoes."},
            {"day_offset": 10, "humor": "feliz", "symptoms": [], "description": "Sem novas queixas uterinas importantes.", "bp": (115, 74), "priority": "normal"},
        ],
        extra_medications=[],
        next_consult_type="avaliacao",
        next_consult_days=4,
    ),
    "sangramento_urgencia": Scenario(
        key="sangramento_urgencia",
        observation="Historico recente de sangramento na gestacao, exigindo avaliacao prioritaria e orientacao reforcada.",
        orientation="Se houver novo sangramento, dor forte, perda de liquido ou reducao de movimentacao fetal, ir diretamente ao pronto atendimento.",
        report_plan=[
            {"day_offset": 1, "humor": "triste", "symptoms": ["sangramento"], "description": "Sangramento vaginal em pequena quantidade ao acordar, sem perda de liquido.", "bp": (124, 78), "priority": "critica", "highlight": True, "reason": "Sangramento na gestacao.", "note": "Checar evolucao e necessidade de maternidade."},
            {"day_offset": 2, "humor": "ansioso", "symptoms": ["dor de cabeca"], "description": "Ansiedade apos episodio de sangramento, sem novo sangramento no dia.", "bp": (122, 78), "priority": "alta", "highlight": True, "reason": "Seguimento apos sangramento."},
            {"day_offset": 4, "humor": "normal", "symptoms": [], "description": "Sem recorrencia de sangramento, repouso mantido.", "bp": (120, 76), "priority": "normal"},
            {"day_offset": 6, "humor": "normal", "symptoms": ["contracoes"], "description": "Desconforto abdominal leve e contracoes esporadicas, sem progressao.", "bp": (122, 76), "priority": "alta", "highlight": True, "reason": "Contracoes apos episodio de sangramento."},
            {"day_offset": 8, "humor": "normal", "symptoms": [], "description": "Sem novas intercorrencias importantes.", "bp": (118, 74), "priority": "normal"},
            {"day_offset": 10, "humor": "normal", "symptoms": [], "description": "Mantem acompanhamento e boa movimentacao fetal.", "bp": (119, 74), "priority": "normal"},
        ],
        extra_medications=[],
        next_consult_type="urgencia",
        next_consult_days=2,
    ),
}


PATIENT_BLUEPRINTS = [
    ("Amanda Ribeiro", 18, "O+", "rotina_estavel"),
    ("Beatriz Alves", 20, "A+", "rotina_estavel"),
    ("Camila Torres", 22, "B+", "queixas_comuns"),
    ("Daniela Costa", 24, "AB+", "queixas_comuns"),
    ("Eduarda Lima", 26, "O-", "rotina_estavel"),
    ("Fernanda Rocha", 28, "A-", "cefaleia_edema"),
    ("Gabriela Nunes", 29, "B-", "queixas_comuns"),
    ("Helena Duarte", 30, "A+", "cefaleia_edema"),
    ("Isabela Martins", 31, "O+", "hipertensao_alerta"),
    ("Juliana Freitas", 32, "AB-", "cefaleia_edema"),
    ("Karina Barros", 33, "A+", "hipertensao_alerta"),
    ("Larissa Teles", 34, "B+", "queixas_comuns"),
    ("Mariana Castro", 35, "O+", "contracoes_monitor"),
    ("Natalia Moraes", 36, "A-", "hipertensao_alerta"),
    ("Olivia Pires", 27, "B+", "rotina_estavel"),
    ("Patricia Gomes", 37, "O-", "sangramento_urgencia"),
    ("Renata Farias", 25, "AB+", "rotina_estavel"),
    ("Sabrina Melo", 34, "A+", "contracoes_monitor"),
    ("Tatiane Soares", 38, "O+", "hipertensao_alerta"),
    ("Vanessa Cardoso", 29, "B-", "sangramento_urgencia"),
]


def normalize_phone(index: int) -> str:
    return f"1197{index:04d}{index:04d}"[:11]


def get_or_create_doctor(db) -> User:
    doctor = db.scalar(select(User).where(User.email == "doctor@gestacare.com"))
    if doctor:
        return doctor

    doctor = User(
        email="doctor@gestacare.com",
        senha_hash=get_password_hash(PASSWORD),
        role="medico",
        ativo=True,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def reset_demo_dataset(db) -> None:
    demo_users = list(db.scalars(select(User).where(User.email.like(f"{EMAIL_PREFIX}%@gestacare.com"))))
    if not demo_users:
        return

    demo_user_ids = [user.id for user in demo_users]
    demo_gestantes = list(db.scalars(select(Gestante).where(Gestante.user_id.in_(demo_user_ids))))
    demo_gestante_ids = [gestante.id for gestante in demo_gestantes]
    if demo_gestante_ids:
        demo_alert_ids = list(db.scalars(select(Alerta.id).where(Alerta.gestante_id.in_(demo_gestante_ids))))
        if demo_alert_ids:
            db.execute(delete(AlertaNota).where(AlertaNota.alerta_id.in_(demo_alert_ids)))
            db.execute(delete(Alerta).where(Alerta.id.in_(demo_alert_ids)))
        db.execute(delete(ChatGestanteMessage).where(ChatGestanteMessage.gestante_id.in_(demo_gestante_ids)))
        db.execute(delete(ExameArquivo).where(ExameArquivo.gestante_id.in_(demo_gestante_ids)))
        db.execute(delete(ResumoIA).where(ResumoIA.gestante_id.in_(demo_gestante_ids)))
        db.execute(delete(RelatoDiario).where(RelatoDiario.gestante_id.in_(demo_gestante_ids)))
        db.execute(delete(Medicamento).where(Medicamento.gestante_id.in_(demo_gestante_ids)))
        db.execute(delete(Orientacao).where(Orientacao.gestante_id.in_(demo_gestante_ids)))
        db.execute(delete(Consulta).where(Consulta.gestante_id.in_(demo_gestante_ids)))
        db.execute(delete(Prontuario).where(Prontuario.gestante_id.in_(demo_gestante_ids)))
        db.execute(delete(Gestante).where(Gestante.id.in_(demo_gestante_ids)))
    db.execute(delete(User).where(User.id.in_(demo_user_ids)))
    db.commit()


def build_relato(gestante_id: str, weeks: int, plan: dict, today: date) -> RelatoDiario:
    data_relato = today - timedelta(days=plan["day_offset"])
    systolic, diastolic = plan["bp"]
    day_index = plan["day_offset"]
    return RelatoDiario(
        gestante_id=gestante_id,
        data_relato=data_relato,
        humor=plan["humor"],
        sintomas_json=json.dumps(plan["symptoms"], ensure_ascii=False),
        descricao=plan["description"],
        nota_complementar=plan.get("complementary_note"),
        pressao_sistolica=systolic,
        pressao_diastolica=diastolic,
        frequencia_cardiaca=82 + (day_index % 10),
        saturacao_oxigenio=98 if "sangramento" not in plan["symptoms"] else 97,
        peso_kg=56.0 + weeks * 0.55 + (day_index * 0.1),
        temperatura_c=36.4 + ((day_index % 4) * 0.1),
        prioridade_clinica=plan.get("priority", "normal"),
        destaque_consulta=bool(plan.get("highlight", False)),
        motivo_prioridade=plan.get("reason"),
        nota_medica=plan.get("note"),
    )


def create_demo_patient(db, doctor: User, index: int, blueprint: tuple[str, int, str, str], today: date) -> bool:
    full_name, weeks, blood_type, scenario_key = blueprint
    email = f"{EMAIL_PREFIX}{index:02d}@gestacare.com"
    if db.scalar(select(User).where(User.email == email)):
        return False

    scenario = SCENARIOS[scenario_key]
    dum = today - timedelta(weeks=weeks)
    dpp = dum + timedelta(days=280)

    user = User(
        email=email,
        senha_hash=get_password_hash(PASSWORD),
        role="gestante",
        ativo=True,
    )
    db.add(user)
    db.flush()

    gestante = Gestante(
        user_id=user.id,
        nome_completo=full_name,
        data_nascimento=date(1990 + (index % 10), ((index % 12) + 1), ((index * 2) % 27) + 1),
        telefone=normalize_phone(index),
        dum=dum,
        dpp=dpp,
        tipo_sanguineo=blood_type,
        semanas_gestacao_atual=weeks,
        observacoes=scenario.observation,
    )
    db.add(gestante)
    db.flush()

    for plan in scenario.report_plan:
        db.add(build_relato(gestante.id, weeks, plan, today))

    base_medications = [
        Medicamento(
            gestante_id=gestante.id,
            medico_id=doctor.id,
            nome="Acido folico",
            dosagem="5 mg",
            frequencia="1x ao dia",
            data_inicio=max(dum, today - timedelta(days=90)),
            ativo=True,
            observacoes="Suplementacao mantida conforme acompanhamento.",
        ),
    ]
    if weeks >= 20:
        base_medications.append(
            Medicamento(
                gestante_id=gestante.id,
                medico_id=doctor.id,
                nome="Sulfato ferroso",
                dosagem="40 mg",
                frequencia="1x ao dia",
                data_inicio=max(dum + timedelta(days=40), today - timedelta(days=60)),
                ativo=True,
                observacoes="Tomar apos refeicao principal.",
            )
        )
    for medication in scenario.extra_medications:
        base_medications.append(
            Medicamento(
                gestante_id=gestante.id,
                medico_id=doctor.id,
                nome=medication["nome"],
                dosagem=medication["dosagem"],
                frequencia=medication["frequencia"],
                data_inicio=today - timedelta(days=7),
                ativo=True,
                observacoes=medication["observacoes"],
            )
        )
    db.add_all(base_medications)

    db.add(
        Orientacao(
            gestante_id=gestante.id,
            medico_id=doctor.id,
            data=datetime.combine(today - timedelta(days=1), time(18, 0), tzinfo=UTC),
            texto=scenario.orientation,
            prioridade="alta" if scenario_key in {"hipertensao_alerta", "sangramento_urgencia"} else "normal",
        )
    )

    db.add(
        Consulta(
            gestante_id=gestante.id,
            medico_id=doctor.id,
            data_hora=datetime.combine(today + timedelta(days=scenario.next_consult_days), time(9 + (index % 5), 0), tzinfo=UTC),
            tipo=scenario.next_consult_type,
            status="agendada",
            local="Ambulatorio de pre-natal",
            observacoes=f"Retorno programado para seguimento do caso {scenario.key}.",
        )
    )

    db.add(
        Prontuario(
            gestante_id=gestante.id,
            medico_id=doctor.id,
            data=datetime.combine(today - timedelta(days=3), time(14, 0), tzinfo=UTC),
            descricao=f"Consulta recente com revisao do quadro: {scenario.observation}",
            medicamentos_prescritos_json=json.dumps([med.nome for med in base_medications], ensure_ascii=False),
            acoes_realizadas=scenario.orientation,
        )
    )

    return True


def main() -> None:
    init_db()
    reset = "--reset-demo" in sys.argv
    db = SessionLocal()
    try:
        if reset:
            reset_demo_dataset(db)

        doctor = get_or_create_doctor(db)
        today = date.today()
        created = 0

        for index, blueprint in enumerate(PATIENT_BLUEPRINTS, start=1):
            if create_demo_patient(db, doctor, index, blueprint, today):
                created += 1

        enrich_clinical_dataset(db)
        db.commit()
        total_demo = db.scalar(select(func.count()).select_from(User).where(User.email.like(f"{EMAIL_PREFIX}%@gestacare.com"))) or 0
        print(f"Pacientes demo criadas nesta execucao: {created}")
        print(f"Total de pacientes demo disponiveis: {total_demo}")
        print(f"Login das gestantes: {EMAIL_PREFIX}01@gestacare.com ate {EMAIL_PREFIX}{len(PATIENT_BLUEPRINTS):02d}@gestacare.com")
        print(f"Senha padrao: {PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
