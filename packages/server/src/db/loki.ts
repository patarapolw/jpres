import { FSStorage } from '@lokidb/fs-storage'
import { FullTextSearch } from '@lokidb/full-text-search'
import FullTextSearchEn from '@lokidb/full-text-search-language-en'
import Loki, { Collection } from '@lokidb/loki'
import { katakanaToHiragana } from 'jskana'

import { initKuromoji } from '../util'

FSStorage.register()
FullTextSearch.register()

export let db: Loki
export let dbSentence: Collection<{
  ja: string
  en: string
  source: string
}>

export async function initDatabase(
  opts: {
    /**
     * @default './data.loki'
     */
    filename?: string
  } = {}
) {
  const kuro = await initKuromoji()

  db = new Loki(opts.filename || './data.loki')
  await db.initializePersistence({
    adapter: new FSStorage(),
    autoload: true,
  })

  dbSentence =
    db.getCollection('sentence') ||
    db.addCollection('sentence', {
      fullTextSearch: [
        {
          field: 'ja',
          analyzer: {
            tokenizer: (s) =>
              kuro
                .tokenize(s)
                .flatMap((p) => [p.basic_form, p.surface_form, p.reading || ''])
                .filter((t) => t)
                .map((t) => katakanaToHiragana(t)),
          },
        },
        {
          field: 'en',
          analyzer: new FullTextSearchEn(),
        },
      ],
      rangedIndexes: {
        source: { indexTypeName: 'avl', comparatorName: 'js' },
      },
    })

  return db
}
