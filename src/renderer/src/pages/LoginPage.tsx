import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, ListTodo, Lock, Mail } from 'lucide-react'
import { useAppStore } from '../store/appStore'

export function LoginPage(): ReactNode {
  const login = useAppStore((s) => s.login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.')
      return
    }
    setCarregando(true)
    setErro('')
    try {
      await login(email.trim(), senha)
      navigate('/')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao entrar.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white shadow-lg shadow-brand-600/30">
            P
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pendify</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Controle profissional de pendências, compromissos e retornos.
          </p>
        </div>

        <form onSubmit={(e) => void entrar(e)} className="card !p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <ListTodo className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            Entrar na sua conta
          </div>

          <label className="label">E-mail</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              autoFocus
              className="input !pl-9"
            />
          </div>

          <label className="label mt-4">Senha</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="input !pl-9 !pr-9"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {erro && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {erro}
            </div>
          )}

          <button type="submit" disabled={carregando} className="btn-primary mt-5 w-full">
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>
              Acesso inicial: <b>admin@pendify.local</b> / senha <b>admin</b>. Altere depois em Configurações.
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}
