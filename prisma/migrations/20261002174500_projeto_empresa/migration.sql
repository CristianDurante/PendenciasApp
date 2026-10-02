ALTER TABLE "projetos"
ADD COLUMN "empresaId" TEXT REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "projetos_empresaId_idx" ON "projetos"("empresaId");

UPDATE "projetos"
SET "empresaId" = COALESCE(
  (SELECT "empresaId" FROM "clientes" WHERE "clientes"."id" = "projetos"."clienteId"),
  (SELECT "empresaId" FROM "usuarios" WHERE "usuarios"."id" = "projetos"."responsavelId")
)
WHERE "empresaId" IS NULL;
