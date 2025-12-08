/**
 * Tests unitaires pour statsController
 * Gestion des statistiques multi-modules avec droits d'acces
 */

const { ROLE_HIERARCHY, MODULES, MODULE_MAPPING, getUserAllowedModules, hasModuleAccess, hasRoleLevel } = require('../../../backend/middleware/checkRole');

// Mock Sequelize et les modeles
jest.mock('../../../backend/models', () => {
  const mockFindAll = jest.fn();
  const mockCount = jest.fn();

  return {
    Utilisateur: { findAll: mockFindAll },
    Jeu: { findAll: mockFindAll },
    Livre: { findAll: mockFindAll },
    Film: { findAll: mockFindAll },
    Disque: { findAll: mockFindAll },
    Emprunt: { findAll: mockFindAll, count: mockCount },
    Cotisation: { findAll: mockFindAll },
    sequelize: {
      fn: jest.fn((name, ...args) => ({ fn: name, args })),
      col: jest.fn((name) => ({ col: name })),
      literal: jest.fn((str) => ({ literal: str }))
    },
    Op: {
      ne: Symbol('ne'),
      lt: Symbol('lt'),
      gte: Symbol('gte'),
      in: Symbol('in'),
      or: Symbol('or'),
      between: Symbol('between')
    }
  };
});

