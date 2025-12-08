/**
 * Tests unitaires pour le middleware checkRole
 * Controle d'acces base sur les roles et modules
 */

const {
  checkRole,
  checkMinRole,
  checkModuleAccess,
  checkAnyModuleAccess,
  getUserAllowedModules,
  hasModuleAccess,
  isAdmin,
  isGestionnaire,
  isAgent,
  isBenevole,
  isComptable,
  getRoleLevel,
  hasRoleLevel,
  getModuleMapping,
  getModuleFromRoute,
  ROLE_HIERARCHY,
  MODULES,
  MODULE_MAPPING
} = require('../../../backend/middleware/checkRole');

// Helper pour creer des mocks req/res/next
const createMocks = (user = null) => {
  const req = { user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('checkRole Middleware', () => {
  describe('checkRole()', () => {
    it('devrait retourner 401 si user non authentifie', () => {
      const { req, res, next } = createMocks(null);
      const middleware = checkRole(['administrateur']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Non authentifié'
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si role non defini', () => {
      const { req, res, next } = createMocks({ id: 1 }); // user sans role
      const middleware = checkRole(['administrateur']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Accès refusé',
        message: 'Rôle utilisateur non défini'
      }));
    });

    it('devrait retourner 403 si role non autorise', () => {
      const { req, res, next } = createMocks({ id: 1, role: 'benevole' });
      const middleware = checkRole(['administrateur']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Accès refusé',
        required: ['administrateur'],
        current: 'benevole'
      }));
    });

    it('devrait appeler next() si role autorise', () => {
      const { req, res, next } = createMocks({ id: 1, role: 'administrateur' });
      const middleware = checkRole(['administrateur']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait accepter plusieurs roles autorises', () => {
      const { req, res, next } = createMocks({ id: 1, role: 'gestionnaire' });
      const middleware = checkRole(['administrateur', 'gestionnaire', 'comptable']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkMinRole()', () => {
    it('devrait retourner 401 si user non authentifie', () => {
      const { req, res, next } = createMocks(null);
      const middleware = checkMinRole('benevole');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('devrait retourner 403 si niveau insuffisant', () => {
      const { req, res, next } = createMocks({ id: 1, role: 'usager' });
      const middleware = checkMinRole('benevole');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Niveau minimum requis: benevole'
      }));
    });

    it('devrait appeler next() si niveau suffisant', () => {
      const { req, res, next } = createMocks({ id: 1, role: 'gestionnaire' });
      const middleware = checkMinRole('benevole');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('devrait accepter le niveau exact', () => {
      const { req, res, next } = createMocks({ id: 1, role: 'benevole' });
      const middleware = checkMinRole('benevole');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkModuleAccess()', () => {
    it('devrait retourner 401 si user non authentifie', () => {
      const { req, res, next } = createMocks(null);
      const middleware = checkModuleAccess('ludotheque');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('devrait toujours autoriser administrateur', () => {
      const { req, res, next } = createMocks({
        id: 1,
        role: 'administrateur',
        modules_autorises: [] // meme vide, admin a acces
      });
      const middleware = checkModuleAccess('ludotheque');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('devrait autoriser si modules_autorises est null', () => {
      const { req, res, next } = createMocks({
        id: 1,
        role: 'benevole',
        modules_autorises: null
      });
      const middleware = checkModuleAccess('ludotheque');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('devrait autoriser si modules_autorises est vide', () => {
      const { req, res, next } = createMocks({
        id: 1,
        role: 'benevole',
        modules_autorises: []
      });
      const middleware = checkModuleAccess('filmotheque');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('devrait autoriser si module dans la liste', () => {
      const { req, res, next } = createMocks({
        id: 1,
        role: 'benevole',
        modules_autorises: ['ludotheque', 'bibliotheque']
      });
      const middleware = checkModuleAccess('ludotheque');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('devrait refuser si module pas dans la liste', () => {
      const { req, res, next } = createMocks({
        id: 1,
        role: 'benevole',
        modules_autorises: ['ludotheque']
      });
      const middleware = checkModuleAccess('filmotheque');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        required_module: 'filmotheque',
        allowed_modules: ['ludotheque']
      }));
    });
  });

  describe('checkAnyModuleAccess()', () => {
    it('devrait autoriser si au moins un module est accessible', () => {
      const { req, res, next } = createMocks({
        id: 1,
        role: 'benevole',
        modules_autorises: ['ludotheque']
      });
      const middleware = checkAnyModuleAccess(['ludotheque', 'bibliotheque']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('devrait refuser si aucun module accessible', () => {
      const { req, res, next } = createMocks({
        id: 1,
        role: 'benevole',
        modules_autorises: ['discotheque']
      });
      const middleware = checkAnyModuleAccess(['ludotheque', 'bibliotheque']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('Helper Functions', () => {
  describe('getUserAllowedModules()', () => {
    it('devrait retourner null pour administrateur', () => {
      expect(getUserAllowedModules({ role: 'administrateur' })).toBeNull();
    });

    it('devrait retourner null si modules_autorises vide', () => {
      expect(getUserAllowedModules({ role: 'benevole', modules_autorises: [] })).toBeNull();
    });

    it('devrait retourner la liste si definie', () => {
      const modules = ['ludotheque', 'bibliotheque'];
      expect(getUserAllowedModules({ role: 'benevole', modules_autorises: modules })).toEqual(modules);
    });
  });

  describe('hasModuleAccess()', () => {
    it('devrait retourner false si user null', () => {
      expect(hasModuleAccess(null, 'ludotheque')).toBe(false);
    });

    it('devrait retourner true pour admin', () => {
      expect(hasModuleAccess({ role: 'administrateur' }, 'ludotheque')).toBe(true);
    });
  });

  describe('getRoleLevel()', () => {
    it('devrait retourner le niveau correct pour chaque role', () => {
      expect(getRoleLevel('usager')).toBe(0);
      expect(getRoleLevel('benevole')).toBe(1);
      expect(getRoleLevel('agent')).toBe(2);
      expect(getRoleLevel('gestionnaire')).toBe(3);
      expect(getRoleLevel('comptable')).toBe(4);
      expect(getRoleLevel('administrateur')).toBe(5);
    });

    it('devrait retourner 0 pour role inconnu', () => {
      expect(getRoleLevel('inconnu')).toBe(0);
      expect(getRoleLevel(undefined)).toBe(0);
    });
  });

  describe('hasRoleLevel()', () => {
    it('devrait comparer correctement les niveaux', () => {
      expect(hasRoleLevel('administrateur', 'benevole')).toBe(true);
      expect(hasRoleLevel('benevole', 'administrateur')).toBe(false);
      expect(hasRoleLevel('gestionnaire', 'gestionnaire')).toBe(true);
    });
  });

  describe('getModuleMapping()', () => {
    it('devrait retourner le mapping correct', () => {
      expect(getModuleMapping('ludotheque')).toEqual({
        table: 'jeux',
        field: 'jeu_id',
        route: 'jeux'
      });
    });

    it('devrait retourner null pour module inconnu', () => {
      expect(getModuleMapping('inconnu')).toBeNull();
    });
  });

  describe('getModuleFromRoute()', () => {
    it('devrait retrouver le module depuis la route', () => {
      expect(getModuleFromRoute('jeux')).toBe('ludotheque');
      expect(getModuleFromRoute('livres')).toBe('bibliotheque');
      expect(getModuleFromRoute('films')).toBe('filmotheque');
      expect(getModuleFromRoute('disques')).toBe('discotheque');
    });

    it('devrait retourner null pour route inconnue', () => {
      expect(getModuleFromRoute('inconnu')).toBeNull();
    });
  });
});

describe('Role Middleware Factories', () => {
  describe('isAdmin()', () => {
    it('devrait creer un middleware qui accepte seulement administrateur', () => {
      const middleware = isAdmin();
      const { req, res, next } = createMocks({ id: 1, role: 'administrateur' });

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('devrait refuser les autres roles', () => {
      const middleware = isAdmin();
      const { req, res, next } = createMocks({ id: 1, role: 'gestionnaire' });

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('isGestionnaire()', () => {
    it('devrait accepter gestionnaire et au-dessus', () => {
      const middleware = isGestionnaire();

      ['gestionnaire', 'comptable', 'administrateur'].forEach(role => {
        const { req, res, next } = createMocks({ id: 1, role });
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });

    it('devrait refuser agent et en-dessous', () => {
      const middleware = isGestionnaire();

      ['usager', 'benevole', 'agent'].forEach(role => {
        const { req, res, next } = createMocks({ id: 1, role });
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('isBenevole()', () => {
    it('devrait accepter benevole et au-dessus', () => {
      const middleware = isBenevole();

      ['benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'].forEach(role => {
        const { req, res, next } = createMocks({ id: 1, role });
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });

    it('devrait refuser usager', () => {
      const middleware = isBenevole();
      const { req, res, next } = createMocks({ id: 1, role: 'usager' });

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('isComptable()', () => {
    it('devrait accepter comptable et administrateur', () => {
      const middleware = isComptable();

      ['comptable', 'administrateur'].forEach(role => {
        const { req, res, next } = createMocks({ id: 1, role });
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });

    it('devrait refuser gestionnaire et en-dessous', () => {
      const middleware = isComptable();

      ['usager', 'benevole', 'agent', 'gestionnaire'].forEach(role => {
        const { req, res, next } = createMocks({ id: 1, role });
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('isAgent()', () => {
    it('devrait accepter agent et au-dessus', () => {
      const middleware = isAgent();

      ['agent', 'gestionnaire', 'comptable', 'administrateur'].forEach(role => {
        const { req, res, next } = createMocks({ id: 1, role });
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });

    it('devrait refuser benevole et usager', () => {
      const middleware = isAgent();

      ['usager', 'benevole'].forEach(role => {
        const { req, res, next } = createMocks({ id: 1, role });
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });
});

describe('Constants', () => {
  describe('ROLE_HIERARCHY', () => {
    it('devrait avoir tous les roles definis', () => {
      expect(Object.keys(ROLE_HIERARCHY)).toEqual([
        'usager', 'benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'
      ]);
    });

    it('devrait avoir des niveaux consecutifs', () => {
      const levels = Object.values(ROLE_HIERARCHY).sort((a, b) => a - b);
      expect(levels).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });

  describe('MODULES', () => {
    it('devrait contenir exactement 4 modules', () => {
      expect(MODULES).toHaveLength(4);
    });

    it('devrait contenir les modules attendus', () => {
      expect(MODULES).toContain('ludotheque');
      expect(MODULES).toContain('bibliotheque');
      expect(MODULES).toContain('filmotheque');
      expect(MODULES).toContain('discotheque');
    });
  });

  describe('MODULE_MAPPING', () => {
    it('devrait avoir un mapping pour chaque module', () => {
      MODULES.forEach(module => {
        expect(MODULE_MAPPING[module]).toBeDefined();
        expect(MODULE_MAPPING[module]).toHaveProperty('table');
        expect(MODULE_MAPPING[module]).toHaveProperty('field');
        expect(MODULE_MAPPING[module]).toHaveProperty('route');
      });
    });
  });
});
