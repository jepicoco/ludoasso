# Exemples d'intégration du système de logging

Ce document présente des exemples concrets d'intégration du système de logging dans les contrôleurs existants.

## Exemple 1 : Contrôleur de cotisations

### Avant (sans logging)
```javascript
const { Cotisation, Adherent } = require('../models');

exports.createCotisation = async (req, res) => {
  try {
    const { adherent_id, tarif_id, montant, mode_paiement } = req.body;

    const cotisation = await Cotisation.create({
      adherent_id,
      tarif_id,
      montant,
      mode_paiement,
      statut: 'validee',
      date_paiement: new Date()
    });

    res.status(201).json(cotisation);
  } catch (error) {
    console.error('Erreur création cotisation:', error);
    res.status(500).json({ error: error.message });
  }
};
```

### Après (avec logging complet)
```javascript
const { Cotisation, Adherent } = require('../models');
const logger = require('../utils/logger');
const auditLogger = require('../utils/auditLogger');

exports.createCotisation = async (req, res) => {
  try {
    const { adherent_id, tarif_id, montant, mode_paiement } = req.body;

    const cotisation = await Cotisation.create({
      adherent_id,
      tarif_id,
      montant,
      mode_paiement,
      statut: 'validee',
      date_paiement: new Date()
    });

    // Audit log de la création
    auditLogger.cotisationCreated({
      cotisationId: cotisation.id,
      adherentId: adherent_id,
      montant,
      userId: req.user.id,
      modePaiement: mode_paiement
    });

    res.status(201).json(cotisation);
  } catch (error) {
    // Log détaillé de l'erreur
    logger.error('Failed to create cotisation', {
      adherentId: req.body.adherent_id,
      montant: req.body.montant,
      error: error.message,
      stack: error.stack,
      userId: req.user ? req.user.id : null
    });

    res.status(500).json({ error: error.message });
  }
};

exports.annulerCotisation = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;

    const cotisation = await Cotisation.findByPk(id);

    if (!cotisation) {
      return res.status(404).json({ error: 'Cotisation non trouvée' });
    }

    const previousStatut = cotisation.statut;
    cotisation.statut = 'annulee';
    cotisation.raison_annulation = raison;
    await cotisation.save();

    // Audit log de l'annulation
    auditLogger.cotisationAnnulee({
      cotisationId: cotisation.id,
      adherentId: cotisation.adherent_id,
      montant: cotisation.montant,
      userId: req.user.id,
      raison
    });

    // Log info du changement de statut
    logger.info('Cotisation status changed', {
      cotisationId: id,
      previousStatut,
      newStatut: 'annulee',
      userId: req.user.id
    });

    res.json(cotisation);
  } catch (error) {
    logger.error('Failed to cancel cotisation', {
      cotisationId: req.params.id,
      error: error.message,
      userId: req.user ? req.user.id : null
    });

    res.status(500).json({ error: error.message });
  }
};
```

## Exemple 2 : Contrôleur d'emprunts

