const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCodesReduction() {
  let connection;

  try {
    console.log('🔄 Connexion à la base de données...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connecté à la base de données');

    // Vérifier si la table codes_reduction existe déjà
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'codes_reduction'"
    );

    if (tables.length > 0) {
      console.log('ℹ️  La table codes_reduction existe déjà');
    } else {
      console.log('📝 Création de la table codes_reduction...');

      await connection.query(`
        CREATE TABLE codes_reduction (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Code de réduction (ex: NOEL2025)',
          libelle VARCHAR(255) NOT NULL COMMENT 'Libellé du code',
          description TEXT COMMENT 'Description détaillée',
          type_reduction ENUM('pourcentage', 'fixe', 'fixe_avec_avoir') NOT NULL DEFAULT 'pourcentage' COMMENT 'Type de réduction',
          valeur DECIMAL(10, 2) NOT NULL COMMENT 'Valeur de la réduction (% ou €)',
          actif BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Code actif ou non',
          date_debut_validite DATE COMMENT 'Date de début de validité',
          date_fin_validite DATE COMMENT 'Date de fin de validité',
          usage_limite INT COMMENT 'Nombre maximal d\\'utilisations (NULL = illimité)',
          usage_count INT NOT NULL DEFAULT 0 COMMENT 'Nombre d\\'utilisations actuelles',
          ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d\\'affichage',
          icone VARCHAR(50) DEFAULT 'bi-percent' COMMENT 'Icône Bootstrap',
          couleur VARCHAR(50) DEFAULT 'success' COMMENT 'Couleur Bootstrap',
          date_creation DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de création',
          INDEX idx_code (code),
          INDEX idx_actif (actif),
          INDEX idx_ordre (ordre_affichage)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Codes de réduction applicables aux cotisations'
      `);

      console.log('✅ Table codes_reduction créée avec succès');
    }

    // Vérifier si les colonnes existent dans cotisations
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM cotisations LIKE 'code_reduction_id'"
    );

    if (columns.length > 0) {
      console.log('ℹ️  Les colonnes de codes de réduction existent déjà dans cotisations');
    } else {
      console.log('📝 Ajout des colonnes de codes de réduction à cotisations...');

      await connection.query(`
        ALTER TABLE cotisations
        ADD COLUMN code_reduction_id INT COMMENT 'ID du code de réduction appliqué',
        ADD COLUMN code_reduction_applique VARCHAR(50) COMMENT 'Code de réduction appliqué (copie pour historique)',
        ADD COLUMN avoir_genere DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Montant d\\'avoir généré si réduction > montant (fixe_avec_avoir)'
      `);

      console.log('✅ Colonnes ajoutées à cotisations');

      // Ajouter la clé étrangère
      console.log('📝 Ajout de la clé étrangère...');

      try {
        await connection.query(`
          ALTER TABLE cotisations
          ADD CONSTRAINT fk_cotisations_code_reduction
          FOREIGN KEY (code_reduction_id) REFERENCES codes_reduction(id)
          ON DELETE SET NULL
        `);
        console.log('✅ Clé étrangère ajoutée');
      } catch (fkError) {
        if (fkError.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️  La clé étrangère existe déjà');
        } else {
          throw fkError;
        }
      }

      // Ajouter l'index
      console.log('📝 Ajout de l\'index...');

      try {
        await connection.query(`
          ALTER TABLE cotisations
          ADD INDEX idx_code_reduction (code_reduction_id)
        `);
        console.log('✅ Index ajouté');
      } catch (idxError) {
        if (idxError.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️  L\'index existe déjà');
        } else {
          throw idxError;
        }
      }
    }

    console.log('');
    console.log('✅ Migration terminée avec succès !');
    console.log('');
    console.log('Prochaines étapes :');
    console.log('1. Redémarrer le serveur : npm run dev');
    console.log('2. Vous pouvez maintenant créer des codes de réduction dans Paramètres > Listes > Codes de réduction');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter la migration
addCodesReduction();
