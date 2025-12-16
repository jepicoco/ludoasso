/**
 * Script de configuration des communications pour les reservations
 * Cree les EventTriggers et les TemplateMessage necessaires
 *
 * Execution: npm run setup-reservations-communications
 * ou: node database/seeds/seedReservationCommunications.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { EventTrigger, TemplateMessage } = require('../../backend/models');

// Templates de messages pour les reservations
const RESERVATION_TEMPLATES = [
  {
    code: 'RESERVATION_PRETE',
    nom: 'Reservation prete - Article disponible',
    description: 'Email envoye quand un article reserve devient disponible',
    type_message: 'email',
    objet: 'Votre reservation est prete - {{article_titre}}',
    corps: `<p>Bonjour {{prenom}},</p>

<p>Bonne nouvelle ! L'article que vous avez reserve est maintenant <strong>disponible</strong> et vous attend.</p>

<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h4 style="margin-top: 0;">{{article_titre}}</h4>
</div>

<p><strong>Date limite de recuperation :</strong> {{date_expiration}}</p>

<p>Merci de venir recuperer votre article avant cette date. Passe ce delai, votre reservation sera annulee et l'article sera propose au reservataire suivant.</p>

<p>A bientot,<br>{{structure_nom}}</p>`,
    corps_sms: 'Bonjour {{prenom}}, votre reservation "{{article_titre}}" est disponible. A recuperer avant le {{date_expiration}}. {{structure_nom}}',
    actif: true
  },
  {
    code: 'RESERVATION_RAPPEL_EXPIRATION',
    nom: 'Rappel avant expiration de reservation',
    description: 'Email de rappel avant expiration de la reservation',
    type_message: 'email',
    objet: 'Rappel: votre reservation expire bientot - {{article_titre}}',
    corps: `<p>Bonjour {{prenom}},</p>

<p>Ce message est un rappel : votre reservation arrive bientot a expiration.</p>

<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h4 style="margin-top: 0;">{{article_titre}}</h4>
  <p style="margin-bottom: 0;"><strong>Date limite :</strong> {{date_expiration}}</p>
  <p style="margin-bottom: 0;"><strong>Temps restant :</strong> {{jours_restants}} jour(s)</p>
</div>

<p>Si vous ne venez pas recuperer l'article avant cette date, votre reservation sera automatiquement annulee.</p>

<p>A bientot,<br>{{structure_nom}}</p>`,
    corps_sms: 'Rappel: votre reservation "{{article_titre}}" expire dans {{jours_restants}} jour(s). A recuperer avant le {{date_expiration}}. {{structure_nom}}',
    actif: true
  },
  {
    code: 'RESERVATION_ANNULEE',
    nom: 'Reservation annulee',
    description: 'Email envoye quand une reservation est annulee',
    type_message: 'email',
    objet: 'Reservation annulee - {{article_titre}}',
    corps: `<p>Bonjour {{prenom}},</p>

<p>Votre reservation a ete annulee.</p>

<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h4 style="margin-top: 0;">{{article_titre}}</h4>
</div>

<p>Vous pouvez a tout moment effectuer une nouvelle reservation si l'article est disponible ou emprunte.</p>

<p>A bientot,<br>{{structure_nom}}</p>`,
    corps_sms: 'Votre reservation "{{article_titre}}" a ete annulee. {{structure_nom}}',
    actif: true
  },
  {
    code: 'RESERVATION_PROLONGEE',
    nom: 'Reservation prolongee',
    description: 'Email envoye quand une reservation est prolongee',
    type_message: 'email',
    objet: 'Reservation prolongee - {{article_titre}}',
    corps: `<p>Bonjour {{prenom}},</p>

<p>Votre reservation a ete prolongee.</p>

<div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h4 style="margin-top: 0;">{{article_titre}}</h4>
  <p style="margin-bottom: 0;"><strong>Nouvelle date limite :</strong> {{nouvelle_date_expiration}}</p>
</div>

<p>Merci de venir recuperer l'article avant cette nouvelle date.</p>

<p>A bientot,<br>{{structure_nom}}</p>`,
    corps_sms: 'Votre reservation "{{article_titre}}" a ete prolongee. Nouvelle date limite: {{nouvelle_date_expiration}}. {{structure_nom}}',
    actif: true
  },
  {
    code: 'RESERVATION_CREATED',
    nom: 'Confirmation de reservation',
    description: 'Email envoye quand une reservation est creee',
    type_message: 'email',
    objet: 'Confirmation de reservation - {{article_titre}}',
    corps: `<p>Bonjour {{prenom}},</p>

<p>Votre reservation a bien ete enregistree.</p>

<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h4 style="margin-top: 0;">{{article_titre}}</h4>
  <p style="margin-bottom: 0;"><strong>Position dans la file d'attente :</strong> {{position_queue}}</p>
</div>

<p>Vous serez averti(e) par email des que l'article sera disponible pour vous.</p>

<p>A bientot,<br>{{structure_nom}}</p>`,
    corps_sms: 'Reservation confirmee pour "{{article_titre}}". Position: {{position_queue}}. Vous serez averti quand disponible. {{structure_nom}}',
    actif: true
  }
];

// Event triggers pour les reservations
const RESERVATION_TRIGGERS = [
  {
    code: 'RESERVATION_PRETE',
    libelle: 'Reservation prete',
    description: 'Envoye quand un article reserve devient disponible pour recuperation',
    categorie: 'reservation',
    template_email_code: 'RESERVATION_PRETE',
    template_sms_code: null,
    email_actif: true,
    sms_actif: false,
    delai_envoi: 0,
    ordre_affichage: 200,
    icone: 'bi-bookmark-check',
    couleur: 'success'
  },
  {
    code: 'RESERVATION_RAPPEL_EXPIRATION',
    libelle: 'Rappel expiration reservation',
    description: 'Rappel envoye 3 jours avant expiration de la reservation',
    categorie: 'reservation',
    template_email_code: 'RESERVATION_RAPPEL_EXPIRATION',
    template_sms_code: null,
    email_actif: true,
    sms_actif: false,
    delai_envoi: 0,
    ordre_affichage: 210,
    icone: 'bi-clock-history',
    couleur: 'warning'
  },
  {
    code: 'RESERVATION_ANNULEE',
    libelle: 'Reservation annulee',
    description: 'Envoye quand une reservation est annulee',
    categorie: 'reservation',
    template_email_code: 'RESERVATION_ANNULEE',
    template_sms_code: null,
    email_actif: true,
    sms_actif: false,
    delai_envoi: 0,
    ordre_affichage: 220,
    icone: 'bi-bookmark-x',
    couleur: 'danger'
  },
  {
    code: 'RESERVATION_PROLONGEE',
    libelle: 'Reservation prolongee',
    description: 'Envoye quand une reservation est prolongee par un administrateur',
    categorie: 'reservation',
    template_email_code: 'RESERVATION_PROLONGEE',
    template_sms_code: null,
    email_actif: true,
    sms_actif: false,
    delai_envoi: 0,
    ordre_affichage: 230,
    icone: 'bi-clock',
    couleur: 'info'
  },
  {
    code: 'RESERVATION_CREATED',
    libelle: 'Reservation creee',
    description: 'Envoye quand une nouvelle reservation est creee',
    categorie: 'reservation',
    template_email_code: 'RESERVATION_CREATED',
    template_sms_code: null,
    email_actif: true,
    sms_actif: false,
    delai_envoi: 0,
    ordre_affichage: 190,
    icone: 'bi-bookmark-plus',
    couleur: 'primary'
  }
];

async function seedTemplates() {
  console.log('📝 Insertion des templates de reservation...');

  for (const template of RESERVATION_TEMPLATES) {
    const [record, created] = await TemplateMessage.findOrCreate({
      where: { code: template.code },
      defaults: template
    });

    if (created) {
      console.log(`  ✅ Template ${template.code} cree`);
    } else {
      console.log(`  ⏭️  Template ${template.code} existe deja`);
    }
  }
}

async function seedTriggers() {
  console.log('⚡ Insertion des triggers de reservation...');

  for (const trigger of RESERVATION_TRIGGERS) {
    const [record, created] = await EventTrigger.findOrCreate({
      where: { code: trigger.code },
      defaults: trigger
    });

    if (created) {
      console.log(`  ✅ Trigger ${trigger.code} cree`);
    } else {
      console.log(`  ⏭️  Trigger ${trigger.code} existe deja`);
    }
  }
}

async function seed() {
  console.log('🌱 Configuration des communications pour les reservations...\n');

  await seedTemplates();
  console.log('');
  await seedTriggers();

  console.log('\n✅ Configuration des communications de reservation terminee');
}

// Execution si appele directement
if (require.main === module) {
  const { sequelize } = require('../../backend/models');

  seed()
    .then(() => {
      console.log('\nSeed termine avec succes');
      return sequelize.close();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nErreur lors du seed:', error);
      process.exit(1);
    });
}

module.exports = seed;
