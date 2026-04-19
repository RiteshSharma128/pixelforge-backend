const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ══════════════════════════════════════════════
// USER MODEL
// ══════════════════════════════════════════════
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true, maxlength: 60 },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 8, select: false },
  avatar:    { type: String, default: '🎨' },
  role:      { type: String, default: 'Designer' },
  plan:      { type: String, enum: ['free','pro','team'], default: 'free' },
  workspace: { type: String, default: 'My Studio' },
  isDemo:    { type: Boolean, default: false },
  apiKeys: {
    huggingface:      { type: String, default: '' },
    removebg:         { type: String, default: '' },
    cloudinaryName:   { type: String, default: '' },
    cloudinaryKey:    { type: String, default: '' },
    cloudinarySecret: { type: String, default: '' },
    cloudinaryPreset: { type: String, default: '' },
  },
  stats: {
    imagesGenerated: { type: Number, default: 0 },
    bgRemovals:      { type: Number, default: 0 },
    lastActive:      { type: Date,   default: Date.now }
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.matchPassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};
userSchema.methods.toSafeObject = function() {
  const o = this.toObject();
  delete o.password;
  if (o.apiKeys) {
    o.apiKeys = {
      huggingface:      o.apiKeys.huggingface      ? '••••set' : '',
      removebg:         o.apiKeys.removebg         ? '••••set' : '',
      cloudinaryName:   o.apiKeys.cloudinaryName   || '',
      cloudinaryKey:    o.apiKeys.cloudinaryKey    ? '••••set' : '',
      cloudinarySecret: o.apiKeys.cloudinarySecret ? '••••set' : '',
      cloudinaryPreset: o.apiKeys.cloudinaryPreset || '',
    };
  }
  return o;
};

// ══════════════════════════════════════════════
// IMAGE MODEL
// ══════════════════════════════════════════════
const imageSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prompt:     { type: String, default: '' },
  type:       { type: String, enum: ['text-to-image','variation','bg-remove','inpaint','upscale','logo','ad-banner','social','other'], default: 'text-to-image' },
  url:        { type: String, required: true },
  cloudUrl:   { type: String, default: '' },
  publicId:   { type: String, default: '' },
  isFavorite: { type: Boolean, default: false },
  tags:       [String]
}, { timestamps: true });
imageSchema.index({ user: 1, createdAt: -1 });

// ══════════════════════════════════════════════
// TEAM MEMBER MODEL
// ══════════════════════════════════════════════
const teamMemberSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email:     { type: String, required: true, lowercase: true },
  name:      { type: String, required: true },
  avatar:    { type: String, default: '👤' },
  color:     { type: String, default: '#6d28d9' },
  role:      { type: String, enum: ['admin','member','viewer'], default: 'member' },
  status:    { type: String, enum: ['pending','active','removed'], default: 'active' }
}, { timestamps: true });
teamMemberSchema.index({ workspace: 1 });

// ══════════════════════════════════════════════
// COMMENT MODEL
// ══════════════════════════════════════════════
const replySchema = new mongoose.Schema({
  author:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName:   String,
  authorAvatar: String,
  text:         { type: String, required: true, maxlength: 1000 },
  createdAt:    { type: Date, default: Date.now }
});
const commentSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:       { type: String, required: true, maxlength: 2000 },
  ref:        { type: String, default: 'General' },
  imageId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Image', default: null },
  replies:    [replySchema],
  isResolved: { type: Boolean, default: false }
}, { timestamps: true });
commentSchema.index({ workspace: 1, createdAt: -1 });

// ══════════════════════════════════════════════
// BRAND KIT MODEL
// ══════════════════════════════════════════════
const brandKitSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  logoUrl:      { type: String, default: '' },
  logoPublicId: { type: String, default: '' },
  colors:       { type: [String], default: ['#6d28d9','#06d6a0','#f59e0b','#f43f5e','#1e1b4b'] },
  headingFont:  { type: String, default: 'Inter' },
  bodyFont:     { type: String, default: 'Inter' },
  tagline:      { type: String, default: '' },
  mission:      { type: String, default: '' }
}, { timestamps: true });

module.exports = {
  User:       mongoose.model('User', userSchema),
  Image:      mongoose.model('Image', imageSchema),
  TeamMember: mongoose.model('TeamMember', teamMemberSchema),
  Comment:    mongoose.model('Comment', commentSchema),
  BrandKit:   mongoose.model('BrandKit', brandKitSchema)
};
