/**
 * Migration: Make barcode groups global (not per organisation)
 *
 * Les groupes de codes-barres sont partages entre toutes les organisations
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Make barcode groups global ===');

  // 1. Supprimer l'index unique existant
  try {
    await queryInterface.removeIndex('organisation_barcode_groups', 'idx_org_barcode_groups_unique');
    console.log('Index idx_org_barcode_groups_unique supprime');
  } catch (e) {
    console.log('Index idx_org_barcode_groups_unique n\'existe pas ou deja supprime');
  }

  // 2. Dedupliquer les codes existants (garder le plus ancien)
  const [duplicates] = await sequelize.query(`
    SELECT code, MIN(id) as keep_id
    FROM organisation_barcode_groups
    GROUP BY code
    HAVING COUNT(*) > 1
  `);

  for (const dup of duplicates) {
    await sequelize.query(`
      DELETE FROM organisation_barcode_groups
      WHERE code = ? AND id != ?
    `, { replacements: [dup.code, dup.keep_id] });
    console.log(`Doublon supprime pour code: ${dup.code}`);
  }

  // 3. Rendre organisation_id nullable (car maintenant global)
  await sequelize.query(`
    ALTER TABLE organisation_barcode_groups
    MODIFY COLUMN organisation_id INT NULL
  `);
  console.log('Colonne organisation_id rendue nullable');

  // 4. Mettre organisation_id a NULL pour tous les enregistrements
  await sequelize.query(`
    UPDATE organisation_barcode_groups SET organisation_id = NULL
  `);
  console.log('Organisation_id mis a NULL pour tous les groupes');

  // 5. Ajouter un index unique sur code seul
  await queryInterface.addIndex('organisation_barcode_groups', ['code'], {
    unique: true,
    name: 'idx_barcode_groups_code_unique'
  });
  console.log('Index unique sur code ajoute');

  console.log('Migration terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Rollback: Restore organisation-specific barcode groups ===');

  // 1. Supprimer l'index unique sur code
  try {
    await queryInterface.removeIndex('organisation_barcode_groups', 'idx_barcode_groups_code_unique');
  } catch (e) {
    console.log('Index deja supprime');
  }

  // 2. Remettre organisation_id NOT NULL (avec valeur par defaut 1)
  await sequelize.query(`
    UPDATE organisation_barcode_groups
    SET organisation_id = 1
    WHERE organisation_id IS NULL
  `);

  await sequelize.query(`
    ALTER TABLE organisation_barcode_groups
    MODIFY COLUMN organisation_id INT NOT NULL
  `);

  // 3. Recréer l'index unique
  await queryInterface.addIndex('organisation_barcode_groups', ['organisation_id', 'code'], {
    unique: true,
    name: 'idx_org_barcode_groups_unique'
  });

  console.log('Rollback termine');
}

module.exports = { up, down };
