import express from 'express'
import cors from 'cors'
import { join, dirname } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import type { ApiRequest } from '@shared/types'
import { ensureDatabase } from '../src/main/db'
import { ensureBootstrap } from '../src/main/bootstrap'
import { dispatch } from '../src/main/services/registry'
import { iniciarScheduler } from '../src/main/scheduler'

const limites = new Map<string, { inicio: number; quantidade: number }>()

function limitarRequisicoes(chave: string, limite: number, janelaMs: number): boolean {
  const agora = Date.now()
  for (const [entrada, valor] of limites) {
    if (agora - valor.inicio >= janelaMs) limites.delete(entrada)
  }
  const atual = limites.get(chave)
  if (!atual || agora - atual.inicio >= janelaMs) {
    limites.set(chave, { inicio: agora, quantidade: 1 })
    return true
  }
  if (atual.quantidade >= limite) return false
  atual.quantidade += 1
  return true
}

function cookies(req: express.Request): Record<string, string> {
  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((item) => {
        const separador = item.indexOf('=')
        return separador < 0 ? ['', ''] : [item.slice(0, separador).trim(), decodeURIComponent(item.slice(separador + 1))]
      })
      .filter(([nome, valor]) => nome && valor)
  )
}

async function main(): Promise<void> {
  const porta = Number(process.env.PENDENCIAS_SERVER_PORT || 3939)
  const dataDir = process.env.PENDENCIAS_DB_PATH
    ? dirname(process.env.PENDENCIAS_DB_PATH)
    : join(process.cwd(), '.pendencias')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!process.env.PENDENCIAS_DB_PATH) {
    process.env.PENDENCIAS_DB_PATH = join(dataDir, 'pendencias.db')
  }

  await ensureDatabase()
  await ensureBootstrap()

  const app = express()
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'")
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    next()
  })
  if (process.env.PENDENCIAS_CORS_ORIGIN) {
    app.use(cors({ origin: process.env.PENDENCIAS_CORS_ORIGIN }))
  }
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, nome: 'Pendencias App API', versao: '0.1.0' })
  })

  app.post('/api/:resource/:action', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const sensivel = req.params.resource === 'auth' && ['login', 'recuperarSolicitar', 'recuperarValidar', 'recuperarRedefinir'].includes(req.params.action)
    if (sensivel && !limitarRequisicoes(`${ip}:${req.params.action}`, 10, 15 * 60 * 1000)) {
      res.status(429).json({ ok: false, error: 'Muitas tentativas. Aguarde alguns minutos.' })
      return
    }
    const cookieToken = cookies(req).pendencias_session
    const reqApi: ApiRequest = {
      resource: req.params.resource,
      action: req.params.action,
      args: (req.body?.args || {}) as Record<string, unknown>,
      token: (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || cookieToken || undefined
    }
    const resultado = await dispatch(reqApi)
    if (resultado.ok && req.params.resource === 'auth' && ['login', 'aceitarConvite'].includes(req.params.action)) {
      const sessao = (resultado.data as { sessao?: { token: string } })?.sessao
      if (sessao) {
        const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : ''
        res.setHeader('Set-Cookie', `pendencias_session=${encodeURIComponent(sessao.token)}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Strict${seguro}`)
      }
    }
    if (req.params.resource === 'auth' && req.params.action === 'logout') {
      const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : ''
      res.setHeader('Set-Cookie', `pendencias_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${seguro}`)
    }
    if (resultado.ok && req.params.resource === 'auth' && ['login', 'aceitarConvite'].includes(req.params.action)) {
      const data = resultado.data as { sessao?: Record<string, unknown> }
      if (data?.sessao) {
        resultado.data = { ...data, sessao: { ...data.sessao, token: undefined } }
      }
    }
    if (resultado.ok) {
      res.json(resultado)
    } else {
      res.status(400).json(resultado)
    }
  })

  const rendererDir = join(process.cwd(), 'out', 'renderer')
  if (existsSync(join(rendererDir, 'index.html'))) {
    app.use(express.static(rendererDir))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next()
      res.sendFile(join(rendererDir, 'index.html'))
    })
  }

  const srv = app.listen(porta, () => {
    console.log(`[pendencias-server] API REST ouvindo em http://localhost:${porta}`)
    console.log(`[pendencias-server] Banco de dados em ${process.env.PENDENCIAS_DB_PATH}`)
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
  console.error('[pendencias-server] erro fatal:', err)
  process.exit(1)
})
