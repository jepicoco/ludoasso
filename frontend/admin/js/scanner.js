/**
 * Scanner Ludotheque - Gestion des emprunts/retours par code-barre
 * Utilise html5-qrcode pour le scanning webcam
 */

// State
let html5QrCode = null;
let currentAdherent = null;
let scanHistory = [];
let cameras = [];
let currentCameraIndex = 0;
let isScanning = false;
let lastScannedCode = null;
let lastScanTime = 0;

// Config
const SCAN_COOLDOWN = 2000; // 2 secondes entre chaque scan du meme code
const DEFAULT_LOAN_DAYS = 14;
const BARCODE_SCANNER_TIMEOUT = 100; // Timeout pour detecter fin de saisie douchette (ms)

// Douchette USB - Buffer pour capturer les caracteres rapides
let barcodeBuffer = '';
let barcodeTimeout = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  // Verifier l'authentification
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }

  // Charger l'historique depuis localStorage
  loadHistory();

  // Initialiser le scanner webcam
  await initScanner();

  // Initialiser le listener pour douchette USB
  initBarcodeScanner();

  // Event listener pour la saisie manuelle
  document.getElementById('manual-code').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitManualCode();
    }
  });
});

/**
 * Initialise le listener global pour douchette USB
 * Les douchettes envoient les caracteres comme un clavier rapide
 * et terminent par "Enter"
 */
function initBarcodeScanner() {
  document.addEventListener('keydown', handleBarcodeKeydown);
  console.log('[Scanner] Douchette USB activee - Pret a scanner');
}

/**
 * Gere les touches clavier pour detecter une douchette USB
 * - Accumule les caracteres rapides dans un buffer
 * - Traite le code quand "Enter" est detecte
 * - Reset apres un timeout si pas d'Enter
 */
function handleBarcodeKeydown(e) {
  // Ignorer si on est dans un champ de saisie (sauf si c'est Enter sur buffer plein)
  const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

  // Si modal ouverte, laisser la saisie manuelle gerer
  const modalOpen = document.querySelector('.modal.show');
  if (modalOpen && isInputField) {
    return;
  }

  // Si c'est Enter et qu'on a un buffer
  if (e.key === 'Enter' && barcodeBuffer.length >= 3) {
    e.preventDefault();
    const code = barcodeBuffer.trim().toUpperCase();
    barcodeBuffer = '';
    clearTimeout(barcodeTimeout);

    console.log('[Douchette] Code recu:', code);
    processBarcode(code);
    return;
  }

  // Caracteres valides pour code-barre (lettres, chiffres, tirets)
  if (e.key.length === 1 && /[a-zA-Z0-9\-]/.test(e.key)) {
    // Si on n'est pas dans un input, capturer le caractere
    if (!isInputField) {
      e.preventDefault();
    }

    barcodeBuffer += e.key;

    // Reset le timeout
    clearTimeout(barcodeTimeout);
    barcodeTimeout = setTimeout(() => {
      // Si le buffer n'est pas traite par Enter, le vider
      if (barcodeBuffer.length > 0) {
        console.log('[Douchette] Timeout - buffer efface:', barcodeBuffer);
        barcodeBuffer = '';
      }
    }, BARCODE_SCANNER_TIMEOUT);
  }
}

async function initScanner() {
  try {
    // Creer l'instance html5-qrcode
    html5QrCode = new Html5Qrcode("reader");

    // Recuperer les cameras disponibles
    cameras = await Html5Qrcode.getCameras();

    if (cameras && cameras.length > 0) {
      // Preferer la camera arriere si disponible
      const backCamera = cameras.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('arriere') ||
        c.label.toLowerCase().includes('rear')
      );

      if (backCamera) {
        currentCameraIndex = cameras.indexOf(backCamera);
      }

      await startScanning();
    } else {
      updateStatus('Aucune camera detectee', 'error');
    }
  } catch (err) {
    console.error('Erreur initialisation scanner:', err);
    updateStatus('Erreur: ' + err.message, 'error');
  }
}

async function startScanning() {
  if (isScanning) return;

  try {
    const camera = cameras[currentCameraIndex];

    await html5QrCode.start(
      camera.id,
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.5
      },
      onScanSuccess,
      onScanError
    );

    isScanning = true;
    updateStatus('En attente de scan...', 'scanning');
  } catch (err) {
    console.error('Erreur demarrage scanner:', err);
    updateStatus('Erreur camera: ' + err.message, 'error');
  }
}

