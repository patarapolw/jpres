import { FastifyPluginAsync } from 'fastify'
import S from 'jsonschema-definer'

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
      async (): Promise<typeof sResponse.type> => {
        return {
          result: [],
          count: 0,
        }
      }
    )
  }
}

export default sentenceRouter
