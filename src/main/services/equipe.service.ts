import { z } from 'zod'
import { getPrisma } from '../db'
import { AppError, requireRoles } from '../auth'
import type { ApiContext } from '@shared/types'
import { deepIso } from '../helpers'
import { registrarHistorico } from './historico.service'

export const EQUIPE_SEM_EQUIPE_ID = 'equipe-sem-equipe'

const EquipeCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(120),
  descricao: z.string().max(1000).optional().nullable(),
  liderId: z.string().optional().nullable(),
  usuarioIds: z.array(z.string()).optional().default([]),
  ativo: z.boolean().optional().default(true)
})

const EquipeUpdateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(120).optional(),
  descricao: z.string().max(1000).optional().nullable(),
  liderId: z.string().optional().nullable(),
  ativo: z.boolean().optional()
})

const select = {
  id: true,
  nome: true,
  descricao: true,
  liderId: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
  lider: { select: { id: true, nome: true, avatar: true } },
  _count: { select: { usuarios: true, pendencias: true } }
} as const

export async function listarEquipes(ctx: ApiContext): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const db = getPrisma()
  const itens = await db.equipe.findMany({
    select,
    orderBy: { nome: 'asc' }
  })
  return deepIso(
    itens.map((e) => ({
      ...e,
      quantidadeUsuarios: e._count.usuarios,
      quantidadePendencias: e._count.pendencias
    }))
  )
}

export async function obterEquipe(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const db = getPrisma()
  const id = String(args.id || '')
  const equipe = await db.equipe.findUnique({
    where: { id },
    include: {
      lider: { select: { id: true, nome: true, avatar: true, email: true, perfil: true } },
      usuarios: {
        select: { id: true, nome: true, email: true, avatar: true, ativo: true, perfil: true, cargo: true, _count: { select: { pendenciasCriadas: true } } },
        orderBy: { nome: 'asc' }
      }
    }
  })
  if (!equipe) throw new AppError('Equipe não encontrada', 404)
  const pendencias = await db.pendencia.findMany({
    where: { equipeId: id },
    include: { criador: { select: { id: true, nome: true, avatar: true } }, responsavel: { select: { id: true, nome: true, avatar: true } } },
    orderBy: { ultimaAtualizacao: 'desc' },
    take: 200
  })
  const usuarios = equipe.usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    avatar: u.avatar,
    ativo: u.ativo,
    perfil: u.perfil,
    cargo: u.cargo,
    quantidadePendencias: u._count.pendenciasCriadas
  }))
  return deepIso({
    id: equipe.id,
    nome: equipe.nome,
    descricao: equipe.descricao,
    liderId: equipe.liderId,
    ativo: equipe.ativo,
    criadoEm: equipe.criadoEm,
    atualizadoEm: equipe.atualizadoEm,
    lider: equipe.lider,
    usuarios,
    pendencias
  })
}

async function validarLiderNaEquipe(db: ReturnType<typeof getPrisma>, equipeId: string, liderId: string | null): Promise<void> {
  if (!liderId) return
  const lider = await db.usuario.findUnique({ where: { id: liderId } })
  if (!lider) throw new AppError('Líder informado não existe')
  if (lider.equipeId !== equipeId) {
    throw new AppError('O líder deve pertencer à própria equipe')
  }
}