async function stopScanning() {
  if (!isScanning) return;

  try {
    await html5QrCode.stop();
    isScanning = false;
  } catch (err) {
    console.error('Erreur arret scanner:', err);
  }
}

// ==================== SCAN HANDLING ====================

async function onScanSuccess(decodedText, decodedResult) {
  // Eviter les scans multiples du meme code
  const now = Date.now();
  if (decodedText === lastScannedCode && (now - lastScanTime) < SCAN_COOLDOWN) {
    return;
  }

  lastScannedCode = decodedText;
  lastScanTime = now;

  console.log('Code scanne:', decodedText);
  await processBarcode(decodedText);
}

function onScanError(errorMessage) {
  // Erreurs normales de scan (pas de code visible) - ignorer
}

async function processBarcode(code) {
  updateStatus('Verification...', 'scanning');

  try {
    // Appeler l'API pour valider le code-barre
    const response = await barcodesAPI.scan(code);

    if (response.type === 'adherent') {
      await handleAdherentScan(response);
    } else if (response.type === 'jeu') {
      await handleJeuScan(response);
    } else {
      throw new Error('Type de code-barre inconnu');
    }
  } catch (error) {
    console.error('Erreur scan:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur: ' + (error.message || 'Code invalide'), 'error');
    addToHistory('error', 'Erreur', error.message || 'Code invalide', code);
  }
}

async function handleAdherentScan(response) {
  const adherent = response.adherent;

  // Verifier le statut
  if (adherent.statut !== 'actif') {
    playSound('error');
    flashZone('error');
    updateStatus(`Adherent ${adherent.statut}`, 'error');
    addToHistory('error', 'Adherent non actif', `${adherent.prenom} ${adherent.nom} - Statut: ${adherent.statut}`, response.code);
    return;
  }

  // Selectionner l'adherent
  currentAdherent = adherent;
  displayAdherent(adherent);
  playSound('success');
  flashZone('success');
  updateStatus(`Adherent: ${adherent.prenom} ${adherent.nom}`, 'success');
  addToHistory('info', 'Adherent selectionne', `${adherent.prenom} ${adherent.nom}`, response.code);
}

async function handleJeuScan(response) {
  const jeu = response.jeu;

  if (jeu.statut === 'disponible') {
    // Creer un emprunt
    await createEmprunt(jeu);
  } else if (jeu.statut === 'emprunte') {
    // Effectuer un retour
    await processRetour(jeu);
  } else {
    playSound('error');
    flashZone('error');
    updateStatus(`Jeu en ${jeu.statut}`, 'error');
    addToHistory('error', 'Jeu non disponible', `${jeu.titre} - Statut: ${jeu.statut}`, response.code);
  }
}

async function createEmprunt(jeu) {
  if (!currentAdherent) {
    // Ouvrir la recherche d'adherent avec le jeu en attente
    playSound('error');
    updateStatus('Selectionnez un adherent pour emprunter', 'error');
    addToHistory('info', 'Adherent requis', `Emprunt de "${jeu.titre}" - Selection adherent...`, jeu.code_barre);

    // Ouvrir la modal de recherche avec le jeu en attente
    openSearchAdherent(jeu);
    return;
  }

  try {
    // Calculer la date de retour prevue
    const dateRetour = new Date();
    dateRetour.setDate(dateRetour.getDate() + DEFAULT_LOAN_DAYS);

    // Creer l'emprunt via API
    const emprunt = await empruntsAPI.create({
      adherent_id: currentAdherent.id,
      jeu_id: jeu.id,
      date_retour_prevue: dateRetour.toISOString().split('T')[0]
    });

    playSound('success');
    flashZone('success');
    updateStatus(`Emprunt cree: ${jeu.titre}`, 'success');
    addToHistory('success', 'Emprunt', `${jeu.titre} → ${currentAdherent.prenom} ${currentAdherent.nom}`, jeu.code_barre);

  } catch (error) {
    console.error('Erreur creation emprunt:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur emprunt: ' + (error.message || 'Erreur inconnue'), 'error');
    addToHistory('error', 'Erreur emprunt', error.message || 'Erreur inconnue', jeu.code_barre);
  }
}

