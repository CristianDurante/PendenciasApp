import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Mail, Phone, User, Pencil, Plus, ListTodo, CalendarClock, MessageSquareReply, StickyNote } from 'lucide-react'
import type { DadosClienteDetail, Pendencia } from '@shared/types'
import { useAppStore } from '../store/appStore'
import { call } from '../lib/api'
import { formatarData } from '../lib/format'
import { Button, StatusBadge, PriorityBadge, EmptyState, Loading, Avatar } from '../components/ui'
import { PendenciaCard } from '../components/pendencia/PendenciaCard'

export function ClienteDetailPage(): ReactNode {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const abrirNovaPendencia = useAppStore((s) => s.abrirNovaPendencia)

  const [dados, setDados] = useState<DadosClienteDetail | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!id) return
    setCarregando(true)
    void call<DadosClienteDetail>('cliente', 'detalhe', { id })
      .then(setDados)
      .finally(() => setCarregando(false))
  }, [id])

  if (carregando) {
    return <div className="flex h-full items-center justify-center"><Loading label="Carregando cliente…" /></div>
  }
  if (!dados) {
    return <EmptyState titulo="Cliente não encontrado" descricao="O cliente pode ter sido removido." />
  }

  const c = dados.cliente

  return (
    <div className="h-full overflow-y-auto p-4">
      <button onClick={() => navigate('/clientes')} className="mb-3 flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Voltar para clientes
      </button>

      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white">
            {c.nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-slate-900 dark:text-white">{c.nome}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {[c.empresa, c.contato, c.projeto].filter(Boolean).join(' · ') || 'Sem detalhes adicionais'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => abrirNovaPendencia({ clienteId: c.id })}>
              <Plus className="h-4 w-4" /> Nova pendência
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-400">Pendências abertas</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{dados.pendenciasAbertas}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-400">Concluídas</p>
            <p className="text-xl font-bold text-emerald-600">{dados.pendenciasConcluidas}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-400">Atrasadas</p>
            <p className={dados.pendenciasAtrasadas ? 'text-xl font-bold text-red-600' : 'text-xl font-bold text-slate-800 dark:text-white'}>{dados.pendenciasAtrasadas}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-400">Compromissos</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{dados.compromissos.length}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2 dark:text-slate-300">
          {c.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {c.email}</p>}
          {c.telefone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {c.telefone}</p>}
          {c.cnpj && <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" /> CNPJ {c.cnpj}</p>}
          {c.sistema && <p className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> Sistema: {c.sistema}</p>}
          {c.responsavelInterno && <p className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> Resp. interno: {c.responsavelInterno}</p>}
        </div>
        {c.observacoes && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {c.observacoes}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <ListTodo className="h-4 w-4 text-brand-500" /> Pendências
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{dados.pendencias.length}</span>
          </h3>
          {dados.pendencias.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma pendência para este cliente.</p>
          ) : (
            <div className="space-y-2">
              {dados.pendencias.slice(0, 10).map((p) => (
                <PendenciaCard key={p.id} pendencia={p} aoClicar={abrirPendencia} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <CalendarClock className="h-4 w-4 text-violet-500" /> Compromissos
            </h3>
            {dados.compromissos.length === 0 ? (
              <p className="text-sm text-slate-400">Sem compromissos.</p>
            ) : (
              <div className="space-y-1.5">
                {dados.compromissos.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                    <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{c.titulo}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatarData(c.data)} {c.horaInicio}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <MessageSquareReply className="h-4 w-4 text-amber-500" /> Retornos
            </h3>
            {dados.retornos.length === 0 ? (
              <p className="text-sm text-slate-400">Sem retornos.</p>
            ) : (
              <div className="space-y-1.5">
                {dados.retornos.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                    <MessageSquareReply className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{r.assunto}</span>
                    {r.responsavel && <Avatar nome={r.responsavel.nome} tamanho={20} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <StickyNote className="h-4 w-4 text-amber-500" /> Anotações
            </h3>
            {dados.notas.length === 0 ? (
              <p className="text-sm text-slate-400">Sem anotações.</p>
            ) : (
              <div className="space-y-1.5">
                {dados.notas.map((n) => (
                  <div key={n.id} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{n.titulo}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.conteudo || ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
