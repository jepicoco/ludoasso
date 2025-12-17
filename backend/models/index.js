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

// Import Configuration API (lookup EAN/ISBN externe)
const ConfigurationAPIModel = require('./ConfigurationAPI');

// Import Configuration Export Comptable (multi-formats)
const ConfigurationExportComptableModel = require('./ConfigurationExportComptable');

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
const QuestionnaireFrequentationModel = require('./QuestionnaireFrequentation');
const QuestionnaireCommuneFavoriteModel = require('./QuestionnaireCommuneFavorite');
const EnregistrementFrequentationModel = require('./EnregistrementFrequentation');
const ApiKeyQuestionnaireModel = require('./ApiKeyQuestionnaire');

// Import Charte Usager (validation signature numerique)
const CharteUsagerModel = require('./CharteUsager');
const ValidationCharteModel = require('./ValidationCharte');

// Initialize models
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

// Initialize Configuration API (lookup EAN/ISBN externe)
const ConfigurationAPI = ConfigurationAPIModel(sequelize);

// Initialize Configuration Export Comptable (multi-formats)
const ConfigurationExportComptable = ConfigurationExportComptableModel(sequelize);

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
const QuestionnaireFrequentation = QuestionnaireFrequentationModel(sequelize);
const QuestionnaireCommuneFavorite = QuestionnaireCommuneFavoriteModel(sequelize);
const EnregistrementFrequentation = EnregistrementFrequentationModel(sequelize);
const ApiKeyQuestionnaire = ApiKeyQuestionnaireModel(sequelize);

// Initialize Charte Usager (validation signature numerique)
const CharteUsager = CharteUsagerModel(sequelize);
const ValidationCharte = ValidationCharteModel(sequelize);

// Define associations

// Utilisateur <-> Utilisateur (Self-referencing for family relationships)
Utilisateur.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_parent_id',
  as: 'parent'
});

Utilisateur.hasMany(Utilisateur, {
  foreignKey: 'utilisateur_parent_id',
  as: 'enfants'
});

// Utilisateur <-> Emprunt (One-to-Many)
Utilisateur.hasMany(Emprunt, {
  foreignKey: 'utilisateur_id',
  as: 'emprunts'
});

Emprunt.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
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

// Livre <-> Emprunt (One-to-Many)
Livre.hasMany(Emprunt, {
  foreignKey: 'livre_id',
  as: 'emprunts'
});

Emprunt.belongsTo(Livre, {
  foreignKey: 'livre_id',
  as: 'livre'
});

// Film <-> Emprunt (One-to-Many)
Film.hasMany(Emprunt, {
  foreignKey: 'film_id',
  as: 'emprunts'
});

Emprunt.belongsTo(Film, {
  foreignKey: 'film_id',
  as: 'film'
});

// Disque <-> Emprunt (One-to-Many)
Disque.hasMany(Emprunt, {
  foreignKey: 'disque_id',
  as: 'emprunts'
});

Emprunt.belongsTo(Disque, {
  foreignKey: 'disque_id',
  as: 'disque'
});

// Utilisateur <-> Cotisation (One-to-Many)
Utilisateur.hasMany(Cotisation, {
  foreignKey: 'utilisateur_id',
  as: 'cotisations'
});

Cotisation.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
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

// Utilisateur <-> EmailLog (One-to-Many)
Utilisateur.hasMany(EmailLog, {
  foreignKey: 'utilisateur_id',
  as: 'emailLogs'
});

EmailLog.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
});

// Utilisateur <-> SmsLog (One-to-Many)
Utilisateur.hasMany(SmsLog, {
  foreignKey: 'utilisateur_id',
  as: 'smsLogs'
});

SmsLog.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
});

// CompteBancaire <-> Site (One-to-Many)
CompteBancaire.hasMany(Site, {
  foreignKey: 'compte_bancaire_id',
  as: 'sites'
});

Site.belongsTo(CompteBancaire, {
  foreignKey: 'compte_bancaire_id',
  as: 'compteBancaire'
});

// Site <-> HoraireOuverture (One-to-Many)
Site.hasMany(HoraireOuverture, {
  foreignKey: 'site_id',
  as: 'horaires'
});

HoraireOuverture.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Site <-> FermetureExceptionnelle (One-to-Many)
// Note: site_id peut être NULL (fermeture globale)
Site.hasMany(FermetureExceptionnelle, {
  foreignKey: 'site_id',
  as: 'fermetures'
});

FermetureExceptionnelle.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Site <-> ParametresCalendrier (One-to-One)
// Note: site_id peut être NULL (paramètres globaux)
Site.hasOne(ParametresCalendrier, {
  foreignKey: 'site_id',
  as: 'parametresCalendrier'
});

ParametresCalendrier.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// ========================================
// Associations pour normalisation des jeux
// ========================================

// Jeu <-> Gamme (Many-to-One)
Gamme.hasMany(Jeu, {
  foreignKey: 'gamme_id',
  as: 'jeux'
});

Jeu.belongsTo(Gamme, {
  foreignKey: 'gamme_id',
  as: 'gammeRef'
});

// Jeu <-> EmplacementJeu (Many-to-One)
EmplacementJeu.hasMany(Jeu, {
  foreignKey: 'emplacement_id',
  as: 'jeux'
});

Jeu.belongsTo(EmplacementJeu, {
  foreignKey: 'emplacement_id',
  as: 'emplacementRef'
});

