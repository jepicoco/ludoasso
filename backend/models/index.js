const sequelize = require('../config/sequelize');

// Import model definitions
// Utilisateur (anciennement Adherent) - utilise le nouveau modele
const UtilisateurModel = require('./Utilisateur');
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
const UtilisateurArchiveModel = require('./UtilisateurArchive');
const ArchiveAccessLogModel = require('./ArchiveAccessLog');
const CompteBancaireModel = require('./CompteBancaire');
const SiteModel = require('./Site');
const HoraireOuvertureModel = require('./HoraireOuverture');
const FermetureExceptionnelleModel = require('./FermetureExceptionnelle');
const ParametresCalendrierModel = require('./ParametresCalendrier');
const ParametresFrontModel = require('./ParametresFront');

// Import reference tables models (normalisation jeux)
const CategorieModel = require('./Categorie');
const ThemeModel = require('./Theme');
const MecanismeModel = require('./Mecanisme');
const LangueModel = require('./Langue');
const EditeurModel = require('./Editeur');
const AuteurModel = require('./Auteur');
const IllustrateurModel = require('./Illustrateur');
const GammeModel = require('./Gamme');
const EmplacementJeuModel = require('./EmplacementJeu');

// Import junction tables models (many-to-many)
const JeuCategorieModel = require('./JeuCategorie');
const JeuThemeModel = require('./JeuTheme');
const JeuMecanismeModel = require('./JeuMecanisme');
const JeuLangueModel = require('./JeuLangue');
const JeuEditeurModel = require('./JeuEditeur');
const JeuAuteurModel = require('./JeuAuteur');
const JeuIllustrateurModel = require('./JeuIllustrateur');
const JeuEanModel = require('./JeuEan');

// Import Livres models (normalisation livres)
const GenreLitteraireModel = require('./GenreLitteraire');
const CollectionLivreModel = require('./CollectionLivre');
const FormatLivreModel = require('./FormatLivre');
const EmplacementLivreModel = require('./EmplacementLivre');
const LivreModel = require('./Livre');

// Import Livres junction tables
const LivreAuteurModel = require('./LivreAuteur');
const LivreEditeurModel = require('./LivreEditeur');
const LivreGenreModel = require('./LivreGenre');
const LivreThemeModel = require('./LivreTheme');
const LivreLangueModel = require('./LivreLangue');
const RoleContributeurLivreModel = require('./RoleContributeurLivre');

// Import Films models (normalisation films)
const GenreFilmModel = require('./GenreFilm');
const RealisateurModel = require('./Realisateur');
const ActeurModel = require('./Acteur');
const StudioModel = require('./Studio');
const SupportVideoModel = require('./SupportVideo');
const EmplacementFilmModel = require('./EmplacementFilm');
const FilmModel = require('./Film');

// Import Films junction tables
const FilmRealisateurModel = require('./FilmRealisateur');
const FilmActeurModel = require('./FilmActeur');
const FilmGenreModel = require('./FilmGenre');
const FilmThemeModel = require('./FilmTheme');
const FilmLangueModel = require('./FilmLangue');
const FilmSousTitreModel = require('./FilmSousTitre');
const FilmStudioModel = require('./FilmStudio');

// Import Disques models (normalisation musique)
const GenreMusicalModel = require('./GenreMusical');
const FormatDisqueModel = require('./FormatDisque');
const LabelDisqueModel = require('./LabelDisque');
const EmplacementDisqueModel = require('./EmplacementDisque');
const ArtisteModel = require('./Artiste');
const DisqueModel = require('./Disque');

// Import Disques junction tables
const DisqueArtisteModel = require('./DisqueArtiste');
const DisqueGenreModel = require('./DisqueGenre');

// Import ModuleActif
const ModuleActifModel = require('./ModuleActif');

// Import IpAutorisee
const IpAutoriseeModel = require('./IpAutorisee');

// Import Prolongation
const ProlongationModel = require('./Prolongation');

// Import Comptabilite (TVA et Analytique)
const TauxTVAModel = require('./TauxTVA');
const SectionAnalytiqueModel = require('./SectionAnalytique');
const RepartitionAnalytiqueModel = require('./RepartitionAnalytique');

