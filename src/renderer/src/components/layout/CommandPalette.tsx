import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ListTodo, Building2, FolderKanban, StickyNote, CalendarClock, MessageSquareReply, Tag as TagIcon, MessageSquare } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { call } from '../../lib/api'
import { formatarDataHora, relativo } from '../../lib/format'
import { cn } from '../../lib/format'

interface ResultadoBusca {
  pendencias: { id: string; titulo: string; status: string }[]
  clientes: { id: string; nome: string; empresa?: string | null }[]
  projetos: { id: string; nome: string }[]
  notas: { id: string; titulo: string; atualizadoEm: string }[]
  compromissos: { id: string; titulo: string; data: string }[]
  retornos: { id: string; assunto: string }[]
  tags: { id: string; nome: string }[]
  comentarios: { id: string; conteudo: string; pendencia?: { id: string; titulo: string } | null }[]
}

type Grupo = 'pendencias' | 'clientes' | 'projetos' | 'notas' | 'compromissos' | 'retornos' | 'tags' | 'comentarios'

const rotulos: Record<Grupo, string> = {
  pendencias: 'Pendências',
  clientes: 'Clientes',
  projetos: 'Projetos',
  notas: 'Anotações',
  compromissos: 'Compromissos',
  retornos: 'Retornos',
  tags: 'Tags',
  comentarios: 'Comentários'
}

export function CommandPalette(): ReactNode {
  const aberto = useAppStore((s) => s.painelBusca)
  const setAberto = useAppStore((s) => s.setPainelBusca)
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const abrirNovaPendencia = useAppStore((s) => s.abrirNovaPendencia)
  const navigate = useNavigate()
  const [termo, setTermo] = useState('')
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [atraso, setAtraso] = useState<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto) {
      setTermo('')
      setResultado(null)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [aberto])

  useEffect(() => {
    if (atraso) clearTimeout(atraso)
    if (!aberto) return
    if (!termo.trim()) {
      setResultado(null)
      return
    }
    const t = setTimeout(async () => {
      setCarregando(true)
      const r = await call<ResultadoBusca>('busca', 'global', { q: termo }).catch(() => null)
      setResultado(r)
      setCarregando(false)
    }, 250)
    setAtraso(t)
    return () => {
      if (atraso) clearTimeout(atraso)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, aberto])

  function irParaPendencia(id: string): void {
    setAberto(false)
    call('pendencia', 'obter', { id }).then((p) => abrirPendencia(p as never))
  }

  function irPara(rota: string): void {
    setAberto(false)
    navigate(rota)
  }

  const grupos = (['pendencias', 'clientes', 'projetos', 'notas', 'compromissos', 'retornos', 'tags', 'comentarios'] as Grupo[]).filter(
    (g) => (resultado?.[g]?.length ?? 0) > 0
  )

  return (
    <div
      className={cn('fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/40 px-4 pt-24 backdrop-blur-sm', !aberto && 'hidden')}
      onClick={() => setAberto(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAberto(false)
              if (e.key === 'Enter' && termo.trim() && grupos.length > 0) {
                const primeiro = grupos[0]
                const item = resultado?.[primeiro]?.[0] as { id: string } | undefined
                if (item) {
                  if (primeiro === 'pendencias') irParaPendencia(item.id)
                  else if (primeiro === 'clientes') irPara(`/clientes/${item.id}`)
                  else if (primeiro === 'projetos') irPara(`/projetos/${item.id}`)
                  else if (primeiro === 'notas') irPara(`/anotacoes?nota=${item.id}`)
                  else if (primeiro === 'compromissos') irPara(`/compromissos?foco=${item.id}`)
                  else if (primeiro === 'retornos') irPara(`/retornos?foco=${item.id}`)
                  else if (primeiro === 'tags') irPara(`/pendencias?tag=${item.id}`)
                }
              }
            }}
            placeholder="Buscar em tudo: pendências, clientes, projetos, anotações, compromissos, retornos, tags, comentários…"
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] text-slate-400 dark:border-slate-600 dark:bg-slate-900">
            Esc
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {carregando && <p className="px-3 py-4 text-center text-sm text-slate-400">Buscando…</p>}
          {!carregando && termo.trim() && !resultado && <p className="px-3 py-4 text-center text-sm text-slate-400">Nenhum resultado encontrado.</p>}
          {!termo.trim() && (
            <div className="px-3 py-4">
              <p className="text-xs text-slate-400">Atalhos</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <li><b>Ctrl+N</b> — nova pendência</li>
                <li><b>Ctrl+K</b> — busca global</li>
                <li><b>Ctrl+F</b> — filtrar listagem atual</li>
                <li><b>Ctrl+Enter</b> — salvar formulário aberto</li>
                <li><b>Esc</b> — fechar janela / modal</li>
              </ul>
              <button
                onClick={() => {
                  setAberto(false)
                  abrirNovaPendencia()
                }}
                className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-brand-600 transition hover:border-brand-400 hover:bg-brand-50 dark:border-slate-600 dark:text-brand-300 dark:hover:bg-brand-900/20"
              >
                + Criar nova pendência
              </button>
            </div>
          )}
          {resultado &&
            grupos.map((g) => (
              <div key={g} className="mb-1">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{rotulos[g]}</p>
                {(resultado[g] as Array<{ id: string; [k: string]: unknown }>).slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (g === 'pendencias') irParaPendencia(item.id)
                      else if (g === 'clientes') irPara(`/clientes/${item.id}`)
                      else if (g === 'projetos') irPara(`/projetos/${item.id}`)
                      else if (g === 'notas') irPara(`/anotacoes?nota=${item.id}`)
                      else if (g === 'compromissos') irPara(`/compromissos?foco=${item.id}`)
                      else if (g === 'retornos') irPara(`/retornos?foco=${item.id}`)
                      else if (g === 'tags') irPara(`/pendencias?tag=${item.id}`)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                      {g === 'pendencias' && <ListTodo className="h-4 w-4" />}
                      {g === 'clientes' && <Building2 className="h-4 w-4" />}
                      {g === 'projetos' && <FolderKanban className="h-4 w-4" />}
                      {g === 'notas' && <StickyNote className="h-4 w-4" />}
                      {g === 'compromissos' && <CalendarClock className="h-4 w-4" />}
                      {g === 'retornos' && <MessageSquareReply className="h-4 w-4" />}
                      {g === 'tags' && <TagIcon className="h-4 w-4" />}
                      {g === 'comentarios' && <MessageSquare className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {String(item.titulo || item.nome || item.assunto || item.conteudo || '')}
                      </span>
                      {g === 'pendencias' && (
                        <span className="text-xs text-slate-400">
                          {String((item as ResultadoBusca['pendencias'][0]).status)}
                        </span>
                      )}
                      {g === 'comentarios' && (item as ResultadoBusca['comentarios'][0]).pendencia && (
                        <span className="text-xs text-slate-400">
                          em {(item as ResultadoBusca['comentarios'][0]).pendencia?.titulo}
                        </span>
                      )}
                    </span>
                    {(g === 'notas' || g === 'compromissos') && (
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {relativo(formatarDataHora(String((item as { atualizadoEm?: string; data?: string }).atualizadoEm || (item as { data?: string }).data || '')))}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
