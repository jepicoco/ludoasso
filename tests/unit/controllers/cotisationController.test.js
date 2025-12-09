/**
 * Tests unitaires pour cotisationController
 * Gestion des cotisations et des paiements
 */

const cotisationController = require('../../../backend/controllers/cotisationController');
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
    json: jest.fn().mockReturnThis(),
    download: jest.fn((filepath, filename, callback) => {
      // Simuler un telechargement reussi
      if (callback) callback(null);
    })
  };
  const next = jest.fn();
  return { req, res, next };
};

// Mock des modeles Sequelize
jest.mock('../../../backend/models', () => ({
  Cotisation: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  Utilisateur: {
    findByPk: jest.fn()
  },
  TarifCotisation: {
    findByPk: jest.fn()
  },
  CodeReduction: {
    findByPk: jest.fn()
  },
  ModePaiement: {
    findByPk: jest.fn()
  },
  ParametresStructure: {
    findOne: jest.fn()
  }
}));

// Mock des services
jest.mock('../../../backend/services/emailService', () => ({
  sendEmail: jest.fn()
}));

jest.mock('../../../backend/services/eventTriggerService', () => ({
  triggerCotisationCreated: jest.fn()
}));

jest.mock('../../../backend/services/pdfService', () => ({
  genererRecuCotisation: jest.fn()
}));

const { Cotisation, Utilisateur, TarifCotisation, CodeReduction, ModePaiement, ParametresStructure } = require('../../../backend/models');
const eventTriggerService = require('../../../backend/services/eventTriggerService');
const pdfService = require('../../../backend/services/pdfService');

describe('cotisationController - getAllCotisations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner toutes les cotisations', async () => {
    const { req, res } = createMocks();

    const mockCotisations = [
      {
        id: 1,
        utilisateur_id: 1,
        montant_paye: 50,
        statut: 'en_cours',
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          utilisateur_id: 1,
          montant_paye: 50,
          statut: 'en_cours',
          utilisateur: { id: 1, nom: 'Doe', prenom: 'John', email: 'john@example.com' }
        })
      }
    ];

    Cotisation.findAll.mockResolvedValue(mockCotisations);

    await cotisationController.getAllCotisations(req, res);

    expect(Cotisation.findAll).toHaveBeenCalledWith({
      where: {},
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'email', 'code_barre']
        },
        {
          model: TarifCotisation,
          as: 'tarif',
          attributes: ['id', 'libelle', 'type_periode', 'type_montant']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 1,
        adherent: expect.objectContaining({ nom: 'Doe' })
      })
    ]);
  });

  it('devrait filtrer par utilisateur_id', async () => {
    const { req, res } = createMocks({}, {}, { utilisateur_id: '5' });

    Cotisation.findAll.mockResolvedValue([]);

    await cotisationController.getAllCotisations(req, res);

    expect(Cotisation.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { utilisateur_id: '5' }
      })
    );
  });

  it('devrait filtrer par adherent_id (retrocompatibilite)', async () => {
    const { req, res } = createMocks({}, {}, { adherent_id: '3' });

    Cotisation.findAll.mockResolvedValue([]);

    await cotisationController.getAllCotisations(req, res);

    expect(Cotisation.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { utilisateur_id: '3' }
      })
    );
  });

  it('devrait filtrer par statut', async () => {
    const { req, res } = createMocks({}, {}, { statut: 'expiree' });

    Cotisation.findAll.mockResolvedValue([]);

    await cotisationController.getAllCotisations(req, res);

    expect(Cotisation.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: 'expiree' }
      })
    );
  });

  it('devrait filtrer par annee', async () => {
    const { req, res } = createMocks({}, {}, { annee: '2024' });

    Cotisation.findAll.mockResolvedValue([]);

    await cotisationController.getAllCotisations(req, res);

    expect(Cotisation.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Op.or]: expect.arrayContaining([
            expect.objectContaining({
              periode_debut: expect.any(Object)
            })
          ])
        })
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Cotisation.findAll.mockRejectedValue(error);

    await cotisationController.getAllCotisations(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération des cotisations',
      message: 'Database error'
    });
  });
});

