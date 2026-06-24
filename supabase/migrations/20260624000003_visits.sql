-- ─── Verifica duplicados antes de adicionar constraint ────────────────────────
-- A query seguinte deve devolver 0 rows; se devolver alguma, há duplicados a limpar:
-- SELECT restaurant_id, COUNT(*) FROM public.recommendations GROUP BY restaurant_id HAVING COUNT(*) > 1;

ALTER TABLE public.recommendations
  ADD CONSTRAINT recommendations_restaurant_id_key UNIQUE (restaurant_id);

-- ─── Tabela visits ────────────────────────────────────────────────────────────

CREATE TABLE public.visits (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES public.restaurants ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating        smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comentario    text,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT visits_restaurant_user_key UNIQUE (restaurant_id, user_id)
);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visits: authenticated can select"
  ON public.visits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "visits: authenticated insert own"
  ON public.visits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "visits: authenticated update own"
  ON public.visits FOR UPDATE
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.visits TO authenticated;
