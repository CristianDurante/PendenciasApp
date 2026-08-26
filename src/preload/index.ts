import { contextBridge, ipcRenderer } from 'electron'
import type { ApiRequest, ApiResponse } from '@shared/types'

const api = {
  invoke<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
    return ipcRenderer.invoke('pendify:api', req)
  },
  selecionarPasta(): Promise<string | null> {
    return ipcRenderer.invoke('pendify:selecionarPasta')
  },
  abrirExterno(url: string): Promise<unknown> {
    return ipcRenderer.invoke('pendify:abrirExterno', url)
  },
  janela(acao: 'minimizar' | 'maximizar' | 'fechar'): Promise<unknown> {
    return ipcRenderer.invoke('pendify:janela', acao)
  },
  plataforma(): Promise<string> {
    return ipcRenderer.invoke('pendify:plataforma')
  }
}

contextBridge.exposeInMainWorld('pendify', {
  api
})
