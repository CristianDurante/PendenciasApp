import { type ReactNode } from 'react'
import { Bell, CheckCheck, CalendarClock, MessageSquareReply, AlarmClock, TriangleAlert } from 'lucide-react'
import type { Notificacao } from '@shared/types'
import { useAppStore } from '../../store/appStore'
import { useCatalogoStore } from '../../store/catalogoStore'
import { call } from '../../lib/api'
import { formatarDataHora, cn } from '../../lib/format'

function iconeDaNotificacao(n: Notificacao): ReactNode {
  const cls = 'h-4 w-4'
  if (n.tipo === 'prazo') return <TriangleAlert className={cls} />
  if (n.tipo === 'compromisso') return <CalendarClock className={cls} />
  if (n.tipo === 'retorno') return <MessageSquareReply className={cls} />
  if (n.tipo === 'lembrete') return <AlarmClock className={cls} />
  return <Bell className={cls} />
}

export function NotificationsPanel(): ReactNode {
  const aberto = useAppStore((s) => s.painelNotificacoes)
  const setAberto = useAppStore((s) => s.setPainelNotificacoes)
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const notificacoes = useCatalogoStore((s) => s.notificacoes)
  const carregarNotificacoes = useCatalogoStore((s) => s.carregarNotificacoes)
  const marcarNotificacaoLida = useCatalogoStore((s) => s.marcarNotificacaoLida)

  if (!aberto) return null

  function abrirRelacionado(n: Notificacao): void {
    void marcarNotificacaoLida(n.id)
    if (n.relacionadoId?.startsWith('atrasada:') || n.relacionadoId?.startsWith('prazo:')) {
      const id = n.relacionadoId.split(':').slice(1).join(':')
      setAberto(false)
      call('pendencia', 'obter', { id }).then((p) => abrirPendencia(p as never))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60]"
      onClick={() => setAberto(false)}
    >
      <div
        className="absolute right-4 top-16 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">Notificações</p>
          <button
            onClick={() => void call('notificacao', 'marcarLida', { id: 'all' }).then(() => carregarNotificacoes())}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {notificacoes.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Nenhuma notificação.</p>
          )}
          {notificacoes.map((n) => (
            <button
              key={n.id}
              onClick={() => abrirRelacionado(n)}
              className={cn(
                'flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700',
                !n.lida && 'bg-brand-50/50 dark:bg-brand-900/10'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  n.tipo === 'prazo'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300'
                )}
              >
                {iconeDaNotificacao(n)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{n.titulo}</span>
                  {!n.lida && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </span>
                {n.mensagem && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{n.mensagem}</span>}
                <span className="mt-1 block text-[11px] text-slate-400">{formatarDataHora(n.criadoEm)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
