// Charger les variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

/**
 * Templates par défaut
 */
const defaultTemplates = [
  {
    code: 'BIENVENUE',
    libelle: 'Email de bienvenue',
    description: 'Envoyé lors de l\'inscription d\'un nouvel adhérent',
    type_message: 'both',
    categorie: 'Adhérent',
    email_objet: 'Bienvenue {{prenom}} à {{structure_nom}} !',
    email_corps: `<h1>Bienvenue {{prenom}} {{nom}} !</h1>
<p>Nous vous confirmons votre inscription à <strong>{{structure_nom}}</strong>.</p>
<p>Votre numéro d'adhérent est : <strong>{{code_barre}}</strong></p>
<p>À très bientôt dans notre ludothèque !</p>
<p><em>L'équipe de {{structure_nom}}</em></p>`,
    sms_corps: 'Bienvenue {{prenom}} a {{structure_nom}} ! Votre numero adherent: {{code_barre}}',
    variables_disponibles: JSON.stringify(['nom', 'prenom', 'code_barre', 'structure_nom', 'email']),
    icone: 'bi-envelope-heart',
    couleur: 'success',
    ordre_affichage: 1
  },
  {
    code: 'RAPPEL_ADHESION',
    libelle: 'Rappel renouvellement adhésion',
    description: 'Envoyé avant l\'expiration de l\'adhésion',
    type_message: 'both',
    categorie: 'Adhérent',
    email_objet: 'Votre adhésion arrive à expiration',
    email_corps: `<h1>Bonjour {{prenom}},</h1>
<p>Votre adhésion à <strong>{{structure_nom}}</strong> arrive à expiration le <strong>{{date_fin_adhesion}}</strong>.</p>
<p>Pour continuer à profiter de nos jeux, pensez à renouveler votre adhésion !</p>
<p>À très bientôt,<br><em>L'équipe de {{structure_nom}}</em></p>`,
    sms_corps: 'Bonjour {{prenom}}, votre adhesion expire le {{date_fin_adhesion}}. Pensez a la renouveler ! {{structure_nom}}',
    variables_disponibles: JSON.stringify(['nom', 'prenom', 'date_fin_adhesion', 'structure_nom']),
    icone: 'bi-bell',
    couleur: 'warning',
    ordre_affichage: 2
  },
  {
    code: 'CONFIRMATION_COTISATION',
    libelle: 'Confirmation de cotisation',
    description: 'Envoyé après le paiement d\'une cotisation',
    type_message: 'email',
    categorie: 'Cotisation',
    email_objet: 'Confirmation de votre cotisation',
    email_corps: `<h1>Cotisation enregistrée</h1>
<p>Bonjour {{prenom}},</p>
<p>Nous vous confirmons la réception de votre cotisation de <strong>{{montant_paye}}€</strong>.</p>
<p>Détails :</p>
<ul>
  <li>Tarif : {{tarif_libelle}}</li>
  <li>Date de début : {{date_debut}}</li>
  <li>Date de fin : {{date_fin}}</li>
  <li>Mode de paiement : {{mode_paiement}}</li>
</ul>
<p>Merci pour votre confiance !</p>`,
    sms_corps: null,
    variables_disponibles: JSON.stringify(['prenom', 'montant_paye', 'tarif_libelle', 'date_debut', 'date_fin', 'mode_paiement']),
    icone: 'bi-check-circle',
    couleur: 'success',
    ordre_affichage: 3
  },
  {
    code: 'EMPRUNT_RETOUR',
    libelle: 'Rappel de retour d\'emprunt',
    description: 'Rappel quelques jours avant la date de retour prévue',
    type_message: 'both',
    categorie: 'Emprunt',
    email_objet: 'Rappel : retour de votre jeu {{jeu_titre}}',
    email_corps: `<h1>Rappel de retour</h1>
<p>Bonjour {{prenom}},</p>
<p>Le jeu <strong>{{jeu_titre}}</strong> est à retourner le <strong>{{date_retour_prevue}}</strong>.</p>
<p>Pensez à nous le rapporter dans les délais pour éviter les frais de retard.</p>
<p>Merci et à bientôt !</p>`,
    sms_corps: 'Bonjour {{prenom}}, rappel : retour du jeu {{jeu_titre}} le {{date_retour_prevue}}. {{structure_nom}}',
    variables_disponibles: JSON.stringify(['prenom', 'jeu_titre', 'date_retour_prevue', 'structure_nom']),
    icone: 'bi-arrow-return-left',
    couleur: 'info',
    ordre_affichage: 4
  },
  {
    code: 'EMPRUNT_RETARD',
    libelle: 'Notification de retard',
    description: 'Envoyé quand un emprunt est en retard',
    type_message: 'both',
    categorie: 'Emprunt',
    email_objet: 'URGENT : Retard de retour du jeu {{jeu_titre}}',
    email_corps: `<h1 style="color: red;">Retard de retour</h1>
<p>Bonjour {{prenom}},</p>
<p>Le jeu <strong>{{jeu_titre}}</strong> devait être retourné le <strong>{{date_retour_prevue}}</strong>.</p>
<p>Votre retard est de <strong>{{jours_retard}} jour(s)</strong>.</p>
<p>Merci de rapporter le jeu au plus vite pour éviter des frais supplémentaires.</p>`,
    sms_corps: 'URGENT {{prenom}} : le jeu {{jeu_titre}} a {{jours_retard}} jours de retard. Merci de le rapporter. {{structure_nom}}',
    variables_disponibles: JSON.stringify(['prenom', 'jeu_titre', 'date_retour_prevue', 'jours_retard', 'structure_nom']),
    icone: 'bi-exclamation-triangle',
    couleur: 'danger',
    ordre_affichage: 5
  }
];

/**
 * Seed les templates par défaut
 */
async function seed() {
  let connection;

  try {
    console.log('🔄 Connexion à la base de données...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connecté à la base de données');

    let created = 0;
    let skipped = 0;

    for (const template of defaultTemplates) {
      // Vérifier si le template existe déjà
      const [existing] = await connection.query(
        'SELECT id FROM templates_messages WHERE code = ?',
        [template.code]
      );

      if (existing.length > 0) {
        console.log(`⏭️  Template ${template.code} existe déjà, ignoré`);
        skipped++;
        continue;
      }

      // Insérer le template
      await connection.query(
        `INSERT INTO templates_messages (
          code, libelle, description, type_message, categorie,
          email_objet, email_corps, sms_corps, variables_disponibles,
          icone, couleur, ordre_affichage, actif, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())`,
        [
          template.code,
          template.libelle,
          template.description,
          template.type_message,
          template.categorie,
          template.email_objet,
          template.email_corps,
          template.sms_corps,
          template.variables_disponibles,
          template.icone,
          template.couleur,
          template.ordre_affichage
        ]
      );

      console.log(`✅ Template ${template.code} créé`);
      created++;
    }

    console.log('');
    console.log('✅ Seed terminé avec succès !');
    console.log(`   ${created} templates créés`);
    console.log(`   ${skipped} templates ignorés (déjà existants)`);
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter le seed si appelé directement
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seed terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = seed;
