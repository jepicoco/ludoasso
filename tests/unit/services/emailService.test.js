// Générer une clé de chiffrement de 32 bytes (64 hex chars) AVANT de charger le module
const crypto = require('crypto');
const originalEnv = process.env.EMAIL_ENCRYPTION_KEY;
process.env.EMAIL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

const nodemailer = require('nodemailer');

// Mock nodemailer AVANT de charger le service
jest.mock('nodemailer');

// Mock des modèles Sequelize
jest.mock('../../../backend/models', () => ({
  ConfigurationEmail: {
    findOne: jest.fn()
  },
  TemplateMessage: {
    findOne: jest.fn()
  },
  EmailLog: {
    create: jest.fn()
  },
  ModuleActif: {
    isActif: jest.fn()
  }
}));

// Importer le service APRÈS avoir configuré l'environnement et les mocks
const emailService = require('../../../backend/services/emailService');
const { ConfigurationEmail, TemplateMessage, EmailLog, ModuleActif } = require('../../../backend/models');

describe('EmailService', () => {
  let mockTransporter;

  afterAll(() => {
    // Restaurer les variables d'environnement
    process.env.EMAIL_ENCRYPTION_KEY = originalEnv;
  });

  beforeEach(() => {
    // Reset des mocks
    jest.clearAllMocks();

    // Mock du transporteur nodemailer
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn().mockResolvedValue(true)
    };

    nodemailer.createTransport.mockReturnValue(mockTransporter);

    // Reset du singleton
    emailService.transporter = null;
    emailService.defaultConfig = null;

    // Mock par défaut de ModuleActif
    ModuleActif.isActif.mockResolvedValue(true);
  });

  describe('encryptPassword / decryptPassword', () => {
    it('should encrypt and decrypt a password correctly', () => {
      const password = 'MySecurePassword123!';

      const encrypted = emailService.encryptPassword(password);
      expect(encrypted).toBeTruthy();
      expect(encrypted).toContain(':'); // Format: iv:encryptedData
      expect(encrypted).not.toBe(password);

      const decrypted = emailService.decryptPassword(encrypted);
      expect(decrypted).toBe(password);
    });

    it('should return empty string when encrypting empty password', () => {
      const encrypted = emailService.encryptPassword('');
      expect(encrypted).toBe('');
    });

    it('should return empty string when decrypting empty string', () => {
      const decrypted = emailService.decryptPassword('');
      expect(decrypted).toBe('');
    });

    it('should throw error when decrypting invalid format', () => {
      expect(() => {
        emailService.decryptPassword('invalid-format');
      }).toThrow('Erreur de déchiffrement du mot de passe');
    });

    it('should throw error when decrypting with wrong data', () => {
      expect(() => {
        emailService.decryptPassword('abc123:def456');
      }).toThrow('Erreur de déchiffrement du mot de passe');
    });

    it('should produce different encrypted values for same password (different IV)', () => {
      const password = 'TestPassword';
      const encrypted1 = emailService.encryptPassword(password);
      const encrypted2 = emailService.encryptPassword(password);

      expect(encrypted1).not.toBe(encrypted2);
      expect(emailService.decryptPassword(encrypted1)).toBe(password);
      expect(emailService.decryptPassword(encrypted2)).toBe(password);
    });
  });

  describe('initialize', () => {
    it('should initialize transporter with active configuration', async () => {
      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: 'plainPassword',
        email_expediteur: 'sender@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);

      const result = await emailService.initialize();

      expect(result).toBe(true);
      expect(ConfigurationEmail.findOne).toHaveBeenCalledWith({
        where: { actif: true },
        order: [['id', 'DESC']]
      });
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'user@example.com',
          pass: 'plainPassword'
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should decrypt encrypted password during initialization', async () => {
      const plainPassword = 'SecurePassword123';
      const encryptedPassword = emailService.encryptPassword(plainPassword);

      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: encryptedPassword,
        email_expediteur: 'sender@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);

      await emailService.initialize();

      const createTransportCall = nodemailer.createTransport.mock.calls[0][0];
      expect(createTransportCall.auth.pass).toBe(plainPassword);
    });

    it('should return false when no active configuration exists', async () => {
      ConfigurationEmail.findOne.mockResolvedValue(null);

      const result = await emailService.initialize();

      expect(result).toBe(false);
      expect(emailService.transporter).toBeNull();
    });

    it('should return false when SMTP verification fails', async () => {
      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: 'password',
        email_expediteur: 'sender@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);
      mockTransporter.verify.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await emailService.initialize();

      expect(result).toBe(false);
      expect(emailService.transporter).toBeTruthy(); // Le transporteur est quand même créé
    });

    it('should handle initialization errors gracefully', async () => {
      ConfigurationEmail.findOne.mockRejectedValue(new Error('Database error'));

      const result = await emailService.initialize();

      expect(result).toBe(false);
    });

    it('should fallback to plain password when decryption fails', async () => {
      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: 'invalid:encrypted:format',
        email_expediteur: 'sender@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);

      await emailService.initialize();

      const createTransportCall = nodemailer.createTransport.mock.calls[0][0];
      expect(createTransportCall.auth.pass).toBe('invalid:encrypted:format');
    });
  });

  describe('getTemplate', () => {
    it('should retrieve active email template by code', async () => {
      const mockTemplate = {
        id: 1,
        code: 'EMPRUNT_CONFIRMATION',
        canal: 'email',
        objet: 'Confirmation d\'emprunt',
        contenu: '<p>Bonjour {{prenom}}</p>',
        actif: true
      };

      TemplateMessage.findOne.mockResolvedValue(mockTemplate);

      const template = await emailService.getTemplate('EMPRUNT_CONFIRMATION');

      expect(template).toEqual(mockTemplate);
      expect(TemplateMessage.findOne).toHaveBeenCalledWith({
        where: {
          code: 'EMPRUNT_CONFIRMATION',
          canal: 'email',
          actif: true
        }
      });
    });

    it('should throw error when template not found', async () => {
      TemplateMessage.findOne.mockResolvedValue(null);

      await expect(emailService.getTemplate('NONEXISTENT_TEMPLATE'))
        .rejects
        .toThrow('Template email \'NONEXISTENT_TEMPLATE\' non trouvé');
    });
  });

  describe('replaceVariables', () => {
    it('should replace all variables in template', () => {
      const template = 'Bonjour {{prenom}} {{nom}}, votre code est {{code}}';
      const variables = {
        prenom: 'Jean',
        nom: 'Dupont',
        code: 'ABC123'
      };

      const result = emailService.replaceVariables(template, variables);

      expect(result).toBe('Bonjour Jean Dupont, votre code est ABC123');
    });

    it('should replace multiple occurrences of same variable', () => {
      const template = '{{prenom}} est inscrit. Bienvenue {{prenom}} !';
      const variables = { prenom: 'Marie' };

      const result = emailService.replaceVariables(template, variables);

      expect(result).toBe('Marie est inscrit. Bienvenue Marie !');
    });

    it('should replace undefined/null variables with empty string', () => {
      const template = 'Bonjour {{prenom}} {{nom}}';
      const variables = { prenom: 'Jean', nom: undefined };

      const result = emailService.replaceVariables(template, variables);

      expect(result).toBe('Bonjour Jean ');
    });

    it('should not replace variables not in the variables object', () => {
      const template = 'Bonjour {{prenom}} {{nom}}';
      const variables = { prenom: 'Jean' };

      const result = emailService.replaceVariables(template, variables);

      expect(result).toBe('Bonjour Jean {{nom}}');
    });

    it('should handle empty variables object', () => {
      const template = 'Bonjour {{prenom}}';
      const variables = {};

      const result = emailService.replaceVariables(template, variables);

      expect(result).toBe('Bonjour {{prenom}}');
    });
  });

  describe('isModuleActive', () => {
    it('should return true when module is active', async () => {
      ModuleActif.isActif.mockResolvedValue(true);

      const result = await emailService.isModuleActive();

      expect(result).toBe(true);
      expect(ModuleActif.isActif).toHaveBeenCalledWith('communications');
    });

    it('should return false when module is inactive', async () => {
      ModuleActif.isActif.mockResolvedValue(false);

      const result = await emailService.isModuleActive();

      expect(result).toBe(false);
    });

    it('should return true (fail-safe) when checking module fails', async () => {
      ModuleActif.isActif.mockRejectedValue(new Error('Table not found'));

      const result = await emailService.isModuleActive();

      expect(result).toBe(true);
    });
  });

  describe('sendEmail', () => {
    beforeEach(async () => {
      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: 'password',
        email_expediteur: 'noreply@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);

      const mockEmailLog = {
        id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      EmailLog.create.mockResolvedValue(mockEmailLog);
    });

    it('should send email successfully', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      const result = await emailService.sendEmail(emailData);

      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
        logId: 1
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      });

      expect(EmailLog.create).toHaveBeenCalledWith({
        template_code: null,
        destinataire: 'recipient@example.com',
        destinataire_nom: null,
        objet: 'Test Email',
        corps: '<p>Test content</p>',
        statut: 'en_attente',
        date_envoi: expect.any(Date),
        adherent_id: null,
        emprunt_id: null,
        cotisation_id: null,
        metadata: null
      });
    });

    it('should use custom from address when provided', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>',
        from: 'custom@example.com'
      };

      await emailService.sendEmail(emailData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@example.com'
        })
      );
    });

    it('should log email with metadata and IDs', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        templateCode: 'EMPRUNT_CONFIRMATION',
        metadata: { destinataire_nom: 'Jean Dupont' },
        adherentId: 5,
        empruntId: 10,
        cotisationId: 3
      };

      await emailService.sendEmail(emailData);

      expect(EmailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          template_code: 'EMPRUNT_CONFIRMATION',
          adherent_id: 5,
          emprunt_id: 10,
          cotisation_id: 3,
          metadata: { destinataire_nom: 'Jean Dupont' }
        })
      );
    });

    it('should throw error when module is inactive', async () => {
      ModuleActif.isActif.mockResolvedValue(false);

      await expect(emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })).rejects.toThrow('Module Communications désactivé');
    });

    it('should throw error when transporter not initialized', async () => {
      ConfigurationEmail.findOne.mockResolvedValue(null);

      await expect(emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })).rejects.toThrow('Service email non initialisé');
    });

    it('should update log status on send failure', async () => {
      const mockEmailLog = {
        id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      EmailLog.create.mockResolvedValue(mockEmailLog);

      const smtpError = new Error('SMTP server unavailable');
      mockTransporter.sendMail.mockRejectedValue(smtpError);

      await expect(emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })).rejects.toThrow('SMTP server unavailable');

      expect(mockEmailLog.update).toHaveBeenCalledWith({
        statut: 'erreur',
        erreur_message: 'SMTP server unavailable'
      });
    });
  });

  describe('sendEmailWithAttachment', () => {
    beforeEach(async () => {
      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: 'password',
        email_expediteur: 'noreply@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);

      const mockEmailLog = {
        id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      EmailLog.create.mockResolvedValue(mockEmailLog);
    });

    it('should send email with attachment', async () => {
      const result = await emailService.sendEmailWithAttachment(
        'recipient@example.com',
        'Test with Attachment',
        '<p>See attached</p>',
        '/path/to/file.pdf',
        'document.pdf'
      );

      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
        logId: 1
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'recipient@example.com',
        subject: 'Test with Attachment',
        html: '<p>See attached</p>',
        attachments: [
          {
            filename: 'document.pdf',
            path: '/path/to/file.pdf'
          }
        ]
      });

      expect(EmailLog.create).toHaveBeenCalledWith({
        destinataire: 'recipient@example.com',
        objet: 'Test with Attachment',
        corps: '<p>See attached</p>',
        statut: 'en_attente',
        date_envoi: expect.any(Date),
        metadata: { attachment: 'document.pdf' }
      });
    });

    it('should update log on attachment send error', async () => {
      const mockEmailLog = {
        id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      EmailLog.create.mockResolvedValue(mockEmailLog);

      mockTransporter.sendMail.mockRejectedValue(new Error('Attachment too large'));

      await expect(emailService.sendEmailWithAttachment(
        'test@example.com',
        'Test',
        '<p>Test</p>',
        '/path/to/file.pdf',
        'file.pdf'
      )).rejects.toThrow('Attachment too large');

      expect(mockEmailLog.update).toHaveBeenCalledWith({
        statut: 'erreur',
        erreur_message: 'Attachment too large'
      });
    });
  });

  describe('sendTemplateEmail', () => {
    beforeEach(async () => {
      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: 'password',
        email_expediteur: 'noreply@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);

      const mockEmailLog = {
        id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      EmailLog.create.mockResolvedValue(mockEmailLog);
    });

    it('should send email using template with variables', async () => {
      const mockTemplate = {
        id: 1,
        code: 'EMPRUNT_CONFIRMATION',
        canal: 'email',
        objet: 'Confirmation emprunt - {{titre_jeu}}',
        contenu: '<p>Bonjour {{prenom}} {{nom}}, vous avez emprunté {{titre_jeu}}</p>',
        actif: true
      };

      TemplateMessage.findOne.mockResolvedValue(mockTemplate);

      const variables = {
        prenom: 'Jean',
        nom: 'Dupont',
        titre_jeu: 'Catan'
      };

      const result = await emailService.sendTemplateEmail(
        'EMPRUNT_CONFIRMATION',
        'jean.dupont@example.com',
        variables,
        { empruntId: 5 }
      );

      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
        logId: 1
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jean.dupont@example.com',
          subject: 'Confirmation emprunt - Catan',
          html: '<p>Bonjour Jean Dupont, vous avez emprunté Catan</p>'
        })
      );
    });

    it('should throw error when template not found', async () => {
      TemplateMessage.findOne.mockResolvedValue(null);

      await expect(emailService.sendTemplateEmail(
        'NONEXISTENT',
        'test@example.com',
        {}
      )).rejects.toThrow('Template email \'NONEXISTENT\' non trouvé');
    });

    it('should create destinataire_nom from prenom and nom variables', async () => {
      const mockTemplate = {
        code: 'TEST',
        objet: 'Test',
        contenu: '<p>{{prenom}} {{nom}}</p>',
        actif: true
      };

      TemplateMessage.findOne.mockResolvedValue(mockTemplate);

      await emailService.sendTemplateEmail(
        'TEST',
        'test@example.com',
        { prenom: 'Marie', nom: 'Martin' }
      );

      expect(EmailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            destinataire_nom: 'Marie Martin',
            variables: { prenom: 'Marie', nom: 'Martin' }
          }
        })
      );
    });
  });

  describe('testConfiguration', () => {
    it('should test SMTP configuration successfully', async () => {
      const config = {
        smtp_host: 'smtp.test.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'test@test.com',
        smtp_password: 'password'
      };

      const result = await emailService.testConfiguration(config);

      expect(result).toEqual({
        success: true,
        message: 'Connexion SMTP réussie'
      });

      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should decrypt encrypted password when testing', async () => {
      const plainPassword = 'MyTestPassword';
      const encryptedPassword = emailService.encryptPassword(plainPassword);

      const config = {
        smtp_host: 'smtp.test.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'test@test.com',
        smtp_password: encryptedPassword
      };

      await emailService.testConfiguration(config);

      const createTransportCall = nodemailer.createTransport.mock.calls[nodemailer.createTransport.mock.calls.length - 1][0];
      expect(createTransportCall.auth.pass).toBe(plainPassword);
    });

    it('should return error when SMTP connection fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection refused'));

      const config = {
        smtp_host: 'invalid.smtp.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'test@test.com',
        smtp_password: 'password'
      };

      const result = await emailService.testConfiguration(config);

      expect(result).toEqual({
        success: false,
        message: 'Connection refused'
      });
    });

    it('should use default values for optional config parameters', async () => {
      const config = {
        smtp_host: 'smtp.test.com',
        smtp_port: 587,
        smtp_user: 'test@test.com',
        smtp_password: 'password'
      };

      await emailService.testConfiguration(config);

      const createTransportCall = nodemailer.createTransport.mock.calls[nodemailer.createTransport.mock.calls.length - 1][0];
      expect(createTransportCall.secure).toBe(false);
      expect(createTransportCall.requireTLS).toBe(true);
      expect(createTransportCall.connectionTimeout).toBe(10000);
    });
  });

  describe('Specialized email methods', () => {
    beforeEach(async () => {
      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: 'password',
        email_expediteur: 'noreply@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);

      const mockEmailLog = {
        id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      EmailLog.create.mockResolvedValue(mockEmailLog);

      const mockTemplate = {
        code: 'TEST',
        objet: 'Test {{prenom}}',
        contenu: '<p>Hello {{prenom}} {{nom}}</p>',
        actif: true
      };
      TemplateMessage.findOne.mockResolvedValue(mockTemplate);
    });

    describe('sendWelcomeEmail', () => {
      it('should send welcome email to new member', async () => {
        const adherent = {
          id: 1,
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@example.com',
          code_barre: 'ABC123',
          date_adhesion: new Date('2024-01-15')
        };

        await emailService.sendWelcomeEmail(adherent);

        expect(TemplateMessage.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              code: 'ADHERENT_CREATION'
            })
          })
        );

        expect(EmailLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            adherent_id: 1
          })
        );
      });
    });

    describe('sendEmpruntConfirmation', () => {
      it('should send loan confirmation email', async () => {
        const emprunt = {
          id: 10,
          date_emprunt: new Date('2024-01-15'),
          date_retour_prevue: new Date('2024-01-29')
        };

        const adherent = {
          id: 1,
          prenom: 'Marie',
          nom: 'Martin',
          email: 'marie.martin@example.com'
        };

        const jeu = {
          id: 5,
          titre: 'Catan'
        };

        await emailService.sendEmpruntConfirmation(emprunt, adherent, jeu);

        expect(TemplateMessage.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              code: 'EMPRUNT_CONFIRMATION'
            })
          })
        );
      });
    });

    describe('sendCotisationConfirmation', () => {
      it('should send membership confirmation email', async () => {
        const cotisation = {
          id: 3,
          montant: 25.50,
          date_paiement: new Date('2024-01-15'),
          mode_paiement: 'carte'
        };

        const adherent = {
          id: 1,
          prenom: 'Pierre',
          nom: 'Dubois',
          email: 'pierre.dubois@example.com'
        };

        await emailService.sendCotisationConfirmation(cotisation, adherent);

        expect(TemplateMessage.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              code: 'COTISATION_CONFIRMATION'
            })
          })
        );

        expect(EmailLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            adherent_id: 1,
            cotisation_id: 3
          })
        );
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid encryption key length', () => {
      const originalKey = process.env.EMAIL_ENCRYPTION_KEY;
      process.env.EMAIL_ENCRYPTION_KEY = 'tooshort';

      // Le service devrait loguer un warning mais ne pas crasher
      expect(() => {
        require('../../../backend/services/emailService');
      }).not.toThrow();

      process.env.EMAIL_ENCRYPTION_KEY = originalKey;
    });

    it('should initialize transporter automatically on first sendEmail call', async () => {
      const mockConfig = {
        id: 1,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'user@example.com',
        smtp_password: 'password',
        email_expediteur: 'noreply@example.com',
        actif: true
      };

      ConfigurationEmail.findOne.mockResolvedValue(mockConfig);

      const mockEmailLog = {
        id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      EmailLog.create.mockResolvedValue(mockEmailLog);

      // Le transporter est null au départ
      expect(emailService.transporter).toBeNull();

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      // Le transporter a été initialisé automatiquement
      expect(ConfigurationEmail.findOne).toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });
  });
});
