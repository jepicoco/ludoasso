const { Utilisateur, Jeu, Livre, Film, Disque, Cotisation, ParametresStructure } = require('../models');
const {
  generateAdherentCode,
  generateJeuCode,
  generateLivreCode,
  generateFilmCode,
  generateCdCode,
  decodeBarcode,
  generateBarcodeImage,
  generateBarcodeBase64
} = require('../utils/barcodeGenerator');

/**
 * Get adherent barcode image
 * GET /api/barcodes/adherent/:id/image
 */
const getAdherentBarcodeImage = async (req, res) => {
  try {
    const { id } = req.params;

    const utilisateur = await Utilisateur.findByPk(id);
    if (!utilisateur) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Utilisateur not found'
      });
    }

    const code = utilisateur.code_barre || generateAdherentCode(id);
    const imageBuffer = await generateBarcodeImage(code);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="adherent-${id}-barcode.png"`);
    res.send(imageBuffer);
  } catch (error) {
    console.error('Get adherent barcode image error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get jeu barcode image
 * GET /api/barcodes/jeu/:id/image
 */
const getJeuBarcodeImage = async (req, res) => {
  try {
    const { id } = req.params;

    const jeu = await Jeu.findByPk(id);
    if (!jeu) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Jeu not found'
      });
    }

    const code = jeu.code_barre || generateJeuCode(id);
    const imageBuffer = await generateBarcodeImage(code);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="jeu-${id}-barcode.png"`);
    res.send(imageBuffer);
  } catch (error) {
    console.error('Get jeu barcode image error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Scan and validate barcode
 * POST /api/barcodes/scan
 * Body: { code: "ADH00000001" }
 * Supports: ADH (adherent), JEU, LIV (livre), FLM (film), DSQ (disque)
 */
const scanBarcode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Barcode code is required'
      });
    }

    const decoded = decodeBarcode(code);
    if (!decoded) {
      return res.status(400).json({
        error: 'Invalid barcode',
        message: 'Barcode format is invalid'
      });
    }

    let entity = null;
    let responseType = decoded.type;

    if (decoded.type === 'utilisateur') {
      entity = await Utilisateur.findByPk(decoded.id);
      if (!entity) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Usager non trouve'
        });
      }
      responseType = 'adherent'; // Pour compatibilite frontend
    } else if (decoded.type === 'jeu') {
      entity = await Jeu.findByPk(decoded.id);
      if (!entity) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Jeu non trouve'
        });
      }
    } else if (decoded.type === 'livre') {
      entity = await Livre.findByPk(decoded.id);
      if (!entity) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Livre non trouve'
        });
      }
    } else if (decoded.type === 'film') {
      entity = await Film.findByPk(decoded.id);
      if (!entity) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Film non trouve'
        });
      }
    } else if (decoded.type === 'cd' || decoded.type === 'disque') {
      entity = await Disque.findByPk(decoded.id);
      if (!entity) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Disque non trouve'
        });
      }
      responseType = 'disque';
    } else {
      return res.status(400).json({
        error: 'Invalid barcode',
        message: `Type de code-barre non supporte: ${decoded.type}`
      });
    }

    res.json({
      type: responseType,
      id: decoded.id,
      code,
      [responseType]: entity
    });
  } catch (error) {
    console.error('Scan barcode error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get printable adherent card HTML
 * GET /api/barcodes/adherent/:id/card
 */
const getAdherentCard = async (req, res) => {
  try {
    const { id } = req.params;

    const utilisateur = await Utilisateur.findByPk(id);
    if (!utilisateur) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Utilisateur not found'
      });
    }

    // Recuperer les parametres de la structure
    const parametres = await ParametresStructure.findOne();
    const nomStructure = parametres?.nom_structure || 'LUDOTHEQUE';
    const logoUrl = parametres?.logo || null;

    // Recuperer la cotisation active
    const now = new Date();
    const cotisation = await Cotisation.findOne({
      where: {
        utilisateur_id: id,
        statut: 'validee'
      },
      order: [['periode_fin', 'DESC']]
    });

    const code = utilisateur.code_barre || generateAdherentCode(id);
    const barcodeBase64 = await generateBarcodeBase64(code);

    // Formater les dates de cotisation
    let validiteDebut = 'N/A';
    let validiteFin = 'N/A';
    let cotisationActive = false;

    if (cotisation) {
      const debut = new Date(cotisation.periode_debut);
      const fin = new Date(cotisation.periode_fin);
      validiteDebut = debut.toLocaleDateString('fr-FR');
      validiteFin = fin.toLocaleDateString('fr-FR');
      cotisationActive = now >= debut && now <= fin;
    }

    // Texte de validite
    const validiteText = cotisation
      ? `Du ${validiteDebut} au ${validiteFin}`
      : 'Aucune cotisation';

    // Message de validite personnalise (peut etre passe via query param)
    const customMessage = req.query.message || null;

    // Determiner le texte de validite
    let validityDisplayText;
    if (customMessage) {
      validityDisplayText = customMessage;
    } else if (cotisation && cotisationActive) {
      validityDisplayText = 'Valide : ' + validiteDebut + ' - ' + validiteFin;
    } else if (cotisation) {
      validityDisplayText = 'Expiree le ' + validiteFin;
    } else {
      validityDisplayText = 'Aucune cotisation';
    }

    // Generer le HTML du logo si disponible
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="Logo" class="header-logo">`
      : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Carte - ${utilisateur.nom} ${utilisateur.prenom}</title>
  <style>
    @page { size: auto; margin: 5mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
    body { font-family: Arial, sans-serif; margin: 10px; }
    .card {
      width: 320px;
      border: 2px solid #1e3c72;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    .card-header {
      background: linear-gradient(135deg, #1e3c72, #2a5298);
      color: white;
      padding: 8px 12px;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-title { flex: 1; }
    .header-logo { height: 32px; width: auto; margin-left: 10px; border-radius: 4px; }
    .card-body { padding: 10px 12px; }
    .name { font-size: 18px; font-weight: bold; color: #1e3c72; margin-bottom: 6px; }
    .validity {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      margin: 4px 0;
      background: ${cotisationActive ? '#d4edda' : '#f8d7da'};
      color: ${cotisationActive ? '#155724' : '#721c24'};
      border: 1px solid ${cotisationActive ? '#c3e6cb' : '#f5c6cb'};
    }
    .barcode-section {
      background: #f8f9fa;
      padding: 15px 10px;
      text-align: center;
      border-top: 1px solid #ddd;
    }
    .barcode-section img { height: 70px; }
    .btn { display: block; margin: 15px auto; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
    .btn:hover { background: #0056b3; }
    .instructions { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin-bottom: 15px; border-radius: 5px; font-size: 12px; color: #856404; }
  </style>
</head>
<body>
  <div class="instructions no-print">
    <b>Conseil :</b> Dans la boite de dialogue d'impression, desactivez "En-tetes et pieds de page" pour un meilleur rendu.
  </div>
  <div class="card">
    <div class="card-header">
      <span class="header-title">${nomStructure.toUpperCase()}</span>
      ${logoHtml}
    </div>
    <div class="card-body">
      <div class="name">${utilisateur.prenom} ${utilisateur.nom}</div>
      <div class="validity">${validityDisplayText}</div>
    </div>
    <div class="barcode-section">
      <img src="${barcodeBase64}" alt="Code-barre">
    </div>
  </div>
  <button class="btn no-print" onclick="window.print()">Imprimer</button>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Get adherent card error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get printable jeu label HTML
 * GET /api/barcodes/jeu/:id/label
 */
const getJeuLabel = async (req, res) => {
  try {
    const { id } = req.params;

    const jeu = await Jeu.findByPk(id);
    if (!jeu) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Jeu not found'
      });
    }

    const code = jeu.code_barre || generateJeuCode(id);
    const barcodeBase64 = await generateBarcodeBase64(code);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Étiquette Jeu - ${jeu.titre}</title>
  <style>
    @media print {
      @page { margin: 0; size: 100mm 60mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .label {
      width: 100mm;
      height: 60mm;
      border: 2px solid #333;
      border-radius: 4px;
      padding: 4mm;
      box-sizing: border-box;
      background: white;
    }
    .label-header {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 2mm;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 2mm;
    }
    .info {
      font-size: 11px;
      margin-bottom: 1mm;
      color: #555;
    }
    .info strong {
      color: #333;
    }
    .barcode {
      text-align: center;
      margin-top: 2mm;
      padding: 2mm;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .barcode img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-header">${jeu.titre}</div>
    <div class="info"><strong>Éditeur:</strong> ${jeu.editeur || 'N/A'}</div>
    <div class="info"><strong>Catégorie:</strong> ${jeu.categorie || 'N/A'}</div>
    <div class="info"><strong>Âge:</strong> ${jeu.age_min || 'N/A'}+ | <strong>Joueurs:</strong> ${jeu.nb_joueurs_min || '?'}-${jeu.nb_joueurs_max || '?'}</div>
    <div class="barcode">
      <img src="${barcodeBase64}" alt="Barcode ${code}">
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Get jeu label error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get printable livre label HTML
 * GET /api/barcodes/livre/:id/label
 */
const getLivreLabel = async (req, res) => {
  try {
    const { id } = req.params;

    const livre = await Livre.findByPk(id);
    if (!livre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Livre not found'
      });
    }

    const code = livre.code_barre || generateLivreCode(id);
    const barcodeBase64 = await generateBarcodeBase64(code);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Étiquette Livre - ${livre.titre}</title>
  <style>
    @media print {
      @page { margin: 0; size: 100mm 60mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .label {
      width: 100mm;
      height: 60mm;
      border: 2px solid #333;
      border-radius: 4px;
      padding: 4mm;
      box-sizing: border-box;
      background: white;
    }
    .label-header {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 2mm;
      color: #333;
      border-bottom: 2px solid #28a745;
      padding-bottom: 2mm;
    }
    .info {
      font-size: 11px;
      margin-bottom: 1mm;
      color: #555;
    }
    .info strong {
      color: #333;
    }
    .barcode {
      text-align: center;
      margin-top: 2mm;
      padding: 2mm;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .barcode img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-header">${livre.titre}</div>
    <div class="info"><strong>ISBN:</strong> ${livre.isbn || 'N/A'}</div>
    <div class="info"><strong>Année:</strong> ${livre.annee_publication || 'N/A'} | <strong>Pages:</strong> ${livre.nb_pages || 'N/A'}</div>
    <div class="info"><strong>Tome:</strong> ${livre.tome || 'N/A'}</div>
    <div class="barcode">
      <img src="${barcodeBase64}" alt="Barcode ${code}">
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Get livre label error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get printable film label HTML
 * GET /api/barcodes/film/:id/label
 */
const getFilmLabel = async (req, res) => {
  try {
    const { id } = req.params;

    const film = await Film.findByPk(id);
    if (!film) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Film not found'
      });
    }

    const code = film.code_barre || generateFilmCode(id);
    const barcodeBase64 = await generateBarcodeBase64(code);

    // Formater la durée
    const dureeFormatted = film.duree ? `${film.duree} min` : 'N/A';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Étiquette Film - ${film.titre}</title>
  <style>
    @media print {
      @page { margin: 0; size: 100mm 60mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .label {
      width: 100mm;
      height: 60mm;
      border: 2px solid #333;
      border-radius: 4px;
      padding: 4mm;
      box-sizing: border-box;
      background: white;
    }
    .label-header {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 2mm;
      color: #333;
      border-bottom: 2px solid #e83e8c;
      padding-bottom: 2mm;
    }
    .info {
      font-size: 11px;
      margin-bottom: 1mm;
      color: #555;
    }
    .info strong {
      color: #333;
    }
    .barcode {
      text-align: center;
      margin-top: 2mm;
      padding: 2mm;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .barcode img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-header">${film.titre}</div>
    <div class="info"><strong>Année:</strong> ${film.annee_sortie || 'N/A'} | <strong>Durée:</strong> ${dureeFormatted}</div>
    <div class="info"><strong>Classification:</strong> ${film.classification || 'TP'}</div>
    <div class="barcode">
      <img src="${barcodeBase64}" alt="Barcode ${code}">
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Get film label error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get printable disque label HTML
 * GET /api/barcodes/disque/:id/label
 */
const getDisqueLabel = async (req, res) => {
  try {
    const { id } = req.params;

    const disque = await Disque.findByPk(id);
    if (!disque) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Disque not found'
      });
    }

    const code = disque.code_barre || generateCdCode(id);
    const barcodeBase64 = await generateBarcodeBase64(code);

    // Formater la durée
    const dureeFormatted = disque.duree_totale ? `${disque.duree_totale} min` : 'N/A';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Étiquette Disque - ${disque.titre}</title>
  <style>
    @media print {
      @page { margin: 0; size: 100mm 60mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .label {
      width: 100mm;
      height: 60mm;
      border: 2px solid #333;
      border-radius: 4px;
      padding: 4mm;
      box-sizing: border-box;
      background: white;
    }
    .label-header {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 2mm;
      color: #333;
      border-bottom: 2px solid #fd7e14;
      padding-bottom: 2mm;
    }
    .info {
      font-size: 11px;
      margin-bottom: 1mm;
      color: #555;
    }
    .info strong {
      color: #333;
    }
    .barcode {
      text-align: center;
      margin-top: 2mm;
      padding: 2mm;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .barcode img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-header">${disque.titre}</div>
    <div class="info"><strong>Année:</strong> ${disque.annee_sortie || 'N/A'} | <strong>Durée:</strong> ${dureeFormatted}</div>
    <div class="info"><strong>Pistes:</strong> ${disque.nb_pistes || 'N/A'}</div>
    <div class="barcode">
      <img src="${barcodeBase64}" alt="Barcode ${code}">
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Get disque label error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Generate batch adherent cards
 * POST /api/barcodes/adherents/batch
 * Body: { ids: [1, 2, 3] }
 */
const getBatchAdherentCards = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'ids array is required'
      });
    }

    const utilisateurs = await Utilisateur.findAll({
      where: { id: ids }
    });

    if (utilisateurs.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No utilisateurs found with provided IDs'
      });
    }

    const cardsHtml = [];
    for (const utilisateur of utilisateurs) {
      const code = utilisateur.code_barre || generateAdherentCode(utilisateur.id);
      const barcodeBase64 = await generateBarcodeBase64(code);

      cardsHtml.push(`
  <div class="card">
    <div class="card-header">LUDOTHÈQUE - CARTE USAGER</div>
    <div class="card-body">
      <div class="name">${utilisateur.nom} ${utilisateur.prenom}</div>
      <div class="info">N° ${code}</div>
      <div class="info">Email: ${utilisateur.email}</div>
      <div class="info">Statut: ${utilisateur.statut}</div>
      <div class="barcode">
        <img src="${barcodeBase64}" alt="Barcode ${code}">
      </div>
    </div>
    <div class="footer">Valide jusqu'au ${utilisateur.date_fin_adhesion || 'N/A'}</div>
  </div>
  <div class="page-break"></div>`);
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cartes Adhérents - Batch</title>
  <style>
    @media print {
      @page { margin: 10mm; }
      .page-break { page-break-after: always; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 10mm;
    }
    .card {
      width: 85.6mm;
      height: 53.98mm;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 8mm;
      box-sizing: border-box;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      position: relative;
      margin-bottom: 10mm;
    }
    .card-header {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4mm;
      text-align: center;
    }
    .card-body {
      background: white;
      color: #333;
      padding: 3mm;
      border-radius: 4px;
    }
    .name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 2mm;
    }
    .info {
      font-size: 10px;
      margin-bottom: 1mm;
    }
    .barcode {
      text-align: center;
      margin-top: 2mm;
    }
    .barcode img {
      max-width: 100%;
      height: auto;
    }
    .footer {
      position: absolute;
      bottom: 2mm;
      left: 8mm;
      right: 8mm;
      text-align: center;
      font-size: 8px;
    }
  </style>
</head>
<body>
  ${cardsHtml.join('\n')}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Get batch adherent cards error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

module.exports = {
  getAdherentBarcodeImage,
  getJeuBarcodeImage,
  scanBarcode,
  getAdherentCard,
  getJeuLabel,
  getLivreLabel,
  getFilmLabel,
  getDisqueLabel,
  getBatchAdherentCards
};
