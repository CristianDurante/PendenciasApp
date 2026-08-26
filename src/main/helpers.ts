export function deepIso<T>(value: unknown): T {
  if (value === null || value === undefined) return value as T
  if (value instanceof Date) return value.toISOString() as T
  if (Array.isArray(value)) return value.map((v) => deepIso(v)) as T
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = deepIso((value as Record<string, unknown>)[key])
    }
    return out as T
  }
  return value as T
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function isAtrasada(prazo: Date | null, status: string): boolean {
  if (!prazo || status === 'CONCLUIDA' || status === 'CANCELADA') return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const fimDoPrazo = new Date(prazo)
  fimDoPrazo.setHours(23, 59, 59, 999)
  return fimDoPrazo < hoje
}

export function dataInicioDoDia(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function dataFimDoDia(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function addDias(d: Date, dias: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + dias)
  return x
}

export function calcularProgresso(checklist: Array<{ concluido: boolean }>): number {
  if (checklist.length === 0) return 0
  const done = checklist.filter((i) => i.concluido).length
  return Math.round((done / checklist.length) * 100)
}

export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase()
}

export function somenteDigitos(texto: string | null | undefined): string {
  return (texto || '').replace(/\D/g, '')
}
