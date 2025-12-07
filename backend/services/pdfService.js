const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Service de génération de documents PDF
 */
class PDFService {
  constructor() {
    // Créer le dossier uploads/recus s'il n'existe pas
    this.recusDir = path.join(__dirname, '../../uploads/recus');
    this.ensureDirectoryExists();
  }

  /**
   * Assure que le dossier de destination existe
   */
  ensureDirectoryExists() {
    const uploadsDir = path.join(__dirname, '../../uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (!fs.existsSync(this.recusDir)) {
      fs.mkdirSync(this.recusDir, { recursive: true });
    }
  }

  /**
   * Formate une date au format français
   * @param {Date|string} date - Date à formater
   * @returns {string} - Date formatée (jj/mm/aaaa)
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formate un montant en euros
   * @param {number} montant - Montant à formater
   * @returns {string} - Montant formaté (ex: 25,00 €)
   */
  formatMontant(montant) {
    return `${parseFloat(montant).toFixed(2).replace('.', ',')} €`;
  }

  /**
   * Formate le mode de paiement pour affichage
   * @param {string} mode - Mode de paiement
   * @returns {string} - Mode formaté
   */
  formatModePaiement(mode) {
    const modes = {
      'especes': 'Espèces',
      'cheque': 'Chèque',
      'carte_bancaire': 'Carte bancaire',
      'virement': 'Virement',
      'prelevement': 'Prélèvement',
      'autre': 'Autre'
    };
    return modes[mode] || mode;
  }