// Gamme <-> Editeur (Many-to-One)
Editeur.hasMany(Gamme, {
  foreignKey: 'editeur_id',
  as: 'gammes'
});

Gamme.belongsTo(Editeur, {
  foreignKey: 'editeur_id',
  as: 'editeur'
});

// EmplacementJeu <-> Site (Many-to-One)
Site.hasMany(EmplacementJeu, {
  foreignKey: 'site_id',
  as: 'emplacements'
});

EmplacementJeu.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Jeu <-> Categorie (Many-to-Many)
Jeu.belongsToMany(Categorie, {
  through: JeuCategorie,
  foreignKey: 'jeu_id',
  otherKey: 'categorie_id',
  as: 'categoriesRef'
});

Categorie.belongsToMany(Jeu, {
  through: JeuCategorie,
  foreignKey: 'categorie_id',
  otherKey: 'jeu_id',
  as: 'jeux'
});

// Jeu <-> Theme (Many-to-Many)
Jeu.belongsToMany(Theme, {
  through: JeuTheme,
  foreignKey: 'jeu_id',
  otherKey: 'theme_id',
  as: 'themesRef'
});

Theme.belongsToMany(Jeu, {
  through: JeuTheme,
  foreignKey: 'theme_id',
  otherKey: 'jeu_id',
  as: 'jeux'
});

// Jeu <-> Mecanisme (Many-to-Many)
Jeu.belongsToMany(Mecanisme, {
  through: JeuMecanisme,
  foreignKey: 'jeu_id',
  otherKey: 'mecanisme_id',
  as: 'mecanismesRef'
});

Mecanisme.belongsToMany(Jeu, {
  through: JeuMecanisme,
  foreignKey: 'mecanisme_id',
  otherKey: 'jeu_id',
  as: 'jeux'
});

// Jeu <-> Langue (Many-to-Many)
Jeu.belongsToMany(Langue, {
  through: JeuLangue,
  foreignKey: 'jeu_id',
  otherKey: 'langue_id',
  as: 'languesRef'
});

Langue.belongsToMany(Jeu, {
  through: JeuLangue,
  foreignKey: 'langue_id',
  otherKey: 'jeu_id',
  as: 'jeux'
});

// Jeu <-> Editeur (Many-to-Many)
Jeu.belongsToMany(Editeur, {
  through: JeuEditeur,
  foreignKey: 'jeu_id',
  otherKey: 'editeur_id',
  as: 'editeursRef'
});

Editeur.belongsToMany(Jeu, {
  through: JeuEditeur,
  foreignKey: 'editeur_id',
  otherKey: 'jeu_id',
  as: 'jeux'
});

// Jeu <-> Auteur (Many-to-Many)
Jeu.belongsToMany(Auteur, {
  through: JeuAuteur,
  foreignKey: 'jeu_id',
  otherKey: 'auteur_id',
  as: 'auteursRef'
});

Auteur.belongsToMany(Jeu, {
  through: JeuAuteur,
  foreignKey: 'auteur_id',
  otherKey: 'jeu_id',
  as: 'jeux'
});

// Jeu <-> Illustrateur (Many-to-Many)
Jeu.belongsToMany(Illustrateur, {
  through: JeuIllustrateur,
  foreignKey: 'jeu_id',
  otherKey: 'illustrateur_id',
  as: 'illustrateursRef'
});

Illustrateur.belongsToMany(Jeu, {
  through: JeuIllustrateur,
  foreignKey: 'illustrateur_id',
  otherKey: 'jeu_id',
  as: 'jeux'
});

// ========================================
// Associations pour normalisation des livres
// ========================================

// Livre <-> FormatLivre (Many-to-One)
FormatLivre.hasMany(Livre, {
  foreignKey: 'format_id',
  as: 'livres'
});

Livre.belongsTo(FormatLivre, {
  foreignKey: 'format_id',
  as: 'formatRef'
});

// Livre <-> CollectionLivre (Many-to-One)
CollectionLivre.hasMany(Livre, {
  foreignKey: 'collection_id',
  as: 'livres'
});

Livre.belongsTo(CollectionLivre, {
  foreignKey: 'collection_id',
  as: 'collectionRef'
});

// Livre <-> EmplacementLivre (Many-to-One)
EmplacementLivre.hasMany(Livre, {
  foreignKey: 'emplacement_id',
  as: 'livres'
});

Livre.belongsTo(EmplacementLivre, {
  foreignKey: 'emplacement_id',
  as: 'emplacementRef'
});

// CollectionLivre <-> Editeur (Many-to-One)
Editeur.hasMany(CollectionLivre, {
  foreignKey: 'editeur_id',
  as: 'collectionsLivres'
});

CollectionLivre.belongsTo(Editeur, {
  foreignKey: 'editeur_id',
  as: 'editeur'
});

// EmplacementLivre <-> Site (Many-to-One)
Site.hasMany(EmplacementLivre, {
  foreignKey: 'site_id',
  as: 'emplacementsLivres'
});

EmplacementLivre.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Livre <-> Auteur (Many-to-Many)
Livre.belongsToMany(Auteur, {
  through: LivreAuteur,
  foreignKey: 'livre_id',
  otherKey: 'auteur_id',
  as: 'auteursRef'
});

Auteur.belongsToMany(Livre, {
  through: LivreAuteur,
  foreignKey: 'auteur_id',
  otherKey: 'livre_id',
  as: 'livres'
});

