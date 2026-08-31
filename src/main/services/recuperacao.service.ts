import { getPrisma } from '../db'
import { AppError, hashPassword, verifyPassword, validarRequisitosSenha } from '../auth'
import { addMinutes } from 'date-fns'
import { randomInt } from 'node:crypto'
import { enviarEmailRecuperacao } from './mailer.service'
import { registrarHistorico } from './historico.service'

const VALIDADE_MIN = Math.max(5, Number(process.env.PENDIFY_RECOVERY_VALIDADE_MIN || 15))
const MAX_TENTATIVAS = Math.max(1, Number(process.env.PENDIFY_RECOVERY_MAX_TENTATIVAS || 5))
const MAX_SOLICITACOES_HORA = Math.max(1, Number(process.env.PENDIFY_RECOVERY_MAX_SOLICITACOES_HORA || 3))
// Somente para desenvolvimento/testes: retorna o código na resposta da API.
const DEV_RETORNAR_CODIGO = process.env.PENDIFY_DEV_RECOVERY === '1'

const MENSAGEM_GENERICA = 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.'
const MENSAGEM_CODIGO_INVALIDO = 'Código inválido ou expirado.'

function gerarCodigo(): string {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}

async function codigoAtivo(email: string) {
  const db = getPrisma()
  const itens = await db.codigoRecuperacao.findMany({
    where: { email, usadoEm: null },
    orderBy: { criadoEm: 'desc' },
    take: 1
  })
  const codigo = itens[0]
  if (!codigo) return null
  if (new Date() > codigo.expiraEm) {
    await db.codigoRecuperacao.delete({ where: { id: codigo.id } }).catch(() => undefined)
    return null
  }
  return codigo
}

export async function solicitarCodigo(emailRaw: string): Promise<unknown> {
  const db = getPrisma()
  const email = emailRaw.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Informe um e-mail válido')

  const usuario = await db.usuario.findUnique({ where: { email } })

  // Limite de solicitações por e-mail em um intervalo de 1 hora.
  const desde = new Date(Date.now() - 60 * 60 * 1000)
  const solicitacoes = await db.codigoRecuperacao.count({ where: { email, criadoEm: { gte: desde } } })
  if (solicitacoes >= MAX_SOLICITACOES_HORA) {
    return { ok: true, mensagem: MENSAGEM_GENERICA }
  }

  const codigo = gerarCodigo()
  const expiraEm = addMinutes(new Date(), VALIDADE_MIN)
  await db.codigoRecuperacao.create({
    data: { email, codigoHash: hashPassword(codigo), expiraEm }
  })

  if (usuario) {
    await enviarEmailRecuperacao(usuario.nome, email, codigo, expiraEm)
  } else {
    // Equilibra o custo para não revelar se o e-mail existe no sistema.
    hashPassword(gerarCodigo())
  }

  const resultado: Record<string, unknown> = { ok: true, mensagem: MENSAGEM_GENERICA }
  if (DEV_RETORNAR_CODIGO && usuario) resultado.codigo = codigo
  return resultado
}

export async function validarCodigo(emailRaw: string, codigoRaw: string): Promise<unknown> {
  const db = getPrisma()
  const email = emailRaw.trim().toLowerCase()
  const codigo = codigoRaw.trim()
  const codigoDb = await codigoAtivo(email)
  if (!codigoDb) throw new AppError(MENSAGEM_CODIGO_INVALIDO)
  if (codigoDb.tentativas >= MAX_TENTATIVAS) {
    await db.codigoRecuperacao.delete({ where: { id: codigoDb.id } }).catch(() => undefined)
    throw new AppError('Número máximo de tentativas excedido. Solicite um novo código.')
  }
  if (!verifyPassword(codigo, codigoDb.codigoHash)) {
    const tentativas = codigoDb.tentativas + 1
    if (tentativas >= MAX_TENTATIVAS) {
      await db.codigoRecuperacao.delete({ where: { id: codigoDb.id } }).catch(() => undefined)
      throw new AppError('Número máximo de tentativas excedido. Solicite um novo código.')
    }
    await db.codigoRecuperacao.update({ where: { id: codigoDb.id }, data: { tentativas } })
    throw new AppError(MENSAGEM_CODIGO_INVALIDO)
  }
  return { ok: true }
}

export async function redefinirSenha(emailRaw: string, codigoRaw: string, novaSenhaRaw: string): Promise<unknown> {
  const db = getPrisma()
  const email = emailRaw.trim().toLowerCase()
  const codigo = codigoRaw.trim()
  const novaSenha = String(novaSenhaRaw || '')

  const erroSenha = validarRequisitosSenha(novaSenha)
  if (erroSenha) throw new AppError(erroSenha)

  const codigoDb = await codigoAtivo(email)
  if (!codigoDb) throw new AppError(MENSAGEM_CODIGO_INVALIDO)
  if (codigoDb.tentativas >= MAX_TENTATIVAS) {
    await db.codigoRecuperacao.delete({ where: { id: codigoDb.id } }).catch(() => undefined)
    throw new AppError('Número máximo de tentativas excedido. Solicite um novo código.')
  }
  if (!verifyPassword(codigo, codigoDb.codigoHash)) {
    const tentativas = codigoDb.tentativas + 1
    if (tentativas >= MAX_TENTATIVAS) {
      await db.codigoRecuperacao.delete({ where: { id: codigoDb.id } }).catch(() => undefined)
      throw new AppError('Número máximo de tentativas excedido. Solicite um novo código.')
    }
    await db.codigoRecuperacao.update({ where: { id: codigoDb.id }, data: { tentativas } })
    throw new AppError(MENSAGEM_CODIGO_INVALIDO)
  }

  const usuario = await db.usuario.findUnique({ where: { email } })
  if (!usuario) throw new AppError(MENSAGEM_CODIGO_INVALIDO)

  await db.usuario.update({ where: { id: usuario.id }, data: { senhaHash: hashPassword(novaSenha) } })
  // Invalida o código utilizado e qualquer outro código pendente do mesmo e-mail.
  await db.codigoRecuperacao.updateMany({ where: { email, usadoEm: null }, data: { usadoEm: new Date() } })
  // Encerra sessões existentes para reforçar a troca de senha.
  await db.sessao.deleteMany({ where: { usuarioId: usuario.id } })
  await registrarHistorico({
    entidade: 'usuario',
    entidadeId: usuario.id,
    usuarioId: usuario.id,
    tipo: 'ALTERACAO',
    descricao: 'Senha redefinida via recuperação'
  })
  return { ok: true }
}
