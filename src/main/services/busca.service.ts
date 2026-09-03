import { getPrisma } from '../db'
import { temAcessoGlobal } from '../auth'
import type { ApiContext } from '@shared/types'
import { deepIso } from '../helpers'
import { requireEmpresa } from '../auth'

export async function buscaGlobal(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const empresaId = requireEmpresa(ctx)
  const db = getPrisma()
  const termo = String(args.q || '').trim().toLowerCase()
  if (termo.length < 1) return { vazio: true }
  const limite = 20

  const ondeEquipe = !temAcessoGlobal(ctx) && ctx.equipeId ? { equipeId: ctx.equipeId } : {}

  const [pendencias, clientes, projetos, notas, compromissos, retornos, tags, comentarios] = await Promise.all([
    db.pendencia.findMany({
      where: {
        ...ondeEquipe,
        criador: { empresaId },
        OR: [
          { titulo: { contains: termo } },
          { descricao: { contains: termo } },
          { sistema: { contains: termo } },
          { departamento: { contains: termo } }
        ]
      },
      include: { cliente: true, responsavel: { select: { id: true, nome: true } }, tags: { include: { tag: true } } },
      orderBy: { ultimaAtualizacao: 'desc' },
      take: limite
    }),
    db.cliente.findMany({
      where: {
        empresaId,
        OR: [
          { nome: { contains: termo } },
          { empresa: { contains: termo } },
          { contato: { contains: termo } },
          { email: { contains: termo } }
        ]
      },
      orderBy: { nome: 'asc' },
      take: limite
    }),
    db.projeto.findMany({
      where: { cliente: { empresaId }, OR: [{ nome: { contains: termo } }, { descricao: { contains: termo } }] },
      include: { cliente: true },
      orderBy: { nome: 'asc' },
      take: limite
    }),
    db.nota.findMany({
      where: { usuario: { empresaId }, OR: [{ titulo: { contains: termo } }, { conteudo: { contains: termo } }] },
      include: { cliente: true },
      orderBy: { atualizadoEm: 'desc' },
      take: limite
    }),
    db.compromisso.findMany({
      where: {
        cliente: { empresaId },
        OR: [
          { titulo: { contains: termo } },
          { descricao: { contains: termo } },
          { local: { contains: termo } },
          { participantes: { contains: termo } }
        ]
      },
      include: { cliente: true },
      orderBy: { data: 'desc' },
      take: limite
    }),
    db.retorno.findMany({
      where: { cliente: { empresaId }, OR: [{ assunto: { contains: termo } }, { contato: { contains: termo } }] },
      include: { cliente: true },
      orderBy: { criadoEm: 'desc' },
      take: limite
    }),
    db.tag.findMany({ where: { nome: { contains: termo } }, orderBy: { nome: 'asc' }, take: limite }),
    db.comentario.findMany({
      where: {
        conteudo: { contains: termo },
        ...(ondeEquipe ? { pendencia: { equipeId: ctx.equipeId as string } } : {})
      },
      include: { pendencia: { select: { id: true, titulo: true } }, usuario: { select: { id: true, nome: true } } },
      orderBy: { criadoEm: 'desc' },
      take: limite
    })
  ])

  return deepIso({
    termo,
    pendencias,
    clientes,
    projetos,
    notas,
    compromissos,
    retornos,
    tags,
    comentarios
  })
}
