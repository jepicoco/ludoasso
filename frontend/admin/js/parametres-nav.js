/**
 * Navigation secondaire pour les pages Parametres
 * Affiche une barre de navigation rapide entre les pages d'un meme onglet
 *
 * Organisation des onglets parametres.html:
 * - Organisation: Structures, Portails publics, Sites, Site web, Utilisateurs
 * - Configuration: Listes, Emprunts, Codes-barres, Holodeck
 * - Referentiels: Referentiels, Communes, Calendrier
 * - Comptabilite: Tarifs, Codes reduction, Comptes bancaires, Exports, Parametrage
 * - Communication: Templates, Declencheurs, Historique
 * - Services: Email, SMS, IA, APIs, Cles API
 * - Outils: Import, Archives, Thematiques, Migrations
 */

const PARAMETRES_CATEGORIES = {
  // Onglet Organisation
  organisation: {
    label: 'Organisation',
    icon: 'bi-building',
    tabId: 'organisation',
    pages: [
      { id: 'organisations', label: 'Organisations', href: 'organisations.html', icon: 'bi-building-gear', adminOnly: true },
      { id: 'structures', label: 'Structures', href: 'structures.html', icon: 'bi-diagram-3', adminOnly: true },
      { id: 'groupes-frontend', label: 'Portails publics', href: 'groupes-frontend.html', icon: 'bi-window-stack', adminOnly: true },
      { id: 'site-web', label: 'Site web', href: 'parametres-site-web.html', icon: 'bi-globe' },
      { id: 'sites', label: 'Sites', href: 'parametres-sites.html', icon: 'bi-geo-alt' },
      { id: 'utilisateurs', label: 'Utilisateurs', href: 'parametres-utilisateurs.html', icon: 'bi-people' }
    ]
  },

  // Onglet Configuration
  configuration: {
    label: 'Configuration',
    icon: 'bi-gear',
    tabId: 'configuration',
    pages: [
      { id: 'charte', label: 'Charte usager', href: 'parametres-charte.html', icon: 'bi-file-earmark-check' },
      { id: 'listes', label: 'Listes', href: 'parametres-listes.html', icon: 'bi-list-ul' },
      { id: 'codes-barres', label: 'Codes-Barres', href: 'parametres-codes-barres.html', icon: 'bi-upc-scan' },
      { id: 'emprunts', label: 'Emprunts', href: 'parametres-emprunts.html', icon: 'bi-arrow-repeat' },
      { id: 'limites', label: 'Limites emprunts', href: 'parametres-limites-emprunts.html', icon: 'bi-speedometer2' },
      { id: 'reservations', label: 'Reservations', href: 'parametres-reservations.html', icon: 'bi-bookmark' },
      { id: 'nouveautes', label: 'Nouveautes', href: 'parametres-nouveautes.html', icon: 'bi-stars' },
      { id: 'holodeck', label: 'Holodeck', href: 'parametres-holodeck.html', icon: 'bi-grid-3x3-gap', adminOnly: true }
    ]
  },

  // Onglet Referentiels
  referentiels: {
    label: 'Referentiels',
    icon: 'bi-tags',
    tabId: 'referentiels',
    pages: [
      { id: 'referentiels', label: 'Referentiels', href: 'parametres-referentiels.html', icon: 'bi-tags' },
      { id: 'communes', label: 'Communes', href: 'parametres-communes.html', icon: 'bi-geo' },
      { id: 'calendrier', label: 'Calendrier', href: 'parametres-calendrier.html', icon: 'bi-calendar3' }
    ]
  },

  // Onglet Comptabilite
  comptabilite: {
    label: 'Comptabilite',
    icon: 'bi-calculator',
    tabId: 'comptabilite',
    pages: [
      { id: 'tarifs', label: 'Tarifs cotisation', href: 'tarifs-cotisation.html', icon: 'bi-currency-euro' },
      { id: 'codes-reduction', label: 'Codes reduction', href: 'parametres-codes-reduction.html', icon: 'bi-ticket-perforated' },
      { id: 'comptes-bancaires', label: 'Comptes bancaires', href: 'parametres-comptes-bancaires.html', icon: 'bi-bank' },
      { id: 'exports-comptables', label: 'Exports', href: 'parametres-exports-comptables.html', icon: 'bi-file-earmark-spreadsheet' },
      { id: 'parametrage-comptable', label: 'Parametrage', href: 'parametres-comptabilite.html', icon: 'bi-gear-wide-connected' }
    ]
  },

  // Onglet Communication
  communication: {
    label: 'Communication',
    icon: 'bi-envelope',
    tabId: 'communication',
    pages: [
      { id: 'templates', label: 'Templates de messages', href: 'parametres-templates.html', icon: 'bi-file-text' },
      { id: 'declencheurs', label: 'Declencheurs', href: 'parametres-declencheurs.html', icon: 'bi-lightning' },
      { id: 'historique', label: 'Historique', href: 'historique-communications.html', icon: 'bi-clock-history' }
    ]
  },

  // Onglet Services externes
  services: {
    label: 'Services',
    icon: 'bi-cloud',
    tabId: 'services-externes',
    pages: [
      { id: 'email', label: 'Email', href: 'parametres-email.html', icon: 'bi-envelope-at' },
      { id: 'sms', label: 'SMS', href: 'parametres-sms.html', icon: 'bi-phone' },
      { id: 'ia', label: 'Intelligence Artificielle', href: 'parametres-llm.html', icon: 'bi-robot' },
      { id: 'apis-externes', label: 'APIs Externes', href: 'parametres-apis-externes.html', icon: 'bi-cloud-download' },
      { id: 'api-keys', label: 'Cles API', href: 'parametres-api-keys.html', icon: 'bi-key', adminOnly: true }
    ]
  },

  // Onglet Outils
  outils: {
    label: 'Outils',
    icon: 'bi-tools',
    tabId: 'outils',
    pages: [
      { id: 'import', label: 'Import jeux', href: 'import-jeux.html', icon: 'bi-upload' },
      { id: 'import-listes', label: 'Import par listes', href: 'import-listes.html', icon: 'bi-tags' },
      { id: 'archives', label: 'Archives RGPD', href: 'parametres-archives.html', icon: 'bi-archive' },
      { id: 'thematiques', label: 'Thematiques IA', href: 'parametres-thematiques.html', icon: 'bi-tags', module: 'recherche_ia' },
      { id: 'migrations', label: 'Migrations', href: 'parametres-migrations.html', icon: 'bi-database-gear', adminOnly: true }
    ]
  },

  // Aliases pour retrocompatibilite
  general: {
    label: 'Organisation',
    icon: 'bi-building',
    tabId: 'organisation',
    pages: [] // Redirige vers organisation
  },
  'services-externes': {
    label: 'Services',
    icon: 'bi-cloud',
    tabId: 'services-externes',
    pages: [] // Redirige vers services
  },
  emprunts: {
    label: 'Configuration',
    icon: 'bi-gear',
    tabId: 'configuration',
    pages: [] // Redirige vers configuration
  },
  catalogue: {
    label: 'Configuration',
    icon: 'bi-gear',
    tabId: 'configuration',
    pages: [] // Redirige vers configuration
  },
  systeme: {
    label: 'Outils',
    icon: 'bi-tools',
    tabId: 'outils',
    pages: [] // Redirige vers outils
  },
  'site-web': {
    label: 'Organisation',
    icon: 'bi-building',
    tabId: 'organisation',
    pages: [] // Redirige vers organisation
  }
};

