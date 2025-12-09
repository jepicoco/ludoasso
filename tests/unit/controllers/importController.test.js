/**
 * Tests unitaires pour importController
 * Gestion de l'import de jeux depuis des fichiers CSV
 */

const importController = require('../../../backend/controllers/importController');
const fs = require('fs');
const csv = require('csv-parser');

// Helper pour creer des mocks req/res/next
const createMocks = (body = {}, params = {}, query = {}, file = null) => {
  const req = {
    body,
    params,
    query,
    file
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  const next = jest.fn();
  return { req, res, next };
};

// Mock des modeles Sequelize
jest.mock('../../../backend/models', () => ({
  Jeu: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  Categorie: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  Theme: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  Mecanisme: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  Langue: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  Editeur: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  Auteur: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  Illustrateur: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  Gamme: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  EmplacementJeu: {
    findOrCreate: jest.fn(),
    findOne: jest.fn()
  },
  JeuCategorie: {
    findOrCreate: jest.fn()
  },
  JeuTheme: {
    findOrCreate: jest.fn()
  },
  JeuMecanisme: {
    findOrCreate: jest.fn()
  },
  JeuLangue: {
    findOrCreate: jest.fn()
  },
  JeuEditeur: {
    findOrCreate: jest.fn()
  },
  JeuAuteur: {
    findOrCreate: jest.fn()
  },
  JeuIllustrateur: {
    findOrCreate: jest.fn()
  }
}));

// Mock du module fs
jest.mock('fs', () => ({
  createReadStream: jest.fn(),
  unlink: jest.fn()
}));

// Mock du module csv-parser
jest.mock('csv-parser', () => {
  return jest.fn();
});

const {
  Jeu,
  Categorie,
  Theme,
  Mecanisme,
  Langue,
  Editeur,
  Auteur,
  Illustrateur,
  Gamme,
  EmplacementJeu,
  JeuCategorie,
  JeuTheme,
  JeuMecanisme,
  JeuLangue,
  JeuEditeur,
  JeuAuteur,
  JeuIllustrateur
} = require('../../../backend/models');

describe('importController - getAvailableFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner la liste des champs disponibles', async () => {
    const { req, res } = createMocks();

    await importController.getAvailableFields(req, res);

    expect(res.json).toHaveBeenCalledWith({
      fields: expect.arrayContaining([
        expect.objectContaining({ id: 'titre', required: true }),
        expect.objectContaining({ id: 'ean' }),
        expect.objectContaining({ id: 'editeur' }),
        expect.objectContaining({ id: 'auteur' }),
        expect.objectContaining({ id: 'categories' }),
        expect.objectContaining({ id: 'themes' })
      ])
    });
  });

  it('devrait regrouper les champs par categories', async () => {
    const { req, res } = createMocks();

    await importController.getAvailableFields(req, res);

    const response = res.json.mock.calls[0][0];
    const fields = response.fields;

    const groups = [...new Set(fields.map(f => f.group))];
    expect(groups).toContain('Informations de base');
    expect(groups).toContain('Personnes');
    expect(groups).toContain('Caracteristiques');
    expect(groups).toContain('Classification');
  });

  it('devrait inclure le champ ignore', async () => {
    const { req, res } = createMocks();

    await importController.getAvailableFields(req, res);

    const response = res.json.mock.calls[0][0];
    const ignoreField = response.fields.find(f => f.id === 'ignore');

    expect(ignoreField).toBeDefined();
    expect(ignoreField.label).toContain('Ignorer');
  });
});

