import json
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy import text
from sqlalchemy.orm import Session
from pathlib import Path

from app.core.security import get_password_hash
from app.db import base  # noqa: F401
from app.db.clinical_dataset_enrichment import enrich_clinical_dataset
from app.db.session import engine
from app.models.alerta import Alerta
from app.models.base import Base
from app.models.consulta import Consulta
from app.models.exame_arquivo import ExameArquivo
from app.models.gestante import Gestante
from app.models.medicamento import Medicamento
from app.models.orientacao import Orientacao
from app.models.prontuario import Prontuario
from app.models.relato import RelatoDiario
from app.models.resumo_ia import ResumoIA
from app.models.user import User


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        columns = {row[1] for row in conn.execute(text("PRAGMA table_info(relatos_diarios)")).fetchall()}
        expected = {
            "pressao_sistolica": "INTEGER",
            "pressao_diastolica": "INTEGER",
            "frequencia_cardiaca": "INTEGER",
            "saturacao_oxigenio": "INTEGER",
            "peso_kg": "REAL",
            "temperatura_c": "REAL",
            "prioridade_clinica": "TEXT NOT NULL DEFAULT 'normal'",
            "destaque_consulta": "BOOLEAN NOT NULL DEFAULT 0",
            "motivo_prioridade": "TEXT",
            "nota_medica": "TEXT",
        }
        for name, sql_type in expected.items():
            if name not in columns:
                conn.execute(text(f"ALTER TABLE relatos_diarios ADD COLUMN {name} {sql_type}"))
        if "nota_complementar" not in columns:
            conn.execute(text("ALTER TABLE relatos_diarios ADD COLUMN nota_complementar TEXT"))
        resumo_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(resumos_ia)")).fetchall()}
        resumo_expected = {
            "status": "TEXT NOT NULL DEFAULT 'pending'",
            "resumo_aprovado_texto": "TEXT",
            "recomendacoes_aprovadas": "TEXT",
            "revisado_por_medico_id": "TEXT",
            "revisado_em": "DATETIME",
        }
        for name, sql_type in resumo_expected.items():
            if name not in resumo_columns:
                conn.execute(text(f"ALTER TABLE resumos_ia ADD COLUMN {name} {sql_type}"))
        med_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(medicamentos)")).fetchall()}
        med_expected = {
            "lembrete_ativo": "BOOLEAN NOT NULL DEFAULT 0",
            "horario_lembrete": "TEXT",
            "tomado_hoje": "BOOLEAN NOT NULL DEFAULT 0",
            "tomado_hoje_em": "DATETIME",
            "ultimo_lembrete_enviado_em": "DATETIME",
        }
        for name, sql_type in med_expected.items():
            if name not in med_columns:
                conn.execute(text(f"ALTER TABLE medicamentos ADD COLUMN {name} {sql_type}"))
        chat_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(chat_gestante_mensagens)")).fetchall()}
        if "thread_id" not in chat_columns:
            conn.execute(text("ALTER TABLE chat_gestante_mensagens ADD COLUMN thread_id TEXT"))
            conn.execute(text("UPDATE chat_gestante_mensagens SET thread_id = gestante_id WHERE thread_id IS NULL OR thread_id = ''"))


