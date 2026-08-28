import { type ReactNode } from 'react'
import { Search, Bell, Plus } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useCatalogoStore } from '../../store/catalogoStore'
import { cn } from '../../lib/format'

const titulosPorRota: Record<string, string> = {
  '/': 'Dashboard',
  '/minhas-atividades': 'Minhas Atividades',
  '/pendencias': 'Pendências',
  '/kanban': 'Kanban',
  '/calendario': 'Calendário',
  '/compromissos': 'Compromissos',
  '/retornos': 'Retornos',
  '/anotacoes': 'Anotações',
  '/clientes': 'Clientes',
  '/projetos': 'Projetos',
  '/relatorios': 'Relatórios',
  '/historico': 'Histórico',
  '/configuracoes': 'Configurações'
}

export function Topbar({ rota }: { rota: string }): ReactNode {
  const sessao = useAppStore((s) => s.sessao)
  const setPainelBusca = useAppStore((s) => s.setPainelBusca)
  const setPainelNotificacoes = useAppStore((s) => s.setPainelNotificacoes)
  const painelNotificacoes = useAppStore((s) => s.painelNotificacoes)
  const abrirNovaPendencia = useAppStore((s) => s.abrirNovaPendencia)
  const notificacoes = useCatalogoStore((s) => s.notificacoes)
  const naoLidas = notificacoes.filter((n) => !n.lida).length

  const titulo = Object.entries(titulosPorRota).find(([rotaItem]) =>
    rota === '/' ? rotaItem === '/' : rota.startsWith(rotaItem)
  )?.[1]

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="flex-1 truncate text-lg font-bold text-slate-900 dark:text-white">{titulo ?? 'Pendencias App'}</h1>

      <button
        onClick={() => setPainelBusca(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition hover:border-slate-300 hover:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
        title="Buscar em tudo (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Buscar em tudo…</span>
        <kbd className="ml-1 hidden rounded border border-slate-200 bg-white px-1 text-[10px] text-slate-400 md:inline dark:border-slate-600 dark:bg-slate-900">
          Ctrl K
        </kbd>
      </button>

      <button
        onClick={() => setPainelNotificacoes(!painelNotificacoes)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg border transition',
          painelNotificacoes
            ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
        )}
        title="Notificações"
      >
        <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {sessao && sessao.usuario.perfil !== 'USUARIO' && (
        <button
          onClick={() => abrirNovaPendencia()}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          title="Nova Pendência (Ctrl+N)"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden lg:inline">Nova</span>
        </button>
      )}
    </header>
  )
}
