const { TemplateMessage } = require('../../backend/models');

/**
 * Seed les templates d'emails automatiques
 */
async function seedEmailTemplates() {
  try {
    console.log('Création des templates d\'emails automatiques...');

    const templates = [
      // Template de bienvenue
      {
        code: 'ADHERENT_CREATION',
        nom: 'Bienvenue nouvel adhérent',
        canal: 'email',
        objet: 'Bienvenue à la Ludothèque !',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Bienvenue {{prenom}} {{nom}} !</h2>

            <p>Nous sommes ravis de vous compter parmi nos adhérents.</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Vos informations de compte</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Email :</strong> {{email}}</li>
                <li><strong>Code-barre :</strong> {{code_barre}}</li>
                <li><strong>Date d'adhésion :</strong> {{date_adhesion}}</li>
              </ul>
            </div>

            <p>Vous pouvez dès maintenant emprunter des jeux de notre catalogue.</p>

            <p>N'hésitez pas à nous contacter si vous avez des questions.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Cordialement,<br>
              L'équipe de la Ludothèque
            </p>
          </div>
        `,
        variables_disponibles: ['prenom', 'nom', 'email', 'code_barre', 'date_adhesion'],
        actif: true
      },

      // Template confirmation d'emprunt
      {
        code: 'EMPRUNT_CONFIRMATION',
        nom: 'Confirmation d\'emprunt',
        canal: 'email',
        objet: 'Confirmation de votre emprunt - {{titre_jeu}}',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2196F3;">Confirmation d'emprunt</h2>

            <p>Bonjour {{prenom}} {{nom}},</p>

            <p>Nous confirmons l'emprunt du jeu suivant :</p>

            <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1976D2;">{{titre_jeu}}</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Date d'emprunt :</strong> {{date_emprunt}}</li>
                <li><strong>Date de retour prévue :</strong> {{date_retour_prevue}}</li>
                <li><strong>Durée :</strong> {{duree_jours}} jour(s)</li>
              </ul>
            </div>

            <p style="color: #f44336; font-weight: bold;">
              ⚠️ Merci de rapporter le jeu avant le {{date_retour_prevue}}
            </p>

            <p>Bon jeu !</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Cordialement,<br>
              L'équipe de la Ludothèque
            </p>
          </div>
        `,
        variables_disponibles: ['prenom', 'nom', 'titre_jeu', 'date_emprunt', 'date_retour_prevue', 'duree_jours'],
        actif: true
      },

      // Template rappel avant échéance (J-3)
      {
        code: 'EMPRUNT_RAPPEL_AVANT',
        nom: 'Rappel avant échéance (J-3)',
        canal: 'email',
        objet: 'Rappel : Retour du jeu {{titre_jeu}} dans {{jours_restants}} jours',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9800;">Rappel de retour</h2>

            <p>Bonjour {{prenom}} {{nom}},</p>

            <p>Nous vous rappelons que le jeu <strong>{{titre_jeu}}</strong> doit être rendu dans <strong>{{jours_restants}} jour(s)</strong>.</p>

            <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0;">
              <p style="margin: 0;"><strong>Date de retour prévue :</strong> {{date_retour_prevue}}</p>
            </div>

            <p>Merci de rapporter le jeu à temps pour permettre à d'autres adhérents d'en profiter.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Cordialement,<br>
              L'équipe de la Ludothèque
            </p>
          </div>
        `,
        variables_disponibles: ['prenom', 'nom', 'titre_jeu', 'date_retour_prevue', 'jours_restants'],
        actif: true
      },

      // Template rappel à l'échéance (J)
      {
        code: 'EMPRUNT_RAPPEL_ECHEANCE',
        nom: 'Rappel à l\'échéance (jour J)',
        canal: 'email',
        objet: 'URGENT : Retour du jeu {{titre_jeu}} aujourd\'hui',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f44336;">⚠️ Retour à effectuer aujourd'hui</h2>

            <p>Bonjour {{prenom}} {{nom}},</p>

            <p>Le jeu <strong>{{titre_jeu}}</strong> doit être rendu <strong>AUJOURD'HUI</strong>.</p>

            <div style="background-color: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
              <p style="margin: 0; color: #d32f2f; font-weight: bold;">
                Date limite : {{date_retour_prevue}}
              </p>
            </div>

            <p>Merci de rapporter le jeu dès que possible pour éviter les pénalités de retard.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Cordialement,<br>
              L'équipe de la Ludothèque
            </p>
          </div>
        `,
        variables_disponibles: ['prenom', 'nom', 'titre_jeu', 'date_retour_prevue'],
        actif: true
      },

      // Template relance pour retard
      {
        code: 'EMPRUNT_RELANCE_RETARD',
        nom: 'Relance pour retard',
        canal: 'email',
        objet: 'RETARD : Le jeu {{titre_jeu}} aurait dû être rendu',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">🚨 Retard de retour</h2>

            <p>Bonjour {{prenom}} {{nom}},</p>

            <p>Le jeu <strong>{{titre_jeu}}</strong> est en retard de <strong>{{jours_retard}} jour(s)</strong>.</p>

            <div style="background-color: #ffcdd2; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
              <ul style="list-style: none; padding: 0;">
                <li><strong>Date prévue de retour :</strong> {{date_retour_prevue}}</li>
                <li><strong>Jours de retard :</strong> {{jours_retard}}</li>
              </ul>
            </div>

            <p style="color: #d32f2f; font-weight: bold;">
              Merci de rapporter le jeu dès que possible.
            </p>

            <p>Les retards répétés peuvent entraîner une suspension de votre compte.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Cordialement,<br>
              L'équipe de la Ludothèque
            </p>
          </div>
        `,
        variables_disponibles: ['prenom', 'nom', 'titre_jeu', 'date_retour_prevue', 'jours_retard'],
        actif: true
      },

      // Template confirmation de cotisation
      {
        code: 'COTISATION_CONFIRMATION',
        nom: 'Confirmation de cotisation',
        canal: 'email',
        objet: 'Confirmation de votre cotisation {{annee}}',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">✓ Cotisation confirmée</h2>

            <p>Bonjour {{prenom}} {{nom}},</p>

            <p>Nous confirmons la réception de votre cotisation pour l'année {{annee}}.</p>

            <div style="background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
              <h3 style="margin-top: 0;">Détails du paiement</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Montant :</strong> {{montant}} €</li>
                <li><strong>Date :</strong> {{date_paiement}}</li>
                <li><strong>Mode de paiement :</strong> {{mode_paiement}}</li>
              </ul>
            </div>

            <p>Merci pour votre soutien !</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Cordialement,<br>
              L'équipe de la Ludothèque
            </p>
          </div>
        `,
        variables_disponibles: ['prenom', 'nom', 'montant', 'date_paiement', 'mode_paiement', 'annee'],
        actif: true
      },

      // Template rappel de renouvellement de cotisation
      {
        code: 'COTISATION_RAPPEL',
        nom: 'Rappel renouvellement cotisation',
        canal: 'email',
        objet: 'Rappel : Renouvellement de votre cotisation',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9800;">Renouvellement de cotisation</h2>

            <p>Bonjour {{prenom}} {{nom}},</p>

            <p>Votre cotisation arrive à expiration dans <strong>{{jours_restants}} jour(s)</strong>.</p>

            <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0;">
              <p style="margin: 0;"><strong>Date d'expiration :</strong> {{date_expiration}}</p>
            </div>

            <p>Pour continuer à profiter de nos services, pensez à renouveler votre cotisation.</p>

            <p>Vous pouvez effectuer le renouvellement :</p>
            <ul>
              <li>En ligne sur notre site</li>
              <li>Directement à la ludothèque</li>
              <li>Par virement bancaire</li>
            </ul>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Cordialement,<br>
              L'équipe de la Ludothèque
            </p>
          </div>
        `,
        variables_disponibles: ['prenom', 'nom', 'date_expiration', 'jours_restants'],
        actif: true
      }
    ];

    for (const template of templates) {
      const [record, created] = await TemplateMessage.findOrCreate({
        where: { code: template.code },
        defaults: template
      });

      if (created) {
        console.log(`✓ Template créé : ${template.nom}`);
      } else {
        console.log(`- Template existe déjà : ${template.nom}`);
      }
    }

    console.log('\nTemplates d\'emails créés avec succès !');
  } catch (error) {
    console.error('Erreur lors de la création des templates:', error);
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  const { sequelize } = require('../../backend/models');

  seedEmailTemplates()
    .then(() => {
      console.log('Seed terminé');
      sequelize.close();
      process.exit(0);
    })
    .catch(error => {
      console.error('Erreur:', error);
      sequelize.close();
      process.exit(1);
    });
}

module.exports = seedEmailTemplates;