// Livre <-> Editeur (Many-to-Many)
Livre.belongsToMany(Editeur, {
  through: LivreEditeur,
  foreignKey: 'livre_id',
  otherKey: 'editeur_id',
  as: 'editeursRef'
});

Editeur.belongsToMany(Livre, {
  through: LivreEditeur,
  foreignKey: 'editeur_id',
  otherKey: 'livre_id',
  as: 'livres'
});

// Livre <-> GenreLitteraire (Many-to-Many)
Livre.belongsToMany(GenreLitteraire, {
  through: LivreGenre,
  foreignKey: 'livre_id',
  otherKey: 'genre_id',
  as: 'genresRef'
});

GenreLitteraire.belongsToMany(Livre, {
  through: LivreGenre,
  foreignKey: 'genre_id',
  otherKey: 'livre_id',
  as: 'livres'
});

// Livre <-> Theme (Many-to-Many)
Livre.belongsToMany(Theme, {
  through: LivreTheme,
  foreignKey: 'livre_id',
  otherKey: 'theme_id',
  as: 'themesRef'
});

Theme.belongsToMany(Livre, {
  through: LivreTheme,
  foreignKey: 'theme_id',
  otherKey: 'livre_id',
  as: 'livres'
});

// Livre <-> Langue (Many-to-Many)
Livre.belongsToMany(Langue, {
  through: LivreLangue,
  foreignKey: 'livre_id',
  otherKey: 'langue_id',
  as: 'languesRef'
});

Langue.belongsToMany(Livre, {
  through: LivreLangue,
  foreignKey: 'langue_id',
  otherKey: 'livre_id',
  as: 'livres'
});

// ========================================
// Associations pour normalisation des films
// ========================================

// Film <-> SupportVideo (Many-to-One)
SupportVideo.hasMany(Film, {
  foreignKey: 'support_id',
  as: 'films'
});

Film.belongsTo(SupportVideo, {
  foreignKey: 'support_id',
  as: 'supportRef'
});

// Film <-> EmplacementFilm (Many-to-One)
EmplacementFilm.hasMany(Film, {
  foreignKey: 'emplacement_id',
  as: 'films'
});

Film.belongsTo(EmplacementFilm, {
  foreignKey: 'emplacement_id',
  as: 'emplacementRef'
});

// EmplacementFilm <-> Site (Many-to-One)
Site.hasMany(EmplacementFilm, {
  foreignKey: 'site_id',
  as: 'emplacementsFilms'
});

EmplacementFilm.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Film <-> Realisateur (Many-to-Many)
Film.belongsToMany(Realisateur, {
  through: FilmRealisateur,
  foreignKey: 'film_id',
  otherKey: 'realisateur_id',
  as: 'realisateursRef'
});

Realisateur.belongsToMany(Film, {
  through: FilmRealisateur,
  foreignKey: 'realisateur_id',
  otherKey: 'film_id',
  as: 'films'
});

// Film <-> Acteur (Many-to-Many avec rôle)
Film.belongsToMany(Acteur, {
  through: FilmActeur,
  foreignKey: 'film_id',
  otherKey: 'acteur_id',
  as: 'acteursRef'
});

Acteur.belongsToMany(Film, {
  through: FilmActeur,
  foreignKey: 'acteur_id',
  otherKey: 'film_id',
  as: 'films'
});

// Film <-> GenreFilm (Many-to-Many)
Film.belongsToMany(GenreFilm, {
  through: FilmGenre,
  foreignKey: 'film_id',
  otherKey: 'genre_id',
  as: 'genresRef'
});

GenreFilm.belongsToMany(Film, {
  through: FilmGenre,
  foreignKey: 'genre_id',
  otherKey: 'film_id',
  as: 'films'
});

// Film <-> Theme (Many-to-Many)
Film.belongsToMany(Theme, {
  through: FilmTheme,
  foreignKey: 'film_id',
  otherKey: 'theme_id',
  as: 'themesRef'
});

Theme.belongsToMany(Film, {
  through: FilmTheme,
  foreignKey: 'theme_id',
  otherKey: 'film_id',
  as: 'films'
});

// Film <-> Langue (Many-to-Many) - Langues audio
Film.belongsToMany(Langue, {
  through: FilmLangue,
  foreignKey: 'film_id',
  otherKey: 'langue_id',
  as: 'languesRef'
});

Langue.belongsToMany(Film, {
  through: FilmLangue,
  foreignKey: 'langue_id',
  otherKey: 'film_id',
  as: 'films'
});

// Film <-> Langue (Many-to-Many) - Sous-titres
Film.belongsToMany(Langue, {
  through: FilmSousTitre,
  foreignKey: 'film_id',
  otherKey: 'langue_id',
  as: 'sousTitresRef'
});

Langue.belongsToMany(Film, {
  through: FilmSousTitre,
  foreignKey: 'langue_id',
  otherKey: 'film_id',
  as: 'filmsSousTitres'
});

// Film <-> Studio (Many-to-Many)
Film.belongsToMany(Studio, {
  through: FilmStudio,
  foreignKey: 'film_id',
  otherKey: 'studio_id',
  as: 'studiosRef'
});

Studio.belongsToMany(Film, {
  through: FilmStudio,
  foreignKey: 'studio_id',
  otherKey: 'film_id',
  as: 'films'
});

// ========================================
// Associations pour normalisation des disques
// ========================================

// Disque <-> FormatDisque (Many-to-One)
FormatDisque.hasMany(Disque, {
  foreignKey: 'format_id',
  as: 'disques'
});

