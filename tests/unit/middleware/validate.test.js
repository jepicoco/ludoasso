/**
 * Tests unitaires pour backend/middleware/validate.js
 * Tests des schemas de validation avec express-validator
 */

const { validate, schemas, common } = require('../../../backend/middleware/validate');
const { validationResult } = require('express-validator');

// Mock request/response
const mockRequest = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// Helper pour executer les validations
const runValidations = async (validations, req) => {
  await Promise.all(validations.map(validation => validation.run(req)));
  return validationResult(req);
};

describe('Middleware validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate() middleware function', () => {
    it('devrait passer au prochain middleware si aucune erreur', async () => {
      const req = mockRequest({ email: 'test@example.com', password: 'password123' });
      const res = mockResponse();
      const next = jest.fn();

      await validate(schemas.auth.login)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait retourner 400 avec erreurs formatees si validation echoue', async () => {
      const req = mockRequest({ email: 'invalid', password: '' });
      const res = mockResponse();
      const next = jest.fn();

      await validate(schemas.auth.login)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          message: 'Les donnees fournies sont invalides',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: expect.any(String),
              message: expect.any(String)
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('schemas.auth.login', () => {
    it('devrait valider un login correct', async () => {
      const req = mockRequest({
        email: 'user@example.com',
        password: 'mypassword'
      });

      const result = await runValidations(schemas.auth.login, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un email invalide', async () => {
      const req = mockRequest({
        email: 'not-an-email',
        password: 'mypassword'
      });

      const result = await runValidations(schemas.auth.login, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'email')).toBe(true);
    });

    it('devrait rejeter un email manquant', async () => {
      const req = mockRequest({
        password: 'mypassword'
      });

      const result = await runValidations(schemas.auth.login, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'email')).toBe(true);
    });

    it('devrait rejeter un mot de passe manquant', async () => {
      const req = mockRequest({
        email: 'user@example.com'
      });

      const result = await runValidations(schemas.auth.login, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'password' && e.msg === 'Mot de passe requis')).toBe(true);
    });

    it('devrait normaliser l\'email', async () => {
      const req = mockRequest({
        email: 'User@EXAMPLE.COM',
        password: 'mypassword'
      });

      await runValidations(schemas.auth.login, req);
      expect(req.body.email).toBe('user@example.com');
    });
  });

  describe('schemas.auth.changePassword', () => {
    it('devrait valider un changement de mot de passe correct', async () => {
      const req = mockRequest({
        currentPassword: 'oldpass',
        newPassword: 'NewPass123'
      });

      const result = await runValidations(schemas.auth.changePassword, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un nouveau mot de passe trop court', async () => {
      const req = mockRequest({
        currentPassword: 'oldpass',
        newPassword: 'Short1'
      });

      const result = await runValidations(schemas.auth.changePassword, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'newPassword' && e.msg.includes('8 caracteres'))).toBe(true);
    });

    it('devrait rejeter un mot de passe sans majuscule', async () => {
      const req = mockRequest({
        currentPassword: 'oldpass',
        newPassword: 'newpass123'
      });

      const result = await runValidations(schemas.auth.changePassword, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'newPassword' && e.msg.includes('majuscule'))).toBe(true);
    });

    it('devrait rejeter un mot de passe sans chiffre', async () => {
      const req = mockRequest({
        currentPassword: 'oldpass',
        newPassword: 'NewPassword'
      });

      const result = await runValidations(schemas.auth.changePassword, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'newPassword' && e.msg.includes('chiffre'))).toBe(true);
    });
  });

  describe('schemas.emprunt.create', () => {
    it('devrait valider un emprunt avec utilisateur_id', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        jeu_id: 5,
        date_retour_prevue: '2025-12-15'
      });

      const result = await runValidations(schemas.emprunt.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait valider un emprunt avec adherent_id (legacy)', async () => {
      const req = mockRequest({
        adherent_id: 1,
        livre_id: 3
      });

      const result = await runValidations(schemas.emprunt.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un utilisateur_id invalide', async () => {
      const req = mockRequest({
        utilisateur_id: 0,
        jeu_id: 5
      });

      const result = await runValidations(schemas.emprunt.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'utilisateur_id')).toBe(true);
    });

    it('devrait rejeter une date_retour_prevue invalide', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        jeu_id: 5,
        date_retour_prevue: 'not-a-date'
      });

      const result = await runValidations(schemas.emprunt.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'date_retour_prevue')).toBe(true);
    });

    it('devrait valider un commentaire optionnel', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        jeu_id: 5,
        commentaire: 'Emprunt pour un evenement'
      });

      const result = await runValidations(schemas.emprunt.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un commentaire trop long', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        jeu_id: 5,
        commentaire: 'a'.repeat(501)
      });

      const result = await runValidations(schemas.emprunt.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'commentaire')).toBe(true);
    });
  });

  describe('schemas.emprunt.update', () => {
    it('devrait valider une mise a jour d\'emprunt', async () => {
      const req = mockRequest(
        { statut: 'retourne' },
        { id: '1' }
      );

      const result = await runValidations(schemas.emprunt.update, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un ID invalide', async () => {
      const req = mockRequest(
        { statut: 'retourne' },
        { id: 'invalid' }
      );

      const result = await runValidations(schemas.emprunt.update, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'id')).toBe(true);
    });

    it('devrait rejeter un statut invalide', async () => {
      const req = mockRequest(
        { statut: 'perdu' },
        { id: '1' }
      );

      const result = await runValidations(schemas.emprunt.update, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'statut' && e.msg === 'Statut invalide')).toBe(true);
    });
  });

  describe('schemas.cotisation.create', () => {
    it('devrait valider une cotisation complete', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        tarif_cotisation_id: 1,
        montant: 25.50,
        mode_paiement_id: 1,
        periode_debut: '2025-01-01',
        periode_fin: '2025-12-31'
      });

      const result = await runValidations(schemas.cotisation.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un montant negatif', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        montant: -10
      });

      const result = await runValidations(schemas.cotisation.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'montant' && e.msg.includes('positif'))).toBe(true);
    });

    it('devrait rejeter un montant non numerique', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        montant: 'vingt'
      });

      const result = await runValidations(schemas.cotisation.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'montant')).toBe(true);
    });

    it('devrait accepter un montant de 0', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        montant: 0
      });

      const result = await runValidations(schemas.cotisation.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter des dates invalides', async () => {
      const req = mockRequest({
        utilisateur_id: 1,
        montant: 25,
        periode_debut: '2025-13-01',
        periode_fin: 'invalid-date'
      });

      const result = await runValidations(schemas.cotisation.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'periode_debut' || e.path === 'periode_fin')).toBe(true);
    });
  });

  describe('schemas.cotisation.update', () => {
    it('devrait valider une mise a jour de cotisation', async () => {
      const req = mockRequest(
        { montant: 30, statut: 'en_cours' },
        { id: '1' }
      );

      const result = await runValidations(schemas.cotisation.update, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un statut invalide', async () => {
      const req = mockRequest(
        { statut: 'payee' },
        { id: '1' }
      );

      const result = await runValidations(schemas.cotisation.update, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'statut' && e.msg === 'Statut invalide')).toBe(true);
    });
  });

  describe('schemas.utilisateur.create', () => {
    it('devrait valider un utilisateur complet', async () => {
      const req = mockRequest({
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@example.com',
        telephone: '0123456789',
        date_naissance: '1990-05-15',
        adresse: '10 rue de la Paix',
        code_postal: '75001',
        ville: 'Paris'
      });

      const result = await runValidations(schemas.utilisateur.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter si nom manquant', async () => {
      const req = mockRequest({
        prenom: 'Jean',
        email: 'jean@example.com'
      });

      const result = await runValidations(schemas.utilisateur.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'nom')).toBe(true);
    });

    it('devrait rejeter si prenom manquant', async () => {
      const req = mockRequest({
        nom: 'Dupont',
        email: 'jean@example.com'
      });

      const result = await runValidations(schemas.utilisateur.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'prenom')).toBe(true);
    });

    it('devrait rejeter un email invalide', async () => {
      const req = mockRequest({
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'not-an-email'
      });

      const result = await runValidations(schemas.utilisateur.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'email')).toBe(true);
    });

    it('devrait rejeter un telephone invalide', async () => {
      const req = mockRequest({
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean@example.com',
        telephone: 'abc'
      });

      const result = await runValidations(schemas.utilisateur.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'telephone')).toBe(true);
    });

    it('devrait accepter un telephone au format international', async () => {
      const req = mockRequest({
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean@example.com',
        telephone: '+33 1 23 45 67 89'
      });

      const result = await runValidations(schemas.utilisateur.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait trim les espaces dans les champs texte', async () => {
      const req = mockRequest({
        nom: '  Dupont  ',
        prenom: '  Jean  ',
        email: 'jean@example.com',
        ville: '  Paris  '
      });

      await runValidations(schemas.utilisateur.create, req);
      expect(req.body.nom).toBe('Dupont');
      expect(req.body.prenom).toBe('Jean');
      expect(req.body.ville).toBe('Paris');
    });

    it('devrait rejeter un nom trop long', async () => {
      const req = mockRequest({
        nom: 'a'.repeat(101),
        prenom: 'Jean',
        email: 'jean@example.com'
      });

      const result = await runValidations(schemas.utilisateur.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'nom' && e.msg.includes('100'))).toBe(true);
    });
  });

  describe('schemas.utilisateur.update', () => {
    it('devrait valider une mise a jour partielle', async () => {
      const req = mockRequest(
        { nom: 'Martin', statut: 'actif' },
        { id: '1' }
      );

      const result = await runValidations(schemas.utilisateur.update, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un statut invalide', async () => {
      const req = mockRequest(
        { statut: 'bloque' },
        { id: '1' }
      );

      const result = await runValidations(schemas.utilisateur.update, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'statut' && e.msg === 'Statut invalide')).toBe(true);
    });
  });

  describe('schemas.jeu.create', () => {
    it('devrait valider un jeu complet', async () => {
      const req = mockRequest({
        nom: 'Catan',
        nb_joueurs_min: 3,
        nb_joueurs_max: 4,
        age_min: 10,
        duree_partie: 90,
        description: 'Jeu de strategie'
      });

      const result = await runValidations(schemas.jeu.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un nom manquant', async () => {
      const req = mockRequest({
        nb_joueurs_min: 2
      });

      const result = await runValidations(schemas.jeu.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'nom')).toBe(true);
    });

    it('devrait rejeter un nombre de joueurs negatif', async () => {
      const req = mockRequest({
        nom: 'Catan',
        nb_joueurs_min: -1
      });

      const result = await runValidations(schemas.jeu.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'nb_joueurs_min')).toBe(true);
    });

    it('devrait accepter age_min de 0', async () => {
      const req = mockRequest({
        nom: 'Jeu Bebe',
        age_min: 0
      });

      const result = await runValidations(schemas.jeu.create, req);
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('schemas.livre.create', () => {
    it('devrait valider un livre complet', async () => {
      const req = mockRequest({
        titre: 'Le Seigneur des Anneaux',
        isbn: '9780395193952',
        annee_publication: 1954,
        resume: 'Une grande aventure en Terre du Milieu'
      });

      const result = await runValidations(schemas.livre.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter un titre manquant', async () => {
      const req = mockRequest({
        isbn: '978-0-395-19395-4'
      });

      const result = await runValidations(schemas.livre.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'titre')).toBe(true);
    });

    it('devrait rejeter un ISBN invalide', async () => {
      const req = mockRequest({
        titre: 'Mon Livre',
        isbn: '123'
      });

      const result = await runValidations(schemas.livre.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'isbn' && e.msg === 'ISBN invalide')).toBe(true);
    });

    it('devrait rejeter une annee trop ancienne', async () => {
      const req = mockRequest({
        titre: 'Mon Livre',
        annee_publication: 999
      });

      const result = await runValidations(schemas.livre.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'annee_publication')).toBe(true);
    });

    it('devrait rejeter une annee dans le futur', async () => {
      const currentYear = new Date().getFullYear();
      const req = mockRequest({
        titre: 'Mon Livre',
        annee_publication: currentYear + 2
      });

      const result = await runValidations(schemas.livre.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'annee_publication')).toBe(true);
    });
  });

  describe('schemas.film.create', () => {
    it('devrait valider un film complet', async () => {
      const req = mockRequest({
        titre: 'Inception',
        annee: 2010,
        duree: 148,
        synopsis: 'Un voleur dans les reves'
      });

      const result = await runValidations(schemas.film.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter une annee avant 1888 (premier film)', async () => {
      const req = mockRequest({
        titre: 'Film Ancien',
        annee: 1800
      });

      const result = await runValidations(schemas.film.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'annee')).toBe(true);
    });

    it('devrait accepter un film futur (jusqu\'a +5 ans)', async () => {
      const currentYear = new Date().getFullYear();
      const req = mockRequest({
        titre: 'Film Futur',
        annee: currentYear + 4
      });

      const result = await runValidations(schemas.film.create, req);
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('schemas.disque.create', () => {
    it('devrait valider un disque complet', async () => {
      const req = mockRequest({
        titre: 'Abbey Road',
        annee: 1969,
        label: 'Apple Records'
      });

      const result = await runValidations(schemas.disque.create, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('devrait rejeter une annee avant 1900', async () => {
      const req = mockRequest({
        titre: 'Vieux Disque',
        annee: 1850
      });

      const result = await runValidations(schemas.disque.create, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'annee')).toBe(true);
    });
  });

  describe('common validators', () => {
    describe('pagination', () => {
      it('devrait valider page et limit corrects', async () => {
        const req = mockRequest({}, {}, { page: '2', limit: '20' });
        const validations = [common.page, common.limit];

        const result = await runValidations(validations, req);
        expect(result.isEmpty()).toBe(true);
      });

      it('devrait rejeter page = 0', async () => {
        const req = mockRequest({}, {}, { page: '0' });
        const validations = [common.page];

        const result = await runValidations(validations, req);
        expect(result.isEmpty()).toBe(false);
      });

      it('devrait rejeter limit > 100', async () => {
        const req = mockRequest({}, {}, { limit: '101' });
        const validations = [common.limit];

        const result = await runValidations(validations, req);
        expect(result.isEmpty()).toBe(false);
      });

      it('devrait accepter absence de page/limit (optionnels)', async () => {
        const req = mockRequest({}, {}, {});
        const validations = [common.page, common.limit];

        const result = await runValidations(validations, req);
        expect(result.isEmpty()).toBe(true);
      });
    });

    describe('idParam', () => {
      it('devrait valider un ID positif', async () => {
        const req = mockRequest({}, { id: '42' });
        const validations = [common.idParam];

        const result = await runValidations(validations, req);
        expect(result.isEmpty()).toBe(true);
      });

      it('devrait rejeter ID = 0', async () => {
        const req = mockRequest({}, { id: '0' });
        const validations = [common.idParam];

        const result = await runValidations(validations, req);
        expect(result.isEmpty()).toBe(false);
      });

      it('devrait rejeter un ID negatif', async () => {
        const req = mockRequest({}, { id: '-5' });
        const validations = [common.idParam];

        const result = await runValidations(validations, req);
        expect(result.isEmpty()).toBe(false);
      });

      it('devrait rejeter un ID non numerique', async () => {
        const req = mockRequest({}, { id: 'abc' });
        const validations = [common.idParam];

        const result = await runValidations(validations, req);
        expect(result.isEmpty()).toBe(false);
      });
    });
  });
});
