import express from 'express'
import cors from 'cors'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import type { ApiRequest } from '@shared/types'
import { ensureDatabase } from '../src/main/db'
import { ensureBootstrap } from '../src/main/bootstrap'
import { dispatch } from '../src/main/services/registry'
import { iniciarScheduler } from '../src/main/scheduler'

async function main(): Promise<void> {
  const porta = Number(process.env.PENDIFY_SERVER_PORT || 3939)
  const dataDir = process.env.PENDIFY_DB_PATH
    ? join(process.cwd(), '.pendify')
    : join(process.cwd(), '.pendify')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!process.env.PENDIFY_DB_PATH) {
    process.env.PENDIFY_DB_PATH = join(dataDir, 'pendify.db')
  }

  await ensureDatabase()
  await ensureBootstrap()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '25mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, nome: 'Pendify API', versao: '0.1.0' })
  })

  app.post('/api/:resource/:action', async (req, res) => {
    const reqApi: ApiRequest = {
      resource: req.params.resource,
      action: req.params.action,
      args: (req.body?.args || {}) as Record<string, unknown>,
      token: (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || undefined
    }
    const resultado = await dispatch(reqApi)
    if (resultado.ok) {
      res.json(resultado)
    } else {
      res.status(400).json(resultado)
    }
  })

  const srv = app.listen(porta, () => {
    console.log(`[pendify-server] API REST ouvindo em http://localhost:${porta}`)
    console.log(`[pendify-server] Banco de dados em ${process.env.PENDIFY_DB_PATH}`)
    iniciarScheduler()
  })

  const desligar = (): void => {
    srv.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 3000)
  }
  process.on('SIGINT', desligar)
  process.on('SIGTERM', desligar)
}

main().catch((err) => {
  console.error('[pendify-server] erro fatal:', err)
  process.exit(1)
})
