/**
 * Script manuel pour créer la table event_triggers et insérer les données
 * À exécuter quand le serveur est démarré
 */

const { sequelize, EventTrigger } = require('../backend/models');

async function setup() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données');

    console.log('🔄 Synchronisation du modèle EventTrigger...');
    // Force: false pour ne pas supprimer les données existantes
    // Alter: true pour modifier la structure si elle existe déjà
    await EventTrigger.sync({ alter: true });
    console.log('✅ Table event_triggers créée/mise à jour');

    console.log('🔄 Insertion des déclencheurs d\'événements...');

    const triggers = [
      // Événements Adhérent
      {
        code: 'ADHERENT_CREATED',
        libelle: 'Création de compte adhérent',
        description: 'Envoyé lorsqu\'un nouveau compte adhérent est créé',
        categorie: 'adherent',
        template_email_code: 'ADHERENT_CREATION',
        template_sms_code: null,
        email_actif: true,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 10,
        icone: 'bi-person-plus',
        couleur: 'success'
      },
      {
        code: 'ADHERENT_UPDATED',
        libelle: 'Modification de compte adhérent',
        description: 'Envoyé lorsqu\'un compte adhérent est modifié',
        categorie: 'adherent',
        template_email_code: null,
        template_sms_code: null,
        email_actif: false,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 20,
        icone: 'bi-person-check',
        couleur: 'info'
      },
      {
        code: 'ADHERENT_SUSPENDED',
        libelle: 'Suspension de compte adhérent',
        description: 'Envoyé lorsqu\'un compte adhérent est suspendu',
        categorie: 'adherent',
        template_email_code: null,
        template_sms_code: null,
        email_actif: false,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 30,
        icone: 'bi-person-x',
        couleur: 'warning'
      },

      // Événements Emprunt
      {
        code: 'EMPRUNT_CREATED',
        libelle: 'Création d\'emprunt',
        description: 'Envoyé lorsqu\'un nouvel emprunt est créé',
        categorie: 'emprunt',
        template_email_code: 'EMPRUNT_CONFIRMATION',
        template_sms_code: null,
        email_actif: true,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 40,
        icone: 'bi-box-arrow-right',
        couleur: 'primary'
      },
      {
        code: 'EMPRUNT_RETURNED',
        libelle: 'Retour d\'emprunt',
        description: 'Envoyé lorsqu\'un emprunt est retourné',
        categorie: 'emprunt',
        template_email_code: null,
        template_sms_code: null,
        email_actif: false,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 50,
        icone: 'bi-box-arrow-left',
        couleur: 'success'
      },
      {
        code: 'EMPRUNT_RAPPEL_J3',
        libelle: 'Rappel J-3 avant échéance',
        description: 'Rappel envoyé 3 jours avant la date de retour prévue',
        categorie: 'emprunt',
        template_email_code: 'EMPRUNT_RAPPEL_AVANT',
        template_sms_code: null,
        email_actif: true,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 60,
        icone: 'bi-calendar-event',
        couleur: 'info'
      },
      {
        code: 'EMPRUNT_RAPPEL_ECHEANCE',
        libelle: 'Rappel jour J échéance',
        description: 'Rappel envoyé le jour de la date de retour prévue',
        categorie: 'emprunt',
        template_email_code: 'EMPRUNT_RAPPEL_ECHEANCE',
        template_sms_code: null,
        email_actif: true,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 70,
        icone: 'bi-alarm',
        couleur: 'warning'
      },
      {
        code: 'EMPRUNT_RETARD',
        libelle: 'Relance pour retard',
        description: 'Relance envoyée en cas de retard de retour',
        categorie: 'emprunt',
        template_email_code: 'EMPRUNT_RELANCE_RETARD',
        template_sms_code: null,
        email_actif: true,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 80,
        icone: 'bi-exclamation-triangle',
        couleur: 'danger'
      },

      // Événements Cotisation
      {
        code: 'COTISATION_CREATED',
        libelle: 'Création de cotisation',
        description: 'Envoyé lorsqu\'une nouvelle cotisation est créée',
        categorie: 'cotisation',
        template_email_code: 'COTISATION_CONFIRMATION',
        template_sms_code: null,
        email_actif: true,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 90,
        icone: 'bi-credit-card',
        couleur: 'success'
      },
      {
        code: 'COTISATION_EXPIRATION',
        libelle: 'Rappel expiration cotisation',
        description: 'Rappel envoyé 30 jours avant l\'expiration de la cotisation',
        categorie: 'cotisation',
        template_email_code: 'COTISATION_RAPPEL',
        template_sms_code: null,
        email_actif: true,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 100,
        icone: 'bi-calendar-x',
        couleur: 'warning'
      },
      {
        code: 'COTISATION_EXPIRED',
        libelle: 'Cotisation expirée',
        description: 'Notification envoyée lorsque la cotisation est expirée',
        categorie: 'cotisation',
        template_email_code: null,
        template_sms_code: null,
        email_actif: false,
        sms_actif: false,
        delai_envoi: 0,
        ordre_affichage: 110,
        icone: 'bi-x-circle',
        couleur: 'danger'
      }
    ];

    for (const trigger of triggers) {
      const [record, created] = await EventTrigger.findOrCreate({
        where: { code: trigger.code },
        defaults: trigger
      });

      if (created) {
        console.log(`  ✅ ${trigger.code} créé`);
      } else {
        console.log(`  ⏭️  ${trigger.code} existe déjà`);
      }
    }

    console.log('\n✅ Configuration terminée avec succès!');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Accéder à l\'interface admin: http://localhost:3000');
    console.log('   2. Aller dans le menu "Communications"');
    console.log('   3. Configurer les déclencheurs selon vos besoins');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la configuration:', error.message);
    console.error('\n💡 Vérifiez que:');
    console.error('   - Le serveur MySQL est démarré');
    console.error('   - Les credentials dans .env sont corrects');
    console.error('   - Le port 3306 est accessible');
    process.exit(1);
  }
}

// Exécution
setup();
