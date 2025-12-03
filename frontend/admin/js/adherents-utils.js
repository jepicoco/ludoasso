// ============================================
// Utilitaires pour la gestion des adhérents
// ============================================

// ============================================
// API EXTERNE FICTIVE (à remplacer par vraie API)
// ============================================

/**
 * Recherche un adhérent dans le système externe
 * @param {string} numeroAdherent - Numéro d'adhérent externe
 * @returns {Promise<Object|null>}
 */
async function rechercherAdherentExterne(numeroAdherent) {
  // TODO: Remplacer par vraie API
  // const response = await fetch(`https://api-externe.ludotheque.fr/adherents/${numeroAdherent}`);
  // return await response.json();

  // Simulation pour dev
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simuler une réponse API
      if (numeroAdherent === 'TEST123') {
        resolve({
          numero: 'TEST123',
          nom: 'Dupont',
          prenom: 'Jean',
          email: 'jean.dupont@example.com',
          telephone: '+33612345678',
          adresse: '15 rue de la République',
          code_postal: '75001',
          ville: 'Paris',
          date_naissance: '1985-03-15',
          photo_url: 'https://i.pravatar.cc/150?img=12',
          adhesion_association: true
        });
      } else {
        resolve(null);
      }
    }, 500);
  });
}

// ============================================
// SYSTÈME DE TOASTS
// ============================================

let toastContainer = null;

function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }
}

/**
 * Affiche un toast de notification
 * @param {string} message - Message à afficher
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 */
function showToast(message, type = 'info') {
  initToastContainer();

  const bgColors = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-info'
  };

  const icons = {
    success: 'bi-check-circle',
    error: 'bi-x-circle',
    warning: 'bi-exclamation-triangle',
    info: 'bi-info-circle'
  };

  const toastId = 'toast-' + Date.now();
  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center text-white ${bgColors[type] || 'bg-info'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi ${icons[type] || 'bi-info-circle'} me-2"></i>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML('beforeend', toastHTML);

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
  toast.show();

  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

// ============================================
// VALIDATIONS
// ============================================

/**
 * Valide un email
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Valide un numéro de téléphone français
 */
function validatePhone(phone) {
  // Supprimer tous les espaces et caractères non numériques sauf +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Accepter format international +33... ou format local 0...
  return /^(\+33|0)[1-9]\d{8}$/.test(cleaned);
}

/**
 * Calcule la force d'un mot de passe
 * @returns {Object} { score: 0-4, label: string, class: string }
 */
function calculatePasswordStrength(password) {
  let score = 0;

  if (!password) return { score: 0, label: 'Aucun', class: 'bg-secondary' };

  // Longueur
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexité
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const classes = ['bg-danger', 'bg-warning', 'bg-info', 'bg-success', 'bg-success'];

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    class: classes[Math.min(score, 4)]
  };
}

/**
 * Affiche la validation d'un champ
 */
function showFieldValidation(inputId, isValid, message = '') {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.classList.remove('is-valid', 'is-invalid');

  // Supprimer anciens feedbacks
  const parent = input.parentElement;
  parent.querySelectorAll('.valid-feedback, .invalid-feedback').forEach(el => el.remove());

  if (isValid === null) {
    return; // Reset
  }

  if (isValid) {
    input.classList.add('is-valid');
    if (message) {
      const feedback = document.createElement('div');
      feedback.className = 'valid-feedback';
      feedback.textContent = message;
      parent.appendChild(feedback);
    }
  } else {
    input.classList.add('is-invalid');
    if (message) {
      const feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      feedback.textContent = message;
      parent.appendChild(feedback);
    }
  }
}

// ============================================
// FORMATAGE TÉLÉPHONE
// ============================================

/**
 * Formate un numéro de téléphone français
 */
