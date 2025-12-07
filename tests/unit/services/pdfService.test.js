const pdfService = require('../../../backend/services/pdfService');
const fs = require('fs');
const path = require('path');

describe('PDFService', () => {
  describe('genererRecuCotisation', () => {
    it('devrait créer un fichier PDF valide', async () => {
      // Mock des données de cotisation
      const cotisation = {
        id: 1,
        montant_base: 50.00,
        reduction_appliquee: 5.00,
        montant_paye: 45.00,
        date_paiement: new Date('2024-01-15'),
        periode_debut: new Date('2024-01-01'),
        periode_fin: new Date('2024-12-31'),
        mode_paiement: 'especes',
        reference_paiement: null,
        numero_piece_comptable: 'COT-2024-001',
        adherent: {
          id: 1,
          prenom: 'Jean',
          nom: 'Dupont',
          code_barre: 'ADH001',
          adresse: '123 Rue de la Paix',
          code_postal: '75001',
          ville: 'Paris'
        },
        tarif: {
          id: 1,
          libelle: 'Cotisation annuelle adulte'
        }
      };

      // Mock des données de structure
      const structure = {
        nom_structure: 'Ludothèque Test',
        adresse: '456 Avenue du Jeu',
        code_postal: '75002',
        ville: 'Paris',
        siret: '12345678901234',
        telephone: '01 23 45 67 89',
        email: 'contact@ludotheque-test.fr',
        mentions_legales: 'Association loi 1901'
      };

      // Générer le PDF
      const result = await pdfService.genererRecuCotisation(cotisation, structure);

      // Vérifications
      expect(result).toHaveProperty('filepath');
      expect(result).toHaveProperty('filename');
      expect(result.filename).toMatch(/^recu_cotisation_1_\d+\.pdf$/);

      // Vérifier que le fichier existe
      expect(fs.existsSync(result.filepath)).toBe(true);

      // Vérifier que le fichier est bien un PDF (commence par %PDF)
      const fileBuffer = fs.readFileSync(result.filepath);
      const fileHeader = fileBuffer.toString('ascii', 0, 4);
      expect(fileHeader).toBe('%PDF');

      // Vérifier que le fichier a une taille raisonnable (> 1KB)
      const stats = fs.statSync(result.filepath);
      expect(stats.size).toBeGreaterThan(1024);

      // Nettoyer - supprimer le fichier de test
      fs.unlinkSync(result.filepath);
    }, 10000); // Timeout de 10 secondes pour la génération PDF

    it('devrait formater correctement les dates', () => {
      const date = new Date('2024-01-15');
      const formatted = pdfService.formatDate(date);
      expect(formatted).toBe('15/01/2024');
    });

    it('devrait formater correctement les montants', () => {
      const montant = 45.50;
      const formatted = pdfService.formatMontant(montant);
      expect(formatted).toBe('45,50 €');
    });

    it('devrait formater correctement les modes de paiement', () => {
      expect(pdfService.formatModePaiement('especes')).toBe('Espèces');
      expect(pdfService.formatModePaiement('cheque')).toBe('Chèque');
      expect(pdfService.formatModePaiement('carte_bancaire')).toBe('Carte bancaire');
      expect(pdfService.formatModePaiement('virement')).toBe('Virement');
      expect(pdfService.formatModePaiement('prelevement')).toBe('Prélèvement');
      expect(pdfService.formatModePaiement('autre')).toBe('Autre');
    });

    it('devrait gérer une cotisation sans adhérent', async () => {
      const cotisation = {
        id: 2,
        montant_base: 30.00,
        reduction_appliquee: 0.00,
        montant_paye: 30.00,
        date_paiement: new Date('2024-02-01'),
        periode_debut: new Date('2024-01-01'),
        periode_fin: new Date('2024-12-31'),
        mode_paiement: 'cheque',
        reference_paiement: 'CHQ-123456',
        numero_piece_comptable: 'COT-2024-002',
        adherent: null,
        tarif: {
          id: 2,
          libelle: 'Cotisation enfant'
        }
      };

      const structure = {
        nom_structure: 'Ludothèque Test',
        adresse: '456 Avenue du Jeu',
        code_postal: '75002',
        ville: 'Paris'
      };

      const result = await pdfService.genererRecuCotisation(cotisation, structure);

      expect(fs.existsSync(result.filepath)).toBe(true);

      // Nettoyer
      fs.unlinkSync(result.filepath);
    }, 10000);

    it('devrait créer le dossier uploads/recus s\'il n\'existe pas', () => {
      const recusDir = path.join(__dirname, '../../../uploads/recus');

      // Le constructeur du service devrait avoir créé le dossier
      expect(fs.existsSync(recusDir)).toBe(true);
    });
  });
});
