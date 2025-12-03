// Charger les variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { TemplateMessage } = require('../../backend/models');

/**
 * Templates alignés avec les event triggers
 */
async function seed() {
  console.log('🌱 Insertion des templates de messages pour les event triggers...');

  const templates = [
    // ADHÉRENTS
    {
      code: 'ADHERENT_CREATION',
      libelle: 'Bienvenue nouvel adhérent',
      description: 'Email de bienvenue envoyé lors de la création d\'un compte adhérent',
      type_message: 'email',
      categorie: 'Adhérent',
      email_objet: 'Bienvenue à la Ludothèque !',
      email_corps: `<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Bienvenue à la Ludothèque ! Votre compte a été créé avec succès.</p>
<p><strong>Votre code adhérent :</strong> {{code_barre}}</p>
<p><strong>Email :</strong> {{email}}</p>
<p>Vous pouvez dès maintenant emprunter des jeux !</p>
<p>À bientôt,<br>L'équipe de la Ludothèque</p>`,
      variables_disponibles: ['prenom', 'nom', 'email', 'code_barre', 'date_adhesion'],
      actif: true,
      ordre_affichage: 10,
      icone: 'bi-person-plus',
      couleur: 'success'
    },

    // EMPRUNTS
    {
      code: 'EMPRUNT_CONFIRMATION',
      libelle: 'Confirmation d\'emprunt',
      description: 'Email de confirmation envoyé lors de la création d\'un emprunt',
      type_message: 'email',
      categorie: 'Emprunt',
      email_objet: 'Confirmation de votre emprunt',
      email_corps: `<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Votre emprunt a bien été enregistré !</p>
<p><strong>Jeu emprunté :</strong> {{titre_jeu}}</p>
<p><strong>Date d'emprunt :</strong> {{date_emprunt}}</p>
<p><strong>Date de retour prévue :</strong> {{date_retour_prevue}}</p>
<p>Pensez à nous rapporter le jeu avant la date prévue.</p>
<p>Bon jeu !<br>L'équipe de la Ludothèque</p>`,
      variables_disponibles: ['prenom', 'nom', 'titre_jeu', 'date_emprunt', 'date_retour_prevue', 'duree_jours'],
      actif: true,
      ordre_affichage: 20,
      icone: 'bi-box-arrow-right',
      couleur: 'primary'
    },

    {
      code: 'EMPRUNT_RAPPEL_AVANT',
      libelle: 'Rappel avant échéance (J-3)',
      description: 'Email de rappel envoyé 3 jours avant la date de retour prévue',
      type_message: 'email',
      categorie: 'Emprunt',
      email_objet: 'Rappel : retour de jeu dans {{jours_restants}} jours',
      email_corps: `<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Ce message pour vous rappeler que le jeu <strong>{{titre_jeu}}</strong> est à retourner dans <strong>{{jours_restants}} jours</strong>.</p>
<p><strong>Date de retour prévue :</strong> {{date_retour_prevue}}</p>
<p>Merci de penser à nous le rapporter à temps !</p>
<p>À bientôt,<br>L'équipe de la Ludothèque</p>`,
      variables_disponibles: ['prenom', 'nom', 'titre_jeu', 'date_retour_prevue', 'jours_restants'],
      actif: true,
      ordre_affichage: 30,
      icone: 'bi-calendar-event',
      couleur: 'info'
    },

    {
      code: 'EMPRUNT_RAPPEL_ECHEANCE',
      libelle: 'Rappel jour de l\'échéance',
      description: 'Email de rappel envoyé le jour de la date de retour prévue',
      type_message: 'email',
      categorie: 'Emprunt',
      email_objet: 'Retour de jeu aujourd\'hui',
      email_corps: `<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Le jeu <strong>{{titre_jeu}}</strong> est à retourner <strong>aujourd'hui</strong>.</p>
<p><strong>Date de retour prévue :</strong> {{date_retour_prevue}}</p>
<p>Merci de nous le rapporter dès que possible !</p>
<p>À bientôt,<br>L'équipe de la Ludothèque</p>`,
      variables_disponibles: ['prenom', 'nom', 'titre_jeu', 'date_retour_prevue'],
      actif: true,
      ordre_affichage: 40,
      icone: 'bi-alarm',
      couleur: 'warning'
    },

    {
      code: 'EMPRUNT_RELANCE_RETARD',
      libelle: 'Relance pour retard',
      description: 'Email de relance envoyé en cas de retard de retour',
      type_message: 'email',
      categorie: 'Emprunt',
      email_objet: 'Retard de retour - {{titre_jeu}}',
      email_corps: `<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Le jeu <strong>{{titre_jeu}}</strong> aurait dû être retourné le <strong>{{date_retour_prevue}}</strong>.</p>
<p>Vous avez actuellement <strong>{{jours_retard}} jour(s) de retard</strong>.</p>
<p>Merci de nous rapporter le jeu dès que possible.</p>
<p>Cordialement,<br>L'équipe de la Ludothèque</p>`,
      variables_disponibles: ['prenom', 'nom', 'titre_jeu', 'date_retour_prevue', 'jours_retard'],
      actif: true,
      ordre_affichage: 50,
      icone: 'bi-exclamation-triangle',
      couleur: 'danger'
    },

    // COTISATIONS
    {
      code: 'COTISATION_CONFIRMATION',
      libelle: 'Confirmation de cotisation',
      description: 'Email de confirmation envoyé après le paiement d\'une cotisation',
      type_message: 'email',
      categorie: 'Cotisation',
      email_objet: 'Confirmation de votre cotisation',
      email_corps: `<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Votre cotisation a bien été enregistrée !</p>
<p><strong>Montant payé :</strong> {{montant}} €</p>
<p><strong>Mode de paiement :</strong> {{mode_paiement}}</p>
<p><strong>Date de paiement :</strong> {{date_paiement}}</p>
<p><strong>Période :</strong> du {{periode_debut}} au {{periode_fin}}</p>
<p>Merci pour votre adhésion !</p>
<p>À bientôt,<br>L'équipe de la Ludothèque</p>`,
      variables_disponibles: ['prenom', 'nom', 'montant', 'mode_paiement', 'date_paiement', 'periode_debut', 'periode_fin', 'annee'],
      actif: true,
      ordre_affichage: 60,
      icone: 'bi-credit-card',
      couleur: 'success'
    },

    {
      code: 'COTISATION_RAPPEL',
      libelle: 'Rappel expiration cotisation',
      description: 'Email de rappel envoyé avant l\'expiration de la cotisation',
      type_message: 'email',
      categorie: 'Cotisation',
      email_objet: 'Votre cotisation expire bientôt',
      email_corps: `<h2>Bonjour {{prenom}} {{nom}},</h2>
<p>Votre cotisation arrive à expiration dans <strong>{{jours_restants}} jours</strong>.</p>
<p><strong>Date d'expiration :</strong> {{date_expiration}}</p>
<p>Pensez à renouveler votre cotisation pour continuer à profiter de la ludothèque !</p>
<p>À bientôt,<br>L'équipe de la Ludothèque</p>`,
      variables_disponibles: ['prenom', 'nom', 'date_expiration', 'jours_restants'],
      actif: true,
      ordre_affichage: 70,
      icone: 'bi-calendar-x',
      couleur: 'warning'
    }
  ];

  for (const template of templates) {
    const [record, created] = await TemplateMessage.findOrCreate({
      where: { code: template.code },
      defaults: template
    });

    if (created) {
      console.log(`  ✅ ${template.code} créé`);
    } else {
      // Mettre à jour si existe déjà
      await record.update(template);
      console.log(`  🔄 ${template.code} mis à jour`);
    }
  }

  console.log('✅ Templates de messages insérés/mis à jour avec succès');
}

// Exécution si appelé directement
if (require.main === module) {
  const { sequelize } = require('../../backend/models');

  seed()
    .then(() => {
      console.log('Seed terminé avec succès');
      return sequelize.close();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur lors du seed:', error);
      process.exit(1);
    });
}

module.exports = seed;