// Import Comptabilite (Phase 1 - FEC et numérotation)
const CompteurPieceModel = require('./CompteurPiece');
const EcritureComptableModel = require('./EcritureComptable');

// Import Comptabilite (Phase 2 - Parametrage avance)
const JournalComptableModel = require('./JournalComptable');
const CompteComptableModel = require('./CompteComptable');
const ParametrageComptableOperationModel = require('./ParametrageComptableOperation');
const ProvenanceModel = require('./Provenance');
const ProvenanceOperationComptableModel = require('./ProvenanceOperationComptable');
const CompteEncaissementModePaiementModel = require('./CompteEncaissementModePaiement');

// Import LLM Configuration (Recherche IA)
const ConfigurationLLMModel = require('./ConfigurationLLM');

// Import Thematiques IA (Recherche naturelle)
const ThematiqueModel = require('./Thematique');
const ThematiqueAliasModel = require('./ThematiqueAlias');
const ArticleThematiqueModel = require('./ArticleThematique');
const EnrichissementQueueModel = require('./EnrichissementQueue');
const ArticleThematiqueHistoriqueModel = require('./ArticleThematiqueHistorique');

// Import Codes-barres reserves (impression en lot)
const ParametresCodesBarresModel = require('./ParametresCodesBarres');
const LotCodesBarresModel = require('./LotCodesBarres');
const CodeBarreUtilisateurModel = require('./CodeBarreUtilisateur');
const CodeBarreJeuModel = require('./CodeBarreJeu');
const CodeBarreLivreModel = require('./CodeBarreLivre');
const CodeBarreFilmModel = require('./CodeBarreFilm');
const CodeBarreDisqueModel = require('./CodeBarreDisque');

// Import Exemplaires (exemplaires multiples par article)
const ExemplaireJeuModel = require('./ExemplaireJeu');
const ExemplaireLivreModel = require('./ExemplaireLivre');
const ExemplaireFilmModel = require('./ExemplaireFilm');
const ExemplaireDisqueModel = require('./ExemplaireDisque');

// Import Configuration API (lookup EAN/ISBN externe)
const ConfigurationAPIModel = require('./ConfigurationAPI');

// Import Configuration Export Comptable (multi-formats)
const ConfigurationExportComptableModel = require('./ConfigurationExportComptable');

// Import Configuration Acces Donnees (controle PII par role)
const ConfigurationAccesDonneesModel = require('./ConfigurationAccesDonnees');

// Import ThemeSite (themes du site public)
const ThemeSiteModel = require('./ThemeSite');

// Import LeaderboardScore (mini-jeu chat)
const LeaderboardScoreModel = require('./LeaderboardScore');

// Import LimiteEmpruntGenre (limites emprunts par genre)
const LimiteEmpruntGenreModel = require('./LimiteEmpruntGenre');

// Import Reservation (reservations d'articles)
const ReservationModel = require('./Reservation');
const LimiteReservationGenreModel = require('./LimiteReservationGenre');

// Import Caisse (gestion des règlements)
const CaisseModel = require('./Caisse');
const SessionCaisseModel = require('./SessionCaisse');
const MouvementCaisseModel = require('./MouvementCaisse');

// Import Factures (facturation)
const FactureModel = require('./Facture');
const LigneFactureModel = require('./LigneFacture');
const ReglementFactureModel = require('./ReglementFacture');

// Import ApiKey (cles API externes)
const ApiKeyModel = require('./ApiKey');

// Import Regroupements analytiques (ventilation multi-sections)
const RegroupementAnalytiqueModel = require('./RegroupementAnalytique');
const RegroupementAnalytiqueDetailModel = require('./RegroupementAnalytiqueDetail');

// Import Plans (editeur de plans interactifs)
const PlanModel = require('./Plan');
const EtageModel = require('./Etage');
const ElementPlanModel = require('./ElementPlan');
const ElementEmplacementModel = require('./ElementEmplacement');

