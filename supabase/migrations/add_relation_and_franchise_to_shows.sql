-- Añadir campos para franquicias y relaciones (spin-off, reboot, etc.)
ALTER TABLE shows ADD COLUMN IF NOT EXISTS relation_type TEXT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS franchise_name TEXT;