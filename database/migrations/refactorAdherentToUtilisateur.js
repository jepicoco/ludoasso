/**
 * Migration: Refactoring adherent -> utilisateur
 *
 * Changes:
 * - Rename table adherents -> utilisateurs
 * - Rename table adherents_archives -> utilisateurs_archives
 * - Rename all adherent_id columns to utilisateur_id
 * - Change barcode prefix from ADH to USA
 * - Convert adhesion_association boolean to date_fin_adhesion_association DATE
 *
 * Date logic for date_fin_adhesion_association:
 * - Academic year runs September -> August
 * - Default is 31/08 of the year the current academic period ends
 * - If current month >= September: end year = current year + 1
 * - If current month < September: end year = current year
 */

require('dotenv').config();
const { sequelize } = require('../../backend/models');

async function tableExists(tableName) {
  const [results] = await sequelize.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = '${tableName}'
  `);
  return results.length > 0;
}

async function columnExists(tableName, columnName) {
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = '${tableName}'
    AND COLUMN_NAME = '${columnName}'
  `);
  return results.length > 0;
}

async function foreignKeyExists(tableName, constraintName) {
  const [results] = await sequelize.query(`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = '${tableName}'
    AND CONSTRAINT_NAME = '${constraintName}'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  `);
  return results.length > 0;
}

async function indexExists(tableName, indexName) {
  const [results] = await sequelize.query(`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = '${tableName}'
    AND INDEX_NAME = '${indexName}'
  `);
  return results.length > 0;
}

/**
 * Calculate the default date_fin_adhesion_association
 * Based on academic year (Sept -> Aug)
 */
function calculateDefaultEndDate() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // If month >= 9 (September), end year is next year
  // If month < 9, end year is current year
  const endYear = currentMonth >= 9 ? currentYear + 1 : currentYear;

  return `${endYear}-08-31`;
}

