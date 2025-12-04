/**
 * API Client for Ludothèque Admin Interface
 */

const API_BASE_URL = 'http://localhost:3000/api';

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

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    removeAuthToken();
    window.location.href = '/admin/login.html';
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
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
  }
};

/**
 * Lookup EAN API
 * Recherche d'infos jeu via code-barre EAN ou titre
 */
const lookupAPI = {
  /**
   * Recherche un jeu par son code EAN
   * @param {string} ean - Code EAN/UPC
   * @returns {Promise<Object>} - Infos du jeu trouve
   */
  async byEAN(ean) {
    return await apiRequest('/jeux/lookup-ean', {
      method: 'POST',
      body: JSON.stringify({ ean })
    });
  },

  /**
   * Recherche un jeu par son titre sur BGG
   * @param {string} title - Titre du jeu
   * @returns {Promise<Object>} - Infos du jeu trouve
   */
  async byTitle(title) {
    return await apiRequest('/jeux/lookup-ean', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }
};
