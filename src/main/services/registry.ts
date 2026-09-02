import type { ApiContext, ApiRequest, ApiResponse } from '@shared/types'
import { AppError, encerrarSessao, validarToken, obterUsuarioPorId, hashPassword, verifyPassword } from '../auth'
import { getPrisma } from '../db'
import { login as serviceLogin, aceitarConvite as serviceAceitarConvite } from '../auth'

import * as empresaService from './empresa.service'
import * as usuarioService from './usuario.service'
import * as equipeService from './equipe.service'
import * as categoriaService from './categoria.service'
import * as tagService from './tag.service'
import * as clienteService from './cliente.service'
import * as projetoService from './projeto.service'
import * as pendenciaService from './pendencia.service'
import * as anexoService from './anexo.service'
import * as notaService from './nota.service'
import * as compromissoService from './compromisso.service'
import * as retornoService from './retorno.service'
import * as dashboardService from './dashboard.service'
import * as buscaService from './busca.service'
import * as calendarioService from './calendario.service'
import * as lembreteService from './lembrete.service'
import * as notificacaoService from './notificacao.service'
import * as relatorioService from './relatorio.service'
import * as backupService from './backup.service'
import * as recuperacaoService from './recuperacao.service'
import { listarHistorico, historicoGlobal } from './historico.service'

export type Handler = (ctx: ApiContext, args: Record<string, unknown>) => Promise<unknown>