async function migrate() {
  console.log('='.repeat(60));
  console.log('Migration: Refactoring adherent -> utilisateur');
  console.log('='.repeat(60));
  console.log('');

  const defaultEndDate = calculateDefaultEndDate();
  console.log(`Default date_fin_adhesion_association: ${defaultEndDate}`);
  console.log('');

  // =====================================================
  // STEP 1: Drop ALL foreign keys that reference adherent_id
  // =====================================================
  console.log('STEP 1: Dropping foreign keys on adherent_id columns...');

  // Find all foreign keys dynamically
  const tablesToCheck = [
    'emprunts',
    'cotisations',
    'prolongations',
    'reservations',
    'commentaires_articles',
    'notes_internes',
    'historique_modifications',
    'email_logs',
    'sms_logs'
  ];

  for (const tableName of tablesToCheck) {
    if (!(await tableExists(tableName))) continue;

    // Find all FK constraints on this table that reference adherent_id
    const [fkResults] = await sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '${tableName}'
      AND COLUMN_NAME = 'adherent_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const fk of fkResults) {
      try {
        await sequelize.query(`ALTER TABLE ${tableName} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        console.log(`  - Dropped FK ${fk.CONSTRAINT_NAME} on ${tableName}`);
      } catch (err) {
        console.log(`  - FK ${fk.CONSTRAINT_NAME} on ${tableName}: ${err.message}`);
      }
    }

    // Also check for traite_par column (prolongations)
    if (tableName === 'prolongations') {
      const [fkTraitePar] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'prolongations'
        AND COLUMN_NAME = 'traite_par'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      for (const fk of fkTraitePar) {
        try {
          await sequelize.query(`ALTER TABLE prolongations DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
          console.log(`  - Dropped FK ${fk.CONSTRAINT_NAME} on prolongations (traite_par)`);
        } catch (err) {
          console.log(`  - FK ${fk.CONSTRAINT_NAME} on prolongations (traite_par): ${err.message}`);
        }
      }
    }
  }

  // =====================================================
  // STEP 2: Rename main table adherents -> utilisateurs
  // =====================================================
  console.log('\nSTEP 2: Renaming main tables...');

  if (await tableExists('adherents') && !(await tableExists('utilisateurs'))) {
    await sequelize.query('RENAME TABLE adherents TO utilisateurs');
    console.log('  + Renamed adherents -> utilisateurs');
  } else if (await tableExists('utilisateurs')) {
    console.log('  - Table utilisateurs already exists, skipping');
  }

  if (await tableExists('adherents_archives') && !(await tableExists('utilisateurs_archives'))) {
    await sequelize.query('RENAME TABLE adherents_archives TO utilisateurs_archives');
    console.log('  + Renamed adherents_archives -> utilisateurs_archives');
  } else if (await tableExists('utilisateurs_archives')) {
    console.log('  - Table utilisateurs_archives already exists, skipping');
  }

  // =====================================================
  // STEP 3: Add date_fin_adhesion_association column
  // =====================================================
  console.log('\nSTEP 3: Converting adhesion_association to date_fin_adhesion_association...');

  if (await tableExists('utilisateurs')) {
    // Add the new date column if it doesn't exist
    if (!(await columnExists('utilisateurs', 'date_fin_adhesion_association'))) {
      await sequelize.query(`
        ALTER TABLE utilisateurs
        ADD COLUMN date_fin_adhesion_association DATE DEFAULT NULL
        COMMENT 'Date de fin d\\'adhesion a l\\'association (31/08 de l\\'annee academique)'
        AFTER adhesion_association
      `);
      console.log('  + Added date_fin_adhesion_association column');

      // Migrate existing data: if adhesion_association = 1, set the default end date
      if (await columnExists('utilisateurs', 'adhesion_association')) {
        await sequelize.query(`
          UPDATE utilisateurs
          SET date_fin_adhesion_association = '${defaultEndDate}'
          WHERE adhesion_association = 1
        `);
        console.log(`  + Set date_fin_adhesion_association = ${defaultEndDate} for existing members`);
      }
    } else {
      console.log('  - date_fin_adhesion_association already exists');
    }

    // Drop the old boolean column (keep for now, can be removed later)
    // console.log('  - Keeping adhesion_association for backward compatibility');
  }

  // Same for archives table
  if (await tableExists('utilisateurs_archives')) {
    if (!(await columnExists('utilisateurs_archives', 'date_fin_adhesion_association'))) {
      await sequelize.query(`
        ALTER TABLE utilisateurs_archives
        ADD COLUMN date_fin_adhesion_association DATE DEFAULT NULL
        COMMENT 'Date de fin d\\'adhesion a l\\'association'
        AFTER adhesion_association
      `);
      console.log('  + Added date_fin_adhesion_association to utilisateurs_archives');

      if (await columnExists('utilisateurs_archives', 'adhesion_association')) {
        await sequelize.query(`
          UPDATE utilisateurs_archives
          SET date_fin_adhesion_association = '${defaultEndDate}'
          WHERE adhesion_association = 1
        `);
        console.log('  + Migrated archived data');
      }
    }
  }

  // =====================================================
  // STEP 4: Rename adherent_id columns to utilisateur_id
  // =====================================================
  console.log('\nSTEP 4: Renaming adherent_id columns...');

  const tablesToRenameColumn = [
    'emprunts',
    'cotisations',
    'prolongations',
    'reservations',
    'commentaires_articles',
    'notes_internes',
    'historique_modifications',
    'email_logs',
    'sms_logs'
  ];

  for (const table of tablesToRenameColumn) {
    if (await tableExists(table) && await columnExists(table, 'adherent_id')) {
      if (!(await columnExists(table, 'utilisateur_id'))) {
        await sequelize.query(`
          ALTER TABLE ${table}
          CHANGE COLUMN adherent_id utilisateur_id INT UNSIGNED NOT NULL
        `);
        console.log(`  + Renamed adherent_id -> utilisateur_id in ${table}`);
      } else {
        console.log(`  - utilisateur_id already exists in ${table}`);
      }
    }
  }

  // =====================================================
  // STEP 5: Update barcode prefix ADH -> USA
  // =====================================================
  console.log('\nSTEP 5: Updating barcode prefix ADH -> USA...');

  if (await tableExists('utilisateurs') && await columnExists('utilisateurs', 'code_barre')) {
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM utilisateurs WHERE code_barre LIKE 'ADH%'
    `);
    const count = countResult[0].count;

    if (count > 0) {
      await sequelize.query(`
        UPDATE utilisateurs
        SET code_barre = CONCAT('USA', SUBSTRING(code_barre, 4))
        WHERE code_barre LIKE 'ADH%'
      `);
      console.log(`  + Updated ${count} barcodes from ADH to USA prefix`);
    } else {
      console.log('  - No ADH barcodes found to update');
    }
  }

  // Same for archives
  if (await tableExists('utilisateurs_archives') && await columnExists('utilisateurs_archives', 'code_barre')) {
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM utilisateurs_archives WHERE code_barre LIKE 'ADH%'
    `);
    const count = countResult[0].count;

    if (count > 0) {
      await sequelize.query(`
        UPDATE utilisateurs_archives
        SET code_barre = CONCAT('USA', SUBSTRING(code_barre, 4))
        WHERE code_barre LIKE 'ADH%'
      `);
      console.log(`  + Updated ${count} archived barcodes`);
    }
  }

  // =====================================================
  // STEP 6: Recreate foreign keys with new column names
  // =====================================================
  console.log('\nSTEP 6: Recreating foreign keys...');

  const newForeignKeys = [
    { table: 'emprunts', fk: 'emprunts_utilisateur_fk', column: 'utilisateur_id' },
    { table: 'cotisations', fk: 'cotisations_utilisateur_fk', column: 'utilisateur_id' },
    { table: 'prolongations', fk: 'prolongations_utilisateur_fk', column: 'utilisateur_id' },
    { table: 'reservations', fk: 'reservations_utilisateur_fk', column: 'utilisateur_id' },
    { table: 'commentaires_articles', fk: 'commentaires_utilisateur_fk', column: 'utilisateur_id' },
    { table: 'notes_internes', fk: 'notes_utilisateur_fk', column: 'utilisateur_id' },
    { table: 'historique_modifications', fk: 'historique_utilisateur_fk', column: 'utilisateur_id' },
    { table: 'email_logs', fk: 'email_logs_utilisateur_fk', column: 'utilisateur_id' },
    { table: 'sms_logs', fk: 'sms_logs_utilisateur_fk', column: 'utilisateur_id' },
  ];

  for (const item of newForeignKeys) {
    if (await tableExists(item.table) && await columnExists(item.table, item.column)) {
      if (!(await foreignKeyExists(item.table, item.fk))) {
        try {
          await sequelize.query(`
            ALTER TABLE ${item.table}
            ADD CONSTRAINT ${item.fk}
            FOREIGN KEY (${item.column}) REFERENCES utilisateurs(id)
            ON DELETE CASCADE ON UPDATE CASCADE
          `);
          console.log(`  + Created FK ${item.fk} on ${item.table}`);
        } catch (err) {
          console.log(`  - FK ${item.fk}: ${err.message}`);
        }
      } else {
        console.log(`  - FK ${item.fk} already exists`);
      }
    }
  }

  // =====================================================
  // STEP 7: Update event_triggers table
  // =====================================================
  console.log('\nSTEP 7: Updating event triggers...');

  if (await tableExists('event_triggers') && await columnExists('event_triggers', 'code')) {
    const eventMapping = [
      { old: 'ADHERENT_CREATION', new: 'UTILISATEUR_CREATION' },
      { old: 'ADHERENT_CREATED', new: 'UTILISATEUR_CREATED' },
      { old: 'ADHERENT_MODIFICATION', new: 'UTILISATEUR_MODIFICATION' },
      { old: 'ADHERENT_UPDATED', new: 'UTILISATEUR_UPDATED' },
      { old: 'ADHERENT_BIENVENUE', new: 'UTILISATEUR_BIENVENUE' },
      { old: 'ADHERENT_RAPPEL_COTISATION', new: 'UTILISATEUR_RAPPEL_COTISATION' },
      { old: 'ADHERENT_SUSPENDED', new: 'UTILISATEUR_SUSPENDED' },
    ];

    for (const ev of eventMapping) {
      const [result] = await sequelize.query(`
        UPDATE event_triggers SET code = '${ev.new}' WHERE code = '${ev.old}'
      `);
      if (result.affectedRows > 0) {
        console.log(`  + Renamed event ${ev.old} -> ${ev.new}`);
      }
    }

    // Note: categorie ENUM contains 'adherent' - we keep it for now as it's just a label
    // Changing ENUM values requires ALTER TABLE which is complex
    // The 'adherent' category can still be used to group user-related events
  }

  // =====================================================
  // STEP 8: Update templates_messages placeholders
  // =====================================================
  console.log('\nSTEP 8: Updating message templates placeholders...');

  if (await tableExists('templates_messages')) {
    // Update placeholders from {{adherent.*}} to {{utilisateur.*}}
    // Columns are: email_objet, email_corps, sms_corps
    if (await columnExists('templates_messages', 'email_corps')) {
      await sequelize.query(`
        UPDATE templates_messages
        SET email_objet = REPLACE(email_objet, '{{adherent.', '{{utilisateur.'),
            email_corps = REPLACE(email_corps, '{{adherent.', '{{utilisateur.'),
            sms_corps = REPLACE(sms_corps, '{{adherent.', '{{utilisateur.')
        WHERE email_objet LIKE '%{{adherent.%'
           OR email_corps LIKE '%{{adherent.%'
           OR sms_corps LIKE '%{{adherent.%'
      `);
      console.log('  + Updated template placeholders');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migration completed successfully!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Update backend models (Adherent.js -> Utilisateur.js)');
  console.log('2. Update controllers and routes');
  console.log('3. Update frontend files');
  console.log('4. Test thoroughly');
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
