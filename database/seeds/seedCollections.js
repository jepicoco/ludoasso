/**
 * Seed de test pour les collections Livres, Films et Disques
 * Ajoute des donnees de demonstration
 *
 * Usage: node database/seeds/seedCollections.js
 */

require('dotenv').config();
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

async function seedCollections() {
  try {
    await sequelize.authenticate();
    console.log('Connexion a la base de donnees etablie.\n');

    // ========================================
    // LIVRES
    // ========================================
    console.log('=== LIVRES ===\n');

    // Auteurs (partages entre livres et jeux)
    const auteurs = [
      { nom: 'Tolkien', prenom: 'J.R.R.', nationalite: 'Britannique' },
      { nom: 'Rowling', prenom: 'J.K.', nationalite: 'Britannique' },
      { nom: 'Asimov', prenom: 'Isaac', nationalite: 'Americain' },
      { nom: 'Herbert', prenom: 'Frank', nationalite: 'Americain' },
      { nom: 'Orwell', prenom: 'George', nationalite: 'Britannique' },
      { nom: 'Huxley', prenom: 'Aldous', nationalite: 'Britannique' },
      { nom: 'Verne', prenom: 'Jules', nationalite: 'Francais' },
      { nom: 'Saint-Exupery', prenom: 'Antoine de', nationalite: 'Francais' }
    ];

    for (const auteur of auteurs) {
      await sequelize.query(
        `INSERT IGNORE INTO auteurs (nom, prenom, nationalite, actif)
         VALUES (?, ?, ?, 1)`,
        { replacements: [auteur.nom, auteur.prenom, auteur.nationalite] }
      );
    }
    console.log(`${auteurs.length} auteurs ajoutes`);

    // Genres litteraires
    const genresLitteraires = [
      { nom: 'Fantasy', icone: 'magic' },
      { nom: 'Science-Fiction', icone: 'rocket' },
      { nom: 'Roman', icone: 'book' },
      { nom: 'Dystopie', icone: 'exclamation-triangle' },
      { nom: 'Aventure', icone: 'compass' },
      { nom: 'Jeunesse', icone: 'emoji-smile' },
      { nom: 'Classique', icone: 'award' },
      { nom: 'Policier', icone: 'search' }
    ];

    for (const genre of genresLitteraires) {
      await sequelize.query(
        `INSERT IGNORE INTO genres_litteraires (nom, icone, actif)
         VALUES (?, ?, 1)`,
        { replacements: [genre.nom, genre.icone] }
      );
    }
    console.log(`${genresLitteraires.length} genres litteraires ajoutes`);

    // Editeurs (partages entre livres et jeux)
    const editeurs = [
      { nom: 'Gallimard', pays: 'France' },
      { nom: 'Folio', pays: 'France' },
      { nom: 'Pocket', pays: 'France' },
      { nom: 'Le Livre de Poche', pays: 'France' },
      { nom: 'J\'ai Lu', pays: 'France' },
      { nom: 'Bragelonne', pays: 'France' }
    ];

    for (const editeur of editeurs) {
      await sequelize.query(
        `INSERT IGNORE INTO editeurs (nom, pays, actif)
         VALUES (?, ?, 1)`,
        { replacements: [editeur.nom, editeur.pays] }
      );
    }
    console.log(`${editeurs.length} editeurs ajoutes`);

    // Livres
    const livres = [
      {
        titre: 'Le Seigneur des Anneaux - La Communaute de l\'Anneau',
        isbn: '9782070612888',
        annee: 1954,
        pages: 544,
        resume: 'Dans un paisible village du Comte, un jeune Hobbit est charge d\'une quete: un perilleux voyage a travers la Terre du Milieu.',
        auteur: 'Tolkien',
        genre: 'Fantasy',
        editeur: 'Folio'
      },
      {
        titre: 'Harry Potter a l\'ecole des sorciers',
        isbn: '9782070643028',
        annee: 1997,
        pages: 320,
        resume: 'Le jour de ses onze ans, Harry Potter decouvre qu\'il est sorcier et entre a Poudlard.',
        auteur: 'Rowling',
        genre: 'Fantasy',
        editeur: 'Gallimard'
      },
      {
        titre: 'Fondation',
        isbn: '9782070360536',
        annee: 1951,
        pages: 416,
        resume: 'Hari Seldon a mis au point la psychohistoire et predit la chute de l\'Empire Galactique.',
        auteur: 'Asimov',
        genre: 'Science-Fiction',
        editeur: 'Folio'
      },
      {
        titre: 'Dune',
        isbn: '9782266320481',
        annee: 1965,
        pages: 928,
        resume: 'Sur Arrakis, planete des sables, s\'affrontent les Atreides et les Harkonnen pour le controle de l\'Epice.',
        auteur: 'Herbert',
        genre: 'Science-Fiction',
        editeur: 'Pocket'
      },
      {
        titre: '1984',
        isbn: '9782070368228',
        annee: 1949,
        pages: 438,
        resume: 'Dans un monde totalitaire, Winston Smith tente de resister a Big Brother.',
        auteur: 'Orwell',
        genre: 'Dystopie',
        editeur: 'Folio'
      },
      {
        titre: 'Le Meilleur des mondes',
        isbn: '9782266283038',
        annee: 1932,
        pages: 320,
        resume: 'Une societe future ou le bonheur est obligatoire et la liberte n\'existe plus.',
        auteur: 'Huxley',
        genre: 'Dystopie',
        editeur: 'Pocket'
      },
      {
        titre: 'Vingt mille lieues sous les mers',
        isbn: '9782070412587',
        annee: 1870,
        pages: 512,
        resume: 'Le professeur Aronnax embarque a bord du Nautilus, le sous-marin du capitaine Nemo.',
        auteur: 'Verne',
        genre: 'Aventure',
        editeur: 'Folio'
      },
      {
        titre: 'Le Petit Prince',
        isbn: '9782070612758',
        annee: 1943,
        pages: 120,
        resume: 'Un aviateur rencontre un petit prince venu d\'une autre planete.',
        auteur: 'Saint-Exupery',
        genre: 'Jeunesse',
        editeur: 'Gallimard'
      }
    ];

    let livreCount = 0;
    for (const livre of livres) {
      // Verifier si le livre existe deja
      const [existing] = await sequelize.query(
        `SELECT id FROM livres WHERE isbn = ?`,
        { replacements: [livre.isbn] }
      );

      if (existing.length === 0) {
        // Generer code-barre
        const [maxId] = await sequelize.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM livres`);
        const nextId = maxId[0].next_id;
        const codeBarre = `LIV${String(nextId).padStart(8, '0')}`;

        // Inserer le livre
        await sequelize.query(
          `INSERT INTO livres (code_barre, titre, isbn, annee_publication, nb_pages, resume, statut, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'disponible', NOW(), NOW())`,
          { replacements: [codeBarre, livre.titre, livre.isbn, livre.annee, livre.pages, livre.resume] }
        );

        // Recuperer l'ID du livre
        const [livreInserted] = await sequelize.query(`SELECT id FROM livres WHERE isbn = ?`, { replacements: [livre.isbn] });
        const livreId = livreInserted[0].id;

        // Associer l'auteur
        const [auteurRow] = await sequelize.query(`SELECT id FROM auteurs WHERE nom = ?`, { replacements: [livre.auteur] });
        if (auteurRow.length > 0) {
          await sequelize.query(
            `INSERT IGNORE INTO livre_auteurs (livre_id, auteur_id) VALUES (?, ?)`,
            { replacements: [livreId, auteurRow[0].id] }
          );
        }

        // Associer le genre
        const [genreRow] = await sequelize.query(`SELECT id FROM genres_litteraires WHERE nom = ?`, { replacements: [livre.genre] });
        if (genreRow.length > 0) {
          await sequelize.query(
            `INSERT IGNORE INTO livre_genres (livre_id, genre_id) VALUES (?, ?)`,
            { replacements: [livreId, genreRow[0].id] }
          );
        }

        // Associer l'editeur
        const [editeurRow] = await sequelize.query(`SELECT id FROM editeurs WHERE nom = ?`, { replacements: [livre.editeur] });
        if (editeurRow.length > 0) {
          await sequelize.query(
            `INSERT IGNORE INTO livre_editeurs (livre_id, editeur_id) VALUES (?, ?)`,
            { replacements: [livreId, editeurRow[0].id] }
          );
        }

        livreCount++;
      }
    }
    console.log(`${livreCount} livres ajoutes\n`);

    // ========================================
    // FILMS
    // ========================================
    console.log('=== FILMS ===\n');

    // Realisateurs
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

    for (const real of realisateurs) {
      await sequelize.query(
        `INSERT IGNORE INTO realisateurs (nom, prenom, nationalite, actif)
         VALUES (?, ?, ?, 1)`,
        { replacements: [real.nom, real.prenom, real.nationalite] }
      );
    }
    console.log(`${realisateurs.length} realisateurs ajoutes`);

    // Acteurs
    const acteurs = [
      { nom: 'DiCaprio', prenom: 'Leonardo' },
      { nom: 'Hanks', prenom: 'Tom' },
      { nom: 'Pitt', prenom: 'Brad' },
      { nom: 'Freeman', prenom: 'Morgan' },
      { nom: 'Portman', prenom: 'Natalie' },
      { nom: 'Weaver', prenom: 'Sigourney' },
      { nom: 'Wood', prenom: 'Elijah' },
      { nom: 'McKellen', prenom: 'Ian' }
    ];

    for (const acteur of acteurs) {
      await sequelize.query(
        `INSERT IGNORE INTO acteurs (nom, prenom, actif)
         VALUES (?, ?, 1)`,
        { replacements: [acteur.nom, acteur.prenom] }
      );
    }
    console.log(`${acteurs.length} acteurs ajoutes`);

    // Genres de films
    const genresFilms = [
      { nom: 'Science-Fiction', icone: 'rocket' },
      { nom: 'Fantasy', icone: 'magic' },
      { nom: 'Action', icone: 'lightning' },
      { nom: 'Drame', icone: 'heart' },
      { nom: 'Thriller', icone: 'exclamation-triangle' },
      { nom: 'Comedie', icone: 'emoji-laughing' },
      { nom: 'Horreur', icone: 'ghost' },
      { nom: 'Aventure', icone: 'compass' }
    ];

    for (const genre of genresFilms) {
      await sequelize.query(
        `INSERT IGNORE INTO genres_films (nom, icone, actif)
         VALUES (?, ?, 1)`,
        { replacements: [genre.nom, genre.icone] }
      );
    }
    console.log(`${genresFilms.length} genres de films ajoutes`);

    // Studios
    const studios = [
      { nom: 'Warner Bros.' },
      { nom: 'Universal Pictures' },
      { nom: 'Paramount Pictures' },
      { nom: '20th Century Studios' },
      { nom: 'New Line Cinema' },
      { nom: 'Legendary Pictures' }
    ];

    for (const studio of studios) {
      await sequelize.query(
        `INSERT IGNORE INTO studios (nom, actif)
         VALUES (?, 1)`,
        { replacements: [studio.nom] }
      );
    }
    console.log(`${studios.length} studios ajoutes`);

    // Films
    const films = [
      {
        titre: 'Le Seigneur des Anneaux - La Communaute de l\'Anneau',
        annee: 2001,
        duree: 178,
        synopsis: 'Un jeune Hobbit doit detruire un anneau magique pour sauver la Terre du Milieu.',
        realisateur: 'Jackson',
        genre: 'Fantasy',
        studio: 'New Line Cinema'
      },
      {
        titre: 'Inception',
        annee: 2010,
        duree: 148,
        synopsis: 'Un voleur specialise dans l\'extraction de secrets via les reves accepte une mission impossible.',
        realisateur: 'Nolan',
        genre: 'Science-Fiction',
        studio: 'Warner Bros.'
      },
      {
        titre: 'Interstellar',
        annee: 2014,
        duree: 169,
        synopsis: 'Des explorateurs voyagent a travers un trou de ver pour sauver l\'humanite.',
        realisateur: 'Nolan',
        genre: 'Science-Fiction',
        studio: 'Paramount Pictures'
      },
      {
        titre: 'Dune',
        annee: 2021,
        duree: 155,
        synopsis: 'Paul Atreides doit assurer l\'avenir de sa famille sur la dangereuse planete Arrakis.',
        realisateur: 'Villeneuve',
        genre: 'Science-Fiction',
        studio: 'Legendary Pictures'
      },
      {
        titre: 'Blade Runner',
        annee: 1982,
        duree: 117,
        synopsis: 'Un chasseur de primes traque des replicants dans un Los Angeles futuriste.',
        realisateur: 'Scott',
        genre: 'Science-Fiction',
        studio: '20th Century Studios'
      },
      {
        titre: 'Alien',
        annee: 1979,
        duree: 117,
        synopsis: 'L\'equipage du Nostromo fait face a une creature extraterrestre mortelle.',
        realisateur: 'Scott',
        genre: 'Horreur',
        studio: '20th Century Studios'
      },
      {
        titre: '2001: L\'Odyssee de l\'espace',
        annee: 1968,
        duree: 149,
        synopsis: 'Un voyage vers Jupiter avec l\'ordinateur HAL 9000.',
        realisateur: 'Kubrick',
        genre: 'Science-Fiction',
        studio: 'Warner Bros.'
      },
      {
        titre: 'Avatar',
        annee: 2009,
        duree: 162,
        synopsis: 'Un marine paraplégique est envoye sur Pandora et decouvre le peuple Na\'vi.',
        realisateur: 'Cameron',
        genre: 'Science-Fiction',
        studio: '20th Century Studios'
      }
    ];

    let filmCount = 0;
    for (const film of films) {
      // Verifier si le film existe deja
      const [existing] = await sequelize.query(
        `SELECT id FROM films WHERE titre = ? AND annee_sortie = ?`,
        { replacements: [film.titre, film.annee] }
      );

      if (existing.length === 0) {
        // Generer code-barre
        const [maxId] = await sequelize.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM films`);
        const nextId = maxId[0].next_id;
        const codeBarre = `FLM${String(nextId).padStart(8, '0')}`;

        // Inserer le film
        await sequelize.query(
          `INSERT INTO films (code_barre, titre, annee_sortie, duree, synopsis, statut, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'disponible', NOW(), NOW())`,
          { replacements: [codeBarre, film.titre, film.annee, film.duree, film.synopsis] }
        );

        // Recuperer l'ID du film
        const [filmInserted] = await sequelize.query(
          `SELECT id FROM films WHERE titre = ? AND annee_sortie = ?`,
          { replacements: [film.titre, film.annee] }
        );
        const filmId = filmInserted[0].id;

        // Associer le realisateur
        const [realRow] = await sequelize.query(`SELECT id FROM realisateurs WHERE nom = ?`, { replacements: [film.realisateur] });
        if (realRow.length > 0) {
          await sequelize.query(
            `INSERT IGNORE INTO film_realisateurs (film_id, realisateur_id) VALUES (?, ?)`,
            { replacements: [filmId, realRow[0].id] }
          );
        }

        // Associer le genre
        const [genreRow] = await sequelize.query(`SELECT id FROM genres_films WHERE nom = ?`, { replacements: [film.genre] });
        if (genreRow.length > 0) {
          await sequelize.query(
            `INSERT IGNORE INTO film_genres (film_id, genre_id) VALUES (?, ?)`,
            { replacements: [filmId, genreRow[0].id] }
          );
        }

        // Associer le studio
        const [studioRow] = await sequelize.query(`SELECT id FROM studios WHERE nom = ?`, { replacements: [film.studio] });
        if (studioRow.length > 0) {
          await sequelize.query(
            `INSERT IGNORE INTO film_studios (film_id, studio_id) VALUES (?, ?)`,
            { replacements: [filmId, studioRow[0].id] }
          );
        }

        filmCount++;
      }
    }
    console.log(`${filmCount} films ajoutes\n`);

    // ========================================
    // DISQUES
    // ========================================
    console.log('=== DISQUES ===\n');

    // Artistes
    const artistes = [
      { nom: 'Pink Floyd', type: 'groupe', pays: 'Royaume-Uni' },
      { nom: 'Daft Punk', type: 'groupe', pays: 'France' },
      { nom: 'Queen', type: 'groupe', pays: 'Royaume-Uni' },
      { nom: 'The Beatles', type: 'groupe', pays: 'Royaume-Uni' },
      { nom: 'David Bowie', type: 'solo', pays: 'Royaume-Uni' },
      { nom: 'Michael Jackson', type: 'solo', pays: 'Etats-Unis' },
      { nom: 'Nirvana', type: 'groupe', pays: 'Etats-Unis' },
      { nom: 'Radiohead', type: 'groupe', pays: 'Royaume-Uni' }
    ];

    for (const artiste of artistes) {
      await sequelize.query(
        `INSERT IGNORE INTO artistes (nom, type, pays, actif, created_at, updated_at)
         VALUES (?, ?, ?, 1, NOW(), NOW())`,
        { replacements: [artiste.nom, artiste.type, artiste.pays] }
      );
    }
    console.log(`${artistes.length} artistes ajoutes`);

    // Genres musicaux
    const genresMusicaux = [
      { nom: 'Rock' },
      { nom: 'Pop' },
      { nom: 'Electro' },
      { nom: 'Jazz' },
      { nom: 'Classique' },
      { nom: 'Metal' },
      { nom: 'Hip-Hop' },
      { nom: 'Blues' },
      { nom: 'Progressive Rock' },
      { nom: 'Grunge' }
    ];

    for (const genre of genresMusicaux) {
      await sequelize.query(
        `INSERT IGNORE INTO genres_musicaux (nom, actif)
         VALUES (?, 1)`,
        { replacements: [genre.nom] }
      );
    }
    console.log(`${genresMusicaux.length} genres musicaux ajoutes`);

    // Labels
    const labels = [
      { nom: 'EMI' },
      { nom: 'Columbia Records' },
      { nom: 'Virgin Records' },
      { nom: 'Parlophone' },
      { nom: 'Decca' },
      { nom: 'Atlantic Records' }
    ];

    for (const label of labels) {
      await sequelize.query(
        `INSERT IGNORE INTO labels_disques (nom, actif)
         VALUES (?, 1)`,
        { replacements: [label.nom] }
      );
    }
    console.log(`${labels.length} labels ajoutes`);

    // Formats de disques
    const formatsDisques = [
      { nom: 'CD' },
      { nom: 'Vinyle' },
      { nom: 'Cassette' },
      { nom: 'DVD Audio' }
    ];

    for (const format of formatsDisques) {
      await sequelize.query(
        `INSERT IGNORE INTO formats_disques (nom, actif)
         VALUES (?, 1)`,
        { replacements: [format.nom] }
      );
    }
    console.log(`${formatsDisques.length} formats de disques ajoutes`);

    // Disques
    const disques = [
      {
        titre: 'The Dark Side of the Moon',
        annee: 1973,
        format: 'Vinyle',
        artiste: 'Pink Floyd',
        genre: 'Progressive Rock',
        label: 'EMI'
      },
      {
        titre: 'Random Access Memories',
        annee: 2013,
        format: 'CD',
        artiste: 'Daft Punk',
        genre: 'Electro',
        label: 'Columbia Records'
      },
      {
        titre: 'A Night at the Opera',
        annee: 1975,
        format: 'Vinyle',
        artiste: 'Queen',
        genre: 'Rock',
        label: 'EMI'
      },
      {
        titre: 'Abbey Road',
        annee: 1969,
        format: 'Vinyle',
        artiste: 'The Beatles',
        genre: 'Rock',
        label: 'Parlophone'
      },
      {
        titre: 'The Rise and Fall of Ziggy Stardust',
        annee: 1972,
        format: 'Vinyle',
        artiste: 'David Bowie',
        genre: 'Rock',
        label: 'Virgin Records'
      },
      {
        titre: 'Thriller',
        annee: 1982,
        format: 'CD',
        artiste: 'Michael Jackson',
        genre: 'Pop',
        label: 'Columbia Records'
      },
      {
        titre: 'Nevermind',
        annee: 1991,
        format: 'CD',
        artiste: 'Nirvana',
        genre: 'Grunge',
        label: 'Decca'
      },
      {
        titre: 'OK Computer',
        annee: 1997,
        format: 'CD',
        artiste: 'Radiohead',
        genre: 'Rock',
        label: 'Parlophone'
      }
    ];

    let disqueCount = 0;
    for (const disque of disques) {
      // Verifier si le disque existe deja
      const [existing] = await sequelize.query(
        `SELECT id FROM disques WHERE titre = ? AND annee_sortie = ?`,
        { replacements: [disque.titre, disque.annee] }
      );

      if (existing.length === 0) {
        // Generer code-barre
        const [maxId] = await sequelize.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM disques`);
        const nextId = maxId[0].next_id;
        const codeBarre = `DSQ${String(nextId).padStart(8, '0')}`;

        // Recuperer format_id
        const [formatRow] = await sequelize.query(`SELECT id FROM formats_disques WHERE nom = ?`, { replacements: [disque.format] });
        const formatId = formatRow.length > 0 ? formatRow[0].id : null;

        // Inserer le disque
        await sequelize.query(
          `INSERT INTO disques (code_barre, titre, annee_sortie, format_id, statut, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'disponible', NOW(), NOW())`,
          { replacements: [codeBarre, disque.titre, disque.annee, formatId] }
        );

        // Recuperer l'ID du disque
        const [disqueInserted] = await sequelize.query(
          `SELECT id FROM disques WHERE titre = ? AND annee_sortie = ?`,
          { replacements: [disque.titre, disque.annee] }
        );
        const disqueId = disqueInserted[0].id;

        // Associer l'artiste
        const [artisteRow] = await sequelize.query(`SELECT id FROM artistes WHERE nom = ?`, { replacements: [disque.artiste] });
        if (artisteRow.length > 0) {
          await sequelize.query(
            `INSERT IGNORE INTO disque_artistes (disque_id, artiste_id) VALUES (?, ?)`,
            { replacements: [disqueId, artisteRow[0].id] }
          );
        }

        // Associer le genre
        const [genreRow] = await sequelize.query(`SELECT id FROM genres_musicaux WHERE nom = ?`, { replacements: [disque.genre] });
        if (genreRow.length > 0) {
          await sequelize.query(
            `INSERT IGNORE INTO disque_genres (disque_id, genre_id) VALUES (?, ?)`,
            { replacements: [disqueId, genreRow[0].id] }
          );
        }

        // Associer le label
        const [labelRow] = await sequelize.query(`SELECT id FROM labels_disques WHERE nom = ?`, { replacements: [disque.label] });
        if (labelRow.length > 0) {
          // Mettre a jour le label_id directement sur le disque
          await sequelize.query(
            `UPDATE disques SET label_id = ? WHERE id = ?`,
            { replacements: [labelRow[0].id, disqueId] }
          );
        }

        disqueCount++;
      }
    }
    console.log(`${disqueCount} disques ajoutes\n`);

    // ========================================
    // RESUME
    // ========================================
    console.log('=== RESUME ===');

    const [livresTotal] = await sequelize.query(`SELECT COUNT(*) as count FROM livres`);
    const [filmsTotal] = await sequelize.query(`SELECT COUNT(*) as count FROM films`);
    const [disquesTotal] = await sequelize.query(`SELECT COUNT(*) as count FROM disques`);

    console.log(`Total Livres: ${livresTotal[0].count}`);
    console.log(`Total Films: ${filmsTotal[0].count}`);
    console.log(`Total Disques: ${disquesTotal[0].count}`);

    console.log('\nSeed termine avec succes!');

  } catch (error) {
    console.error('Erreur lors du seed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Executer
seedCollections();
