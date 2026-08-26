import { z } from 'zod'
import { getPrisma } from '../db'
import { USUARIO_RESUMO } from './resumo'
import { AppError } from '../auth'
import { COMPROMISSO_STATUS, LEMBRETES_OPCOES } from '@shared/constants'
import type { ApiContext, CompromissoStatus } from '@shared/types'
import { deepIso, dataInicioDoDia, dataFimDoDia } from '../helpers'
import { registrarHistorico } from './historico.service'
import { criarNotificacao, notificacaoDesktop } from './notificacao.service'
import { parseISO, subMinutes } from 'date-fns'

const CompromissoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(200),
  clienteId: z.string().optional().nullable(),
  projetoId: z.string().optional().nullable(),
  responsavelId: z.string().optional().nullable(),
  data: z.string().min(1, 'Data é obrigatória'),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido').optional().nullable(),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido').optional().nullable(),
  local: z.string().max(200).optional().nullable(),
  link: z.string().max(500).optional().nullable(),
  participantes: z.string().max(1000).optional().nullable(),
  descricao: z.string().max(3000).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  lembreteMinutos: z.number().int().optional().nullable()
})

function validarLembrete(min: number | null): number | null {
  if (min === null || min === undefined) return null
  if (!LEMBRETES_OPCOES.some((o) => o.value === min)) throw new AppError('Opção de lembrete inválida')
  return min
}

export async function listarCompromissos(args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const busca = args.busca ? String(args.busca).toLowerCase() : ''
  const clienteId = args.clienteId ? String(args.clienteId) : ''
  const de = args.de ? parseISO(String(args.de)) : null
  const ate = args.ate ? parseISO(String(args.ate)) : null
  const itens = await db.compromisso.findMany({
    where: {
      ...(busca
        ? { OR: [{ titulo: { contains: busca } }, { descricao: { contains: busca } }, { local: { contains: busca } }] }
        : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(de ? { data: { gte: de } } : {}),
      ...(ate ? { data: { lte: dataFimDoDia(ate) } } : {})
    },
    include: { cliente: true, responsavel: { select: { id: true, nome: true, avatar: true } } },
    orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }]
  })
  return deepIso(itens)
}

export async function obterCompromisso(args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const c = await db.compromisso.findUnique({ where: { id }, include: { cliente: true, responsavel: { select: USUARIO_RESUMO } } })
  if (!c) throw new AppError('Compromisso não encontrado', 404)
  return deepIso(c)
}

export async function criarCompromisso(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const parsed = CompromissoSchema.parse(args)
  const lembreteMinutos = validarLembrete(parsed.lembreteMinutos ?? null)
  const db = getPrisma()
  const c = await db.compromisso.create({
    data: {
      titulo: parsed.titulo,
      clienteId: parsed.clienteId || null,
      projetoId: parsed.projetoId || null,
      responsavelId: parsed.responsavelId || ctx.usuarioId,
      data: parseISO(parsed.data),
      horaInicio: parsed.horaInicio || null,
      horaFim: parsed.horaFim || null,
      local: parsed.local || null,
      link: parsed.link || null,
      participantes: parsed.participantes || null,
      descricao: parsed.descricao || null,
      observacoes: parsed.observacoes || null,
      lembreteMinutos,
      status: 'AGENDADO'
    }
  })
  if (lembreteMinutos) {
    await db.lembrete.create({
      data: {
        usuarioId: c.responsavelId || ctx.usuarioId,
        entidade: 'compromisso',
        entidadeId: c.id,
        dataHora: subMinutes(new Date(c.data), lembreteMinutos),
        mensagem: `Compromisso "${c.titulo}" em breve${c.horaInicio ? ` às ${c.horaInicio}` : ''}.`
      }
    })
  }
  await registrarHistorico({
    entidade: 'compromisso',
    entidadeId: c.id,
    usuarioId: ctx.usuarioId,
    tipo: 'CRIACAO',
    descricao: `Compromisso "${c.titulo}" criado em ${new Date(c.data).toLocaleDateString('pt-BR')}`
  })
  if (c.responsavelId && c.responsavelId !== ctx.usuarioId) {
    await criarNotificacao({
      usuarioId: c.responsavelId,
      tipo: 'compromisso',
      titulo: 'Compromisso atribuído',
      mensagem: `"${c.titulo}" em ${new Date(c.data).toLocaleDateString('pt-BR')}.`,
      relacionadoId: c.id
    })
  }
  const completa = await db.compromisso.findUnique({ where: { id: c.id }, include: { cliente: true, responsavel: { select: USUARIO_RESUMO } } })
  return deepIso(completa)
}

