const bwipjs = require('bwip-js');

/**
 * Generate adherent barcode string from ID
 * Format: ADH00000001
 */
const generateAdherentCode = (id) => {
  const paddedId = String(id).padStart(8, '0');
  return `ADH${paddedId}`;
};

/**
 * Generate jeu barcode string from ID
 * Format: JEU00000001
 */
const generateJeuCode = (id) => {
  const paddedId = String(id).padStart(8, '0');
  return `JEU${paddedId}`;
};

/**
 * Decode a barcode string to extract type and ID
 * @param {string} code - The barcode string (e.g., "ADH00000001" or "JEU00000123")
 * @returns {Object} - { type: 'adherent'|'jeu', id: number } or null if invalid
 */
const decodeBarcode = (code) => {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const adherentMatch = code.match(/^ADH(\d{8})$/);
  if (adherentMatch) {
    return {
      type: 'adherent',
      id: parseInt(adherentMatch[1], 10)
    };
  }

  const jeuMatch = code.match(/^JEU(\d{8})$/);
  if (jeuMatch) {
    return {
      type: 'jeu',
      id: parseInt(jeuMatch[1], 10)
    };
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
 * type: 1 for adherent, 2 for jeu
 */
const generateEAN13Code = (id, type) => {
  const typeCode = type === 'adherent' ? '1' : '2';
  const paddedId = String(id).padStart(8, '0');
  const code12 = `200${typeCode}${paddedId}`;
  const checkDigit = calculateEAN13CheckDigit(code12);
  return `${code12}${checkDigit}`;
};

module.exports = {
  generateAdherentCode,
  generateJeuCode,
  decodeBarcode,
  generateBarcodeImage,
  generateBarcodeBase64,
  calculateEAN13CheckDigit,
  generateEAN13Code
};