Disque.belongsTo(FormatDisque, {
  foreignKey: 'format_id',
  as: 'formatRef'
});

// Disque <-> LabelDisque (Many-to-One)
LabelDisque.hasMany(Disque, {
  foreignKey: 'label_id',
  as: 'disques'
});

Disque.belongsTo(LabelDisque, {
  foreignKey: 'label_id',
  as: 'labelRef'
});

// Disque <-> EmplacementDisque (Many-to-One)
EmplacementDisque.hasMany(Disque, {
  foreignKey: 'emplacement_id',
  as: 'disques'
});

Disque.belongsTo(EmplacementDisque, {
  foreignKey: 'emplacement_id',
  as: 'emplacementRef'
});

// Disque <-> Artiste (Many-to-Many avec rôle)
Disque.belongsToMany(Artiste, {
  through: DisqueArtiste,
  foreignKey: 'disque_id',
  otherKey: 'artiste_id',
  as: 'artistesRef'
});

Artiste.belongsToMany(Disque, {
  through: DisqueArtiste,
  foreignKey: 'artiste_id',
  otherKey: 'disque_id',
  as: 'disques'
});

// Disque <-> GenreMusical (Many-to-Many)
Disque.belongsToMany(GenreMusical, {
  through: DisqueGenre,
  foreignKey: 'disque_id',
  otherKey: 'genre_id',
  as: 'genresRef'
});

GenreMusical.belongsToMany(Disque, {
  through: DisqueGenre,
  foreignKey: 'genre_id',
  otherKey: 'disque_id',
  as: 'disques'
});

// ========================================
// Associations pour les prolongations
// ========================================

// Emprunt <-> Prolongation (One-to-Many)
Emprunt.hasMany(Prolongation, {
  foreignKey: 'emprunt_id',
  as: 'prolongations'
});

Prolongation.belongsTo(Emprunt, {
  foreignKey: 'emprunt_id',
  as: 'emprunt'
});

// Utilisateur <-> Prolongation (One-to-Many) - demandeur
Utilisateur.hasMany(Prolongation, {
  foreignKey: 'utilisateur_id',
  as: 'prolongationsDemandees'
});

Prolongation.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'demandeur'
});

// Utilisateur <-> Prolongation (One-to-Many) - admin qui traite
Prolongation.belongsTo(Utilisateur, {
  foreignKey: 'traite_par',
  as: 'traitePar'
});

// ========================================
// Associations pour les reservations
// ========================================

// Utilisateur <-> Reservation (One-to-Many)
Utilisateur.hasMany(Reservation, {
  foreignKey: 'utilisateur_id',
  as: 'reservations'
});

Reservation.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
});

// Jeu <-> Reservation (One-to-Many)
Jeu.hasMany(Reservation, {
  foreignKey: 'jeu_id',
  as: 'reservations'
});

Reservation.belongsTo(Jeu, {
  foreignKey: 'jeu_id',
  as: 'jeu'
});

// Livre <-> Reservation (One-to-Many)
Livre.hasMany(Reservation, {
  foreignKey: 'livre_id',
  as: 'reservations'
});

Reservation.belongsTo(Livre, {
  foreignKey: 'livre_id',
  as: 'livre'
});

// Film <-> Reservation (One-to-Many)
Film.hasMany(Reservation, {
  foreignKey: 'film_id',
  as: 'reservations'
});

Reservation.belongsTo(Film, {
  foreignKey: 'film_id',
  as: 'film'
});

// Disque <-> Reservation (One-to-Many)
Disque.hasMany(Reservation, {
  foreignKey: 'cd_id',
  as: 'reservations'
});

Reservation.belongsTo(Disque, {
  foreignKey: 'cd_id',
  as: 'disque'
});

// Emprunt <-> Reservation (One-to-One) - apres conversion
Reservation.belongsTo(Emprunt, {
  foreignKey: 'emprunt_id',
  as: 'emprunt'
});

Emprunt.hasOne(Reservation, {
  foreignKey: 'emprunt_id',
  as: 'reservationOrigine'
});

// ========================================
// ASSOCIATIONS COMPTABILITE (TVA et Analytique)
// ========================================

// TarifCotisation <-> TauxTVA (Many-to-One)
TarifCotisation.belongsTo(TauxTVA, {
  foreignKey: 'taux_tva_id',
  as: 'tauxTVA'
});

TauxTVA.hasMany(TarifCotisation, {
  foreignKey: 'taux_tva_id',
  as: 'tarifsCotisation'
});

// SectionAnalytique - auto-reference pour hierarchie
SectionAnalytique.belongsTo(SectionAnalytique, {
  foreignKey: 'parent_id',
  as: 'parent'
});

SectionAnalytique.hasMany(SectionAnalytique, {
  foreignKey: 'parent_id',
  as: 'enfants'
});

// RepartitionAnalytique <-> SectionAnalytique (Many-to-One)
RepartitionAnalytique.belongsTo(SectionAnalytique, {
  foreignKey: 'section_analytique_id',
  as: 'section'
});

SectionAnalytique.hasMany(RepartitionAnalytique, {
  foreignKey: 'section_analytique_id',
  as: 'repartitions'
});

// ========================================
// ASSOCIATIONS COMPTABILITE (Phase 1 - FEC)
// ========================================

// EcritureComptable <-> Cotisation (Many-to-One)
EcritureComptable.belongsTo(Cotisation, {
  foreignKey: 'cotisation_id',
  as: 'cotisation'
});

