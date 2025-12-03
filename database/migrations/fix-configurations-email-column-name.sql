-- ============================================================
-- Vérifier et corriger le nom de colonne dans configurations_email
-- ============================================================

-- Afficher la structure actuelle
DESCRIBE configurations_email;

-- Si la colonne s'appelle 'nom' au lieu de 'libelle', la renommer
-- Décommentez cette ligne si nécessaire :
-- ALTER TABLE configurations_email CHANGE COLUMN nom libelle VARCHAR(100) NOT NULL;

-- Si la colonne 'libelle' n'existe pas du tout, l'ajouter
-- ALTER TABLE configurations_email ADD COLUMN libelle VARCHAR(100) NOT NULL UNIQUE AFTER id;
