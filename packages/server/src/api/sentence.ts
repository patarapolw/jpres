import { FastifyPluginAsync } from 'fastify'
import S from 'jsonschema-definer'

import { dbSentence } from '../db/loki'

const sentenceRouter: FastifyPluginAsync = async (f) => {
  {
    const sQuery = S.shape({
      q: S.string(),
      offset: S.integer().optional(),
      limit: S.integer().optional(),
    })

    const sResponse = S.shape({
      result: S.list(
        S.shape({
          ja: S.string(),
          en: S.string(),
        }).additionalProperties(true)
      ),
      count: S.integer(),
    })

    f.get<{
      Querystring: typeof sQuery.type
    }>(
      '/q',
      {
        schema: {
          querystring: sQuery.valueOf(),
          response: {
            200: sResponse.valueOf(),
          },
        },
      },
      async (req): Promise<typeof sResponse.type> => {
        const { q, offset = 0, limit = 5 } = req.query

        const rs = dbSentence.find({
          $fts: {
            query: {
              type: 'term',
              field: 'ja',
              value: q,
            },
          },
        })

        return {
          result: rs.slice(offset, offset + limit),
          count: rs.length,
        }
      }
    )
  }
}

export default sentenceRouter
