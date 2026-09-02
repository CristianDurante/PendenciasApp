-- CreateTable equipes
CREATE TABLE "equipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "liderId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "equipes_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "equipes_liderId_idx" ON "equipes"("liderId");

-- AlterTable usuarios: coluna equipeId
ALTER TABLE "usuarios" ADD COLUMN "equipeId" TEXT;

-- CreateIndex
CREATE INDEX "usuarios_equipeId_idx" ON "usuarios"("equipeId");

-- AlterTable pendencias: coluna equipeId
ALTER TABLE "pendencias" ADD COLUMN "equipeId" TEXT;

-- CreateIndex
CREATE INDEX "pendencias_equipeId_idx" ON "pendencias"("equipeId");

-- AlterTable convites: coluna equipeId
ALTER TABLE "convites" ADD COLUMN "equipeId" TEXT;

-- Equipe padrao para registros existentes sem equipe
INSERT INTO "equipes" ("id", "nome", "descricao", "ativo", "criadoEm", "atualizadoEm")
VALUES ('equipe-sem-equipe', 'Sem equipe', 'Equipe padrão para registros ainda não organizados.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill: usuarios e pendencias existentes passam para a equipe padrao.
-- Nenhum dado existente e perdido nem fica inacessivel.
UPDATE "usuarios" SET "equipeId" = 'equipe-sem-equipe' WHERE "equipeId" IS NULL;
UPDATE "pendencias" SET "equipeId" = 'equipe-sem-equipe' WHERE "equipeId" IS NULL;
