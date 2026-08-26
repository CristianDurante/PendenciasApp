import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, StickyNote, Pencil, Trash2 } from 'lucide-react'
import type { Nota } from '@shared/types'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { call } from '../lib/api'
import { formatarDataHora, relativo } from '../lib/format'
import { Button, Input, Textarea, Select, Modal, ConfirmDialog, EmptyState, Loading } from '../components/ui'

interface FormNota {
  titulo: string
  conteudo: string
  clienteId: string
}

export function AnotacoesPage(): ReactNode {
  const [params] = useSearchParams()
  const pushToast = useAppStore((s) => s.pushToast)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const clientes = useCatalogoStore((s) => s.clientes)

  const [itens, setItens] = useState<Nota[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Nota | null>(null)
  const [excluindo, setExcluindo] = useState<Nota | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true)
    const lista = await call<Nota[]>('nota', 'listar', { busca }).catch(() => [])
    setItens(lista)
    setCarregando(false)
  }, [busca])

  useEffect(() => {
    void carregarCatalogo()
  }, [carregarCatalogo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const notaFoco = params.get('nota')

  useEffect(() => {
    if (notaFoco && itens.length > 0 && !modalAberto) {
      const n = itens.find((x) => x.id === notaFoco)
      if (n) {
        setEditando(n)
        setModalAberto(true)
      }
    }
  }, [notaFoco, itens, modalAberto])

  async function salvar(dados: FormNota): Promise<void> {
    if (editando) {
      await call('nota', 'atualizar', { id: editando.id, ...dados })
      pushToast('sucesso', 'Anotação atualizada')
    } else {
      await call('nota', 'criar', dados)
      pushToast('sucesso', 'Anotação criada')
    }
    setModalAberto(false)
    setEditando(null)
    await carregar()
  }

  async function excluir(): Promise<void> {
    if (!excluindo) return
    setRemovendo(true)
    try {
      await call('nota', 'excluir', { id: excluindo.id })
      pushToast('sucesso', 'Anotação excluída')
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
      <div className="mb-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar anotações…" className="input !pl-9" />
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true) }}>
          <Plus className="h-4 w-4" /> Nova Anotação
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <div className="flex h-full items-center justify-center"><Loading /></div>
        ) : itens.length === 0 ? (
          <EmptyState titulo="Nenhuma anotação" descricao="Registre insights, reuniões e decisões." />
        ) : (
          <div className="columns-1 gap-3 md:columns-2 xl:columns-3">
            {itens.map((n) => (
              <div key={n.id} className="card mb-3 break-inside-avoid">
                <div className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-white">{n.titulo}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400 line-clamp-5">{n.conteudo || ''}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {n.cliente?.nome ? `${n.cliente.nome} · ` : ''}
                        {n.usuario?.nome || ''}
                      </span>
                      <span>{relativo(formatarDataHora(n.atualizadoEm))}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditando(n); setModalAberto(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setExcluindo(n)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NotaModal aberto={modalAberto} aoFechar={() => { setModalAberto(false); setEditando(null) }} editando={editando} aoSalvar={salvar} />

      <ConfirmDialog
        aberto={!!excluindo}
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={() => void excluir()}
        titulo="Excluir anotação"
        mensagem={`Excluir "${excluindo?.titulo || ''}"?`}
        confirmarTexto={removendo ? 'Excluindo…' : 'Excluir'}
        perigo
      />
    </div>
  )
}

function NotaModal({ aberto, aoFechar, editando, aoSalvar }: { aberto: boolean; aoFechar: () => void; editando: Nota | null; aoSalvar: (d: FormNota) => Promise<void> }): ReactNode {
  const clientes = useCatalogoStore((s) => s.clientes)
  const [form, setForm] = useState<FormNota>({ titulo: '', conteudo: '', clienteId: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      setForm(editando ? {
        titulo: editando.titulo,
        conteudo: editando.conteudo || '',
        clienteId: editando.clienteId || ''
      } : { titulo: '', conteudo: '', clienteId: '' })
      setErro('')
    }
  }, [aberto, editando])

  async function salvar(): Promise<void> {
    if (!form.titulo.trim()) {
      setErro('Informe o título.')
      return
    }
    setSalvando(true)
    try {
      await aoSalvar({ ...form, clienteId: form.clienteId || '' })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={editando ? 'Editar anotação' : 'Nova anotação'} largura="max-w-2xl">
      <div className="space-y-3">
        <div>
          <label className="label">Título *</label>
          <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex.: Decisões da reunião de hoje" />
        </div>
        <div>
          <label className="label">Conteúdo</label>
          <Textarea value={form.conteudo} onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))} rows={8} />
        </div>
        <div>
          <label className="label">Cliente</label>
          <Select value={form.clienteId} onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}>
            <option value="">Sem cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
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
