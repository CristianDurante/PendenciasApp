import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, ListTodo, CalendarClock, MessageSquareReply } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { call } from '../lib/api'
import { formatarData, cn, dataParaInput } from '../lib/format'
import { Loading } from '../components/ui'

interface EventoCalendario {
  tipo: 'pendencia' | 'compromisso' | 'retorno'
  id: string
  titulo: string
  data: string
  horario?: string | null
  status?: string
  cliente?: string | null
  responsavel?: string | null
  prioridade?: string
  atrasada?: boolean
  local?: string | null
}

type Modo = 'mes' | 'semana' | 'dia'

function inicioDaSemana(d: Date): Date {
  const r = new Date(d)
  const dia = (r.getDay() + 6) % 7
  r.setDate(r.getDate() - dia)
  r.setHours(0, 0, 0, 0)
  return r
}

export function CalendarioPage(): ReactNode {
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const pushToast = useAppStore((s) => s.pushToast)
  const [modo, setModo] = useState<Modo>('mes')
  const [hoje, setHoje] = useState(() => new Date())
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const de = new Date(hoje)
    if (modo === 'mes') {
      de.setDate(1)
      de.setHours(0, 0, 0, 0)
      const ate = new Date(de.getFullYear(), de.getMonth() + 1, 0)
      ate.setHours(23, 59, 59, 999)
      const r = await call<EventoCalendario[]>('calendario', 'eventos', { de: dataParaInput(de), ate: dataParaInput(ate) }).catch(() => [])
      setEventos(r)
    } else if (modo === 'semana') {
      const ini = inicioDaSemana(hoje)
      const fim = new Date(ini)
      fim.setDate(fim.getDate() + 6)
      fim.setHours(23, 59, 59, 999)
      const r = await call<EventoCalendario[]>('calendario', 'eventos', { de: dataParaInput(ini), ate: dataParaInput(fim) }).catch(() => [])
      setEventos(r)
    } else {
      const dia = new Date(hoje)
      dia.setHours(0, 0, 0, 0)
      const fim = new Date(dia)
      fim.setHours(23, 59, 59, 999)
      const r = await call<EventoCalendario[]>('calendario', 'eventos', { de: dataParaInput(dia), ate: dataParaInput(fim) }).catch(() => [])
      setEventos(r)
    }
    setCarregando(false)
  }, [hoje, modo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>()
    for (const e of eventos) {
      const chave = e.data.slice(0, 10)
      const lista = map.get(chave) || []
      lista.push(e)
      map.set(chave, lista)
    }
    return map
  }, [eventos])

  function mudar(data: Date): void {
    setHoje(data)
  }

  function abrirEvento(e: EventoCalendario): void {
    if (e.tipo === 'pendencia') {
      call('pendencia', 'obter', { id: e.id })
        .then((p) => abrirPendencia(p as never))
        .catch(() => pushToast('erro', 'Pendência não encontrada'))
    }
  }

  function eventoCor(e: EventoCalendario): string {
    if (e.tipo === 'pendencia') return e.atrasada ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
    if (e.tipo === 'compromisso') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  }

  function iconeEvento(e: EventoCalendario): ReactNode {
    if (e.tipo === 'pendencia') return <ListTodo className="h-3 w-3 shrink-0" />
    if (e.tipo === 'compromisso') return <CalendarClock className="h-3 w-3 shrink-0" />
    return <MessageSquareReply className="h-3 w-3 shrink-0" />
  }

  const hojeStr = dataParaInput(new Date())

  function navegar(dir: number): void {
    const d = new Date(hoje)
    if (modo === 'mes') d.setMonth(d.getMonth() + dir)
    else if (modo === 'semana') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setHoje(d)
  }

  function tituloPeriodo(): string {
    if (modo === 'mes') return `${hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    if (modo === 'semana') {
      const ini = inicioDaSemana(hoje)
      const fim = new Date(ini)
      fim.setDate(fim.getDate() + 6)
      return `${ini.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${fim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    return `${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => navegar(-1)} className="btn-secondary !px-2 !py-1.5"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setHoje(new Date())} className="btn-secondary !px-3 !py-1.5">Hoje</button>
          <button onClick={() => navegar(1)} className="btn-secondary !px-2 !py-1.5"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <h2 className="flex-1 text-base font-bold capitalize text-slate-800 dark:text-white">{tituloPeriodo()}</h2>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          {(['mes', 'semana', 'dia'] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium capitalize transition',
                modo === m ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex flex-1 items-center justify-center"><Loading label="Carregando eventos…" /></div>
      ) : modo === 'mes' ? (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase text-slate-400">{d}</div>
            ))}
          </div>
          {(() => {
            const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
            const offset = (primeiro.getDay() + 6) % 7
            const totalDias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
            const celulas: (Date | null)[] = []
            for (let i = 0; i < offset; i++) celulas.push(null)
            for (let d = 1; d <= totalDias; d++) celulas.push(new Date(hoje.getFullYear(), hoje.getMonth(), d))
            return (
              <div className="grid grid-cols-7">
                {celulas.map((dia, i) => {
                  if (!dia) return <div key={`v-${i}`} className="min-h-24 border-b border-r border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50" />
                  const chave = dataParaInput(dia)
                  const itens = eventosPorDia.get(chave) || []
                  const isHoje = chave === hojeStr
                  return (
                    <div
                      key={chave}
                      onClick={() => setHoje(dia)}
                      className={cn(
                        'min-h-24 cursor-pointer border-b border-r border-slate-100 p-1 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40',
                        isHoje && 'bg-brand-50/60 dark:bg-brand-900/10'
                      )}
                    >
                      <span className={cn(
                        'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        isHoje ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'
                      )}>
                        {dia.getDate()}
                      </span>
                      <div className="space-y-0.5">
                        {itens.slice(0, 4).map((e) => (
                          <button
                            key={`${e.tipo}-${e.id}`}
                            onClick={(ev) => {
                              ev.stopPropagation()
                              abrirEvento(e)
                            }}
                            className={cn('flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium', eventoCor(e))}
                          >
                            {iconeEvento(e)}
                            <span className="truncate">{e.horario && `${e.horario} `}{e.titulo}</span>
                          </button>
                        ))}
                        {itens.length > 4 && (
                          <span className="px-1 text-[10px] text-slate-400">+{itens.length - 4} mais</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      ) : modo === 'semana' ? (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => {
              const dia = new Date(inicioDaSemana(hoje))
              dia.setDate(dia.getDate() + i)
              const chave = dataParaInput(dia)
              const itens = eventosPorDia.get(chave) || []
              const isHoje = chave === hojeStr
              return (
                <div key={chave} className={cn('min-h-[60vh] border-r border-slate-100 p-1.5 last:border-r-0 dark:border-slate-800', isHoje && 'bg-brand-50/50 dark:bg-brand-900/10')}>
                  <p className={cn('mb-1 text-center text-sm font-semibold capitalize', isHoje ? 'text-brand-700 dark:text-brand-300' : 'text-slate-600 dark:text-slate-300')}>
                    {dia.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
                  </p>
                  <div className="space-y-1">
                    {itens.map((e) => (
                      <button
                        key={`${e.tipo}-${e.id}`}
                        onClick={() => abrirEvento(e)}
                        className={cn('flex w-full items-start gap-1 rounded-lg px-2 py-1.5 text-left text-xs', eventoCor(e))}
                      >
                        {iconeEvento(e)}
                        <span className="min-w-0">
                          <span className="block font-semibold">{e.horario && `${e.horario} `}</span>
                          <span className="line-clamp-2 font-medium">{e.titulo}</span>
                        </span>
                      </button>
                    ))}
                    {itens.length === 0 && <p className="py-4 text-center text-xs text-slate-300 dark:text-slate-600">—</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          {(() => {
            const chave = dataParaInput(hoje)
            const itens = (eventosPorDia.get(chave) || []).sort((a, b) => (a.horario || '99').localeCompare(b.horario || '99'))
            if (itens.length === 0) return <p className="py-10 text-center text-sm text-slate-400">Nenhum evento neste dia.</p>
            return (
              <div className="space-y-2">
                {itens.map((e) => (
                  <button
                    key={`${e.tipo}-${e.id}`}
                    onClick={() => abrirEvento(e)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', eventoCor(e))}>{iconeEvento(e)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{e.titulo}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {e.horario ? `${e.horario} · ` : ''}{e.tipo === 'pendencia' ? 'Pendência' : e.tipo === 'compromisso' ? 'Compromisso' : 'Retorno'}
                        {e.cliente ? ` · ${e.cliente}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatarData(e.data)}</span>
                  </button>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
