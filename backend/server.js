/**
 * Digital IT Move — Resume Service Backend
 * -----------------------------------------
 * Production-ready Express server with:
 *   • File uploads (Multer) to local disk (swappable to S3 / GCS)
 *   • Email notifications via Nodemailer (avipatmase@gmail.com)
 *   • Stripe payment intent for 2nd+ resume ($1 fee)
 *   • Rate limiting, helmet, CORS, validation
 *   • Free-resume tracking per email (in-memory + optional persistence)
 *
 * Frontend never sees API keys — all secrets live in .env.
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import resumeRoutes from './routes/resume.js';
import paymentRoutes from './routes/payment.js';
import healthRoutes from './routes/health.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ---------- Security ----------
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://cdnjs.cloudflare.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com", "data:"],
      'img-src': ["'self'", "data:", "blob:"],
      'connect-src': ["'self'", "https://api.stripe.com", "https://cdnjs.cloudflare.com"],
      'frame-src': ["https://js.stripe.com", "https://hooks.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  methods: ['GET', 'POST'],
  credentials: false,
}));

app.use(compression());

// Stripe webhook needs raw body — must be mounted BEFORE json parser
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// JSON + urlencoded parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Rate limit (general)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limit for the submission endpoint (anti-spam)
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this IP. Please try again in an hour.' },
});

// ---------- Static frontend ----------
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');
app.use(express.static(FRONTEND_DIR, {
  extensions: ['html'],
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// ---------- API routes ----------
app.use('/api/health', healthRoutes);
app.use('/api/resume', submitLimiter, resumeRoutes);
app.use('/api/payment', paymentRoutes);

// ---------- Errors ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Start ----------
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n🚀 Digital IT Move Resume Service`);
  console.log(`   • Listening: http://localhost:${PORT}`);
  console.log(`   • Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   • Email target: ${process.env.MAIL_TO || 'avipatmase@gmail.com'}`);
  console.log(`   • Stripe: ${process.env.STRIPE_SECRET_KEY ? 'configured' : 'NOT configured'}\n`);
});

export default app;
