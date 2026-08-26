import { useEffect, useState, type ReactNode } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import type { Pendencia } from '@shared/types'
import { PENDENCIA_STATUS, PENDENCIA_STATUS_COR } from '@shared/constants'
import { usePendencias } from '../lib/usePendencias'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { call } from '../lib/api'
import { cn } from '../lib/format'
import { PendenciaCard } from '../components/pendencia/PendenciaCard'
import { Loading } from '../components/ui'

export function KanbanPage(): ReactNode {
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const abrirNovaPendencia = useAppStore((s) => s.abrirNovaPendencia)
  const pushToast = useAppStore((s) => s.pushToast)
  const carregarDashboard = useAppStore((s) => s.carregarDashboard)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)

  useEffect(() => {
    void carregarCatalogo()
  }, [carregarCatalogo])

  const { itens, carregando, recarregar } = usePendencias({ porPagina: 200, pagina: 1, ordenacao: 'prazo', ordem: 'asc' } as never)

  const [arrastando, setArrastando] = useState<Pendencia | null>(null)
  const [salvando, setSalvando] = useState(false)

  const porStatus = PENDENCIA_STATUS.map((status) => ({
    status,
    itens: itens.filter((p) => p.status === status)
  }))

  async function mover(p: Pendencia, statusNovo: string): Promise<void> {
    if (p.status === statusNovo || salvando) return
    setSalvando(true)
    setArrastando(null)
    try {
      await call('pendencia', 'status', { id: p.id, status: statusNovo })
      await recarregar()
      void carregarDashboard(true)
    } catch (e) {
      pushToast('erro', 'Falha ao mover', e instanceof Error ? e.message : undefined)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 gap-3 overflow-x-auto p-4">
        {porStatus.map((col) => (
          <div
            key={col.status}
            className="flex w-72 shrink-0 flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-900"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (arrastando) void mover(arrastando, col.status)
            }}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PENDENCIA_STATUS_COR[col.status as keyof typeof PENDENCIA_STATUS_COR] || '#64748b' }} />
              <span className="flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{col.status}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {col.itens.length}
              </span>
              <button
                onClick={() => abrirNovaPendencia({ status: col.status })}
                className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-brand-600 dark:hover:bg-slate-800"
                title={`Nova pendência em ${col.status}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div
              className="min-h-[120px] flex-1 space-y-2 overflow-y-auto px-2 pb-3"
            >
              {carregando ? (
                <div className="flex items-center justify-center py-8">
                  <Loading />
                </div>
              ) : col.itens.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                  Solte pendências aqui
                </div>
              ) : (
                col.itens.map((p) => (
                  <PendenciaCard
                    key={p.id}
                    pendencia={p}
                    aoClicar={abrirPendencia}
                    onDragStart={(pend) => setArrastando(pend)}
                    onDrop={(pend) => void mover(pend, col.status)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        <GripVertical className="h-3.5 w-3.5" />
        Arraste os cartões entre as colunas para alterar o status. {salvando && 'Salvando…'}
      </div>
    </div>
  )
}
