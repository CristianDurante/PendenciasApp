import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CheckSquare,
  MessageSquare,
  Paperclip,
  History,
  ListTodo,
  Trash2,
  Copy,
  CheckCircle2,
  RotateCcw,
  Pencil,
  Upload,
  Download,
  Plus,
  CalendarClock,
  User,
  FolderKanban,
  Building2,
  Cpu,
  Tags as TagsIcon,
  Repeat,
  StickyNote,
  Flag
} from 'lucide-react'
import type { Pendencia, Historico, Comentario, Anexo, ChecklistItem } from '@shared/types'
import { PENDENCIA_STATUS, PENDENCIA_STATUS_LABEL, PRIORIDADE_LABEL } from '@shared/constants'
import { Drawer, Button, Select, Avatar, TagBadge, PriorityBadge, StatusBadge, EmptyState, Loading, ConfirmDialog, ProgressBar, Spinner } from '../ui'
import { TagPicker } from './TagPicker'
import { useAppStore } from '../../store/appStore'
import { useCatalogoStore } from '../../store/catalogoStore'
import { call, downloadArquivo } from '../../lib/api'
import { formatarData, formatarDataHora, formatarTamanho, cn, relativo } from '../../lib/format'

type Aba = 'geral' | 'checklist' | 'comentarios' | 'anexos' | 'historico'

