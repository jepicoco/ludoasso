// ============================================
// Gestion du tableau des adherents ameliore
// ============================================

let filteredAdherents = [];

/**
 * Affiche les adherents (pagination geree par pagination.js)
 */
function renderAdherents(list) {
  const container = document.getElementById('adherentsList');
  filteredAdherents = list;

  // Mettre a jour le compteur
  document.getElementById('adherentsCount').textContent = `${list.length} usager(s)`;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <p class="text-center text-secondary p-4">
        <i class="bi bi-inbox" style="font-size: 3rem;"></i><br>
        Aucun usager trouve
      </p>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover table-sm">
        <thead class="table-light">
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" class="form-check-input" id="selectAll" onchange="toggleSelectAll()">
            </th>
            <th style="cursor: pointer;" onclick="sortAndRender('code_barre')">
              Code-barre ${getSortIcon('code_barre')}
            </th>
            <th style="cursor: pointer;" onclick="sortAndRender('nom')">
              Nom ${getSortIcon('nom')}
            </th>
            <th style="cursor: pointer;" onclick="sortAndRender('email')">
              Email ${getSortIcon('email')}
            </th>
            <th>Telephone</th>
            <th>Role</th>
            <th style="cursor: pointer;" onclick="sortAndRender('statut')">
              Statut ${getSortIcon('statut')}
            </th>
            <th style="cursor: pointer;" onclick="sortAndRender('date_adhesion')">
              Date adhesion ${getSortIcon('date_adhesion')}
            </th>
            <th style="width: 250px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(adherent => {
            const roleColors = {
              'administrateur': 'danger',
              'comptable': 'warning',
              'gestionnaire': 'info',
              'benevole': 'primary',
              'usager': 'secondary'
            };
            const roleColor = roleColors[adherent.role] || 'secondary';
            const roleText = adherent.role ? adherent.role.charAt(0).toUpperCase() + adherent.role.slice(1) : 'Usager';

            return `
              <tr>
                <td>
                  <input type="checkbox" class="form-check-input adherent-checkbox" value="${adherent.id}">
                </td>
                <td><small class="font-monospace">${adherent.code_barre || 'N/A'}</small></td>
                <td>
                  <strong>${adherent.prenom} ${adherent.nom}</strong>
                  ${adherent.adhesion_association ? '<i class="bi bi-building-fill text-success ms-1" title="Membre association"></i>' : ''}
                </td>
                <td><small>${adherent.email}</small></td>
                <td><small>${adherent.telephone || '-'}</small></td>
                <td><span class="badge bg-${roleColor}">${roleText}</span></td>
                <td>
                  ${adherent.statut === 'actif'
                    ? '<span class="badge bg-success">Actif</span>'
                    : adherent.statut === 'suspendu'
                    ? '<span class="badge bg-danger">Suspendu</span>'
                    : '<span class="badge bg-warning text-dark">Inactif</span>'}
                </td>
                <td><small>${new Date(adherent.date_adhesion).toLocaleDateString('fr-FR')}</small></td>
                <td>
                  <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="viewAdherent(${adherent.id})" title="Voir details">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="editAdherent(${adherent.id})" title="Modifier">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="printCard(${adherent.id})" title="Carte">
                      <i class="bi bi-printer"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteAdherent(${adherent.id})" title="Supprimer">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Barre d'actions groupees -->
    <div id="bulkActionsBar" class="alert alert-info d-none" role="alert">
      <div class="d-flex justify-content-between align-items-center">
        <span><strong><span id="selectedCount">0</span> usager(s) selectionne(s)</strong></span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="bulkSendEmail()">
            <i class="bi bi-envelope"></i> Envoyer email
          </button>
          <button class="btn btn-outline-success" onclick="bulkSendSMS()">
            <i class="bi bi-phone"></i> Envoyer SMS
          </button>
          <button class="btn btn-outline-secondary" onclick="bulkExport()">
            <i class="bi bi-download"></i> Exporter selection
          </button>
        </div>
      </div>
    </div>
  `;

  // Mettre a jour compteur selection
  updateBulkActionsBar();
}

/**
 * Tri et rendu
 */
function sortAndRender(column) {
  const sorted = sortAdherents(filteredAdherents, column);
  renderAdherents(sorted);
}

/**
 * Toggle sélection tous
 */
function toggleSelectAll() {
  const selectAll = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('.adherent-checkbox');

  checkboxes.forEach(cb => {
    cb.checked = selectAll.checked;
  });

  updateBulkActionsBar();
}

/**
 * Met à jour la barre d'actions groupées
 */
function updateBulkActionsBar() {
  const checkboxes = document.querySelectorAll('.adherent-checkbox:checked');
  const count = checkboxes.length;
  const bar = document.getElementById('bulkActionsBar');
  const countSpan = document.getElementById('selectedCount');

  if (bar) {
    if (count > 0) {
      bar.classList.remove('d-none');
      countSpan.textContent = count;
    } else {
      bar.classList.add('d-none');
    }
  }

  // Écouter les changements sur les checkboxes
  document.querySelectorAll('.adherent-checkbox').forEach(cb => {
    cb.onchange = updateBulkActionsBar;
  });
}

/**
 * Exporte les adhérents en CSV
 */
function exportAdherentsCSV() {
  if (adherents.length === 0) {
    showToast('Aucun adhérent à exporter', 'warning');
    return;
  }

  exportToCSV(adherents, `adherents_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Exporte la sélection
 */
function bulkExport() {
  const selected = getSelectedAdherents();
  if (selected.length === 0) {
    showToast('Aucun adhérent sélectionné', 'warning');
    return;
  }

  exportToCSV(selected, `adherents_selection_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Récupère les adhérents sélectionnés
 */
function getSelectedAdherents() {
  const checkboxes = document.querySelectorAll('.adherent-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
  return adherents.filter(a => ids.includes(a.id));
}

/**
 * Envoi email groupé
 */
async function bulkSendEmail() {
  const selected = getSelectedAdherents();
  if (selected.length === 0) {
    showToast('Aucun adhérent sélectionné', 'warning');
    return;
  }

  showToast(`Envoi d'email à ${selected.length} adhérent(s)...`, 'info');
  // TODO: Implémenter envoi groupé
  console.log('Bulk email:', selected);
}

/**
 * Envoi SMS groupé
 */
async function bulkSendSMS() {
  const selected = getSelectedAdherents();
  if (selected.length === 0) {
    showToast('Aucun adhérent sélectionné', 'warning');
    return;
  }

  showToast(`Envoi de SMS à ${selected.length} adhérent(s)...`, 'info');
  // TODO: Implémenter envoi groupé
  console.log('Bulk SMS:', selected);
}

/**
 * Toggle affichage des filtres
 */
function toggleFilters() {
  const filtersSection = document.getElementById('filtersSection');
  const toggleText = document.getElementById('filterToggleText');

  if (filtersSection.style.display === 'none') {
    filtersSection.style.display = 'block';
    toggleText.textContent = 'Masquer filtres';
  } else {
    filtersSection.style.display = 'none';
    toggleText.textContent = 'Afficher filtres';
  }
}

/**
 * Réinitialise les filtres
 */
function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statutFilter').value = '';
  document.getElementById('roleFilter').value = '';
  document.getElementById('assocFilter').value = '';
  loadAdherents();
}
