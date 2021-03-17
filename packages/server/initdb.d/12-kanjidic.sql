CREATE TABLE dict.kanji (
  "kanji"           TEXT NOT NULL,
  "kunyomi"         TEXT[] NOT NULL,
  "onyomi"          TEXT[] NOT NULL,
  "nanori"          TEXT[] NOT NULL,
  "english"         TEXT[] NOT NULL,
  PRIMARY KEY ("kanji")
);

CREATE OR REPLACE FUNCTION normalize_kunyomi (TEXT[]) RETURNS TEXT[] AS
$func$
DECLARE
    s       TEXT;
    new_arr TEXT[] := '{}';
BEGIN
    FOREACH s IN ARRAY $1||'{}'::text[] LOOP
        new_arr := new_arr || regexp_split_to_array(regexp_replace(s, '^([^.]+)\.([^.]+)$', '\1 \1\2'), E' ');
    END LOOP;
    RETURN new_arr;
END;
$func$ LANGUAGE plpgsql IMMUTABLE;

CREATE INDEX idx_kanji_search ON dict.kanji
  USING pgroonga (
    normalize_kunyomi("kunyomi"),
    "nanori"
  )
  WITH (
    tokenizer='',
    normalizer='NormalizerNFKC100("unify_kana", true)'
  );

-- Be careful with onyomi: do not segment
CREATE INDEX idx_kanji_onyomi ON dict.kanji
  USING pgroonga ("onyomi")
  WITH (
    tokenizer='',
    normalizer='NormalizerNFKC100("unify_kana", true)'
  );

CREATE INDEX idx_kanji_english ON dict.kanji
  USING pgroonga ("english")
  WITH (
    normalizer='NormalizerNFKC100("unify_kana", true)',
    plugins='token_filters/stem',
    token_filters='TokenFilterStem'
  );
