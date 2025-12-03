# Guide de test - Ludothèque

## Démarrage du serveur

```bash
cd ludotheque
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## URLs disponibles

### Backend API
- **Health Check**: http://localhost:3000/api/health
- **API Info**: http://localhost:3000/api
- **Documentation**: Voir les routes dans `backend/routes/`

### Frontend

#### Pages de test
- **Page de test**: http://localhost:3000/test.html
  - Testez toutes les fonctionnalités de l'API
  - Interface graphique simple pour les tests

#### Interface Admin
- **Login**: http://localhost:3000/admin/login.html
  - Email: `test.user@example.com`
  - Password: `password123`

- **Dashboard**: http://localhost:3000/admin/dashboard.html
  - Statistiques en temps réel
  - Emprunts en retard
  - Jeux populaires

## Tests avec curl

### 1. Enregistrer un utilisateur
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nom":"Dupont","prenom":"Jean","email":"jean.dupont@example.com","password":"password123"}'
```

### 2. Se connecter
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.user@example.com","password":"password123"}'
```

**Récupérez le token JWT de la réponse pour les requêtes suivantes**

### 3. Obtenir les statistiques
```bash
curl -X GET http://localhost:3000/api/stats/dashboard \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### 4. Lister les jeux
```bash
curl -X GET http://localhost:3000/api/jeux
```

### 5. Scanner un code-barre
```bash
curl -X POST http://localhost:3000/api/barcodes/scan \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"ADH00000003"}'
```

### 6. Télécharger un code-barre
```bash
curl -X GET http://localhost:3000/api/barcodes/adherent/3/image \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  --output adherent-barcode.png
```

## Données de test

### Utilisateurs existants
- **Email**: test.user@example.com
- **Password**: password123
- **ID**: 3

- **Email**: marie.martin@example.com
- **Password**: password123
- **ID**: 2

### Jeux existants
- **Catan** (ID: 1)
  - Code-barre: JEU00000001
  - Catégorie: Stratégie
  - Statut: disponible

## Tests des fonctionnalités

### Test 1: Authentification
1. Ouvrir http://localhost:3000/admin/login.html
2. Se connecter avec test.user@example.com / password123
3. Vérifier la redirection vers le dashboard

### Test 2: Dashboard
1. Vérifier l'affichage des statistiques
2. Vérifier la liste des emprunts en retard
3. Vérifier la liste des jeux populaires

### Test 3: API avec la page de test
1. Ouvrir http://localhost:3000/test.html
2. Cliquer sur "Test Health" - doit afficher OK
3. Cliquer sur "Test Register" - crée un nouvel utilisateur
4. Cliquer sur "Test Login" - se connecte
5. Cliquer sur "Test Profile" - affiche le profil
6. Cliquer sur "Test Stats" - affiche les statistiques
7. Cliquer sur "Test Jeux" - liste les jeux

### Test 4: Codes-barres
```bash
# Télécharger un code-barre adhérent
curl -X GET http://localhost:3000/api/barcodes/adherent/3/image \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  --output test-barcode.png

# Ouvrir test-barcode.png pour voir le code-barre généré
```

## Structure de l'application

```
ludotheque/
├── backend/
│   ├── server.js              # Point d'entrée
│   ├── config/                # Configuration DB
│   ├── models/                # Modèles Sequelize
│   ├── controllers/           # Logique métier
│   ├── routes/                # Routes API
│   ├── middleware/            # Auth middleware
│   └── utils/                 # Utilitaires (barcode)
├── frontend/
│   ├── admin/
│   │   ├── login.html        # Page de connexion
│   │   ├── dashboard.html    # Tableau de bord
│   │   ├── css/admin.css     # Styles admin
│   │   └── js/
│   │       ├── api-admin.js  # Client API
│   │       └── auth-admin.js # Auth module
│   └── test.html             # Page de test
└── package.json
```

## Endpoints API complets

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile
- PUT /api/auth/profile

### Adhérents
- GET /api/adherents
- GET /api/adherents/:id
- GET /api/adherents/:id/stats
- POST /api/adherents
- PUT /api/adherents/:id
- DELETE /api/adherents/:id

### Jeux
- GET /api/jeux/categories
- GET /api/jeux
- GET /api/jeux/:id
- POST /api/jeux
- PUT /api/jeux/:id
- DELETE /api/jeux/:id

### Emprunts
- GET /api/emprunts/overdue
- GET /api/emprunts
- GET /api/emprunts/:id
- POST /api/emprunts
- POST /api/emprunts/:id/retour
- PUT /api/emprunts/:id
- DELETE /api/emprunts/:id

### Stats
- GET /api/stats/dashboard
- GET /api/stats/popular-games
- GET /api/stats/active-members
- GET /api/stats/loan-duration
- GET /api/stats/monthly
- GET /api/stats/categories

### Barcodes
- GET /api/barcodes/adherent/:id/image
- GET /api/barcodes/jeu/:id/image
- GET /api/barcodes/adherent/:id/card
- GET /api/barcodes/jeu/:id/label
- POST /api/barcodes/scan
- POST /api/barcodes/adherents/batch

## Prochaines étapes

Les fonctionnalités suivantes sont à implémenter:
- [ ] Pages de gestion des adhérents
- [ ] Pages de gestion des jeux
- [ ] Page de gestion des emprunts
- [ ] Scanner webcam pour les codes-barres
- [ ] Interface publique (catalogue)