describe('importController - previewImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCSVStream = (headers, rows) => {
    const mockStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn(function(event, callback) {
        if (event === 'headers') {
          setTimeout(() => callback(headers), 0);
        } else if (event === 'data') {
          rows.forEach(row => setTimeout(() => callback(row), 0));
        } else if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return this;
      })
    };
    return mockStream;
  };

  it('devrait retourner 400 si aucun fichier fourni', async () => {
    const { req, res } = createMocks({}, {}, {}, null);

    await importController.previewImport(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Aucun fichier fourni'
    });
  });

  it('devrait parser un fichier CSV et suggerer un mapping', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({ separator: ';' }, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Éditeur(s)', 'Auteur(s)', 'EAN'];
    const mockRows = [
      { 'Titre': 'Catan', 'Éditeur(s)': 'Kosmos', 'Auteur(s)': 'Klaus Teuber', 'EAN': '1234567890' },
      { 'Titre': 'Carcassonne', 'Éditeur(s)': 'Hans im Glück', 'Auteur(s)': 'Klaus-Jürgen Wrede', 'EAN': '0987654321' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    await importController.previewImport(req, res);

    expect(fs.createReadStream).toHaveBeenCalledWith('/tmp/test.csv', { encoding: 'utf8' });
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.csv', expect.any(Function));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      columns: mockHeaders,
      mapping: expect.objectContaining({
        'Titre': 'titre',
        'Éditeur(s)': 'editeur',
        'Auteur(s)': 'auteur',
        'EAN': 'ean'
      }),
      totalRows: 2,
      preview: expect.any(Array),
      rawPreview: expect.any(Array)
    });
  });

  it('devrait limiter le preview a 10 lignes', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre'];
    const mockRows = Array.from({ length: 50 }, (_, i) => ({ 'Titre': `Jeu ${i + 1}` }));

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    await importController.previewImport(req, res);

    const response = res.json.mock.calls[0][0];
    expect(response.preview.length).toBeLessThanOrEqual(10);
    expect(response.totalRows).toBe(50);
  });

  it('devrait supporter les colonnes avec accents', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Édition', 'Catégorie(s)', 'Thème(s)'];
    const mockRows = [
      { 'Titre': 'Test', 'Édition': '2024', 'Catégorie(s)': 'Stratégie', 'Thème(s)': 'Médiéval' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    await importController.previewImport(req, res);

    const response = res.json.mock.calls[0][0];
    expect(response.mapping).toHaveProperty('Édition', 'annee_sortie');
    expect(response.mapping).toHaveProperty('Catégorie(s)', 'categories');
    expect(response.mapping).toHaveProperty('Thème(s)', 'themes');
  });

  it('devrait nettoyer le fichier en cas d\'erreur', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    fs.createReadStream.mockImplementation(() => {
      throw new Error('Read error');
    });

    await importController.previewImport(req, res);

    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.csv', expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Read error'
    });
  });

  it('devrait gerer les erreurs de parsing CSV', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn(function(event, callback) {
        if (event === 'error') {
          setTimeout(() => callback(new Error('CSV parsing error')), 0);
        }
        return this;
      })
    };

    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    await importController.previewImport(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('devrait utiliser le separateur personnalise', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({ separator: ',' }, {}, {}, mockFile);

    const mockStream = mockCSVStream(['Titre'], [{ 'Titre': 'Test' }]);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    await importController.previewImport(req, res);

    expect(csv).toHaveBeenCalledWith(expect.objectContaining({
      separator: ','
    }));
  });
});

