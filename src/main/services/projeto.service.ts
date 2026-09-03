import { z } from 'zod'
import { getPrisma } from '../db'
import { USUARIO_RESUMO } from './resumo'
import { AppError, requireEmpresa } from '../auth'
import { PROJETO_STATUS } from '@shared/constants'
import type { ApiContext } from '@shared/types'
import { deepIso } from '../helpers'
import { registrarHistorico } from './historico.service'

const ProjetoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(120),
  descricao: z.string().max(2000).optional().nullable(),
  status: z.enum(PROJETO_STATUS as [string, ...string[]]).optional(),
  responsavelId: z.string().optional().nullable(),
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  dataInicio: z.string().optional().nullable(),
  dataFim: z.string().optional().nullable()
})

export async function listarProjetos(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const empresaId = requireEmpresa(ctx)
  const db = getPrisma()
  const busca = args.busca ? String(args.busca).toLowerCase() : ''
  const status = args.status ? String(args.status) : ''
  const itens = await db.projeto.findMany({
    where: {
      cliente: { empresaId },
      ...(busca ? { OR: [{ nome: { contains: busca } }, { descricao: { contains: busca } }] } : {}),
      ...(status ? { status } : {})
    },
    include: { cliente: true, responsavel: { select: USUARIO_RESUMO } },
    orderBy: { nome: 'asc' }
  })
  const pendencias = await db.pendencia.findMany({
    where: { projetoId: { in: itens.map((p) => p.id) }, status: { notIn: ['CANCELADA'] } },
    select: { projetoId: true, status: true }
  })
  const contadores = new Map<string, { total: number; concluidas: number }>()
  for (const p of pendencias) {
    if (!p.projetoId) continue
    const atual = contadores.get(p.projetoId) || { total: 0, concluidas: 0 }
    atual.total += 1
    if (p.status === 'CONCLUIDA') atual.concluidas += 1
    contadores.set(p.projetoId, atual)
  }
  const comDados = itens.map((p) => {
    const atual = contadores.get(p.id) || { total: 0, concluidas: 0 }
    return { ...p, totalPendencias: atual.total, concluidas: atual.concluidas, progresso: atual.total === 0 ? 0 : Math.round((atual.concluidas / atual.total) * 100) }
  })
  return deepIso(comDados)
}

export async function obterProjeto(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const empresaId = requireEmpresa(ctx)
  const db = getPrisma()
  const id = String(args.id || '')
  const p = await db.projeto.findFirst({
    where: { id, cliente: { empresaId } },
    include: { cliente: true, responsavel: { select: USUARIO_RESUMO } }
  })
  if (!p) throw new AppError('Projeto não encontrado', 404)
  const pendencias = await db.pendencia.findMany({
    where: { projetoId: id },
    include: { tags: { include: { tag: true } }, responsavel: { select: USUARIO_RESUMO } },
    orderBy: { prazo: 'asc' }
  })
  return deepIso({ ...p, pendencias })
}

export async function criarProjeto(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const empresaId = requireEmpresa(ctx)
  const parsed = ProjetoSchema.parse(args)
  const db = getPrisma()
  const cliente = await db.cliente.findFirst({ where: { id: parsed.clienteId, empresaId }, select: { id: true } })
  if (!cliente) throw new AppError('Cliente não encontrado na empresa atual', 404)
  if (parsed.responsavelId) {
    const responsavel = await db.usuario.findFirst({ where: { id: parsed.responsavelId, empresaId }, select: { id: true } })
    if (!responsavel) throw new AppError('Responsável não encontrado na empresa atual', 404)
  }
  const p = await db.projeto.create({
    data: {
      nome: parsed.nome,
      descricao: parsed.descricao || null,
      status: parsed.status || 'ATIVO',
      responsavelId: parsed.responsavelId || null,
      clienteId: parsed.clienteId || null,
      dataInicio: parsed.dataInicio ? new Date(parsed.dataInicio) : null,
      dataFim: parsed.dataFim ? new Date(parsed.dataFim) : null
    }
  })
  await registrarHistorico({
    entidade: 'projeto',
    entidadeId: p.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Projeto "${p.nome}" criado`
  })
  return deepIso(p)
}

export async function atualizarProjeto(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const empresaId = requireEmpresa(ctx)
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do projeto é obrigatório')
  const parsed = ProjetoSchema.partial().parse(args)
  const db = getPrisma()
  const existente = await db.projeto.findFirst({ where: { id, cliente: { empresaId } } })
  if (!existente) throw new AppError('Projeto não encontrado', 404)
  const p = await db.projeto.update({
    where: { id },
    data: {
      ...(parsed.nome !== undefined ? { nome: parsed.nome } : {}),
      ...(parsed.descricao !== undefined ? { descricao: parsed.descricao || null } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.responsavelId !== undefined ? { responsavelId: parsed.responsavelId || null } : {}),
      ...(parsed.clienteId !== undefined ? { clienteId: parsed.clienteId || null } : {}),
      ...(parsed.dataInicio !== undefined
        ? { dataInicio: parsed.dataInicio ? new Date(parsed.dataInicio) : null }
        : {}),
      ...(parsed.dataFim !== undefined ? { dataFim: parsed.dataFim ? new Date(parsed.dataFim) : null } : {})
    }
  })
  await registrarHistorico({
    entidade: 'projeto',
    entidadeId: p.id,
    usuarioId: ctx.usuarioId,
    tipo: 'ALTERACAO',
    descricao: `Projeto "${p.nome}" atualizado`
  })
  return deepIso(p)
}

export async function excluirProjeto(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const empresaId = requireEmpresa(ctx)
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do projeto é obrigatório')
  const db = getPrisma()
  const existente = await db.projeto.findFirst({ where: { id, cliente: { empresaId } } })
  if (!existente) throw new AppError('Projeto não encontrado', 404)
  await db.$transaction([
    db.pendencia.updateMany({ where: { projetoId: id }, data: { projetoId: null } }),
    db.compromisso.updateMany({ where: { projetoId: id }, data: { projetoId: null } }),
    db.nota.updateMany({ where: { projetoId: id }, data: { projetoId: null } }),
    db.projeto.delete({ where: { id } })
  ])
  await registrarHistorico({
    entidade: 'projeto',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Projeto "${existente.nome}" excluído`
  })
  return { ok: true }
}
