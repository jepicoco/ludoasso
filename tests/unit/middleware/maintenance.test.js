/**
 * Tests unitaires pour le middleware maintenance
 * Verification du mode maintenance, IP whitelist, et cookies de bypass
 */

const path = require('path');
const { checkMaintenance, setBypassCookie, getClientIp, BYPASS_COOKIE_NAME } = require('../../../backend/middleware/maintenance');
const { ParametresFront, IpAutorisee } = require('../../../backend/models');

// Mock des modules
jest.mock('../../../backend/models', () => ({
  ParametresFront: {
    getParametres: jest.fn()
  },
  IpAutorisee: {
    estAutorisee: jest.fn()
  }
}));

// Helper pour creer des mocks req/res/next
const createMocks = (options = {}) => {
  const {
    headers = {},
    cookies = '',
    ip = '127.0.0.1'
  } = options;

  const req = {
    headers: {
      ...headers
    },
    ip,
    connection: {
      remoteAddress: ip
    }
  };

  if (cookies) {
    req.headers.cookie = cookies;
  }

  const res = {
    status: jest.fn().mockReturnThis(),
    sendFile: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  };

  const next = jest.fn();

  return { req, res, next };
};

describe('getClientIp', () => {
  it('devrait extraire l\'IP depuis x-forwarded-for (premiere IP)', () => {
    const req = {
      headers: {
        'x-forwarded-for': '203.0.113.45, 198.51.100.23, 192.0.2.1'
      },
      ip: '127.0.0.1'
    };

    const clientIp = getClientIp(req);
    expect(clientIp).toBe('203.0.113.45');
  });

  it('devrait extraire l\'IP depuis x-forwarded-for (IP unique)', () => {
    const req = {
      headers: {
        'x-forwarded-for': '203.0.113.45'
      },
      ip: '127.0.0.1'
    };

    const clientIp = getClientIp(req);
    expect(clientIp).toBe('203.0.113.45');
  });

  it('devrait extraire l\'IP depuis x-forwarded-for (avec espaces)', () => {
    const req = {
      headers: {
        'x-forwarded-for': '  203.0.113.45  ,  198.51.100.23  '
      },
      ip: '127.0.0.1'
    };

    const clientIp = getClientIp(req);
    expect(clientIp).toBe('203.0.113.45');
  });

  it('devrait utiliser req.ip si pas de x-forwarded-for', () => {
    const req = {
      headers: {},
      ip: '192.168.1.100',
      connection: {
        remoteAddress: '10.0.0.1'
      }
    };

    const clientIp = getClientIp(req);
    expect(clientIp).toBe('192.168.1.100');
  });

  it('devrait utiliser req.connection.remoteAddress si pas de x-forwarded-for ni req.ip', () => {
    const req = {
      headers: {},
      connection: {
        remoteAddress: '10.0.0.1'
      }
    };

    const clientIp = getClientIp(req);
    expect(clientIp).toBe('10.0.0.1');
  });
});

