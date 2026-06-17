export type Status = 'Pendente' | 'Concluído' | 'Reprogramado';

export interface Activity {
  id: string;
  atividade: string;
  ordem: string;
  data: string;
  executante: string;
  status: Status;
  observacoes: string;
  fotos: string[]; // Base64 strings or URLs
  historico: HistoryEntry[];
}

export interface HistoryEntry {
  id: string;
  usuario: string; // 'Admin', 'Usuário' or specific name if available
  data: string; // ISO string
  mensagem: string;
}

export interface Project {
  id: string;
  adminUid: string;
  nome: string;
  dataCriacao: string; // ISO string
}
