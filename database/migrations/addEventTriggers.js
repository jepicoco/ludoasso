const { Sequelize } = require('sequelize');
const sequelize = require('../../backend/config/sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable('event_triggers', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    libelle: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    categorie: {
      type: Sequelize.ENUM('adherent', 'emprunt', 'cotisation', 'systeme'),
      allowNull: false
    },
    template_email_code: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    template_sms_code: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    email_actif: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sms_actif: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    delai_envoi: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    condition_envoi: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    ordre_affichage: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    icone: {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'bi-bell'
    },
    couleur: {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'primary'
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  // Ajouter les index
  await queryInterface.addIndex('event_triggers', ['code'], {
    unique: true,
    name: 'event_triggers_code_unique'
  });

  await queryInterface.addIndex('event_triggers', ['categorie'], {
    name: 'event_triggers_categorie'
  });

  await queryInterface.addIndex('event_triggers', ['email_actif'], {
    name: 'event_triggers_email_actif'
  });

  await queryInterface.addIndex('event_triggers', ['sms_actif'], {
    name: 'event_triggers_sms_actif'
  });

  await queryInterface.addIndex('event_triggers', ['ordre_affichage'], {
    name: 'event_triggers_ordre_affichage'
  });

  console.log('✅ Table event_triggers créée avec succès');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropTable('event_triggers');
  console.log('✅ Table event_triggers supprimée');
}

// Exécution si appelé directement
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
