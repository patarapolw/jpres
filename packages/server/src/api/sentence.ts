import { sql } from '@databases/pg'
import { FastifyPluginAsync } from 'fastify'
import S from 'jsonschema-definer'

import { db } from '../shared'
import { QSplit } from '../token'
import { ILookup } from './vocabulary'

const sentenceRouter: FastifyPluginAsync = async (f) => {
  {
    const sQuery = S.shape({
      entry: S.string(),
    })

    const sResult = S.shape({
      english: S.string(),
    })

    f.get<{
      Querystring: typeof sQuery.type
    }>(
      '/',
      {
        schema: {
          querystring: sQuery.valueOf(),
          response: {
            200: sResult.valueOf(),
          },
        },
      },
      async (req): Promise<typeof sResult.type> => {
        const { entry } = req.query

        const r = await lookupSentence(entry)

        return {
          english: r.english.join(' / '),
        }
      }
    )
  }

  {
    const sQuery = S.shape({
      q: S.string(),
      page: S.integer().optional(),
      limit: S.integer().optional(),
    })

    const sResult = S.shape({
      result: S.list(
        S.shape({
          entry: S.string(),
          english: S.string(),
        })
      ),
    })

    const reW = /[^\p{L}\p{N}]+/gu

    const makeJa = new QSplit({
      default(v) {
        return sql`(${sql.join(
          [this.fields.entry[':'](v), this.fields.english[':'](v)],
          ' OR '
        )})`
      },
      fields: {
        entry: {
          ':': (v) => {
            if (!/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]/u.test(v)) {
              return sql`FALSE`
            }

            if (reW.test(v)) {
              return sql`"entry" LIKE ${'%' + v.replace(reW, '%') + '%'}`
            }

            if (!/\p{sc=Han}/u.test(v)) {
              return sql`"entry" &@ ${v} OR use_reading("entry") &@ ${v}`
            }

            return sql`"entry" &@ ${v}`
          },
        },
        english: { ':': (v) => sql`"english" &@ ${v}` },
      },
    })

    f.get<{
      Querystring: typeof sQuery.type
    }>(
      '/q',
      {
        schema: {
          querystring: sQuery.valueOf(),
          response: {
            200: sResult.valueOf(),
          },
        },
      },
      async (req): Promise<typeof sResult.type> => {
        let { q, page = 1, limit = 5 } = req.query
        q = q.trim()

        if (!q) {
          return { result: [] }
        }

        const result: {
          entry: string
          english: string
        }[] = []

        const rs = await db.query(sql`
          SELECT
            "entry",
            "english"
          FROM (
            SELECT
              "ja"   "entry",
              "en"   "english"
            FROM wanikani.sentences
          ) t1
          WHERE ${makeJa.parse(q)}
          ${page ? sql`OFFSET ${(page - 1) * limit}` : sql`ORDER BY RANDOM()`}
          LIMIT ${limit - result.length}
        `)

        result.push(...rs)

        if (page && result.length < limit) {
          const rs = await db.query(sql`
            SELECT
              "entry",
              "english"
            FROM (
              SELECT
                "jpn"    "entry",
                "eng"    "english"
              FROM dict.tatoeba
              WHERE "jpn" IS NOT NULL
            ) t1
            WHERE ${makeJa.parse(q)}
            ORDER BY RANDOM()
            LIMIT ${limit - result.length}
          `)

          result.push(...rs)
        }

        return { result }
      }
    )
  }

  {
    const sQuery = S.shape({
      levelMin: S.integer().optional(),
      level: S.integer().optional(),
      wanikani: S.boolean().optional(),
    })

    const sResult = S.shape({
      result: S.string(),
      english: S.string(),
      level: S.integer(),
    })

    f.get<{
      Querystring: typeof sQuery.type
    }>(
      '/random',
      {
        schema: {
          querystring: sQuery.valueOf(),
          response: {
            200: sResult.valueOf(),
          },
        },
      },
      async (req): Promise<typeof sResult.type> => {
        const { levelMin = 1, level = 10, wanikani } = req.query

        let r: any

        if (wanikani) {
          ;[r] = await db.query(sql`
            SELECT
              ja    result,
              en    english,
              "level"
            FROM wanikani.sentences
            WHERE "level" >= ${levelMin} AND "level" <= ${level}
            ORDER BY random()
            LIMIT 1;
          `)
        } else {
          ;[r] = await db.query(sql`
            SELECT
              *
            FROM dict.f_tatoeba_random_ja(
              ${levelMin},
              ${level}
            );
          `)
        }

        if (!r || !r.result) {
          throw { statusCode: 404 }
        }

        return r
      }
    )
  }
}

export default sentenceRouter

export async function lookupSentence(entry: string): Promise<ILookup> {
  let english: string[] = []

  {
    const [r] = await db.query(sql`
      SELECT
        "en"   "english"
      FROM wanikani.sentences
      WHERE "ja" = ${entry}
    `)

    if (r) {
      english = [r.english]
    } else {
      const [r] = await db.query(sql`
        SELECT
          "eng"    "english"
        FROM dict.tatoeba
        WHERE "jpn" = ${entry}
        `)

      if (r) {
        english = [r.english]
      }
    }
  }

  return { alt: [], reading: [], english }
}
