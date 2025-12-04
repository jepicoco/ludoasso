/**
 * Point d'entrée pour Infomaniak (hébergement mutualisé Node.js)
 * Ce fichier charge le serveur principal
 */

// Charger les variables d'environnement
require('dotenv').config();

// Importer et démarrer l'application
require('./backend/server');
