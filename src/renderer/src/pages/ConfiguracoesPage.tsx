import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  User,
  Building2,
  Users,
  Tags as TagsIcon,
  FolderOpen,
  Database,
  Moon,
  Bell,
  Plus,
  Pencil,
  Trash2,
  Archive,
  RefreshCw,
  LogOut,
  Lock
} from 'lucide-react'
import type { Usuario, Categoria, Tag, Empresa, ConfigApp, BackupInfo } from '@shared/types'
import { PERFIS, PERFIL_LABEL } from '@shared/constants'
import { useAppStore } from '../store/appStore'
import { useCatalogoStore } from '../store/catalogoStore'
import { call } from '../lib/api'
import { cn, formatarDataHora, formatarTamanho, hexContraste } from '../lib/format'
import { Button, Input, Textarea, Select, Switch, Modal, ConfirmDialog, Avatar, PerfilBadge, EmptyState, Loading } from '../components/ui'

type Aba = 'perfil' | 'empresa' | 'usuarios' | 'categorias' | 'tags' | 'notificacoes' | 'backup' | 'aparencia'

const NOTIF_PADRAO: NonNullable<ConfigApp['notificacoes']> = {
  desktop: true,
  prazos: true,
  comentarios: true,
  compromissos: true,
  retornos: true,
  alteracoes: true
}

const ABAS: Array<{ id: Aba; rotulo: string; icone: ReactNode }> = [
  { id: 'perfil', rotulo: 'Perfil', icone: <User className="h-4 w-4" /> },
  { id: 'empresa', rotulo: 'Empresa', icone: <Building2 className="h-4 w-4" /> },
  { id: 'usuarios', rotulo: 'Usuários', icone: <Users className="h-4 w-4" /> },
  { id: 'categorias', rotulo: 'Categorias', icone: <FolderOpen className="h-4 w-4" /> },
  { id: 'tags', rotulo: 'Tags', icone: <TagsIcon className="h-4 w-4" /> },
  { id: 'notificacoes', rotulo: 'Notificações', icone: <Bell className="h-4 w-4" /> },
  { id: 'backup', rotulo: 'Backup', icone: <Database className="h-4 w-4" /> },
  { id: 'aparencia', rotulo: 'Aparência', icone: <Moon className="h-4 w-4" /> }
]

export function ConfiguracoesPage(): ReactNode {
  const sessao = useAppStore((s) => s.sessao)
  const [aba, setAba] = useState<Aba>('perfil')
  const ehAdmin = sessao?.usuario.perfil === 'ADMIN'
  const ehGestor = sessao?.usuario.perfil === 'GESTOR'

  const abasVisiveis = ABAS.filter((a) => {
    if (a.id === 'usuarios' || a.id === 'categorias' || a.id === 'tags' || a.id === 'notificacoes' || a.id === 'backup') {
      return ehAdmin || ehGestor
    }
    return true
  })

  return (
    <div className="flex h-full">
      <nav className="w-52 shrink-0 space-y-0.5 overflow-y-auto border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        {abasVisiveis.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
              aba === a.id
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            {a.icone} {a.rotulo}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        {aba === 'perfil' && <PerfilSection />}
        {aba === 'empresa' && <EmpresaSection />}
        {aba === 'usuarios' && <UsuariosSection />}
        {aba === 'categorias' && <CategoriasSection />}
        {aba === 'tags' && <TagsSection />}
        {aba === 'notificacoes' && <NotificacoesSection />}
        {aba === 'backup' && <BackupSection />}
        {aba === 'aparencia' && <AparenciaSection />}
      </div>
    </div>
  )
}

