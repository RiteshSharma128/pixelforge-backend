const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  let token = req.cookies?.pf_token
    || (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.split(' ')[1]);

  if (!token) return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.';
    return res.status(401).json({ success: false, message: msg });
  }
};

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

const sendToken = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  // res.cookie('pf_token', token, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'lax',
  //   maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  // });

  res.cookie('pf_token', token, {
    httpOnly: true,
    secure: true,       
    sameSite: 'none',    
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  res.status(statusCode).json({ success: true, message, token, user: user.toSafeObject() });
};

module.exports = { protect, generateToken, sendToken };
