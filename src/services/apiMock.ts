import { User, RelatoDiario, Medicamento, Consulta, ResumoIA } from '../types/domain';

// ============================================
// DADOS MOCK - SIMULANDO BANCO DE DADOS
// ============================================

const gestantes: User[] = [
  {
    id: '1',
    nomeCompleto: 'Maria Silva',
    email: 'maria@example.com',
    role: 'gestante',
    semanasGestacao: 28,
  },
  {
    id: '2',
    nomeCompleto: 'Ana Santos',
    email: 'ana@example.com',
    role: 'gestante',
    semanasGestacao: 32,
  },
  {
    id: '3',
    nomeCompleto: 'Paula Costa',
    email: 'paula@example.com',
    role: 'gestante',
    semanasGestacao: 20,
  },
  {
    id: '4',
    nomeCompleto: 'Lucia Oliveira',
    email: 'lucia@example.com',
    role: 'gestante',
    semanasGestacao: 35,
  },
];

const medicos: User[] = [
  {
    id: 'med-1',
    nomeCompleto: 'Dr. Teste Ghiotti',
    email: 'medico@example.com',
    role: 'medico',
  },
];

const relatos: RelatoDiario[] = [
  {
    id: '1',
    gestanteId: '1',
    data: '2026-01-28',
    descricao: 'Dia normal, sem grandes incômodos. Bebê se mexendo bastante.',
    sintomas: ['cansaço', 'inchaço', 'dor nas costas'],
    humor: 'feliz',
  },
  {
    id: '2',
    gestanteId: '1',
    data: '2026-01-25',
    descricao: 'Senti azia e alguns gases. Mas nada preocupante.',
    sintomas: ['azia', 'gases'],
    humor: 'normal',
  },
  {
    id: '3',
    gestanteId: '2',
    data: '2026-01-27',
    descricao: 'Muito cansada, tentei descansar o dia todo.',
    sintomas: ['contrações', 'cansaço extremo'],
    humor: 'triste',
  },
  {
    id: '4',
    gestanteId: '2',
    data: '2026-01-20',
    descricao: 'Dia melhor, consegui sair um pouco.',
    sintomas: ['cansaço leve'],
    humor: 'normal',
  },
  {
    id: '5',
    gestanteId: '3',
    data: '2026-01-26',
    descricao: 'Pressão arterial elevada conforme aferição em casa.',
    sintomas: ['pressão alta', 'dor de cabeça', 'edema severo'],
    humor: 'ansioso',
  },
  {
    id: '6',
    gestanteId: '4',
    data: '2026-01-15',
    descricao: 'Tudo bem, sem maiores sintomas.',
    sintomas: ['inchaço leve'],
    humor: 'feliz',
  },
];

const medicamentos: Medicamento[] = [
  {
    id: '1',
    gestanteId: '1',
    nome: 'Ácido Fólico',
    dosagem: '400 mcg',
    frequencia: '1x ao dia',
    ativo: true,
    dataPrescricao: '2025-10-01',
  },
  {
    id: '2',
    gestanteId: '1',
    nome: 'Ferro',
    dosagem: '65 mg',
    frequencia: '1x ao dia',
    ativo: true,
    dataPrescricao: '2025-10-01',
  },
  {
    id: '3',
    gestanteId: '2',
    nome: 'Repouso Relativo',
    dosagem: 'N/A',
    frequencia: 'Contínuo',
    ativo: true,
    dataPrescricao: '2026-01-01',
  },
  {
    id: '4',
    gestanteId: '3',
    nome: 'Anti-hipertensivo',
    dosagem: '10 mg',
    frequencia: '2x ao dia',
    ativo: true,
    dataPrescricao: '2025-12-15',
  },
  {
    id: '5',
    gestanteId: '4',
    nome: 'Vitamina D',
    dosagem: '1000 UI',
    frequencia: '1x ao dia',
    ativo: true,
    dataPrescricao: '2025-11-01',
  },
];

const consultas: Consulta[] = [
  {
    id: '1',
    gestanteId: '1',
    data: '2026-02-10',
    tipo: 'ultrassom',
    observacoes: 'Bebê com desenvolvimento normal',
  },
  {
    id: '2',
    gestanteId: '2',
    data: '2026-01-15',
    tipo: 'pressão',
    observacoes: 'Monitorar a cada 2 dias',
  },
];

// ============================================
// AUTENTICAÇÃO
// ============================================

export async function loginMock(email: string, role: 'gestante' | 'medico'): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (role === 'gestante') {
        const user = gestantes.find((g) => g.email === email);
        if (user) {
          resolve(user);
        } else {
          reject(new Error('Usuário não encontrado'));
        }
      } else {
        const user = medicos.find((m) => m.email === email);
        if (user) {
          resolve(user);
        } else {
          reject(new Error('Usuário não encontrado'));
        }
      }
    }, 500);
  });
}

export async function getCurrentUserMock(): Promise<User | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        resolve(JSON.parse(userJson));
      } else {
        resolve(null);
      }
    }, 300);
  });
}

export function logoutMock(): void {
  localStorage.removeItem('user');
}

// ============================================
// RELATOS
// ============================================

export async function getRelatos(gestanteId: string): Promise<RelatoDiario[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const relatosFiltrados = relatos
        .filter((r) => r.gestanteId === gestanteId)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      resolve(relatosFiltrados);
    }, 300);
  });
}

export async function getRelatosGestante(gestanteId: string): Promise<RelatoDiario[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const relatosFiltrados = relatos
        .filter((r) => r.gestanteId === gestanteId)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      resolve(relatosFiltrados);
    }, 300);
  });
}

