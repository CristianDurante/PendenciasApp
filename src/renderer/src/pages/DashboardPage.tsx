import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  TriangleAlert,
  CalendarDays,
  CalendarClock,
  Loader2,
  ListTodo,
  MessageSquareReply,
  ArrowRight,
  Sun,
  AlarmClock,
  CheckCircle2,
  Timer
} from 'lucide-react'
import type { Pendencia, Compromisso, Retorno, Lembrete, Historico } from '@shared/types'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { call } from '../lib/api'
import { formatarDataHora, relativo, diasAte, cn } from '../lib/format'
import { PriorityBadge, Avatar, EmptyState, Loading } from '../components/ui'
import { PendenciaCard } from '../components/pendencia/PendenciaCard'

function useDashboardCarregado(): void {
  const dashboard = useAppStore((s) => s.dashboard)
  const dashboardLoading = useAppStore((s) => s.dashboardLoading)
  const carregarDashboard = useAppStore((s) => s.carregarDashboard)
  const carregarNotificacoes = useCatalogoStore((s) => s.carregarNotificacoes)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)

  useEffect(() => {
    void carregarDashboard()
    void carregarNotificacoes()
    void carregarCatalogo()
  }, [carregarDashboard, carregarNotificacoes, carregarCatalogo])
  void dashboardLoading
}

