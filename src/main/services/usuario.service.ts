import { z } from 'zod'
import { getPrisma } from '../db'
import { AppError, hashPassword, requireAdminOrGestor, requireRoles, obterUsuarioPorId } from '../auth'
import type { ApiContext, Perfil } from '@shared/types'
import { PERFIS } from '@shared/constants'
import { deepIso } from '../helpers'
import { registrarHistorico } from './historico.service'
import { addDays } from 'date-fns'

const UsuarioCreateSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório').max(120),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  perfil: z.enum(PERFIS as [Perfil, ...Perfil[]]).default('USUARIO'),
  cargo: z.string().max(80).optional().nullable(),
  telefone: z.string().max(30).optional().nullable()
})

const ConviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  nome: z.string().min(2, 'Nome é obrigatório').max(120),
  perfil: z.enum(PERFIS as [Perfil, ...Perfil[]]).default('USUARIO'),
  cargo: z.string().max(80).optional().nullable(),
  telefone: z.string().max(30).optional().nullable()
})

const UsuarioUpdateSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  perfil: z.enum(PERFIS as [Perfil, ...Perfil[]]).optional(),
  cargo: z.string().max(80).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  senha: z.string().min(6).optional(),
  ativo: z.boolean().optional()
})

const select = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  cargo: true,
  telefone: true,
  avatar: true,
  ativo: true,
  empresaId: true,
  ultimoAcesso: true,
  criadoEm: true,
  atualizadoEm: true
} as const

export async function listarUsuarios(ctx: ApiContext): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const db = getPrisma()
  const itens = await db.usuario.findMany({ select, orderBy: { nome: 'asc' } })
  return deepIso(itens)
}

export async function obterUsuario(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || ctx.usuarioId)
  if (id !== ctx.usuarioId) requireAdminOrGestor(ctx)
  const u = await obterUsuarioPorId(id)
  if (!u) throw new AppError('Usuário não encontrado', 404)
  return u
}

export async function criarUsuario(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const parsed = UsuarioCreateSchema.parse(args)
  const db = getPrisma()
  const email = parsed.email.trim().toLowerCase()
  const existe = await db.usuario.findUnique({ where: { email } })
  if (existe) throw new AppError('Já existe um usuário com este e-mail')
  const u = await db.usuario.create({
    data: {
      nome: parsed.nome,
      email,
      senhaHash: hashPassword(parsed.senha),
      perfil: parsed.perfil,
      cargo: parsed.cargo || null,
      telefone: parsed.telefone || null,
      empresaId: ctx.empresaId
    },
    select
  })
  await registrarHistorico({
    entidade: 'usuario',
    entidadeId: u.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Usuário "${u.nome}" criado com perfil ${u.perfil}`
  })
  return deepIso(u)
}

export async function atualizarUsuario(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do usuário é obrigatório')
  const ehProprio = id === ctx.usuarioId
  if (!ehProprio) requireAdminOrGestor(ctx)
  const parsed = UsuarioUpdateSchema.parse(args)
  if (parsed.perfil && ehProprio) {
    throw new AppError('Você não pode alterar o próprio perfil')
  }
  const db = getPrisma()
  const existente = await db.usuario.findUnique({ where: { id } })
  if (!existente) throw new AppError('Usuário não encontrado', 404)
  if (parsed.email) {
    const email = parsed.email.trim().toLowerCase()
    const duplicado = await db.usuario.findFirst({ where: { email, id: { not: id } } })
    if (duplicado) throw new AppError('E-mail já utilizado por outro usuário')
    parsed.email = email
  }
  const data: Record<string, unknown> = {}
  if (parsed.nome !== undefined) data.nome = parsed.nome
  if (parsed.email !== undefined) data.email = parsed.email
  if (parsed.perfil !== undefined) data.perfil = parsed.perfil
  if (parsed.cargo !== undefined) data.cargo = parsed.cargo
  if (parsed.telefone !== undefined) data.telefone = parsed.telefone
  if (parsed.ativo !== undefined) data.ativo = parsed.ativo
  if (parsed.senha) data.senhaHash = hashPassword(parsed.senha)
  const u = await db.usuario.update({ where: { id }, data, select })
  await registrarHistorico({
    entidade: 'usuario',
    entidadeId: u.id,
    usuarioId: ctx.usuarioId,
    tipo: 'ALTERACAO',
    descricao: `Dados do usuário "${u.nome}" atualizados`
  })
  return deepIso(u)
}

export async function excluirUsuario(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do usuário é obrigatório')
  if (id === ctx.usuarioId) throw new AppError('Você não pode excluir a si mesmo')
  const db = getPrisma()
  const existente = await db.usuario.findUnique({ where: { id } })
  if (!existente) throw new AppError('Usuário não encontrado', 404)
  if (existente.perfil === 'ADMIN') {
    const admins = await db.usuario.count({ where: { perfil: 'ADMIN' } })
    if (admins <= 1) throw new AppError('Não é possível excluir o último administrador')
  }
  await db.sessao.deleteMany({ where: { usuarioId: id } })
  await db.usuario.update({ where: { id }, data: { ativo: false } })
  await registrarHistorico({
    entidade: 'usuario',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Usuário "${existente.nome}" desativado`
  })
  return { ok: true }
}