async function processRetour(jeu) {
  try {
    // Trouver l'emprunt en cours pour ce jeu
    const emprunts = await empruntsAPI.getAll({ jeu_id: jeu.id, statut: 'en_cours' });

    if (!emprunts.emprunts || emprunts.emprunts.length === 0) {
      throw new Error('Aucun emprunt en cours trouve pour ce jeu');
    }

    const emprunt = emprunts.emprunts[0];
    const adherentNom = emprunt.adherent ? `${emprunt.adherent.prenom} ${emprunt.adherent.nom}` : 'Inconnu';

    // Effectuer le retour
    await empruntsAPI.return(emprunt.id);

    playSound('success');
    flashZone('success');
    updateStatus(`Retour: ${jeu.titre}`, 'success');
    addToHistory('success', 'Retour', `${jeu.titre} (${adherentNom})`, jeu.code_barre);

  } catch (error) {
    console.error('Erreur retour:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur retour: ' + (error.message || 'Erreur inconnue'), 'error');
    addToHistory('error', 'Erreur retour', error.message || 'Erreur inconnue', jeu.code_barre);
  }
}

// ==================== UI FUNCTIONS ====================

function displayAdherent(adherent) {
  const container = document.getElementById('adherent-display');
  const initials = (adherent.prenom[0] + adherent.nom[0]).toUpperCase();
  const badgeClass = `badge-${adherent.statut}`;

  container.innerHTML = `
    <div class="adherent-info">
      <div class="adherent-avatar">${initials}</div>
      <div class="adherent-details">
        <h4>${adherent.prenom} ${adherent.nom}</h4>
        <p>${adherent.email || 'Pas d\'email'}</p>
        <span class="badge-statut ${badgeClass}">${adherent.statut}</span>
      </div>
      <button class="btn-clear-adherent" onclick="clearAdherent()">
        <i class="bi bi-x-lg"></i> Retirer
      </button>
    </div>
  `;
}

function clearAdherent() {
  currentAdherent = null;
  document.getElementById('adherent-display').innerHTML = `
    <div class="adherent-placeholder">
      <i class="bi bi-person-plus"></i>
      <p>Scannez la carte d'un adherent pour commencer</p>
    </div>
  `;
  updateStatus('En attente de scan...', 'scanning');
}

function updateStatus(message, type) {
  const statusEl = document.getElementById('scanner-status');
  statusEl.className = `scanner-status ${type}`;

  let icon = 'bi-camera-video';
  if (type === 'success') icon = 'bi-check-circle-fill';
  if (type === 'error') icon = 'bi-exclamation-triangle-fill';

  statusEl.innerHTML = `<i class="bi ${icon}"></i> ${message}`;

  // Reset au statut normal apres 3 secondes
  if (type !== 'scanning') {
    setTimeout(() => {
      updateStatus('En attente de scan...', 'scanning');
    }, 3000);
  }
}

function flashZone(type) {
  const zone = document.getElementById('scanner-zone');
  zone.classList.remove('flash-success', 'flash-error');
  void zone.offsetWidth; // Force reflow
  zone.classList.add(`flash-${type}`);
}

// ==================== HISTORY ====================

function addToHistory(type, action, details, code = '') {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const item = {
    type,
    action,
    details,
    code,
    time: timeStr,
    timestamp: now.getTime()
  };

  scanHistory.unshift(item);

  // Garder seulement les 50 derniers
  if (scanHistory.length > 50) {
    scanHistory = scanHistory.slice(0, 50);
  }

  saveHistory();
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('history-list');

  if (scanHistory.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        <i class="bi bi-inbox"></i>
        <p>Aucune action pour le moment</p>
      </div>
    `;
    return;
  }

  // Afficher les 10 dernieres
  const items = scanHistory.slice(0, 10);

  container.innerHTML = items.map(item => {
    let icon = 'bi-info-circle';
    if (item.type === 'success') icon = 'bi-check-circle-fill';
    if (item.type === 'error') icon = 'bi-x-circle-fill';

    return `
      <div class="history-item ${item.type}">
        <div class="history-icon ${item.type}">
          <i class="bi ${icon}"></i>
        </div>
        <div class="history-content">
          <div class="action">${item.action}</div>
          <div class="details">${item.details}</div>
        </div>
        <div class="history-time">${item.time}</div>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  if (confirm('Vider l\'historique des actions ?')) {
    scanHistory = [];
    saveHistory();
    renderHistory();
  }
}

function saveHistory() {
  localStorage.setItem('scanner_history', JSON.stringify(scanHistory));
}

function loadHistory() {
  try {
    const saved = localStorage.getItem('scanner_history');
    if (saved) {
      scanHistory = JSON.parse(saved);
      // Filtrer les entrees de plus de 24h
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      scanHistory = scanHistory.filter(item => item.timestamp > oneDayAgo);
      renderHistory();
    }
  } catch (e) {
    console.error('Erreur chargement historique:', e);
    scanHistory = [];
  }
}

// ==================== AUDIO ====================

function playSound(type) {
  try {
    const audio = document.getElementById(`sound-${type}`);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {}); // Ignorer les erreurs autoplay
    }
  } catch (e) {
    // Ignorer les erreurs audio
  }
}

