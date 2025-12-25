/**
 * Import Livres BDP - JavaScript
 * Gestion de l'interface d'import de livres depuis fichiers ISO 2709 (MARC/UNIMARC)
 */

// State
let selectedFile = null;
let sessionId = null;
let sessionData = null;
let currentTab = 'import';

// DOM Elements (initialized in initImportLivres)
let dropZone, fileInput, btnAnalyze;

// ==================== INITIALIZATION ====================

function initImportLivres() {
  dropZone = document.getElementById('dropZone');
  fileInput = document.getElementById('fileInput');
  btnAnalyze = document.getElementById('btnAnalyze');

  // Setup date par defaut
  document.getElementById('dateReception').value = new Date().toISOString().split('T')[0];

  setupDropZone();
  setupFileInput();
  loadBDPStats();
  loadLots();
  loadHistory();
}

// ==================== FILE HANDLING ====================

function setupDropZone() {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
}

function setupFileInput() {
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });
}

function handleFile(file) {
  // Verifier le type
  const validExtensions = ['.mrc', '.iso', '.marc', '.dat'];
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  if (!validExtensions.includes(ext)) {
    Swal.fire({
      icon: 'error',
      title: 'Format non supporte',
      text: 'Veuillez selectionner un fichier ISO 2709 (.mrc, .iso, .marc)'
    });
    return;
  }

  // Verifier la taille (50 MB max)
  if (file.size > 50 * 1024 * 1024) {
    Swal.fire({
      icon: 'error',
      title: 'Fichier trop volumineux',
      text: 'Le fichier ne doit pas depasser 50 MB'
    });
    return;
  }

  selectedFile = file;
  updateDropZoneUI();
  btnAnalyze.disabled = false;
}

function updateDropZoneUI() {
  if (selectedFile) {
    const sizeKB = (selectedFile.size / 1024).toFixed(1);
    const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
    const sizeStr = selectedFile.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    dropZone.classList.add('has-file');
    dropZone.innerHTML = `
      <i class="bi bi-file-earmark-check"></i>
      <h4>Fichier selectionne</h4>
      <div class="file-info">
        <i class="bi bi-file-earmark-binary file-icon"></i>
        <div class="file-details">
          <div class="file-name">${selectedFile.name}</div>
          <div class="file-size">${sizeStr}</div>
        </div>
        <button class="btn btn-outline-danger btn-sm" onclick="removeFile(event)">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
  } else {
    dropZone.classList.remove('has-file');
    dropZone.innerHTML = `
      <i class="bi bi-file-earmark-binary"></i>
      <h4>Glissez-deposez votre fichier ISO 2709 ici</h4>
      <p class="text-muted">ou cliquez pour selectionner un fichier</p>
      <p class="text-muted small">Formats acceptes : .mrc, .iso, .marc (max 50 MB)</p>
    `;
  }
}

function removeFile(event) {
  event.stopPropagation();
  selectedFile = null;
  fileInput.value = '';
  updateDropZoneUI();
  btnAnalyze.disabled = true;
}

// ==================== TABS ====================

function showTab(tab) {
  currentTab = tab;

  // Update tab links
  document.querySelectorAll('#mainTabs .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelector(`#mainTabs .nav-link[onclick="showTab('${tab}')"]`).classList.add('active');

  // Show/hide tab content
  document.getElementById('tabImport').style.display = tab === 'import' ? 'block' : 'none';
  document.getElementById('tabLots').style.display = tab === 'lots' ? 'block' : 'none';
  document.getElementById('tabHistory').style.display = tab === 'history' ? 'block' : 'none';

  // Load data
  if (tab === 'lots') loadLots();
  if (tab === 'history') loadHistory();
}

// ==================== ANALYZE ====================

async function analyzeFile() {
  if (!selectedFile) return;

  btnAnalyze.disabled = true;
  btnAnalyze.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Analyse...';

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('numero_lot', document.getElementById('numeroLot').value);
    formData.append('date_reception', document.getElementById('dateReception').value);
    formData.append('date_retour_prevue', document.getElementById('dateRetour').value);
    formData.append('source', document.getElementById('source').value);

    const response = await fetch('/api/import/livres/iso', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'analyse');
    }

    sessionData = await response.json();
    sessionId = sessionData.sessionId;

    renderPreview();
    goToStep(2);

  } catch (error) {
    console.error('Erreur analyse:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur d\'analyse',
      text: error.message || 'Impossible d\'analyser le fichier'
    });
  } finally {
    btnAnalyze.disabled = false;
    btnAnalyze.innerHTML = '<i class="bi bi-search"></i> Analyser le fichier';
  }
}

// ==================== PREVIEW ====================

