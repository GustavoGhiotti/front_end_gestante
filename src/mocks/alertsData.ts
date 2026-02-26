import type {
  Alert, AlertsKPI, ReportData, ReportPeriod, PatientSummaryRow,
} from '../types/alerts';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

function isoAgo(days: number, hour = 8): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Gera valor determinístico baseado em índice + seed (sem aleatório real). */
function dv(i: number, seed: number, base: number, amp: number): number {
  return Math.max(0, Math.round(
    base
    + Math.sin(i * 0.7 + seed) * amp
    + Math.cos(i * 1.3 + seed * 0.6) * (amp * 0.4),
  ));
}

function dayLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ─── ALERTAS ─────────────────────────────────────────────────────────────────
export const mockAlerts: Alert[] = [
  // ── p1: Maria da Silva Santos (28s3d) ──
  {
    id: 'a1', patientId: 'p1', patientName: 'Maria da Silva Santos', patientIG: '28s3d',
    type: 'PA fora do padrão', severity: 'high', status: 'pending',
    createdAt: isoAgo(0, 7),
    metricLabel: 'Pressão arterial', metricValue: 'PA: 148/95 mmHg',
    notes: [],
  },
  {
    id: 'a2', patientId: 'p1', patientName: 'Maria da Silva Santos', patientIG: '28s3d',
    type: 'Novo relato com sintomas', severity: 'high', status: 'pending',
    createdAt: isoAgo(0, 8),
    metricLabel: 'Sintomas', metricValue: 'Cefaleia, Tontura',
    notes: [
      { id: 'n1', text: 'Paciente orientada sobre sinais de alarme. Aguardando retorno.', createdAt: isoAgo(0, 9), authorName: 'Dr. Ghiotti' },
    ],
  },
  {
    id: 'a3', patientId: 'p1', patientName: 'Maria da Silva Santos', patientIG: '28s3d',
    type: 'FC elevada', severity: 'medium', status: 'reviewed',
    createdAt: isoAgo(1, 15),
    metricLabel: 'Frequência cardíaca', metricValue: 'FC: 90 bpm',
    notes: [],
  },
  // ── p2: Ana Clara Rodrigues (32s1d) ──
  {
    id: 'a4', patientId: 'p2', patientName: 'Ana Clara Rodrigues', patientIG: '32s1d',
    type: 'PA fora do padrão', severity: 'medium', status: 'pending',
    createdAt: isoAgo(1, 9),
    metricLabel: 'Pressão arterial', metricValue: 'PA: 132/88 mmHg',
    notes: [],
  },
  {
    id: 'a5', patientId: 'p2', patientName: 'Ana Clara Rodrigues', patientIG: '32s1d',
    type: 'Edema relatado', severity: 'low', status: 'reviewed',
    createdAt: isoAgo(3, 10),
    metricLabel: 'Sintoma', metricValue: 'Edema em MMII (relato)',
    notes: [],
  },
  // ── p3: Paula Fernanda Costa (20s5d) ──
  {
    id: 'a6', patientId: 'p3', patientName: 'Paula Fernanda Costa', patientIG: '20s5d',
    type: 'Sinais vitais incompletos', severity: 'low', status: 'reviewed',
    createdAt: isoAgo(2, 11),
    metricLabel: 'Campos ausentes', metricValue: '2 dias sem medição',
    notes: [],
  },
  // ── p4: Luciana Aparecida Ferreira (36s) ──
  {
    id: 'a7', patientId: 'p4', patientName: 'Luciana Aparecida Ferreira', patientIG: '36s',
    type: 'PA fora do padrão', severity: 'high', status: 'pending',
    createdAt: isoAgo(0, 6),
    metricLabel: 'Pressão arterial', metricValue: 'PA: 155/100 mmHg',
    notes: [],
  },
  {
    id: 'a8', patientId: 'p4', patientName: 'Luciana Aparecida Ferreira', patientIG: '36s',
    type: 'SpO₂ abaixo do esperado', severity: 'high', status: 'pending',
    createdAt: isoAgo(0, 6),
    metricLabel: 'Oxigenação', metricValue: 'SpO₂: 96%',
    notes: [],
  },
  {
    id: 'a9', patientId: 'p4', patientName: 'Luciana Aparecida Ferreira', patientIG: '36s',
    type: 'FC elevada', severity: 'medium', status: 'pending',
    createdAt: isoAgo(0, 6),
    metricLabel: 'Frequência cardíaca', metricValue: 'FC: 96 bpm',
    notes: [],
  },
  {
    id: 'a10', patientId: 'p4', patientName: 'Luciana Aparecida Ferreira', patientIG: '36s',
    type: 'Novo relato com sintomas', severity: 'high', status: 'pending',
    createdAt: isoAgo(0, 7),
    metricLabel: 'Sintomas', metricValue: 'Alt. visual, edema, cefaleia',
    notes: [],
  },
  // ── p5: Beatriz Oliveira Mendes (16s2d) ──
  {
    id: 'a11', patientId: 'p5', patientName: 'Beatriz Oliveira Mendes', patientIG: '16s2d',
    type: 'SpO₂ abaixo do esperado', severity: 'low', status: 'pending',
    createdAt: isoAgo(3, 11),
    metricLabel: 'Oxigenação', metricValue: 'SpO₂: 95% (pontual)',
    notes: [],
  },
  {
    id: 'a12', patientId: 'p5', patientName: 'Beatriz Oliveira Mendes', patientIG: '16s2d',
    type: 'Novo relato com sintomas', severity: 'low', status: 'reviewed',
    createdAt: isoAgo(3, 11),
    metricLabel: 'Sintoma', metricValue: 'Falta de ar ao esforço',
    notes: [],
  },
  // ── p6: Carla Regina Mendes (24s4d) ──
  {
    id: 'a13', patientId: 'p6', patientName: 'Carla Regina Mendes', patientIG: '24s4d',
    type: 'Perda de peso', severity: 'medium', status: 'pending',
    createdAt: isoAgo(1, 8),
    metricLabel: 'Variação de peso', metricValue: '−0,8 kg / semana',
    notes: [],
  },
  {
    id: 'a14', patientId: 'p6', patientName: 'Carla Regina Mendes', patientIG: '24s4d',
    type: 'Novo relato com sintomas', severity: 'medium', status: 'reviewed',
    createdAt: isoAgo(1, 8),
    metricLabel: 'Sintomas', metricValue: 'Náuseas, vômito',
    notes: [],
  },
  {
    id: 'a15', patientId: 'p6', patientName: 'Carla Regina Mendes', patientIG: '24s4d',
    type: 'Novo relato com sintomas', severity: 'low', status: 'reviewed',
    createdAt: isoAgo(2, 9),
    metricLabel: 'Sintomas', metricValue: 'Náuseas matinais',
    notes: [],
  },
];

