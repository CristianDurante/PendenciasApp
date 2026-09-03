import { getPrisma } from '../db'
import { requireEmpresa, temAcessoGlobal } from '../auth'
import type { ApiContext } from '@shared/types'
import { deepIso, dataInicioDoDia, dataFimDoDia } from '../helpers'
import { parseISO } from 'date-fns'

export async function eventosCalendario(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const empresaId = requireEmpresa(ctx)
  const db = getPrisma()
  const de = parseISO(String(args.de || ''))
  const ate = parseISO(String(args.ate || ''))
  const deInicio = dataInicioDoDia(de)
  const ateFim = dataFimDoDia(ate)

  const ondeEquipe = !temAcessoGlobal(ctx) && ctx.equipeId ? { equipeId: ctx.equipeId } : {}

  const [pendencias, compromissos, retornos] = await Promise.all([
    db.pendencia.findMany({
      where: { ...ondeEquipe, criador: { empresaId }, prazo: { gte: deInicio, lte: ateFim } },
      include: { cliente: { select: { id: true, nome: true } }, responsavel: { select: { id: true, nome: true } }, tags: { include: { tag: true } } },
      orderBy: { prazo: 'asc' }
    }),
    db.compromisso.findMany({
      where: { cliente: { empresaId }, data: { gte: deInicio, lte: ateFim } },
      include: { cliente: { select: { id: true, nome: true } }, responsavel: { select: { id: true, nome: true } } },
      orderBy: { data: 'asc' }
    }),
    db.retorno.findMany({
      where: { cliente: { empresaId }, dataPrevista: { gte: deInicio, lte: ateFim } },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { dataPrevista: 'asc' }
    })
  ])

  const itens = [
    ...pendencias.map((p: any) => ({
      tipo: 'pendencia',
      id: p.id,
      titulo: p.titulo,
      data: p.prazo.toISOString(),
      horario: p.horario,
      status: p.status,
      cliente: p.cliente?.nome || null,
      responsavel: p.responsavel?.nome || null,
      prioridade: p.prioridade,
      atrasada: p.prazo < deInicio && p.status !== 'CONCLUIDA' && p.status !== 'CANCELADA'
    })),
    ...compromissos.map((c: any) => ({
      tipo: 'compromisso',
      id: c.id,
      titulo: c.titulo,
      data: c.data.toISOString(),
      horario: c.horaInicio,
      status: c.status,
      cliente: c.cliente?.nome || null,
      local: c.local
    })),
    ...retornos.map((r: any) => ({
      tipo: 'retorno',
      id: r.id,
      titulo: r.assunto,
      data: r.dataPrevista.toISOString(),
      horario: r.horario,
      status: r.status,
      cliente: r.cliente?.nome || null
    }))
  ]

  return deepIso(itens)
}
