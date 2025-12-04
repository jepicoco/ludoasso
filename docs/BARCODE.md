# Documentation du Système de Codes-Barres

## Vue d'ensemble

Le système de codes-barres de la ludothèque permet de:
- Générer des codes-barres uniques pour les adhérents et les jeux
- Scanner les codes-barres via webcam ou lecteur dédié
- Imprimer des cartes d'adhérents et étiquettes de jeux
- Valider et identifier rapidement les entités scannées

## Formats de Codes-Barres

### Code128 (Format principal)

Le Code128 est le format principal utilisé pour les adhérents et les jeux.

**Avantages:**
- Supporte les caractères alphanumériques
- Compact et facile à scanner
- Largement compatible avec les lecteurs
- Idéal pour les codes courts

**Format des codes:**
- Adhérents: `ADH` + ID sur 8 chiffres (ex: `ADH00000001`)
- Jeux: `JEU` + ID sur 8 chiffres (ex: `JEU00000123`)

**Exemples de codes valides:**
```
ADH00000001  → Adhérent ID 1
ADH00000042  → Adhérent ID 42
ADH00012345  → Adhérent ID 12345
JEU00000001  → Jeu ID 1
JEU00000999  → Jeu ID 999
```

### EAN-13 (Format optionnel)

Le format EAN-13 peut être utilisé pour des besoins spécifiques.

**Avantages:**
- Standard international
- Compatible avec les systèmes de point de vente
- Inclut une clé de contrôle automatique

**Format:**
- 13 chiffres numériques
- Le dernier chiffre est une clé de contrôle calculée automatiquement

**Exemple:**
```
1234567890128  → Code EAN-13 valide
```

## API Backend

### Routes Disponibles

#### Génération d'images

**GET `/api/barcodes/adherent/:id/image`**
- Génère l'image PNG du code-barre d'un adhérent
- Paramètres:
  - `:id` - ID de l'adhérent
  - `?format=png|base64` - Format de sortie (défaut: png)
- Réponses:
  - 200: Image PNG ou JSON avec base64
  - 404: Adhérent non trouvé
  - 500: Erreur de génération

**GET `/api/barcodes/jeu/:id/image`**
- Génère l'image PNG du code-barre d'un jeu
- Paramètres identiques à l'endpoint adhérent

**Exemples:**
```bash
# Télécharger l'image PNG
curl http://localhost:3000/api/barcodes/adherent/1/image > adherent-1.png

# Obtenir le base64
curl "http://localhost:3000/api/barcodes/adherent/1/image?format=base64"
```

#### Impression de cartes/étiquettes

**GET `/api/barcodes/adherent/:id/card`**
- Génère une carte d'adhérent imprimable (HTML)
- Format: 85.6x53.98mm (format carte de crédit)
- Contient: nom, prénom, code-barre, date d'adhésion
- Styles inline pour impression directe

**GET `/api/barcodes/jeu/:id/label`**
- Génère une étiquette de jeu imprimable (HTML)
- Format: 100x50mm (format étiquette standard)
- Contient: titre, code-barre, catégorie, éditeur

**Exemples:**
```bash
# Ouvrir la carte dans un navigateur
http://localhost:3000/api/barcodes/adherent/1/card

# Ouvrir l'étiquette dans un navigateur
http://localhost:3000/api/barcodes/jeu/1/label
```

#### Scan et validation

**POST `/api/barcodes/scan`**
- Valide un code-barre et retourne l'entité associée
- Body: `{ "code": "ADH00000001" }`
- Réponse:
  ```json
  {
    "success": true,
    "type": "adherent",
    "data": {
      "id": 1,
      "nom": "Dupont",
      "prenom": "Jean",
      ...
    }
  }
  ```

**Exemples:**
```bash
curl -X POST http://localhost:3000/api/barcodes/scan \
  -H "Content-Type: application/json" \
  -d '{"code":"ADH00000001"}'
```

#### Impression en masse

**POST `/api/barcodes/adherents/batch`**
- Génère plusieurs cartes d'adhérents sur une seule page
- Body: `{ "ids": [1, 2, 3, 4, 5] }`
- Réponse: HTML avec toutes les cartes

**Exemple:**
```bash
curl -X POST http://localhost:3000/api/barcodes/adherents/batch \
  -H "Content-Type: application/json" \
  -d '{"ids":[1,2,3,4,5]}'
```

## Frontend - Scanner Webcam

### Utilisation du Scanner

Le scanner webcam utilise la bibliothèque `html5-qrcode` pour scanner les codes-barres via la caméra.

#### Classe WebcamScanner

