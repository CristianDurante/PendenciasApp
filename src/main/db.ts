import { PrismaClient } from '@prisma/client'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'

let prisma: PrismaClient | null = null

function carregarVariaveisDoEnv(): void {
  const envPath = join(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  try {
    const conteudo = readFileSync(envPath, 'utf8')
    for (const linha of conteudo.split(/\r?\n/)) {
      const texto = linha.trim()
      if (!texto || texto.startsWith('#')) continue
      const separador = texto.indexOf('=')
      if (separador < 0) continue
      const chave = texto.slice(0, separador).trim()
      let valor = texto.slice(separador + 1).trim()
      if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
        valor = valor.slice(1, -1)
      }
      if (chave && !(chave in process.env)) process.env[chave] = valor
    }
  } catch {
    // ignora falha silenciosa de leitura do .env
  }
}

carregarVariaveisDoEnv()

function getElectronApp(): { getPath(name: string): string } | null {
  if (!process.versions.electron) return null
  try {
    return require('electron').app as { getPath(name: string): string }
  } catch {
    return null
  }
}

export function resolveDbPath(): string {
  if (process.env.PENDENCIAS_DB_PATH) return process.env.PENDENCIAS_DB_PATH
  try {
    const electronApp = getElectronApp()
    if (electronApp && typeof electronApp.getPath === 'function') {
      return join(electronApp.getPath('userData'), 'pendencias.db')
    }
  } catch {
    // fallthrough
  }
  return join(process.cwd(), '.pendencias', 'pendencias.db')
}

function usaPostgres(): boolean {
  return !!process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')
}

function deveUsarFallbackSqlite(): boolean {
  return process.env.PENDENCIAS_ALLOW_SQLITE_FALLBACK === '1' && process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production'
}

async function tentarConexaoPostgres(): Promise<boolean> {
  if (!usaPostgres()) return true
  const db = getPrisma()
  try {
    await db.$connect()
    return true
  } catch (error) {
    if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
      throw error
    }
    if (!deveUsarFallbackSqlite()) {
      throw error
    }
    const fallback = resolveDbPath()
    process.env.DATABASE_URL = `file:${fallback}`
    prisma = null
    console.warn('[db] PostgreSQL indisponível; revertendo para SQLite local em', fallback)
    return false
  }
}

export function resolveDataDir(): string {
  return dirname(resolveDbPath())
}

function migrarBancoLegado(dbPath: string): void {
  if (process.env.PENDENCIAS_SKIP_LEGACY_MIGRATION === '1') return
  const bancoLegado = join(process.cwd(), '.pendify', 'pendify.db')
  if (existsSync(dbPath) || !existsSync(bancoLegado)) return
  mkdirSync(dirname(dbPath), { recursive: true })
  copyFileSync(bancoLegado, dbPath)
  for (const sufixo of ['-wal', '-shm']) {
    if (existsSync(bancoLegado + sufixo)) copyFileSync(bancoLegado + sufixo, dbPath + sufixo)
  }
}

export function getPrisma(): PrismaClient {
  if (prisma) return prisma
  if (usaPostgres()) {
    prisma = new PrismaClient()
    return prisma
  }
  const dbPath = resolveDbPath()
  if (!existsSync(dirname(dbPath))) mkdirSync(dirname(dbPath), { recursive: true })
  prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } }
  })
  return prisma
}

function temTabela(nome: string): Promise<boolean> {
  const db = getPrisma()
  if (usaPostgres()) {
    const result = db.$queryRawUnsafe<Array<{ table_name: string }>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name=$1",
      nome
    )
    return result.then((rows) => rows.length > 0).catch(() => false)
  }
  const result = db.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    nome
  )
  return result.then((rows) => rows.length > 0).catch(() => false)
}

