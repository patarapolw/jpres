declare module 'mecab-async' {
  export interface MecabParsed {
    // Ref: http://mecab.googlecode.com/svn/trunk/mecab/doc/index.html
    // 表層形\t品詞,品詞細分類1,品詞細分類2,品詞細分類3,活用形,活用型,原形,読み,発音
    kanji: string
    lexical: string
    compound: string
    compound2: string
    compound3: string
    conjugation: string
    inflection: string
    original: string
    reading: string
    pronunciation: string
  }

  class Mecab {
    parseFormat(s: string, cb: (err?: Error, r: MecabParsed[]) => void): void
    parseSyncFormat(s: string): MecabParsed[]
    wakachi(s: string, cb: (err?: Error, arr: string[]) => void): void
    wakachiSync(s: string): string[]
  }

  export = Mecab
}