describe('importController - importJeux', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCSVStream = (headers, rows) => {
    const mockStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn(function(event, callback) {
        if (event === 'headers') {
          setTimeout(() => callback(headers), 0);
        } else if (event === 'data') {
          rows.forEach(row => setTimeout(() => callback(row), 0));
        } else if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return this;
      })
    };
    return mockStream;
  };

  it('devrait retourner 400 si aucun fichier fourni', async () => {
    const { req, res } = createMocks({}, {}, {}, null);

    await importController.importJeux(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      message: 'Aucun fichier fourni'
    });
  });

  it('devrait importer des jeux avec succes', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'EAN'];
    const mockRows = [
      { 'Titre': 'Catan', 'EAN': '1234567890' },
      { 'Titre': 'Carcassonne', 'EAN': '0987654321' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledTimes(2);
    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Catan',
        ean: '1234567890',
        statut: 'disponible'
      })
    );
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.csv', expect.any(Function));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      total: 2,
      imported: 2,
      updated: 0,
      skipped: 0,
      errors: []
    });
  });

  it('devrait utiliser le mapping personnalise', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const customMapping = {
      'Game Name': 'titre',
      'Barcode': 'ean'
    };

    const { req, res } = createMocks(
      { mapping: JSON.stringify(customMapping) },
      {},
      {},
      mockFile
    );

    const mockHeaders = ['Game Name', 'Barcode'];
    const mockRows = [
      { 'Game Name': 'Risk', 'Barcode': '111222333' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Risk', ean: '111222333' });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Risk',
        ean: '111222333'
      })
    );
  });

  it('devrait ignorer les lignes sans titre', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'EAN'];
    const mockRows = [
      { 'Titre': 'Catan', 'EAN': '1234567890' },
      { 'Titre': '', 'EAN': '0987654321' },
      { 'Titre': 'Risk', 'EAN': '555666777' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        imported: 2,
        errors: expect.arrayContaining([
          expect.objectContaining({
            line: 3,
            error: 'Titre manquant'
          })
        ])
      })
    );
  });

  it('devrait detecter les doublons par EAN', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks(
      { skipDuplicates: 'true' },
      {},
      {},
      mockFile
    );

    const mockHeaders = ['Titre', 'EAN'];
    const mockRows = [
      { 'Titre': 'Catan', 'EAN': '1234567890' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    const existingJeu = { id: 5, titre: 'Catan (Ancienne edition)', ean: '1234567890' };
    Jeu.findOne.mockResolvedValue(existingJeu);

    await importController.importJeux(req, res);

    expect(Jeu.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        imported: 0,
        skipped: 1
      })
    );
  });

  it('devrait detecter les doublons par titre si pas d\'EAN', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks(
      { skipDuplicates: 'true' },
      {},
      {},
      mockFile
    );

    const mockHeaders = ['Titre'];
    const mockRows = [
      { 'Titre': 'Catan' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    const existingJeu = { id: 5, titre: 'Catan' };
    // Le controller appelle findOne avec where: {titre}, pas deux fois
    Jeu.findOne.mockResolvedValueOnce(existingJeu);

    await importController.importJeux(req, res);

    expect(Jeu.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        skipped: 1
      })
    );
  });

  it('devrait mettre a jour les jeux existants si updateExisting est true', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks(
      { updateExisting: 'true' },
      {},
      {},
      mockFile
    );

    const mockHeaders = ['Titre', 'EAN', 'Éditeur(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'EAN': '1234567890', 'Éditeur(s)': 'Kosmos' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    const existingJeu = {
      id: 5,
      titre: 'Catan',
      ean: '1234567890',
      update: jest.fn().mockResolvedValue(true)
    };

    Jeu.findOne.mockResolvedValue(existingJeu);

    await importController.importJeux(req, res);

    expect(existingJeu.update).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Catan',
        ean: '1234567890',
        editeur: 'Kosmos'
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        imported: 0,
        updated: 1,
        skipped: 0
      })
    );
  });

  it('devrait creer des doublons si skipDuplicates et updateExisting sont false', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks(
      { skipDuplicates: 'false', updateExisting: 'false' },
      {},
      {},
      mockFile
    );

    const mockHeaders = ['Titre'];
    const mockRows = [
      { 'Titre': 'Catan' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    const existingJeu = { id: 5, titre: 'Catan' };
    Jeu.findOne.mockResolvedValue(existingJeu);
    Jeu.create.mockResolvedValue({ id: 6, titre: 'Catan' });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        imported: 1,
        updated: 0,
        skipped: 0
      })
    );
  });

  it('devrait creer les relations many-to-many pour categories', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Catégorie(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Catégorie(s)': 'Stratégie, Gestion' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    Categorie.findOrCreate
      .mockResolvedValueOnce([{ id: 1, nom: 'Stratégie' }])
      .mockResolvedValueOnce([{ id: 2, nom: 'Gestion' }]);

    JeuCategorie.findOrCreate.mockResolvedValue([{}, true]);

    await importController.importJeux(req, res);

    expect(Categorie.findOrCreate).toHaveBeenCalledTimes(2);
    expect(Categorie.findOrCreate).toHaveBeenCalledWith({
      where: { nom: 'Stratégie' },
      defaults: { nom: 'Stratégie', actif: true }
    });
    expect(JeuCategorie.findOrCreate).toHaveBeenCalledTimes(2);
  });

  it('devrait creer les relations many-to-many pour themes', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Thème(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Thème(s)': 'Médiéval, Commerce' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    Theme.findOrCreate
      .mockResolvedValueOnce([{ id: 1, nom: 'Médiéval' }])
      .mockResolvedValueOnce([{ id: 2, nom: 'Commerce' }]);

    JeuTheme.findOrCreate.mockResolvedValue([{}, true]);

    await importController.importJeux(req, res);

    expect(Theme.findOrCreate).toHaveBeenCalledTimes(2);
    expect(JeuTheme.findOrCreate).toHaveBeenCalledTimes(2);
  });

  it('devrait creer les relations many-to-many pour mecanismes', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Mécanisme(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Mécanisme(s)': 'Placement, Dés' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    Mecanisme.findOrCreate
      .mockResolvedValueOnce([{ id: 1, nom: 'Placement' }])
      .mockResolvedValueOnce([{ id: 2, nom: 'Dés' }]);

    JeuMecanisme.findOrCreate.mockResolvedValue([{}, true]);

    await importController.importJeux(req, res);

    expect(Mecanisme.findOrCreate).toHaveBeenCalledTimes(2);
    expect(JeuMecanisme.findOrCreate).toHaveBeenCalledTimes(2);
  });

  it('devrait creer les relations many-to-many pour langues', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Langues'];
    const mockRows = [
      { 'Titre': 'Catan', 'Langues': 'fr, en' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    Langue.findOrCreate
      .mockResolvedValueOnce([{ id: 1, nom: 'Francais', code: 'fr' }])
      .mockResolvedValueOnce([{ id: 2, nom: 'Anglais', code: 'en' }]);

    JeuLangue.findOrCreate.mockResolvedValue([{}, true]);

    await importController.importJeux(req, res);

    expect(Langue.findOrCreate).toHaveBeenCalledTimes(2);
    expect(JeuLangue.findOrCreate).toHaveBeenCalledTimes(2);
  });

  it('devrait creer les relations many-to-many pour editeurs', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Éditeur(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Éditeur(s)': 'Kosmos, Asmodee' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    Editeur.findOrCreate
      .mockResolvedValueOnce([{ id: 1, nom: 'Kosmos' }])
      .mockResolvedValueOnce([{ id: 2, nom: 'Asmodee' }]);

    JeuEditeur.findOrCreate.mockResolvedValue([{}, true]);

    await importController.importJeux(req, res);

    expect(Editeur.findOrCreate).toHaveBeenCalledTimes(2);
    expect(JeuEditeur.findOrCreate).toHaveBeenCalledTimes(2);
  });

  it('devrait creer les relations many-to-many pour auteurs', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Auteur(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Auteur(s)': 'Klaus Teuber' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    Auteur.findOrCreate.mockResolvedValue([{ id: 1, nom: 'Klaus Teuber' }]);
    JeuAuteur.findOrCreate.mockResolvedValue([{}, true]);

    await importController.importJeux(req, res);

    expect(Auteur.findOrCreate).toHaveBeenCalledWith({
      where: { nom: 'Klaus Teuber' },
      defaults: { nom: 'Klaus Teuber', actif: true }
    });
    expect(JeuAuteur.findOrCreate).toHaveBeenCalledWith({
      where: { jeu_id: 1, auteur_id: 1 }
    });
  });

  it('devrait creer les relations many-to-many pour illustrateurs', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Illustrateur(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Illustrateur(s)': 'Michael Menzel' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    Illustrateur.findOrCreate.mockResolvedValue([{ id: 1, nom: 'Michael Menzel' }]);
    JeuIllustrateur.findOrCreate.mockResolvedValue([{}, true]);

    await importController.importJeux(req, res);

    expect(Illustrateur.findOrCreate).toHaveBeenCalledWith({
      where: { nom: 'Michael Menzel' },
      defaults: { nom: 'Michael Menzel', actif: true }
    });
    expect(JeuIllustrateur.findOrCreate).toHaveBeenCalledTimes(1);
  });

  it('devrait creer la relation N:1 pour gamme', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Gamme(s)'];
    const mockRows = [
      { 'Titre': 'Catan Extension', 'Gamme(s)': 'Catan' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);

    const mockJeu = {
      id: 1,
      titre: 'Catan Extension',
      update: jest.fn().mockResolvedValue(true)
    };
    Jeu.create.mockResolvedValue(mockJeu);

    Gamme.findOrCreate.mockResolvedValue([{ id: 1, nom: 'Catan' }]);

    await importController.importJeux(req, res);

    expect(Gamme.findOrCreate).toHaveBeenCalledWith({
      where: { nom: 'Catan' },
      defaults: { nom: 'Catan', actif: true }
    });
    expect(mockJeu.update).toHaveBeenCalledWith({ gamme_id: 1 });
  });

  it('devrait creer la relation N:1 pour emplacement', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Emplacement'];
    const mockRows = [
      { 'Titre': 'Catan', 'Emplacement': 'Etagère A1' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);

    const mockJeu = {
      id: 1,
      titre: 'Catan',
      update: jest.fn().mockResolvedValue(true)
    };
    Jeu.create.mockResolvedValue(mockJeu);

    EmplacementJeu.findOrCreate.mockResolvedValue([{ id: 1, libelle: 'Etagère A1' }]);

    await importController.importJeux(req, res);

    expect(EmplacementJeu.findOrCreate).toHaveBeenCalledWith({
      where: { libelle: 'Etagère A1' },
      defaults: { libelle: 'Etagère A1', actif: true }
    });
    expect(mockJeu.update).toHaveBeenCalledWith({ emplacement_id: 1 });
  });

  it('devrait parser correctement le nombre de joueurs (format range)', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Joueur(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Joueur(s)': '2 — 4' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nb_joueurs_min: 2,
        nb_joueurs_max: 4
      })
    );
  });

  it('devrait parser correctement le nombre de joueurs (format plus)', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Joueur(s)'];
    const mockRows = [
      { 'Titre': 'UNO', 'Joueur(s)': '2+' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    // Le parser ne definit pas nb_joueurs_max si c'est "2+" (reste undefined, pas null)
    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nb_joueurs_min: 2
      })
    );

    // Verifier que nb_joueurs_max n'est pas defini dans l'appel
    const createCall = Jeu.create.mock.calls[0][0];
    expect(createCall).not.toHaveProperty('nb_joueurs_max');
  });

  it('devrait parser correctement le nombre de joueurs (solo)', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Joueur(s)'];
    const mockRows = [
      { 'Titre': 'Onirim', 'Joueur(s)': 'Solo' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nb_joueurs_min: 1,
        nb_joueurs_max: 1
      })
    );
  });

  it('devrait parser correctement la duree (format heures)', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Durée'];
    const mockRows = [
      { 'Titre': 'Twilight Imperium', 'Durée': '4h30' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        duree_partie: 270  // 4*60 + 30
      })
    );
  });

  it('devrait parser correctement la duree (format minutes)', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Durée'];
    const mockRows = [
      { 'Titre': 'Catan', 'Durée': '90 min' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        duree_partie: 90
      })
    );
  });

  it('devrait parser correctement l\'age minimum', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Age(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Age(s)': '10+' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        age_min: 10
      })
    );
  });

  it('devrait parser correctement les prix avec virgules', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Prix indicatif', 'Prix d\'achat'];
    const mockRows = [
      { 'Titre': 'Catan', 'Prix indicatif': '45,99 €', 'Prix d\'achat': '32,50€' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        prix_indicatif: 45.99,
        prix_achat: 32.50
      })
    );
  });

  it('devrait parser correctement les booleens', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Gratuit', 'Privé', 'Protégé'];
    const mockRows = [
      { 'Titre': 'Catan', 'Gratuit': 'oui', 'Privé': 'non', 'Protégé': '1' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        gratuit: true,
        prive: false,
        protege: true
      })
    );
  });

  it('devrait parser correctement les dates (format YYYY-MM-DD)', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Date d\'acquisition'];
    const mockRows = [
      { 'Titre': 'Catan', 'Date d\'acquisition': '2024-01-15' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        date_acquisition: '2024-01-15'
      })
    );
  });

  it('devrait parser correctement les dates (format DD/MM/YYYY)', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Date d\'acquisition'];
    const mockRows = [
      { 'Titre': 'Catan', 'Date d\'acquisition': '15/01/2024' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        date_acquisition: '2024-01-15'
      })
    );
  });

  it('devrait parser correctement le type de jeu', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Type'];
    const mockRows = [
      { 'Titre': 'Catan Extension', 'Type': 'extension' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type_jeu: 'extension'
      })
    );
  });

  it('devrait parser correctement l\'etat du jeu', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'État'];
    const mockRows = [
      { 'Titre': 'Catan', 'État': 'très bon' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        etat: 'tres_bon'
      })
    );
  });

  it('devrait valider l\'annee de sortie', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Édition'];
    const mockRows = [
      { 'Titre': 'Jeu futur', 'Édition': '3000' },
      { 'Titre': 'Jeu ancien', 'Édition': '1800' },
      { 'Titre': 'Jeu valide', 'Édition': '2020' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    // Seul le jeu valide devrait avoir une annee_sortie
    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Jeu valide',
        annee_sortie: 2020
      })
    );
  });

  it('devrait gerer les erreurs lors de la creation de jeux', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre'];
    const mockRows = [
      { 'Titre': 'Jeu1' },
      { 'Titre': 'Jeu2' },
      { 'Titre': 'Jeu3' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create
      .mockResolvedValueOnce({ id: 1, titre: 'Jeu1' })
      .mockRejectedValueOnce(new Error('Database constraint violation'))
      .mockResolvedValueOnce({ id: 3, titre: 'Jeu3' });

    await importController.importJeux(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        imported: 2,
        errors: expect.arrayContaining([
          expect.objectContaining({
            line: 3,
            error: 'Database constraint violation'
          })
        ])
      })
    );
  });

  it('devrait continuer l\'import meme en cas d\'erreur sur une ligne', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre'];
    const mockRows = [
      { 'Titre': 'Jeu1' },
      { 'Titre': 'Jeu2' },
      { 'Titre': 'Jeu3' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('Error'))
      .mockResolvedValueOnce({ id: 3 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledTimes(3);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 3,
        imported: 2
      })
    );
  });

  it('devrait gerer les erreurs lors de la creation de relations', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Catégorie(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Catégorie(s)': 'Stratégie' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    Categorie.findOrCreate.mockRejectedValue(new Error('DB error'));
    Categorie.findOne.mockResolvedValue({ id: 1, nom: 'Stratégie' });

    await importController.importJeux(req, res);

    // L'import devrait reussir malgre l'erreur sur la relation
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        imported: 1
      })
    );
  });

  it('devrait ignorer les relations si la valeur est vide', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Catégorie(s)', 'Thème(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Catégorie(s)': '', 'Thème(s)': '   ' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1, titre: 'Catan' });

    await importController.importJeux(req, res);

    expect(Categorie.findOrCreate).not.toHaveBeenCalled();
    expect(Theme.findOrCreate).not.toHaveBeenCalled();
  });

  it('devrait nettoyer le fichier apres import reussi', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockStream = mockCSVStream(['Titre'], [{ 'Titre': 'Test' }]);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.csv', expect.any(Function));
  });

  it('devrait nettoyer le fichier en cas d\'erreur', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    fs.createReadStream.mockImplementation(() => {
      throw new Error('File read error');
    });

    await importController.importJeux(req, res);

    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.csv', expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('devrait retourner 500 en cas d\'erreur globale', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    fs.createReadStream.mockImplementation(() => {
      throw new Error('Critical error');
    });

    await importController.importJeux(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Critical error'
    });
  });

  it('devrait traiter correctement les valeurs multiples separees par virgules', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockHeaders = ['Titre', 'Catégorie(s)'];
    const mockRows = [
      { 'Titre': 'Catan', 'Catégorie(s)': 'Stratégie,  Gestion,  Placement  ' }
    ];

    const mockStream = mockCSVStream(mockHeaders, mockRows);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    Categorie.findOrCreate
      .mockResolvedValueOnce([{ id: 1, nom: 'Stratégie' }])
      .mockResolvedValueOnce([{ id: 2, nom: 'Gestion' }])
      .mockResolvedValueOnce([{ id: 3, nom: 'Placement' }]);

    JeuCategorie.findOrCreate.mockResolvedValue([{}, true]);

    await importController.importJeux(req, res);

    expect(Categorie.findOrCreate).toHaveBeenCalledTimes(3);
    expect(Categorie.findOrCreate).toHaveBeenCalledWith({
      where: { nom: 'Stratégie' },
      defaults: { nom: 'Stratégie', actif: true }
    });
    expect(Categorie.findOrCreate).toHaveBeenCalledWith({
      where: { nom: 'Gestion' },
      defaults: { nom: 'Gestion', actif: true }
    });
    expect(Categorie.findOrCreate).toHaveBeenCalledWith({
      where: { nom: 'Placement' },
      defaults: { nom: 'Placement', actif: true }
    });
  });

  it('devrait definir le statut par defaut a disponible', async () => {
    const mockFile = {
      path: '/tmp/test.csv',
      originalname: 'jeux.csv'
    };

    const { req, res } = createMocks({}, {}, {}, mockFile);

    const mockStream = mockCSVStream(['Titre'], [{ 'Titre': 'Catan' }]);
    fs.createReadStream.mockReturnValue(mockStream);
    csv.mockReturnValue(() => {});

    Jeu.findOne.mockResolvedValue(null);
    Jeu.create.mockResolvedValue({ id: 1 });

    await importController.importJeux(req, res);

    expect(Jeu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statut: 'disponible'
      })
    );
  });
});
