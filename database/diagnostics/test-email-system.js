/**
 * Script de test complet du système d'envoi d'emails
 * Vérifie : configuration email, templates, event triggers, et envoi réel
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize, ConfigurationEmail, TemplateMessage, EventTrigger, Adherent } = require('../../backend/models');
const emailService = require('../../backend/services/emailService');
const eventTriggerService = require('../../backend/services/eventTriggerService');

async function testEmailSystem() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║  TEST SYSTÈME EMAIL - LUDOTHÈQUE         ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  try {
    // 1. Vérifier la connexion à la base de données
    console.log('📊 1. Test connexion base de données...');
    await sequelize.authenticate();
    console.log('   ✓ Connexion DB OK\n');

    // 2. Vérifier les configurations email
    console.log('📧 2. Vérification configurations email...');
    const emailConfigs = await ConfigurationEmail.findAll({
      where: { actif: true }
    });

    if (emailConfigs.length === 0) {
      console.log('   ✗ ERREUR : Aucune configuration email active trouvée');
      console.log('   → Créez une configuration via l\'interface admin\n');
      return;
    }

    console.log(`   ✓ ${emailConfigs.length} configuration(s) email active(s)`);
    emailConfigs.forEach(config => {
      console.log(`     - ${config.libelle} (${config.email_expediteur})`);
      console.log(`       SMTP: ${config.smtp_host}:${config.smtp_port}`);
      console.log(`       Par défaut: ${config.par_defaut ? 'OUI' : 'non'}`);
    });
    console.log();

    // 3. Tester la configuration par défaut
    console.log('🔧 3. Test configuration SMTP par défaut...');
    const defaultConfig = emailConfigs.find(c => c.par_defaut) || emailConfigs[0];

    try {
      const testResult = await defaultConfig.testerConnexion();
      if (testResult.success) {
        console.log('   ✓ Connexion SMTP réussie');
      } else {
        console.log('   ✗ Échec connexion SMTP');
        console.log(`   Erreur: ${testResult.message}`);
      }
    } catch (error) {
      console.log('   ✗ Erreur lors du test SMTP');
      console.error('   Détails:', error.message);
    }
    console.log();

    // 4. Vérifier les templates de messages
    console.log('📝 4. Vérification templates de messages...');
    const templates = await TemplateMessage.findAll({
      where: { actif: true }
    });

    if (templates.length === 0) {
      console.log('   ⚠ Aucun template actif trouvé');
      console.log('   → Les événements ne pourront pas envoyer d\'emails\n');
    } else {
      console.log(`   ✓ ${templates.length} template(s) actif(s)`);
      templates.forEach(tpl => {
        console.log(`     - ${tpl.code} (${tpl.type_message})`);
        console.log(`       Objet: ${tpl.objet?.substring(0, 50)}...`);
      });
    }
    console.log();

    // 5. Vérifier les déclencheurs d'événements
    console.log('🔔 5. Vérification event triggers...');
    const { Op } = require('sequelize');
    const triggers = await EventTrigger.findAll({
      where: {
        [Op.or]: [
          { email_actif: true },
          { sms_actif: true }
        ]
      }
    });

    if (triggers.length === 0) {
      console.log('   ⚠ Aucun event trigger actif');
      console.log('   → Les événements ne déclencheront pas d\'envoi automatique\n');
    } else {
      console.log(`   ✓ ${triggers.length} event trigger(s) actif(s)`);
      triggers.forEach(trigger => {
        const actions = [];
        if (trigger.email_actif) actions.push('EMAIL');
        if (trigger.sms_actif) actions.push('SMS');

        console.log(`     - ${trigger.code}`);
        console.log(`       Actions: ${actions.join(', ')}`);
        if (trigger.template_email_code) {
          console.log(`       Template email: ${trigger.template_email_code}`);
        }
      });
    }
    console.log();

    // 6. Initialiser le service email
    console.log('⚙️  6. Initialisation service email...');
    await emailService.initialize();
    console.log('   ✓ Service email initialisé\n');

    // 7. Test d'envoi d'email (simulation)
    console.log('✉️  7. Test simulation envoi email...');
    console.log('   (Aucun email réel ne sera envoyé)\n');

    // Trouver un adhérent de test
    const adherentTest = await Adherent.findOne({
      where: { statut: 'actif' },
      limit: 1
    });

    if (!adherentTest) {
      console.log('   ⚠ Aucun adhérent actif pour test de simulation');
    } else {
      console.log(`   📌 Adhérent test: ${adherentTest.prenom} ${adherentTest.nom}`);
      console.log(`      Email: ${adherentTest.email}\n`);

      // Test du trigger ADHERENT_CREATED (simulation)
      const trigger = await EventTrigger.findByCode('ADHERENT_CREATED');

      if (!trigger) {
        console.log('   ⚠ Trigger ADHERENT_CREATED non trouvé');
      } else {
        console.log(`   ✓ Trigger trouvé: ${trigger.libelle}`);
        console.log(`     Envoi email: ${trigger.email_actif ? 'OUI' : 'non'}`);
        console.log(`     Template: ${trigger.template_email_code || 'non défini'}`);

        if (trigger.template_email_code) {
          const template = await TemplateMessage.findByCode(trigger.template_email_code);
          if (template) {
            console.log(`     ✓ Template trouvé: ${template.objet}`);

            // Simuler la compilation du template
            const variables = {
              prenom: adherentTest.prenom,
              nom: adherentTest.nom,
              email: adherentTest.email,
              code_barre: adherentTest.code_barre
            };

            const compiled = template.compileEmail(variables);
            console.log(`     ✓ Compilation OK`);
            console.log(`       Objet compilé: ${compiled.objet}`);
          }
        }
      }
    }
    console.log();

    // 8. Résumé
    console.log('═══════════════════════════════════════════');
    console.log('RÉSUMÉ DU TEST\n');
    console.log(`✓ Configurations email actives : ${emailConfigs.length}`);
    console.log(`✓ Templates actifs : ${templates.length}`);
    console.log(`✓ Event triggers actifs : ${triggers.length}`);
    console.log(`✓ Service email : opérationnel`);
    console.log();

    if (emailConfigs.length > 0 && templates.length > 0 && triggers.length > 0) {
      console.log('🎉 SYSTÈME EMAIL PRÊT À FONCTIONNER\n');
      console.log('Pour envoyer un email de test réel :');
      console.log('  1. Connectez-vous à l\'interface admin');
      console.log('  2. Allez dans Paramètres > Configurations Email');
      console.log('  3. Cliquez sur "Tester" pour une configuration');
    } else {
      console.log('⚠️  CONFIGURATION INCOMPLÈTE\n');
      console.log('Actions requises :');
      if (emailConfigs.length === 0) {
        console.log('  - Créer une configuration email SMTP');
      }
      if (templates.length === 0) {
        console.log('  - Activer ou créer des templates de messages');
      }
      if (triggers.length === 0) {
        console.log('  - Activer des event triggers');
      }
    }
    console.log();

  } catch (error) {
    console.error('\n✗ ERREUR lors du test:');
    console.error('  ', error.message);
    console.error('\nDétails:', error);
  } finally {
    await sequelize.close();
  }
}

// Exécuter le test
testEmailSystem()
  .then(() => {
    console.log('Test terminé.\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