export async function atualizarCompromisso(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do compromisso é obrigatório')
  const parsed = CompromissoSchema.partial().parse(args)
  const lembreteMinutos = parsed.lembreteMinutos !== undefined ? validarLembrete(parsed.lembreteMinutos ?? null) : undefined
  const db = getPrisma()
  const existente = await db.compromisso.findUnique({ where: { id } })
  if (!existente) throw new AppError('Compromisso não encontrado', 404)
  const c = await db.compromisso.update({
    where: { id },
    data: {
      ...(parsed.titulo !== undefined ? { titulo: parsed.titulo } : {}),
      ...(parsed.clienteId !== undefined ? { clienteId: parsed.clienteId || null } : {}),
      ...(parsed.projetoId !== undefined ? { projetoId: parsed.projetoId || null } : {}),
      ...(parsed.responsavelId !== undefined ? { responsavelId: parsed.responsavelId || null } : {}),
      ...(parsed.data !== undefined ? { data: parseISO(parsed.data) } : {}),
      ...(parsed.horaInicio !== undefined ? { horaInicio: parsed.horaInicio || null } : {}),
      ...(parsed.horaFim !== undefined ? { horaFim: parsed.horaFim || null } : {}),
      ...(parsed.local !== undefined ? { local: parsed.local || null } : {}),
      ...(parsed.link !== undefined ? { link: parsed.link || null } : {}),
      ...(parsed.participantes !== undefined ? { participantes: parsed.participantes || null } : {}),
      ...(parsed.descricao !== undefined ? { descricao: parsed.descricao || null } : {}),
      ...(parsed.observacoes !== undefined ? { observacoes: parsed.observacoes || null } : {}),
      ...(lembreteMinutos !== undefined ? { lembreteMinutos } : {})
    }
  })
  if (lembreteMinutos !== undefined) {
    await db.lembrete.deleteMany({ where: { entidade: 'compromisso', entidadeId: id } })
    if (lembreteMinutos) {
      await db.lembrete.create({
        data: {
          usuarioId: c.responsavelId || ctx.usuarioId,
          entidade: 'compromisso',
          entidadeId: c.id,
          dataHora: subMinutes(new Date(c.data), lembreteMinutos),
          mensagem: `Compromisso "${c.titulo}" em breve${c.horaInicio ? ` às ${c.horaInicio}` : ''}.`
        }
      })
    }
  }
  await registrarHistorico({
    entidade: 'compromisso',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'ALTERACAO',
    descricao: `Compromisso "${c.titulo}" atualizado`
  })
  const completa = await db.compromisso.findUnique({ where: { id }, include: { cliente: true, responsavel: { select: USUARIO_RESUMO } } })
  return deepIso(completa)
}

export async function alterarStatusCompromisso(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  const status = String(args.status || '')
  if (!COMPROMISSO_STATUS.includes(status as CompromissoStatus)) throw new AppError('Status inválido')
  const db = getPrisma()
  const existente = await db.compromisso.findUnique({ where: { id } })
  if (!existente) throw new AppError('Compromisso não encontrado', 404)
  const c = await db.compromisso.update({ where: { id }, data: { status } })
  await registrarHistorico({
    entidade: 'compromisso',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'STATUS',
    descricao: `Status do compromisso "${c.titulo}" alterado para ${status}`
  })
  return deepIso(c)
}

export async function excluirCompromisso(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.id || '')
  if (!id) throw new AppError('ID do compromisso é obrigatório')
  const db = getPrisma()
  const existente = await db.compromisso.findUnique({ where: { id } })
  if (!existente) throw new AppError('Compromisso não encontrado', 404)
  await db.lembrete.deleteMany({ where: { entidade: 'compromisso', entidadeId: id } })
  await registrarHistorico({
    entidade: 'compromisso',
    entidadeId: id,
    usuarioId: ctx.usuarioId,
    tipo: 'EXCLUSAO',
    descricao: `Compromisso "${existente.titulo}" excluído`
  })
  await db.compromisso.delete({ where: { id } })
  return { ok: true }
}

export async function compromissosNoIntervalo(args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const de = parseISO(String(args.de || ''))
  const ate = parseISO(String(args.ate || ''))
  const itens = await db.compromisso.findMany({
    where: { data: { gte: dataInicioDoDia(de), lte: dataFimDoDia(ate) } },
    include: { cliente: { select: { id: true, nome: true } } },
    orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }]
  })
  return deepIso(itens)
}

export function dispararLembretesCompromisso(): void {
  void (async () => {
    const db = getPrisma()
    const agora = new Date()
    const candidatos = await db.compromisso.findMany({
      where: { lembreteMinutos: { not: null }, lembreteDisparado: false }
    })
    for (const c of candidatos) {
      const inicio = new Date(c.data)
      const disparo = new Date(inicio.getTime() - (c.lembreteMinutos || 0) * 60000)
      if (disparo <= agora) {
        if (c.responsavelId) {
          await criarNotificacao({
            usuarioId: c.responsavelId,
            tipo: 'compromisso',
            titulo: 'Compromisso em breve',
            mensagem: `"${c.titulo}"${c.horaInicio ? ` às ${c.horaInicio}` : ''}.`,
            relacionadoId: c.id
          })
          notificacaoDesktop('Compromisso em breve', c.titulo)
        }
        await db.compromisso.update({ where: { id: c.id }, data: { lembreteDisparado: true } })
      }
    }
  })()
}
