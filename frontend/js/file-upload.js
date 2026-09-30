/* ===================================================================
   file-upload.js — Drag/drop, previews, size & type validation
   =================================================================== */
(function (global) {
  'use strict';

  const ALLOWED = {
    image: ['image/jpeg', 'image/jpg', 'image/png'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    cert: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
           'application/msword',
           'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };

  const MAX_SIZE = {
    profileImage: 5 * 1024 * 1024,
    profilePhoto: 5 * 1024 * 1024,
    certs: 10 * 1024 * 1024,
    existingResume: 10 * 1024 * 1024,
    portfolioDocs: 10 * 1024 * 1024,
  };

  function fmtSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function validateFile(file, type) {
    if (!file) return 'No file selected.';
    if (file.size > MAX_SIZE[type]) {
      return `File too large. Max ${fmtSize(MAX_SIZE[type])}.`;
    }
    const allowed = ALLOWED[type === 'profileImage' || type === 'profilePhoto' ? 'image' :
                         type === 'certs' ? 'cert' : 'document'];
    // allow by extension too (some browsers report empty type)
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const extOk = ['pdf','jpg','jpeg','png','doc','docx'].includes(ext);
    if (!allowed.includes(file.type) && !extOk) {
      return 'Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX.';
    }
    return '';
  }

  function renderPreview(previewEl, files) {
    if (!previewEl) return;
    previewEl.innerHTML = '';
    Array.from(files).forEach((f) => {
      const tag = document.createElement('span');
      tag.className = 'pf';
      tag.innerHTML = `<span>📄 ${f.name}</span><span style="color:var(--text-mute)">${fmtSize(f.size)}</span><span class="x" title="Remove">×</span>`;
      tag.querySelector('.x').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = previewEl.parentElement.querySelector('input[type=file]');
        const dt = new DataTransfer();
        Array.from(input.files).forEach((x) => { if (x !== f) dt.items.add(x); });
        input.files = dt.files;
        renderPreview(previewEl, input.files);
        // clear error if any
        const err = previewEl.parentElement.parentElement.querySelector('.err');
        if (err) err.textContent = '';
        previewEl.parentElement.classList.remove('is-drag');
      });
      previewEl.appendChild(tag);
    });
  }

  function initDrop(dropEl) {
    const input = dropEl.querySelector('input[type=file]');
    const preview = dropEl.querySelector('.file-preview');
    const target = dropEl.dataset.target;
    if (!input) return;

    // Drag visuals
    ['dragenter', 'dragover'].forEach((ev) => {
      dropEl.addEventListener(ev, (e) => {
        e.preventDefault();
        dropEl.classList.add('is-drag');
      });
    });
    ['dragleave', 'drop'].forEach((ev) => {
      dropEl.addEventListener(ev, (e) => {
        e.preventDefault();
        dropEl.classList.remove('is-drag');
      });
    });
    dropEl.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) {
        try { input.files = files; } catch (_) {}
        handleFiles(input, preview, target);
      }
    });

    input.addEventListener('change', () => handleFiles(input, preview, target));
  }

  function handleFiles(input, preview, target) {
    const errEl = input.closest('.field')?.querySelector('.err');
    const files = Array.from(input.files);
    let firstErr = '';
    for (const f of files) {
      const err = validateFile(f, target);
      if (err) { firstErr = err; break; }
    }
    if (errEl) errEl.textContent = firstErr;
    renderPreview(preview, input.files);
  }

  function initAll() {
    document.querySelectorAll('.file-drop').forEach(initDrop);
  }

  global.FileUpload = { initAll, validateFile, MAX_SIZE, ALLOWED };
})(window);