function renderPreview() {
  const summary = document.getElementById('previewSummary');
  const tbody = document.getElementById('previewTableBody');
  const info = document.getElementById('previewInfo');

  // Summary cards
  summary.innerHTML = `
    <div class="result-card success">
      <div class="number">${sessionData.valid}</div>
      <div class="label">Valides</div>
    </div>
    <div class="result-card warning">
      <div class="number">${sessionData.invalid}</div>
      <div class="label">Avec erreurs</div>
    </div>
    <div class="result-card info">
      <div class="number">${sessionData.total}</div>
      <div class="label">Total</div>
    </div>
    ${sessionData.lotBDP ? `
    <div class="result-card" style="background: #e0cffc; color: #59359a;">
      <div class="number"><i class="bi bi-box-seam"></i></div>
      <div class="label">Lot ${sessionData.lotBDP.numero_lot}</div>
    </div>
    ` : ''}
  `;

  // Preview table
  tbody.innerHTML = sessionData.preview.map((livre, idx) => {
    const statusBadge = livre.valid
      ? '<span class="badge bg-success">OK</span>'
      : '<span class="badge bg-danger" title="' + (livre.errors || []).join(', ') + '">Erreur</span>';

    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <strong>${escapeHtml(livre.titre || '-')}</strong>
        </td>
        <td><small>${(livre.auteurs || []).slice(0, 2).join(', ') || '-'}</small></td>
        <td><small>${escapeHtml(livre.editeur || '-')}</small></td>
        <td><code>${livre.isbn || '-'}</code></td>
        <td>${livre.annee || '-'}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');

  info.textContent = `Affichage des ${sessionData.preview.length} premiers enregistrements sur ${sessionData.total}`;
}

// ==================== CONFLICTS ====================

function renderConflicts() {
  const conflicts = sessionData.conflicts;

  if (!conflicts || !conflicts.hasConflicts) {
    document.getElementById('noConflicts').style.display = 'block';
    document.getElementById('conflictsContainer').style.display = 'none';
    return;
  }

  document.getElementById('noConflicts').style.display = 'none';
  document.getElementById('conflictsContainer').style.display = 'block';

  // Auteurs
  if (conflicts.auteurs && conflicts.auteurs.length > 0) {
    document.getElementById('conflictAuteurs').style.display = 'block';
    document.getElementById('conflictAuteursList').innerHTML = conflicts.auteurs
      .map(a => `<span class="conflict-tag">${escapeHtml(a)}</span>`).join('');
  }

  // Editeurs
  if (conflicts.editeurs && conflicts.editeurs.length > 0) {
    document.getElementById('conflictEditeurs').style.display = 'block';
    document.getElementById('conflictEditeursList').innerHTML = conflicts.editeurs
      .map(e => `<span class="conflict-tag">${escapeHtml(e)}</span>`).join('');
  }

  // Genres
  if (conflicts.genres && conflicts.genres.length > 0) {
    document.getElementById('conflictGenres').style.display = 'block';
    document.getElementById('conflictGenresList').innerHTML = conflicts.genres
      .map(g => `<span class="conflict-tag">${escapeHtml(g)}</span>`).join('');
  }

  // Collections
  if (conflicts.collections && conflicts.collections.length > 0) {
    document.getElementById('conflictCollections').style.display = 'block';
    document.getElementById('conflictCollectionsList').innerHTML = conflicts.collections
      .map(c => `<span class="conflict-tag">${escapeHtml(c)}</span>`).join('');
  }
}

// ==================== RESOLVE & IMPORT ====================

async function resolveAndConfirm() {
  const createMissing = document.getElementById('createMissing').checked;

  // Si conflits et createMissing, resoudre d'abord
  if (sessionData.conflicts && sessionData.conflicts.hasConflicts && createMissing) {
    try {
      await fetch(`/api/import/livres/resolve/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ createMissing: true })
      });
    } catch (err) {
      console.warn('Erreur resolution:', err);
    }
  }

  // Passer a l'etape 4 et lancer l'import
  goToStep(4);
  startImport();
}

async function startImport() {
  const progressBar = document.querySelector('#importProgress .progress-bar');
  const progressLabel = document.getElementById('progressLabel');
  const progressPercent = document.getElementById('progressPercent');
  const progressDetails = document.getElementById('progressDetails');

  try {
    const response = await fetch(`/api/import/livres/confirm/${sessionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        updateExisting: false,
        skipInvalid: true,
        createExemplaires: true
      })
    });

    // SSE streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('event:')) continue;
        if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.substring(5));
            handleSSEEvent(data);
          } catch (e) {
            console.warn('SSE parse error:', e);
          }
        }
      }
    }

  } catch (error) {
    console.error('Erreur import:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur d\'import',
      text: error.message || 'Une erreur est survenue'
    });
  }
}

