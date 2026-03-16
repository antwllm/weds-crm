import { Router } from 'express';
import multer from 'multer';
import { uploadAsset } from '../../services/storage.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { logger } from '../../logger.js';

const router = Router();
router.use(ensureAuthenticated);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// POST /api/upload -- upload a file (image or attachment) to GCS
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Aucun fichier fourni' });
      return;
    }

    const { url, gcsPath } = await uploadAsset(file.buffer, file.originalname, file.mimetype);

    logger.info('Fichier uploade sur GCS', { filename: file.originalname, size: file.size, gcsPath });

    res.json({
      url,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      gcsPath,
    });
  } catch (error) {
    logger.error('Erreur lors de l\'upload', { error });
    res.status(500).json({ error: 'Erreur lors de l\'upload du fichier' });
  }
});

export default router;
