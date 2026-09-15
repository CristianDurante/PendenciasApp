import { main } from './index'

main().catch((err) => {
  console.error('[pendencias-server] erro fatal:', err)
  process.exit(1)
})