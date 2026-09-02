import { getPrisma, resolveDbPath, resolveDataDir } from '../db'
import { AppError, requireRoles } from '../auth'
import type { ApiContext, BackupInfo, ConfigApp } from '@shared/types'
import { safeJsonParse } from '../helpers'
import { mkdir, copyFile, cp, readdir, readFile, writeFile, access, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

const BACKUP_INFO_FILE = 'backup-info.json'

async function checkpoint(): Promise<void> {
  try {
    const db = getPrisma()
    await db.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch {
    // ignora
  }
}

function backupInfoPath(): string {
  return join(resolveDataDir(), BACKUP_INFO_FILE)
}

async function obterConfigBackup(): Promise<{ local: string | null; automatico: boolean; intervaloHoras: number }> {
  const padrao = { local: null as string | null, automatico: false, intervaloHoras: 24 }
  try {
    const db = getPrisma()
    const empresa = await db.empresa.findFirst({ orderBy: { criadoEm: 'asc' } })
    const cfg = safeJsonParse<ConfigApp>(empresa?.config, {})
    const b = cfg.backup || ({} as NonNullable<ConfigApp['backup']>)
    return {
      local: b.local || null,
      automatico: !!b.automatico,
      intervaloHoras: b.intervaloHoras || 24
    }
  } catch {
    return padrao
  }
}

export async function obterInfoBackup(): Promise<BackupInfo> {
  await checkpoint()
  const cfg = await obterConfigBackup()
  let info: BackupInfo = { ultimoBackup: null, proximoBackup: null, tamanho: 0, local: cfg.local || '' }
  try {
    const raw = await readFile(backupInfoPath(), 'utf-8')
    info = JSON.parse(raw)
  } catch {
    // sem backup ainda
  }
  if (cfg.automatico && cfg.intervaloHoras > 0) {
    const base = info.ultimoBackup ? new Date(info.ultimoBackup).getTime() : Date.now()
    info.proximoBackup = new Date(base + cfg.intervaloHoras * 3600000).toISOString()
  } else {
    info.proximoBackup = null
  }
  if (info.local) info.local = info.local
  return info
}

async function statDir(dir: string): Promise<number> {
  let total = 0
  const itens = await readdir(dir, { withFileTypes: true })
  for (const item of itens) {
    const caminho = join(dir, item.name)
    if (item.isDirectory()) total += await statDir(caminho)
    else total += await stat(caminho).then((s) => s.size).catch(() => 0)
  }
  return total
}

export async function executarBackup(ctx: ApiContext | null, args: Record<string, unknown>): Promise<BackupInfo> {
  if (ctx) requireRoles(ctx, ['ADMIN', 'GESTOR'])
  const db = getPrisma()
  await checkpoint()
  const dbPath = resolveDbPath()
  const dataDir = resolveDataDir()
  const anexosDir = join(dataDir, 'anexos')

  const cfg = await obterConfigBackup()
  const localBase = args.local ? String(args.local) : cfg.local || join(dataDir, 'backups')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const destino = join(localBase, `backup-${timestamp}`)
  await mkdir(destino, { recursive: true })

  await copyFile(dbPath, join(destino, 'pendencias.db'))
  if (existsSync(dbPath + '-wal')) await copyFile(dbPath + '-wal', join(destino, 'pendencias.db-wal'))
  if (existsSync(dbPath + '-shm')) await copyFile(dbPath + '-shm', join(destino, 'pendencias.db-shm'))
  if (existsSync(anexosDir)) {
    await cp(anexosDir, join(destino, 'anexos'), { recursive: true })
  }

  const tamanho = await statDir(destino)
  const info: BackupInfo = {
    ultimoBackup: new Date().toISOString(),
    proximoBackup: null,
    tamanho,
    local: destino
  }
  await writeFile(backupInfoPath(), JSON.stringify(info, null, 2), 'utf-8')
  return info
}

export async function restaurarBackup(ctx: ApiContext, args: Record<string, unknown>): Promise<unknown> {
  requireRoles(ctx, ['ADMIN'])
  const caminho = String(args.caminho || '')
  if (!caminho) throw new AppError('Caminho do backup é obrigatório')
  const dbArquivo = join(caminho, 'pendencias.db')
  try {
    await access(dbArquivo)
  } catch {
    throw new AppError('Backup inválido: arquivo pendencias.db não encontrado no caminho informado')
  }
  const db = getPrisma()
  await checkpoint()
  await db.$disconnect()

  const dbPath = resolveDbPath()
  const dataDir = resolveDataDir()
  const anexosDir = join(dataDir, 'anexos')

  await copyFile(dbArquivo, dbPath)
  const origemAnexos = join(caminho, 'anexos')
  if (existsSync(origemAnexos)) {
    if (existsSync(anexosDir)) {
      await rm(anexosDir, { recursive: true, force: true })
    }
    await cp(origemAnexos, anexosDir, { recursive: true })
  }

  const info = await obterInfoBackup()
  await writeFile(backupInfoPath(), JSON.stringify({ ...info, ultimoBackup: new Date().toISOString() }, null, 2), 'utf-8')
  return { ok: true, mensagem: 'Backup restaurado com sucesso. Reinicie o aplicativo para aplicar as alterações.' }
}

export async function listarBackups(): Promise<unknown> {
  const cfg = await obterConfigBackup()
  const base = cfg.local || join(resolveDataDir(), 'backups')
  if (!existsSync(base)) return []
  const itens = await readdir(base, { withFileTypes: true })
  const backups = await Promise.all(
    itens
      .filter((i) => i.isDirectory() && i.name.startsWith('backup-'))
      .map(async (i) => {
        const p = join(base, i.name)
        const size = await statDir(p)
        return { nome: i.name, caminho: p, tamanho: size }
      })
  )
  backups.sort((a, b) => b.nome.localeCompare(a.nome))
  return backups
}

export async function backupAutomatico(): Promise<boolean> {
  try {
    const cfg = await obterConfigBackup()
    if (!cfg.automatico) return false
    const info = await obterInfoBackup()
    if (!info.ultimoBackup) {
      await executarBackup(null, {})
      return true
    }
    const ultimo = new Date(info.ultimoBackup).getTime()
    if (Date.now() - ultimo >= cfg.intervaloHoras * 3600000) {
      await executarBackup(null, {})
      return true
    }
    return false
  } catch {
    return false
  }
}