def seed_db(db: Session) -> None:
    uploads_dir = Path(__file__).resolve().parents[1] / "uploads" / "exames"
    if uploads_dir.exists():
        for item in uploads_dir.iterdir():
            if item.is_file():
                item.unlink()

    db.execute(text("DELETE FROM alertas_notas"))
    db.execute(text("DELETE FROM alertas"))
    db.execute(text("DELETE FROM chat_gestante_mensagens"))
    db.execute(text("DELETE FROM exames_arquivos"))
    db.execute(text("DELETE FROM resumos_ia"))
    db.execute(text("DELETE FROM prontuarios"))
    db.execute(text("DELETE FROM orientacoes"))
    db.execute(text("DELETE FROM consultas"))
    db.execute(text("DELETE FROM medicamentos"))
    db.execute(text("DELETE FROM relatos_diarios"))
    db.execute(text("DELETE FROM consentimentos_lgpd"))
    db.execute(text("DELETE FROM gestantes"))
    db.execute(text("DELETE FROM users"))
    db.commit()

    now = datetime.now(UTC).replace(hour=9, minute=0, second=0, microsecond=0)

    medico = User(
        email="doctor@gestacare.com",
        senha_hash=get_password_hash("123456"),
        role="medico",
        ativo=True,
    )
    caso_minimo_user = User(
        email="patient@gestacare.com",
        senha_hash=get_password_hash("123456"),
        role="gestante",
        ativo=True,
    )
    caso_completo_user = User(
        email="gestante.demo@gestacare.com",
        senha_hash=get_password_hash("123456"),
        role="gestante",
        ativo=True,
    )

    db.add_all([medico, caso_minimo_user, caso_completo_user])
    db.flush()

    caso_minimo = Gestante(
        user_id=caso_minimo_user.id,
        nome_completo="Juliana Ferreira",
        data_nascimento=date(1998, 7, 14),
        telefone="11987654321",
        dum=date(2025, 9, 12),
        dpp=date(2026, 6, 19),
        tipo_sanguineo="O+",
        semanas_gestacao_atual=30,
        observacoes="Paciente recente na plataforma. Histórico ainda em construção.",
    )
    caso_completo = Gestante(
        user_id=caso_completo_user.id,
        nome_completo="Carolina Mendes",
        data_nascimento=date(1992, 3, 8),
        telefone="11991234567",
        dum=date(2025, 8, 20),
        dpp=date(2026, 5, 27),
        tipo_sanguineo="A+",
        semanas_gestacao_atual=33,
        observacoes="Gestação acompanhada por hipertensão gestacional leve, atualmente estável com monitoramento próximo.",
    )
    db.add_all([caso_minimo, caso_completo])
    db.flush()

    db.add(
        RelatoDiario(
            gestante_id=caso_minimo.id,
            data_relato=date(2026, 4, 8),
            humor="normal",
            sintomas_json=json.dumps(["cansaco leve"], ensure_ascii=False),
            descricao="Dia tranquilo, com cansaço leve no fim da tarde e sem outras queixas.",
            frequencia_cardiaca=84,
            saturacao_oxigenio=98,
            temperatura_c=36.4,
        )
    )
    db.add(
        Consulta(
            gestante_id=caso_minimo.id,
            medico_id=medico.id,
            data_hora=datetime(2026, 4, 18, 14, 0, tzinfo=UTC),
            tipo="rotina",
            status="agendada",
            observacoes="Primeira consulta presencial registrada na plataforma.",
        )
    )
    db.add(
        Orientacao(
            gestante_id=caso_minimo.id,
            medico_id=medico.id,
            data=datetime(2026, 4, 8, 18, 0, tzinfo=UTC),
            texto="Manter hidratação, observar inchaço progressivo e seguir registrando relatos diários.",
            prioridade="normal",
        )
    )

    relatos_completos = [
        {
            "data": date(2026, 4, 9),
            "humor": "normal",
            "sintomas": ["azia"],
            "descricao": "Alimentação boa no dia, azia leve após o jantar, sem cefaleia ou alteração visual.",
            "pa": (126, 82),
            "fc": 86,
            "o2": 98,
            "peso": 74.8,
            "temp": 36.5,
        },
        {
            "data": date(2026, 4, 8),
            "humor": "ansioso",
            "sintomas": ["dor de cabeça", "inchaço"],
            "descricao": "Referiu cefaleia frontal leve e aumento discreto do inchaço em membros inferiores no fim do dia.",
            "pa": (138, 88),
            "fc": 88,
            "o2": 98,
            "peso": 74.9,
            "temp": 36.6,
            "prioridade": "alta",
            "destaque": True,
            "motivo": "Cefaleia associada a edema no contexto de hipertensao gestacional.",
            "nota_medica": "Revisar na consulta a evolucao do edema, padrao da cefaleia e medidas pressoricas domiciliares.",
        },
        {
            "data": date(2026, 4, 7),
            "humor": "normal",
            "sintomas": ["inchaço"],
            "descricao": "Dormiu melhor, edema discreto em pés ao final da tarde, sem dor abdominal e com boa movimentação fetal.",
            "pa": (136, 86),
            "fc": 85,
            "o2": 98,
            "peso": 74.7,
            "temp": 36.4,
        },
        {
            "data": date(2026, 4, 5),
            "humor": "triste",
            "sintomas": ["dor de cabeça", "tontura", "pressao alta"],
            "descricao": "Teve episódio de tontura ao levantar e cefaleia persistente pela manhã. Procurou orientação após medir pressão elevada em casa.",
            "pa": (148, 95),
            "fc": 92,
            "o2": 97,
            "peso": 74.6,
            "temp": 36.7,
            "prioridade": "critica",
            "destaque": True,
            "motivo": "Pico pressorico com cefaleia e tontura, exigindo revisao prioritaria no atendimento.",
            "nota_medica": "Relato chave para correlacao com conduta anti-hipertensiva e risco de pre-eclampsia.",
        },
        {
            "data": date(2026, 4, 3),
            "humor": "normal",
            "sintomas": ["azia", "cansaco"],
            "descricao": "Cansaço habitual do terceiro trimestre e azia controlada após ajuste alimentar.",
            "pa": (130, 84),
            "fc": 84,
            "o2": 98,
            "peso": 74.3,
            "temp": 36.5,
        },
    ]

    for item in relatos_completos:
        db.add(
            RelatoDiario(
                gestante_id=caso_completo.id,
                data_relato=item["data"],
                humor=item["humor"],
                sintomas_json=json.dumps(item["sintomas"], ensure_ascii=False),
                descricao=item["descricao"],
                pressao_sistolica=item["pa"][0],
                pressao_diastolica=item["pa"][1],
                frequencia_cardiaca=item["fc"],
                saturacao_oxigenio=item["o2"],
                peso_kg=item["peso"],
                temperatura_c=item["temp"],
                prioridade_clinica=item.get("prioridade", "normal"),
                destaque_consulta=item.get("destaque", False),
                motivo_prioridade=item.get("motivo"),
                nota_medica=item.get("nota_medica"),
            )
        )
    db.add_all(
        [
            Medicamento(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                nome="Metildopa",
                dosagem="250 mg",
                frequencia="8/8h",
                data_inicio=date(2026, 4, 5),
                ativo=True,
                observacoes="Iniciado após episódio de pressão elevada. Reavaliar em 7 dias.",
            ),
            Medicamento(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                nome="Sulfato ferroso",
                dosagem="40 mg",
                frequencia="1x ao dia",
                data_inicio=date(2026, 2, 10),
                ativo=True,
                observacoes="Manter uso diário após o almoço.",
            ),
            Medicamento(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                nome="Ácido fólico",
                dosagem="5 mg",
                frequencia="1x ao dia",
                data_inicio=date(2025, 9, 1),
                ativo=True,
                observacoes="Uso contínuo durante a gestação.",
            ),
        ]
    )

    db.add_all(
        [
            Consulta(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                data_hora=datetime(2026, 4, 6, 15, 30, tzinfo=UTC),
                tipo="rotina",
                status="realizada",
                observacoes="Consulta após pico pressórico domiciliar.",
            ),
            Consulta(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                data_hora=datetime(2026, 4, 13, 9, 0, tzinfo=UTC),
                tipo="pressao",
                status="agendada",
                observacoes="Retorno curto para reavaliar PA e sintomas.",
            ),
        ]
    )

    db.add_all(
        [
            Orientacao(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                data=datetime(2026, 4, 6, 16, 0, tzinfo=UTC),
                texto="Reduzir consumo excessivo de sódio, manter repouso relativo e procurar atendimento se houver cefaleia intensa, escotomas ou dor abdominal.",
                prioridade="alta",
            ),
            Orientacao(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                data=datetime(2026, 4, 7, 12, 0, tzinfo=UTC),
                texto="Manter aferição de pressão duas vezes ao dia e registrar sintomas no aplicativo.",
                prioridade="normal",
            ),
        ]
    )

    db.add_all(
        [
            Prontuario(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                data=datetime(2026, 4, 6, 15, 30, tzinfo=UTC),
                descricao="Atendimento de revisão por pico pressórico em domicílio. Paciente chegou sem sinais de urgência, com cefaleia leve já em melhora e edema discreto em membros inferiores.",
                medicamentos_prescritos_json=json.dumps(["Metildopa 250 mg 8/8h"], ensure_ascii=False),
                acoes_realizadas="Solicitado controle pressórico domiciliar.\nOrientada sobre sinais de alarme.\nAcompanhamento clínico mantido com retorno programado.",
            ),
            Prontuario(
                gestante_id=caso_completo.id,
                medico_id=medico.id,
                data=datetime(2026, 3, 24, 10, 0, tzinfo=UTC),
                descricao="Consulta de pré-natal de rotina com crescimento gestacional adequado e boa movimentação fetal referida.",
                medicamentos_prescritos_json=json.dumps(["Ácido fólico 5 mg", "Sulfato ferroso 40 mg"], ensure_ascii=False),
                acoes_realizadas="Mantida suplementação.\nReforçadas orientações alimentares.\nProgramado retorno em 15 dias.",
            ),
        ]
    )

    db.add_all(
        [
            Alerta(
                gestante_id=caso_completo.id,
                patient_name=caso_completo.nome_completo,
                patient_ig=f"{caso_completo.semanas_gestacao_atual or 0}s",
                tipo="PA fora do padrao",
                severity="high",
                status="pending",
                metric_label="Pressão arterial",
                metric_value="PA: 148 / 95 mmHg",
                created_at_event=datetime(2026, 4, 5, 9, 0, tzinfo=UTC),
            ),
            Alerta(
                gestante_id=caso_completo.id,
                patient_name=caso_completo.nome_completo,
                patient_ig=f"{caso_completo.semanas_gestacao_atual or 0}s",
                tipo="Cefaleia com tontura",
                severity="medium",
                status="reviewed",
                metric_label="Sintomas relatados",
                metric_value="Dor de cabeça e tontura no relato de 05/04",
                created_at_event=datetime(2026, 4, 5, 9, 5, tzinfo=UTC),
            ),
        ]
    )

    db.add_all(
        [
            ResumoIA(
                gestante_id=caso_completo.id,
                periodo_inicio=datetime(2026, 4, 3, 0, 0, tzinfo=UTC),
                periodo_fim=datetime(2026, 4, 9, 23, 59, tzinfo=UTC),
                resumo_texto=(
                    "Nos últimos 7 dias, a paciente manteve registros frequentes, com predominância de edema leve e episódios de cefaleia. "
                    "Houve um pico pressórico em 05/04 com posterior melhora parcial após início de monitoramento e ajuste terapêutico."
                ),
                nivel_alerta="amarelo",
                sintomas_identificados_json=json.dumps(
                    ["inchaço", "dor de cabeça", "azia", "pressão alta"],
                    ensure_ascii=False,
                ),
                avisos_json=json.dumps(
                    ["Monitorar pressão arterial diariamente", "Reavaliar persistência de cefaleia e edema"],
                    ensure_ascii=False,
                ),
                recomendacoes="Manter controle pressórico, seguir uso da medicação prescrita e antecipar retorno se houver piora clínica.",
                status="approved",
                resumo_aprovado_texto=(
                    "Na última semana, seus registros mostraram aumento de inchaço e episódios de dor de cabeça, "
                    "com melhora parcial após a consulta. Seu médico já revisou essas informações e orientou seguimento próximo."
                ),
                recomendacoes_aprovadas="Continue medindo a pressão, use as medicações conforme prescrição e procure atendimento se os sintomas piorarem.",
                revisado_por_medico_id=medico.id,
                revisado_em=datetime(2026, 4, 9, 19, 0, tzinfo=UTC),
                gerado_em=datetime(2026, 4, 9, 18, 30, tzinfo=UTC),
            )
        ]
    )

    enrich_clinical_dataset(db)
    db.commit()
