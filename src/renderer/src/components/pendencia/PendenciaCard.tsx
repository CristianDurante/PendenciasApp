import type { ReactNode } from 'react'
import { CalendarClock, ListChecks, User, AlertCircle } from 'lucide-react'
import type { Pendencia } from '@shared/types'
import { PriorityBadge, StatusBadge, Avatar, ProgressBar, TagBadge } from '../ui'
import { cn, formatarData, diasAte } from '../../lib/format'

export function PendenciaCard({
  pendencia,
  aoClicar,
  arrastavel = true,
  onDragStart,
  onDrop
}: {
  pendencia: Pendencia
  aoClicar: (p: Pendencia) => void
  arrastavel?: boolean
  onDragStart?: (p: Pendencia) => void
  onDrop?: (p: Pendencia) => void
}): ReactNode {
  const dias = diasAte(pendencia.prazo)
  const atrasada = pendencia.atrasada || (pendencia.prazo && dias < 0)
  const venceHoje = pendencia.prazo && dias === 0
  const corPrazo = atrasada ? 'text-red-600' : venceHoje ? 'text-amber-600' : 'text-slate-500'

  return (
    <div
      draggable={arrastavel}
      onDragStart={() => onDragStart?.(pendencia)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDrop?.(pendencia)
      }}
      onClick={() => aoClicar(pendencia)}
      className={cn(
        'group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-600',
        atrasada && 'border-l-4 border-l-red-500'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-100">{pendencia.titulo}</p>
        <PriorityBadge prioridade={pendencia.prioridade} />
      </div>

      {(pendencia.cliente?.nome || pendencia.projeto?.nome) && (
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
          {[pendencia.cliente?.nome, pendencia.projeto?.nome].filter(Boolean).join(' · ')}
        </p>
      )}

      {pendencia.tags && pendencia.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {pendencia.tags.slice(0, 4).map((pt) => (
            <TagBadge key={pt.tagId} tag={pt.tag!} />
          ))}
          {pendencia.tags.length > 4 && (
            <span className="text-xs text-slate-400">+{pendencia.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {pendencia.prazo ? (
            <span className={cn('inline-flex items-center gap-1 font-medium', corPrazo)}>
              {atrasada && <AlertCircle className="h-3.5 w-3.5" />}
              <CalendarClock className="h-3.5 w-3.5" />
              {formatarData(pendencia.prazo)}
              {pendencia.horario && ` ${pendencia.horario}`}
            </span>
          ) : (
            <span className="text-slate-400">Sem prazo</span>
          )}
        </div>
        {pendencia.responsavel ? (
          <Avatar nome={pendencia.responsavel.nome} tamanho={22} />
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="Sem responsável">
            <User className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {(pendencia.checklist && pendencia.checklist.length > 0) || (pendencia.progresso ?? 0) > 0 ? (
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              Checklist
            </span>
            <span>{pendencia.progresso ?? 0}%</span>
          </div>
          <ProgressBar valor={pendencia.progresso ?? 0} cor={atrasada ? '#dc2626' : '#2563eb'} />
        </div>
      ) : null}
    </div>
  )
}