```javascript
// Créer une instance
const scanner = new WebcamScanner('reader-element-id');

// Démarrer le scan
await scanner.start(
  (decodedText, decodedResult) => {
    console.log('Code scanné:', decodedText);
  },
  (error) => {
    console.error('Erreur:', error);
  }
);

// Arrêter le scan
await scanner.stop();

// Nettoyer
await scanner.clear();
```

#### Fonction Helper

```javascript
// Initialiser rapidement un scanner
const scanner = initScannerForElement(
  'reader',
  (code) => console.log('Scanné:', code)
);

// Scanner un seul code puis s'arrêter
await scanSingleBarcode('reader', (code) => {
  document.getElementById('input').value = code;
});
```

#### Formats Supportés

- Code128
- EAN-13
- QR Code
- Code39
- Code93

### Intégration dans les Pages

#### Page Emprunts

Les boutons "Webcam" sont disponibles pour:
- Scanner l'adhérent (nouveau prêt)
- Scanner le jeu (nouveau prêt)
- Scanner le jeu (retour)

**Utilisation:**
1. Cliquer sur le bouton "Webcam"
2. Autoriser l'accès à la caméra
3. Positionner le code-barre devant la caméra
4. Le code est automatiquement inséré dans l'input

#### Page Adhérents

Bouton "Imprimer carte" sur chaque ligne:
```javascript
// Dans le code JavaScript
function imprimerCodeBarre(id) {
  printAdherentCard(id);
}
```

#### Page Jeux

Bouton "Imprimer étiquette" sur chaque carte:
```javascript
// Dans le code JavaScript
function imprimerCodeBarreJeu(id) {
  printJeuLabel(id);
}
```

## Helper d'Impression

### Fonctions Disponibles

#### printAdherentCard(adherentId)
Ouvre la carte d'adhérent dans une nouvelle fenêtre et lance l'impression.

```javascript
await printAdherentCard(1);
```

#### printJeuLabel(jeuId)
Ouvre l'étiquette de jeu dans une nouvelle fenêtre et lance l'impression.

```javascript
await printJeuLabel(1);
```

#### printBatchAdherentCards(adherentIds)
Imprime plusieurs cartes d'adhérents en une fois.

```javascript
await printBatchAdherentCards([1, 2, 3, 4, 5]);
```

#### downloadAdherentBarcode(adherentId, format)
Télécharge l'image du code-barre.

```javascript
// Télécharger en PNG
await downloadAdherentBarcode(1, 'png');

// Obtenir en base64
const base64 = await downloadAdherentBarcode(1, 'base64');
```

#### displayBarcode(elementId, type, id)
Affiche un code-barre dans un élément HTML.

```javascript
// Afficher dans une image
await displayBarcode('barcode-img', 'adherent', 1);

// Afficher dans un div
await displayBarcode('barcode-container', 'jeu', 42);
```

## Configuration de l'Impression

### Paramètres Recommandés

**Pour les cartes d'adhérents:**
- Format: 85.6 x 53.98 mm (format carte de crédit)
- Support: Papier épais (300g/m²) ou cartes PVC
- Orientation: Paysage
- Marges: 0mm
- Qualité: Haute

**Pour les étiquettes de jeux:**
- Format: 100 x 50 mm
- Support: Étiquettes adhésives
- Orientation: Paysage
- Marges: 0mm
- Qualité: Haute

### Configuration de l'Imprimante

1. **Ouvrir les paramètres d'impression** (Ctrl+P ou Cmd+P)
2. **Désactiver les marges** ("Aucune" ou "0mm")
3. **Activer l'impression en couleur**
4. **Activer les graphiques d'arrière-plan** (pour les dégradés)
5. **Sélectionner la qualité maximale**

### Impression avec CSS

Les templates incluent des styles d'impression optimisés:

