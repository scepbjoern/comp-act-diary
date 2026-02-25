-- Enable pg_trgm extension for fuzzy search (similarity function)
-- Run this once on your development database
-- 
-- Usage with psql:
--   psql -d comp_act_diary -f scripts/enable-pg-trgm.sql
--
-- Or via Prisma Studio / database client:
--   Execute the CREATE EXTENSION statement directly

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify the extension is installed
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