function CardContador({ rotulo, valor, cor, icone, href, texto }: { rotulo: string; valor: number; cor: string; icone: ReactNode; href: string; texto?: string }): ReactNode {
  return (
    <Link
      to={href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', cor)}>{icone}</span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none text-slate-900 dark:text-white">{valor}</span>
        <span className="mt-1 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">{rotulo}</span>
      </span>
      {texto && <span className="ml-auto hidden text-xs text-slate-400 sm:block">{texto}</span>}
    </Link>
  )
}

function BarraAgrupamento({ itens, maximo }: { itens: Array<{ label: string; valor: number }>; maximo: number }): ReactNode {
  if (itens.length === 0) return <p className="text-sm text-slate-400">Sem dados.</p>
  return (
    <div className="space-y-2">
      {itens.map((i) => (
        <div key={i.label}>
          <div className="mb-0.5 flex items-center justify-between text-xs">
            <span className="truncate font-medium text-slate-600 dark:text-slate-300">{i.label}</span>
            <span className="ml-2 shrink-0 text-slate-400">{i.valor}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(4, (i.valor / maximo) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListaPendencias({ itens, titulo, vazio, aoClicar }: { itens: Pendencia[]; titulo: string; vazio: string; aoClicar: (p: Pendencia) => void }): ReactNode {
  return (
    <div className="card">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <ListTodo className="h-4 w-4 text-brand-500" /> {titulo}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {itens.length}
        </span>
      </h3>
      {itens.length === 0 ? (
        <p className="text-sm text-slate-400">{vazio}</p>
      ) : (
        <div className="space-y-2">
          {itens.slice(0, 6).map((p) => (
            <PendenciaCard key={p.id} pendencia={p} aoClicar={aoClicar} />
          ))}
        </div>
      )}
    </div>
  )
}

function LinhaCompromisso({ c }: { c: Compromisso }): ReactNode {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
        <CalendarClock className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.titulo}</span>
        <span className="block text-xs text-slate-400">
          {c.horaInicio ? `${c.horaInicio} · ` : ''}
          {c.cliente?.nome || 'Sem cliente'}
        </span>
      </span>
      {c.responsavel && <Avatar nome={c.responsavel.nome} tamanho={22} />}
    </div>
  )
}

function LinhaRetorno({ r }: { r: Retorno }): ReactNode {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
        <MessageSquareReply className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.assunto}</span>
        <span className="block text-xs text-slate-400">
          {r.cliente?.nome || 'Sem cliente'}
          {r.dataPrevista ? ` · previsto ${formatarDataHora(r.dataPrevista)}` : ''}
        </span>
      </span>
      {r.responsavel && <Avatar nome={r.responsavel.nome} tamanho={22} />}
    </div>
  )
}

function LinhaAtividade({ h }: { h: Historico }): ReactNode {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      <Avatar nome={h.usuario?.nome} tamanho={22} />
      <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-300">
        <span className="font-medium text-slate-800 dark:text-slate-100">{h.usuario?.nome}</span>{' '}
        {h.descricao}
        <span className="block text-[11px] text-slate-400">{relativo(h.dataHora)}</span>
      </span>
    </div>
  )
}

export function DashboardPage(): ReactNode {
  useDashboardCarregado()
  const dashboard = useAppStore((s) => s.dashboard)
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)

  if (!dashboard) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading label="Carregando dashboard…" />
      </div>
    )
  }

  const maxAgrupamento = Math.max(
    1,
    ...[dashboard.porStatus, dashboard.porPrioridade, dashboard.porCliente, dashboard.porProjeto].flat().map((i) => i.valor)
  )

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <CardContador rotulo="Atrasadas" valor={dashboard.contadores.atrasadas} cor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300" icone={<TriangleAlert className="h-5 w-5" />} href="/pendencias?status=atrasadas" texto={dashboard.atrasadas.length ? 'precisam de atenção' : 'tudo em dia'} />
        <CardContador rotulo="Vencem hoje" valor={dashboard.contadores.hoje} cor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" icone={<CalendarDays className="h-5 w-5" />} href="/pendencias?prazo=hoje" />
        <CardContador rotulo="Próximas (7d)" valor={dashboard.contadores.proximas} cor="bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300" icone={<CalendarClock className="h-5 w-5" />} href="/pendencias?prazo=proximas" />
        <CardContador rotulo="Em andamento" valor={dashboard.contadores.emAndamento} cor="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" icone={<Timer className="h-5 w-5" />} href="/pendencias?status=EM_ANDAMENTO" />
        <CardContador rotulo="Concluídas" valor={dashboard.contadores.concluidas} cor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" icone={<CheckCircle2 className="h-5 w-5" />} href="/pendencias?status=CONCLUIDA" />
        <CardContador rotulo="Aguardando retorno" valor={dashboard.contadores.aguardandoRetorno} cor="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" icone={<MessageSquareReply className="h-5 w-5" />} href="/pendencias?status=AGUARDANDO_RETORNO" />
        <CardContador rotulo="Sem responsável" valor={dashboard.contadores.semResponsavel} cor="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" icone={<Loader2 className="h-5 w-5" />} href="/pendencias?semResponsavel=1" />
        <CardContador rotulo="Total pendências" valor={dashboard.totalPendencias} cor="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" icone={<ListTodo className="h-5 w-5" />} href="/pendencias" />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-900 dark:from-amber-950/40 dark:to-orange-950/40">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
          <Sun className="h-4 w-4" /> Meu Dia
        </h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Pendências · {dashboard.meuDia.pendencias.length}
            </p>
            {dashboard.meuDia.pendencias.length === 0 ? (
              <p className="text-sm text-amber-700/70 dark:text-amber-300/70">Nada para hoje.</p>
            ) : (
              <div className="space-y-1.5">
                {dashboard.meuDia.pendencias.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => abrirPendencia(p)}
                    className="flex w-full items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-left text-sm transition hover:bg-white dark:bg-slate-900/40 dark:hover:bg-slate-900"
                  >
                    <PriorityBadge prioridade={p.prioridade} compacto />
                    <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100">{p.titulo}</span>
                    {p.prazo && <span className="shrink-0 text-[11px] text-slate-500">{diasAte(p.prazo)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Compromissos · {dashboard.meuDia.compromissos.length}
            </p>
            {dashboard.meuDia.compromissos.length === 0 ? (
              <p className="text-sm text-amber-700/70 dark:text-amber-300/70">Sem compromissos hoje.</p>
            ) : (
              <div className="space-y-1.5">
                {dashboard.meuDia.compromissos.map((c) => (
                  <LinhaCompromisso key={c.id} c={c} />
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Retornos · {dashboard.meuDia.retornos.length}
            </p>
            {dashboard.meuDia.retornos.length === 0 ? (
              <p className="text-sm text-amber-700/70 dark:text-amber-300/70">Sem retornos pendentes.</p>
            ) : (
              <div className="space-y-1.5">
                {dashboard.meuDia.retornos.map((r) => (
                  <LinhaRetorno key={r.id} r={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListaPendencias itens={dashboard.atrasadas} titulo="Atrasadas" vazio="Nenhuma pendência atrasada. Bom trabalho!" aoClicar={abrirPendencia} />
        <ListaPendencias itens={dashboard.pendenciasHoje} titulo="Vencem hoje" vazio="Nada vence hoje." aoClicar={abrirPendencia} />
        <ListaPendencias itens={dashboard.proximas} titulo="Próximas 7 dias" vazio="Nada nos próximos 7 dias." aoClicar={abrirPendencia} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Compromissos hoje</h3>
          {dashboard.compromissosHoje.length === 0 ? (
            <p className="text-sm text-slate-400">Sem compromissos para hoje.</p>
          ) : (
            <div className="space-y-1.5">
              {dashboard.compromissosHoje.slice(0, 8).map((c) => (
                <LinhaCompromisso key={c.id} c={c} />
              ))}
            </div>
          )}
          <Link to="/compromissos" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Retornos pendentes</h3>
          {dashboard.retornosPendentes.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum retorno pendente.</p>
          ) : (
            <div className="space-y-1.5">
              {dashboard.retornosPendentes.slice(0, 8).map((r) => (
                <LinhaRetorno key={r.id} r={r} />
              ))}
            </div>
          )}
          <Link to="/retornos" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <AlarmClock className="h-4 w-4 text-amber-500" /> Lembretes
          </h3>
          {dashboard.lembretes.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum lembrete agendado.</p>
          ) : (
            <div className="space-y-1.5">
              {dashboard.lembretes.map((l) => (
                <div key={l.id} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{l.mensagem}</p>
                  <p className="text-[11px] text-slate-400">{formatarDataHora(l.dataHora)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Por status</h3>
          <BarraAgrupamento itens={dashboard.porStatus} maximo={maxAgrupamento} />
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Por prioridade</h3>
          <BarraAgrupamento itens={dashboard.porPrioridade} maximo={maxAgrupamento} />
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Por cliente</h3>
          <BarraAgrupamento itens={dashboard.porCliente} maximo={maxAgrupamento} />
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Por projeto</h3>
          <BarraAgrupamento itens={dashboard.porProjeto} maximo={maxAgrupamento} />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">Atividade recente</h3>
        {dashboard.atividadeRecente.length === 0 ? (
          <EmptyState titulo="Sem atividade ainda" />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dashboard.atividadeRecente.slice(0, 15).map((h) => (
              <LinhaAtividade key={h.id} h={h} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