```css
@page {
  size: 85.6mm 53.98mm;
  margin: 0;
}

@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

## Troubleshooting

### Problèmes de Caméra

**Erreur: "Aucune caméra détectée"**
- Vérifier qu'une caméra est connectée
- Tester la caméra dans d'autres applications
- Redémarrer le navigateur

**Erreur: "Permission refusée"**
- Autoriser l'accès à la caméra dans les paramètres du navigateur
- Vérifier les paramètres de confidentialité du système
- Chrome: chrome://settings/content/camera
- Firefox: about:preferences#privacy

**Erreur: "Caméra déjà utilisée"**
- Fermer les autres applications utilisant la caméra
- Recharger la page
- Redémarrer le navigateur

**Scanner ne détecte pas les codes**
- Améliorer l'éclairage
- Tenir le code-barre bien droit
- Ajuster la distance (15-30 cm recommandé)
- Nettoyer la caméra
- Vérifier que le code-barre est de bonne qualité

### Problèmes d'Impression

**Les couleurs ne s'impriment pas**
- Vérifier que l'imprimante est en mode couleur
- Activer "Graphiques d'arrière-plan" dans les options
- Utiliser le CSS print-color-adjust

**Marges incorrectes**
- Définir les marges à 0mm dans les paramètres
- Vérifier le format de page
- Utiliser @page dans le CSS

**Qualité d'impression faible**
- Augmenter la qualité d'impression
- Utiliser du papier de qualité
- Nettoyer les têtes d'impression
- Augmenter la résolution (300 DPI minimum)

### Problèmes de Scan

**Code-barre non reconnu**
- Vérifier le format du code (ADH/JEU + 8 chiffres)
- S'assurer que le code-barre est lisible
- Réimprimer si le code est endommagé
- Tester avec un autre lecteur

**Scan trop lent**
- Améliorer l'éclairage
- Utiliser un lecteur dédié au lieu de la webcam
- Nettoyer le code-barre
- Augmenter le FPS du scanner (config)

## Tests

### Exécuter les Tests

```bash
# Tests unitaires
npm test backend/tests/barcode.test.js

# Tests avec Jest
npx jest backend/tests/barcode.test.js

# Tests avec couverture
npx jest --coverage backend/tests/barcode.test.js
```

### Tests Manuels

**Page de test du scanner:**
```
http://localhost:8080/admin/scan-test.html
```

Cette page permet de:
- Tester la détection de la caméra
- Scanner des codes-barres
- Voir l'historique des scans
- Valider les codes avec l'API

## Exemples Pratiques

### Scénario 1: Nouveau Prêt

1. Ouvrir la page Emprunts
2. Cliquer sur "Webcam" pour l'adhérent
3. Scanner la carte de l'adhérent
4. Cliquer sur "Webcam" pour le jeu
5. Scanner le code-barre du jeu
6. Valider le prêt

### Scénario 2: Impression de Cartes en Masse

```javascript
// Sélectionner les nouveaux adhérents
const nouveauxAdherents = [1, 2, 3, 4, 5];

// Imprimer toutes les cartes
await printBatchAdherentCards(nouveauxAdherents);

// La fenêtre d'impression s'ouvre automatiquement
```

### Scénario 3: Vérification d'un Code-Barre

```javascript
// Scanner le code
const code = 'ADH00000001';

// Valider via l'API
const response = await fetch('/api/barcodes/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code })
});

const data = await response.json();
console.log(data.type); // 'adherent'
console.log(data.data); // Informations de l'adhérent
```

## Bonnes Pratiques

### Génération de Codes-Barres

1. **Toujours utiliser les fonctions helpers**
   - `generateAdherentCode(id)` pour les adhérents
   - `generateJeuCode(id)` pour les jeux

2. **Vérifier l'unicité**
   - Les codes-barres sont basés sur l'ID unique
   - Pas de collision possible

3. **Tester la scannabilité**
   - Imprimer des échantillons
   - Tester avec plusieurs lecteurs
   - Vérifier la qualité d'impression

### Scan et Lecture

1. **Optimiser les conditions**
   - Bon éclairage
   - Code-barre propre et intact
   - Distance appropriée

2. **Gestion des erreurs**
   - Valider tous les codes scannés
   - Afficher des messages clairs
   - Logger les erreurs pour debug

3. **Performance**
   - Utiliser des lecteurs dédiés pour gros volume
   - Webcam suffisante pour usage occasionnel
   - Mettre en cache les résultats fréquents

### Impression

1. **Qualité avant tout**
   - Papier de qualité (300g/m²)
   - Haute résolution (300 DPI)
   - Impression professionnelle si possible

2. **Conservation**
   - Plastifier les cartes d'adhérents
   - Protéger les étiquettes de jeux
   - Éviter l'exposition au soleil

3. **Sauvegardes**
   - Garder une copie numérique des codes
   - Possibilité de réimpression facile
   - Historique des impressions

## Support et Contact

Pour toute question ou problème:
- Consulter la documentation technique
- Vérifier les logs du serveur
- Tester avec la page de test
- Contacter le support technique

## Références

- [bwip-js Documentation](https://github.com/metafloor/bwip-js)
- [html5-qrcode Documentation](https://github.com/mebjas/html5-qrcode)
- [Code128 Specification](https://en.wikipedia.org/wiki/Code_128)
- [EAN-13 Specification](https://en.wikipedia.org/wiki/International_Article_Number)
