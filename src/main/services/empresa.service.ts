import { z } from 'zod'
import { getPrisma } from '../db'
import { AppError, requireRoles } from '../auth'
import type { ApiContext, ConfigApp } from '@shared/types'
import { deepIso, safeJsonParse } from '../helpers'
import { registrarHistorico } from './historico.service'

const EmpresaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(120),
  cnpj: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  telefone: z.string().max(30).optional().nullable(),
  config: z.any().optional().nullable()
})

export async function obterEmpresa(ctx: ApiContext): Promise<unknown> {
  const db = getPrisma()
  const id = ctx.empresaId
  if (!id) return null
  const e = await db.empresa.findUnique({ where: { id } })
  if (!e) return null
  return deepIso(e)
}

export async function criarEmpresa(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const parsed = EmpresaSchema.parse(args)
  const db = getPrisma()
  const e = await db.empresa.create({
    data: {
      nome: parsed.nome,
      cnpj: parsed.cnpj || null,
      email: parsed.email || null,
      telefone: parsed.telefone || null,
      config: parsed.config ? JSON.stringify(parsed.config) : null
    }
  })
  if (!ctx.empresaId) {
    await db.usuario.update({ where: { id: ctx.usuarioId }, data: { empresaId: e.id } })
  }
  if (ctx.empresaId) {
    await registrarHistorico({
      entidade: 'empresa',
      entidadeId: e.id,
      usuarioId: ctx.usuarioId,
      tipo: 'CRIACAO',
      descricao: `Empresa "${e.nome}" criada`
    })
  }
  return deepIso(e)
}

export async function atualizarEmpresa(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const id = String(args.id || '')
  if (!id) throw new AppError('ID da empresa é obrigatório')
  const parsed = EmpresaSchema.partial().parse(args)
  const db = getPrisma()
  const existente = await db.empresa.findUnique({ where: { id } })
  if (!existente) throw new AppError('Empresa não encontrada', 404)
  const e = await db.empresa.update({
    where: { id },
    data: {
      ...(parsed.nome !== undefined ? { nome: parsed.nome } : {}),
      ...(parsed.cnpj !== undefined ? { cnpj: parsed.cnpj || null } : {}),
      ...(parsed.email !== undefined ? { email: parsed.email || null } : {}),
      ...(parsed.telefone !== undefined ? { telefone: parsed.telefone || null } : {}),
      ...(parsed.config !== undefined
        ? { config: typeof parsed.config === 'string' ? parsed.config : JSON.stringify(parsed.config ?? {}) }
        : {})
    }
  })
  await registrarHistorico({
    entidade: 'empresa',
    entidadeId: e.id,
    usuarioId: ctx.usuarioId,
    tipo: 'ALTERACAO',
    descricao: 'Dados da empresa atualizados'
  })
  return deepIso(e)
}

export async function obterConfigApp(ctx: ApiContext): Promise<ConfigApp> {
  const db = getPrisma()
  const id = ctx.empresaId
  if (!id) return {}
  const e = await db.empresa.findUnique({ where: { id } })
  return safeJsonParse<ConfigApp>(e?.config, {})
}

export async function salvarConfigApp(ctx: ApiContext, args: Record<string, unknown>): Promise<ConfigApp> {
  requireRoles(ctx, ['ADMIN'])
  const db = getPrisma()
  const id = ctx.empresaId
  if (!id) throw new AppError('Nenhuma empresa configurada')
  const config = safeJsonParse<ConfigApp>(args.config ? String(args.config) : null, {})
  const parcial = (args.patch || {}) as Partial<ConfigApp>
  const novo = { ...config, ...parcial }
  await db.empresa.update({ where: { id }, data: { config: JSON.stringify(novo) } })
  return novo
}

export async function listarEmpresas(ctx: ApiContext): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const db = getPrisma()
  const itens = await db.empresa.findMany({ orderBy: { nome: 'asc' } })
  return deepIso(itens)
}