// Import Frequentation (comptage visiteurs)
const CommuneModel = require('./Commune');
const CommunauteCommunesModel = require('./CommunauteCommunes');
const CommunauteCommunesMembreModel = require('./CommunauteCommunesMembre');
const QuestionnaireFrequentationModel = require('./QuestionnaireFrequentation');
const QuestionnaireCommuneFavoriteModel = require('./QuestionnaireCommuneFavorite');
const EnregistrementFrequentationModel = require('./EnregistrementFrequentation');
const ApiKeyQuestionnaireModel = require('./ApiKeyQuestionnaire');
const TabletPairingTokenModel = require('./TabletPairingToken');

// Import Charte Usager (validation signature numerique)
const CharteUsagerModel = require('./CharteUsager');
const ValidationCharteModel = require('./ValidationCharte');

// Import Tarification avancee (Types tarifs, QF, Reductions)
const TypeTarifModel = require('./TypeTarif');
const ConfigurationQuotientFamilialModel = require('./ConfigurationQuotientFamilial');
const TrancheQuotientFamilialModel = require('./TrancheQuotientFamilial');
const RegleReductionModel = require('./RegleReduction');
const HistoriqueQuotientFamilialModel = require('./HistoriqueQuotientFamilial');
const CotisationReductionModel = require('./CotisationReduction');
const TarifTypeTarifModel = require('./TarifTypeTarif');
const TrancheQFValeurModel = require('./TrancheQFValeur');

// Import Arbre de Decision Tarifaire
const TypeConditionTarifModel = require('./TypeConditionTarif');
const OperationComptableReductionModel = require('./OperationComptableReduction');
const ArbreDecisionModel = require('./ArbreDecision');

// Import Tags Utilisateur (referentiel tags usagers)
const TagUtilisateurModel = require('./TagUtilisateur');
const UtilisateurTagModel = require('./UtilisateurTag');

// Import Structures (Multi-structures V0.9)
const OrganisationModel = require('./Organisation');
const StructureModel = require('./Structure');
const UtilisateurStructureModel = require('./UtilisateurStructure');
const GroupeFrontendModel = require('./GroupeFrontend');
const GroupeFrontendStructureModel = require('./GroupeFrontendStructure');
const ParametresFrontStructureModel = require('./ParametresFrontStructure');
const StructureConnecteurCategorieModel = require('./StructureConnecteurCategorie');
const StructureConnecteurEvenementModel = require('./StructureConnecteurEvenement');
const OrganisationBarcodeGroupModel = require('./OrganisationBarcodeGroup');
const OrganisationBarcodeConfigModel = require('./OrganisationBarcodeConfig');

// Import Desherbage (lots de sortie)
const TypeSortieModel = require('./TypeSortie');
const LotSortieModel = require('./LotSortie');
const ArticleSortieModel = require('./ArticleSortie');

// Import Import ISO (import livres BDP)
const ImportSessionModel = require('./ImportSession');
const LotBDPModel = require('./LotBDP');

// ============================================================
// Initialize models
// ============================================================

const Utilisateur = UtilisateurModel(sequelize);
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
const UtilisateurArchive = UtilisateurArchiveModel(sequelize);
const ArchiveAccessLog = ArchiveAccessLogModel(sequelize);
const CompteBancaire = CompteBancaireModel(sequelize);
const Site = SiteModel(sequelize);
const HoraireOuverture = HoraireOuvertureModel(sequelize);
const FermetureExceptionnelle = FermetureExceptionnelleModel(sequelize);
const ParametresCalendrier = ParametresCalendrierModel(sequelize);
const ParametresFront = ParametresFrontModel(sequelize);

// Initialize reference tables
const Categorie = CategorieModel(sequelize);
const Theme = ThemeModel(sequelize);
const Mecanisme = MecanismeModel(sequelize);
const Langue = LangueModel(sequelize);
const Editeur = EditeurModel(sequelize);
const Auteur = AuteurModel(sequelize);
const Illustrateur = IllustrateurModel(sequelize);
const Gamme = GammeModel(sequelize);
const EmplacementJeu = EmplacementJeuModel(sequelize);