function gerarCodigoConvite(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const partes: string[] = []
  for (let i = 0; i < 3; i++) {
    let p = ''
    for (let j = 0; j < 4; j++) p += abc[Math.floor(Math.random() * abc.length)]
    partes.push(p)
  }
  return partes.join('-')
}

const conviteSelect = {
  id: true,
  email: true,
  nome: true,
  perfil: true,
  cargo: true,
  telefone: true,
  empresaId: true,
  token: true,
  criadoEm: true,
  expiraEm: true,
  usadoEm: true,
  canceladoEm: true
} as const

export async function convidarUsuario(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const parsed = ConviteSchema.parse(args)
  const db = getPrisma()
  const email = parsed.email.trim().toLowerCase()

  const existente = await db.usuario.findUnique({ where: { email } })
  if (existente) throw new AppError('Já existe um usuário com este e-mail')

  const pendente = await db.convite.findFirst({ where: { email, canceladoEm: null, usadoEm: null, expiraEm: { gt: new Date() } } })
  if (pendente) throw new AppError('Já existe um convite pendente para este e-mail')

  const convite = await db.convite.create({
    data: {
      email,
      nome: parsed.nome,
      perfil: parsed.perfil,
      cargo: parsed.cargo || null,
      telefone: parsed.telefone || null,
      empresaId: ctx.empresaId,
      criadoPorId: ctx.usuarioId,
      token: gerarCodigoConvite(),
      expiraEm: addDays(new Date(), 7)
    },
    select: conviteSelect
  })

  await registrarHistorico({
    entidade: 'usuario',
    entidadeId: convite.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Convite enviado para ${email} (${parsed.perfil})`
  })

  const completo = await db.convite.findUnique({ where: { id: convite.id } })
  return deepIso(completo)
}

export async function listarConvites(ctx: ApiContext, _args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const db = getPrisma()
  const itens = await db.convite.findMany({
    select: conviteSelect,
    orderBy: [{ usadoEm: 'asc' }, { criadoEm: 'desc' }],
    take: 50
  })
  const pendentes = itens.filter((c) => !c.usadoEm && !c.canceladoEm && c.expiraEm > new Date())
  const historico = itens.filter((c) => c.usadoEm || c.canceladoEm || c.expiraEm <= new Date())
  return deepIso({ pendentes, historico })
}

export async function cancelarConvite(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const db = getPrisma()
  const id = String(args.id || '')
  const convite = await db.convite.findUnique({ where: { id } })
  if (!convite) throw new AppError('Convite não encontrado', 404)
  if (convite.usadoEm) throw new AppError('Este convite já foi utilizado')
  await db.convite.update({ where: { id }, data: { canceladoEm: new Date() } })
  await registrarHistorico({
    entidade: 'usuario',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Convite para ${convite.email} cancelado`
  })
  return { ok: true }
}

export async function obterConvitePorCodigo(email: string, token: string) {
  const db = getPrisma()
  return db.convite.findFirst({ where: { email: email.trim().toLowerCase(), token: token.trim().toUpperCase() } })
}
