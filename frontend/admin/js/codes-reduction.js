// ============================================
// Gestion des codes de réduction
// ============================================

let sortableCodesInstance = null;
let modalCodeReduction = null;
let currentCodeId = null;

// Charger tous les codes de réduction
async function loadCodesReduction() {
  try {
    const codes = await apiRequest('/parametres/codes-reduction');
    renderCodesReduction(codes);
  } catch (error) {
    console.error('Erreur chargement codes réduction:', error);
    document.getElementById('liste-codes-reduction').innerHTML =
      '<p class="text-center text-danger">Erreur de chargement</p>';
  }
}

// Afficher les codes de réduction
function renderCodesReduction(codes) {
  const container = document.getElementById('liste-codes-reduction');

  if (!codes || codes.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucun code de réduction</p>';
    return;
  }

  const typeLabels = {
    'pourcentage': 'Pourcentage',
    'fixe': 'Fixe',
    'fixe_avec_avoir': 'Fixe + Avoir'
  };

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover" id="table-codes-reduction">
        <thead>
          <tr>
            <th style="width: 30px;"><i class="bi bi-grip-vertical"></i></th>
            <th>Code</th>
            <th>Libellé</th>
            <th>Type</th>
            <th>Valeur</th>
            <th>Validité</th>
            <th>Usage</th>
            <th>Statut</th>
            <th style="width: 150px;">Actions</th>
          </tr>
        </thead>
        <tbody id="sortable-codes">
          ${codes.map(code => {
            const usageText = code.usage_limite
              ? `${code.usage_count}/${code.usage_limite}`
              : `${code.usage_count}/∞`;

            const validiteText = [];
            if (code.date_debut_validite) validiteText.push(`Dès ${code.date_debut_validite}`);
            if (code.date_fin_validite) validiteText.push(`Jusqu'au ${code.date_fin_validite}`);
            const validite = validiteText.length > 0 ? validiteText.join('<br>') : 'Illimité';

            const valeur = code.type_reduction === 'pourcentage'
              ? `${code.valeur} %`
              : `${code.valeur} €`;

            return `
              <tr data-id="${code.id}">
                <td class="handle" style="cursor: move;">
                  <i class="bi bi-grip-vertical"></i>
                </td>
                <td>
                  <i class="bi ${code.icone} text-${code.couleur}"></i>
                  <strong>${code.code}</strong>
                </td>
                <td>${code.libelle}</td>
                <td>
                  <span class="badge bg-secondary">
                    ${typeLabels[code.type_reduction]}
                  </span>
                </td>
                <td><strong>${valeur}</strong></td>
                <td><small>${validite}</small></td>
                <td>
                  <span class="badge bg-info">${usageText}</span>
                </td>
                <td>
                  <span class="badge bg-${code.actif ? 'success' : 'secondary'}">
                    ${code.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" onclick="editCodeReduction(${code.id})" title="Modifier">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-${code.actif ? 'warning' : 'success'}"
                          onclick="toggleCodeReduction(${code.id})" title="${code.actif ? 'Désactiver' : 'Activer'}">
                    <i class="bi bi-${code.actif ? 'eye-slash' : 'eye'}"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteCodeReduction(${code.id})" title="Supprimer">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Initialiser SortableJS
  initSortableCodes();
}

// Initialiser le drag & drop
function initSortableCodes() {
  const el = document.getElementById('sortable-codes');
  if (!el) return;

  if (sortableCodesInstance) {
    sortableCodesInstance.destroy();
  }

  sortableCodesInstance = new Sortable(el, {
    handle: '.handle',
    animation: 150,
    ghostClass: 'table-active',
    onEnd: async function(evt) {
      const rows = el.querySelectorAll('tr');
      const ordres = Array.from(rows).map((row, index) => ({
        id: parseInt(row.dataset.id),
        ordre_affichage: index + 1
      }));

      try {
        await apiRequest('/parametres/codes-reduction-reorder', {
          method: 'PUT',
          body: JSON.stringify({ ordres })
        });
      } catch (error) {
        console.error('Erreur réorganisation:', error);
        alert('Erreur lors de la réorganisation');
        loadCodesReduction();
      }
    }
  });
}

// Afficher le modal (création ou édition)
function showModalCodeReduction(id = null) {
  currentCodeId = id;

  if (!modalCodeReduction) {
    modalCodeReduction = new bootstrap.Modal(document.getElementById('modalCodeReduction'));
  }

  // Reset form
  document.getElementById('form-code-reduction').reset();
  document.getElementById('code_id').value = '';
  document.getElementById('code_actif').checked = true;
  updateCodeTypeHelp();

  if (id) {
    document.getElementById('modalCodeReductionTitle').textContent = 'Modifier le code de réduction';
    loadCodeReductionForEdit(id);
  } else {
    document.getElementById('modalCodeReductionTitle').textContent = 'Nouveau code de réduction';
  }

  modalCodeReduction.show();
}

// Charger un code pour édition
async function loadCodeReductionForEdit(id) {
  try {
    const code = await apiRequest(`/parametres/codes-reduction/${id}`);

    document.getElementById('code_id').value = code.id;
    document.getElementById('code_code').value = code.code;
    document.getElementById('code_libelle').value = code.libelle;
    document.getElementById('code_description').value = code.description || '';
    document.getElementById('code_type_reduction').value = code.type_reduction;
    document.getElementById('code_valeur').value = code.valeur;
    document.getElementById('code_date_debut').value = code.date_debut_validite || '';
    document.getElementById('code_date_fin').value = code.date_fin_validite || '';
    document.getElementById('code_usage_limite').value = code.usage_limite || '';
    document.getElementById('code_icone').value = code.icone || 'bi-percent';
    document.getElementById('code_couleur').value = code.couleur || 'success';
    document.getElementById('code_actif').checked = code.actif;

    updateCodeTypeHelp();
  } catch (error) {
    console.error('Erreur chargement code:', error);
    alert('Erreur lors du chargement du code de réduction');
  }
}

// Mettre à jour le help text selon le type de réduction
function updateCodeTypeHelp() {
  const type = document.getElementById('code_type_reduction').value;
  const helpText = document.getElementById('code_type_help');
  const valeurUnit = document.getElementById('code_valeur_unit');

  switch (type) {
    case 'pourcentage':
      helpText.textContent = 'Réduction en pourcentage du montant';
      valeurUnit.textContent = '%';
      break;
    case 'fixe':
      helpText.textContent = 'Réduction fixe (ne peut pas descendre en dessous de 0€)';
      valeurUnit.textContent = '€';
      break;
    case 'fixe_avec_avoir':
      helpText.textContent = 'Réduction fixe (génère un avoir si montant < 0€)';
      valeurUnit.textContent = '€';
      break;
  }
}

// Sauvegarder un code
async function saveCodeReduction(event) {
  event.preventDefault();

  const codeId = document.getElementById('code_id').value;
  const formData = {
    code: document.getElementById('code_code').value.toUpperCase(),
    libelle: document.getElementById('code_libelle').value,
    description: document.getElementById('code_description').value,
    type_reduction: document.getElementById('code_type_reduction').value,
    valeur: parseFloat(document.getElementById('code_valeur').value),
    date_debut_validite: document.getElementById('code_date_debut').value || null,
    date_fin_validite: document.getElementById('code_date_fin').value || null,
    usage_limite: document.getElementById('code_usage_limite').value
      ? parseInt(document.getElementById('code_usage_limite').value)
      : null,
    icone: document.getElementById('code_icone').value,
    couleur: document.getElementById('code_couleur').value,
    actif: document.getElementById('code_actif').checked
  };

  try {
    if (codeId) {
      // Modification
      await apiRequest(`/parametres/codes-reduction/${codeId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
    } else {
      // Création
      await apiRequest('/parametres/codes-reduction', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
    }

    modalCodeReduction.hide();
    loadCodesReduction();
  } catch (error) {
    console.error('Erreur sauvegarde code:', error);
    alert('Erreur lors de l\'enregistrement: ' + error.message);
  }
}

// Éditer un code
function editCodeReduction(id) {
  showModalCodeReduction(id);
}

// Activer/Désactiver un code
async function toggleCodeReduction(id) {
  if (!confirm('Voulez-vous changer le statut de ce code de réduction ?')) {
    return;
  }

  try {
    await apiRequest(`/parametres/codes-reduction/${id}/toggle`, {
      method: 'PATCH'
    });
    loadCodesReduction();
  } catch (error) {
    console.error('Erreur toggle code:', error);
    alert('Erreur: ' + error.message);
  }
}

// Supprimer un code
async function deleteCodeReduction(id) {
  if (!confirm('Voulez-vous vraiment supprimer ce code de réduction ? Cette action est irréversible.')) {
    return;
  }

  try {
    await apiRequest(`/parametres/codes-reduction/${id}`, {
      method: 'DELETE'
    });
    loadCodesReduction();
  } catch (error) {
    console.error('Erreur suppression code:', error);
    alert('Erreur: ' + error.message);
  }
}

// Event listener pour le changement de type
document.addEventListener('DOMContentLoaded', () => {
  const typeSelect = document.getElementById('code_type_reduction');
  if (typeSelect) {
    typeSelect.addEventListener('change', updateCodeTypeHelp);
  }

  const formCodeReduction = document.getElementById('form-code-reduction');
  if (formCodeReduction) {
    formCodeReduction.addEventListener('submit', saveCodeReduction);
  }
});
