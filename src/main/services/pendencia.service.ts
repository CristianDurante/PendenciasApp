import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getPrisma } from '../db'
import { AppError } from '../auth'
import { PRIORIDADES, PENDENCIA_STATUS } from '@shared/constants'
import type { ApiContext, FiltroPendencias, Pendencia, Prioridade, PendenciaStatus } from '@shared/types'
import {
  deepIso,
  isAtrasada,
  calcularProgresso,
  dataInicioDoDia,
  dataFimDoDia,
  addDias,
  safeJsonParse
} from '../helpers'
import { registrarHistorico } from './historico.service'
import { criarNotificacao, notificacaoDesktop } from './notificacao.service'
import { addDays, addMonths, addYears, parseISO } from 'date-fns'

export const pendenciaInclude = {
  criador: { select: { id: true, nome: true, avatar: true } },
  responsavel: { select: { id: true, nome: true, avatar: true } },
  cliente: true,
  projeto: true,
  categoria: true,
  tags: { include: { tag: true } },
  checklist: { orderBy: { criadoEm: 'asc' as const } },
  comentarios: { include: { usuario: { select: { id: true, nome: true, avatar: true } } }, orderBy: { criadoEm: 'asc' as const } },
  anexos: { include: { usuario: { select: { id: true, nome: true, avatar: true } } }, orderBy: { criadoEm: 'desc' as const } }
}

const PendenciaCreateSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(200),
  descricao: z.string().max(5000).optional().nullable(),
  clienteId: z.string().optional().nullable(),
  projetoId: z.string().optional().nullable(),
  sistema: z.string().max(120).optional().nullable(),
  responsavelId: z.string().optional().nullable(),
  prazo: z.string().optional().nullable(),
  horario: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido').optional().nullable(),
  prioridade: z.enum(PRIORIDADES as [Prioridade, ...Prioridade[]]).default('NORMAL'),
  categoriaId: z.string().optional().nullable(),
  departamento: z.string().max(80).optional().nullable(),
  status: z.enum(PENDENCIA_STATUS as [PendenciaStatus, ...PendenciaStatus[]]).default('A_FAZER'),
  observacoes: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  checklist: z.array(z.string()).optional().default([]),
  recorrencia: z
    .object({ tipo: z.enum(['diaria', 'semanal', 'mensal', 'trimestral', 'anual']), intervalo: z.number().int().min(1).default(1), ativo: z.boolean().default(true) })
    .optional()
    .nullable()
})

const PendenciaUpdateSchema = PendenciaCreateSchema.partial().omit({ checklist: true, recorrencia: true }).extend({
  recorrencia: z
    .object({ tipo: z.enum(['diaria', 'semanal', 'mensal', 'trimestral', 'anual']), intervalo: z.number().int().min(1).default(1), ativo: z.boolean().default(true) })
    .optional()
    .nullable()
})

const STATUS_CONCLUSAO: PendenciaStatus[] = ['CONCLUIDA', 'CANCELADA']

function serializarPendencia(p: Record<string, unknown> & { prazo: Date | null; status: string; checklist?: Array<{ concluido: boolean }> }): Pendencia {
  const base = deepIso<Pendencia>(p)
  const atrasada = isAtrasada(p.prazo, p.status)
  const progresso = calcularProgresso(p.checklist || [])
  return { ...base, atrasada, progresso }
}

function buildWhere(filtro: FiltroPendencias): Prisma.PendenciaWhereInput {
  const where: Prisma.PendenciaWhereInput = {}
  const busca = filtro.busca?.trim().toLowerCase()
  if (busca) {
    where.OR = [
      { titulo: { contains: busca } },
      { descricao: { contains: busca } },
      { sistema: { contains: busca } },
      { departamento: { contains: busca } },
      { observacoes: { contains: busca } }
    ]
  }
  if (filtro.status && filtro.status.length) where.status = { in: filtro.status }
  if (filtro.prioridade && filtro.prioridade.length) where.prioridade = { in: filtro.prioridade }
  if (filtro.clienteId) where.clienteId = filtro.clienteId
  if (filtro.projetoId) where.projetoId = filtro.projetoId
  if (filtro.responsavelId) where.responsavelId = filtro.responsavelId
  if (filtro.categoriaId) where.categoriaId = filtro.categoriaId
  if (filtro.departamento) where.departamento = filtro.departamento
  if (filtro.tags && filtro.tags.length) {
    where.tags = { some: { tagId: { in: filtro.tags } } }
  }
  const prazoWhere: { gte?: Date; lte?: Date; lt?: Date; gt?: Date } = {}
  if (filtro.prazoDe) prazoWhere.gte = dataInicioDoDia(parseISO(filtro.prazoDe))
  if (filtro.prazoAte) prazoWhere.lte = dataFimDoDia(parseISO(filtro.prazoAte))
  if (filtro.atrasadas) prazoWhere.lt = dataInicioDoDia()
  if (filtro.prazoHoje) {
    prazoWhere.gte = prazoWhere.gte || dataInicioDoDia()
    prazoWhere.lte = prazoWhere.lte || dataFimDoDia()
  }
  if (filtro.prazoProximas) {
    prazoWhere.gt = prazoWhere.gt || dataFimDoDia()
    prazoWhere.lte = prazoWhere.lte || dataFimDoDia(addDias(new Date(), 7))
  }
  if (Object.keys(prazoWhere).length) where.prazo = prazoWhere
  if (filtro.atrasadas) {
    where.status = { notIn: STATUS_CONCLUSAO }
  }
  if (filtro.semResponsavel) {
    where.responsavelId = null
  }
  return where
}

