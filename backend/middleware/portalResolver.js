/**
 * Middleware de resolution des themes pour portails publics
 *
 * Similaire a themeResolver mais utilise req.portalTheme (defini par resolvePortal)
 * au lieu de lire le theme global depuis ParametresFront.
 *
 * Injecte automatiquement le prefixe du portail dans les URLs HTML.
 * Injecte aussi les parametres resolus du portail dans window.PORTAL_CONTEXT.
 */

const path = require('path');
const fs = require('fs');
const portalSettingsService = require('../services/portalSettingsService');

// Chemin vers les themes
const THEMES_PATH = path.join(__dirname, '../../frontend/themes');

// Pages publiques qui peuvent etre surchargees par un theme
const OVERRIDABLE_PAGES = [
  'index.html',
  'catalogue.html',
  'fiche.html',
  'infos.html',
  'mentions-legales.html',
  'cgu.html',
  'cgv.html',
  'contact.html',
  'plan.html',
  'aide.html',
  // Pages usager
  'usager/login.html',
  'usager/dashboard.html',
  'usager/emprunts.html',
  'usager/profil.html',
  'usager/forgot-password.html',
  'usager/reset-password.html'
];

/**
 * Verifie si un fichier existe dans le theme
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
 * Injecte le prefixe du portail dans les URLs d'un fichier HTML
 * Remplace:
 *   /theme/  -> /{slug}/theme/
 *   href="/catalogue  -> href="/{slug}/catalogue
 *   href="/fiche  -> href="/{slug}/fiche
 *   href="/infos  -> href="/{slug}/infos
 *   etc.
 *
 * @param {string} html - Contenu HTML
 * @param {string} slug - Slug du portail
 * @param {Object} portalParams - Parametres resolus du portail (optionnel)
 */
function injectPortalPrefix(html, slug, portalParams = null) {
  const portalPages = [
    'catalogue', 'fiche', 'infos', 'aide', 'contact', 'plan',
    'mentions-legales', 'cgu', 'cgv', 'usager'
  ];

  let result = html;

  // Remplacer /theme/ par /{slug}/theme/
  result = result.replace(/href="\/theme\//g, `href="/${slug}/theme/`);
  result = result.replace(/src="\/theme\//g, `src="/${slug}/theme/`);

  // Remplacer les liens vers les pages du portail
  portalPages.forEach(page => {
    // href="/page" ou href="/page/..."
    result = result.replace(
      new RegExp(`href="\\/${page}(?="|/)`, 'g'),
      `href="/${slug}/${page}`
    );
  });

  // Remplacer href="/" par href="/{slug}/" (page d'accueil)
  result = result.replace(/href="\/"/g, `href="/${slug}/"`);

  // Preparer le contexte portail pour injection JS
  const portalContext = {
    slug: slug,
    basePath: `/${slug}`,
    // Parametres essentiels pour le frontend
    nom_site: portalParams?.nom_site || portalParams?._portal?.nom || '',
    logo_url: portalParams?.logo_url || '',
    theme_code: portalParams?._portal?.theme_code || 'default',
    // Modules actifs
    modules: {
      ludotheque: portalParams?.module_ludotheque !== false,
      bibliotheque: portalParams?.module_bibliotheque !== false,
      filmotheque: portalParams?.module_filmotheque !== false,
      discotheque: portalParams?.module_discotheque !== false,
      reservations: portalParams?.module_reservations !== false,
      plan_interactif: portalParams?.module_plan_interactif === true
    },
    // Contact
    email_contact: portalParams?.email_contact || '',
    telephone_contact: portalParams?.telephone_contact || ''
  };

  // Injecter le contexte portail comme variable JS globale
  const portalScript = `<script>window.PORTAL_CONTEXT = ${JSON.stringify(portalContext)};</script>`;
  result = result.replace('</head>', `${portalScript}\n</head>`);

  // Remplacer le titre si nom_site est defini
  if (portalParams?.nom_site) {
    result = result.replace(/<title>[^<]*<\/title>/, `<title>${portalParams.nom_site}</title>`);
  }

  // Remplacer meta description si definie
  if (portalParams?.meta_description) {
    result = result.replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${portalParams.meta_description}">`
    );
  }

  // Remplacer favicon si defini
  if (portalParams?.favicon_url) {
    result = result.replace(
      /<link rel="icon"[^>]*>/,
      `<link rel="icon" href="${portalParams.favicon_url}" type="image/x-icon">`
    );
  }

  return result;
}

/**
 * Middleware Express pour resoudre les fichiers avec fallback
 * Utilise req.portalTheme defini par resolvePortal dans server.js
 */
function createPortalThemeResolverMiddleware(frontendPath) {
  return async (req, res, next) => {
    const requestedFile = req.targetPage || 'index.html';
    const themeCode = req.portalTheme || 'default';
    const portal = req.portal;
    const portalSlug = portal?.slug;

    console.log(`[PortalResolver] Portal: ${portalSlug}, Theme: ${themeCode}, Page: ${requestedFile}`);

    if (!OVERRIDABLE_PAGES.includes(requestedFile)) {
      console.log(`[PortalResolver] Not overridable, skipping`);
      return next();
    }

    try {
      // Verifier que le dossier du theme existe
      const themePath = path.join(THEMES_PATH, themeCode);
      const effectiveTheme = fs.existsSync(themePath) ? themeCode : 'default';

      let filePath = getThemeFilePath(effectiveTheme, requestedFile, frontendPath);

      // Fallback vers le theme default si le fichier n'existe pas
      if (!filePath) {
        filePath = getThemeFilePath('default', requestedFile, frontendPath);
      }

      // Fallback vers frontend root
      if (!filePath) {
        const defaultFilePath = path.join(frontendPath, requestedFile);
        if (fs.existsSync(defaultFilePath)) {
          filePath = defaultFilePath;
        }
      }

      if (filePath) {
        // Recuperer les parametres resolus du portail
        let portalParams = null;
        if (portal) {
          try {
            portalParams = await portalSettingsService.getResolvedPortalParams(portal);
          } catch (err) {
            console.error('[PortalResolver] Erreur recuperation params:', err.message);
          }
        }

        // Lire le fichier et injecter le prefixe du portail + params
        let html = fs.readFileSync(filePath, 'utf8');
        html = injectPortalPrefix(html, portalSlug, portalParams);

        console.log(`[PortalResolver] Serving modified theme file: ${filePath}`);
        res.type('html').send(html);
        return;
      }

      // Si le fichier n'existe pas, 404
      next();
    } catch (error) {
      console.error('Erreur portal resolver:', error.message);
      next();
    }
  };
}

module.exports = {
  createPortalThemeResolverMiddleware,
  OVERRIDABLE_PAGES
};
