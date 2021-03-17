import { ConnectionPool, sql } from '@databases/pg'
import sqlite3 from 'better-sqlite3'

export async function populate(db: ConnectionPool) {
  const s3 = sqlite3('./assets/edict.db', {
    readonly: true,
  })

  await db.tx(async (db) => {
    const batchSize = 5000

    const lots = s3
      .prepare(
        /* sql */ `
    SELECT id, "entry", "reading", "english"
    FROM edict
    `
      )
      .all()
      .map((p) => {
        return sql`(${JSON.parse(p.entry)}, ${JSON.parse(
          p.reading
        )}, ${JSON.parse(p.english)})`
      })

    for (let i = 0; i < lots.length; i += batchSize) {
      console.log(i)
      await db.query(sql`
        INSERT INTO dict.edict ("entry", "reading", "english")
        VALUES ${sql.join(lots.slice(i, i + batchSize), ',')}
      `)
    }
  })
}
