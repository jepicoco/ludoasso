const { CodeReduction } = require('../../backend/models');
require('dotenv').config();

async function seedCodesReduction() {
  try {
    console.log('🔄 Seed des codes de réduction...');

    // Vérifier si des codes existent déjà
    const count = await CodeReduction.count();

    if (count > 0) {
      console.log(`ℹ️  ${count} code(s) de réduction existe(nt) déjà`);
      const reponse = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        readline.question('Voulez-vous réinitialiser les données ? (oui/non) : ', (answer) => {
          readline.close();
          resolve(answer.toLowerCase() === 'oui');
        });
      });

      if (!reponse) {
        console.log('❌ Seed annulé');
        process.exit(0);
      }

      // Supprimer les codes existants
      await CodeReduction.destroy({ where: {} });
      console.log('🗑️  Codes existants supprimés');
    }

    // Codes de réduction d'exemple
    const codesReduction = [
      {
        code: 'BIENVENUE10',
        libelle: 'Bienvenue 10%',
        description: 'Remise de 10% pour les nouveaux adhérents',
        type_reduction: 'pourcentage',
        valeur: 10,
        actif: true,
        icone: 'bi-gift',
        couleur: 'primary',
        ordre_affichage: 1
      },
      {
        code: 'FAMILLE20',
        libelle: 'Réduction famille',
        description: 'Réduction de 20% pour les familles nombreuses',
        type_reduction: 'pourcentage',
        valeur: 20,
        actif: true,
        icone: 'bi-people',
        couleur: 'success',
        ordre_affichage: 2
      },
      {
        code: 'FIXE5',
        libelle: 'Réduction fixe 5€',
        description: 'Remise fixe de 5 euros',
        type_reduction: 'fixe',
        valeur: 5,
        actif: true,
        icone: 'bi-cash-coin',
        couleur: 'info',
        ordre_affichage: 3
      },
      {
        code: 'ETUDIANT15',
        libelle: 'Tarif étudiant',
        description: 'Réduction de 15€ avec avoir si nécessaire',
        type_reduction: 'fixe_avec_avoir',
        valeur: 15,
        actif: true,
        date_debut_validite: new Date('2025-09-01'),
        date_fin_validite: new Date('2026-06-30'),
        icone: 'bi-book',
        couleur: 'warning',
        ordre_affichage: 4
      },
      {
        code: 'NOEL2025',
        libelle: 'Offre Noël 2025',
        description: 'Promotion de fin d\'année - 25% de réduction',
        type_reduction: 'pourcentage',
        valeur: 25,
        actif: false,
        date_debut_validite: new Date('2025-12-01'),
        date_fin_validite: new Date('2025-12-31'),
        usage_limite: 50,
        icone: 'bi-snow',
        couleur: 'danger',
        ordre_affichage: 5
      }
    ];

    // Créer les codes
    for (const codeData of codesReduction) {
      const code = await CodeReduction.create(codeData);
      console.log(`✅ Code créé: ${code.code} (${code.libelle})`);
    }

    console.log('');
    console.log('✅ Seed terminé avec succès !');
    console.log(`📊 ${codesReduction.length} codes de réduction créés`);
    console.log('');
    console.log('Codes disponibles :');
    codesReduction.forEach(c => {
      console.log(`  - ${c.code}: ${c.libelle} (${c.type_reduction} - ${c.valeur}${c.type_reduction === 'pourcentage' ? '%' : '€'})`);
    });

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Exécuter le seed
seedCodesReduction();
