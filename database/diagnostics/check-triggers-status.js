/**
 * Script de diagnostic pour vérifier l'état des event triggers
 */

const { EventTrigger, TemplateMessage } = require('../backend/models');

async function checkTriggersStatus() {
  try {
    console.log('=== Vérification des Event Triggers ===\n');

    // Vérifier si le trigger ADHERENT_CREATED existe
    const adherentCreatedTrigger = await EventTrigger.findByCode('ADHERENT_CREATED');

    if (!adherentCreatedTrigger) {
      console.log('❌ PROBLÈME: Le trigger ADHERENT_CREATED n\'existe pas dans la base de données!');
      console.log('   Solution: Exécutez "npm run seed-event-triggers"\n');
    } else {
      console.log('✓ Trigger ADHERENT_CREATED trouvé');
      console.log('  - ID:', adherentCreatedTrigger.id);
      console.log('  - Libellé:', adherentCreatedTrigger.libelle);
      console.log('  - Catégorie:', adherentCreatedTrigger.categorie);
      console.log('  - Email actif:', adherentCreatedTrigger.email_actif ? '✓ OUI' : '✗ NON');
      console.log('  - SMS actif:', adherentCreatedTrigger.sms_actif ? '✓ OUI' : '✗ NON');
      console.log('  - Template email:', adherentCreatedTrigger.template_email_code || '(aucun)');
      console.log('  - Template SMS:', adherentCreatedTrigger.template_sms_code || '(aucun)');

      if (!adherentCreatedTrigger.email_actif) {
        console.log('  ⚠️  ATTENTION: L\'envoi d\'email n\'est pas activé!');
        console.log('     Solution: Activez-le depuis l\'interface admin');
      }

      if (!adherentCreatedTrigger.template_email_code) {
        console.log('  ⚠️  ATTENTION: Aucun template email n\'est configuré!');
        console.log('     Solution: Associez un template depuis l\'interface admin');
      } else {
        // Vérifier si le template existe
        const template = await TemplateMessage.findByCode(adherentCreatedTrigger.template_email_code);

        if (!template) {
          console.log('  ❌ PROBLÈME: Le template email', adherentCreatedTrigger.template_email_code, 'n\'existe pas!');
          console.log('     Solution: Exécutez "npm run seed-templates-event-triggers"');
        } else {
          console.log('  ✓ Template email trouvé:', template.libelle);
          console.log('    - Type:', template.type_message);
          console.log('    - Actif:', template.actif ? '✓ OUI' : '✗ NON');
          console.log('    - Sujet:', template.email_objet);
          console.log('    - Corps:', template.email_corps ? `${template.email_corps.substring(0, 50)}...` : '(vide)');

          if (!template.actif) {
            console.log('    ⚠️  ATTENTION: Le template n\'est pas actif!');
          }
        }
      }

      console.log();
    }

    // Lister tous les triggers
    console.log('\n=== Liste de tous les Event Triggers ===\n');
    const allTriggers = await EventTrigger.findAll({
      order: [['categorie', 'ASC'], ['ordre_affichage', 'ASC']]
    });

    if (allTriggers.length === 0) {
      console.log('❌ Aucun trigger trouvé dans la base de données!');
      console.log('   Solution: Exécutez "npm run seed-event-triggers"');
    } else {
      console.log(`Nombre total de triggers: ${allTriggers.length}\n`);

      allTriggers.forEach(trigger => {
        const emailIcon = trigger.email_actif ? '📧' : '  ';
        const smsIcon = trigger.sms_actif ? '📱' : '  ';
        console.log(`${emailIcon} ${smsIcon} [${trigger.categorie.padEnd(11)}] ${trigger.code.padEnd(25)} - ${trigger.libelle}`);
      });
    }

    // Lister tous les templates
    console.log('\n\n=== Liste de tous les Templates ===\n');
    const allTemplates = await TemplateMessage.findAll({
      order: [['categorie', 'ASC'], ['ordre_affichage', 'ASC']]
    });

    if (allTemplates.length === 0) {
      console.log('❌ Aucun template trouvé dans la base de données!');
      console.log('   Solution: Exécutez "npm run seed-templates-event-triggers"');
    } else {
      console.log(`Nombre total de templates: ${allTemplates.length}\n`);

      allTemplates.forEach(template => {
        const typeIcon = template.type_message === 'email' ? '📧' :
                        template.type_message === 'sms' ? '📱' : '📧📱';
        const actifIcon = template.actif ? '✓' : '✗';
        console.log(`${actifIcon} ${typeIcon} [${(template.categorie || 'N/A').padEnd(11)}] ${template.code.padEnd(30)} - ${template.libelle}`);
      });
    }

    console.log('\n=== Diagnostic terminé ===\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    process.exit(1);
  }
}

checkTriggersStatus();