Cotisation.hasMany(EcritureComptable, {
  foreignKey: 'cotisation_id',
  as: 'ecritures'
});

// ========================================
// ASSOCIATIONS COMPTABILITE (Phase 2 - Parametrage)
// ========================================

// CompteComptable - auto-reference pour hierarchie
CompteComptable.belongsTo(CompteComptable, {
  foreignKey: 'parent_id',
  as: 'parent'
});

CompteComptable.hasMany(CompteComptable, {
  foreignKey: 'parent_id',
  as: 'enfants'
});

// ParametrageComptableOperation <-> TauxTVA (Many-to-One)
ParametrageComptableOperation.belongsTo(TauxTVA, {
  foreignKey: 'taux_tva_id',
  as: 'tauxTVA'
});

TauxTVA.hasMany(ParametrageComptableOperation, {
  foreignKey: 'taux_tva_id',
  as: 'parametragesOperations'
});

// ParametrageComptableOperation <-> SectionAnalytique (Many-to-One)
ParametrageComptableOperation.belongsTo(SectionAnalytique, {
  foreignKey: 'section_analytique_id',
  as: 'sectionAnalytique'
});

SectionAnalytique.hasMany(ParametrageComptableOperation, {
  foreignKey: 'section_analytique_id',
  as: 'parametragesOperations'
});

// CompteEncaissementModePaiement <-> ModePaiement (Many-to-One)
CompteEncaissementModePaiement.belongsTo(ModePaiement, {
  foreignKey: 'mode_paiement_id',
  as: 'modePaiement'
});

ModePaiement.hasOne(CompteEncaissementModePaiement, {
  foreignKey: 'mode_paiement_id',
  as: 'compteEncaissement'
});

// ========================================
// ASSOCIATIONS THEMATIQUES IA
// ========================================

// Thematique <-> ThematiqueAlias (One-to-Many)
Thematique.hasMany(ThematiqueAlias, {
  foreignKey: 'thematique_id',
  as: 'alias'
});

ThematiqueAlias.belongsTo(Thematique, {
  foreignKey: 'thematique_id',
  as: 'thematique'
});

// Thematique <-> ArticleThematique (One-to-Many)
Thematique.hasMany(ArticleThematique, {
  foreignKey: 'thematique_id',
  as: 'articles'
});

ArticleThematique.belongsTo(Thematique, {
  foreignKey: 'thematique_id',
  as: 'thematique'
});

// ========================================
// ASSOCIATIONS CODES-BARRES RESERVES
// ========================================

// LotCodesBarres <-> Utilisateur (createur du lot)
LotCodesBarres.belongsTo(Utilisateur, {
  foreignKey: 'cree_par',
  as: 'createur'
});

Utilisateur.hasMany(LotCodesBarres, {
  foreignKey: 'cree_par',
  as: 'lotsCodesBarres'
});

// LotCodesBarres <-> CodeBarreUtilisateur (One-to-Many)
LotCodesBarres.hasMany(CodeBarreUtilisateur, {
  foreignKey: 'lot_id',
  as: 'codesUtilisateurs'
});

CodeBarreUtilisateur.belongsTo(LotCodesBarres, {
  foreignKey: 'lot_id',
  as: 'lot'
});

// CodeBarreUtilisateur <-> Utilisateur (association)
CodeBarreUtilisateur.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
});

Utilisateur.hasOne(CodeBarreUtilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'codeBarreReserve'
});

// LotCodesBarres <-> CodeBarreJeu (One-to-Many)
LotCodesBarres.hasMany(CodeBarreJeu, {
  foreignKey: 'lot_id',
  as: 'codesJeux'
});

CodeBarreJeu.belongsTo(LotCodesBarres, {
  foreignKey: 'lot_id',
  as: 'lot'
});

// CodeBarreJeu <-> Jeu (association)
CodeBarreJeu.belongsTo(Jeu, {
  foreignKey: 'jeu_id',
  as: 'jeu'
});

Jeu.hasOne(CodeBarreJeu, {
  foreignKey: 'jeu_id',
  as: 'codeBarreReserve'
});

// LotCodesBarres <-> CodeBarreLivre (One-to-Many)
LotCodesBarres.hasMany(CodeBarreLivre, {
  foreignKey: 'lot_id',
  as: 'codesLivres'
});

CodeBarreLivre.belongsTo(LotCodesBarres, {
  foreignKey: 'lot_id',
  as: 'lot'
});

// CodeBarreLivre <-> Livre (association)
CodeBarreLivre.belongsTo(Livre, {
  foreignKey: 'livre_id',
  as: 'livre'
});

Livre.hasOne(CodeBarreLivre, {
  foreignKey: 'livre_id',
  as: 'codeBarreReserve'
});

// LotCodesBarres <-> CodeBarreFilm (One-to-Many)
LotCodesBarres.hasMany(CodeBarreFilm, {
  foreignKey: 'lot_id',
  as: 'codesFilms'
});

CodeBarreFilm.belongsTo(LotCodesBarres, {
  foreignKey: 'lot_id',
  as: 'lot'
});

// CodeBarreFilm <-> Film (association)
CodeBarreFilm.belongsTo(Film, {
  foreignKey: 'film_id',
  as: 'film'
});

Film.hasOne(CodeBarreFilm, {
  foreignKey: 'film_id',
  as: 'codeBarreReserve'
});

