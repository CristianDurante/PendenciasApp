import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { History, RefreshCw } from 'lucide-react'
import type { Historico } from '@shared/types'
import { call } from '../lib/api'
import { formatarDataHora, relativo } from '../lib/format'
import { Button, Avatar, EmptyState, Loading } from '../components/ui'

export function HistoricoPage(): ReactNode {
  const [itens, setItens] = useState<Historico[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true)
    const lista = await call<Historico[]>('historico', 'global', { limite: 200 }).catch(() => [])
    setItens(lista)
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <History className="h-5 w-5 text-brand-500" /> Histórico de atividade
        </h2>
        <Button variant="secondary" size="sm" onClick={() => void carregar()}>
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <div className="flex h-full items-center justify-center"><Loading /></div>
        ) : itens.length === 0 ? (
          <EmptyState titulo="Sem atividade registrada" descricao="As ações no sistema aparecerão aqui." />
        ) : (
          <div className="space-y-0.5">
            {itens.map((h) => (
              <div key={h.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <Avatar nome={h.usuario?.nome} tamanho={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{h.usuario?.nome || 'Sistema'}</span>{' '}
                    {h.descricao}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatarDataHora(h.dataHora)} ({relativo(formatarDataHora(h.dataHora))})
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {h.tipo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
