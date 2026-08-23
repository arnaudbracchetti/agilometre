-- Génère 5 sessions CLOTUREE pour "Equipe Filière" sur le modèle "Modele de test",
-- avec pour chaque question du modèle un tour de vote clos et 10 à 15 réponses aléatoires.
-- À exécuter contre la base de dev (port 5433), là où l'équipe et le modèle existent déjà.

DO $$
DECLARE
  v_equipe_id  text := 'fa293ca4-4cde-4555-8615-a275cbc75f03';
  v_modele_id  text := 'a731379a-596e-40f7-9f0b-73d2a3cc5719';
  v_dates      date[] := ARRAY['2026-08-15', '2026-07-07', '2026-07-20', '2026-05-10', '2026-04-05']::date[];
  v_date       date;
  v_session_id text;
  v_code       text;
  v_item       RECORD;
  v_tour_id    text;
  v_nb_reponses int;
  i            int;
BEGIN
  FOREACH v_date IN ARRAY v_dates LOOP
    v_session_id := gen_random_uuid()::text;
    v_code := (1000 + floor(random() * 9000))::int::text;

    INSERT INTO "Session" (id, "equipeId", date, statut, code, "ouvertureLe", "indexCourant", "modeleSessionId")
    VALUES (v_session_id, v_equipe_id, v_date, 'CLOTUREE', v_code, v_date, 12, v_modele_id);

    FOR v_item IN
      SELECT "questionId", "ordre" FROM "SelectionItem" WHERE "modeleSessionId" = v_modele_id ORDER BY "ordre"
    LOOP
      INSERT INTO "SessionSelectionItem" (id, "sessionId", "questionId", "ordre")
      VALUES (gen_random_uuid()::text, v_session_id, v_item."questionId", v_item."ordre");

      v_tour_id := gen_random_uuid()::text;
      INSERT INTO "TourDeVote" (id, "sessionId", "questionId", numero, "ouvertLe", "clotureLe")
      VALUES (v_tour_id, v_session_id, v_item."questionId", 1, v_date, v_date + interval '1 hour');

      v_nb_reponses := 10 + floor(random() * 6)::int; -- entre 10 et 15 inclus

      FOR i IN 1..v_nb_reponses LOOP
        INSERT INTO "Reponse" (id, "questionId", niveau, "equipeId", horodatage, origine, "tourId")
        VALUES (
          gen_random_uuid()::text,
          v_item."questionId",
          1 + floor(random() * 4)::int,
          v_equipe_id,
          v_date + (random() * interval '1 hour'),
          'SESSION',
          v_tour_id
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
