import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { RefreshCw, Sun, ListTodo, CalendarClock, MessageSquareReply, AlarmClock, Trash2, Plus } from 'lucide-react'
import type { DadosDashboard, Lembrete } from '@shared/types'
import { useAppStore } from '../store/appStore'
import { call } from '../lib/api'
import { formatarDataHora, diasAte } from '../lib/format'
import { Button, Input, Modal, PriorityBadge, StatusBadge, Avatar, EmptyState, Loading, ConfirmDialog } from '../components/ui'

export function MeuDiaPage(): ReactNode {
  const sessao = useAppStore((s) => s.sessao)
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const pushToast = useAppStore((s) => s.pushToast)

  const [dados, setDados] = useState<DadosDashboard | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [modalLembrete, setModalLembrete] = useState(false)
  const [lembreteMsg, setLembreteMsg] = useState('')
  const [lembreteData, setLembreteData] = useState('')
  const [excluirLembrete, setExcluirLembrete] = useState<Lembrete | null>(null)

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true)
    const d = await call<DadosDashboard>('dashboard', 'obter').catch(() => null)
    setDados(d)
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionarLembrete(): Promise<void> {
    if (!lembreteData || !lembreteMsg.trim()) {
      pushToast('alerta', 'Informe data/hora e mensagem do lembrete.')
      return
    }
    try {
      const dt = lembreteData.includes('T') ? lembreteData : `${lembreteData}T09:00`
      await call('lembrete', 'criar', { dataHora: dt, mensagem: lembreteMsg.trim() })
      pushToast('sucesso', 'Lembrete agendado')
      setModalLembrete(false)
      setLembreteMsg('')
      setLembreteData('')
      await carregar()
    } catch (e) {
      pushToast('erro', 'Falha ao criar lembrete', e instanceof Error ? e.message : undefined)
    }
  }

  async function excluirLembreteOk(): Promise<void> {
    if (!excluirLembrete) return
    await call('lembrete', 'excluir', { id: excluirLembrete.id }).catch(() => null)
    setExcluirLembrete(null)
    pushToast('sucesso', 'Lembrete excluído')
    await carregar()
  }

  if (carregando && !dados) {
    return <div className="flex h-full items-center justify-center"><Loading label="Carregando Meu Dia…" /></div>
  }
  if (!dados) {
    return <EmptyState titulo="Não foi possível carregar" />
  }

  const pend = dados.meuDia.pendencias
  const comp = dados.meuDia.compromissos
  const ret = dados.meuDia.retornos
  const nome = sessao?.usuario.nome?.split(' ')[0] || ''

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <Sun className="h-6 w-6 text-amber-500" /> Meu Dia
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {nome ? `${nome}, ` : ''}aqui está o seu foco de hoje: {pend.length} pendência(s), {comp.length} compromisso(s) e {ret.length} retorno(s).
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void carregar()}>
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <ListTodo className="h-4 w-4 text-brand-500" /> Pendências
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{pend.length}</span>
          </h3>
          {pend.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma pendência para hoje. Aproveite!</p>
          ) : (
            <div className="space-y-2">
              {pend.map((p) => (
                <button
                  key={p.id}
                  onClick={() => abrirPendencia(p)}
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <PriorityBadge prioridade={p.prioridade} compacto />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{p.titulo}</span>
                  {p.atrasada && <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-300">ATRASADA</span>}
                  {p.prazo && <span className="shrink-0 text-[11px] text-slate-400">{diasAte(p.prazo)}</span>}
                  <StatusBadge status={p.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <CalendarClock className="h-4 w-4 text-violet-500" /> Compromissos
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{comp.length}</span>
          </h3>
          {comp.length === 0 ? (
            <p className="text-sm text-slate-400">Sem compromissos hoje.</p>
          ) : (
            <div className="space-y-2">
              {comp.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {c.horaInicio ? `${c.horaInicio}${c.horaFim ? `–${c.horaFim}` : ''} · ` : ''}
                      {c.cliente?.nome || 'Sem cliente'}
                    </p>
                  </div>
                  {c.responsavel && <Avatar nome={c.responsavel.nome} tamanho={24} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <MessageSquareReply className="h-4 w-4 text-amber-500" /> Retornos
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{ret.length}</span>
          </h3>
          {ret.length === 0 ? (
            <p className="text-sm text-slate-400">Sem retornos pendentes.</p>
          ) : (
            <div className="space-y-2">
              {ret.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                    <MessageSquareReply className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.assunto}</p>
                    <p className="text-xs text-slate-400">
                      {r.cliente?.nome || 'Sem cliente'}
                      {r.dataPrevista ? ` · ${formatarDataHora(r.dataPrevista)}` : ''}
                    </p>
                  </div>
                  {r.responsavel && <Avatar nome={r.responsavel.nome} tamanho={24} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <AlarmClock className="h-4 w-4 text-amber-500" /> Lembretes
            </h3>
            <Button variant="secondary" size="sm" onClick={() => setModalLembrete(true)}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
          {dados.lembretes.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum lembrete agendado.</p>
          ) : (
            <div className="space-y-2">
              {dados.lembretes.map((l) => (
                <div key={l.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{l.mensagem}</p>
                    <p className="text-xs text-slate-400">{formatarDataHora(l.dataHora)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setExcluirLembrete(l)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal aberto={modalLembrete} aoFechar={() => setModalLembrete(false)} titulo="Novo lembrete" largura="max-w-md">
        <div className="space-y-3">
          <div>
            <label className="label">Data e hora *</label>
            <Input type="datetime-local" value={lembreteData} onChange={(e) => setLembreteData(e.target.value)} />
          </div>
          <div>
            <label className="label">Mensagem *</label>
            <Input value={lembreteMsg} onChange={(e) => setLembreteMsg(e.target.value)} placeholder="Ex.: Ligar para o cliente" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalLembrete(false)}>Cancelar</Button>
          <Button onClick={() => void adicionarLembrete()}>Agendar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={!!excluirLembrete}
        aoFechar={() => setExcluirLembrete(null)}
        aoConfirmar={() => void excluirLembreteOk()}
        titulo="Excluir lembrete"
        mensagem={`Excluir o lembrete "${excluirLembrete?.mensagem || ''}"?`}
        confirmarTexto="Excluir"
        perigo
      />
    </div>
  )
}
