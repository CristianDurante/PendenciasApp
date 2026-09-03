import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Check, Loader2, AlertTriangle, Info, CheckCircle2, XCircle, Search, Inbox } from 'lucide-react'
import { cn, hexContraste, iniciais } from '../lib/format'
import { useAppStore } from '../store/appStore'
import type { Prioridade, PendenciaStatus, Perfil, RetornoStatus, CompromissoStatus, ProjetoStatus, Tag } from '@shared/types'
import {
  PRIORIDADE_LABEL,
  PRIORIDADE_COR,
  PENDENCIA_STATUS_LABEL,
  PENDENCIA_STATUS_COR,
  PERFIL_LABEL,
  RETORNO_STATUS_LABEL,
  RETORNO_STATUS_COR,
  COMPROMISSO_STATUS_LABEL,
  COMPROMISSO_STATUS_COR,
  PROJETO_STATUS_LABEL,
  PROJETO_STATUS_COR
} from '@shared/constants'

export function Spinner({ className }: { className?: string }): ReactNode {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-500', className)} />
}

export function Loading({ label = 'Carregando...' }: { label?: string }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }): ReactNode {
  return <span aria-hidden="true" className={cn('block animate-shimmer rounded-lg bg-slate-200 dark:bg-slate-800', className)} />
}

export function PageSkeleton(): ReactNode {
  return (
    <div className="h-full overflow-hidden p-4 motion-safe:animate-page-enter">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}
      </div>
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  )
}

export function EmptyState({
  titulo = 'Nada por aqui',
  descricao,
  acao
}: {
  titulo?: string
  descricao?: string
  acao?: ReactNode
}): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Inbox className="h-8 w-8" />
      </div>
      <p className="mt-2 font-medium text-slate-700 dark:text-slate-200">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{descricao}</p>}
      {acao && <div className="mt-3">{acao}</div>}
    </div>
  )
}

