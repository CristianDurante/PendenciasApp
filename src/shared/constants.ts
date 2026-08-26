import type {
  Prioridade,
  PendenciaStatus,
  CompromissoStatus,
  RetornoStatus,
  ProjetoStatus,
  Perfil
} from './types'

export const PERFIS: Perfil[] = ['ADMIN', 'GESTOR', 'USUARIO']

export const PERFIL_LABEL: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  USUARIO: 'Usuário'
}

export const PRIORIDADES: Prioridade[] = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  BAIXA: 'Baixa',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  URGENTE: 'Urgente'
}

export const PRIORIDADE_COR: Record<Prioridade, string> = {
  BAIXA: '#94a3b8',
  NORMAL: '#3b82f6',
  ALTA: '#f59e0b',
  URGENTE: '#ef4444'
}

export const PENDENCIA_STATUS: PendenciaStatus[] = [
  'A_FAZER',
  'EM_ANDAMENTO',
  'AGUARDANDO_RETORNO',
  'BLOQUEADA',
  'CONCLUIDA',
  'CANCELADA'
]

export const PENDENCIA_STATUS_LABEL: Record<PendenciaStatus, string> = {
  A_FAZER: 'A fazer',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_RETORNO: 'Aguardando retorno',
  BLOQUEADA: 'Bloqueada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada'
}

export const PENDENCIA_STATUS_COR: Record<PendenciaStatus, string> = {
  A_FAZER: '#64748b',
  EM_ANDAMENTO: '#2563eb',
  AGUARDANDO_RETORNO: '#d97706',
  BLOQUEADA: '#dc2626',
  CONCLUIDA: '#16a34a',
  CANCELADA: '#9ca3af'
}

export const COMPROMISSO_STATUS: CompromissoStatus[] = ['AGENDADO', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO']

export const COMPROMISSO_STATUS_LABEL: Record<CompromissoStatus, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado'
}

export const COMPROMISSO_STATUS_COR: Record<CompromissoStatus, string> = {
  AGENDADO: '#64748b',
  CONFIRMADO: '#2563eb',
  CONCLUIDO: '#16a34a',
  CANCELADO: '#9ca3af'
}

export const RETORNO_STATUS: RetornoStatus[] = [
  'PENDENTE',
  'EM_CONTATO',
  'AGUARDANDO_CLIENTE',
  'RESPONDIDO',
  'CONCLUIDO'
]

export const RETORNO_STATUS_LABEL: Record<RetornoStatus, string> = {
  PENDENTE: 'Pendente',
  EM_CONTATO: 'Em contato',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  RESPONDIDO: 'Respondido',
  CONCLUIDO: 'Concluído'
}

export const RETORNO_STATUS_COR: Record<RetornoStatus, string> = {
  PENDENTE: '#dc2626',
  EM_CONTATO: '#2563eb',
  AGUARDANDO_CLIENTE: '#d97706',
  RESPONDIDO: '#7c3aed',
  CONCLUIDO: '#16a34a'
}

export const PROJETO_STATUS: ProjetoStatus[] = ['ATIVO', 'PAUSADO', 'CONCLUIDO', 'ENCERRADO']

export const PROJETO_STATUS_LABEL: Record<ProjetoStatus, string> = {
  ATIVO: 'Ativo',
  PAUSADO: 'Pausado',
  CONCLUIDO: 'Concluído',
  ENCERRADO: 'Encerrado'
}

export const PROJETO_STATUS_COR: Record<ProjetoStatus, string> = {
  ATIVO: '#16a34a',
  PAUSADO: '#d97706',
  CONCLUIDO: '#2563eb',
  ENCERRADO: '#9ca3af'
}

export const CATEGORIAS_INICIAIS = [
  { nome: 'Cliente', cor: '#0ea5e9' },
  { nome: 'Suporte', cor: '#6366f1' },
  { nome: 'Implantação', cor: '#14b8a6' },
  { nome: 'Configuração', cor: '#8b5cf6' },
  { nome: 'Desenvolvimento', cor: '#f59e0b' },
  { nome: 'QA/Testes', cor: '#ef4444' },
  { nome: 'Documentação', cor: '#64748b' },
  { nome: 'Reunião', cor: '#3b82f6' },
  { nome: 'Contratos', cor: '#10b981' },
  { nome: 'Financeiro', cor: '#f97316' },
  { nome: 'Outros', cor: '#6b7280' }
]

export const TAGS_SUGERIDAS = [
  { nome: 'Cliente', cor: '#0ea5e9' },
  { nome: 'Urgente', cor: '#ef4444' },
  { nome: 'Homologação', cor: '#f59e0b' },
  { nome: 'Produção', cor: '#dc2626' },
  { nome: 'Bug', cor: '#ef4444' },
  { nome: 'Melhoria', cor: '#10b981' },
  { nome: 'Configuração', cor: '#8b5cf6' },
  { nome: 'Implantação', cor: '#14b8a6' },
  { nome: 'Aguardando Cliente', cor: '#d97706' },
  { nome: 'Financeiro', cor: '#f97316' },
  { nome: 'Documentação', cor: '#64748b' },
  { nome: 'Integração', cor: '#6366f1' }
]

export const LEMBRETES_OPCOES = [
  { value: 1440, label: '1 dia antes' },
  { value: 120, label: '2 horas antes' },
  { value: 60, label: '1 hora antes' },
  { value: 30, label: '30 min antes' },
  { value: 15, label: '15 min antes' }
]

export const RECORRENCIA_OPCOES = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' }
]

export const EXTENSOES_ANEXO = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx', 'txt']
export const TAMANHO_MAX_ANEXO = 15 * 1024 * 1024 // 15MB

export const DEPARTAMENTOS_SUGERIDOS = [
  'Consultoria',
  'Suporte',
  'Projetos',
  'QA',
  'Desenvolvimento',
  'Comercial',
  'Financeiro',
  'RH'
]

export const TIPOS_NOTIFICACAO: Record<string, string> = {
  prazo: 'Prazo',
  comentario: 'Comentário',
  alteracao: 'Alteração',
  compromisso: 'Compromisso',
  retorno: 'Retorno',
  conclusao: 'Conclusão',
  lembrete: 'Lembrete',
  sistema: 'Sistema'
}
