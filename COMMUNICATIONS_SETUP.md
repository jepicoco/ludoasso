# Configuration du Système de Communications

## Vue d'ensemble

Le système de communications permet de configurer et gérer les envois automatiques d'emails et SMS selon des événements de l'application (création de compte, emprunt, retard, etc.).

## Architecture

### Composants créés

1. **Modèle EventTrigger** (`backend/models/EventTrigger.js`)
   - Gère la liaison entre les événements et les templates de messages
   - Permet d'activer/désactiver les envois email et SMS par événement
   - Supporte des conditions d'envoi personnalisées

2. **API REST** (`backend/routes/eventTriggers.js`)
   - CRUD complet pour les déclencheurs d'événements
   - Endpoints pour activer/désactiver email et SMS
   - Récupération des templates disponibles
   - Statistiques d'utilisation

3. **Interface d'administration** (`frontend/admin/communications.html`)
   - Vue d'ensemble avec statistiques
   - Filtres par catégorie (Adhérents, Emprunts, Cotisations, Système)
   - Activation/désactivation rapide via switches
   - Édition des configurations de déclencheurs

## Installation

### 1. Exécuter la migration

Créer la table `event_triggers` :

```bash
cd W:\ludo\ludotheque
npm run migrate-event-triggers
```

Ou directement :

```bash
node database\migrations\addEventTriggers.js
```

### 2. Charger les déclencheurs par défaut

Insérer les déclencheurs d'événements prédéfinis :

```bash
npm run seed-event-triggers
```

Ou directement :

```bash
node database\seeds\seedEventTriggers.js
```

### 3. Tout-en-un

Pour exécuter migration + seed en une commande :

```bash
npm run setup-event-triggers
```

## Déclencheurs d'événements par défaut

### Adhérents
- **ADHERENT_CREATED** - Email de bienvenue (✓ activé par défaut)
- **ADHERENT_UPDATED** - Notification de modification de compte
- **ADHERENT_SUSPENDED** - Notification de suspension

### Emprunts
- **EMPRUNT_CREATED** - Confirmation d'emprunt (✓ activé par défaut)
- **EMPRUNT_RETURNED** - Confirmation de retour
- **EMPRUNT_RAPPEL_J3** - Rappel 3 jours avant échéance (✓ activé par défaut)
- **EMPRUNT_RAPPEL_ECHEANCE** - Rappel le jour J (✓ activé par défaut)
- **EMPRUNT_RETARD** - Relance pour retard (✓ activé par défaut)

### Cotisations
- **COTISATION_CREATED** - Confirmation de cotisation (✓ activé par défaut)
- **COTISATION_EXPIRATION** - Rappel 30j avant expiration (✓ activé par défaut)
- **COTISATION_EXPIRED** - Notification d'expiration

## Utilisation

### Accès à l'interface

1. Démarrer le serveur : `npm run dev`
2. Se connecter à l'interface admin
3. Aller dans le menu **Communications** (réservé aux administrateurs)

### Configuration d'un déclencheur

Pour chaque événement, vous pouvez configurer :

1. **Template Email** : Choisir le template à utiliser pour l'email
2. **Template SMS** : Choisir le template à utiliser pour le SMS
3. **Activation Email** : Activer/désactiver l'envoi d'email via le switch
4. **Activation SMS** : Activer/désactiver l'envoi de SMS via le switch
5. **Délai d'envoi** : Définir un délai avant l'envoi (en minutes)
6. **Conditions** : Définir des conditions d'envoi personnalisées (JSON)

### Exemple : Désactiver l'email de bienvenue

1. Aller dans **Communications**
2. Trouver la ligne **"Création de compte adhérent"**
3. Désactiver le switch dans la colonne **Email**
4. L'email de bienvenue ne sera plus envoyé automatiquement

### Exemple : Changer le template d'un événement

1. Aller dans **Communications**
2. Cliquer sur le bouton **Modifier** (icône crayon) de l'événement
3. Dans le modal, sélectionner un nouveau template dans **Template Email**
4. Cliquer sur **Enregistrer**

## Intégration dans le code

### Utilisation dans les contrôleurs

Pour déclencher un envoi d'email basé sur un événement :

```javascript
const { EventTrigger } = require('../models');
const emailService = require('../services/emailService');

// Récupérer le déclencheur
const trigger = await EventTrigger.findByCode('ADHERENT_CREATED');

// Vérifier si l'email doit être envoyé
if (trigger && trigger.shouldSendEmail()) {
  // Préparer les données
  const data = {
    prenom: adherent.prenom,
    nom: adherent.nom,
    email: adherent.email,
    code_barre: adherent.code_barre
  };

  // Évaluer les conditions
  if (trigger.evaluateCondition({ adherent })) {
    // Envoyer l'email
    await emailService.sendTemplateEmail(
      trigger.template_email_code,
      adherent.email,
      data,
      { adherentId: adherent.id }
    );
  }
}
```

### Exemple d'intégration dans adherentController.js

