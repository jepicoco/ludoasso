const { Adherent, Jeu } = require('../models');
const {
  generateAdherentCode,
  generateJeuCode,
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

    const adherent = await Adherent.findByPk(id);
    if (!adherent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Adherent not found'
      });
    }

    const code = adherent.code_barre || generateAdherentCode(id);
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
    if (decoded.type === 'adherent') {
      entity = await Adherent.findByPk(decoded.id);
      if (!entity) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Adherent not found'
        });
      }
    } else if (decoded.type === 'jeu') {
      entity = await Jeu.findByPk(decoded.id);
      if (!entity) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Jeu not found'
        });
      }
    }

    res.json({
      type: decoded.type,
      id: decoded.id,
      code,
      [decoded.type]: entity
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

    const adherent = await Adherent.findByPk(id);
    if (!adherent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Adherent not found'
      });
    }

    const code = adherent.code_barre || generateAdherentCode(id);
    const barcodeBase64 = await generateBarcodeBase64(code);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Carte Adhérent - ${adherent.nom} ${adherent.prenom}</title>
  <style>
    @media print {
      @page { margin: 0; size: 85.6mm 53.98mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
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
  <div class="card">
    <div class="card-header">LUDOTHÈQUE - CARTE ADHÉRENT</div>
    <div class="card-body">
      <div class="name">${adherent.nom} ${adherent.prenom}</div>
      <div class="info">N° ${code}</div>
      <div class="info">Email: ${adherent.email}</div>
      <div class="info">Statut: ${adherent.statut}</div>
      <div class="barcode">
        <img src="${barcodeBase64}" alt="Barcode ${code}">
      </div>
    </div>
    <div class="footer">Valide jusqu'au ${adherent.date_fin_adhesion || 'N/A'}</div>
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

    const adherents = await Adherent.findAll({
      where: { id: ids }
    });

    if (adherents.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No adherents found with provided IDs'
      });
    }

    const cardsHtml = [];
    for (const adherent of adherents) {
      const code = adherent.code_barre || generateAdherentCode(adherent.id);
      const barcodeBase64 = await generateBarcodeBase64(code);

      cardsHtml.push(`
  <div class="card">
    <div class="card-header">LUDOTHÈQUE - CARTE ADHÉRENT</div>
    <div class="card-body">
      <div class="name">${adherent.nom} ${adherent.prenom}</div>
      <div class="info">N° ${code}</div>
      <div class="info">Email: ${adherent.email}</div>
      <div class="info">Statut: ${adherent.statut}</div>
      <div class="barcode">
        <img src="${barcodeBase64}" alt="Barcode ${code}">
      </div>
    </div>
    <div class="footer">Valide jusqu'au ${adherent.date_fin_adhesion || 'N/A'}</div>
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
  getBatchAdherentCards
};
