// ============================================
// Gestion des déclencheurs d'événements
// (intégré dans parametres.html > Communications)
// ============================================

let allDeclencheurs = [];
let currentDeclencheurCategory = 'all';
let modalDeclencheur = null;

// Charger tous les déclencheurs
async function loadDeclencheurs() {
  try {
    const response = await apiRequest('/event-triggers');

    if (response.success) {
      allDeclencheurs = response.data;
      renderDeclencheurs();
      loadDeclenheursStats();
    } else {
      document.getElementById('liste-declencheurs').innerHTML =
        '<p class="text-center text-danger">Erreur de chargement</p>';
    }
  } catch (error) {
    console.error('Erreur chargement déclencheurs:', error);
    document.getElementById('liste-declencheurs').innerHTML =
      '<p class="text-center text-danger">Erreur de chargement</p>';
  }
}

// Charger les statistiques
async function loadDeclenheursStats() {
  try {
    const response = await apiRequest('/event-triggers/stats');

    if (response.success) {
      const stats = response.data;
      document.getElementById('declencheur-stat-total').textContent = stats.total;
      document.getElementById('declencheur-stat-emails').textContent = stats.emailActifs;
      document.getElementById('declencheur-stat-sms').textContent = stats.smsActifs;
      // Calculer les inactifs (ni email ni SMS actif)
      const inactifs = allDeclencheurs.filter(d => !d.email_actif && !d.sms_actif).length;
      document.getElementById('declencheur-stat-inactifs').textContent = inactifs;
    }
  } catch (error) {
    console.error('Erreur chargement stats déclencheurs:', error);
  }
}

