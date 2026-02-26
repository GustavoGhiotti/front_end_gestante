// ─── Alertas ─────────────────────────────────────────────────────────────────
export type AlertSeverity = 'high' | 'medium' | 'low';
export type AlertStatus   = 'pending' | 'reviewed';
export type AlertType =
  | 'PA fora do padrão'
  | 'Novo relato com sintomas'
  | 'FC elevada'
  | 'SpO₂ abaixo do esperado'
  | 'Sinais vitais incompletos'
  | 'Perda de peso'
  | 'Edema relatado';

export interface AlertNote {
  id: string;
  text: string;
  createdAt: string;
  authorName: string;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  /** Formatado: "28s3d" */
  patientIG?: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;     // ISO
  metricLabel: string;   // Ex.: "Pressão sistólica"
  metricValue: string;   // Ex.: "148/95 mmHg"
  notes: AlertNote[];
}

export interface AlertsKPI {
  pendingToday: number;
  pendingTotal: number;
  criticalTotal: number;
  avgHoursSinceAlert: number;
}

// ─── Relatórios ───────────────────────────────────────────────────────────────
export type ReportPeriod = '7d' | '30d' | '90d';

export interface DailyPoint {
  date: string; // "dd/mm"
  value: number;
}

export interface ReportData {
  period: ReportPeriod;
  kpi: {
    activePatients: number;
    totalReports: number;
    totalAlerts: number;
    reviewedPct: number;
  };
  reportsPerDay: DailyPoint[];
  alertsHighPerDay: DailyPoint[];
  alertsMediumPerDay: DailyPoint[];
  alertsLowPerDay: DailyPoint[];
  alertTypeDist: { type: string; count: number }[];
  patientSummary: PatientSummaryRow[];
}

export interface PatientSummaryRow {
  id: string;
  name: string;
  ig?: string;
  reportCount: number;
  alertCount: number;
  lastRecord?: string;
  alertLevel: AlertSeverity | 'none';
}
