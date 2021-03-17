import fastify from 'fastify'
import waitOn from 'wait-on'

import apiRouter from './api'
import { logger } from './logger'
import { initDatabase } from './shared'
import { initKuroshiro } from './util'

async function main() {
  await waitOn({
    resources: ['tcp:5432'],
  })

  initDatabase()
  await initKuroshiro()

  const app = fastify({ logger })
  const port = parseInt(
    process.env['SERVER_PORT'] || process.env['PORT'] || '5000'
  )

  app.register(apiRouter, { prefix: '/api' })

  app.get('/', (_, reply) => {
    reply.redirect('/api/doc')
  })

  app.listen(port, '0.0.0.0', (err) => {
    if (err) {
      throw err
    }
    console.log(`Go to http://localhost:${port}`)
  })
}

if (require.main === module) {
  main()
}
