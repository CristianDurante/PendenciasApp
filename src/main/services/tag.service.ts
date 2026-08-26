import { z } from 'zod'
import { getPrisma } from '../db'
import { AppError, requireAdminOrGestor } from '../auth'
import type { ApiContext } from '@shared/types'
import { deepIso } from '../helpers'
import { registrarHistorico } from './historico.service'

const TagSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(60),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida').default('#3b82f6'),
  descricao: z.string().max(300).optional().nullable()
})

export async function listarTags(): Promise<unknown> {
  const db = getPrisma()
  const itens = await db.tag.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { pendencias: true } } }
  })
  return deepIso(itens.map((t) => ({ ...t, quantidade: t._count.pendencias })))
}

export async function obterTag(args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const t = await db.tag.findUnique({ where: { id }, include: { _count: { select: { pendencias: true } } } })
  if (!t) throw new AppError('Tag não encontrada', 404)
  return deepIso({ ...t, quantidade: t._count.pendencias })
}

export async function criarTag(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const parsed = TagSchema.parse(args)
  const db = getPrisma()
  const t = await db.tag.create({
    data: { nome: parsed.nome, cor: parsed.cor, descricao: parsed.descricao || null }
  })
  await registrarHistorico({
    entidade: 'tag',
    entidadeId: t.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Tag "${t.nome}" criada`
  })
  return deepIso(t)
}

export async function atualizarTag(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const id = String(args.id || '')
  if (!id) throw new AppError('ID da tag é obrigatório')
  const parsed = TagSchema.partial().parse(args)
  const db = getPrisma()
  const existente = await db.tag.findUnique({ where: { id } })
  if (!existente) throw new AppError('Tag não encontrada', 404)
  const t = await db.tag.update({
    where: { id },
    data: {
      ...(parsed.nome !== undefined ? { nome: parsed.nome } : {}),
      ...(parsed.cor !== undefined ? { cor: parsed.cor } : {}),
      ...(parsed.descricao !== undefined ? { descricao: parsed.descricao || null } : {})
    }
  })
  await registrarHistorico({
    entidade: 'tag',
    entidadeId: t.id,
    usuarioId: ctx.usuarioId,
    tipo: 'ALTERACAO',
    descricao: `Tag "${t.nome}" atualizada`
  })
  return deepIso(t)
}

export async function excluirTag(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const id = String(args.id || '')
  if (!id) throw new AppError('ID da tag é obrigatório')
  const db = getPrisma()
  const existente = await db.tag.findUnique({ where: { id } })
  if (!existente) throw new AppError('Tag não encontrada', 404)
  await db.pendenciaTag.deleteMany({ where: { tagId: id } })
  await db.tag.delete({ where: { id } })
  await registrarHistorico({
    entidade: 'tag',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Tag "${existente.nome}" excluída (associações removidas)`
  })
  return { ok: true }
}
