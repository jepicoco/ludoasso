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

// Import LLM Configuration (Recherche IA)
const ConfigurationLLMModel = require('./ConfigurationLLM');

// Import Thematiques IA (Recherche naturelle)
const ThematiqueModel = require('./Thematique');
const ThematiqueAliasModel = require('./ThematiqueAlias');
const ArticleThematiqueModel = require('./ArticleThematique');
const EnrichissementQueueModel = require('./EnrichissementQueue');
const ArticleThematiqueHistoriqueModel = require('./ArticleThematiqueHistorique');

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

// Initialize LLM Configuration (Recherche IA)
const ConfigurationLLM = ConfigurationLLMModel(sequelize);

// Initialize Thematiques IA (Recherche naturelle)
const Thematique = ThematiqueModel(sequelize);
const ThematiqueAlias = ThematiqueAliasModel(sequelize);
const ArticleThematique = ArticleThematiqueModel(sequelize);
const EnrichissementQueue = EnrichissementQueueModel(sequelize);
const ArticleThematiqueHistorique = ArticleThematiqueHistoriqueModel(sequelize);

// Define associations
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

// Export models and sequelize instance
module.exports = {
  sequelize,
  Utilisateur,
  UtilisateurArchive,
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
  // LLM Configuration (Recherche IA)
  ConfigurationLLM,
  // Thematiques IA (Recherche naturelle)
  Thematique,
  ThematiqueAlias,
  ArticleThematique,
  EnrichissementQueue,
  ArticleThematiqueHistorique
};