// ─── KPI ─────────────────────────────────────────────────────────────────────
export const mockAlertsKPI: AlertsKPI = {
  pendingToday: 6,   // a1, a2, a7, a8, a9, a10
  pendingTotal:  8,  // + a4, a11, a13
  criticalTotal: 5,  // todos com severity=high e status=pending
  avgHoursSinceAlert: 4,
};

// ─── DISTRIBUIÇÃO DE TIPOS ────────────────────────────────────────────────────
export const alertTypeDist = [
  { type: 'PA fora do padrão',         count: 6 },
  { type: 'Novo relato com sintomas',  count: 5 },
  { type: 'FC elevada',                count: 3 },
  { type: 'SpO₂ abaixo do esperado',   count: 2 },
  { type: 'Sinais vitais incompletos', count: 2 },
  { type: 'Perda de peso',             count: 1 },
  { type: 'Edema relatado',            count: 1 },
];

// ─── RESUMO POR PACIENTE ──────────────────────────────────────────────────────
export const patientSummaryRows: PatientSummaryRow[] = [
  { id: 'p1', name: 'Maria da Silva Santos',      ig: '28s3d', reportCount: 4,  alertCount: 3, lastRecord: isoAgo(0),  alertLevel: 'high'   },
  { id: 'p2', name: 'Ana Clara Rodrigues',         ig: '32s1d', reportCount: 2,  alertCount: 2, lastRecord: isoAgo(1),  alertLevel: 'medium' },
  { id: 'p3', name: 'Paula Fernanda Costa',        ig: '20s5d', reportCount: 1,  alertCount: 1, lastRecord: isoAgo(2),  alertLevel: 'none'   },
  { id: 'p4', name: 'Luciana Aparecida Ferreira',  ig: '36s',   reportCount: 2,  alertCount: 4, lastRecord: isoAgo(0),  alertLevel: 'high'   },
  { id: 'p5', name: 'Beatriz Oliveira Mendes',     ig: '16s2d', reportCount: 1,  alertCount: 2, lastRecord: isoAgo(3),  alertLevel: 'low'    },
  { id: 'p6', name: 'Carla Regina Mendes',         ig: '24s4d', reportCount: 2,  alertCount: 3, lastRecord: isoAgo(1),  alertLevel: 'medium' },
];