/**
 * Genere et insere la barre de navigation secondaire
 * @param {string} category - Categorie (organisation, configuration, referentiels, comptabilite, communication, services, outils)
 * @param {string} currentPageId - ID de la page courante
 */
function renderSubNav(category, currentPageId) {
  let cat = PARAMETRES_CATEGORIES[category];

  // Si categorie alias avec pages vides, chercher la vraie categorie
  if (cat && cat.pages.length === 0) {
    const realCategory = findCategoryByPageId(currentPageId);
    if (realCategory) {
      cat = PARAMETRES_CATEGORIES[realCategory];
    }
  }

  if (!cat) {
    console.error('Categorie inconnue:', category);
    return;
  }

  const container = document.getElementById('sub-nav-container');
  if (!container) {
    console.error('Container sub-nav-container non trouve');
    return;
  }

  // Filtrer les pages adminOnly et par module actif
  const userRole = localStorage.getItem('userRole') || 'usager';
  const filteredPages = cat.pages.filter(page => {
    if (page.adminOnly && userRole !== 'administrateur') {
      return false;
    }
    // Filtrer par module actif (utilise isModuleActive de admin-template.js)
    if (page.module && typeof isModuleActive === 'function' && !isModuleActive(page.module)) {
      return false;
    }
    return true;
  });

  if (filteredPages.length === 0) {
    container.innerHTML = '';
    return;
  }

  const html = `
    <div class="sub-nav mb-4">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center flex-wrap gap-2">
          <span class="text-muted me-2">
            <i class="bi ${cat.icon}"></i> ${cat.label}:
          </span>
          ${filteredPages.map(page => {
            const isActive = page.id === currentPageId;
            return `
              <a href="${page.href}"
                 class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'}"
                 ${isActive ? 'aria-current="page"' : ''}>
                <i class="bi ${page.icon}"></i>
                <span class="d-none d-md-inline ms-1">${page.label}</span>
              </a>
            `;
          }).join('')}
        </div>
        <a href="${getParametresLink(cat.tabId || category)}" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left"></i>
          <span class="d-none d-sm-inline ms-1">Retour</span>
        </a>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Trouve la categorie contenant une page donnee
 * @param {string} pageId - ID de la page
 * @returns {string|null} Nom de la categorie
 */
function findCategoryByPageId(pageId) {
  const mainCategories = ['organisation', 'configuration', 'referentiels', 'comptabilite', 'communication', 'services', 'outils'];
  for (const catName of mainCategories) {
    const cat = PARAMETRES_CATEGORIES[catName];
    if (cat && cat.pages.some(p => p.id === pageId)) {
      return catName;
    }
  }
  return null;
}

/**
 * Retourne le lien vers la page principale des parametres avec l'onglet actif
 * @param {string} category - Categorie ou tabId
 * @returns {string} URL
 */
function getParametresLink(category) {
  const tabMap = {
    organisation: 'organisation',
    configuration: 'configuration',
    referentiels: 'referentiels',
    comptabilite: 'comptabilite',
    communication: 'communication',
    services: 'services-externes',
    'services-externes': 'services-externes',
    outils: 'outils',
    // Aliases
    general: 'organisation',
    emprunts: 'configuration',
    catalogue: 'configuration',
    systeme: 'outils',
    'site-web': 'organisation'
  };
  return `parametres.html#${tabMap[category] || 'organisation'}`;
}

