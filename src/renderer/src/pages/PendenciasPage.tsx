import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, ChevronLeft, ChevronRight, Trash2, CheckCircle2, X, ListTodo, RotateCcw } from 'lucide-react'
import type { Pendencia } from '@shared/types'
import { PENDENCIA_STATUS, PRIORIDADES } from '@shared/constants'
import { usePendencias } from '../lib/usePendencias'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { call } from '../lib/api'
import { formatarData, cn } from '../lib/format'
import { SelectOpcoes, StatusBadge, PriorityBadge, Avatar, ProgressBar, Loading, ConfirmDialog, TagBadge } from '../components/ui'
import { PendenciaCard } from '../components/pendencia/PendenciaCard'

export function PendenciasPage(): ReactNode {
  const [params] = useSearchParams()
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const pushToast = useAppStore((s) => s.pushToast)
  const carregarDashboard = useAppStore((s) => s.carregarDashboard)
  const notificarMudanca = useAppStore((s) => s.notificarMudanca)
  const dataVersao = useAppStore((s) => s.dataVersao)
  const clientes = useCatalogoStore((s) => s.clientes)
  const projetos = useCatalogoStore((s) => s.projetos)
  const usuarios = useCatalogoStore((s) => s.usuarios)
  const categorias = useCatalogoStore((s) => s.categorias)
  const tags = useCatalogoStore((s) => s.tags)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)

  useEffect(() => {
    void carregarCatalogo()
  }, [carregarCatalogo])

  const [busca, setBusca] = useState(params.get('q') || '')
  const [status, setStatus] = useState<string[]>(() => {
    const s = params.get('status')
    if (s === 'atrasadas') return []
    if (s === 'EM_ANDAMENTO' || s === 'CONCLUIDA' || s === 'AGUARDANDO_RETORNO') return [s]
    return []
  })
  const [prioridades, setPrioridades] = useState<string[]>([])
  const [clienteId, setClienteId] = useState('')
  const [projetoId, setProjetoId] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [tagsSel, setTagsSel] = useState<string[]>(() => {
    const t = params.get('tag')
    return t ? [t] : []
  })
  const [prazoDe, setPrazoDe] = useState('')
  const [prazoAte, setPrazoAte] = useState('')
  const [atrasadas, setAtrasadas] = useState(params.get('status') === 'atrasadas')
  const [semResponsavel, setSemResponsavel] = useState(params.get('semResponsavel') === '1')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const filtroPrazoInicial = params.get('prazo')
  const prazoHoje = filtroPrazoInicial === 'hoje'
  const prazoProximas = filtroPrazoInicial === 'proximas'

  const [buscaDebounced, setBuscaDebounced] = useState(busca)
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  const { itens, total, pagina, porPagina, carregando, atualizarFiltro, filtro, recarregar } = usePendencias({} as never)

  useEffect(() => {
    atualizarFiltro({
      status: status.length ? status : undefined,
      prioridade: prioridades.length ? prioridades : undefined,
      clienteId: clienteId || undefined,
      projetoId: projetoId || undefined,
      responsavelId: responsavelId || undefined,
      categoriaId: categoriaId || undefined,
      tags: tagsSel.length ? tagsSel : undefined,
      prazoDe: prazoDe || undefined,
      prazoAte: prazoAte || undefined,
      atrasadas,
      semResponsavel,
      busca: buscaDebounced || undefined,
      prazoHoje,
      prazoProximas
    } as never)
  }, [status, prioridades, clienteId, projetoId, responsavelId, categoriaId, tagsSel, prazoDe, prazoAte, atrasadas, semResponsavel, buscaDebounced, prazoHoje, prazoProximas, atualizarFiltro])

  useEffect(() => {
    if (dataVersao > 0) void recarregar()
  }, [dataVersao, recarregar])

  useEffect(() => {
    const s = params.get('status')
    const q = params.get('q')
    const semResp = params.get('semResponsavel')
    setStatus(s === 'atrasadas' ? [] : s === 'EM_ANDAMENTO' || s === 'CONCLUIDA' || s === 'AGUARDANDO_RETORNO' ? [s] : [])
    setAtrasadas(s === 'atrasadas')
    setSemResponsavel(semResp === '1')
    if (q !== null) setBusca(q)
  }, [params])

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

  function toggleSelecao(id: string): void {
    setSelecionadas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  async function concluirEmMassa(): Promise<void> {
    for (const id of selecionadas) {
      await call('pendencia', 'concluir', { id }).catch(() => null)
    }
    setSelecionadas([])
    await recarregar()
    void carregarDashboard(true)
    notificarMudanca()
    pushToast('sucesso', 'Pendências concluídas', `${selecionadas.length} pendência(s) concluída(s).`)
  }

  async function excluirEmMassa(): Promise<void> {
    setExcluindo(true)
    for (const id of selecionadas) {
      await call('pendencia', 'excluir', { id }).catch(() => null)
    }
    setExcluindo(false)
    setConfirmarExclusao(false)
    setSelecionadas([])
    await recarregar()
    void carregarDashboard(true)
    notificarMudanca()
    pushToast('sucesso', 'Pendências excluídas')
  }

  function limparFiltros(): void {
    setBusca('')
    setStatus([])
    setPrioridades([])
    setClienteId('')
    setProjetoId('')
    setResponsavelId('')
    setCategoriaId('')
    setTagsSel([])
    setPrazoDe('')
    setPrazoAte('')
    setAtrasadas(false)
    setSemResponsavel(false)
  }

  const temFiltroAtivo =
    !!busca || status.length > 0 || prioridades.length > 0 || !!clienteId || !!projetoId || !!responsavelId || !!categoriaId ||
    tagsSel.length > 0 || !!prazoDe || !!prazoAte || atrasadas || semResponsavel

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, descrição, sistema…"
            className="input !pl-9"
          />
        </div>
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className={cn('btn-secondary', temFiltroAtivo && '!border-brand-400 !text-brand-600 dark:!text-brand-300')}
        >
          <Filter className="h-4 w-4" /> Filtros {temFiltroAtivo && <span className="rounded-full bg-brand-100 px-1.5 text-[11px] text-brand-700 dark:bg-brand-900 dark:text-brand-300">•</span>}
        </button>
        {selecionadas.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              {selecionadas.length} selecionada(s)
            </span>
            <button onClick={() => void concluirEmMassa()} className="btn-secondary !py-1.5 !text-xs">
              <CheckCircle2 className="h-4 w-4" /> Concluir
            </button>
            <button onClick={() => setConfirmarExclusao(true)} className="btn-danger !py-1.5 !text-xs">
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </div>
        )}
      </div>

      {mostrarFiltros && (
        <div className="mb-3 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="col-span-2">
            <label className="label">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {PENDENCIA_STATUS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    status.includes(s)
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Prioridade</label>
            <SelectOpcoes
              value={prioridades[0] || ''}
              onChange={(v) => setPrioridades(v ? [v] : [])}
              opcoes={[{ valor: '', rotulo: 'Todas' }, ...PRIORIDADES.map((p) => ({ valor: p, rotulo: p }))]}
            />
          </div>
          <div>
            <label className="label">Responsável</label>
            <SelectOpcoes
              value={responsavelId}
              onChange={setResponsavelId}
              opcoes={[{ valor: '', rotulo: 'Todos' }, ...usuarios.map((u) => ({ valor: u.id, rotulo: u.nome }))]}
            />
          </div>
          <div>
            <label className="label">Cliente</label>
            <SelectOpcoes
              value={clienteId}
              onChange={setClienteId}
              opcoes={[{ valor: '', rotulo: 'Todos' }, ...clientes.map((c) => ({ valor: c.id, rotulo: c.nome }))]}
            />
          </div>
          <div>
            <label className="label">Projeto</label>
            <SelectOpcoes
              value={projetoId}
              onChange={setProjetoId}
              opcoes={[{ valor: '', rotulo: 'Todos' }, ...projetos.map((p) => ({ valor: p.id, rotulo: p.nome }))]}
            />
          </div>
          <div>
            <label className="label">Categoria</label>
            <SelectOpcoes
              value={categoriaId}
              onChange={setCategoriaId}
              opcoes={[{ valor: '', rotulo: 'Todas' }, ...categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))]}
            />
          </div>
          <div>
            <label className="label">Prazo de</label>
            <input type="date" value={prazoDe} onChange={(e) => setPrazoDe(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Prazo até</label>
            <input type="date" value={prazoAte} onChange={(e) => setPrazoAte(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Tags</label>
            <SelectOpcoes
              value={tagsSel[0] || ''}
              onChange={(v) => setTagsSel(v ? [v] : [])}
              opcoes={[{ valor: '', rotulo: 'Todas' }, ...tags.map((t) => ({ valor: t.id, rotulo: t.nome }))]}
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={atrasadas} onChange={(e) => setAtrasadas(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
              Apenas atrasadas
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={semResponsavel} onChange={(e) => setSemResponsavel(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
              Sem responsável
            </label>
            {temFiltroAtivo && (
              <button onClick={limparFiltros} className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <RotateCcw className="h-3 w-3" /> Limpar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {carregando ? (
          <div className="flex h-full items-center justify-center p-8">
            <Loading label="Carregando pendências…" />
          </div>
        ) : itens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <ListTodo className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">Nenhuma pendência encontrada.</p>
            {temFiltroAtivo && (
              <button onClick={limparFiltros} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-800">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={itens.length > 0 && itens.every((i) => selecionadas.includes(i.id))}
                    onChange={(e) => setSelecionadas(e.target.checked ? itens.map((i) => i.id) : [])}
                    className="h-4 w-4 rounded accent-brand-600"
                  />
                </th>
                <th className="px-3 py-2.5">Pendência</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Prioridade</th>
                <th className="hidden px-3 py-2.5 xl:table-cell">Responsável</th>
                <th className="hidden px-3 py-2.5 lg:table-cell">Cliente</th>
                <th className="hidden px-3 py-2.5 md:table-cell">Prazo</th>
                <th className="w-32 px-3 py-2.5">Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((p) => (
                <PendenciaRow
                  key={p.id}
                  p={p}
                  selecionada={selecionadas.includes(p.id)}
                  toggleSelecao={toggleSelecao}
                  aoAbrir={abrirPendencia}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {total} pendência(s) · página {pagina} de {totalPaginas}
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={pagina <= 1}
            onClick={() => atualizarFiltro({ pagina: pagina - 1 })}
            className="btn-secondary !px-2 !py-1.5 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs text-slate-500">{pagina} / {totalPaginas}</span>
          <button
            disabled={pagina >= totalPaginas}
            onClick={() => atualizarFiltro({ pagina: pagina + 1 })}
            className="btn-secondary !px-2 !py-1.5 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        aberto={confirmarExclusao}
        titulo="Excluir pendências"
        mensagem={`Tem certeza que deseja excluir ${selecionadas.length} pendência(s)? Esta ação não pode ser desfeita.`}
        aoConfirmar={() => void excluirEmMassa()}
        aoFechar={() => setConfirmarExclusao(false)}
        confirmarTexto={excluindo ? 'Excluindo…' : 'Excluir'}
        perigo
      />
    </div>
  )
}

function PendenciaRow({ p, selecionada, toggleSelecao, aoAbrir }: { p: Pendencia; selecionada: boolean; toggleSelecao: (id: string) => void; aoAbrir: (p: Pendencia) => void }): ReactNode {
  return (
    <tr
      className={cn('cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50', selecionada && 'bg-brand-50/60 dark:bg-brand-900/10')}
      onClick={() => aoAbrir(p)}
    >
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selecionada}
          onChange={() => toggleSelecao(p.id)}
          className="h-4 w-4 rounded accent-brand-600"
        />
      </td>
      <td className="max-w-xs px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {p.atrasada && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="Atrasada" />
          )}
          <span className={cn('truncate font-medium', p.atrasada ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100')}>
            {p.titulo}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {(p.tags || []).slice(0, 3).map((t) => (
            <TagBadge key={t.tagId} tag={{ id: t.tagId, nome: t.tag?.nome || '', cor: t.tag?.cor || '#64748b' } as never} compacto />
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status={p.status} />
      </td>
      <td className="px-3 py-2.5">
        <PriorityBadge prioridade={p.prioridade} compacto />
      </td>
      <td className="hidden px-3 py-2.5 xl:table-cell">
        <div className="flex items-center gap-1.5">
          <Avatar nome={p.responsavel?.nome} tamanho={22} />
          <span className="truncate text-slate-600 dark:text-slate-300">{p.responsavel?.nome || 'Sem responsável'}</span>
        </div>
      </td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        <span className="truncate text-slate-600 dark:text-slate-300">{p.cliente?.nome || '—'}</span>
      </td>
      <td className="hidden px-3 py-2.5 md:table-cell">
        <span className={cn('text-slate-600 dark:text-slate-300', p.atrasada && 'font-semibold text-red-600 dark:text-red-400')}>
          {p.prazo ? formatarData(p.prazo) : '—'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <ProgressBar valor={p.progresso || 0} compacto />
      </td>
    </tr>
  )
}
