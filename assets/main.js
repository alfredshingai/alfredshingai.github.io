/* Alfred Shingai — shared site JS (all pages) */

/* Theme toggle (pre-paint class is set inline in <head>) */
(function () {
  const toggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  if (!toggle) return;
  function syncToggleIcon() {
    toggle.textContent = html.classList.contains('light-mode') ? '☀️' : '🌙';
  }
  syncToggleIcon();
  toggle.addEventListener('click', () => {
    html.classList.toggle('light-mode');
    localStorage.setItem('theme', html.classList.contains('light-mode') ? 'light' : 'dark');
    syncToggleIcon();
  });
})();

/* Mobile burger menu */
(function () {
  const burger = document.getElementById('nav-burger');
  const navLinks = document.getElementById('nav-links');
  if (!burger || !navLinks) return;
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }));
})();

/* Scroll progress bar */
(function () {
  const progress = document.getElementById('scroll-progress');
  if (!progress) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    progress.style.width = scrolled + '%';
  }, { passive: true });
})();

/* Reveal on scroll */
(function () {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => { if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 70); });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

/* Scrollspy (home only — no-ops elsewhere) */
(function () {
  const sections = document.querySelectorAll('section[id], header[id]');
  const navItems = document.querySelectorAll('.nav-links a[data-nav]');
  if (!sections.length || !navItems.length) return;
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(a => a.classList.remove('active'));
        const target = document.querySelector(`.nav-links a[data-nav="${entry.target.id}"]`) || document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (target) target.classList.add('active');
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  sections.forEach(s => spy.observe(s));
})();

/* Custom cursor (desktop, motion-safe only) */
(function () {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isTouch && !prefersReduced) {
    document.body.classList.add('has-custom-cursor');
    let mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px)`; });
    (function animateRing() {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(animateRing);
    })();
    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });
    document.querySelectorAll('a, button, .work-item, .skill-chip, .social-link, .post-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const label = el.dataset.cursor || '';
        if (label) { ring.dataset.label = label; ring.classList.add('has-label'); }
        dot.classList.add('hover'); ring.classList.add('hover');
      });
      el.addEventListener('mouseleave', () => { ring.dataset.label = ''; ring.classList.remove('has-label', 'hover'); dot.classList.remove('hover'); });
    });
  } else {
    dot.style.display = 'none';
    ring.style.display = 'none';
  }
})();
