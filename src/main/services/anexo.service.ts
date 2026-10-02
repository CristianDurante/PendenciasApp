import { z } from 'zod'
import { getPrisma, resolveDataDir } from '../db'
import { AppError, exigirAcessoEquipe } from '../auth'
import { EXTENSOES_ANEXO, TAMANHO_MAX_ANEXO } from '../../shared/constants'
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

const MIME_POR_EXTENSAO: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  eml: 'message/rfc822',
  msg: 'application/vnd.ms-outlook'
}

function storageConfig(): { baseUrl: string; bucket: string; serviceKey: string } {
  const baseUrl = process.env.PENDENCIAS_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.PENDENCIAS_STORAGE_BUCKET || 'anexos'
  if (!baseUrl || !serviceKey) {
    throw new AppError('Armazenamento de anexos não configurado. Configure PENDENCIAS_SUPABASE_URL e SUPABASE_SECRET_KEY na Vercel.', 503)
  }
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new AppError('PENDENCIAS_SUPABASE_URL inválida.', 503)
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new AppError('O endereço do Supabase Storage deve usar HTTPS.', 503)
  }
  return { baseUrl: url.origin, bucket, serviceKey }
}

function storageObjectPath(bucket: string, objectPath: string): string {
  return `/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`
}

function urlStorageAssinada(config: { baseUrl: string }, signedPath: string): string {
  if (/^https?:\/\//i.test(signedPath)) return signedPath
  if (signedPath.startsWith('/storage/v1/')) return `${config.baseUrl}${signedPath}`
  return `${config.baseUrl}/storage/v1/${signedPath.replace(/^\/+/, '')}`
}

async function storageRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const config = storageConfig()
  let response: Response
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        ...init.headers
      }
    })
  } catch (error) {
    console.error('[anexo] Falha ao conectar ao Supabase Storage:', error)
    throw new AppError('Não foi possível conectar ao armazenamento de anexos. Tente novamente.', 503)
  }
  if (!response.ok) {
    const detalhe = (await response.text()).slice(0, 500)
    console.error('[anexo] Supabase Storage rejeitou a operação:', { status: response.status, detalhe })
    throw new AppError(`Falha no armazenamento do anexo (HTTP ${response.status}). Verifique o bucket e as variáveis do Supabase.`, 502)
  }
  return response
}

function exigirStorageSupabaseNaVercel(): void {
  if (process.env.VERCEL === '1') storageConfig()
}

function validarTamanho(tamanho: number): void {
  if (tamanho > TAMANHO_MAX_ANEXO) {
    throw new AppError(`Arquivo muito grande (máximo ${Math.round(TAMANHO_MAX_ANEXO / 1024 / 1024)} MB)`)
  }
}

function validarMetadados(nomeOriginal: string, tamanho: number): string {
  const ext = validarExtensao(nomeOriginal)
  validarTamanho(tamanho)
  return ext
}

function validarCaminhoUpload(pendenciaId: string, objectPath: string, ext: string): void {
  const idSeguro = pendenciaId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const caminhoEsperado = new RegExp(`^anexos/${idSeguro}/[0-9a-f-]{36}\\.${ext}$`, 'i')
  if (!caminhoEsperado.test(objectPath)) throw new AppError('Caminho do arquivo inválido.')
}

export async function prepararUploadAnexo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  exigirStorageSupabaseNaVercel()
  const parsed = AnexoSchema.omit({ conteudoBase64: true }).parse(args)
  const ext = validarMetadados(parsed.nomeOriginal, parsed.tamanho)
  const db = getPrisma()
  const pendencia = await db.pendencia.findUnique({ where: { id: parsed.pendenciaId }, select: { equipeId: true } })
  if (!pendencia) throw new AppError('Pendência não encontrada', 404)
  exigirAcessoEquipe(ctx, pendencia.equipeId)

  const config = storageConfig()
  const objectPath = `anexos/${parsed.pendenciaId}/${randomUUID()}.${ext}`
  const path = storageObjectPath(config.bucket, objectPath).replace('/object/', '/object/upload/sign/')
  const response = await storageRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  const data = await response.json() as { url?: string; signedUrl?: string; signedURL?: string }
  const signedPath = data.signedUrl || data.signedURL || data.url
  if (!signedPath) {
    console.error('[anexo] Resposta inválida ao criar URL de upload assinado.')
    throw new AppError('O Supabase não retornou uma URL para upload do anexo.', 502)
  }
  return { objectPath, uploadUrl: urlStorageAssinada(config, signedPath), contentType: MIME_POR_EXTENSAO[ext] }
}