function resolvePrismaBin(): string | null {
  const candidates = [
    join(process.cwd(), 'node_modules', '.bin', 'prisma.cmd'),
    join(process.cwd(), 'node_modules', '.bin', 'prisma'),
    join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

async function runMigration(): Promise<boolean> {
  const bin = resolvePrismaBin()
  if (!bin) return false
  const schema = join(process.cwd(), 'prisma', 'schema.prisma')
  if (!existsSync(schema)) return false
  const dbPath = resolveDbPath()
  const env = { ...process.env, DATABASE_URL: `file:${dbPath}` }
  if (usaPostgres()) {
    const postgresEnv = { ...process.env }
    try {
      if (bin.endsWith('.js')) {
        execFileSync(process.execPath, [bin, 'db', 'push', '--skip-generate', '--schema', schema], {
          env: postgresEnv,
          stdio: 'pipe'
        })
      } else {
        execFileSync(bin, ['db', 'push', '--skip-generate', '--schema', schema], {
          env: postgresEnv,
          stdio: 'pipe',
          shell: bin.endsWith('.cmd')
        })
      }
      return true
    } catch {
      return false
    }
  }
  try {
    if (bin.endsWith('.js')) {
      execFileSync(process.execPath, [bin, 'migrate', 'deploy', '--schema', schema], { env, stdio: 'pipe' })
    } else {
      execFileSync(bin, ['migrate', 'deploy', '--schema', schema], {
        env,
        stdio: 'pipe',
        shell: bin.endsWith('.cmd')
      })
    }
    return true
  } catch {
    // fallback: db push
    try {
      if (bin.endsWith('.js')) {
        execFileSync(process.execPath, [bin, 'db', 'push', '--skip-generate', '--schema', schema], {
          env,
          stdio: 'pipe'
        })
      } else {
        execFileSync(bin, ['db', 'push', '--skip-generate', '--schema', schema], {
          env,
          stdio: 'pipe',
          shell: bin.endsWith('.cmd')
        })
      }
      return true
    } catch {
      return false
    }
  }
}

async function regenerarClient(): Promise<void> {
  const bin = resolvePrismaBin()
  if (!bin) return
  const schema = join(process.cwd(), 'prisma', 'schema.prisma')
  if (!existsSync(schema)) return
  try {
    if (bin.endsWith('.js')) {
      execFileSync(process.execPath, [bin, 'generate', '--schema', schema], { stdio: 'pipe' })
    } else {
      execFileSync(bin, ['generate', '--schema', schema], { stdio: 'pipe', shell: bin.endsWith('.cmd') })
    }
  } catch {
    // ignore
  }
}

function clientTemModelosNecessarios(): boolean {
  if (!prisma) return false
  const p = prisma as unknown as Record<string, unknown>
  return typeof p.convite === 'object' && p.convite !== null
}

export async function ensureDatabase(): Promise<void> {
  if (process.env.VERCEL === '1' && !usaPostgres()) {
    throw new Error('DATABASE_URL do Supabase é obrigatória na Vercel')
  }
  if (usaPostgres()) {
    const ok = await tentarConexaoPostgres()
    if (ok) {
      return
    }
  }
  const dbPath = resolveDbPath()
  migrarBancoLegado(dbPath)
  if (!existsSync(dirname(dbPath))) mkdirSync(dirname(dbPath), { recursive: true })
  if (!existsSync(dbPath)) {
    if (!(await runMigration())) throw new Error('Não foi possível aplicar as migrations do banco de dados')
  } else {
    const ok = await temTabela('pendencias')
    if (ok) {
      // Banco existente: aplica todas as migrations pendentes.
      if (!(await runMigration())) throw new Error('Não foi possível atualizar o banco de dados')
    } else {
      if (!(await runMigration())) throw new Error('Não foi possível aplicar as migrations do banco de dados')
    }
  }
  if (!clientTemModelosNecessarios()) {
    await regenerarClient()
    if (prisma) {
      await prisma.$disconnect().catch(() => undefined)
      prisma = null
    }
    getPrisma()
  }
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
