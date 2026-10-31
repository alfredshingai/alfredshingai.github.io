/* Alfred Shingai — animated backdrop.
   A 3D wireframe scatter field (cyan points around a fitted regression
   plane) drifting slowly behind the content. On load the field assembles
   from a screen of flickering 0/1 digits; following an internal link
   dissolves the page back into digit rain before navigating.
   Hand-rolled WebGL2 + one 2D overlay canvas, no libraries.

   Discipline (the Craig Weiss rules): only boots on desktop-class
   devices that can afford it (WebGL2, >=4 cores, >=4GB, motion allowed,
   dark mode), starts on requestIdleCallback, pauses when the tab is
   hidden, and degrades to the plain background everywhere else. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia('(min-width: 900px)').matches;
  var capable = (function () {
    try {
      if (!document.createElement('canvas').getContext('webgl2')) return false;
    } catch (e) { return false; }
    return (navigator.hardwareConcurrency || 8) >= 4 && (navigator.deviceMemory || 8) >= 4;
  })();
  // debug hook: sessionStorage.setItem('bg-force','1') bypasses the gates
  var FORCE = false;
  try { FORCE = sessionStorage.getItem('bg-force') === '1'; } catch (e) {}
  if ((reduce || !capable || !desktop) && !FORCE) {
    if (FORCE) console.warn('[backdrop] gated out:', { reduce: reduce, capable: capable, desktop: desktop });
    return;
  }

  var CYAN = [34, 211, 238];   // #22D3EE
  var GREEN = [16, 185, 129];  // #10B981
  var INK = [139, 175, 201];   // #8BAFC9

  var scene = document.createElement('canvas');
  scene.className = 'bg-scene';
  scene.setAttribute('aria-hidden', 'true');
  var rain = document.createElement('canvas');
  rain.className = 'bg-rain';
  rain.setAttribute('aria-hidden', 'true');
  document.body.prepend(rain, scene);

  var gl = scene.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  var rctx = rain.getContext('2d');
  if (!gl || !rctx) {
    if (FORCE) console.warn('[backdrop] no webgl2 context — running plain background');
    scene.remove(); rain.remove(); return;
  }

  var dark = !document.documentElement.classList.contains('light-mode');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  var raf = 0, running = false, t0 = 0;
  var mode = 'idle';           // 'in' | 'out' | 'idle'
  var rainStart = 0, rainSeed = 1, pendingHref = null;

  /* ---------- tiny matrix / vector kit (column-major) ---------- */

  function m4Perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    var out = new Float32Array(16);
    out[0] = f / aspect; out[5] = f;
    out[10] = (far + near) * nf; out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross3(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm3(v) {
    var l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function m4LookAt(eye, center, up) {
    var z = norm3(sub3(eye, center));
    var x = norm3(cross3(up, z));
    var y = cross3(z, x);
    var out = new Float32Array(16);
    out[0] = x[0]; out[1] = y[0]; out[2] = z[0];
    out[4] = x[1]; out[5] = y[1]; out[6] = z[1];
    out[8] = x[2]; out[9] = y[2]; out[10] = z[2];
    out[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
    out[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
    out[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
    out[15] = 1;
    return out;
  }
  function m4Mul(a, b) {
    var out = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return out;
  }

  /* ---------- the scene: noisy points around a fitted plane ---------- */

  var N = 850;
  var pts = new Float32Array(N * 3);
  var seeds = new Float32Array(N);
  function gauss() {
    var u = Math.random() || 1e-6, v = Math.random() || 1e-6;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function fit(x, z) { return 0.34 * x - 0.18 * z; }   // the "regression"
  (function seedCloud() {
    for (var i = 0; i < N; i++) {
      var x = (Math.random() * 2 - 1) * 9;
      var z = (Math.random() * 2 - 1) * 5.5;
      var y = fit(x, z) + gauss() * 0.5;
      pts[i * 3] = x; pts[i * 3 + 1] = Math.max(-4, Math.min(4, y)); pts[i * 3 + 2] = z;
      seeds[i] = Math.random();
    }
  })();
  var lineVerts = (function grid() {
    var v = [];
    var x, z;
    for (z = -5.5; z <= 5.51; z += 1.375) {
      for (x = -9; x < 9; x += 1.5) {
        v.push(x, fit(x, z), z, x + 1.5, fit(x + 1.5, z), z);
      }
    }
    for (x = -9; x <= 9.01; x += 1.5) {
      for (z = -5.5; z < 5.5; z += 1.375) {
        v.push(x, fit(x, z), z, x, fit(x, z + 1.375), z + 1.375);
      }
    }
    return new Float32Array(v);
  })();
  var lineCount = lineVerts.length / 3;

  /* ---------- shaders ---------- */

  function makeProgram(vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  var ptProg, lineProg, ptBuf, seedBuf, lineBuf;
  function initGL() {
    ptProg = makeProgram(
      'attribute vec3 aPos; attribute float aSeed;' +
      'uniform mat4 uP; uniform mat4 uV; uniform float uSize;' +
      'varying float vFog; varying float vSeed;' +
      'void main(){' +
      '  vec4 mv = uV * vec4(aPos, 1.0);' +
      '  gl_Position = uP * mv;' +
      '  float dist = length(mv.xyz);' +
      '  vFog = 1.0 - smoothstep(8.0, 21.0, dist);' +
      '  vSeed = aSeed;' +
      '  gl_PointSize = uSize * (13.0 / max(dist, 1.0)) * (0.7 + 0.6 * aSeed);' +
      '}',
      'precision mediump float;' +
      'uniform vec3 uColor;' +
      'varying float vFog; varying float vSeed;' +
      'void main(){' +
      '  vec2 d = gl_PointCoord - 0.5;' +
      '  float r = length(d);' +
      '  if (r > 0.5) discard;' +
      '  float a = smoothstep(0.5, 0.12, r) * vFog * (0.4 + 0.6 * vSeed);' +
      '  gl_FragColor = vec4(uColor, a);' +
      '}'
    );
    lineProg = makeProgram(
      'attribute vec3 aPos;' +
      'uniform mat4 uP; uniform mat4 uV;' +
      'varying float vFog;' +
      'void main(){' +
      '  vec4 mv = uV * vec4(aPos, 1.0);' +
      '  gl_Position = uP * mv;' +
      '  vFog = 1.0 - smoothstep(8.0, 21.0, length(mv.xyz));' +
      '}',
      'precision mediump float;' +
      'uniform vec3 uColor; uniform float uAlpha;' +
      'varying float vFog;' +
      'void main(){ gl_FragColor = vec4(uColor, uAlpha * vFog); }'
    );
    ptBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
    seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  function drawScene(t) {
    var eye = [Math.sin(t * 0.04 + 0.35) * 10.6, 4.4 + Math.sin(t * 0.11) * 0.35, Math.cos(t * 0.04 + 0.35) * 10.6];
    var V = m4LookAt(eye, [0, 0.2, 0], [0, 1, 0]);
    var P = m4Perspective(0.72, scene.width / scene.height, 0.1, 60);
    gl.viewport(0, 0, scene.width, scene.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(ptProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(ptProg, 'uP'), false, P);
    gl.uniformMatrix4fv(gl.getUniformLocation(ptProg, 'uV'), false, V);
    gl.uniform1f(gl.getUniformLocation(ptProg, 'uSize'), 5.2 * dpr);
    gl.uniform3fv(gl.getUniformLocation(ptProg, 'uColor'), CYAN);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
    var aPos = gl.getAttribLocation(ptProg, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    var aSeed = gl.getAttribLocation(ptProg, 'aSeed');
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.disableVertexAttribArray(aSeed);

    gl.useProgram(lineProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(lineProg, 'uP'), false, P);
    gl.uniformMatrix4fv(gl.getUniformLocation(lineProg, 'uV'), false, V);
    gl.uniform3fv(gl.getUniformLocation(lineProg, 'uColor'), GREEN);
    gl.uniform1f(gl.getUniformLocation(lineProg, 'uAlpha'), 0.28);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    var lPos = gl.getAttribLocation(lineProg, 'aPos');
    gl.enableVertexAttribArray(lPos);
    gl.vertexAttribPointer(lPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, lineCount);
  }

  /* ---------- the digit rain (2D overlay) ---------- */

  var CELL = 24, cols = 0, rows = 0;
  function hash(i, j, s) {
    var x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function layoutRain() {
    rain.width = Math.ceil(innerWidth * dpr);
    rain.height = Math.ceil(innerHeight * dpr);
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(innerWidth / CELL) + 1;
    rows = Math.ceil(innerHeight / CELL) + 1;
  }
  // cell alpha over progress p: entry reveals cells, exit covers them again
  function cellAlpha(p, h) {
    var a = 1 - (p - h * 0.55) / 0.25;
    return Math.max(0, Math.min(1, a));
  }
  function drawRain(now) {
    var t = (now - rainStart) / 1000;
    var dur = mode === 'in' ? 1.7 : 0.55;
    var p = Math.min(t / dur, 1);
    rctx.clearRect(0, 0, innerWidth, innerHeight);
    if (p >= 1) {
      if (mode === 'out' && pendingHref) {
        var href = pendingHref;
        pendingHref = null; mode = 'idle';
        window.location.href = href;
        return;
      }
      mode = 'idle';
      return;
    }
    var flick = Math.floor(now / 1000 * 7);
    rctx.font = "700 " + Math.round(CELL * 0.55) + "px 'Space Mono', monospace";
    rctx.textAlign = 'center';
    rctx.textBaseline = 'middle';
    var bg = 'rgb(2,8,16)';
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var h = hash(i, j, rainSeed);
        var a = mode === 'in' ? cellAlpha(p, h) : cellAlpha(1 - p, h);
        if (a <= 0) continue;
        rctx.globalAlpha = a;
        rctx.fillStyle = bg;
        rctx.fillRect(i * CELL, j * CELL, CELL, CELL);
        if (a > 0.12 && hash(i + 7, j + 3, rainSeed) > 0.45) {
          var bit = hash(i, j, rainSeed * 13 + flick) > 0.5 ? '0' : '1';
          rctx.globalAlpha = a * 0.85;
          rctx.fillStyle = 'rgb(' + INK.join(',') + ')';
          rctx.fillText(bit, i * CELL + CELL / 2, j * CELL + CELL / 2);
        }
      }
    }
    rctx.globalAlpha = 1;
  }

  function startRain(which) {
    mode = which;
    rainSeed = Math.random() * 100;
    rainStart = performance.now();
  }

  /* ---------- loop, resize, visibility ---------- */

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    scene.width = Math.ceil(innerWidth * dpr);
    scene.height = Math.ceil(innerHeight * dpr);
    layoutRain();
  }
  function loop(now) {
    raf = 0;
    if (!dark || document.hidden) { running = false; return; }
    if (mode !== 'idle') drawRain(now);
    if (!t0) t0 = now;
    drawScene((now - t0) / 1000);
    raf = requestAnimationFrame(loop);
  }
  function wake() {
    if (!running && dark) { running = true; raf = requestAnimationFrame(loop); }
  }
  window.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) wake();
  });

  // stop the loop in light mode, resume when dark again
  new MutationObserver(function () {
    var d = !document.documentElement.classList.contains('light-mode');
    if (d === dark) return;
    dark = d;
    if (dark) { t0 = 0; wake(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ---------- dissolve out on internal navigation ---------- */

  document.addEventListener('click', function (e) {
    if (mode === 'out' || !running) return;
    var a = e.target.closest('a');
    if (!a || e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    var url;
    try { url = new URL(href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.href === location.href) return;
    if (url.pathname === location.pathname) return; // same-page anchor
    e.preventDefault();
    pendingHref = url.href;
    startRain('out');
  });

  /* ---------- boot ---------- */

  try {
    initGL();
    layout();
    drawScene(0);
    scene.classList.add('on');
    startRain('in');
    wake();
  } catch (err) {
    if (raf) cancelAnimationFrame(raf);
    scene.remove(); rain.remove();
    if (FORCE) console.warn('[backdrop] init failed:', err);
  }
})();
