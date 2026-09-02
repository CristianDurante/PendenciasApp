import { Prisma } from '@prisma/client'
import { getPrisma } from '../db'
import { temAcessoGlobal } from '../auth'
import type { ApiContext, EntidadeHistorico } from '@shared/types'

export interface HistoricoInput {
  entidade: EntidadeHistorico
  entidadeId: string
  usuarioId?: string | null
  tipo: string
  descricao: string
  detalhes?: Record<string, unknown> | null
}

export async function registrarHistorico(input: HistoricoInput): Promise<void> {
  const db = getPrisma()
  await db.historico.create({
    data: {
      entidade: input.entidade,
      entidadeId: input.entidadeId,
      usuarioId: input.usuarioId ?? null,
      tipo: input.tipo,
      descricao: input.descricao,
      detalhes: input.detalhes ? JSON.stringify(input.detalhes) : null
    }
  })
}

export async function listarHistorico(ctx: ApiContext, entidade: string, entidadeId: string): Promise<unknown[]> {
  const db = getPrisma()
  // Isolamento: usuário comum só vê histórico de pendências da própria equipe.
  if (entidade === 'pendencia' && !temAcessoGlobal(ctx)) {
    const p = await db.pendencia.findUnique({ where: { id: entidadeId }, select: { equipeId: true } })
    if (!p || p.equipeId !== ctx.equipeId) return []
  }
  const itens = await db.historico.findMany({
    where: { entidade, entidadeId },
    include: { usuario: { select: { id: true, nome: true, avatar: true } } },
    orderBy: { dataHora: 'desc' }
  })
  return itens
}

export async function historicoGlobal(ctx: ApiContext, limite = 50, tipos?: string[]): Promise<unknown[]> {
  const db = getPrisma()
  const base: Prisma.HistoricoWhereInput = tipos && tipos.length ? { tipo: { in: tipos } } : {}
  let where: Prisma.HistoricoWhereInput = base
  if (!temAcessoGlobal(ctx) && ctx.equipeId) {
    const pendenciasDaEquipe = await db.pendencia.findMany({
      where: { equipeId: ctx.equipeId },
      select: { id: true }
    })
    const ids = pendenciasDaEquipe.map((p) => p.id)
    where = {
      ...base,
      OR: [{ entidade: 'pendencia', entidadeId: { in: ids } }, { usuarioId: ctx.usuarioId }]
    }
  }
  const itens = await db.historico.findMany({
    where,
    include: { usuario: { select: { id: true, nome: true, avatar: true } } },
    orderBy: { dataHora: 'desc' },
    take: limite
  })
  return itens
}
