CREATE TABLE wanikani.subjects (
  "id"              INT NOT NULL,
  "object"          TEXT NOT NULL,
  "data_updated_at" TEXT NOT NULL,
  "url"             TEXT NOT NULL,
  "data"            JSONB NOT NULL
);

CREATE INDEX idx_subjects_id ON wanikani.subjects ("id");
CREATE INDEX idx_subjects_object ON wanikani.subjects ("object");
CREATE INDEX idx_subjects_data_updated_at ON wanikani.subjects ("data_updated_at");

CREATE MATERIALIZED VIEW wanikani.sentences AS
  SELECT
    s ->> 'en' AS en,
    s ->> 'ja' AS ja,
    "level"
  FROM (
    SELECT
      jsonb_array_elements("data" -> 'context_sentences') AS s,
      ("data" -> 'level')::int AS "level"
    FROM wanikani.subjects
  ) t1;

CREATE INDEX idx_sentences_ja ON wanikani.sentences
  USING pgroonga ("ja")
  WITH (
    tokenizer='TokenMecab("include_reading", true)',
    normalizer='NormalizerNFKC100("unify_kana", true)'
  );
CREATE INDEX idx_sentences_ja_reading ON wanikani.sentences
  USING pgroonga (("ja" || ''))
  WITH (
    tokenizer='TokenMecab("use_reading", true)',
    normalizer='NormalizerNFKC100("unify_kana", true)'
  );

CREATE INDEX idx_sentences_en ON wanikani.sentences
  USING pgroonga ("en")
  WITH (
    normalizer='NormalizerNFKC100("unify_kana", true)',
    plugins='token_filters/stem',
    token_filters='TokenFilterStem'
  );

CREATE INDEX idx_subjects_characters ON wanikani.subjects (("data" ->> 'characters'));
CREATE INDEX idx_subjects_level ON wanikani.subjects ((("data" -> 'level')::int));

CREATE VIEW wanikani.level AS
  SELECT
    "data" ->> 'characters'   "entry",
    ("data" -> 'level')::int  "level",
    "object"                  "type"
  FROM wanikani.subjects;
