# Intégration de la comptabilité dans le controller cotisations

Ce document explique comment intégrer la génération automatique des écritures comptables lors de la création ou modification d'une cotisation.

## Option 1 : Génération automatique à la création

### Dans cotisationController.js - Méthode createCotisation

```javascript
const { Cotisation, Adherent, TarifCotisation } = require('../models');
const ComptabiliteService = require('../services/comptabiliteService');

exports.createCotisation = async (req, res) => {
  try {
    const cotisationData = {
      adherent_id: req.body.adherent_id,
      tarif_cotisation_id: req.body.tarif_cotisation_id,
      periode_debut: req.body.periode_debut,
      periode_fin: req.body.periode_fin,
      montant_base: req.body.montant_base,
      reduction_appliquee: req.body.reduction_appliquee || 0,
      montant_paye: req.body.montant_paye,
      date_paiement: req.body.date_paiement,
      mode_paiement: req.body.mode_paiement,
      // ... autres champs
    };

    // Créer la cotisation
    const cotisation = await Cotisation.create(cotisationData);

    // Générer automatiquement les écritures comptables
    try {
      await ComptabiliteService.genererEcrituresCotisation(cotisation);
      console.log(`Écritures comptables générées pour cotisation ${cotisation.id}`);
    } catch (comptaError) {
      // Ne pas bloquer la création si la comptabilité échoue
      console.error('Erreur génération écritures comptables:', comptaError);
      // On pourrait ajouter un flag pour signaler qu'il faut générer les écritures plus tard
    }

    // Charger la cotisation avec ses relations
    const cotisationComplete = await Cotisation.findByPk(cotisation.id, {
      include: [
        { model: Adherent, as: 'adherent' },
        { model: TarifCotisation, as: 'tarif' }
      ]
    });

    res.status(201).json({
      message: 'Cotisation créée avec succès',
      cotisation: cotisationComplete,
      ecritures_comptables: true // Indique que les écritures ont été générées
    });
  } catch (error) {
    console.error('Erreur création cotisation:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la cotisation',
      message: error.message
    });
  }
};
```

## Option 2 : Génération manuelle via endpoint dédié

### Nouvelle route dans cotisations

```javascript
// Dans routes/cotisations.js
router.post('/:id/generer-ecritures', verifyToken, checkRole(['admin', 'comptable']), cotisationController.genererEcritures);
```

### Dans cotisationController.js

```javascript
const ComptabiliteService = require('../services/comptabiliteService');

/**
 * Générer les écritures comptables pour une cotisation
 */
exports.genererEcritures = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que la cotisation existe
    const cotisation = await Cotisation.findByPk(id);
    if (!cotisation) {
      return res.status(404).json({
        error: 'Cotisation non trouvée'
      });
    }

    // Vérifier si la cotisation a déjà des écritures
    const aEcritures = await ComptabiliteService.cotisationAEcritures(id);
    if (aEcritures) {
      return res.status(400).json({
        error: 'Cette cotisation a déjà des écritures comptables',
        numero_piece: cotisation.numero_piece_comptable
      });
    }

    // Générer les écritures
    const ecritures = await ComptabiliteService.genererEcrituresCotisation(cotisation);

    // Recharger la cotisation pour avoir le numéro de pièce
    await cotisation.reload();

    res.json({
      message: 'Écritures comptables générées avec succès',
      numero_piece: cotisation.numero_piece_comptable,
      nb_ecritures: ecritures.length,
      ecritures: ecritures.map(e => ({
        compte: e.compte_numero,
        libelle: e.compte_libelle,
        debit: parseFloat(e.debit),
        credit: parseFloat(e.credit)
      }))
    });
  } catch (error) {
    console.error('Erreur génération écritures:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération des écritures',
      message: error.message
    });
  }
};

/**
 * Générer les écritures pour plusieurs cotisations en batch
 */
exports.genererEcrituresBatch = async (req, res) => {
  try {
    const { cotisation_ids } = req.body;

    if (!Array.isArray(cotisation_ids) || cotisation_ids.length === 0) {
      return res.status(400).json({
        error: 'Veuillez fournir un tableau de cotisation_ids'
      });
    }

    const resultats = await ComptabiliteService.genererEcrituresMultiples(cotisation_ids);

    res.json({
      message: 'Traitement terminé',
      nb_succes: resultats.succes.length,
      nb_erreurs: resultats.erreurs.length,
      resultats
    });
  } catch (error) {
    console.error('Erreur génération batch:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération batch',
      message: error.message
    });
  }
};

/**
 * Récupérer les écritures comptables d'une cotisation
 */
exports.getEcritures = async (req, res) => {
  try {
    const { id } = req.params;

    const ecritures = await ComptabiliteService.getEcrituresCotisation(id);

    if (ecritures.length === 0) {
      return res.status(404).json({
        message: 'Aucune écriture comptable pour cette cotisation'
      });
    }

    // Calculer les totaux
    const totalDebit = ecritures.reduce((sum, e) => sum + parseFloat(e.debit), 0);
    const totalCredit = ecritures.reduce((sum, e) => sum + parseFloat(e.credit), 0);

    res.json({
      nb_ecritures: ecritures.length,
      total_debit: totalDebit,
      total_credit: totalCredit,
      equilibre: Math.abs(totalDebit - totalCredit) < 0.01,
      ecritures: ecritures.map(e => ({
        id: e.id,
        journal: `${e.journal_code} - ${e.journal_libelle}`,
        numero_ecriture: e.numero_ecriture,
        date: e.date_ecriture,
        compte: `${e.compte_numero} - ${e.compte_libelle}`,
        compte_auxiliaire: e.compte_auxiliaire,
        libelle: e.libelle,
        debit: parseFloat(e.debit),
        credit: parseFloat(e.credit),
        piece_reference: e.piece_reference,
        date_validation: e.date_validation
      }))
    });
  } catch (error) {
    console.error('Erreur récupération écritures:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des écritures',
      message: error.message
    });
  }
};
```

