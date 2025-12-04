-- ============================================================
-- Correction COMPLÈTE : Ajout de toutes les colonnes manquantes
-- Note : Les erreurs "Column already exists" sont normales, ignorez-les
-- ============================================================

-- ============================================================
-- 1. Table configurations_email
-- ============================================================
ALTER TABLE configurations_email ADD COLUMN ordre_affichage INT NOT NULL DEFAULT 0;
ALTER TABLE configurations_email ADD COLUMN par_defaut TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE configurations_email ADD COLUMN icone VARCHAR(50) DEFAULT 'bi-envelope';
ALTER TABLE configurations_email ADD COLUMN couleur VARCHAR(20) DEFAULT 'primary';
ALTER TABLE configurations_email ADD COLUMN notes TEXT DEFAULT NULL;
ALTER TABLE configurations_email ADD COLUMN role_minimum ENUM('gestionnaire', 'comptable', 'administrateur') NOT NULL DEFAULT 'gestionnaire';

-- Index pour configurations_email
ALTER TABLE configurations_email ADD INDEX idx_ordre_affichage (ordre_affichage);
ALTER TABLE configurations_email ADD INDEX idx_par_defaut (par_defaut);
ALTER TABLE configurations_email ADD INDEX idx_role_minimum (role_minimum);

-- ============================================================
-- 2. Table event_triggers (au cas où)
-- ============================================================
ALTER TABLE event_triggers ADD COLUMN ordre_affichage INT NOT NULL DEFAULT 0;
ALTER TABLE event_triggers ADD COLUMN icone VARCHAR(50) DEFAULT 'bi-bell';
ALTER TABLE event_triggers ADD COLUMN couleur VARCHAR(20) DEFAULT 'primary';

-- Index pour event_triggers
ALTER TABLE event_triggers ADD INDEX idx_ordre_affichage_et (ordre_affichage);

-- ============================================================
-- 3. Table templates_messages (au cas où)
-- ============================================================
ALTER TABLE templates_messages ADD COLUMN ordre_affichage INT NOT NULL DEFAULT 0;
ALTER TABLE templates_messages ADD COLUMN icone VARCHAR(50) DEFAULT 'bi-file-text';
ALTER TABLE templates_messages ADD COLUMN couleur VARCHAR(20) DEFAULT 'info';
ALTER TABLE templates_messages ADD COLUMN categorie VARCHAR(50) DEFAULT NULL;

-- Index pour templates_messages
ALTER TABLE templates_messages ADD INDEX idx_ordre_affichage_tm (ordre_affichage);
ALTER TABLE templates_messages ADD INDEX idx_categorie (categorie);

-- ============================================================
-- 4. Vérification finale
-- ============================================================
SELECT 'Configuration terminée ! Vérifiez les structures ci-dessous.' AS Info;

SELECT 'Structure de configurations_email :' AS Info;
DESCRIBE configurations_email;

SELECT 'Structure de event_triggers :' AS Info;
DESCRIBE event_triggers;

SELECT 'Structure de templates_messages :' AS Info;
DESCRIBE templates_messages;
