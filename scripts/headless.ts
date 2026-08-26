import { rmSync } from 'node:fs'
import { join } from 'node:path'

const dbDir = join(process.cwd(), '.pendify-test')
rmSync(dbDir, { recursive: true, force: true })
process.env.PENDIFY_DB_PATH = join(dbDir, 'pendify.db')

async function run(): Promise<void> {
  const { ensureDatabase } = await import('../src/main/db')
  const { ensureBootstrap } = await import('../src/main/bootstrap')
  const { dispatch } = await import('../src/main/services/registry')

  await ensureDatabase()
  await ensureBootstrap()

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

  console.log('\n=== TODOS OS TESTES HEADLESS PASSARAM ===')
  process.exit(0)
}

run().catch((err) => {
  console.error('\n=== FALHA NOS TESTES ===')
  console.error(err)
  process.exit(1)
})
