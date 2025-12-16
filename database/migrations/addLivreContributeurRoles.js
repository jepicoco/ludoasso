/**
 * Migration: Ajouter les rôles aux contributeurs de livres
 *
 * Modifications:
 * - Ajoute une colonne 'role' à livre_auteurs
 * - Modifie la clé primaire pour permettre plusieurs rôles par personne
 * - Crée la table livre_illustrateurs si elle n'existe pas
 *
 * Rôles possibles pour les livres:
 * - auteur: Auteur principal du texte
 * - scenariste: Scénariste (BD, manga)
 * - dessinateur: Dessinateur (BD, manga, livres illustrés)
 * - coloriste: Coloriste (BD)
 * - illustrateur: Illustrateur (couverture, intérieur)
 * - traducteur: Traducteur
 * - adaptateur: Adaptateur
 * - prefacier: Auteur de la préface
 * - directeur_collection: Directeur de collection
 */

async function up(connection) {
  console.log('Migration: Ajout des rôles aux contributeurs de livres...');

  // 1. Vérifier si la colonne 'role' existe déjà
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'livre_auteurs'
    AND COLUMN_NAME = 'role'
  `);

  if (columns.length === 0) {
    // Ajouter la colonne role
    console.log('Ajout de la colonne role à livre_auteurs...');
    await connection.query(`
      ALTER TABLE livre_auteurs
      ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'auteur'
      COMMENT 'Rôle: auteur, scenariste, dessinateur, coloriste, illustrateur, traducteur, adaptateur, prefacier'
    `);

    // Modifier la clé primaire pour inclure le rôle
    // D'abord supprimer l'ancienne clé primaire
    console.log('Modification de la clé primaire...');
    try {
      await connection.query(`
        ALTER TABLE livre_auteurs DROP PRIMARY KEY
      `);
    } catch (e) {
      console.log('Pas de clé primaire existante ou déjà modifiée');
    }

    // Recréer avec role inclus
    await connection.query(`
      ALTER TABLE livre_auteurs
      ADD PRIMARY KEY (livre_id, auteur_id, role)
    `);

    // Mettre à jour les entrées existantes qui étaient dans livre_illustrateurs
    // vers livre_auteurs avec role='illustrateur'
    console.log('Migration des illustrateurs existants...');
    try {
      const [illustrateurs] = await connection.query(`
        SELECT livre_id, illustrateur_id FROM livre_illustrateurs
      `);

      for (const row of illustrateurs) {
        // Vérifier que l'illustrateur existe dans auteurs
        const [auteur] = await connection.query(`
          SELECT a.id FROM auteurs a
          INNER JOIN illustrateurs i ON i.nom = a.nom
          WHERE i.id = ?
        `, [row.illustrateur_id]);

        if (auteur.length > 0) {
          await connection.query(`
            INSERT IGNORE INTO livre_auteurs (livre_id, auteur_id, role)
            VALUES (?, ?, 'illustrateur')
          `, [row.livre_id, auteur[0].id]);
        }
      }
    } catch (e) {
      console.log('Table livre_illustrateurs non trouvée ou vide, skip...');
    }
  } else {
    console.log('La colonne role existe déjà dans livre_auteurs');
  }

  // 2. Créer la table de référence des rôles de contributeurs (optionnel mais utile)
  const [rolesTable] = await connection.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'roles_contributeur_livre'
  `);

  if (rolesTable.length === 0) {
    console.log('Création de la table roles_contributeur_livre...');
    await connection.query(`
      CREATE TABLE roles_contributeur_livre (
        code VARCHAR(50) PRIMARY KEY,
        libelle VARCHAR(100) NOT NULL,
        ordre INT DEFAULT 0,
        actif BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insérer les rôles par défaut
    await connection.query(`
      INSERT INTO roles_contributeur_livre (code, libelle, ordre) VALUES
      ('auteur', 'Auteur', 1),
      ('scenariste', 'Scénariste', 2),
      ('dessinateur', 'Dessinateur', 3),
      ('coloriste', 'Coloriste', 4),
      ('illustrateur', 'Illustrateur', 5),
      ('traducteur', 'Traducteur', 6),
      ('adaptateur', 'Adaptateur', 7),
      ('prefacier', 'Préfacier', 8),
      ('directeur_collection', 'Directeur de collection', 9)
    `);
  }

  console.log('Migration terminée avec succès!');
}

async function down(connection) {
  console.log('Rollback: Suppression des rôles contributeurs livres...');

  // Supprimer la table de référence des rôles
  await connection.query('DROP TABLE IF EXISTS roles_contributeur_livre');

  // Remettre la clé primaire originale (sans role)
  try {
    await connection.query('ALTER TABLE livre_auteurs DROP PRIMARY KEY');
    await connection.query('ALTER TABLE livre_auteurs DROP COLUMN role');
    await connection.query('ALTER TABLE livre_auteurs ADD PRIMARY KEY (livre_id, auteur_id)');
  } catch (e) {
    console.log('Erreur lors du rollback:', e.message);
  }

  console.log('Rollback terminé');
}

module.exports = { up, down };
