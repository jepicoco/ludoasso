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

  getAdherentCardURL(id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/barcodes/adherent/${id}/card?token=${token}`;
  },

  getJeuLabelURL(id) {
    const token = getAuthToken();
    return `${API_BASE_URL}/barcodes/jeu/${id}/label?token=${token}`;
  },

  async printAdherentCard(id) {
    window.open(this.getAdherentCardURL(id), '_blank');
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