function usePerfil() {
  const logout = useAppStore((s) => s.logout)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const pushToast = useAppStore((s) => s.pushToast)
  const sessao = useAppStore((s) => s.sessao)

  useEffect(() => {
    if (sessao) {
      setNome(sessao.usuario.nome)
      setEmail(sessao.usuario.email)
      setCargo(sessao.usuario.cargo || '')
      setTelefone(sessao.usuario.telefone || '')
    }
  }, [sessao])

  async function salvarPerfil(): Promise<void> {
    setSalvando(true)
    setMsg('')
    try {
      await call('usuario', 'atualizar', { id: sessao?.usuario.id, nome, email, cargo: cargo || null, telefone: telefone || null })
      pushToast('sucesso', 'Perfil atualizado')
    } catch (e) {
      pushToast('erro', 'Falha ao salvar', e instanceof Error ? e.message : undefined)
    } finally {
      setSalvando(false)
    }
  }

  async function alterarSenha(): Promise<void> {
    if (senhaNova.length < 6) {
      setMsg('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    setSalvando(true)
    setMsg('')
    try {
      await call('auth', 'alterarSenha', { senhaAtual, senhaNova })
      setSenhaAtual('')
      setSenhaNova('')
      pushToast('sucesso', 'Senha alterada')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao alterar senha.')
    } finally {
      setSalvando(false)
    }
  }

  return { nome, setNome, email, setEmail, cargo, setCargo, telefone, setTelefone, senhaAtual, setSenhaAtual, senhaNova, setSenhaNova, salvando, msg, salvarPerfil, alterarSenha, logout }
}

function PerfilSection(): ReactNode {
  const p = usePerfil()
  const sessao = useAppStore((s) => s.sessao)
  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Avatar nome={sessao?.usuario.nome} tamanho={56} />
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{sessao?.usuario.nome}</h2>
          <PerfilBadge perfil={sessao?.usuario.perfil || 'USUARIO'} />
        </div>
      </div>
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Dados pessoais</h3>
        <div>
          <label className="label">Nome</label>
          <Input value={p.nome} onChange={(e) => p.setNome(e.target.value)} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <Input value={p.email} onChange={(e) => p.setEmail(e.target.value)} type="email" />
        </div>
        <div>
          <label className="label">Cargo</label>
          <Input value={p.cargo} onChange={(e) => p.setCargo(e.target.value)} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <Input value={p.telefone} onChange={(e) => p.setTelefone(e.target.value)} />
        </div>
        <Button onClick={() => void p.salvarPerfil()} carregando={p.salvando}>Salvar perfil</Button>
      </div>
      <div className="card space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <Lock className="h-4 w-4 text-slate-400" /> Alterar senha
        </h3>
        <div>
          <label className="label">Senha atual</label>
          <Input type="password" value={p.senhaAtual} onChange={(e) => p.setSenhaAtual(e.target.value)} />
        </div>
        <div>
          <label className="label">Nova senha</label>
          <Input type="password" value={p.senhaNova} onChange={(e) => p.setSenhaNova(e.target.value)} />
        </div>
        {p.msg && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{p.msg}</div>}
        <Button onClick={() => void p.alterarSenha()} carregando={p.salvando}>Alterar senha</Button>
      </div>
      <Button variant="danger" onClick={() => void p.logout()}>
        <LogOut className="h-4 w-4" /> Sair da conta
      </Button>
    </div>
  )
}

function EmpresaSection(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [form, setForm] = useState({ nome: '', cnpj: '', email: '', telefone: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    void call<Empresa | null>('empresa', 'obter', {}).then((e) => {
      setEmpresa(e)
      if (e) setForm({ nome: e.nome, cnpj: e.cnpj || '', email: e.email || '', telefone: e.telefone || '' })
    })
  }, [])

  async function salvar(): Promise<void> {
    if (!empresa) return
    setSalvando(true)
    try {
      await call('empresa', 'atualizar', { id: empresa.id, ...form })
      pushToast('sucesso', 'Empresa atualizada')
    } catch (e) {
      pushToast('erro', 'Falha ao salvar', e instanceof Error ? e.message : undefined)
    } finally {
      setSalvando(false)
    }
  }

  if (!empresa) {
    return <EmptyState titulo="Nenhuma empresa configurada" descricao="Contate o administrador." />
  }

  return (
    <div className="max-w-xl space-y-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Empresa</h2>
      <div className="card space-y-3">
        <div>
          <label className="label">Nome da empresa *</label>
          <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <Input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
        </div>
        <Button onClick={() => void salvar()} carregando={salvando}>Salvar empresa</Button>
      </div>
    </div>
  )
}

function UsuariosSection(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const usuarios = useCatalogoStore((s) => s.usuarios)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const sessao = useAppStore((s) => s.sessao)

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [excluindo, setExcluindo] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'USUARIO', cargo: '', telefone: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    void carregarCatalogo(true)
  }, [carregarCatalogo])

  function abrirModal(u: Usuario | null): void {
    setEditando(u)
    setForm(u ? { nome: u.nome, email: u.email, senha: '', perfil: u.perfil, cargo: u.cargo || '', telefone: u.telefone || '' } : { nome: '', email: '', senha: '', perfil: 'USUARIO', cargo: '', telefone: '' })
    setModalAberto(true)
  }

  async function salvar(): Promise<void> {
    setSalvando(true)
    try {
      if (editando) {
        const payload: Record<string, unknown> = { nome: form.nome, email: form.email, perfil: form.perfil, cargo: form.cargo || null, telefone: form.telefone || null }
        if (form.senha) payload.senha = form.senha
        await call('usuario', 'atualizar', { id: editando.id, ...payload })
        pushToast('sucesso', 'Usuário atualizado')
      } else {
        await call('usuario', 'criar', { ...form, senha: form.senha || '123456' })
        pushToast('sucesso', 'Usuário criado')
      }
      setModalAberto(false)
      await carregarCatalogo(true)
    } catch (e) {
      pushToast('erro', 'Falha ao salvar usuário', e instanceof Error ? e.message : undefined)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(): Promise<void> {
    if (!excluindo) return
    try {
      await call('usuario', 'excluir', { id: excluindo.id })
      pushToast('sucesso', 'Usuário desativado')
      setExcluindo(null)
      await carregarCatalogo(true)
    } catch (e) {
      pushToast('erro', 'Falha ao excluir', e instanceof Error ? e.message : undefined)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Usuários</h2>
        <Button onClick={() => abrirModal(null)}><Plus className="h-4 w-4" /> Novo usuário</Button>
      </div>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {usuarios.length === 0 ? <EmptyState titulo="Nenhum usuário" /> : usuarios.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar nome={u.nome} tamanho={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{u.nome}</p>
              <p className="truncate text-xs text-slate-400">{u.email} {u.cargo ? ` · ${u.cargo}` : ''}</p>
            </div>
            <PerfilBadge perfil={u.perfil} />
            {!u.ativo && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800">Inativo</span>}
            {u.id === sessao?.usuario.id ? (
              <span className="text-xs text-slate-400">você</span>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => abrirModal(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setExcluindo(u)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? 'Editar usuário' : 'Novo usuário'} largura="max-w-lg">
        <div className="space-y-3">
          <div>
            <label className="label">Nome *</label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">E-mail *</label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" />
          </div>
          <div>
            <label className="label">{editando ? 'Nova senha (opcional)' : 'Senha'}</label>
            <Input value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} type="password" placeholder={editando ? 'Deixe vazio para manter' : 'Mínimo 6 caracteres'} />
          </div>
          <div>
            <label className="label">Perfil</label>
            <Select value={form.perfil} onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}>
              {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
            </Select>
          </div>
          <div>
            <label className="label">Cargo</label>
            <Input value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
          <Button onClick={() => void salvar()} carregando={salvando}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={!!excluindo}
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={() => void excluir()}
        titulo="Desativar usuário"
        mensagem={`Desativar o acesso de "${excluindo?.nome || ''}"?`}
        confirmarTexto="Desativar"
        perigo
      />
    </div>
  )
}

function CategoriasSection(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const categorias = useCatalogoStore((s) => s.categorias)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const [form, setForm] = useState({ nome: '', cor: '#64748b' })
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)

  function abrir(c: Categoria | null): void {
    setEditando(c)
    setForm(c ? { nome: c.nome, cor: c.cor } : { nome: '', cor: '#64748b' })
    setModalAberto(true)
  }

  async function salvar(): Promise<void> {
    try {
      if (editando) {
        await call('categoria', 'atualizar', { id: editando.id, ...form })
        pushToast('sucesso', 'Categoria atualizada')
      } else {
        await call('categoria', 'criar', form)
        pushToast('sucesso', 'Categoria criada')
      }
      setModalAberto(false)
      await carregarCatalogo(true)
    } catch (e) {
      pushToast('erro', 'Falha ao salvar', e instanceof Error ? e.message : undefined)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Categorias</h2>
        <Button onClick={() => abrir(null)}><Plus className="h-4 w-4" /> Nova categoria</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categorias.map((c) => (
          <div key={c.id} className="card flex items-center gap-2 !p-2.5">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: c.cor }} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.nome}</span>
            <span className="text-xs text-slate-400">({c.quantidade ?? 0})</span>
            {!c.padrao && (
              <>
                <Button variant="ghost" size="sm" onClick={() => abrir(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => { void call('categoria', 'excluir', { id: c.id }).then(() => { pushToast('sucesso', 'Categoria excluída'); void carregarCatalogo(true) }).catch((e) => pushToast('erro', 'Falha ao excluir', e instanceof Error ? e.message : undefined)) }}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
              </>
            )}
          </div>
        ))}
      </div>

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? 'Editar categoria' : 'Nova categoria'} largura="max-w-md">
        <div className="space-y-3">
          <div>
            <label className="label">Nome *</label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.cor} onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))} className="h-9 w-12 cursor-pointer rounded border border-slate-200 dark:border-slate-700" />
              <Input value={form.cor} onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))} className="flex-1" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
          <Button onClick={() => void salvar()}>Salvar</Button>
        </div>
      </Modal>
    </div>
  )
}