// Initialize junction tables
const JeuCategorie = JeuCategorieModel(sequelize);
const JeuTheme = JeuThemeModel(sequelize);
const JeuMecanisme = JeuMecanismeModel(sequelize);
const JeuLangue = JeuLangueModel(sequelize);
const JeuEditeur = JeuEditeurModel(sequelize);
const JeuAuteur = JeuAuteurModel(sequelize);
const JeuIllustrateur = JeuIllustrateurModel(sequelize);
const JeuEan = JeuEanModel(sequelize);

// Initialize Livres reference tables
const GenreLitteraire = GenreLitteraireModel(sequelize);
const CollectionLivre = CollectionLivreModel(sequelize);
const FormatLivre = FormatLivreModel(sequelize);
const EmplacementLivre = EmplacementLivreModel(sequelize);
const Livre = LivreModel(sequelize);

// Initialize Livres junction tables
const LivreAuteur = LivreAuteurModel(sequelize);
const LivreEditeur = LivreEditeurModel(sequelize);
const LivreGenre = LivreGenreModel(sequelize);
const LivreTheme = LivreThemeModel(sequelize);
const LivreLangue = LivreLangueModel(sequelize);
const RoleContributeurLivre = RoleContributeurLivreModel(sequelize);

// Initialize Films reference tables
const GenreFilm = GenreFilmModel(sequelize);
const Realisateur = RealisateurModel(sequelize);
const Acteur = ActeurModel(sequelize);
const Studio = StudioModel(sequelize);
const SupportVideo = SupportVideoModel(sequelize);
const EmplacementFilm = EmplacementFilmModel(sequelize);
const Film = FilmModel(sequelize);

// Initialize Films junction tables
const FilmRealisateur = FilmRealisateurModel(sequelize);
const FilmActeur = FilmActeurModel(sequelize);
const FilmGenre = FilmGenreModel(sequelize);
const FilmTheme = FilmThemeModel(sequelize);
const FilmLangue = FilmLangueModel(sequelize);
const FilmSousTitre = FilmSousTitreModel(sequelize);
const FilmStudio = FilmStudioModel(sequelize);

// Initialize Disques reference tables
const GenreMusical = GenreMusicalModel(sequelize);
const FormatDisque = FormatDisqueModel(sequelize);
const LabelDisque = LabelDisqueModel(sequelize);
const EmplacementDisque = EmplacementDisqueModel(sequelize);
const Artiste = ArtisteModel(sequelize);
const Disque = DisqueModel(sequelize);

// Initialize Disques junction tables
const DisqueArtiste = DisqueArtisteModel(sequelize);
const DisqueGenre = DisqueGenreModel(sequelize);

// Initialize ModuleActif
const ModuleActif = ModuleActifModel(sequelize);

// Initialize IpAutorisee
const IpAutorisee = IpAutoriseeModel(sequelize);

// Initialize Prolongation
const Prolongation = ProlongationModel(sequelize);

// Initialize Comptabilite (TVA et Analytique)
const TauxTVA = TauxTVAModel(sequelize);
const SectionAnalytique = SectionAnalytiqueModel(sequelize);
const RepartitionAnalytique = RepartitionAnalytiqueModel(sequelize);

// Initialize Comptabilite (Phase 1 - FEC et numérotation)
const CompteurPiece = CompteurPieceModel(sequelize);
const EcritureComptable = EcritureComptableModel(sequelize);

// Initialize Comptabilite (Phase 2 - Parametrage avance)
const JournalComptable = JournalComptableModel(sequelize);
const CompteComptable = CompteComptableModel(sequelize);
const ParametrageComptableOperation = ParametrageComptableOperationModel(sequelize);
const Provenance = ProvenanceModel(sequelize);
const ProvenanceOperationComptable = ProvenanceOperationComptableModel(sequelize);
const CompteEncaissementModePaiement = CompteEncaissementModePaiementModel(sequelize);

// Initialize LLM Configuration (Recherche IA)
const ConfigurationLLM = ConfigurationLLMModel(sequelize);

