from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class MedicamentoOut(BaseModel):
    id: str
    gestanteId: str
    nome: str
    dosagem: str
    frequencia: str
    dataInicio: date | None = None
    dataFim: date | None = None
    dataPrescricao: date | None = None
    ativo: bool
    observacoes: str | None = None
    lembreteAtivo: bool = False
    horarioLembrete: str | None = None
    tomadoHoje: bool = False
    tomadoHojeEm: datetime | None = None


class MedicamentoIn(BaseModel):
    gestanteId: str
    nome: str
    dosagem: str
    frequencia: str
    dataInicio: date | None = None
    dataFim: date | None = None
    ativo: bool = True
    observacoes: str | None = None


class MedicamentoUpdateIn(BaseModel):
    nome: str | None = None
    dosagem: str | None = None
    frequencia: str | None = None
    dataInicio: date | None = None
    dataFim: date | None = None
    ativo: bool | None = None
    observacoes: str | None = None


class MedicamentoControleIn(BaseModel):
    lembreteAtivo: bool | None = None
    horarioLembrete: str | None = None
    tomadoHoje: bool | None = None


class MedicamentoControleOut(BaseModel):
    medicamentoId: str
    lembreteAtivo: bool = False
    horarioLembrete: str | None = None
    tomadoHoje: bool = False
    tomadoHojeEm: datetime | None = None


class ExameArquivoIn(BaseModel):
    titulo: str
    tipoExame: str | None = None
    dataExame: date | None = None
    observacoes: str | None = None
    nomeArquivo: str
    mimeType: str = "application/pdf"
    conteudoBase64: str


class ExameArquivoOut(BaseModel):
    id: str
    gestanteId: str
    titulo: str
    tipoExame: str | None = None
    dataExame: date | None = None
    observacoes: str | None = None
    nomeArquivo: str
    mimeType: str
    tamanhoBytes: int
    enviadoEm: datetime


class ConsultaOut(BaseModel):
    id: str
    gestanteId: str
    data: date
    tipo: Literal["ultrassom", "pressao", "rotina", "emergencia"]
    observacoes: str | None = None
    status: str


class ConsultaIn(BaseModel):
    gestanteId: str
    data: date
    tipo: Literal["ultrassom", "pressao", "rotina", "emergencia"]
    observacoes: str | None = None


class OrientacaoOut(BaseModel):
    id: str
    gestanteId: str
    medicoId: str | None = None
    data: date
    texto: str


class OrientacaoIn(BaseModel):
    gestanteId: str
    medicoId: str | None = None
    data: date
    texto: str


class ProntuarioOut(BaseModel):
    id: str
    gestanteId: str
    data: date
    descricao: str
    medicamentosPrescritos: list[str]
    acoesRealizadas: str
    medicoId: str | None = None


class ProntuarioIn(BaseModel):
    gestanteId: str
    data: date
    descricao: str
    medicamentosPrescritos: list[str] = Field(default_factory=list)
    acoesRealizadas: str = ""
    medicoId: str | None = None


class ProntuarioUpdateIn(BaseModel):
    data: date | None = None
    descricao: str | None = None
    medicamentosPrescritos: list[str] | None = None
    acoesRealizadas: str | None = None
    medicoId: str | None = None


class CadastroGestanteOut(BaseModel):
    riskClassification: Literal["habitual", "intermediario", "alto"] = "habitual"
    chronicConditions: list[str] = Field(default_factory=list)
    previousPregnancyComplications: list[str] = Field(default_factory=list)
    familyHistory: list[str] = Field(default_factory=list)
    allergies: str | None = None
    continuousMedications: str | None = None
    surgeries: str | None = None
    obstetricHistory: str | None = None
    mentalHealthNotes: str | None = None
    socialContext: str | None = None
    additionalNotes: str | None = None


class CadastroGestanteIn(BaseModel):
    riskClassification: Literal["habitual", "intermediario", "alto"] = "habitual"
    chronicConditions: list[str] = Field(default_factory=list)
    previousPregnancyComplications: list[str] = Field(default_factory=list)
    familyHistory: list[str] = Field(default_factory=list)
    allergies: str | None = None
    continuousMedications: str | None = None
    surgeries: str | None = None
    obstetricHistory: str | None = None
    mentalHealthNotes: str | None = None
    socialContext: str | None = None
    additionalNotes: str | None = None


class RelatoClinicoUpdateIn(BaseModel):
    clinicalPriority: Literal["baixa", "normal", "alta", "critica"] | None = None
    highlightForConsultation: bool | None = None
    priorityReason: str | None = None
    doctorNote: str | None = None


class ResumoOut(BaseModel):
    id: str
    gestanteId: str
    relatoId: str
    data: date
    tipo: Literal["diario", "semanal"]
    semaforo: Literal["verde", "amarelo", "vermelho"]
    resumo: str
    sintomasIdentificados: list[str]
    avisos: list[str]
    recomendacoes: str
    status: Literal["pending", "approved"] = "pending"
    aprovadoEm: datetime | None = None


class ResumoReviewIn(BaseModel):
    resumo: str | None = None
    recomendacoes: str | None = None


class ResumoGerarIn(BaseModel):
    gestanteId: str
    periodo_inicio: datetime
    periodo_fim: datetime


class AIStatusOut(BaseModel):
    enabled: bool
    provider: str
    model: str
    baseUrl: str
    providerReachable: bool
    status: Literal["online", "offline", "disabled"]
    calibrationExamples: int
    validationCases: int
    message: str


class AICalibrationCaseOut(BaseModel):
    name: str
    expectedSemaphore: Literal["verde", "amarelo", "vermelho"]
    actualSemaphore: Literal["verde", "amarelo", "vermelho"]
    semaphoreMatch: bool
    expectedSymptoms: list[str] = Field(default_factory=list)
    actualSymptoms: list[str] = Field(default_factory=list)
    matchedSymptoms: int = 0
    passed: bool


class AICalibrationRunOut(BaseModel):
    provider: str
    model: str
    executedAt: datetime
    providerReachable: bool
    totalCases: int
    passedCases: int
    message: str
    cases: list[AICalibrationCaseOut] = Field(default_factory=list)


class AlertNoteOut(BaseModel):
    id: str
    text: str
    createdAt: datetime
    authorName: str


class AlertOut(BaseModel):
    id: str
    patientId: str
    patientName: str
    patientIG: str | None = None
    type: str
    severity: Literal["high", "medium", "low"]
    status: Literal["pending", "reviewed"]
    createdAt: datetime
    metricLabel: str
    metricValue: str
    notes: list[AlertNoteOut] = Field(default_factory=list)


class AlertNoteIn(BaseModel):
    text: str


class AlertsKPIOut(BaseModel):
    pendingToday: int
    pendingTotal: int
    criticalTotal: int
    avgHoursSinceAlert: int


class MedicoPacienteOut(BaseModel):
    id: str
    name: str
    cpf: str
    age: int
    gestationalWeeks: int | None = None
    gestationalDays: int | None = None
    lastReportDate: datetime | None = None
    alertLevel: Literal["none", "low", "medium", "high"]
    alertFlags: list[str] = Field(default_factory=list)
    isActive: bool = True
    dueDate: date | None = None


class MedicoKPIOut(BaseModel):
    newReportsToday: int
    pendingAlerts: int
    activePatients: int
