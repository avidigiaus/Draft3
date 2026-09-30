/* ===================================================================
   app.js — Bootstrap
   =================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (window.FormHandler) window.FormHandler.init();

    // Accessibility: ensure progress bar reflects step 1
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = `${(1 / 7) * 100}%`;

    // close nav on link click (mobile)
    document.querySelectorAll('.nav-links a').forEach((a) => {
      a.addEventListener('click', () => {
        document.getElementById('navLinks')?.classList.remove('open');
        document.getElementById('navToggle')?.classList.remove('open');
      });
    });
  });
})();