describe('cotisationController - getCotisationById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner une cotisation par ID', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockCotisation = {
      id: 1,
      utilisateur_id: 1,
      montant_paye: 50,
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur_id: 1,
        montant_paye: 50,
        utilisateur: { id: 1, nom: 'Doe', prenom: 'John' }
      })
    };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);

    await cotisationController.getCotisationById(req, res);

    expect(Cotisation.findByPk).toHaveBeenCalledWith('1', {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: TarifCotisation, as: 'tarif' }
      ]
    });

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        adherent: expect.objectContaining({ nom: 'Doe' })
      })
    );
  });

  it('devrait retourner 404 si cotisation non trouvee', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Cotisation.findByPk.mockResolvedValue(null);

    await cotisationController.getCotisationById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cotisation non trouvée'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Cotisation.findByPk.mockRejectedValue(error);

    await cotisationController.getCotisationById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la récupération de la cotisation',
      message: 'Database error'
    });
  });
});

describe('cotisationController - createCotisation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait creer une cotisation avec succes', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1,
      date_paiement: '2024-01-15',
      mode_paiement: 'especes'
    });

    const mockUtilisateur = {
      id: 1,
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      adhesion_association: false,
      update: jest.fn().mockResolvedValue(true)
    };

    const mockTarif = {
      id: 1,
      libelle: 'Tarif Normal',
      montant_base: 50,
      type_montant: 'fixe',
      type_periode: 'annuelle',
      estValide: jest.fn().mockReturnValue(true),
      calculerDatesPeriode: jest.fn().mockReturnValue({
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31')
      }),
      calculerMontant: jest.fn().mockReturnValue(50)
    };

    const mockCreatedCotisation = {
      id: 1,
      utilisateur_id: 1,
      montant_base: 50,
      montant_paye: 50,
      statut: 'en_cours'
    };

    const mockCotisationComplete = {
      id: 1,
      utilisateur_id: 1,
      montant_paye: 50,
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        utilisateur_id: 1,
        montant_paye: 50,
        utilisateur: mockUtilisateur,
        tarif: mockTarif
      })
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TarifCotisation.findByPk.mockResolvedValue(mockTarif);
    Cotisation.create.mockResolvedValue(mockCreatedCotisation);
    Cotisation.findByPk.mockResolvedValue(mockCotisationComplete);
    eventTriggerService.triggerCotisationCreated.mockResolvedValue(true);

    await cotisationController.createCotisation(req, res);

    expect(Utilisateur.findByPk).toHaveBeenCalledWith(1);
    expect(TarifCotisation.findByPk).toHaveBeenCalledWith(1);
    expect(mockTarif.estValide).toHaveBeenCalled();
    expect(mockTarif.calculerDatesPeriode).toHaveBeenCalled();
    expect(mockTarif.calculerMontant).toHaveBeenCalled();
    expect(Cotisation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        utilisateur_id: 1,
        tarif_cotisation_id: 1,
        montant_base: 50,
        montant_paye: 50,
        statut: 'en_cours'
      })
    );
    expect(mockUtilisateur.update).toHaveBeenCalledWith(
      expect.objectContaining({
        statut: 'actif'
      })
    );
    expect(eventTriggerService.triggerCotisationCreated).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        adherent: expect.any(Object)
      })
    );
  });

  it('devrait accepter adherent_id pour retrocompatibilite', async () => {
    const { req, res } = createMocks({
      adherent_id: 2,
      tarif_cotisation_id: 1
    });

    const mockUtilisateur = {
      id: 2,
      adhesion_association: false,
      update: jest.fn()
    };

    const mockTarif = {
      id: 1,
      montant_base: 50,
      type_montant: 'fixe',
      estValide: jest.fn().mockReturnValue(true),
      calculerDatesPeriode: jest.fn().mockReturnValue({
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31')
      }),
      calculerMontant: jest.fn().mockReturnValue(50)
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TarifCotisation.findByPk.mockResolvedValue(mockTarif);
    Cotisation.create.mockResolvedValue({ id: 1 });
    Cotisation.findByPk.mockResolvedValue({
      toJSON: jest.fn().mockReturnValue({ id: 1, utilisateur: mockUtilisateur })
    });

    await cotisationController.createCotisation(req, res);

    expect(Utilisateur.findByPk).toHaveBeenCalledWith(2);
  });

  it('devrait retourner 400 si utilisateur manquant', async () => {
    const { req, res } = createMocks({
      tarif_cotisation_id: 1
    });

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'L\'utilisateur et le tarif sont obligatoires'
    });
  });

  it('devrait retourner 400 si tarif manquant', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1
    });

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'L\'utilisateur et le tarif sont obligatoires'
    });
  });

  it('devrait retourner 404 si utilisateur inexistant', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 999,
      tarif_cotisation_id: 1
    });

    Utilisateur.findByPk.mockResolvedValue(null);

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Utilisateur non trouvé'
    });
  });

  it('devrait retourner 404 si tarif inexistant', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 999
    });

    Utilisateur.findByPk.mockResolvedValue({ id: 1 });
    TarifCotisation.findByPk.mockResolvedValue(null);

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Tarif non trouvé'
    });
  });

  it('devrait retourner 400 si tarif non valide', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1
    });

    Utilisateur.findByPk.mockResolvedValue({ id: 1 });
    TarifCotisation.findByPk.mockResolvedValue({
      id: 1,
      estValide: jest.fn().mockReturnValue(false)
    });

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ce tarif n\'est pas valide ou n\'est plus actif'
    });
  });

  it('devrait appliquer un code de reduction', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1,
      code_reduction_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      adhesion_association: false,
      update: jest.fn()
    };

    const mockTarif = {
      id: 1,
      montant_base: 50,
      type_montant: 'fixe',
      estValide: jest.fn().mockReturnValue(true),
      calculerDatesPeriode: jest.fn().mockReturnValue({
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31')
      }),
      calculerMontant: jest.fn().mockReturnValue(50)
    };

    const mockCodeReduction = {
      id: 1,
      code: 'PROMO10',
      estValide: jest.fn().mockReturnValue(true),
      calculerReduction: jest.fn().mockReturnValue({
        montant_final: 45,
        reduction: 5,
        avoir: 0
      }),
      incrementerUsage: jest.fn()
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TarifCotisation.findByPk.mockResolvedValue(mockTarif);
    CodeReduction.findByPk.mockResolvedValue(mockCodeReduction);
    Cotisation.create.mockResolvedValue({ id: 1 });
    Cotisation.findByPk.mockResolvedValue({
      toJSON: jest.fn().mockReturnValue({ id: 1, utilisateur: mockUtilisateur })
    });

    await cotisationController.createCotisation(req, res);

    expect(CodeReduction.findByPk).toHaveBeenCalledWith(1);
    expect(mockCodeReduction.estValide).toHaveBeenCalled();
    expect(mockCodeReduction.calculerReduction).toHaveBeenCalledWith(50);
    expect(mockCodeReduction.incrementerUsage).toHaveBeenCalled();
    expect(Cotisation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        montant_paye: 45,
        reduction_appliquee: 5,
        code_reduction_id: 1,
        code_reduction_applique: 'PROMO10'
      })
    );
  });

  it('devrait retourner 404 si code reduction inexistant', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1,
      code_reduction_id: 999
    });

    const mockUtilisateur = { id: 1, adhesion_association: false };
    const mockTarif = {
      id: 1,
      montant_base: 50,
      estValide: jest.fn().mockReturnValue(true),
      calculerDatesPeriode: jest.fn().mockReturnValue({
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31')
      }),
      calculerMontant: jest.fn().mockReturnValue(50)
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TarifCotisation.findByPk.mockResolvedValue(mockTarif);
    CodeReduction.findByPk.mockResolvedValue(null);

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Code de réduction non trouvé'
    });
  });

  it('devrait retourner 400 si code reduction invalide', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1,
      code_reduction_id: 1
    });

    const mockUtilisateur = { id: 1, adhesion_association: false };
    const mockTarif = {
      id: 1,
      montant_base: 50,
      estValide: jest.fn().mockReturnValue(true),
      calculerDatesPeriode: jest.fn().mockReturnValue({
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31')
      }),
      calculerMontant: jest.fn().mockReturnValue(50)
    };

    const mockCodeReduction = {
      id: 1,
      estValide: jest.fn().mockReturnValue(false)
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TarifCotisation.findByPk.mockResolvedValue(mockTarif);
    CodeReduction.findByPk.mockResolvedValue(mockCodeReduction);

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ce code de réduction n\'est pas valide ou est expiré'
    });
  });

  it('devrait gerer le mode paiement avec ID', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1,
      mode_paiement_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      adhesion_association: false,
      update: jest.fn()
    };

    const mockTarif = {
      id: 1,
      montant_base: 50,
      type_montant: 'fixe',
      estValide: jest.fn().mockReturnValue(true),
      calculerDatesPeriode: jest.fn().mockReturnValue({
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31')
      }),
      calculerMontant: jest.fn().mockReturnValue(50)
    };

    const mockModePaiement = {
      id: 1,
      libelle: 'Carte Bancaire'
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TarifCotisation.findByPk.mockResolvedValue(mockTarif);
    ModePaiement.findByPk.mockResolvedValue(mockModePaiement);
    Cotisation.create.mockResolvedValue({ id: 1 });
    Cotisation.findByPk.mockResolvedValue({
      toJSON: jest.fn().mockReturnValue({ id: 1, utilisateur: mockUtilisateur })
    });

    await cotisationController.createCotisation(req, res);

    expect(ModePaiement.findByPk).toHaveBeenCalledWith(1);
    expect(Cotisation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode_paiement: 'carte_bancaire'
      })
    );
  });

  it('devrait calculer les dates pour tarif prorata', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1,
      date_debut: '2024-06-15'
    });

    const mockUtilisateur = {
      id: 1,
      adhesion_association: false,
      update: jest.fn()
    };

    const mockTarif = {
      id: 1,
      montant_base: 50,
      type_montant: 'prorata',
      estValide: jest.fn().mockReturnValue(true),
      calculerDatesPeriode: jest.fn().mockReturnValue({
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31')
      }),
      calculerMontant: jest.fn().mockReturnValue(25)
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TarifCotisation.findByPk.mockResolvedValue(mockTarif);
    Cotisation.create.mockResolvedValue({ id: 1 });
    Cotisation.findByPk.mockResolvedValue({
      toJSON: jest.fn().mockReturnValue({ id: 1, utilisateur: mockUtilisateur })
    });

    await cotisationController.createCotisation(req, res);

    expect(Cotisation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        periode_debut: expect.any(Date),
        periode_fin: expect.any(Date),
        montant_paye: 25
      })
    );
  });

  it('ne devrait pas bloquer si evenement echoue', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1
    });

    const mockUtilisateur = {
      id: 1,
      adhesion_association: false,
      update: jest.fn()
    };

    const mockTarif = {
      id: 1,
      montant_base: 50,
      type_montant: 'fixe',
      estValide: jest.fn().mockReturnValue(true),
      calculerDatesPeriode: jest.fn().mockReturnValue({
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31')
      }),
      calculerMontant: jest.fn().mockReturnValue(50)
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    TarifCotisation.findByPk.mockResolvedValue(mockTarif);
    Cotisation.create.mockResolvedValue({ id: 1 });
    Cotisation.findByPk.mockResolvedValue({
      toJSON: jest.fn().mockReturnValue({ id: 1, utilisateur: mockUtilisateur })
    });
    eventTriggerService.triggerCotisationCreated.mockRejectedValue(new Error('Event error'));

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({
      utilisateur_id: 1,
      tarif_cotisation_id: 1
    });

    const error = new Error('Database error');
    Utilisateur.findByPk.mockRejectedValue(error);

    await cotisationController.createCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la création de la cotisation',
      message: 'Database error'
    });
  });
});

