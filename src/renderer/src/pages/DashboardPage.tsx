import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  TriangleAlert,
  CalendarDays,
  CalendarClock,
  Timer,
  MessageSquareReply,
  CheckCircle2,
  UserX,
  ListTodo,
  RefreshCw,
  Users2
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { cn } from '../lib/format'
import { Loading, Button, SelectOpcoes } from '../components/ui'

function CardContador({ rotulo, valor, cor, icone, href }: { rotulo: string; valor: number; cor: string; icone: ReactNode; href: string }): ReactNode {
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
    </Link>
  )
}

export function DashboardPage(): ReactNode {
  const dashboard = useAppStore((s) => s.dashboard)
  const dashboardLoading = useAppStore((s) => s.dashboardLoading)
  const carregarDashboard = useAppStore((s) => s.carregarDashboard)
  const dataVersao = useAppStore((s) => s.dataVersao)
  const carregarNotificacoes = useCatalogoStore((s) => s.carregarNotificacoes)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const equipes = useCatalogoStore((s) => s.equipes)
  const sessao = useAppStore((s) => s.sessao)
  const ehAdmin = sessao?.usuario.perfil === 'ADMIN'
  const [equipeFiltro, setEquipeFiltro] = useState('')

  useEffect(() => {
    void carregarDashboard(true, ehAdmin ? (equipeFiltro || undefined) : undefined)
    void carregarNotificacoes()
    void carregarCatalogo()
  }, [carregarDashboard, carregarNotificacoes, carregarCatalogo, equipeFiltro, ehAdmin])

  useEffect(() => {
    if (dataVersao > 0) void carregarDashboard(true, ehAdmin ? (equipeFiltro || undefined) : undefined)
  }, [dataVersao, carregarDashboard, equipeFiltro, ehAdmin])

  const nome = sessao?.usuario.nome?.split(' ')[0] || ''
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (!dashboard && dashboardLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading label="Carregando dashboard…" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-500">Não foi possível carregar o dashboard.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void carregarDashboard(true)}>
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  const cards = [
    { rotulo: 'Atrasadas', valor: dashboard.contadores.atrasadas, cor: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300', icone: <TriangleAlert className="h-5 w-5" />, href: '/pendencias?status=atrasadas' },
    { rotulo: 'Vencem hoje', valor: dashboard.contadores.hoje, cor: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', icone: <CalendarDays className="h-5 w-5" />, href: '/pendencias?prazo=hoje' },
    { rotulo: 'Próximas (7d)', valor: dashboard.contadores.proximas, cor: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300', icone: <CalendarClock className="h-5 w-5" />, href: '/pendencias?prazo=proximas' },
    { rotulo: 'Em andamento', valor: dashboard.contadores.emAndamento, cor: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300', icone: <Timer className="h-5 w-5" />, href: '/pendencias?status=EM_ANDAMENTO' },
    { rotulo: 'Concluídas', valor: dashboard.contadores.concluidas, cor: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', icone: <CheckCircle2 className="h-5 w-5" />, href: '/pendencias?status=CONCLUIDA' },
    { rotulo: 'Aguardando retorno', valor: dashboard.contadores.aguardandoRetorno, cor: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', icone: <MessageSquareReply className="h-5 w-5" />, href: '/pendencias?status=AGUARDANDO_RETORNO' },
    { rotulo: 'Sem responsável', valor: dashboard.contadores.semResponsavel, cor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', icone: <UserX className="h-5 w-5" />, href: '/pendencias?semResponsavel=1' },
    { rotulo: 'Total pendências', valor: dashboard.totalPendencias, cor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', icone: <ListTodo className="h-5 w-5" />, href: '/pendencias' }
  ]

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{nome ? `Olá, ${nome}` : 'Olá'}</h2>
          <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{hoje}</p>
        </div>
        {ehAdmin && (
          <SelectOpcoes
            value={equipeFiltro}
            onChange={setEquipeFiltro}
            opcoes={[{ valor: '', rotulo: 'Equipe: Todas' }, ...equipes.map((eq) => ({ valor: eq.id, rotulo: `Equipe: ${eq.nome}` }))]}
            className="w-52"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <CardContador key={c.rotulo} {...c} />
        ))}
      </div>

      {ehAdmin && dashboard.porEquipe && dashboard.porEquipe.length > 0 && (
        <div className="card mt-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Users2 className="h-4 w-4 text-brand-500" /> Pendências por equipe
          </h3>
          <div className="space-y-2">
            {dashboard.porEquipe.map((e) => {
              const max = Math.max(...dashboard.porEquipe.map((x) => x.valor), 1)
              return (
                <div key={e.label} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm text-slate-600 dark:text-slate-300">{e.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((e.valor / max) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{e.valor}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
