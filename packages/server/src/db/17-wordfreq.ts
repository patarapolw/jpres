import { ConnectionPool, sql } from '@databases/pg'
import { PythonShell } from 'python-shell'

export async function populate(db: ConnectionPool) {
  const words = await db
    .query(
      sql`
    SELECT DISTINCT el FROM (
      SELECT unnest("entry") el FROM dict.edict
      UNION
      SELECT "kanji" el FROM dict.kanji
    ) t1 WHERE el IS NOT NULL;
  `
    )
    .then((r) => r.map((r0) => r0.el))

  const batchSize = 10000
  for (let i = 0; i < words.length; i += batchSize) {
    const result: {
      entry: string
      ja: number
    }[] = []

    const python = new PythonShell('./python/17-wordfreq.py', {
      pythonPath:
        process.env['NODE_ENV'] === 'development'
          ? undefined
          : '/usr/bin/python3',
    })
    python.send(words.slice(i, i + batchSize).join('\n'))

    python.on('message', (m) => {
      const [entry, f] = m.toString().split('=')
      result.push({ entry, ja: parseFloat(f) })
    })

    await new Promise<void>((resolve, reject) => {
      python.end((e) => (e ? reject(e) : resolve()))
    })

    await db.query(sql`
      INSERT INTO dict.wordfreq ("entry", "jpn")
      VALUES ${sql.join(
        result.map((r) => sql`(${r.entry}, ${r.ja})`),
        ','
      )}
      ON CONFLICT ("entry") DO NOTHING
    `)
  }
}
