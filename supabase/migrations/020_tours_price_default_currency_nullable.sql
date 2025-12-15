ALTER TABLE public.tours
  ALTER COLUMN price SET DEFAULT 0;

UPDATE public.tours
SET price = 0
WHERE price IS NULL;

ALTER TABLE public.tours
  ALTER COLUMN currency DROP NOT NULL;
