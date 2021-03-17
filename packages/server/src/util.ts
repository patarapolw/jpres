import Kuroshiro from 'kuroshiro'
import MecabAnalyzer from 'kuroshiro-analyzer-mecab'

export let kuroshiro: {
  init(analyzer: any): Promise<void>
  convert(sentence: string): Promise<string>
}

export async function initKuroshiro() {
  if (kuroshiro) {
    return kuroshiro
  }

  kuroshiro = new Kuroshiro()
  await kuroshiro.init(new MecabAnalyzer())
  return kuroshiro
}