```javascript
const { Emprunt, Jeu, Adherent } = require('../models');
const logger = require('../utils/logger');
const auditLogger = require('../utils/auditLogger');

exports.createEmprunt = async (req, res) => {
  try {
    const { adherent_id, item_type, item_id, duree_jours } = req.body;

    // Vérifier disponibilité
    const available = await checkItemAvailability(item_type, item_id);

    if (!available) {
      logger.warn('Attempted to borrow unavailable item', {
        adherentId: adherent_id,
        itemType: item_type,
        itemId: item_id,
        userId: req.user.id
      });

      return res.status(400).json({
        error: 'Item non disponible'
      });
    }

    const emprunt = await Emprunt.create({
      adherent_id,
      item_type,
      item_id,
      date_emprunt: new Date(),
      date_retour_prevue: calculateReturnDate(duree_jours),
      statut: 'en_cours'
    });

    // Audit log
    auditLogger.empruntCreated({
      empruntId: emprunt.id,
      adherentId: adherent_id,
      itemType: item_type,
      itemId: item_id,
      userId: req.user.id
    });

    res.status(201).json(emprunt);
  } catch (error) {
    logger.error('Failed to create emprunt', {
      error: error.message,
      body: req.body,
      userId: req.user ? req.user.id : null
    });

    res.status(500).json({ error: error.message });
  }
};

exports.retournerEmprunt = async (req, res) => {
  try {
    const { id } = req.params;
    const emprunt = await Emprunt.findByPk(id);

    if (!emprunt) {
      return res.status(404).json({ error: 'Emprunt non trouvé' });
    }

    const enRetard = new Date() > new Date(emprunt.date_retour_prevue);

    emprunt.date_retour_effective = new Date();
    emprunt.statut = 'retourne';
    await emprunt.save();

    // Audit log avec info sur le retard
    auditLogger.empruntReturned({
      empruntId: emprunt.id,
      adherentId: emprunt.adherent_id,
      itemType: emprunt.item_type,
      itemId: emprunt.item_id,
      userId: req.user.id,
      enRetard
    });

    if (enRetard) {
      logger.warn('Item returned late', {
        empruntId: id,
        adherentId: emprunt.adherent_id,
        expectedDate: emprunt.date_retour_prevue,
        actualDate: emprunt.date_retour_effective,
        daysLate: calculateDaysLate(emprunt)
      });
    }

    res.json(emprunt);
  } catch (error) {
    logger.error('Failed to return emprunt', {
      empruntId: req.params.id,
      error: error.message,
      userId: req.user ? req.user.id : null
    });

    res.status(500).json({ error: error.message });
  }
};

exports.prolongerEmprunt = async (req, res) => {
  try {
    const { id } = req.params;
    const { duree_supplementaire } = req.body;

    const emprunt = await Emprunt.findByPk(id);

    if (!emprunt) {
      return res.status(404).json({ error: 'Emprunt non trouvé' });
    }

    const ancienneDateRetour = emprunt.date_retour_prevue;
    emprunt.date_retour_prevue = addDays(
      new Date(emprunt.date_retour_prevue),
      duree_supplementaire
    );
    await emprunt.save();

    // Audit log
    auditLogger.empruntProlonged({
      empruntId: emprunt.id,
      adherentId: emprunt.adherent_id,
      itemType: emprunt.item_type,
      userId: req.user ? req.user.id : null,
      nouvelleDateRetour: emprunt.date_retour_prevue
    });

    logger.info('Loan extended', {
      empruntId: id,
      previousDate: ancienneDateRetour,
      newDate: emprunt.date_retour_prevue,
      additionalDays: duree_supplementaire
    });

    res.json(emprunt);
  } catch (error) {
    logger.error('Failed to extend loan', {
      empruntId: req.params.id,
      error: error.message,
      userId: req.user ? req.user.id : null
    });

    res.status(500).json({ error: error.message });
  }
};
```

## Exemple 3 : Contrôleur d'adhérents (archivage)

```javascript
const { Adherent } = require('../models');
const logger = require('../utils/logger');
const auditLogger = require('../utils/auditLogger');

exports.archiverAdherent = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;

    const adherent = await Adherent.findByPk(id);

    if (!adherent) {
      return res.status(404).json({ error: 'Adhérent non trouvé' });
    }

    // Vérifier qu'il n'a pas d'emprunts en cours
    const empruntsEnCours = await Emprunt.count({
      where: {
        adherent_id: id,
        statut: 'en_cours'
      }
    });

    if (empruntsEnCours > 0) {
      logger.warn('Attempted to archive member with active loans', {
        adherentId: id,
        empruntsEnCours,
        userId: req.user.id
      });

      return res.status(400).json({
        error: 'Impossible d\'archiver : emprunts en cours'
      });
    }

    adherent.statut = 'archive';
    adherent.date_archivage = new Date();
    adherent.raison_archivage = raison;
    await adherent.save();

    // Audit log
    auditLogger.adherentArchived({
      adherentId: adherent.id,
      nom: adherent.nom,
      prenom: adherent.prenom,
      userId: req.user.id,
      raison
    });

    res.json(adherent);
  } catch (error) {
    logger.error('Failed to archive member', {
      adherentId: req.params.id,
      error: error.message,
      userId: req.user ? req.user.id : null
    });

    res.status(500).json({ error: error.message });
  }
};
```

