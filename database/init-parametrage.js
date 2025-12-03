/**
 * Script d'initialisation du système de paramétrage
 * Exécute les migrations et seeds nécessaires
 */

const { sequelize } = require('../backend/models');
const addRoleColumn = require('./migrations/addRoleColumn');
const seedModesPaiement = require('./seeds/seedModesPaiement');

async function init() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Initialisation du système de paramétrage             ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Vérifier la connexion
    await sequelize.authenticate();
    console.log('✓ Connexion à la base de données établie\n');

    // Étape 1: Ajouter la colonne role
    console.log('Étape 1/3: Migration de la table adherents');
    await addRoleColumn();
    console.log('');

    // Étape 2: Créer les tables parametres et modes_paiement
    console.log('Étape 2/3: Synchronisation des nouveaux modèles');
    await sequelize.sync({ alter: false });
    console.log('  ✓ Tables parametres_structure et modes_paiement créées\n');

    // Étape 3: Seed des modes de paiement
    console.log('Étape 3/3: Seed des modes de paiement');
    await seedModesPaiement();
    console.log('');

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ✓ Initialisation terminée avec succès                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📝 Prochaines étapes:');
    console.log('  1. Redémarrer le serveur: npm run dev');
    console.log('  2. Créer un administrateur:');
    console.log('     UPDATE adherents SET role = \'administrateur\' WHERE email = \'votre@email.com\';');
    console.log('  3. Se connecter et accéder à la page Paramètres\n');

  } catch (error) {
    console.error('\n✗ Erreur lors de l\'initialisation:', error.message);
    console.error(error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Exécuter
init()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Échec de l\'initialisation');
    process.exit(1);
  });
