import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Plus, Search, MessageSquareReply, Pencil, Trash2 } from 'lucide-react'
import type { Retorno } from '@shared/types'
import { RETORNO_STATUS, RETORNO_STATUS_LABEL } from '@shared/constants'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { call } from '../lib/api'
import { formatarData, cn, dataParaInput } from '../lib/format'
import { Button, Input, Textarea, Select, Modal, ConfirmDialog, Avatar, RetornoStatusBadge, EmptyState, Loading } from '../components/ui'

interface FormRetorno {
  assunto: string
  clienteId: string
  contato: string
  dataPrevista: string
  horario: string
  responsavelId: string
  observacao: string
}

const formVazio: FormRetorno = { assunto: '', clienteId: '', contato: '', dataPrevista: '', horario: '', responsavelId: '', observacao: '' }

export function RetornosPage(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const clientes = useCatalogoStore((s) => s.clientes)
  const usuarios = useCatalogoStore((s) => s.usuarios)

  const [itens, setItens] = useState<Retorno[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Retorno | null>(null)
  const [excluindo, setExcluindo] = useState<Retorno | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true)
    const lista = await call<Retorno[]>('retorno', 'listar', { busca, status: filtroStatus || undefined }).catch(() => [])
    setItens(lista)
    setCarregando(false)
  }, [busca, filtroStatus])

  useEffect(() => {
    void carregarCatalogo()
  }, [carregarCatalogo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(dados: FormRetorno): Promise<void> {
    const payload = {
      assunto: dados.assunto,
      clienteId: dados.clienteId || null,
      contato: dados.contato || null,
      dataPrevista: dados.dataPrevista || null,
      horario: dados.horario || null,
      responsavelId: dados.responsavelId || null,
      observacao: dados.observacao || null
    }
    if (editando) {
      await call('retorno', 'atualizar', { id: editando.id, ...payload })
      pushToast('sucesso', 'Retorno atualizado')
    } else {
      await call('retorno', 'criar', payload)
      pushToast('sucesso', 'Retorno criado')
    }
    setModalAberto(false)
    setEditando(null)
    await carregar()
  }

  async function mudarStatus(r: Retorno, status: string): Promise<void> {
    await call('retorno', 'status', { id: r.id, status })
    pushToast('sucesso', 'Status atualizado')
    await carregar()
  }

  async function excluir(): Promise<void> {
    if (!excluindo) return
    setRemovendo(true)
    try {
      await call('retorno', 'excluir', { id: excluindo.id })
      pushToast('sucesso', 'Retorno excluído')
      setExcluindo(null)
      await carregar()
    } catch (e) {
      pushToast('erro', 'Falha ao excluir', e instanceof Error ? e.message : undefined)
    } finally {
      setRemovendo(false)
    }
  }

  const atrasados = itens.filter((r) => r.dataPrevista && r.status !== 'CONCLUIDO' && r.dataPrevista < dataParaInput(new Date()))

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar retornos…" className="input !pl-9" />
        </div>
        <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-52">
          <option value="">Todos os status</option>
          {RETORNO_STATUS.map((s) => <option key={s} value={s}>{RETORNO_STATUS_LABEL[s]}</option>)}
        </Select>
        <Button onClick={() => { setEditando(null); setModalAberto(true) }}>
          <Plus className="h-4 w-4" /> Novo Retorno
        </Button>
      </div>

      {atrasados.length > 0 && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <b>{atrasados.length}</b> retorno(s) com data prevista vencida. Priorize o contato com o cliente.
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <div className="flex h-full items-center justify-center"><Loading /></div>
        ) : itens.length === 0 ? (
          <EmptyState titulo="Nenhum retorno" descricao="Registre contatos e cobranças com o cliente." />
        ) : (
          <div className="space-y-2">
            {itens.map((r) => {
              const atrasado = !!r.dataPrevista && r.status !== 'CONCLUIDO' && r.dataPrevista < dataParaInput(new Date())
              return (
                <div key={r.id} className={cn('card flex flex-wrap items-center gap-3', atrasado && 'border-l-4 border-l-red-500')}>
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', atrasado ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300')}>
                    <MessageSquareReply className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-medium text-slate-800 dark:text-white">{r.assunto}</p>
                    <p className="truncate text-xs text-slate-400">
                      {r.cliente?.nome || 'Sem cliente'}
                      {r.contato && ` · ${r.contato}`}
                      {r.dataPrevista && ` · previsto ${formatarData(r.dataPrevista)}`}
                      {r.horario && ` ${r.horario}`}
                    </p>
                    {r.observacao && <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{r.observacao}</p>}
                  </div>
                  <RetornoStatusBadge status={r.status} />
                  <Select value={r.status} onChange={(e) => void mudarStatus(r, e.target.value)} className="w-44" title="Alterar status">
                    {RETORNO_STATUS.map((s) => <option key={s} value={s}>{RETORNO_STATUS_LABEL[s]}</option>)}
                  </Select>
                  {r.responsavel && <Avatar nome={r.responsavel.nome} tamanho={26} />}
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditando(r); setModalAberto(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setExcluindo(r)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RetornoModal aberto={modalAberto} aoFechar={() => { setModalAberto(false); setEditando(null) }} editando={editando} aoSalvar={salvar} />

      <ConfirmDialog
        aberto={!!excluindo}
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={() => void excluir()}
        titulo="Excluir retorno"
        mensagem={`Excluir o retorno "${excluindo?.assunto || ''}"?`}
        confirmarTexto={removendo ? 'Excluindo…' : 'Excluir'}
        perigo
      />
    </div>
  )
}

function RetornoModal({ aberto, aoFechar, editando, aoSalvar }: { aberto: boolean; aoFechar: () => void; editando: Retorno | null; aoSalvar: (d: FormRetorno) => Promise<void> }): ReactNode {
  const clientes = useCatalogoStore((s) => s.clientes)
  const usuarios = useCatalogoStore((s) => s.usuarios)
  const [form, setForm] = useState<FormRetorno>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      setForm(editando ? {
        assunto: editando.assunto,
        clienteId: editando.clienteId || '',
        contato: editando.contato || '',
        dataPrevista: editando.dataPrevista ? editando.dataPrevista.slice(0, 10) : '',
        horario: editando.horario || '',
        responsavelId: editando.responsavelId || '',
        observacao: editando.observacao || ''
      } : { ...formVazio })
      setErro('')
    }
  }, [aberto, editando])

  function set<K extends keyof FormRetorno>(k: K, v: string): void {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function salvar(): Promise<void> {
    if (!form.assunto.trim()) {
      setErro('Informe o assunto.')
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
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={editando ? 'Editar retorno' : 'Novo retorno'} largura="max-w-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Assunto *</label>
          <Input value={form.assunto} onChange={(e) => set('assunto', e.target.value)} placeholder="Ex.: Retornar sobre proposta comercial" />
        </div>
        <div>
          <label className="label">Cliente</label>
          <Select value={form.clienteId} onChange={(e) => set('clienteId', e.target.value)}>
            <option value="">Sem cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
        <div>
          <label className="label">Contato</label>
          <Input value={form.contato} onChange={(e) => set('contato', e.target.value)} placeholder="Nome do contato" />
        </div>
        <div>
          <label className="label">Data prevista</label>
          <Input type="date" value={form.dataPrevista} onChange={(e) => set('dataPrevista', e.target.value)} />
        </div>
        <div>
          <label className="label">Horário</label>
          <Input type="time" value={form.horario} onChange={(e) => set('horario', e.target.value)} />
        </div>
        <div>
          <label className="label">Responsável</label>
          <Select value={form.responsavelId} onChange={(e) => set('responsavelId', e.target.value)}>
            <option value="">Sem responsável</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observação</label>
          <Textarea value={form.observacao} onChange={(e) => set('observacao', e.target.value)} rows={3} placeholder="Contexto, pendências do cliente, próximo passo…" />
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