## Exemple 4 : Contrôleur de configuration

```javascript
const { Parametres } = require('../models');
const logger = require('../utils/logger');
const auditLogger = require('../utils/auditLogger');

exports.updateParametre = async (req, res) => {
  try {
    const { cle } = req.params;
    const { valeur } = req.body;

    const parametre = await Parametres.findOne({ where: { cle } });

    if (!parametre) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }

    const ancienneValeur = parametre.valeur;

    // Valider certains changements sensibles
    if (cle === 'duree_emprunt_max' && parseInt(valeur) > 90) {
      logger.warn('Attempted to set excessive loan duration', {
        parametre: cle,
        requestedValue: valeur,
        userId: req.user.id
      });

      return res.status(400).json({
        error: 'Durée maximale : 90 jours'
      });
    }

    parametre.valeur = valeur;
    await parametre.save();

    // Audit log du changement de configuration
    auditLogger.configChanged({
      configKey: cle,
      oldValue: ancienneValeur,
      newValue: valeur,
      userId: req.user.id,
      module: parametre.module || 'system'
    });

    res.json(parametre);
  } catch (error) {
    logger.error('Failed to update parameter', {
      parametre: req.params.cle,
      error: error.message,
      userId: req.user ? req.user.id : null
    });

    res.status(500).json({ error: error.message });
  }
};
```

## Exemple 5 : Middleware d'autorisation avec logging

```javascript
const logger = require('../utils/logger');
const auditLogger = require('../utils/auditLogger');

exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    auditLogger.unauthorizedAccess({
      userId: null,
      resource: req.path,
      ip: req.ip,
      action: 'no_authentication'
    });

    return res.status(401).json({ error: 'Non authentifié' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    auditLogger.unauthorizedAccess({
      userId: req.user.id,
      resource: req.path,
      ip: req.ip,
      action: 'insufficient_permissions'
    });

    logger.warn('Unauthorized access attempt', {
      userId: req.user.id,
      userRole: req.user.role,
      requiredRole: 'admin',
      resource: req.path
    });

    return res.status(403).json({ error: 'Accès refusé' });
  }

  next();
};
```

## Bonnes pratiques observées dans ces exemples

1. **Import des loggers en haut du fichier** : Toujours importer `logger` et `auditLogger` au début
2. **Audit logs pour les actions importantes** : Création, modification, suppression, annulation
3. **Logs détaillés en cas d'erreur** : Inclure le contexte, les données, l'utilisateur
4. **Logs de warning pour les situations anormales** : Tentatives d'actions invalides, valeurs suspectes
5. **Toujours inclure userId** quand disponible : Facilite le traçage des actions
6. **Ne jamais logger de données sensibles** : Pas de mots de passe, tokens, données bancaires
7. **Utiliser les bons tags d'audit** : Permet de filtrer facilement les logs
8. **Logger avant ET après les actions critiques** : Pour avoir le contexte en cas d'échec

## Checklist d'intégration

Avant de déployer une fonctionnalité, vérifier :

- [ ] Import de `logger` et `auditLogger` en haut du contrôleur
- [ ] Audit log sur toutes les actions sensibles (CREATE, UPDATE, DELETE)
- [ ] Log d'erreur détaillé dans tous les blocs catch
- [ ] Log de warning pour les tentatives d'actions invalides
- [ ] userId inclus dans tous les logs (si disponible)
- [ ] Pas de données sensibles dans les logs
- [ ] Tags d'audit appropriés utilisés
- [ ] Métadonnées structurées (objets JSON) plutôt que texte libre