describe('checkMaintenance Middleware', () => {
  const mockMaintenanceKey = 'test-maintenance-key-abc123';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('Mode maintenance desactive', () => {
    it('devrait laisser passer si mode_maintenance = false', async () => {
      const { req, res, next } = createMocks();

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: false,
        maintenance_key: null,
        autoriser_ip_locales: false
      });

      await checkMaintenance(req, res, next);

      expect(ParametresFront.getParametres).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.sendFile).not.toHaveBeenCalled();
    });

    it('devrait laisser passer meme avec une IP non autorisee si mode desactive', async () => {
      const { req, res, next } = createMocks({ ip: '203.0.113.45' });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: false,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: false
      });

      await checkMaintenance(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(IpAutorisee.estAutorisee).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Mode maintenance active - Cookie de bypass valide', () => {
    it('devrait laisser passer avec cookie de bypass correspondant a la cle actuelle', async () => {
      const { req, res, next } = createMocks({
        cookies: `${BYPASS_COOKIE_NAME}=${mockMaintenanceKey}`,
        ip: '203.0.113.45'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: false
      });

      await checkMaintenance(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(IpAutorisee.estAutorisee).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.sendFile).not.toHaveBeenCalled();
    });

    it('devrait laisser passer avec plusieurs cookies dont le bypass valide', async () => {
      const { req, res, next } = createMocks({
        cookies: `session_id=xyz789; ${BYPASS_COOKIE_NAME}=${mockMaintenanceKey}; other_cookie=value`,
        ip: '203.0.113.45'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: false
      });

      await checkMaintenance(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Mode maintenance active - Cookie de bypass invalide/expire', () => {
    it('devrait mettre a jour le cookie si cle changee mais IP toujours autorisee', async () => {
      const oldKey = 'old-maintenance-key';
      const newKey = 'new-maintenance-key';

      const { req, res, next } = createMocks({
        cookies: `${BYPASS_COOKIE_NAME}=${oldKey}`,
        ip: '192.168.1.100'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: newKey,
        autoriser_ip_locales: true
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(IpAutorisee.estAutorisee).toHaveBeenCalledWith('192.168.1.100', true);
      expect(res.cookie).toHaveBeenCalledWith(
        BYPASS_COOKIE_NAME,
        newKey,
        expect.objectContaining({
          maxAge: 3 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: false, // NODE_ENV = 'test'
          sameSite: 'lax'
        })
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait supprimer le cookie et bloquer si cle changee et IP non autorisee', async () => {
      const oldKey = 'old-maintenance-key';
      const newKey = 'new-maintenance-key';

      const { req, res, next } = createMocks({
        cookies: `${BYPASS_COOKIE_NAME}=${oldKey}`,
        ip: '203.0.113.45'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: newKey,
        autoriser_ip_locales: false
      });

      IpAutorisee.estAutorisee.mockResolvedValue(false);

      await checkMaintenance(req, res, next);

      expect(IpAutorisee.estAutorisee).toHaveBeenCalledWith('203.0.113.45', false);
      expect(res.clearCookie).toHaveBeenCalledWith(BYPASS_COOKIE_NAME);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.sendFile).toHaveBeenCalledWith(
        path.join(__dirname, '../../../frontend/maintenance.html')
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait bloquer si cookie invalide et pas de maintenance_key en base', async () => {
      const oldKey = 'old-maintenance-key';

      const { req, res, next } = createMocks({
        cookies: `${BYPASS_COOKIE_NAME}=${oldKey}`,
        ip: '192.168.1.100'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: null, // Pas de cle
        autoriser_ip_locales: true
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(IpAutorisee.estAutorisee).toHaveBeenCalledWith('192.168.1.100', true);
      expect(res.cookie).not.toHaveBeenCalled(); // Pas de cookie sans maintenance_key
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.sendFile).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Mode maintenance active - Pas de cookie', () => {
    it('devrait creer un cookie de bypass si IP autorisee (whitelist)', async () => {
      const { req, res, next } = createMocks({
        ip: '192.168.1.100'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: false
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(IpAutorisee.estAutorisee).toHaveBeenCalledWith('192.168.1.100', false);
      expect(res.cookie).toHaveBeenCalledWith(
        BYPASS_COOKIE_NAME,
        mockMaintenanceKey,
        expect.objectContaining({
          maxAge: 3 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: false,
          sameSite: 'lax'
        })
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait creer un cookie de bypass si IP locale et option activee', async () => {
      const { req, res, next } = createMocks({
        ip: '127.0.0.1'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: true
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(IpAutorisee.estAutorisee).toHaveBeenCalledWith('127.0.0.1', true);
      expect(res.cookie).toHaveBeenCalledWith(
        BYPASS_COOKIE_NAME,
        mockMaintenanceKey,
        expect.any(Object)
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('devrait bloquer avec 503 si IP non autorisee', async () => {
      const { req, res, next } = createMocks({
        ip: '203.0.113.45'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: false
      });

      IpAutorisee.estAutorisee.mockResolvedValue(false);

      await checkMaintenance(req, res, next);

      expect(IpAutorisee.estAutorisee).toHaveBeenCalledWith('203.0.113.45', false);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.sendFile).toHaveBeenCalledWith(
        path.join(__dirname, '../../../frontend/maintenance.html')
      );
      expect(res.cookie).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait bloquer si IP autorisee mais pas de maintenance_key', async () => {
      const { req, res, next } = createMocks({
        ip: '192.168.1.100'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: null,
        autoriser_ip_locales: true
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.sendFile).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('devrait bloquer si IP autorisee mais maintenance_key vide', async () => {
      const { req, res, next } = createMocks({
        ip: '192.168.1.100'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: '',
        autoriser_ip_locales: true
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Mode maintenance active - IP via x-forwarded-for', () => {
    it('devrait utiliser la premiere IP de x-forwarded-for pour verification', async () => {
      const { req, res, next } = createMocks({
        headers: {
          'x-forwarded-for': '203.0.113.45, 198.51.100.23'
        },
        ip: '127.0.0.1'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: false
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(IpAutorisee.estAutorisee).toHaveBeenCalledWith('203.0.113.45', false);
      expect(next).toHaveBeenCalled();
    });

    it('devrait bloquer si IP forwarded non autorisee', async () => {
      const { req, res, next } = createMocks({
        headers: {
          'x-forwarded-for': '203.0.113.45'
        },
        ip: '127.0.0.1'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: false
      });

      IpAutorisee.estAutorisee.mockResolvedValue(false);

      await checkMaintenance(req, res, next);

      expect(IpAutorisee.estAutorisee).toHaveBeenCalledWith('203.0.113.45', false);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Cookie secure selon environnement', () => {
    it('devrait definir secure = true en production', async () => {
      process.env.NODE_ENV = 'production';

      const { req, res, next } = createMocks({
        ip: '192.168.1.100'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: true
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        BYPASS_COOKIE_NAME,
        mockMaintenanceKey,
        expect.objectContaining({
          secure: true
        })
      );
    });

    it('devrait definir secure = false hors production', async () => {
      process.env.NODE_ENV = 'development';

      const { req, res, next } = createMocks({
        ip: '192.168.1.100'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: true
      });

      IpAutorisee.estAutorisee.mockResolvedValue(true);

      await checkMaintenance(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        BYPASS_COOKIE_NAME,
        mockMaintenanceKey,
        expect.objectContaining({
          secure: false
        })
      );
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait laisser passer (fail-open) en cas d\'erreur DB', async () => {
      const { req, res, next } = createMocks();

      ParametresFront.getParametres.mockRejectedValue(new Error('Database connection failed'));

      // Mock console.error pour eviter le bruit dans les tests
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await checkMaintenance(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erreur middleware maintenance:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('devrait laisser passer en cas d\'erreur lors de la verification IP', async () => {
      const { req, res, next } = createMocks({
        ip: '203.0.113.45'
      });

      ParametresFront.getParametres.mockResolvedValue({
        mode_maintenance: true,
        maintenance_key: mockMaintenanceKey,
        autoriser_ip_locales: false
      });

      IpAutorisee.estAutorisee.mockRejectedValue(new Error('IP check failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await checkMaintenance(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('setBypassCookie Function', () => {
  const mockMaintenanceKey = 'test-maintenance-key-abc123';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('devrait definir le cookie de bypass avec la cle fournie', () => {
    const res = {
      cookie: jest.fn()
    };

    setBypassCookie(res, mockMaintenanceKey);

    expect(res.cookie).toHaveBeenCalledWith(
      BYPASS_COOKIE_NAME,
      mockMaintenanceKey,
      expect.objectContaining({
        maxAge: 3 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      })
    );
  });

  it('devrait definir secure = true en production', () => {
    process.env.NODE_ENV = 'production';

    const res = {
      cookie: jest.fn()
    };

    setBypassCookie(res, mockMaintenanceKey);

    expect(res.cookie).toHaveBeenCalledWith(
      BYPASS_COOKIE_NAME,
      mockMaintenanceKey,
      expect.objectContaining({
        secure: true
      })
    );
  });

  it('ne devrait pas definir de cookie si maintenanceKey est null', () => {
    const res = {
      cookie: jest.fn()
    };

    setBypassCookie(res, null);

    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('ne devrait pas definir de cookie si maintenanceKey est undefined', () => {
    const res = {
      cookie: jest.fn()
    };

    setBypassCookie(res, undefined);

    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('ne devrait pas definir de cookie si maintenanceKey est une chaine vide', () => {
    const res = {
      cookie: jest.fn()
    };

    setBypassCookie(res, '');

    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('devrait definir le cookie avec une cle valide de longueur quelconque', () => {
    const res = {
      cookie: jest.fn()
    };

    const longKey = 'a'.repeat(100);
    setBypassCookie(res, longKey);

    expect(res.cookie).toHaveBeenCalledWith(
      BYPASS_COOKIE_NAME,
      longKey,
      expect.any(Object)
    );
  });
});
