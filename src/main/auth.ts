import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import type { ApiContext, LoginResult, SessaoInfo, Usuario, Perfil } from '@shared/types'
import { getPrisma } from './db'
import { addDays, isAfter } from 'date-fns'

const SESSION_DAYS = 30
export class AppError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AppError'
    this.status = status
  }
}

export function hashPassword(senha: string): string {
  return bcrypt.hashSync(senha, 10)
}

export function verifyPassword(senha: string, hash: string): boolean {
  return bcrypt.compareSync(senha, hash)
}

export function validarRequisitosSenha(senha: string): string | null {
  if (!senha) return 'Informe uma nova senha'
  if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres'
  if (senha.length > 72) return 'A senha é muito longa (máximo 72 caracteres)'
  return null
}

export function gerarToken(): string {
  return randomUUID() + randomUUID().replace(/-/g, '')
}

function toUsuario(u: {
  id: string
  nome: string
  email: string
  perfil: string
  cargo: string | null
  telefone: string | null
  avatar: string | null
  ativo: boolean
  empresaId: string | null
  equipeId: string | null
  ultimoAcesso: Date | null
  criadoEm: Date
  atualizadoEm: Date
}): Usuario {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil as Perfil,
    cargo: u.cargo,
    telefone: u.telefone,
    avatar: u.avatar,
    ativo: u.ativo,
    empresaId: u.empresaId,
    equipeId: u.equipeId,
    ultimoAcesso: u.ultimoAcesso ? u.ultimoAcesso.toISOString() : null,
    criadoEm: u.criadoEm.toISOString(),
    atualizadoEm: u.atualizadoEm.toISOString()
  }
}

export async function criarSessao(usuarioId: string): Promise<SessaoInfo> {
  const db = getPrisma()
  const token = gerarToken()
  const expiraEm = addDays(new Date(), SESSION_DAYS)
  await db.sessao.create({ data: { usuarioId, token, expiraEm } })
  await db.usuario.update({ where: { id: usuarioId }, data: { ultimoAcesso: new Date() } })
  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    include: { empresa: true }
  })
  if (!usuario) throw new AppError('Usuário não encontrado', 404)
  return {
    token,
    expiraEm: expiraEm.toISOString(),
    usuario: toUsuario(usuario),
    empresa: usuario.empresa
      ? {
          id: usuario.empresa.id,
          nome: usuario.empresa.nome,
          cnpj: usuario.empresa.cnpj,
          logo: usuario.empresa.logo,
          email: usuario.empresa.email,
          telefone: usuario.empresa.telefone,
          config: usuario.empresa.config,
          ativo: usuario.empresa.ativo,
          criadoEm: usuario.empresa.criadoEm.toISOString(),
          atualizadoEm: usuario.empresa.atualizadoEm.toISOString()
        }
      : null
  }
}

export async function login(email: string, senha: string): Promise<LoginResult> {
  const db = getPrisma()
  const usuario = await db.usuario.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!usuario || !verifyPassword(senha, usuario.senhaHash)) {
    throw new AppError('E-mail ou senha inválidos', 401)
  }
  if (!usuario.ativo) throw new AppError('Usuário desativado. Contate o administrador.', 403)
  const sessao = await criarSessao(usuario.id)
  return { sessao }
}

export async function aceitarConvite(
  email: string,
  token: string,
  nome: string,
  senha: string
): Promise<LoginResult> {
  const db = getPrisma()
  const emailNorm = email.trim().toLowerCase()
  if (senha.length < 8) throw new AppError('A senha deve ter no mínimo 8 caracteres')
  const convite = await db.convite.findFirst({
    where: { email: emailNorm, token: token.trim().toUpperCase() }
  })
  if (!convite) throw new AppError('Convite não encontrado. Verifique o e-mail e o código.', 404)
  if (convite.usadoEm) throw new AppError('Este convite já foi utilizado')
  if (convite.canceladoEm) throw new AppError('Este convite foi cancelado')
  if (isAfter(new Date(), convite.expiraEm)) throw new AppError('Este convite expirou. Solicite um novo ao administrador.')
  const existente = await db.usuario.findUnique({ where: { email: emailNorm } })
  if (existente) throw new AppError('Já existe um usuário com este e-mail')

  const usuario = await db.usuario.create({
    data: {
      nome: nome.trim().slice(0, 120),
      email: emailNorm,
      senhaHash: hashPassword(senha),
      perfil: convite.perfil as Perfil,
      cargo: convite.cargo,
      telefone: convite.telefone,
      empresaId: convite.empresaId,
      equipeId: convite.equipeId || null,
      ativo: true
    }
  })
  await db.convite.update({ where: { id: convite.id }, data: { usadoEm: new Date() } })
  const sessao = await criarSessao(usuario.id)
  return { sessao }
}

export async function validarToken(token: string): Promise<ApiContext> {
  const db = getPrisma()
  if (!token) throw new AppError('Sessão ausente', 401)
  const sessao = await db.sessao.findUnique({ where: { token }, include: { usuario: true } })
  if (!sessao) throw new AppError('Sessão inválida', 401)
  if (isAfter(new Date(), sessao.expiraEm)) {
    await db.sessao.delete({ where: { id: sessao.id } })
    throw new AppError('Sessão expirada', 401)
  }
  if (!sessao.usuario.ativo) throw new AppError('Usuário desativado', 403)
  return {
    usuarioId: sessao.usuario.id,
    perfil: sessao.usuario.perfil as Perfil,
    empresaId: sessao.usuario.empresaId,
    equipeId: sessao.usuario.equipeId,
    isAdmin: sessao.usuario.perfil === 'ADMIN'
  }
}

export async function encerrarSessao(token: string): Promise<void> {
  const db = getPrisma()
  await db.sessao.deleteMany({ where: { token } })
}

export function requireRoles(ctx: ApiContext, perfis: Perfil[]): void {
  if (!perfis.includes(ctx.perfil)) {
    throw new AppError('Permissão negada para esta operação', 403)
  }
}

export function requireAdminOrGestor(ctx: ApiContext): void {
  requireRoles(ctx, ['ADMIN', 'GESTOR'])
}

// Perfis com visão global (todas as equipes/pendências): ADMIN e GESTOR.
export function temAcessoGlobal(ctx: ApiContext): boolean {
  return ctx.isAdmin || ctx.perfil === 'GESTOR'
}

// Valida se o usuário pode acessar uma pendência da equipe informada.
// Para usuários comuns (USUARIO/LÍDER), o acesso é restrito à própria equipe.
export function validarAcessoEquipe(ctx: ApiContext, equipeId: string | null): boolean {
  if (temAcessoGlobal(ctx)) return true
  return ctx.equipeId !== null && equipeId !== null && ctx.equipeId === equipeId
}

// Lança "não encontrada" para não revelar a existência de registros de outras equipes.
export function exigirAcessoEquipe(ctx: ApiContext, equipeId: string | null): void {
  if (!validarAcessoEquipe(ctx, equipeId)) {
    throw new AppError('Pendência não encontrada', 404)
  }
}

export async function obterUsuarioPorId(id: string): Promise<Usuario | null> {
  const db = getPrisma()
  const u = await db.usuario.findUnique({ where: { id } })
  return u ? toUsuario(u) : null
}
