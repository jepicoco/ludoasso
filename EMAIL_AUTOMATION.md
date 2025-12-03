# Système d'Emails Automatiques

Ce document décrit le système d'envoi automatique d'emails mis en place dans l'application de gestion de ludothèque.

## Vue d'ensemble

Le système d'emails automatiques gère les communications avec les adhérents pour :
- La création de comptes
- Les confirmations d'emprunts
- Les rappels d'échéances
- Les relances pour retards
- Les cotisations

## Configuration

### 1. Configuration SMTP

Avant d'utiliser le système d'emails, configurez vos paramètres SMTP dans l'interface d'administration :

1. Allez dans **Paramètres > Communications > Configurations Email**
2. Créez une nouvelle configuration avec vos paramètres SMTP
3. Activez la configuration

### 2. Création des Templates

Les templates d'emails sont automatiquement créés lors de l'installation. Pour les installer manuellement :

```bash
npm run seed-email-templates
```

Les templates créés :
- `ADHERENT_CREATION` - Bienvenue nouvel adhérent
- `EMPRUNT_CONFIRMATION` - Confirmation d'emprunt
- `EMPRUNT_RAPPEL_AVANT` - Rappel J-3 avant échéance
- `EMPRUNT_RAPPEL_ECHEANCE` - Rappel jour J
- `EMPRUNT_RELANCE_RETARD` - Relance pour retard
- `COTISATION_CONFIRMATION` - Confirmation de cotisation
- `COTISATION_RAPPEL` - Rappel renouvellement cotisation

## Emails Automatiques

### 1. Email de Bienvenue

**Quand** : À la création d'un nouveau compte adhérent

