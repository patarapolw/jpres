import { initDatabase } from '../shared'
import * as wk from './10-wanikani'
import * as edict from './11-edict'
import * as kanjidic from './12-kanjidic'
import * as tatoeba from './13-tatoeba'
import * as radical from './16-radical'
import * as wordfreq from './17-wordfreq'

if (require.main === module) {
  ;(async () => {
    const db = initDatabase()

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