describe('statsController - Helpers checkRole', () => {
  describe('ROLE_HIERARCHY', () => {
    it('devrait definir la hierarchie correcte des roles', () => {
      expect(ROLE_HIERARCHY.usager).toBe(0);
      expect(ROLE_HIERARCHY.benevole).toBe(1);
      expect(ROLE_HIERARCHY.agent).toBe(2);
      expect(ROLE_HIERARCHY.gestionnaire).toBe(3);
      expect(ROLE_HIERARCHY.comptable).toBe(4);
      expect(ROLE_HIERARCHY.administrateur).toBe(5);
    });

    it('devrait avoir administrateur au niveau le plus eleve', () => {
      const maxLevel = Math.max(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY.administrateur).toBe(maxLevel);
    });
  });

  describe('MODULES', () => {
    it('devrait contenir les 4 modules principaux', () => {
      expect(MODULES).toContain('ludotheque');
      expect(MODULES).toContain('bibliotheque');
      expect(MODULES).toContain('filmotheque');
      expect(MODULES).toContain('discotheque');
      expect(MODULES.length).toBe(4);
    });
  });

  describe('MODULE_MAPPING', () => {
    it('devrait mapper correctement ludotheque vers jeux', () => {
      expect(MODULE_MAPPING.ludotheque).toEqual({
        table: 'jeux',
        field: 'jeu_id',
        route: 'jeux'
      });
    });

    it('devrait mapper correctement bibliotheque vers livres', () => {
      expect(MODULE_MAPPING.bibliotheque).toEqual({
        table: 'livres',
        field: 'livre_id',
        route: 'livres'
      });
    });

    it('devrait mapper correctement filmotheque vers films', () => {
      expect(MODULE_MAPPING.filmotheque).toEqual({
        table: 'films',
        field: 'film_id',
        route: 'films'
      });
    });

    it('devrait mapper correctement discotheque vers disques', () => {
      expect(MODULE_MAPPING.discotheque).toEqual({
        table: 'disques',
        field: 'disque_id',
        route: 'disques'
      });
    });
  });

  describe('getUserAllowedModules', () => {
    it('devrait retourner null pour un administrateur (acces total)', () => {
      const user = { role: 'administrateur', modules_autorises: ['ludotheque'] };
      expect(getUserAllowedModules(user)).toBeNull();
    });

    it('devrait retourner null si modules_autorises est null', () => {
      const user = { role: 'benevole', modules_autorises: null };
      expect(getUserAllowedModules(user)).toBeNull();
    });

    it('devrait retourner null si modules_autorises est vide', () => {
      const user = { role: 'benevole', modules_autorises: [] };
      expect(getUserAllowedModules(user)).toBeNull();
    });

    it('devrait retourner la liste des modules autorises', () => {
      const user = { role: 'benevole', modules_autorises: ['ludotheque', 'bibliotheque'] };
      expect(getUserAllowedModules(user)).toEqual(['ludotheque', 'bibliotheque']);
    });

    it('devrait retourner un tableau vide si user est null', () => {
      expect(getUserAllowedModules(null)).toEqual([]);
    });
  });

  describe('hasModuleAccess', () => {
    it('devrait retourner true pour administrateur', () => {
      const user = { role: 'administrateur', modules_autorises: [] };
      expect(hasModuleAccess(user, 'ludotheque')).toBe(true);
      expect(hasModuleAccess(user, 'bibliotheque')).toBe(true);
    });

    it('devrait retourner true si modules_autorises est null (acces total)', () => {
      const user = { role: 'benevole', modules_autorises: null };
      expect(hasModuleAccess(user, 'ludotheque')).toBe(true);
    });

    it('devrait retourner true si modules_autorises est vide (acces total)', () => {
      const user = { role: 'benevole', modules_autorises: [] };
      expect(hasModuleAccess(user, 'filmotheque')).toBe(true);
    });

    it('devrait retourner true si le module est dans la liste autorisee', () => {
      const user = { role: 'benevole', modules_autorises: ['ludotheque', 'bibliotheque'] };
      expect(hasModuleAccess(user, 'ludotheque')).toBe(true);
      expect(hasModuleAccess(user, 'bibliotheque')).toBe(true);
    });

    it('devrait retourner false si le module n\'est pas dans la liste autorisee', () => {
      const user = { role: 'benevole', modules_autorises: ['ludotheque'] };
      expect(hasModuleAccess(user, 'bibliotheque')).toBe(false);
      expect(hasModuleAccess(user, 'filmotheque')).toBe(false);
    });

    it('devrait retourner false si user est null', () => {
      expect(hasModuleAccess(null, 'ludotheque')).toBe(false);
    });
  });

  describe('hasRoleLevel', () => {
    it('devrait retourner true si le role a le niveau requis', () => {
      expect(hasRoleLevel('administrateur', 'comptable')).toBe(true);
      expect(hasRoleLevel('administrateur', 'administrateur')).toBe(true);
      expect(hasRoleLevel('comptable', 'benevole')).toBe(true);
      expect(hasRoleLevel('gestionnaire', 'agent')).toBe(true);
      expect(hasRoleLevel('benevole', 'benevole')).toBe(true);
    });

    it('devrait retourner false si le role n\'a pas le niveau requis', () => {
      expect(hasRoleLevel('benevole', 'gestionnaire')).toBe(false);
      expect(hasRoleLevel('agent', 'comptable')).toBe(false);
      expect(hasRoleLevel('usager', 'benevole')).toBe(false);
    });

    it('devrait retourner 0 pour un role inconnu', () => {
      expect(hasRoleLevel('inconnu', 'usager')).toBe(true);
      expect(hasRoleLevel('inconnu', 'benevole')).toBe(false);
    });
  });
});