export async function createRelato(novoRelato: RelatoDiario): Promise<RelatoDiario> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const relato = {
        ...novoRelato,
        id: String(relatos.length + 1),
      };
      relatos.push(relato);
      resolve(relato);
    }, 300);
  });
}

// ============================================
// MEDICAMENTOS
// ============================================

export async function getMedicamentos(gestanteId: string): Promise<Medicamento[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const medicamentosFiltrados = medicamentos.filter(
        (m) => m.gestanteId === gestanteId
      );
      resolve(medicamentosFiltrados);
    }, 300);
  });
}

export async function getMedicamentosGestante(gestanteId: string): Promise<Medicamento[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const medicamentosFiltrados = medicamentos.filter(
        (m) => m.gestanteId === gestanteId
      );
      resolve(medicamentosFiltrados);
    }, 300);
  });
}

export async function createMedicamento(novoMedicamento: Medicamento): Promise<Medicamento> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const med = {
        ...novoMedicamento,
        id: String(medicamentos.length + 1),
      };
      medicamentos.push(med);
      resolve(med);
    }, 300);
  });
}

// ============================================
// CONSULTAS
// ============================================

export async function getConsultas(gestanteId: string): Promise<Consulta[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const consultasFiltradas = consultas.filter(
        (c) => c.gestanteId === gestanteId
      );
      resolve(consultasFiltradas);
    }, 300);
  });
}

export async function createConsulta(novaConsulta: Consulta): Promise<Consulta> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const consulta = {
        ...novaConsulta,
        id: String(consultas.length + 1),
      };
      consultas.push(consulta);
      resolve(consulta);
    }, 300);
  });
}

// ============================================
// FUNÇÕES PARA MÉDICO
// ============================================

export async function getAllGestantes(): Promise<User[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(gestantes);
    }, 300);
  });
}

export async function getGestanteById(id: string): Promise<User | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const gestante = gestantes.find((g) => g.id === id);
      resolve(gestante || null);
    }, 300);
  });
}

// ============================================
// RESUMOS DA IA (Mock)
// ============================================

const resumosMock: (ResumoIA & { gestanteId: string, data:string })[] = [
  {
    id: '1',
    gestanteId: '1',
    relatoId: '1',
    data: '2026-01-28',
    tipo: 'diario',
    semaforo: 'verde',
    resumo: 'Análise diária indica estabilidade. Sintomas leves de cansaço relatados, dentro da normalidade para o período.',
    sintomasIdentificados: ['cansaço', 'inchaço leve'],
    avisos: [],
    recomendacoes: 'Manter hidratação e rotina de sono. Repouso se o inchaço aumentar.',
  },
  {
    id: '2',
    gestanteId: '1',
    relatoId: '2',
    data: '2026-01-21',
    tipo: 'semanal',
    semaforo: 'amarelo',
    resumo: 'Análise semanal aponta aumento na frequência de azia e desconforto gástrico. Padrão de sono irregular.',
    sintomasIdentificados: ['azia', 'gases', 'insônia'],
    avisos: ['Qualidade do sono reduzida', 'Desconforto gástrico frequente'],
    recomendacoes: 'Evitar refeições pesadas à noite. Tentar elevar a cabeceira da cama.',
  }
];

export async function getResumos(gestanteId: string): Promise<ResumoIA[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const results = resumosMock.filter((r) => r.gestanteId === gestanteId);
      resolve(results);
    }, 600);
  });
}

export async function getResumosIA(gestanteId: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const gestante = gestantes.find((g) => g.id === gestanteId);
      const relatosDaGestante = relatos.filter((r) => r.gestanteId === gestanteId);

      const resumo = `
RESUMO DE ANÁLISE - IA MÉDICA
============================

Paciente: ${gestante?.nomeCompleto || 'Não identificada'}
Semanas de Gestação: ${gestante?.semanasGestacao || '—'}
Total de Relatos: ${relatosDaGestante.length}

ANÁLISE:
--------
${
  relatosDaGestante.length === 0
    ? 'Nenhum relato registrado para análise.'
    : `Baseado em ${relatosDaGestante.length} relatos, observamos os seguintes padrões:

Sintomas Mais Frequentes:
${getAllSymptoms(relatosDaGestante)
  .slice(0, 5)
  .map((s, i) => `${i + 1}. ${s.sintoma} (${s.count}x)`)
  .join('\n')}

Humor Predominante:
${getMoodAnalysis(relatosDaGestante)}

Recomendações:
- Manter acompanhamento regular
- Continuar registrando sintomas diariamente
- Procurar médico se surgirem sintomas graves
`
}

Gerado em: ${new Date().toLocaleString('pt-BR')}
      `;

      resolve(resumo);
    }, 1000);
  });
}

function getAllSymptoms(
  relatosList: RelatoDiario[]
): Array<{ sintoma: string; count: number }> {
  const symptoms: Record<string, number> = {};

  relatosList.forEach((relato) => {
    relato.sintomas.forEach((sintoma) => {
      symptoms[sintoma] = (symptoms[sintoma] || 0) + 1;
    });
  });

  return Object.entries(symptoms)
    .map(([sintoma, count]) => ({ sintoma, count }))
    .sort((a, b) => b.count - a.count);
}

function getMoodAnalysis(relatosList: RelatoDiario[]): string {
  const moods: Record<string, number> = {};

  relatosList.forEach((relato) => {
    moods[relato.humor] = (moods[relato.humor] || 0) + 1;
  });

  const maisPequente = Object.entries(moods).sort((a, b) => b[1] - a[1])[0];

  const moodEmojis: Record<string, string> = {
    feliz: '😊 Feliz',
    normal: '😐 Normal',
    triste: '😢 Triste',
    ansioso: '😰 Ansioso',
  };

  return moodEmojis[maisPequente[0]] || 'Normal';
}