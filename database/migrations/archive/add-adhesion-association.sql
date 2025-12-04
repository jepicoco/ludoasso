-- Migration: Ajouter la colonne adhesion_association à la table adherents
-- Date: 2025-11-30
-- Description: Ajoute un champ booléen pour indiquer si l'adhérent est membre de l'association (pour réduction cotisation)

ALTER TABLE `adherents`
ADD COLUMN `adhesion_association` TINYINT(1) NOT NULL DEFAULT 0
COMMENT 'Adhérent est-il membre de l\'association (pour réduction cotisation)'
AFTER `notes`;
