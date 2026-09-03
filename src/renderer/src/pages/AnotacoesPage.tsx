import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Bold, Check, FileText, Italic, List, ListOrdered, Loader2, Underline } from 'lucide-react'
import type { Nota } from '@shared/types'
import { useAppStore } from '../store/appStore'
import { call } from '../lib/api'

export function AnotacoesPage(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const [nota, setNota] = useState<Nota | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true)
    try {
      const notas = await call<Nota[]>('nota', 'listar')
      const existente = notas.find((item) => item.titulo === 'Meu bloco de notas')
      if (existente) {
        setNota(existente)
      } else {
        const criada = await call<Nota>('nota', 'criar', { titulo: 'Meu bloco de notas', conteudo: '' })
        setNota(criada)
      }
    } catch (e) {
      pushToast('erro', 'Não foi possível abrir suas anotações', e instanceof Error ? e.message : undefined)
    } finally {
      setCarregando(false)
    }
  }, [pushToast])

  useEffect(() => {
    if (!carregando && editorRef.current && nota) editorRef.current.innerHTML = nota.conteudo || ''
  }, [carregando, nota?.id])

  useEffect(() => {
    void carregar()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [carregar])

  function alterarTexto(valor: string): void {
    setSalvo(false)
    if (!nota) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void salvar(valor)
    }, 700)
  }

  function executar(comando: string, valor?: string): void {
    editorRef.current?.focus()
    document.execCommand(comando, false, valor)
    alterarTexto(editorRef.current?.innerHTML || '')
  }

  async function salvar(valor: string): Promise<void> {
    if (!nota) return
    setSalvando(true)
    try {
      const atualizada = await call<Nota>('nota', 'atualizar', { id: nota.id, conteudo: valor })
      setNota(atualizada)
      setSalvo(true)
    } catch (e) {
      pushToast('erro', 'Falha ao salvar anotação', e instanceof Error ? e.message : undefined)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-300"><FileText className="h-5 w-5" /></div>
            <div>
              <h1 className="font-semibold text-slate-900 dark:text-white">Meu bloco de notas</h1>
              <p className="text-xs text-slate-400">Suas anotações pessoais</p>
            </div>
          </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400" aria-live="polite">
            {carregando || salvando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</> : salvo ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Salvo</> : null}
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-5 py-2 dark:border-slate-700">
          <button type="button" title="Negrito" aria-label="Negrito" onMouseDown={(e) => e.preventDefault()} onClick={() => executar('bold')} className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Bold className="h-4 w-4" /></button>
          <button type="button" title="Itálico" aria-label="Itálico" onMouseDown={(e) => e.preventDefault()} onClick={() => executar('italic')} className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Italic className="h-4 w-4" /></button>
          <button type="button" title="Sublinhado" aria-label="Sublinhado" onMouseDown={(e) => e.preventDefault()} onClick={() => executar('underline')} className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Underline className="h-4 w-4" /></button>
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <button type="button" title="Lista com marcadores" aria-label="Lista com marcadores" onMouseDown={(e) => e.preventDefault()} onClick={() => executar('insertUnorderedList')} className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><List className="h-4 w-4" /></button>
          <button type="button" title="Lista numerada" aria-label="Lista numerada" onMouseDown={(e) => e.preventDefault()} onClick={() => executar('insertOrderedList')} className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ListOrdered className="h-4 w-4" /></button>
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400">Cor</span>
          {['#334155', '#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea'].map((cor) => (
            <button key={cor} type="button" title={`Cor ${cor}`} aria-label={`Aplicar cor ${cor}`} onMouseDown={(e) => e.preventDefault()} onClick={() => executar('foreColor', cor)} className="h-5 w-5 rounded-full border border-white shadow-sm ring-1 ring-slate-200 dark:border-slate-900 dark:ring-slate-700" style={{ backgroundColor: cor }} />
          ))}
        </div>
        <div className="flex-1 p-5 md:p-8">
          {carregando ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Abrindo suas anotações...</div>
          ) : (
            <div
              autoFocus
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => alterarTexto(e.currentTarget.innerHTML)}
              data-placeholder="Comece a escrever..."
              className="h-full min-h-[420px] w-full overflow-y-auto border-0 bg-transparent text-base leading-7 text-slate-700 outline-none empty:before:text-slate-300 empty:before:content-[attr(data-placeholder)] dark:text-slate-200 dark:empty:before:text-slate-600"
              aria-label="Texto das minhas anotações"
            />
          )}
        </div>
      </div>
    </div>
  )
}
