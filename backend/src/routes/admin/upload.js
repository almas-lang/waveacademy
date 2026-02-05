// Admin Upload Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireAdmin } = require('../../middleware/auth');

router.use(authenticate);
router.use(requireAdmin);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for PDFs/images
  }
});

// Configure R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

/**
 * POST /admin/upload/thumbnail
 * Upload program thumbnail
 */
router.post('/thumbnail', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' }
      });
    }

    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `thumbnails/${uuidv4()}.${fileExtension}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));

    const url = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    res.json({
      success: true,
      data: { url }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/upload/pdf
 * Upload PDF lesson
 */
router.post('/pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' }
      });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'File must be a PDF' }
      });
    }

    const fileName = `pdfs/${uuidv4()}.pdf`;

    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: 'application/pdf'
    }));

    const url = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    res.json({
      success: true,
      data: { url }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/upload/attachment
 * Upload lesson attachment
 */
router.post('/attachment', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' }
      });
    }

    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `attachments/${uuidv4()}.${fileExtension}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));

    const url = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    res.json({
      success: true,
      data: { 
        url,
        name: req.file.originalname,
        type: req.file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/upload/video-url
 * Get Bunny.net TUS upload URL for direct video upload
 */
router.get('/video-url', async (req, res, next) => {
  try {
    const { title } = req.query;

    // Create video in Bunny Stream library
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': process.env.BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title || 'Untitled Video'
        })
      }
    );

    if (!createResponse.ok) {
      throw new Error('Failed to create video in Bunny');
    }

    const video = await createResponse.json();

    // Generate TUS upload URL
    const uploadUrl = `https://video.bunnycdn.com/tusupload`;

    res.json({
      success: true,
      data: {
        videoId: video.guid,
        uploadUrl,
        authorizationSignature: video.guid, // Used for TUS upload auth
        authorizationExpire: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        libraryId: process.env.BUNNY_LIBRARY_ID,
        embedUrl: `https://iframe.mediadelivery.net/embed/${process.env.BUNNY_LIBRARY_ID}/${video.guid}`
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/upload/video-status/:videoId
 * Check video encoding status
 */
router.get('/video-status/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const response = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          'AccessKey': process.env.BUNNY_STREAM_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get video status');
    }

    const video = await response.json();

    res.json({
      success: true,
      data: {
        videoId: video.guid,
        status: video.status, // 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
        encodeProgress: video.encodeProgress,
        length: video.length,
        thumbnailUrl: video.thumbnailFileName 
          ? `https://${process.env.BUNNY_CDN_HOSTNAME}/${video.guid}/${video.thumbnailFileName}`
          : null
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
