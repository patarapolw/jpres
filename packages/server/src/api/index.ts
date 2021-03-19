import { FastifyPluginAsync } from 'fastify'
import swagger from 'fastify-swagger'

import characterRouter from './character'
import sentenceRouter from './sentence'
import utilRouter from './util'
import vocabularyRouter from './vocabulary'
import wanikaniRouter from './wanikani'

const apiRouter: FastifyPluginAsync = async (f) => {
  if (process.env['NODE_ENV'] === 'development') {
    f.register(require('fastify-cors'))
  }

  f.register(swagger, {
    openapi: {},
    routePrefix: '/doc',
    exposeRoute: process.env['NODE_ENV'] === 'development',
  })

  f.register(characterRouter, { prefix: '/character' })
  f.register(sentenceRouter, { prefix: '/sentence' })
  f.register(utilRouter, { prefix: '/util' })
  f.register(vocabularyRouter, { prefix: 'vocabulary' })
  f.register(wanikaniRouter, { prefix: '/wanikani' })
}

export default apiRouter