// Initialize Thematiques IA (Recherche naturelle)
const Thematique = ThematiqueModel(sequelize);
const ThematiqueAlias = ThematiqueAliasModel(sequelize);
const ArticleThematique = ArticleThematiqueModel(sequelize);
const EnrichissementQueue = EnrichissementQueueModel(sequelize);
const ArticleThematiqueHistorique = ArticleThematiqueHistoriqueModel(sequelize);

// Initialize Codes-barres reserves (impression en lot)
const ParametresCodesBarres = ParametresCodesBarresModel(sequelize);
const LotCodesBarres = LotCodesBarresModel(sequelize);
const CodeBarreUtilisateur = CodeBarreUtilisateurModel(sequelize);
const CodeBarreJeu = CodeBarreJeuModel(sequelize);
const CodeBarreLivre = CodeBarreLivreModel(sequelize);
const CodeBarreFilm = CodeBarreFilmModel(sequelize);
const CodeBarreDisque = CodeBarreDisqueModel(sequelize);

// Initialize Exemplaires (exemplaires multiples par article)
const ExemplaireJeu = ExemplaireJeuModel(sequelize);
const ExemplaireLivre = ExemplaireLivreModel(sequelize);
const ExemplaireFilm = ExemplaireFilmModel(sequelize);
const ExemplaireDisque = ExemplaireDisqueModel(sequelize);

// Initialize Configuration API (lookup EAN/ISBN externe)
const ConfigurationAPI = ConfigurationAPIModel(sequelize);

// Initialize Configuration Export Comptable (multi-formats)
const ConfigurationExportComptable = ConfigurationExportComptableModel(sequelize);

// Initialize Configuration Acces Donnees (controle PII par role)
const ConfigurationAccesDonnees = ConfigurationAccesDonneesModel(sequelize);

// Initialize ThemeSite (themes du site public)
const ThemeSite = ThemeSiteModel(sequelize);

// Initialize LeaderboardScore (mini-jeu chat)
const LeaderboardScore = LeaderboardScoreModel(sequelize);

// Initialize LimiteEmpruntGenre (limites emprunts par genre)
const LimiteEmpruntGenre = LimiteEmpruntGenreModel(sequelize);

// Initialize Reservation (reservations d'articles)
const Reservation = ReservationModel(sequelize);
const LimiteReservationGenre = LimiteReservationGenreModel(sequelize);

// Initialize Caisse (gestion des règlements)
const Caisse = CaisseModel(sequelize);
const SessionCaisse = SessionCaisseModel(sequelize);
const MouvementCaisse = MouvementCaisseModel(sequelize);

// Initialize Factures (facturation)
const Facture = FactureModel(sequelize);
const LigneFacture = LigneFactureModel(sequelize);
const ReglementFacture = ReglementFactureModel(sequelize);
const ApiKey = ApiKeyModel(sequelize);

// Initialize Regroupements analytiques
const RegroupementAnalytique = RegroupementAnalytiqueModel(sequelize);
const RegroupementAnalytiqueDetail = RegroupementAnalytiqueDetailModel(sequelize);

// Initialize Plans (editeur de plans interactifs)
const Plan = PlanModel(sequelize);
const Etage = EtageModel(sequelize);
const ElementPlan = ElementPlanModel(sequelize);
const ElementEmplacement = ElementEmplacementModel(sequelize);

// Initialize Frequentation (comptage visiteurs)
const Commune = CommuneModel(sequelize);
const CommunauteCommunes = CommunauteCommunesModel(sequelize);
const CommunauteCommunesMembre = CommunauteCommunesMembreModel(sequelize);
const QuestionnaireFrequentation = QuestionnaireFrequentationModel(sequelize);
const QuestionnaireCommuneFavorite = QuestionnaireCommuneFavoriteModel(sequelize);
const EnregistrementFrequentation = EnregistrementFrequentationModel(sequelize);
const ApiKeyQuestionnaire = ApiKeyQuestionnaireModel(sequelize);
const TabletPairingToken = TabletPairingTokenModel(sequelize);

// Initialize Charte Usager (validation signature numerique)
const CharteUsager = CharteUsagerModel(sequelize);
const ValidationCharte = ValidationCharteModel(sequelize);

