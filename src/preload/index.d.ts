import type { ApiRequest, ApiResponse } from '@shared/types'

export interface PendenciasApi {
  invoke<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>>
  selecionarPasta(): Promise<string | null>
  abrirExterno(url: string): Promise<unknown>
  janela(acao: 'minimizar' | 'maximizar' | 'fechar'): Promise<unknown>
  plataforma(): Promise<string>
}

export interface PendenciasBridge {
  api: PendenciasApi
}

declare global {
  interface Window {
    pendencias?: PendenciasBridge
  }
}

export {}
