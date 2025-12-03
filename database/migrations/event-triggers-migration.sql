-- ============================================================
-- Migration : Event Triggers et Templates Messages
-- Description : Création des tables pour le système de déclencheurs d'événements
-- Date : 2025-01-03
-- ============================================================

-- Désactiver temporairement le mode strict
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

-- ============================================================
-- 1. Création de la table event_triggers
-- ============================================================

-- Supprimer la table si elle existe (pour un redémarrage propre)
DROP TABLE IF EXISTS event_triggers;

-- Créer la table event_triggers
CREATE TABLE event_triggers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Code technique unique (ex: ADHERENT_CREATED, EMPRUNT_CREATED)',
    libelle VARCHAR(100) NOT NULL COMMENT 'Nom de l\'événement',
    description TEXT DEFAULT NULL COMMENT 'Description de l\'événement',
    categorie ENUM('adherent', 'emprunt', 'cotisation', 'systeme') NOT NULL COMMENT 'Catégorie de l\'événement',
    template_email_code VARCHAR(50) DEFAULT NULL COMMENT 'Code du template email à utiliser',
    template_sms_code VARCHAR(50) DEFAULT NULL COMMENT 'Code du template SMS à utiliser',
    email_actif TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Envoi d\'email activé pour cet événement',
    sms_actif TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Envoi de SMS activé pour cet événement',
    delai_envoi INT DEFAULT 0 COMMENT 'Délai en minutes avant envoi (0 = immédiat)',
    condition_envoi TEXT DEFAULT NULL COMMENT 'Condition JSON pour l\'envoi (ex: adherent.actif = true)',
    ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d\'affichage dans les listes',
    icone VARCHAR(50) DEFAULT 'bi-bell' COMMENT 'Icône Bootstrap Icons',
    couleur VARCHAR(20) DEFAULT 'primary' COMMENT 'Couleur Bootstrap',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_categorie (categorie),
    INDEX idx_email_actif (email_actif),
    INDEX idx_sms_actif (sms_actif),
    INDEX idx_ordre_affichage (ordre_affichage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configuration des déclencheurs d\'événements pour les communications';

-- ============================================================
-- 2. Insertion des déclencheurs d'événements par défaut
-- ============================================================

-- Événements Adhérent
INSERT INTO event_triggers (code, libelle, description, categorie, template_email_code, template_sms_code, email_actif, sms_actif, delai_envoi, ordre_affichage, icone, couleur)
VALUES
('ADHERENT_CREATED', 'Création de compte adhérent', 'Envoyé lorsqu''un nouveau compte adhérent est créé', 'adherent', 'ADHERENT_CREATION', NULL, 1, 0, 0, 10, 'bi-person-plus', 'success'),
('ADHERENT_UPDATED', 'Modification de compte adhérent', 'Envoyé lorsqu''un compte adhérent est modifié', 'adherent', NULL, NULL, 0, 0, 0, 20, 'bi-person-check', 'info'),
('ADHERENT_SUSPENDED', 'Suspension de compte adhérent', 'Envoyé lorsqu''un compte adhérent est suspendu', 'adherent', NULL, NULL, 0, 0, 0, 30, 'bi-person-x', 'warning');

-- Événements Emprunt
INSERT INTO event_triggers (code, libelle, description, categorie, template_email_code, template_sms_code, email_actif, sms_actif, delai_envoi, ordre_affichage, icone, couleur)
VALUES
('EMPRUNT_CREATED', 'Création d''emprunt', 'Envoyé lorsqu''un nouvel emprunt est créé', 'emprunt', 'EMPRUNT_CONFIRMATION', NULL, 1, 0, 0, 40, 'bi-box-arrow-right', 'primary'),
('EMPRUNT_RETURNED', 'Retour d''emprunt', 'Envoyé lorsqu''un emprunt est retourné', 'emprunt', NULL, NULL, 0, 0, 0, 50, 'bi-box-arrow-left', 'success'),
('EMPRUNT_RAPPEL_J3', 'Rappel J-3 avant échéance', 'Rappel envoyé 3 jours avant la date de retour prévue', 'emprunt', 'EMPRUNT_RAPPEL_AVANT', NULL, 1, 0, 0, 60, 'bi-calendar-event', 'info'),
('EMPRUNT_RAPPEL_ECHEANCE', 'Rappel jour J échéance', 'Rappel envoyé le jour de la date de retour prévue', 'emprunt', 'EMPRUNT_RAPPEL_ECHEANCE', NULL, 1, 0, 0, 70, 'bi-alarm', 'warning'),
('EMPRUNT_RETARD', 'Relance pour retard', 'Relance envoyée en cas de retard de retour', 'emprunt', 'EMPRUNT_RELANCE_RETARD', NULL, 1, 0, 0, 80, 'bi-exclamation-triangle', 'danger');

-- Événements Cotisation
INSERT INTO event_triggers (code, libelle, description, categorie, template_email_code, template_sms_code, email_actif, sms_actif, delai_envoi, ordre_affichage, icone, couleur)
VALUES
('COTISATION_CREATED', 'Création de cotisation', 'Envoyé lorsqu''une nouvelle cotisation est créée', 'cotisation', 'COTISATION_CONFIRMATION', NULL, 1, 0, 0, 90, 'bi-credit-card', 'success'),
('COTISATION_EXPIRATION', 'Rappel expiration cotisation', 'Rappel envoyé 30 jours avant l''expiration de la cotisation', 'cotisation', 'COTISATION_RAPPEL', NULL, 1, 0, 0, 100, 'bi-calendar-x', 'warning'),
('COTISATION_EXPIRED', 'Cotisation expirée', 'Notification envoyée lorsque la cotisation est expirée', 'cotisation', NULL, NULL, 0, 0, 0, 110, 'bi-x-circle', 'danger');

-- ============================================================
-- 3. Vérification des données insérées
-- ============================================================

-- Afficher tous les event triggers créés
SELECT
    id,
    code,
    libelle,
    categorie,
    template_email_code,
    email_actif,
    sms_actif
FROM event_triggers
ORDER BY ordre_affichage ASC;

-- Statistiques par catégorie
SELECT
    categorie,
    COUNT(*) as total,
    SUM(email_actif) as emails_actifs,
    SUM(sms_actif) as sms_actifs
FROM event_triggers
GROUP BY categorie;

-- ============================================================
-- 4. Vérification de la table templates_messages (doit exister)
-- ============================================================

-- Vérifier que la table templates_messages existe
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'templates_messages';

-- Afficher les templates disponibles pour les event triggers
SELECT
    code,
    libelle,
    type_message,
    categorie,
    actif
FROM templates_messages
WHERE actif = TRUE
ORDER BY categorie, ordre_affichage;

-- ============================================================
-- 5. Vérification de la table email_logs (doit exister)
-- ============================================================

-- Vérifier que la table email_logs existe
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'email_logs';

-- ============================================================
-- NOTES IMPORTANTES
-- ============================================================

-- 1. Cette migration crée la table event_triggers avec tous les déclencheurs par défaut
-- 2. Les templates email référencés (ADHERENT_CREATION, EMPRUNT_CONFIRMATION, etc.)
--    doivent exister dans la table templates_messages
-- 3. Si vous avez déjà des données, utilisez ON DUPLICATE KEY UPDATE pour les mettre à jour
-- 4. Les event triggers sont liés aux templates via le champ template_email_code
-- 5. Par défaut, certains événements ont email_actif=TRUE pour démarrer rapidement

-- ============================================================
-- COMMANDES UTILES POUR LA GESTION
-- ============================================================

-- Activer l'envoi d'email pour un événement spécifique
-- UPDATE event_triggers SET email_actif = TRUE WHERE code = 'ADHERENT_CREATED';

-- Désactiver l'envoi d'email pour un événement spécifique
-- UPDATE event_triggers SET email_actif = FALSE WHERE code = 'ADHERENT_UPDATED';

-- Changer le template email d'un événement
-- UPDATE event_triggers SET template_email_code = 'NOUVEAU_TEMPLATE' WHERE code = 'ADHERENT_CREATED';

-- Lister tous les événements actifs (email ou SMS)
-- SELECT * FROM event_triggers WHERE email_actif = TRUE OR sms_actif = TRUE;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
