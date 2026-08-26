import type { ApiRequest, ApiResponse } from '@shared/types'

export interface PendifyApi {
  invoke<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>>
  selecionarPasta(): Promise<string | null>
  abrirExterno(url: string): Promise<unknown>
  janela(acao: 'minimizar' | 'maximizar' | 'fechar'): Promise<unknown>
  plataforma(): Promise<string>
}

export interface PendifyBridge {
  api: PendifyApi
}

declare global {
  interface Window {
    pendify?: PendifyBridge
  }
}

export {}
