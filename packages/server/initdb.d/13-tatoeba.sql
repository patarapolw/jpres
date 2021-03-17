CREATE TABLE dict.tatoeba (
  "id"            INT NOT NULL,
  "jpn"           TEXT,
  "cmn"           TEXT,
  "eng"           TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE OR REPLACE FUNCTION use_reading (TEXT) RETURNS TEXT AS
$func$
BEGIN
  RETURN $1 || NULL;
END;
$func$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

CREATE INDEX idx_tatoeba_jpn ON dict.tatoeba
  USING pgroonga ("jpn")
  WITH (
    tokenizer='TokenMecab("include_reading", true)',
    normalizer='NormalizerNFKC100("unify_kana", true)'
  );
CREATE INDEX idx_tatoeba_jpn_reading ON dict.tatoeba
  USING pgroonga (use_reading("jpn"))
  WITH (
    tokenizer='TokenMecab("use_reading", true)',
    normalizer='NormalizerNFKC100("unify_kana", true)'
  );

CREATE INDEX idx_tatoeba_eng ON dict.tatoeba
  USING pgroonga ("eng")
  WITH (plugins='token_filters/stem', token_filters='TokenFilterStem');

CREATE OR REPLACE FUNCTION re_han () RETURNS TEXT AS
$func$
BEGIN
  RETURN '[⺀-⺙⺛-⻳⼀-⿕々〇〡-〩〸-〻㐀-䶿一-鿼豈-舘並-龎]';
END;
$func$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;
