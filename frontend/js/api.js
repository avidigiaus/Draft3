/* ===================================================================
   api.js — Backend API client
   Handles: submit resume, payment intent, payment verification
   =================================================================== */
(function (global) {
  'use strict';

  // Default to same-origin. Override via window.API_BASE if backend is on another host.
  const BASE = global.API_BASE || '';

  async function jsonFetch(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { 'Accept': 'application/json', ...(opts.headers || {}) },
    });
    let body;
    try { body = await res.json(); } catch { body = {}; }
    if (!res.ok) {
      const err = new Error(body.error || `Request failed: ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  /**
   * Submit resume form (multipart/form-data)
   */
  async function submitResume(formData) {
    return jsonFetch(`${BASE}/api/resume/submit`, {
      method: 'POST',
      body: formData, // browser sets multipart boundary
    });
  }

  /**
   * Create a hosted Stripe Checkout session ($1).
   * Returns { checkoutUrl, sessionId } — redirect the browser there.
   */
  async function createCheckoutSession({ email, requestId }) {
    return jsonFetch(`${BASE}/api/payment/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, requestId }),
    });
  }

  /**
   * Create a Stripe PaymentIntent (for Stripe Elements / Payment Element).
   */
  async function createPaymentIntent({ email, requestId }) {
    return jsonFetch(`${BASE}/api/payment/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, requestId }),
    });
  }

  /**
   * Verify payment (works for both Checkout sessionId and PaymentIntent).
   */
  async function verifyPayment({ sessionId, paymentIntentId, requestId }) {
    return jsonFetch(`${BASE}/api/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, paymentIntentId, requestId }),
    });
  }

  /**
   * Check if a user has used their free resume slot (by email).
   */
  async function checkFreeStatus(email) {
    return jsonFetch(`${BASE}/api/resume/free-status?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    });
  }

  global.API = { submitResume, createCheckoutSession, createPaymentIntent, verifyPayment, checkFreeStatus };
})(window);
