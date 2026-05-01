const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const FormData = require('form-data');
const { protect }                    = require('../middleware/auth');
const { configCloudinary, uploadBase64 } = require('../config/cloudinary');
const { Image, User }                = require('../models');

// ── HELPERS ──────────────────────────────────────────────
const getRBGKey = (user) =>
  (user.apiKeys?.removebg) || process.env.REMOVEBG_API_KEY || '';

// Pollinations.AI - FREE, no API key needed
const callAI = async (prompt) => {
  const encoded = encodeURIComponent(prompt.trim())
  const seed    = Math.floor(Math.random() * 999999)
  const url     = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&model=flux`
  
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 90000,
    headers: { 'User-Agent': 'PixelForge/1.0' }
  })
  return Buffer.from(res.data).toString('base64')
}

const saveImg = async (userId, url, prompt, type, cloud) => {
  const img = await Image.create({
    user: userId, url, prompt, type,
    cloudUrl:  cloud?.url      || '',
    publicId:  cloud?.publicId || ''
  })
  await User.findByIdAndUpdate(userId, {
    $inc: { 'stats.imagesGenerated': 1 }
  })
  return img
}

const aiError = (res, e) => {
  console.error('AI Error:', e.message)
  if (e.code === 'ECONNABORTED') {
    return res.status(504).json({
      success: false,
      message: 'AI timeout. Try again.'
    })
  }
  res.status(500).json({
    success: false,
    message: e.message || 'AI generation failed'
  })
}

// ── POST /api/images/generate ─────────────────────────────
router.post('/generate', protect, async (req, res) => {
  try {
    const { prompt, style = '', count = 1 } = req.body
    if (!prompt?.trim())
      return res.status(400).json({ success: false, message: 'Prompt is required' })

    const full = `${prompt.trim()}${style ? ', ' + style : ''}, highly detailed, professional quality`
    const num  = Math.min(parseInt(count) || 1, 4)
    const hasCloud = configCloudinary(req.user)
    const results  = []

    for (let i = 0; i < num; i++) {
      const b64   = await callAI(full)
      const url   = `data:image/png;base64,${b64}`
      const cloud = hasCloud ? await uploadBase64(b64, 'pixelforge/generated') : null
      const saved = await saveImg(req.user._id, url, full, 'text-to-image', cloud)
      results.push({
        id: saved._id, url,
        cloudUrl: cloud?.url || '',
        prompt: full,
        createdAt: saved.createdAt
      })
    }
    res.json({ success: true, message: `${num} image(s) generated!`, images: results })
  } catch (e) { aiError(res, e) }
})

// ── POST /api/images/variations ───────────────────────────
router.post('/variations', protect, async (req, res) => {
  try {
    const { style = '', count = 4 } = req.body
    const hasCloud = configCloudinary(req.user)
    const results  = []
    const num = Math.min(parseInt(count) || 4, 4)

    for (let i = 0; i < num; i++) {
      const p   = `creative artistic variation ${i + 1}${style ? ', ' + style : ''}, highly detailed, professional`
      const b64 = await callAI(p)
      const url  = `data:image/png;base64,${b64}`
      const cloud = hasCloud ? await uploadBase64(b64, 'pixelforge/variations') : null
      const saved = await saveImg(req.user._id, url, p, 'variation', cloud)
      results.push({ id: saved._id, url, cloudUrl: cloud?.url || '', createdAt: saved.createdAt })
    }
    res.json({ success: true, message: `${num} variations ready!`, images: results })
  } catch (e) { aiError(res, e) }
})

// ── POST /api/images/remove-bg ────────────────────────────
router.post('/remove-bg', protect, async (req, res) => {
  try {
    const { imageBase64 } = req.body
    const key = getRBGKey(req.user)
    if (!key)
      return res.status(400).json({
        success: false,
        message: 'REMOVEBG_API_KEY missing in backend .env file'
      })
    if (!imageBase64)
      return res.status(400).json({ success: false, message: 'Image data required' })

    const formData = new FormData()
    const buf = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64'
    )
    formData.append('image_file', buf, { filename: 'image.png', contentType: 'image/png' })
    formData.append('size', 'auto')

    const response = await axios.post(
      'https://api.remove.bg/v1.0/removebg',
      formData,
      {
        headers: { 'X-Api-Key': key, ...formData.getHeaders() },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    )

    const b64   = Buffer.from(response.data).toString('base64')
    const url   = `data:image/png;base64,${b64}`
    const hasCloud = configCloudinary(req.user)
    const cloud = hasCloud ? await uploadBase64(b64, 'pixelforge/bg-removed') : null

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.bgRemovals': 1 }
    })
    const saved = await saveImg(req.user._id, url, 'background removed', 'bg-remove', cloud)

    res.json({
      success: true,
      message: 'Background removed!',
      image: { id: saved._id, url, cloudUrl: cloud?.url || '', createdAt: saved.createdAt }
    })
  } catch (e) {
    if (e.response?.status === 402)
      return res.status(402).json({
        success: false,
        message: 'Remove.bg free limit (50/month) reached.'
      })
    res.status(500).json({ success: false, message: e.message || 'BG removal failed' })
  }
})

// ── POST /api/images/inpaint ──────────────────────────────
router.post('/inpaint', protect, async (req, res) => {
  try {
    const { prompt } = req.body
    if (!prompt?.trim())
      return res.status(400).json({ success: false, message: 'Prompt required' })

    const full  = `${prompt.trim()}, seamless blend, professional quality, photorealistic`
    const b64   = await callAI(full)
    const url   = `data:image/png;base64,${b64}`
    const hasCloud = configCloudinary(req.user)
    const cloud = hasCloud ? await uploadBase64(b64, 'pixelforge/inpainted') : null
    const saved = await saveImg(req.user._id, url, prompt, 'inpaint', cloud)

    res.json({
      success: true,
      message: 'Inpainting done!',
      image: { id: saved._id, url, cloudUrl: cloud?.url || '', createdAt: saved.createdAt }
    })
  } catch (e) { aiError(res, e) }
})

// ── POST /api/images/upscale ──────────────────────────────
router.post('/upscale', protect, async (req, res) => {
  try {
    const { factor = 2 } = req.body
    const p     = `ultra high resolution ${factor}x upscaled, sharp crisp details, professional quality, 4K`
    const b64   = await callAI(p)
    const url   = `data:image/png;base64,${b64}`
    const hasCloud = configCloudinary(req.user)
    const cloud = hasCloud ? await uploadBase64(b64, 'pixelforge/upscaled') : null
    const saved = await saveImg(req.user._id, url, `${factor}x upscale`, 'upscale', cloud)

    res.json({
      success: true,
      message: `${factor}x upscale complete!`,
      image: { id: saved._id, url, cloudUrl: cloud?.url || '', createdAt: saved.createdAt }
    })
  } catch (e) { aiError(res, e) }
})

// ── POST /api/images/logo ─────────────────────────────────
router.post('/logo', protect, async (req, res) => {
  try {
    const {
      brandName  = 'Brand',
      industry   = 'Tech',
      style      = 'Minimalist',
      colorMood  = 'Purple and Gold',
      extra      = ''
    } = req.body

    const hasCloud = configCloudinary(req.user)
    const results  = []

    for (let i = 0; i < 4; i++) {
      const p = `${brandName} logo design concept ${i + 1}, ${style} style, ${colorMood} color scheme, ${industry} brand${extra ? ', ' + extra : ''}, vector art, clean white background, no text, professional brand identity`
      const b64 = await callAI(p)
      const url  = `data:image/png;base64,${b64}`
      const cloud = hasCloud ? await uploadBase64(b64, 'pixelforge/logos') : null
      const saved = await saveImg(req.user._id, url, `logo: ${brandName}`, 'logo', cloud)
      results.push({ id: saved._id, url, cloudUrl: cloud?.url || '', createdAt: saved.createdAt })
    }

    res.json({ success: true, message: '4 logo concepts ready!', images: results })
  } catch (e) { aiError(res, e) }
})

// ── POST /api/images/social ───────────────────────────────
router.post('/social', protect, async (req, res) => {
  try {
    const { prompt, platform = 'Instagram', tone = 'Energetic', count = 3 } = req.body
    if (!prompt?.trim())
      return res.status(400).json({ success: false, message: 'Prompt required' })

    const hasCloud = configCloudinary(req.user)
    const results  = []
    const num = Math.min(parseInt(count) || 3, 4)

    for (let i = 0; i < num; i++) {
      const p = `${prompt.trim()}, ${tone} tone, ${platform} social media post graphic, eye-catching, trending, professional marketing visual`
      const b64 = await callAI(p)
      const url  = `data:image/png;base64,${b64}`
      const cloud = hasCloud ? await uploadBase64(b64, 'pixelforge/social') : null
      const saved = await saveImg(req.user._id, url, `${platform} post`, 'social', cloud)
      results.push({ id: saved._id, url, cloudUrl: cloud?.url || '', createdAt: saved.createdAt })
    }

    res.json({
      success: true,
      message: `${num} ${platform} posts ready!`,
      images: results
    })
  } catch (e) { aiError(res, e) }
})

// ── POST /api/images/ads ──────────────────────────────────
router.post('/ads', protect, async (req, res) => {
  try {
    const {
      product,
      cta    = 'Learn More',
      style  = 'Clean and Minimal',
      sizes  = ['1080x1080']
    } = req.body

    if (!product?.trim())
      return res.status(400).json({ success: false, message: 'Product name required' })

    const hasCloud = configCloudinary(req.user)
    const results  = []

    for (const sz of sizes.slice(0, 5)) {
      const p = `${product.trim()} advertisement banner ${sz}, ${style}, ${cta} call to action, professional ad creative, marketing design`
      const b64 = await callAI(p)
      const url  = `data:image/png;base64,${b64}`
      const cloud = hasCloud ? await uploadBase64(b64, 'pixelforge/ads') : null
      const saved = await saveImg(req.user._id, url, `ad: ${product} ${sz}`, 'ad-banner', cloud)
      results.push({ id: saved._id, url, cloudUrl: cloud?.url || '', size: sz, createdAt: saved.createdAt })
    }

    res.json({
      success: true,
      message: `${results.length} banners ready!`,
      images: results
    })
  } catch (e) { aiError(res, e) }
})

module.exports = router;
