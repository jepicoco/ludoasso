-- ============================================================
-- Correction : Ajout des colonnes manquantes à event_triggers
-- ============================================================

-- Vérifier si la table existe
SELECT 'Vérification de la table event_triggers...' AS Info;

-- Désactiver temporairement les erreurs pour les colonnes qui existent déjà
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='';

-- Ajouter les colonnes manquantes (ignorer les erreurs si elles existent)
ALTER TABLE event_triggers
ADD COLUMN ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d''affichage dans les listes';

ALTER TABLE event_triggers
ADD COLUMN icone VARCHAR(50) DEFAULT 'bi-bell' COMMENT 'Icône Bootstrap Icons';

ALTER TABLE event_triggers
ADD COLUMN couleur VARCHAR(20) DEFAULT 'primary' COMMENT 'Couleur Bootstrap';

-- Restaurer le mode SQL
SET SQL_MODE=@OLD_SQL_MODE;

-- Ajouter les index manquants (avec vérification)
SET @indexExists = (SELECT COUNT(*) FROM information_schema.statistics
                    WHERE table_schema = DATABASE()
                    AND table_name = 'event_triggers'
                    AND index_name = 'idx_ordre_affichage');

SET @sql = IF(@indexExists = 0,
              'CREATE INDEX idx_ordre_affichage ON event_triggers(ordre_affichage)',
              'SELECT ''Index already exists'' AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Mettre à jour les enregistrements existants pour avoir les bonnes valeurs
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
    END,
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
    END,
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
    END
WHERE ordre_affichage = 0 OR icone IS NULL OR couleur IS NULL;

SELECT 'Colonnes ajoutées et données mises à jour avec succès !' AS Info;

-- Afficher la structure finale
DESCRIBE event_triggers;
