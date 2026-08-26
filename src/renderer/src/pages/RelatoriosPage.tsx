import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Download, FileText, FileSpreadsheet, BarChart3, PieChart } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { call, downloadTexto } from '../lib/api'
import { formatarData } from '../lib/format'
import { Button, Select, EmptyState, Loading } from '../components/ui'

interface RelatorioGeral {
  linhas: Array<{
    id: string
    titulo: string
    cliente: string
    projeto: string
    responsavel: string
    prioridade: string
    categoria: string
    status: string
    criadoEm: string
    prazo: string | null
    concluidaEm: string | null
    diasParaConcluir: number | null
    tags: string[]
  }>
  resumo: { total: number; abertas: number; concluidas: number; atrasadas: number; tempoMedioConclusao: number | null }
}

interface Agregado {
  grupo: string
  itens: Array<{ label: string; abertas: number; concluidas: number; atrasadas: number; total: number; percentualConclusao: number }>
}

const GRUPOS = [
  { valor: 'cliente', rotulo: 'Por cliente' },
  { valor: 'projeto', rotulo: 'Por projeto' },
  { valor: 'responsavel', rotulo: 'Por responsável' },
  { valor: 'prioridade', rotulo: 'Por prioridade' },
  { valor: 'categoria', rotulo: 'Por categoria' },
  { valor: 'tag', rotulo: 'Por tag' },
  { valor: 'status', rotulo: 'Por status' }
]