export function ErrorState({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="rounded-full bg-red-100 p-4 text-red-500 dark:bg-red-900/30">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <p className="mt-2 font-medium text-slate-700 dark:text-slate-200">Algo deu errado</p>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{mensagem}</p>
      {aoTentar && (
        <button className="btn-secondary mt-3" onClick={aoTentar}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

export function Button({
  variant = 'primary',
  size = 'md',
  carregando = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  carregando?: boolean
}): ReactNode {
  const variantes: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700'
  }
  const tamanhos: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  return (
    <button className={cn(variantes[variant], tamanhos[size], className)} disabled={disabled || carregando} {...props}>
      {carregando ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent align-middle" /> : children}
    </button>
  )
}

export function Field({ label, children, className, obrigatorio }: { label: string; children: ReactNode; className?: string; obrigatorio?: boolean }): ReactNode {
  return (
    <div className={className}>
      <label className="label">
        {label}
        {obrigatorio && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return <input className={cn('input', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  return <textarea className={cn('input min-h-[80px]', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>): ReactNode {
  return (
    <div className="relative">
      <select className={cn('input appearance-none pr-8', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

export function SelectOpcoes({
  value,
  onChange,
  opcoes,
  className
}: {
  value: string
  onChange: (v: string) => void
  opcoes: { valor: string; rotulo: string }[]
  className?: string
}): ReactNode {
  return (
    <div className="relative">
      <select className={cn('input appearance-none pr-8', className)} value={value} onChange={(e) => onChange(e.target.value)}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

export function Switch({ marcado, aoMudar, label }: { marcado: boolean; aoMudar: (v: boolean) => void; label?: string }): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={marcado}
      onClick={() => aoMudar(!marcado)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition',
        marcado ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
      )}
      title={label}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition',
          marcado ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

export function Badge({
  cor = '#64748b',
  children,
  className
}: {
  cor?: string
  children: ReactNode
  className?: string
}): ReactNode {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', className)}
      style={{ backgroundColor: cor + '22', color: cor }}
    >
      {children}
    </span>
  )
}

export function TagBadge({ tag, aoRemover, compacto }: { tag: Tag; aoRemover?: () => void; compacto?: boolean }): ReactNode {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition"
      style={{ backgroundColor: tag.cor + '1f', color: tag.cor }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.cor }} />
      {tag.nome}
      {aoRemover && (
        <button className="ml-0.5 opacity-60 hover:opacity-100" onClick={aoRemover} title="Remover tag">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

export function StatusBadge({ status }: { status: PendenciaStatus }): ReactNode {
  const cor = PENDENCIA_STATUS_COR[status]
  return <Badge cor={cor}>{PENDENCIA_STATUS_LABEL[status]}</Badge>
}

export function PriorityBadge({ prioridade, compacto }: { prioridade: Prioridade; compacto?: boolean }): ReactNode {
  const cor = PRIORIDADE_COR[prioridade]
  const rotulo = PRIORIDADE_LABEL[prioridade]
  if (compacto) {
    return <span title={rotulo} className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
  }
  return <Badge cor={cor}>{rotulo}</Badge>
}

export function PerfilBadge({ perfil }: { perfil: Perfil }): ReactNode {
  const cor = perfil === 'ADMIN' ? '#ef4444' : perfil === 'GESTOR' ? '#f59e0b' : '#3b82f6'
  return <Badge cor={cor}>{PERFIL_LABEL[perfil]}</Badge>
}

export function RetornoStatusBadge({ status }: { status: RetornoStatus }): ReactNode {
  return <Badge cor={RETORNO_STATUS_COR[status]}>{RETORNO_STATUS_LABEL[status]}</Badge>
}

export function CompromissoStatusBadge({ status }: { status: CompromissoStatus }): ReactNode {
  return <Badge cor={COMPROMISSO_STATUS_COR[status]}>{COMPROMISSO_STATUS_LABEL[status]}</Badge>
}

export function ProjetoStatusBadge({ status }: { status: ProjetoStatus }): ReactNode {
  return <Badge cor={PROJETO_STATUS_COR[status]}>{PROJETO_STATUS_LABEL[status]}</Badge>
}

export function Avatar({ nome, tamanho = 28, className }: { nome?: string | null; tamanho?: number; className?: string }): ReactNode {
  const cores = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#d97706', '#0891b2']
  const idx = (nome || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cor = cores[idx % cores.length]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4, backgroundColor: cor }}
      title={nome || ''}
    >
      {iniciais(nome)}
    </span>
  )
}

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
  largura = 'max-w-2xl',
  rodape
}: {
  aberto: boolean
  aoFechar: () => void
  titulo?: ReactNode
  children: ReactNode
  largura?: string
  rodape?: ReactNode
}): ReactNode {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') aoFechar()
    }
    if (aberto) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [aberto, aoFechar])

  if (!aberto) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={aoFechar} />
      <div className={cn('relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in dark:bg-slate-900', largura)}>
        {titulo && (
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <button className="btn-ghost !p-1.5" onClick={aoFechar}>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape && <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">{rodape}</div>}
      </div>
    </div>,
    document.body
  )
}

export function Drawer({
  aberto,
  aoFechar,
  titulo,
  children,
  largura = 'max-w-3xl'
}: {
  aberto: boolean
  aoFechar: () => void
  titulo?: ReactNode
  children: ReactNode
  largura?: string
}): ReactNode {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') aoFechar()
    }
    if (aberto) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [aberto, aoFechar])

  if (!aberto) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={aoFechar} />
      <div
        className={cn(
          'absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl animate-slide-up dark:bg-slate-900',
          largura
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button className="btn-ghost !p-1.5" onClick={aoFechar}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export function ConfirmDialog({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  mensagem,
  confirmarTexto = 'Confirmar',
  perigo = false
}: {
  aberto: boolean
  aoFechar: () => void
  aoConfirmar: () => void
  titulo: string
  mensagem: string
  confirmarTexto?: string
  perigo?: boolean
}): ReactNode {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} largura="max-w-md">
      <div className="flex gap-4">
        <div className={cn('rounded-full p-3', perigo ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30')}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{titulo}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{mensagem}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button variant={perigo ? 'danger' : 'primary'} onClick={aoConfirmar}>
          {confirmarTexto}
        </Button>
      </div>
    </Modal>
  )
}

export function Tabs({
  abas,
  ativo,
  aoMudar
}: {
  abas: Array<{ id: string; label: string; icone?: ReactNode }>
  ativo: string
  aoMudar: (id: string) => void
}): ReactNode {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {abas.map((a) => (
        <button
          key={a.id}
          onClick={() => aoMudar(a.id)}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
            ativo === a.id
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          {a.icone}
          {a.label}
        </button>
      ))}
    </div>
  )
}

export function Dropdown({
  gatilho,
  children,
  alinhar = 'right'
}: {
  gatilho: ReactNode
  children: (fechar: () => void) => ReactNode
  alinhar?: 'left' | 'right'
}): ReactNode {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setAberto((v) => !v)}>{gatilho}</div>
      {aberto && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg animate-scale-in dark:border-slate-700 dark:bg-slate-800',
            alinhar === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  onClick,
  children,
  perigo,
  icone
}: {
  onClick: () => void
  children: ReactNode
  perigo?: boolean
  icone?: ReactNode
}): ReactNode {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-700',
        perigo ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
      )}
    >
      {icone}
      {children}
    </button>
  )
}

export function Pagination({ pagina, total, porPagina, aoMudar }: { pagina: number; total: number; porPagina: number; aoMudar: (p: number) => void }): ReactNode {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (paginas <= 1) return null
  const numeros: number[] = []
  for (let i = 1; i <= paginas; i++) {
    if (i === 1 || i === paginas || Math.abs(i - pagina) <= 1) numeros.push(i)
  }
  const comElipse = numeros.reduce<number[]>((acc, n, idx) => {
    if (idx > 0 && n - numeros[idx - 1] > 1) acc.push(-1)
    acc.push(n)
    return acc
  }, [])
  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {comElipse.map((n, i) =>
        n === -1 ? (
          <span key={`e-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => aoMudar(n)}
            className={cn(
              'h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition',
              n === pagina ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {n}
          </button>
        )
      )}
    </div>
  )
}

export function ProgressBar({ valor, cor = '#2563eb', compacto }: { valor: number; cor?: string; compacto?: boolean }): ReactNode {
  return (
    <div className={compacto ? 'h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700' : 'h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700'}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, valor))}%`, backgroundColor: cor }} />
    </div>
  )
}

export function ToastViewport(): ReactNode {
  const toasts = useAppStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const icones = {
          sucesso: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          erro: <XCircle className="h-5 w-5 text-red-500" />,
          alerta: <AlertTriangle className="h-5 w-5 text-amber-500" />,
          info: <Info className="h-5 w-5 text-blue-500" />
        }
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg animate-slide-up dark:border-slate-700 dark:bg-slate-800">
            {icones[t.tipo as keyof typeof icones]}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t.titulo}</p>
              {t.mensagem && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.mensagem}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
