import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ListTodo, Lock, Mail, TicketCheck, User, KeyRound } from 'lucide-react'
import type { LoginResult } from '@shared/types'
import { useAppStore } from '../store/appStore'
import { call } from '../lib/api'
import { cn } from '../lib/format'

type Modo = 'entrar' | 'convite'

export function LoginPage(): ReactNode {
  const login = useAppStore((s) => s.login)
  const navigate = useNavigate()
  const [modo, setModo] = useState<Modo>('entrar')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')

  async function entrar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.')
      return
    }
    setCarregando(true)
    setErro('')
    setInfo('')
    try {
      await login(email.trim(), senha)
      navigate('/')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao entrar.')
    } finally {
      setCarregando(false)
    }
  }

  async function aceitarConvite(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!email.trim() || !codigo.trim() || !nome.trim() || !novaSenha) {
      setErro('Preencha e-mail, código do convite, nome e senha.')
      return
    }
    if (novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não conferem.')
      return
    }
    setCarregando(true)
    setErro('')
    setInfo('')
    try {
      const resultado = await call<LoginResult>('auth', 'aceitarConvite', {
        email: email.trim(),
        codigo: codigo.trim(),
        nome: nome.trim(),
        senha: novaSenha
      }, { semToken: true })
      useAppStore.getState().definirSessao(resultado.sessao)
      navigate('/')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao aceitar convite.')
    } finally {
      setCarregando(false)
    }
  }

  function trocarModo(m: Modo): void {
    setModo(m)
    setErro('')
    setInfo('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white shadow-lg shadow-brand-600/30">
            P
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pendencias App</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Controle profissional de pendências, compromissos e retornos.
          </p>
        </div>

        <div className="card !p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => trocarModo('entrar')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                modo === 'entrar' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <Lock className="h-4 w-4" /> Entrar
            </button>
            <button
              type="button"
              onClick={() => trocarModo('convite')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                modo === 'convite' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <TicketCheck className="h-4 w-4" /> Tenho convite
            </button>
          </div>

          {modo === 'entrar' ? (
            <form onSubmit={(e) => void entrar(e)}>
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
              {info && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  {info}
                </div>
              )}

              <button type="submit" disabled={carregando} className="btn-primary mt-5 w-full">
                {carregando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void aceitarConvite(e)}>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <TicketCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                Criar acesso com convite
              </div>

              <label className="label">E-mail do convite</label>
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

              <label className="label mt-4">Código do convite</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  className="input !pl-9 !uppercase"
                />
              </div>

              <label className="label mt-4">Seu nome</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="input !pl-9"
                />
              </div>

              <label className="label mt-4">Crie uma senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="input"
              />

              <label className="label mt-4">Confirmar senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                className="input"
              />

              {erro && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {erro}
                </div>
              )}

              <button type="submit" disabled={carregando} className="btn-primary mt-5 w-full">
                {carregando ? 'Criando acesso…' : 'Criar acesso e entrar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
