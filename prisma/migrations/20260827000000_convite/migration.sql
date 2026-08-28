-- CreateTable
CREATE TABLE "convites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "perfil" TEXT NOT NULL DEFAULT 'USUARIO',
    "cargo" TEXT,
    "telefone" TEXT,
    "empresaId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" DATETIME NOT NULL,
    "usadoEm" DATETIME,
    "canceladoEm" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "convites_token_key" ON "convites"("token");

-- CreateIndex
CREATE INDEX "convites_email_idx" ON "convites"("email");