describe('cotisationController - updateCotisation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait mettre a jour une cotisation', async () => {
    const { req, res } = createMocks(
      { statut: 'expiree', notes: 'Cotisation expirée' },
      { id: '1' }
    );

    const mockCotisation = {
      id: 1,
      statut: 'en_cours',
      notes: '',
      update: jest.fn().mockResolvedValue(true)
    };

    const mockUpdatedCotisation = {
      id: 1,
      statut: 'expiree',
      notes: 'Cotisation expirée',
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        statut: 'expiree',
        notes: 'Cotisation expirée',
        utilisateur: { id: 1, nom: 'Doe' }
      })
    };

    Cotisation.findByPk.mockResolvedValueOnce(mockCotisation);
    Cotisation.findByPk.mockResolvedValueOnce(mockUpdatedCotisation);

    await cotisationController.updateCotisation(req, res);

    expect(mockCotisation.update).toHaveBeenCalledWith({
      statut: 'expiree',
      notes: 'Cotisation expirée'
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        statut: 'expiree',
        adherent: expect.any(Object)
      })
    );
  });

  it('ne devrait pas modifier les champs critiques', async () => {
    const { req, res } = createMocks(
      {
        adherent_id: 999,
        montant_base: 100,
        reduction_appliquee: 20,
        montant_paye: 80,
        notes: 'Nouvelle note'
      },
      { id: '1' }
    );

    const mockCotisation = {
      id: 1,
      update: jest.fn().mockResolvedValue(true)
    };

    Cotisation.findByPk.mockResolvedValueOnce(mockCotisation);
    Cotisation.findByPk.mockResolvedValueOnce({
      toJSON: jest.fn().mockReturnValue({ id: 1, utilisateur: {} })
    });

    await cotisationController.updateCotisation(req, res);

    expect(mockCotisation.update).toHaveBeenCalledWith({
      notes: 'Nouvelle note'
    });
  });

  it('devrait retourner 404 si cotisation non trouvee', async () => {
    const { req, res } = createMocks({ notes: 'Test' }, { id: '999' });

    Cotisation.findByPk.mockResolvedValue(null);

    await cotisationController.updateCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cotisation non trouvée'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({ notes: 'Test' }, { id: '1' });

    const error = new Error('Database error');
    Cotisation.findByPk.mockRejectedValue(error);

    await cotisationController.updateCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la mise à jour de la cotisation',
      message: 'Database error'
    });
  });
});

