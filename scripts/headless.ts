import { rmSync } from 'node:fs'
import { join } from 'node:path'

const dbDir = join(process.cwd(), '.pendify-test')
rmSync(dbDir, { recursive: true, force: true })
process.env.PENDIFY_DB_PATH = join(dbDir, 'pendify.db')
process.env.PENDIFY_DEV_RECOVERY = '1'

async function run(): Promise<void> {
  const { ensureDatabase, getPrisma } = await import('../src/main/db')
  const { ensureBootstrap } = await import('../src/main/bootstrap')
  const { dispatch } = await import('../src/main/services/registry')

  await ensureDatabase()
  await ensureBootstrap()
  const db = getPrisma()

  const print = (label: string, v: unknown): void => {
    console.log(`[${label}]`, JSON.stringify(v).slice(0, 300))
  }

  // Login
  const loginRes = await dispatch({ resource: 'auth', action: 'login', args: { email: 'admin@pendify.local', senha: 'admin' } })
  if (!loginRes.ok) throw new Error('login falhou: ' + loginRes.error)
  print('login', { ok: loginRes.ok })
  const token = (loginRes.data as { sessao: { token: string } }).sessao.token

  const api = async (resource: string, action: string, args: Record<string, unknown> = {}): Promise<unknown> => {
    const r = await dispatch({ resource, action, args, token })
    if (!r.ok) throw new Error(`${resource}.${action} falhou: ${r.error}`)
    return r.data
  }

  // Usuario
  await api('usuario', 'criar', { nome: 'João Consultor', email: 'joao@empresa.com', senha: '123456', perfil: 'GESTOR' })
  print('usuario.criar', 'ok')

  // Cliente
  const cliente = (await api('cliente', 'criar', {
    nome: 'Cliente Alfa',
    cnpj: '12345678000199',
    contato: 'Maria Silva',
    email: 'maria@alfa.com',
    sistema: 'ERP TOTVS'
  })) as { id: string }
  print('cliente.criar', cliente.id)

  // Projeto
  const projeto = (await api('projeto', 'criar', { nome: 'Implantação Alfa', clienteId: cliente.id })) as { id: string }
  print('projeto.criar', projeto.id)

  // Tag
  const tag = (await api('tag', 'criar', { nome: 'Urgente', cor: '#ef4444' })) as { id: string }
  print('tag.criar', tag.id)

  // Pendencia com checklist e tags
  const p1 = (await api('pendencia', 'criar', {
    titulo: 'Validar ambiente de homologação',
    descricao: 'Checar usuários, permissões e testes',
    clienteId: cliente.id,
    projetoId: projeto.id,
    prioridade: 'ALTA',
    tags: [tag.id],
    checklist: ['Validar ambiente', 'Criar usuários', 'Testar permissões', 'Coletar evidências', 'Retorno ao cliente'],
    prazo: new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  })) as { id: string; atrasada: boolean; progresso: number }
  print('pendencia.criar', { id: p1.id, atrasada: p1.atrasada, progresso: p1.progresso })
  if (!p1.atrasada) throw new Error('pendência com prazo ontem deveria estar atrasada')

  // Checklist toggle
  const chk = (await api('pendencia', 'obter', { id: p1.id })) as {
    checklist: Array<{ id: string }>
  }
  for (const item of chk.checklist.slice(0, 3)) {
    await api('pendencia', 'checklistToggle', { itemId: item.id })
  }

  // Comentario
  await api('pendencia', 'comentarioAdicionar', { pendenciaId: p1.id, conteudo: 'Ambiente liberado, iniciando testes' })

  // Filtro atrasadas
  const lista = (await api('pendencia', 'listar', { atrasadas: true, porPagina: 10 })) as { total: number; itens: Array<{ progresso: number }> }
  print('pendencia.listar(atrasadas)', { total: lista.total, progresso: lista.itens[0]?.progresso })
  if (lista.total < 1) throw new Error('deveria haver pendência atrasada')

  // Dashboard
  const dash = (await api('dashboard', 'obter')) as { contadores: { atrasadas: number } }
  print('dashboard.contadores', dash.contadores)

  // Relatorio CSV
  const csv = (await api('relatorio', 'csv')) as { csv: string; nomeArquivo: string }
  print('relatorio.csv', { nome: csv.nomeArquivo, linhas: csv.csv.split('\n').length })

  // Busca global
  const busca = (await api('busca', 'global', { q: 'homologação' })) as { pendencias: unknown[]; clientes: unknown[] }
  print('busca.global', { pendencias: busca.pendencias.length, clientes: busca.clientes.length })

  // Concluir (gera recorrência nao ativa -> nao cria)
  const conc = await api('pendencia', 'concluir', { id: p1.id })
  print('pendencia.concluir', (conc as { status: string }).status)

  // Backup
  const backup = (await api('backup', 'executar')) as { local: string; tamanho: number }
  print('backup.executar', { local: backup.local, tamanho: backup.tamanho })
  const backups = (await api('backup', 'listar')) as Array<{ nome: string }>
  print('backup.listar', backups.length)

  // Calendario
  const cal = (await api('calendario', 'eventos', {
    de: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    ate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  })) as unknown[]
  print('calendario.eventos', cal.length)

  // Permissoes: USUARIO nao pode criar usuario
  await api('usuario', 'criar', { nome: 'Zé', email: 'ze@empresa.com', senha: '123456', perfil: 'USUARIO' })
  const loginZe = (await dispatch({
    resource: 'auth',
    action: 'login',
    args: { email: 'ze@empresa.com', senha: '123456' }
  })) as { ok: boolean; data: { sessao: { token: string } } }
  if (!loginZe.ok) throw new Error('login Zé falhou')
  const tokenZe = loginZe.data.sessao.token
  const negado = await dispatch({ resource: 'usuario', action: 'criar', args: {}, token: tokenZe })
  if (negado.ok) throw new Error('USUARIO não deveria criar usuários')
  print('permissoes.usuario', negado.error)

  // Session invalida
  const invalida = await dispatch({ resource: 'dashboard', action: 'obter', token: 'token-invalido' })
  if (invalida.ok) throw new Error('token inválido deveria falhar')
  print('permissoes.token', invalida.error)

  // Convite por e-mail
  const convite = (await api('usuario', 'convidar', {
    email: 'convite@empresa.com',
    nome: 'Novo Usuário',
    perfil: 'USUARIO'
  })) as { id: string; token: string; expiraEm: string }
  print('usuario.convidar', { id: convite.id, expiraEm: convite.expiraEm })
  if (!convite.token || convite.token.split('-').length !== 3) throw new Error('convite deveria ter código XXXX-XXXX-XXXX')

  const convites = (await api('usuario', 'convites')) as { pendentes: Array<{ id: string }>; historico: unknown[] }
  print('usuario.convites', { pendentes: convites.pendentes.length })
  if (!convites.pendentes.some((c) => c.id === convite.id)) throw new Error('convite deveria estar na lista de pendentes')

  // Convite duplicado nao pode
  const dup = await dispatch({
    resource: 'usuario',
    action: 'convidar',
    args: { email: 'convite@empresa.com', nome: 'Duplicado', perfil: 'USUARIO' },
    token
  })
  if (dup.ok) throw new Error('convite duplicado deveria falhar')
  print('usuario.convidar.duplicado', dup.error)

  // Aceitar convite (cria usuario e sessao)
  const aceite = await dispatch({
    resource: 'auth',
    action: 'aceitarConvite',
    args: { email: 'convite@empresa.com', codigo: convite.token, nome: 'Novo Usuário', senha: '123456' }
  })
  if (!aceite.ok) throw new Error('aceitarConvite falhou: ' + aceite.error)
  print('auth.aceitarConvite', 'ok')

  // Novo usuario consegue logar
  const loginNovo = (await dispatch({
    resource: 'auth',
    action: 'login',
    args: { email: 'convite@empresa.com', senha: '123456' }
  })) as { ok: boolean; data: { sessao: { token: string; usuario: { nome: string; perfil: string } } } }
  if (!loginNovo.ok) throw new Error('login do convidado falhou')
  print('auth.login(convidado)', { nome: loginNovo.data.sessao.usuario.nome, perfil: loginNovo.data.sessao.usuario.perfil })

  // USUARIO convidado nao pode convidar outros
  const negadoConvite = await dispatch({
    resource: 'usuario',
    action: 'convidar',
    args: { email: 'outro@empresa.com', nome: 'Outro', perfil: 'USUARIO' },
    token: loginNovo.data.sessao.token
  })
  if (negadoConvite.ok) throw new Error('USUARIO não deveria convidar outros usuários')
  print('permissoes.convidar', negadoConvite.error)

  const negadoConvites = await dispatch({ resource: 'usuario', action: 'convites', token: loginNovo.data.sessao.token })
  if (negadoConvites.ok) throw new Error('USUARIO não deveria listar convites')
  print('permissoes.listarConvites', negadoConvites.error)

  console.log('\n=== TESTES OBRIGATÓRIOS (CORREÇÕES) ===')
  const assert = (cond: boolean, msg: string): void => {
    if (!cond) throw new Error('ASSERT falhou: ' + msg)
  }

  // --- Teste 1: Criar pendência e finalizar ---------------------
  const t1 = (await api('pendencia', 'criar', {
    titulo: 'Teste 1 - Finalizar',
    checklist: ['Item A', 'Item B'],
    tags: [tag.id]
  })) as { id: string }
  const concluida1 = (await api('pendencia', 'concluir', { id: t1.id })) as { id: string; status: string; concluidaEm: string | null }
  assert(concluida1.id === t1.id, 'mesmo ID após concluir')
  assert(concluida1.status === 'CONCLUIDA', 'status CONCLUIDA')
  assert(!!concluida1.concluidaEm, 'concluidaEm preenchido')
  const ativasT1 = (await api('pendencia', 'listar', { status: ['A_FAZER', 'EM_ANDAMENTO'], porPagina: 1000 })) as { itens: Array<{ id: string }> }
  assert(!ativasT1.itens.some((i) => i.id === t1.id), 'removida da lista ativa')
  const histT1 = (await api('historico', 'listar', { entidade: 'pendencia', entidadeId: t1.id })) as Array<{ tipo: string }>
  assert(histT1.some((h) => h.tipo === 'CONCLUSAO'), 'histórico registra conclusão')
  print('teste1.finalizar', { id: concluida1.id, status: concluida1.status, eventos: histT1.map((h) => h.tipo) })

  // --- Teste 2: Finalizar repetidamente não duplica -------------
  const totalAntes = (await api('pendencia', 'listar', { porPagina: 1000 })) as { total: number }
  const concAntes = ((await api('historico', 'listar', { entidade: 'pendencia', entidadeId: t1.id })) as Array<{ tipo: string }>).filter((h) => h.tipo === 'CONCLUSAO').length
  for (let i = 0; i < 5; i++) {
    const r = (await api('pendencia', 'concluir', { id: t1.id })) as { id: string; status: string }
    assert(r.id === t1.id, 'mesmo ID na repetição')
    assert(r.status === 'CONCLUIDA', 'continua CONCLUIDA')
  }
  const totalDepois = (await api('pendencia', 'listar', { porPagina: 1000 })) as { total: number }
  assert(totalDepois.total === totalAntes.total, 'zero duplicações após finalizar 5x')
  const concDepois = ((await api('historico', 'listar', { entidade: 'pendencia', entidadeId: t1.id })) as Array<{ tipo: string }>).filter((h) => h.tipo === 'CONCLUSAO').length
  assert(concDepois === concAntes, 'histórico não duplica conclusões')
  print('teste2.repetido', { totalAntes: totalAntes.total, totalDepois: totalDepois.total, conclusoes: concDepois })

  // --- Teste 3: Histórico A_FAZER → EM_ANDAMENTO → CONCLUIDA ----
  const t3 = (await api('pendencia', 'criar', { titulo: 'Teste 3 - Histórico' })) as { id: string }
  await api('pendencia', 'status', { id: t3.id, status: 'EM_ANDAMENTO' })
  await api('pendencia', 'concluir', { id: t3.id })
  const t3Obter = (await api('pendencia', 'obter', { id: t3.id })) as { id: string; status: string }
  const unicasT3 = (await api('pendencia', 'listar', { busca: 'Teste 3 - Histórico', porPagina: 1000 })) as { total: number }
  assert(t3Obter.status === 'CONCLUIDA', 'status final CONCLUIDA')
  assert(unicasT3.total === 1, 'apenas uma pendência no fluxo completo')
  const histT3 = (await api('historico', 'listar', { entidade: 'pendencia', entidadeId: t3.id })) as Array<{ tipo: string }>
  assert(histT3.some((h) => h.tipo === 'CRIACAO'), 'histórico registra criação')
  assert(histT3.some((h) => h.tipo === 'STATUS'), 'histórico registra mudança de status')
  assert(histT3.some((h) => h.tipo === 'CONCLUSAO'), 'histórico registra conclusão')
  print('teste3.historico', { id: t3Obter.id, status: t3Obter.status, eventos: histT3.map((h) => h.tipo) })

  // Status repetido não gera novo histórico
  await api('pendencia', 'status', { id: t3.id, status: 'CONCLUIDA' })
  const histT3b = (await api('historico', 'listar', { entidade: 'pendencia', entidadeId: t3.id })) as Array<{ tipo: string }>
  assert(histT3b.filter((h) => h.tipo === 'CONCLUSAO').length === 1, 'status repetido não duplica histórico')
  print('teste3.idempotente', { conclusoes: histT3b.filter((h) => h.tipo === 'CONCLUSAO').length })

  // --- Teste 4: Performance - abrir/fechar não altera registros --
  const antes4 = (await api('pendencia', 'listar', { porPagina: 1000 })) as { total: number }
  for (let i = 0; i < 20; i++) {
    const r = (await api('pendencia', 'obter', { id: t3.id })) as { id: string }
    assert(r.id === t3.id, 'obter mantém mesmo registro')
  }
  const depois4 = (await api('pendencia', 'listar', { porPagina: 1000 })) as { total: number }
  assert(depois4.total === antes4.total, 'abrir/fechar não cria nem duplica registros')
  print('teste4.performance', { antes: antes4.total, depois: depois4.total })

  // --- Teste 5: Checklist persiste após fechar/reabrir ----------
  const t5 = (await api('pendencia', 'criar', { titulo: 'Teste 5 - Checklist', checklist: ['Tarefa A', 'Tarefa B', 'Tarefa C'] })) as { id: string }
  const chkT5 = (await api('pendencia', 'obter', { id: t5.id })) as { checklist: Array<{ id: string; concluido: boolean }> }
  assert(chkT5.checklist.length === 3, 'checklist carregado sem duplicação')
  await api('pendencia', 'checklistToggle', { itemId: chkT5.checklist[0].id })
  await api('pendencia', 'checklistToggle', { itemId: chkT5.checklist[2].id })
  const chkT5b = (await api('pendencia', 'obter', { id: t5.id })) as { checklist: Array<{ id: string; concluido: boolean }> }
  assert(chkT5b.checklist.length === 3, 'nenhum item duplicado ao marcar')
  assert(chkT5b.checklist.filter((i) => i.concluido).length === 2, 'alterações salvas')
  const chkT5c = (await api('pendencia', 'obter', { id: t5.id })) as { checklist: Array<{ id: string; concluido: boolean }> }
  assert(chkT5c.checklist.filter((i) => i.concluido).length === 2, 'persistência ao reabrir')
  print('teste5.checklist', { itens: chkT5c.checklist.length, concluidos: chkT5c.checklist.filter((i) => i.concluido).length })

  // --- Teste 6: Comentário persiste ------------------------------
  const t6 = (await api('pendencia', 'criar', { titulo: 'Teste 6 - Comentários' })) as { id: string }
  const c6 = (await api('pendencia', 'comentarioAdicionar', { pendenciaId: t6.id, conteudo: 'Comentário de teste' })) as { id: string; conteudo: string }
  assert(!!c6.id && c6.conteudo === 'Comentário de teste', 'comentário criado')
  const t6b = (await api('pendencia', 'obter', { id: t6.id })) as { comentarios: Array<{ id: string; conteudo: string; usuario?: { nome: string } | null }> }
  assert(t6b.comentarios.length === 1, 'comentário vinculado à pendência')
  assert(t6b.comentarios[0].conteudo === 'Comentário de teste', 'conteúdo persistido')
  assert(t6b.comentarios[0].usuario?.nome === 'Administrador', 'usuário registrado')
  print('teste6.comentario', { total: t6b.comentarios.length, usuario: t6b.comentarios[0].usuario?.nome })

  // --- Teste 7: Anexo persiste -----------------------------------
  const t7 = (await api('pendencia', 'criar', { titulo: 'Teste 7 - Anexos' })) as { id: string }
  const txtBase64 = Buffer.from('conteúdo do anexo de teste').toString('base64')
  const anexo7 = (await api('anexo', 'criar', {
    pendenciaId: t7.id,
    nomeOriginal: 'nota.txt',
    tipo: 'txt',
    tamanho: Buffer.byteLength(Buffer.from('conteúdo do anexo de teste')),
    conteudoBase64: txtBase64
  })) as { id: string; nomeOriginal: string }
  assert(!!anexo7.id, 'anexo criado')
  const t7b = (await api('pendencia', 'obter', { id: t7.id })) as { anexos: Array<{ id: string; nomeOriginal: string }> }
  assert(t7b.anexos.length === 1, 'anexo vinculado à pendência')
  const conteudo7 = (await api('anexo', 'conteudo', { id: anexo7.id })) as { conteudoBase64: string }
  assert(conteudo7.conteudoBase64 === txtBase64, 'conteúdo do anexo recuperável')
  print('teste7.anexo', { id: anexo7.id, nome: t7b.anexos[0].nomeOriginal, recuperado: true })

  // --- Teste 8: Recuperação de senha -----------------------------
  await api('usuario', 'criar', {
    nome: 'Recuperação Teste',
    email: 'recuperacao@empresa.com',
    senha: 'senha-antiga',
    perfil: 'USUARIO'
  })
  const sol = (await dispatch({ resource: 'auth', action: 'recuperarSolicitar', args: { email: 'recuperacao@empresa.com' } })) as { ok: boolean; data?: { codigo?: string } }
  assert(sol.ok && !!sol.data?.codigo && sol.data.codigo.length === 6, 'código gerado e retornado em modo dev')
  const codigo = sol.data?.codigo as string
  const errVal = (await dispatch({ resource: 'auth', action: 'recuperarValidar', args: { email: 'recuperacao@empresa.com', codigo: '000000' } })) as { ok: boolean; error: string }
  assert(!errVal.ok, 'código errado rejeitado')
  const valOk = (await dispatch({ resource: 'auth', action: 'recuperarValidar', args: { email: 'recuperacao@empresa.com', codigo } })) as { ok: boolean }
  assert(valOk.ok, 'código correto valida')
  const redOk = (await dispatch({ resource: 'auth', action: 'recuperarRedefinir', args: { email: 'recuperacao@empresa.com', codigo, novaSenha: 'nova-senha-123' } })) as { ok: boolean }
  assert(redOk.ok, 'redefinição aceita')
  const loginAntigo = (await dispatch({ resource: 'auth', action: 'login', args: { email: 'recuperacao@empresa.com', senha: 'senha-antiga' } })) as { ok: boolean }
  assert(!loginAntigo.ok, 'senha antiga invalidada')
  const loginNovo8 = (await dispatch({ resource: 'auth', action: 'login', args: { email: 'recuperacao@empresa.com', senha: 'nova-senha-123' } })) as { ok: boolean }
  assert(loginNovo8.ok, 'login com nova senha')
  const reuse = (await dispatch({ resource: 'auth', action: 'recuperarRedefinir', args: { email: 'recuperacao@empresa.com', codigo, novaSenha: 'outra-senha' } })) as { ok: boolean }
  assert(!reuse.ok, 'código não pode ser reutilizado')
  print('teste8.recuperacao', { codigo, redefinido: true, reusoBloqueado: true })

  const naoExiste = (await dispatch({ resource: 'auth', action: 'recuperarSolicitar', args: { email: 'naoexiste@empresa.com' } })) as { ok: boolean; data?: { codigo?: string } }
  assert(naoExiste.ok, 'e-mail inexistente responde de forma genérica')
  assert(!naoExiste.data?.codigo, 'não expõe código para e-mail inexistente')
  print('teste8.enumeracao', 'protegido')

  // --- Recorrência: concluir não cria nova pendência ------------
  const tRec = (await api('pendencia', 'criar', {
    titulo: 'Teste - Recorrência',
    recorrencia: { tipo: 'mensal', intervalo: 1, ativo: true }
  })) as { id: string }
  await api('pendencia', 'concluir', { id: tRec.id })
  const listaRec = (await api('pendencia', 'listar', { busca: 'Teste - Recorrência', porPagina: 1000 })) as { total: number; itens: Array<{ id: string }> }
  assert(listaRec.total === 1, 'concluir não cria nova pendência com recorrência')
  assert(listaRec.itens[0].id === tRec.id, 'mantém o mesmo registro')
  print('recorrencia.naoDuplica', { total: listaRec.total })

  // --- Detecção de duplicados (somente identificação, não apaga)
  const duplicados = await db.$queryRaw<Array<{ titulo: string; criadorId: string; quantidade: number }>>`
    SELECT titulo, criadorId, COUNT(*) as quantidade
    FROM pendencias
    GROUP BY titulo, criadorId
    HAVING COUNT(*) > 1
  `
  print('duplicados.identificados', duplicados)

  console.log('\n=== TODOS OS TESTES HEADLESS PASSARAM ===')
  process.exit(0)
}

run().catch((err) => {
  console.error('\n=== FALHA NOS TESTES ===')
  console.error(err)
  process.exit(1)
})
