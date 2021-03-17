CREATE TABLE dict.wordfreq (
  "entry"           TEXT NOT NULL,
  "jpn"             FLOAT,
  PRIMARY KEY ("entry")
);

CREATE INDEX wordfreq_jpn ON dict.wordfreq ("jpn");
