-- RETIRED — intentionally contains no seed, update, or delete statement.
-- Runtime Timeline data belongs to the family after the first successful save.
do $$
begin
  raise exception 'Deprecated: replace-test-day is disabled to protect family data.';
end;
$$;
