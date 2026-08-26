import { z } from 'zod'
import { getPrisma } from '../db'
import { AppError } from '../auth'
import type { ApiContext } from '@shared/types'
import { deepIso } from '../helpers'
import { parseISO } from 'date-fns'

const LembreteSchema = z.object({
  dataHora: z.string().min(1, 'Data é obrigatória'),
  mensagem: z.string().min(1, 'Mensagem é obrigatória').max(500),
  entidade: z.string().max(30).optional().nullable(),
  entidadeId: z.string().optional().nullable()
})

export async function listarLembretes(ctx: ApiContext): Promise<unknown> {
  const db = getPrisma()
  const itens = await db.lembrete.findMany({
    where: { usuarioId: ctx.usuarioId },
    orderBy: [{ disparado: 'asc' }, { dataHora: 'asc' }],
    take: 200
  })
  return deepIso(itens)
}

export async function criarLembrete(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const parsed = LembreteSchema.parse(args)
  const db = getPrisma()
  const l = await db.lembrete.create({
    data: {
      usuarioId: ctx.usuarioId,
      dataHora: parseISO(parsed.dataHora),
      mensagem: parsed.mensagem,
      entidade: parsed.entidade || null,
      entidadeId: parsed.entidadeId || null
    }
  })
  return deepIso(l)
}

export async function excluirLembrete(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const l = await db.lembrete.findFirst({ where: { id, usuarioId: ctx.usuarioId } })
  if (!l) throw new AppError('Lembrete não encontrado', 404)
  await db.lembrete.delete({ where: { id } })
  return { ok: true }
}

export async function marcarLembreteDisparado(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  await db.lembrete.update({ where: { id }, data: { disparado: true } })
  return { ok: true }
}
