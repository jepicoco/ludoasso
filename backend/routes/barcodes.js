const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcodeController');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   GET /api/barcodes/adherent/:id/image
 * @desc    Get adherent barcode as PNG image
 * @access  Private
 */
router.get('/adherent/:id/image', verifyToken, barcodeController.getAdherentBarcodeImage);

/**
 * @route   GET /api/barcodes/jeu/:id/image
 * @desc    Get jeu barcode as PNG image
 * @access  Private
 */
router.get('/jeu/:id/image', verifyToken, barcodeController.getJeuBarcodeImage);

/**
 * @route   GET /api/barcodes/adherent/:id/card
 * @desc    Get printable adherent card HTML
 * @access  Private
 */
router.get('/adherent/:id/card', verifyToken, barcodeController.getAdherentCard);

/**
 * @route   GET /api/barcodes/jeu/:id/label
 * @desc    Get printable jeu label HTML
 * @access  Private
 */
router.get('/jeu/:id/label', verifyToken, barcodeController.getJeuLabel);

/**
 * @route   GET /api/barcodes/livre/:id/label
 * @desc    Get printable livre label HTML
 * @access  Private
 */
router.get('/livre/:id/label', verifyToken, barcodeController.getLivreLabel);

/**
 * @route   GET /api/barcodes/film/:id/label
 * @desc    Get printable film label HTML
 * @access  Private
 */
router.get('/film/:id/label', verifyToken, barcodeController.getFilmLabel);

/**
 * @route   GET /api/barcodes/disque/:id/label
 * @desc    Get printable disque label HTML
 * @access  Private
 */
router.get('/disque/:id/label', verifyToken, barcodeController.getDisqueLabel);

/**
 * @route   POST /api/barcodes/scan
 * @desc    Scan and validate barcode, return entity
 * @access  Private
 * @body    { code: "ADH00000001" }
 */
router.post('/scan', verifyToken, barcodeController.scanBarcode);

/**
 * @route   POST /api/barcodes/adherents/batch
 * @desc    Generate batch printable adherent cards
 * @access  Private
 * @body    { ids: [1, 2, 3] }
 */
router.post('/adherents/batch', verifyToken, barcodeController.getBatchAdherentCards);

module.exports = router;
