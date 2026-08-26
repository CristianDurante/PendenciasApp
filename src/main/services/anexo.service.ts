import { z } from 'zod'
import { getPrisma, resolveDataDir } from '../db'
import { AppError } from '../auth'
import { EXTENSOES_ANEXO, TAMANHO_MAX_ANEXO } from '@shared/constants'
import type { ApiContext } from '@shared/types'
import { deepIso } from '../helpers'
import { registrarHistorico } from './historico.service'
import { writeFile, mkdir, readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const AnexoSchema = z.object({
  pendenciaId: z.string().min(1),
  nomeOriginal: z.string().min(1).max(255),
  tipo: z.string().max(20),
  tamanho: z.number().int().positive(),
  conteudoBase64: z.string().min(1)
})

function validarExtensao(nome: string): string {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  if (!EXTENSOES_ANEXO.includes(ext)) {
    throw new AppError(`Extensão ".${ext}" não permitida. Extensões aceitas: ${EXTENSOES_ANEXO.join(', ')}`)
  }
  return ext
}

export async function listarAnexos(args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const pendenciaId = String(args.pendenciaId || '')
  const itens = await db.anexo.findMany({
    where: { pendenciaId },
    include: { usuario: { select: { id: true, nome: true, avatar: true } } },
    orderBy: { criadoEm: 'desc' }
  })
  return deepIso(itens)
}

export async function criarAnexo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const parsed = AnexoSchema.parse(args)
  if (parsed.tamanho > TAMANHO_MAX_ANEXO) {
    throw new AppError(`Arquivo muito grande (máximo ${Math.round(TAMANHO_MAX_ANEXO / 1024 / 1024)} MB)`)
  }
  const db = getPrisma()
  const pendencia = await db.pendencia.findUnique({ where: { id: parsed.pendenciaId } })
  if (!pendencia) throw new AppError('Pendência não encontrada', 404)
  const ext = validarExtensao(parsed.nomeOriginal)
  const dir = join(resolveDataDir(), 'anexos', parsed.pendenciaId)
  await mkdir(dir, { recursive: true })
  const arquivo = `${randomUUID()}.${ext}`
  const buffer = Buffer.from(parsed.conteudoBase64, 'base64')
  if (buffer.length !== parsed.tamanho) {
    throw new AppError('Arquivo corrompido: tamanho não confere')
  }
  await writeFile(join(dir, arquivo), buffer)
  const a = await db.anexo.create({
    data: {
      pendenciaId: parsed.pendenciaId,
      usuarioId: ctx.usuarioId,
      nomeOriginal: parsed.nomeOriginal,
      arquivo,
      tipo: ext,
      tamanho: parsed.tamanho
    },
    include: { usuario: { select: { id: true, nome: true, avatar: true } } }
  })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: parsed.pendenciaId,
    usuarioId: ctx.usuarioId,
    tipo: 'ANEXO',
    descricao: `Anexo "${parsed.nomeOriginal}" adicionado`
  })
  return deepIso(a)
}

export async function obterConteudoAnexo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const a = await db.anexo.findUnique({ where: { id } })
  if (!a) throw new AppError('Anexo não encontrado', 404)
  const caminho = join(resolveDataDir(), 'anexos', a.pendenciaId, a.arquivo)
  try {
    const buffer = await readFile(caminho)
    return { id: a.id, nomeOriginal: a.nomeOriginal, tipo: a.tipo, conteudoBase64: buffer.toString('base64') }
  } catch {
    throw new AppError('Arquivo não encontrado no disco', 404)
  }
}

export async function excluirAnexo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const id = String(args.id || '')
  const a = await db.anexo.findUnique({ where: { id } })
  if (!a) throw new AppError('Anexo não encontrado', 404)
  if (a.usuarioId !== ctx.usuarioId && !ctx.isAdmin) throw new AppError('Sem permissão', 403)
  const caminho = join(resolveDataDir(), 'anexos', a.pendenciaId, a.arquivo)
  try {
    await unlink(caminho)
  } catch {
    // arquivo já removido
  }
  await db.anexo.delete({ where: { id } })
  await registrarHistorico({
    entidade: 'pendencia',
    entidadeId: a.pendenciaId,
    usuarioId: ctx.usuarioId,
    tipo: 'ANEXO',
    descricao: `Anexo "${a.nomeOriginal}" removido`
  })
  return { ok: true }
}