// LotCodesBarres <-> CodeBarreDisque (One-to-Many)
LotCodesBarres.hasMany(CodeBarreDisque, {
  foreignKey: 'lot_id',
  as: 'codesDisques'
});

CodeBarreDisque.belongsTo(LotCodesBarres, {
  foreignKey: 'lot_id',
  as: 'lot'
});

// CodeBarreDisque <-> Disque (association)
CodeBarreDisque.belongsTo(Disque, {
  foreignKey: 'disque_id',
  as: 'disque'
});

Disque.hasOne(CodeBarreDisque, {
  foreignKey: 'disque_id',
  as: 'codeBarreReserve'
});

// ========================================
// ASSOCIATIONS CAISSE (Gestion des règlements)
// ========================================

// Caisse <-> Site (Many-to-One)
Caisse.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

Site.hasMany(Caisse, {
  foreignKey: 'site_id',
  as: 'caisses'
});

// Caisse <-> Utilisateur (responsable)
Caisse.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_responsable_id',
  as: 'responsable'
});

Utilisateur.hasMany(Caisse, {
  foreignKey: 'utilisateur_responsable_id',
  as: 'caissesResponsable'
});

// Caisse <-> SessionCaisse (One-to-Many)
Caisse.hasMany(SessionCaisse, {
  foreignKey: 'caisse_id',
  as: 'sessions'
});

SessionCaisse.belongsTo(Caisse, {
  foreignKey: 'caisse_id',
  as: 'caisse'
});

// SessionCaisse <-> Utilisateur (ouverture)
SessionCaisse.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
});

Utilisateur.hasMany(SessionCaisse, {
  foreignKey: 'utilisateur_id',
  as: 'sessionsOuvertes'
});

// SessionCaisse <-> Utilisateur (cloture)
SessionCaisse.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_cloture_id',
  as: 'utilisateurCloture'
});

Utilisateur.hasMany(SessionCaisse, {
  foreignKey: 'utilisateur_cloture_id',
  as: 'sessionsCloturees'
});

// SessionCaisse <-> MouvementCaisse (One-to-Many)
SessionCaisse.hasMany(MouvementCaisse, {
  foreignKey: 'session_caisse_id',
  as: 'mouvements'
});

MouvementCaisse.belongsTo(SessionCaisse, {
  foreignKey: 'session_caisse_id',
  as: 'session'
});

// MouvementCaisse <-> Utilisateur (adherent concerne)
MouvementCaisse.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
});

Utilisateur.hasMany(MouvementCaisse, {
  foreignKey: 'utilisateur_id',
  as: 'mouvementsCaisse'
});

// MouvementCaisse <-> Utilisateur (operateur)
MouvementCaisse.belongsTo(Utilisateur, {
  foreignKey: 'operateur_id',
  as: 'operateur'
});

Utilisateur.hasMany(MouvementCaisse, {
  foreignKey: 'operateur_id',
  as: 'mouvementsOperes'
});

// MouvementCaisse <-> Cotisation (optionnel)
MouvementCaisse.belongsTo(Cotisation, {
  foreignKey: 'cotisation_id',
  as: 'cotisation'
});

Cotisation.hasMany(MouvementCaisse, {
  foreignKey: 'cotisation_id',
  as: 'mouvementsCaisse'
});

// MouvementCaisse <-> Emprunt (optionnel)
MouvementCaisse.belongsTo(Emprunt, {
  foreignKey: 'emprunt_id',
  as: 'emprunt'
});

Emprunt.hasMany(MouvementCaisse, {
  foreignKey: 'emprunt_id',
  as: 'mouvementsCaisse'
});

// MouvementCaisse <-> EcritureComptable (optionnel)
MouvementCaisse.belongsTo(EcritureComptable, {
  foreignKey: 'ecriture_comptable_id',
  as: 'ecritureComptable'
});

EcritureComptable.hasMany(MouvementCaisse, {
  foreignKey: 'ecriture_comptable_id',
  as: 'mouvementsCaisse'
});

// ========================================
// ASSOCIATIONS FACTURES
// ========================================

// Facture <-> Utilisateur (client)
Facture.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'client'
});

Utilisateur.hasMany(Facture, {
  foreignKey: 'utilisateur_id',
  as: 'factures'
});

// Facture <-> Utilisateur (créateur)
Facture.belongsTo(Utilisateur, {
  foreignKey: 'cree_par_id',
  as: 'createur'
});

// Facture <-> Cotisation (optionnel)
Facture.belongsTo(Cotisation, {
  foreignKey: 'cotisation_id',
  as: 'cotisation'
});

Cotisation.hasOne(Facture, {
  foreignKey: 'cotisation_id',
  as: 'facture'
});

// Facture <-> Facture (avoir -> facture origine)
Facture.belongsTo(Facture, {
  foreignKey: 'facture_avoir_reference_id',
  as: 'factureOrigine'
});

Facture.hasMany(Facture, {
  foreignKey: 'facture_avoir_reference_id',
  as: 'avoirs'
});

// Facture <-> EcritureComptable (optionnel)
Facture.belongsTo(EcritureComptable, {
  foreignKey: 'ecriture_comptable_id',
  as: 'ecritureComptable'
});

EcritureComptable.hasMany(Facture, {
  foreignKey: 'ecriture_comptable_id',
  as: 'factures'
});

// Facture <-> LigneFacture (One-to-Many)
Facture.hasMany(LigneFacture, {
  foreignKey: 'facture_id',
  as: 'lignes'
});

