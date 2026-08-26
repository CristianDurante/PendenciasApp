import { getPrisma } from '../db'
import type { ApiContext, RelatorioPendencia } from '@shared/types'
import { deepIso, isAtrasada } from '../helpers'

function diasEntre(a: Date, b: Date): number {
  const umDia = 86400000
  const inicio = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const fim = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((fim.getTime() - inicio.getTime()) / umDia)
}

async function carregarPendencias(db: ReturnType<typeof getPrisma>): Promise<unknown[]> {
  return db.pendencia.findMany({
    include: {
      cliente: true,
      projeto: true,
      responsavel: { select: { id: true, nome: true } },
      categoria: true,
      tags: { include: { tag: true } }
    }
  })
}

export async function relatorioGeral(_ctx: ApiContext): Promise<unknown> {
  const db = getPrisma()
  const todas = await carregarPendencias(db)
  const linhas: RelatorioPendencia[] = todas.map((p: any) => {
    const concluidaEm = p.concluidaEm
    const dias = p.status === 'CONCLUIDA' && p.concluidaEm ? diasEntre(p.criadoEm, p.concluidaEm) : null
    return {
      id: p.id,
      titulo: p.titulo,
      cliente: p.cliente?.nome || '',
      projeto: p.projeto?.nome || '',
      responsavel: p.responsavel?.nome || '',
      prioridade: p.prioridade,
      categoria: p.categoria?.nome || '',
      status: p.status,
      criadoEm: p.criadoEm.toISOString(),
      prazo: p.prazo ? p.prazo.toISOString() : null,
      concluidaEm: concluidaEm ? concluidaEm.toISOString() : null,
      diasParaConcluir: dias,
      tags: (p.tags || []).map((t: any) => t.tag.nome)
    }
  })

  const abertas = linhas.filter((l) => l.status !== 'CONCLUIDA' && l.status !== 'CANCELADA')
  const concluidas = linhas.filter((l) => l.status === 'CONCLUIDA')
  const atrasadas = linhas.filter((l) => isAtrasada(l.prazo ? new Date(l.prazo) : null, l.status))
  const tempos = concluidas.map((l) => l.diasParaConcluir).filter((d): d is number => d !== null)
  const tempoMedio = tempos.length
    ? Math.round((tempos.reduce((a, b) => a + b, 0) / tempos.length) * 10) / 10
    : null

  return {
    linhas,
    resumo: {
      total: linhas.length,
      abertas: abertas.length,
      concluidas: concluidas.length,
      atrasadas: atrasadas.length,
      tempoMedioConclusao: tempoMedio
    }
  }
}

export async function relatorioAgregado(_ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const grupo = String(args.grupo || 'cliente')
  const todas = await carregarPendencias(db)
  const map = new Map<string, { abertas: number; concluidas: number; atrasadas: number; total: number }>()
  const add = (chave: string, p: any) => {
    const atual = map.get(chave) || { abertas: 0, concluidas: 0, atrasadas: 0, total: 0 }
    atual.total += 1
    if (p.status === 'CONCLUIDA') atual.concluidas += 1
    else if (p.status !== 'CANCELADA') {
      atual.abertas += 1
      if (isAtrasada(p.prazo, p.status)) atual.atrasadas += 1
    }
    map.set(chave, atual)
  }
  for (const p of todas as any[]) {
    let chave = ''
    if (grupo === 'cliente') chave = p.cliente?.nome || 'Sem cliente'
    else if (grupo === 'projeto') chave = p.projeto?.nome || 'Sem projeto'
    else if (grupo === 'responsavel') chave = p.responsavel?.nome || 'Sem responsável'
    else if (grupo === 'prioridade') chave = p.prioridade
    else if (grupo === 'categoria') chave = p.categoria?.nome || 'Sem categoria'
    else if (grupo === 'tag') {
      if (!p.tags?.length) add('Sem tag', p)
      for (const t of p.tags) add(t.tag.nome, p)
      continue
    } else {
      chave = p.status
    }
    add(chave, p)
  }
  const itens = [...map.entries()].map(([label, v]) => ({
    label,
    ...v,
    percentualConclusao: v.total === 0 ? 0 : Math.round((v.concluidas / v.total) * 100)
  }))
  itens.sort((a, b) => b.total - a.total)
  return deepIso({ grupo, itens })
}

export async function relatorioCsv(_ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const rel = (await relatorioGeral(_ctx)) as { linhas: RelatorioPendencia[] }
  const linhas = rel.linhas
  const cabecalho = [
    'Título',
    'Cliente',
    'Projeto',
    'Responsável',
    'Prioridade',
    'Categoria',
    'Status',
    'Criado em',
    'Prazo',
    'Concluído em',
    'Dias para concluir',
    'Tags'
  ]
  const escapa = (v: string | null | undefined): string => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = linhas.map((l) =>
    [
      l.titulo,
      l.cliente,
      l.projeto,
      l.responsavel,
      l.prioridade,
      l.categoria,
      l.status,
      l.criadoEm ? new Date(l.criadoEm).toLocaleDateString('pt-BR') : '',
      l.prazo ? new Date(l.prazo).toLocaleDateString('pt-BR') : '',
      l.concluidaEm ? new Date(l.concluidaEm).toLocaleDateString('pt-BR') : '',
      l.diasParaConcluir !== null ? String(l.diasParaConcluir) : '',
      l.tags.join('; ')
    ]
      .map(escapa)
      .join(';')
  )
  const csv = [cabecalho.join(';'), ...rows].join('\n')
  const timestamp = new Date().toISOString().slice(0, 10)
  return { csv, nomeArquivo: `relatorio-pendencias-${timestamp}.csv` }
}

export async function dadosParaPdf(_ctx: ApiContext): Promise<unknown> {
  const db = getPrisma()
  const todas = await carregarPendencias(db)
  const resumo = await relatorioGeral(_ctx)
  return deepIso({ linhas: (resumo as { linhas: RelatorioPendencia[] }).linhas, total: todas.length })
}
