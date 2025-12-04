-- ============================================================
-- Migration Complète : Système de Communications
-- Description : Création de toutes les tables nécessaires pour le système de communications
-- Date : 2025-01-03
-- ============================================================

-- Désactiver temporairement le mode strict
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

-- ============================================================
-- 1. Table : templates_messages
-- ============================================================

DROP TABLE IF EXISTS templates_messages;

CREATE TABLE templates_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Code technique unique',
    libelle VARCHAR(100) NOT NULL COMMENT 'Nom du template',
    description TEXT DEFAULT NULL COMMENT 'Description du template',
    type_message ENUM('email', 'sms', 'both') NOT NULL COMMENT 'Type de message supporté',
    email_objet VARCHAR(255) DEFAULT NULL COMMENT 'Sujet de l''email',
    email_corps TEXT DEFAULT NULL COMMENT 'Corps de l''email (HTML)',
    sms_corps TEXT DEFAULT NULL COMMENT 'Corps du SMS (max 480 chars)',
    variables_disponibles TEXT DEFAULT NULL COMMENT 'Liste des variables disponibles (JSON)',
    actif TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Template actif',
    ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d''affichage',
    categorie VARCHAR(50) DEFAULT NULL COMMENT 'Catégorie',
    icone VARCHAR(50) DEFAULT 'bi-file-text' COMMENT 'Icône Bootstrap Icons',
    couleur VARCHAR(20) DEFAULT 'info' COMMENT 'Couleur Bootstrap',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_actif (actif),
    INDEX idx_type_message (type_message),
    INDEX idx_categorie (categorie),
    INDEX idx_ordre_affichage (ordre_affichage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Templates de messages pour emails et SMS';

-- ============================================================
-- 2. Table : event_triggers
-- ============================================================

DROP TABLE IF EXISTS event_triggers;

CREATE TABLE event_triggers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Code technique unique',
    libelle VARCHAR(100) NOT NULL COMMENT 'Nom de l''événement',
    description TEXT DEFAULT NULL COMMENT 'Description de l''événement',
    categorie ENUM('adherent', 'emprunt', 'cotisation', 'systeme') NOT NULL COMMENT 'Catégorie',
    template_email_code VARCHAR(50) DEFAULT NULL COMMENT 'Code du template email',
    template_sms_code VARCHAR(50) DEFAULT NULL COMMENT 'Code du template SMS',
    email_actif TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Email activé',
    sms_actif TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'SMS activé',
    delai_envoi INT DEFAULT 0 COMMENT 'Délai en minutes (0 = immédiat)',
    condition_envoi TEXT DEFAULT NULL COMMENT 'Condition JSON',
    ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d''affichage',
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
COMMENT='Déclencheurs d''événements pour les communications';

-- ============================================================
-- 3. Table : email_logs
-- ============================================================

DROP TABLE IF EXISTS email_logs;

CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_code VARCHAR(50) DEFAULT NULL COMMENT 'Code du template utilisé',
    destinataire VARCHAR(255) NOT NULL COMMENT 'Email du destinataire',
    destinataire_nom VARCHAR(255) DEFAULT NULL COMMENT 'Nom du destinataire',
    objet VARCHAR(255) NOT NULL COMMENT 'Sujet de l''email',
    corps TEXT DEFAULT NULL COMMENT 'Corps de l''email',
    statut ENUM('en_attente', 'envoye', 'erreur') NOT NULL DEFAULT 'en_attente' COMMENT 'Statut de l''envoi',
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Date d''envoi',
    message_id VARCHAR(255) DEFAULT NULL COMMENT 'ID du message (retourné par le serveur SMTP)',
    erreur_message TEXT DEFAULT NULL COMMENT 'Message d''erreur si échec',
    adherent_id INT DEFAULT NULL COMMENT 'ID de l''adhérent concerné',
    emprunt_id INT DEFAULT NULL COMMENT 'ID de l''emprunt concerné',
    cotisation_id INT DEFAULT NULL COMMENT 'ID de la cotisation concernée',
    metadata TEXT DEFAULT NULL COMMENT 'Métadonnées supplémentaires (JSON)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_destinataire (destinataire),
    INDEX idx_statut (statut),
    INDEX idx_date_envoi (date_envoi),
    INDEX idx_adherent_id (adherent_id),
    INDEX idx_template_code (template_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Logs des emails envoyés';

-- ============================================================
-- 4. Table : configurations_email
-- ============================================================

DROP TABLE IF EXISTS configurations_email;

CREATE TABLE configurations_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL COMMENT 'Nom de la configuration',
    smtp_host VARCHAR(255) NOT NULL COMMENT 'Hôte SMTP',
    smtp_port INT NOT NULL DEFAULT 587 COMMENT 'Port SMTP',
    smtp_secure TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Utiliser SSL/TLS',
    smtp_user VARCHAR(255) NOT NULL COMMENT 'Utilisateur SMTP',
    smtp_password TEXT NOT NULL COMMENT 'Mot de passe SMTP (chiffré)',
    email_expediteur VARCHAR(255) NOT NULL COMMENT 'Email expéditeur',
    nom_expediteur VARCHAR(255) DEFAULT NULL COMMENT 'Nom de l''expéditeur',
    actif TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Configuration active',
    smtp_timeout INT DEFAULT 10000 COMMENT 'Timeout en ms',
    smtp_require_tls TINYINT(1) DEFAULT 1 COMMENT 'Requiert TLS',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_actif (actif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configurations des serveurs SMTP';

-- ============================================================
-- 5. Insertion des templates de messages par défaut
-- ============================================================

INSERT INTO templates_messages (code, libelle, description, type_message, email_objet, email_corps, categorie, actif, ordre_affichage)
VALUES
('ADHERENT_CREATION', 'Bienvenue nouvel adhérent', 'Email de bienvenue envoyé lors de la création d''un compte', 'email',
'Bienvenue à la Ludothèque !',
'<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Bienvenue à la Ludothèque ! Votre compte a été créé avec succès.</p>
<p><strong>Votre code adhérent :</strong> {{code_barre}}</p>
<p><strong>Email :</strong> {{email}}</p>
<p>Vous pouvez dès maintenant emprunter des jeux !</p>
<p>À bientôt,<br>L''équipe de la Ludothèque</p>',
'Adhérent', 1, 10),

('EMPRUNT_CONFIRMATION', 'Confirmation d''emprunt', 'Email de confirmation envoyé lors d''un nouvel emprunt', 'email',
'Confirmation de votre emprunt',
'<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Votre emprunt a bien été enregistré !</p>
<p><strong>Jeu emprunté :</strong> {{titre_jeu}}</p>
<p><strong>Date d''emprunt :</strong> {{date_emprunt}}</p>
<p><strong>Date de retour prévue :</strong> {{date_retour_prevue}}</p>
<p>Pensez à nous rapporter le jeu avant la date prévue.</p>
<p>Bon jeu !<br>L''équipe de la Ludothèque</p>',
'Emprunt', 1, 20),

('EMPRUNT_RAPPEL_AVANT', 'Rappel avant échéance', 'Email de rappel envoyé 3 jours avant la date de retour', 'email',
'Rappel : retour de jeu dans {{jours_restants}} jours',
'<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Ce message pour vous rappeler que le jeu <strong>{{titre_jeu}}</strong> est à retourner dans <strong>{{jours_restants}} jours</strong>.</p>
<p><strong>Date de retour prévue :</strong> {{date_retour_prevue}}</p>
<p>Merci de penser à nous le rapporter à temps !</p>
<p>À bientôt,<br>L''équipe de la Ludothèque</p>',
'Emprunt', 1, 30),

('EMPRUNT_RAPPEL_ECHEANCE', 'Rappel jour de l''échéance', 'Email de rappel le jour de la date de retour', 'email',
'Retour de jeu aujourd''hui',
'<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Le jeu <strong>{{titre_jeu}}</strong> est à retourner <strong>aujourd''hui</strong>.</p>
<p><strong>Date de retour prévue :</strong> {{date_retour_prevue}}</p>
<p>Merci de nous le rapporter dès que possible !</p>
<p>À bientôt,<br>L''équipe de la Ludothèque</p>',
'Emprunt', 1, 40),

('EMPRUNT_RELANCE_RETARD', 'Relance pour retard', 'Email de relance en cas de retard de retour', 'email',
'Retard de retour - {{titre_jeu}}',
'<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Le jeu <strong>{{titre_jeu}}</strong> aurait dû être retourné le <strong>{{date_retour_prevue}}</strong>.</p>
<p>Vous avez actuellement <strong>{{jours_retard}} jour(s) de retard</strong>.</p>
<p>Merci de nous rapporter le jeu dès que possible.</p>
<p>Cordialement,<br>L''équipe de la Ludothèque</p>',
'Emprunt', 1, 50),

('COTISATION_CONFIRMATION', 'Confirmation de cotisation', 'Email de confirmation de paiement de cotisation', 'email',
'Confirmation de votre cotisation',
'<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Votre cotisation a bien été enregistrée !</p>
<p><strong>Montant payé :</strong> {{montant}} €</p>
<p><strong>Mode de paiement :</strong> {{mode_paiement}}</p>
<p><strong>Période :</strong> du {{periode_debut}} au {{periode_fin}}</p>
<p>Merci pour votre adhésion !</p>
<p>À bientôt,<br>L''équipe de la Ludothèque</p>',
'Cotisation', 1, 60),

('COTISATION_RAPPEL', 'Rappel expiration cotisation', 'Email de rappel avant expiration de cotisation', 'email',
'Votre cotisation expire bientôt',
'<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Votre cotisation arrive à expiration dans <strong>{{jours_restants}} jours</strong>.</p>
<p><strong>Date d''expiration :</strong> {{date_expiration}}</p>
<p>Pensez à renouveler votre cotisation pour continuer à profiter de la ludothèque !</p>
<p>À bientôt,<br>L''équipe de la Ludothèque</p>',
'Cotisation', 1, 70);

-- ============================================================
-- 6. Insertion des event triggers
-- ============================================================

INSERT INTO event_triggers (code, libelle, description, categorie, template_email_code, email_actif, ordre_affichage, icone, couleur)
VALUES
-- Adhérents
('ADHERENT_CREATED', 'Création de compte adhérent', 'Envoyé lors de la création d''un nouveau compte', 'adherent', 'ADHERENT_CREATION', 1, 10, 'bi-person-plus', 'success'),
('ADHERENT_UPDATED', 'Modification de compte', 'Envoyé lors de la modification d''un compte', 'adherent', NULL, 0, 20, 'bi-person-check', 'info'),
('ADHERENT_SUSPENDED', 'Suspension de compte', 'Envoyé lors de la suspension d''un compte', 'adherent', NULL, 0, 30, 'bi-person-x', 'warning'),

-- Emprunts
('EMPRUNT_CREATED', 'Création d''emprunt', 'Envoyé lors de la création d''un emprunt', 'emprunt', 'EMPRUNT_CONFIRMATION', 1, 40, 'bi-box-arrow-right', 'primary'),
('EMPRUNT_RETURNED', 'Retour d''emprunt', 'Envoyé lors du retour d''un emprunt', 'emprunt', NULL, 0, 50, 'bi-box-arrow-left', 'success'),
('EMPRUNT_RAPPEL_J3', 'Rappel J-3 avant échéance', 'Rappel 3 jours avant la date de retour', 'emprunt', 'EMPRUNT_RAPPEL_AVANT', 1, 60, 'bi-calendar-event', 'info'),
('EMPRUNT_RAPPEL_ECHEANCE', 'Rappel jour J', 'Rappel le jour de la date de retour', 'emprunt', 'EMPRUNT_RAPPEL_ECHEANCE', 1, 70, 'bi-alarm', 'warning'),
('EMPRUNT_RETARD', 'Relance pour retard', 'Relance en cas de retard', 'emprunt', 'EMPRUNT_RELANCE_RETARD', 1, 80, 'bi-exclamation-triangle', 'danger'),

-- Cotisations
('COTISATION_CREATED', 'Création de cotisation', 'Envoyé lors du paiement d''une cotisation', 'cotisation', 'COTISATION_CONFIRMATION', 1, 90, 'bi-credit-card', 'success'),
('COTISATION_EXPIRATION', 'Rappel expiration', 'Rappel avant expiration de cotisation', 'cotisation', 'COTISATION_RAPPEL', 1, 100, 'bi-calendar-x', 'warning'),
('COTISATION_EXPIRED', 'Cotisation expirée', 'Notification de cotisation expirée', 'cotisation', NULL, 0, 110, 'bi-x-circle', 'danger');

-- ============================================================
-- 7. Vérifications finales
-- ============================================================

-- Compter les templates
SELECT 'Templates créés' AS Info, COUNT(*) AS Total FROM templates_messages;

-- Compter les event triggers
SELECT 'Event triggers créés' AS Info, COUNT(*) AS Total FROM event_triggers;

-- Afficher les event triggers par catégorie
SELECT
    categorie,
    COUNT(*) AS total,
    SUM(email_actif) AS emails_actifs
FROM event_triggers
GROUP BY categorie;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
