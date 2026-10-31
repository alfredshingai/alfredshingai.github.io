/* Field Notes interactions — messy -> cleaned demo */
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