  /**
   * Génère un reçu de cotisation au format PDF
   * @param {Object} cotisation - Objet cotisation avec relations (adherent, tarif)
   * @param {Object} structure - Paramètres de la structure
   * @returns {Promise<{filepath: string, filename: string}>}
   */
  async genererRecuCotisation(cotisation, structure) {
    return new Promise((resolve, reject) => {
      try {
        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const filename = `recu_cotisation_${cotisation.id}_${timestamp}.pdf`;
        const filepath = path.join(this.recusDir, filename);

        // Créer le document PDF
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        // Créer le flux d'écriture
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Variables pour le positionnement
        let yPos = 50;

        // ===== EN-TÊTE =====
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(structure.nom_structure || 'Ludothèque', 50, yPos);

        yPos += 25;
        doc.fontSize(10)
           .font('Helvetica');

        if (structure.adresse) {
          doc.text(structure.adresse, 50, yPos);
          yPos += 15;
        }

        if (structure.code_postal && structure.ville) {
          doc.text(`${structure.code_postal} ${structure.ville}`, 50, yPos);
          yPos += 15;
        }

        if (structure.siret) {
          doc.text(`SIRET: ${structure.siret}`, 50, yPos);
          yPos += 15;
        }

        if (structure.telephone) {
          doc.text(`Tél: ${structure.telephone}`, 50, yPos);
          yPos += 15;
        }

        if (structure.email) {
          doc.text(`Email: ${structure.email}`, 50, yPos);
          yPos += 15;
        }

        // Ligne de séparation
        yPos += 10;
        doc.moveTo(50, yPos)
           .lineTo(545, yPos)
           .stroke();

        yPos += 30;

        // ===== TITRE =====
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('REÇU DE COTISATION', 50, yPos, { align: 'center' });

        yPos += 20;

        if (cotisation.numero_piece_comptable) {
          doc.fontSize(10)
             .font('Helvetica')
             .text(`N° pièce: ${cotisation.numero_piece_comptable}`, 50, yPos, { align: 'center' });
          yPos += 15;
        }

        yPos += 20;

        // ===== INFORMATIONS ADHÉRENT =====
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Adhérent:', 50, yPos);

        yPos += 20;
        doc.fontSize(10)
           .font('Helvetica');

        if (cotisation.adherent) {
          const adherent = cotisation.adherent;
          doc.text(`${adherent.prenom} ${adherent.nom}`, 70, yPos);
          yPos += 15;

          if (adherent.code_barre) {
            doc.text(`Code adhérent: ${adherent.code_barre}`, 70, yPos);
            yPos += 15;
          }

          if (adherent.adresse) {
            doc.text(adherent.adresse, 70, yPos);
            yPos += 15;
          }

          if (adherent.code_postal && adherent.ville) {
            doc.text(`${adherent.code_postal} ${adherent.ville}`, 70, yPos);
            yPos += 15;
          }
        }

        yPos += 20;

        // ===== DÉTAILS DE LA COTISATION =====
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Détails de la cotisation:', 50, yPos);

        yPos += 20;
        doc.fontSize(10)
           .font('Helvetica');

        doc.text(`Date de paiement: ${this.formatDate(cotisation.date_paiement)}`, 70, yPos);
        yPos += 15;

        doc.text(`Période: du ${this.formatDate(cotisation.periode_debut)} au ${this.formatDate(cotisation.periode_fin)}`, 70, yPos);
        yPos += 15;

        if (cotisation.tarif) {
          doc.text(`Type de tarif: ${cotisation.tarif.libelle}`, 70, yPos);
          yPos += 15;
        }

        yPos += 20;

        // ===== TABLEAU DES MONTANTS =====
        const tableTop = yPos;
        const col1 = 70;   // Désignation
        const col2 = 320;  // Montant de base
        const col3 = 420;  // Réduction
        const col4 = 490;  // Total

        // En-tête du tableau
        doc.fontSize(10)
           .font('Helvetica-Bold');

        doc.text('Désignation', col1, tableTop);
        doc.text('Montant', col2, tableTop, { width: 90, align: 'right' });
        doc.text('Réduction', col3, tableTop, { width: 60, align: 'right' });
        doc.text('Total', col4, tableTop, { width: 55, align: 'right' });

        yPos = tableTop + 15;

        // Ligne de séparation
        doc.moveTo(50, yPos)
           .lineTo(545, yPos)
           .stroke();

        yPos += 10;

        // Contenu du tableau
        doc.font('Helvetica');

        const designation = cotisation.tarif ? cotisation.tarif.libelle : 'Cotisation';
        doc.text(designation, col1, yPos, { width: 240 });
        doc.text(this.formatMontant(cotisation.montant_base), col2, yPos, { width: 90, align: 'right' });
        doc.text(this.formatMontant(cotisation.reduction_appliquee), col3, yPos, { width: 60, align: 'right' });
        doc.text(this.formatMontant(cotisation.montant_paye), col4, yPos, { width: 55, align: 'right' });

        yPos += 20;

        // Ligne de séparation
        doc.moveTo(50, yPos)
           .lineTo(545, yPos)
           .stroke();

        yPos += 10;

        // Total à payer
        doc.fontSize(12)
           .font('Helvetica-Bold');
        doc.text('Total payé:', col3, yPos, { width: 60, align: 'right' });
        doc.text(this.formatMontant(cotisation.montant_paye), col4, yPos, { width: 55, align: 'right' });

        yPos += 30;

        // ===== MODE DE RÈGLEMENT =====
        doc.fontSize(10)
           .font('Helvetica-Bold');
        doc.text('Mode de règlement:', 50, yPos);
        yPos += 15;

        doc.font('Helvetica');
        doc.text(this.formatModePaiement(cotisation.mode_paiement), 70, yPos);
        yPos += 15;

        if (cotisation.reference_paiement) {
          doc.text(`Référence: ${cotisation.reference_paiement}`, 70, yPos);
          yPos += 15;
        }

        yPos += 20;

        // ===== MENTIONS LÉGALES =====
        if (structure.mentions_legales) {
          doc.fontSize(8)
             .font('Helvetica')
             .text(structure.mentions_legales, 50, yPos, { width: 495, align: 'left' });
          yPos += 30;
        }

        // TVA non applicable
        doc.fontSize(8)
           .font('Helvetica-Oblique')
           .text('TVA non applicable - Article 293 B du CGI', 50, yPos, { align: 'center' });

        yPos += 20;

        // ===== PIED DE PAGE =====
        const footerY = 750;
        doc.fontSize(8)
           .font('Helvetica')
           .text(`Document généré le ${this.formatDate(new Date())}`, 50, footerY, { align: 'center' });

        // Finaliser le PDF
        doc.end();

        // Attendre que le flux soit terminé
        stream.on('finish', () => {
          resolve({ filepath, filename });
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}

// Export singleton
module.exports = new PDFService();
