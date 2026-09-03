import { z } from 'zod'
import { getPrisma } from '../db'
import { AppError } from '../auth'
import type { ApiContext } from '@shared/types'
import { deepIso } from '../helpers'
import { registrarHistorico } from './historico.service'

const NotaSchema = z.object({
  titulo: z.string().max(120).optional().nullable(),
  conteudo: z.string().max(100000).optional().nullable(),
  clienteId: z.string().optional().nullable(),
  projetoId: z.string().optional().nullable(),
  pendenciaId: z.string().optional().nullable(),
  compromissoId: z.string().optional().nullable()
})

export async function listarNotas(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const busca = args.busca ? String(args.busca).toLowerCase() : ''
  const clienteId = args.clienteId ? String(args.clienteId) : ''
  const projetoId = args.projetoId ? String(args.projetoId) : ''
  const pendenciaId = args.pendenciaId ? String(args.pendenciaId) : ''
  const compromissoId = args.compromissoId ? String(args.compromissoId) : ''
  const itens = await db.nota.findMany({
    where: {
      usuarioId: ctx.usuarioId,
      ...(busca ? { OR: [{ titulo: { contains: busca } }, { conteudo: { contains: busca } }] } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(projetoId ? { projetoId } : {}),
      ...(pendenciaId ? { pendenciaId } : {}),
      ...(compromissoId ? { compromissoId } : {})
    },
    include: { usuario: { select: { id: true, nome: true, avatar: true } }, cliente: true },
    orderBy: { atualizadoEm: 'desc' }
  })
  return deepIso(itens)
}

export async function obterNota(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const n = await db.nota.findUnique({ where: { id }, include: { usuario: true, cliente: true } })
  if (!n) throw new AppError('Nota não encontrada', 404)
  if (n.usuarioId !== ctx.usuarioId) throw new AppError('Sem permissão', 403)
  return deepIso(n)
}

export async function criarNota(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const parsed = NotaSchema.parse(args)
  const db = getPrisma()
  const titulo = parsed.titulo?.trim() || parsed.conteudo?.trim().split('\n')[0].slice(0, 120) || 'Nota sem título'
  const n = await db.nota.create({
    data: {
      titulo,
      conteudo: parsed.conteudo || null,
      clienteId: parsed.clienteId || null,
      projetoId: parsed.projetoId || null,
      pendenciaId: parsed.pendenciaId || null,
      compromissoId: parsed.compromissoId || null,
      usuarioId: ctx.usuarioId
    },
    include: { usuario: { select: { id: true, nome: true, avatar: true } } }
  })
  await registrarHistorico({
    entidade: 'nota',
    entidadeId: n.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Nota "${n.titulo}" criada`
  })
  return deepIso(n)
}

export async function atualizarNota(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  if (!id) throw new AppError('ID da nota é obrigatório')
  const parsed = NotaSchema.partial().parse(args)
  const db = getPrisma()
  const existente = await db.nota.findUnique({ where: { id } })
  if (!existente) throw new AppError('Nota não encontrada', 404)
  if (existente.usuarioId !== ctx.usuarioId && !ctx.isAdmin) throw new AppError('Sem permissão', 403)
  const titulo = parsed.titulo?.trim() || parsed.conteudo?.trim().split('\n')[0].slice(0, 120) || 'Nota sem título'
  const n = await db.nota.update({
    where: { id },
    data: {
      ...(parsed.titulo !== undefined || parsed.conteudo !== undefined ? { titulo } : {}),
      ...(parsed.conteudo !== undefined ? { conteudo: parsed.conteudo || null } : {}),
      ...(parsed.clienteId !== undefined ? { clienteId: parsed.clienteId || null } : {}),
      ...(parsed.projetoId !== undefined ? { projetoId: parsed.projetoId || null } : {}),
      ...(parsed.pendenciaId !== undefined ? { pendenciaId: parsed.pendenciaId || null } : {}),
      ...(parsed.compromissoId !== undefined ? { compromissoId: parsed.compromissoId || null } : {})
    },
    include: { usuario: { select: { id: true, nome: true, avatar: true } } }
  })
  return deepIso(n)
}

export async function excluirNota(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const n = await db.nota.findUnique({ where: { id } })
  if (!n) throw new AppError('Nota não encontrada', 404)
  if (n.usuarioId !== ctx.usuarioId && !ctx.isAdmin) throw new AppError('Sem permissão', 403)
  await db.nota.delete({ where: { id } })
  return { ok: true }
}
