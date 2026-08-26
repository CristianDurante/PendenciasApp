import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Plus, Search, CalendarClock, MapPin, Link2, Pencil, Trash2, Users } from 'lucide-react'
import type { Compromisso } from '@shared/types'
import { COMPROMISSO_STATUS, COMPROMISSO_STATUS_LABEL, LEMBRETES_OPCOES } from '@shared/constants'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { call } from '../lib/api'
import { formatarData, cn } from '../lib/format'
import { Button, Input, Textarea, Select, Modal, ConfirmDialog, Avatar, CompromissoStatusBadge, EmptyState, Loading } from '../components/ui'

interface FormCompromisso {
  titulo: string
  clienteId: string
  responsavelId: string
  data: string
  horaInicio: string
  horaFim: string
  local: string
  link: string
  participantes: string
  lembreteMinutos: string
  descricao: string
}

const formVazio: FormCompromisso = {
  titulo: '',
  clienteId: '',
  responsavelId: '',
  data: '',
  horaInicio: '',
  horaFim: '',
  local: '',
  link: '',
  participantes: '',
  lembreteMinutos: '',
  descricao: ''
}

export function CompromissosPage(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const clientes = useCatalogoStore((s) => s.clientes)
  const usuarios = useCatalogoStore((s) => s.usuarios)

  const [itens, setItens] = useState<Compromisso[]>([])
  const [busca, setBusca] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Compromisso | null>(null)
  const [excluindo, setExcluindo] = useState<Compromisso | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true)
    const lista = await call<Compromisso[]>('compromisso', 'listar', { busca, clienteId: filtroCliente || undefined }).catch(() => [])
    setItens(lista)
    setCarregando(false)
  }, [busca, filtroCliente])

  useEffect(() => {
    void carregarCatalogo()
  }, [carregarCatalogo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(dados: FormCompromisso): Promise<void> {
    const payload = {
      titulo: dados.titulo,
      clienteId: dados.clienteId || null,
      responsavelId: dados.responsavelId || null,
      data: dados.data,
      horaInicio: dados.horaInicio || null,
      horaFim: dados.horaFim || null,
      local: dados.local || null,
      link: dados.link || null,
      participantes: dados.participantes || null,
      descricao: dados.descricao || null,
      lembreteMinutos: dados.lembreteMinutos ? Number(dados.lembreteMinutos) : null
    }
    if (editando) {
      await call('compromisso', 'atualizar', { id: editando.id, ...payload })
      pushToast('sucesso', 'Compromisso atualizado')
    } else {
      await call('compromisso', 'criar', payload)
      pushToast('sucesso', 'Compromisso criado')
    }
    setModalAberto(false)
    setEditando(null)
    await carregar()
  }

  async function mudarStatus(c: Compromisso, status: string): Promise<void> {
    await call('compromisso', 'status', { id: c.id, status })
    pushToast('sucesso', 'Status atualizado')
    await carregar()
  }

  async function excluir(): Promise<void> {
    if (!excluindo) return
    setRemovendo(true)
    try {
      await call('compromisso', 'excluir', { id: excluindo.id })
      pushToast('sucesso', 'Compromisso excluído')
      setExcluindo(null)
      await carregar()
    } catch (e) {
      pushToast('erro', 'Falha ao excluir', e instanceof Error ? e.message : undefined)
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar compromissos…" className="input !pl-9" />
        </div>
        <Select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="w-56">
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Button onClick={() => { setEditando(null); setModalAberto(true) }}>
          <Plus className="h-4 w-4" /> Novo Compromisso
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <div className="flex h-full items-center justify-center"><Loading /></div>
        ) : itens.length === 0 ? (
          <EmptyState titulo="Nenhum compromisso" descricao="Agende reuniões, visitas e chamadas." />
        ) : (
          <div className="space-y-2">
            {itens.map((c) => (
              <div key={c.id} className={cn('card flex flex-wrap items-center gap-3')}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium text-slate-800 dark:text-white">{c.titulo}</p>
                  <p className="truncate text-xs text-slate-400">
                    {formatarData(c.data)}
                    {c.horaInicio && ` · ${c.horaInicio}`}
                    {c.horaFim && `–${c.horaFim}`}
                    {c.cliente?.nome && ` · ${c.cliente.nome}`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {c.local && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.local}</span>}
                    {c.link && <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> link</span>}
                    {c.participantes && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.participantes}</span>}
                  </div>
                </div>
                <CompromissoStatusBadge status={c.status} />
                <Select
                  value={c.status}
                  onChange={(e) => void mudarStatus(c, e.target.value)}
                  className="w-44"
                  title="Alterar status"
                >
                  {COMPROMISSO_STATUS.map((s) => <option key={s} value={s}>{COMPROMISSO_STATUS_LABEL[s]}</option>)}
                </Select>
                {c.responsavel && <Avatar nome={c.responsavel.nome} tamanho={26} />}
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditando(c); setModalAberto(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setExcluindo(c)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CompromissoModal
        aberto={modalAberto}
        aoFechar={() => { setModalAberto(false); setEditando(null) }}
        editando={editando}
        aoSalvar={salvar}
      />

      <ConfirmDialog
        aberto={!!excluindo}
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={() => void excluir()}
        titulo="Excluir compromisso"
        mensagem={`Excluir "${excluindo?.titulo || ''}"?`}
        confirmarTexto={removendo ? 'Excluindo…' : 'Excluir'}
        perigo
      />
    </div>
  )
}

function CompromissoModal({ aberto, aoFechar, editando, aoSalvar }: { aberto: boolean; aoFechar: () => void; editando: Compromisso | null; aoSalvar: (d: FormCompromisso) => Promise<void> }): ReactNode {
  const clientes = useCatalogoStore((s) => s.clientes)
  const usuarios = useCatalogoStore((s) => s.usuarios)
  const [form, setForm] = useState<FormCompromisso>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      setForm(editando ? {
        titulo: editando.titulo,
        clienteId: editando.clienteId || '',
        responsavelId: editando.responsavelId || '',
        data: editando.data.slice(0, 10),
        horaInicio: editando.horaInicio || '',
        horaFim: editando.horaFim || '',
        local: editando.local || '',
        link: editando.link || '',
        participantes: editando.participantes || '',
        lembreteMinutos: editando.lembreteMinutos !== null && editando.lembreteMinutos !== undefined ? String(editando.lembreteMinutos) : '',
        descricao: editando.descricao || ''
      } : { ...formVazio })
      setErro('')
    }
  }, [aberto, editando])

  function set<K extends keyof FormCompromisso>(k: K, v: string): void {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function salvar(): Promise<void> {
    if (!form.titulo.trim()) {
      setErro('Informe o título.')
      return
    }
    if (!form.data) {
      setErro('Informe a data.')
      return
    }
    setSalvando(true)
    try {
      await aoSalvar(form)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={editando ? 'Editar compromisso' : 'Novo compromisso'} largura="max-w-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Título *</label>
          <Input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Reunião de alinhamento" />
        </div>
        <div>
          <label className="label">Data *</label>
          <Input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
        </div>
        <div>
          <label className="label">Cliente</label>
          <Select value={form.clienteId} onChange={(e) => set('clienteId', e.target.value)}>
            <option value="">Sem cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
        <div>
          <label className="label">Hora início</label>
          <Input type="time" value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} />
        </div>
        <div>
          <label className="label">Hora fim</label>
          <Input type="time" value={form.horaFim} onChange={(e) => set('horaFim', e.target.value)} />
        </div>
        <div>
          <label className="label">Responsável</label>
          <Select value={form.responsavelId} onChange={(e) => set('responsavelId', e.target.value)}>
            <option value="">Sem responsável</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
        </div>
        <div>
          <label className="label">Lembrete</label>
          <Select value={form.lembreteMinutos} onChange={(e) => set('lembreteMinutos', e.target.value)}>
            <option value="">Sem lembrete</option>
            {LEMBRETES_OPCOES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div>
          <label className="label">Local</label>
          <Input value={form.local} onChange={(e) => set('local', e.target.value)} placeholder="Sala, Google Meet…" />
        </div>
        <div>
          <label className="label">Link</label>
          <Input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Participantes</label>
          <Input value={form.participantes} onChange={(e) => set('participantes', e.target.value)} placeholder="Nomes separados por vírgula" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descrição</label>
          <Textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} rows={3} />
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
