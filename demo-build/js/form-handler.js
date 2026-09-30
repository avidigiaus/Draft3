/* ===================================================================
   form-handler.js — Multi-step form controller
   =================================================================== */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'ditm_resume_form_v1';

  const state = {
    step: 1,
    totalSteps: 7,
    skills: [],
    isPaidResume: false, // 2nd+ resume ($1)
    hasFreeResume: false, // tracked by email
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Step navigation ----------
  function showStep(n) {
    if (n < 1 || n > state.totalSteps) return;
    $$('.form fieldset.step').forEach((fs) => fs.classList.remove('active'));
    const target = $(`.form fieldset[data-step="${n}"]`);
    if (target) target.classList.add('active');

    // progress
    const fill = $('#progressFill');
    const pct = (n / state.totalSteps) * 100;
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.classList.remove('shimmer');
      void fill.offsetWidth; // restart animation
      fill.classList.add('shimmer');
    }

    $$('#progressSteps li').forEach((li) => {
      const s = parseInt(li.dataset.step, 10);
      li.classList.toggle('active', s === n);
      li.classList.toggle('done', s < n);
    });

    // buttons
    $('#prevBtn')?.classList.toggle('show', n > 1);
    $('#nextBtn').textContent = n === state.totalSteps ? 'Submit & Create My Resume →' : 'Next →';

    if (n === state.totalSteps) buildReview();
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(target, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    }
    state.step = n;
    saveProgress();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function goNext() {
    if (!validateStep(state.step)) {
      toast('Please fix the errors above.', 'error');
      return;
    }
    if (state.step === state.totalSteps) {
      return submitForm();
    }
    showStep(state.step + 1);
  }

  function goPrev() { showStep(state.step - 1); }

  // ---------- Repeater ----------
  function bindRepeater(repeaterId, fields, buttonLabel) {
    const container = $(`#${repeaterId}`);
    const addBtn = document.querySelector(`[data-add="${repeaterId}"]`);
    if (!container || !addBtn) return;

    function addItem() {
      const items = $$('.repeater-item', container);
      const idx = items.length;
      const tpl = items[0].cloneNode(true);
      tpl.dataset.index = idx;
      tpl.querySelectorAll('input, textarea').forEach((el) => {
        if (el.name) {
          el.name = el.name.replace(/\[\d+\]/, `[${idx}]`);
          if (el.type !== 'file') el.value = '';
        }
      });
      // clear preview
      const preview = tpl.querySelector('.file-preview');
      if (preview) preview.innerHTML = '';
      container.appendChild(tpl);
      bindRemove();
      // re-init file drops
      if (global.FileUpload) global.FileUpload.initAll();
    }

    function bindRemove() {
      $$('.repeater-item', container).forEach((item) => {
        const btn = item.querySelector('.remove-item');
        if (!btn) return;
        btn.onclick = () => {
          const items = $$('.repeater-item', container);
          if (items.length > 1) item.remove();
          else {
            item.querySelectorAll('input, textarea').forEach((el) => {
              if (el.type !== 'file') el.value = '';
            });
            const preview = item.querySelector('.file-preview');
            if (preview) preview.innerHTML = '';
          }
        };
      });
    }

    addBtn.addEventListener('click', addItem);
    bindRemove();
  }

  // ---------- Skills chips ----------
  function bindSkills() {
    const input = $('#skillInput');
    const chips = $('#skillChips');
    const hidden = $('#skillsHidden');
    if (!input || !chips || !hidden) return;

    function renderChips() {
      chips.innerHTML = '';
      state.skills.forEach((s, i) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = `<span>${s}</span><span class="x" data-i="${i}">×</span>`;
        chip.querySelector('.x').addEventListener('click', () => {
          state.skills.splice(i, 1);
          renderChips();
          updateHidden();
        });
        chips.appendChild(chip);
      });
      updateHidden();
    }

    function updateHidden() {
      hidden.value = state.skills.join(', ');
    }

    function addSkill(value) {
      const clean = (value || '').trim();
      if (!clean) return;
      const parts = clean.split(',').map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => {
        if (!state.skills.includes(p)) state.skills.push(p);
      });
      renderChips();
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addSkill(input.value);
        input.value = '';
      }
    });
    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        addSkill(input.value);
        input.value = '';
      }
    });

    // restore on load
    if (state.skills.length) renderChips();
  }

  // ---------- Progress autosave ----------
  function saveProgress() {
    try {
      const data = collectFormData(false);
      const snapshot = { step: state.step, skills: state.skills, data, isPaidResume: state.isPaidResume };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_) { /* ignore quota */ }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw);
      state.skills = snap.skills || [];
      state.isPaidResume = !!snap.isPaidResume;
      // restore values into inputs
      Object.entries(snap.data || {}).forEach(([k, v]) => {
        const els = document.querySelectorAll(`[name="${k}"]`);
        if (!els.length) return;
        if (els[0].type === 'radio') {
          els.forEach((el) => { if (el.value === v) el.checked = true; });
        } else if (els[0].type === 'checkbox') {
          els[0].checked = !!v;
        } else {
          els[0].value = v;
        }
      });
      // chips
      if (state.skills.length && $('#skillChips')) {
        const chips = $('#skillChips');
        chips.innerHTML = '';
        state.skills.forEach((s, i) => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.innerHTML = `<span>${s}</span><span class="x">×</span>`;
          chips.appendChild(chip);
        });
      }
      updateCostBanner();
      if (snap.step) showStep(snap.step);
    } catch (_) { /* noop */ }
  }

  function clearProgress() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ---------- Collect form data ----------
  function collectFormData(asObject = true) {
    const form = $('#resumeForm');
    const fd = new FormData(form);
    const obj = {};

    // simple scalars
    for (const [k, v] of fd.entries()) {
      if (v instanceof File) continue;
      obj[k] = typeof v === 'string' ? v : '';
    }

    // Group repeaters (education[], certifications[], experience[])
    const grouped = { education: [], certifications: [], experience: [], files: [] };
    for (const [k, v] of fd.entries()) {
      const m = k.match(/^(education|certifications|experience)\[(\d+)\]\[(\w+)\](?:\[(\w+)\])?$/);
      if (m) {
        const [, type, idx, field, sub] = m;
        const i = parseInt(idx, 10);
        grouped[type][i] = grouped[type][i] || {};
        if (v instanceof File) {
          grouped[type][i][field] = `[file] ${v.name} (${v.size}B)`;
        } else {
          grouped[type][i][field] = v;
        }
      } else if (v instanceof File) {
        grouped.files.push({ field: k, name: v.name, size: v.size, type: v.type });
      }
    }
    // strip empty slots
    grouped.education = grouped.education.filter(Boolean);
    grouped.certifications = grouped.certifications.filter(Boolean);
    grouped.experience = grouped.experience.filter(Boolean);

    obj._repeaters = grouped;

    if (!asObject) return obj;
    return obj;
  }

  // ---------- Review ----------
  function buildReview() {
    const data = collectFormData();
    const container = $('#reviewContainer');
    if (!container) return;

    const sections = [
      { title: 'Personal', step: 1, rows: [
        ['Full Name', data.fullName],
        ['Profile Image', data._repeaters.files.find(f => f.field === 'profileImage')?.name || 'Uploaded'],
      ]},
      { title: 'Education', step: 2, rows: data._repeaters.education.length ?
        data._repeaters.education.map((e, i) => ([
          `Education ${i + 1}`,
          [e.qualification, e.course, e.college, e.year].filter(Boolean).join(' · ')
        ])) : [['Education', '']]
      },
      { title: 'Certifications', step: 2, rows: data._repeaters.certifications.length ?
        data._repeaters.certifications.map((c, i) => ([
          `Cert ${i + 1}`,
          [c.name, c.org, c.year].filter(Boolean).join(' · ')
        ])) : [['Certifications', '—']]
      },
      { title: 'Experience', step: 3, rows: data._repeaters.experience.length ?
        data._repeaters.experience.map((x, i) => ([
          `Role ${i + 1}`,
          [x.title, x.company, x.duration].filter(Boolean).join(' · ')
        ])) : [['Experience', '—']]
      },
      { title: 'Current Role', step: 3, rows: [
        ['Occupation', data.currentOccupation],
        ['Organization', data.currentOrganization],
        ['Years', data.yearsExperience],
        ['About', data.about],
      ]},
      { title: 'Skills', step: 4, rows: [
        ['Skills', state.skills.join(', ')]
      ]},
      { title: 'Contact', step: 5, rows: [
        ['Mobile', data.mobile],
        ['Email', data.email],
        ['LinkedIn', data.linkedin],
        ['GitHub', data.github],
        ['Portfolio', data.portfolio],
        ['Location', data.location],
        ['Other link', data.otherLink],
      ]},
      { title: 'Preferences', step: 6, rows: [
        ['Resume Style', data.resumeStyle],
        ['Color Theme', data.resumeColor],
        ['Target Job', data.targetJob],
        ['Files', data._repeaters.files.filter(f => f.field !== 'profileImage').map(f => f.name).join(', ') || '—'],
      ]},
    ];

    container.innerHTML = sections.map((s) => `
      <section class="review-section ${s.title === 'Current Role' ? 'full' : ''}">
        <h4>${s.title} <button data-edit="${s.step}">Edit</button></h4>
        ${s.rows.map(([k, v]) => `
          <div class="review-row">
            <span class="k">${k}</span>
            <span class="v ${v ? '' : 'empty'}">${v ? sanitize(String(v).slice(0, 500)) : '—'}</span>
          </div>`).join('')}
      </section>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => showStep(parseInt(btn.dataset.edit, 10)));
    });
  }

  // ---------- Cost banner ----------
  function updateCostBanner() {
    const costLabel = $('#costLabel');
    const costSub = $('#costSub');
    const costPill = $('#costPill');
    const btn = $('#toggleRequestType');
    if (!costLabel) return;

    if (state.isPaidResume) {
      costLabel.textContent = '$1';
      costSub.textContent = 'Professional Resume Creation – $1';
      costPill.textContent = '$1';
      btn.textContent = 'Switch to 1st Resume (FREE)';
    } else {
      costLabel.textContent = 'FREE';
      costSub.textContent = 'Your first resume is on us.';
      costPill.textContent = '$0';
      btn.textContent = 'Switch to 2nd+ Resume ($1)';
    }
  }

  // ---------- Submission ----------
  async function submitForm() {
    if (!$('#consent').checked) {
      toast('Please confirm the consent checkbox to submit.', 'error');
      return;
    }

    const overlay = $('#overlay');
    const loader = $('#loader');
    const success = $('#success');
    const errorState = $('#errorState');
    overlay.hidden = false;
    loader.hidden = false;
    success.hidden = true;
    errorState.hidden = true;

    try {
      const form = $('#resumeForm');
      const fd = new FormData(form);

      // Determine pricing
      const email = (fd.get('email') || '').toString().trim();
      let isPaid = state.isPaidResume;

      // If user didn't toggle, ask backend for free-status by email
      if (!isPaid && email) {
        try {
          const status = await API.checkFreeStatus(email);
          isPaid = !status.isFirstFree;
        } catch (_) { /* offline-friendly: assume free */ }
      }

      // Add pricing flag + skills array
      fd.set('isPaidResume', isPaid ? '1' : '0');
      fd.delete('skills'); // we send as CSV via hidden
      fd.set('skills', state.skills.join(', '));

      // Step 1: submit form
      const result = await API.submitResume(fd);
      const requestId = result.requestId;

      // Step 2: if paid, run payment flow before showing success
      if (isPaid) {
        try {
          const session = await API.createCheckoutSession({ email, requestId });
          // Redirect to Stripe hosted Checkout page.
          // On return, success_url adds ?paid=1&session_id=... which we
          // detect in the success handler below.
          window.location.href = session.checkoutUrl;
          return; // Page is navigating away
        } catch (payErr) {
          console.error('Payment error:', payErr);
          toast('Payment could not be started. Your request is saved — you can retry by submitting again.', 'error');
          // Still show success — the request is in the system
        }
      }

      loader.hidden = true;
      success.hidden = false;
      $('#refId').textContent = requestId;
      clearProgress();

      // reset form for next time
      setTimeout(() => {
        $('#resetBtn').onclick = resetForm;
      }, 0);
    } catch (err) {
      console.error(err);
      loader.hidden = true;
      errorState.hidden = false;
      $('#errorMsg').textContent = err.message || 'Submission failed. Please try again.';
    }
  }

  /**
   * Stripe Checkout using Payment Intent (client_secret).
   * Falls back to a hosted Checkout session if the backend returned a URL.
   */
  async function runStripeCheckout(intent) {
    // If backend returned a hosted Checkout URL, redirect to it.
    if (intent.checkoutUrl) {
      window.location.href = intent.checkoutUrl;
      return;
    }
    // Otherwise assume Stripe.js + Elements is loaded (see index.html snippet)
    if (typeof Stripe === 'undefined' || !intent.clientSecret) {
      throw new Error('Stripe.js not loaded. Include https://js.stripe.com/v3/ in index.html.');
    }
    const stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY);
    const { error } = await stripe.confirmCardPayment(intent.clientSecret, {
      payment_method: { card: window.stripeCardElement, billing_details: { email: intent.email } },
    });
    if (error) throw error;
  }

  function resetForm() {
    $('#resumeForm').reset();
    state.skills = [];
    state.isPaidResume = false;
    $('#skillChips').innerHTML = '';
    updateCostBanner();
    $('#overlay').hidden = true;
    showStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Toast ----------
  function toast(msg, kind = 'info') {
    const t = $('#toast');
    if (!t) return;
    t.className = `toast show ${kind}`;
    t.textContent = msg;
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => { t.classList.remove('show'); }, 3500);
  }

  // ---------- Init ----------
  function init() {
    bindRepeater('eduRepeater');
    bindRepeater('certRepeater');
    bindRepeater('expRepeater');
    bindSkills();
    if (global.FileUpload) global.FileUpload.initAll();

    $('#nextBtn').addEventListener('click', goNext);
    $('#prevBtn').addEventListener('click', goPrev);

    $('#progressSteps').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const s = parseInt(li.dataset.step, 10);
      if (s <= state.step) showStep(s); // only allow back-jump
    });

    $$('[data-jump]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = $(btn.dataset.jump);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });

    $('#toggleRequestType').addEventListener('click', () => {
      state.isPaidResume = !state.isPaidResume;
      updateCostBanner();
      saveProgress();
    });

    $('#consent').addEventListener('change', () => {
      saveProgress();
    });

    // live validation
    ['fullName', 'email', 'mobile', 'currentOccupation', 'linkedin', 'github', 'portfolio', 'otherLink']
      .forEach((n) => {
        const el = document.querySelector(`[name="${n}"]`);
        if (!el) return;
        el.addEventListener('blur', () => validateField(n, el.value));
        el.addEventListener('input', () => {
          if (el.classList.contains('invalid')) validateField(n, el.value);
        });
      });

    $('#navToggle')?.addEventListener('click', () => {
      $('#navToggle').classList.toggle('open');
      $('#navLinks').classList.toggle('open');
    });

    $('#closeError')?.addEventListener('click', () => { $('#overlay').hidden = true; });

    loadProgress();
    updateCostBanner();
  }

  // expose
  global.FormHandler = { init, showStep, state, collectFormData, saveProgress };
})(window);
