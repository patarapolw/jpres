import { ConnectionPool, sql } from '@databases/pg'
import sqlite3 from 'better-sqlite3'

export async function populate(db: ConnectionPool) {
  const s3 = sqlite3('./assets/wanikani.db', { readonly: true })

  await db.tx(async (db) => {
    const batchSize = 5000

    const lots = s3
      .prepare(
        /* sql */ `
    SELECT id, data_updated_at, "object", "url", "data"
    FROM subjects
    `
      )
      .all()
      .map((p) => {
        return sql`(${p.id}, ${new Date(p.data_updated_at)}, ${p.object}, ${
          p.url
        }, ${JSON.parse(p.data)})`
      })

    for (let i = 0; i < lots.length; i += batchSize) {
      await db.query(sql`
        INSERT INTO wanikani.subjects (id, data_updated_at, "object", "url", "data")
        VALUES ${sql.join(lots.slice(i, i + batchSize), ',')}
      `)
    }
  })
}
