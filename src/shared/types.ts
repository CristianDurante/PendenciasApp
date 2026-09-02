export type Perfil = 'ADMIN' | 'GESTOR' | 'USUARIO'
export type Prioridade = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'
export type PendenciaStatus =
  | 'A_FAZER'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_RETORNO'
  | 'BLOQUEADA'
  | 'CONCLUIDA'
  | 'CANCELADA'
export type CompromissoStatus = 'AGENDADO' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO'
export type RetornoStatus = 'PENDENTE' | 'EM_CONTATO' | 'AGUARDANDO_CLIENTE' | 'RESPONDIDO' | 'CONCLUIDO'
export type ProjetoStatus = 'ATIVO' | 'PAUSADO' | 'CONCLUIDO' | 'ENCERRADO'
export type PrioridadeStatus = Prioridade

export interface Empresa {
  id: string
  nome: string
  cnpj: string | null
  logo: string | null
  email: string | null
  telefone: string | null
  config: string | null
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface Equipe {
  id: string
  nome: string
  descricao: string | null
  liderId: string | null
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
  lider?: Usuario | null
  usuarios?: Usuario[]
  quantidadeUsuarios?: number
  quantidadePendencias?: number
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  cargo: string | null
  telefone: string | null
  avatar: string | null
  ativo: boolean
  empresaId: string | null
  equipeId: string | null
  ultimoAcesso: string | null
  criadoEm: string
  atualizadoEm: string
  equipe?: Equipe | null
}

export interface Cliente {
  id: string
  nome: string
  empresa: string | null
  cnpj: string | null
  contato: string | null
  email: string | null
  telefone: string | null
  sistema: string | null
  projeto: string | null
  responsavelInterno: string | null
  observacoes: string | null
  ativo: boolean
  empresaId: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface Projeto {
  id: string
  nome: string
  descricao: string | null
  status: ProjetoStatus
  responsavelId: string | null
  clienteId: string | null
  dataInicio: string | null
  dataFim: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface Categoria {
  id: string
  nome: string
  cor: string
  padrao: boolean
  ativo: boolean
  criadoEm: string
}

export interface Tag {
  id: string
  nome: string
  cor: string
  descricao: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface ChecklistItem {
  id: string
  pendenciaId: string
  descricao: string
  concluido: boolean
  concluidoEm: string | null
  criadoEm: string
}

export interface Comentario {
  id: string
  pendenciaId: string
  usuarioId: string
  conteudo: string
  criadoEm: string
  usuario?: Usuario | null
}

export interface Anexo {
  id: string
  pendenciaId: string
  usuarioId: string
  nomeOriginal: string
  arquivo: string
  tipo: string
  tamanho: number
  criadoEm: string
  usuario?: Usuario | null
}

export interface Pendencia {
  id: string
  titulo: string
  descricao: string | null
  clienteId: string | null
  projetoId: string | null
  sistema: string | null
  responsavelId: string | null
  criadorId: string
  equipeId: string | null
  criadoEm: string
  prazo: string | null
  horario: string | null
  prioridade: Prioridade
  categoriaId: string | null
  departamento: string | null
  status: PendenciaStatus
  observacoes: string | null
  concluidaEm: string | null
  recorrencia: string | null
  ultimaAtualizacao: string
  criador?: Usuario | null
  responsavel?: Usuario | null
  cliente?: Cliente | null
  projeto?: Projeto | null
  categoria?: Categoria | null
  equipe?: Equipe | null
  tags?: PendenciaTag[]
  comentarios?: Comentario[]
  anexos?: Anexo[]
  checklist?: ChecklistItem[]
  atrasada?: boolean
  progresso?: number
}

export interface PendenciaTag {
  pendenciaId: string
  tagId: string
  tag?: Tag
}

export interface Nota {
  id: string
  titulo: string
  conteudo: string | null
  clienteId: string | null
  projetoId: string | null
  pendenciaId: string | null
  compromissoId: string | null
  usuarioId: string
  criadoEm: string
  atualizadoEm: string
  usuario?: Usuario | null
  cliente?: Cliente | null
  pendencia?: Pendencia | null
}

export interface Compromisso {
  id: string
  titulo: string
  clienteId: string | null
  projetoId: string | null
  responsavelId: string | null
  data: string
  horaInicio: string | null
  horaFim: string | null
  local: string | null
  link: string | null
  participantes: string | null
  descricao: string | null
  observacoes: string | null
  lembreteMinutos: number | null
  lembreteDisparado: boolean
  status: CompromissoStatus
  criadoEm: string
  atualizadoEm: string
  cliente?: Cliente | null
  responsavel?: Usuario | null
}

export interface Retorno {
  id: string
  clienteId: string | null
  contato: string | null
  assunto: string
  dataPrevista: string | null
  horario: string | null
  responsavelId: string | null
  observacao: string | null
  status: RetornoStatus
  criadoEm: string
  concluidoEm: string | null
  atualizadoEm: string
  cliente?: Cliente | null
  responsavel?: Usuario | null
}

export interface Historico {
  id: string
  entidade: string
  entidadeId: string
  usuarioId: string | null
  tipo: string
  descricao: string
  detalhes: string | null
  dataHora: string
  usuario?: Usuario | null
}

export interface Notificacao {
  id: string
  usuarioId: string
  tipo: string
  titulo: string
  mensagem: string | null
  relacionadoId: string | null
  lida: boolean
  criadoEm: string
}

export interface Lembrete {
  id: string
  usuarioId: string | null
  entidade: string | null
  entidadeId: string | null
  dataHora: string
  mensagem: string
  disparado: boolean
  criadoEm: string
}

export interface SessaoInfo {
  token: string
  usuario: Usuario
  empresa: Empresa | null
  expiraEm: string
}

export interface Convite {
  id: string
  email: string
  nome: string
  perfil: Perfil
  cargo: string | null
  telefone: string | null
  empresaId: string | null
  equipeId: string | null
  criadoEm: string
  expiraEm: string
  usadoEm: string | null
  canceladoEm: string | null
  token?: string
}

export interface ApiRequest {
  resource: string
  action: string
  args?: object
  token?: string
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface ApiContext {
  usuarioId: string
  perfil: Perfil
  empresaId: string | null
  equipeId: string | null
  isAdmin: boolean
}

export interface FiltroPendencias {
  busca?: string
  status?: string[]
  prioridade?: string[]
  clienteId?: string
  projetoId?: string
  responsavelId?: string
  categoriaId?: string
  equipeId?: string
  tags?: string[]
  departamento?: string
  prazoDe?: string
  prazoAte?: string
  prazoHoje?: boolean
  prazoProximas?: boolean
  atrasadas?: boolean
  semResponsavel?: boolean
  pagina?: number
  porPagina?: number
  ordenacao?: string
  ordem?: 'asc' | 'desc'
}

export interface DadosClienteDetail {
  cliente: Cliente
  pendencias: Pendencia[]
  pendenciasAbertas: number
  pendenciasConcluidas: number
  pendenciasAtrasadas: number
  compromissos: Compromisso[]
  retornos: Retorno[]
  notas: Nota[]
}

export interface RelatorioPendencia {
  id: string
  titulo: string
  cliente: string
  projeto: string
  responsavel: string
  prioridade: Prioridade
  categoria: string
  status: string
  criadoEm: string
  prazo: string | null
  concluidaEm: string | null
  diasParaConcluir: number | null
  tags: string[]
}

export interface DadosDashboard {
  contadores: {
    atrasadas: number
    hoje: number
    proximas: number
    emAndamento: number
    aguardandoRetorno: number
    concluidas: number
    semResponsavel: number
  }
  pendenciasHoje: Pendencia[]
  atrasadas: Pendencia[]
  proximas: Pendencia[]
  retornosPendentes: Retorno[]
  retornosAtrasados: Retorno[]
  compromissosHoje: Compromisso[]
  proximosCompromissos: Compromisso[]
  porCliente: Array<{ label: string; valor: number }>
  porProjeto: Array<{ label: string; valor: number }>
  porPrioridade: Array<{ label: string; valor: number }>
  porStatus: Array<{ label: string; valor: number }>
  porTag: Array<{ tag: Tag; valor: number }>
  porCategoria: Array<{ label: string; valor: number }>
  porEquipe: Array<{ label: string; valor: number }>
  atividadeRecente: Historico[]
  lembretes: Lembrete[]
  meuDia: {
    compromissos: Compromisso[]
    pendencias: Pendencia[]
    retornos: Retorno[]
  }
  totalPendencias: number
}

export interface ConfigApp {
  tema?: 'light' | 'dark' | 'system'
  notificacoes?: {
    desktop: boolean
    prazos: boolean
    comentarios: boolean
    compromissos: boolean
    retornos: boolean
    alteracoes: boolean
  }
  lembretes?: {
    padraoMinutos: number | null
  }
  backup?: {
    automatico: boolean
    intervaloHoras: number
    local: string | null
  }
  empresa?: Partial<Empresa>
}

export interface BackupInfo {
  ultimoBackup: string | null
  proximoBackup: string | null
  tamanho: number
  local: string
}

export interface LoginResult {
  sessao: SessaoInfo
}

export type EntidadeHistorico =
  | 'pendencia'
  | 'cliente'
  | 'projeto'
  | 'compromisso'
  | 'retorno'
  | 'tag'
  | 'nota'
  | 'anexo'
  | 'usuario'
  | 'equipe'
  | 'empresa'
