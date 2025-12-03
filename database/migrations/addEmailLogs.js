require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
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

    // Créer la table email_logs
    console.log('📝 Création de la table email_logs...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        template_code VARCHAR(50) NULL COMMENT 'Code du template utilise',
        destinataire VARCHAR(255) NOT NULL COMMENT 'Email du destinataire',
        destinataire_nom VARCHAR(255) NULL COMMENT 'Nom du destinataire',
        objet VARCHAR(500) NOT NULL COMMENT 'Objet du email',
        corps TEXT NOT NULL COMMENT 'Corps du email HTML',
        statut ENUM('envoye', 'erreur', 'en_attente') DEFAULT 'en_attente' COMMENT 'Statut envoi',
        date_envoi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date envoi',
        message_id VARCHAR(255) NULL COMMENT 'ID du message SMTP',
        erreur_message TEXT NULL COMMENT 'Message erreur',
        adherent_id INT NULL COMMENT 'ID adherent',
        emprunt_id INT NULL COMMENT 'ID emprunt',
        cotisation_id INT NULL COMMENT 'ID cotisation',
        metadata JSON NULL COMMENT 'Donnees supplementaires',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_template_code (template_code),
        INDEX idx_destinataire (destinataire),
        INDEX idx_statut (statut),
        INDEX idx_date_envoi (date_envoi),
        INDEX idx_adherent_id (adherent_id),

        FOREIGN KEY (adherent_id) REFERENCES adherents(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historique emails'
    `);

    console.log('✅ Table email_logs créée avec succès');

    console.log('✅ Migration terminée avec succès');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = migrate;
