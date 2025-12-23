/**
 * Migration: Ajouter les tags utilisateur
 * - Table tags_utilisateur (referentiel des tags)
 * - Table utilisateur_tags (jonction many-to-many)
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();

  // Table tags_utilisateur
  if (!tables.includes('tags_utilisateur')) {
    await queryInterface.createTable('tags_utilisateur', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      libelle: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      couleur: {
        type: sequelize.Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#6c757d',
        comment: 'Couleur hexadecimale (#RRGGBB)'
      },
      icone: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'bi-tag',
        comment: 'Classe icone Bootstrap Icons'
      },
      ordre: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      structure_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'structures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'null = global, sinon specifique a une structure'
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    console.log('Table tags_utilisateur creee');
  }

  // Table de jonction utilisateur_tags
  if (!tables.includes('utilisateur_tags')) {
    await queryInterface.createTable('utilisateur_tags', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      utilisateur_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'utilisateurs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tag_utilisateur_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tags_utilisateur',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date_attribution: {
        type: sequelize.Sequelize.DATEONLY,
        allowNull: false
        // Default géré par le modèle Sequelize (hooks)
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Index unique pour eviter les doublons
    await queryInterface.addIndex('utilisateur_tags', ['utilisateur_id', 'tag_utilisateur_id'], {
      unique: true,
      name: 'idx_utilisateur_tag_unique'
    });

    console.log('Table utilisateur_tags creee');
  }

  // Ajouter quelques tags par defaut
  const [existingTags] = await sequelize.query(
    'SELECT COUNT(*) as count FROM tags_utilisateur'
  );

  if (existingTags[0].count === 0) {
    await sequelize.query(`
      INSERT INTO tags_utilisateur (code, libelle, description, couleur, icone, ordre, created_at, updated_at) VALUES
      ('SALARIE', 'Salarie', 'Salarie de la structure', '#28a745', 'bi-briefcase', 1, NOW(), NOW()),
      ('BENEVOLE_ACTIF', 'Benevole actif', 'Benevole participant regulierement', '#17a2b8', 'bi-heart', 2, NOW(), NOW()),
      ('HANDICAP', 'Situation de handicap', 'Personne en situation de handicap', '#6f42c1', 'bi-universal-access', 3, NOW(), NOW()),
      ('RSA', 'Beneficiaire RSA', 'Beneficiaire du RSA', '#fd7e14', 'bi-cash-stack', 4, NOW(), NOW()),
      ('ETUDIANT', 'Etudiant', 'Etudiant ou apprenti', '#20c997', 'bi-mortarboard', 5, NOW(), NOW()),
      ('SENIOR', 'Senior', 'Personne de plus de 65 ans', '#6c757d', 'bi-person-standing', 6, NOW(), NOW()),
      ('FAMILLE_NOMBREUSE', 'Famille nombreuse', 'Famille de 3 enfants ou plus', '#e83e8c', 'bi-people', 7, NOW(), NOW())
    `);
    console.log('Tags par defaut inseres');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.dropTable('utilisateur_tags');
  await queryInterface.dropTable('tags_utilisateur');

  console.log('Tables tags supprimees');
}

module.exports = { up, down };
