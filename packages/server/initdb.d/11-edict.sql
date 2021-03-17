CREATE TABLE dict.edict (
  "id"              INT GENERATED ALWAYS AS IDENTITY,
  "entry"           TEXT[] NOT NULL,
  "reading"         TEXT[] NOT NULL,
  "english"         TEXT[] NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX idx_edict_japanese ON dict.edict
  USING pgroonga (
    "entry",
    "reading"
  )
  WITH (
    tokenizer='',
    normalizer='NormalizerNFKC100("unify_kana", true)'
  );
CREATE INDEX idx_edict_english ON dict.edict
  USING pgroonga ("english")
  WITH (
    normalizer='NormalizerNFKC100("unify_kana", true)',
    plugins='token_filters/stem',
    token_filters='TokenFilterStem'
  );

CREATE INDEX idx_edict_synonyms ON dict.edict
  USING pgroonga ("entry" pgroonga_text_array_term_search_ops_v2);