LigneFacture.belongsTo(Facture, {
  foreignKey: 'facture_id',
  as: 'facture'
});

// LigneFacture <-> SectionAnalytique (optionnel)
LigneFacture.belongsTo(SectionAnalytique, {
  foreignKey: 'section_analytique_id',
  as: 'sectionAnalytique'
});

SectionAnalytique.hasMany(LigneFacture, {
  foreignKey: 'section_analytique_id',
  as: 'lignesFacture'
});

// LigneFacture <-> Cotisation (optionnel)
LigneFacture.belongsTo(Cotisation, {
  foreignKey: 'cotisation_id',
  as: 'cotisation'
});

// Facture <-> ReglementFacture (One-to-Many)
Facture.hasMany(ReglementFacture, {
  foreignKey: 'facture_id',
  as: 'reglements'
});

ReglementFacture.belongsTo(Facture, {
  foreignKey: 'facture_id',
  as: 'facture'
});

// ReglementFacture <-> ModePaiement (optionnel)
ReglementFacture.belongsTo(ModePaiement, {
  foreignKey: 'mode_paiement_id',
  as: 'modePaiement'
});

// ReglementFacture <-> MouvementCaisse (optionnel)
ReglementFacture.belongsTo(MouvementCaisse, {
  foreignKey: 'mouvement_caisse_id',
  as: 'mouvementCaisse'
});

MouvementCaisse.hasOne(ReglementFacture, {
  foreignKey: 'mouvement_caisse_id',
  as: 'reglementFacture'
});

// ReglementFacture <-> CompteBancaire (optionnel)
ReglementFacture.belongsTo(CompteBancaire, {
  foreignKey: 'compte_bancaire_id',
  as: 'compteBancaire'
});

// ReglementFacture <-> Utilisateur (enregistreur)
ReglementFacture.belongsTo(Utilisateur, {
  foreignKey: 'enregistre_par_id',
  as: 'enregistrePar'
});

// ========================================
// ASSOCIATIONS REGROUPEMENTS ANALYTIQUES
// ========================================

// RegroupementAnalytique <-> RegroupementAnalytiqueDetail (One-to-Many)
RegroupementAnalytique.hasMany(RegroupementAnalytiqueDetail, {
  foreignKey: 'regroupement_id',
  as: 'details'
});

RegroupementAnalytiqueDetail.belongsTo(RegroupementAnalytique, {
  foreignKey: 'regroupement_id',
  as: 'regroupement'
});

// RegroupementAnalytiqueDetail <-> SectionAnalytique (Many-to-One)
RegroupementAnalytiqueDetail.belongsTo(SectionAnalytique, {
  foreignKey: 'section_analytique_id',
  as: 'section'
});

SectionAnalytique.hasMany(RegroupementAnalytiqueDetail, {
  foreignKey: 'section_analytique_id',
  as: 'regroupementsDetails'
});

// ParametrageComptableOperation <-> RegroupementAnalytique (Many-to-One, optionnel)
ParametrageComptableOperation.belongsTo(RegroupementAnalytique, {
  foreignKey: 'regroupement_analytique_id',
  as: 'regroupementAnalytique'
});

RegroupementAnalytique.hasMany(ParametrageComptableOperation, {
  foreignKey: 'regroupement_analytique_id',
  as: 'parametragesOperations'
});

// ============================================
// Plans (Editeur de plans interactifs)
// ============================================

// Site <-> Plan (One-to-One)
Site.hasOne(Plan, {
  foreignKey: 'site_id',
  as: 'plan'
});

Plan.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// Plan <-> Etage (One-to-Many)
Plan.hasMany(Etage, {
  foreignKey: 'plan_id',
  as: 'etages'
});

Etage.belongsTo(Plan, {
  foreignKey: 'plan_id',
  as: 'plan'
});

// Etage <-> ElementPlan (One-to-Many)
Etage.hasMany(ElementPlan, {
  foreignKey: 'etage_id',
  as: 'elements'
});

ElementPlan.belongsTo(Etage, {
  foreignKey: 'etage_id',
  as: 'etage'
});

// ElementPlan <-> ElementEmplacement (One-to-Many)
ElementPlan.hasMany(ElementEmplacement, {
  foreignKey: 'element_plan_id',
  as: 'emplacements'
});

ElementEmplacement.belongsTo(ElementPlan, {
  foreignKey: 'element_plan_id',
  as: 'elementPlan'
});

// ElementEmplacement <-> Emplacements (Many-to-One pour chaque type)
ElementEmplacement.belongsTo(EmplacementJeu, {
  foreignKey: 'emplacement_jeu_id',
  as: 'emplacementJeu'
});

EmplacementJeu.hasMany(ElementEmplacement, {
  foreignKey: 'emplacement_jeu_id',
  as: 'elementsPlan'
});

ElementEmplacement.belongsTo(EmplacementLivre, {
  foreignKey: 'emplacement_livre_id',
  as: 'emplacementLivre'
});

EmplacementLivre.hasMany(ElementEmplacement, {
  foreignKey: 'emplacement_livre_id',
  as: 'elementsPlan'
});

ElementEmplacement.belongsTo(EmplacementFilm, {
  foreignKey: 'emplacement_film_id',
  as: 'emplacementFilm'
});

EmplacementFilm.hasMany(ElementEmplacement, {
  foreignKey: 'emplacement_film_id',
  as: 'elementsPlan'
});

