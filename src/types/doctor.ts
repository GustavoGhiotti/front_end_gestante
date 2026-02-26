// ─── Níveis de alerta ─────────────────────────────────────────────────────────
/** Classificação visual de atenção. Não implica diagnóstico clínico. */
export type AlertLevel = 'none' | 'low' | 'medium' | 'high';

// ─── Sinais vitais ─────────────────────────────────────────────────────────────
export interface VitalSign {
  id: string;
  patientId: string;
  date: string; // ISO 8601
  bloodPressureSystolic: number;   // mmHg
  bloodPressureDiastolic: number;  // mmHg
  heartRate: number;               // bpm
  oxygenSaturation: number;        // %
  weight?: number;                 // kg
  temperature?: number;            // °C
  recordedBy?: string;
}

/** Histórico de 7 dias para mini gráficos */
export interface VitalsHistory {
  dates: string[];
  systolic: number[];
  diastolic: number[];
  heartRate: number[];
  oxygenSaturation: number[];
  weight: number[];
}

// ─── Paciente ──────────────────────────────────────────────────────────────────
export interface Patient {
  id: string;
  name: string;
  cpf: string;
  age: number;
  gestationalWeeks?: number;
  gestationalDays?: number;
  lastReportDate?: string;
  lastVitals?: VitalSign;
  vitalsHistory: VitalsHistory;
  /** Flags descritivas — sem inferência clínica */
  alertLevel: AlertLevel;
  alertFlags: string[];
  isActive: boolean;
  dueDate?: string;
  phone?: string;
  address?: string;
  bloodType?: string;
  firstAppointmentDate?: string;
}

// ─── Relato diário ─────────────────────────────────────────────────────────────
export interface DailyReport {
  id: string;
  patientId: string;
  date: string;
  description: string;
  mood: 'feliz' | 'normal' | 'triste' | 'ansioso';
  symptoms: string[];
}

// ─── Medicamentos ──────────────────────────────────────────────────────────────
export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  isActive: boolean;
  prescribedBy: string;
}

// ─── Prontuário ────────────────────────────────────────────────────────────────
export interface MedicalRecord {
  id: string;
  patientId: string;
  date: string;
  summary: string;
  actions: string[];
  nextAppointment?: string;
  doctorId: string;
  doctorName: string;
}

// ─── Resumo do assistente ─────────────────────────────────────────────────────
/**
 * Resumo gerado automaticamente a partir dos dados registrados.
 * NÃO substitui avaliação clínica nem emite diagnóstico.
 */
export interface AssistantSummary {
  patientId: string;
  generatedAt: string;
  summaryText: string;
  /** Lista de mudanças detectadas (matemáticas/descritivas — sem diagnóstico) */
  changesDetected: string[];
  dataPoints: number;
}

// ─── Timeline de eventos ───────────────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  patientId: string;
  date: string;
  type: 'report' | 'vitals' | 'appointment' | 'medication';
  description: string;
  hasFlag: boolean;
}

// ─── KPI do dashboard ─────────────────────────────────────────────────────────
export interface KPIData {
  newReportsToday: number;
  pendingAlerts: number;
  activePatients: number;
}
