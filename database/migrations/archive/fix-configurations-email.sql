-- ============================================================
-- Correction : Ajout des colonnes manquantes à configurations_email
-- ============================================================

-- Ajouter ordre_affichage (si elle n'existe pas)
ALTER TABLE configurations_email ADD COLUMN ordre_affichage INT NOT NULL DEFAULT 0;

-- Ajouter par_defaut (si elle n'existe pas)
ALTER TABLE configurations_email ADD COLUMN par_defaut TINYINT(1) NOT NULL DEFAULT 0;

-- Ajouter icone (si elle n'existe pas)
ALTER TABLE configurations_email ADD COLUMN icone VARCHAR(50) DEFAULT 'bi-envelope';

-- Ajouter couleur (si elle n'existe pas)
ALTER TABLE configurations_email ADD COLUMN couleur VARCHAR(20) DEFAULT 'primary';

-- Ajouter notes (si elle n'existe pas)
ALTER TABLE configurations_email ADD COLUMN notes TEXT DEFAULT NULL;

-- Ajouter role_minimum (si elle n'existe pas)
ALTER TABLE configurations_email ADD COLUMN role_minimum ENUM('gestionnaire', 'comptable', 'administrateur') NOT NULL DEFAULT 'gestionnaire';

-- Renommer 'nom' en 'libelle' si la colonne 'nom' existe et 'libelle' n'existe pas
-- ALTER TABLE configurations_email CHANGE COLUMN nom libelle VARCHAR(100) NOT NULL;

-- Ajouter les index manquants
ALTER TABLE configurations_email ADD INDEX idx_ordre_affichage (ordre_affichage);
ALTER TABLE configurations_email ADD INDEX idx_par_defaut (par_defaut);
ALTER TABLE configurations_email ADD INDEX idx_role_minimum (role_minimum);

-- Vérifier le résultat
SELECT 'Colonnes ajoutées à configurations_email !' AS Resultat;
DESCRIBE configurations_email;