describe('cotisationController - annulerCotisation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait annuler une cotisation', async () => {
    const { req, res } = createMocks(
      { motif: 'Remboursement demandé' },
      { id: '1' }
    );

    const mockCotisation = {
      id: 1,
      statut: 'en_cours',
      annuler: jest.fn().mockResolvedValue(true)
    };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);

    await cotisationController.annulerCotisation(req, res);

    expect(mockCotisation.annuler).toHaveBeenCalledWith('Remboursement demandé');
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cotisation annulée avec succès',
      cotisation: mockCotisation
    });
  });

  it('devrait retourner 404 si cotisation non trouvee', async () => {
    const { req, res } = createMocks({ motif: 'Test' }, { id: '999' });

    Cotisation.findByPk.mockResolvedValue(null);

    await cotisationController.annulerCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cotisation non trouvée'
    });
  });

  it('devrait retourner 400 si cotisation deja annulee', async () => {
    const { req, res } = createMocks({ motif: 'Test' }, { id: '1' });

    const mockCotisation = {
      id: 1,
      statut: 'annulee'
    };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);

    await cotisationController.annulerCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cette cotisation est déjà annulée'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({ motif: 'Test' }, { id: '1' });

    const error = new Error('Database error');
    Cotisation.findByPk.mockRejectedValue(error);

    await cotisationController.annulerCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de l\'annulation de la cotisation',
      message: 'Database error'
    });
  });
});