function TagsSection(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const tags = useCatalogoStore((s) => s.tags)
  const carregarCatalogo = useCatalogoStore((s) => s.carregarCatalogo)
  const [form, setForm] = useState({ nome: '', cor: '#3b82f6', descricao: '' })
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Tag | null>(null)

  function abrir(t: Tag | null): void {
    setEditando(t)
    setForm(t ? { nome: t.nome, cor: t.cor, descricao: t.descricao || '' } : { nome: '', cor: '#3b82f6', descricao: '' })
    setModalAberto(true)
  }

  async function salvar(): Promise<void> {
    try {
      if (editando) {
        await call('tag', 'atualizar', { id: editando.id, ...form })
        pushToast('sucesso', 'Tag atualizada')
      } else {
        await call('tag', 'criar', form)
        pushToast('sucesso', 'Tag criada')
      }
      setModalAberto(false)
      await carregarCatalogo(true)
    } catch (e) {
      pushToast('erro', 'Falha ao salvar', e instanceof Error ? e.message : undefined)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tags</h2>
        <Button onClick={() => abrir(null)}><Plus className="h-4 w-4" /> Nova tag</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <div key={t.id} className="card flex items-center gap-2 !p-2.5">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: t.cor }} />
            <span className="text-sm font-medium" style={{ color: t.cor }}>{t.nome}</span>
            <span className="text-xs text-slate-400">({t.quantidade ?? 0})</span>
            <Button variant="ghost" size="sm" onClick={() => abrir(t)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { void call('tag', 'excluir', { id: t.id }).then(() => { pushToast('sucesso', 'Tag excluída'); void carregarCatalogo(true) }).catch((e) => pushToast('erro', 'Falha ao excluir', e instanceof Error ? e.message : undefined)) }}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
          </div>
        ))}
      </div>

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? 'Editar tag' : 'Nova tag'} largura="max-w-md">
        <div className="space-y-3">
          <div>
            <label className="label">Nome *</label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.cor} onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))} className="h-9 w-12 cursor-pointer rounded border border-slate-200 dark:border-slate-700" />
              <Input value={form.cor} onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))} className="flex-1" />
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
          <Button onClick={() => void salvar()}>Salvar</Button>
        </div>
      </Modal>
    </div>
  )
}

