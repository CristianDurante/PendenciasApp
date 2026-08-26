import { getPrisma } from '../db'
import type { EntidadeHistorico } from '@shared/types'

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

export async function listarHistorico(entidade: string, entidadeId: string): Promise<unknown[]> {
  const db = getPrisma()
  const itens = await db.historico.findMany({
    where: { entidade, entidadeId },
    include: { usuario: { select: { id: true, nome: true, avatar: true } } },
    orderBy: { dataHora: 'desc' }
  })
  return itens
}

export async function historicoGlobal(limite = 50, tipos?: string[]): Promise<unknown[]> {
  const db = getPrisma()
  const itens = await db.historico.findMany({
    where: tipos && tipos.length ? { tipo: { in: tipos } } : undefined,
    include: { usuario: { select: { id: true, nome: true, avatar: true } } },
    orderBy: { dataHora: 'desc' },
    take: limite
  })
  return itens
}
