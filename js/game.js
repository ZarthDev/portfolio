/* =========================================================
   FLAPPY ELEPHPANT
   Mini game em Canvas 2D e JavaScript puro — sem bibliotecas.
   O elefante é o mascote oficial do PHP (elePHPant).
   ========================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('flappy');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var W = canvas.width;   // 480
  var H = canvas.height;  // 640

  var elScore = document.getElementById('gScore');
  var elBest  = document.getElementById('gBest');
  var elSound = document.getElementById('gSound');

  /* ----------------------- constantes ----------------------- */
  var GRAVITY    = 1400;   // px/s²
  var FLAP       = -430;   // px/s
  var GROUND_H   = 78;
  var PIPE_W     = 68;
  var GAP_START  = 208;
  var GAP_MIN    = 162;
  var SPEED_START= 158;    // px/s
  var SPEED_MAX  = 268;
  var SPAWN_X    = 290;    // distância entre canos

  var COL = {
    sky1:   '#14090E',
    sky2:   '#2A0A14',
    hill1:  '#25060E',
    hill2:  '#3A0A16',
    pipe:   '#8E0E22',
    pipeHi: '#C31329',
    pipeLo: '#5E0715',
    ground: '#1A1014',
    groundTop: '#8E0E22',
    php:    '#8892BF',
    phpDark:'#6C77A6',
    phpLite:'#AEB5D6',
    ink:    '#F6F4F2'
  };

  /* ----------------------- estado ----------------------- */
  var STATE = { READY: 0, PLAY: 1, DEAD: 2, PAUSE: 3 };
  var state = STATE.READY;

  var bird, pipes, particles, score, best, speed, gap, spawnTimer, shake, flashAlpha, groundX, stars;

  best = readBest();
  elBest.textContent = best;

  function readBest() {
    try { return parseInt(localStorage.getItem('flappy-elephpant-best'), 10) || 0; }
    catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem('flappy-elephpant-best', String(v)); } catch (e) { /* modo privado */ }
  }

  function reset() {
    bird = { x: 128, y: H * 0.42, vy: 0, r: 17, rot: 0, wing: 0 };
    pipes = [];
    particles = [];
    score = 0;
    speed = SPEED_START;
    gap = GAP_START;
    spawnTimer = 0;
    shake = 0;
    flashAlpha = 0;
    groundX = 0;
    elScore.textContent = '0';

    stars = [];
    for (var i = 0; i < 46; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (H - GROUND_H - 140),
        r: Math.random() * 1.5 + 0.4,
        a: Math.random() * 0.5 + 0.2,
        tw: Math.random() * 3 + 1
      });
    }
  }
  reset();

  /* ----------------------- som ----------------------- */
  var audioOn = false;
  var actx = null;

  function beep(freq, dur, type, vol) {
    if (!audioOn) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, actx.currentTime);
      g.gain.setValueAtTime(vol || 0.05, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* sem áudio disponível */ }
  }

  elSound.addEventListener('click', function () {
    audioOn = !audioOn;
    elSound.classList.toggle('is-on', audioOn);
    elSound.textContent = audioOn ? '♪' : '♩';
    elSound.setAttribute('aria-label', audioOn ? 'Desligar som' : 'Ligar som');
    if (audioOn) beep(660, 0.08, 'square', 0.04);
  });

  /* ----------------------- entrada ----------------------- */
  function flap() {
    if (state === STATE.READY) { state = STATE.PLAY; bird.y = H * 0.42; }
    if (state === STATE.DEAD) { reset(); state = STATE.READY; return; }
    if (state === STATE.PAUSE) { state = STATE.PLAY; return; }
    bird.vy = FLAP;
    bird.wing = 1;
    beep(520, 0.07, 'square', 0.035);
    for (var i = 0; i < 4; i++) {
      particles.push({
        x: bird.x - 14, y: bird.y + 8,
        vx: -(Math.random() * 90 + 40), vy: (Math.random() - 0.5) * 70,
        life: 0.5, max: 0.5, r: Math.random() * 3 + 1.5
      });
    }
  }

  canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); flap(); });

  var inView = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting && en[0].intersectionRatio > 0.35;
      if (!inView && state === STATE.PLAY) state = STATE.PAUSE;
    }, { threshold: [0, 0.35, 0.7] }).observe(canvas);
  }

  document.addEventListener('keydown', function (e) {
    if (!inView) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
      e.preventDefault(); flap();
    } else if (e.key === 'p' || e.key === 'P') {
      if (state === STATE.PLAY) state = STATE.PAUSE;
      else if (state === STATE.PAUSE) state = STATE.PLAY;
    } else if (e.key === 'r' || e.key === 'R') {
      reset(); state = STATE.READY;
    }
  });

  /* ----------------------- canos ----------------------- */
  function spawnPipe() {
    var margin = 64;
    var usable = H - GROUND_H - gap - margin * 2;
    var top = margin + Math.random() * usable;
    pipes.push({ x: W + PIPE_W, top: top, passed: false });
  }

  /* ----------------------- atualização ----------------------- */
  function update(dt) {
    groundX = (groundX - speed * dt * 0.9) % 42;

    if (state === STATE.READY) {
      bird.y = H * 0.17 + Math.sin(performance.now() / 320) * 9;
      bird.rot = Math.sin(performance.now() / 320) * 0.08;
      bird.wing = (Math.sin(performance.now() / 170) + 1) / 2;
      return;
    }

    if (state !== STATE.PLAY) {
      // na morte o elefante ainda cai até o chão
      if (state === STATE.DEAD && bird.y < H - GROUND_H - bird.r) {
        bird.vy += GRAVITY * dt;
        bird.y += bird.vy * dt;
        bird.rot = Math.min(bird.rot + dt * 5, 1.5);
      }
      if (shake > 0) shake = Math.max(0, shake - dt * 34);
      if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 2.2);
      stepParticles(dt);
      return;
    }

    /* física */
    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.wing = Math.max(0, bird.wing - dt * 2.6);
    var targetRot = Math.max(-0.5, Math.min(bird.vy / 620, 1.25));
    bird.rot += (targetRot - bird.rot) * Math.min(1, dt * 9);

    /* dificuldade progressiva */
    speed = Math.min(SPEED_MAX, SPEED_START + score * 3.4);
    gap = Math.max(GAP_MIN, GAP_START - score * 2.2);

    /* canos */
    spawnTimer -= speed * dt;
    if (spawnTimer <= 0) { spawnPipe(); spawnTimer = SPAWN_X; }

    for (var i = pipes.length - 1; i >= 0; i--) {
      var p = pipes[i];
      p.x -= speed * dt;
      if (!p.passed && p.x + PIPE_W < bird.x - bird.r) {
        p.passed = true;
        score++;
        elScore.textContent = score;
        beep(820 + Math.min(score, 12) * 22, 0.09, 'triangle', 0.045);
      }
      if (p.x < -PIPE_W - 10) pipes.splice(i, 1);
    }

    stepParticles(dt);

    /* colisões */
    if (bird.y + bird.r > H - GROUND_H) { bird.y = H - GROUND_H - bird.r; die(); return; }
    if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0; }

    for (var j = 0; j < pipes.length; j++) {
      if (hitsPipe(pipes[j])) { die(); return; }
    }

    if (shake > 0) shake = Math.max(0, shake - dt * 34);
    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 2.2);
  }

  function stepParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var q = particles[i];
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 220 * dt;
      if (q.life <= 0) particles.splice(i, 1);
    }
  }

  function hitsPipe(p) {
    // hitbox do elefante ligeiramente menor que o desenho — mais justo
    var r = bird.r - 2.5;
    var bx = bird.x, by = bird.y;
    if (bx + r < p.x || bx - r > p.x + PIPE_W) return false;
    return (by - r < p.top) || (by + r > p.top + gap);
  }

  function die() {
    if (state === STATE.DEAD) return;
    state = STATE.DEAD;
    shake = 13;
    flashAlpha = 0.55;
    beep(180, 0.22, 'sawtooth', 0.06);
    setTimeout(function () { beep(110, 0.3, 'sawtooth', 0.05); }, 110);

    for (var i = 0; i < 20; i++) {
      particles.push({
        x: bird.x, y: bird.y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.7) * 280,
        life: 0.9, max: 0.9, r: Math.random() * 4 + 2
      });
    }

    if (score > best) {
      best = score;
      elBest.textContent = best;
      writeBest(best);
    }
  }

  /* ----------------------- desenho ----------------------- */
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawBackground(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.sky1);
    g.addColorStop(0.55, COL.sky2);
    g.addColorStop(1, '#170509');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // brilho bordô
    var rg = ctx.createRadialGradient(W * 0.72, H * 0.24, 10, W * 0.72, H * 0.24, 260);
    rg.addColorStop(0, 'rgba(195,19,41,.34)');
    rg.addColorStop(1, 'rgba(195,19,41,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // estrelas
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = s.a * (0.6 + 0.4 * Math.sin(t / 500 * s.tw + i));
      ctx.fillStyle = 'rgba(246,244,242,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // morros em parallax
    drawHills(H - GROUND_H - 16, 62, COL.hill1, (groundX * 0.25));
    drawHills(H - GROUND_H - 2, 42, COL.hill2, (groundX * 0.5));
  }

  function drawHills(baseY, amp, color, offset) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 8) {
      var y = baseY - Math.sin((x + offset * 4) / 92) * amp * 0.5 - Math.sin((x + offset * 4) / 37) * amp * 0.22 - amp * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawPipes() {
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      drawPipe(p.x, 0, PIPE_W, p.top, true);
      drawPipe(p.x, p.top + gap, PIPE_W, H - GROUND_H - (p.top + gap), false);
    }
  }

  function drawPipe(x, y, w, h, flipped) {
    if (h <= 0) return;
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, COL.pipeLo);
    g.addColorStop(0.32, COL.pipe);
    g.addColorStop(0.52, COL.pipeHi);
    g.addColorStop(1, COL.pipeLo);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // ranhuras
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    for (var yy = y + 14; yy < y + h - 6; yy += 26) ctx.fillRect(x + 4, yy, w - 8, 3);

    // boca do cano
    var capH = 26;
    var capY = flipped ? y + h - capH : y;
    var cg = ctx.createLinearGradient(x - 6, 0, x + w + 6, 0);
    cg.addColorStop(0, COL.pipeLo);
    cg.addColorStop(0.4, COL.pipeHi);
    cg.addColorStop(1, COL.pipeLo);
    ctx.fillStyle = cg;
    roundRect(ctx, x - 7, capY, w + 14, capH, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(246,244,242,.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGround() {
    ctx.fillStyle = COL.ground;
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);

    ctx.fillStyle = COL.groundTop;
    ctx.fillRect(0, H - GROUND_H, W, 3);

    ctx.fillStyle = 'rgba(246,244,242,.05)';
    for (var x = groundX - 42; x < W + 42; x += 42) {
      ctx.fillRect(x, H - GROUND_H + 12, 22, 3);
      ctx.fillRect(x + 12, H - GROUND_H + 30, 14, 3);
    }
  }

  /* ---- o elefante do PHP ---- */
  function drawElephant() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);

    var s = 1;
    ctx.scale(s, s);

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 24, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    // patas
    ctx.fillStyle = COL.phpDark;
    var legLift = Math.sin(performance.now() / 120) * 1.5;
    roundRect(ctx, -14, 12, 9, 11 + legLift, 3); ctx.fill();
    roundRect(ctx, 2, 12, 9, 11 - legLift, 3);  ctx.fill();

    // cauda
    ctx.strokeStyle = COL.phpDark;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-21, 0);
    ctx.quadraticCurveTo(-30, -2, -29, -9);
    ctx.stroke();

    // corpo
    var bg = ctx.createLinearGradient(0, -18, 0, 18);
    bg.addColorStop(0, COL.phpLite);
    bg.addColorStop(0.5, COL.php);
    bg.addColorStop(1, COL.phpDark);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(-3, 0, 22, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // cabeça
    ctx.fillStyle = COL.php;
    ctx.beginPath();
    ctx.ellipse(14, -3, 13, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // tromba
    ctx.strokeStyle = COL.php;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.quadraticCurveTo(33, 4, 31, 13);
    ctx.stroke();
    ctx.strokeStyle = COL.phpDark;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(26, 2);
    ctx.quadraticCurveTo(33, 5, 31.5, 11);
    ctx.stroke();

    // presa
    ctx.fillStyle = '#F6F4F2';
    ctx.beginPath();
    ctx.moveTo(22, 5);
    ctx.quadraticCurveTo(25, 11, 21, 12);
    ctx.quadraticCurveTo(21, 8, 20, 5.5);
    ctx.closePath();
    ctx.fill();

    // orelha / "asa"
    var flap = bird.wing;
    ctx.save();
    ctx.translate(6, -6);
    ctx.rotate(-0.35 - flap * 0.65);
    ctx.fillStyle = COL.phpDark;
    ctx.beginPath();
    ctx.ellipse(0, 5, 11, 13 - flap * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(174,181,214,.55)';
    ctx.beginPath();
    ctx.ellipse(0.5, 5, 7, 9 - flap * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // olho
    ctx.fillStyle = '#F6F4F2';
    ctx.beginPath();
    ctx.arc(19, -6, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14121F';
    var look = state === STATE.DEAD ? 0 : Math.min(2, bird.vy / 400);
    ctx.beginPath();
    ctx.arc(20.4, -6 + look, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (state === STATE.DEAD) { // olho em X
      ctx.strokeStyle = '#14121F';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(16.8, -8.6); ctx.lineTo(21.6, -3.6);
      ctx.moveTo(21.6, -8.6); ctx.lineTo(16.8, -3.6);
      ctx.stroke();
    }

    // "php" no corpo
    ctx.fillStyle = 'rgba(20,18,31,.42)';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('php', -6, 3);

    ctx.restore();
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var q = particles[i];
      var a = Math.max(0, q.life / q.max);
      ctx.fillStyle = 'rgba(232,54,76,' + (a * 0.75).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function panel(title, lines, sub) {
    ctx.fillStyle = 'rgba(10,10,10,.72)';
    ctx.fillRect(0, 0, W, H);

    var boxW = 300, boxH = 186;
    var bx = (W - boxW) / 2, by = (H - boxH) / 2 - 20;

    ctx.fillStyle = 'rgba(23,21,24,.95)';
    roundRect(ctx, bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(142,14,34,.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = COL.ink;
    ctx.font = '900 30px Archivo, Helvetica, Arial, sans-serif';
    ctx.fillText(title, W / 2, by + 52);

    ctx.fillStyle = 'rgba(246,244,242,.62)';
    ctx.font = '400 13px Inter, system-ui, sans-serif';
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], W / 2, by + 86 + i * 22);
    }

    if (sub) {
      ctx.fillStyle = COL.pipeHi;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(sub, W / 2, by + boxH - 24);
    }
    ctx.textAlign = 'left';
  }

  function draw(t) {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawBackground(t);
    drawPipes();
    drawParticles();
    drawGround();
    drawElephant();

    ctx.restore();

    if (flashAlpha > 0) {
      ctx.fillStyle = 'rgba(195,19,41,' + flashAlpha.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    // pontuação grande durante a partida
    if (state === STATE.PLAY) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(246,244,242,.14)';
      ctx.font = '900 104px Archivo, Helvetica, Arial, sans-serif';
      ctx.fillText(String(score), W / 2, H * 0.34);
      ctx.textAlign = 'left';
    }

    if (state === STATE.READY) {
      panel('FLAPPY ELEPHPANT', [
        'Leve o elefante do PHP entre os canos.',
        'Clique, toque ou aperte espaço.'
      ], 'RECORDE: ' + best);
      drawElephant(); // o mascote fica por cima do painel
    } else if (state === STATE.PAUSE) {
      panel('PAUSADO', ['Aperte P ou clique para continuar.'], 'PONTOS: ' + score);
    } else if (state === STATE.DEAD) {
      var msg = score > 0 && score === best
        ? 'Novo recorde! Nada mal.'
        : 'O elefante não é lá muito aerodinâmico.';
      panel('FIM DE JOGO', [
        'Pontuação: ' + score + '   ·   Recorde: ' + best,
        msg
      ], 'CLIQUE OU APERTE R PARA JOGAR DE NOVO');
    }
  }

  /* ----------------------- loop ----------------------- */
  var last = performance.now();
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.045); // trava contra saltos de aba inativa
    last = now;
    update(dt);
    draw(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

}());
