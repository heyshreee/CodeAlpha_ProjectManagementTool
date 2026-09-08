const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const AppError = require('../lib/AppError');
const env = require('../config/env');

// Allow-list of safe MIME types. Never trust the client-provided filename or
// the Content-Type header alone; we also verify the magic bytes during save.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

// MIME types that must never be served as active content. Uploads whose
// detected/supplied type falls here are rejected outright even if the client
// claims a safe type, because serving them could result in stored XSS when a
// user downloads/previews the file in a browser.
const DANGEROUS_MIME = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'text/xml',
  'application/xml',
  'application/x-httpd-php',
  'application/x-sh',
]);

// File extensions that are never acceptable regardless of claimed MIME type.
const BLOCKED_EXTENSIONS = new Set([
  '.html', '.htm', '.shtml', '.svg', '.xml', '.xhtml', '.php', '.phtml',
  '.js', '.mjs', '.jsp', '.asp', '.aspx', '.jhtml', '.htaccess', '.sh',
  '.bat', '.cmd', '.exe', '.msi', '.dll', '.so', '.dylib', '.ps1', '.vbs',
  '.swf', '.jspx', '.cgi', '.pl',
]);

const MAX_BYTES = env.storage.maxUploadBytes;

// Original filenames may contain path separators or unsafe characters; we
// sanitize for display but always store under a random generated name.
function sanitizeFilename(name) {
  return path.basename(name).replace(/[^\w.\- ]/g, '_').slice(0, 255);
}

function generateStorageKey(originalName) {
  const ext = path.extname(originalName).slice(0, 10).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const safeName = path.basename(originalName, path.extname(originalName))
    .replace(/[^\w\- ]/g, '_').slice(0, 60);
  const random = crypto.randomBytes(8).toString('hex');
  return `${Date.now()}-${random}-${safeName}${ext}`.replace(/\s+/g, '_');
}

// Reject files that could be executed or served as active content in a browser.
function isRejectedFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) return true;
  if (DANGEROUS_MIME.has(file.mimetype)) return true;
  return false;
}

// 'memory' and 'cloudinary' drivers both need the raw buffer (multer memory);
// 'local' writes straight to disk.
const usesMemory = env.storage.driver === 'memory' || env.storage.driver === 'cloudinary';

let storage;
if (usesMemory) {
  storage = multer.memoryStorage();
} else {
  const fs = require('fs');
  if (!fs.existsSync(env.storage.localDir)) {
    fs.mkdirSync(env.storage.localDir, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: env.storage.localDir,
    filename: (_req, file, cb) => {
      // Random storage name; original name preserved only via sanitizeFilename
      // and persisted in the DB, never used for disk location. The generated
      // name carries NO extension so an uploaded file can never be served as
      // executable/active content by extension.
      cb(null, `attachment-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`);
    },
  });
}

async function verifyMagicBytes(fileBuffer) {
  if (!fileBuffer || fileBuffer.length < 12) return null;
  const b = fileBuffer;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  if (b[0] === 0x50 && b[1] === 0x4b) return 'application/zip';
  return null;
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (isRejectedFile(file)) {
      return cb(new AppError(400, 'File type not allowed'));
    }
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    return cb(new AppError(400, `File type not allowed: ${file.mimetype || 'unknown'}`));
  },
});

// Dedicated image upload for avatars. Only raster image MIME types are
// accepted and the file is stored under a random name preserving a safe
// extension so it can be rendered as an <img> without a Sniffing risk.
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const IMAGE_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };

let imageStorage;
if (usesMemory) {
  imageStorage = multer.memoryStorage();
} else {
  imageStorage = multer.diskStorage({
    destination: env.storage.localDir,
    filename: (_req, file, cb) => {
      const ext = IMAGE_EXT[file.mimetype] || '.img';
      cb(null, `avatar-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  });
}

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype) || isRejectedFile(file)) {
      return cb(new AppError(400, 'Only PNG, JPEG, WebP, or GIF images are allowed'));
    }
    return cb(null, true);
  },
});

module.exports = {
  upload,
  imageUpload,
  ALLOWED_MIME,
  MAX_BYTES,
  sanitizeFilename,
  generateStorageKey,
  verifyMagicBytes,
};