describe('statsController - Logique metier', () => {
  // Helpers similaires a ceux du controller
  const getAccessibleModules = (user, requestedModules = null) => {
    const allowedModules = getUserAllowedModules(user);
    if (allowedModules === null) {
      return requestedModules || MODULES;
    }
    if (requestedModules) {
      return requestedModules.filter(m => allowedModules.includes(m));
    }
    return allowedModules;
  };

  describe('getAccessibleModules', () => {
    it('devrait retourner tous les modules pour administrateur', () => {
      const user = { role: 'administrateur' };
      const result = getAccessibleModules(user);
      expect(result).toEqual(MODULES);
    });

    it('devrait retourner les modules demandes pour administrateur', () => {
      const user = { role: 'administrateur' };
      const result = getAccessibleModules(user, ['ludotheque', 'bibliotheque']);
      expect(result).toEqual(['ludotheque', 'bibliotheque']);
    });

    it('devrait filtrer les modules non autorises pour benevole', () => {
      const user = { role: 'benevole', modules_autorises: ['ludotheque', 'bibliotheque'] };
      const result = getAccessibleModules(user, ['ludotheque', 'filmotheque']);
      expect(result).toEqual(['ludotheque']);
    });

    it('devrait retourner les modules autorises si pas de demande specifique', () => {
      const user = { role: 'benevole', modules_autorises: ['ludotheque'] };
      const result = getAccessibleModules(user);
      expect(result).toEqual(['ludotheque']);
    });

    it('devrait retourner tous les modules si modules_autorises est vide', () => {
      const user = { role: 'benevole', modules_autorises: [] };
      const result = getAccessibleModules(user);
      expect(result).toEqual(MODULES);
    });
  });

  describe('buildModuleWhereClause', () => {
    const { Op } = require('../../../backend/models');

    const buildModuleWhereClause = (modules) => {
      const conditions = [];
      if (modules.includes('ludotheque')) {
        conditions.push({ jeu_id: { [Op.ne]: null } });
      }
      if (modules.includes('bibliotheque')) {
        conditions.push({ livre_id: { [Op.ne]: null } });
      }
      if (modules.includes('filmotheque')) {
        conditions.push({ film_id: { [Op.ne]: null } });
      }
      if (modules.includes('discotheque')) {
        conditions.push({ cd_id: { [Op.ne]: null } });
      }
      return conditions.length > 0 ? { [Op.or]: conditions } : {};
    };

    it('devrait construire une clause OR pour plusieurs modules', () => {
      const result = buildModuleWhereClause(['ludotheque', 'bibliotheque']);
      // Op.or est un Symbol, on verifie qu'il y a une cle Symbol dans le resultat
      const symbolKeys = Object.getOwnPropertySymbols(result);
      expect(symbolKeys.length).toBe(1);
      expect(result[symbolKeys[0]]).toHaveLength(2);
    });

    it('devrait construire une clause pour un seul module', () => {
      const result = buildModuleWhereClause(['ludotheque']);
      // Op.or est un Symbol, on verifie qu'il y a une cle Symbol dans le resultat
      const symbolKeys = Object.getOwnPropertySymbols(result);
      expect(symbolKeys.length).toBe(1);
      expect(result[symbolKeys[0]]).toHaveLength(1);
    });

    it('devrait retourner un objet vide si aucun module', () => {
      const result = buildModuleWhereClause([]);
      expect(result).toEqual({});
    });

    it('devrait inclure tous les modules si tous demandes', () => {
      const result = buildModuleWhereClause(MODULES);
      expect(result[Op.or]).toHaveLength(4);
    });
  });

  describe('getModuleLibelle', () => {
    const getModuleLibelle = (moduleCode) => {
      const libelles = {
        'ludotheque': 'Ludotheque',
        'bibliotheque': 'Bibliotheque',
        'filmotheque': 'Filmotheque',
        'discotheque': 'Discotheque'
      };
      return libelles[moduleCode] || moduleCode;
    };

    it('devrait retourner le libelle correct pour chaque module', () => {
      expect(getModuleLibelle('ludotheque')).toBe('Ludotheque');
      expect(getModuleLibelle('bibliotheque')).toBe('Bibliotheque');
      expect(getModuleLibelle('filmotheque')).toBe('Filmotheque');
      expect(getModuleLibelle('discotheque')).toBe('Discotheque');
    });

    it('devrait retourner le code si libelle inconnu', () => {
      expect(getModuleLibelle('autre')).toBe('autre');
    });
  });
});

