import { User, UserRole, RelatoDiario, ResumoIA, Medicamento } from '../types/domain';

let currentUser: User | null = null;

const fakeUsers: User[] = [
  {
    id: '1',
    email: 'gestante@example.com',
    role: 'gestante',
    nomeCompleto: 'Teste Gestante',
  },
  {
    id: '2',
    email: 'medico@example.com',
    role: 'medico',
    nomeCompleto: 'Dr. Teste Medico',
  },
];

const fakeRelatos: RelatoDiario[] = [
  {
    id: '1',
    gestanteId: '1',
    data: '2026-01-28',
    descricao: 'Dia calmo, sem sintomas preocupantes.',
    humor: 'feliz',
    sintomas: [],
    criadoEm: '2026-01-28T10:00:00Z',
  },
  {
    id: '2',
    gestanteId: '1',
    data: '2026-01-27',
    descricao: 'Sentindo um pouco de enjôo à noite.',
    humor: 'normal',
    sintomas: ['enjôo', 'fadiga'],
    criadoEm: '2026-01-27T14:30:00Z',
  },
];

const fakeResumos: ResumoIA[] = [
  {
    id: '1',
    relatoId: '1',
    tipo: 'diario',
    resumo: 'Gestante apresenta bom estado geral com ausência de sintomas críticos.',
    sintomasIdentificados: [],
    avisos: [],
    recomendacoes: 'Continuar acompanhamento regular e manter hidratação adequada.',
    semaforo: 'verde',
  },
  {
    id: '2',
    relatoId: '2',
    tipo: 'diario',
    resumo: 'Relato de enjôo e fadiga. Sintomas comuns na gestação, monitorar evolução.',
    sintomasIdentificados: ['enjôo', 'fadiga'],
    avisos: ['Acompanhar intensidade dos sintomas'],
    recomendacoes: 'Consultar médico se sintomas intensificarem. Fazer repouso adequado.',
    semaforo: 'amarelo',
  },
];

const fakeMedicamentos: Medicamento[] = [
  {
    id: '1',
    gestanteId: '1',
    nome: 'Vitamina D',
    dosagem: '1000 UI',
    frequencia: 'Uma vez ao dia',
    dataInicio: '2026-01-01',
    dataFim: null,
    ativo: true,
  },
  {
    id: '2',
    gestanteId: '1',
    nome: 'Ácido Fólico',
    dosagem: '400 mcg',
    frequencia: 'Uma vez ao dia',
    dataInicio: '2026-01-01',
    dataFim: null,
    ativo: true,
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginMock(email: string, role: UserRole): Promise<User> {
  await delay(600);

  const user = fakeUsers.find((u) => u.email === email && u.role === role) ?? null;

  if (!user) {
    const newUser: User = {
      id: String(fakeUsers.length + 1),
      email,
      role,
      nomeCompleto: role === 'gestante' ? 'Nova Gestante' : 'Novo Médico',
    };
    fakeUsers.push(newUser);
    currentUser = newUser;
    return newUser;
  }

  currentUser = user;
  return user;
}

export async function getCurrentUserMock(): Promise<User | null> {
  await delay(300);
  return currentUser;
}

export function logoutMock(): void {
  currentUser = null;
}

export async function getRelatos(gestanteId: string): Promise<RelatoDiario[]> {
  await delay(500);
  return fakeRelatos.filter((r) => r.gestanteId === gestanteId);
}

export async function createRelato(relato: Omit<RelatoDiario, 'id' | 'criadoEm'>): Promise<RelatoDiario> {
  await delay(400);
  const newRelato: RelatoDiario = {
    ...relato,
    id: String(fakeRelatos.length + 1),
    criadoEm: new Date().toISOString(),
  };
  fakeRelatos.push(newRelato);
  return newRelato;
}

export async function getResumos(gestanteId: string): Promise<ResumoIA[]> {
  await delay(500);
  return fakeResumos;
}

export async function getMedicamentos(gestanteId: string): Promise<Medicamento[]> {
  await delay(500);
  return fakeMedicamentos.filter((m) => m.gestanteId === gestanteId);
}

export async function getPacientesMedico(): Promise<any[]> {
  await delay(500);
  return [
    {
      id: '1',
      nome: 'Teste Gestante',
      dataUltimaMenstruacao: '2025-10-01',
      dataPrevistaParto: '2026-06-28',
      ultimoResumo: fakeResumos[0],
    },
  ];
}
