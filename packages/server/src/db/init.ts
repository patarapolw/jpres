import createConnectionPool, { ConnectionPoolConfig } from '@databases/pg'

import * as wk from './10-wanikani'
import * as edict from './11-edict'
import * as kanjidic from './12-kanjidic'
import * as tatoeba from './13-tatoeba'
import * as radical from './16-radical'
import * as wordfreq from './17-wordfreq'

if (require.main === module) {
  ;(async () => {
    const cfg: ConnectionPoolConfig = {
      user: process.env['POSTGRES_USER'],
      password: process.env['POSTGRES_PASSWORD'],
      database: process.env['POSTGRES_DB'],
      host: process.env['NODE_ENV'] === 'development' ? 'localhost' : '',
      port: 5433,
      bigIntMode: 'number',
    }

    const db = createConnectionPool(
      process.env['NODE_ENV'] === 'development'
        ? cfg
        : `postgresql://postgres@:5432/${cfg.database}`
    )

    try {
      await wk.populate(db)
      await edict.populate(db)
      await kanjidic.populate(db)
      await tatoeba.populate(db)
      await radical.populate(db)
      await wordfreq.populate(db)
    } catch (e) {
      console.error(e)
    }

    await db.dispose()
  })()
}
