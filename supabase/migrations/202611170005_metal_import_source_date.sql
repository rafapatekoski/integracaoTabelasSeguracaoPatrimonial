-- Preserve source dates and times when an imported value cannot be parsed.
alter table public.metal_detector_logs
  add column if not exists source_date_raw text,
  add column if not exists source_time_raw text;
