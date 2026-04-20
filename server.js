




// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
// const rateLimit = require('express-rate-limit');

// const app = express();

// app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// app.use(cors({
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       'http://localhost:5173',
//       'https://pixelforge-ritesh-sharma.vercel.app'
//     ];

//     if (!origin) return callback(null, true);

//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     } else {
//       return callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization']
// }));

// app.use(express.json({ limit: '15mb' }));
// app.use(express.urlencoded({ extended: true, limit: '15mb' }));
// app.use(cookieParser());
// if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// app.use('/api/auth',   rateLimit({ windowMs: 15*60*1000, max: 30,  message: { success:false, message:'Too many requests' } }));
// app.use('/api/images', rateLimit({ windowMs: 60*1000,    max: 20,  message: { success:false, message:'Rate limit hit' } }));
// app.use('/api',        rateLimit({ windowMs: 60*1000,    max: 150 }));

// app.use('/api/auth',     require('./routes/auth'));
// app.use('/api/images',   require('./routes/images'));
// app.use('/api/gallery',  require('./routes/gallery'));
// app.use('/api/team',     require('./routes/team'));
// app.use('/api/comments', require('./routes/comments'));
// app.use('/api/brandkit', require('./routes/brandkit'));
// app.use('/api/user',     require('./routes/user'));

// app.get('/api/health', (req, res) => res.json({
//   success: true,
//   message: 'PixelForge API Running',
//   db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
//   time: new Date().toISOString()
// }));

// app.use((req, res) => {
//   res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
// });

// app.use((err, req, res, next) => {
//   console.error('Error:', err.message);
//   res.status(err.statusCode || 500).json({
//     success: false,
//     message: err.message || 'Internal Server Error',
//   });
// });

// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => {
//     console.log('✅ MongoDB Atlas connected');
//     const PORT = process.env.PORT || 5000;
//     app.listen(PORT, () => {
//       console.log(`🚀 Backend → http://localhost:${PORT}`);
//       console.log(`📋 Health  → http://localhost:${PORT}/api/health`);
//     });
//   })
//   .catch(err => {
//     console.error('❌ MongoDB error:', err.message);
//     process.exit(1);
//   });

// module.exports = app;




require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 🔥 FINAL SIMPLE CORS (NO FUNCTION)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://pixelforge-ritesh-sharma.vercel.app'
  ],
  credentials: true
}));

// 🔥 IMPORTANT preflight
app.options('*', cors());

// BODY + COOKIES
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// RATE LIMIT
app.use('/api/auth',   rateLimit({ windowMs: 15*60*1000, max: 30, message: { success:false, message:'Too many requests' } }));
app.use('/api/images', rateLimit({ windowMs: 60*1000,    max: 20, message: { success:false, message:'Rate limit hit' } }));
app.use('/api',        rateLimit({ windowMs: 60*1000,    max: 150 }));

// ROUTES
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/images',   require('./routes/images'));
app.use('/api/gallery',  require('./routes/gallery'));
app.use('/api/team',     require('./routes/team'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/brandkit', require('./routes/brandkit'));
app.use('/api/user',     require('./routes/user'));

// HEALTH
app.get('/api/health', (req, res) => res.json({
  success: true,
  message: 'PixelForge API Running',
  db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  time: new Date().toISOString()
}));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// DB CONNECT
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Backend → http://localhost:${PORT}`);
      console.log(`📋 Health  → http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

module.exports = app;
