import { getPrisma } from './db'
import { hashPassword } from './auth'
import { CATEGORIAS_INICIAIS, TAGS_SUGERIDAS } from '../shared/constants'

export async function ensureBootstrap(): Promise<void> {
  const db = getPrisma()
  await db.$transaction(async (tx) => {
    if (process.env.VERCEL === '1') {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(731942601)`
    }

    let empresa = await tx.empresa.findFirst({ orderBy: { criadoEm: 'asc' } })
    if (!empresa) {
      empresa = await tx.empresa.create({
        data: { nome: process.env.PENDENCIAS_EMPRESA_NOME || 'Minha empresa' }
      })
      console.log('[bootstrap] Empresa inicial criada')
    }

    const adminCount = await tx.usuario.count({ where: { perfil: 'ADMIN' } })
    if (adminCount === 0) {
      const email = process.env.PENDENCIAS_ADMIN_EMAIL || 'admin@pendencias.local'
      const senha = process.env.PENDENCIAS_ADMIN_SENHA
      if (!senha && process.env.NODE_ENV === 'production') {
        throw new Error('PENDENCIAS_ADMIN_SENHA é obrigatória em produção')
      }
      await tx.usuario.create({
        data: {
          nome: 'Administrador',
          email,
          senhaHash: hashPassword(senha || 'admin'),
          perfil: 'ADMIN',
          cargo: 'Administrador do sistema',
          empresaId: empresa.id
        }
      })
      console.log(`[bootstrap] Usuário administrador inicial criado (${email})`)
    }

    await tx.usuario.updateMany({ where: { empresaId: null }, data: { empresaId: empresa.id } })

    const catCount = await tx.categoria.count()
    if (catCount === 0) {
      await tx.categoria.createMany({
        data: CATEGORIAS_INICIAIS.map((c) => ({
          nome: c.nome,
          cor: c.cor,
          padrao: true,
          ativo: true
        }))
      })
      console.log('[bootstrap] Categorias iniciais criadas')
    }

    const tagCount = await tx.tag.count()
    if (tagCount === 0) {
      await tx.tag.createMany({
        data: TAGS_SUGERIDAS.map((t) => ({ nome: t.nome, cor: t.cor }))
      })
      console.log('[bootstrap] Tags sugeridas criadas')
    }
  })
}
