/**
 * Migration: Ajouter les modules manquants dans modules_actifs
 * (reservations, recherche_ia, plans, frequentation)
 */

async function up(connection) {
  console.log('=== Migration: Add Missing Modules ===\n');

  const modulesToAdd = [
    {
      code: 'reservations',
      libelle: 'Reservations',
      description: 'Systeme de reservations pour les articles. Permet aux usagers de reserver des articles indisponibles.',
      icone: 'bookmark-check',
      couleur: '#e8daef',
      actif: false,
      ordre_affichage: 8
    },
    {
      code: 'recherche_ia',
      libelle: 'Recherche IA',
      description: 'Recherche en langage naturel et enrichissement automatique des fiches via IA.',
      icone: 'robot',
      couleur: '#e0cffc',
      actif: false,
      ordre_affichage: 9
    },
    {
      code: 'plans',
      libelle: 'Editeur de Plans',
      description: 'Editeur de plans interactifs pour visualiser les emplacements des collections.',
      icone: 'map',
      couleur: '#c3f0ca',
      actif: false,
      ordre_affichage: 10
    },
    {
      code: 'frequentation',
      libelle: 'Frequentation',
      description: 'Comptage des visiteurs. Deployer des tablettes pour enregistrer adultes/enfants et communes.',
      icone: 'people-fill',
      couleur: '#17a2b8',
      actif: false,
      ordre_affichage: 11
    }
  ];

  for (const module of modulesToAdd) {
    // Verifier si le module existe deja
    const [existing] = await connection.query(
      `SELECT id FROM modules_actifs WHERE code = ?`,
      [module.code]
    );

    if (existing.length > 0) {
      console.log(`  - ${module.libelle} (${module.code}) - existe deja`);
    } else {
      await connection.query(`
        INSERT INTO modules_actifs (code, libelle, description, icone, couleur, actif, ordre_affichage, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [module.code, module.libelle, module.description, module.icone, module.couleur, module.actif, module.ordre_affichage]);
      console.log(`  + ${module.libelle} (${module.code}) - ajoute`);
    }
  }

  console.log('\n=== Migration terminee ===');
}

async function down(connection) {
  console.log('=== Rollback: Remove Added Modules ===\n');

  const modulesToRemove = ['reservations', 'recherche_ia', 'plans', 'frequentation'];

  for (const code of modulesToRemove) {
    await connection.query(`DELETE FROM modules_actifs WHERE code = ?`, [code]);
    console.log(`  - ${code} removed`);
  }

  console.log('\n=== Rollback termine ===');
}

module.exports = { up, down };
