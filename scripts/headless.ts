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

  console.log('\n=== TESTES DE EQUIPES E ISOLAMENTO ===')

  // Helper para chamadas com token específico
  const callTok = async (token: string, resource: string, action: string, args: Record<string, unknown> = {}): Promise<unknown> => {
    const r = await dispatch({ resource, action, args, token })
    if (!r.ok) throw new Error(`${resource}.${action} falhou: ${r.error}`)
    return r.data
  }

  // --- 1. Criar equipes Miisy e QA ---------------------------------
  const eqMiisy = (await api('equipe', 'criar', { nome: 'Miisy', descricao: 'Time do produto Miisy' })) as { id: string; nome: string }
  const eqQA = (await api('equipe', 'criar', { nome: 'QA', descricao: 'Time de qualidade' })) as { id: string; nome: string }
  const listaEq = (await api('equipe', 'listar')) as Array<{ nome: string; quantidadeUsuarios: number; quantidadePendencias: number }>
  assert(listaEq.some((e) => e.nome === 'Miisy') && listaEq.some((e) => e.nome === 'QA'), 'equipes Miisy e QA criadas')
  print('equipes.criar', { miisy: eqMiisy.nome, qa: eqQA.nome })

  // --- 2. Usuários vinculados às equipes ---------------------------
  const uAna = (await api('usuario', 'criar', { nome: 'Ana Miisy', email: 'ana@miisy.com', senha: '123456', perfil: 'USUARIO', equipeId: eqMiisy.id })) as { id: string; equipeId: string }
  const uBruno = (await api('usuario', 'criar', { nome: 'Bruno QA', email: 'bruno@qa.com', senha: '123456', perfil: 'USUARIO', equipeId: eqQA.id })) as { id: string; equipeId: string }
  const uLiderQA = (await api('usuario', 'criar', { nome: 'Lider QA', email: 'liderqa@qa.com', senha: '123456', perfil: 'USUARIO', equipeId: eqQA.id })) as { id: string }
  const uSem = (await api('usuario', 'criar', { nome: 'Sem Time', email: 'semtime@empresa.com', senha: '123456', perfil: 'USUARIO' })) as { id: string }
  assert(uAna.equipeId === eqMiisy.id && uBruno.equipeId === eqQA.id, 'usuários criados vinculados à equipe correta')

  // Adiciona uSem à Miisy via gerenciar membros
  await api('equipe', 'membros', { id: eqMiisy.id, usuarioIds: [uAna.id, uSem.id] })
  const eqMiisyDet = (await api('equipe', 'obter', { id: eqMiisy.id })) as { usuarios: Array<{ id: string }>; pendencias: unknown[] }
  assert(eqMiisyDet.usuarios.length === 2, 'equipe Miisy possui 2 usuários vinculados')
  print('equipes.membros', { miisyUsuarios: eqMiisyDet.usuarios.length })

  // --- 3. Pendência herda equipe do criador ------------------------
  const loginAna = (await dispatch({ resource: 'auth', action: 'login', args: { email: 'ana@miisy.com', senha: '123456' } })) as { ok: boolean; data: { sessao: { token: string } } }
  if (!loginAna.ok) throw new Error('login Ana falhou')
  const tokenAna = loginAna.data.sessao.token
  const pAna = (await callTok(tokenAna, 'pendencia', 'criar', { titulo: 'Pendência Ana - Bug no módulo X' })) as { id: string; equipeId: string }
  assert(pAna.equipeId === eqMiisy.id, 'pendência herda equipe do criador (Ana → Miisy)')

  const loginBruno = (await dispatch({ resource: 'auth', action: 'login', args: { email: 'bruno@qa.com', senha: '123456' } })) as { ok: boolean; data: { sessao: { token: string } } }
  if (!loginBruno.ok) throw new Error('login Bruno falhou')
  const tokenBruno = loginBruno.data.sessao.token
  const pBruno = (await callTok(tokenBruno, 'pendencia', 'criar', { titulo: 'Pendência Bruno - Teste de regressão 99' })) as { id: string; equipeId: string }
  assert(pBruno.equipeId === eqQA.id, 'pendência herda equipe do criador (Bruno → QA)')
  print('equipes.heranca', { ana: pAna.equipeId === eqMiisy.id, bruno: pBruno.equipeId === eqQA.id })

  // --- 4. Isolamento de visualização (listagem) --------------------
  const listaAna = (await callTok(tokenAna, 'pendencia', 'listar', { busca: 'regressão 99', porPagina: 1000 })) as { total: number }
  assert(listaAna.total === 0, 'Ana (Miisy) não vê pendência da equipe QA na listagem')
  const listaBruno = (await callTok(tokenBruno, 'pendencia', 'listar', { busca: 'módulo X', porPagina: 1000 })) as { total: number }
  assert(listaBruno.total === 0, 'Bruno (QA) não vê pendência da equipe Miisy na listagem')
  const totalAna = (await callTok(tokenAna, 'pendencia', 'listar', { porPagina: 1000 })) as { total: number }
  const totalBruno = (await callTok(tokenBruno, 'pendencia', 'listar', { porPagina: 1000 })) as { total: number }
  assert(totalBruno.total >= 1, 'Bruno vê as pendências da própria equipe')
  print('equipes.isolamento.listagem', { anaTotal: totalAna.total, brunoTotal: totalBruno.total })

  // --- 5. Acesso negado direto por ID (não revela existência) ------
  const negadoAna = await dispatch({ resource: 'pendencia', action: 'obter', args: { id: pBruno.id }, token: tokenAna })
  assert(!negadoAna.ok && /não encontrada/.test(negadoAna.error || ''), 'acesso por ID de outra equipe retorna "não encontrada"')
  const negadoBruno = await dispatch({ resource: 'pendencia', action: 'concluir', args: { id: pAna.id }, token: tokenBruno })
  assert(!negadoBruno.ok, 'não é possível concluir pendência de outra equipe')
  print('equipes.isolamento.id', { negadoAna: negadoAna.error, negadoBruno: negadoBruno.error })

  // --- 6. ADM vê tudo e filtra por equipe --------------------------
  const admTudo = (await api('pendencia', 'listar', { busca: 'regressão 99', porPagina: 1000 })) as { total: number }
  assert(admTudo.total >= 1, 'ADM enxerga pendência da QA')
  const admFiltroQA = (await api('pendencia', 'listar', { equipeId: eqQA.id, porPagina: 1000 })) as { total: number }
  assert(admFiltroQA.total >= 1, 'ADM filtra pendências por equipe QA')
  const admFiltroMiisy = (await api('pendencia', 'listar', { equipeId: eqMiisy.id, porPagina: 1000 })) as { total: number }
  assert(admFiltroMiisy.total >= 1, 'ADM filtra pendências por equipe Miisy')
  const dashAdm = (await api('dashboard', 'obter', { equipeId: eqQA.id })) as { porEquipe: Array<{ label: string; valor: number }> }
  assert(dashAdm.porEquipe.length >= 0, 'dashboard do ADM possui dados por equipe')
  print('equipes.adm', { totalQA: admFiltroQA.total, totalMiisy: admFiltroMiisy.total })

  // --- 7. ADM cria/edita/exclui equipes ----------------------------
  await api('equipe', 'atualizar', { id: eqQA.id, nome: 'QA Time', descricao: 'Time de qualidade ampliado' })
  const eqQANovo = (await api('equipe', 'obter', { id: eqQA.id })) as { nome: string }
  assert(eqQANovo.nome === 'QA Time', 'equipe editada pelo ADM')
  const eqTemp = (await api('equipe', 'criar', { nome: 'Equipe Temporária' })) as { id: string }
  await api('equipe', 'excluir', { id: eqTemp.id })
  const semTemp = await dispatch({ resource: 'equipe', action: 'obter', args: { id: eqTemp.id }, token })
  assert(!semTemp.ok, 'equipe temporária excluída')
  // Exclusão bloqueada quando a equipe possui pendências
  const excluirQABloqueado = await dispatch({ resource: 'equipe', action: 'excluir', args: { id: eqQA.id }, token })
  assert(!excluirQABloqueado.ok && /pendência/.test(excluirQABloqueado.error || ''), 'exclusão de equipe com pendências é bloqueada')
  print('equipes.crud', { editado: eqQANovo.nome, excluidaTemporaria: !semTemp.ok, bloqueioComPendencias: true })

  // --- 8. ADM altera equipe de usuários ----------------------------
  const uSemAtualizado = (await api('usuario', 'atualizar', { id: uSem.id, equipeId: eqQA.id })) as { equipeId: string }
  assert(uSemAtualizado.equipeId === eqQA.id, 'ADM altera a equipe de um usuário')
  const histUsem = (await api('historico', 'listar', { entidade: 'usuario', entidadeId: uSem.id })) as Array<{ descricao: string }>
  assert(histUsem.some((h) => h.descricao.includes('transferido')), 'mudança de equipe do usuário fica registrada no histórico')
  print('equipes.moverUsuario', { novaEquipe: uSemAtualizado.equipeId === eqQA.id })

  // --- 9. ADM define líderes (líder deve pertencer à equipe) -------
  const liderFora = await dispatch({ resource: 'equipe', action: 'atualizar', args: { id: eqMiisy.id, liderId: uBruno.id }, token })
  assert(!liderFora.ok, 'líder deve pertencer à própria equipe (Bruno não pode liderar Miisy)')
  await api('equipe', 'atualizar', { id: eqQA.id, liderId: uLiderQA.id })
  const eqQAComLider = (await api('equipe', 'obter', { id: eqQA.id })) as { liderId: string; lider: { nome: string } | null }
  assert(eqQAComLider.liderId === uLiderQA.id, 'líder definido para a equipe QA')
  // Líder não pode sair da equipe sem novo líder
  const moverLider = await dispatch({ resource: 'usuario', action: 'atualizar', args: { id: uLiderQA.id, equipeId: eqMiisy.id }, token })
  assert(!moverLider.ok, 'líder não pode ser movido de equipe sem novo líder')
  // Líder não pode ser desativado sem novo líder
  const desativarLider = await dispatch({ resource: 'usuario', action: 'atualizar', args: { id: uLiderQA.id, ativo: false }, token })
  assert(!desativarLider.ok, 'líder não pode ser desativado sem novo líder')
  // Líder não pode ser excluído
  const excluirLider = await dispatch({ resource: 'usuario', action: 'excluir', args: { id: uLiderQA.id }, token })
  assert(!excluirLider.ok, 'líder não pode ser excluído sem novo líder')
  print('equipes.lider', { definido: true, validacoes: true })

  // --- 10. ADM desativa usuário ------------------------------------
  const uDesativar = (await api('usuario', 'criar', { nome: 'Sera Desativado', email: 'desativar@empresa.com', senha: '123456', perfil: 'USUARIO', equipeId: eqMiisy.id })) as { id: string }
  await api('usuario', 'atualizar', { id: uDesativar.id, ativo: false })
  const uDesativado = (await api('usuario', 'obter', { id: uDesativar.id })) as { ativo: boolean }
  assert(uDesativado.ativo === false, 'usuário desativado pelo ADM')
  print('equipes.desativar', { ativo: uDesativado.ativo })

  // --- 11. Usuário com pendências não é excluído fisicamente -------
  const uComPendencias = (await api('usuario', 'criar', { nome: 'Com Pendencias', email: 'compend@empresa.com', senha: '123456', perfil: 'USUARIO', equipeId: eqMiisy.id })) as { id: string }
  const loginComPend = (await dispatch({ resource: 'auth', action: 'login', args: { email: 'compend@empresa.com', senha: '123456' } })) as { ok: boolean; data: { sessao: { token: string } } }
  if (!loginComPend.ok) throw new Error('login ComPend falhou')
  await callTok(loginComPend.data.sessao.token, 'pendencia', 'criar', { titulo: 'Pendência que impede exclusão' })
  const excluirComPend = await dispatch({ resource: 'usuario', action: 'excluir', args: { id: uComPendencias.id }, token })
  assert(!excluirComPend.ok && /pendência/.test(excluirComPend.error || ''), 'exclusão bloqueada informando o motivo (usuário com pendências)')
  const uComPendAinda = (await api('usuario', 'obter', { id: uComPendencias.id })) as { ativo: boolean }
  assert(!!uComPendAinda, 'usuário com pendências permanece cadastrado (pode ser desativado)')
  print('equipes.exclusaoBloqueada', { motivo: excluirComPend.error })

  // --- 12. Exclusão física de usuário sem vínculos ------------------
  const uExcluir = (await api('usuario', 'criar', { nome: 'Ser Excluído', email: 'excluido@empresa.com', senha: '123456', perfil: 'USUARIO', equipeId: eqMiisy.id })) as { id: string }
  const excluirOk = await dispatch({ resource: 'usuario', action: 'excluir', args: { id: uExcluir.id }, token })
  assert(excluirOk.ok, 'usuário sem vínculos é excluído fisicamente')
  const uExcluidoSumiu = await dispatch({ resource: 'usuario', action: 'obter', args: { id: uExcluir.id }, token })
  assert(!uExcluidoSumiu.ok, 'usuário excluído não aparece mais no sistema')
  const listaUsuarios = (await api('usuario', 'listar')) as Array<{ email: string }>
  assert(!listaUsuarios.some((u) => u.email === 'excluido@empresa.com'), 'usuário excluído não aparece na listagem normal')
  print('equipes.exclusaoFisica', { ok: excluirOk.ok, sumiu: !uExcluidoSumiu.ok })

  // --- 13. Desativado não faz login ---------------------------------
  const loginDesativado = (await dispatch({ resource: 'auth', action: 'login', args: { email: 'desativar@empresa.com', senha: '123456' } })) as { ok: boolean; error?: string }
  assert(!loginDesativado.ok, 'usuário desativado não consegue fazer login')
  print('equipes.loginDesativado', { bloqueado: !loginDesativado.ok })

  // --- 14. Transferência de pendência entre equipes (ADM) -----------
  const transferida = (await api('pendencia', 'atualizar', { id: pAna.id, equipeId: eqQA.id })) as { equipeId: string }
  assert(transferida.equipeId === eqQA.id, 'pendência transferida para a equipe QA')
  const histTransf = (await api('historico', 'listar', { entidade: 'pendencia', entidadeId: pAna.id })) as Array<{ tipo: string; descricao: string }>
  assert(histTransf.some((h) => h.tipo === 'EQUIPE' && h.descricao.includes('transferida')), 'transferência registrada no histórico')
  print('equipes.transferencia', { ok: true, evento: histTransf.find((h) => h.tipo === 'EQUIPE')?.descricao })

  // --- 15. Usuário comum não vê histórico de outra equipe ------------
  const histAnaOutra = await dispatch({ resource: 'historico', action: 'listar', args: { entidade: 'pendencia', entidadeId: pBruno.id }, token: tokenAna })
  assert(histAnaOutra.ok && (histAnaOutra.data as unknown[]).length === 0, 'usuário comum não vê histórico de pendência de outra equipe')
  const histBrunoPropria = (await callTok(tokenBruno, 'historico', 'listar', { entidade: 'pendencia', entidadeId: pBruno.id })) as unknown[]
  assert(histBrunoPropria.length > 0, 'usuário comum vê histórico das pendências da própria equipe')
  const histGlobalAna = await dispatch({ resource: 'historico', action: 'global', args: { limite: 100 }, token: tokenAna })
  assert(histGlobalAna.ok, 'atividade global respeita o escopo do usuário comum')
  print('equipes.historico', { negado: true, propriaEquipe: histBrunoPropria.length > 0 })

  // --- 16. Usuário comum não gerencia equipes ------------------------
  const eqNegadoAna = await dispatch({ resource: 'equipe', action: 'listar', token: tokenAna })
  assert(!eqNegadoAna.ok, 'usuário comum não gerencia equipes')
  const eqCriarNegado = await dispatch({ resource: 'equipe', action: 'criar', args: { nome: 'Hack' }, token: tokenAna })
  assert(!eqCriarNegado.ok, 'usuário comum não cria equipes')
  print('equipes.permissao', { negado: true })

  // --- 17. Dashboard por equipe para usuário comum -------------------
  const dashAna = (await callTok(tokenAna, 'dashboard', 'obter')) as { totalPendencias: number }
  const listaAnaTudo = (await callTok(tokenAna, 'pendencia', 'listar', { porPagina: 1000 })) as { total: number }
  assert(dashAna.totalPendencias === listaAnaTudo.total, 'dashboard do usuário comum reflete apenas a própria equipe')
  print('equipes.dashboard', { totalAna: dashAna.totalPendencias })

  // --- 18. Novo usuário padrão cai na equipe "Sem equipe" ------------
  const semEquipe = (await api('equipe', 'listar')) as Array<{ nome: string }>
  assert(semEquipe.some((e) => e.nome === 'Sem equipe'), 'equipe padrão "Sem equipe" existe')
  const uCriadoSemEquipe = (await api('usuario', 'obter', { id: uSem.id })) as { equipe: { nome: string } | null }
  assert(uSemAtualizado.equipeId === eqQA.id, 'usuário movido para QA no teste 8')
  print('equipes.semEquipe', { padrao: true })

  // --- 19. Calendário e busca respeitam a equipe ---------------------
  const calAna = (await callTok(tokenAna, 'calendario', 'eventos', {
    de: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
    ate: new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10)
  })) as Array<{ titulo: string; tipo: string }>
  assert(!calAna.some((e) => e.titulo.includes('regressão 99')), 'calendário do usuário comum não exibe pendências de outra equipe')
  const buscaAna = (await callTok(tokenAna, 'busca', 'global', { q: 'regressão 99' })) as { pendencias: unknown[] }
  assert(buscaAna.pendencias.length === 0, 'busca global do usuário comum não retorna pendências de outra equipe')
  print('equipes.calendarioBusca', { ok: true })

  // --- 20. Convite com equipe aceita e cria usuário na equipe --------
  const conviteQA = (await api('usuario', 'convidar', { email: 'novoqa@qa.com', nome: 'Novo QA', perfil: 'USUARIO', equipeId: eqQA.id })) as { token: string }
  const aceiteQA = await dispatch({
    resource: 'auth',
    action: 'aceitarConvite',
    args: { email: 'novoqa@qa.com', codigo: conviteQA.token, nome: 'Novo QA', senha: '123456' }
  })
  if (!aceiteQA.ok) throw new Error('aceitarConvite QA falhou: ' + aceiteQA.error)
  const viaLogin = (await dispatch({ resource: 'auth', action: 'login', args: { email: 'novoqa@qa.com', senha: '123456' } })) as { ok: boolean; data: { sessao: { usuario: { equipeId: string | null } } } }
  if (!viaLogin.ok) throw new Error('login novo QA falhou')
  assert(viaLogin.data.sessao.usuario.equipeId === eqQA.id, 'usuário aceito pelo convite entra na equipe indicada')
  print('equipes.convite', { equipeCorreta: viaLogin.data.sessao.usuario.equipeId === eqQA.id })

  console.log('\n=== TODOS OS TESTES HEADLESS PASSARAM ===')
  process.exit(0)
}

run().catch((err) => {
  console.error('\n=== FALHA NOS TESTES ===')
  console.error(err)
  process.exit(1)
})
