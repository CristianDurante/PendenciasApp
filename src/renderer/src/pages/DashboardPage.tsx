import { useEffect, type ReactNode } from 'react'
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
  RefreshCw
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { cn } from '../lib/format'
import { Loading, Button } from '../components/ui'

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
  const sessao = useAppStore((s) => s.sessao)

  useEffect(() => {
    void carregarDashboard(true)
    void carregarNotificacoes()
    void carregarCatalogo()
  }, [carregarDashboard, carregarNotificacoes, carregarCatalogo])

  useEffect(() => {
    if (dataVersao > 0) void carregarDashboard(true)
  }, [dataVersao, carregarDashboard])

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
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{nome ? `Olá, ${nome}` : 'Olá'}</h2>
        <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{hoje}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <CardContador key={c.rotulo} {...c} />
        ))}
      </div>
    </div>
  )
}
