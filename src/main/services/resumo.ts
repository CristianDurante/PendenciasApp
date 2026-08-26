import type { Prisma } from '@prisma/client'

export const USUARIO_RESUMO = { id: true, nome: true, avatar: true } satisfies Prisma.UsuarioSelect

export const USUARIO_RESUMO_SELECAO: Prisma.UsuarioSelect = { id: true, nome: true, avatar: true }
