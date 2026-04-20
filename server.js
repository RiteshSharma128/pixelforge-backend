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

// const allowedOrigins = [
//   process.env.FRONTEND_URL || 'http://localhost:5173',
//   'http://localhost:3000',
//   'http://localhost:5174',
//   'http://127.0.0.1:5173',
//   'http://127.0.0.1:3000',
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) return callback(null, true);
//     return callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true,
//   methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization'],
// }));

// app.options('*', cors());
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
//   message: '🚀 PixelForge API Running',
//   db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
//   time: new Date().toISOString()
// }));

// app.use((req, res) => res.status(404).json({ success:false, message:`Route ${req.originalUrl} not found` }));

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
//       console.log(`🚀 Server → http://localhost:${PORT}`);
//       console.log(`📋 Health → http://localhost:${PORT}/api/health`);
//     });
//   })
//   .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

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

// CORS — seedha allow karo frontend origins
// app.use(cors({
//   origin: [
//     'http://localhost:5173',
//     'http://127.0.0.1:5173',
//     'http://localhost:3000',
//     'http://localhost:5174',
//   ],
//   credentials: true,
//   methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization'],
// }));

// app.use(cors({
//   origin: [
//     'http://localhost:5173',
//     'http://127.0.0.1:5173',
//     'https://pixelforge-ritesh-sharma.vercel.app'
//   ],
//   credentials: true,
//   methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization'],
// }));

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://pixelforge-ritesh-sharma.vercel.app'
    ];

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.options('*', cors());

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use('/api/auth',   rateLimit({ windowMs: 15*60*1000, max: 30,  message: { success:false, message:'Too many requests' } }));
app.use('/api/images', rateLimit({ windowMs: 60*1000,    max: 20,  message: { success:false, message:'Rate limit hit' } }));
app.use('/api',        rateLimit({ windowMs: 60*1000,    max: 150 }));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/images',   require('./routes/images'));
app.use('/api/gallery',  require('./routes/gallery'));
app.use('/api/team',     require('./routes/team'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/brandkit', require('./routes/brandkit'));
app.use('/api/user',     require('./routes/user'));

app.get('/api/health', (req, res) => res.json({
  success: true,
  message: 'PixelForge API Running',
  db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  time: new Date().toISOString()
}));

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

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
