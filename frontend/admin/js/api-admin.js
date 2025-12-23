/**
 * API Client for Ludothèque Admin Interface
 */

// ============ TOAST NOTIFICATIONS ============

/**
 * Affiche une notification toast (utilise SweetAlert2 si disponible, sinon fallback)
 * @param {string} message - Message a afficher
 * @param {string} type - Type: 'success', 'error', 'warning', 'info' (defaut: 'info')
 * @param {number} duration - Duree en ms (defaut: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  // Mapping des types pour SweetAlert2
  const iconMap = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
    danger: 'error' // Alias Bootstrap
  };

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: iconMap[type] || 'info',
      title: message,
      showConfirmButton: false,
      timer: duration,
      timerProgressBar: true
    });
  } else {
    // Fallback si SweetAlert2 n'est pas charge
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

/**
 * Toast de succes
 */
function showSuccessToast(message, duration = 3000) {
  showToast(message, 'success', duration);
}

/**
 * Toast d'erreur
 */
function showErrorToast(message, duration = 4000) {
  showToast(message, 'error', duration);
}

/**
 * Toast d'avertissement
 */
function showWarningToast(message, duration = 3500) {
  showToast(message, 'warning', duration);
}

/**
 * Toast d'information
 */
function showInfoToast(message, duration = 3000) {
  showToast(message, 'info', duration);
}

// Export global pour utilisation dans les pages
window.showToast = showToast;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;

// ============ API CONFIGURATION ============

// Detecte automatiquement l'URL de l'API selon l'environnement
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : `${window.location.origin}/api`;

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Set auth token in localStorage
 */
const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

/**
 * Remove auth token from localStorage
 */
const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

