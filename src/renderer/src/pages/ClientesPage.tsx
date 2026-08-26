import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, Mail, Phone, Pencil, Eye, Users } from 'lucide-react'
import type { Cliente } from '@shared/types'
import { useCatalogoStore } from '../store/catalogoStore'
import { useAppStore } from '../store/appStore'
import { call } from '../lib/api'
import { cn } from '../lib/format'
import { Button, Input, Textarea, Modal, EmptyState, Loading } from '../components/ui'

interface ClienteComDados extends Cliente {
  pendenciasAbertas?: number
  pendenciasAtrasadas?: number
}

export function ClientesPage(): ReactNode {
  const navigate = useNavigate()
  const pushToast = useAppStore((s) => s.pushToast)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const recarregar = useCatalogoStore((s) => s.recarregar)

  const [clientes, setClientes] = useState<ClienteComDados[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ClienteComDados | null>(null)

  useEffect(() => {
    void carregarCatalogo()
  }, [carregarCatalogo])

  useEffect(() => {
    void call<ClienteComDados[]>('cliente', 'listar', { busca }).then(setClientes).finally(() => setCarregando(false))
  }, [busca])

  async function salvar(dados: Record<string, string>): Promise<void> {
    if (editando) {
      await call('cliente', 'atualizar', { id: editando.id, ...dados })
      pushToast('sucesso', 'Cliente atualizado')
    } else {
      await call('cliente', 'criar', dados)
      pushToast('sucesso', 'Cliente criado')
    }
    setModalAberto(false)
    setEditando(null)
    const lista = await call<ClienteComDados[]>('cliente', 'listar', { busca })
    setClientes(lista)
    await recarregar()
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar clientes…" className="input !pl-9" />
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true) }}>
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <div className="flex h-full items-center justify-center"><Loading /></div>
        ) : clientes.length === 0 ? (
          <EmptyState titulo="Nenhum cliente encontrado" descricao="Crie seu primeiro cliente para organizar pendências por cliente." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {clientes.map((c) => (
              <div key={c.id} className="card group">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800 dark:text-white">{c.nome}</p>
                    <p className="truncate text-xs text-slate-400">{c.empresa || c.contato || '—'}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {c.email && (
                    <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /> {c.email}</p>
                  )}
                  {c.telefone && (
                    <p className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 shrink-0" /> {c.telefone}</p>
                  )}
                  <p className="flex items-center gap-1.5"><Users className="h-3 w-3 shrink-0" />
                    <span className={cn(c.pendenciasAtrasadas ? 'text-red-600 dark:text-red-400' : '')}>
                      {c.pendenciasAbertas ?? 0} aberta(s) · {c.pendenciasAtrasadas ?? 0} atrasada(s)
                    </span>
                  </p>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/clientes/${c.id}`)}><Eye className="h-3.5 w-3.5" /> Ver</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditando(c); setModalAberto(true) }}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClienteModal aberto={modalAberto} aoFechar={() => { setModalAberto(false); setEditando(null) }} editando={editando} aoSalvar={salvar} />
    </div>
  )
}

function ClienteModal({ aberto, aoFechar, editando, aoSalvar }: { aberto: boolean; aoFechar: () => void; editando: ClienteComDados | null; aoSalvar: (d: Record<string, string>) => Promise<void> }): ReactNode {
  const [form, setForm] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      setForm(editando ? {
        nome: editando.nome,
        empresa: editando.empresa || '',
        cnpj: editando.cnpj || '',
        contato: editando.contato || '',
        email: editando.email || '',
        telefone: editando.telefone || '',
        sistema: editando.sistema || '',
        projeto: editando.projeto || '',
        responsavelInterno: editando.responsavelInterno || '',
        observacoes: editando.observacoes || ''
      } : {})
      setErro('')
    }
  }, [aberto, editando])

  function set(k: string, v: string): void {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function salvar(): Promise<void> {
    if (!form.nome?.trim()) {
      setErro('Informe o nome do cliente.')
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
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={editando ? 'Editar cliente' : 'Novo cliente'} largura="max-w-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nome *</label>
          <Input value={form.nome || ''} onChange={(e) => set('nome', e.target.value)} placeholder="Razão social ou nome do cliente" />
        </div>
        <div>
          <label className="label">Empresa</label>
          <Input value={form.empresa || ''} onChange={(e) => set('empresa', e.target.value)} />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <Input value={form.cnpj || ''} onChange={(e) => set('cnpj', e.target.value)} />
        </div>
        <div>
          <label className="label">Contato</label>
          <Input value={form.contato || ''} onChange={(e) => set('contato', e.target.value)} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <Input value={form.email || ''} onChange={(e) => set('email', e.target.value)} type="email" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <Input value={form.telefone || ''} onChange={(e) => set('telefone', e.target.value)} />
        </div>
        <div>
          <label className="label">Sistema</label>
          <Input value={form.sistema || ''} onChange={(e) => set('sistema', e.target.value)} placeholder="ERP, PDV, sistema usado…" />
        </div>
        <div>
          <label className="label">Projeto</label>
          <Input value={form.projeto || ''} onChange={(e) => set('projeto', e.target.value)} />
        </div>
        <div>
          <label className="label">Responsável interno</label>
          <Input value={form.responsavelInterno || ''} onChange={(e) => set('responsavelInterno', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observações</label>
          <Textarea value={form.observacoes || ''} onChange={(e) => set('observacoes', e.target.value)} rows={3} />
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
