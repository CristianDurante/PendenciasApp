import { useEffect, useState, type ReactNode } from 'react'
import type { Pendencia, Prioridade, PendenciaStatus } from '@shared/types'
import { PRIORIDADES, PENDENCIA_STATUS, RECORRENCIA_OPCOES, DEPARTAMENTOS_SUGERIDOS, PENDENCIA_STATUS_LABEL, PRIORIDADE_LABEL } from '@shared/constants'
import { Field, Input, Select, Textarea } from '../ui'
import { TagPicker } from './TagPicker'
import { useCatalogoStore } from '../../store/catalogoStore'
import { dataParaInput } from '../../lib/format'

export interface PendenciaFormData {
  titulo: string
  descricao: string
  clienteId: string
  projetoId: string
  sistema: string
  responsavelId: string
  prazo: string
  horario: string
  prioridade: Prioridade
  categoriaId: string
  departamento: string
  status: PendenciaStatus
  tags: string[]
  recorrencia: string
  observacoes: string
  equipeId: string
}

const estadoInicial: PendenciaFormData = {
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
  observacoes: '',
  equipeId: ''
}

export function dadosDePendencia(p: Pendencia): PendenciaFormData {
  return {
    titulo: p.titulo,
    descricao: p.descricao || '',
    clienteId: p.clienteId || '',
    projetoId: p.projetoId || '',
    sistema: p.sistema || '',
    responsavelId: p.responsavelId || '',
    prazo: dataParaInput(p.prazo),
    horario: p.horario || '',
    prioridade: p.prioridade,
    categoriaId: p.categoriaId || '',
    departamento: p.departamento || '',
    status: p.status,
    tags: (p.tags || []).map((t) => t.tagId),
    recorrencia: p.recorrencia ? (JSON.parse(p.recorrencia) as { tipo: string }).tipo : '',
    observacoes: p.observacoes || '',
    equipeId: p.equipeId || ''
  }
}

export function PendenciaForm({
  dados,
  aoMudar,
  edicao
}: {
  dados: PendenciaFormData
  aoMudar: (d: PendenciaFormData) => void
  edicao: boolean
}): ReactNode {
  const clientes = useCatalogoStore((s) => s.clientes)
  const projetos = useCatalogoStore((s) => s.projetos)
  const categorias = useCatalogoStore((s) => s.categorias)
  const usuarios = useCatalogoStore((s) => s.usuarios)
  const equipeDoResponsavel = usuarios.find((usuario) => usuario.id === dados.responsavelId)?.equipe?.nome || 'Sem equipe'

  const set = (campo: keyof PendenciaFormData, valor: string | string[]): void => {
    aoMudar({ ...dados, [campo]: valor })
  }

  const aoSelecionarResponsavel = (responsavelId: string): void => {
    const responsavel = usuarios.find((usuario) => usuario.id === responsavelId)
    aoMudar({
      ...dados,
      responsavelId,
      equipeId: responsavel?.equipeId || ''
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Título" obrigatorio className="md:col-span-2">
        <Input
          value={dados.titulo}
          onChange={(e) => set('titulo', e.target.value)}
          placeholder="Ex.: Validar ambiente de homologação"
        />
      </Field>

      <Field label="Descrição" className="md:col-span-2">
        <Textarea
          value={dados.descricao}
          onChange={(e) => set('descricao', e.target.value)}
          placeholder="Detalhes da pendência..."
        />
      </Field>

      <Field label="Cliente" obrigatorio={!edicao}>
        <Select value={dados.clienteId} onChange={(e) => set('clienteId', e.target.value)}>
          <option value="">Selecione um cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Projeto" obrigatorio={!edicao}>
        <Select value={dados.projetoId} onChange={(e) => set('projetoId', e.target.value)}>
          <option value="">Selecione um projeto</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Responsável" obrigatorio={!edicao}>
        <Select value={dados.responsavelId} onChange={(e) => aoSelecionarResponsavel(e.target.value)}>
          <option value="">Selecione um responsável</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}{u.equipe?.nome ? ` - ${u.equipe.nome}` : ''}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Equipe">
        <Input value={equipeDoResponsavel} readOnly aria-readonly="true" />
      </Field>

      <Field label="Sistema">
        <Input value={dados.sistema} onChange={(e) => set('sistema', e.target.value)} placeholder="Ex.: ERP, CRM..." />
      </Field>

      <Field label="Prazo" obrigatorio={!edicao}>
        <Input type="date" min={new Date().toISOString().slice(0, 10)} value={dados.prazo} onChange={(e) => set('prazo', e.target.value)} />
      </Field>

      <Field label="Horário">
        <Input type="time" value={dados.horario} onChange={(e) => set('horario', e.target.value)} />
      </Field>

      <Field label="Prioridade">
        <Select value={dados.prioridade} onChange={(e) => set('prioridade', e.target.value as Prioridade)}>
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {PRIORIDADE_LABEL[p]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Categoria">
        <Select value={dados.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Departamento">
        <Input list="departamentos" value={dados.departamento} onChange={(e) => set('departamento', e.target.value)} />
        <datalist id="departamentos">
          {DEPARTAMENTOS_SUGERIDOS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </Field>

      {edicao && (
        <Field label="Status">
          <Select value={dados.status} onChange={(e) => set('status', e.target.value as PendenciaStatus)}>
            {PENDENCIA_STATUS.map((s) => (
              <option key={s} value={s}>
                {PENDENCIA_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Recorrência">
        <Select value={dados.recorrencia} onChange={(e) => set('recorrencia', e.target.value)}>
          <option value="">Não recorrente</option>
          {RECORRENCIA_OPCOES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Tags" className="md:col-span-2">
        <TagPicker selecionadas={dados.tags} aoMudar={(ids) => set('tags', ids)} />
      </Field>

      <Field label="Observações" className="md:col-span-2">
        <Textarea value={dados.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
      </Field>
    </div>
  )
}