function NotificacoesSection(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const [config, setConfig] = useState<ConfigApp>({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    void call<ConfigApp>('empresa', 'config', {}).then(setConfig)
  }, [])

  async function salvar(): Promise<void> {
    setSalvando(true)
    try {
      await call('empresa', 'salvarConfig', { config })
      pushToast('sucesso', 'Preferências de notificação salvas')
    } catch (e) {
      pushToast('erro', 'Falha ao salvar', e instanceof Error ? e.message : undefined)
    } finally {
      setSalvando(false)
    }
  }

  const n = config.notificacoes || NOTIF_PADRAO
  const l: NonNullable<ConfigApp['lembretes']> = config.lembretes || { padraoMinutos: null }

  const toggles = [
    { chave: 'desktop', rotulo: 'Notificações do sistema (desktop)' },
    { chave: 'prazos', rotulo: 'Alertas de prazos e pendências atrasadas' },
    { chave: 'comentarios', rotulo: 'Novos comentários' },
    { chave: 'compromissos', rotulo: 'Compromissos' },
    { chave: 'retornos', rotulo: 'Retornos pendentes' },
    { chave: 'alteracoes', rotulo: 'Alterações em pendências' }
  ] as const

  return (
    <div className="max-w-xl space-y-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notificações e lembretes</h2>
      <div className="card space-y-3">
        {toggles.map((t) => (
          <div key={t.chave} className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-300">{t.rotulo}</span>
            <Switch
              marcado={n[t.chave] ?? true}
              aoMudar={(v) => setConfig((c) => ({ ...c, notificacoes: { ...(c.notificacoes || NOTIF_PADRAO), [t.chave]: v } }))}
            />
          </div>
        ))}
        <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
          <label className="label">Lembrete padrão antes de compromissos</label>
          <Select
            value={String(l.padraoMinutos ?? '')}
            onChange={(e) => setConfig((c) => ({ ...c, lembretes: { ...(c.lembretes || {}), padraoMinutos: e.target.value ? Number(e.target.value) : null } }))}
          >
            <option value="">Sem padrão</option>
            <option value="15">15 minutos</option>
            <option value="30">30 minutos</option>
            <option value="60">1 hora</option>
            <option value="120">2 horas</option>
            <option value="1440">1 dia</option>
          </Select>
        </div>
        <Button onClick={() => void salvar()} carregando={salvando}>Salvar preferências</Button>
      </div>
    </div>
  )
}