// ==================== CAMERA ====================

async function switchCamera() {
  if (cameras.length < 2) {
    alert('Une seule camera disponible');
    return;
  }

  await stopScanning();
  currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
  await startScanning();
}

// ==================== MANUAL INPUT ====================

function openManualInput() {
  const modal = new bootstrap.Modal(document.getElementById('manualInputModal'));
  document.getElementById('manual-code').value = '';
  modal.show();
  setTimeout(() => document.getElementById('manual-code').focus(), 300);
}

async function submitManualCode() {
  const code = document.getElementById('manual-code').value.trim().toUpperCase();

  if (!code) {
    alert('Veuillez saisir un code-barre');
    return;
  }

  // Fermer la modal
  bootstrap.Modal.getInstance(document.getElementById('manualInputModal')).hide();

  // Traiter le code
  await processBarcode(code);
}

// ==================== FULLSCREEN ====================

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      document.body.classList.add('fullscreen-mode');
    }).catch(() => {});
  } else {
    document.exitFullscreen().then(() => {
      document.body.classList.remove('fullscreen-mode');
    }).catch(() => {});
  }
}

// Ecouter les changements de fullscreen
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove('fullscreen-mode');
  }
});

// ==================== SEARCH FUNCTIONS ====================

let searchAdherentTimeout = null;
let searchJeuTimeout = null;
let pendingJeuForEmprunt = null; // Jeu en attente d'un adherent pour emprunt

function openSearchAdherent(forEmprunt = false) {
  if (forEmprunt) {
    // Stocke qu'on cherche un adherent pour un emprunt en attente
    pendingJeuForEmprunt = forEmprunt;
  }

  const modal = new bootstrap.Modal(document.getElementById('searchAdherentModal'));
  document.getElementById('search-adherent-input').value = '';
  document.getElementById('search-adherent-results').innerHTML = '<p class="text-muted text-center">Tapez pour rechercher un adherent</p>';
  modal.show();

  setTimeout(() => {
    document.getElementById('search-adherent-input').focus();
  }, 300);

  // Ajouter listener de recherche
  document.getElementById('search-adherent-input').oninput = (e) => {
    clearTimeout(searchAdherentTimeout);
    searchAdherentTimeout = setTimeout(() => {
      searchAdherents(e.target.value);
    }, 300);
  };
}