export async function criarEquipe(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const parsed = EquipeCreateSchema.parse(args)
  const db = getPrisma()
  const nome = parsed.nome.trim()
  const duplicado = await db.equipe.findFirst({ where: { nome } })
  if (duplicado) throw new AppError('Já existe uma equipe com este nome')

  const equipe = await db.equipe.create({
    data: { nome, descricao: parsed.descricao || null, ativo: parsed.ativo }
  })

  const ids = Array.from(new Set(parsed.usuarioIds || []))
  if (ids.length) {
    await db.usuario.updateMany({ where: { id: { in: ids } }, data: { equipeId: equipe.id } })
  }

  if (parsed.liderId) {
    if (!ids.includes(parsed.liderId)) {
      await db.usuario.updateMany({ where: { id: parsed.liderId }, data: { equipeId: equipe.id } })
    }
    await validarLiderNaEquipe(db, equipe.id, parsed.liderId)
    await db.equipe.update({ where: { id: equipe.id }, data: { liderId: parsed.liderId } })
  }

  await registrarHistorico({
    entidade: 'equipe',
    entidadeId: equipe.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Equipe "${equipe.nome}" criada`
  })

  return obterEquipe(ctx, { id: equipe.id })
}

export async function atualizarEquipe(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const parsed = EquipeUpdateSchema.parse(args)
  const db = getPrisma()
  const id = String(args.id || '')
  const equipe = await db.equipe.findUnique({ where: { id } })
  if (!equipe) throw new AppError('Equipe não encontrada', 404)

  if (parsed.nome !== undefined) {
    const nome = parsed.nome.trim()
    const duplicado = await db.equipe.findFirst({ where: { nome, id: { not: id } } })
    if (duplicado) throw new AppError('Já existe uma equipe com este nome')
  }

  if (parsed.liderId !== undefined) {
    await validarLiderNaEquipe(db, id, parsed.liderId)
  }

  const data: Record<string, unknown> = {}
  if (parsed.nome !== undefined) data.nome = parsed.nome.trim()
  if (parsed.descricao !== undefined) data.descricao = parsed.descricao || null
  if (parsed.ativo !== undefined) data.ativo = parsed.ativo
  if (parsed.liderId !== undefined) data.liderId = parsed.liderId
  if (parsed.liderId === null) data.liderId = null

  await db.equipe.update({ where: { id }, data })

  const mudancas: string[] = []
  if (parsed.nome !== undefined && parsed.nome.trim() !== equipe.nome) mudancas.push(`nome de "${equipe.nome}" para "${parsed.nome.trim()}"`)
  if (parsed.ativo !== undefined && parsed.ativo !== equipe.ativo) mudancas.push(parsed.ativo ? 'equipe ativada' : 'equipe desativada')
  if (parsed.liderId !== undefined && parsed.liderId !== equipe.liderId) {
    const nomeLider = parsed.liderId ? (await db.usuario.findUnique({ where: { id: parsed.liderId } }))?.nome : null
    mudancas.push(`líder alterado para ${nomeLider || 'ninguém'}`)
  }

  if (mudancas.length) {
    await registrarHistorico({
      entidade: 'equipe',
      entidadeId: id,
      usuarioId: ctx.usuarioId,
      tipo: 'ALTERACAO',
      descricao: `Equipe atualizada: ${mudancas.join('; ')}`
    })
  }

  return obterEquipe(ctx, { id })
}

export async function gerenciarMembros(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const db = getPrisma()
  const id = String(args.id || '')
  const equipe = await db.equipe.findUnique({ where: { id } })
  if (!equipe) throw new AppError('Equipe não encontrada', 404)
  const usuarioIds = Array.from(new Set((args.usuarioIds as string[] | undefined) || []))

  const atuais = await db.usuario.findMany({ where: { equipeId: id }, select: { id: true } })
  const idsAtuais = new Set(atuais.map((u) => u.id))

  const remover = atuais.filter((u) => !usuarioIds.includes(u.id))
  if (equipe.liderId && remover.some((u) => u.id === equipe.liderId)) {
    throw new AppError('Não é possível remover o líder da equipe sem antes definir um novo líder')
  }
  const adicionar = usuarioIds.filter((idUsuario) => !idsAtuais.has(idUsuario))

  if (adicionar.length) {
    await db.usuario.updateMany({ where: { id: { in: adicionar } }, data: { equipeId: id } })
  }
  if (remover.length) {
    await db.usuario.updateMany({ where: { id: { in: remover.map((u) => u.id) } }, data: { equipeId: EQUIPE_SEM_EQUIPE_ID } })
  }

  if (adicionar.length || remover.length) {
    await registrarHistorico({
      entidade: 'equipe',
      entidadeId: id,
      usuarioId: ctx.usuarioId,
      tipo: 'ALTERACAO',
      descricao: `Membros da equipe atualizados (+${adicionar.length}, -${remover.length})`
    })
  }

  return obterEquipe(ctx, { id })
}

export async function excluirEquipe(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const db = getPrisma()
  const id = String(args.id || '')
  const equipe = await db.equipe.findUnique({
    where: { id },
    include: { _count: { select: { pendencias: true, usuarios: true } } }
  })
  if (!equipe) throw new AppError('Equipe não encontrada', 404)
  if (id === EQUIPE_SEM_EQUIPE_ID) {
    throw new AppError('A equipe "Sem equipe" não pode ser excluída')
  }
  if (equipe._count.pendencias > 0) {
    throw new AppError(`Não é possível excluir a equipe pois ela possui ${equipe._count.pendencias} pendência(s). Transfira as pendências antes de excluir.`)
  }
  await registrarHistorico({
    entidade: 'equipe',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Equipe "${equipe.nome}" excluída`
  })
  if (equipe._count.usuarios > 0) {
    await db.usuario.updateMany({ where: { equipeId: id }, data: { equipeId: EQUIPE_SEM_EQUIPE_ID } })
  }
  await db.equipe.delete({ where: { id } })
  return { ok: true }
}