describe('statsController - Calculs statistiques', () => {
  describe('Calcul taux retard', () => {
    const calculateTauxRetard = (enCours, enRetard) => {
      return enCours > 0 ? ((enRetard / enCours) * 100).toFixed(2) : 0;
    };

    it('devrait calculer correctement le taux de retard', () => {
      expect(calculateTauxRetard(100, 25)).toBe('25.00');
      expect(calculateTauxRetard(50, 5)).toBe('10.00');
      expect(calculateTauxRetard(200, 0)).toBe('0.00');
    });

    it('devrait retourner 0 si aucun emprunt en cours', () => {
      expect(calculateTauxRetard(0, 0)).toBe(0);
      expect(calculateTauxRetard(0, 10)).toBe(0);
    });
  });

  describe('Calcul duree moyenne', () => {
    const calculateAverageDuration = (emprunts) => {
      if (emprunts.length === 0) return 0;

      const durations = emprunts.map(e => {
        const start = new Date(e.date_emprunt);
        const end = new Date(e.date_retour_effective);
        return Math.floor((end - start) / (1000 * 60 * 60 * 24));
      });

      const total = durations.reduce((sum, d) => sum + d, 0);
      return (total / emprunts.length).toFixed(2);
    };

    it('devrait calculer correctement la duree moyenne', () => {
      const emprunts = [
        { date_emprunt: '2024-01-01', date_retour_effective: '2024-01-15' }, // 14 jours
        { date_emprunt: '2024-01-01', date_retour_effective: '2024-01-22' }, // 21 jours
        { date_emprunt: '2024-01-01', date_retour_effective: '2024-01-08' }  // 7 jours
      ];
      // Moyenne: (14 + 21 + 7) / 3 = 14
      expect(calculateAverageDuration(emprunts)).toBe('14.00');
    });

    it('devrait retourner 0 si aucun emprunt', () => {
      expect(calculateAverageDuration([])).toBe(0);
    });
  });

  describe('Aggregation par statut', () => {
    const aggregateByStatus = (items) => {
      return items.reduce((acc, item) => {
        const count = parseInt(item.dataValues?.count || item.count || 0);
        acc.total += count;
        if (item.statut === 'actif' || item.statut === 'disponible') {
          acc.actifs += count;
        }
        return acc;
      }, { total: 0, actifs: 0 });
    };

    it('devrait agreger correctement les totaux', () => {
      const items = [
        { statut: 'actif', dataValues: { count: 50 } },
        { statut: 'inactif', dataValues: { count: 20 } },
        { statut: 'suspendu', dataValues: { count: 5 } }
      ];
      const result = aggregateByStatus(items);
      expect(result.total).toBe(75);
      expect(result.actifs).toBe(50);
    });

    it('devrait gerer un tableau vide', () => {
      const result = aggregateByStatus([]);
      expect(result.total).toBe(0);
      expect(result.actifs).toBe(0);
    });
  });
});

describe('statsController - Securite et acces', () => {
  describe('Validation acces comptable', () => {
    it('devrait autoriser comptable pour stats financieres', () => {
      expect(hasRoleLevel('comptable', 'comptable')).toBe(true);
      expect(hasRoleLevel('administrateur', 'comptable')).toBe(true);
    });

    it('devrait refuser gestionnaire pour stats financieres', () => {
      expect(hasRoleLevel('gestionnaire', 'comptable')).toBe(false);
      expect(hasRoleLevel('benevole', 'comptable')).toBe(false);
    });
  });

  describe('Validation acces benevole', () => {
    it('devrait autoriser benevole+ pour stats generales', () => {
      expect(hasRoleLevel('benevole', 'benevole')).toBe(true);
      expect(hasRoleLevel('agent', 'benevole')).toBe(true);
      expect(hasRoleLevel('gestionnaire', 'benevole')).toBe(true);
      expect(hasRoleLevel('comptable', 'benevole')).toBe(true);
      expect(hasRoleLevel('administrateur', 'benevole')).toBe(true);
    });

    it('devrait refuser usager pour stats generales', () => {
      expect(hasRoleLevel('usager', 'benevole')).toBe(false);
    });
  });

  describe('Filtrage modules par utilisateur', () => {
    it('devrait filtrer les requetes par modules autorises', () => {
      const user = { role: 'benevole', modules_autorises: ['ludotheque'] };
      const requested = ['ludotheque', 'bibliotheque', 'filmotheque'];

      const accessible = requested.filter(m => hasModuleAccess(user, m));

      expect(accessible).toEqual(['ludotheque']);
    });

    it('ne devrait pas filtrer pour administrateur', () => {
      const user = { role: 'administrateur' };
      const requested = ['ludotheque', 'bibliotheque', 'filmotheque'];

      const accessible = requested.filter(m => hasModuleAccess(user, m));

      expect(accessible).toEqual(requested);
    });
  });
});

