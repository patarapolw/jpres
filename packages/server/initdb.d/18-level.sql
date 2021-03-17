CREATE OR REPLACE FUNCTION jalevel_sentence (TEXT) RETURNS FLOAT AS
$func$
DECLARE
  segments  TEXT[];
BEGIN
  segments = (
    SELECT array_agg("value")
    FROM (
      SELECT unnest ->> 'value' AS "value", 1 g FROM unnest(
        pgroonga_tokenize($1, 'tokenizer', 'TokenMecab("use_base_form", true)')
      )
    ) t1
    WHERE "value" ~ re_han()
    GROUP BY g
  );

  RETURN (
    SELECT max("level")::FLOAT * array_length(segments, 1) / COUNT("level") FROM (
      SELECT "level", 1 g FROM wanikani.level WHERE entry = ANY(segments) AND "type" = 'vocabulary'
    ) t1
    GROUP BY g
  );
END;
$func$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION dict.f_tatoeba_random_ja (
  IN min INT, IN max INT,
  OUT result TEXT, OUT english TEXT, OUT "level" INT
) AS $$
DECLARE
  r   RECORD;
BEGIN
  FOR r IN (
    SELECT * FROM dict.tatoeba WHERE jpn IS NOT NULL ORDER BY random()
  )
  LOOP
    "level" = round(jalevel_sentence(r.jpn));
    IF "level" >= $1 AND "level" <= $2 THEN
      result = r.jpn;
      english = r.eng;
      RETURN;
    END IF;
  END LOOP;

  result = NULL;
  english = NULL;
  "level" = NULL;
END;
$$ LANGUAGE plpgsql;