export const registry: Record<string, Record<string, Handler>> = {
  empresa: {
    obter: (ctx, a) => empresaService.obterEmpresa(ctx),
    criar: (ctx, a) => empresaService.criarEmpresa(ctx, a),
    atualizar: (ctx, a) => empresaService.atualizarEmpresa(ctx, a),
    listar: (ctx, a) => empresaService.listarEmpresas(ctx),
    config: (ctx, a) => empresaService.obterConfigApp(ctx),
    salvarConfig: (ctx, a) => empresaService.salvarConfigApp(ctx, a)
  },
  usuario: {
    listar: (ctx, a) => usuarioService.listarUsuarios(ctx),
    obter: (ctx, a) => usuarioService.obterUsuario(ctx, a),
    criar: (ctx, a) => usuarioService.criarUsuario(ctx, a),
    atualizar: (ctx, a) => usuarioService.atualizarUsuario(ctx, a),
    excluir: (ctx, a) => usuarioService.excluirUsuario(ctx, a),
    convidar: (ctx, a) => usuarioService.convidarUsuario(ctx, a),
    convites: (ctx, a) => usuarioService.listarConvites(ctx, a),
    cancelarConvite: (ctx, a) => usuarioService.cancelarConvite(ctx, a)
  },
  equipe: {
    listar: (ctx, a) => equipeService.listarEquipes(ctx),
    obter: (ctx, a) => equipeService.obterEquipe(ctx, a),
    criar: (ctx, a) => equipeService.criarEquipe(ctx, a),
    atualizar: (ctx, a) => equipeService.atualizarEquipe(ctx, a),
    membros: (ctx, a) => equipeService.gerenciarMembros(ctx, a),
    excluir: (ctx, a) => equipeService.excluirEquipe(ctx, a)
  },
  categoria: {
    listar: (ctx, a) => categoriaService.listarCategorias(),
    criar: (ctx, a) => categoriaService.criarCategoria(ctx, a),
    atualizar: (ctx, a) => categoriaService.atualizarCategoria(ctx, a),
    excluir: (ctx, a) => categoriaService.excluirCategoria(ctx, a)
  },
  tag: {
    listar: (ctx, a) => tagService.listarTags(),
    obter: (ctx, a) => tagService.obterTag(a),
    criar: (ctx, a) => tagService.criarTag(ctx, a),
    atualizar: (ctx, a) => tagService.atualizarTag(ctx, a),
    excluir: (ctx, a) => tagService.excluirTag(ctx, a)
  },
  cliente: {
    listar: (ctx, a) => clienteService.listarClientes(a),
    obter: (ctx, a) => clienteService.obterCliente(a),
    detalhe: (ctx, a) => clienteService.detalheCliente(ctx, a),
    criar: (ctx, a) => clienteService.criarCliente(ctx, a),
    atualizar: (ctx, a) => clienteService.atualizarCliente(ctx, a),
    excluir: (ctx, a) => clienteService.excluirCliente(ctx, a)
  },
  projeto: {
    listar: (ctx, a) => projetoService.listarProjetos(a),
    obter: (ctx, a) => projetoService.obterProjeto(a),
    criar: (ctx, a) => projetoService.criarProjeto(ctx, a),
    atualizar: (ctx, a) => projetoService.atualizarProjeto(ctx, a),
    excluir: (ctx, a) => projetoService.excluirProjeto(ctx, a)
  },
  pendencia: {
    listar: (ctx, a) => pendenciaService.listarPendencias(ctx, a),
    obter: (ctx, a) => pendenciaService.obterPendencia(ctx, a),
    criar: (ctx, a) => pendenciaService.criarPendencia(ctx, a),
    atualizar: (ctx, a) => pendenciaService.atualizarPendencia(ctx, a),
    excluir: (ctx, a) => pendenciaService.excluirPendencia(ctx, a),
    duplicar: (ctx, a) => pendenciaService.duplicarPendencia(ctx, a),
    concluir: (ctx, a) => pendenciaService.concluirPendencia(ctx, a),
    reabrir: (ctx, a) => pendenciaService.reabrirPendencia(ctx, a),
    status: (ctx, a) => pendenciaService.alterarStatusPendencia(ctx, a),
    prazo: (ctx, a) => pendenciaService.alterarPrazo(ctx, a),
    responsavel: (ctx, a) => pendenciaService.alterarResponsavel(ctx, a),
    prioridade: (ctx, a) => pendenciaService.alterarPrioridade(ctx, a),
    tagAdicionar: (ctx, a) => pendenciaService.adicionarTagPendencia(ctx, a),
    tagRemover: (ctx, a) => pendenciaService.removerTagPendencia(ctx, a),
    checklistAdicionar: (ctx, a) => pendenciaService.adicionarChecklist(ctx, a),
    checklistToggle: (ctx, a) => pendenciaService.toggleChecklist(ctx, a),
    checklistRemover: (ctx, a) => pendenciaService.removerChecklist(ctx, a),
    comentarioAdicionar: (ctx, a) => pendenciaService.adicionarComentario(ctx, a),
    comentarioExcluir: (ctx, a) => pendenciaService.excluirComentario(ctx, a)
  },
  anexo: {
    listar: (ctx, a) => anexoService.listarAnexos(ctx, a),
    criar: (ctx, a) => anexoService.criarAnexo(ctx, a),
    conteudo: (ctx, a) => anexoService.obterConteudoAnexo(ctx, a),
    excluir: (ctx, a) => anexoService.excluirAnexo(ctx, a)
  },
  nota: {
    listar: (ctx, a) => notaService.listarNotas(a),
    obter: (ctx, a) => notaService.obterNota(a),
    criar: (ctx, a) => notaService.criarNota(ctx, a),
    atualizar: (ctx, a) => notaService.atualizarNota(ctx, a),
    excluir: (ctx, a) => notaService.excluirNota(ctx, a)
  },
  compromisso: {
    listar: (ctx, a) => compromissoService.listarCompromissos(a),
    obter: (ctx, a) => compromissoService.obterCompromisso(a),
    criar: (ctx, a) => compromissoService.criarCompromisso(ctx, a),
    atualizar: (ctx, a) => compromissoService.atualizarCompromisso(ctx, a),
    status: (ctx, a) => compromissoService.alterarStatusCompromisso(ctx, a),
    excluir: (ctx, a) => compromissoService.excluirCompromisso(ctx, a),
    intervalo: (ctx, a) => compromissoService.compromissosNoIntervalo(a)
  },
  retorno: {
    listar: (ctx, a) => retornoService.listarRetornos(a),
    criar: (ctx, a) => retornoService.criarRetorno(ctx, a),
    atualizar: (ctx, a) => retornoService.atualizarRetorno(ctx, a),
    status: (ctx, a) => retornoService.alterarStatusRetorno(ctx, a),
    excluir: (ctx, a) => retornoService.excluirRetorno(ctx, a)
  },
  dashboard: {
    obter: (ctx, a) => dashboardService.obterDashboard(ctx, a)
  },
  busca: {
    global: (ctx, a) => buscaService.buscaGlobal(ctx, a)
  },
  calendario: {
    eventos: (ctx, a) => calendarioService.eventosCalendario(ctx, a)
  },
  lembrete: {
    listar: (ctx, a) => lembreteService.listarLembretes(ctx),
    criar: (ctx, a) => lembreteService.criarLembrete(ctx, a),
    excluir: (ctx, a) => lembreteService.excluirLembrete(ctx, a),
    disparado: (ctx, a) => lembreteService.marcarLembreteDisparado(ctx, a)
  },
  notificacao: {
    listar: (ctx, a) => notificacaoService.listarNotificacoes(ctx, a),
    marcarLida: (ctx, a) => notificacaoService.marcarNotificacaoLida(ctx, a)
  },
  relatorio: {
    geral: (ctx, a) => relatorioService.relatorioGeral(ctx),
    agregado: (ctx, a) => relatorioService.relatorioAgregado(ctx, a),
    csv: (ctx, a) => relatorioService.relatorioCsv(ctx, a),
    pdf: (ctx, a) => relatorioService.dadosParaPdf(ctx)
  },
  historico: {
    listar: (ctx, a) => listarHistorico(ctx, String(a.entidade || ''), String(a.entidadeId || '')),
    global: (ctx, a) => historicoGlobal(ctx, Number(a.limite) || 50)
  },
  backup: {
    info: (ctx, a) => backupService.obterInfoBackup(),
    executar: (ctx, a) => backupService.executarBackup(ctx, a),
    restaurar: (ctx, a) => backupService.restaurarBackup(ctx, a),
    listar: (ctx, a) => backupService.listarBackups()
  },
  auth: {
    me: async (ctx, a) => {
      const u = await obterUsuarioPorId(ctx.usuarioId)
      if (!u) throw new AppError('Usuário não encontrado', 404)
      return u
    },
    alterarSenha: async (ctx, a) => {
      const atual = String(a.senhaAtual || '')
      const nova = String(a.senhaNova || '')
      if (nova.length < 8) throw new AppError('A nova senha deve ter no mínimo 8 caracteres')
      const db = getPrisma()
      const u = await db.usuario.findUnique({ where: { id: ctx.usuarioId } })
      if (!u || !verifyPassword(atual, u.senhaHash)) throw new AppError('Senha atual incorreta')
      await db.usuario.update({ where: { id: ctx.usuarioId }, data: { senhaHash: hashPassword(nova) } })
      return { ok: true }
    },
    recuperarSolicitar: async (_ctx, a) => recuperacaoService.solicitarCodigo(String(a.email || '')),
    recuperarValidar: async (_ctx, a) => recuperacaoService.validarCodigo(String(a.email || ''), String(a.codigo || '')),
    recuperarRedefinir: async (_ctx, a) =>
      recuperacaoService.redefinirSenha(String(a.email || ''), String(a.codigo || ''), String(a.novaSenha || ''))
  }
}