export function PendenciaDetail(): ReactNode {
  const pendencia = useAppStore((s) => s.pendenciaDestaque)
  const fechar = useAppStore((s) => s.abrirPendencia)
  const pushToast = useAppStore((s) => s.pushToast)
  const atualizarNoState = useAppStore((s) => s.atualizarPendenciaNoState)
  const notificarMudanca = useAppStore((s) => s.notificarMudanca)
  const carregarDashboard = useAppStore((s) => s.carregarDashboard)
  const usuarios = useCatalogoStore((s) => s.usuarios)
  const recarregarCatalogo = useCatalogoStore((s) => s.recarregar)
  const abrirNovaPendencia = useAppStore((s) => s.abrirNovaPendencia)

  // Usa somente o ID (estável) para evitar loop de re-renderização.
  const pendenciaId = pendencia?.id ?? null

  const [dados, setDados] = useState<Pendencia | null>(null)
  const [aba, setAba] = useState<Aba>('geral')
  const [carregando, setCarregando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [confirmarConclusao, setConfirmarConclusao] = useState(false)
  const [novoComentario, setNovoComentario] = useState('')
  const [novoChecklist, setNovoChecklist] = useState('')
  const [historico, setHistorico] = useState<Historico[]>([])
  // Guarda contra múltiplos cliques/submissões simultâneas.
  const [operacao, setOperacao] = useState(false)
  const operacaoRef = useRef(false)
  const idAtualRef = useRef<string | null>(null)

  const carregar = useCallback(async (): Promise<void> => {
    if (!pendenciaId) {
      setDados(null)
      setHistorico([])
      return
    }
    idAtualRef.current = pendenciaId
    setCarregando(true)
    try {
      const p = await call<Pendencia>('pendencia', 'obter', { id: pendenciaId })
      if (idAtualRef.current !== pendenciaId) return
      setDados(p)
      const h = await call<Historico[]>('historico', 'listar', { entidade: 'pendencia', entidadeId: p.id })
      if (idAtualRef.current !== pendenciaId) return
      setHistorico(h)
    } catch {
      if (idAtualRef.current === pendenciaId) setDados(null)
    } finally {
      if (idAtualRef.current === pendenciaId) setCarregando(false)
    }
  }, [pendenciaId])

  useEffect(() => {
    void carregar()
    setAba('geral')
  }, [carregar])

  const executarAcao = useCallback(
    async (fn: () => Promise<unknown>, msgSucesso?: string): Promise<void> => {
      if (operacaoRef.current) return
      operacaoRef.current = true
      setOperacao(true)
      try {
        const resultado = await fn()
        if (msgSucesso) pushToast('sucesso', msgSucesso)
        if (resultado && typeof resultado === 'object' && 'id' in (resultado as Pendencia)) {
          atualizarNoState(resultado as Pendencia)
        }
        await carregar()
        notificarMudanca()
        void carregarDashboard(true)
        void recarregarCatalogo()
      } catch (e) {
        pushToast('erro', 'Erro na operação', (e as Error).message)
      } finally {
        operacaoRef.current = false
        setOperacao(false)
      }
    },
    [carregar, atualizarNoState, notificarMudanca, pushToast, carregarDashboard, recarregarCatalogo]
  )

  const atualizarAposAcao = useCallback(async (): Promise<void> => {
    await carregar()
    notificarMudanca()
    void carregarDashboard(true)
  }, [carregar, notificarMudanca, carregarDashboard])

  const mudarStatus = (status: string): void => {
    if (!dados || status === dados.status || operacaoRef.current) return
    if (status === 'CONCLUIDA') {
      const pendentes = (dados.checklist || []).filter((i) => !i.concluido)
      if (pendentes.length > 0) {
        setConfirmarConclusao(true)
        return
      }
    }
    void executarAcao(() => call('pendencia', status === 'CONCLUIDA' ? 'concluir' : 'status', { id: dados.id, status }), 'Status atualizado')
  }

  const concluir = (): void => {
    if (!dados || operacaoRef.current) return
    const pendentes = (dados.checklist || []).filter((i) => !i.concluido)
    if (pendentes.length > 0) {
      setConfirmarConclusao(true)
      return
    }
    void executarAcao(() => call('pendencia', 'concluir', { id: dados.id }), 'Pendência concluída')
  }

  const confirmarConclusaoHandler = (): void => {
    if (!dados) return
    setConfirmarConclusao(false)
    void executarAcao(() => call('pendencia', 'concluir', { id: dados.id }), 'Pendência concluída')
  }

  const confirmarExclusaoHandler = (): void => {
    if (!dados) return
    setConfirmarExclusao(false)
    void executarAcao(async () => {
      await call('pendencia', 'excluir', { id: dados.id })
      fechar(null)
      return { ok: true }
    }, 'Pendência excluída')
  }

  const adicionarChecklist = (descricao: string): void => {
    if (!dados || operacaoRef.current) return
    void executarAcao(async () => {
      await call('pendencia', 'checklistAdicionar', { pendenciaId: dados.id, descricao })
      return { ok: true }
    }, 'Item adicionado ao checklist')
  }

  const alternarChecklist = (itemId: string): void => {
    if (!dados || operacaoRef.current) return
    void executarAcao(async () => {
      await call('pendencia', 'checklistToggle', { itemId })
      return { ok: true }
    })
  }

  const removerChecklist = (itemId: string): void => {
    if (!dados || operacaoRef.current) return
    void executarAcao(async () => {
      await call('pendencia', 'checklistRemover', { itemId })
      return { ok: true }
    }, 'Item removido do checklist')
  }

  const enviarComentario = (): void => {
    if (!dados || operacaoRef.current || !novoComentario.trim()) return
    const conteudo = novoComentario.trim()
    void executarAcao(async () => {
      await call('pendencia', 'comentarioAdicionar', { pendenciaId: dados.id, conteudo })
      setNovoComentario('')
      return { ok: true }
    }, 'Comentário adicionado')
  }

  if (!pendencia) return null

  return (
    <Drawer aberto={!!pendencia} aoFechar={() => fechar(null)} titulo="Detalhes da pendência" largura="max-w-4xl">
      {carregando && !dados ? (
        <Loading />
      ) : dados ? (
        <div>
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge status={dados.status} />
                  <PriorityBadge prioridade={dados.prioridade} />
                  {dados.atrasada && (
                    <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30">
                      Atrasada
                    </span>
                  )}
                  {dados.progresso !== undefined && dados.progresso > 0 && (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/30">
                      {dados.progresso}% concluída
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{dados.titulo}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Select
                  className="!w-auto !py-1.5 text-xs"
                  value={dados.status}
                  disabled={operacao}
                  onChange={(e) => mudarStatus(e.target.value)}
                >
                  {PENDENCIA_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {PENDENCIA_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" className="!px-2.5 !py-1.5" disabled={operacao} onClick={() => abrirNovaPendencia({ pendencia: dados })} title="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                {dados.status === 'CONCLUIDA' ? (
                  <Button variant="secondary" className="!px-2.5 !py-1.5" disabled={operacao} onClick={() => void executarAcao(() => call('pendencia', 'reabrir', { id: dados.id }), 'Pendência reaberta')} title="Reabrir">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="success" className="!px-2.5 !py-1.5" disabled={operacao} onClick={concluir} title="Concluir">
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="secondary" className="!px-2.5 !py-1.5" disabled={operacao} onClick={() => void executarAcao(() => call('pendencia', 'duplicar', { id: dados.id }), 'Pendência duplicada')} title="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="danger" className="!px-2.5 !py-1.5" disabled={operacao} onClick={() => setConfirmarExclusao(true)} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {dados.tags && dados.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dados.tags.map((t) => (
                  <TagBadge key={t.tagId} tag={t.tag!} />
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pt-2 dark:border-slate-800">
            {[
              { id: 'geral', label: 'Visão geral', icone: <StickyNote className="h-4 w-4" /> },
              { id: 'checklist', label: `Checklist (${dados.checklist?.length || 0})`, icone: <ListTodo className="h-4 w-4" /> },
              { id: 'comentarios', label: `Comentários (${dados.comentarios?.length || 0})`, icone: <MessageSquare className="h-4 w-4" /> },
              { id: 'anexos', label: `Anexos (${dados.anexos?.length || 0})`, icone: <Paperclip className="h-4 w-4" /> },
              { id: 'historico', label: 'Histórico', icone: <History className="h-4 w-4" /> }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setAba(t.id as Aba)}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
                  aba === t.id
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                )}
              >
                {t.icone}
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-6 py-4">
            {aba === 'geral' && (
              <VisaoGeral
                dados={dados}
                operacao={operacao}
                aoSalvarTags={(tags) =>
                  void executarAcao(
                    () => call('pendencia', 'atualizar', { id: dados.id, tags }),
                    'Tags atualizadas'
                  )
                }
              />
            )}
            {aba === 'checklist' && (
              <ChecklistSection
                itens={dados.checklist || []}
                operacao={operacao}
                aoAdicionar={adicionarChecklist}
                aoToggle={alternarChecklist}
                aoRemover={removerChecklist}
                novoChecklist={novoChecklist}
                setNovoChecklist={setNovoChecklist}
              />
            )}
            {aba === 'comentarios' && (
              <ComentariosSection
                comentarios={dados.comentarios || []}
                usuarios={usuarios}
                operacao={operacao}
                novoComentario={novoComentario}
                setNovoComentario={setNovoComentario}
                aoEnviar={enviarComentario}
              />
            )}
            {aba === 'anexos' && (
              <AnexosSection
                pendenciaId={dados.id}
                anexos={dados.anexos || []}
                operacao={operacao}
                aoAtualizar={atualizarAposAcao}
              />
            )}
            {aba === 'historico' && <HistoricoSection itens={historico} />}
          </div>

          <ConfirmDialog
            aberto={confirmarConclusao}
            aoFechar={() => setConfirmarConclusao(false)}
            aoConfirmar={confirmarConclusaoHandler}
            titulo="Concluir pendência"
            mensagem="Existem itens de checklist não concluídos. Deseja concluir mesmo assim?"
            confirmarTexto="Concluir mesmo assim"
          />

          <ConfirmDialog
            aberto={confirmarExclusao}
            aoFechar={() => setConfirmarExclusao(false)}
            aoConfirmar={confirmarExclusaoHandler}
            titulo="Excluir pendência"
            mensagem={`Deseja realmente excluir "${dados.titulo}"? Esta ação não pode ser desfeita.`}
            confirmarTexto="Excluir"
            perigo
          />
        </div>
      ) : (
        <EmptyState titulo="Pendência não encontrada" />
      )}
    </Drawer>
  )
}

function VisaoGeral({
  dados,
  operacao,
  aoSalvarTags
}: {
  dados: Pendencia
  operacao: boolean
  aoSalvarTags: (tags: string[]) => void
}): ReactNode {
  const [tags, setTags] = useState<string[]>((dados.tags || []).map((t) => t.tagId))
  useEffect(() => {
    setTags((dados.tags || []).map((t) => t.tagId))
  }, [dados.tags])
  const itens: Array<{ rotulo: string; valor: string; icone: ReactNode }> = [
    { rotulo: 'Cliente', valor: dados.cliente?.nome || '—', icone: <Building2 className="h-4 w-4" /> },
    { rotulo: 'Projeto', valor: dados.projeto?.nome || '—', icone: <FolderKanban className="h-4 w-4" /> },
    { rotulo: 'Sistema', valor: dados.sistema || '—', icone: <Cpu className="h-4 w-4" /> },
    { rotulo: 'Responsável', valor: dados.responsavel?.nome || 'Sem responsável', icone: <User className="h-4 w-4" /> },
    { rotulo: 'Categoria', valor: dados.categoria?.nome || '—', icone: <TagsIcon className="h-4 w-4" /> },
    { rotulo: 'Departamento', valor: dados.departamento || '—', icone: <Building2 className="h-4 w-4" /> },
    {
      rotulo: 'Prazo',
      valor: dados.prazo ? `${formatarData(dados.prazo)}${dados.horario ? ` às ${dados.horario}` : ''} (${relativo(dados.prazo)})` : '—',
      icone: <CalendarClock className="h-4 w-4" />
    },
    { rotulo: 'Criada por', valor: dados.criador?.nome || '—', icone: <User className="h-4 w-4" /> },
    {
      rotulo: 'Criada em',
      valor: formatarDataHora(dados.criadoEm),
      icone: <CalendarClock className="h-4 w-4" />
    },
    { rotulo: 'Prioridade', valor: PRIORIDADE_LABEL[dados.prioridade], icone: <CheckCircle2 className="h-4 w-4" /> }
  ]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {itens.map((i) => (
          <div key={i.rotulo} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <span className="mt-0.5 text-slate-400">{i.icone}</span>
            <div>
              <p className="text-xs text-slate-400">{i.rotulo}</p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{i.valor}</p>
            </div>
          </div>
        ))}
      </div>

      {dados.descricao && (
        <div>
          <h4 className="label">Descrição</h4>
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{dados.descricao}</p>
        </div>
      )}

      <div>
        <h4 className="label">Tags</h4>
        <TagPicker selecionadas={tags} aoMudar={(novas) => aoSalvarTags(novas)} desabilitado={operacao} />
      </div>

      {dados.recorrencia && (
        <div className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
          <span className="inline-flex items-center gap-1.5">
            <Repeat className="h-4 w-4" />
            Recorrência: {(JSON.parse(dados.recorrencia) as { tipo: string }).tipo}
          </span>
        </div>
      )}

      {dados.observacoes && (
        <div>
          <h4 className="label">Observações</h4>
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{dados.observacoes}</p>
        </div>
      )}
    </div>
  )
}

function ChecklistSection({
  itens,
  operacao,
  aoAdicionar,
  aoToggle,
  aoRemover,
  novoChecklist,
  setNovoChecklist
}: {
  itens: ChecklistItem[]
  operacao: boolean
  aoAdicionar: (descricao: string) => void
  aoToggle: (itemId: string) => void
  aoRemover: (itemId: string) => void
  novoChecklist: string
  setNovoChecklist: (v: string) => void
}): ReactNode {
  const concluidos = itens.filter((i) => i.concluido).length
  const progresso = itens.length ? Math.round((concluidos / itens.length) * 100) : 0
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {concluidos} de {itens.length} itens concluídos
          </span>
          <span className="font-semibold text-brand-600">{progresso}%</span>
        </div>
        <ProgressBar valor={progresso} />
      </div>

      {itens.length === 0 && <EmptyState titulo="Sem itens no checklist" descricao="Adicione subtarefas para acompanhar o progresso." />}

      <div className="space-y-2">
        {itens.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
          >
            <button
              onClick={() => aoToggle(item.id)}
              disabled={operacao}
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition',
                item.concluido ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-brand-400 dark:border-slate-600',
                operacao && 'opacity-60'
              )}
            >
              {item.concluido && <CheckCircle2 className="h-4 w-4" />}
            </button>
            <span className={cn('flex-1 text-sm', item.concluido ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100')}>
              {item.descricao}
            </span>
            <button className="text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-red-500 disabled:opacity-40" disabled={operacao} onClick={() => aoRemover(item.id)}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Adicionar subtarefa..."
          value={novoChecklist}
          onChange={(e) => setNovoChecklist(e.target.value)}
          disabled={operacao}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && novoChecklist.trim()) {
              aoAdicionar(novoChecklist.trim())
              setNovoChecklist('')
            }
          }}
        />
        <Button
          variant="secondary"
          disabled={operacao || !novoChecklist.trim()}
          onClick={() => {
            if (novoChecklist.trim()) {
              aoAdicionar(novoChecklist.trim())
              setNovoChecklist('')
            }
          }}
        >
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>
    </div>
  )
}

function ComentariosSection({
  comentarios,
  usuarios,
  operacao,
  novoComentario,
  setNovoComentario,
  aoEnviar
}: {
  comentarios: Comentario[]
  usuarios: Array<{ id: string; nome: string }>
  operacao: boolean
  novoComentario: string
  setNovoComentario: (v: string) => void
  aoEnviar: () => void
}): ReactNode {
  const eu = useAppStore((s) => s.sessao?.usuario)
  const pushToast = useAppStore((s) => s.pushToast)
  void usuarios
  void pushToast
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Avatar nome={eu?.nome} tamanho={32} />
        <div className="flex-1">
          <textarea
            className="input"
            rows={3}
            placeholder="Escreva um comentário..."
            value={novoComentario}
            disabled={operacao}
            onChange={(e) => setNovoComentario(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button
              onClick={() => aoEnviar()}
              disabled={operacao || !novoComentario.trim()}
            >
              Comentar
            </Button>
          </div>
        </div>
      </div>

      {comentarios.length === 0 && <EmptyState titulo="Sem comentários" descricao="Seja o primeiro a comentar." />}

      <div className="space-y-4">
        {comentarios.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar nome={c.usuario?.nome} tamanho={32} />
            <div className="flex-1 rounded-xl rounded-tl-none border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{c.usuario?.nome || 'Usuário'}</span>
                <span className="text-xs text-slate-400">{formatarDataHora(c.criadoEm)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{c.conteudo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnexosSection({ pendenciaId, anexos, operacao, aoAtualizar }: { pendenciaId: string; anexos: Anexo[]; operacao: boolean; aoAtualizar: () => Promise<void> }): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  const enviar = async (arquivo: File): Promise<void> => {
    if (enviandoRef.current || operacao) return
    const ext = arquivo.name.split('.').pop()?.toLowerCase() || ''
    const permitidas = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx', 'txt']
    if (!permitidas.includes(ext)) {
      pushToast('erro', 'Extensão não permitida', `Apenas: ${permitidas.join(', ')}`)
      return
    }
    if (arquivo.size > 15 * 1024 * 1024) {
      pushToast('erro', 'Arquivo muito grande', 'Máximo de 15 MB por anexo.')
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    try {
      const buffer = await arquivo.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binario = ''
      bytes.forEach((b) => {
        binario += String.fromCharCode(b)
      })
      const base64 = btoa(binario)
      await call('anexo', 'criar', {
        pendenciaId,
        nomeOriginal: arquivo.name,
        tipo: ext,
        tamanho: arquivo.size,
        conteudoBase64: base64
      })
      pushToast('sucesso', 'Anexo adicionado', arquivo.name)
      await aoAtualizar()
    } catch (e) {
      pushToast('erro', 'Erro ao enviar anexo', (e as Error).message)
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  const baixar = async (id: string): Promise<void> => {
    try {
      const a = await call<{ nomeOriginal: string; tipo: string; conteudoBase64: string }>('anexo', 'conteudo', { id })
      downloadArquivo(a.nomeOriginal, a.conteudoBase64, a.tipo)
    } catch (e) {
      pushToast('erro', 'Erro ao baixar', (e as Error).message)
    }
  }

  const excluir = async (id: string): Promise<void> => {
    if (enviandoRef.current || operacao) return
    try {
      await call('anexo', 'excluir', { id })
      pushToast('sucesso', 'Anexo removido')
      await aoAtualizar()
    } catch (e) {
      pushToast('erro', 'Erro ao excluir', (e as Error).message)
    }
  }

  const ocupado = enviando || operacao

  return (
    <div className="space-y-4">
      <label className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 text-slate-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700',
        ocupado && 'pointer-events-none opacity-60'
      )}>
        {enviando ? <Spinner /> : <Upload className="h-8 w-8" />}
        <span className="text-sm font-medium">{enviando ? 'Enviando...' : 'Clique para enviar anexo'}</span>
        <span className="text-xs text-slate-400">PDF, PNG, JPG, DOCX, XLSX ou TXT · máx. 15 MB</span>
        <input
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt"
          disabled={ocupado}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void enviar(f)
            e.target.value = ''
          }}
        />
      </label>

      {anexos.length === 0 && <EmptyState titulo="Sem anexos" />}

      <div className="space-y-2">
        {anexos.map((a) => (
          <div key={a.id} className="group flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30">
              <Paperclip className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{a.nomeOriginal}</p>
              <p className="text-xs text-slate-400">
                {formatarTamanho(a.tamanho)} · {a.usuario?.nome} · {formatarDataHora(a.criadoEm)}
              </p>
            </div>
            <button className="text-slate-400 hover:text-brand-500" onClick={() => void baixar(a.id)} title="Baixar">
              <Download className="h-4 w-4" />
            </button>
            <button className="text-slate-400 hover:text-red-500 disabled:opacity-40" disabled={ocupado} onClick={() => void excluir(a.id)} title="Excluir">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoricoSection({ itens }: { itens: Historico[] }): ReactNode {
  const icones: Record<string, ReactNode> = {
    CRIACAO: <Plus className="h-3.5 w-3.5" />,
    ALTERACAO: <Pencil className="h-3.5 w-3.5" />,
    STATUS: <CheckSquare className="h-3.5 w-3.5" />,
    PRAZO: <CalendarClock className="h-3.5 w-3.5" />,
    RESPONSAVEL: <User className="h-3.5 w-3.5" />,
    PRIORIDADE: <Flag className="h-3.5 w-3.5" />,
    TAGS: <TagsIcon className="h-3.5 w-3.5" />,
    CHECKLIST: <ListTodo className="h-3.5 w-3.5" />,
    COMENTARIO: <MessageSquare className="h-3.5 w-3.5" />,
    ANEXO: <Paperclip className="h-3.5 w-3.5" />,
    CONCLUSAO: <CheckCircle2 className="h-3.5 w-3.5" />,
    REABERTURA: <RotateCcw className="h-3.5 w-3.5" />,
    EXCLUSAO: <Trash2 className="h-3.5 w-3.5" />,
    RECORRENCIA: <Repeat className="h-3.5 w-3.5" />
  }
  if (itens.length === 0) return <EmptyState titulo="Sem histórico" />
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">
      {itens.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[26px] flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 shadow dark:bg-slate-800">
            {icones[h.tipo] || <CheckSquare className="h-3 w-3" />}
          </span>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-slate-800 dark:text-slate-100">{h.descricao}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {h.usuario?.nome || 'Sistema'} · {formatarDataHora(h.dataHora)}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
