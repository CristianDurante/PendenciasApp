import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function formatarData(
  data: string | Date | null | undefined,
  opcoes: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  if (!data) return ''
  const d = typeof data === 'string' ? new Date(data) : data
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', opcoes)
}

export function formatarDataHora(data: string | Date | null | undefined): string {
  if (!data) return ''
  const d = typeof data === 'string' ? new Date(data) : data
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatarHora(data: string | Date | null | undefined): string {
  if (!data) return ''
  const d = typeof data === 'string' ? new Date(data) : data
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function dataParaInput(data: string | Date | null | undefined): string {
  if (!data) return ''
  const d = typeof data === 'string' ? new Date(data) : data
  if (isNaN(d.getTime())) return ''
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function diasAte(data: string | Date | null): number {
  if (!data) return Number.MAX_SAFE_INTEGER
  const d = typeof data === 'string' ? new Date(data) : data
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

export function relativo(data: string | Date | null): string {
  const dias = diasAte(data)
  if (dias === Number.MAX_SAFE_INTEGER) return ''
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias === -1) return 'ontem'
  if (dias < 0) return `há ${Math.abs(dias)} dias`
  return `em ${dias} dias`
}

export function iniciais(nome: string | null | undefined): string {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  const ini = partes.slice(0, 2).map((p) => p[0]).join('')
  return ini.toUpperCase()
}

export function hexContraste(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminancia > 0.6 ? '#0f172a' : '#ffffff'
}
