ALTER TABLE "pendencias"
ADD COLUMN "gestorId" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "pendencias_gestorId_idx" ON "pendencias"("gestorId");