async function searchAdherents(query) {
  const resultsDiv = document.getElementById('search-adherent-results');

  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '<p class="text-muted text-center">Tapez au moins 2 caracteres</p>';
    return;
  }

  resultsDiv.innerHTML = '<p class="text-muted text-center"><i class="bi bi-hourglass-split"></i> Recherche...</p>';

  try {
    const data = await adherentsAPI.getAll({ search: query, limit: 10 });
    const adherents = data.adherents || [];

    if (adherents.length === 0) {
      resultsDiv.innerHTML = '<p class="text-muted text-center">Aucun adherent trouve</p>';
      return;
    }

    resultsDiv.innerHTML = adherents.map(adh => {
      const initials = (adh.prenom[0] + adh.nom[0]).toUpperCase();
      const badgeClass = adh.statut === 'actif' ? 'bg-success' : 'bg-secondary';

      return `
        <div class="search-result-item" onclick="selectAdherentFromSearch(${adh.id}, '${adh.prenom.replace(/'/g, "\\'")}', '${adh.nom.replace(/'/g, "\\'")}', '${adh.email || ''}', '${adh.statut}', '${adh.code_barre || ''}')">
          <div class="avatar">${initials}</div>
          <div class="info">
            <div class="name">${adh.prenom} ${adh.nom}</div>
            <div class="details">${adh.code_barre || 'Pas de code'}</div>
          </div>
          <span class="badge ${badgeClass}">${adh.statut}</span>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erreur recherche adherents:', error);
    resultsDiv.innerHTML = '<p class="text-danger text-center">Erreur de recherche</p>';
  }
}

function selectAdherentFromSearch(id, prenom, nom, email, statut, code_barre) {
  // Fermer la modal
  bootstrap.Modal.getInstance(document.getElementById('searchAdherentModal')).hide();

  // Verifier le statut
  if (statut !== 'actif') {
    playSound('error');
    flashZone('error');
    updateStatus(`Adherent ${statut}`, 'error');
    addToHistory('error', 'Adherent non actif', `${prenom} ${nom} - Statut: ${statut}`, code_barre);
    pendingJeuForEmprunt = null;
    return;
  }

  // Selectionner l'adherent
  currentAdherent = { id, prenom, nom, email, statut, code_barre };
  displayAdherent(currentAdherent);
  playSound('success');
  flashZone('success');
  updateStatus(`Adherent: ${prenom} ${nom}`, 'success');
  addToHistory('info', 'Adherent selectionne', `${prenom} ${nom}`, code_barre);

  // Si on avait un jeu en attente d'emprunt, le traiter maintenant
  if (pendingJeuForEmprunt && pendingJeuForEmprunt !== true) {
    const jeu = pendingJeuForEmprunt;
    pendingJeuForEmprunt = null;
    setTimeout(() => createEmprunt(jeu), 300);
  }
}

function openSearchJeu() {
  const modal = new bootstrap.Modal(document.getElementById('searchJeuModal'));
  document.getElementById('search-jeu-input').value = '';
  document.getElementById('search-jeu-results').innerHTML = '<p class="text-muted text-center">Tapez pour rechercher un jeu</p>';
  modal.show();

  setTimeout(() => {
    document.getElementById('search-jeu-input').focus();
  }, 300);

  // Ajouter listener de recherche
  document.getElementById('search-jeu-input').oninput = (e) => {
    clearTimeout(searchJeuTimeout);
    searchJeuTimeout = setTimeout(() => {
      searchJeux(e.target.value);
    }, 300);
  };
}

async function searchJeux(query) {
  const resultsDiv = document.getElementById('search-jeu-results');

  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '<p class="text-muted text-center">Tapez au moins 2 caracteres</p>';
    return;
  }

  resultsDiv.innerHTML = '<p class="text-muted text-center"><i class="bi bi-hourglass-split"></i> Recherche...</p>';

  try {
    const data = await jeuxAPI.getAll({ search: query, limit: 10 });
    const jeux = data.jeux || [];

    if (jeux.length === 0) {
      resultsDiv.innerHTML = '<p class="text-muted text-center">Aucun jeu trouve</p>';
      return;
    }

    resultsDiv.innerHTML = jeux.map(jeu => {
      let badgeClass = 'bg-secondary';
      if (jeu.statut === 'disponible') badgeClass = 'bg-success';
      else if (jeu.statut === 'emprunte') badgeClass = 'bg-warning text-dark';

      return `
        <div class="search-result-item" onclick="selectJeuFromSearch(${jeu.id})">
          <div class="jeu-icon"><i class="bi bi-dice-5"></i></div>
          <div class="info">
            <div class="name">${jeu.titre}</div>
            <div class="details">${jeu.code_barre || 'Pas de code'}</div>
          </div>
          <span class="badge ${badgeClass}">${jeu.statut}</span>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erreur recherche jeux:', error);
    resultsDiv.innerHTML = '<p class="text-danger text-center">Erreur de recherche</p>';
  }
}

async function selectJeuFromSearch(jeuId) {
  // Fermer la modal
  bootstrap.Modal.getInstance(document.getElementById('searchJeuModal')).hide();

  try {
    // Recuperer les details du jeu
    const data = await jeuxAPI.getById(jeuId);
    const jeu = data.jeu;

    if (!jeu) {
      throw new Error('Jeu non trouve');
    }

    // Traiter comme un scan de jeu
    await handleJeuScan({ jeu, code: jeu.code_barre });

  } catch (error) {
    console.error('Erreur selection jeu:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur: ' + error.message, 'error');
  }
}

// ==================== CLEANUP ====================

window.addEventListener('beforeunload', () => {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().catch(() => {});
  }
});
