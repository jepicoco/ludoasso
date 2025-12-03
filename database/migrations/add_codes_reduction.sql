-- ============================================
-- Migration: Ajout du système de codes de réduction
-- ============================================

-- Création de la table codes_reduction
CREATE TABLE IF NOT EXISTS codes_reduction (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Code de réduction (ex: NOEL2025)',
  libelle VARCHAR(255) NOT NULL COMMENT 'Libellé du code',
  description TEXT COMMENT 'Description détaillée',
  type_reduction ENUM('pourcentage', 'fixe', 'fixe_avec_avoir') NOT NULL DEFAULT 'pourcentage' COMMENT 'Type de réduction',
  valeur DECIMAL(10, 2) NOT NULL COMMENT 'Valeur de la réduction (% ou €)',
  actif BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Code actif ou non',
  date_debut_validite DATE COMMENT 'Date de début de validité',
  date_fin_validite DATE COMMENT 'Date de fin de validité',
  usage_limite INT COMMENT 'Nombre maximal d\'utilisations (NULL = illimité)',
  usage_count INT NOT NULL DEFAULT 0 COMMENT 'Nombre d\'utilisations actuelles',
  ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d\'affichage',
  icone VARCHAR(50) DEFAULT 'bi-percent' COMMENT 'Icône Bootstrap',
  couleur VARCHAR(50) DEFAULT 'success' COMMENT 'Couleur Bootstrap',
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de création',
  INDEX idx_code (code),
  INDEX idx_actif (actif),
  INDEX idx_ordre (ordre_affichage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Codes de réduction applicables aux cotisations';

-- Modification de la table cotisations
-- Ajout des colonnes pour la gestion des codes de réduction
ALTER TABLE cotisations
ADD COLUMN IF NOT EXISTS code_reduction_id INT COMMENT 'ID du code de réduction appliqué',
ADD COLUMN IF NOT EXISTS code_reduction_applique VARCHAR(50) COMMENT 'Code de réduction appliqué (copie pour historique)',
ADD COLUMN IF NOT EXISTS avoir_genere DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Montant d\'avoir généré si réduction > montant (fixe_avec_avoir)';

-- Ajout de la clé étrangère
ALTER TABLE cotisations
ADD CONSTRAINT fk_cotisations_code_reduction
FOREIGN KEY (code_reduction_id) REFERENCES codes_reduction(id)
ON DELETE SET NULL;

-- Index pour optimiser les recherches
ALTER TABLE cotisations
ADD INDEX idx_code_reduction (code_reduction_id);

-- Note: Si vous avez déjà ces colonnes, cette migration peut générer des erreurs.
-- Dans ce cas, exécutez uniquement les parties manquantes.
