import { ConnectionPool, sql } from '@databases/pg'
import sqlite3 from 'better-sqlite3'

export async function populate(db: ConnectionPool) {
  const s3 = sqlite3('./assets/tatoeba.db', {
    readonly: true,
  })

  await db.tx(async (db) => {
    const batchSize = 5000

    const lots = s3
      .prepare(
        /* sql */ `
    SELECT
      s1.id       id,
      s1.sentence eng,
      json_group_object(
        s2.lang,
        s2.sentence
      ) translation
    FROM sentence s1
    JOIN link t       ON t.sentence_id = s1.id
    JOIN sentence s2  ON t.translation_id = s2.id
    WHERE s1.lang = 'eng' AND s2.lang = 'jpn'
    GROUP BY s1.id
    `
      )
      .all()
      .map((p) => {
        const tr = JSON.parse(p.translation)
        return sql`(${p.id}, ${tr.jpn || null}, ${p.eng})`
      })

    for (let i = 0; i < lots.length; i += batchSize) {
      console.log(i)
      await db.query(sql`
        INSERT INTO dict.tatoeba ("id", "jpn", "eng")
        VALUES ${sql.join(lots.slice(i, i + batchSize), ',')}
      `)
    }
  })
}