// ─── GERAÇÃO DE SÉRIE TEMPORAL ────────────────────────────────────────────────
function generateSeries(days: number): ReportData {
  const reportsPerDay   = Array.from({ length: days }, (_, i) => ({ date: dayLabel(days - 1 - i), value: dv(i, 0.5, 2.5, 1.2) }));
  const alertsHighPerDay   = Array.from({ length: days }, (_, i) => ({ date: dayLabel(days - 1 - i), value: dv(i, 1.0, 0.8, 0.7) }));
  const alertsMediumPerDay = Array.from({ length: days }, (_, i) => ({ date: dayLabel(days - 1 - i), value: dv(i, 1.6, 1.2, 0.9) }));
  const alertsLowPerDay    = Array.from({ length: days }, (_, i) => ({ date: dayLabel(days - 1 - i), value: dv(i, 2.1, 1.0, 0.8) }));

  const totalReports = reportsPerDay.reduce((s, d) => s + d.value, 0);
  const totalHigh    = alertsHighPerDay.reduce((s, d) => s + d.value, 0);
  const totalMed     = alertsMediumPerDay.reduce((s, d) => s + d.value, 0);
  const totalLow     = alertsLowPerDay.reduce((s, d) => s + d.value, 0);
  const totalAlerts  = totalHigh + totalMed + totalLow;
  const reviewed     = mockAlerts.filter(a => a.status === 'reviewed').length;
  const reviewedPct  = Math.round((reviewed / mockAlerts.length) * 100);

  return {
    period: (days <= 7 ? '7d' : days <= 30 ? '30d' : '90d') as ReportPeriod,
    kpi: { activePatients: 6, totalReports, totalAlerts, reviewedPct },
    reportsPerDay,
    alertsHighPerDay,
    alertsMediumPerDay,
    alertsLowPerDay,
    alertTypeDist,
    patientSummary: patientSummaryRows,
  };
}

// ─── API SIMULADA ─────────────────────────────────────────────────────────────
export async function fetchAlerts(): Promise<Alert[]> {
  await delay(700);
  return [...mockAlerts].sort((a, b) => {
    // Pendentes primeiro; dentro de pendentes, alta severidade primeiro
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    const sev = { high: 0, medium: 1, low: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

export async function fetchAlertsKPI(): Promise<AlertsKPI> {
  await delay(400);
  return { ...mockAlertsKPI };
}

export async function fetchReportData(period: ReportPeriod): Promise<ReportData> {
  await delay(800);
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return generateSeries(days);
}

/** Simula falha ~10% das vezes */
export async function markAlertReviewed(id: string): Promise<void> {
  await delay(600);
  if (Math.random() < 0.10) {
    throw new Error('Falha ao registrar revisão. Tente novamente.');
  }
  const alert = mockAlerts.find(a => a.id === id);
  if (alert) alert.status = 'reviewed';
}

export async function addAlertNote(alertId: string, text: string, authorName: string): Promise<AlertNote> {
  await delay(500);
  const note: AlertNote = {
    id: `n${Date.now()}`,
    text,
    createdAt: new Date().toISOString(),
    authorName,
  };
  const alert = mockAlerts.find(a => a.id === alertId);
  if (alert) alert.notes.push(note);
  return note;
}

// Re-export types for convenience
export type { AlertNote } from '../types/alerts';
