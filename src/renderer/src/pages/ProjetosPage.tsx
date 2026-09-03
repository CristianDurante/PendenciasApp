import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FolderKanban, Pencil, Eye, Trash2, CheckCircle2, TriangleAlert } from 'lucide-react'
import type { Projeto } from '@shared/types'
import { PROJETO_STATUS, PROJETO_STATUS_LABEL } from '@shared/constants'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { call } from '../lib/api'
import { cn } from '../lib/format'
import { Button, Input, Textarea, Select, Modal, ConfirmDialog, ProjetoStatusBadge, ProgressBar, EmptyState, Loading, Avatar } from '../components/ui'

export interface ProjetoComDados extends Projeto {
  progresso?: number
  totalPendencias?: number
  concluidas?: number
  cliente?: { id: string; nome: string } | null
  responsavel?: { id: string; nome: string; avatar?: string | null } | null
}

interface FormProjeto {
  nome: string
  descricao: string
  status: string
  responsavelId: string
  clienteId: string
  dataInicio: string
  dataFim: string
}

const formVazio: FormProjeto = { nome: '', descricao: '', status: 'ATIVO', responsavelId: '', clienteId: '', dataInicio: '', dataFim: '' }

export function ProjetosPage(): ReactNode {
  const navigate = useNavigate()
  const pushToast = useAppStore((s) => s.pushToast)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const recarregar = useCatalogoStore((s) => s.recarregar)
  const clientes = useCatalogoStore((s) => s.clientes)
  const usuarios = useCatalogoStore((s) => s.usuarios)

  const [itens, setItens] = useState<ProjetoComDados[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ProjetoComDados | null>(null)
  const [excluindo, setExcluindo] = useState<ProjetoComDados | null>(null)
  const [removendo, setRemovendo] = useState(false)

  useEffect(() => {
    void carregarCatalogo()
  }, [carregarCatalogo])

  useEffect(() => {
    void call<ProjetoComDados[]>('projeto', 'listar', { busca }).then(setItens).finally(() => setCarregando(false))
  }, [busca])

  async function salvar(dados: FormProjeto): Promise<void> {
    if (editando) {
      await call('projeto', 'atualizar', { id: editando.id, ...dados })
      pushToast('sucesso', 'Projeto atualizado')
    } else {
      await call('projeto', 'criar', dados)
      pushToast('sucesso', 'Projeto criado')
    }
    setModalAberto(false)
    setEditando(null)
    const lista = await call<ProjetoComDados[]>('projeto', 'listar', { busca })
    setItens(lista)
    await recarregar()
  }

  async function excluir(): Promise<void> {
    if (!excluindo) return
    setRemovendo(true)
    try {
      await call('projeto', 'excluir', { id: excluindo.id })
      pushToast('sucesso', 'Projeto excluído')
      setExcluindo(null)
      setItens(await call<ProjetoComDados[]>('projeto', 'listar', { busca }))
      await recarregar()
    } catch (e) {
      pushToast('erro', 'Falha ao excluir projeto', e instanceof Error ? e.message : undefined)
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar projetos…" className="input !pl-9" />
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true) }}>
          <Plus className="h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <div className="flex h-full items-center justify-center"><Loading /></div>
        ) : itens.length === 0 ? (
          <EmptyState titulo="Nenhum projeto" descricao="Crie projetos para agrupar pendências." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {itens.map((p) => (
              <div key={p.id} className="card group">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800 dark:text-white">{p.nome}</p>
                    <p className="truncate text-xs text-slate-400">{p.cliente?.nome || 'Sem cliente'}</p>
                  </div>
                  <ProjetoStatusBadge status={p.status} />
                </div>
                {p.descricao && <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{p.descricao}</p>}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {p.concluidas ?? 0}/{p.totalPendencias ?? 0} concluídas
                    </span>
                    <span>{p.progresso ?? 0}%</span>
                  </div>
                  <ProgressBar valor={p.progresso ?? 0} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {p.responsavel ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar nome={p.responsavel.nome} tamanho={22} />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{p.responsavel.nome}</span>
                    </div>
                  ) : <span />}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${p.id}`)}><Eye className="h-3.5 w-3.5" /> Ver</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditando(p); setModalAberto(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setExcluindo(p)} title="Excluir projeto"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProjetoModal aberto={modalAberto} aoFechar={() => { setModalAberto(false); setEditando(null) }} editando={editando} aoSalvar={salvar} />

      <ConfirmDialog
        aberto={!!excluindo}
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={() => void excluir()}
        titulo="Excluir projeto"
        mensagem={`Excluir o projeto "${excluindo?.nome || ''}"? As pendências vinculadas ficarão sem projeto.`}
        confirmarTexto={removendo ? 'Excluindo…' : 'Excluir'}
        perigo
      />
    </div>
  )
}

function ProjetoModal({ aberto, aoFechar, editando, aoSalvar }: { aberto: boolean; aoFechar: () => void; editando: ProjetoComDados | null; aoSalvar: (d: FormProjeto) => Promise<void> }): ReactNode {
  const clientes = useCatalogoStore((s) => s.clientes)
  const usuarios = useCatalogoStore((s) => s.usuarios)
  const [form, setForm] = useState<FormProjeto>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      setForm(editando ? {
        nome: editando.nome,
        descricao: editando.descricao || '',
        status: editando.status,
        responsavelId: editando.responsavelId || '',
        clienteId: editando.clienteId || '',
        dataInicio: editando.dataInicio ? editando.dataInicio.slice(0, 10) : '',
        dataFim: editando.dataFim ? editando.dataFim.slice(0, 10) : ''
      } : { ...formVazio })
      setErro('')
    }
  }, [aberto, editando])

  async function salvar(): Promise<void> {
    if (!form.nome.trim()) {
      setErro('Informe o nome do projeto.')
      return
    }
    if (!editando && !form.clienteId) {
      setErro('Selecione o cliente do projeto.')
      return
    }
    setSalvando(true)
    try {
      await aoSalvar({ ...form, status: form.status || 'ATIVO' })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={editando ? 'Editar projeto' : 'Novo projeto'} largura="max-w-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nome *</label>
          <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Implementação de integração" />
        </div>
        <div>
          <label className="label">Status</label>
          <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            {PROJETO_STATUS.map((s) => <option key={s} value={s}>{PROJETO_STATUS_LABEL[s]}</option>)}
          </Select>
        </div>
        <div>
          <label className="label">Cliente *</label>
          <Select value={form.clienteId} onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}>
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
        <div>
          <label className="label">Responsável</label>
          <Select value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}>
            <option value="">Sem responsável</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
        </div>
        <div />
        <div>
          <label className="label">Data início</label>
          <Input type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
        </div>
        <div>
          <label className="label">Data fim</label>
          <Input type="date" value={form.dataFim} onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descrição</label>
          <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={3} />
        </div>
      </div>
      {erro && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{erro}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={aoFechar}>Cancelar</Button>
        <Button onClick={() => void salvar()} carregando={salvando}>Salvar</Button>
      </div>
    </Modal>
  )
}
