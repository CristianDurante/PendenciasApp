import { ensureDatabase, closeDatabase } from './db'
import { ensureBootstrap } from './bootstrap'
import { gerarNotificacoesParaTodos } from './services/notificacao.service'
import { dispararLembretesCompromisso } from './services/compromisso.service'
import { backupAutomatico } from './services/backup.service'

let intervaloTimer: NodeJS.Timeout | null = null
let checagemBackupCount = 0
let executando = false

export async function tick(): Promise<void> {
  if (executando) return
  executando = true
  try {
    await gerarNotificacoesParaTodos()
  } catch (err) {
    console.error('[scheduler] notificações', err)
  }
  try {
    await dispararLembretesCompromisso()
  } catch (err) {
    console.error('[scheduler] lembretes', err)
  }
  checagemBackupCount += 1
  if (checagemBackupCount >= 10) {
    checagemBackupCount = 0
    try {
      await backupAutomatico()
    } catch (err) {
      console.error('[scheduler] backup', err)
    }
  }
  executando = false
}

export function iniciarScheduler(): void {
  if (intervaloTimer) return
  void tick()
  intervaloTimer = setInterval(() => void tick(), 60000)
}

export function pararScheduler(): void {
  if (intervaloTimer) {
    clearInterval(intervaloTimer)
    intervaloTimer = null
  }
}

export async function inicializarAplicacao(): Promise<void> {
  await ensureDatabase()
  await ensureBootstrap()
}
