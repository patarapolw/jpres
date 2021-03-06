import { FastifyPluginAsync } from 'fastify'
import S from 'jsonschema-definer'
import Mecab from 'mecab-async'
import Text2Speech from 'node-gtts'

import { kuroshiro } from '../util'

const utilRouter: FastifyPluginAsync = async (f) => {
  {
    const mecab = new Mecab()

    const sQuery = S.shape({
      q: S.string(),
    })

    const sResponse = S.shape({
      result: S.list(
        S.shape({
          // kanji: S.string(),
        }).additionalProperties(true)
      ),
    })

    f.get<{
      Querystring: typeof sQuery.type
    }>(
      '/tokenize',
      {
        schema: {
          querystring: sQuery.valueOf(),
          response: {
            200: sResponse.valueOf(),
          },
        },
      },
      async (req): Promise<typeof sResponse.type> => {
        return {
          result: mecab.parseSyncFormat(req.query.q),
        }
      }
    )
  }

  {
    const sQuery = S.shape({
      q: S.string(),
    })

    const sResponse = S.shape({
      result: S.string(),
    })

    f.get<{
      Querystring: typeof sQuery.type
    }>(
      '/reading',
      {
        schema: {
          querystring: sQuery.valueOf(),
          response: {
            200: sResponse.valueOf(),
          },
        },
      },
      async (req): Promise<typeof sResponse.type> => {
        return {
          result: await kuroshiro.convert(req.query.q),
        }
      }
    )
  }

  {
    const sQuerystring = S.shape({
      q: S.string(),
    })

    f.get<{
      Querystring: typeof sQuerystring.type
    }>(
      '/speak',
      {
        schema: {
          querystring: sQuerystring.valueOf(),
        },
      },
      (req, reply) => {
        const gtts = Text2Speech('ja')
        reply.send(gtts.stream(req.query.q))
      }
    )
  }
}

export default utilRouter