describe('cotisationController - deleteCotisation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait supprimer une cotisation annulee', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockCotisation = {
      id: 1,
      statut: 'annulee',
      destroy: jest.fn().mockResolvedValue(true)
    };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);

    await cotisationController.deleteCotisation(req, res);

    expect(mockCotisation.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cotisation supprimée avec succès'
    });
  });

  it('devrait retourner 404 si cotisation non trouvee', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Cotisation.findByPk.mockResolvedValue(null);

    await cotisationController.deleteCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cotisation non trouvée'
    });
  });

  it('devrait retourner 400 si cotisation non annulee', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockCotisation = {
      id: 1,
      statut: 'en_cours'
    };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);

    await cotisationController.deleteCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Seules les cotisations annulées peuvent être supprimées. Veuillez d\'abord annuler cette cotisation.'
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const error = new Error('Database error');
    Cotisation.findByPk.mockRejectedValue(error);

    await cotisationController.deleteCotisation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la suppression de la cotisation',
      message: 'Database error'
    });
  });
});

describe('cotisationController - verifierCotisationActive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait verifier la cotisation active d\'un utilisateur', async () => {
    const { req, res } = createMocks({}, { utilisateur_id: '1' });

    const mockUtilisateur = { id: 1, nom: 'Doe', prenom: 'John' };

    const mockCotisation = {
      id: 1,
      utilisateur_id: 1,
      statut: 'en_cours',
      periode_debut: new Date('2024-01-01'),
      periode_fin: new Date('2024-12-31'),
      joursRestants: jest.fn().mockReturnValue(180)
    };

    Utilisateur.findByPk.mockResolvedValue(mockUtilisateur);
    Cotisation.findOne.mockResolvedValue(mockCotisation);

    await cotisationController.verifierCotisationActive(req, res);

    expect(Utilisateur.findByPk).toHaveBeenCalledWith('1');
    expect(Cotisation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          utilisateur_id: '1',
          statut: 'en_cours'
        })
      })
    );
    expect(mockCotisation.joursRestants).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      actif: true,
      cotisation: mockCotisation,
      jours_restants: 180
    });
  });

  it('devrait accepter adherent_id pour retrocompatibilite', async () => {
    const { req, res } = createMocks({}, { adherent_id: '2' });

    Utilisateur.findByPk.mockResolvedValue({ id: 2 });
    Cotisation.findOne.mockResolvedValue(null);

    await cotisationController.verifierCotisationActive(req, res);

    expect(Utilisateur.findByPk).toHaveBeenCalledWith('2');
  });

  it('devrait retourner 404 si utilisateur non trouve', async () => {
    const { req, res } = createMocks({}, { utilisateur_id: '999' });

    Utilisateur.findByPk.mockResolvedValue(null);

    await cotisationController.verifierCotisationActive(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Utilisateur non trouvé'
    });
  });

  it('devrait retourner actif false si aucune cotisation active', async () => {
    const { req, res } = createMocks({}, { utilisateur_id: '1' });

    Utilisateur.findByPk.mockResolvedValue({ id: 1 });
    Cotisation.findOne.mockResolvedValue(null);

    await cotisationController.verifierCotisationActive(req, res);

    expect(res.json).toHaveBeenCalledWith({
      actif: false,
      message: 'Aucune cotisation active trouvée pour cet adhérent'
    });
  });

  it('devrait utiliser date fournie en query', async () => {
    const { req, res } = createMocks({}, { utilisateur_id: '1' }, { date: '2024-06-15' });

    Utilisateur.findByPk.mockResolvedValue({ id: 1 });
    Cotisation.findOne.mockResolvedValue(null);

    await cotisationController.verifierCotisationActive(req, res);

    expect(Cotisation.findOne).toHaveBeenCalled();
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks({}, { utilisateur_id: '1' });

    const error = new Error('Database error');
    Utilisateur.findByPk.mockRejectedValue(error);

    await cotisationController.verifierCotisationActive(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la vérification de la cotisation',
      message: 'Database error'
    });
  });
});

