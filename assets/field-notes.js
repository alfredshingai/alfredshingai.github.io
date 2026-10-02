/* Field Notes interactions — messy -> cleaned demo + write-on titles */
(function () {
  const messy = [
    ["Harare ", "Maize ", "", "2026-01-04", "blank"],
    ["harare", "maize", 1250, "04/01/2026", "dup?"],
    ["HARARE", "Maize", null, "2026-01-04", "null"],
    ["Harare", "Maize ", 1250, "2026-01-04", "space"],
    ["", "Maize", 1250, "2026-01-04", "missing"],
    ["Harare", "Maize", 1250, "2026-01-04", "ok"]
  ];
  const clean = [
    ["Harare", "Maize", 1250, "2026-01-04", "clean"],
    ["Harare", "Maize", 1350, "2026-01-05", "clean"],
    ["Bulawayo", "Maize", 1280, "2026-01-04", "clean"],
    ["Mutare", "Beans", 2100, "2026-01-04", "clean"]
  ];
  const tbody = document.querySelector("#fn-tbody");
  const bar = document.getElementById("fn-bar");
  const status = document.getElementById("fn-status");
  const foot = document.getElementById("fn-foot");
  const bM = document.getElementById("fn-mess");
  const bC = document.getElementById("fn-clean");
  if (tbody && bM && bC) {
    function cell(v) {
      if (v === "" ) return "<i style='opacity:.5'>(blank)</i>";
      if (v === null || v === undefined) return "—";
      return String(v);
    }
    function render(rows, mode) {
      tbody.innerHTML = rows.map(r =>
        `<tr class="${mode}"><td class="${mode === 'mess' ? 'bad' : ''}">${cell(r[0])}</td>` +
        `<td>${cell(r[1])}</td><td>${cell(r[2])}</td><td>${cell(r[3])}</td>` +
        `<td>${mode === 'mess'
          ? `<span class="fn-pill">${r[4]}</span>`
          : `<span class="fn-pill ok">✓ ${r[4]}</span>`}</td></tr>`
      ).join("");
      bar.style.width = mode === 'mess' ? '12%' : '100%';
      status.textContent = mode === 'mess' ? '4 duplicates · 3 blanks · 2 formats' : '0 issues · 4 canonical rows · typed';
      status.classList.toggle('ok', mode === 'clean');
      foot.textContent = mode === 'mess'
        ? 'raw export → press cleaned. This is what I do all day.'
        : 'canonical keys · trimmed · deduped · typed — ready for SokoData / StatLab.';
      bM.classList.toggle('active', mode === 'mess');
      bC.classList.toggle('active', mode === 'clean');
    }
    bM.addEventListener('click', () => render(messy, 'mess'));
    bC.addEventListener('click', () => render(clean, 'clean'));
    render(messy, 'mess');
  }
})();

/* write-on titles: letter-by-letter when scrolled into view */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll(
    '.hero-headline, .section-title, .work-title, .contact-title'
  );
  if (!targets.length) return;
  if (reduce) return; // leave titles static

  function split(el) {
    if (el.dataset.fnSplit) return;
    el.dataset.fnSplit = '1';
    el.classList.add('fn-write');
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach((node) => {
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach((c) => {
        if (c === '\n' || c === '\r') return;
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c === ' ' ? '\u00A0' : c;
        frag.appendChild(s);
      });
      node.replaceWith(frag);
    });
    // <br> elements are preserved by the walker (element nodes untouched)
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      io.unobserve(el);
      split(el);
      const chars = el.querySelectorAll('.ch');
      chars.forEach((c, i) => { c.style.animationDelay = (i * 45) + 'ms'; });
      const caret = document.createElement('span');
      caret.className = 'caret';
      el.appendChild(caret);
      setTimeout(() => caret.remove(), chars.length * 45 + 1600);
    });
  }, { threshold: 0.4 });
  targets.forEach((t) => io.observe(t));
})();

/* hero typewriter: I turn ___ into answers. */
(function () {
  const el = document.getElementById('fn-typed');
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phrases = [
    'messy CSVs',
    'WFP PDFs',
    '10k-row Excel dumps',
    'files with only a header'
  ];
  if (reduce) { el.textContent = phrases[0]; return; }
  let pi = 0, ci = phrases[0].length, deleting = true;
  function tick() {
    const cur = phrases[pi];
    if (deleting) {
      ci -= 1;
      el.textContent = cur.slice(0, Math.max(ci, 0));
      if (ci <= 0) { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(tick, 350); return; }
      setTimeout(tick, 28);
    } else {
      const next = phrases[pi];
      ci += 1;
      el.textContent = next.slice(0, ci);
      if (ci >= next.length) { deleting = true; setTimeout(tick, 2100); return; }
      setTimeout(tick, 55);
    }
  }
  setTimeout(tick, 2100);
})();