ElementEmplacement.belongsTo(EmplacementDisque, {
  foreignKey: 'emplacement_disque_id',
  as: 'emplacementDisque'
});

EmplacementDisque.hasMany(ElementEmplacement, {
  foreignKey: 'emplacement_disque_id',
  as: 'elementsPlan'
});

// ============================================
// Frequentation (Comptage visiteurs)
// ============================================

// QuestionnaireFrequentation <-> Site (Many-to-One, site unique)
QuestionnaireFrequentation.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

Site.hasMany(QuestionnaireFrequentation, {
  foreignKey: 'site_id',
  as: 'questionnairesFrequentation'
});

// QuestionnaireFrequentation <-> Utilisateur (createur)
QuestionnaireFrequentation.belongsTo(Utilisateur, {
  foreignKey: 'cree_par',
  as: 'createur'
});

Utilisateur.hasMany(QuestionnaireFrequentation, {
  foreignKey: 'cree_par',
  as: 'questionnairesCreees'
});

// QuestionnaireCommuneFavorite <-> QuestionnaireFrequentation
QuestionnaireCommuneFavorite.belongsTo(QuestionnaireFrequentation, {
  foreignKey: 'questionnaire_id',
  as: 'questionnaire'
});

QuestionnaireFrequentation.hasMany(QuestionnaireCommuneFavorite, {
  foreignKey: 'questionnaire_id',
  as: 'communesFavorites'
});

// QuestionnaireCommuneFavorite <-> Commune
QuestionnaireCommuneFavorite.belongsTo(Commune, {
  foreignKey: 'commune_id',
  as: 'commune'
});

Commune.hasMany(QuestionnaireCommuneFavorite, {
  foreignKey: 'commune_id',
  as: 'favoritesDans'
});

// EnregistrementFrequentation <-> QuestionnaireFrequentation
EnregistrementFrequentation.belongsTo(QuestionnaireFrequentation, {
  foreignKey: 'questionnaire_id',
  as: 'questionnaire'
});

QuestionnaireFrequentation.hasMany(EnregistrementFrequentation, {
  foreignKey: 'questionnaire_id',
  as: 'enregistrements'
});

// EnregistrementFrequentation <-> Site
EnregistrementFrequentation.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

Site.hasMany(EnregistrementFrequentation, {
  foreignKey: 'site_id',
  as: 'enregistrementsFrequentation'
});

// EnregistrementFrequentation <-> ApiKey (tablette)
EnregistrementFrequentation.belongsTo(ApiKey, {
  foreignKey: 'api_key_id',
  as: 'tablette'
});

ApiKey.hasMany(EnregistrementFrequentation, {
  foreignKey: 'api_key_id',
  as: 'enregistrementsFrequentation'
});

// EnregistrementFrequentation <-> Commune
EnregistrementFrequentation.belongsTo(Commune, {
  foreignKey: 'commune_id',
  as: 'commune'
});

Commune.hasMany(EnregistrementFrequentation, {
  foreignKey: 'commune_id',
  as: 'enregistrements'
});

// ApiKeyQuestionnaire <-> ApiKey
ApiKeyQuestionnaire.belongsTo(ApiKey, {
  foreignKey: 'api_key_id',
  as: 'apiKey'
});

ApiKey.hasMany(ApiKeyQuestionnaire, {
  foreignKey: 'api_key_id',
  as: 'questionnairesLies'
});

// ApiKeyQuestionnaire <-> QuestionnaireFrequentation
ApiKeyQuestionnaire.belongsTo(QuestionnaireFrequentation, {
  foreignKey: 'questionnaire_id',
  as: 'questionnaire'
});

QuestionnaireFrequentation.hasMany(ApiKeyQuestionnaire, {
  foreignKey: 'questionnaire_id',
  as: 'tablettesLiees'
});

// ApiKeyQuestionnaire <-> Site
ApiKeyQuestionnaire.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

Site.hasMany(ApiKeyQuestionnaire, {
  foreignKey: 'site_id',
  as: 'tablettesFrequentation'
});

// ============================================
// Charte Usager (Validation signature numerique)
// ============================================

// CharteUsager <-> ValidationCharte (One-to-Many)
CharteUsager.hasMany(ValidationCharte, {
  foreignKey: 'charte_id',
  as: 'validations'
});

ValidationCharte.belongsTo(CharteUsager, {
  foreignKey: 'charte_id',
  as: 'charte'
});

// Utilisateur <-> ValidationCharte (One-to-Many)
Utilisateur.hasMany(ValidationCharte, {
  foreignKey: 'utilisateur_id',
  as: 'validationsCharte'
});

ValidationCharte.belongsTo(Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
});

// Cotisation <-> ValidationCharte (One-to-One)
Cotisation.hasOne(ValidationCharte, {
  foreignKey: 'cotisation_id',
  as: 'validationCharte'
});

ValidationCharte.belongsTo(Cotisation, {
  foreignKey: 'cotisation_id',
  as: 'cotisation'
});

// Export models and sequelize instance
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
  // Configuration API (lookup EAN/ISBN externe)
  ConfigurationAPI,
  // Configuration Export Comptable (multi-formats)
  ConfigurationExportComptable,
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
  QuestionnaireFrequentation,
  QuestionnaireCommuneFavorite,
  EnregistrementFrequentation,
  ApiKeyQuestionnaire,
  // Charte Usager (validation signature numerique)
  CharteUsager,
  ValidationCharte
};
