import kuromoji from 'kuromoji'
import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'

export let kuroshiro: {
  init(analyzer: any): Promise<void>
  convert(sentence: string): Promise<string>
}

export let tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>

export async function initKuroshiro() {
  if (kuroshiro) {
    return kuroshiro
  }

  kuroshiro = new Kuroshiro()
  await kuroshiro.init(new KuromojiAnalyzer())
  return kuroshiro
}

export async function initKuromoji() {
  if (tokenizer) {
    return tokenizer
  }

  tokenizer = await new Promise((resolve, reject) => {
    kuromoji
      .builder({
        dicPath: './kuromoji.js/dict',
      })
      .build((err, t) => (err ? reject(err) : resolve(t)))
  })

  return tokenizer
}