function handleSSEEvent(data) {
  const progressBar = document.querySelector('#importProgress .progress-bar');
  const progressLabel = document.getElementById('progressLabel');
  const progressPercent = document.getElementById('progressPercent');
  const progressDetails = document.getElementById('progressDetails');

  switch (data.type || data.event) {
    case 'start':
      progressLabel.textContent = data.message || 'Demarrage...';
      break;

    case 'progress':
      progressBar.style.width = data.percent + '%';
      progressPercent.textContent = data.percent + '%';
      progressLabel.textContent = `Import de: ${data.titre || '...'}`;
      progressDetails.textContent = `${data.current}/${data.total} - ${data.imported} importes, ${data.errors} erreurs`;
      break;

    case 'complete':
      document.getElementById('importProgress').style.display = 'none';
      document.getElementById('importResults').style.display = 'block';
      showResults(data);
      loadBDPStats();
      break;

    case 'error':
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: data.message
      });
      break;
  }
}

function showResults(results) {
  const summaryDiv = document.getElementById('resultsSummary');

  summaryDiv.innerHTML = `
    <div class="result-card success">
      <div class="number">${results.imported}</div>
      <div class="label">Importes</div>
    </div>
    <div class="result-card info">
      <div class="number">${results.updated || 0}</div>
      <div class="label">Mis a jour</div>
    </div>
    <div class="result-card warning">
      <div class="number">${results.skipped || 0}</div>
      <div class="label">Ignores</div>
    </div>
    <div class="result-card error">
      <div class="number">${results.errors}</div>
      <div class="label">Erreurs</div>
    </div>
  `;

  // Afficher les erreurs si presentes
  const errorsSection = document.getElementById('errorsSection');
  const errorsTableBody = document.getElementById('errorsTableBody');

  if (results.errorDetails && results.errorDetails.length > 0) {
    errorsSection.classList.remove('d-none');
    errorsTableBody.innerHTML = results.errorDetails.map(err => `
      <tr>
        <td>${escapeHtml(err.titre || '-')}</td>
        <td><code>${err.isbn || '-'}</code></td>
        <td class="text-danger">${escapeHtml(err.error)}</td>
      </tr>
    `).join('');
  } else {
    errorsSection.classList.add('d-none');
  }
}

// ==================== BDP STATS ====================

async function loadBDPStats() {
  try {
    const response = await fetch('/api/import/livres/lots/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) return;

    const data = await response.json();

    if (data.stats.enCours > 0 || data.alertes.enRetard.length > 0) {
      document.getElementById('bdpAlert').style.display = 'block';

      const statsDiv = document.getElementById('bdpStats');
      statsDiv.innerHTML = `
        <div class="bdp-stat">
          <div class="number">${data.stats.enCours}</div>
          <div class="label">En cours</div>
        </div>
        ${data.alertes.enRetard.length > 0 ? `
        <div class="bdp-stat" style="color: #ffcc00;">
          <div class="number">${data.alertes.enRetard.length}</div>
          <div class="label">En retard</div>
        </div>
        ` : ''}
        <div class="bdp-stat">
          <div class="number">${data.stats.total}</div>
          <div class="label">Total lots</div>
        </div>
      `;
    }

    // Badge sur l'onglet
    if (data.stats.enCours > 0) {
      const badge = document.getElementById('lotsEnCoursCount');
      badge.textContent = data.stats.enCours;
      badge.style.display = 'inline';
    }

  } catch (error) {
    console.error('Erreur chargement stats BDP:', error);
  }
}

// ==================== LOTS ====================

async function loadLots() {
  const filter = document.getElementById('lotsFilter')?.value || '';

  try {
    const response = await fetch(`/api/import/livres/lots?status=${filter}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) throw new Error('Erreur chargement');

    const data = await response.json();
    renderLots(data.lots);

  } catch (error) {
    console.error('Erreur chargement lots:', error);
    document.getElementById('lotsTableBody').innerHTML = `
      <tr><td colspan="6" class="text-center text-danger">Erreur de chargement</td></tr>
    `;
  }
}

function renderLots(lots) {
  const tbody = document.getElementById('lotsTableBody');

  if (!lots || lots.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="text-center text-muted">Aucun lot BDP</td></tr>
    `;
    return;
  }

  tbody.innerHTML = lots.map(lot => {
    let statusBadge;
    if (lot.retourne) {
      statusBadge = '<span class="lot-badge retourne"><i class="bi bi-check-circle"></i> Retourne</span>';
    } else if (lot.isOverdue) {
      statusBadge = `<span class="lot-badge retard"><i class="bi bi-exclamation-triangle"></i> En retard (${Math.abs(lot.daysUntilReturn)}j)</span>`;
    } else {
      statusBadge = `<span class="lot-badge en-cours"><i class="bi bi-clock"></i> ${lot.daysUntilReturn !== null ? lot.daysUntilReturn + 'j restants' : 'En cours'}</span>`;
    }

    return `
      <tr>
        <td><strong>${escapeHtml(lot.numero_lot)}</strong></td>
        <td>${formatDate(lot.date_reception)}</td>
        <td>${formatDate(lot.date_retour_prevue) || '-'}</td>
        <td>${lot.nb_exemplaires}</td>
        <td>${statusBadge}</td>
        <td>
          ${!lot.retourne ? `
            <button class="btn btn-sm btn-outline-success" onclick="openRetourModal(${lot.id}, '${escapeHtml(lot.numero_lot)}', ${lot.nb_exemplaires})">
              <i class="bi bi-box-arrow-left"></i> Retour
            </button>
          ` : `
            <small class="text-muted">${formatDate(lot.date_retour_effectif)}</small>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

let currentLotId = null;

function openRetourModal(lotId, numero, nbExemplaires) {
  currentLotId = lotId;
  document.getElementById('retourLotNumero').textContent = numero;
  document.getElementById('retourNbExemplaires').value = nbExemplaires;
  document.getElementById('retourNbExemplaires').max = nbExemplaires;

  const modal = new bootstrap.Modal(document.getElementById('retourModal'));
  modal.show();
}

async function confirmerRetour() {
  if (!currentLotId) return;

  const nbExemplaires = document.getElementById('retourNbExemplaires').value;

  try {
    const response = await fetch(`/api/import/livres/lots/${currentLotId}/retour`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nb_exemplaires_retournes: nbExemplaires ? parseInt(nbExemplaires) : null
      })
    });

    if (!response.ok) throw new Error('Erreur');

    bootstrap.Modal.getInstance(document.getElementById('retourModal')).hide();

    Swal.fire({
      icon: 'success',
      title: 'Lot retourne',
      text: 'Le lot a ete marque comme retourne',
      timer: 2000,
      showConfirmButton: false
    });

    loadLots();
    loadBDPStats();

  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: 'Impossible de marquer le lot comme retourne'
    });
  }
}

