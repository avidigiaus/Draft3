/* ===================================================================
   api.js — Demo mode (no backend required)
   All submissions are stored in localStorage. This makes the entire
   UI/UX flow demoable without a live backend.

   To switch to a real backend, replace this file with the original
   from frontend/js/api.js and point API_BASE to your server.
   =================================================================== */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'ditm_demo_requests';
  const FREE_KEY = 'ditm_demo_free';

  function uuid() {
    return 'DITM-' + Math.random().toString(36).slice(2, 6).toUpperCase() +
           Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function loadRequests() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveRequests(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function loadFree() {
    try { return JSON.parse(localStorage.getItem(FREE_KEY)) || []; }
    catch { return []; }
  }

  function saveFree(arr) {
    localStorage.setItem(FREE_KEY, JSON.stringify(arr));
  }

  function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function submitResume(formData) {
    await delay(900); // simulate network

    const email = (formData.get('email') || '').toString().trim().toLowerCase();
    const isPaidResume = formData.get('isPaidResume') === '1';
    const requestId = uuid();

    // Capture a snapshot of the data (excluding files — localStorage can't hold blobs easily)
    const snapshot = {};
    for (const [k, v] of formData.entries()) {
      if (v instanceof File) {
        snapshot[k] = `[file] ${v.name} (${v.size}B)`;
      } else {
        snapshot[k] = v;
      }
    }
    snapshot._requestId = requestId;
    snapshot._submittedAt = new Date().toISOString();
    snapshot._isPaidResume = isPaidResume;

    const all = loadRequests();
    all.push(snapshot);
    saveRequests(all);

    // Free-tier tracking
    if (!isPaidResume) {
      const free = loadFree();
      if (!free.includes(email)) {
        free.push(email);
        saveFree(free);
      }
    }

    return { ok: true, requestId, isPaidResume, message: 'Resume request received successfully (demo mode).' };
  }

  async function checkFreeStatus(email) {
    await delay(120);
    const e = (email || '').toLowerCase();
    return { email: e, isFirstFree: !loadFree().includes(e) };
  }

  async function createCheckoutSession({ email, requestId }) {
    await delay(600);
    // Demo mode: simulate a successful payment after a short delay
    // The form-handler.js treats this as a redirect, but in demo mode
    // we want to land back on the success modal. So we open a fake
    // "Stripe Checkout" window that auto-closes after a beat.
    return new Promise((resolve) => {
      const w = window.open('', 'stripe_demo', 'width=520,height=620');
      if (w) {
        w.document.write(`<!DOCTYPE html><html><head><title>Stripe Checkout (Demo)</title>
          <style>
            body{font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;background:#0a1633;color:#fff;margin:0;padding:40px 24px;text-align:center}
            .box{max-width:380px;margin:0 auto;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px 24px;backdrop-filter:blur(20px)}
            h1{font-size:18px;margin:0 0 8px;color:#5b8def}
            .amt{font-size:48px;font-weight:800;margin:18px 0;background:linear-gradient(135deg,#4cc9f0,#5b8def,#1e3a8a);-webkit-background-clip:text;background-clip:text;color:transparent}
            .btn{display:inline-block;background:linear-gradient(135deg,#5b8def,#1e3a8a);color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;margin-top:18px;border:0;cursor:pointer;font-size:15px}
            .note{color:#8693ad;font-size:12px;margin-top:20px}
          </style></head><body>
          <div class="box">
            <h1>🔒 Stripe Checkout (DEMO)</h1>
            <p style="color:#b9c2d6;margin:8px 0">Professional Resume Creation</p>
            <div class="amt">$1.00</div>
            <p style="color:#b9c2d6">Card: <strong style="color:#fff">4242 4242 4242 4242</strong></p>
            <p style="color:#b9c2d6;font-size:13px">Reference: <strong>${requestId}</strong></p>
            <button class="btn" onclick="window.opener.postMessage({type:'stripe-demo-paid',requestId:'${requestId}'},'*');setTimeout(()=>window.close(),200)">Pay $1 (Demo)</button>
            <p class="note">This is a demo. No real payment is processed.<br/>Click above to simulate successful payment.</p>
          </div></body></html>`);
      }
      // Listen for the popup message
      const handler = (ev) => {
        if (ev.data && ev.data.type === 'stripe-demo-paid') {
          window.removeEventListener('message', handler);
          resolve({ ok: true, sessionId: 'demo_' + requestId, requestId });
        }
      };
      window.addEventListener('message', handler);
      // Fallback timeout: resolve as paid anyway after 8s
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({ ok: true, sessionId: 'demo_' + requestId, requestId });
      }, 30000);
    });
  }

  async function verifyPayment({ sessionId, requestId }) {
    await delay(200);
    return { ok: true, status: 'paid', sessionId, requestId };
  }

  async function createPaymentIntent() {
    return { error: 'Payment Element not used in demo mode. Use createCheckoutSession instead.' };
  }

  global.API = { submitResume, checkFreeStatus, createCheckoutSession, createPaymentIntent, verifyPayment };
})(window);