const PRIORIDADE_PESO: Record<Prioridade, number> = { URGENTE: 0, ALTA: 1, NORMAL: 2, BAIXA: 3 }

function ordenarItens(itens: Pendencia[], filtro: FiltroPendencias): Pendencia[] {
  const campo = filtro.ordenacao || 'prazo'
  const dir = filtro.ordem === 'asc' ? 1 : -1
  return [...itens].sort((a, b) => {
    let r = 0
    if (campo === 'prioridade') {
      r = (PRIORIDADE_PESO[a.prioridade] - PRIORIDADE_PESO[b.prioridade]) * dir
    } else if (campo === 'titulo') {
      r = a.titulo.localeCompare(b.titulo, 'pt-BR') * dir
    } else if (campo === 'criadoEm') {
      r = (new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()) * dir
    } else if (campo === 'status') {
      r = a.status.localeCompare(b.status) * dir
    } else if (campo === 'atualizacao') {
      r = (new Date(a.ultimaAtualizacao).getTime() - new Date(b.ultimaAtualizacao).getTime()) * dir
    } else {
      // prazo (null por ultimo)
      const pa = a.prazo ? new Date(a.prazo).getTime() : null
      const pb = b.prazo ? new Date(b.prazo).getTime() : null
      if (pa === null && pb === null) r = 0
      else if (pa === null) r = 1
      else if (pb === null) r = -1
      else r = (pa - pb) * dir
    }
    return r
  })
}

export async function listarPendencias(_ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const filtro = args as unknown as FiltroPendencias
  const pagina = Math.max(1, Number(filtro.pagina) || 1)
  const porPagina = Math.min(200, Math.max(1, Number(filtro.porPagina) || 20))
  const where = buildWhere(filtro)

  const total = await db.pendencia.count({ where })
  const itens = await db.pendencia.findMany({
    where,
    include: pendenciaInclude,
    skip: (pagina - 1) * porPagina,
    take: porPagina
  })
  const ordenados = ordenarItens(deepIso<Pendencia[]>(itens), filtro)
  const serializados = ordenados.map((p) => ({
    ...p,
    atrasada: isAtrasada(p.prazo ? new Date(p.prazo) : null, p.status),
    progresso: calcularProgresso(p.checklist || [])
  }))
  return { itens: serializados, total, pagina, porPagina }
}

export async function obterPendencia(_ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const p = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  return serializarPendencia(p as never)
}

