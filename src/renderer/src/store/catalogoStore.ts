import { create } from 'zustand'
import type { Categoria, Cliente, Notificacao, Projeto, Tag, Usuario } from '@shared/types'
import { call } from '../lib/api'

interface CatalogoState {
  clientes: Cliente[]
  projetos: (Projeto & { progresso?: number; totalPendencias?: number; concluidas?: number })[]
  tags: (Tag & { quantidade?: number })[]
  categorias: (Categoria & { quantidade?: number })[]
  usuarios: Usuario[]
  notificacoes: Notificacao[]
  carregado: boolean
  carregando: boolean
  carregarCatalogo: (forcar?: boolean) => Promise<void>
  recarregar: () => Promise<void>
  carregarNotificacoes: () => Promise<void>
  marcarNotificacaoLida: (id: string) => Promise<void>
}

export const useCatalogoStore = create<CatalogoState>((set, get) => ({
  clientes: [],
  projetos: [],
  tags: [],
  categorias: [],
  usuarios: [],
  notificacoes: [],
  carregado: false,
  carregando: false,

  carregarCatalogo: async (forcar = false) => {
    if (get().carregado && !forcar) return
    if (get().carregando) return
    set({ carregando: true })
    try {
      const [clientes, projetos, tags, categorias, usuarios] = await Promise.all([
        call<Cliente[]>('cliente', 'listar', {}),
        call<(Projeto & { progresso?: number; totalPendencias?: number; concluidas?: number })[]>('projeto', 'listar', {}),
        call<(Tag & { quantidade?: number })[]>('tag', 'listar', {}),
        call<(Categoria & { quantidade?: number })[]>('categoria', 'listar', {}),
        call<Usuario[]>('usuario', 'listar', {}).catch(() => [])
      ])
      set({
        clientes,
        projetos,
        tags,
        categorias,
        usuarios,
        carregado: true,
        carregando: false
      })
    } catch {
      set({ carregando: false })
    }
  },

  recarregar: async () => {
    set({ carregado: false })
    await get().carregarCatalogo(true)
  },

  carregarNotificacoes: async () => {
    const resultado = await call<{ itens: Notificacao[] }>('notificacao', 'listar', {}).catch(() => null)
    set({ notificacoes: resultado?.itens ?? [] })
  },

  marcarNotificacaoLida: async (id) => {
    await call('notificacao', 'marcarLida', { id })
    await get().carregarNotificacoes()
  }
}))
