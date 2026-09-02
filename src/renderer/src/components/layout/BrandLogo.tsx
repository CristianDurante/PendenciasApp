import type { ReactNode } from 'react'

export function BrandLogo({ tamanho = 'md' }: { tamanho?: 'sm' | 'md' | 'lg' }): ReactNode {
  const dimensoes = { sm: 32, md: 40, lg: 64 }
  const tamanhoPx = dimensoes[tamanho]

  return (
    <svg
      aria-label="Pendencias"
      className="shrink-0"
      height={tamanhoPx}
      viewBox="0 0 64 64"
      width={tamanhoPx}
      role="img"
    >
      <rect fill="currentColor" height="64" rx="18" width="64" className="text-brand-600 dark:text-brand-500" />
      <path d="M18 15h15a11 11 0 0 1 0 22H24v12h-6V15Zm6 6v10h9a5 5 0 0 0 0-10h-9Z" fill="white" />
      <path d="m37 45 4 4 9-10" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
    </svg>
  )
}