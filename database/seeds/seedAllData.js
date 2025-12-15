/**
 * Script de seed complet pour toutes les tables du projet
 * Cree des donnees de demonstration couvrant toutes les options disponibles
 *
 * Usage: node database/seeds/seedAllData.js [--force]
 *   --force : Reinitialise les donnees meme si elles existent deja
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Sequelize } = require('sequelize');

// Configuration de la connexion
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

const forceMode = process.argv.includes('--force');

// ========================================
// DONNEES DE SEED
// ========================================

// === SITES ===
const sites = [
  {
    code: 'LUDO_PRINCIPAL',
    nom: 'Ludotheque Principale',
    type: 'fixe',
    description: 'Site principal de la ludotheque',
    adresse: '10 rue des Jeux',
    code_postal: '75001',
    ville: 'Paris',
    pays: 'FR',
    telephone: '01 23 45 67 89',
    email: 'contact@liberteko.local',
    couleur: '#0d6efd',
    icone: 'building',
    ordre_affichage: 1,
    actif: true
  },
  {
    code: 'BIBLIO_ANNEXE',
    nom: 'Bibliotheque Annexe',
    type: 'fixe',
    description: 'Annexe dedie aux livres et medias',
    adresse: '25 avenue de la Culture',
    code_postal: '75002',
    ville: 'Paris',
    pays: 'FR',
    telephone: '01 98 76 54 32',
    email: 'biblio@liberteko.local',
    couleur: '#198754',
    icone: 'book',
    ordre_affichage: 2,
    actif: true
  },
  {
    code: 'LUDO_MOBILE',
    nom: 'Ludotheque Mobile',
    type: 'mobile',
    description: 'Service itinerant pour ecoles et evenements',
    adresse: null,
    code_postal: null,
    ville: null,
    pays: 'FR',
    telephone: '06 11 22 33 44',
    email: 'mobile@liberteko.local',
    couleur: '#fd7e14',
    icone: 'truck',
    ordre_affichage: 3,
    actif: true
  }
];

// === COMPTES BANCAIRES ===
const comptesBancaires = [
  {
    libelle: 'Compte principal',
    banque: 'Credit Mutuel',
    iban: 'FR76 1234 5678 9012 3456 7890 123',
    bic: 'CMCIFRPP',
    titulaire: 'Association Ludotheque',
    actif: true,
    par_defaut: true
  },
  {
    libelle: 'Compte evenements',
    banque: 'Banque Postale',
    iban: 'FR76 9876 5432 1098 7654 3210 987',
    bic: 'PSSTFRPP',
    titulaire: 'Association Ludotheque',
    actif: true,
    par_defaut: false
  }
];

// === MODES DE PAIEMENT ===
const modesPaiement = [
  { libelle: 'Especes', actif: true, ordre_affichage: 1, journal_comptable: 'CA', type_operation: 'debit', code_comptable: '530', icone: 'bi-cash', couleur: 'success' },
  { libelle: 'Cheque', actif: true, ordre_affichage: 2, journal_comptable: 'BQ', type_operation: 'debit', code_comptable: '512', icone: 'bi-journal-check', couleur: 'primary' },
  { libelle: 'Carte bancaire', actif: true, ordre_affichage: 3, journal_comptable: 'BQ', type_operation: 'debit', code_comptable: '512', icone: 'bi-credit-card', couleur: 'info' },
  { libelle: 'Virement', actif: true, ordre_affichage: 4, journal_comptable: 'BQ', type_operation: 'debit', code_comptable: '512', icone: 'bi-bank', couleur: 'secondary' },
  { libelle: 'Prelevement', actif: false, ordre_affichage: 5, journal_comptable: 'BQ', type_operation: 'debit', code_comptable: '512', icone: 'bi-arrow-repeat', couleur: 'warning' },
  { libelle: 'Avoir', actif: true, ordre_affichage: 6, journal_comptable: 'OD', type_operation: 'credit', code_comptable: '419', icone: 'bi-ticket-perforated', couleur: 'danger' }
];

// === TARIFS COTISATION ===
const tarifsCotisation = [
  { libelle: 'Individuel Annuel', description: 'Cotisation individuelle annee civile', type_periode: 'annee_civile', type_montant: 'fixe', montant_base: 25.00, actif: true, ordre_affichage: 1, par_defaut: true },
  { libelle: 'Famille Annuel', description: 'Cotisation famille annee civile', type_periode: 'annee_civile', type_montant: 'fixe', montant_base: 40.00, actif: true, ordre_affichage: 2, par_defaut: false },
  { libelle: 'Etudiant Scolaire', description: 'Cotisation etudiant annee scolaire', type_periode: 'annee_scolaire', type_montant: 'fixe', montant_base: 15.00, actif: true, ordre_affichage: 3, par_defaut: false },
  { libelle: 'Mensuel Prorata', description: 'Cotisation au prorata du mois', type_periode: 'date_a_date', type_montant: 'prorata', montant_base: 30.00, actif: true, ordre_affichage: 4, par_defaut: false },
  { libelle: 'Senior', description: 'Cotisation seniors (+65 ans)', type_periode: 'annee_civile', type_montant: 'fixe', montant_base: 15.00, reduction_association_type: 'pourcentage', reduction_association_valeur: 10, actif: true, ordre_affichage: 5, par_defaut: false }
];

// === CODES REDUCTION ===
const codesReduction = [
  { code: 'BIENVENUE10', libelle: 'Bienvenue 10%', description: 'Remise de 10% pour les nouveaux adherents', type_reduction: 'pourcentage', valeur: 10, actif: true, icone: 'bi-gift', couleur: 'primary', ordre_affichage: 1 },
  { code: 'FAMILLE20', libelle: 'Reduction famille', description: 'Reduction de 20% pour les familles nombreuses', type_reduction: 'pourcentage', valeur: 20, actif: true, icone: 'bi-people', couleur: 'success', ordre_affichage: 2 },
  { code: 'FIXE5', libelle: 'Reduction fixe 5EUR', description: 'Remise fixe de 5 euros', type_reduction: 'fixe', valeur: 5, actif: true, icone: 'bi-cash-coin', couleur: 'info', ordre_affichage: 3 },
  { code: 'ETUDIANT15', libelle: 'Tarif etudiant', description: 'Reduction de 15EUR avec avoir si necessaire', type_reduction: 'fixe_avec_avoir', valeur: 15, actif: true, icone: 'bi-book', couleur: 'warning', ordre_affichage: 4 },
  { code: 'PARRAIN50', libelle: 'Parrainage', description: 'Reduction 50% pour filleul parraine', type_reduction: 'pourcentage', valeur: 50, actif: true, icone: 'bi-person-hearts', couleur: 'danger', ordre_affichage: 5 }
];

// === CATEGORIES JEUX ===
const categories = [
  { nom: 'Jeu de plateau', description: 'Jeux avec un plateau central' },
  { nom: 'Jeu de cartes', description: 'Jeux principalement bases sur des cartes' },
  { nom: 'Jeu de des', description: 'Jeux utilisant des des comme mecanique principale' },
  { nom: 'Jeu de strategie', description: 'Jeux necessitant reflexion et planification' },
  { nom: 'Jeu cooperatif', description: 'Jeux ou les joueurs jouent ensemble' },
  { nom: 'Jeu d\'ambiance', description: 'Jeux legers et conviviaux' },
  { nom: 'Jeu de role', description: 'Jeux d\'interpretation de personnages' },
  { nom: 'Casse-tete', description: 'Puzzles et jeux de logique' },
  { nom: 'Jeu enfant', description: 'Jeux adaptes aux jeunes enfants' },
  { nom: 'Jeu expert', description: 'Jeux complexes pour joueurs experimentes' }
];

// === THEMES ===
const themes = [
  { nom: 'Fantastique' }, { nom: 'Science-Fiction' }, { nom: 'Medieval' },
  { nom: 'Moderne' }, { nom: 'Historique' }, { nom: 'Abstrait' },
  { nom: 'Nature' }, { nom: 'Animaux' }, { nom: 'Espace' },
  { nom: 'Pirates' }, { nom: 'Western' }, { nom: 'Horreur' }
];

// === MECANISMES ===
const mecanismes = [
  { nom: 'Placement d\'ouvriers' }, { nom: 'Deck building' }, { nom: 'Draft' },
  { nom: 'Gestion de ressources' }, { nom: 'Majorite' }, { nom: 'Encheres' },
  { nom: 'Roll & Write' }, { nom: 'Deduction' }, { nom: 'Bluff' },
  { nom: 'Course' }, { nom: 'Combat' }, { nom: 'Negociation' }
];

// === LANGUES ===
const langues = [
  { code: 'FR', nom: 'Francais' }, { code: 'EN', nom: 'Anglais' },
  { code: 'DE', nom: 'Allemand' }, { code: 'ES', nom: 'Espagnol' },
  { code: 'IT', nom: 'Italien' }, { code: 'NL', nom: 'Neerlandais' },
  { code: 'PT', nom: 'Portugais' }, { code: 'JA', nom: 'Japonais' }
];

// === EDITEURS ===
const editeurs = [
  { nom: 'Asmodee', pays: 'France', site_web: 'https://www.asmodee.com' },
  { nom: 'Iello', pays: 'France', site_web: 'https://www.iello.fr' },
  { nom: 'Matagot', pays: 'France', site_web: 'https://www.matagot.com' },
  { nom: 'Days of Wonder', pays: 'France', site_web: 'https://www.daysofwonder.com' },
  { nom: 'Fantasy Flight Games', pays: 'USA', site_web: 'https://www.fantasyflightgames.com' },
  { nom: 'Ravensburger', pays: 'Allemagne', site_web: 'https://www.ravensburger.com' },
  { nom: 'Gigamic', pays: 'France', site_web: 'https://www.gigamic.com' },
  { nom: 'Z-Man Games', pays: 'USA', site_web: 'https://www.zmangames.com' }
];

// === AUTEURS ===
const auteurs = [
  { nom: 'Bauza', prenom: 'Antoine', nationalite: 'Francais' },
  { nom: 'Cathala', prenom: 'Bruno', nationalite: 'Francais' },
  { nom: 'Knizia', prenom: 'Reiner', nationalite: 'Allemand' },
  { nom: 'Rosenberg', prenom: 'Uwe', nationalite: 'Allemand' },
  { nom: 'Leacock', prenom: 'Matt', nationalite: 'Americain' },
  { nom: 'Chvatil', prenom: 'Vlaada', nationalite: 'Tcheque' },
  { nom: 'Moon', prenom: 'Alan R.', nationalite: 'Americain' },
  { nom: 'Feld', prenom: 'Stefan', nationalite: 'Allemand' }
];

// === ILLUSTRATEURS ===
const illustrateurs = [
  { nom: 'Coimbra', prenom: 'Miguel' },
  { nom: 'Naiade', prenom: '' },
  { nom: 'Dutrait', prenom: 'Vincent' },
  { nom: 'Quilliams', prenom: 'Chris' },
  { nom: 'Menzel', prenom: 'Michael' }
];

// === GAMMES ===
const gammes = [
  { nom: 'Les Aventuriers du Rail', editeur: 'Days of Wonder' },
  { nom: 'Catan', editeur: 'Asmodee' },
  { nom: 'Carcassonne', editeur: 'Z-Man Games' },
  { nom: 'Unlock!', editeur: 'Asmodee' },
  { nom: 'Pandemic', editeur: 'Z-Man Games' }
];

// === EMPLACEMENTS JEUX ===
const emplacementsJeux = [
  { code: 'A1', libelle: 'Etagere A - Niveau 1', description: 'Jeux familiaux', site: 'LUDO_PRINCIPAL' },
  { code: 'A2', libelle: 'Etagere A - Niveau 2', description: 'Jeux de cartes', site: 'LUDO_PRINCIPAL' },
  { code: 'B1', libelle: 'Etagere B - Niveau 1', description: 'Jeux experts', site: 'LUDO_PRINCIPAL' },
  { code: 'B2', libelle: 'Etagere B - Niveau 2', description: 'Jeux cooperatifs', site: 'LUDO_PRINCIPAL' },
  { code: 'C1', libelle: 'Armoire C', description: 'Jeux enfants', site: 'LUDO_PRINCIPAL' },
  { code: 'MOB', libelle: 'Caisse mobile', description: 'Jeux pour animations', site: 'LUDO_MOBILE' }
];

// === GENRES LITTERAIRES ===
const genresLitteraires = [
  { nom: 'Fantasy', icone: 'magic' }, { nom: 'Science-Fiction', icone: 'rocket' },
  { nom: 'Roman', icone: 'book' }, { nom: 'Dystopie', icone: 'exclamation-triangle' },
  { nom: 'Aventure', icone: 'compass' }, { nom: 'Jeunesse', icone: 'emoji-smile' },
  { nom: 'Classique', icone: 'award' }, { nom: 'Policier', icone: 'search' },
  { nom: 'Biographie', icone: 'person' }, { nom: 'Documentaire', icone: 'journal' }
];

// === FORMATS LIVRES ===
const formatsLivres = [
  { nom: 'Poche' }, { nom: 'Broche' }, { nom: 'Relie' },
  { nom: 'Grand format' }, { nom: 'Album' }, { nom: 'BD/Comics' }
];

// === COLLECTIONS LIVRES ===
const collectionsLivres = [
  { nom: 'Folio', editeur: 'Gallimard' },
  { nom: 'Pocket', editeur: 'Pocket' },
  { nom: 'J\'ai Lu', editeur: 'J\'ai Lu' },
  { nom: 'Le Livre de Poche', editeur: 'Hachette' }
];

// === EMPLACEMENTS LIVRES ===
const emplacementsLivres = [
  { code: 'LIV-A', libelle: 'Rayon A - Romans', site: 'BIBLIO_ANNEXE' },
  { code: 'LIV-B', libelle: 'Rayon B - SF/Fantasy', site: 'BIBLIO_ANNEXE' },
  { code: 'LIV-C', libelle: 'Rayon C - Jeunesse', site: 'BIBLIO_ANNEXE' },
  { code: 'LIV-D', libelle: 'Rayon D - Documentaires', site: 'BIBLIO_ANNEXE' }
];

// === GENRES FILMS ===
const genresFilms = [
  { nom: 'Science-Fiction' }, { nom: 'Fantasy' }, { nom: 'Action' },
  { nom: 'Drame' }, { nom: 'Thriller' }, { nom: 'Comedie' },
  { nom: 'Horreur' }, { nom: 'Aventure' }, { nom: 'Animation' },
  { nom: 'Documentaire' }, { nom: 'Romance' }, { nom: 'Guerre' }
];

// === SUPPORTS VIDEO ===
const supportsVideo = [
  { nom: 'DVD' }, { nom: 'Blu-ray' }, { nom: 'Blu-ray 4K' }, { nom: 'VHS' }
];

// === REALISATEURS ===
const realisateurs = [
  { nom: 'Jackson', prenom: 'Peter', nationalite: 'Neo-Zelandais' },
  { nom: 'Nolan', prenom: 'Christopher', nationalite: 'Britannique' },
  { nom: 'Spielberg', prenom: 'Steven', nationalite: 'Americain' },
  { nom: 'Villeneuve', prenom: 'Denis', nationalite: 'Canadien' },
  { nom: 'Kubrick', prenom: 'Stanley', nationalite: 'Americain' },
  { nom: 'Scott', prenom: 'Ridley', nationalite: 'Britannique' },
  { nom: 'Cameron', prenom: 'James', nationalite: 'Canadien' },
  { nom: 'Tarantino', prenom: 'Quentin', nationalite: 'Americain' }
];

// === ACTEURS ===
const acteurs = [
  { nom: 'DiCaprio', prenom: 'Leonardo' }, { nom: 'Hanks', prenom: 'Tom' },
  { nom: 'Pitt', prenom: 'Brad' }, { nom: 'Freeman', prenom: 'Morgan' },
  { nom: 'Portman', prenom: 'Natalie' }, { nom: 'Weaver', prenom: 'Sigourney' },
  { nom: 'Wood', prenom: 'Elijah' }, { nom: 'McKellen', prenom: 'Ian' },
  { nom: 'Blanchett', prenom: 'Cate' }, { nom: 'Chalamet', prenom: 'Timothee' }
];

// === STUDIOS ===
const studios = [
  { nom: 'Warner Bros.' }, { nom: 'Universal Pictures' }, { nom: 'Paramount Pictures' },
  { nom: '20th Century Studios' }, { nom: 'New Line Cinema' }, { nom: 'Legendary Pictures' },
  { nom: 'Columbia Pictures' }, { nom: 'Walt Disney Pictures' }
];

// === EMPLACEMENTS FILMS ===
const emplacementsFilms = [
  { code: 'FLM-A', libelle: 'Rayon Films A', site: 'BIBLIO_ANNEXE' },
  { code: 'FLM-B', libelle: 'Rayon Films B', site: 'BIBLIO_ANNEXE' }
];

// === GENRES MUSICAUX ===
const genresMusicaux = [
  { nom: 'Rock' }, { nom: 'Pop' }, { nom: 'Electro' }, { nom: 'Jazz' },
  { nom: 'Classique' }, { nom: 'Metal' }, { nom: 'Hip-Hop' }, { nom: 'Blues' },
  { nom: 'Progressive Rock' }, { nom: 'Grunge' }, { nom: 'Funk' }, { nom: 'Soul' }
];

// === FORMATS DISQUES ===
const formatsDisques = [
  { nom: 'CD' }, { nom: 'Vinyle 33T' }, { nom: 'Vinyle 45T' }, { nom: 'Cassette' }, { nom: 'DVD Audio' }
];

// === LABELS DISQUES ===
const labelsDisques = [
  { nom: 'EMI' }, { nom: 'Columbia Records' }, { nom: 'Virgin Records' },
  { nom: 'Parlophone' }, { nom: 'Decca' }, { nom: 'Atlantic Records' },
  { nom: 'Universal Music' }, { nom: 'Sony Music' }
];

// === ARTISTES ===
const artistes = [
  { nom: 'Pink Floyd', type: 'groupe', pays: 'Royaume-Uni' },
  { nom: 'Daft Punk', type: 'groupe', pays: 'France' },
  { nom: 'Queen', type: 'groupe', pays: 'Royaume-Uni' },
  { nom: 'The Beatles', type: 'groupe', pays: 'Royaume-Uni' },
  { nom: 'David Bowie', type: 'solo', pays: 'Royaume-Uni' },
  { nom: 'Michael Jackson', type: 'solo', pays: 'Etats-Unis' },
  { nom: 'Nirvana', type: 'groupe', pays: 'Etats-Unis' },
  { nom: 'Radiohead', type: 'groupe', pays: 'Royaume-Uni' },
  { nom: 'Stromae', type: 'solo', pays: 'Belgique' },
  { nom: 'Justice', type: 'groupe', pays: 'France' }
];

// === EMPLACEMENTS DISQUES ===
const emplacementsDisques = [
  { libelle: 'Bac Vinyles', description: 'Rangement vinyles 33T et 45T' },
  { libelle: 'Bac CD', description: 'Rangement CD et DVD audio' }
];

// === ADHERENTS ===
const adherents = [
  { nom: 'Admin', prenom: 'Super', email: 'admin@liberteko.local', telephone: '0600000000', statut: 'actif', role: 'administrateur', password: 'admin123', adhesion_association: true },
  { nom: 'Gestionnaire', prenom: 'Marie', email: 'gestionnaire@liberteko.local', telephone: '0600000001', statut: 'actif', role: 'gestionnaire', password: 'gestion123', adhesion_association: true },
  { nom: 'Comptable', prenom: 'Jean', email: 'comptable@liberteko.local', telephone: '0600000002', statut: 'actif', role: 'comptable', password: 'compta123', adhesion_association: true },
  { nom: 'Benevole', prenom: 'Pierre', email: 'benevole@liberteko.local', telephone: '0600000003', statut: 'actif', role: 'benevole', password: 'benev123', adhesion_association: true },
  { nom: 'Dupont', prenom: 'Alice', email: 'alice.dupont@email.com', telephone: '0611111111', ville: 'Paris', code_postal: '75001', statut: 'actif', role: 'usager', password: 'usager123', adhesion_association: false },
  { nom: 'Martin', prenom: 'Lucas', email: 'lucas.martin@email.com', telephone: '0622222222', ville: 'Lyon', code_postal: '69001', statut: 'actif', role: 'usager', password: 'usager123', adhesion_association: false },
  { nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@email.com', telephone: '0633333333', ville: 'Marseille', code_postal: '13001', statut: 'actif', role: 'usager', password: 'usager123', adhesion_association: true },
  { nom: 'Petit', prenom: 'Thomas', email: 'thomas.petit@email.com', telephone: '0644444444', ville: 'Bordeaux', code_postal: '33000', statut: 'inactif', role: 'usager', password: 'usager123', adhesion_association: false },
  { nom: 'Robert', prenom: 'Emma', email: 'emma.robert@email.com', telephone: '0655555555', ville: 'Nantes', code_postal: '44000', statut: 'suspendu', role: 'usager', password: 'usager123', adhesion_association: false }
];

// === JEUX ===
const jeux = [
  { titre: 'Les Aventuriers du Rail Europe', type_jeu: 'basegame', annee_sortie: 2005, age_min: 8, nb_joueurs_min: 2, nb_joueurs_max: 5, duree_partie: 60, statut: 'disponible', etat: 'tres_bon', categories: 'Jeu de plateau,Jeu de strategie', themes: 'Historique', mecanismes: 'Gestion de ressources' },
  { titre: 'Catan', type_jeu: 'basegame', annee_sortie: 1995, age_min: 10, nb_joueurs_min: 3, nb_joueurs_max: 4, duree_partie: 90, statut: 'disponible', etat: 'bon', categories: 'Jeu de plateau,Jeu de strategie', themes: 'Medieval', mecanismes: 'Negociation,Gestion de ressources' },
  { titre: 'Pandemic', type_jeu: 'basegame', annee_sortie: 2008, age_min: 8, nb_joueurs_min: 2, nb_joueurs_max: 4, duree_partie: 45, statut: 'disponible', etat: 'neuf', categories: 'Jeu cooperatif,Jeu de strategie', themes: 'Moderne', mecanismes: 'Gestion de ressources' },
  { titre: '7 Wonders', type_jeu: 'basegame', annee_sortie: 2010, age_min: 10, nb_joueurs_min: 2, nb_joueurs_max: 7, duree_partie: 30, statut: 'emprunte', etat: 'tres_bon', categories: 'Jeu de cartes,Jeu de strategie', themes: 'Historique', mecanismes: 'Draft' },
  { titre: 'Dixit', type_jeu: 'basegame', annee_sortie: 2008, age_min: 8, nb_joueurs_min: 3, nb_joueurs_max: 6, duree_partie: 30, statut: 'disponible', etat: 'bon', categories: 'Jeu d\'ambiance,Jeu de cartes', themes: 'Abstrait', mecanismes: 'Bluff,Deduction' },
  { titre: 'Carcassonne', type_jeu: 'basegame', annee_sortie: 2000, age_min: 7, nb_joueurs_min: 2, nb_joueurs_max: 5, duree_partie: 45, statut: 'disponible', etat: 'acceptable', categories: 'Jeu de plateau', themes: 'Medieval', mecanismes: 'Majorite' },
  { titre: 'Terraforming Mars', type_jeu: 'basegame', annee_sortie: 2016, age_min: 12, nb_joueurs_min: 1, nb_joueurs_max: 5, duree_partie: 120, statut: 'maintenance', etat: 'bon', categories: 'Jeu expert,Jeu de strategie', themes: 'Science-Fiction,Espace', mecanismes: 'Gestion de ressources,Draft' },
  { titre: 'Codenames', type_jeu: 'basegame', annee_sortie: 2015, age_min: 10, nb_joueurs_min: 4, nb_joueurs_max: 8, duree_partie: 20, statut: 'disponible', etat: 'neuf', categories: 'Jeu d\'ambiance', themes: 'Abstrait', mecanismes: 'Deduction' },
  { titre: 'Azul', type_jeu: 'basegame', annee_sortie: 2017, age_min: 8, nb_joueurs_min: 2, nb_joueurs_max: 4, duree_partie: 45, statut: 'perdu', etat: 'mauvais', categories: 'Jeu de strategie', themes: 'Abstrait', mecanismes: 'Draft' },
  { titre: 'Catan - Marins', type_jeu: 'extension', annee_sortie: 1997, age_min: 10, nb_joueurs_min: 3, nb_joueurs_max: 4, duree_partie: 90, statut: 'disponible', etat: 'bon', categories: 'Jeu de plateau,Jeu de strategie', themes: 'Medieval,Pirates', mecanismes: 'Negociation' }
];

// === LIVRES ===
const livres = [
  { titre: 'Le Seigneur des Anneaux - La Communaute de l\'Anneau', isbn: '9782070612888', annee_publication: 1954, nb_pages: 544, resume: 'Un jeune Hobbit entreprend un perilleux voyage.', auteur: 'Tolkien', genre: 'Fantasy' },
  { titre: 'Dune', isbn: '9782266320481', annee_publication: 1965, nb_pages: 928, resume: 'Sur Arrakis, planete des sables.', auteur: 'Herbert', genre: 'Science-Fiction' },
  { titre: '1984', isbn: '9782070368228', annee_publication: 1949, nb_pages: 438, resume: 'Dans un monde totalitaire.', auteur: 'Orwell', genre: 'Dystopie' },
  { titre: 'Le Petit Prince', isbn: '9782070612758', annee_publication: 1943, nb_pages: 120, resume: 'Un aviateur rencontre un petit prince.', auteur: 'Saint-Exupery', genre: 'Jeunesse' },
  { titre: 'Fondation', isbn: '9782070360536', annee_publication: 1951, nb_pages: 416, resume: 'La psychohistoire predit la chute de l\'Empire.', auteur: 'Asimov', genre: 'Science-Fiction' }
];

// === FILMS ===
const films = [
  { titre: 'Le Seigneur des Anneaux - La Communaute de l\'Anneau', annee_sortie: 2001, duree: 178, synopsis: 'Un jeune Hobbit doit detruire un anneau magique.', realisateur: 'Jackson', genre: 'Fantasy' },
  { titre: 'Inception', annee_sortie: 2010, duree: 148, synopsis: 'Un voleur specialise dans l\'extraction de secrets via les reves.', realisateur: 'Nolan', genre: 'Science-Fiction' },
  { titre: 'Interstellar', annee_sortie: 2014, duree: 169, synopsis: 'Des explorateurs voyagent a travers un trou de ver.', realisateur: 'Nolan', genre: 'Science-Fiction' },
  { titre: 'Dune', annee_sortie: 2021, duree: 155, synopsis: 'Paul Atreides sur la dangereuse planete Arrakis.', realisateur: 'Villeneuve', genre: 'Science-Fiction' },
  { titre: 'Blade Runner', annee_sortie: 1982, duree: 117, synopsis: 'Un chasseur de primes traque des replicants.', realisateur: 'Scott', genre: 'Science-Fiction' }
];

// === DISQUES ===
const disques = [
  { titre: 'The Dark Side of the Moon', annee_sortie: 1973, format: 'Vinyle 33T', artiste: 'Pink Floyd', genre: 'Progressive Rock', label: 'EMI' },
  { titre: 'Random Access Memories', annee_sortie: 2013, format: 'CD', artiste: 'Daft Punk', genre: 'Electro', label: 'Columbia Records' },
  { titre: 'A Night at the Opera', annee_sortie: 1975, format: 'Vinyle 33T', artiste: 'Queen', genre: 'Rock', label: 'EMI' },
  { titre: 'Abbey Road', annee_sortie: 1969, format: 'Vinyle 33T', artiste: 'The Beatles', genre: 'Rock', label: 'Parlophone' },
  { titre: 'Thriller', annee_sortie: 1982, format: 'CD', artiste: 'Michael Jackson', genre: 'Pop', label: 'Columbia Records' }
];

// === EVENT TRIGGERS ===
const eventTriggers = [
  { code: 'ADHERENT_CREATED', libelle: 'Creation de compte adherent', categorie: 'adherent', email_actif: true, sms_actif: false, icone: 'bi-person-plus', couleur: 'success', ordre_affichage: 10 },
  { code: 'ADHERENT_UPDATED', libelle: 'Modification de compte adherent', categorie: 'adherent', email_actif: false, sms_actif: false, icone: 'bi-person-check', couleur: 'info', ordre_affichage: 20 },
  { code: 'ADHERENT_SUSPENDED', libelle: 'Suspension de compte adherent', categorie: 'adherent', email_actif: false, sms_actif: false, icone: 'bi-person-x', couleur: 'warning', ordre_affichage: 30 },
  { code: 'EMPRUNT_CREATED', libelle: 'Creation d\'emprunt', categorie: 'emprunt', email_actif: true, sms_actif: false, icone: 'bi-box-arrow-right', couleur: 'primary', ordre_affichage: 40 },
  { code: 'EMPRUNT_RETURNED', libelle: 'Retour d\'emprunt', categorie: 'emprunt', email_actif: false, sms_actif: false, icone: 'bi-box-arrow-left', couleur: 'success', ordre_affichage: 50 },
  { code: 'EMPRUNT_RAPPEL_J3', libelle: 'Rappel J-3 avant echeance', categorie: 'emprunt', email_actif: true, sms_actif: false, icone: 'bi-calendar-event', couleur: 'info', ordre_affichage: 60 },
  { code: 'EMPRUNT_RETARD', libelle: 'Relance pour retard', categorie: 'emprunt', email_actif: true, sms_actif: false, icone: 'bi-exclamation-triangle', couleur: 'danger', ordre_affichage: 80 },
  { code: 'COTISATION_CREATED', libelle: 'Creation de cotisation', categorie: 'cotisation', email_actif: true, sms_actif: false, icone: 'bi-credit-card', couleur: 'success', ordre_affichage: 90 },
  { code: 'COTISATION_EXPIRATION', libelle: 'Rappel expiration cotisation', categorie: 'cotisation', email_actif: true, sms_actif: false, icone: 'bi-calendar-x', couleur: 'warning', ordre_affichage: 100 }
];

// === TEMPLATES MESSAGES ===
const templatesMessages = [
  { code: 'BIENVENUE', libelle: 'Email de bienvenue', type_message: 'both', categorie: 'Adherent', email_objet: 'Bienvenue {{prenom}} !', email_corps: '<h1>Bienvenue {{prenom}} {{nom}} !</h1><p>Votre numero adherent: {{code_barre}}</p>', sms_corps: 'Bienvenue {{prenom}} ! Votre numero: {{code_barre}}', icone: 'bi-envelope-heart', couleur: 'success', ordre_affichage: 1 },
  { code: 'RAPPEL_ADHESION', libelle: 'Rappel renouvellement', type_message: 'both', categorie: 'Adherent', email_objet: 'Votre adhesion expire bientot', email_corps: '<p>Bonjour {{prenom}}, votre adhesion expire le {{date_fin_adhesion}}.</p>', sms_corps: 'Votre adhesion expire le {{date_fin_adhesion}}.', icone: 'bi-bell', couleur: 'warning', ordre_affichage: 2 },
  { code: 'CONFIRMATION_COTISATION', libelle: 'Confirmation cotisation', type_message: 'email', categorie: 'Cotisation', email_objet: 'Confirmation de votre cotisation', email_corps: '<p>Cotisation de {{montant_paye}}EUR enregistree.</p>', sms_corps: null, icone: 'bi-check-circle', couleur: 'success', ordre_affichage: 3 },
  { code: 'EMPRUNT_RETOUR', libelle: 'Rappel retour emprunt', type_message: 'both', categorie: 'Emprunt', email_objet: 'Rappel retour {{jeu_titre}}', email_corps: '<p>Le jeu {{jeu_titre}} est a retourner le {{date_retour_prevue}}.</p>', sms_corps: 'Rappel: retour {{jeu_titre}} le {{date_retour_prevue}}.', icone: 'bi-arrow-return-left', couleur: 'info', ordre_affichage: 4 },
  { code: 'EMPRUNT_RETARD', libelle: 'Notification retard', type_message: 'both', categorie: 'Emprunt', email_objet: 'URGENT: Retard {{jeu_titre}}', email_corps: '<p style="color:red">Le jeu {{jeu_titre}} a {{jours_retard}} jours de retard.</p>', sms_corps: 'URGENT: {{jeu_titre}} a {{jours_retard}} jours de retard.', icone: 'bi-exclamation-triangle', couleur: 'danger', ordre_affichage: 5 }
];

// === PARAMETRES FRONT ===
const parametresFront = {
  nom_site: 'Ludotheque Demo',
  meta_description: 'Ludotheque associative - Pret de jeux de societe, livres, films et disques',
  mode_fonctionnement: 'complet',
  module_ludotheque: true,
  module_bibliotheque: true,
  module_filmotheque: true,
  module_discotheque: true,
  module_inscriptions: true,
  module_reservations: false,
  email_contact: 'contact@liberteko.local',
  telephone_contact: '01 23 45 67 89',
  couleur_primaire: '#0d6efd',
  couleur_secondaire: '#6c757d',
  mode_maintenance: false,
  prolongation_jours_ludotheque: 14,
  prolongation_auto_max_ludotheque: 2,
  prolongation_manuelle_ludotheque: true,
  prolongation_jours_bibliotheque: 21,
  prolongation_auto_max_bibliotheque: 1,
  prolongation_manuelle_bibliotheque: true,
  prolongation_jours_filmotheque: 7,
  prolongation_auto_max_filmotheque: 1,
  prolongation_manuelle_filmotheque: false,
  prolongation_jours_discotheque: 7,
  prolongation_auto_max_discotheque: 1,
  prolongation_manuelle_discotheque: false
};

// ========================================
// FONCTIONS DE SEED
// ========================================

async function insertIgnore(table, columns, values) {
  const placeholders = values.map(() => '?').join(', ');
  const cols = columns.join(', ');
  await sequelize.query(
    `INSERT IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`,
    { replacements: values }
  );
}

async function getOrCreateId(table, column, value) {
  const [rows] = await sequelize.query(
    `SELECT id FROM ${table} WHERE ${column} = ?`,
    { replacements: [value] }
  );
  return rows.length > 0 ? rows[0].id : null;
}

async function seedAll() {
  try {
    await sequelize.authenticate();
    console.log('\n========================================');
    console.log('  SEED COMPLET - LUDOTHEQUE');
    console.log('========================================\n');

    if (forceMode) {
      console.log('Mode FORCE active - les donnees seront reinitialises\n');
    }

    // === COMPTES BANCAIRES ===
    console.log('>>> Comptes bancaires...');
    for (const cb of comptesBancaires) {
      await insertIgnore('comptes_bancaires', ['libelle', 'banque', 'iban', 'bic', 'titulaire', 'actif', 'par_defaut'], [cb.libelle, cb.banque, cb.iban, cb.bic, cb.titulaire, cb.actif, cb.par_defaut]);
    }
    console.log(`    ${comptesBancaires.length} comptes bancaires`);

    // === SITES ===
    console.log('>>> Sites...');
    for (const site of sites) {
      await insertIgnore('sites', ['code', 'nom', 'type', 'description', 'adresse', 'code_postal', 'ville', 'pays', 'telephone', 'email', 'couleur', 'icone', 'ordre_affichage', 'actif', 'created_at', 'updated_at'],
        [site.code, site.nom, site.type, site.description, site.adresse, site.code_postal, site.ville, site.pays, site.telephone, site.email, site.couleur, site.icone, site.ordre_affichage, site.actif, new Date(), new Date()]);
    }
    console.log(`    ${sites.length} sites`);

    // === MODES DE PAIEMENT ===
    console.log('>>> Modes de paiement...');
    const [existingModes] = await sequelize.query('SELECT COUNT(*) as count FROM modes_paiement');
    if (existingModes[0].count === 0 || forceMode) {
      if (forceMode) await sequelize.query('DELETE FROM modes_paiement');
      for (const mode of modesPaiement) {
        await insertIgnore('modes_paiement', ['libelle', 'actif', 'ordre_affichage', 'journal_comptable', 'type_operation', 'code_comptable', 'icone', 'couleur'],
          [mode.libelle, mode.actif, mode.ordre_affichage, mode.journal_comptable, mode.type_operation, mode.code_comptable, mode.icone, mode.couleur]);
      }
      console.log(`    ${modesPaiement.length} modes de paiement`);
    } else {
      console.log('    (deja presents)');
    }

    // === TARIFS COTISATION ===
    console.log('>>> Tarifs cotisation...');
    for (const tarif of tarifsCotisation) {
      await insertIgnore('tarifs_cotisation', ['libelle', 'description', 'type_periode', 'type_montant', 'montant_base', 'reduction_association_type', 'reduction_association_valeur', 'actif', 'ordre_affichage', 'par_defaut', 'created_at', 'updated_at'],
        [tarif.libelle, tarif.description, tarif.type_periode, tarif.type_montant, tarif.montant_base, tarif.reduction_association_type || 'pourcentage', tarif.reduction_association_valeur || 0, tarif.actif, tarif.ordre_affichage, tarif.par_defaut, new Date(), new Date()]);
    }
    console.log(`    ${tarifsCotisation.length} tarifs`);

    // === CODES REDUCTION ===
    console.log('>>> Codes reduction...');
    for (const code of codesReduction) {
      await insertIgnore('codes_reduction', ['code', 'libelle', 'description', 'type_reduction', 'valeur', 'actif', 'icone', 'couleur', 'ordre_affichage'],
        [code.code, code.libelle, code.description, code.type_reduction, code.valeur, code.actif, code.icone, code.couleur, code.ordre_affichage]);
    }
    console.log(`    ${codesReduction.length} codes`);

    // === CATEGORIES ===
    console.log('>>> Categories jeux...');
    for (const cat of categories) {
      await insertIgnore('categories', ['nom', 'description', 'actif'], [cat.nom, cat.description, true]);
    }
    console.log(`    ${categories.length} categories`);

    // === THEMES ===
    console.log('>>> Themes...');
    for (const theme of themes) {
      await insertIgnore('themes', ['nom', 'actif'], [theme.nom, true]);
    }
    console.log(`    ${themes.length} themes`);

    // === MECANISMES ===
    console.log('>>> Mecanismes...');
    for (const meca of mecanismes) {
      await insertIgnore('mecanismes', ['nom', 'actif'], [meca.nom, true]);
    }
    console.log(`    ${mecanismes.length} mecanismes`);

    // === LANGUES ===
    console.log('>>> Langues...');
    for (const langue of langues) {
      await insertIgnore('langues', ['code', 'nom', 'actif'], [langue.code, langue.nom, true]);
    }
    console.log(`    ${langues.length} langues`);

    // === EDITEURS ===
    console.log('>>> Editeurs...');
    for (const ed of editeurs) {
      await insertIgnore('editeurs', ['nom', 'pays', 'site_web', 'actif'], [ed.nom, ed.pays, ed.site_web, true]);
    }
    console.log(`    ${editeurs.length} editeurs`);

    // === AUTEURS ===
    console.log('>>> Auteurs...');
    for (const aut of auteurs) {
      await insertIgnore('auteurs', ['nom', 'prenom', 'nationalite', 'actif'], [aut.nom, aut.prenom, aut.nationalite, true]);
    }
    // Ajouter les auteurs de livres
    const auteursLivres = [
      { nom: 'Tolkien', prenom: 'J.R.R.', nationalite: 'Britannique' },
      { nom: 'Herbert', prenom: 'Frank', nationalite: 'Americain' },
      { nom: 'Orwell', prenom: 'George', nationalite: 'Britannique' },
      { nom: 'Saint-Exupery', prenom: 'Antoine de', nationalite: 'Francais' },
      { nom: 'Asimov', prenom: 'Isaac', nationalite: 'Americain' }
    ];
    for (const aut of auteursLivres) {
      await insertIgnore('auteurs', ['nom', 'prenom', 'nationalite', 'actif'], [aut.nom, aut.prenom, aut.nationalite, true]);
    }
    console.log(`    ${auteurs.length + auteursLivres.length} auteurs`);

    // === ILLUSTRATEURS ===
    console.log('>>> Illustrateurs...');
    for (const ill of illustrateurs) {
      await insertIgnore('illustrateurs', ['nom', 'prenom', 'actif'], [ill.nom, ill.prenom, true]);
    }
    console.log(`    ${illustrateurs.length} illustrateurs`);

    // === GAMMES ===
    console.log('>>> Gammes...');
    for (const gamme of gammes) {
      const editeurId = await getOrCreateId('editeurs', 'nom', gamme.editeur);
      await insertIgnore('gammes', ['nom', 'editeur_id', 'actif'], [gamme.nom, editeurId, true]);
    }
    console.log(`    ${gammes.length} gammes`);

    // === EMPLACEMENTS JEUX ===
    console.log('>>> Emplacements jeux...');
    for (const emp of emplacementsJeux) {
      const siteId = await getOrCreateId('sites', 'code', emp.site);
      await insertIgnore('emplacements_jeux', ['code', 'libelle', 'description', 'site_id', 'actif'], [emp.code, emp.libelle, emp.description, siteId, true]);
    }
    console.log(`    ${emplacementsJeux.length} emplacements`);

    // === GENRES LITTERAIRES ===
    console.log('>>> Genres litteraires...');
    for (const genre of genresLitteraires) {
      await insertIgnore('genres_litteraires', ['nom', 'icone', 'actif'], [genre.nom, genre.icone, true]);
    }
    console.log(`    ${genresLitteraires.length} genres`);

    // === FORMATS LIVRES ===
    console.log('>>> Formats livres...');
    for (const format of formatsLivres) {
      await insertIgnore('formats_livres', ['nom', 'actif'], [format.nom, true]);
    }
    console.log(`    ${formatsLivres.length} formats`);

    // === COLLECTIONS LIVRES ===
    console.log('>>> Collections livres...');
    for (const col of collectionsLivres) {
      const editeurId = await getOrCreateId('editeurs', 'nom', col.editeur);
      await insertIgnore('collections_livres', ['nom', 'editeur_id', 'actif'], [col.nom, editeurId, true]);
    }
    console.log(`    ${collectionsLivres.length} collections`);

    // === EMPLACEMENTS LIVRES ===
    console.log('>>> Emplacements livres...');
    for (const emp of emplacementsLivres) {
      const siteId = await getOrCreateId('sites', 'code', emp.site);
      await insertIgnore('emplacements_livres', ['code', 'libelle', 'site_id', 'actif'], [emp.code, emp.libelle, siteId, true]);
    }
    console.log(`    ${emplacementsLivres.length} emplacements`);

    // === GENRES FILMS ===
    console.log('>>> Genres films...');
    for (const genre of genresFilms) {
      await insertIgnore('genres_films', ['nom', 'actif'], [genre.nom, true]);
    }
    console.log(`    ${genresFilms.length} genres`);

    // === SUPPORTS VIDEO ===
    console.log('>>> Supports video...');
    for (const support of supportsVideo) {
      await insertIgnore('supports_video', ['nom', 'actif'], [support.nom, true]);
    }
    console.log(`    ${supportsVideo.length} supports`);

    // === REALISATEURS ===
    console.log('>>> Realisateurs...');
    for (const real of realisateurs) {
      await insertIgnore('realisateurs', ['nom', 'prenom', 'nationalite', 'actif'], [real.nom, real.prenom, real.nationalite, true]);
    }
    console.log(`    ${realisateurs.length} realisateurs`);

    // === ACTEURS ===
    console.log('>>> Acteurs...');
    for (const acteur of acteurs) {
      await insertIgnore('acteurs', ['nom', 'prenom', 'actif'], [acteur.nom, acteur.prenom, true]);
    }
    console.log(`    ${acteurs.length} acteurs`);

    // === STUDIOS ===
    console.log('>>> Studios...');
    for (const studio of studios) {
      await insertIgnore('studios', ['nom', 'actif'], [studio.nom, true]);
    }
    console.log(`    ${studios.length} studios`);

    // === EMPLACEMENTS FILMS ===
    console.log('>>> Emplacements films...');
    for (const emp of emplacementsFilms) {
      const siteId = await getOrCreateId('sites', 'code', emp.site);
      await insertIgnore('emplacements_films', ['code', 'libelle', 'site_id', 'actif'], [emp.code, emp.libelle, siteId, true]);
    }
    console.log(`    ${emplacementsFilms.length} emplacements`);

    // === GENRES MUSICAUX ===
    console.log('>>> Genres musicaux...');
    for (const genre of genresMusicaux) {
      await insertIgnore('genres_musicaux', ['nom', 'actif'], [genre.nom, true]);
    }
    console.log(`    ${genresMusicaux.length} genres`);

    // === FORMATS DISQUES ===
    console.log('>>> Formats disques...');
    for (const format of formatsDisques) {
      await insertIgnore('formats_disques', ['nom', 'actif'], [format.nom, true]);
    }
    console.log(`    ${formatsDisques.length} formats`);

    // === LABELS DISQUES ===
    console.log('>>> Labels disques...');
    for (const label of labelsDisques) {
      await insertIgnore('labels_disques', ['nom', 'actif'], [label.nom, true]);
    }
    console.log(`    ${labelsDisques.length} labels`);

    // === ARTISTES ===
    console.log('>>> Artistes...');
    for (const artiste of artistes) {
      await insertIgnore('artistes', ['nom', 'type', 'pays', 'actif', 'created_at', 'updated_at'], [artiste.nom, artiste.type, artiste.pays, true, new Date(), new Date()]);
    }
    console.log(`    ${artistes.length} artistes`);

    // === EMPLACEMENTS DISQUES ===
    console.log('>>> Emplacements disques...');
    for (const emp of emplacementsDisques) {
      await insertIgnore('emplacements_disques', ['libelle', 'description', 'actif'], [emp.libelle, emp.description, true]);
    }
    console.log(`    ${emplacementsDisques.length} emplacements`);

    // === EVENT TRIGGERS ===
    console.log('>>> Event triggers...');
    for (const trigger of eventTriggers) {
      await insertIgnore('event_triggers', ['code', 'libelle', 'categorie', 'email_actif', 'sms_actif', 'icone', 'couleur', 'ordre_affichage', 'created_at', 'updated_at'],
        [trigger.code, trigger.libelle, trigger.categorie, trigger.email_actif, trigger.sms_actif, trigger.icone, trigger.couleur, trigger.ordre_affichage, new Date(), new Date()]);
    }
    console.log(`    ${eventTriggers.length} triggers`);

    // === TEMPLATES MESSAGES ===
    console.log('>>> Templates messages...');
    for (const tpl of templatesMessages) {
      await insertIgnore('templates_messages', ['code', 'libelle', 'type_message', 'categorie', 'email_objet', 'email_corps', 'sms_corps', 'icone', 'couleur', 'ordre_affichage', 'actif', 'created_at', 'updated_at'],
        [tpl.code, tpl.libelle, tpl.type_message, tpl.categorie, tpl.email_objet, tpl.email_corps, tpl.sms_corps, tpl.icone, tpl.couleur, tpl.ordre_affichage, true, new Date(), new Date()]);
    }
    console.log(`    ${templatesMessages.length} templates`);

    // === PARAMETRES FRONT ===
    console.log('>>> Parametres front...');
    const [existingParams] = await sequelize.query('SELECT COUNT(*) as count FROM parametres_front');
    if (existingParams[0].count === 0) {
      const cols = Object.keys(parametresFront);
      const vals = Object.values(parametresFront);
      cols.push('created_at', 'updated_at');
      vals.push(new Date(), new Date());
      await sequelize.query(
        `INSERT INTO parametres_front (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        { replacements: vals }
      );
      console.log('    Parametres crees');
    } else {
      console.log('    (deja presents)');
    }

    // === ADHERENTS ===
    console.log('>>> Adherents...');
    const bcrypt = require('bcrypt');
    for (const adh of adherents) {
      const [existing] = await sequelize.query('SELECT id FROM adherents WHERE email = ?', { replacements: [adh.email] });
      if (existing.length === 0) {
        const hashedPassword = await bcrypt.hash(adh.password, 10);
        await sequelize.query(
          `INSERT INTO adherents (nom, prenom, email, telephone, ville, code_postal, statut, role, password, adhesion_association, date_adhesion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          { replacements: [adh.nom, adh.prenom, adh.email, adh.telephone, adh.ville || null, adh.code_postal || null, adh.statut, adh.role, hashedPassword, adh.adhesion_association] }
        );
        // Generer code-barre
        const [inserted] = await sequelize.query('SELECT id FROM adherents WHERE email = ?', { replacements: [adh.email] });
        const codeBarre = `ADH${String(inserted[0].id).padStart(8, '0')}`;
        await sequelize.query('UPDATE adherents SET code_barre = ? WHERE id = ?', { replacements: [codeBarre, inserted[0].id] });
      }
    }
    console.log(`    ${adherents.length} adherents`);

    // === JEUX ===
    console.log('>>> Jeux...');
    for (const jeu of jeux) {
      const [existing] = await sequelize.query('SELECT id FROM jeux WHERE titre = ?', { replacements: [jeu.titre] });
      if (existing.length === 0) {
        await sequelize.query(
          `INSERT INTO jeux (titre, type_jeu, annee_sortie, age_min, nb_joueurs_min, nb_joueurs_max, duree_partie, statut, etat, categories, themes, mecanismes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          { replacements: [jeu.titre, jeu.type_jeu, jeu.annee_sortie, jeu.age_min, jeu.nb_joueurs_min, jeu.nb_joueurs_max, jeu.duree_partie, jeu.statut, jeu.etat, jeu.categories, jeu.themes, jeu.mecanismes] }
        );
        const [inserted] = await sequelize.query('SELECT id FROM jeux WHERE titre = ?', { replacements: [jeu.titre] });
        const codeBarre = `JEU${String(inserted[0].id).padStart(8, '0')}`;
        await sequelize.query('UPDATE jeux SET code_barre = ? WHERE id = ?', { replacements: [codeBarre, inserted[0].id] });
      }
    }
    console.log(`    ${jeux.length} jeux`);

    // === LIVRES ===
    console.log('>>> Livres...');
    for (const livre of livres) {
      const [existing] = await sequelize.query('SELECT id FROM livres WHERE isbn = ?', { replacements: [livre.isbn] });
      if (existing.length === 0) {
        await sequelize.query(
          `INSERT INTO livres (titre, isbn, annee_publication, nb_pages, resume, statut, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'disponible', NOW(), NOW())`,
          { replacements: [livre.titre, livre.isbn, livre.annee_publication, livre.nb_pages, livre.resume] }
        );
        const [inserted] = await sequelize.query('SELECT id FROM livres WHERE isbn = ?', { replacements: [livre.isbn] });
        const livreId = inserted[0].id;
        const codeBarre = `LIV${String(livreId).padStart(8, '0')}`;
        await sequelize.query('UPDATE livres SET code_barre = ? WHERE id = ?', { replacements: [codeBarre, livreId] });

        // Associer auteur et genre
        const auteurId = await getOrCreateId('auteurs', 'nom', livre.auteur);
        if (auteurId) {
          await insertIgnore('livre_auteurs', ['livre_id', 'auteur_id'], [livreId, auteurId]);
        }
        const genreId = await getOrCreateId('genres_litteraires', 'nom', livre.genre);
        if (genreId) {
          await insertIgnore('livre_genres', ['livre_id', 'genre_id'], [livreId, genreId]);
        }
      }
    }
    console.log(`    ${livres.length} livres`);

    // === FILMS ===
    console.log('>>> Films...');
    for (const film of films) {
      const [existing] = await sequelize.query('SELECT id FROM films WHERE titre = ? AND annee_sortie = ?', { replacements: [film.titre, film.annee_sortie] });
      if (existing.length === 0) {
        await sequelize.query(
          `INSERT INTO films (titre, annee_sortie, duree, synopsis, statut, created_at, updated_at) VALUES (?, ?, ?, ?, 'disponible', NOW(), NOW())`,
          { replacements: [film.titre, film.annee_sortie, film.duree, film.synopsis] }
        );
        const [inserted] = await sequelize.query('SELECT id FROM films WHERE titre = ? AND annee_sortie = ?', { replacements: [film.titre, film.annee_sortie] });
        const filmId = inserted[0].id;
        const codeBarre = `FLM${String(filmId).padStart(8, '0')}`;
        await sequelize.query('UPDATE films SET code_barre = ? WHERE id = ?', { replacements: [codeBarre, filmId] });

        // Associer realisateur et genre
        const realId = await getOrCreateId('realisateurs', 'nom', film.realisateur);
        if (realId) {
          await insertIgnore('film_realisateurs', ['film_id', 'realisateur_id'], [filmId, realId]);
        }
        const genreId = await getOrCreateId('genres_films', 'nom', film.genre);
        if (genreId) {
          await insertIgnore('film_genres', ['film_id', 'genre_id'], [filmId, genreId]);
        }
      }
    }
    console.log(`    ${films.length} films`);

    // === DISQUES ===
    console.log('>>> Disques...');
    for (const disque of disques) {
      const [existing] = await sequelize.query('SELECT id FROM disques WHERE titre = ? AND annee_sortie = ?', { replacements: [disque.titre, disque.annee_sortie] });
      if (existing.length === 0) {
        const formatId = await getOrCreateId('formats_disques', 'nom', disque.format);
        const labelId = await getOrCreateId('labels_disques', 'nom', disque.label);
        await sequelize.query(
          `INSERT INTO disques (titre, annee_sortie, format_id, label_id, statut, created_at, updated_at) VALUES (?, ?, ?, ?, 'disponible', NOW(), NOW())`,
          { replacements: [disque.titre, disque.annee_sortie, formatId, labelId] }
        );
        const [inserted] = await sequelize.query('SELECT id FROM disques WHERE titre = ? AND annee_sortie = ?', { replacements: [disque.titre, disque.annee_sortie] });
        const disqueId = inserted[0].id;
        const codeBarre = `DSQ${String(disqueId).padStart(8, '0')}`;
        await sequelize.query('UPDATE disques SET code_barre = ? WHERE id = ?', { replacements: [codeBarre, disqueId] });

        // Associer artiste et genre
        const artisteId = await getOrCreateId('artistes', 'nom', disque.artiste);
        if (artisteId) {
          await insertIgnore('disque_artistes', ['disque_id', 'artiste_id'], [disqueId, artisteId]);
        }
        const genreId = await getOrCreateId('genres_musicaux', 'nom', disque.genre);
        if (genreId) {
          await insertIgnore('disque_genres', ['disque_id', 'genre_id'], [disqueId, genreId]);
        }
      }
    }
    console.log(`    ${disques.length} disques`);

    // === EMPRUNTS DE DEMONSTRATION ===
    console.log('>>> Emprunts de demonstration...');
    const [adherentsList] = await sequelize.query('SELECT id FROM adherents WHERE role = "usager" AND statut = "actif" LIMIT 3');
    const [jeuxList] = await sequelize.query('SELECT id FROM jeux WHERE statut = "disponible" LIMIT 3');

    if (adherentsList.length > 0 && jeuxList.length > 0) {
      const today = new Date();
      const dateEmprunt = new Date(today);
      dateEmprunt.setDate(dateEmprunt.getDate() - 7);
      const dateRetourPrevue = new Date(today);
      dateRetourPrevue.setDate(dateRetourPrevue.getDate() + 7);

      const [existingEmprunts] = await sequelize.query('SELECT COUNT(*) as count FROM emprunts');
      if (existingEmprunts[0].count === 0) {
        await sequelize.query(
          `INSERT INTO emprunts (adherent_id, jeu_id, date_emprunt, date_retour_prevue, statut) VALUES (?, ?, ?, ?, 'en_cours')`,
          { replacements: [adherentsList[0].id, jeuxList[0].id, dateEmprunt, dateRetourPrevue] }
        );
        console.log('    1 emprunt cree');
      } else {
        console.log('    (emprunts deja presents)');
      }
    }

    // === COTISATIONS DE DEMONSTRATION ===
    console.log('>>> Cotisations de demonstration...');
    const [existingCotisations] = await sequelize.query('SELECT COUNT(*) as count FROM cotisations');
    if (existingCotisations[0].count === 0 && adherentsList.length > 0) {
      const [tarifs] = await sequelize.query('SELECT id, montant_base FROM tarifs_cotisation WHERE par_defaut = 1 LIMIT 1');
      if (tarifs.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const periodeFin = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
        await sequelize.query(
          `INSERT INTO cotisations (adherent_id, tarif_cotisation_id, montant_base, montant_paye, periode_debut, periode_fin, date_paiement, mode_paiement, statut, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'especes', 'en_cours', NOW(), NOW())`,
          { replacements: [adherentsList[0].id, tarifs[0].id, tarifs[0].montant_base, tarifs[0].montant_base, today, periodeFin, today] }
        );
        console.log('    1 cotisation creee');
      }
    } else {
      console.log('    (cotisations deja presentes)');
    }

    console.log('\n========================================');
    console.log('  SEED TERMINE AVEC SUCCES !');
    console.log('========================================\n');

    // Resume
    const [counts] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM sites) as sites,
        (SELECT COUNT(*) FROM adherents) as adherents,
        (SELECT COUNT(*) FROM jeux) as jeux,
        (SELECT COUNT(*) FROM livres) as livres,
        (SELECT COUNT(*) FROM films) as films,
        (SELECT COUNT(*) FROM disques) as disques,
        (SELECT COUNT(*) FROM emprunts) as emprunts,
        (SELECT COUNT(*) FROM cotisations) as cotisations
    `);

    console.log('Resume des donnees:');
    console.log(`  - Sites: ${counts[0].sites}`);
    console.log(`  - Adherents: ${counts[0].adherents}`);
    console.log(`  - Jeux: ${counts[0].jeux}`);
    console.log(`  - Livres: ${counts[0].livres}`);
    console.log(`  - Films: ${counts[0].films}`);
    console.log(`  - Disques: ${counts[0].disques}`);
    console.log(`  - Emprunts: ${counts[0].emprunts}`);
    console.log(`  - Cotisations: ${counts[0].cotisations}`);

    console.log('\nComptes utilisateurs:');
    console.log('  - admin@liberteko.local / admin123 (administrateur)');
    console.log('  - gestionnaire@liberteko.local / gestion123 (gestionnaire)');
    console.log('  - comptable@liberteko.local / compta123 (comptable)');
    console.log('  - benevole@liberteko.local / benev123 (benevole)');
    console.log('  - alice.dupont@email.com / usager123 (usager)');
    console.log('');

  } catch (error) {
    console.error('Erreur lors du seed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Executer
seedAll();
