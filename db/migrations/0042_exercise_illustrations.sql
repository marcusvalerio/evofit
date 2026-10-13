-- EVOFIT: metadados das ilustrações do catálogo; os arquivos ficam em storage/CDN.
CREATE TABLE IF NOT EXISTS exercise_illustrations (
  exercise_id text PRIMARY KEY CHECK (length(exercise_id) BETWEEN 1 AND 120),
  asset_url text NOT NULL CHECK (length(asset_url) <= 1000),
  format text NOT NULL DEFAULT 'svg' CHECK (format IN ('svg','webp','png','gif')),
  alt_text text NOT NULL DEFAULT '' CHECK (length(alt_text) <= 240),
  animation_url text NOT NULL DEFAULT '' CHECK (length(animation_url) <= 1000),
  source text NOT NULL DEFAULT 'evofit-original' CHECK (length(source) <= 120),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exercise_illustrations_updated_at_idx ON exercise_illustrations (updated_at DESC);