describe('cotisationController - mettreAJourStatutsExpires', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait mettre a jour les cotisations expirees', async () => {
    const { req, res } = createMocks();

    Cotisation.update.mockResolvedValue([5]);

    await cotisationController.mettreAJourStatutsExpires(req, res);

    expect(Cotisation.update).toHaveBeenCalledWith(
      { statut: 'expiree' },
      {
        where: {
          statut: 'en_cours',
          periode_fin: {
            [Op.lt]: expect.any(Date)
          }
        }
      }
    );
    expect(res.json).toHaveBeenCalledWith({
      message: '5 cotisation(s) mise(s) à jour',
      count: 5
    });
  });

  it('devrait retourner 0 si aucune cotisation a mettre a jour', async () => {
    const { req, res } = createMocks();

    Cotisation.update.mockResolvedValue([0]);

    await cotisationController.mettreAJourStatutsExpires(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: '0 cotisation(s) mise(s) à jour',
      count: 0
    });
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Cotisation.update.mockRejectedValue(error);

    await cotisationController.mettreAJourStatutsExpires(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la mise à jour des statuts',
      message: 'Database error'
    });
  });
});

describe('cotisationController - getStatistiques', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les statistiques pour une annee', async () => {
    const { req, res } = createMocks({}, {}, { annee: '2024' });

    Cotisation.count.mockResolvedValueOnce(50);
    Cotisation.count.mockResolvedValueOnce(30);
    Cotisation.count.mockResolvedValueOnce(15);
    Cotisation.count.mockResolvedValueOnce(5);

    Cotisation.findAll.mockResolvedValue([
      { montant_paye: '50.00' },
      { montant_paye: '75.50' },
      { montant_paye: '100.00' }
    ]);

    await cotisationController.getStatistiques(req, res);

    expect(Cotisation.count).toHaveBeenCalledTimes(4);
    expect(Cotisation.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: ['montant_paye']
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      annee: 2024,
      total: 50,
      par_statut: {
        en_cours: 30,
        expirees: 15,
        annulees: 5
      },
      montant_total: 225.5
    });
  });

  it('devrait utiliser annee courante par defaut', async () => {
    const { req, res } = createMocks();

    const currentYear = new Date().getFullYear();

    Cotisation.count.mockResolvedValue(0);
    Cotisation.findAll.mockResolvedValue([]);

    await cotisationController.getStatistiques(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        annee: currentYear
      })
    );
  });

  it('devrait arrondir le montant total correctement', async () => {
    const { req, res } = createMocks({}, {}, { annee: '2024' });

    Cotisation.count.mockResolvedValue(0);
    Cotisation.findAll.mockResolvedValue([
      { montant_paye: '33.333' },
      { montant_paye: '66.666' }
    ]);

    await cotisationController.getStatistiques(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        montant_total: 100
      })
    );
  });

  it('devrait retourner 500 en cas d\'erreur', async () => {
    const { req, res } = createMocks();

    const error = new Error('Database error');
    Cotisation.count.mockRejectedValue(error);

    await cotisationController.getStatistiques(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors du calcul des statistiques',
      message: 'Database error'
    });
  });
});

