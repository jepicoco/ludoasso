/**
 * Migration: Seed des rôles de contributeurs pour les livres
 *
 * Remplit la table roles_contributeur_livre avec les rôles par défaut
 * uniquement si la table est vide.
 */

const { sequelize } = require('../../backend/models');

const rolesContributeur = [
  { code: 'auteur', libelle: 'Auteur', ordre: 1 },
  { code: 'co-auteur', libelle: 'Co-auteur', ordre: 2 },
  { code: 'illustrateur', libelle: 'Illustrateur', ordre: 3 },
  { code: 'traducteur', libelle: 'Traducteur', ordre: 4 },
  { code: 'prefacier', libelle: 'Préfacier', ordre: 5 },
  { code: 'postfacier', libelle: 'Postfacier', ordre: 6 },
  { code: 'directeur', libelle: 'Directeur de collection', ordre: 7 },
  { code: 'editeur-scientifique', libelle: 'Éditeur scientifique', ordre: 8 },
  { code: 'adaptateur', libelle: 'Adaptateur', ordre: 9 },
  { code: 'scenariste', libelle: 'Scénariste', ordre: 10 },
  { code: 'dessinateur', libelle: 'Dessinateur', ordre: 11 },
  { code: 'coloriste', libelle: 'Coloriste', ordre: 12 },
  { code: 'lettreur', libelle: 'Lettreur', ordre: 13 },
  { code: 'photographe', libelle: 'Photographe', ordre: 14 },
  { code: 'narrateur', libelle: 'Narrateur', ordre: 15 },
  { code: 'commentateur', libelle: 'Commentateur', ordre: 16 },
  { code: 'annotateur', libelle: 'Annotateur', ordre: 17 },
  { code: 'compilateur', libelle: 'Compilateur', ordre: 18 },
  { code: 'contributeur', libelle: 'Contributeur', ordre: 99 }
];

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Vérifier si la table existe
  const tables = await queryInterface.showAllTables();
  const tableList = tables.map(t => typeof t === 'string' ? t : Object.values(t)[0]);

  if (!tableList.includes('roles_contributeur_livre')) {
    console.log('Table roles_contributeur_livre non trouvée, création ignorée');
    return;
  }

  // Vérifier si la table est vide
  const [results] = await sequelize.query('SELECT COUNT(*) as count FROM roles_contributeur_livre');
  const count = results[0].count;

  if (count > 0) {
    console.log(`Table roles_contributeur_livre contient déjà ${count} enregistrement(s), seed ignoré`);
    return;
  }

  // Insérer les rôles par défaut
  console.log('Insertion des rôles de contributeurs par défaut...');

  for (const role of rolesContributeur) {
    await sequelize.query(
      `INSERT INTO roles_contributeur_livre (code, libelle, ordre, actif) VALUES (?, ?, ?, 1)`,
      { replacements: [role.code, role.libelle, role.ordre] }
    );
  }

  console.log(`${rolesContributeur.length} rôles de contributeurs insérés`);
}

async function down() {
  // Supprimer uniquement les rôles par défaut (ceux avec les codes connus)
  const codes = rolesContributeur.map(r => r.code);

  await sequelize.query(
    `DELETE FROM roles_contributeur_livre WHERE code IN (?)`,
    { replacements: [codes] }
  );

  console.log('Rôles de contributeurs par défaut supprimés');
}

module.exports = { up, down };