**Contenu** :
- Message de bienvenue
- Informations du compte (email, code-barre, date d'adhésion)
- Instructions pour commencer

**Variables disponibles** :
- `{{prenom}}` - Prénom de l'adhérent
- `{{nom}}` - Nom de l'adhérent
- `{{email}}` - Email de l'adhérent
- `{{code_barre}}` - Code-barre de l'adhérent
- `{{date_adhesion}}` - Date d'adhésion

### 2. Confirmation d'Emprunt

**Quand** : À la création d'un emprunt

**Contenu** :
- Détails du jeu emprunté
- Date d'emprunt et date de retour prévue
- Durée de l'emprunt
- Rappel de rapporter le jeu à temps

**Variables disponibles** :
- `{{prenom}}` - Prénom de l'adhérent
- `{{nom}}` - Nom de l'adhérent
- `{{titre_jeu}}` - Titre du jeu emprunté
- `{{date_emprunt}}` - Date de l'emprunt
- `{{date_retour_prevue}}` - Date de retour prévue
- `{{duree_jours}}` - Durée en jours

### 3. Rappel J-3

**Quand** : 3 jours avant la date de retour prévue

**Contenu** :
- Rappel que le jeu doit être rendu bientôt
- Nombre de jours restants
- Date limite de retour

**Variables disponibles** :
- `{{prenom}}` - Prénom de l'adhérent
- `{{nom}}` - Nom de l'adhérent
- `{{titre_jeu}}` - Titre du jeu
- `{{date_retour_prevue}}` - Date de retour prévue
- `{{jours_restants}}` - Jours restants

### 4. Rappel Échéance (Jour J)

**Quand** : Le jour même de la date de retour prévue

**Contenu** :
- Message urgent de retour aujourd'hui
- Mention des pénalités de retard

**Variables disponibles** :
- `{{prenom}}` - Prénom de l'adhérent
- `{{nom}}` - Nom de l'adhérent
- `{{titre_jeu}}` - Titre du jeu
- `{{date_retour_prevue}}` - Date de retour prévue

### 5. Relances pour Retard

**Quand** : Chaque semaine après la date de retour prévue (J+7, J+14, J+21, etc.)

**Contenu** :
- Message de retard
- Nombre de jours de retard
- Avertissement sur les conséquences

**Variables disponibles** :
- `{{prenom}}` - Prénom de l'adhérent
- `{{nom}}` - Nom de l'adhérent
- `{{titre_jeu}}` - Titre du jeu
- `{{date_retour_prevue}}` - Date de retour prévue
- `{{jours_retard}}` - Jours de retard

### 6. Confirmation de Cotisation

**Quand** : À la création d'une cotisation

**Contenu** :
- Confirmation du paiement
- Détails de la cotisation (montant, mode de paiement, année)

**Variables disponibles** :
- `{{prenom}}` - Prénom de l'adhérent
- `{{nom}}` - Nom de l'adhérent
- `{{montant}}` - Montant payé
- `{{date_paiement}}` - Date du paiement
- `{{mode_paiement}}` - Mode de paiement
- `{{annee}}` - Année de la cotisation

### 7. Rappel Renouvellement Cotisation

**Quand** : 30 jours avant l'expiration de la cotisation

**Contenu** :
- Rappel d'expiration prochaine
- Date d'expiration
- Instructions pour renouveler

**Variables disponibles** :
- `{{prenom}}` - Prénom de l'adhérent
- `{{nom}}` - Nom de l'adhérent
- `{{date_expiration}}` - Date d'expiration
- `{{jours_restants}}` - Jours restants

## Job de Rappels Automatiques

### Exécution Manuelle

Pour exécuter manuellement le job de rappels :

```bash
npm run job-email-reminders
```

Le job effectue :
1. ✅ Rappels J-3 pour les emprunts se terminant dans 3 jours
2. ✅ Rappels échéance pour les emprunts se terminant aujourd'hui
3. ✅ Relances pour les emprunts en retard (chaque semaine)
4. ✅ Rappels de renouvellement de cotisation (30 jours avant)

### Configuration du Cron (Windows)

Pour automatiser l'exécution quotidienne, utilisez le Planificateur de tâches Windows :

1. Ouvrez le **Planificateur de tâches**
2. Créez une nouvelle tâche
3. Configurez le déclencheur : **Quotidien à 9h00**
4. Action : **Démarrer un programme**
   - Programme : `C:\Program Files\nodejs\node.exe`
   - Arguments : `W:\ludo\ludotheque\backend\jobs\emailReminders.js`
   - Dossier : `W:\ludo\ludotheque`

### Configuration du Cron (Linux/Mac)

Ajoutez au crontab :

```bash
# Exécuter tous les jours à 9h00
0 9 * * * cd /path/to/ludotheque && npm run job-email-reminders
```

## Personnalisation des Templates

Les templates peuvent être personnalisés depuis l'interface d'administration :

1. Allez dans **Paramètres > Communications > Templates de Messages**
2. Sélectionnez le template à modifier
3. Modifiez le contenu HTML
4. Utilisez les variables disponibles entre `{{}}` (ex: `{{prenom}}`)
5. Sauvegardez

## Désactivation d'un Type d'Email

Pour désactiver un type d'email spécifique :

1. Allez dans **Paramètres > Communications > Templates de Messages**
2. Trouvez le template concerné
3. Décochez "Actif"
4. Sauvegardez

## Architecture Technique

### Service Email (`backend/services/emailService.js`)

Service singleton qui gère :
- Initialisation du transporteur nodemailer
- Récupération des templates
- Remplacement des variables
- Envoi d'emails

### Job de Rappels (`backend/jobs/emailReminders.js`)

Script exécutable qui :
- Interroge la base de données pour les emprunts et cotisations
- Envoie les rappels appropriés
- Log les résultats

### Intégrations Controllers

Les controllers appellent automatiquement le service email :
- `adherentController.js` : Email de bienvenue
- `empruntController.js` : Confirmation d'emprunt
- `cotisationController.js` : Confirmation de cotisation

## Dépannage

### Les emails ne sont pas envoyés

1. Vérifiez la configuration SMTP dans l'interface
2. Testez la configuration via "Tester la connexion"
3. Vérifiez les logs du serveur pour les erreurs
4. Assurez-vous que la configuration est activée

### Certains emails ne partent pas

1. Vérifiez que le template est actif
2. Vérifiez que l'adhérent a une adresse email valide
3. Vérifiez les logs pour les erreurs spécifiques

### Le job de rappels ne s'exécute pas

1. Vérifiez que le cron est configuré correctement
2. Exécutez manuellement : `npm run job-email-reminders`
3. Vérifiez les logs pour les erreurs

## Sécurité

- Les mots de passe SMTP sont stockés en clair dans la base de données
- Il est recommandé d'utiliser des variables d'environnement pour les informations sensibles
- Utilisez toujours SMTP sécurisé (TLS/SSL)

## Développement

### Ajouter un Nouveau Type d'Email

1. Créer le template dans `seedEmailTemplates.js`
2. Ajouter la méthode dans `emailService.js`
3. Appeler la méthode depuis le controller approprié
4. Tester l'envoi

### Tester les Emails

En développement, utilisez des services comme :
- [Mailtrap](https://mailtrap.io/)
- [MailHog](https://github.com/mailhog/MailHog)
- [Ethereal Email](https://ethereal.email/)

Configuration Mailtrap example :
```
Host: smtp.mailtrap.io
Port: 2525
User: votre_username
Pass: votre_password
```