export async function confirmarUploadAnexo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  exigirStorageSupabaseNaVercel()
  const parsed = AnexoSchema.omit({ conteudoBase64: true }).parse(args)
  const ext = validarMetadados(parsed.nomeOriginal, parsed.tamanho)
  const db = getPrisma()
  const pendencia = await db.pendencia.findUnique({ where: { id: parsed.pendenciaId }, select: { equipeId: true } })
  if (!pendencia) throw new AppError('Pendência não encontrada', 404)
  exigirAcessoEquipe(ctx, pendencia.equipeId)

  const objectPath = String(args.objectPath || '')
  validarCaminhoUpload(parsed.pendenciaId, objectPath, ext)
  const config = storageConfig()
  const response = await storageRequest(storageObjectPath(config.bucket, objectPath), { method: 'HEAD' })
  const tamanhoArmazenado = Number(response.headers.get('content-length'))
  if (Number.isFinite(tamanhoArmazenado) && tamanhoArmazenado > 0 && tamanhoArmazenado !== parsed.tamanho) {
    await storageRequest(storageObjectPath(config.bucket, objectPath), { method: 'DELETE' })
    throw new AppError('Arquivo enviado com tamanho diferente do informado.')
  }

  const anexo = await db.anexo.create({
    data: {
      pendenciaId: parsed.pendenciaId,
      usuarioId: ctx.usuarioId,
      nomeOriginal: parsed.nomeOriginal,
      arquivo: objectPath,
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
  return deepIso(anexo)
}

export async function descartarUploadAnexo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  exigirStorageSupabaseNaVercel()
  const pendenciaId = String(args.pendenciaId || '')
  const objectPath = String(args.objectPath || '')
  const ext = validarExtensao(objectPath)
  validarCaminhoUpload(pendenciaId, objectPath, ext)
  const db = getPrisma()
  const pendencia = await db.pendencia.findUnique({ where: { id: pendenciaId }, select: { equipeId: true } })
  if (!pendencia) throw new AppError('Pendência não encontrada', 404)
  exigirAcessoEquipe(ctx, pendencia.equipeId)
  await storageRequest(storageObjectPath(storageConfig().bucket, objectPath), { method: 'DELETE' })
  return { ok: true }
}

export async function listarAnexos(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const db = getPrisma()
  const pendenciaId = String(args.pendenciaId || '')
  const p = await db.pendencia.findUnique({ where: { id: pendenciaId }, select: { equipeId: true } })
  if (!p) throw new AppError('Pendência não encontrada', 404)
  exigirAcessoEquipe(ctx, p.equipeId)
  const itens = await db.anexo.findMany({
    where: { pendenciaId },
    include: { usuario: { select: { id: true, nome: true, avatar: true } } },
    orderBy: { criadoEm: 'desc' }
  })
  return deepIso(itens)
}

export async function obterUrlDownloadAnexo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  exigirStorageSupabaseNaVercel()
  const db = getPrisma()
  const id = String(args.id || '')
  const anexo = await db.anexo.findUnique({ where: { id } })
  if (!anexo) throw new AppError('Anexo não encontrado', 404)
  if (!anexo.arquivo.startsWith('anexos/')) throw new AppError('Este anexo usa armazenamento local; baixe pelo aplicativo desktop.', 400)
  const pendencia = await db.pendencia.findUnique({ where: { id: anexo.pendenciaId }, select: { equipeId: true } })
  if (!pendencia) throw new AppError('Pendência não encontrada', 404)
  exigirAcessoEquipe(ctx, pendencia.equipeId)
  const config = storageConfig()
  const path = storageObjectPath(config.bucket, anexo.arquivo).replace('/object/', '/object/sign/')
  const response = await storageRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60, download: anexo.nomeOriginal })
  })
  const data = await response.json() as { signedURL?: string; signedUrl?: string; url?: string }
  const signedPath = data.signedUrl || data.signedURL || data.url
  if (!signedPath) {
    console.error('[anexo] Resposta inválida ao criar URL de download assinado.')
    throw new AppError('O Supabase não retornou uma URL para baixar o anexo.', 502)
  }
  return { url: urlStorageAssinada(config, signedPath), nomeOriginal: anexo.nomeOriginal }
}

export async function criarAnexo(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  const parsed = AnexoSchema.parse(args)
  if (process.env.VERCEL === '1') {
    throw new AppError('Na versão web, envie o anexo diretamente pelo fluxo de upload do Supabase Storage.', 400)
  }
  validarTamanho(parsed.tamanho)
  const db = getPrisma()
  const pendencia = await db.pendencia.findUnique({ where: { id: parsed.pendenciaId } })
  if (!pendencia) throw new AppError('Pendência não encontrada', 404)
  exigirAcessoEquipe(ctx, pendencia.equipeId)
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
  const pendencia = await db.pendencia.findUnique({ where: { id: a.pendenciaId }, select: { equipeId: true } })
  if (!pendencia) throw new AppError('Pendência não encontrada', 404)
  exigirAcessoEquipe(ctx, pendencia.equipeId)
  if (a.arquivo.startsWith('anexos/')) {
    exigirStorageSupabaseNaVercel()
    const response = await storageRequest(storageObjectPath(storageConfig().bucket, a.arquivo))
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length !== a.tamanho) throw new AppError('O anexo armazenado está incompleto ou corrompido.', 502)
    return { id: a.id, nomeOriginal: a.nomeOriginal, tipo: a.tipo, conteudoBase64: buffer.toString('base64') }
  }
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
  const pendencia = await db.pendencia.findUnique({ where: { id: a.pendenciaId }, select: { equipeId: true } })
  if (!pendencia) throw new AppError('Pendência não encontrada', 404)
  exigirAcessoEquipe(ctx, pendencia.equipeId)
  if (a.usuarioId !== ctx.usuarioId && !ctx.isAdmin) throw new AppError('Sem permissão', 403)
  if (a.arquivo.startsWith('anexos/')) {
    exigirStorageSupabaseNaVercel()
    await storageRequest(storageObjectPath(storageConfig().bucket, a.arquivo), { method: 'DELETE' })
  } else {
  const caminho = join(resolveDataDir(), 'anexos', a.pendenciaId, a.arquivo)
  try {
    await unlink(caminho)
  } catch {
    // arquivo já removido
  }
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