// ==================== HISTORY ====================

async function loadHistory() {
  try {
    const response = await fetch('/api/import/livres/history', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) throw new Error('Erreur chargement');

    const data = await response.json();
    renderHistory(data.sessions);

  } catch (error) {
    console.error('Erreur chargement historique:', error);
    document.getElementById('historyTableBody').innerHTML = `
      <tr><td colspan="8" class="text-center text-danger">Erreur de chargement</td></tr>
    `;
  }
}

function renderHistory(sessions) {
  const tbody = document.getElementById('historyTableBody');

  if (!sessions || sessions.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center text-muted">Aucun historique</td></tr>
    `;
    return;
  }

  tbody.innerHTML = sessions.map(session => {
    const statusBadge = {
      'pending': '<span class="badge bg-warning">En attente</span>',
      'resolved': '<span class="badge bg-info">Pret</span>',
      'imported': '<span class="badge bg-success">Importe</span>',
      'cancelled': '<span class="badge bg-secondary">Annule</span>'
    }[session.statut] || session.statut;

    return `
      <tr>
        <td>${formatDateTime(session.created_at)}</td>
        <td><small>${escapeHtml(session.filename || '-')}</small></td>
        <td><span class="badge bg-primary">${session.source || 'bdp'}</span></td>
        <td>${session.total_records}</td>
        <td class="text-success">${session.imported_count || 0}</td>
        <td class="text-danger">${session.error_count || 0}</td>
        <td>${session.lotBDP ? escapeHtml(session.lotBDP.numero_lot) : '-'}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

// ==================== NAVIGATION ====================

function goToStep(stepNum) {
  // Cacher toutes les etapes
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step${i}`);
    if (el) el.classList.add('d-none');
  }

  // Afficher l'etape demandee
  const stepEl = document.getElementById(`step${stepNum}`);
  if (stepEl) stepEl.classList.remove('d-none');

  // Mettre a jour les indicateurs
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`step${i}-indicator`);
    if (!indicator) continue;

    indicator.classList.remove('active', 'completed');

    if (i < stepNum) {
      indicator.classList.add('completed');
    } else if (i === stepNum) {
      indicator.classList.add('active');
    }
  }

  // Actions specifiques par etape
  if (stepNum === 3) {
    renderConflicts();
  }

  // Reset si retour a l'etape 1
  if (stepNum === 1) {
    selectedFile = null;
    sessionId = null;
    sessionData = null;
    fileInput.value = '';
    updateDropZoneUI();
    btnAnalyze.disabled = true;

    // Reset progress
    document.getElementById('importProgress').style.display = 'block';
    document.getElementById('importResults').style.display = 'none';
    const progressBar = document.querySelector('#importProgress .progress-bar');
    if (progressBar) progressBar.style.width = '0%';
  }
}

// ==================== UTILITIES ====================

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
