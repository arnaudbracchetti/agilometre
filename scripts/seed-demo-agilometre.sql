-- Génère 5 sessions CLOTUREE pour "Équipe Démo" sur le modèle "Modèle Démo",
-- avec pour chaque question du modèle un tour de vote clos et 10 à 15 réponses aléatoires.
-- Crée l'Équipe et le Modèle démo s'ils n'existent pas encore (5 questions par Thème,
-- dans l'ordre) — le Référentiel lui-même doit déjà être importé au préalable
-- (scripts/import-referentiel.sh apps/backend/referentiel_questions/question_axe_1-4.yaml).
--
-- Adapté de seed-sessions-test-equipe-filiere.sql (mêmes libellés « test » repris tels quels
-- dans le nom de l'Équipe/du Modèle, remplacés ici par des libellés présentables en démo).
--
-- Usage exceptionnel : à exécuter une seule fois contre la base de PRODUCTION fraîchement
-- déployée, uniquement pour peupler une démo. La base doit être réinitialisée après la démo
-- (docker compose down -v + up -d sur le serveur, cf. docs/deploy-agilometre.md) — ce script ne
-- doit jamais faire partie d'un déploiement normal.

DO $$
DECLARE
  v_entite_nom  text := 'Entité Démo';
  v_equipe_nom  text := 'Équipe Démo';
  v_modele_nom  text := 'Modèle Démo';
  v_entite_id  text;
  v_equipe_id  text;
  v_modele_id  text;
  v_dates      date[] := ARRAY['2026-08-15', '2026-07-07', '2026-07-20', '2026-05-10', '2026-04-05']::date[];
  v_date       date;
  v_session_id text;
  v_code       text;
  v_item       RECORD;
  v_tour_id    text;
  v_nb_reponses int;
  i            int;
BEGIN
  -- Entité (parent obligatoire de l'Équipe) — cherchée par nom (unique en base, cf.
  -- entite_nom_unique_ci), créée seulement si absente.
  SELECT id INTO v_entite_id FROM "Entite" WHERE lower(nom) = lower(v_entite_nom);
  IF v_entite_id IS NULL THEN
    v_entite_id := gen_random_uuid()::text;
    INSERT INTO "Entite" (id, nom) VALUES (v_entite_id, v_entite_nom);
  END IF;

  -- Équipe — même pattern (unique par nom, cf. equipe_nom_unique_ci).
  SELECT id INTO v_equipe_id FROM "Equipe" WHERE lower(nom) = lower(v_equipe_nom);
  IF v_equipe_id IS NULL THEN
    v_equipe_id := gen_random_uuid()::text;
    INSERT INTO "Equipe" (id, nom, "entiteId") VALUES (v_equipe_id, v_equipe_nom, v_entite_id);
  END IF;

  -- Modèle de session, avec 5 questions par Thème si créé ici. Suppose le Référentiel déjà
  -- importé (Thème/Question sont un bounded context séparé, pas créé par ce script).
  SELECT id INTO v_modele_id FROM "ModeleSession" WHERE lower(nom) = lower(v_modele_nom);
  IF v_modele_id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM "Theme" WHERE "retireLe" IS NULL) THEN
      RAISE EXCEPTION 'Aucun Thème en base : importer le Référentiel avant ce script (scripts/import-referentiel.sh)';
    END IF;

    v_modele_id := gen_random_uuid()::text;
    INSERT INTO "ModeleSession" (id, nom, "updatedAt") VALUES (v_modele_id, v_modele_nom, now());

    INSERT INTO "SelectionItem" (id, "modeleSessionId", "questionId", "ordre")
    SELECT gen_random_uuid()::text, v_modele_id, q.id, row_number() OVER (ORDER BY t.ordre, q.ordre)
    FROM "Theme" t
    JOIN LATERAL (
      SELECT id, ordre
      FROM "Question"
      WHERE "themeId" = t.id AND "retireeLe" IS NULL
      ORDER BY ordre
      LIMIT 5
    ) q ON true
    WHERE t."retireLe" IS NULL;
  END IF;

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
