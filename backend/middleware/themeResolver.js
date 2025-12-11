/**
 * Middleware de résolution des thèmes
 *
 * Gère le fallback : si un fichier existe dans le dossier du thème actif,
 * il est servi en priorité. Sinon, on sert le fichier par défaut.
 *
 * Structure attendue :
 * frontend/
 * ├── themes/
 * │   └── {theme_code}/
 * │       ├── js/
 * │       ├── css/
 * │       ├── assets/
 * │       ├── index.html      (optionnel)
 * │       ├── catalogue.html  (optionnel)
 * │       ├── fiche.html      (optionnel)
 * │       └── infos.html      (optionnel)
 * ├── index.html              (défaut)
 * ├── catalogue.html          (défaut)
 * └── ...
 */

const path = require('path');
const fs = require('fs');
const { ParametresFront, ThemeSite } = require('../models');

// Cache du thème actif (refresh toutes les 5 minutes)
let activeThemeCache = {
  code: null,
  timestamp: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Pages publiques qui peuvent être surchargées par un thème
const OVERRIDABLE_PAGES = [
  'index.html',
  'catalogue.html',
  'fiche.html',
  'infos.html',
  'mentions-legales.html',
  'cgu.html',
  'cgv.html',
  'contact.html'
];

/**
 * Récupère le code du thème actif (avec cache)
 */
async function getActiveThemeCode() {
  const now = Date.now();

  if (activeThemeCache.code && (now - activeThemeCache.timestamp) < CACHE_TTL) {
    return activeThemeCache.code;
  }

  try {
    const params = await ParametresFront.findOne();
    if (!params || !params.theme_id) {
      activeThemeCache = { code: null, timestamp: now };
      return null;
    }

    const theme = await ThemeSite.findByPk(params.theme_id);
    if (!theme || !theme.actif) {
      activeThemeCache = { code: null, timestamp: now };
      return null;
    }

    activeThemeCache = { code: theme.code, timestamp: now };
    return theme.code;
  } catch (error) {
    console.error('Erreur récupération thème actif:', error.message);
    return null;
  }
}

/**
 * Invalide le cache du thème (à appeler lors d'un changement de thème)
 */
function invalidateThemeCache() {
  activeThemeCache = { code: null, timestamp: 0 };
}

/**
 * Crée la structure de dossiers pour un thème
 * @param {string} themeCode - Code du thème
 * @param {string} basePath - Chemin de base (frontend/)
 */
function createThemeStructure(themeCode, basePath) {
  const themePath = path.join(basePath, 'themes', themeCode);

  const dirs = [
    themePath,
    path.join(themePath, 'js'),
    path.join(themePath, 'css'),
    path.join(themePath, 'assets')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Dossier créé: ${dir}`);
    }
  });

  // Créer un fichier README dans le dossier du thème
  const readmePath = path.join(themePath, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# Thème ${themeCode}

Ce dossier contient les fichiers personnalisés du thème.

## Structure

- \`css/\` - Fichiers CSS personnalisés
- \`js/\` - Fichiers JavaScript personnalisés
- \`assets/\` - Images, fonts et autres ressources

## Pages surchargeables

Créez ces fichiers pour remplacer les pages par défaut :

- \`index.html\` - Page d'accueil
- \`catalogue.html\` - Catalogue des collections
- \`fiche.html\` - Fiche détaillée d'un article
- \`infos.html\` - Page d'informations
- \`mentions-legales.html\` - Mentions légales
- \`cgu.html\` - Conditions générales d'utilisation
- \`cgv.html\` - Conditions générales de vente
- \`contact.html\` - Page de contact

Si un fichier n'existe pas ici, la version par défaut sera utilisée.
`);
  }

  return themePath;
}

/**
 * Vérifie si un fichier existe dans le thème
 * @param {string} themeCode - Code du thème
 * @param {string} filePath - Chemin relatif du fichier
 * @param {string} basePath - Chemin de base (frontend/)
 * @returns {string|null} - Chemin complet si existe, null sinon
 */
function getThemeFilePath(themeCode, filePath, basePath) {
  if (!themeCode) return null;

  const themeFilePath = path.join(basePath, 'themes', themeCode, filePath);

  if (fs.existsSync(themeFilePath)) {
    return themeFilePath;
  }

  return null;
}

/**
 * Middleware Express pour résoudre les fichiers avec fallback
 * @param {string} frontendPath - Chemin vers le dossier frontend
 */
