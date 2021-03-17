import { ConnectionPool, sql } from '@databases/pg'
import sqlite3 from 'better-sqlite3'

export async function populate(db: ConnectionPool) {
  const s3 = sqlite3('./assets/kanjidic.db', {
    readonly: true,
  })

  await db.tx(async (db) => {
    const batchSize = 5000

    const lots = s3
      .prepare(
        /* sql */ `
    SELECT "kanji", "kunyomi", "onyomi", "nanori", "english"
    FROM kanji
    `
      )
      .all()
      .map((p) => {
        return sql`(${p.kanji}, ${JSON.parse(p.kunyomi)}, ${JSON.parse(
          p.onyomi
        )}, ${JSON.parse(p.nanori)}, ${JSON.parse(p.english)})`
      })

    for (let i = 0; i < lots.length; i += batchSize) {
      console.log(i)
      await db.query(sql`
        INSERT INTO dict.kanji ("kanji", "kunyomi", "onyomi", "nanori", "english")
        VALUES ${sql.join(lots.slice(i, i + batchSize), ',')}
      `)
    }
  })
}
