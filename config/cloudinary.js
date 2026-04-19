const cloudinary = require('cloudinary').v2;

const configCloudinary = (user) => {
  const k = user?.apiKeys || {};
  cloudinary.config({
    cloud_name:  k.cloudinaryName   || process.env.CLOUDINARY_CLOUD_NAME,
    api_key:     k.cloudinaryKey    || process.env.CLOUDINARY_API_KEY,
    api_secret:  k.cloudinarySecret || process.env.CLOUDINARY_API_SECRET,
  });
  return !!(cloudinary.config().cloud_name && cloudinary.config().api_key);
};

const uploadBase64 = async (base64, folder = 'pixelforge/images') => {
  try {
    const r = await cloudinary.uploader.upload(`data:image/png;base64,${base64}`, {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    });
    return { url: r.secure_url, publicId: r.public_id };
  } catch (e) {
    console.warn('Cloudinary upload failed:', e.message);
    return null;
  }
};

const deleteImage = async (publicId) => {
  try { await cloudinary.uploader.destroy(publicId); } catch (_) {}
};

module.exports = { configCloudinary, uploadBase64, deleteImage };
