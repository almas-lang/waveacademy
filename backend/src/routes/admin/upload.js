// Admin Upload Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireAdmin } = require('../../middleware/auth');

router.use(authenticate);
router.use(requireAdmin);

// Rate limit uploads: 20 per minute per user (auth required, so user.id always exists)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || 'unknown',
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many uploads. Please wait a moment.' }
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'text/plain',
];

// Map MIME types to safe extensions
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
  'text/plain': 'txt',
};

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
router.post('/thumbnail', uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' }
      });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'File must be an image (JPEG, PNG, WebP, or GIF)' }
      });
    }

    const fileExtension = MIME_TO_EXT[req.file.mimetype] || 'bin';
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
    console.error('Thumbnail upload error:', error.message, error.Code || error.code);
    res.status(500).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: 'Upload failed. Please try again.' }
    });
  }
});

/**
 * POST /admin/upload/pdf
 * Upload PDF lesson
 */
router.post('/pdf', uploadLimiter, upload.single('file'), async (req, res, next) => {
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
router.post('/attachment', uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' }
      });
    }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'File type not allowed. Accepted: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, TXT' }
      });
    }

    const fileExtension = MIME_TO_EXT[req.file.mimetype] || 'bin';
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
