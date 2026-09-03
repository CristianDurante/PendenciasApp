-- Add the company boundary to teams.
ALTER TABLE "equipes" ADD COLUMN "empresaId" TEXT;

CREATE INDEX "equipes_empresaId_idx" ON "equipes"("empresaId");

-- Existing installations have one company in the current bootstrap model.
UPDATE "equipes"
SET "empresaId" = (SELECT "id" FROM "empresas" ORDER BY "criadoEm" ASC LIMIT 1)
WHERE "empresaId" IS NULL;
