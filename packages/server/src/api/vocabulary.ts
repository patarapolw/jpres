import { sql } from '@databases/pg'
import { FastifyPluginAsync } from 'fastify'
import S from 'jsonschema-definer'

import { db } from '../shared'
import { QSplit } from '../token'

const vocabularyRouter: FastifyPluginAsync = async (f) => {
  {
    const sQuery = S.shape({
      entry: S.string(),
    })

    const sResult = S.shape({
      alt: S.list(S.string()),
      reading: S.list(
        S.shape({
          type: S.string().optional(),
          reading: S.string(),
        })
      ),
      english: S.list(S.string()),
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

        return lookupVocabulary(entry)
      }
    )
  }

  {
    const sQuery = S.shape({
      q: S.string(),
    })

    const sResult = S.shape({
      result: S.list(
        S.shape({
          entry: S.string(),
          alt: S.list(S.string()),
          reading: S.list(S.string()),
          english: S.list(S.string()),
        })
      ),
    })

    const makeJa = new QSplit({
      default(v) {
        return sql`(${sql.join(
          [
            this.fields.entry[':'](v),
            this.fields.reading[':'](v),
            this.fields.english[':'](v),
          ],
          ' OR '
        )})`
      },
      fields: {
        entry: {
          ':': (v) => {
            if (!/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]/u.test(v)) {
              return sql`FALSE`
            }

            return sql`"entry" &@ ${v}`
          },
        },
        reading: { ':': (v) => sql`"reading" &@ ${v}` },
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
        let { q } = req.query
        q = q.trim()

        if (!q) {
          return { result: [] }
        }

        let result: {
          entry: string
          alt: string[]
          reading: string[]
          english: string[]
        }[] = []

        const r = await db.query(sql`
          SELECT
            d.entry "entry",
            "reading",
            "english"
          FROM (
            SELECT
              "entry",
              "reading",
              "english"
            FROM dict.edict
            WHERE ${makeJa.parse(q)}
          ) d
          LEFT JOIN dict.wordfreq f ON d.entry[0] = f.entry
          ORDER BY f.jpn DESC
        `)

        result.push(
          ...r.map((r0) => ({
            entry: r0.entry[0],
            alt: r0.entry.slice(1),
            reading: r0.reading,
            english: r0.english,
          }))
        )

        const resultU = result.map(
          (r) =>
            [...new Set([r.entry, ...r.alt])].sort().join('_') +
            '__' +
            [...new Set(r.reading.map((r0) => r0.toLocaleLowerCase()))]
              .sort()
              .join('_')
        )

        return {
          result: result.filter((_, i) => resultU.indexOf(resultU[i]) === i),
        }
      }
    )
  }

  {
    const sResult = S.shape({
      result: S.list(
        S.shape({
          entry: S.string(),
          level: S.integer(),
        })
      ),
    })

    f.get(
      '/list/level',
      {
        schema: {
          response: {
            200: sResult.valueOf(),
          },
        },
      },
      async (): Promise<typeof sResult.type> => {
        const result = await db.query(sql`
        SELECT "entry", "level"
        FROM (
          SELECT
            ("data" -> 'characters') "entry",
            ("data" -> 'level')::int "level"
          FROM wanikani.subjects
          WHERE "object" = 'vocabulary'
        ) t1
        ORDER BY "level"
        `)

        return { result }
      }
    )
  }

  {
    const sResult = S.shape({
      result: S.string(),
      english: S.string(),
      level: S.integer(),
    })

    f.get(
      '/random',
      {
        schema: {
          response: {
            200: sResult.valueOf(),
          },
        },
      },
      async (): Promise<typeof sResult.type> => {
        let r: any
        ;[r] = await db.query(sql`
          SELECT
            "data" ->> 'characters'   "result",
            "data" -> 'meanings'      "meanings",
            "level"
          FROM (
            SELECT
              "data",
              ("data" -> 'level')::int  "level"
            FROM wanikani.subjects
            WHERE "object" = 'vocabulary'
          ) t1
          WHERE "level" >= ${1} AND "level" <= ${30}
          ORDER BY RANDOM();
        `)

        if (!r) {
          throw { statusCode: 404 }
        }

        r.english = r.meanings.map((v: { meaning: string }) => v.meaning)

        return {
          ...r,
          english: r.english.join(' / '),
        }
      }
    )
  }
}

export default vocabularyRouter

export interface ILookup {
  alt: string[]
  reading: { type?: string; reading: string }[]
  english: string[]
}

export async function lookupVocabulary(entry: string): Promise<ILookup> {
  const out: ILookup = {
    alt: [],
    reading: [],
    english: [],
  }

  {
    const r = await db.query(sql`
    SELECT
      d.entry "entry",
      "reading",
      "english"
    FROM (
      SELECT
        "entry",
        "reading",
        "english"
      FROM dict.edict
      WHERE ${entry} = ANY("entry")
    ) d
    LEFT JOIN dict.wordfreq f ON d.entry[0] = f.entry
    ORDER BY f.jpn DESC
    `)

    r.map((r0) => {
      out.alt.push(...r0.entry)
      out.reading.push(...r0.reading.map((reading: string) => ({ reading })))
      out.english.push(...r0.english)
    })
  }

  out.alt = out.alt
    .filter((a) => a && a !== entry)
    .filter((a, i, arr) => arr.indexOf(a) === i)
  out.reading = out.reading.filter(
    (a, i, arr) =>
      arr.findIndex((b) => b.type === a.type && b.reading === a.reading) === i
  )
  out.english = out.english.filter((a, i, arr) => arr.indexOf(a) === i)

  return out
}
