import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ClipboardList, CheckCircle2, RotateCcw, ListTodo, MessageSquareReply, CalendarClock } from 'lucide-react'
import type { DadosDashboard, Pendencia, Retorno, Compromisso } from '@shared/types'
import { PENDENCIA_STATUS, PENDENCIA_STATUS_LABEL } from '@shared/constants'
import { useAppStore } from '../store/appStore'
import { call } from '../lib/api'
import { formatarData, diasAte } from '../lib/format'
import { Button, PriorityBadge, StatusBadge, RetornoStatusBadge, CompromissoStatusBadge, Avatar, Loading, EmptyState, Select } from '../components/ui'

export function MinhasAtividadesPage(): ReactNode {
  const sessao = useAppStore((s) => s.sessao)
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const pushToast = useAppStore((s) => s.pushToast)
  const dataVersao = useAppStore((s) => s.dataVersao)
  const notificarMudanca = useAppStore((s) => s.notificarMudanca)

  const [dados, setDados] = useState<DadosDashboard | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState('')
  const requisicaoAtual = useRef(0)

  const carregar = useCallback(async (): Promise<void> => {
    const requisicao = ++requisicaoAtual.current
    setCarregando(true)
    try {
      const d = await call<DadosDashboard>('dashboard', 'obter')
      if (requisicao !== requisicaoAtual.current) return
      setDados(d)
      setErro('')
    } catch (e) {
      if (requisicao !== requisicaoAtual.current) return
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar suas atividades.')
    } finally {
      if (requisicao === requisicaoAtual.current) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
    return () => {
      requisicaoAtual.current += 1
    }
  }, [dataVersao, carregar])

  const meuId = sessao?.usuario.id
  const ehConsultor = sessao?.usuario.perfil === 'USUARIO'

  const minhasPendencias: Pendencia[] = dados?.minhasPendencias || []
  const unicos = minhasPendencias.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
  const meusRetornos: Retorno[] = dados
    ? [...dados.retornosAtrasados, ...dados.retornosPendentes].filter((r) => !r.responsavelId || r.responsavelId === meuId)
    : []
  const meusCompromissos: Compromisso[] = dados
    ? [...dados.compromissosHoje, ...dados.proximosCompromissos].filter(
        (c) =>
          c.responsavelId === meuId ||
          c.responsavelId === null ||
          (!!meuId && (c.participantes || '').includes(meuId))
      )
    : []

  async function concluir(p: Pendencia): Promise<void> {
    setBusy(p.id)
    try {
      await call('pendencia', 'concluir', { id: p.id })
      pushToast('sucesso', 'Pendência concluída')
      await carregar()
      notificarMudanca()
    } catch (e) {
      pushToast('erro', 'Falha ao concluir', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy('')
    }
  }

  async function reabrir(p: Pendencia): Promise<void> {
    setBusy(p.id)
    try {
      await call('pendencia', 'reabrir', { id: p.id })
      pushToast('sucesso', 'Pendência reaberta')
      await carregar()
      notificarMudanca()
    } catch (e) {
      pushToast('erro', 'Falha ao reabrir', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy('')
    }
  }

  async function alterarStatus(p: Pendencia, status: string): Promise<void> {
    setBusy(p.id)
    try {
      await call('pendencia', 'status', { id: p.id, status })
      pushToast('sucesso', 'Status atualizado')
      await carregar()
      notificarMudanca()
    } catch (e) {
      pushToast('erro', 'Falha ao atualizar status', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy('')
    }
  }

  if (carregando && !dados) {
    return <div className="flex h-full items-center justify-center"><Loading label="Carregando atividades…" /></div>
  }
  if (!dados) {
    return (
      <EmptyState
        titulo="Não foi possível carregar"
        descricao={erro}
        acao={<Button variant="secondary" onClick={() => void carregar()}>Tentar novamente</Button>}
      />
    )
  }

  return (
    <div className="space-y-4 p-4">
      {erro && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <span>Não foi possível atualizar as atividades: {erro}</span>
          <Button variant="secondary" size="sm" onClick={() => void carregar()}>Tentar novamente</Button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <ClipboardList className="h-6 w-6 text-brand-500" /> Minhas Atividades
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <ListTodo className="h-4 w-4 text-brand-500" /> Minhas pendências
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{unicos.length}</span>
          </h3>
          {unicos.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma pendência atribuída a você.</p>
          ) : (
            <div className="space-y-2">
              {unicos.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <PriorityBadge prioridade={p.prioridade} compacto />
                    <button onClick={() => abrirPendencia(p)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300">
                      {p.titulo}
                    </button>
                    {ehConsultor ? (
                      <Select
                        className="!w-auto !py-1 text-xs"
                        value={p.status}
                        disabled={!!busy}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => void alterarStatus(p, e.target.value)}
                        aria-label={`Alterar status de ${p.titulo}`}
                      >
                        {PENDENCIA_STATUS.map((status) => (
                          <option key={status} value={status}>{PENDENCIA_STATUS_LABEL[status]}</option>
                        ))}
                      </Select>
                    ) : <StatusBadge status={p.status} />}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {p.cliente?.nome && <span>{p.cliente.nome}</span>}
                      {p.prazo && <span className={p.atrasada ? 'font-semibold text-red-500' : ''}>{formatarData(p.prazo)} ({diasAte(p.prazo)})</span>}
                      {p.atrasada && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-300">ATRASADA</span>}
                    </div>
                    {!ehConsultor && <div className="flex gap-1">
                      {p.status === 'CONCLUIDA' ? (
                        <Button variant="ghost" size="sm" onClick={() => void reabrir(p)} disabled={!!busy}>
                          <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => void concluir(p)} disabled={!!busy}>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Concluir
                        </Button>
                      )}
                    </div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <MessageSquareReply className="h-4 w-4 text-amber-500" /> Meus retornos
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{meusRetornos.length}</span>
          </h3>
          {meusRetornos.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum retorno pendente para você.</p>
          ) : (
            <div className="space-y-2">
              {meusRetornos.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.assunto}</p>
                    <p className="text-xs text-slate-400">
                      {r.cliente?.nome || 'Sem cliente'}
                      {r.dataPrevista ? ` · ${formatarData(r.dataPrevista)}` : ''}
                    </p>
                  </div>
                  <RetornoStatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <CalendarClock className="h-4 w-4 text-violet-500" /> Meus compromissos
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{meusCompromissos.length}</span>
          </h3>
          {meusCompromissos.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum compromisso próximo.</p>
          ) : (
            <div className="space-y-2">
              {meusCompromissos.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {formatarData(c.data)}
                      {c.horaInicio && ` · ${c.horaInicio}`}
                      {c.cliente?.nome && ` · ${c.cliente.nome}`}
                    </p>
                  </div>
                  <CompromissoStatusBadge status={c.status} />
                  {c.responsavel && <Avatar nome={c.responsavel.nome} tamanho={24} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
