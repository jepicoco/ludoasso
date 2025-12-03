-- Migration: Ajout du champ role à la table adherents
-- Date: 2025-12-01

-- Ajouter la colonne role avec les valeurs ENUM
ALTER TABLE adherents
ADD COLUMN role ENUM('usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur')
NOT NULL DEFAULT 'usager'
COMMENT 'Rôle de l\'utilisateur dans le système'
AFTER adhesion_association;

-- Afficher le résultat
SELECT 'Colonne role ajoutée avec succès' AS message;

-- Optionnel: Mettre à jour un utilisateur pour en faire administrateur
-- UPDATE adherents SET role = 'administrateur' WHERE email = 'votre@email.com';