```javascript
// Dans la méthode de création d'adhérent
exports.create = async (req, res) => {
  try {
    // ... création de l'adhérent ...

    // Charger le déclencheur
    const trigger = await EventTrigger.findByCode('ADHERENT_CREATED');

    // Envoyer l'email si activé
    if (trigger && trigger.shouldSendEmail()) {
      const emailData = {
        prenom: adherent.prenom,
        nom: adherent.nom,
        email: adherent.email,
        code_barre: adherent.code_barre,
        date_adhesion: new Date(adherent.date_adhesion).toLocaleDateString('fr-FR')
      };

      try {
        await emailService.sendTemplateEmail(
          trigger.template_email_code,
          adherent.email,
          emailData,
          { adherentId: adherent.id }
        );
      } catch (emailError) {
        console.error('Erreur envoi email bienvenue:', emailError);
        // Ne pas bloquer la création si l'email échoue
      }
    }

    res.status(201).json({
      success: true,
      data: adherent
    });
  } catch (error) {
    // ... gestion d'erreur ...
  }
};
```

## API Endpoints

### Récupérer tous les déclencheurs
```
GET /api/event-triggers
GET /api/event-triggers?categorie=adherent
```

### Récupérer un déclencheur
```
GET /api/event-triggers/:id
GET /api/event-triggers/code/:code
```

### Créer un déclencheur
```
POST /api/event-triggers
Content-Type: application/json

{
  "code": "NOUVEAU_EVENEMENT",
  "libelle": "Mon événement",
  "description": "Description de l'événement",
  "categorie": "adherent",
  "template_email_code": "MON_TEMPLATE",
  "email_actif": true,
  "sms_actif": false
}
```

### Modifier un déclencheur
```
PUT /api/event-triggers/:id
Content-Type: application/json

{
  "libelle": "Nouveau libellé",
  "template_email_code": "AUTRE_TEMPLATE"
}
```

### Supprimer un déclencheur
```
DELETE /api/event-triggers/:id
```

### Activer/Désactiver l'email
```
POST /api/event-triggers/:id/toggle-email
```

### Activer/Désactiver le SMS
```
POST /api/event-triggers/:id/toggle-sms
```

### Récupérer les templates disponibles
```
GET /api/event-triggers/templates?type=email
GET /api/event-triggers/templates?type=sms
```

### Statistiques
```
GET /api/event-triggers/stats
```

## Structure de la base de données

### Table `event_triggers`

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT | ID auto-incrémenté |
| code | VARCHAR(50) | Code unique (ex: ADHERENT_CREATED) |
| libelle | VARCHAR(100) | Nom de l'événement |
| description | TEXT | Description de l'événement |
| categorie | ENUM | Catégorie (adherent, emprunt, cotisation, systeme) |
| template_email_code | VARCHAR(50) | Code du template email |
| template_sms_code | VARCHAR(50) | Code du template SMS |
| email_actif | BOOLEAN | Email activé |
| sms_actif | BOOLEAN | SMS activé |
| delai_envoi | INT | Délai en minutes avant envoi |
| condition_envoi | TEXT | Conditions JSON |
| ordre_affichage | INT | Ordre d'affichage |
| icone | VARCHAR(50) | Icône Bootstrap |
| couleur | VARCHAR(20) | Couleur Bootstrap |
| created_at | DATETIME | Date de création |
| updated_at | DATETIME | Date de modification |

## Conditions d'envoi

Les conditions d'envoi permettent de définir des règles pour envoyer ou non un message.

Format JSON :
```json
{
  "adherent.actif": true,
  "adherent.statut": "actif"
}
```

Avec opérateurs :
```json
{
  "adherent.age": {
    "value": 18,
    "operator": "gte"
  }
}
```

Opérateurs supportés :
- `eq` : égal à
- `ne` : différent de
- `gt` : supérieur à
- `lt` : inférieur à
- `gte` : supérieur ou égal à
- `lte` : inférieur ou égal à

## Avantages du système

1. **Centralisation** : Toute la configuration des communications en un seul endroit
2. **Flexibilité** : Activation/désactivation rapide sans modifier le code
3. **Traçabilité** : Historique des modifications et statistiques d'utilisation
4. **Modularité** : Ajout facile de nouveaux événements et templates
5. **Maintenance** : Changement de templates sans redéploiement

## Prochaines étapes

1. Intégrer les déclencheurs dans tous les contrôleurs concernés
2. Créer des templates SMS supplémentaires
3. Ajouter la gestion des conditions d'envoi avancées dans l'UI
4. Implémenter un système de test d'envoi depuis l'interface
5. Ajouter des logs détaillés des envois

## Support

Pour toute question ou problème :
1. Vérifier les logs du serveur
2. Consulter la documentation des templates (`EMAIL_AUTOMATION.md`)
3. Vérifier la configuration SMTP dans les paramètres

---

**Date de création** : 2025-12-03
**Version** : 1.0.0