/**
 * Make authenticated API request
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ajouter le header X-Structure-Id si une structure est selectionnee (Multi-structures V0.9)
  const structureId = typeof getCurrentStructureId === 'function' ? getCurrentStructureId() : null;
  if (structureId) {
    headers['X-Structure-Id'] = structureId.toString();
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Parse response JSON
  const data = await response.json();

  if (response.status === 401) {
    removeAuthToken();
    // Ne pas rediriger si on est déjà sur la page de login (évite rechargement en boucle)
    const isLoginPage = window.location.pathname.includes('login.html');
    if (!isLoginPage) {
      window.location.href = '/admin/login.html';
    }
    throw new Error(data.message || 'Identifiants invalides');
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `API request failed (${response.status})`);
  }

  return data;
};

// ============ AUTH API ============

const authAPI = {
  async login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(data.token);
    // Stocker les infos utilisateur incluant le rôle
    if (data.user) {
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('userRole', data.user.role || 'usager');
    }
    return data;
  },

  async register(userData) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    setAuthToken(data.token);
    return data;
  },

  async getProfile() {
    return await apiRequest('/auth/profile');
  },

  async updateProfile(updates) {
    return await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  logout() {
    removeAuthToken();
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    window.location.href = '/admin/login.html';
  }
};

// ============ ADHERENTS API ============

const adherentsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/adherents${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return await apiRequest(`/adherents/${id}`);
  },

  async getStats(id) {
    return await apiRequest(`/adherents/${id}/stats`);
  },

  async create(adherentData) {
    return await apiRequest('/adherents', {
      method: 'POST',
      body: JSON.stringify(adherentData)
    });
  },

  async update(id, updates) {
    return await apiRequest(`/adherents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async delete(id) {
    return await apiRequest(`/adherents/${id}`, {
      method: 'DELETE'
    });
  },

  // ===== Famille =====
  async getFamille(id) {
    return await apiRequest(`/adherents/${id}/famille`);
  },

  async getEnfants(id) {
    return await apiRequest(`/adherents/${id}/enfants`);
  },

  async ajouterEnfant(parentId, enfantId, typeLien = 'parent') {
    return await apiRequest(`/adherents/${parentId}/enfants`, {
      method: 'POST',
      body: JSON.stringify({ enfantId, typeLien })
    });
  },

  async retirerEnfant(parentId, enfantId) {
    return await apiRequest(`/adherents/${parentId}/enfants/${enfantId}`, {
      method: 'DELETE'
    });
  },

  async getCoutFamille(id) {
    return await apiRequest(`/adherents/${id}/famille/cout`);
  },

  async rechercherDisponibles(query, excludeId = null) {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (excludeId) params.append('exclude', excludeId);
    return await apiRequest(`/adherents/recherche/disponibles?${params.toString()}`);
  }
};

// ============ JEUX API ============

const jeuxAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/jeux${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return await apiRequest(`/jeux/${id}`);
  },

  async getCategories() {
    return await apiRequest('/jeux/categories');
  },

  async create(jeuData) {
    return await apiRequest('/jeux', {
      method: 'POST',
      body: JSON.stringify(jeuData)
    });
  },

  async update(id, updates) {
    return await apiRequest(`/jeux/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async delete(id) {
    return await apiRequest(`/jeux/${id}`, {
      method: 'DELETE'
    });
  }
};

// ============ EMPRUNTS API ============

const empruntsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/emprunts${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return await apiRequest(`/emprunts/${id}`);
  },

  async getOverdue() {
    return await apiRequest('/emprunts/overdue');
  },

  async create(empruntData) {
    return await apiRequest('/emprunts', {
      method: 'POST',
      body: JSON.stringify(empruntData)
    });
  },

  async return(id) {
    return await apiRequest(`/emprunts/${id}/retour`, {
      method: 'POST'
    });
  },

  async update(id, updates) {
    return await apiRequest(`/emprunts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async delete(id) {
    return await apiRequest(`/emprunts/${id}`, {
      method: 'DELETE'
    });
  },

  async traiterReservation(id, action) {
    return await apiRequest(`/emprunts/${id}/traiter-reservation`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  }
};

// ============ RESERVATIONS API ============

const reservationsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/reservations${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return await apiRequest(`/reservations/${id}`);
  },

  async getByUtilisateur(utilisateurId) {
    return await apiRequest(`/reservations/utilisateur/${utilisateurId}`);
  },

  async getForArticle(module, itemId) {
    return await apiRequest(`/reservations/article/${module}/${itemId}`);
  },

  async create(data) {
    return await apiRequest('/reservations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async cancel(id) {
    return await apiRequest(`/reservations/${id}`, {
      method: 'DELETE'
    });
  },

  async convertToEmprunt(id) {
    return await apiRequest(`/reservations/${id}/convertir`, {
      method: 'POST'
    });
  },

  async prolonger(id, jours = 15) {
    return await apiRequest(`/reservations/${id}/prolonger`, {
      method: 'POST',
      body: JSON.stringify({ jours })
    });
  },

  async marquerPrete(id) {
    return await apiRequest(`/reservations/${id}/marquer-prete`, {
      method: 'POST'
    });
  },

  async validerLimites(data) {
    return await apiRequest('/reservations/valider-limites', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getLimitesSummary(utilisateurId, module) {
    return await apiRequest(`/reservations/limites/${utilisateurId}/${module}`);
  }
};

// ============ STATS API ============

const statsAPI = {
  async getDashboard() {
    return await apiRequest('/stats/dashboard');
  },

  async getPopularGames(limit = 10) {
    return await apiRequest(`/stats/popular-games?limit=${limit}`);
  },

  async getActiveMembers(limit = 10) {
    return await apiRequest(`/stats/active-members?limit=${limit}`);
  },

  async getLoanDuration() {
    return await apiRequest('/stats/loan-duration');
  },

  async getMonthly(months = 12) {
    return await apiRequest(`/stats/monthly?months=${months}`);
  },

  async getCategories() {
    return await apiRequest('/stats/categories');
  }
};

// ============ COTISATIONS API ============

const cotisationsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/cotisations${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return await apiRequest(`/cotisations/${id}`);
  },

  async create(cotisationData) {
    return await apiRequest('/cotisations', {
      method: 'POST',
      body: JSON.stringify(cotisationData)
    });
  },

  async update(id, updates) {
    return await apiRequest(`/cotisations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async delete(id) {
    return await apiRequest(`/cotisations/${id}`, {
      method: 'DELETE'
    });
  },

  async verifierActive(adherentId) {
    return await apiRequest(`/cotisations/adherent/${adherentId}/active`);
  },

  async getStatistiques(annee) {
    const query = annee ? `?annee=${annee}` : '';
    return await apiRequest(`/cotisations/statistiques${query}`);
  }
};

// ============ BARCODES API ============

const barcodesAPI = {
  async scan(code) {
    return await apiRequest('/barcodes/scan', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  getAdherentImageURL(id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/barcodes/adherent/${id}/image?token=${token}`;
  },

  getJeuImageURL(id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/barcodes/jeu/${id}/image?token=${token}`;
  },

  getAdherentCardURL(id, customMessage = null) {
    const token = getAuthToken();
    let url = `${API_BASE_URL}/barcodes/adherent/${id}/card?token=${token}`;
    if (customMessage) {
      url += `&message=${encodeURIComponent(customMessage)}`;
    }
    return url;
  },

  getJeuLabelURL(id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/barcodes/jeu/${id}/label?token=${token}`;
  },

  getLivreLabelURL(id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/barcodes/livre/${id}/label?token=${token}`;
  },

  getFilmLabelURL(id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/barcodes/film/${id}/label?token=${token}`;
  },

  getDisqueLabelURL(id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/barcodes/disque/${id}/label?token=${token}`;
  },

  /**
   * Imprime la carte adherent avec verification de cotisation
   * Affiche une popup si pas de cotisation ou expiree
   */
  async printAdherentCard(id) {
    try {
      // Verifier le statut de cotisation
      const cotisationStatus = await cotisationsAPI.verifierActive(id);

      if (cotisationStatus.actif) {
        // Cotisation active, imprimer directement
        window.open(this.getAdherentCardURL(id), '_blank');
      } else {
        // Pas de cotisation ou expiree, afficher popup
        this.showCotisationWarningPopup(id, cotisationStatus);
      }
    } catch (error) {
      console.error('Erreur verification cotisation:', error);
      // En cas d'erreur, proposer quand meme d'imprimer
      this.showCotisationWarningPopup(id, { actif: false, message: 'Impossible de verifier la cotisation' });
    }
  },

  /**
   * Affiche la popup d'avertissement cotisation
   */
  showCotisationWarningPopup(adherentId, cotisationStatus) {
    // Verifier si SweetAlert2 est disponible
    if (typeof Swal === 'undefined') {
      // Fallback sans SweetAlert2
      const message = cotisationStatus.message || 'Aucune cotisation active';
      const customMsg = prompt(
        `ATTENTION: ${message}\n\nVoulez-vous imprimer quand meme ?\n\nEntrez un message personnalise (optionnel) ou laissez vide:`,
        ''
      );
      if (customMsg !== null) {
        window.open(this.getAdherentCardURL(adherentId, customMsg || null), '_blank');
      }
      return;
    }

    // Utiliser SweetAlert2
    Swal.fire({
      title: 'Attention - Cotisation',
      html: `
        <div class="text-start">
          <div class="alert alert-warning mb-3">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>${cotisationStatus.message || 'Aucune cotisation active pour cet adherent'}</strong>
          </div>
          <p>Voulez-vous imprimer la carte quand meme ?</p>
          <div class="mb-3">
            <label for="swal-custom-message" class="form-label">
              Message personnalise (optionnel) :
            </label>
            <input type="text" id="swal-custom-message" class="form-control"
                   placeholder="Ex: Cotisation en attente, Invite...">
            <small class="text-muted">Ce message remplacera l'indication de cotisation sur la carte</small>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="bi bi-printer"></i> Imprimer quand meme',
      cancelButtonText: 'Annuler',
      preConfirm: () => {
        return document.getElementById('swal-custom-message').value || null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const customMessage = result.value;
        window.open(this.getAdherentCardURL(adherentId, customMessage), '_blank');
      }
    });
  },

  async printJeuLabel(id) {
    window.open(this.getJeuLabelURL(id), '_blank');
  },

  async printLivreLabel(id) {
    window.open(this.getLivreLabelURL(id), '_blank');
  },

  async printFilmLabel(id) {
    window.open(this.getFilmLabelURL(id), '_blank');
  },

  async printDisqueLabel(id) {
    window.open(this.getDisqueLabelURL(id), '_blank');
  },

  async printBatchCards(ids) {
    return await apiRequest('/barcodes/adherents/batch', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }
};

/**
 * Import API
 */
const importAPI = {
  async getFields() {
    return await apiRequest('/import/jeux/fields');
  },

  async previewJeux(file, separator = ';') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('separator', separator);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/import/jeux/preview`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur preview');
    }

    return await response.json();
  },

  async importJeux(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('separator', options.separator || ';');
    formData.append('skipDuplicates', options.skipDuplicates ? 'true' : 'false');
    formData.append('updateExisting', options.updateExisting ? 'true' : 'false');
    if (options.mapping) {
      formData.append('mapping', JSON.stringify(options.mapping));
    }

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/import/jeux`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur import');
    }

    return await response.json();
  },

  // ==================== IMPORT PAR LISTES MYLUDO ====================

  async previewJeuxListes(file, separator = ';') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('separator', separator);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/import/jeux-listes/preview`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur preview');
    }

    return await response.json();
  },

  async importJeuxListes(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('separator', options.separator || ';');
    if (options.mapping) {
      formData.append('mapping', JSON.stringify(options.mapping));
    }

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/import/jeux-listes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur import');
    }

    return await response.json();
  }
};

