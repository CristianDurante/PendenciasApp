import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'node:path'
import type { ApiRequest } from '@shared/types'
import { dispatch } from './services/registry'
import { inicializarAplicacao, iniciarScheduler, pararScheduler } from './scheduler'
import { closeDatabase } from './db'

let janelaPrincipal: BrowserWindow | null = null

function criarJanela(): void {
  janelaPrincipal = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Pendencias App',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  janelaPrincipal.on('ready-to-show', () => {
    janelaPrincipal?.show()
  })

  janelaPrincipal.on('closed', () => {
    janelaPrincipal = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    janelaPrincipal.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    janelaPrincipal.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registrarIpc(): void {
  ipcMain.handle('pendencias:api', async (_evento, req: ApiRequest) => {
    return dispatch(req)
  })

  ipcMain.handle('pendencias:selecionarPasta', async () => {
    const options: Electron.OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] }
    const resultado = janelaPrincipal
      ? await dialog.showOpenDialog(janelaPrincipal, options)
      : await dialog.showOpenDialog(options)
    if (resultado.canceled || !resultado.filePaths.length) return null
    return resultado.filePaths[0]
  })

  ipcMain.handle('pendencias:abrirExterno', async (_e, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      await shell.openExternal(url)
    }
    return { ok: true }
  })

  ipcMain.handle('pendencias:janela', (_e, acao: string) => {
    const win = BrowserWindow.getFocusedWindow() || janelaPrincipal
    if (!win) return { ok: false }
    if (acao === 'minimizar') win.minimize()
    else if (acao === 'maximizar') {
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    } else if (acao === 'fechar') win.close()
    return { ok: true }
  })

  ipcMain.handle('pendencias:plataforma', () => process.platform)
}

app.whenReady().then(async () => {
  try {
    await inicializarAplicacao()
  } catch (err) {
    console.error('[pendencias] erro ao inicializar banco', err)
  }
  registrarIpc()
  criarJanela()
  iniciarScheduler()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  pararScheduler()
  void closeDatabase()
})
