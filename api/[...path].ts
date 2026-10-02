import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { criarAplicacao } from '../server/index'

let aplicacao: ReturnType<typeof criarAplicacao> | undefined

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    aplicacao ??= criarAplicacao()
    const app = await aplicacao
    app(req, res)
  } catch (error) {
    aplicacao = undefined
    const errorId = randomUUID()
    console.error('[api] Falha ao inicializar a aplicação', { errorId, error })
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: 'Não foi possível inicializar a API.', errorId })
    }
  }
}