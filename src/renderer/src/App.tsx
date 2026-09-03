import { lazy, Suspense, useEffect, type ReactNode } from 'react'
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
import { PageSkeleton } from './components/ui'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })))
const PendenciasPage = lazy(() => import('./pages/PendenciasPage').then(({ PendenciasPage }) => ({ default: PendenciasPage })))
const KanbanPage = lazy(() => import('./pages/KanbanPage').then(({ KanbanPage }) => ({ default: KanbanPage })))
const CalendarioPage = lazy(() => import('./pages/CalendarioPage').then(({ CalendarioPage }) => ({ default: CalendarioPage })))
const ClientesPage = lazy(() => import('./pages/ClientesPage').then(({ ClientesPage }) => ({ default: ClientesPage })))
const ClienteDetailPage = lazy(() => import('./pages/ClienteDetailPage').then(({ ClienteDetailPage }) => ({ default: ClienteDetailPage })))
const ProjetosPage = lazy(() => import('./pages/ProjetosPage').then(({ ProjetosPage }) => ({ default: ProjetosPage })))
const ProjetoDetailPage = lazy(() => import('./pages/ProjetoDetailPage').then(({ ProjetoDetailPage }) => ({ default: ProjetoDetailPage })))
const CompromissosPage = lazy(() => import('./pages/CompromissosPage').then(({ CompromissosPage }) => ({ default: CompromissosPage })))
const RetornosPage = lazy(() => import('./pages/RetornosPage').then(({ RetornosPage }) => ({ default: RetornosPage })))
const AnotacoesPage = lazy(() => import('./pages/AnotacoesPage').then(({ AnotacoesPage }) => ({ default: AnotacoesPage })))
const MinhasAtividadesPage = lazy(() => import('./pages/MinhasAtividadesPage').then(({ MinhasAtividadesPage }) => ({ default: MinhasAtividadesPage })))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage').then(({ RelatoriosPage }) => ({ default: RelatoriosPage })))
const HistoricoPage = lazy(() => import('./pages/HistoricoPage').then(({ HistoricoPage }) => ({ default: HistoricoPage })))
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage').then(({ ConfiguracoesPage }) => ({ default: ConfiguracoesPage })))

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
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <p className="text-sm text-slate-400">Carregando Pendencias…</p>
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
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar rota={location.pathname} />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={<PageSkeleton />}>
            <div key={location.pathname} className="h-full motion-safe:animate-page-enter">
              <Routes>
            <Route path="/" element={<DashboardPage />} />
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
            </div>
          </Suspense>
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