function formatPhoneNumber(value) {
  // Supprimer tout sauf chiffres et +
  let cleaned = value.replace(/[^\d+]/g, '');

  // Si commence par 0, convertir en +33
  if (cleaned.startsWith('0')) {
    cleaned = '+33' + cleaned.substring(1);
  }

  // Si commence par 33 sans +, ajouter +
  if (cleaned.startsWith('33') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  // Formater +33 6 12 34 56 78
  if (cleaned.startsWith('+33') && cleaned.length === 12) {
    return cleaned.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
  }

  return cleaned;
}

/**
 * Configure le formatage automatique sur un champ téléphone
 */
function setupPhoneFormatting(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', (e) => {
    const cursorPos = e.target.selectionStart;
    const oldLength = e.target.value.length;

    e.target.value = formatPhoneNumber(e.target.value);

    const newLength = e.target.value.length;
    const newCursorPos = cursorPos + (newLength - oldLength);
    e.target.setSelectionRange(newCursorPos, newCursorPos);
  });

  input.addEventListener('blur', () => {
    const phone = input.value.trim();
    if (phone && !validatePhone(phone)) {
      showFieldValidation(inputId, false, 'Numéro de téléphone invalide');
    } else if (phone) {
      showFieldValidation(inputId, true);
    }
  });
}

// ============================================
// GÉNÉRATEUR DE MOT DE PASSE
// ============================================

/**
 * Génère un mot de passe sécurisé
 */
function generateSecurePassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  const all = lowercase + uppercase + numbers + special;

  let password = '';

  // Garantir au moins un de chaque type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Compléter avec caractères aléatoires
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Mélanger
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Configure le bouton de génération de mot de passe
 */
function setupPasswordGenerator(inputId, buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.addEventListener('click', () => {
    const input = document.getElementById(inputId);
    if (!input) return;

    const password = generateSecurePassword(12);
    input.value = password;
    input.type = 'text'; // Afficher temporairement

    // Déclencher validation
    input.dispatchEvent(new Event('input'));

    showToast('Mot de passe généré et copié', 'success');

    // Copier dans le presse-papiers
    navigator.clipboard.writeText(password).catch(err => {
      console.error('Erreur copie presse-papiers:', err);
    });

    // Cacher après 3 secondes
    setTimeout(() => {
      if (input.type === 'text') {
        input.type = 'password';
      }
    }, 3000);
  });
}

/**
 * Configure le bouton toggle affichage mot de passe
 */
function setupPasswordToggle(inputId, buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.addEventListener('click', () => {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
      input.type = 'password';
      button.innerHTML = '<i class="bi bi-eye"></i>';
    }
  });
}

// ============================================
// UTILITAIRES DIVERS
// ============================================

/**
 * Calcule l'âge à partir d'une date de naissance
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Exporte une liste d'adhérents en CSV
 */
function exportToCSV(adherents, filename) {
  const headers = [
    'Code-barre', 'Nom', 'Prénom', 'Email', 'Téléphone',
    'Adresse', 'Code postal', 'Ville', 'Date naissance',
    'Statut', 'Rôle', 'Membre association', 'Date adhésion', 'Notes'
  ];

  const rows = adherents.map(a => [
    a.code_barre || '',
    a.nom || '',
    a.prenom || '',
    a.email || '',
    a.telephone || '',
    a.adresse || '',
    a.code_postal || '',
    a.ville || '',
    a.date_naissance || '',
    a.statut || '',
    a.role || '',
    a.adhesion_association ? 'Oui' : 'Non',
    a.date_adhesion || '',
    a.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Ajouter BOM UTF-8 pour Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
}

// ============================================
// TRI
// ============================================

let sortState = {
  column: 'nom',
  direction: 'asc'
};

/**
 * Trie une liste d'adhérents par colonne
 */
function sortAdherents(adherents, column) {
  // Toggle direction si même colonne
  if (sortState.column === column) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.column = column;
    sortState.direction = 'asc';
  }

  const sorted = [...adherents].sort((a, b) => {
    let valA = a[column];
    let valB = b[column];

    // Gestion valeurs nulles
    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    // Conversion en minuscules pour tri texte
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Retourne l'icône de tri pour une colonne
 */
function getSortIcon(column) {
  if (sortState.column !== column) {
    return '<i class="bi bi-arrow-down-up text-muted"></i>';
  }
  return sortState.direction === 'asc'
    ? '<i class="bi bi-arrow-up"></i>'
    : '<i class="bi bi-arrow-down"></i>';
}
