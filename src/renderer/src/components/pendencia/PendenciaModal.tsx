import { useEffect, useState, type ReactNode } from 'react'
import { Modal, Button, Spinner } from '../ui'
import { PendenciaForm, dadosDePendencia, type PendenciaFormData } from './PendenciaForm'
import { useAppStore } from '../../store/appStore'
import { useCatalogoStore } from '../../store/catalogoStore'
import { call } from '../../lib/api'
import type { Pendencia } from '@shared/types'

export function PendenciaModal(): ReactNode {
  const { aberto, presets } = useAppStore((s) => s.modalNovaPendencia)
  const fechar = useAppStore((s) => s.fecharNovaPendencia)
  const pushToast = useAppStore((s) => s.pushToast)
  const abrirPendencia = useAppStore((s) => s.abrirPendencia)
  const recarregarCatalogo = useCatalogoStore((s) => s.recarregar)
  const notificarMudanca = useAppStore((s) => s.notificarMudanca)

  const [dados, setDados] = useState<PendenciaFormData>({
    titulo: '',
    descricao: '',
    clienteId: '',
    projetoId: '',
    sistema: '',
    responsavelId: '',
    prazo: '',
    horario: '',
    prioridade: 'NORMAL',
    categoriaId: '',
    departamento: '',
    status: 'A_FAZER',
    tags: [],
    recorrencia: '',
    observacoes: ''
  })
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto) {
      if (presets?.pendencia) {
        const p = presets.pendencia as Pendencia
        setDados(dadosDePendencia(p))
        setEditandoId(p.id)
      } else {
        setDados({
          titulo: '',
          descricao: '',
          clienteId: (presets?.clienteId as string) || '',
          projetoId: (presets?.projetoId as string) || '',
          sistema: '',
          responsavelId: (presets?.responsavelId as string) || '',
          prazo: (presets?.prazo as string) || '',
          horario: '',
          prioridade: 'NORMAL',
          categoriaId: '',
          departamento: '',
          status: 'A_FAZER',
          tags: (presets?.tags as string[]) || [],
          recorrencia: '',
          observacoes: ''
        })
        setEditandoId(null)
      }
    }
  }, [aberto, presets])

  const salvar = async (): Promise<void> => {
    if (!dados.titulo.trim()) {
      pushToast('erro', 'Título obrigatório', 'Informe um título para a pendência.')
      return
    }
    setSalvando(true)
    try {
      const args: Record<string, unknown> = {
        titulo: dados.titulo.trim(),
        descricao: dados.descricao,
        clienteId: dados.clienteId || null,
        projetoId: dados.projetoId || null,
        sistema: dados.sistema,
        responsavelId: dados.responsavelId || null,
        prazo: dados.prazo || null,
        horario: dados.horario || null,
        prioridade: dados.prioridade,
        categoriaId: dados.categoriaId || null,
        departamento: dados.departamento || null,
        status: dados.status,
        tags: dados.tags,
        observacoes: dados.observacoes,
        recorrencia: dados.recorrencia
          ? { tipo: dados.recorrencia, intervalo: 1, ativo: true }
          : null
      }
      let pendencia: Pendencia
      if (editandoId) {
        pendencia = await call<Pendencia>('pendencia', 'atualizar', { id: editandoId, ...args })
        pushToast('sucesso', 'Pendência atualizada', `"${pendencia.titulo}" foi atualizada.`)
      } else {
        pendencia = await call<Pendencia>('pendencia', 'criar', args)
        pushToast('sucesso', 'Pendência criada', `"${pendencia.titulo}" foi criada.`)
      }
      abrirPendencia(pendencia)
      fechar()
      void recarregarCatalogo()
      notificarMudanca()
    } catch (e) {
      pushToast('erro', 'Erro ao salvar', (e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      titulo={editandoId ? 'Editar pendência' : 'Nova pendência'}
      largura="max-w-3xl"
      rodape={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? <Spinner className="h-4 w-4 !text-white" /> : null}
            {editandoId ? 'Salvar alterações' : 'Criar pendência'}
          </Button>
        </div>
      }
    >
      <PendenciaForm dados={dados} aoMudar={setDados} edicao={!!editandoId} />
    </Modal>
  )
}
