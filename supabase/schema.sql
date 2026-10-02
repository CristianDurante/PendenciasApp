-- Create the tables and indexes for a new Pendify Supabase project. Run once in the Supabase SQL Editor.
-- Generated from prisma/schema.prisma; this script does not migrate existing SQLite data.

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "logo" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "config" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "liderId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" TEXT NOT NULL DEFAULT 'USUARIO',
    "cargo" TEXT,
    "telefone" TEXT,
    "avatar" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT,
    "equipeId" TEXT,
    "ultimoAcesso" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresa" TEXT,
    "cnpj" TEXT,
    "contato" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "sistema" TEXT,
    "projeto" TEXT,
    "responsavelInterno" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "responsavelId" TEXT,
    "clienteId" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#64748b',
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendencias" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "clienteId" TEXT,
    "projetoId" TEXT,
    "sistema" TEXT,
    "responsavelId" TEXT,
    "criadorId" TEXT NOT NULL,
    "equipeId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazo" TIMESTAMP(3),
    "horario" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "categoriaId" TEXT,
    "departamento" TEXT,
    "status" TEXT NOT NULL DEFAULT 'A_FAZER',
    "observacoes" TEXT,
    "concluidaEm" TIMESTAMP(3),
    "recorrencia" TEXT,
    "ultimaAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pendencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendencia_tags" (
    "pendenciaId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "pendencia_tags_pkey" PRIMARY KEY ("pendenciaId","tagId")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "pendenciaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "pendenciaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "pendenciaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "concluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT,
    "clienteId" TEXT,
    "projetoId" TEXT,
    "pendenciaId" TEXT,
    "compromissoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compromissos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "clienteId" TEXT,
    "projetoId" TEXT,
    "responsavelId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "local" TEXT,
    "link" TEXT,
    "participantes" TEXT,
    "descricao" TEXT,
    "observacoes" TEXT,
    "lembreteMinutos" INTEGER,
    "lembreteDisparado" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'AGENDADO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compromissos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retornos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "contato" TEXT,
    "assunto" TEXT NOT NULL,
    "dataPrevista" TIMESTAMP(3),
    "horario" TEXT,
    "responsavelId" TEXT,
    "observacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retornos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historicos" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "detalhes" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT,
    "relacionadoId" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lembretes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "entidade" TEXT,
    "entidadeId" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "disparado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lembretes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "perfil" TEXT NOT NULL DEFAULT 'USUARIO',
    "cargo" TEXT,
    "telefone" TEXT,
    "empresaId" TEXT,
    "equipeId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "canceladoEm" TIMESTAMP(3),

    CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_recuperacao" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_recuperacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipes_liderId_idx" ON "equipes"("liderId");

-- CreateIndex
CREATE INDEX "equipes_empresaId_idx" ON "equipes"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_equipeId_idx" ON "usuarios"("equipeId");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE INDEX "clientes_empresaId_ativo_idx" ON "clientes"("empresaId", "ativo");

-- CreateIndex
CREATE INDEX "pendencias_status_idx" ON "pendencias"("status");

-- CreateIndex
CREATE INDEX "pendencias_prazo_idx" ON "pendencias"("prazo");

-- CreateIndex
CREATE INDEX "pendencias_clienteId_idx" ON "pendencias"("clienteId");

-- CreateIndex
CREATE INDEX "pendencias_projetoId_idx" ON "pendencias"("projetoId");

-- CreateIndex
CREATE INDEX "pendencias_responsavelId_idx" ON "pendencias"("responsavelId");

-- CreateIndex
CREATE INDEX "pendencias_equipeId_idx" ON "pendencias"("equipeId");

-- CreateIndex
CREATE INDEX "pendencias_criadorId_idx" ON "pendencias"("criadorId");

-- CreateIndex
CREATE INDEX "comentarios_pendenciaId_idx" ON "comentarios"("pendenciaId");

-- CreateIndex
CREATE INDEX "anexos_pendenciaId_idx" ON "anexos"("pendenciaId");

-- CreateIndex
CREATE INDEX "checklist_items_pendenciaId_idx" ON "checklist_items"("pendenciaId");

-- CreateIndex
CREATE INDEX "notas_usuarioId_atualizadoEm_idx" ON "notas"("usuarioId", "atualizadoEm");

-- CreateIndex
CREATE INDEX "compromissos_clienteId_data_idx" ON "compromissos"("clienteId", "data");

-- CreateIndex
CREATE INDEX "compromissos_responsavelId_data_idx" ON "compromissos"("responsavelId", "data");

-- CreateIndex
CREATE INDEX "retornos_clienteId_dataPrevista_idx" ON "retornos"("clienteId", "dataPrevista");

-- CreateIndex
CREATE INDEX "retornos_responsavelId_status_idx" ON "retornos"("responsavelId", "status");

-- CreateIndex
CREATE INDEX "historicos_entidade_entidadeId_idx" ON "historicos"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "notificacoes_usuarioId_lida_criadoEm_idx" ON "notificacoes"("usuarioId", "lida", "criadoEm");

-- CreateIndex
CREATE INDEX "lembretes_usuarioId_disparado_dataHora_idx" ON "lembretes"("usuarioId", "disparado", "dataHora");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_token_key" ON "sessoes"("token");

-- CreateIndex
CREATE UNIQUE INDEX "convites_token_key" ON "convites"("token");

-- CreateIndex
CREATE INDEX "codigos_recuperacao_email_idx" ON "codigos_recuperacao"("email");

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_criadorId_fkey" FOREIGN KEY ("criadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencia_tags" ADD CONSTRAINT "pendencia_tags_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "pendencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencia_tags" ADD CONSTRAINT "pendencia_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "pendencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "pendencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "pendencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "pendencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_compromissoId_fkey" FOREIGN KEY ("compromissoId") REFERENCES "compromissos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retornos" ADD CONSTRAINT "retornos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retornos" ADD CONSTRAINT "retornos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historicos" ADD CONSTRAINT "historicos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prevent direct access through Supabase's public Data API; the backend uses its PostgreSQL connection.
ALTER TABLE public."empresas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."equipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."projetos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."categorias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pendencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pendencia_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."comentarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."anexos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."checklist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."compromissos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."retornos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."historicos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notificacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."lembretes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sessoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."convites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."codigos_recuperacao" ENABLE ROW LEVEL SECURITY;
