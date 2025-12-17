-- Add thumbnail URL for tour list/cards to reduce bytes served
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS image_thumb TEXT;