/**
 * Lookup EAN API
 * Recherche d'infos jeu via code-barre EAN ou titre
 */
const lookupAPI = {
  /**
   * Recherche par code EAN/ISBN
   * @param {string} code - Code EAN/UPC/ISBN
   * @param {string} collection - Type de collection ('jeu', 'livre', 'film', 'disque' ou auto)
   * @returns {Promise<Object>} - Infos de l'article trouve
   */
  async byEAN(code, collection = 'jeu') {
    return await apiRequest('/lookup/ean', {
      method: 'POST',
      body: JSON.stringify({ code, collection })
    });
  },

  /**
   * Recherche par titre
   * @param {string} title - Titre a rechercher
   * @param {string} collection - Type de collection ('jeu', 'livre', 'film', 'disque')
   * @returns {Promise<Object>} - Infos de l'article trouve
   */
  async byTitle(title, collection = 'jeu') {
    return await apiRequest('/lookup/title', {
      method: 'POST',
      body: JSON.stringify({ title, collection })
    });
  },

  /**
   * Recherche automatique (detecte si c'est un code ou un titre)
   * @param {string} query - Code ou titre a rechercher
   * @param {string} collection - Type de collection (optionnel)
   * @returns {Promise<Object>} - Infos de l'article trouve
   */
  async search(query, collection = null) {
    return await apiRequest('/lookup/search', {
      method: 'POST',
      body: JSON.stringify({ query, collection })
    });
  },

  /**
   * Detecte le type de code (EAN, ISBN-10, ISBN-13, UPC)
   * @param {string} code - Code a analyser
   * @returns {Promise<Object>} - Type detecte et collection suggeree
   */
  async detectCode(code) {
    return await apiRequest(`/lookup/detect/${encodeURIComponent(code)}`);
  },

  /**
   * Statistiques du cache (admin)
   * @returns {Promise<Object>} - Stats du cache
   */
  async getCacheStats() {
    return await apiRequest('/lookup/cache/stats');
  },

  /**
   * Vide le cache (admin)
   * @returns {Promise<Object>} - Confirmation
   */
  async clearCache() {
    return await apiRequest('/lookup/cache', { method: 'DELETE' });
  }
};

