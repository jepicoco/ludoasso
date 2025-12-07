/**
 * Tests unitaires pour le service de comptabilité
 * Tests des méthodes helpers qui ne nécessitent pas d'accès à la base de données
 */

const ComptabiliteService = require('../../../backend/services/comptabiliteService');

describe('ComptabiliteService', () => {

  describe('getJournalLibelle', () => {
    it('devrait retourner le libellé correct pour VT (ventes)', () => {
      expect(ComptabiliteService.getJournalLibelle('VT')).toBe('Journal des ventes');
    });

    it('devrait retourner le libellé correct pour AC (achats)', () => {
      expect(ComptabiliteService.getJournalLibelle('AC')).toBe('Journal des achats');
    });

    it('devrait retourner le libellé correct pour BQ (banque)', () => {
      expect(ComptabiliteService.getJournalLibelle('BQ')).toBe('Journal de banque');
    });

    it('devrait retourner le libellé correct pour CA (caisse)', () => {
      expect(ComptabiliteService.getJournalLibelle('CA')).toBe('Journal de caisse');
    });

    it('devrait retourner le libellé correct pour OD (opérations diverses)', () => {
      expect(ComptabiliteService.getJournalLibelle('OD')).toBe('Journal des opérations diverses');
    });

    it('devrait retourner le libellé correct pour AN (à-nouveaux)', () => {
      expect(ComptabiliteService.getJournalLibelle('AN')).toBe('Journal des à-nouveaux');
    });

    it('devrait retourner un libellé par défaut pour un journal inconnu', () => {
      expect(ComptabiliteService.getJournalLibelle('XX')).toBe('Journal XX');
      expect(ComptabiliteService.getJournalLibelle('ZZ')).toBe('Journal ZZ');
    });
  });

  describe('getCompteLibelle', () => {
    describe('comptes de trésorerie', () => {
      it('devrait retourner Banque pour 512', () => {
        expect(ComptabiliteService.getCompteLibelle('512')).toBe('Banque');
      });

      it('devrait retourner Compte courant pour 5121', () => {
        expect(ComptabiliteService.getCompteLibelle('5121')).toBe('Compte courant');
      });

      it('devrait retourner Livret A pour 5122', () => {
        expect(ComptabiliteService.getCompteLibelle('5122')).toBe('Livret A');
      });

      it('devrait retourner Caisse pour 530', () => {
        expect(ComptabiliteService.getCompteLibelle('530')).toBe('Caisse');
      });

      it('devrait retourner Caisse principale pour 5300', () => {
        expect(ComptabiliteService.getCompteLibelle('5300')).toBe('Caisse principale');
      });
    });

    describe('comptes de tiers', () => {
      it('devrait retourner Clients pour 411', () => {
        expect(ComptabiliteService.getCompteLibelle('411')).toBe('Clients');
      });

      it('devrait retourner Clients divers pour 4110', () => {
        expect(ComptabiliteService.getCompteLibelle('4110')).toBe('Clients divers');
      });

      it('devrait retourner Autres comptes débiteurs ou créditeurs pour 467', () => {
        expect(ComptabiliteService.getCompteLibelle('467')).toBe('Autres comptes débiteurs ou créditeurs');
      });
    });

    describe('comptes de produits', () => {
      it('devrait retourner Prestations de services pour 706', () => {
        expect(ComptabiliteService.getCompteLibelle('706')).toBe('Prestations de services');
      });

      it('devrait retourner Cotisations pour 7061', () => {
        expect(ComptabiliteService.getCompteLibelle('7061')).toBe('Cotisations');
      });

      it('devrait retourner Locations pour 7062', () => {
        expect(ComptabiliteService.getCompteLibelle('7062')).toBe('Locations');
      });

      it('devrait retourner Produits divers de gestion courante pour 758', () => {
        expect(ComptabiliteService.getCompteLibelle('758')).toBe('Produits divers de gestion courante');
      });
    });

    describe('comptes de TVA', () => {
      it('devrait retourner TVA collectée pour 4457', () => {
        expect(ComptabiliteService.getCompteLibelle('4457')).toBe('TVA collectée');
      });

      it('devrait retourner TVA déductible pour 4456', () => {
        expect(ComptabiliteService.getCompteLibelle('4456')).toBe('TVA déductible');
      });
    });

    describe('recherche de compte parent', () => {
      it('devrait trouver le compte parent 706 pour 70699', () => {
        // 70699 n'existe pas, mais 706 existe
        expect(ComptabiliteService.getCompteLibelle('70699')).toBe('Prestations de services');
      });

      it('devrait trouver le compte parent 512 pour 51299', () => {
        expect(ComptabiliteService.getCompteLibelle('51299')).toBe('Banque');
      });
    });

    describe('compte inconnu', () => {
      it('devrait retourner un libellé par défaut pour un compte totalement inconnu', () => {
        expect(ComptabiliteService.getCompteLibelle('999999')).toBe('Compte 999999');
      });

      it('devrait retourner un libellé par défaut pour un autre compte inconnu', () => {
        expect(ComptabiliteService.getCompteLibelle('888')).toBe('Compte 888');
      });
    });
  });

  describe('logique métier', () => {
    it('devrait avoir des méthodes statiques définies', () => {
      expect(typeof ComptabiliteService.getJournalLibelle).toBe('function');
      expect(typeof ComptabiliteService.getCompteLibelle).toBe('function');
      expect(typeof ComptabiliteService.genererEcrituresCotisation).toBe('function');
      expect(typeof ComptabiliteService.cotisationAEcritures).toBe('function');
      expect(typeof ComptabiliteService.supprimerEcrituresCotisation).toBe('function');
      expect(typeof ComptabiliteService.getEcrituresCotisation).toBe('function');
      expect(typeof ComptabiliteService.genererEcrituresMultiples).toBe('function');
    });

    it('devrait avoir un plan comptable cohérent', () => {
      // Les comptes de trésorerie commencent par 5
      expect(ComptabiliteService.getCompteLibelle('512')).toContain('Banque');
      expect(ComptabiliteService.getCompteLibelle('530')).toContain('Caisse');

      // Les comptes de produits commencent par 7
      expect(ComptabiliteService.getCompteLibelle('706')).toContain('service');
      expect(ComptabiliteService.getCompteLibelle('7061')).toContain('Cotisation');

      // Les comptes de tiers commencent par 4
      expect(ComptabiliteService.getCompteLibelle('411')).toContain('Client');
    });

    it('tous les journaux doivent avoir un libellé contenant "Journal"', () => {
      const journaux = ['VT', 'AC', 'BQ', 'CA', 'OD', 'AN', 'XX'];
      journaux.forEach(code => {
        expect(ComptabiliteService.getJournalLibelle(code)).toContain('Journal');
      });
    });
  });
});