// Initialize Tarification avancee (Types tarifs, QF, Reductions)
const TypeTarif = TypeTarifModel(sequelize);
const ConfigurationQuotientFamilial = ConfigurationQuotientFamilialModel(sequelize);
const TrancheQuotientFamilial = TrancheQuotientFamilialModel(sequelize);
const RegleReduction = RegleReductionModel(sequelize);
const HistoriqueQuotientFamilial = HistoriqueQuotientFamilialModel(sequelize);
const CotisationReduction = CotisationReductionModel(sequelize);
const TarifTypeTarif = TarifTypeTarifModel(sequelize);
const TrancheQFValeur = TrancheQFValeurModel(sequelize);

// Initialize Arbre de Decision Tarifaire
const TypeConditionTarif = TypeConditionTarifModel(sequelize);
const OperationComptableReduction = OperationComptableReductionModel(sequelize);
const ArbreDecision = ArbreDecisionModel(sequelize);

// Initialize Tags Utilisateur (referentiel tags usagers)
const TagUtilisateur = TagUtilisateurModel(sequelize);
const UtilisateurTag = UtilisateurTagModel(sequelize);

// Initialize Structures (Multi-structures V0.9)
const Organisation = OrganisationModel(sequelize);
const Structure = StructureModel(sequelize);
const UtilisateurStructure = UtilisateurStructureModel(sequelize);
const GroupeFrontend = GroupeFrontendModel(sequelize);
const GroupeFrontendStructure = GroupeFrontendStructureModel(sequelize);
const ParametresFrontStructure = ParametresFrontStructureModel(sequelize);
const StructureConnecteurCategorie = StructureConnecteurCategorieModel(sequelize);
const StructureConnecteurEvenement = StructureConnecteurEvenementModel(sequelize);
const OrganisationBarcodeGroup = OrganisationBarcodeGroupModel(sequelize);
const OrganisationBarcodeConfig = OrganisationBarcodeConfigModel(sequelize);

// Initialize Desherbage (lots de sortie)
const TypeSortie = TypeSortieModel(sequelize);
const LotSortie = LotSortieModel(sequelize);
const ArticleSortie = ArticleSortieModel(sequelize);

// Initialize Import ISO (import livres BDP)
const ImportSession = ImportSessionModel(sequelize);
const LotBDP = LotBDPModel(sequelize);

// ============================================================
// Define associations via modular files
// ============================================================

