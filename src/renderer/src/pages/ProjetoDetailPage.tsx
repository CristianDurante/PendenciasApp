import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FolderKanban, Plus, ListTodo, CheckCircle2 } from 'lucide-react'
import type { Projeto, Pendencia } from '@shared/types'
import { useAppStore } from '../store/appStore'
import { call } from '../lib/api'
import { formatarData } from '../lib/format'
import { Button, ProjetoStatusBadge, ProgressBar, EmptyState, Loading, Avatar } from '../components/ui'
import { PendenciaCard } from '../components/pendencia/PendenciaCard'

interface ProjetoDetail extends Projeto {
  cliente?: { id: string; nome: string } | null
  responsavel?: { id: string; nome: string; avatar: string | null } | null
  pendencias: Pendencia[]
}

export function ProjetoDetailPage(): ReactNode {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const abrirNovaPendencia = useAppStore((s) => s.abrirNovaPendencia)

  const [dados, setDados] = useState<ProjetoDetail | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!id) return
    setCarregando(true)
    void call<ProjetoDetail>('projeto', 'obter', { id })
      .then(setDados)
      .finally(() => setCarregando(false))
  }, [id])

  if (carregando) {
    return <div className="flex h-full items-center justify-center"><Loading label="Carregando projeto…" /></div>
  }
  if (!dados) {
    return <EmptyState titulo="Projeto não encontrado" />
  }

  const abertas = dados.pendencias.filter((p) => p.status !== 'CONCLUIDA' && p.status !== 'CANCELADA')
  const concluidas = dados.pendencias.filter((p) => p.status === 'CONCLUIDA')
  const progresso = dados.pendencias.length === 0 ? 0 : Math.round((concluidas.length / dados.pendencias.length) * 100)

  return (
    <div className="h-full overflow-y-auto p-4">
      <button onClick={() => navigate('/projetos')} className="mb-3 flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Voltar para projetos
      </button>

      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-2xl font-black text-white">
            <FolderKanban className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-slate-900 dark:text-white">{dados.nome}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {dados.cliente?.nome || 'Sem cliente'}
              {dados.dataInicio && ` · início ${formatarData(dados.dataInicio)}`}
              {dados.dataFim && ` · fim ${formatarData(dados.dataFim)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dados.responsavel && (
              <div className="flex items-center gap-1.5">
                <Avatar nome={dados.responsavel.nome} tamanho={28} />
                <span className="text-sm text-slate-500 dark:text-slate-400">{dados.responsavel.nome}</span>
              </div>
            )}
            <ProjetoStatusBadge status={dados.status} />
            <Button onClick={() => abrirNovaPendencia({ projetoId: dados.id })}>
              <Plus className="h-4 w-4" /> Nova pendência
            </Button>
          </div>
        </div>
        {dados.descricao && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{dados.descricao}</p>}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span>Progresso: {concluidas.length}/{dados.pendencias.length} pendências concluídas</span>
            <span>{progresso}%</span>
          </div>
          <ProgressBar valor={progresso} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <ListTodo className="h-4 w-4 text-brand-500" /> Pendências abertas ({abertas.length})
          </h3>
          {abertas.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma pendência aberta. Bom trabalho!</p>
          ) : (
            <div className="space-y-2">
              {abertas.map((p) => <PendenciaCard key={p.id} pendencia={p} aoClicar={abrirPendencia} />)}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Concluídas ({concluidas.length})
          </h3>
          {concluidas.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma pendência concluída ainda.</p>
          ) : (
            <div className="space-y-2">
              {concluidas.map((p) => <PendenciaCard key={p.id} pendencia={p} aoClicar={abrirPendencia} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
