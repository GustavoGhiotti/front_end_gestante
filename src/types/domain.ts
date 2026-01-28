export type UserRole = 'gestante' | 'medico';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  nomeCompleto: string;
}

export interface Gestante {
  id: string;
  userId: string;
  nomeCompleto: string;
  dataNascimento: string;
  dataUltimaMenstruacao: string;
  dataPrevistaParto: string;
  telefone: string;
  endereco: string;
}

export interface Medico {
  id: string;
  userId: string;
  nomeCompleto: string;
  crm: string;
  especialidade: string;
  telefone: string;
}

export interface RelatoDiario {
  id: string;
  gestanteId: string;
  data: string;
  descricao: string;
  humor: string;
  sintomas: string[];
  criadoEm: string;
}

export type SemaforoStatus = 'verde' | 'amarelo' | 'vermelho';

export interface ResumoIA {
  id: string;
  relatoId: string;
  tipo: 'diario' | 'semanal';
  resumo: string;
  sintomasIdentificados: string[];
  avisos: string[];
  recomendacoes: string;
  semaforo: SemaforoStatus;
}

export interface Medicamento {
  id: string;
  gestanteId: string;
  nome: string;
  dosagem: string;
  frequencia: string;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
}