export function RelatoriosPage(): ReactNode {
  const pushToast = useAppStore((s) => s.pushToast)
  const [rel, setRel] = useState<RelatorioGeral | null>(null)
  const [agregado, setAgregado] = useState<Agregado | null>(null)
  const [grupo, setGrupo] = useState('cliente')
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true)
    const [r, a] = await Promise.all([
      call<RelatorioGeral>('relatorio', 'geral', {}).catch(() => null),
      call<Agregado>('relatorio', 'agregado', { grupo }).catch(() => null)
    ])
    setRel(r)
    setAgregado(a)
    setCarregando(false)
  }, [grupo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function exportarCsv(): Promise<void> {
    const r = await call<{ csv: string; nomeArquivo: string }>('relatorio', 'csv', {}).catch(() => null)
    if (!r) {
      pushToast('erro', 'Falha ao gerar CSV')
      return
    }
    downloadTexto(r.nomeArquivo, r.csv)
    pushToast('sucesso', 'Relatório CSV exportado', r.nomeArquivo)
  }

  async function exportarPdf(): Promise<void> {
    const r = await call<{ linhas: RelatorioGeral['linhas']; total: number }>('relatorio', 'pdf', {}).catch(() => null)
    if (!r) {
      pushToast('erro', 'Falha ao gerar PDF')
      return
    }
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('Relatório de Pendências', 14, 16)
    doc.setFontSize(10)
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${r.total} pendências`, 14, 23)
    const cabecalho = ['Título', 'Cliente', 'Projeto', 'Responsável', 'Prioridade', 'Status', 'Prazo']
    const colunas = [58, 30, 30, 30, 22, 26, 26]
    let y = 32
    doc.setFontSize(8)
    doc.setFillColor(37, 99, 235)
    doc.setTextColor(255)
    cabecalho.forEach((h, i) => {
      doc.rect(14 + colunas.slice(0, i).reduce((a, b) => a + b, 0), y, colunas[i], 6, 'F')
      doc.text(h, 15 + colunas.slice(0, i).reduce((a, b) => a + b, 0), y + 4)
    })
    doc.setTextColor(30)
    let linha = 0
    for (const l of r.linhas) {
      linha++
      if (linha % 40 === 0) {
        y = 40
        doc.addPage()
      }
      y += 6
      const valores = [l.titulo, l.cliente, l.projeto, l.responsavel, l.prioridade, l.status, l.prazo ? formatarData(l.prazo) : '']
      valores.forEach((v, i) => {
        doc.text(String(v).slice(0, 28), 15 + colunas.slice(0, i).reduce((a, b) => a + b, 0), y)
      })
    }
    doc.save(`relatorio-pendencias-${new Date().toISOString().slice(0, 10)}.pdf`)
    pushToast('sucesso', 'Relatório PDF exportado')
  }

  if (carregando && !rel) {
    return <div className="flex h-full items-center justify-center"><Loading label="Gerando relatórios…" /></div>
  }

  const maximo = Math.max(1, ...(agregado?.itens.map((i) => i.total) || [1]))

  return (
    <div className="h-full overflow-y-auto space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Relatórios</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void exportarCsv()}>
            <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="secondary" onClick={() => void exportarPdf()}>
            <FileText className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {rel && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="card !p-4"><p className="text-xs text-slate-400">Total</p><p className="text-2xl font-bold">{rel.resumo.total}</p></div>
          <div className="card !p-4"><p className="text-xs text-slate-400">Abertas</p><p className="text-2xl font-bold text-brand-600">{rel.resumo.abertas}</p></div>
          <div className="card !p-4"><p className="text-xs text-slate-400">Concluídas</p><p className="text-2xl font-bold text-emerald-600">{rel.resumo.concluidas}</p></div>
          <div className="card !p-4"><p className="text-xs text-slate-400">Atrasadas</p><p className="text-2xl font-bold text-red-600">{rel.resumo.atrasadas}</p></div>
          <div className="card !p-4"><p className="text-xs text-slate-400">Tempo médio (dias)</p><p className="text-2xl font-bold">{rel.resumo.tempoMedioConclusao ?? '—'}</p></div>
        </div>
      )}

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <PieChart className="h-4 w-4 text-brand-500" /> Visão agregada
          </h3>
          <Select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-48">
            {GRUPOS.map((g) => <option key={g.valor} value={g.valor}>{g.rotulo}</option>)}
          </Select>
        </div>
        {carregando ? (
          <Loading />
        ) : agregado && agregado.itens.length > 0 ? (
          <div className="space-y-3">
            {agregado.itens.map((i) => (
              <div key={i.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate font-medium text-slate-600 dark:text-slate-300">{i.label}</span>
                  <span className="ml-2 shrink-0 text-slate-400">{i.abertas} abertas · {i.concluidas} concluídas · {i.percentualConclusao}%</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-emerald-500" style={{ width: `${(i.concluidas / Math.max(1, i.total)) * 100}%` }} />
                  <div className="h-full bg-sky-500" style={{ width: `${(i.abertas / Math.max(1, i.total)) * 100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${(i.atrasadas / Math.max(1, i.total)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState titulo="Sem dados para agrupar" />
        )}
      </div>

      <div className="card">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <BarChart3 className="h-4 w-4 text-brand-500" /> Ranking por {grupo} ({maximo} itens)
        </h3>
        {agregado && agregado.itens.length > 0 ? (
          <div className="space-y-2">
            {agregado.itens.slice(0, 10).map((i, idx) => (
              <div key={i.label} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-xs font-bold text-slate-400">{idx + 1}º</span>
                <span className="w-40 min-w-0 shrink-0 truncate text-sm text-slate-700 dark:text-slate-300">{i.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(i.total / maximo) * 100}%` }} />
                </div>
                <span className="shrink-0 text-xs text-slate-400">{i.total}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState titulo="Sem dados" />
        )}
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Detalhamento ({rel?.linhas.length ?? 0} pendências)</h3>
        {rel && rel.linhas.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-400 dark:bg-slate-800">
                <tr>
                  <th className="px-2 py-2">Título</th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Responsável</th>
                  <th className="px-2 py-2">Prioridade</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Prazo</th>
                  <th className="px-2 py-2">Dias p/ concluir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rel.linhas.map((l) => (
                  <tr key={l.id}>
                    <td className="max-w-56 truncate px-2 py-1.5 font-medium text-slate-700 dark:text-slate-300">{l.titulo}</td>
                    <td className="px-2 py-1.5 text-slate-500">{l.cliente || '—'}</td>
                    <td className="px-2 py-1.5 text-slate-500">{l.responsavel || '—'}</td>
                    <td className="px-2 py-1.5 text-slate-500">{l.prioridade}</td>
                    <td className="px-2 py-1.5 text-slate-500">{l.status}</td>
                    <td className="px-2 py-1.5 text-slate-500">{l.prazo ? formatarData(l.prazo) : '—'}</td>
                    <td className="px-2 py-1.5 text-slate-500">{l.diasParaConcluir ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState titulo="Sem pendências" />
        )}
      </div>
    </div>
  )
}