export async function dispatch(req: ApiRequest): Promise<ApiResponse> {
  try {
    if (!req || typeof req.resource !== 'string') {
      return { ok: false, error: 'Requisição inválida' }
    }
    if (req.resource === 'auth' && req.action === 'login') {
      const args = (req.args || {}) as Record<string, unknown>
      const email = String(args.email || '')
      const senha = String(args.senha || '')
      const resultado = await serviceLogin(email, senha)
      return { ok: true, data: resultado }
    }
    if (req.resource === 'auth' && req.action === 'logout') {
      if (req.token) await encerrarSessao(req.token)
      return { ok: true, data: { ok: true } }
    }
    if (req.resource === 'auth' && req.action === 'aceitarConvite') {
      const args = (req.args || {}) as Record<string, unknown>
      const resultado = await serviceAceitarConvite(
        String(args.email || ''),
        String(args.codigo || ''),
        String(args.nome || ''),
        String(args.senha || '')
      )
      return { ok: true, data: resultado }
    }
    if (req.resource === 'auth' && req.action === 'recuperarSolicitar') {
      const args = (req.args || {}) as Record<string, unknown>
      const resultado = await recuperacaoService.solicitarCodigo(String(args.email || ''))
      return { ok: true, data: resultado }
    }
    if (req.resource === 'auth' && req.action === 'recuperarValidar') {
      const args = (req.args || {}) as Record<string, unknown>
      const resultado = await recuperacaoService.validarCodigo(String(args.email || ''), String(args.codigo || ''))
      return { ok: true, data: resultado }
    }
    if (req.resource === 'auth' && req.action === 'recuperarRedefinir') {
      const args = (req.args || {}) as Record<string, unknown>
      const resultado = await recuperacaoService.redefinirSenha(
        String(args.email || ''),
        String(args.codigo || ''),
        String(args.novaSenha || '')
      )
      return { ok: true, data: resultado }
    }
    const ctx = await validarToken(req.token || '')
    const recurso = registry[req.resource]
    if (!recurso) return { ok: false, error: `Recurso desconhecido: ${req.resource}` }
    const handler = recurso[req.action]
    if (!handler) return { ok: false, error: `Ação desconhecida: ${req.resource}.${req.action}` }
    const data = await handler(ctx, (req.args || {}) as Record<string, unknown>)
    return { ok: true, data }
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message }
    }
    if (err instanceof Error && err.name === 'ZodError') {
      const zod = err as unknown as { issues: Array<{ path: Array<string | number>; message: string }> }
      const msg = zod.issues?.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      return { ok: false, error: msg || 'Dados inválidos' }
    }
    console.error('[dispatch]', req?.resource, req?.action, err)
    return { ok: false, error: 'Erro interno. Tente novamente.' }
  }
}
