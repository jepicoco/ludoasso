/**
 * Tests unitaires pour disqueController
 * Gestion des disques/vinyles (discotheque)
 */

const disqueController = require('../../../backend/controllers/disqueController');
const { Op } = require('sequelize');

// Helper pour creer des mocks req/res/next
const createMocks = (body = {}, params = {}, query = {}) => {
  const req = {
    body,
    params,
    query
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
  Disque: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn()
  },
  Artiste: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  GenreMusical: {
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  FormatDisque: {
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  LabelDisque: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  EmplacementDisque: {
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  DisqueArtiste: {
    create: jest.fn(),
    destroy: jest.fn()
  },
  DisqueGenre: {
    create: jest.fn(),
    destroy: jest.fn()
  },
  Emprunt: {
    count: jest.fn()
  },
  Op: {
    ne: Symbol('ne'),
    lt: Symbol('lt'),
    gte: Symbol('gte'),
    in: Symbol('in'),
    or: Symbol('or'),
    like: Symbol('like'),
    between: Symbol('between')
  }
}));

const {
  Disque,
  Artiste,
  GenreMusical,
  FormatDisque,
  LabelDisque,
  EmplacementDisque,
  DisqueArtiste,
  DisqueGenre,
  Emprunt
} = require('../../../backend/models');

describe('disqueController - getAllDisques', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner tous les disques avec pagination par defaut', async () => {
    const { req, res } = createMocks();

    const mockDisques = [
      {
        id: 1,
        titre: 'Abbey Road',
        annee_sortie: 1969,
        statut: 'disponible'
      },
      {
        id: 2,
        titre: 'Dark Side of the Moon',
        annee_sortie: 1973,
        statut: 'disponible'
      }
    ];

    Disque.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: mockDisques
    });

    await disqueController.getAllDisques(req, res);

    expect(Disque.findAndCountAll).toHaveBeenCalledWith({
      where: {},
      include: expect.arrayContaining([
        expect.objectContaining({ model: FormatDisque, as: 'formatRef' }),
        expect.objectContaining({ model: LabelDisque, as: 'labelRef' }),
        expect.objectContaining({ model: EmplacementDisque, as: 'emplacementRef' }),
        expect.objectContaining({ model: Artiste, as: 'artistesRef' }),
        expect.objectContaining({ model: GenreMusical, as: 'genresRef' })
      ]),
      limit: 20,
      offset: 0,
      order: [['titre', 'ASC']],
      distinct: true
    });

    expect(res.json).toHaveBeenCalledWith({
      disques: mockDisques,
      pagination: {
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      }
    });
  });

  it('devrait respecter la pagination personnalisee', async () => {
    const { req, res } = createMocks({}, {}, { page: '3', limit: '10' });

    Disque.findAndCountAll.mockResolvedValue({
      count: 50,
      rows: []
    });

    await disqueController.getAllDisques(req, res);

    expect(Disque.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 20 // (page 3 - 1) * 10
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      disques: [],
      pagination: {
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5
      }
    });
  });

  it('devrait filtrer par recherche texte', async () => {
    const { req, res } = createMocks({}, {}, { search: 'Abbey' });

    Disque.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: []
    });

    await disqueController.getAllDisques(req, res);

    expect(Disque.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Op.or]: expect.arrayContaining([
            { titre: { [Op.like]: '%Abbey%' } },
            { titre_original: { [Op.like]: '%Abbey%' } },
            { code_barre: { [Op.like]: '%Abbey%' } },
            { ean: { [Op.like]: '%Abbey%' } }
          ])
        })
      })
    );
  });

  it('devrait filtrer par statut', async () => {
    const { req, res } = createMocks({}, {}, { statut: 'emprunte' });

    Disque.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await disqueController.getAllDisques(req, res);

    expect(Disque.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          statut: 'emprunte'
        })
      })
    );
  });

  it('devrait filtrer par annee de sortie', async () => {
    const { req, res } = createMocks({}, {}, { annee: '1973' });

    Disque.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await disqueController.getAllDisques(req, res);

    expect(Disque.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          annee_sortie: '1973'
        })
      })
    );
  });

  it('devrait filtrer par format_id', async () => {
    const { req, res } = createMocks({}, {}, { format_id: '1' });

    Disque.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await disqueController.getAllDisques(req, res);

    expect(Disque.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          format_id: '1'
        })
      })
    );
  });

  it('devrait filtrer par genre_id avec required true', async () => {
    const { req, res } = createMocks({}, {}, { genre_id: '5' });

    Disque.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await disqueController.getAllDisques(req, res);

    const call = Disque.findAndCountAll.mock.calls[0][0];
    const genreInclude = call.include.find(i => i.as === 'genresRef');

    expect(genreInclude).toBeDefined();
    expect(genreInclude.where).toEqual({ id: '5' });
    expect(genreInclude.required).toBe(true);
  });

  it('devrait filtrer par artiste_id avec required true', async () => {
    const { req, res } = createMocks({}, {}, { artiste_id: '3' });

    Disque.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await disqueController.getAllDisques(req, res);

    const call = Disque.findAndCountAll.mock.calls[0][0];
    const artisteInclude = call.include.find(i => i.as === 'artistesRef');

    expect(artisteInclude).toBeDefined();
    expect(artisteInclude.where).toEqual({ id: '3' });
    expect(artisteInclude.required).toBe(true);
  });

  it('devrait combiner plusieurs filtres', async () => {
    const { req, res } = createMocks({}, {}, {
      search: 'Pink',
      statut: 'disponible',
      annee: '1973',
      format_id: '2',
      genre_id: '1'
    });

    Disque.findAndCountAll.mockResolvedValue({
      count: 0,
      rows: []
    });

    await disqueController.getAllDisques(req, res);

    expect(Disque.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Op.or]: expect.any(Array),
          statut: 'disponible',
          annee_sortie: '1973',
          format_id: '2'
        })
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Disque.findAndCountAll.mockRejectedValue(error);

    await disqueController.getAllDisques(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - getDisqueById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner un disque par ID', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockDisque = {
      id: 1,
      titre: 'Abbey Road',
      annee_sortie: 1969,
      statut: 'disponible',
      nb_pistes: 17,
      duree_totale: 47
    };

    Disque.findByPk.mockResolvedValue(mockDisque);

    await disqueController.getDisqueById(req, res);

    expect(Disque.findByPk).toHaveBeenCalledWith('1', {
      include: expect.arrayContaining([
        expect.objectContaining({ model: FormatDisque, as: 'formatRef' }),
        expect.objectContaining({ model: LabelDisque, as: 'labelRef' }),
        expect.objectContaining({ model: EmplacementDisque, as: 'emplacementRef' }),
        expect.objectContaining({ model: Artiste, as: 'artistesRef' }),
        expect.objectContaining({ model: GenreMusical, as: 'genresRef' })
      ])
    });

    expect(res.json).toHaveBeenCalledWith(mockDisque);
  });

  it('devrait retourner 404 si disque non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Disque.findByPk.mockResolvedValue(null);

    await disqueController.getDisqueById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Disque not found'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Disque.findByPk.mockRejectedValue(error);

    await disqueController.getDisqueById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - createDisque', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait creer un disque avec succes', async () => {
    const { req, res } = createMocks({
      titre: 'Abbey Road',
      titre_original: 'Abbey Road',
      annee_sortie: 1969,
      nb_pistes: 17,
      duree_totale: 47,
      ean: '0077774639026',
      format_id: 1,
      label_id: 1,
      emplacement_id: 1,
      statut: 'disponible',
      etat: 'bon',
      prix_indicatif: 25.00,
      artistes: [{ id: 1, role: 'principal' }],
      genres: [1, 2]
    });

    const mockCreatedDisque = {
      id: 1,
      titre: 'Abbey Road',
      statut: 'disponible',
      setGenresRef: jest.fn().mockResolvedValue(true)
    };

    const mockFullDisque = {
      id: 1,
      titre: 'Abbey Road',
      statut: 'disponible'
    };

    Disque.create.mockResolvedValue(mockCreatedDisque);
    DisqueArtiste.create.mockResolvedValue({ id: 1 });
    Disque.findByPk.mockResolvedValue(mockFullDisque);

    await disqueController.createDisque(req, res);

    expect(Disque.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Abbey Road',
        titre_original: 'Abbey Road',
        annee_sortie: 1969,
        nb_pistes: 17,
        duree_totale: 47,
        ean: '0077774639026',
        format_id: 1,
        label_id: 1,
        emplacement_id: 1,
        statut: 'disponible',
        etat: 'bon',
        prix_indicatif: 25.00
      })
    );

    expect(DisqueArtiste.create).toHaveBeenCalledWith({
      disque_id: 1,
      artiste_id: 1,
      role: 'principal'
    });

    expect(mockCreatedDisque.setGenresRef).toHaveBeenCalledWith([1, 2]);

    expect(Disque.findByPk).toHaveBeenCalledWith(1, {
      include: expect.any(Array)
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockFullDisque);
  });

  it('devrait creer un disque avec valeurs par defaut', async () => {
    const { req, res } = createMocks({
      titre: 'Test Album'
    });

    const mockCreatedDisque = {
      id: 1,
      titre: 'Test Album',
      setGenresRef: jest.fn()
    };

    Disque.create.mockResolvedValue(mockCreatedDisque);
    Disque.findByPk.mockResolvedValue(mockCreatedDisque);

    await disqueController.createDisque(req, res);

    expect(Disque.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Test Album',
        format_id: null,
        label_id: null,
        emplacement_id: null,
        statut: 'disponible',
        etat: 'bon'
      })
    );
  });

  it('devrait gerer plusieurs artistes avec roles', async () => {
    const { req, res } = createMocks({
      titre: 'Collaboration Album',
      artistes: [
        { id: 1, role: 'principal' },
        { id: 2, role: 'featuring' },
        { id: 3, role: 'producteur' }
      ]
    });

    const mockCreatedDisque = {
      id: 1,
      setGenresRef: jest.fn()
    };

    Disque.create.mockResolvedValue(mockCreatedDisque);
    DisqueArtiste.create.mockResolvedValue({ id: 1 });
    Disque.findByPk.mockResolvedValue(mockCreatedDisque);

    await disqueController.createDisque(req, res);

    expect(DisqueArtiste.create).toHaveBeenCalledTimes(3);
    expect(DisqueArtiste.create).toHaveBeenNthCalledWith(1, {
      disque_id: 1,
      artiste_id: 1,
      role: 'principal'
    });
    expect(DisqueArtiste.create).toHaveBeenNthCalledWith(2, {
      disque_id: 1,
      artiste_id: 2,
      role: 'featuring'
    });
    expect(DisqueArtiste.create).toHaveBeenNthCalledWith(3, {
      disque_id: 1,
      artiste_id: 3,
      role: 'producteur'
    });
  });

  it('devrait gerer artistes sans role (role par defaut)', async () => {
    const { req, res } = createMocks({
      titre: 'Test Album',
      artistes: [1, 2]
    });

    const mockCreatedDisque = {
      id: 1,
      setGenresRef: jest.fn()
    };

    Disque.create.mockResolvedValue(mockCreatedDisque);
    DisqueArtiste.create.mockResolvedValue({ id: 1 });
    Disque.findByPk.mockResolvedValue(mockCreatedDisque);

    await disqueController.createDisque(req, res);

    expect(DisqueArtiste.create).toHaveBeenCalledWith({
      disque_id: 1,
      artiste_id: 1,
      role: 'principal'
    });
    expect(DisqueArtiste.create).toHaveBeenCalledWith({
      disque_id: 1,
      artiste_id: 2,
      role: 'principal'
    });
  });

  it('devrait gerer un disque sans artistes', async () => {
    const { req, res } = createMocks({
      titre: 'Compilation'
    });

    const mockCreatedDisque = {
      id: 1,
      setGenresRef: jest.fn()
    };

    Disque.create.mockResolvedValue(mockCreatedDisque);
    Disque.findByPk.mockResolvedValue(mockCreatedDisque);

    await disqueController.createDisque(req, res);

    expect(DisqueArtiste.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('devrait gerer un disque sans genres', async () => {
    const { req, res } = createMocks({
      titre: 'Test Album',
      artistes: []
    });

    const mockCreatedDisque = {
      id: 1,
      setGenresRef: jest.fn()
    };

    Disque.create.mockResolvedValue(mockCreatedDisque);
    Disque.findByPk.mockResolvedValue(mockCreatedDisque);

    await disqueController.createDisque(req, res);

    expect(mockCreatedDisque.setGenresRef).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({
      titre: 'Test Album'
    });

    const error = new Error('Database error');
    Disque.create.mockRejectedValue(error);

    await disqueController.createDisque(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - updateDisque', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait mettre a jour un disque avec succes', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Abbey Road (Remastered)',
        annee_sortie: 2009,
        statut: 'disponible',
        etat: 'excellent',
        artistes: [{ id: 1, role: 'principal' }],
        genres: [1, 2]
      },
      { id: '1' }
    );

    const mockDisque = {
      id: 1,
      titre: 'Abbey Road',
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn().mockResolvedValue(true)
    };

    const mockUpdatedDisque = {
      id: 1,
      titre: 'Abbey Road (Remastered)',
      annee_sortie: 2009
    };

    Disque.findByPk.mockResolvedValueOnce(mockDisque);
    DisqueArtiste.destroy.mockResolvedValue(1);
    DisqueArtiste.create.mockResolvedValue({ id: 1 });
    Disque.findByPk.mockResolvedValueOnce(mockUpdatedDisque);

    await disqueController.updateDisque(req, res);

    expect(mockDisque.update).toHaveBeenCalledWith(
      expect.objectContaining({
        titre: 'Abbey Road (Remastered)',
        annee_sortie: 2009,
        statut: 'disponible',
        etat: 'excellent'
      })
    );

    expect(DisqueArtiste.destroy).toHaveBeenCalledWith({
      where: { disque_id: 1 }
    });

    expect(DisqueArtiste.create).toHaveBeenCalledWith({
      disque_id: 1,
      artiste_id: 1,
      role: 'principal'
    });

    expect(mockDisque.setGenresRef).toHaveBeenCalledWith([1, 2]);

    expect(res.json).toHaveBeenCalledWith(mockUpdatedDisque);
  });

  it('devrait mettre a jour sans modifier artistes si non fournis', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Updated Title',
        notes: 'Nouvelle note'
      },
      { id: '1' }
    );

    const mockDisque = {
      id: 1,
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn()
    };

    Disque.findByPk.mockResolvedValueOnce(mockDisque);
    Disque.findByPk.mockResolvedValueOnce(mockDisque);

    await disqueController.updateDisque(req, res);

    expect(DisqueArtiste.destroy).not.toHaveBeenCalled();
    expect(DisqueArtiste.create).not.toHaveBeenCalled();
  });

  it('devrait supprimer tous les artistes si tableau vide fourni', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Test',
        artistes: []
      },
      { id: '1' }
    );

    const mockDisque = {
      id: 1,
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn()
    };

    Disque.findByPk.mockResolvedValueOnce(mockDisque);
    Disque.findByPk.mockResolvedValueOnce(mockDisque);

    await disqueController.updateDisque(req, res);

    expect(DisqueArtiste.destroy).toHaveBeenCalledWith({
      where: { disque_id: 1 }
    });
    expect(DisqueArtiste.create).not.toHaveBeenCalled();
  });

  it('devrait mettre a jour sans modifier genres si non fournis', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Updated Title'
      },
      { id: '1' }
    );

    const mockDisque = {
      id: 1,
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn()
    };

    Disque.findByPk.mockResolvedValueOnce(mockDisque);
    Disque.findByPk.mockResolvedValueOnce(mockDisque);

    await disqueController.updateDisque(req, res);

    expect(mockDisque.setGenresRef).not.toHaveBeenCalled();
  });

  it('devrait supprimer tous les genres si tableau vide fourni', async () => {
    const { req, res } = createMocks(
      {
        titre: 'Test',
        genres: []
      },
      { id: '1' }
    );

    const mockDisque = {
      id: 1,
      update: jest.fn().mockResolvedValue(true),
      setGenresRef: jest.fn()
    };

    Disque.findByPk.mockResolvedValueOnce(mockDisque);
    Disque.findByPk.mockResolvedValueOnce(mockDisque);

    await disqueController.updateDisque(req, res);

    expect(mockDisque.setGenresRef).toHaveBeenCalledWith([]);
  });

  it('devrait retourner 404 si disque non trouve', async () => {
    const { req, res } = createMocks(
      { titre: 'Test' },
      { id: '999' }
    );

    Disque.findByPk.mockResolvedValue(null);

    await disqueController.updateDisque(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Disque not found'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks(
      { titre: 'Test' },
      { id: '1' }
    );

    const error = new Error('Database error');
    Disque.findByPk.mockRejectedValue(error);

    await disqueController.updateDisque(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - deleteDisque', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait supprimer un disque avec succes', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockDisque = {
      id: 1,
      titre: 'Test Album',
      destroy: jest.fn().mockResolvedValue(true)
    };

    Disque.findByPk.mockResolvedValue(mockDisque);
    Emprunt.count.mockResolvedValue(0);

    await disqueController.deleteDisque(req, res);

    expect(Emprunt.count).toHaveBeenCalledWith({
      where: {
        disque_id: 1,
        date_retour_effective: null
      }
    });

    expect(mockDisque.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Disque deleted successfully'
    });
  });

  it('devrait retourner 404 si disque non trouve', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Disque.findByPk.mockResolvedValue(null);

    await disqueController.deleteDisque(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Disque not found'
    });
  });

  it('devrait retourner 400 si disque a des emprunts actifs', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockDisque = {
      id: 1,
      titre: 'Test Album'
    };

    Disque.findByPk.mockResolvedValue(mockDisque);
    Emprunt.count.mockResolvedValue(2);

    await disqueController.deleteDisque(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cannot delete',
      message: 'Ce disque a des emprunts en cours'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Disque.findByPk.mockRejectedValue(error);

    await disqueController.deleteDisque(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les statistiques des disques', async () => {
    const { req, res } = createMocks();

    Disque.count.mockResolvedValueOnce(150);
    Disque.count.mockResolvedValueOnce(120);
    Disque.count.mockResolvedValueOnce(20);
    Artiste.count.mockResolvedValue(45);

    await disqueController.getStats(req, res);

    expect(Disque.count).toHaveBeenCalledTimes(3);
    expect(Disque.count).toHaveBeenNthCalledWith(1);
    expect(Disque.count).toHaveBeenNthCalledWith(2, { where: { statut: 'disponible' } });
    expect(Disque.count).toHaveBeenNthCalledWith(3, { where: { statut: 'emprunte' } });

    expect(Artiste.count).toHaveBeenCalledWith({ where: { actif: true } });

    expect(res.json).toHaveBeenCalledWith({
      totalDisques: 150,
      disquesDisponibles: 120,
      disquesEmpruntes: 20,
      totalArtistes: 45
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Disque.count.mockRejectedValue(error);

    await disqueController.getStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - getGenres', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les genres actifs', async () => {
    const { req, res } = createMocks();

    const mockGenres = [
      { id: 1, nom: 'Rock', actif: true },
      { id: 2, nom: 'Jazz', actif: true },
      { id: 3, nom: 'Classical', actif: true }
    ];

    GenreMusical.findAll.mockResolvedValue(mockGenres);

    await disqueController.getGenres(req, res);

    expect(GenreMusical.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith({
      genres: mockGenres
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    GenreMusical.findAll.mockRejectedValue(error);

    await disqueController.getGenres(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - getFormats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les formats actifs', async () => {
    const { req, res } = createMocks();

    const mockFormats = [
      { id: 1, nom: 'Vinyl 33t', actif: true },
      { id: 2, nom: 'Vinyl 45t', actif: true },
      { id: 3, nom: 'CD', actif: true }
    ];

    FormatDisque.findAll.mockResolvedValue(mockFormats);

    await disqueController.getFormats(req, res);

    expect(FormatDisque.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith({
      formats: mockFormats
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    FormatDisque.findAll.mockRejectedValue(error);

    await disqueController.getFormats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - getLabels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les labels actifs', async () => {
    const { req, res } = createMocks();

    const mockLabels = [
      { id: 1, nom: 'Apple Records', actif: true },
      { id: 2, nom: 'Atlantic Records', actif: true }
    ];

    LabelDisque.findAll.mockResolvedValue(mockLabels);

    await disqueController.getLabels(req, res);

    expect(LabelDisque.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']],
      limit: 50
    });

    expect(res.json).toHaveBeenCalledWith({
      labels: mockLabels
    });
  });

  it('devrait filtrer les labels par recherche', async () => {
    const { req, res } = createMocks({}, {}, { search: 'Apple' });

    LabelDisque.findAll.mockResolvedValue([]);

    await disqueController.getLabels(req, res);

    expect(LabelDisque.findAll).toHaveBeenCalledWith({
      where: {
        actif: true,
        nom: { [Op.like]: '%Apple%' }
      },
      order: [['nom', 'ASC']],
      limit: 50
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    LabelDisque.findAll.mockRejectedValue(error);

    await disqueController.getLabels(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - getEmplacements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les emplacements actifs', async () => {
    const { req, res } = createMocks();

    const mockEmplacements = [
      { id: 1, libelle: 'Etagere A1', actif: true },
      { id: 2, libelle: 'Etagere B2', actif: true }
    ];

    EmplacementDisque.findAll.mockResolvedValue(mockEmplacements);

    await disqueController.getEmplacements(req, res);

    expect(EmplacementDisque.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['libelle', 'ASC']]
    });

    expect(res.json).toHaveBeenCalledWith({
      emplacements: mockEmplacements
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    EmplacementDisque.findAll.mockRejectedValue(error);

    await disqueController.getEmplacements(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - getArtistes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les artistes actifs', async () => {
    const { req, res } = createMocks();

    const mockArtistes = [
      { id: 1, nom: 'Beatles', prenom: 'The', actif: true },
      { id: 2, nom: 'Floyd', prenom: 'Pink', actif: true }
    ];

    Artiste.findAll.mockResolvedValue(mockArtistes);

    await disqueController.getArtistes(req, res);

    expect(Artiste.findAll).toHaveBeenCalledWith({
      where: { actif: true },
      order: [['nom', 'ASC']],
      limit: 100
    });

    expect(res.json).toHaveBeenCalledWith({
      artistes: mockArtistes
    });
  });

  it('devrait filtrer les artistes par recherche sur nom', async () => {
    const { req, res } = createMocks({}, {}, { search: 'Beatles' });

    Artiste.findAll.mockResolvedValue([]);

    await disqueController.getArtistes(req, res);

    expect(Artiste.findAll).toHaveBeenCalledWith({
      where: expect.objectContaining({
        actif: true,
        [Op.or]: expect.arrayContaining([
          { nom: { [Op.like]: '%Beatles%' } },
          { prenom: { [Op.like]: '%Beatles%' } },
          { nom_scene: { [Op.like]: '%Beatles%' } }
        ])
      }),
      order: [['nom', 'ASC']],
      limit: 100
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Artiste.findAll.mockRejectedValue(error);

    await disqueController.getArtistes(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - createArtiste', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait creer un artiste avec succes', async () => {
    const { req, res } = createMocks({
      nom: 'Lennon',
      prenom: 'John',
      nom_scene: 'John Lennon',
      actif: true
    });

    const mockArtiste = {
      id: 1,
      nom: 'Lennon',
      prenom: 'John',
      nom_scene: 'John Lennon',
      actif: true
    };

    Artiste.create.mockResolvedValue(mockArtiste);

    await disqueController.createArtiste(req, res);

    expect(Artiste.create).toHaveBeenCalledWith({
      nom: 'Lennon',
      prenom: 'John',
      nom_scene: 'John Lennon',
      actif: true
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockArtiste);
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({
      nom: 'Test'
    });

    const error = new Error('Database error');
    Artiste.create.mockRejectedValue(error);

    await disqueController.createArtiste(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});

describe('disqueController - createLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait creer un label avec succes', async () => {
    const { req, res } = createMocks({
      nom: 'Apple Records',
      actif: true
    });

    const mockLabel = {
      id: 1,
      nom: 'Apple Records',
      actif: true
    };

    LabelDisque.create.mockResolvedValue(mockLabel);

    await disqueController.createLabel(req, res);

    expect(LabelDisque.create).toHaveBeenCalledWith({
      nom: 'Apple Records',
      actif: true
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockLabel);
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({
      nom: 'Test Label'
    });

    const error = new Error('Database error');
    LabelDisque.create.mockRejectedValue(error);

    await disqueController.createLabel(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database error'
    });
  });
});
