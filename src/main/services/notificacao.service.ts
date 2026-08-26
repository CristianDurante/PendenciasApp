import { getPrisma } from '../db'
import type { ApiContext } from '@shared/types'
import { deepIso, dataInicioDoDia, dataFimDoDia, isAtrasada } from '../helpers'
import { AppError } from '../auth'

export interface NotificacaoInput {
  usuarioId: string
  tipo: string
  titulo: string
  mensagem?: string
  relacionadoId?: string | null
}

export function notificacaoDesktop(titulo: string, body: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electronMod = require('electron') as {
      Notification?: {
        isSupported: () => boolean
        new (options: { title: string; body: string }): { show: () => void }
      }
    }
    const Notification = electronMod.Notification
    if (Notification && Notification.isSupported && Notification.isSupported()) {
      const n = new Notification({ title: titulo, body })
      n.show()
    }
  } catch {
    // sem display / fora do electron
  }
}

export async function criarNotificacao(input: NotificacaoInput): Promise<void> {
  const db = getPrisma()
  await db.notificacao.create({
    data: {
      usuarioId: input.usuarioId,
      tipo: input.tipo,
      titulo: input.titulo,
      mensagem: input.mensagem || null,
      relacionadoId: input.relacionadoId || null
    }
  })
}

export async function listarNotificacoes(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const naoLidas = args.naoLidas === true
  const itens = await db.notificacao.findMany({
    where: { usuarioId: ctx.usuarioId, ...(naoLidas ? { lida: false } : {}) },
    orderBy: { criadoEm: 'desc' },
    take: 100
  })
  const naoLidasCount = await db.notificacao.count({ where: { usuarioId: ctx.usuarioId, lida: false } })
  return deepIso({ itens, naoLidas: naoLidasCount })
}

export async function marcarNotificacaoLida(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  if (id === 'all') {
    await db.notificacao.updateMany({ where: { usuarioId: ctx.usuarioId }, data: { lida: true } })
    return { ok: true }
  }
  const n = await db.notificacao.findFirst({ where: { id, usuarioId: ctx.usuarioId } })
  if (!n) throw new AppError('Notificação não encontrada', 404)
  await db.notificacao.update({ where: { id }, data: { lida: true } })
  return { ok: true }
}

export async function gerarNotificacoesPendentes(usuarioId: string): Promise<number> {
  const db = getPrisma()
  let criadas = 0
  const hojeInicio = dataInicioDoDia()
  const hojeFim = dataFimDoDia()
  const amanhaFim = dataFimDoDia(new Date(Date.now() + 86400000))

  const jaExiste = async (tipo: string, relacionadoId: string | null): Promise<boolean> => {
    const n = await db.notificacao.findFirst({
      where: { usuarioId, tipo, relacionadoId: relacionadoId ?? null, criadoEm: { gte: hojeInicio } }
    })
    return !!n
  }

  // Pendencias atrasadas do usuario
  const atrasadas = await db.pendencia.findMany({
    where: {
      responsavelId: usuarioId,
      status: { notIn: ['CONCLUIDA', 'CANCELADA'] }
    }
  })
  for (const p of atrasadas) {
    if (isAtrasada(p.prazo, p.status)) {
      if (!(await jaExiste('prazo', `atrasada:${p.id}`))) {
        await criarNotificacao({
          usuarioId,
          tipo: 'prazo',
          titulo: 'Pendência atrasada',
          mensagem: `"${p.titulo}" está atrasada${p.prazo ? ` (prazo ${p.prazo.toLocaleDateString('pt-BR')})` : ''}.`,
          relacionadoId: `atrasada:${p.id}`
        })
        notificacaoDesktop('Pendência atrasada', `"${p.titulo}" está atrasada.`)
        criadas++
      }
    }
  }

  // Prazos de hoje e amanha
  const prazos = await db.pendencia.findMany({
    where: {
      responsavelId: usuarioId,
      prazo: { gte: hojeInicio, lte: amanhaFim },
      status: { notIn: ['CONCLUIDA', 'CANCELADA'] }
    }
  })
  for (const p of prazos) {
    const chave = `prazo:${p.id}`
    if (!(await jaExiste('prazo', chave))) {
      const texto = p.prazo
        ? (p.prazo >= hojeInicio && p.prazo <= hojeFim ? 'vence hoje' : 'vence em breve')
        : ''
      await criarNotificacao({
        usuarioId,
        tipo: 'prazo',
        titulo: 'Prazo próximo',
        mensagem: `"${p.titulo}" ${texto}.`,
        relacionadoId: chave
      })
      criadas++
    }
  }

  // Compromissos hoje
  const compromissos = await db.compromisso.findMany({
    where: {
      OR: [{ responsavelId: usuarioId }, { participantes: { contains: usuarioId } }],
      data: { gte: hojeInicio, lte: hojeFim },
      status: { in: ['AGENDADO', 'CONFIRMADO'] }
    }
  })
  for (const c of compromissos) {
    const chave = `compromisso:${c.id}`
    if (!(await jaExiste('compromisso', chave))) {
      const hora = c.horaInicio ? ` às ${c.horaInicio}` : ''
      await criarNotificacao({
        usuarioId,
        tipo: 'compromisso',
        titulo: 'Compromisso hoje',
        mensagem: `${c.titulo}${hora}${c.local ? ` em ${c.local}` : ''}.`,
        relacionadoId: chave
      })
      criadas++
    }
  }

  // Retornos pendentes/atrasados
  const retornos = await db.retorno.findMany({
    where: { responsavelId: usuarioId, status: { in: ['PENDENTE', 'EM_CONTATO', 'AGUARDANDO_CLIENTE'] } }
  })
  for (const r of retornos) {
    const atrasado = r.dataPrevista ? r.dataPrevista < hojeInicio : false
    const chave = `retorno:${r.id}`
    if (!(await jaExiste('retorno', chave))) {
      await criarNotificacao({
        usuarioId,
        tipo: 'retorno',
        titulo: atrasado ? 'Retorno atrasado' : 'Retorno pendente',
        mensagem: `"${r.assunto}"${atrasado ? ' está atrasado' : ' aguarda retorno'}.`,
        relacionadoId: chave
      })
      criadas++
    }
  }

  // Lembretes customizados vencidos
  const lembretes = await db.lembrete.findMany({
    where: { usuarioId, disparado: false, dataHora: { lte: new Date() } }
  })
  for (const l of lembretes) {
    await criarNotificacao({
      usuarioId,
      tipo: 'lembrete',
      titulo: 'Lembrete',
      mensagem: l.mensagem,
      relacionadoId: `lembrete:${l.id}`
    })
    await db.lembrete.update({ where: { id: l.id }, data: { disparado: true } })
    notificacaoDesktop('Lembrete', l.mensagem)
    criadas++
  }

  return criadas
}

export async function gerarNotificacoesParaTodos(): Promise<number> {
  const db = getPrisma()
  const usuarios = await db.usuario.findMany({ where: { ativo: true }, select: { id: true } })
  let total = 0
  for (const u of usuarios) {
    total += await gerarNotificacoesPendentes(u.id)
  }
  return total
}
