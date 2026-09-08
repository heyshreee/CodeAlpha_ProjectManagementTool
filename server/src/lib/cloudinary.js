const cloudinary = require('cloudinary').v2;
const env = require('../config/env');

cloudinary.config({
  cloud_name: env.storage.cloudinary.cloudName,
  api_key: env.storage.cloudinary.apiKey,
  api_secret: env.storage.cloudinary.apiSecret,
});

// Cloudinary resource types: 'image' for raster images, 'raw' for everything
// else (pdf/zip/docs). The media URL shape differs per type.
function resourceTypeFor(mimeType) {
  return mimeType && mimeType.startsWith('image/') ? 'image' : 'raw';
}

// Stream an in-memory buffer to Cloudinary. We always pass our own public_id so
// the DB is the single source of truth for the storage key.
function uploadBuffer(buffer, { publicId, resourceType = 'raw' }) {
  return new Promise((resolve, reject) => {
    const options = { public_id: publicId, resource_type: resourceType };
    const folder = env.storage.cloudinary.folder;
    if (folder) options.folder = folder;
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

function destroy(publicId, resourceType = 'raw') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

// Short-lived signed delivery URL so downloads stay auth-gated: the signed link
// is only minted after our membership/role check passes. Signature is computed
// from the public_id + timestamp + api_secret (no API round-trip needed).
function signedUrl(publicId, resourceType = 'raw') {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
    sign_url: true,
    timestamp: Math.floor(Date.now() / 1000),
  });
}

// Cloudinary secure_url shape: https://res.cloudinary.com/<cloud>/<type>/upload/v<version>/<public_id>[.<format>]
const URL_PATTERN = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/v\d+\/(.+)$/;

function publicIdFromUrl(url) {
  const match = typeof url === 'string' ? url.match(URL_PATTERN) : null;
  return match ? match[2] : null;
}

module.exports = {
  uploadBuffer,
  destroy,
  signedUrl,
  resourceTypeFor,
  publicIdFromUrl,
};