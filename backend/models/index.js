const sequelize = require('../config/sequelize');

// Import model definitions
const AdherentModel = require('./Adherent');
const JeuModel = require('./Jeu');
const EmpruntModel = require('./Emprunt');
const TarifCotisationModel = require('./TarifCotisation');
const CotisationModel = require('./Cotisation');
const ParametresStructureModel = require('./ParametresStructure');
const ModePaiementModel = require('./ModePaiement');
const CodeReductionModel = require('./CodeReduction');
const ConfigurationEmailModel = require('./ConfigurationEmail');
const ConfigurationSMSModel = require('./ConfigurationSMS');
const TemplateMessageModel = require('./TemplateMessage');
const EmailLogModel = require('./EmailLog');
const SmsLogModel = require('./SmsLog');
const EventTriggerModel = require('./EventTrigger');
const AdherentArchiveModel = require('./AdherentArchive');
const ArchiveAccessLogModel = require('./ArchiveAccessLog');

// Initialize models
const Adherent = AdherentModel(sequelize);
const Jeu = JeuModel(sequelize);
const Emprunt = EmpruntModel(sequelize);
const TarifCotisation = TarifCotisationModel(sequelize);
const Cotisation = CotisationModel(sequelize);
const ParametresStructure = ParametresStructureModel(sequelize);
const ModePaiement = ModePaiementModel(sequelize);
const CodeReduction = CodeReductionModel(sequelize);
const ConfigurationEmail = ConfigurationEmailModel(sequelize);
const ConfigurationSMS = ConfigurationSMSModel(sequelize);
const TemplateMessage = TemplateMessageModel(sequelize);
const EmailLog = EmailLogModel(sequelize);
const SmsLog = SmsLogModel(sequelize);
const EventTrigger = EventTriggerModel(sequelize);
const AdherentArchive = AdherentArchiveModel(sequelize);
const ArchiveAccessLog = ArchiveAccessLogModel(sequelize);

// Define associations
// Adherent <-> Emprunt (One-to-Many)
Adherent.hasMany(Emprunt, {
  foreignKey: 'adherent_id',
  as: 'emprunts'
});

Emprunt.belongsTo(Adherent, {
  foreignKey: 'adherent_id',
  as: 'adherent'
});

// Jeu <-> Emprunt (One-to-Many)
Jeu.hasMany(Emprunt, {
  foreignKey: 'jeu_id',
  as: 'emprunts'
});

Emprunt.belongsTo(Jeu, {
  foreignKey: 'jeu_id',
  as: 'jeu'
});

// Adherent <-> Cotisation (One-to-Many)
Adherent.hasMany(Cotisation, {
  foreignKey: 'adherent_id',
  as: 'cotisations'
});

Cotisation.belongsTo(Adherent, {
  foreignKey: 'adherent_id',
  as: 'adherent'
});

// TarifCotisation <-> Cotisation (One-to-Many)
TarifCotisation.hasMany(Cotisation, {
  foreignKey: 'tarif_cotisation_id',
  as: 'cotisations'
});

Cotisation.belongsTo(TarifCotisation, {
  foreignKey: 'tarif_cotisation_id',
  as: 'tarif'
});

// CodeReduction <-> Cotisation (One-to-Many)
CodeReduction.hasMany(Cotisation, {
  foreignKey: 'code_reduction_id',
  as: 'cotisations'
});

Cotisation.belongsTo(CodeReduction, {
  foreignKey: 'code_reduction_id',
  as: 'codeReduction'
});

// Adherent <-> EmailLog (One-to-Many)
Adherent.hasMany(EmailLog, {
  foreignKey: 'adherent_id',
  as: 'emailLogs'
});

EmailLog.belongsTo(Adherent, {
  foreignKey: 'adherent_id',
  as: 'adherent'
});

// Adherent <-> SmsLog (One-to-Many)
Adherent.hasMany(SmsLog, {
  foreignKey: 'adherent_id',
  as: 'smsLogs'
});

SmsLog.belongsTo(Adherent, {
  foreignKey: 'adherent_id',
  as: 'adherent'
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  Adherent,
  Jeu,
  Emprunt,
  TarifCotisation,
  Cotisation,
  ParametresStructure,
  ModePaiement,
  CodeReduction,
  ConfigurationEmail,
  ConfigurationSMS,
  TemplateMessage,
  EmailLog,
  SmsLog,
  EventTrigger,
  AdherentArchive,
  ArchiveAccessLog
};
