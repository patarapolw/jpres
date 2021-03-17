import { sql } from '@databases/pg'
import { FastifyPluginAsync } from 'fastify'
import S from 'jsonschema-definer'

import { db } from '../shared'
import { QSplit } from '../token'
import { ILookup } from './vocabulary'

const characterRouter: FastifyPluginAsync = async (f) => {
  {
    const sQuery = S.shape({
      entry: S.string(),
    })

    const sResult = S.shape({
      sub: S.list(S.string()),
      sup: S.list(S.string()),
      var: S.list(S.string()),
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

        const [
          r1 = {
            sub: [],
            sup: [],
            var: [],
          },
        ]: {
          sub: string[]
          sup: string[]
          var: string[]
        }[] = await db.query(sql`
          SELECT
            "sub", "sup", "var"
          FROM dict.radical
          WHERE "entry" = ${entry}
        `)

        const rad = [...r1.sub, ...r1.sup, ...r1.var]

        if (rad.length) {
          const rs = await db.query(sql`
            SELECT "entry", "jpn"
            FROM dict.wordfreq WHERE "entry" = ANY(${rad})
          `)

          const radMap = new Map<string, number>()
          for (const r of rs) {
            radMap.set(r.entry, r.jpn)
          }

          r1.sub = r1.sub.sort(
            (a, b) => (radMap.get(b) || 0) - (radMap.get(a) || 0)
          )
          r1.sup = r1.sup.sort(
            (a, b) => (radMap.get(b) || 0) - (radMap.get(a) || 0)
          )
          r1.var = r1.var.sort(
            (a, b) => (radMap.get(b) || 0) - (radMap.get(a) || 0)
          )
        }

        const { reading, english } = await lookupCharacter(entry)

        return {
          ...r1,
          reading,
          english,
        }
      }
    )
  }

  {
    const sQuery = S.shape({
      q: S.string(),
    })

    const sResult = S.shape({
      result: S.list(S.string()),
    })

    const makeRad = new QSplit({
      default(v) {
        if (/^\p{sc=Han}{2,}$/u.test(v)) {
          const re = /\p{sc=Han}/gu
          let m = re.exec(v)
          const out: string[] = []
          while (m) {
            out.push(m[0])
            m = re.exec(v)
          }

          return sql`(${sql.join(
            out.map((v) => {
              return this.fields.entry[':'](v)
            }),
            ' OR '
          )})`
        } else if (/^\p{sc=Han}$/u.test(v)) {
          return sql`(${sql.join(
            [
              this.fields.entry[':'](v),
              this.fields.sub[':'](v),
              this.fields.sup[':'](v),
              this.fields.var[':'](v),
            ],
            ' OR '
          )})`
        }

        return sql`TRUE`
      },
      fields: {
        entry: { ':': (v) => sql`"entry" &@~ character_expand(${v})` },
        kanji: { ':': (v) => sql`"entry" &@~ character_expand(${v})` },
        hanzi: { ':': (v) => sql`"entry" &@~ character_expand(${v})` },
        sub: { ':': (v) => sql`"sub" &@ ${v}` },
        sup: { ':': (v) => sql`"sup" &@ ${v}` },
        var: { ':': (v) => sql`"var" &@ ${v}` },
      },
    })

    const makeJa = new QSplit({
      default(v) {
        if (/^\p{sc=Han}+$/u.test(v)) {
          return sql`TRUE`
        }

        return sql`(${sql.join(
          [this.fields.reading[':'](v), this.fields.english[':'](v)],
          ' OR '
        )})`
      },
      fields: {
        onyomi: { ':': (v) => sql`"onyomi" &@ ${v}` },
        kunyomi: { ':': (v) => sql`normalize_kunyomi("kunyomi") &@ ${v}` },
        nanori: { ':': (v) => sql`"nanori" &@ ${v}` },
        reading: {
          ':': (v) =>
            sql`"onyomi" &@ ${v} OR normalize_kunyomi("kunyomi") &@ ${v} OR "nanori" &@ ${v}`,
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
        let { q } = req.query
        q = q.trim()

        if (!q) {
          return { result: [] }
        }

        const result: {
          entry: string
        }[] = await db.query(sql`
        SELECT
          r.entry "entry"
        FROM (
          SELECT
            "entry"
          FROM dict.radical
          WHERE ${makeRad.parse(q) || sql`TRUE`}
        ) r
        LEFT JOIN dict.kanji k ON r.entry = k.kanji
        LEFT JOIN dict.wordfreq f ON f.entry = r.entry
        WHERE ${makeJa.parse(q) || sql`FALSE`}
        ORDER BY f.jpn DESC
        `)

        return { result: result.map((r) => r.entry) }
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
        let r0: any

        const [r] = await db.query(sql`
          SELECT
            "data" ->> 'characters'   "result",
            "data" -> 'meanings'      "meanings",
            "level"
          FROM (
            SELECT
              "data",
              ("data" -> 'level')::int  "level"
            FROM wanikani.subjects
            WHERE "object" = 'kanji'
          ) t1
          WHERE "level" >= ${1} AND "level" <= ${30}
          ORDER BY RANDOM();
        `)

        if (!r) {
          throw { statusCode: 404 }
        }

        r.english = r.meanings.map((v: { meaning: string }) => v.meaning)
        r0 = r

        return {
          ...r0,
          english: r0.english.join(' / '),
        }
      }
    )
  }
}

export default characterRouter

export async function lookupCharacter(entry: string): Promise<ILookup> {
  const reading: { type?: string; reading: string }[] = []
  let english: string[] = []

  const [r2] = await db.query(sql`
    SELECT
      "onyomi",
      "kunyomi",
      "nanori",
      "english"
    FROM dict.kanji
    WHERE "kanji" = ${entry}
  `)

  if (r2) {
    ;(r2.kunyomi || []).map((v: string) => {
      reading.push({ type: 'kunyomi', reading: v })
    })
    ;(r2.onyomi || []).map((v: string) => {
      reading.push({ type: 'onyomi', reading: v })
    })
    ;(r2.nanori || []).map((v: string) => {
      reading.push({ type: 'nanori', reading: v })
    })
    english = r2.english
  }

  return {
    alt: [],
    reading,
    english,
  }
}
