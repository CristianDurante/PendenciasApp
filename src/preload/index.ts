import { contextBridge, ipcRenderer } from 'electron'
import type { ApiRequest, ApiResponse } from '@shared/types'

const api = {
  invoke<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
    return ipcRenderer.invoke('pendencias:api', req)
  },
  selecionarPasta(): Promise<string | null> {
    return ipcRenderer.invoke('pendencias:selecionarPasta')
  },
  abrirExterno(url: string): Promise<unknown> {
    return ipcRenderer.invoke('pendencias:abrirExterno', url)
  },
  janela(acao: 'minimizar' | 'maximizar' | 'fechar'): Promise<unknown> {
    return ipcRenderer.invoke('pendencias:janela', acao)
  },
  plataforma(): Promise<string> {
    return ipcRenderer.invoke('pendencias:plataforma')
  }
}

contextBridge.exposeInMainWorld('pendencias', {
  api
})
