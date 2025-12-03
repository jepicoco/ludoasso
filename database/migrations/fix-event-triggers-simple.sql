-- ============================================================
-- Correction SIMPLE : Ajout des colonnes manquantes
-- Note : Si une colonne existe déjà, vous verrez une erreur mais c'est normal
-- ============================================================

-- Ajouter ordre_affichage
ALTER TABLE event_triggers ADD COLUMN ordre_affichage INT NOT NULL DEFAULT 0;

-- Ajouter icone
ALTER TABLE event_triggers ADD COLUMN icone VARCHAR(50) DEFAULT 'bi-bell';

-- Ajouter couleur
ALTER TABLE event_triggers ADD COLUMN couleur VARCHAR(20) DEFAULT 'primary';

-- Ajouter l'index
ALTER TABLE event_triggers ADD INDEX idx_ordre_affichage (ordre_affichage);

-- Mettre à jour les valeurs
UPDATE event_triggers SET
    ordre_affichage = CASE code
        WHEN 'ADHERENT_CREATED' THEN 10
        WHEN 'ADHERENT_UPDATED' THEN 20
        WHEN 'ADHERENT_SUSPENDED' THEN 30
        WHEN 'EMPRUNT_CREATED' THEN 40
        WHEN 'EMPRUNT_RETURNED' THEN 50
        WHEN 'EMPRUNT_RAPPEL_J3' THEN 60
        WHEN 'EMPRUNT_RAPPEL_ECHEANCE' THEN 70
        WHEN 'EMPRUNT_RETARD' THEN 80
        WHEN 'COTISATION_CREATED' THEN 90
        WHEN 'COTISATION_EXPIRATION' THEN 100
        WHEN 'COTISATION_EXPIRED' THEN 110
        ELSE 999
    END;

UPDATE event_triggers SET
    icone = CASE code
        WHEN 'ADHERENT_CREATED' THEN 'bi-person-plus'
        WHEN 'ADHERENT_UPDATED' THEN 'bi-person-check'
        WHEN 'ADHERENT_SUSPENDED' THEN 'bi-person-x'
        WHEN 'EMPRUNT_CREATED' THEN 'bi-box-arrow-right'
        WHEN 'EMPRUNT_RETURNED' THEN 'bi-box-arrow-left'
        WHEN 'EMPRUNT_RAPPEL_J3' THEN 'bi-calendar-event'
        WHEN 'EMPRUNT_RAPPEL_ECHEANCE' THEN 'bi-alarm'
        WHEN 'EMPRUNT_RETARD' THEN 'bi-exclamation-triangle'
        WHEN 'COTISATION_CREATED' THEN 'bi-credit-card'
        WHEN 'COTISATION_EXPIRATION' THEN 'bi-calendar-x'
        WHEN 'COTISATION_EXPIRED' THEN 'bi-x-circle'
        ELSE 'bi-bell'
    END;

UPDATE event_triggers SET
    couleur = CASE code
        WHEN 'ADHERENT_CREATED' THEN 'success'
        WHEN 'ADHERENT_UPDATED' THEN 'info'
        WHEN 'ADHERENT_SUSPENDED' THEN 'warning'
        WHEN 'EMPRUNT_CREATED' THEN 'primary'
        WHEN 'EMPRUNT_RETURNED' THEN 'success'
        WHEN 'EMPRUNT_RAPPEL_J3' THEN 'info'
        WHEN 'EMPRUNT_RAPPEL_ECHEANCE' THEN 'warning'
        WHEN 'EMPRUNT_RETARD' THEN 'danger'
        WHEN 'COTISATION_CREATED' THEN 'success'
        WHEN 'COTISATION_EXPIRATION' THEN 'warning'
        WHEN 'COTISATION_EXPIRED' THEN 'danger'
        ELSE 'primary'
    END;

-- Vérifier le résultat
SELECT 'Colonnes ajoutées et données mises à jour !' AS Resultat;
SELECT * FROM event_triggers ORDER BY ordre_affichage;