export async function criarPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const parsed = PendenciaCreateSchema.parse(args)
  const p = await db.pendencia.create({
    data: {
      titulo: parsed.titulo,
      descricao: parsed.descricao || null,
      clienteId: parsed.clienteId || null,
      projetoId: parsed.projetoId || null,
      sistema: parsed.sistema || null,
      responsavelId: parsed.responsavelId || null,
      criadorId: ctx.usuarioId,
      prazo: parsed.prazo ? parseISO(parsed.prazo) : null,
      horario: parsed.horario || null,
      prioridade: parsed.prioridade,
      categoriaId: parsed.categoriaId || null,
      departamento: parsed.departamento || null,
      status: parsed.status,
      observacoes: parsed.observacoes || null,
      recorrencia: parsed.recorrencia ? JSON.stringify(parsed.recorrencia) : null
    }
  })
  if (parsed.tags?.length) {
    await db.pendenciaTag.createMany({
      data: parsed.tags.map((tagId) => ({ pendenciaId: p.id, tagId }))
    })
  }
  if (parsed.checklist?.length) {
    await db.checklistItem.createMany({
      data: parsed.checklist.map((descricao) => ({ pendenciaId: p.id, descricao }))
    })
  }
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: p.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Pendência "${p.titulo}" criada`,
    detalhes: { prioridade: p.prioridade, prazo: p.prazo?.toISOString() ?? null }
  })
  if (parsed.responsavelId && parsed.responsavelId !== ctx.usuarioId) {
    await criarNotificacao({
      usuarioId: parsed.responsavelId,
      tipo: 'alteracao',
      titulo: 'Nova pendência atribuída',
      mensagem: `"${p.titulo}" foi atribuída a você${p.prazo ? ` com prazo ${p.prazo.toLocaleDateString('pt-BR')}` : ''}.`,
      relacionadoId: p.id
    })
    notificacaoDesktop('Nova pendência atribuída', `"${p.titulo}" foi atribuída a você.`)
  }
  const completa = await db.pendencia.findUnique({ where: { id: p.id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function atualizarPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  if (!id) throw new AppError('ID da pendência é obrigatório')
  const parsed = PendenciaUpdateSchema.parse(args)
  const anterior = await db.pendencia.findUnique({ where: { id } })
  if (!anterior) throw new AppError('Pendência não encontrada', 404)

  const data: Prisma.PendenciaUncheckedUpdateInput = {}
  if (parsed.titulo !== undefined) data.titulo = parsed.titulo
  if (parsed.descricao !== undefined) data.descricao = parsed.descricao || null
  if (parsed.clienteId !== undefined) data.clienteId = parsed.clienteId || null
  if (parsed.projetoId !== undefined) data.projetoId = parsed.projetoId || null
  if (parsed.sistema !== undefined) data.sistema = parsed.sistema || null
  if (parsed.responsavelId !== undefined) data.responsavelId = parsed.responsavelId || null
  if (parsed.prazo !== undefined) data.prazo = parsed.prazo ? parseISO(parsed.prazo) : null
  if (parsed.horario !== undefined) data.horario = parsed.horario || null
  if (parsed.prioridade !== undefined) data.prioridade = parsed.prioridade
  if (parsed.categoriaId !== undefined) data.categoriaId = parsed.categoriaId || null
  if (parsed.departamento !== undefined) data.departamento = parsed.departamento || null
  if (parsed.status !== undefined) data.status = parsed.status
  if (parsed.observacoes !== undefined) data.observacoes = parsed.observacoes || null
  if (parsed.recorrencia !== undefined) data.recorrencia = parsed.recorrencia ? JSON.stringify(parsed.recorrencia) : null
  if (parsed.status === 'CONCLUIDA' && anterior.status !== 'CONCLUIDA') {
    data.concluidaEm = new Date()
  } else if (parsed.status !== undefined && parsed.status !== 'CONCLUIDA') {
    data.concluidaEm = null
  }

  await db.pendencia.update({ where: { id }, data })

  if (parsed.tags !== undefined) {
    await db.pendenciaTag.deleteMany({ where: { pendenciaId: id } })
    if (parsed.tags.length) {
      await db.pendenciaTag.createMany({ data: parsed.tags.map((tagId) => ({ pendenciaId: id, tagId })) })
    }
  }

  const mudancas: string[] = []
  if (parsed.titulo && parsed.titulo !== anterior.titulo) mudancas.push(`título de "${anterior.titulo}" para "${parsed.titulo}"`)
  if (parsed.status && parsed.status !== anterior.status) mudancas.push(`status de "${anterior.status}" para "${parsed.status}"`)
  if (parsed.prazo !== undefined) {
    const antes = anterior.prazo ? anterior.prazo.toISOString().slice(0, 10) : 'sem prazo'
    const depois = parsed.prazo ? parseISO(parsed.prazo).toISOString().slice(0, 10) : 'sem prazo'
    if (antes !== depois) mudancas.push(`prazo de ${antes} para ${depois}`)
  }
  if (parsed.responsavelId !== undefined) {
    const antes = anterior.responsavelId || 'ninguém'
    const depois = parsed.responsavelId || 'ninguém'
    if (antes !== depois) {
      mudancas.push(`responsável alterado`)
      if (parsed.responsavelId && parsed.responsavelId !== ctx.usuarioId) {
        await criarNotificacao({
          usuarioId: parsed.responsavelId,
          tipo: 'alteracao',
          titulo: 'Pendência reatribuída',
          mensagem: `"${anterior.titulo}" agora é sua responsabilidade.`,
          relacionadoId: id
        })
      }
    }
  }
  if (parsed.prioridade !== undefined && parsed.prioridade !== anterior.prioridade) {
    mudancas.push(`prioridade de ${anterior.prioridade} para ${parsed.prioridade}`)
  }

  if (mudancas.length) {
    await registrarHistorico({
      entidade: 'pendencia',
      entidadeId: id,
      usuarioId: ctx.usuarioId,
      tipo: 'ALTERACAO',
      descricao: `Pendência atualizada: ${mudancas.join('; ')}`
    })
  }

  const completa = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function excluirPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const p = await db.pendencia.findUnique({ where: { id } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Pendência "${p.titulo}" excluída`
  })
  await db.pendencia.delete({ where: { id } })
  return { ok: true }
}