const models = {
  // Core
  Utilisateur,
  Commune,
  CommunauteCommunes,
  CommunauteCommunesMembre,
  Emprunt,
  Jeu,
  Livre,
  Film,
  Disque,
  Cotisation,
  TarifCotisation,
  CodeReduction,
  EmailLog,
  SmsLog,
  CompteBancaire,
  Site,
  HoraireOuverture,
  FermetureExceptionnelle,
  ParametresCalendrier,

  // Exemplaires
  JeuEan,
  ExemplaireJeu,
  ExemplaireLivre,
  ExemplaireFilm,
  ExemplaireDisque,
  EmplacementJeu,
  EmplacementLivre,
  EmplacementFilm,
  EmplacementDisque,

  // Jeux normalization
  Gamme,
  Editeur,
  Categorie,
  JeuCategorie,
  Theme,
  JeuTheme,
  Mecanisme,
  JeuMecanisme,
  Langue,
  JeuLangue,
  JeuEditeur,
  Auteur,
  JeuAuteur,
  Illustrateur,
  JeuIllustrateur,

  // Livres normalization
  FormatLivre,
  CollectionLivre,
  GenreLitteraire,
  LivreAuteur,
  LivreEditeur,
  LivreGenre,
  LivreTheme,
  LivreLangue,

  // Films normalization
  SupportVideo,
  Realisateur,
  FilmRealisateur,
  Acteur,
  FilmActeur,
  GenreFilm,
  FilmGenre,
  FilmTheme,
  FilmLangue,
  FilmSousTitre,
  Studio,
  FilmStudio,

  // Disques normalization
  FormatDisque,
  LabelDisque,
  Artiste,
  DisqueArtiste,
  GenreMusical,
  DisqueGenre,

  // Prolongations et Reservations
  Prolongation,
  Reservation,

  // Comptabilite
  TauxTVA,
  SectionAnalytique,
  RepartitionAnalytique,
  EcritureComptable,
  CompteComptable,
  ParametrageComptableOperation,
  Provenance,
  ProvenanceOperationComptable,
  CompteEncaissementModePaiement,
  ModePaiement,
  RegroupementAnalytique,
  RegroupementAnalytiqueDetail,

  // Thematiques IA
  Thematique,
  ThematiqueAlias,
  ArticleThematique,

  // Codes-barres
  LotCodesBarres,
  CodeBarreUtilisateur,
  CodeBarreJeu,
  CodeBarreLivre,
  CodeBarreFilm,
  CodeBarreDisque,

  // Caisse et Factures
  Caisse,
  SessionCaisse,
  MouvementCaisse,
  Facture,
  LigneFacture,
  ReglementFacture,

  // Plans
  Plan,
  Etage,
  ElementPlan,
  ElementEmplacement,

  // Frequentation
  QuestionnaireFrequentation,
  QuestionnaireCommuneFavorite,
  EnregistrementFrequentation,
  ApiKey,
  ApiKeyQuestionnaire,
  TabletPairingToken,

  // Charte Usager
  CharteUsager,
  ValidationCharte,

  // Structures
  Organisation,
  Structure,
  UtilisateurStructure,
  GroupeFrontend,
  GroupeFrontendStructure,
  ParametresFrontStructure,
  StructureConnecteurCategorie,
  StructureConnecteurEvenement,
  OrganisationBarcodeGroup,
  OrganisationBarcodeConfig,
  ConfigurationEmail,
  ConfigurationSMS,
  EventTrigger,

  // Tarification
  TypeTarif,
  TarifTypeTarif,
  ConfigurationQuotientFamilial,
  TrancheQuotientFamilial,
  TrancheQFValeur,
  RegleReduction,
  HistoriqueQuotientFamilial,
  CotisationReduction,

  // Arbre de Decision Tarifaire
  TypeConditionTarif,
  OperationComptableReduction,
  ArbreDecision,

  // Tags Utilisateur
  TagUtilisateur,
  UtilisateurTag,

  // Desherbage (lots de sortie)
  TypeSortie,
  LotSortie,
  ArticleSortie,

  // Import ISO (import livres BDP)
  ImportSession,
  LotBDP
};

// Setup all associations from modular files
const setupAllAssociations = require('./associations');
setupAllAssociations(models);

// ============================================================
// Export models and sequelize instance
// ============================================================