// ============ REFERENTIELS API ============

/**
 * API pour la gestion des tables de reference (categories, themes, editeurs, etc.)
 */
const referentielsAPI = {
  // ---- Helper generique ----
  async _getAll(type, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/referentiels/${type}${query ? '?' + query : ''}`);
  },

  async _getById(type, id) {
    return await apiRequest(`/referentiels/${type}/${id}`);
  },

  async _create(type, data) {
    return await apiRequest(`/referentiels/${type}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async _update(type, id, data) {
    return await apiRequest(`/referentiels/${type}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async _delete(type, id) {
    return await apiRequest(`/referentiels/${type}/${id}`, {
      method: 'DELETE'
    });
  },

  async _toggle(type, id) {
    return await apiRequest(`/referentiels/${type}/${id}/toggle`, {
      method: 'PATCH'
    });
  },

  async _search(type, query, limit = 20) {
    return await apiRequest(`/referentiels/${type}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  // ---- Stats globales ----
  async getStats() {
    return await apiRequest('/referentiels/stats');
  },

  // ---- Categories ----
  async getCategories(params = {}) { return this._getAll('categories', params); },
  async getCategorieById(id) { return this._getById('categories', id); },
  async createCategorie(data) { return this._create('categories', data); },
  async updateCategorie(id, data) { return this._update('categories', id, data); },
  async deleteCategorie(id) { return this._delete('categories', id); },
  async toggleCategorie(id) { return this._toggle('categories', id); },
  async searchCategories(q) { return this._search('categories', q); },

  // ---- Themes ----
  async getThemes(params = {}) { return this._getAll('themes', params); },
  async getThemeById(id) { return this._getById('themes', id); },
  async createTheme(data) { return this._create('themes', data); },
  async updateTheme(id, data) { return this._update('themes', id, data); },
  async deleteTheme(id) { return this._delete('themes', id); },
  async toggleTheme(id) { return this._toggle('themes', id); },
  async searchThemes(q) { return this._search('themes', q); },

  // ---- Mecanismes ----
  async getMecanismes(params = {}) { return this._getAll('mecanismes', params); },
  async getMecanismeById(id) { return this._getById('mecanismes', id); },
  async createMecanisme(data) { return this._create('mecanismes', data); },
  async updateMecanisme(id, data) { return this._update('mecanismes', id, data); },
  async deleteMecanisme(id) { return this._delete('mecanismes', id); },
  async toggleMecanisme(id) { return this._toggle('mecanismes', id); },
  async searchMecanismes(q) { return this._search('mecanismes', q); },

  // ---- Langues ----
  async getLangues(params = {}) { return this._getAll('langues', params); },
  async getLangueById(id) { return this._getById('langues', id); },
  async createLangue(data) { return this._create('langues', data); },
  async updateLangue(id, data) { return this._update('langues', id, data); },
  async deleteLangue(id) { return this._delete('langues', id); },
  async toggleLangue(id) { return this._toggle('langues', id); },
  async searchLangues(q) { return this._search('langues', q); },

  // ---- Editeurs ----
  async getEditeurs(params = {}) { return this._getAll('editeurs', params); },
  async getEditeurById(id) { return this._getById('editeurs', id); },
  async createEditeur(data) { return this._create('editeurs', data); },
  async updateEditeur(id, data) { return this._update('editeurs', id, data); },
  async deleteEditeur(id) { return this._delete('editeurs', id); },
  async toggleEditeur(id) { return this._toggle('editeurs', id); },
  async searchEditeurs(q) { return this._search('editeurs', q); },

  // ---- Auteurs ----
  async getAuteurs(params = {}) { return this._getAll('auteurs', params); },
  async getAuteurById(id) { return this._getById('auteurs', id); },
  async createAuteur(data) { return this._create('auteurs', data); },
  async updateAuteur(id, data) { return this._update('auteurs', id, data); },
  async deleteAuteur(id) { return this._delete('auteurs', id); },
  async toggleAuteur(id) { return this._toggle('auteurs', id); },
  async searchAuteurs(q) { return this._search('auteurs', q); },

  // ---- Illustrateurs ----
  async getIllustrateurs(params = {}) { return this._getAll('illustrateurs', params); },
  async getIllustrateurById(id) { return this._getById('illustrateurs', id); },
  async createIllustrateur(data) { return this._create('illustrateurs', data); },
  async updateIllustrateur(id, data) { return this._update('illustrateurs', id, data); },
  async deleteIllustrateur(id) { return this._delete('illustrateurs', id); },
  async toggleIllustrateur(id) { return this._toggle('illustrateurs', id); },
  async searchIllustrateurs(q) { return this._search('illustrateurs', q); },

  // ---- Gammes ----
  async getGammes(params = {}) { return this._getAll('gammes', params); },
  async getGammeById(id) { return this._getById('gammes', id); },
  async createGamme(data) { return this._create('gammes', data); },
  async updateGamme(id, data) { return this._update('gammes', id, data); },
  async deleteGamme(id) { return this._delete('gammes', id); },
  async toggleGamme(id) { return this._toggle('gammes', id); },
  async searchGammes(q) { return this._search('gammes', q); },

  // ---- Emplacements ----
  async getEmplacements(params = {}) { return this._getAll('emplacements', params); },
  async getEmplacementById(id) { return this._getById('emplacements', id); },
  async createEmplacement(data) { return this._create('emplacements', data); },
  async updateEmplacement(id, data) { return this._update('emplacements', id, data); },
  async deleteEmplacement(id) { return this._delete('emplacements', id); },
  async toggleEmplacement(id) { return this._toggle('emplacements', id); },
  async searchEmplacements(q) { return this._search('emplacements', q); },

  // ---- Helpers pour affichage ----

  /**
   * Extrait les IDs d'un tableau d'objets
   */
  extractIds(items) {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => item.id);
  },

  /**
   * Formate un tableau d'objets en string (noms separes par virgule)
   */
  formatNames(items, field = 'nom') {
    if (!items || !Array.isArray(items)) return '';
    return items.map(item => item[field]).filter(n => n).join(', ');
  },

  /**
   * Genere les badges HTML pour une liste d'items
   */
  formatBadges(items, colorField = 'couleur', defaultColor = '#6c757d') {
    if (!items || !Array.isArray(items) || items.length === 0) return '-';
    return items.map(item => {
      const color = item[colorField] || defaultColor;
      const icon = item.icone ? `<i class="bi bi-${item.icone} me-1"></i>` : '';
      return `<span class="badge" style="background-color:${color}">${icon}${item.nom}</span>`;
    }).join(' ');
  },

  /**
   * Méthode générique pour obtenir tous les items d'un type
   */
  async getAll(type, params = {}) {
    return this._getAll(type, params);
  }
};

// ============ LIVRES API ============

const livresAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/livres${query ? '?' + query : ''}`);
  },

  async getById(id) {
    const result = await apiRequest(`/livres/${id}`);
    return result.livre || result;
  },

  async create(livreData) {
    return await apiRequest('/livres', {
      method: 'POST',
      body: JSON.stringify(livreData)
    });
  },

  async update(id, updates) {
    return await apiRequest(`/livres/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async delete(id) {
    return await apiRequest(`/livres/${id}`, {
      method: 'DELETE'
    });
  },

  // Référentiels spécifiques aux livres
  async getGenres() {
    return await apiRequest('/livres/genres');
  },

  async getFormats() {
    return await apiRequest('/livres/formats');
  },

  async getCollections() {
    return await apiRequest('/livres/collections');
  },

  async getEmplacements() {
    return await apiRequest('/livres/emplacements');
  },

  async getRolesContributeurs() {
    return await apiRequest('/livres/roles-contributeurs');
  },

  async getStats() {
    return await apiRequest('/livres/stats');
  },

  // CRUD pour les referentiels
  async createGenre(data) {
    return await apiRequest('/livres/referentiels/genres', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createCollection(data) {
    return await apiRequest('/livres/referentiels/collections', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createEditeur(data) {
    return await apiRequest('/livres/referentiels/editeurs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ============ FILMS API ============

const filmsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/films${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return await apiRequest(`/films/${id}`);
  },

  async create(filmData) {
    return await apiRequest('/films', {
      method: 'POST',
      body: JSON.stringify(filmData)
    });
  },

  async update(id, updates) {
    return await apiRequest(`/films/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async delete(id) {
    return await apiRequest(`/films/${id}`, {
      method: 'DELETE'
    });
  },

  // Référentiels spécifiques aux films
  async getGenres() {
    return await apiRequest('/films/referentiels/genres');
  },

  async getSupports() {
    return await apiRequest('/films/referentiels/supports');
  },

  async getEmplacements() {
    return await apiRequest('/films/referentiels/emplacements');
  },

  async getRealisateurs(search = '') {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return await apiRequest(`/films/referentiels/realisateurs${params}`);
  },

  async getActeurs(search = '') {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return await apiRequest(`/films/referentiels/acteurs${params}`);
  },

  async getStudios() {
    return await apiRequest('/films/referentiels/studios');
  },

  async getStats() {
    return await apiRequest('/films/stats');
  },

  // CRUD pour les référentiels
  async createGenre(data) {
    return await apiRequest('/films/referentiels/genres', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createRealisateur(data) {
    return await apiRequest('/films/referentiels/realisateurs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createActeur(data) {
    return await apiRequest('/films/referentiels/acteurs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createStudio(data) {
    return await apiRequest('/films/referentiels/studios', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ============ DISQUES API ============

const disquesAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/disques${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return await apiRequest(`/disques/${id}`);
  },

  async create(disqueData) {
    return await apiRequest('/disques', {
      method: 'POST',
      body: JSON.stringify(disqueData)
    });
  },

  async update(id, updates) {
    return await apiRequest(`/disques/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async delete(id) {
    return await apiRequest(`/disques/${id}`, {
      method: 'DELETE'
    });
  },

  // Referentiels specifiques aux disques
  async getGenres() {
    return await apiRequest('/disques/referentiels/genres');
  },

  async getFormats() {
    return await apiRequest('/disques/referentiels/formats');
  },

  async getLabels(search = '') {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return await apiRequest(`/disques/referentiels/labels${params}`);
  },

  async getEmplacements() {
    return await apiRequest('/disques/referentiels/emplacements');
  },

  async getArtistes(search = '') {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return await apiRequest(`/disques/referentiels/artistes${params}`);
  },

  async getStats() {
    return await apiRequest('/disques/stats');
  },

  // CRUD pour les referentiels
  async createArtiste(data) {
    return await apiRequest('/disques/referentiels/artistes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createLabel(data) {
    return await apiRequest('/disques/referentiels/labels', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createGenre(data) {
    return await apiRequest('/disques/referentiels/genres', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ============ API ADMIN (generic helper) ============

/**
 * Helper generique pour les appels API
 * Usage: apiAdmin.get('/endpoint'), apiAdmin.post('/endpoint', data), etc.
 */
const apiAdmin = {
  async get(endpoint) {
    return await apiRequest(endpoint);
  },

  async post(endpoint, data = {}) {
    return await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async put(endpoint, data = {}) {
    return await apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async patch(endpoint, data = {}) {
    return await apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async delete(endpoint) {
    return await apiRequest(endpoint, {
      method: 'DELETE'
    });
  }
};

// ============ EXEMPLAIRES API ============

/**
 * API pour la gestion des exemplaires (copies multiples d'articles)
 */
const exemplairesAPI = {
  /**
   * Liste tous les exemplaires d'un article
   * @param {string} module - 'jeux', 'livres', 'films', 'disques'
   * @param {number} articleId - ID de l'article
   */
  async getByArticle(module, articleId) {
    return await apiRequest(`/${module}/${articleId}/exemplaires`);
  },

  /**
   * Statistiques des exemplaires d'un article
   */
  async getStats(module, articleId) {
    return await apiRequest(`/${module}/${articleId}/exemplaires/stats`);
  },

  /**
   * Exemplaires disponibles uniquement
   */
  async getDisponibles(module, articleId) {
    return await apiRequest(`/${module}/${articleId}/exemplaires/disponibles`);
  },

  /**
   * Recuperer un exemplaire par ID
   * @param {string} moduleSingular - 'jeu', 'livre', 'film', 'disque'
   */
  async getById(moduleSingular, exemplaireId) {
    return await apiRequest(`/exemplaires/${moduleSingular}/${exemplaireId}`);
  },

  /**
   * Creer un nouvel exemplaire
   * @param {string} module - 'jeux', 'livres', 'films', 'disques'
   */
  async create(module, articleId, data) {
    return await apiRequest(`/${module}/${articleId}/exemplaires`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Modifier un exemplaire
   * @param {string} moduleSingular - 'jeu', 'livre', 'film', 'disque'
   */
  async update(moduleSingular, exemplaireId, data) {
    return await apiRequest(`/exemplaires/${moduleSingular}/${exemplaireId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Supprimer un exemplaire
   */
  async delete(moduleSingular, exemplaireId) {
    return await apiRequest(`/exemplaires/${moduleSingular}/${exemplaireId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Rechercher par code-barre (tous modules)
   */
  async findByBarcode(codeBarre) {
    return await apiRequest(`/exemplaires/by-barcode/${codeBarre}`);
  },

  /**
   * Assigner un code-barre a un exemplaire
   */
  async assignBarcode(moduleSingular, exemplaireId, codeBarre) {
    return await apiRequest('/exemplaires/assign-barcode', {
      method: 'POST',
      body: JSON.stringify({ module: moduleSingular, exemplaireId, codeBarre })
    });
  }
};
