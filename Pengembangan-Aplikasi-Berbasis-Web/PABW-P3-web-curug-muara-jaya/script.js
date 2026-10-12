(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const menuToggle = $('#menuToggle');
  const mainNav = $('#mainNav');
  const progress = $('#scrollProgress');
  const toast = $('#toast');
  let toastTimer;

  $('#year').textContent = new Date().getFullYear();

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Tutup navigasi' : 'Buka navigasi');
    mainNav.classList.toggle('open', open);
  });
  $$('#mainNav a').forEach(link => link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Buka navigasi');
  }));

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 }) : null;
  $$('.reveal').forEach(el => revealObserver ? revealObserver.observe(el) : el.classList.add('visible'));

  // Gallery data is gathered from the visible gallery cards, so changing an image in HTML updates the lightbox too.
  const cards = $$('.gallery-card');
  const gallery = cards.map((card, index) => ({
    src: $('img', card).getAttribute('src'),
    alt: $('img', card).getAttribute('alt'),
    label: $('.gallery-card-label b', card)?.textContent || `PHOTO ${index + 1}`
  }));
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxCaption = $('#lightboxCaption');
  const lightboxCounter = $('#lightboxCounter');
  let currentImage = 0;
  let lastFocusedElement = null;

  function renderLightbox() {
    const item = gallery[currentImage];
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt;
    lightboxCaption.textContent = item.label;
    lightboxCounter.textContent = `${String(currentImage + 1).padStart(2, '0')} / ${String(gallery.length).padStart(2, '0')}`;
  }
  function openLightbox(index) {
    if (!gallery.length) return;
    currentImage = index;
    lastFocusedElement = document.activeElement;
    renderLightbox();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    $('#lightboxClose').focus();
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    if (lastFocusedElement) lastFocusedElement.focus();
  }
  function moveLightbox(step) {
    currentImage = (currentImage + step + gallery.length) % gallery.length;
    renderLightbox();
  }
  cards.forEach((card, index) => card.addEventListener('click', () => openLightbox(index)));
  $('#lightboxClose').addEventListener('click', closeLightbox);
  $('#lightboxPrev').addEventListener('click', () => moveLightbox(-1));
  $('#lightboxNext').addEventListener('click', () => moveLightbox(1));
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (!lightbox.classList.contains('open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    if (event.key === 'ArrowRight') moveLightbox(1);
  });

  // Live trip-cost estimator: all calculations happen locally in the browser.
  const estimateForm = $('#costEstimator');
  if (estimateForm) {
    const fields = {
      adults: $('#adultCount'), children: $('#childCount'), motorcycles: $('#motorCount'),
      cars: $('#carCount'), campers: $('#campingCount')
    };
    const rates = { adults: 15000, children: 5000, motorcycles: 3000, cars: 5000, campers: 20000 };
    const money = value => new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(value).replace(/\u00a0/g, ' ');
    const quantity = field => {
      const parsed = Number.parseInt(fields[field].value, 10);
      const safe = Number.isFinite(parsed) ? Math.max(0, Math.min(999, parsed)) : 0;
      fields[field].value = String(safe);
      return safe;
    };
    function calculateEstimate() {
      const count = Object.fromEntries(Object.keys(fields).map(key => [key, quantity(key)]));
      const subtotals = Object.fromEntries(Object.keys(rates).map(key => [key, count[key] * rates[key]]));
      const total = Object.values(subtotals).reduce((sum, value) => sum + value, 0);
      const visitors = count.adults + count.children;
      const vehicles = count.motorcycles + count.cars;
      $('#estimateTotal').textContent = money(total);
      $('#adultSubtotal').textContent = money(subtotals.adults);
      $('#childSubtotal').textContent = money(subtotals.children);
      $('#motorSubtotal').textContent = money(subtotals.motorcycles);
      $('#carSubtotal').textContent = money(subtotals.cars);
      $('#campingSubtotal').textContent = money(subtotals.campers);
      $('#totalVisitors').textContent = `${visitors} ${visitors === 1 ? 'orang' : 'orang'}`;
      $('#totalVehicles').textContent = `${vehicles} ${vehicles === 1 ? 'kendaraan' : 'kendaraan'}`;
      $('#perPerson').textContent = money(visitors > 0 ? Math.round(total / visitors) : 0);
      return { count, subtotals, total, visitors, vehicles };
    }
    Object.values(fields).forEach(field => {
      field.addEventListener('input', calculateEstimate);
      field.addEventListener('change', calculateEstimate);
    });
    estimateForm.addEventListener('reset', () => window.setTimeout(() => {
      $('#estimateFeedback').textContent = '';
      calculateEstimate();
    }, 0));
    $('#copyEstimate').addEventListener('click', async () => {
      const result = calculateEstimate();
      const lines = [
        'Estimasi biaya — Curug Muara Jaya',
        `Dewasa: ${result.count.adults} orang — ${money(result.subtotals.adults)}`,
        `Anak-anak: ${result.count.children} orang — ${money(result.subtotals.children)}`,
        `Motor: ${result.count.motorcycles} — ${money(result.subtotals.motorcycles)}`,
        `Mobil: ${result.count.cars} — ${money(result.subtotals.cars)} (estimasi)`,
        `Camping: ${result.count.campers} orang — ${money(result.subtotals.campers)} (estimasi)`,
        `Total pengunjung: ${result.visitors} orang`,
        `Total kendaraan: ${result.vehicles}`,
        `TOTAL ESTIMASI: ${money(result.total)}`,
        'Catatan: tarif dapat berubah dan belum termasuk bensin/makan. Konfirmasi tarif terbaru di lokasi.'
      ].join('\n');
      const feedback = $('#estimateFeedback');
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(lines);
        } else {
          const helper = document.createElement('textarea');
          helper.value = lines; helper.setAttribute('readonly', '');
          helper.style.position = 'fixed'; helper.style.opacity = '0';
          document.body.appendChild(helper); helper.select();
          const copied = document.execCommand('copy'); helper.remove();
          if (!copied) throw new Error('Clipboard unavailable');
        }
        feedback.textContent = 'Rincian estimasi berhasil disalin.';
      } catch (_) {
        feedback.textContent = 'Fitur salin tidak tersedia di browser ini. Kamu tetap bisa melihat rincian di atas.';
      }
    });
    calculateEstimate();
  }

  // Small parallax on the hero, disabled for touch and reduced-motion preferences.
  const heroImage = $('.hero-image');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroImage && !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight) heroImage.style.backgroundPosition = `center ${Math.min(window.scrollY * 0.12, 90)}px`;
    }, { passive: true });
  }

  // Friendly fallback if a placeholder/photo filename was mistyped while replacing assets.
  $$('img').forEach(img => img.addEventListener('error', () => {
    img.style.visibility = 'hidden';
    const parent = img.parentElement;
    if (parent) parent.style.background = 'linear-gradient(135deg, #d7e3d7, #8eae9d 55%, #426d5d)';
    if (img.closest('.gallery-card')) showToast('Foto belum ditemukan. Cek nama file di folder assets.');
  }));
})();