describe('statsController - Format reponses', () => {
  describe('Format dashboard response', () => {
    const buildDashboardResponse = (data) => {
      return {
        accessibleModules: data.modules,
        utilisateurs: data.utilisateurs,
        adherents: data.utilisateurs, // Alias retrocompatibilite
        global: data.global,
        modules: data.modulesStats,
        jeux: data.modulesStats?.ludotheque?.collection || null,
        emprunts: data.emprunts,
        activity: data.activity
      };
    };

    it('devrait inclure l\'alias adherents pour retrocompatibilite', () => {
      const data = {
        modules: ['ludotheque'],
        utilisateurs: { total: 100 },
        global: {},
        modulesStats: {},
        emprunts: {},
        activity: {}
      };

      const response = buildDashboardResponse(data);

      expect(response.adherents).toEqual(response.utilisateurs);
    });

    it('devrait inclure jeux si ludotheque accessible', () => {
      const data = {
        modules: ['ludotheque'],
        utilisateurs: {},
        global: {},
        modulesStats: {
          ludotheque: { collection: { total: 500 } }
        },
        emprunts: {},
        activity: {}
      };

      const response = buildDashboardResponse(data);

      expect(response.jeux).toEqual({ total: 500 });
    });

    it('devrait avoir jeux null si ludotheque non accessible', () => {
      const data = {
        modules: ['bibliotheque'],
        utilisateurs: {},
        global: {},
        modulesStats: {},
        emprunts: {},
        activity: {}
      };

      const response = buildDashboardResponse(data);

      expect(response.jeux).toBeNull();
    });
  });

  describe('Format cotisations response', () => {
    const formatCotisationsResponse = (year, stats, monthly) => {
      const totalCA = stats
        .filter(s => s.statut === 'en_cours' || s.statut === 'expiree')
        .reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

      return {
        year: parseInt(year),
        summary: {
          totalCA: totalCA.toFixed(2),
          byStatus: stats.map(s => ({
            statut: s.statut,
            count: parseInt(s.count),
            total: parseFloat(s.total || 0).toFixed(2)
          }))
        },
        monthly: monthly.map(m => ({
          month: m.month,
          count: parseInt(m.count),
          total: parseFloat(m.total || 0).toFixed(2)
        }))
      };
    };

    it('devrait calculer correctement le CA total', () => {
      const stats = [
        { statut: 'en_cours', count: 50, total: 2500 },
        { statut: 'expiree', count: 30, total: 1500 },
        { statut: 'annulee', count: 5, total: 250 }
      ];

      const response = formatCotisationsResponse(2024, stats, []);

      // en_cours + expiree = 2500 + 1500 = 4000 (annulee non comptee)
      expect(response.summary.totalCA).toBe('4000.00');
    });

    it('devrait formater correctement les montants mensuels', () => {
      const monthly = [
        { month: '2024-01', count: 10, total: 500.5 },
        { month: '2024-02', count: 15, total: 750.75 }
      ];

      const response = formatCotisationsResponse(2024, [], monthly);

      expect(response.monthly[0].total).toBe('500.50');
      expect(response.monthly[1].total).toBe('750.75');
    });
  });
});