module.exports = {
  sequelize,
  Utilisateur,
  Adherent: Utilisateur, // Alias pour retrocompatibilité
  UtilisateurArchive,
  AdherentArchive: UtilisateurArchive, // Alias pour retrocompatibilité
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
  ArchiveAccessLog,
  CompteBancaire,
  Site,
  HoraireOuverture,
  FermetureExceptionnelle,
  ParametresCalendrier,
  ParametresFront,
  // Reference tables (jeux normalization)
  Categorie,
  Theme,
  Mecanisme,
  Langue,
  Editeur,
  Auteur,
  Illustrateur,
  Gamme,
  EmplacementJeu,
  // Junction tables
  JeuCategorie,
  JeuTheme,
  JeuMecanisme,
  JeuLangue,
  JeuEditeur,
  JeuAuteur,
  JeuIllustrateur,
  JeuEan,
  // Livres reference tables
  GenreLitteraire,
  CollectionLivre,
  FormatLivre,
  EmplacementLivre,
  Livre,
  // Livres junction tables
  LivreAuteur,
  LivreEditeur,
  LivreGenre,
  LivreTheme,
  LivreLangue,
  RoleContributeurLivre,
  // Films reference tables
  GenreFilm,
  Realisateur,
  Acteur,
  Studio,
  SupportVideo,
  EmplacementFilm,
  Film,
  // Films junction tables
  FilmRealisateur,
  FilmActeur,
  FilmGenre,
  FilmTheme,
  FilmLangue,
  FilmSousTitre,
  FilmStudio,
  // Disques reference tables
  GenreMusical,
  FormatDisque,
  LabelDisque,
  EmplacementDisque,
  Artiste,
  Disque,
  // Disques junction tables
  DisqueArtiste,
  DisqueGenre,
  // Modules actifs
  ModuleActif,
  // IP autorisées (maintenance)
  IpAutorisee,
  // Prolongations
  Prolongation,
  // Comptabilite (TVA et Analytique)
  TauxTVA,
  SectionAnalytique,
  RepartitionAnalytique,
  // Comptabilite (Phase 1 - FEC et numérotation)
  CompteurPiece,
  EcritureComptable,
  // Comptabilite (Phase 2 - Parametrage avance)
  JournalComptable,
  CompteComptable,
  ParametrageComptableOperation,
  Provenance,
  ProvenanceOperationComptable,
  CompteEncaissementModePaiement,
  // LLM Configuration (Recherche IA)
  ConfigurationLLM,
  // Thematiques IA (Recherche naturelle)
  Thematique,
  ThematiqueAlias,
  ArticleThematique,
  EnrichissementQueue,
  ArticleThematiqueHistorique,
  // Codes-barres reserves (impression en lot)
  ParametresCodesBarres,
  LotCodesBarres,
  CodeBarreUtilisateur,
  CodeBarreJeu,
  CodeBarreLivre,
  CodeBarreFilm,
  CodeBarreDisque,
  // Exemplaires (exemplaires multiples par article)
  ExemplaireJeu,
  ExemplaireLivre,
  ExemplaireFilm,
  ExemplaireDisque,
  // Configuration API (lookup EAN/ISBN externe)
  ConfigurationAPI,
  // Configuration Export Comptable (multi-formats)
  ConfigurationExportComptable,
  // Configuration Acces Donnees (controle PII par role)
  ConfigurationAccesDonnees,
  // Themes du site public
  ThemeSite,
  // Mini-jeu chat leaderboard
  LeaderboardScore,
  // Limites emprunts par genre
  LimiteEmpruntGenre,
  // Reservations d'articles
  Reservation,
  LimiteReservationGenre,
  // Caisse (gestion des règlements)
  Caisse,
  SessionCaisse,
  MouvementCaisse,
  // Factures
  Facture,
  LigneFacture,
  ReglementFacture,
  // API Keys (extensions externes)
  ApiKey,
  // Regroupements analytiques (ventilation multi-sections)
  RegroupementAnalytique,
  RegroupementAnalytiqueDetail,
  // Plans (editeur de plans interactifs)
  Plan,
  Etage,
  ElementPlan,
  ElementEmplacement,
  // Frequentation (comptage visiteurs)
  Commune,
  CommunauteCommunes,
  CommunauteCommunesMembre,
  QuestionnaireFrequentation,
  QuestionnaireCommuneFavorite,
  EnregistrementFrequentation,
  ApiKeyQuestionnaire,
  TabletPairingToken,
  // Charte Usager (validation signature numerique)
  CharteUsager,
  ValidationCharte,
  // Tarification avancee (Types tarifs, QF, Reductions)
  TypeTarif,
  ConfigurationQuotientFamilial,
  TrancheQuotientFamilial,
  RegleReduction,
  HistoriqueQuotientFamilial,
  CotisationReduction,
  TarifTypeTarif,
  TrancheQFValeur,
  // Arbre de Decision Tarifaire
  TypeConditionTarif,
  OperationComptableReduction,
  ArbreDecision,
  // Structures (Multi-structures V0.9)
  Organisation,
  Structure,
  UtilisateurStructure,
  GroupeFrontend,
  GroupeFrontendStructure,
  ParametresFrontStructure,
  StructureConnecteurCategorie,
  StructureConnecteurEvenement,
  OrganisationBarcodeGroup,
  OrganisationBarcodeConfig,
  // Tags Utilisateur
  TagUtilisateur,
  UtilisateurTag,
  // Desherbage (lots de sortie)
  TypeSortie,
  LotSortie,
  ArticleSortie,
  // Import ISO (import livres BDP)
  ImportSession,
  LotBDP
};