// Afficher les déclencheurs
function renderDeclencheurs() {
  const container = document.getElementById('liste-declencheurs');

  // Filtrer par catégorie
  const filtered = currentDeclencheurCategory === 'all'
    ? allDeclencheurs
    : allDeclencheurs.filter(d => d.categorie === currentDeclencheurCategory);

  if (!filtered || filtered.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucun déclencheur trouvé</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Événement</th>
            <th>Catégorie</th>
            <th>Template Email</th>
            <th>Template SMS</th>
            <th class="text-center">Email</th>
            <th class="text-center">SMS</th>
            <th>Délai</th>
            <th style="width: 80px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(d => renderDeclencheurRow(d)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Créer une ligne de déclencheur
function renderDeclencheurRow(declencheur) {
  const categoryBadge = getDeclencheurCategoryBadge(declencheur.categorie);

  const templateEmail = declencheur.template_email_code
    ? `<code class="text-success">${declencheur.template_email_code}</code>`
    : '<span class="text-muted">-</span>';

  const templateSms = declencheur.template_sms_code
    ? `<code class="text-info">${declencheur.template_sms_code}</code>`
    : '<span class="text-muted">-</span>';

  const delaiText = declencheur.delai_envoi > 0
    ? `${declencheur.delai_envoi} min`
    : '<span class="text-muted">Immédiat</span>';

  return `
    <tr>
      <td>
        <div class="d-flex align-items-center">
          <i class="bi ${declencheur.icone || 'bi-bell'} fs-5 me-2 text-${declencheur.couleur || 'primary'}"></i>
          <div>
            <div class="fw-bold">${declencheur.libelle}</div>
            <small class="text-muted">${declencheur.code}</small>
          </div>
        </div>
      </td>
      <td>${categoryBadge}</td>
      <td>${templateEmail}</td>
      <td>${templateSms}</td>
      <td class="text-center">
        <button class="btn btn-sm ${declencheur.email_actif ? 'btn-success' : 'btn-outline-secondary'}"
                onclick="toggleDeclencheurEmail(${declencheur.id})" title="${declencheur.email_actif ? 'Désactiver' : 'Activer'} email">
          <i class="bi bi-envelope${declencheur.email_actif ? '-fill' : ''}"></i>
        </button>
      </td>
      <td class="text-center">
        <button class="btn btn-sm ${declencheur.sms_actif ? 'btn-info' : 'btn-outline-secondary'}"
                onclick="toggleDeclencheurSMS(${declencheur.id})" title="${declencheur.sms_actif ? 'Désactiver' : 'Activer'} SMS">
          <i class="bi bi-chat${declencheur.sms_actif ? '-fill' : ''}"></i>
        </button>
      </td>
      <td>${delaiText}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editDeclencheur(${declencheur.id})" title="Modifier">
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    </tr>
  `;
}

// Badge de catégorie
function getDeclencheurCategoryBadge(categorie) {
  const config = {
    'adherent': { icon: 'bi-person', label: 'Adhérent', color: 'primary' },
    'emprunt': { icon: 'bi-box', label: 'Emprunt', color: 'warning' },
    'cotisation': { icon: 'bi-credit-card', label: 'Cotisation', color: 'success' },
    'systeme': { icon: 'bi-gear', label: 'Système', color: 'secondary' }
  };

  const cfg = config[categorie] || { icon: 'bi-tag', label: categorie, color: 'info' };

  return `<span class="badge bg-${cfg.color}"><i class="bi ${cfg.icon}"></i> ${cfg.label}</span>`;
}

// Filtrer par catégorie
function filterDeclencheursByCategory(category, btn) {
  currentDeclencheurCategory = category;

  // Mettre à jour les boutons
  document.querySelectorAll('#section-declencheurs .btn-group .btn').forEach(b => {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');

  renderDeclencheurs();
}

// Toggle email
async function toggleDeclencheurEmail(id) {
  try {
    const response = await apiRequest(`/event-triggers/${id}/toggle-email`, { method: 'POST' });

    if (response.success) {
      showSuccessToast('Email ' + (response.data.email_actif ? 'activé' : 'désactivé'));
      await loadDeclencheurs();
    } else {
      showErrorToast('Erreur lors de la modification');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorToast('Erreur de connexion');
  }
}

// Toggle SMS
async function toggleDeclencheurSMS(id) {
  try {
    const response = await apiRequest(`/event-triggers/${id}/toggle-sms`, { method: 'POST' });

    if (response.success) {
      showSuccessToast('SMS ' + (response.data.sms_actif ? 'activé' : 'désactivé'));
      await loadDeclencheurs();
    } else {
      showErrorToast('Erreur lors de la modification');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorToast('Erreur de connexion');
  }
}

// Éditer un déclencheur
async function editDeclencheur(id) {
  try {
    const response = await apiRequest(`/event-triggers/${id}`);

    if (response.success) {
      const declencheur = response.data;

      // Remplir le formulaire
      document.getElementById('declencheur_id').value = declencheur.id;
      document.getElementById('declencheur_code').value = declencheur.code;
      document.getElementById('declencheur_categorie').value = declencheur.categorie;
      document.getElementById('declencheur_libelle').value = declencheur.libelle;
      document.getElementById('declencheur_email_actif').checked = declencheur.email_actif;
      document.getElementById('declencheur_sms_actif').checked = declencheur.sms_actif;
      document.getElementById('declencheur_delai').value = declencheur.delai_envoi || 0;

      // Charger les templates disponibles
      await loadDeclencheurTemplates();

      // Sélectionner les templates actuels
      if (declencheur.template_email_code) {
        document.getElementById('declencheur_template_email').value = declencheur.template_email_code;
      }
      if (declencheur.template_sms_code) {
        document.getElementById('declencheur_template_sms').value = declencheur.template_sms_code;
      }

      // Afficher le modal
      if (!modalDeclencheur) {
        modalDeclencheur = new bootstrap.Modal(document.getElementById('modalDeclencheur'));
      }
      modalDeclencheur.show();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorToast('Erreur de chargement');
  }
}

// Charger les templates disponibles
async function loadDeclencheurTemplates() {
  try {
    // Templates email
    const emailResponse = await apiRequest('/event-triggers/templates?type=email');
    const emailSelect = document.getElementById('declencheur_template_email');
    emailSelect.innerHTML = '<option value="">Aucun</option>';

    if (emailResponse.success) {
      emailResponse.data.forEach(template => {
        const option = document.createElement('option');
        option.value = template.code;
        option.textContent = `${template.code} - ${template.libelle}`;
        emailSelect.appendChild(option);
      });
    }

    // Templates SMS
    const smsResponse = await apiRequest('/event-triggers/templates?type=sms');
    const smsSelect = document.getElementById('declencheur_template_sms');
    smsSelect.innerHTML = '<option value="">Aucun</option>';

    if (smsResponse.success) {
      smsResponse.data.forEach(template => {
        const option = document.createElement('option');
        option.value = template.code;
        option.textContent = `${template.code} - ${template.libelle}`;
        smsSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Erreur chargement templates:', error);
  }
}

// Sauvegarder un déclencheur
async function saveDeclencheur(event) {
  event.preventDefault();

  try {
    const id = document.getElementById('declencheur_id').value;
    const data = {
      template_email_code: document.getElementById('declencheur_template_email').value || null,
      template_sms_code: document.getElementById('declencheur_template_sms').value || null,
      email_actif: document.getElementById('declencheur_email_actif').checked,
      sms_actif: document.getElementById('declencheur_sms_actif').checked,
      delai_envoi: parseInt(document.getElementById('declencheur_delai').value) || 0
    };

    const response = await apiRequest(`/event-triggers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (response.success) {
      showSuccessToast('Déclencheur mis à jour avec succès');
      modalDeclencheur.hide();
      await loadDeclencheurs();
    } else {
      showErrorToast('Erreur lors de la mise à jour');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorToast('Erreur de connexion');
  }
}

// Initialiser le formulaire
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-declencheur');
  if (form) {
    form.addEventListener('submit', saveDeclencheur);
  }
});
