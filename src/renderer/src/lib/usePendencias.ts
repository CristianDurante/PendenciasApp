import { useCallback, useEffect, useState } from 'react'
import type { Pendencia } from '@shared/types'
import type { FiltroPendencias } from '@shared/types'
import { call } from './api'

export interface ResultadoLista {
  itens: Pendencia[]
  total: number
  pagina: number
  porPagina: number
}

export function usePendencias(filtroInicial: FiltroPendencias = {}): {
  itens: Pendencia[]
  total: number
  pagina: number
  porPagina: number
  carregando: boolean
  erro: string
  filtro: FiltroPendencias
  setFiltro: (f: FiltroPendencias) => void
  atualizarFiltro: (f: Partial<FiltroPendencias>) => void
  recarregar: () => Promise<void>
} {
  const [filtro, setFiltroState] = useState<FiltroPendencias>(filtroInicial)
  const [resultado, setResultado] = useState<ResultadoLista>({ itens: [], total: 0, pagina: 1, porPagina: 20 })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const setFiltro = useCallback((f: FiltroPendencias) => setFiltroState(f), [])

  const atualizarFiltro = useCallback((f: Partial<FiltroPendencias>) => {
    setFiltroState((prev) => ({ ...prev, ...f, pagina: f.pagina ?? 1 }))
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const r = await call<ResultadoLista>('pendencia', 'listar', filtro as never)
      setResultado(r)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar pendências.')
    } finally {
      setCarregando(false)
    }
  }, [filtro])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const recarregar = useCallback(async () => {
    await carregar()
  }, [carregar])

  return {
    itens: resultado.itens,
    total: resultado.total,
    pagina: resultado.pagina,
    porPagina: resultado.porPagina,
    carregando,
    erro,
    filtro,
    setFiltro,
    atualizarFiltro,
    recarregar
  }
}
