import type { VercelRequest, VercelResponse } from '@vercel/node'
import { criarAplicacao } from '../server/index'

let aplicacao: ReturnType<typeof criarAplicacao> | undefined

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  aplicacao ??= criarAplicacao()
  const app = await aplicacao
  app(req, res)
}