/* ===================================================================
   animations.js — Reveal animations
   Reliable approach: IntersectionObserver + CSS transitions
   Enhanced with GSAP hero entrance timeline for premium feel
   =================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    // Mark the document as JS-ready so CSS can hide elements for the reveal effect.
    document.documentElement.classList.add('js-ready');

    // ---- IO reveal (works even without JS animation libs) ----
    const targets = document.querySelectorAll(
      '.section-head, .price-card, .how-card, .cta-strip, ' +
      '.progress-wrap, .pricing-banner, .form, .hero-card'
    );

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.01, rootMargin: '0px 0px -5% 0px' });
      targets.forEach((el) => io.observe(el));
    } else {
      targets.forEach((el) => el.classList.add('in-view'));
    }

    // ---- GSAP enhancements (if loaded) ----
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } });
    tl.fromTo('.badge',      { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.1)
      .fromTo('.hero-title', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.0 }, 0.25)
      .fromTo('.hero-sub',   { opacity: 0 },        { opacity: 1, duration: 0.7 }, 0.55)
      .fromTo('.hero-cta',   { opacity: 0 },        { opacity: 1, duration: 0.7 }, 0.7)
      .fromTo('.hero-points',{ opacity: 0 },        { opacity: 1, duration: 0.7 }, 0.85);

    // When an element gets the .in-view class, animate it in with GSAP for a premium feel
    const obs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        if (m.target.classList.contains('in-view')) {
          gsap.fromTo(m.target,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', overwrite: true }
          );
        }
      });
    });
    targets.forEach((el) => obs.observe(el, { attributes: true, attributeFilter: ['class'] }));

    // Orb parallax (only on devices with hover)
    if (window.matchMedia('(hover: hover)').matches) {
      const orbs = document.querySelectorAll('.orb');
      window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 30;
        const y = (e.clientY / window.innerHeight - 0.5) * 30;
        gsap.to(orbs, { x, y, duration: 1.2, ease: 'power2.out' });
      });
    }
  });
})();
