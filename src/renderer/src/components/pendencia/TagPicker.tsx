import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Plus, Search, X, Tag as TagIcon } from 'lucide-react'
import type { Tag } from '@shared/types'
import { useCatalogoStore } from '../../store/catalogoStore'
import { call } from '../../lib/api'
import { useAppStore } from '../../store/appStore'
import { cn } from '../../lib/format'

export function TagPicker({
  selecionadas,
  aoMudar
}: {
  selecionadas: string[]
  aoMudar: (ids: string[]) => void
}): ReactNode {
  const tags = useCatalogoStore((s) => s.tags)
  const recarregar = useCatalogoStore((s) => s.recarregar)
  const pushToast = useAppStore((s) => s.pushToast)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [novaTag, setNovaTag] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string): void => {
    if (selecionadas.includes(id)) aoMudar(selecionadas.filter((x) => x !== id))
    else aoMudar([...selecionadas, id])
  }

  const criarTag = async (): Promise<void> => {
    const nome = novaTag.trim()
    if (!nome) return
    try {
      const cor = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
      const t = await call<Tag>('tag', 'criar', { nome, cor })
      await recarregar()
      aoMudar([...selecionadas, t.id])
      setNovaTag('')
      pushToast('sucesso', 'Tag criada', `Tag "${nome}" criada com sucesso.`)
    } catch (e) {
      pushToast('erro', 'Erro ao criar tag', (e as Error).message)
    }
  }

  const filtradas = tags.filter((t) => t.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="relative" ref={ref}>
      <div className="flex flex-wrap items-center gap-1.5">
        {selecionadas.map((id) => {
          const tag = tags.find((t) => t.id === id)
          if (!tag) return null
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: tag.cor + '1f', color: tag.cor }}
            >
              {tag.nome}
              <button onClick={() => aoMudar(selecionadas.filter((x) => x !== id))}>
                <X className="h-3 w-3 opacity-60 hover:opacity-100" />
              </button>
            </span>
          )
        })}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-600"
        >
          <Plus className="h-3 w-3" /> Adicionar tag
        </button>
      </div>
      {aberto && (
        <div className="absolute z-50 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg animate-scale-in dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 p-2 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-sm outline-none focus:border-brand-400 dark:border-slate-600 dark:bg-slate-700"
                placeholder="Buscar tag..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1.5">
            {filtradas.length === 0 && <p className="px-2 py-3 text-center text-xs text-slate-400">Nenhuma tag encontrada</p>}
            {filtradas.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border',
                    selecionadas.includes(t.id) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'
                  )}
                >
                  {selecionadas.includes(t.id) && '✓'}
                </span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.cor }} />
                {t.nome}
              </button>
            ))}
          </div>
          <div className="flex gap-1 border-t border-slate-100 p-2 dark:border-slate-700">
            <input
              className="input !py-1 text-xs"
              placeholder="Nova tag..."
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void criarTag()
              }}
            />
            <button type="button" className="btn-primary !px-2 !py-1" onClick={() => void criarTag()} title="Criar tag">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
