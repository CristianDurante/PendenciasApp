import { useEffect, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import { useCatalogoStore } from './store/catalogoStore'
import { ToastViewport } from './components/ui'
import { PendenciaModal } from './components/pendencia/PendenciaModal'
import { PendenciaDetail } from './components/pendencia/PendenciaDetail'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { CommandPalette } from './components/layout/CommandPalette'
import { NotificationsPanel } from './components/layout/NotificationsPanel'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { PendenciasPage } from './pages/PendenciasPage'
import { KanbanPage } from './pages/KanbanPage'
import { CalendarioPage } from './pages/CalendarioPage'
import { ClientesPage } from './pages/ClientesPage'
import { ClienteDetailPage } from './pages/ClienteDetailPage'
import { ProjetosPage } from './pages/ProjetosPage'
import { ProjetoDetailPage } from './pages/ProjetoDetailPage'
import { CompromissosPage } from './pages/CompromissosPage'
import { RetornosPage } from './pages/RetornosPage'
import { AnotacoesPage } from './pages/AnotacoesPage'
import { MeuDiaPage } from './pages/MeuDiaPage'
import { MinhasAtividadesPage } from './pages/MinhasAtividadesPage'
import { RelatoriosPage } from './pages/RelatoriosPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'

function useAtalhosGlobais(): void {
  const abrirNovaPendencia = useAppStore((s) => s.abrirNovaPendencia)
  const setPainelBusca = useAppStore((s) => s.setPainelBusca)
  const modalAberto = useAppStore((s) => s.modalNovaPendencia.aberto)
  const fecharNovaPendencia = useAppStore((s) => s.fecharNovaPendencia)
  const painelBusca = useAppStore((s) => s.painelBusca)

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      const alvo = e.target as HTMLElement | null
      const emCampo = !!alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        abrirNovaPendencia()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPainelBusca(true)
        return
      }
      if (e.key === 'Escape') {
        if (painelBusca) {
          setPainelBusca(false)
          return
        }
        if (modalAberto && !emCampo) {
          fecharNovaPendencia()
          return
        }
        if (modalAberto) fecharNovaPendencia()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = alvo?.closest('form')
        if (form) {
          e.preventDefault()
          const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')
          btn?.click()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abrirNovaPendencia, setPainelBusca, modalAberto, fecharNovaPendencia, painelBusca])
}

function Shell(): ReactNode {
  useAtalhosGlobais()
  const sessao = useAppStore((s) => s.sessao)
  const carregarSessao = useAppStore((s) => s.carregarSessao)
  const carregandoSessao = useAppStore((s) => s.carregandoSessao)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const carregarNotificacoes = useCatalogoStore((s) => s.carregarNotificacoes)
  const location = useLocation()

  useEffect(() => {
    void carregarSessao()
  }, [carregarSessao])

  useEffect(() => {
    if (sessao) {
      void carregarCatalogo()
      void carregarNotificacoes()
    }
  }, [sessao, carregarCatalogo, carregarNotificacoes])

  if (carregandoSessao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-400">Carregando Pendify…</p>
      </div>
    )
  }

  if (!sessao) {
    return (
      <>
        <LoginPage />
        <ToastViewport />
      </>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar rota={location.pathname} />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/meu-dia" element={<MeuDiaPage />} />
            <Route path="/minhas-atividades" element={<MinhasAtividadesPage />} />
            <Route path="/pendencias" element={<PendenciasPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/calendario" element={<CalendarioPage />} />
            <Route path="/compromissos" element={<CompromissosPage />} />
            <Route path="/retornos" element={<RetornosPage />} />
            <Route path="/anotacoes" element={<AnotacoesPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/:id" element={<ClienteDetailPage />} />
            <Route path="/projetos" element={<ProjetosPage />} />
            <Route path="/projetos/:id" element={<ProjetoDetailPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/historico" element={<HistoricoPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <CommandPalette />
      <NotificationsPanel />
      <PendenciaModal />
      <PendenciaDetail />
      <ToastViewport />
    </div>
  )
}

export default function App(): ReactNode {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
