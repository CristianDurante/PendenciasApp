import { getPrisma } from './db'
import { hashPassword } from './auth'
import { CATEGORIAS_INICIAIS, TAGS_SUGERIDAS } from '@shared/constants'

export async function ensureBootstrap(): Promise<void> {
  const db = getPrisma()
  const adminCount = await db.usuario.count({ where: { perfil: 'ADMIN' } })
  if (adminCount === 0) {
    const email = process.env.PENDIFY_ADMIN_EMAIL || 'admin@pendify.local'
    const senha = process.env.PENDIFY_ADMIN_SENHA
    if (!senha && process.env.NODE_ENV === 'production') {
      throw new Error('PENDIFY_ADMIN_SENHA é obrigatória em produção')
    }
    await db.usuario.create({
      data: {
        nome: 'Administrador',
        email,
        senhaHash: hashPassword(senha || 'admin'),
        perfil: 'ADMIN',
        cargo: 'Administrador do sistema'
      }
    })
    const empresa = await db.empresa.findFirst()
    if (!empresa) {
      await db.empresa.create({ data: { nome: 'Minha Empresa', ativo: true } })
    }
    console.log(`[bootstrap] Usuário administrador inicial criado (${email})`)
  }

  const catCount = await db.categoria.count()
  if (catCount === 0) {
    await db.categoria.createMany({
      data: CATEGORIAS_INICIAIS.map((c, i) => ({
        nome: c.nome,
        cor: c.cor,
        padrao: true,
        ativo: true
      }))
    })
    console.log('[bootstrap] Categorias iniciais criadas')
  }

  const tagCount = await db.tag.count()
  if (tagCount === 0) {
    await db.tag.createMany({
      data: TAGS_SUGERIDAS.map((t) => ({ nome: t.nome, cor: t.cor }))
    })
    console.log('[bootstrap] Tags sugeridas criadas')
  }
}
