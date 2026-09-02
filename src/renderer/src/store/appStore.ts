import { create } from 'zustand'
import type { DadosDashboard, LoginResult, Pendencia, SessaoInfo, Usuario } from '@shared/types'
import { call, getToken, setToken } from '../lib/api'

export interface Toast {
  id: string
  tipo: 'sucesso' | 'erro' | 'info' | 'alerta'
  titulo: string
  mensagem?: string
}

export type Tema = 'light' | 'dark' | 'system'

interface AppState {
  sessao: SessaoInfo | null
  carregandoSessao: boolean
  toasts: Toast[]
  tema: Tema
  modalNovaPendencia: { aberto: boolean; presets?: Record<string, unknown> }
  pendenciaDestaque: Pendencia | null
  painelBusca: boolean
  painelNotificacoes: boolean
  dashboard: DadosDashboard | null
  dashboardLoading: boolean
  dataVersao: number

  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
  carregarSessao: () => Promise<void>
  definirSessao: (sessao: SessaoInfo) => void
  pushToast: (tipo: Toast['tipo'], titulo: string, mensagem?: string) => void
  dismissToast: (id: string) => void
  setTema: (tema: Tema) => void
  abrirNovaPendencia: (presets?: Record<string, unknown>) => void
  fecharNovaPendencia: () => void
  abrirPendencia: (p: Pendencia | null) => void
  setPainelBusca: (v: boolean) => void
  setPainelNotificacoes: (v: boolean) => void
  carregarDashboard: (forcar?: boolean, equipeId?: string) => Promise<void>
  atualizarPendenciaNoState: (p: Pendencia) => void
  notificarMudanca: () => void
}

function aplicarTema(tema: Tema): void {
  const root = document.documentElement
  const escuro = tema === 'dark' || (tema === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', escuro)
}

let toastSeq = 0

export const useAppStore = create<AppState>((set, get) => ({
  sessao: null,
  carregandoSessao: true,
  toasts: [],
  tema: (localStorage.getItem('pendencias.tema') as Tema) || 'light',
  modalNovaPendencia: { aberto: false },
  pendenciaDestaque: null,
  painelBusca: false,
  painelNotificacoes: false,
  dashboard: null,
  dashboardLoading: false,
  dataVersao: 0,

  login: async (email, senha) => {
    const resultado = await call<LoginResult>('auth', 'login', { email, senha }, { semToken: true })
    setToken(resultado.sessao.token)
    set({ sessao: resultado.sessao })
  },

  definirSessao: (sessao) => {
    setToken(sessao.token)
    set({ sessao })
  },

  logout: async () => {
    const token = getToken()
    if (token) {
      try {
        await call('auth', 'logout', {}, { token })
      } catch {
        // ignora
      }
    }
    setToken(null)
    set({ sessao: null, dashboard: null })
  },

  carregarSessao: async () => {
    const token = getToken()
    if (!token) {
      set({ carregandoSessao: false })
      return
    }
    try {
      const usuario = await call<Usuario>('auth', 'me', {}, { token })
      set((s) => ({ sessao: s.sessao ? { ...s.sessao, usuario } : null, carregandoSessao: false }))
    } catch {
      setToken(null)
      set({ sessao: null, carregandoSessao: false })
    }
  },

  pushToast: (tipo, titulo, mensagem) => {
    const id = `toast-${Date.now()}-${toastSeq++}`
    set((s) => ({ toasts: [...s.toasts, { id, tipo, titulo, mensagem }] }))
    setTimeout(() => get().dismissToast(id), 4500)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setTema: (tema) => {
    localStorage.setItem('pendencias.tema', tema)
    aplicarTema(tema)
    set({ tema })
  },

  abrirNovaPendencia: (presets) => set({ modalNovaPendencia: { aberto: true, presets } }),
  fecharNovaPendencia: () => set({ modalNovaPendencia: { aberto: false } }),
  abrirPendencia: (p) => set({ pendenciaDestaque: p }),
  setPainelBusca: (v) => set({ painelBusca: v }),
  setPainelNotificacoes: (v) => set({ painelNotificacoes: v }),

  carregarDashboard: async (forcar = false, equipeId?: string) => {
    if (get().dashboard && !forcar) return
    set({ dashboardLoading: true })
    try {
      const dados = await call<DadosDashboard>('dashboard', 'obter', equipeId ? { equipeId } : {})
      set({ dashboard: dados, dashboardLoading: false })
    } catch {
      set({ dashboardLoading: false })
    }
  },

  atualizarPendenciaNoState: (p) => {
    set((s) => ({
      pendenciaDestaque: s.pendenciaDestaque?.id === p.id ? p : s.pendenciaDestaque,
      dashboard: s.dashboard
        ? {
            ...s.dashboard,
            pendenciasHoje: s.dashboard.pendenciasHoje.map((x) => (x.id === p.id ? p : x)),
            atrasadas: s.dashboard.atrasadas.map((x) => (x.id === p.id ? p : x)),
            proximas: s.dashboard.proximas.map((x) => (x.id === p.id ? p : x))
          }
        : null
    }))
  },

  notificarMudanca: () => set((s) => ({ dataVersao: s.dataVersao + 1 }))
}))

aplicarTema(useAppStore.getState().tema)

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const tema = useAppStore.getState().tema
    if (tema === 'system') aplicarTema('system')
  })
}
