import { z } from 'zod'
import { getPrisma } from '../db'
import { USUARIO_RESUMO } from './resumo'
import { AppError } from '../auth'
import type { ApiContext, DadosClienteDetail } from '@shared/types'
import { deepIso, isAtrasada } from '../helpers'
import { registrarHistorico } from './historico.service'

const ClienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(120),
  empresa: z.string().max(120).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  contato: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  telefone: z.string().max(30).optional().nullable(),
  sistema: z.string().max(120).optional().nullable(),
  projeto: z.string().max(120).optional().nullable(),
  responsavelInterno: z.string().max(120).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable()
})

export async function listarClientes(args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const busca = args.busca ? String(args.busca).toLowerCase() : ''
  const ativo = args.ativo !== false
  const itens = await db.cliente.findMany({
    where: {
      ativo,
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca } },
              { empresa: { contains: busca } },
              { contato: { contains: busca } },
              { email: { contains: busca } }
            ]
          }
        : {})
    },
    orderBy: { nome: 'asc' }
  })
  const comDados = await Promise.all(
    itens.map(async (c) => {
      const abertas = await db.pendencia.count({
        where: { clienteId: c.id, status: { notIn: ['CONCLUIDA', 'CANCELADA'] } }
      })
      const pendencias = await db.pendencia.findMany({
        where: { clienteId: c.id },
        select: { prazo: true, status: true }
      })
      const atrasadas = pendencias.filter((p) => isAtrasada(p.prazo, p.status)).length
      return { ...c, pendenciasAbertas: abertas, pendenciasAtrasadas: atrasadas }
    })
  )
  return deepIso(comDados)
}

export async function obterCliente(args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const c = await db.cliente.findUnique({ where: { id } })
  if (!c) throw new AppError('Cliente não encontrado', 404)
  return deepIso(c)
}

export async function detalheCliente(ctx: ApiContext, args: Record<string, unknown>): Promise<DadosClienteDetail> {
  const db = getPrisma()
  const id = String(args.id || '')
  const cliente = await db.cliente.findUnique({ where: { id } })
  if (!cliente) throw new AppError('Cliente não encontrado', 404)

  const pendencias = await db.pendencia.findMany({
    where: { clienteId: id },
    include: {
      responsavel: { select: USUARIO_RESUMO },
      projeto: true,
      tags: { include: { tag: true } }
    },
    orderBy: { prazo: 'asc' }
  })

  const abertas = pendencias.filter((p) => p.status !== 'CONCLUIDA' && p.status !== 'CANCELADA')
  const concluidas = pendencias.filter((p) => p.status === 'CONCLUIDA')
  const atrasadas = pendencias.filter((p) => isAtrasada(p.prazo, p.status))

  const compromissos = await db.compromisso.findMany({
    where: { clienteId: id },
    include: { responsavel: { select: USUARIO_RESUMO } },
    orderBy: { data: 'desc' }
  })
  const retornos = await db.retorno.findMany({
    where: { clienteId: id },
    include: { responsavel: { select: USUARIO_RESUMO } },
    orderBy: { dataPrevista: 'desc' }
  })
  const notas = await db.nota.findMany({
    where: { clienteId: id },
    include: { usuario: true },
    orderBy: { atualizadoEm: 'desc' }
  })

  return deepIso({
    cliente,
    pendencias,
    pendenciasAbertas: abertas.length,
    pendenciasConcluidas: concluidas.length,
    pendenciasAtrasadas: atrasadas.length,
    compromissos,
    retornos,
    notas
  })
}

export async function criarCliente(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const parsed = ClienteSchema.parse(args)
  const db = getPrisma()
  const c = await db.cliente.create({
    data: {
      nome: parsed.nome,
      empresa: parsed.empresa || null,
      cnpj: parsed.cnpj || null,
      contato: parsed.contato || null,
      email: parsed.email || null,
      telefone: parsed.telefone || null,
      sistema: parsed.sistema || null,
      projeto: parsed.projeto || null,
      responsavelInterno: parsed.responsavelInterno || null,
      observacoes: parsed.observacoes || null,
      empresaId: ctx.empresaId
    }
  })
  await registrarHistorico({
    entidade: 'cliente',
    entidadeId: c.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Cliente "${c.nome}" criado`
  })
  return deepIso(c)
}

export async function atualizarCliente(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do cliente é obrigatório')
  const parsed = ClienteSchema.partial().parse(args)
  const db = getPrisma()
  const existente = await db.cliente.findUnique({ where: { id } })
  if (!existente) throw new AppError('Cliente não encontrado', 404)
  const c = await db.cliente.update({
    where: { id },
    data: {
      ...(parsed.nome !== undefined ? { nome: parsed.nome } : {}),
      ...(parsed.empresa !== undefined ? { empresa: parsed.empresa || null } : {}),
      ...(parsed.cnpj !== undefined ? { cnpj: parsed.cnpj || null } : {}),
      ...(parsed.contato !== undefined ? { contato: parsed.contato || null } : {}),
      ...(parsed.email !== undefined ? { email: parsed.email || null } : {}),
      ...(parsed.telefone !== undefined ? { telefone: parsed.telefone || null } : {}),
      ...(parsed.sistema !== undefined ? { sistema: parsed.sistema || null } : {}),
      ...(parsed.projeto !== undefined ? { projeto: parsed.projeto || null } : {}),
      ...(parsed.responsavelInterno !== undefined ? { responsavelInterno: parsed.responsavelInterno || null } : {}),
      ...(parsed.observacoes !== undefined ? { observacoes: parsed.observacoes || null } : {})
    }
  })
  await registrarHistorico({
    entidade: 'cliente',
    entidadeId: c.id,
    usuarioId: ctx.usuarioId,
    tipo: 'ALTERACAO',
    descricao: `Cliente "${c.nome}" atualizado`
  })
  return deepIso(c)
}

export async function excluirCliente(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do cliente é obrigatório')
  const db = getPrisma()
  const existente = await db.cliente.findUnique({ where: { id } })
  if (!existente) throw new AppError('Cliente não encontrado', 404)
  await db.pendencia.updateMany({ where: { clienteId: id }, data: { clienteId: null } })
  await db.compromisso.updateMany({ where: { clienteId: id }, data: { clienteId: null } })
  await db.retorno.updateMany({ where: { clienteId: id }, data: { clienteId: null } })
  await db.nota.updateMany({ where: { clienteId: id }, data: { clienteId: null } })
  await db.cliente.update({ where: { id }, data: { ativo: false } })
  await registrarHistorico({
    entidade: 'cliente',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Cliente "${existente.nome}" desativado`
  })
  return { ok: true }
}
