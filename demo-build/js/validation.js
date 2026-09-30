/* ===================================================================
   validation.js — Field validation + sanitization
   =================================================================== */
(function (global) {
  'use strict';

  const Validators = {
    fullName: (v) => {
      if (!v || v.trim().length < 2) return 'Please enter your full name.';
      if (!/^[a-zA-Z .'-]{2,80}$/.test(v.trim())) return 'Name contains invalid characters.';
      return '';
    },
    email: (v) => {
      if (!v) return 'Email is required.';
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!re.test(v.trim())) return 'Please enter a valid email address.';
      return '';
    },
    mobile: (v) => {
      if (!v) return 'Mobile number is required.';
      const digits = v.replace(/[^\d]/g, '');
      if (digits.length < 7 || digits.length > 15) return 'Please enter a valid mobile number (7–15 digits).';
      return '';
    },
    url: (v) => {
      if (!v) return '';
      try { new URL(v); return ''; }
      catch { return 'Please enter a valid URL (https://...).'; }
    },
    required: (v, label = 'This field') => {
      if (!v || !String(v).trim()) return `${label} is required.`;
      return '';
    },
  };

  function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  function setError(name, msg) {
    const el = document.querySelector(`[data-err="${name}"]`);
    if (el) el.textContent = msg || '';
    const input = document.querySelector(`[name="${name}"]`);
    if (input) input.classList.toggle('invalid', !!msg);
  }

  function validateField(name, value) {
    let msg = '';
    switch (name) {
      case 'fullName': msg = Validators.fullName(value); break;
      case 'email':    msg = Validators.email(value); break;
      case 'mobile':   msg = Validators.mobile(value); break;
      case 'linkedin':
      case 'github':
      case 'portfolio':
      case 'otherLink': msg = Validators.url(value); break;
      case 'currentOccupation':
        msg = Validators.required(value, 'Current occupation'); break;
      default: break;
    }
    setError(name, msg);
    return !msg;
  }

  function validateStep(step) {
    let valid = true;
    const fs = document.querySelector(`fieldset[data-step="${step}"]`);
    if (!fs) return true;

    if (step === 1) {
      const fn = fs.querySelector('[name="fullName"]').value;
      const pi = fs.querySelector('[name="profileImage"]').files[0];
      if (!validateField('fullName', fn)) valid = false;
      if (!pi) {
        setError('profileImage', 'Profile image is required.');
        valid = false;
      } else {
        setError('profileImage', '');
      }
    }
    if (step === 3) {
      const co = fs.querySelector('[name="currentOccupation"]').value;
      if (!validateField('currentOccupation', co)) valid = false;
    }
    if (step === 5) {
      const m = fs.querySelector('[name="mobile"]').value;
      const e = fs.querySelector('[name="email"]').value;
      if (!validateField('mobile', m)) valid = false;
      if (!validateField('email', e)) valid = false;
      const li = fs.querySelector('[name="linkedin"]').value;
      const gh = fs.querySelector('[name="github"]').value;
      const po = fs.querySelector('[name="portfolio"]').value;
      const ol = fs.querySelector('[name="otherLink"]').value;
      if (!validateField('linkedin', li)) valid = false;
      if (!validateField('github', gh)) valid = false;
      if (!validateField('portfolio', po)) valid = false;
      if (!validateField('otherLink', ol)) valid = false;
    }
    return valid;
  }

  global.Validators = Validators;
  global.validateField = validateField;
  global.validateStep = validateStep;
  global.setError = setError;
  global.sanitize = sanitize;
})(window);