function BackupSection(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const [info, setInfo] = useState<BackupInfo | null>(null)
  const [backups, setBackups] = useState<Array<{ nome: string; caminho: string; tamanho: number }>>([])
  const [executando, setExecutando] = useState(false)
  const [restaurando, setRestaurando] = useState<string | null>(null)
  const [config, setConfig] = useState<ConfigApp>({})
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async (): Promise<void> => {
    const [i, b, c] = await Promise.all([
      call<BackupInfo>('backup', 'info', {}).catch(() => null),
      call<Array<{ nome: string; caminho: string; tamanho: number }>>('backup', 'listar', {}).catch(() => []),
      call<ConfigApp>('empresa', 'config', {}).catch(() => ({}))
    ])
    setInfo(i)
    setBackups(b)
    setConfig(c)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function executar(): Promise<void> {
    setExecutando(true)
    try {
      await call('backup', 'executar', {})
      pushToast('sucesso', 'Backup executado')
      await carregar()
    } catch (e) {
      pushToast('erro', 'Falha no backup', e instanceof Error ? e.message : undefined)
    } finally {
      setExecutando(false)
    }
  }

  async function restaurar(caminho: string): Promise<void> {
    setRestaurando(caminho)
    try {
      const r = await call<{ ok: boolean; mensagem: string }>('backup', 'restaurar', { caminho })
      pushToast('sucesso', 'Backup restaurado', r.mensagem)
      await carregar()
    } catch (e) {
      pushToast('erro', 'Falha na restauração', e instanceof Error ? e.message : undefined)
    } finally {
      setRestaurando(null)
    }
  }

  async function salvarConfig(): Promise<void> {
    setSalvando(true)
    try {
      await call('empresa', 'salvarConfig', { config })
      pushToast('sucesso', 'Configuração de backup salva')
      await carregar()
    } catch (e) {
      pushToast('erro', 'Falha ao salvar', e instanceof Error ? e.message : undefined)
    } finally {
      setSalvando(false)
    }
  }

  const b: NonNullable<ConfigApp['backup']> = config.backup || { automatico: false, intervaloHoras: 24, local: null }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Backup e restauração</h2>
        <Button onClick={() => void executar()} carregando={executando}>
          <Archive className="h-4 w-4" /> Executar backup agora
        </Button>
      </div>

      <div className="card grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-slate-400">Último backup</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{info?.ultimoBackup ? formatarDataHora(info.ultimoBackup) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Próximo automático</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{info?.proximoBackup ? formatarDataHora(info.proximoBackup) : 'Desativado'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Tamanho total</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatarTamanho(info?.tamanho || 0)}</p>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Backup automático</h3>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-700 dark:text-slate-300">Ativar backup automático</span>
          <Switch marcado={!!b.automatico} aoMudar={(v) => setConfig((c) => ({ ...c, backup: { ...(c.backup || { automatico: false, intervaloHoras: 24, local: null }), automatico: v } }))} />
        </div>
        {b.automatico && (
          <div>
            <label className="label">Intervalo (horas)</label>
            <Select
              value={String(b.intervaloHoras ?? 24)}
              onChange={(e) => setConfig((c) => ({ ...c, backup: { ...(c.backup || { automatico: false, intervaloHoras: 24, local: null }), intervaloHoras: Number(e.target.value) } }))}
            >
              <option value="6">A cada 6 horas</option>
              <option value="12">A cada 12 horas</option>
              <option value="24">A cada 24 horas</option>
              <option value="48">A cada 48 horas</option>
              <option value="168">Semanal</option>
            </Select>
          </div>
        )}
        <Button variant="secondary" onClick={() => void salvarConfig()} carregando={salvando}>Salvar configuração de backup</Button>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Backups disponíveis ({backups.length})</h3>
        {backups.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum backup encontrado.</p>
        ) : (
          <div className="space-y-2">
            {backups.map((bk) => (
              <div key={bk.nome} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                <Archive className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{bk.nome}</p>
                  <p className="text-xs text-slate-400">{formatarTamanho(bk.tamanho)}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { if (confirm(`Restaurar o backup "${bk.nome}"? O banco de dados atual será substituído.`)) void restaurar(bk.caminho) }}
                  carregando={restaurando === bk.caminho}
                >
                  Restaurar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AparenciaSection(): ReactNode {
  const tema = useAppStore((s) => s.tema)
  const setTema = useAppStore((s) => s.setTema)
  return (
    <div className="max-w-xl space-y-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aparência</h2>
      <div className="card space-y-2">
        {([
          { valor: 'light', rotulo: 'Claro' },
          { valor: 'dark', rotulo: 'Escuro' },
          { valor: 'system', rotulo: 'Sistema' }
        ] as const).map((t) => (
          <button
            key={t.valor}
            onClick={() => setTema(t.valor)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition',
              tema === t.valor
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <span className="flex items-center gap-2"><Moon className="h-4 w-4" /> {t.rotulo}</span>
            {tema === t.valor && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
          </button>
        ))}
        <p className="pt-2 text-xs text-slate-400">A preferência é salva localmente neste dispositivo.</p>
      </div>
    </div>
  )
}
