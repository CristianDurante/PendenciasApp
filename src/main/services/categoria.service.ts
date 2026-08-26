import { z } from 'zod'
import { getPrisma } from '../db'
import { AppError, requireAdminOrGestor } from '../auth'
import type { ApiContext } from '@shared/types'
import { deepIso } from '../helpers'

const CategoriaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(80),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida').default('#64748b')
})

export async function listarCategorias(): Promise<unknown> {
  const db = getPrisma()
  const itens = await db.categoria.findMany({
    where: { ativo: true },
    orderBy: [{ padrao: 'desc' }, { nome: 'asc' }]
  })
  const comContagem = await Promise.all(
    itens.map(async (c) => {
      const total = await db.pendencia.count({ where: { categoriaId: c.id, status: { not: 'CANCELADA' } } })
      return { ...c, quantidade: total }
    })
  )
  return deepIso(comContagem)
}

export async function criarCategoria(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const parsed = CategoriaSchema.parse(args)
  const db = getPrisma()
  const c = await db.categoria.create({
    data: { nome: parsed.nome, cor: parsed.cor, padrao: false }
  })
  return deepIso(c)
}

export async function atualizarCategoria(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const id = String(args.id || '')
  if (!id) throw new AppError('ID da categoria é obrigatório')
  const parsed = CategoriaSchema.partial().parse(args)
  const db = getPrisma()
  const existente = await db.categoria.findUnique({ where: { id } })
  if (!existente) throw new AppError('Categoria não encontrada', 404)
  const c = await db.categoria.update({
    where: { id },
    data: {
      ...(parsed.nome !== undefined ? { nome: parsed.nome } : {}),
      ...(parsed.cor !== undefined ? { cor: parsed.cor } : {})
    }
  })
  return deepIso(c)
}

export async function excluirCategoria(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireAdminOrGestor(ctx)
  const id = String(args.id || '')
  const db = getPrisma()
  await db.pendencia.updateMany({ where: { categoriaId: id }, data: { categoriaId: null } })
  await db.categoria.delete({ where: { id } })
  return { ok: true }
}
