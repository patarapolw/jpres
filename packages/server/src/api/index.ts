import { FastifyPluginAsync } from 'fastify'
import swagger from 'fastify-swagger'

import sentenceRouter from './sentence'
import utilRouter from './util'

const apiRouter: FastifyPluginAsync = async (f) => {
  if (process.env['NODE_ENV'] === 'development') {
    f.register(require('fastify-cors'))
  }

  f.register(swagger, {
    openapi: {},
    routePrefix: '/doc',
    exposeRoute: process.env['NODE_ENV'] === 'development',
  })

  f.register(sentenceRouter, { prefix: '/sentence' })
  f.register(utilRouter, { prefix: '/util' })
}

export default apiRouter
