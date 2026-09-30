/**
 * Payment routes (Stripe)
 * POST /api/payment/create-checkout   — create a hosted Stripe Checkout session ($1)
 * POST /api/payment/create-intent     — create a $1 PaymentIntent (for Stripe Elements)
 * POST /api/payment/verify            — verify a completed payment
 * POST /api/payment/webhook           — Stripe webhook (raw body)
 */

import { Router } from 'express';
import Stripe from 'stripe';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

/** Create a hosted Stripe Checkout session for $1 (recommended) */
router.post('/create-checkout', async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe is not configured on this server. Set STRIPE_SECRET_KEY in .env.',
      });
    }

    const { email, requestId } = req.body || {};
    if (!email || !requestId) {
      return res.status(400).json({ error: 'email and requestId are required.' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Professional Resume Creation',
            description: 'Digital IT Move — second-and-onward resume request',
          },
          unit_amount: 100, // $1.00
        },
        quantity: 1,
      }],
      metadata: {
        requestId,
        product: 'resume_creation_v1',
        brand: 'Digital IT Move',
      },
      success_url: `${BASE_URL}/?paid=1&requestId=${encodeURIComponent(requestId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/?paid=0&requestId=${encodeURIComponent(requestId)}`,
    });

    res.json({
      ok: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      requestId,
    });
  } catch (err) {
    next(err);
  }
});

/** Create a $1 PaymentIntent for use with Stripe Elements / Payment Element */
router.post('/create-intent', async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe is not configured on this server. Set STRIPE_SECRET_KEY in .env.',
      });
    }

    const { email, requestId } = req.body || {};
    if (!email || !requestId) {
      return res.status(400).json({ error: 'email and requestId are required.' });
    }

    const intent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      receipt_email: email,
      automatic_payment_methods: { enabled: true },
      metadata: { requestId, product: 'resume_creation_v1', brand: 'Digital IT Move' },
    });

    res.json({
      ok: true,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency,
      email,
    });
  } catch (err) {
    next(err);
  }
});

/** Verify a Checkout session (after user returns from hosted page) */
router.post('/verify', async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured.' });
    const { sessionId, paymentIntentId, requestId } = req.body || {};

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return res.json({
        ok: true,
        status: session.payment_status, // 'paid' | 'unpaid' | 'no_payment_required'
        amount: session.amount_total,
        currency: session.currency,
        requestId: session.metadata?.requestId || requestId,
      });
    }
    if (paymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return res.json({
        ok: true,
        status: intent.status,
        amount: intent.amount,
        currency: intent.currency,
        requestId: intent.metadata?.requestId,
      });
    }
    return res.status(400).json({ error: 'sessionId or paymentIntentId required.' });
  } catch (err) {
    next(err);
  }
});

/** Stripe webhook for asynchronous events */
router.post('/webhook', (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(200).send('ok');
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      console.log('✅ Checkout session completed:', event.data.object.id);
      break;
    case 'payment_intent.succeeded':
      console.log('✅ PaymentIntent succeeded:', event.data.object.id);
      break;
    case 'payment_intent.payment_failed':
      console.log('❌ PaymentIntent failed:', event.data.object.id);
      break;
    default:
      break;
  }
  res.json({ received: true });
});

export default router;