## Option 3 : Génération différée (task scheduler)

### Créer un script de génération batch

```javascript
// backend/scripts/genererEcrituresComptables.js
const { Cotisation } = require('../models');
const ComptabiliteService = require('../services/comptabiliteService');

async function genererEcrituresMensuelles() {
  try {
    console.log('Démarrage génération écritures comptables mensuelle...');

    // Trouver toutes les cotisations sans écritures du mois dernier
    const dateLimite = new Date();
    dateLimite.setMonth(dateLimite.getMonth() - 1);

    const cotisations = await Cotisation.findAll({
      where: {
        numero_piece_comptable: null,
        date_paiement: {
          [Op.gte]: dateLimite
        }
      }
    });

    console.log(`${cotisations.length} cotisations à traiter`);

    const ids = cotisations.map(c => c.id);
    const resultats = await ComptabiliteService.genererEcrituresMultiples(ids);

    console.log(`Succès: ${resultats.succes.length}`);
    console.log(`Erreurs: ${resultats.erreurs.length}`);

    if (resultats.erreurs.length > 0) {
      console.error('Erreurs détaillées:', resultats.erreurs);
    }
  } catch (error) {
    console.error('Erreur génération écritures mensuelles:', error);
    throw error;
  }
}

// Si appelé directement
if (require.main === module) {
  genererEcrituresMensuelles()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = genererEcrituresMensuelles;
```

### Configuration cron job (avec node-cron)

```javascript
// Dans server.js ou un fichier dédié
const cron = require('node-cron');
const genererEcrituresMensuelles = require('./scripts/genererEcrituresComptables');

// Exécuter le 1er de chaque mois à 2h du matin
cron.schedule('0 2 1 * *', async () => {
  console.log('Exécution tâche mensuelle : génération écritures comptables');
  try {
    await genererEcrituresMensuelles();
  } catch (error) {
    console.error('Erreur tâche cron:', error);
  }
});
```

## Option 4 : Ajout dans l'interface d'administration

### Bouton dans la liste des cotisations

```javascript
// Frontend - Dans le tableau des cotisations
<button
  onclick="genererEcritures(cotisationId)"
  :disabled="cotisation.numero_piece_comptable !== null"
  class="btn btn-sm btn-primary"
>
  <i class="fas fa-file-invoice"></i>
  {{ cotisation.numero_piece_comptable ? 'Écritures générées' : 'Générer écritures' }}
</button>

<script>
async function genererEcritures(cotisationId) {
  try {
    const response = await fetch(`/api/cotisations/${cotisationId}/generer-ecritures`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Écritures générées : ${data.numero_piece}`);
      // Rafraîchir la liste
      location.reload();
    } else {
      alert(`Erreur : ${data.error}`);
    }
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la génération des écritures');
  }
}
</script>
```

### Génération batch pour plusieurs cotisations

```javascript
// Frontend - Action groupée
<button onclick="genererEcrituresBatch()">
  Générer écritures pour sélection
</button>

<script>
async function genererEcrituresBatch() {
  const cotisationsSelectionnees = getSelectedCotisations(); // Fonction à implémenter

  if (cotisationsSelectionnees.length === 0) {
    alert('Veuillez sélectionner au moins une cotisation');
    return;
  }

  try {
    const response = await fetch('/api/cotisations/generer-ecritures-batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cotisation_ids: cotisationsSelectionnees
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Écritures générées : ${data.nb_succes} succès, ${data.nb_erreurs} erreurs`);
      location.reload();
    } else {
      alert(`Erreur : ${data.error}`);
    }
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la génération batch');
  }
}
</script>
```

## Recommandation

**Option recommandée : Combinaison Option 1 + Option 2**

- **Option 1** (automatique) : pour les nouvelles cotisations créées après déploiement
- **Option 2** (manuelle) : pour les cotisations existantes et en cas d'erreur

Cette approche offre le meilleur des deux mondes :
- Automatisation pour le futur
- Contrôle manuel pour les cas exceptionnels
- Possibilité de corriger les erreurs

### Implémentation suggérée

1. Modifier `createCotisation` pour générer automatiquement (Option 1)
2. Ajouter les routes manuelles (Option 2)
3. Créer un script de migration ponctuel pour les cotisations existantes
4. Plus tard, ajouter un cron job si nécessaire (Option 3)

## Notes importantes

- Toujours vérifier si la cotisation a déjà des écritures avant d'en générer
- Ne jamais bloquer la création d'une cotisation si la comptabilité échoue
- Logger toutes les erreurs de génération comptable
- Prévoir un mécanisme de correction/suppression des écritures
- Vérifier l'équilibre des écritures régulièrement
