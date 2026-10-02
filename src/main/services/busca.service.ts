import { getPrisma } from '../db'
import { temAcessoGlobal } from '../auth'
import type { ApiContext } from '@shared/types'
import { containsInsensitive, deepIso } from '../helpers'
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
          { titulo: containsInsensitive(termo) },
          { descricao: containsInsensitive(termo) },
          { sistema: containsInsensitive(termo) },
          { departamento: containsInsensitive(termo) }
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
          { nome: containsInsensitive(termo) },
          { empresa: containsInsensitive(termo) },
          { contato: containsInsensitive(termo) },
          { email: containsInsensitive(termo) }
        ]
      },
      orderBy: { nome: 'asc' },
      take: limite
    }),
    db.projeto.findMany({
      where: { cliente: { empresaId }, OR: [{ nome: containsInsensitive(termo) }, { descricao: containsInsensitive(termo) }] },
      include: { cliente: true },
      orderBy: { nome: 'asc' },
      take: limite
    }),
    db.nota.findMany({
      where: { usuario: { empresaId }, OR: [{ titulo: containsInsensitive(termo) }, { conteudo: containsInsensitive(termo) }] },
      include: { cliente: true },
      orderBy: { atualizadoEm: 'desc' },
      take: limite
    }),
    db.compromisso.findMany({
      where: {
        cliente: { empresaId },
        OR: [
          { titulo: containsInsensitive(termo) },
          { descricao: containsInsensitive(termo) },
          { local: containsInsensitive(termo) },
          { participantes: containsInsensitive(termo) }
        ]
      },
      include: { cliente: true },
      orderBy: { data: 'desc' },
      take: limite
    }),
    db.retorno.findMany({
      where: { cliente: { empresaId }, OR: [{ assunto: containsInsensitive(termo) }, { contato: containsInsensitive(termo) }] },
      include: { cliente: true },
      orderBy: { criadoEm: 'desc' },
      take: limite
    }),
    db.tag.findMany({ where: { nome: containsInsensitive(termo) }, orderBy: { nome: 'asc' }, take: limite }),
    db.comentario.findMany({
      where: {
        conteudo: containsInsensitive(termo),
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
