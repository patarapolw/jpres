import sql from '@databases/sql'
import axios from 'axios'
import { FastifyPluginAsync } from 'fastify'
import S from 'jsonschema-definer'

import { db } from '../shared'

const wanikaniRouter: FastifyPluginAsync = async (f) => {
  {
    const sBody = S.shape({
      apiKey: S.string(),
    })

    const sResponse = S.shape({
      result: S.string(),
    })

    f.post<{
      Body: typeof sBody.type
    }>(
      '/init',
      {
        schema: {
          body: sBody.valueOf(),
          response: {
            200: sResponse.valueOf(),
          },
        },
      },
      async (req): Promise<typeof sResponse.type> => {
        const wkApi = axios.create({
          baseURL: 'https://api.wanikani.com/v2/',
          headers: {
            Authorization: `Bearer ${req.body.apiKey}`,
          },
          validateStatus: function () {
            return true
          },
        })

        let nextUrl = '/subjects'

        while (true) {
          const r = await wkApi.get<
            ICollection<
              IResource & {
                id: number
                object: string
                data_updated_at: string
                url: string
              }
            >
          >(nextUrl)

          await db.tx(async (db) => {
            const lots: ReturnType<typeof sql>[] = []

            for (const d of r.data.data) {
              lots.push(
                sql`(${d.id}, ${new Date(d.data_updated_at)}, ${d.object}, ${
                  d.url
                }, ${d.data})`
              )
            }

            const batchSize = 100
            for (let i = 0; i < lots.length; i += batchSize) {
              await db.query(sql`
                INSERT INTO wanikani.subjects ("id", "data_updated_at", "object", "url", "data")
                VALUES ${sql.join(lots.slice(i, i + batchSize), ',')}
              `)
            }
          })

          nextUrl = r.data.pages.next_url || ''
          if (!nextUrl) {
            break
          }

          console.log(nextUrl)
        }

        await db.query(sql`
          DELETE FROM wanikani.subjects
          WHERE ctid NOT IN (
            SELECT array_agg[1]
            FROM (
              SELECT array_agg(ctid)
              FROM (
                SELECT ctid, id FROM wanikani.subjects
                ORDER BY "data_updated_at" DESC
              ) t1
              GROUP BY id
            ) t2
          )
        `)

        return {
          result: 'updated WaniKani data',
        }
      }
    )
  }
}

export default wanikaniRouter

export interface IResource<T = any> {
  id: number
  url: string
  data_updated_at: string // Date
  data: T
}

export interface ICollection<T = any> {
  object: string
  url: string
  pages: {
    next_url?: string
    previous_url?: string
    per_page: number
  }
  total_count: number
  data_updated_at: string // Date
  data: T[]
}

export interface IError {
  error: string
  code: number
}
