/**
 * Resume submission routes
 * POST /api/resume/submit   — accept form-data, persist, send email
 * GET  /api/resume/free-status?email=... — check first-time-free eligibility
 * GET  /api/resume/:id      — fetch a single request (for admin)
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { sendResumeNotification } from '../services/email.js';
import { hasUsedFree, markFreeUsed, saveRequest, getRequest } from '../services/tracking.js';
import { sanitizeInput } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ---------- Multer setup ----------
const UPLOAD_ROOT = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const id = uuidv4().slice(0, 8);
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${id}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 15 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

// ---------- Validation ----------
const validateResume = [
  body('fullName').trim().isLength({ min: 2, max: 80 }).escape(),
  body('email').trim().isEmail().normalizeEmail(),
  body('mobile').trim().isLength({ min: 7, max: 20 }),
  body('currentOccupation').trim().isLength({ min: 1, max: 120 }).escape(),
  body('linkedin').optional({ checkFalsy: true }).isURL(),
  body('github').optional({ checkFalsy: true }).isURL(),
  body('portfolio').optional({ checkFalsy: true }).isURL(),
  body('otherLink').optional({ checkFalsy: true }).isURL(),
];

// ---------- Routes ----------

/** Check free-resume eligibility by email */
router.get('/free-status', (req, res) => {
  const email = sanitizeInput(String(req.query.email || '').toLowerCase());
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' });
  }
  res.json({ email, isFirstFree: !hasUsedFree(email) });
});

/** Submit a resume request (multipart/form-data) */
router.post(
  '/submit',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'existingResume', maxCount: 1 },
    { name: 'portfolioDocs', maxCount: 8 },
    { name: 'certifications[0][file]', maxCount: 1 },
  ]),
  validateResume,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed.', details: errors.array() });
      }

      // Ensure profileImage present
      if (!req.files?.profileImage?.[0]) {
        return res.status(400).json({ error: 'Profile image is required.' });
      }

      const requestId = `DITM-${uuidv4().slice(0, 8).toUpperCase()}`;
      const submissionDate = new Date().toISOString();

      const payload = {
        requestId,
        submittedAt: submissionDate,
        isPaidResume: req.body.isPaidResume === '1',
        fullName: req.body.fullName,
        email: req.body.email,
        mobile: req.body.mobile,
        currentOccupation: req.body.currentOccupation,
        currentOrganization: req.body.currentOrganization,
        yearsExperience: req.body.yearsExperience,
        about: req.body.about,
        skills: (req.body.skills || '').split(',').map(s => s.trim()).filter(Boolean),
        education: parseRepeater(req.body, 'education'),
        certifications: parseRepeater(req.body, 'certifications'),
        experience: parseRepeater(req.body, 'experience'),
        linkedin: req.body.linkedin,
        github: req.body.github,
        portfolio: req.body.portfolio,
        otherLink: req.body.otherLink,
        location: req.body.location,
        targetJob: req.body.targetJob,
        resumeStyle: req.body.resumeStyle,
        resumeColor: req.body.resumeColor,
        files: Object.entries(req.files || {}).flatMap(([field, arr]) =>
          arr.map((f) => ({
            field,
            originalName: f.originalname,
            storedAs: f.filename,
            size: f.size,
            mimetype: f.mimetype,
            path: f.path,
          })),
        ),
      };

      // Persist
      saveRequest(payload);

      // Mark free used if applicable
      if (!payload.isPaidResume) markFreeUsed(payload.email);

      // Send notification email to Digital IT Move
      try {
        await sendResumeNotification(payload);
      } catch (mailErr) {
        console.error('Email send failed:', mailErr);
        // Don't fail the request — return success and log
      }

      res.json({
        ok: true,
        requestId,
        isPaidResume: payload.isPaidResume,
        message: 'Resume request received successfully.',
      });
    } catch (err) {
      next(err);
    }
  },
);

/** Get a request by id (admin) */
router.get('/:id', (req, res) => {
  const r = getRequest(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found.' });
  res.json(r);
});

// ---------- Helpers ----------
function parseRepeater(body, type) {
  // Multer gives us flat bracket keys like "education[0][qualification]"
  // But express.urlencoded with extended:true would give us a nested object.
  // Handle both shapes.
  const result = [];

  if (Array.isArray(body[type])) {
    // nested form: body.education = [{ qualification, course, ... }, ...]
    body[type].forEach((item) => {
      if (item && typeof item === 'object') {
        const clean = {};
        Object.entries(item).forEach(([k, v]) => {
          clean[k] = sanitizeInput(String(v ?? ''));
        });
        result.push(clean);
      }
    });
    return result;
  }

  // flat form: body["education[0][qualification]"] = "..."
  const re = new RegExp(`^${type}\\[(\\d+)\\]\\[(\\w+)\\]$`);
  Object.entries(body).forEach(([k, v]) => {
    const m = k.match(re);
    if (!m) return;
    const i = parseInt(m[1], 10);
    const field = m[2];
    result[i] = result[i] || {};
    result[i][field] = sanitizeInput(String(v));
  });
  return result.filter(Boolean);
}

export default router;
