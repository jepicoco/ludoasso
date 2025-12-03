const { ModePaiement } = require('../../backend/models');

/**
 * Seed les modes de paiement par défaut
 */
async function seedModesPaiement() {
  try {
    console.log('Seeding modes de paiement...');

    // Vérifier si des modes existent déjà
    const count = await ModePaiement.count();

    if (count > 0) {
      console.log(`  ⚠ ${count} mode(s) de paiement déjà présent(s), ignorer le seed`);
      return;
    }

    const modesPaiement = [
      {
        libelle: 'Espèces',
        actif: true,
        ordre_affichage: 1,
        journal_comptable: 'CA',
        type_operation: 'debit',
        libelle_export_comptable: 'Règlement espèces',
        code_comptable: '530',
        icone: 'bi-cash',
        couleur: 'success'
      },
      {
        libelle: 'Chèque',
        actif: true,
        ordre_affichage: 2,
        journal_comptable: 'BQ',
        type_operation: 'debit',
        libelle_export_comptable: 'Règlement chèque',
        code_comptable: '512',
        icone: 'bi-journal-check',
        couleur: 'primary'
      },
      {
        libelle: 'Carte bancaire',
        actif: true,
        ordre_affichage: 3,
        journal_comptable: 'BQ',
        type_operation: 'debit',
        libelle_export_comptable: 'Règlement CB',
        code_comptable: '512',
        icone: 'bi-credit-card',
        couleur: 'info'
      },
      {
        libelle: 'Virement',
        actif: true,
        ordre_affichage: 4,
        journal_comptable: 'BQ',
        type_operation: 'debit',
        libelle_export_comptable: 'Règlement virement',
        code_comptable: '512',
        icone: 'bi-bank',
        couleur: 'secondary'
      },
      {
        libelle: 'Prélèvement',
        actif: false,
        ordre_affichage: 5,
        journal_comptable: 'BQ',
        type_operation: 'debit',
        libelle_export_comptable: 'Prélèvement bancaire',
        code_comptable: '512',
        icone: 'bi-arrow-repeat',
        couleur: 'warning'
      },
      {
        libelle: 'Avoir',
        actif: true,
        ordre_affichage: 6,
        journal_comptable: 'OD',
        type_operation: 'credit',
        libelle_export_comptable: 'Avoir',
        code_comptable: '419',
        icone: 'bi-ticket-perforated',
        couleur: 'danger'
      }
    ];

    await ModePaiement.bulkCreate(modesPaiement);

    console.log(`  ✓ ${modesPaiement.length} modes de paiement créés avec succès`);
  } catch (error) {
    console.error('  ✗ Erreur lors du seed des modes de paiement:', error.message);
    throw error;
  }
}

module.exports = seedModesPaiement;

// Si exécuté directement
if (require.main === module) {
  const { sequelize } = require('../../backend/models');

  seedModesPaiement()
    .then(() => {
      console.log('✓ Seed terminé avec succès');
      return sequelize.close();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Erreur lors du seed:', error);
      process.exit(1);
    });
}
