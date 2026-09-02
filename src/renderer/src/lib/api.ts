import type { ApiResponse } from '@shared/types'

const TOKEN_KEY = 'pendify.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.pendify
}

function apiBase(): string {
  return (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE || ''
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function call<T = unknown>(
  resource: string,
  action: string,
  args: object = {},
  opts?: { token?: string | null; semToken?: boolean }
): Promise<T> {
  const token = opts?.semToken ? undefined : (opts?.token ?? getToken())
  const req = { resource, action, args, token: token || undefined }

  let resposta: ApiResponse<T>
  if (isElectron()) {
    resposta = await window.pendify!.api.invoke<T>(req)
  } else {
    const base = apiBase()
    const r = await fetch(`${base}/api/${resource}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ args })
    })
    resposta = (await r.json()) as ApiResponse<T>
    if (r.status === 401) {
      setToken(null)
    }
  }

  if (!resposta.ok) {
    throw new ApiError(resposta.error || 'Erro desconhecido')
  }
  return resposta.data as T
}

export function downloadArquivo(nome: string, conteudoBase64: string, tipo: string): void {
  const mime: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain'
  }
  const byteCharacters = atob(conteudoBase64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mime[tipo] || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadTexto(nome: string, conteudo: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([conteudo], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
