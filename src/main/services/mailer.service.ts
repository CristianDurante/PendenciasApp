import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let transporter: Transporter | null = null

function obterTransporter(): Transporter | null {
  const host = process.env.PENDIFY_SMTP_HOST
  if (!host) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.PENDIFY_SMTP_PORT || 587),
      secure: process.env.PENDIFY_SMTP_SECURE === '1' || process.env.PENDIFY_SMTP_SECURE === 'true',
      auth: process.env.PENDIFY_SMTP_USER
        ? { user: process.env.PENDIFY_SMTP_USER, pass: process.env.PENDIFY_SMTP_PASS }
        : undefined
    })
  }
  return transporter
}

export async function enviarEmailRecuperacao(
  nome: string,
  email: string,
  codigo: string,
  expiraEm: Date
): Promise<void> {
  const de = process.env.PENDIFY_SMTP_FROM || process.env.PENDIFY_SMTP_USER || 'no-reply@pendify.local'
  const assunto = 'Pendencias App - Código de recuperação de senha'
  const validade = expiraEm.toLocaleString('pt-BR')
  const texto = [
    `Olá ${nome},`,
    '',
    'Você solicitou a recuperação da sua senha no Pendencias App.',
    '',
    `Seu código de segurança é: ${codigo}`,
    '',
    `Ele é válido até ${validade} e pode ser utilizado apenas uma vez.`,
    'Se você não solicitou esta alteração, pode ignorar este e-mail.',
    ''
  ].join('\n')

  const t = obterTransporter()
  if (t) {
    try {
      await t.sendMail({ from: de, to: email, subject: assunto, text: texto })
      return
    } catch (e) {
      console.error('[mailer] falha ao enviar e-mail:', e)
    }
  }
  // Fallback para desenvolvimento quando o SMTP não está configurado:
  // o código é exibido no console para permitir testar o fluxo localmente.
  console.log(`\n[pendify-recuperacao] Código para ${email}: ${codigo} (válido até ${validade})\n`)
}