describe('cotisationController - genererRecuPDF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait generer un recu PDF', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockCotisation = {
      id: 1,
      utilisateur_id: 1,
      montant_paye: 50
    };

    const mockStructure = {
      id: 1,
      nom: 'Ludothèque Test',
      adresse: '123 Rue Test',
      ville: 'Paris'
    };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);
    ParametresStructure.findOne.mockResolvedValue(mockStructure);
    pdfService.genererRecuCotisation.mockResolvedValue({
      filepath: '/tmp/recu-1.pdf',
      filename: 'recu-cotisation-1.pdf'
    });

    await cotisationController.genererRecuPDF(req, res);

    expect(Cotisation.findByPk).toHaveBeenCalledWith('1', {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: TarifCotisation, as: 'tarif' }
      ]
    });
    expect(ParametresStructure.findOne).toHaveBeenCalledWith({
      order: [['id', 'ASC']]
    });
    expect(pdfService.genererRecuCotisation).toHaveBeenCalledWith(
      mockCotisation,
      mockStructure
    );
    expect(res.download).toHaveBeenCalledWith(
      '/tmp/recu-1.pdf',
      'recu-cotisation-1.pdf',
      expect.any(Function)
    );
  });

  it('devrait retourner 404 si cotisation non trouvee', async () => {
    const { req, res } = createMocks({}, { id: '999' });

    Cotisation.findByPk.mockResolvedValue(null);

    await cotisationController.genererRecuPDF(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cotisation non trouvée'
    });
  });

  it('devrait retourner 500 si structure non configuree', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    Cotisation.findByPk.mockResolvedValue({ id: 1 });
    ParametresStructure.findOne.mockResolvedValue(null);

    await cotisationController.genererRecuPDF(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Paramètres de structure non configurés'
    });
  });

  it('devrait gerer erreur lors du telechargement', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockCotisation = { id: 1 };
    const mockStructure = { id: 1, nom: 'Test' };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);
    ParametresStructure.findOne.mockResolvedValue(mockStructure);
    pdfService.genererRecuCotisation.mockResolvedValue({
      filepath: '/tmp/recu-1.pdf',
      filename: 'recu-cotisation-1.pdf'
    });

    res.download = jest.fn((filepath, filename, callback) => {
      callback(new Error('Download failed'));
    });
    res.headersSent = false;

    await cotisationController.genererRecuPDF(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors du téléchargement du PDF',
      message: 'Download failed'
    });
  });

  it('ne devrait pas envoyer de reponse si headers deja envoyes', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockCotisation = { id: 1 };
    const mockStructure = { id: 1, nom: 'Test' };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);
    ParametresStructure.findOne.mockResolvedValue(mockStructure);
    pdfService.genererRecuCotisation.mockResolvedValue({
      filepath: '/tmp/recu-1.pdf',
      filename: 'recu-cotisation-1.pdf'
    });

    res.download = jest.fn((filepath, filename, callback) => {
      callback(new Error('Download failed'));
    });
    res.headersSent = true;

    await cotisationController.genererRecuPDF(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('devrait retourner 500 en cas d\'erreur de generation PDF', async () => {
    const { req, res } = createMocks({}, { id: '1' });

    const mockCotisation = { id: 1 };
    const mockStructure = { id: 1, nom: 'Test' };

    Cotisation.findByPk.mockResolvedValue(mockCotisation);
    ParametresStructure.findOne.mockResolvedValue(mockStructure);
    pdfService.genererRecuCotisation.mockRejectedValue(new Error('PDF generation failed'));

    await cotisationController.genererRecuPDF(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erreur lors de la génération du reçu PDF',
      message: 'PDF generation failed'
    });
  });
});
