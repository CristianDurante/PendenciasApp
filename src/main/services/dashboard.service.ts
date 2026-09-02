import { getPrisma } from '../db'
import { temAcessoGlobal } from '../auth'
import type { ApiContext, DadosDashboard } from '@shared/types'
import { deepIso, isAtrasada, dataInicioDoDia, dataFimDoDia, addDias } from '../helpers'
import { pendenciaInclude } from './pendencia.service'
import { historicoGlobal } from './historico.service'

function conta(lista: Array<{ prazo: Date | null; status: string }>, cond: (prazo: Date | null, status: string) => boolean): number {
  return lista.filter((i) => cond(i.prazo, i.status)).length
}

export async function obterDashboard(ctx: ApiContext, args: Record<string, unknown> = {}): Promise<DadosDashboard> {
  const db = getPrisma()
  const hojeInicio = dataInicioDoDia()
  const hojeFim = dataFimDoDia()
  const proxFim = dataFimDoDia(addDias(new Date(), 7))

  const ondeEquipe =
    !temAcessoGlobal(ctx) && ctx.equipeId ? { equipeId: ctx.equipeId } : temAcessoGlobal(ctx) && args.equipeId ? { equipeId: String(args.equipeId) } : {}

  const todas = await db.pendencia.findMany({
    where: ondeEquipe,
    include: {
      cliente: true,
      projeto: true,
      responsavel: { select: { id: true, nome: true, avatar: true } },
      categoria: true,
      tags: { include: { tag: true } },
      checklist: true,
      criador: { select: { id: true, nome: true, avatar: true } }
    }
  })

  const abertas = todas.filter((p) => p.status !== 'CONCLUIDA' && p.status !== 'CANCELADA')
  const atrasadas = abertas.filter((p) => isAtrasada(p.prazo, p.status))
  const hoje = abertas.filter((p) => p.prazo && p.prazo >= hojeInicio && p.prazo <= hojeFim)
  const proximas = abertas.filter((p) => p.prazo && p.prazo > hojeFim && p.prazo <= proxFim)

  const contadores = {
    atrasadas: atrasadas.length,
    hoje: hoje.length,
    proximas: proximas.length,
    emAndamento: todas.filter((p) => p.status === 'EM_ANDAMENTO').length,
    aguardandoRetorno: todas.filter((p) => p.status === 'AGUARDANDO_RETORNO').length,
    concluidas: todas.filter((p) => p.status === 'CONCLUIDA').length,
    semResponsavel: abertas.filter((p) => !p.responsavelId).length
  }

  const porClienteMap = new Map<string, number>()
  const porProjetoMap = new Map<string, number>()
  const porPrioridadeMap = new Map<string, number>()
  const porStatusMap = new Map<string, number>()
  const porCategoriaMap = new Map<string, number>()
  const porTagMap = new Map<string, { tag: unknown; valor: number }>()
  const porEquipeMap = new Map<string, number>()

  for (const p of todas) {
    if (p.status === 'CANCELADA') continue
    const cliente = p.cliente?.nome || 'Sem cliente'
    porClienteMap.set(cliente, (porClienteMap.get(cliente) || 0) + 1)
    const projeto = p.projeto?.nome || 'Sem projeto'
    porProjetoMap.set(projeto, (porProjetoMap.get(projeto) || 0) + 1)
    porPrioridadeMap.set(p.prioridade, (porPrioridadeMap.get(p.prioridade) || 0) + 1)
    porStatusMap.set(p.status, (porStatusMap.get(p.status) || 0) + 1)
    const cat = p.categoria?.nome || 'Sem categoria'
    porCategoriaMap.set(cat, (porCategoriaMap.get(cat) || 0) + 1)
    const equipe = p.equipeId || 'sem-equipe'
    porEquipeMap.set(equipe, (porEquipeMap.get(equipe) || 0) + 1)
    for (const pt of p.tags) {
      const cur = porTagMap.get(pt.tag.id)
      if (cur) cur.valor += 1
      else porTagMap.set(pt.tag.id, { tag: pt.tag, valor: 1 })
    }
  }

  const ordenar = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8)

  const equipesIds = [...porEquipeMap.keys()]
  const equipesResolvidas = equipesIds.length
    ? await db.equipe.findMany({ where: { id: { in: equipesIds } }, select: { id: true, nome: true } })
    : []
  const nomeEquipe = new Map<string, string>(equipesResolvidas.map((e) => [e.id, e.nome]))
  const porEquipe = [...porEquipeMap.entries()]
    .map(([id, valor]) => ({ label: nomeEquipe.get(id) || 'Sem equipe', valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8)

  const retornos = await db.retorno.findMany({
    where: { status: { in: ['PENDENTE', 'EM_CONTATO', 'AGUARDANDO_CLIENTE'] } },
    include: { cliente: { select: { id: true, nome: true } }, responsavel: { select: { id: true, nome: true } } },
    orderBy: [{ dataPrevista: 'asc' }]
  })
  const retornosPendentes = retornos.filter((r) => !r.dataPrevista || r.dataPrevista >= hojeInicio)
  const retornosAtrasados = retornos.filter((r) => r.dataPrevista && r.dataPrevista < hojeInicio)

  const compromissosHoje = await db.compromisso.findMany({
    where: { data: { gte: hojeInicio, lte: hojeFim }, status: { in: ['AGENDADO', 'CONFIRMADO'] } },
    include: { cliente: { select: { id: true, nome: true } }, responsavel: { select: { id: true, nome: true, avatar: true } } },
    orderBy: [{ horaInicio: 'asc' }]
  })
  const proximosCompromissos = await db.compromisso.findMany({
    where: { data: { gt: hojeFim, lte: proxFim }, status: { in: ['AGENDADO', 'CONFIRMADO'] } },
    include: { cliente: { select: { id: true, nome: true } }, responsavel: { select: { id: true, nome: true, avatar: true } } },
    orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }],
    take: 10
  })

  const lembretes = await db.lembrete.findMany({
    where: { usuarioId: ctx.usuarioId, disparado: false, dataHora: { gte: new Date() } },
    orderBy: { dataHora: 'asc' },
    take: 10
  })

  const meuDiaCompromissos = compromissosHoje.filter(
    (c) => c.responsavelId === ctx.usuarioId || (c.participantes || '').includes(ctx.usuarioId) || c.responsavelId === null
  )
  const meuDiaPendencias = [...atrasadas, ...hoje]
    .filter((p) => p.responsavelId === ctx.usuarioId || !p.responsavelId)
    .sort((a, b) => {
      const pa = a.prazo ? a.prazo.getTime() : Number.MAX_SAFE_INTEGER
      const pb = b.prazo ? b.prazo.getTime() : Number.MAX_SAFE_INTEGER
      return pa - pb
    })
  const meuDiaRetornos = retornosPendentes.filter(
    (r) => r.responsavelId === ctx.usuarioId || r.responsavelId === null
  )

  const atividadeRecente = (await historicoGlobal(ctx, 20)) as never[]

  const dto: DadosDashboard = {
    contadores,
    pendenciasHoje: deepIso(hoje),
    atrasadas: deepIso(atrasadas),
    proximas: deepIso(proximas),
    retornosPendentes: deepIso(retornosPendentes),
    retornosAtrasados: deepIso(retornosAtrasados),
    compromissosHoje: deepIso(compromissosHoje),
    proximosCompromissos: deepIso(proximosCompromissos),
    porCliente: ordenar(porClienteMap),
    porProjeto: ordenar(porProjetoMap),
    porPrioridade: ordenar(porPrioridadeMap),
    porStatus: ordenar(porStatusMap),
    porCategoria: ordenar(porCategoriaMap),
    porEquipe,
    porTag: [...porTagMap.values()].sort((a, b) => b.valor - a.valor).slice(0, 12) as never,
    atividadeRecente,
    lembretes: deepIso(lembretes),
    meuDia: {
      compromissos: deepIso(meuDiaCompromissos),
      pendencias: deepIso(meuDiaPendencias),
      retornos: deepIso(meuDiaRetornos)
    },
    totalPendencias: todas.length
  }
  return dto
}
