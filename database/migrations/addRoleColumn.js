const { sequelize } = require('../../backend/models');

/**
 * Ajouter la colonne role à la table adherents
 */
async function addRoleColumn() {
  try {
    console.log('Migration: Ajout du champ role à la table adherents...');

    // Vérifier si la colonne existe déjà
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'adherents'
      AND COLUMN_NAME = 'role'
    `);

    if (results.length > 0) {
      console.log('  ⚠ La colonne role existe déjà');
      return;
    }

    // Ajouter la colonne
    await sequelize.query(`
      ALTER TABLE adherents
      ADD COLUMN role ENUM('usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur')
      NOT NULL DEFAULT 'usager'
      COMMENT 'Rôle de l\'utilisateur dans le système'
      AFTER adhesion_association
    `);

    console.log('  ✓ Colonne role ajoutée avec succès');
    console.log('  ℹ Tous les utilisateurs existants ont le rôle "usager" par défaut');
    console.log('');
    console.log('  Pour créer un administrateur:');
    console.log('  UPDATE adherents SET role = \'administrateur\' WHERE email = \'votre@email.com\';');

  } catch (error) {
    console.error('  ✗ Erreur lors de la migration:', error.message);
    throw error;
  }
}

module.exports = addRoleColumn;

// Si exécuté directement
if (require.main === module) {
  addRoleColumn()
    .then(() => {
      console.log('\n✓ Migration terminée avec succès');
      return sequelize.close();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Erreur lors de la migration:', error);
      process.exit(1);
    });
}
