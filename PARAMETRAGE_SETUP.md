# Installation du Système de Paramétrage

## 🚀 Installation rapide

Exécutez cette commande unique pour initialiser le système de paramétrage:

```bash
npm run init-parametrage
```

Cette commande va:
1. ✅ Ajouter la colonne `role` à la table `adherents`
2. ✅ Créer les tables `parametres_structure` et `modes_paiement`
3. ✅ Créer 6 modes de paiement par défaut

## 👤 Créer un administrateur

Une fois l'initialisation terminée, créez un compte administrateur en SQL:

```sql
UPDATE adherents SET role = 'administrateur' WHERE email = 'votre@email.com';
```

Remplacez `votre@email.com` par l'email d'un compte existant.

## 🎯 Accès à l'interface

1. Démarrer le serveur: `npm run dev`
2. Se connecter avec le compte administrateur
3. Le menu "Paramètres" apparaît dans la navigation (visible uniquement pour les admins)

## 🔧 Commandes disponibles

```bash
# Initialisation complète
npm run init-parametrage

# Seed uniquement les modes de paiement
npm run seed-modes-paiement
```

## 📋 Modes de paiement créés par défaut

1. **Espèces** (CA - 530)
2. **Chèque** (BQ - 512)
3. **Carte bancaire** (BQ - 512)
4. **Virement** (BQ - 512)
5. **Prélèvement** (BQ - 512) - Inactif par défaut
6. **Avoir** (OD - 419)

## ⚠️ En cas d'erreur "Champ 'role' inconnu"

Si le serveur plante au démarrage avec cette erreur, c'est que la migration n'a pas été exécutée.

**Solution manuelle via SQL:**

```sql
ALTER TABLE adherents
ADD COLUMN role ENUM('usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur')
NOT NULL DEFAULT 'usager'
COMMENT 'Rôle de l\'utilisateur dans le système'
AFTER adhesion_association;
```

Puis:
```bash
npm run seed-modes-paiement
```

## 🎭 Les 5 rôles

| Rôle | Niveau | Accès |
|------|--------|-------|
| **Administrateur** | 4 | Accès total + Paramètres |
| **Comptable** | 3 | Comptabilité, cotisations, exports |
| **Gestionnaire** | 2 | Gestion complète (adhérents, jeux, emprunts) |
| **Bénévole** | 1 | Emprunts/retours uniquement |
| **Usager** | 0 | Consultation profil personnel (défaut) |

## ✅ Vérification

Pour vérifier que tout fonctionne:

1. Vérifier les tables:
```sql
SHOW TABLES;
-- Doit afficher: parametres_structure, modes_paiement
```

2. Vérifier la colonne role:
```sql
DESCRIBE adherents;
-- Doit afficher la colonne 'role'
```

3. Vérifier les modes de paiement:
```sql
SELECT * FROM modes_paiement ORDER BY ordre_affichage;
-- Doit afficher 6 modes
```

## 📞 Support

En cas de problème, vérifiez:
- La connexion à la base de données (.env)
- Les logs du serveur
- Les erreurs SQL dans la console

---

**Documentation complète**: Voir `PARAMETRAGE_IMPLEMENTATION.md`
