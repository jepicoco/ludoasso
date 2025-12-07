const bwipjs = require('bwip-js');

/**
 * Generate utilisateur (usager) barcode string from ID
 * Format: USA00000001
 */
const generateUtilisateurCode = (id) => {
  const paddedId = String(id).padStart(8, '0');
  return `USA${paddedId}`;
};

// Alias pour compatibilite
const generateAdherentCode = generateUtilisateurCode;

/**
 * Generate jeu barcode string from ID
 * Format: JEU00000001
 */
const generateJeuCode = (id) => {
  const paddedId = String(id).padStart(8, '0');
  return `JEU${paddedId}`;
};

/**
 * Generate livre barcode string from ID
 * Format: LIV00000001
 */
const generateLivreCode = (id) => {
  const paddedId = String(id).padStart(8, '0');
  return `LIV${paddedId}`;
};

/**
 * Generate film barcode string from ID
 * Format: FLM00000001
 */
const generateFilmCode = (id) => {
  const paddedId = String(id).padStart(8, '0');
  return `FLM${paddedId}`;
};

/**
 * Generate CD barcode string from ID
 * Format: MUS00000001
 */
const generateCdCode = (id) => {
  const paddedId = String(id).padStart(8, '0');
  return `MUS${paddedId}`;
};

/**
 * Decode a barcode string to extract type and ID
 * @param {string} code - The barcode string (e.g., "USA00000001", "ADH00000001", "JEU00000123", "LIV00000001")
 * @returns {Object} - { type: 'utilisateur'|'jeu'|'livre'|'film'|'cd', id: number } or null if invalid
 */
const decodeBarcode = (code) => {
  if (!code || typeof code !== 'string') {
    return null;
  }

  // Configuration des patterns par type
  // USA est le nouveau prefixe, ADH est conserve pour compatibilite
  const patterns = {
    USA: { type: 'utilisateur', model: 'Utilisateur' },
    ADH: { type: 'utilisateur', model: 'Utilisateur' }, // Compatibilite ancien format
    JEU: { type: 'jeu', model: 'Jeu' },
    LIV: { type: 'livre', model: 'Livre' },
    FLM: { type: 'film', model: 'Film' },
    MUS: { type: 'cd', model: 'Cd' }
  };

  // Verifier chaque pattern
  for (const [prefix, info] of Object.entries(patterns)) {
    const match = code.match(new RegExp(`^${prefix}(\\d{8})$`));
    if (match) {
      return {
        ...info,
        id: parseInt(match[1], 10)
      };
    }
  }

  return null;
};

/**
 * Generate barcode image as PNG buffer
 * @param {string} code - The barcode string to encode
 * @param {Object} options - Barcode generation options
 * @returns {Promise<Buffer>} - PNG image buffer
 */
const generateBarcodeImage = async (code, options = {}) => {
  try {
    const defaultOptions = {
      bcid: 'code128',       // Barcode type
      text: code,            // Text to encode
      scale: 3,              // 3x scaling factor
      height: 10,            // Bar height, in millimeters
      includetext: true,     // Show human-readable text
      textxalign: 'center',  // Always good to set this
    };

    const barcodeOptions = { ...defaultOptions, ...options };

    const png = await bwipjs.toBuffer(barcodeOptions);
    return png;
  } catch (error) {
    throw new Error(`Barcode generation failed: ${error.message}`);
  }
};

/**
 * Generate barcode image as base64 data URI
 * @param {string} code - The barcode string to encode
 * @param {Object} options - Barcode generation options
 * @returns {Promise<string>} - Base64 data URI
 */
const generateBarcodeBase64 = async (code, options = {}) => {
  try {
    const buffer = await generateBarcodeImage(code, options);
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    throw new Error(`Barcode base64 generation failed: ${error.message}`);
  }
};

/**
 * Calculate EAN-13 check digit
 * @param {string} code - 12-digit code without check digit
 * @returns {number} - Check digit (0-9)
 */
const calculateEAN13CheckDigit = (code) => {
  if (code.length !== 12) {
    throw new Error('EAN-13 code must be 12 digits');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
};

/**
 * Generate EAN-13 barcode from ID
 * Format: 200[type][8-digit-id][check]
 * type: 1=adherent, 2=jeu, 3=livre, 4=film, 5=cd
 */
const generateEAN13Code = (id, type) => {
  const typeCodes = {
    adherent: '1',
    jeu: '2',
    livre: '3',
    film: '4',
    cd: '5'
  };
  const typeCode = typeCodes[type] || '0';
  const paddedId = String(id).padStart(8, '0');
  const code12 = `200${typeCode}${paddedId}`;
  const checkDigit = calculateEAN13CheckDigit(code12);
  return `${code12}${checkDigit}`;
};

/**
 * Generate barcode code based on type
 */
const generateCode = (id, type) => {
  switch (type) {
    case 'utilisateur':
    case 'adherent': // Compatibilite
      return generateUtilisateurCode(id);
    case 'jeu': return generateJeuCode(id);
    case 'livre': return generateLivreCode(id);
    case 'film': return generateFilmCode(id);
    case 'cd': return generateCdCode(id);
    default: throw new Error(`Unknown barcode type: ${type}`);
  }
};

module.exports = {
  generateUtilisateurCode,
  generateAdherentCode, // Alias pour compatibilite
  generateJeuCode,
  generateLivreCode,
  generateFilmCode,
  generateCdCode,
  generateCode,
  decodeBarcode,
  generateBarcodeImage,
  generateBarcodeBase64,
  calculateEAN13CheckDigit,
  generateEAN13Code
};