export async function duplicarPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const origem = await db.pendencia.findUnique({ where: { id }, include: { tags: true, checklist: true } })
  if (!origem) throw new AppError('Pendência não encontrada', 404)
  const nova = await db.pendencia.create({
    data: {
      titulo: `${origem.titulo} (cópia)`,
      descricao: origem.descricao,
      clienteId: origem.clienteId,
      projetoId: origem.projetoId,
      sistema: origem.sistema,
      responsavelId: origem.responsavelId,
      criadorId: ctx.usuarioId,
      prazo: origem.prazo,
      horario: origem.horario,
      prioridade: origem.prioridade,
      categoriaId: origem.categoriaId,
      departamento: origem.departamento,
      status: 'A_FAZER',
      observacoes: origem.observacoes,
      recorrencia: null
    }
  })
  if (origem.tags.length) {
    await db.pendenciaTag.createMany({
      data: origem.tags.map((t) => ({ pendenciaId: nova.id, tagId: t.tagId }))
    })
  }
  if (origem.checklist.length) {
    await db.checklistItem.createMany({
      data: origem.checklist.map((c) => ({ pendenciaId: nova.id, descricao: c.descricao }))
    })
  }
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: nova.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Cópia criada a partir de "${origem.titulo}"`
  })
  const completa = await db.pendencia.findUnique({ where: { id: nova.id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function concluirPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const p = await db.pendencia.findUnique({ where: { id } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  if (p.status !== 'CONCLUIDA') {
    await db.pendencia.update({ where: { id }, data: { status: 'CONCLUIDA', concluidaEm: new Date() } })
    await registrarHistorico({
      entidade: 'pendencia',
      entidadeId: id,
      usuarioId: ctx.usuarioId,
      tipo: 'CONCLUSAO',
      descricao: `Pendência "${p.titulo}" concluída`
    })
    if (p.criadorId !== ctx.usuarioId && p.criadorId !== p.responsavelId) {
      await criarNotificacao({
        usuarioId: p.criadorId,
        tipo: 'conclusao',
        titulo: 'Pendência concluída',
        mensagem: `"${p.titulo}" foi concluída.`,
        relacionadoId: id
      })
    }
    if (p.responsavelId && p.responsavelId !== ctx.usuarioId && p.responsavelId !== p.criadorId) {
      await criarNotificacao({
        usuarioId: p.responsavelId,
        tipo: 'conclusao',
        titulo: 'Pendência concluída',
        mensagem: `"${p.titulo}" foi concluída.`,
        relacionadoId: id
      })
    }
    const rec = safeJsonParse<{ tipo: string; intervalo: number; ativo: boolean } | null>(p.recorrencia, null)
    if (rec && rec.ativo && rec.tipo) {
      const base = p.prazo ? new Date(p.prazo) : new Date()
      let prox = base
      if (rec.tipo === 'diaria') prox = addDays(base, rec.intervalo || 1)
      else if (rec.tipo === 'semanal') prox = addDays(base, 7 * (rec.intervalo || 1))
      else if (rec.tipo === 'mensal') prox = addMonths(base, rec.intervalo || 1)
      else if (rec.tipo === 'trimestral') prox = addMonths(base, 3 * (rec.intervalo || 1))
      else if (rec.tipo === 'anual') prox = addYears(base, rec.intervalo || 1)
      await db.pendencia.create({
        data: {
          titulo: p.titulo,
          descricao: p.descricao,
          clienteId: p.clienteId,
          projetoId: p.projetoId,
          sistema: p.sistema,
          responsavelId: p.responsavelId,
          criadorId: p.criadorId,
          prazo: prox,
          horario: p.horario,
          prioridade: p.prioridade,
          categoriaId: p.categoriaId,
          departamento: p.departamento,
          status: 'A_FAZER',
          observacoes: p.observacoes,
          recorrencia: p.recorrencia
        }
      })
      const tags = await db.pendenciaTag.findMany({ where: { pendenciaId: id } })
      const proxima = await db.pendencia.findFirst({ where: { prazo: prox, titulo: p.titulo, status: 'A_FAZER' }, orderBy: { criadoEm: 'desc' } })
      if (proxima && tags.length) {
        await db.pendenciaTag.createMany({ data: tags.map((t) => ({ pendenciaId: proxima.id, tagId: t.tagId })) })
      }
      const chk = await db.checklistItem.findMany({ where: { pendenciaId: id } })
      if (proxima && chk.length) {
        await db.checklistItem.createMany({ data: chk.map((c) => ({ pendenciaId: proxima.id, descricao: c.descricao })) })
      }
      if (proxima) {
        await registrarHistorico({
          entidade: 'pendencia',
          entidadeId: proxima.id,
          usuarioId: ctx.usuarioId,
          tipo: 'RECORRENCIA',
          descricao: `Próxima ocorrência gerada automaticamente para ${prox.toLocaleDateString('pt-BR')}`
        })
      }
    }
  }
  const completa = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function reabrirPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const p = await db.pendencia.findUnique({ where: { id } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  const novoStatus: PendenciaStatus = (p.status === 'CONCLUIDA' ? 'EM_ANDAMENTO' : p.status) as PendenciaStatus
  await db.pendencia.update({ where: { id }, data: { status: novoStatus, concluidaEm: null } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'REABERTURA',
    descricao: `Pendência "${p.titulo}" reaberta`
  })
  const completa = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function alterarStatusPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  const status = String(args.status || '')
  if (!PENDENCIA_STATUS.includes(status as PendenciaStatus)) throw new AppError('Status inválido')
  if (status === 'CONCLUIDA') return concluirPendencia(ctx, { id })
  const db = getPrisma()
  const p = await db.pendencia.findUnique({ where: { id } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  const data: Prisma.PendenciaUpdateInput = { status: status as PendenciaStatus, concluidaEm: null }
  if (status === 'CANCELADA' && p.status !== 'CANCELADA') {
    data.concluidaEm = null
  }
  await db.pendencia.update({ where: { id }, data })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'STATUS',
    descricao: `Status alterado de ${p.status} para ${status}`
  })
  const completa = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function alterarPrazo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const prazo = args.prazo ? parseISO(String(args.prazo)) : null
  const horario = args.horario ? String(args.horario) : null
  const p = await db.pendencia.findUnique({ where: { id } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  await db.pendencia.update({ where: { id }, data: { prazo, horario } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'PRAZO',
    descricao: `Prazo alterado${prazo ? ` para ${prazo.toLocaleDateString('pt-BR')}` : ''}${horario ? ` às ${horario}` : ''}`
  })
  if (p.responsavelId && p.responsavelId !== ctx.usuarioId) {
    await criarNotificacao({
      usuarioId: p.responsavelId,
      tipo: 'alteracao',
      titulo: 'Prazo alterado',
      mensagem: `O prazo de "${p.titulo}" foi alterado.`,
      relacionadoId: id
    })
  }
  const completa = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function alterarResponsavel(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const responsavelId = args.responsavelId ? String(args.responsavelId) : null
  const p = await db.pendencia.findUnique({ where: { id } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  await db.pendencia.update({ where: { id }, data: { responsavelId } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'RESPONSAVEL',
    descricao: `Responsável alterado para ${responsavelId ? (responsavelId === ctx.usuarioId ? 'você' : responsavelId) : 'ninguém'}`
  })
  if (responsavelId && responsavelId !== ctx.usuarioId) {
    await criarNotificacao({
      usuarioId: responsavelId,
      tipo: 'alteracao',
      titulo: 'Pendência reatribuída',
      mensagem: `"${p.titulo}" agora é sua responsabilidade.`,
      relacionadoId: id
    })
  }
  const completa = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function alterarPrioridade(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const prioridade = String(args.prioridade || '')
  if (!PRIORIDADES.includes(prioridade as Prioridade)) throw new AppError('Prioridade inválida')
  const p = await db.pendencia.findUnique({ where: { id } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  await db.pendencia.update({ where: { id }, data: { prioridade } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'PRIORIDADE',
    descricao: `Prioridade alterada de ${p.prioridade} para ${prioridade}`
  })
  const completa = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function adicionarTagPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const pendenciaId = String(args.pendenciaId || '')
  const tagId = String(args.tagId || '')
  if (!pendenciaId || !tagId) throw new AppError('Dados inválidos')
  await db.pendenciaTag.upsert({
    where: { pendenciaId_tagId: { pendenciaId, tagId } },
    create: { pendenciaId, tagId },
    update: {}
  })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: pendenciaId,
    usuarioId: ctx.usuarioId,
    tipo: 'TAGS',
    descricao: 'Tag adicionada'
  })
  const completa = await db.pendencia.findUnique({ where: { id: pendenciaId }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function removerTagPendencia(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const pendenciaId = String(args.pendenciaId || '')
  const tagId = String(args.tagId || '')
  await db.pendenciaTag.deleteMany({ where: { pendenciaId, tagId } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: pendenciaId,
    usuarioId: ctx.usuarioId,
    tipo: 'TAGS',
    descricao: 'Tag removida'
  })
  const completa = await db.pendencia.findUnique({ where: { id: pendenciaId }, include: pendenciaInclude })
  return serializarPendencia(completa as never)
}

export async function adicionarChecklist(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const pendenciaId = String(args.pendenciaId || '')
  const descricao = String(args.descricao || '')
  if (!descricao.trim()) throw new AppError('Descrição obrigatória')
  const item = await db.checklistItem.create({ data: { pendenciaId, descricao: descricao.trim() } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: pendenciaId,
    usuarioId: ctx.usuarioId,
    tipo: 'CHECKLIST',
    descricao: `Item do checklist adicionado: "${descricao.trim()}"`
  })
  return deepIso(item)
}

export async function toggleChecklist(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const itemId = String(args.itemId || '')
  const item = await db.checklistItem.findUnique({ where: { id: itemId } })
  if (!item) throw new AppError('Item não encontrado', 404)
  const concluido = !item.concluido
  await db.checklistItem.update({ where: { id: itemId }, data: { concluido, concluidoEm: concluido ? new Date() : null } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: item.pendenciaId,
    usuarioId: ctx.usuarioId,
    tipo: 'CHECKLIST',
    descricao: `Item "${item.descricao}" ${concluido ? 'concluído' : 'reaberto'}`
  })
  return { ok: true }
}

export async function removerChecklist(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const itemId = String(args.itemId || '')
  const item = await db.checklistItem.findUnique({ where: { id: itemId } })
  if (!item) throw new AppError('Item não encontrado', 404)
  await db.checklistItem.delete({ where: { id: itemId } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: item.pendenciaId,
    usuarioId: ctx.usuarioId,
    tipo: 'CHECKLIST',
    descricao: `Item "${item.descricao}" removido do checklist`
  })
  return { ok: true }
}

export async function adicionarComentario(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const pendenciaId = String(args.pendenciaId || '')
  const conteudo = String(args.conteudo || '').trim()
  if (!conteudo) throw new AppError('Comentário vazio')
  const p = await db.pendencia.findUnique({ where: { id: pendenciaId } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  const c = await db.comentario.create({
    data: { pendenciaId, usuarioId: ctx.usuarioId, conteudo },
    include: { usuario: { select: { id: true, nome: true, avatar: true } } }
  })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: pendenciaId,
    usuarioId: ctx.usuarioId,
    tipo: 'COMENTARIO',
    descricao: 'Novo comentário adicionado'
  })
  const destinatarios = new Set<string>([p.criadorId, p.responsavelId].filter(Boolean) as string[])
  for (const dest of destinatarios) {
    if (dest !== ctx.usuarioId) {
      await criarNotificacao({
        usuarioId: dest,
        tipo: 'comentario',
        titulo: 'Novo comentário',
        mensagem: `Comentário em "${p.titulo}".`,
        relacionadoId: pendenciaId
      })
      notificacaoDesktop('Novo comentário', `Comentário em "${p.titulo}".`)
    }
  }
  return deepIso(c)
}

export async function excluirComentario(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const c = await db.comentario.findUnique({ where: { id } })
  if (!c) throw new AppError('Comentário não encontrado', 404)
  if (c.usuarioId !== ctx.usuarioId && !ctx.isAdmin) throw new AppError('Sem permissão', 403)
  await db.comentario.delete({ where: { id } })
  return { ok: true }
}

export async function pendenciaMiniatura(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const p = await db.pendencia.findUnique({ where: { id }, include: pendenciaInclude })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  return serializarPendencia(p as never)
}
