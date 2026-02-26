import type {
  Patient,
  DailyReport,
  Medication,
  MedicalRecord,
  AssistantSummary,
  TimelineEvent,
  KPIData,
  VitalSign,
} from '../types/doctor';

// ─── Helpers de data ──────────────────────────────────────────────────────────
function isoAgo(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function dateAgo(days: number): string {
  return isoAgo(days).split('T')[0];
}
function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

// ─── PACIENTES ────────────────────────────────────────────────────────────────
export const mockPatients: Patient[] = [
  {
    id: 'p1',
    name: 'Maria da Silva Santos',
    cpf: '123.456.789-00',
    age: 28,
    gestationalWeeks: 28,
    gestationalDays: 3,
    lastReportDate: isoAgo(0),
    alertLevel: 'high',
    alertFlags: [
      'Pressão sistólica aumentou 15,6% em 7 dias',
      'Cefaleia relatada em 3 dos últimos 4 registros',
    ],
    isActive: true,
    dueDate: '2026-05-15',
    phone: '(11) 9 8765-4321',
    address: 'Rua das Acácias, 42, Jabaquara – SP',
    bloodType: 'A+',
    firstAppointmentDate: '2025-09-01',
    lastVitals: {
      id: 'v1-0', patientId: 'p1', date: isoAgo(0),
      bloodPressureSystolic: 148, bloodPressureDiastolic: 95,
      heartRate: 90, oxygenSaturation: 97, weight: 72.4, temperature: 36.8,
    },
    vitalsHistory: {
      dates:            [dateAgo(6), dateAgo(5), dateAgo(4), dateAgo(3), dateAgo(2), dateAgo(1), dateAgo(0)],
      systolic:         [128, 132, 135, 138, 142, 145, 148],
      diastolic:        [82,  84,  87,  88,  90,  92,  95 ],
      heartRate:        [82,  84,  86,  85,  88,  90,  90 ],
      oxygenSaturation: [98,  98,  97,  97,  97,  97,  97 ],
      weight:           [71.2, 71.4, 71.6, 71.8, 72.0, 72.2, 72.4],
    },
  },
  {
    id: 'p2',
    name: 'Ana Clara Rodrigues',
    cpf: '987.654.321-00',
    age: 24,
    gestationalWeeks: 32,
    gestationalDays: 1,
    lastReportDate: isoAgo(1),
    alertLevel: 'medium',
    alertFlags: [
      'Inchaço em membros inferiores relatado',
      'PA: 132/88 mmHg (ontem)',
    ],
    isActive: true,
    dueDate: '2026-04-10',
    phone: '(11) 9 7654-3210',
    address: 'Av. Paulista, 1234, ap. 56, Bela Vista – SP',
    bloodType: 'O-',
    firstAppointmentDate: '2025-08-15',
    lastVitals: {
      id: 'v2-0', patientId: 'p2', date: isoAgo(1),
      bloodPressureSystolic: 132, bloodPressureDiastolic: 88,
      heartRate: 86, oxygenSaturation: 98, weight: 78.0,
    },
    vitalsHistory: {
      dates:            [dateAgo(6), dateAgo(5), dateAgo(4), dateAgo(3), dateAgo(2), dateAgo(1), dateAgo(0)],
      systolic:         [118, 120, 122, 125, 128, 130, 132],
      diastolic:        [76,  78,  80,  82,  84,  86,  88 ],
      heartRate:        [80,  82,  84,  84,  85,  86,  86 ],
      oxygenSaturation: [99,  99,  98,  98,  99,  98,  98 ],
      weight:           [76.5, 76.8, 77.0, 77.3, 77.6, 77.8, 78.0],
    },
  },
  {
    id: 'p3',
    name: 'Paula Fernanda Costa',
    cpf: '456.789.123-00',
    age: 31,
    gestationalWeeks: 20,
    gestationalDays: 5,
    lastReportDate: isoAgo(2),
    alertLevel: 'none',
    alertFlags: [],
    isActive: true,
    dueDate: '2026-07-20',
    phone: '(11) 9 5432-1098',
    address: 'Rua Vergueiro, 789, Vila Mariana – SP',
    bloodType: 'B+',
    firstAppointmentDate: '2025-11-05',
    lastVitals: {
      id: 'v3-0', patientId: 'p3', date: isoAgo(2),
      bloodPressureSystolic: 112, bloodPressureDiastolic: 72,
      heartRate: 78, oxygenSaturation: 99, weight: 65.2,
    },
    vitalsHistory: {
      dates:            [dateAgo(6), dateAgo(5), dateAgo(4), dateAgo(3), dateAgo(2), dateAgo(1), dateAgo(0)],
      systolic:         [110, 112, 111, 113, 112, 112, 112],
      diastolic:        [70,  72,  71,  73,  72,  72,  72 ],
      heartRate:        [76,  78,  77,  79,  78,  78,  78 ],
      oxygenSaturation: [99,  99,  99,  99,  99,  99,  99 ],
      weight:           [64.5, 64.7, 64.8, 65.0, 65.2, 65.2, 65.2],
    },
  },
  {
    id: 'p4',
    name: 'Luciana Aparecida Ferreira',
    cpf: '321.654.987-00',
    age: 35,
    gestationalWeeks: 36,
    gestationalDays: 0,
    lastReportDate: isoAgo(0),
    alertLevel: 'high',
    alertFlags: [
      'Alteração visual relatada hoje',
      'Edema generalizado',
      'PA: 155/100 mmHg',
    ],
    isActive: true,
    dueDate: '2026-03-14',
    phone: '(11) 9 4321-9876',
    address: 'Rua Consolação, 567, Consolação – SP',
    bloodType: 'AB+',
    firstAppointmentDate: '2025-07-01',
    lastVitals: {
      id: 'v4-0', patientId: 'p4', date: isoAgo(0),
      bloodPressureSystolic: 155, bloodPressureDiastolic: 100,
      heartRate: 96, oxygenSaturation: 96, weight: 85.0, temperature: 37.1,
    },
    vitalsHistory: {
      dates:            [dateAgo(6), dateAgo(5), dateAgo(4), dateAgo(3), dateAgo(2), dateAgo(1), dateAgo(0)],
      systolic:         [138, 140, 143, 146, 149, 152, 155],
      diastolic:        [88,  90,  92,  94,  96,  98,  100],
      heartRate:        [88,  90,  90,  92,  94,  95,  96 ],
      oxygenSaturation: [97,  97,  97,  96,  96,  96,  96 ],
      weight:           [83.0, 83.5, 84.0, 84.2, 84.5, 84.8, 85.0],
    },
  },
  {
    id: 'p5',
    name: 'Beatriz Oliveira Mendes',
    cpf: '654.321.098-00',
    age: 22,
    gestationalWeeks: 16,
    gestationalDays: 2,
    lastReportDate: isoAgo(3),
    alertLevel: 'low',
    alertFlags: ['Oxigenação variou para 95% (há 3 dias)'],
    isActive: true,
    dueDate: '2026-08-05',
    phone: '(11) 9 3210-8765',
    address: 'Rua Augusta, 1010, Cerqueira César – SP',
    bloodType: 'O+',
    firstAppointmentDate: '2025-12-01',
    lastVitals: {
      id: 'v5-0', patientId: 'p5', date: isoAgo(3),
      bloodPressureSystolic: 105, bloodPressureDiastolic: 68,
      heartRate: 75, oxygenSaturation: 97, weight: 58.0,
    },
    vitalsHistory: {
      dates:            [dateAgo(6), dateAgo(5), dateAgo(4), dateAgo(3), dateAgo(2), dateAgo(1), dateAgo(0)],
      systolic:         [103, 105, 104, 106, 105, 105, 105],
      diastolic:        [66,  68,  67,  69,  68,  68,  68 ],
      heartRate:        [73,  75,  74,  76,  75,  75,  75 ],
      oxygenSaturation: [98,  98,  98,  95,  97,  97,  97 ],
      weight:           [57.4, 57.6, 57.7, 57.8, 58.0, 58.0, 58.0],
    },
  },
  {
    id: 'p6',
    name: 'Carla Regina Mendes',
    cpf: '789.012.345-00',
    age: 29,
    gestationalWeeks: 24,
    gestationalDays: 4,
    lastReportDate: isoAgo(1),
    alertLevel: 'medium',
    alertFlags: [
      'Náuseas persistentes (5 dias consecutivos)',
      'Variação de -0,8 kg nesta semana',
    ],
    isActive: true,
    dueDate: '2026-06-01',
    phone: '(11) 9 2109-7654',
    address: 'Rua da Mooca, 234, Mooca – SP',
    bloodType: 'A-',
    firstAppointmentDate: '2025-10-10',
    lastVitals: {
      id: 'v6-0', patientId: 'p6', date: isoAgo(1),
      bloodPressureSystolic: 116, bloodPressureDiastolic: 74,
      heartRate: 82, oxygenSaturation: 98, weight: 63.4,
    },
    vitalsHistory: {
      dates:            [dateAgo(6), dateAgo(5), dateAgo(4), dateAgo(3), dateAgo(2), dateAgo(1), dateAgo(0)],
      systolic:         [115, 118, 116, 117, 115, 116, 116],
      diastolic:        [72,  75,  73,  74,  72,  74,  74 ],
      heartRate:        [80,  82,  81,  83,  82,  82,  82 ],
      oxygenSaturation: [99,  98,  99,  98,  98,  98,  98 ],
      weight:           [64.2, 64.0, 63.9, 63.7, 63.5, 63.4, 63.4],
    },
  },
];

// ─── RELATOS DIÁRIOS ─────────────────────────────────────────────────────────
export const mockReports: DailyReport[] = [
  { id: 'r1',  patientId: 'p1', date: isoAgo(0, 8),  mood: 'ansioso',
    description: 'Acordei com dor de cabeça forte. Tomei o remédio e melhorou um pouco. Sinto o bebê mexendo bastante.',
    symptoms: ['Cefaleia', 'Tontura'] },
  { id: 'r2',  patientId: 'p1', date: isoAgo(1, 10), mood: 'normal',
    description: 'Dia mais tranquilo, mas ainda sinto a cabeça pesada às vezes.',
    symptoms: ['Cefaleia'] },
  { id: 'r3',  patientId: 'p1', date: isoAgo(2, 9),  mood: 'triste',
    description: 'Muito cansaço ao subir escadas. Pés inchados à noite.',
    symptoms: ['Cansaço', 'Edema'] },
  { id: 'r4',  patientId: 'p1', date: isoAgo(4, 11), mood: 'normal',
    description: 'Sem queixas hoje. Movimentos fetais presentes.',
    symptoms: [] },
  { id: 'r5',  patientId: 'p2', date: isoAgo(1, 9),  mood: 'normal',
    description: 'Percebo o tornozelo mais inchado à tarde. Descansando com os pés elevados.',
    symptoms: ['Edema', 'Cansaço'] },
  { id: 'r6',  patientId: 'p2', date: isoAgo(3, 8),  mood: 'feliz',
    description: 'Boa noite de sono. Bebê ativo.',
    symptoms: [] },
  { id: 'r7',  patientId: 'p3', date: isoAgo(2, 10), mood: 'feliz',
    description: 'Me sinto bem. Fazendo caminhada leve todos os dias.',
    symptoms: [] },
  { id: 'r8',  patientId: 'p4', date: isoAgo(0, 7),  mood: 'ansioso',
    description: 'Acordei com visão embaçada e não passou. Pernas muito inchadas. Estou preocupada.',
    symptoms: ['Alteração visual', 'Edema', 'Cefaleia'] },
  { id: 'r9',  patientId: 'p4', date: isoAgo(1, 9),  mood: 'triste',
    description: 'Muito inchaço. Quase não consigo calçar os sapatos. Cansaço constante.',
    symptoms: ['Edema', 'Cansaço'] },
  { id: 'r10', patientId: 'p5', date: isoAgo(3, 11), mood: 'normal',
    description: 'Senti falta de ar ao subir dois lances de escada. Passou rapidamente.',
    symptoms: ['Falta de ar'] },
  { id: 'r11', patientId: 'p6', date: isoAgo(1, 8),  mood: 'triste',
    description: 'Náuseas o dia todo. Consigo comer pouco. Tomei a medicação antiemética.',
    symptoms: ['Náuseas', 'Vômito'] },
  { id: 'r12', patientId: 'p6', date: isoAgo(2, 9),  mood: 'normal',
    description: 'Náuseas pela manhã, mas melhoraram após almoço.',
    symptoms: ['Náuseas'] },
];

// ─── MEDICAMENTOS ─────────────────────────────────────────────────────────────
export const mockMedications: Medication[] = [
  { id: 'm1',  patientId: 'p1', name: 'Metildopa',      dose: '250mg', frequency: '3x ao dia',
    duration: '60 dias',  startDate: dateAgo(14), isActive: true,  prescribedBy: 'Dr. Ghiotti',
    notes: 'Monitorar PA a cada 48h' },
  { id: 'm2',  patientId: 'p1', name: 'Ácido Fólico',   dose: '5mg',   frequency: '1x ao dia',
    duration: '90 dias',  startDate: dateAgo(60), isActive: true,  prescribedBy: 'Dr. Ghiotti' },
  { id: 'm3',  patientId: 'p2', name: 'Sulfato Ferroso', dose: '40mg', frequency: '2x ao dia',
    duration: '60 dias',  startDate: dateAgo(30), isActive: true,  prescribedBy: 'Dr. Ghiotti' },
  { id: 'm4',  patientId: 'p2', name: 'Ácido Fólico',   dose: '5mg',   frequency: '1x ao dia',
    duration: '90 dias',  startDate: dateAgo(90), isActive: true,  prescribedBy: 'Dr. Ghiotti' },
  { id: 'm5',  patientId: 'p3', name: 'Ácido Fólico',   dose: '5mg',   frequency: '1x ao dia',
    duration: '90 dias',  startDate: dateAgo(45), isActive: true,  prescribedBy: 'Dr. Ghiotti' },
  { id: 'm6',  patientId: 'p4', name: 'Nifedipino',     dose: '30mg',  frequency: '2x ao dia',
    duration: '30 dias',  startDate: dateAgo(7),  isActive: true,  prescribedBy: 'Dr. Ghiotti',
    notes: 'Monitorar PA 2x/dia. Repouso relativo.' },
  { id: 'm7',  patientId: 'p4', name: 'Metildopa',      dose: '500mg', frequency: '3x ao dia',
    duration: '30 dias',  startDate: dateAgo(21), isActive: true,  prescribedBy: 'Dr. Ghiotti' },
  { id: 'm8',  patientId: 'p5', name: 'Ácido Fólico',   dose: '5mg',   frequency: '1x ao dia',
    duration: '90 dias',  startDate: dateAgo(20), isActive: true,  prescribedBy: 'Dr. Ghiotti' },
  { id: 'm9',  patientId: 'p6', name: 'Metoclopramida', dose: '10mg',  frequency: '3x ao dia',
    duration: '14 dias',  startDate: dateAgo(5),  isActive: true,  prescribedBy: 'Dr. Ghiotti',
    notes: 'Tomar 30 min antes das refeições' },
  { id: 'm10', patientId: 'p6', name: 'Vitamina B6',    dose: '40mg',  frequency: '3x ao dia',
    duration: '30 dias',  startDate: dateAgo(5),  isActive: true,  prescribedBy: 'Dr. Ghiotti' },
];

// ─── PRONTUÁRIOS ─────────────────────────────────────────────────────────────
export const mockMedicalRecords: MedicalRecord[] = [
  {
    id: 'mr1', patientId: 'p1', date: isoAgo(14),
    summary: 'Paciente apresentou PA de 135/88 em consulta. Iniciado tratamento anti-hipertensivo.',
    actions: ['Iniciou Metildopa 250mg 3x/dia', 'Solicitado exame de urina 24h', 'Orientada sobre sinais de alarme'],
    nextAppointment: dateAgo(-7),
    doctorId: 'doc1', doctorName: 'Dr. Ghiotti',
  },
  {
    id: 'mr2', patientId: 'p4', date: isoAgo(7),
    summary: 'Paciente com 35s apresentou PA de 152/98 e edema 2+. Associado Nifedipino à Metildopa.',
    actions: ['Adicionou Nifedipino 30mg 2x/dia', 'Solicitada proteinúria 24h', 'Solicitada cardiotocografia (CTG)', 'Orientada: procurar emergência se cefaleia intensa ou visão turva'],
    nextAppointment: dateAgo(-3),
    doctorId: 'doc1', doctorName: 'Dr. Ghiotti',
  },
  {
    id: 'mr3', patientId: 'p2', date: isoAgo(10),
    summary: 'Consulta de rotina. Edema discreto em MMII. PA 128/82. Bem-estar fetal preservado.',
    actions: ['Orientada sobre hidratação', 'Repouso com MMII elevados', 'Retorno em 15 dias'],
    nextAppointment: dateAgo(-5),
    doctorId: 'doc1', doctorName: 'Dr. Ghiotti',
  },
  {
    id: 'mr4', patientId: 'p6', date: isoAgo(5),
    summary: 'Hiperemese gravídica com perda de 0,8 kg na semana. Prescrito antiemético.',
    actions: ['Prescrito Metoclopramida + Vitamina B6', 'Orientada sobre alimentação fracionada', 'Retorno em 10 dias ou antes se piora'],
    nextAppointment: dateAgo(-5),
    doctorId: 'doc1', doctorName: 'Dr. Ghiotti',
  },
];

// ─── RESUMOS DO ASSISTENTE ───────────────────────────────────────────────────
export const mockSummaries: Record<string, AssistantSummary> = {
  p1: {
    patientId: 'p1', generatedAt: isoAgo(0),
    summaryText: 'Nos últimos 7 dias, Maria registrou 4 relatos. A pressão sistólica apresentou tendência de aumento progressivo: de 128 mmHg (há 6 dias) para 148 mmHg (hoje), variação de +15,6%. Pressão diastólica: de 82 para 95 mmHg (+15,9%). Frequência cardíaca estável entre 82–90 bpm. Oxigenação mantida entre 97–98%. Cefaleia foi mencionada em 3 dos 4 registros.',
    changesDetected: [
      'Variação de +15,6% na pressão sistólica nos últimos 7 dias',
      'Cefaleia relatada em 3 dos últimos 4 registros',
      'Pressão diastólica variou +15,9% (82 → 95 mmHg)',
    ],
    dataPoints: 4,
  },
  p2: {
    patientId: 'p2', generatedAt: isoAgo(1),
    summaryText: 'Ana registrou 2 relatos nos últimos 7 dias. Pressão sistólica com aumento gradual: de 118 para 132 mmHg (+11,9%). Edema em membros inferiores relatado em 1 ocorrência. Frequência cardíaca e oxigenação estáveis.',
    changesDetected: [
      'Variação de +11,9% na pressão sistólica nos últimos 7 dias',
      'Edema em MMII relatado em 1 registro',
    ],
    dataPoints: 2,
  },
  p3: {
    patientId: 'p3', generatedAt: isoAgo(2),
    summaryText: 'Paula registrou 1 relato nos últimos 7 dias. Todos os sinais vitais estáveis e dentro do padrão das medições anteriores. Pressão sistólica variou entre 110–113 mmHg. Nenhuma mudança significativa detectada.',
    changesDetected: [],
    dataPoints: 1,
  },
  p4: {
    patientId: 'p4', generatedAt: isoAgo(0),
    summaryText: 'Luciana registrou 2 relatos nos últimos 7 dias. Pressão sistólica apresentou aumento progressivo: de 138 para 155 mmHg (+12,3%). Pressão diastólica: de 88 para 100 mmHg (+13,6%). Oxigenação reduziu de 97% para 96%. Edema, cefaleia e alteração visual relatados no último registro.',
    changesDetected: [
      'Variação de +12,3% na pressão sistólica nos últimos 7 dias',
      'Variação de +13,6% na pressão diastólica',
      'Oxigenação reduziu: 97% → 96%',
      'Alteração visual relatada no último registro',
      'Edema e cefaleia presentes em 2 registros consecutivos',
    ],
    dataPoints: 2,
  },
  p5: {
    patientId: 'p5', generatedAt: isoAgo(3),
    summaryText: 'Beatriz registrou 1 relato nos últimos 7 dias. Pressão arterial e frequência cardíaca estáveis. Oxigenação variou pontualmente para 95% há 3 dias (retornou a 97%). Falta de ar ao esforço relatada em 1 registro.',
    changesDetected: [
      'Oxigenação variou para 95% em medição de há 3 dias (anteriores: 98%)',
      'Falta de ar ao esforço relatada',
    ],
    dataPoints: 1,
  },
  p6: {
    patientId: 'p6', generatedAt: isoAgo(1),
    summaryText: 'Carla registrou 2 relatos nos últimos 7 dias. Pressão arterial e frequência cardíaca estáveis. Peso apresentou variação de −0,8 kg na semana (de 64,2 para 63,4 kg). Náuseas relatadas em 2 registros consecutivos.',
    changesDetected: [
      'Variação de −0,8 kg no peso nesta semana',
      'Náuseas relatadas em 2 registros consecutivos',
    ],
    dataPoints: 2,
  },
};

// ─── TIMELINE DE EVENTOS ─────────────────────────────────────────────────────
export const mockTimeline: Record<string, TimelineEvent[]> = {
  p1: [
    { id: 'te1', patientId: 'p1', date: isoAgo(0, 8),  type: 'report',      hasFlag: true,  description: 'Relato: cefaleia intensa e tontura' },
    { id: 'te2', patientId: 'p1', date: isoAgo(0, 7),  type: 'vitals',      hasFlag: true,  description: 'Sinais vitais: PA 148/95 mmHg · FC 90 bpm' },
    { id: 'te3', patientId: 'p1', date: isoAgo(1, 10), type: 'report',      hasFlag: true,  description: 'Relato: cefaleia leve' },
    { id: 'te4', patientId: 'p1', date: isoAgo(2, 9),  type: 'report',      hasFlag: false, description: 'Relato: cansaço, edema noturno' },
    { id: 'te5', patientId: 'p1', date: isoAgo(14, 14),type: 'appointment', hasFlag: false, description: 'Consulta: iniciado Metildopa 250mg' },
  ],
  p2: [
    { id: 'te6', patientId: 'p2', date: isoAgo(1, 9),   type: 'report',      hasFlag: true,  description: 'Relato: inchaço nos tornozelos' },
    { id: 'te7', patientId: 'p2', date: isoAgo(1, 8),   type: 'vitals',      hasFlag: false, description: 'Sinais vitais: PA 132/88 mmHg · FC 86 bpm' },
    { id: 'te8', patientId: 'p2', date: isoAgo(10, 10), type: 'appointment', hasFlag: false, description: 'Consulta de rotina: orientações sobre hidratação' },
  ],
  p3: [
    { id: 'te9',  patientId: 'p3', date: isoAgo(2, 10), type: 'report', hasFlag: false, description: 'Relato: sem queixas, caminhada leve' },
    { id: 'te10', patientId: 'p3', date: isoAgo(2, 9),  type: 'vitals', hasFlag: false, description: 'Sinais vitais: PA 112/72 mmHg · O₂ 99%' },
  ],
  p4: [
    { id: 'te11', patientId: 'p4', date: isoAgo(0, 7),  type: 'report',      hasFlag: true,  description: 'Relato: alteração visual, cefaleia, edema generalizado' },
    { id: 'te12', patientId: 'p4', date: isoAgo(0, 6),  type: 'vitals',      hasFlag: true,  description: 'Sinais vitais: PA 155/100 mmHg · O₂ 96%' },
    { id: 'te13', patientId: 'p4', date: isoAgo(7, 14), type: 'appointment', hasFlag: false, description: 'Consulta: adicionado Nifedipino 30mg' },
  ],
  p5: [
    { id: 'te14', patientId: 'p5', date: isoAgo(3, 11), type: 'report', hasFlag: true, description: 'Relato: falta de ar ao esforço' },
    { id: 'te15', patientId: 'p5', date: isoAgo(3, 10), type: 'vitals', hasFlag: true, description: 'Sinais vitais: O₂ 95% (pontual)' },
  ],
  p6: [
    { id: 'te16', patientId: 'p6', date: isoAgo(1, 8),  type: 'report',     hasFlag: true,  description: 'Relato: náuseas o dia todo, vômito' },
    { id: 'te17', patientId: 'p6', date: isoAgo(5, 14), type: 'appointment', hasFlag: false, description: 'Consulta: prescrito antiemético e B6' },
    { id: 'te18', patientId: 'p6', date: isoAgo(5, 13), type: 'medication',  hasFlag: false, description: 'Metoclopramida + Vitamina B6 iniciados' },
  ],
};

// ─── KPI ─────────────────────────────────────────────────────────────────────
export const mockKPI: KPIData = {
  newReportsToday: 2,   // p1 e p4 relataram hoje
  pendingAlerts: 5,     // p1(2 flags) + p4(3 flags)
  activePatients: 6,
};

// ─── API SIMULADA (async) ─────────────────────────────────────────────────────
export async function fetchPatients(): Promise<Patient[]> {
  await delay(600);
  return [...mockPatients];
}

export async function fetchPatient(id: string): Promise<Patient | undefined> {
  await delay(400);
  return mockPatients.find(p => p.id === id);
}

export async function fetchReports(patientId: string): Promise<DailyReport[]> {
  await delay(300);
  return mockReports
    .filter(r => r.patientId === patientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchMedications(patientId: string): Promise<Medication[]> {
  await delay(300);
  return mockMedications.filter(m => m.patientId === patientId);
}

export async function fetchMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
  await delay(300);
  return mockMedicalRecords
    .filter(r => r.patientId === patientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchSummary(patientId: string): Promise<AssistantSummary | undefined> {
  await delay(500);
  return mockSummaries[patientId];
}

export async function fetchTimeline(patientId: string): Promise<TimelineEvent[]> {
  await delay(200);
  return (mockTimeline[patientId] ?? [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchKPI(): Promise<KPIData> {
  await delay(300);
  return { ...mockKPI };
}

export async function addMedication(
  med: Omit<Medication, 'id'>,
): Promise<Medication> {
  await delay(600);
  return { ...med, id: `m${Date.now()}` };
}

export async function addMedicalRecord(
  rec: Omit<MedicalRecord, 'id'>,
): Promise<MedicalRecord> {
  await delay(600);
  return { ...rec, id: `mr${Date.now()}` };
}

export async function addVitalSign(
  vs: Omit<VitalSign, 'id'>,
): Promise<VitalSign> {
  await delay(600);
  return { ...vs, id: `vs${Date.now()}` };
}

/** Lista de pacientes disponíveis para associação (simulação) */
export async function fetchAvailablePatients(): Promise<Pick<Patient, 'id' | 'name' | 'cpf' | 'age'>[]> {
  await delay(400);
  return [
    { id: 'np1', name: 'Fernanda Lima Souza',      cpf: '111.222.333-44', age: 26 },
    { id: 'np2', name: 'Roberta Alves Pereira',    cpf: '555.666.777-88', age: 32 },
    { id: 'np3', name: 'Juliana Castro Nascimento', cpf: '999.000.111-22', age: 29 },
  ];
}
