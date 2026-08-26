import { z } from 'zod'
import { getPrisma } from '../db'
import { USUARIO_RESUMO } from './resumo'
import { AppError } from '../auth'
import { RETORNO_STATUS } from '@shared/constants'
import type { ApiContext, RetornoStatus } from '@shared/types'
import { deepIso } from '../helpers'
import { registrarHistorico } from './historico.service'
import { parseISO } from 'date-fns'

const RetornoSchema = z.object({
  clienteId: z.string().optional().nullable(),
  contato: z.string().max(120).optional().nullable(),
  assunto: z.string().min(1, 'Assunto é obrigatório').max(200),
  dataPrevista: z.string().optional().nullable(),
  horario: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido').optional().nullable(),
  responsavelId: z.string().optional().nullable(),
  observacao: z.string().max(2000).optional().nullable()
})

export async function listarRetornos(args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const busca = args.busca ? String(args.busca).toLowerCase() : ''
  const status = args.status ? String(args.status) : ''
  const clienteId = args.clienteId ? String(args.clienteId) : ''
  const responsavelId = args.responsavelId ? String(args.responsavelId) : ''
  const itens = await db.retorno.findMany({
    where: {
      ...(busca ? { OR: [{ assunto: { contains: busca } }, { contato: { contains: busca } }] } : {}),
      ...(status ? { status } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(responsavelId ? { responsavelId } : {})
    },
    include: { cliente: { select: { id: true, nome: true } }, responsavel: { select: { id: true, nome: true, avatar: true } } },
    orderBy: [{ dataPrevista: 'asc' }, { criadoEm: 'desc' }]
  })
  return deepIso(itens)
}

export async function criarRetorno(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const parsed = RetornoSchema.parse(args)
  const db = getPrisma()
  const r = await db.retorno.create({
    data: {
      clienteId: parsed.clienteId || null,
      contato: parsed.contato || null,
      assunto: parsed.assunto,
      dataPrevista: parsed.dataPrevista ? parseISO(parsed.dataPrevista) : null,
      horario: parsed.horario || null,
      responsavelId: parsed.responsavelId || ctx.usuarioId,
      observacao: parsed.observacao || null,
      status: 'PENDENTE'
    }
  })
  await registrarHistorico({
    entidade: 'retorno',
    entidadeId: r.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Retorno "${r.assunto}" criado`
  })
  const completa = await db.retorno.findUnique({ where: { id: r.id }, include: { cliente: true, responsavel: { select: USUARIO_RESUMO } } })
  return deepIso(completa)
}

export async function atualizarRetorno(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do retorno é obrigatório')
  const parsed = RetornoSchema.partial().parse(args)
  const db = getPrisma()
  const existente = await db.retorno.findUnique({ where: { id } })
  if (!existente) throw new AppError('Retorno não encontrado', 404)
  const r = await db.retorno.update({
    where: { id },
    data: {
      ...(parsed.clienteId !== undefined ? { clienteId: parsed.clienteId || null } : {}),
      ...(parsed.contato !== undefined ? { contato: parsed.contato || null } : {}),
      ...(parsed.assunto !== undefined ? { assunto: parsed.assunto } : {}),
      ...(parsed.dataPrevista !== undefined
        ? { dataPrevista: parsed.dataPrevista ? parseISO(parsed.dataPrevista) : null }
        : {}),
      ...(parsed.horario !== undefined ? { horario: parsed.horario || null } : {}),
      ...(parsed.responsavelId !== undefined ? { responsavelId: parsed.responsavelId || null } : {}),
      ...(parsed.observacao !== undefined ? { observacao: parsed.observacao || null } : {})
    }
  })
  await registrarHistorico({
    entidade: 'retorno',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'ALTERACAO',
    descricao: `Retorno "${r.assunto}" atualizado`
  })
  const completa = await db.retorno.findUnique({ where: { id }, include: { cliente: true, responsavel: { select: USUARIO_RESUMO } } })
  return deepIso(completa)
}

export async function alterarStatusRetorno(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  const status = String(args.status || '')
  if (!RETORNO_STATUS.includes(status as RetornoStatus)) throw new AppError('Status inválido')
  const db = getPrisma()
  const existente = await db.retorno.findUnique({ where: { id } })
  if (!existente) throw new AppError('Retorno não encontrado', 404)
  const r = await db.retorno.update({
    where: { id },
    data: { status, concluidoEm: status === 'CONCLUIDO' ? new Date() : null }
  })
  await registrarHistorico({
    entidade: 'retorno',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'STATUS',
    descricao: `Status do retorno "${r.assunto}" alterado para ${status}`
  })
  const completa = await db.retorno.findUnique({ where: { id }, include: { cliente: true, responsavel: { select: USUARIO_RESUMO } } })
  return deepIso(completa)
}

export async function excluirRetorno(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do retorno é obrigatório')
  const db = getPrisma()
  const existente = await db.retorno.findUnique({ where: { id } })
  if (!existente) throw new AppError('Retorno não encontrado', 404)
  await registrarHistorico({
    entidade: 'retorno',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Retorno "${existente.assunto}" excluído`
  })
  await db.retorno.delete({ where: { id } })
  return { ok: true }
}