/**
 * Genere un breadcrumb simple
 * @param {string} category - Categorie
 * @param {string} pageLabel - Libelle de la page courante
 */
function renderBreadcrumb(category, pageLabel) {
  let cat = PARAMETRES_CATEGORIES[category];
  if (!cat) return;

  // Si alias, utiliser la vraie categorie pour le label
  if (cat.pages.length === 0) {
    const realCat = findCategoryByPageId(category);
    if (realCat) cat = PARAMETRES_CATEGORIES[realCat];
  }

  const container = document.getElementById('breadcrumb-container');
  if (!container) return;

  container.innerHTML = `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item">
          <a href="parametres.html"><i class="bi bi-gear"></i> Parametres</a>
        </li>
        <li class="breadcrumb-item">
          <a href="${getParametresLink(cat.tabId || category)}">${cat.label}</a>
        </li>
        <li class="breadcrumb-item active" aria-current="page">${pageLabel}</li>
      </ol>
    </nav>
  `;
}

/**
 * Initialise la sous-navigation si le container existe
 * @param {string} category - Categorie
 * @param {string} currentPageId - ID de la page courante
 */
function initSubNav(category, currentPageId) {
  const container = document.getElementById('sub-nav-container');
  if (container) {
    renderSubNav(category, currentPageId);
  }
}

// Export pour utilisation globale
window.PARAMETRES_CATEGORIES = PARAMETRES_CATEGORIES;
window.renderSubNav = renderSubNav;
window.renderBreadcrumb = renderBreadcrumb;
window.getParametresLink = getParametresLink;
window.initSubNav = initSubNav;
window.findCategoryByPageId = findCategoryByPageId;
