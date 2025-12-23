/**
 * Associations Structures (Multi-structures V0.9)
 * Organisations, Structures, Groupes Frontend, Connecteurs
 */

function setupStructuresAssociations(models) {
  const {
    Utilisateur,
    Jeu,
    Livre,
    Film,
    Disque,
    Cotisation,
    Emprunt,
    EcritureComptable,
    SectionAnalytique,
    Site,
    ConfigurationEmail,
    ConfigurationSMS,
    EventTrigger,
    Caisse,
    Organisation,
    Structure,
    UtilisateurStructure,
    GroupeFrontend,
    GroupeFrontendStructure,
    ParametresFrontStructure,
    StructureConnecteurCategorie,
    StructureConnecteurEvenement,
    OrganisationBarcodeGroup,
    OrganisationBarcodeConfig
  } = models;

  // ========================================
  // Organisation <-> Structure
  // ========================================

  Organisation.hasMany(Structure, {
    foreignKey: 'organisation_id',
    as: 'structures'
  });

  Structure.belongsTo(Organisation, {
    foreignKey: 'organisation_id',
    as: 'organisation'
  });

  // ========================================
  // Organisation <-> Communications
  // ========================================

  Organisation.belongsTo(ConfigurationEmail, {
    foreignKey: 'configuration_email_id',
    as: 'configurationEmail'
  });

  ConfigurationEmail.hasMany(Organisation, {
    foreignKey: 'configuration_email_id',
    as: 'organisations'
  });

  Organisation.belongsTo(ConfigurationSMS, {
    foreignKey: 'configuration_sms_id',
    as: 'configurationSms'
  });

  ConfigurationSMS.hasMany(Organisation, {
    foreignKey: 'configuration_sms_id',
    as: 'organisations'
  });

  // ========================================
  // Structure <-> Site
  // ========================================

  Structure.hasMany(Site, {
    foreignKey: 'structure_id',
    as: 'sites'
  });

  Site.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // Structure <-> ParametresFrontStructure
  // ========================================

  Structure.hasOne(ParametresFrontStructure, {
    foreignKey: 'structure_id',
    as: 'parametresFront'
  });

  ParametresFrontStructure.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // Structure <-> SectionAnalytique
  // ========================================

  Structure.belongsTo(SectionAnalytique, {
    foreignKey: 'section_analytique_id',
    as: 'sectionAnalytique'
  });

  SectionAnalytique.hasMany(Structure, {
    foreignKey: 'section_analytique_id',
    as: 'structures'
  });

  // ========================================
  // Structure <-> Utilisateur (Many-to-Many)
  // ========================================

  Structure.belongsToMany(Utilisateur, {
    through: UtilisateurStructure,
    foreignKey: 'structure_id',
    otherKey: 'utilisateur_id',
    as: 'utilisateurs'
  });

  Utilisateur.belongsToMany(Structure, {
    through: UtilisateurStructure,
    foreignKey: 'utilisateur_id',
    otherKey: 'structure_id',
    as: 'structures'
  });

  // UtilisateurStructure direct associations
  UtilisateurStructure.belongsTo(Utilisateur, {
    foreignKey: 'utilisateur_id',
    as: 'utilisateur'
  });

  Utilisateur.hasMany(UtilisateurStructure, {
    foreignKey: 'utilisateur_id',
    as: 'accesStructures'
  });

  UtilisateurStructure.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  Structure.hasMany(UtilisateurStructure, {
    foreignKey: 'structure_id',
    as: 'accesUtilisateurs'
  });

  // ========================================
  // GroupeFrontend <-> Structure (Many-to-Many)
  // ========================================

  GroupeFrontend.belongsToMany(Structure, {
    through: GroupeFrontendStructure,
    foreignKey: 'groupe_frontend_id',
    otherKey: 'structure_id',
    as: 'structures'
  });

  Structure.belongsToMany(GroupeFrontend, {
    through: GroupeFrontendStructure,
    foreignKey: 'structure_id',
    otherKey: 'groupe_frontend_id',
    as: 'groupesFrontend'
  });

  // GroupeFrontendStructure direct associations
  GroupeFrontendStructure.belongsTo(GroupeFrontend, {
    foreignKey: 'groupe_frontend_id',
    as: 'groupe'
  });

  GroupeFrontend.hasMany(GroupeFrontendStructure, {
    foreignKey: 'groupe_frontend_id',
    as: 'liensStructures'
  });

  GroupeFrontendStructure.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  Structure.hasMany(GroupeFrontendStructure, {
    foreignKey: 'structure_id',
    as: 'liensGroupes'
  });

  // ========================================
  // Structure <-> Collections
  // ========================================

  Structure.hasMany(Jeu, {
    foreignKey: 'structure_id',
    as: 'jeux'
  });

  Jeu.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  Structure.hasMany(Livre, {
    foreignKey: 'structure_id',
    as: 'livres'
  });

  Livre.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  Structure.hasMany(Film, {
    foreignKey: 'structure_id',
    as: 'films'
  });

  Film.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  Structure.hasMany(Disque, {
    foreignKey: 'structure_id',
    as: 'disques'
  });

  Disque.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // Structure <-> Cotisation
  // ========================================

  Structure.hasMany(Cotisation, {
    foreignKey: 'structure_id',
    as: 'cotisations'
  });

  Cotisation.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // Structure <-> Emprunt
  // ========================================

  Structure.hasMany(Emprunt, {
    foreignKey: 'structure_id',
    as: 'emprunts'
  });

  Emprunt.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // Structure <-> EcritureComptable
  // ========================================

  Structure.hasMany(EcritureComptable, {
    foreignKey: 'structure_id',
    as: 'ecrituresComptables'
  });

  EcritureComptable.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // Structure <-> Caisse
  // ========================================

  Structure.hasMany(Caisse, {
    foreignKey: 'structure_id',
    as: 'caisses'
  });

  Caisse.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  // ========================================
  // Structure <-> Connecteurs par defaut
  // ========================================

  Structure.belongsTo(ConfigurationEmail, {
    foreignKey: 'configuration_email_id',
    as: 'configurationEmailDefaut'
  });

  ConfigurationEmail.hasMany(Structure, {
    foreignKey: 'configuration_email_id',
    as: 'structuresDefaut'
  });

  Structure.belongsTo(ConfigurationSMS, {
    foreignKey: 'configuration_sms_id',
    as: 'configurationSMSDefaut'
  });

  ConfigurationSMS.hasMany(Structure, {
    foreignKey: 'configuration_sms_id',
    as: 'structuresDefaut'
  });

  // ========================================
  // StructureConnecteurCategorie
  // ========================================

  StructureConnecteurCategorie.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  Structure.hasMany(StructureConnecteurCategorie, {
    foreignKey: 'structure_id',
    as: 'connecteursCategories'
  });

  StructureConnecteurCategorie.belongsTo(ConfigurationEmail, {
    foreignKey: 'configuration_email_id',
    as: 'configurationEmail'
  });

  StructureConnecteurCategorie.belongsTo(ConfigurationSMS, {
    foreignKey: 'configuration_sms_id',
    as: 'configurationSMS'
  });

  // ========================================
  // StructureConnecteurEvenement
  // ========================================

  StructureConnecteurEvenement.belongsTo(Structure, {
    foreignKey: 'structure_id',
    as: 'structure'
  });

  Structure.hasMany(StructureConnecteurEvenement, {
    foreignKey: 'structure_id',
    as: 'connecteursEvenements'
  });

  StructureConnecteurEvenement.belongsTo(ConfigurationEmail, {
    foreignKey: 'configuration_email_id',
    as: 'configurationEmail'
  });

  StructureConnecteurEvenement.belongsTo(ConfigurationSMS, {
    foreignKey: 'configuration_sms_id',
    as: 'configurationSMS'
  });

  StructureConnecteurEvenement.belongsTo(EventTrigger, {
    foreignKey: 'event_trigger_code',
    targetKey: 'code',
    as: 'eventTrigger'
  });

  // ========================================
  // Organisation <-> BarcodeGroup
  // ========================================

  Organisation.hasMany(OrganisationBarcodeGroup, {
    foreignKey: 'organisation_id',
    as: 'barcodeGroups'
  });

  OrganisationBarcodeGroup.belongsTo(Organisation, {
    foreignKey: 'organisation_id',
    as: 'organisation'
  });

  // ========================================
  // Organisation <-> BarcodeConfig
  // ========================================

  Organisation.hasMany(OrganisationBarcodeConfig, {
    foreignKey: 'organisation_id',
    as: 'barcodeConfigs'
  });

  OrganisationBarcodeConfig.belongsTo(Organisation, {
    foreignKey: 'organisation_id',
    as: 'organisation'
  });

  // BarcodeConfig <-> BarcodeGroup
  OrganisationBarcodeConfig.belongsTo(OrganisationBarcodeGroup, {
    foreignKey: 'groupe_id',
    as: 'groupe'
  });

  OrganisationBarcodeGroup.hasMany(OrganisationBarcodeConfig, {
    foreignKey: 'groupe_id',
    as: 'configs'
  });
}

module.exports = setupStructuresAssociations;
