import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ListTodo,
  Columns3,
  CalendarDays,
  CalendarClock,
  MessageSquareReply,
  StickyNote,
  Building2,
  FolderKanban,
  BarChart3,
  History,
  Settings,
  Plus,
  ClipboardList
} from 'lucide-react'
import { cn } from '../../lib/format'
import { useAppStore } from '../../store/appStore'
import { Avatar } from '../ui'
import { BrandLogo } from './BrandLogo'

const itens = [
  { to: '/', label: 'Dashboard', icone: <LayoutDashboard className="h-4.5 w-4.5 h-[18px] w-[18px]" /> },
  { to: '/minhas-atividades', label: 'Minhas Atividades', icone: <ClipboardList className="h-[18px] w-[18px]" /> },
  { to: '/pendencias', label: 'Pendências', icone: <ListTodo className="h-[18px] w-[18px]" /> },
  { to: '/kanban', label: 'Kanban', icone: <Columns3 className="h-[18px] w-[18px]" /> },
  { to: '/calendario', label: 'Calendário', icone: <CalendarDays className="h-[18px] w-[18px]" /> },
  { to: '/compromissos', label: 'Compromissos', icone: <CalendarClock className="h-[18px] w-[18px]" /> },
  { to: '/retornos', label: 'Retornos', icone: <MessageSquareReply className="h-[18px] w-[18px]" /> },
  { to: '/anotacoes', label: 'Anotações', icone: <StickyNote className="h-[18px] w-[18px]" /> },
  { to: '/clientes', label: 'Clientes', icone: <Building2 className="h-[18px] w-[18px]" /> },
  { to: '/projetos', label: 'Projetos', icone: <FolderKanban className="h-[18px] w-[18px]" /> },
  { to: '/relatorios', label: 'Relatórios', icone: <BarChart3 className="h-[18px] w-[18px]" /> },
  { to: '/historico', label: 'Histórico', icone: <History className="h-[18px] w-[18px]" /> }
]

export function Sidebar(): ReactNode {
  const sessao = useAppStore((s) => s.sessao)
  const abrirNovaPendencia = useAppStore((s) => s.abrirNovaPendencia)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 px-4 py-4">
        <BrandLogo tamanho="sm" />
        <div>
          <p className="text-base font-bold leading-tight text-slate-900 dark:text-white">Pendencias</p>
          <p className="text-[11px] text-slate-400">Controle de pendências</p>
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={() => abrirNovaPendencia()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Nova Pendência
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              )
            }
          >
            {item.icone}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <NavLink
          to="/configuracoes"
          className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Settings className="h-[18px] w-[18px]" />
          Configurações
        </NavLink>
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar nome={sessao?.usuario.nome} tamanho={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{sessao?.usuario.nome}</p>
            <p className="truncate text-[11px] text-slate-400">{sessao?.usuario.perfil}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