function createThemeResolverMiddleware(frontendPath) {
  return async (req, res, next) => {
    // Ne traiter que les pages HTML publiques surchargeables
    const requestedFile = req.path === '/' ? 'index.html' : req.path.substring(1);

    console.log(`[ThemeResolver] Request: ${req.path} -> ${requestedFile}`);

    if (!OVERRIDABLE_PAGES.includes(requestedFile)) {
      console.log(`[ThemeResolver] Not overridable, skipping`);
      return next();
    }

    try {
      const themeCode = await getActiveThemeCode();
      console.log(`[ThemeResolver] Active theme: ${themeCode}`);

      if (themeCode) {
        const themeFilePath = getThemeFilePath(themeCode, requestedFile, frontendPath);
        console.log(`[ThemeResolver] Theme file path: ${themeFilePath}`);

        if (themeFilePath) {
          // Le fichier existe dans le thème, on le sert
          console.log(`[ThemeResolver] Serving theme file: ${themeFilePath}`);
          return res.sendFile(themeFilePath);
        }
      }

      // Fallback : servir le fichier par défaut depuis frontend/
      const defaultFilePath = path.join(frontendPath, requestedFile);
      console.log(`[ThemeResolver] Fallback to default: ${defaultFilePath}`);
      if (fs.existsSync(defaultFilePath)) {
        return res.sendFile(defaultFilePath);
      }

      // Si le fichier par défaut n'existe pas non plus, 404
      next();
    } catch (error) {
      console.error('Erreur theme resolver:', error.message);
      next();
    }
  };
}

/**
 * Middleware pour les ressources statiques du thème (css, js, assets)
 * Route: /theme/* -> frontend/themes/{active_theme}/*
 */
function createThemeStaticMiddleware(frontendPath) {
  return async (req, res, next) => {
    try {
      const themeCode = await getActiveThemeCode();

      if (!themeCode) {
        return res.status(404).json({ error: 'Aucun thème actif' });
      }

      // Enlever /theme/ du début
      const filePath = req.path.replace(/^\/theme\/?/, '');

      if (!filePath) {
        return res.status(404).json({ error: 'Fichier non spécifié' });
      }

      const themeFilePath = path.join(frontendPath, 'themes', themeCode, filePath);

      if (fs.existsSync(themeFilePath)) {
        return res.sendFile(themeFilePath);
      }

      // Fallback vers les ressources par défaut du frontend
      const defaultPath = path.join(frontendPath, filePath);
      if (fs.existsSync(defaultPath)) {
        return res.sendFile(defaultPath);
      }

      res.status(404).json({ error: 'Fichier non trouvé' });
    } catch (error) {
      console.error('Erreur theme static:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  };
}

/**
 * Liste les fichiers d'un thème
 * @param {string} themeCode - Code du thème
 * @param {string} basePath - Chemin de base (frontend/)
 * @returns {Object} - Structure des fichiers
 */
function listThemeFiles(themeCode, basePath) {
  const themePath = path.join(basePath, 'themes', themeCode);

  if (!fs.existsSync(themePath)) {
    return { exists: false, files: {} };
  }

  const result = {
    exists: true,
    path: themePath,
    files: {
      pages: [],
      css: [],
      js: [],
      assets: []
    }
  };

  // Pages HTML
  OVERRIDABLE_PAGES.forEach(page => {
    const pagePath = path.join(themePath, page);
    if (fs.existsSync(pagePath)) {
      result.files.pages.push(page);
    }
  });

  // CSS
  const cssPath = path.join(themePath, 'css');
  if (fs.existsSync(cssPath)) {
    result.files.css = fs.readdirSync(cssPath).filter(f => f.endsWith('.css'));
  }

  // JS
  const jsPath = path.join(themePath, 'js');
  if (fs.existsSync(jsPath)) {
    result.files.js = fs.readdirSync(jsPath).filter(f => f.endsWith('.js'));
  }

  // Assets
  const assetsPath = path.join(themePath, 'assets');
  if (fs.existsSync(assetsPath)) {
    result.files.assets = fs.readdirSync(assetsPath);
  }

  return result;
}

module.exports = {
  createThemeResolverMiddleware,
  createThemeStaticMiddleware,
  createThemeStructure,
  listThemeFiles,
  getActiveThemeCode,
  invalidateThemeCache,
  OVERRIDABLE_PAGES
};
