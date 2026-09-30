/**
 * Email service — Nodemailer
 * Sends a formatted HTML + plain-text notification to avipatmase@gmail.com
 * with all submitted details and file attachments.
 */

import nodemailer from 'nodemailer';
import path from 'path';

const MAIL_TO = process.env.MAIL_TO || 'avipatmase@gmail.com';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else if (process.env.GMAIL_APP_USER && process.env.GMAIL_APP_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_APP_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

/** Pretty-print a list of objects */
function rowsHtml(arr, mapper) {
  if (!arr || !arr.length) return '<p style="color:#8693ad">—</p>';
  return `<ul style="margin:6px 0 14px 18px;padding:0">${arr
    .map((it, i) => `<li style="margin:6px 0"><strong>#${i + 1}</strong> · ${mapper(it)}</li>`)
    .join('')}</ul>`;
}

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendResumeNotification(payload) {
  const transporter = getTransporter();

  const subject = `New Resume Creation Request – ${payload.fullName}`;

  const html = `
    <div style="font-family:Inter,Helvetica,Arial,sans-serif;background:#0a1633;color:#e7ecf5;padding:32px;border-radius:16px;max-width:720px">
      <div style="background:linear-gradient(135deg,#5b8def,#1e3a8a);padding:24px;border-radius:12px;margin-bottom:24px">
        <h1 style="margin:0;font-size:22px;color:#fff">📄 New Resume Request</h1>
        <p style="margin:6px 0 0;color:#cfe0ff">Reference ID: <strong>${esc(payload.requestId)}</strong></p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#8693ad;width:160px">Full Name</td><td style="padding:8px 0;color:#fff"><strong>${esc(payload.fullName)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#8693ad">Email</td><td style="padding:8px 0;color:#fff">${esc(payload.email)}</td></tr>
        <tr><td style="padding:8px 0;color:#8693ad">Mobile</td><td style="padding:8px 0;color:#fff">${esc(payload.mobile)}</td></tr>
        <tr><td style="padding:8px 0;color:#8693ad">Target Job</td><td style="padding:8px 0;color:#fff">${esc(payload.targetJob) || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#8693ad">Resume Style</td><td style="padding:8px 0;color:#fff">${esc(payload.resumeStyle)} · ${esc(payload.resumeColor)}</td></tr>
        <tr><td style="padding:8px 0;color:#8693ad">Pricing</td><td style="padding:8px 0;color:#fff">${payload.isPaidResume ? '<strong>$1 (Paid)</strong>' : '<strong>FREE (1st resume)</strong>'}</td></tr>
        <tr><td style="padding:8px 0;color:#8693ad">Submitted At</td><td style="padding:8px 0;color:#fff">${esc(payload.submittedAt)}</td></tr>
      </table>

      <h3 style="color:#5b8def;margin-top:24px;font-size:15px;letter-spacing:.08em;text-transform:uppercase">Education</h3>
      ${rowsHtml(payload.education, (e) =>
        `<strong>${esc(e.qualification || '')}</strong> — ${esc(e.course || '')} <br/>${esc(e.college || '')} (${esc(e.year || '')})<br/><em style="color:#8693ad">${esc(e.description || '')}</em>`)}

      <h3 style="color:#5b8def;margin-top:24px;font-size:15px;letter-spacing:.08em;text-transform:uppercase">Certifications</h3>
      ${rowsHtml(payload.certifications, (c) =>
        `<strong>${esc(c.name || '')}</strong> — ${esc(c.org || '')} (${esc(c.year || '')})`)}

      <h3 style="color:#5b8def;margin-top:24px;font-size:15px;letter-spacing:.08em;text-transform:uppercase">Experience</h3>
      ${rowsHtml(payload.experience, (x) =>
        `<strong>${esc(x.title || '')}</strong> @ ${esc(x.company || '')} <br/><em style="color:#8693ad">${esc(x.duration || '')}</em><br/>${esc(x.responsibilities || '')}<br/>${esc(x.achievements || '')}`)}

      <h3 style="color:#5b8def;margin-top:24px;font-size:15px;letter-spacing:.08em;text-transform:uppercase">Current Occupation</h3>
      <p>${esc(payload.currentOccupation)} ${payload.currentOrganization ? `at <strong>${esc(payload.currentOrganization)}</strong>` : ''} ${payload.yearsExperience ? `(${esc(payload.yearsExperience)} yrs)` : ''}</p>

      <h3 style="color:#5b8def;margin-top:24px;font-size:15px;letter-spacing:.08em;text-transform:uppercase">Skills</h3>
      <p>${(payload.skills || []).map((s) => `<span style="display:inline-block;background:rgba(91,141,239,.15);border:1px solid rgba(91,141,239,.3);border-radius:999px;padding:4px 12px;margin:3px;color:#fff;font-size:12px">${esc(s)}</span>`).join(' ')}</p>

      <h3 style="color:#5b8def;margin-top:24px;font-size:15px;letter-spacing:.08em;text-transform:uppercase">Online Profiles</h3>
      <ul style="margin:6px 0 14px 18px">
        ${payload.linkedin ? `<li>LinkedIn: <a style="color:#5b8def" href="${esc(payload.linkedin)}">${esc(payload.linkedin)}</a></li>` : ''}
        ${payload.github ? `<li>GitHub: <a style="color:#5b8def" href="${esc(payload.github)}">${esc(payload.github)}</a></li>` : ''}
        ${payload.portfolio ? `<li>Portfolio: <a style="color:#5b8def" href="${esc(payload.portfolio)}">${esc(payload.portfolio)}</a></li>` : ''}
        ${payload.otherLink ? `<li>Other: <a style="color:#5b8def" href="${esc(payload.otherLink)}">${esc(payload.otherLink)}</a></li>` : ''}
        ${payload.location ? `<li>Location: ${esc(payload.location)}</li>` : ''}
      </ul>

      ${payload.about ? `<h3 style="color:#5b8def;margin-top:24px;font-size:15px;letter-spacing:.08em;text-transform:uppercase">About</h3><p>${esc(payload.about).replace(/\n/g, '<br/>')}</p>` : ''}

      <h3 style="color:#5b8def;margin-top:24px;font-size:15px;letter-spacing:.08em;text-transform:uppercase">Attachments</h3>
      <ul style="margin:6px 0 0 18px">
        ${payload.files.map((f) => `<li>${esc(f.field)} — <strong>${esc(f.originalName)}</strong> (${Math.round(f.size / 1024)} KB)</li>`).join('')}
      </ul>

      <p style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);color:#8693ad;font-size:12px">
        This is an automated notification from Digital IT Move Resume Service. Reference: ${esc(payload.requestId)}
      </p>
    </div>
  `;

  const text = `
NEW RESUME REQUEST — ${payload.requestId}
=========================================
Full Name    : ${payload.fullName}
Email        : ${payload.email}
Mobile       : ${payload.mobile}
Submitted At : ${payload.submittedAt}
Pricing      : ${payload.isPaidResume ? '$1 (Paid)' : 'FREE (1st)'}

EDUCATION
${payload.education.map((e, i) => `  ${i + 1}. ${e.qualification} — ${e.course} @ ${e.college} (${e.year})`).join('\n') || '  —'}

CERTIFICATIONS
${payload.certifications.map((c, i) => `  ${i + 1}. ${c.name} — ${c.org} (${c.year})`).join('\n') || '  —'}

EXPERIENCE
${payload.experience.map((x, i) => `  ${i + 1}. ${x.title} @ ${x.company} (${x.duration})`).join('\n') || '  —'}

CURRENT OCCUPATION
  ${payload.currentOccupation}${payload.currentOrganization ? ' @ ' + payload.currentOrganization : ''}${payload.yearsExperience ? ' (' + payload.yearsExperience + ' yrs)' : ''}

SKILLS
  ${(payload.skills || []).join(', ')}

ONLINE PROFILES
  LinkedIn : ${payload.linkedin || '—'}
  GitHub   : ${payload.github || '—'}
  Portfolio: ${payload.portfolio || '—'}
  Location : ${payload.location || '—'}

TARGET JOB
  ${payload.targetJob}

RESUME STYLE
  ${payload.resumeStyle} · ${payload.resumeColor}

ABOUT
  ${payload.about || '—'}

ATTACHMENTS
${payload.files.map((f) => `  ${f.field} — ${f.originalName} (${Math.round(f.size / 1024)} KB)`).join('\n')}
  `;

  const attachments = (payload.files || []).map((f) => ({
    filename: f.originalName,
    path: f.path,
  }));

  const mailOptions = {
    from: process.env.MAIL_FROM || '"Digital IT Move" <noreply@digitalitmove.com>',
    to: MAIL_TO,
    replyTo: payload.email,
    subject,
    text,
    html,
    attachments,
  };

  return transporter.sendMail(mailOptions);
}

/** Send a confirmation to the user */
export async function sendUserConfirmation(payload) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.MAIL_FROM || '"Digital IT Move" <noreply@digitalitmove.com>',
    to: payload.email,
    subject: `We received your resume request – ${payload.requestId}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#0a1633;color:#e7ecf5;padding:32px;border-radius:16px;max-width:600px">
        <h1 style="color:#5b8def;margin-top:0">Hi ${payload.fullName},</h1>
        <p>We've received your resume request (<strong>${payload.requestId}</strong>) and our team will get to work on it shortly.</p>
        <p>You'll hear from us via email or mobile.</p>
        <p style="color:#8693ad;font-size:12px;margin-top:24px">— Digital IT Move · Move Ahead, Grow Online</p>
      </div>`,
  });
}
