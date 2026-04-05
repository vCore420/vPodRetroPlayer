// --- GAMES MENU ---
let releaseGameControls = null;

const HS_KEY = 'gameHighScores';

function migrateLegacyGameHighScores() {
  const legacyFlappy = Number(localStorage.getItem('flappyHighScore') || 0);
  if (!Number.isFinite(legacyFlappy) || legacyFlappy <= 0) return;

  const hs = readLocalJson(HS_KEY, {});
  const currentFlappy = Number.isFinite(hs.flappy) ? hs.flappy : 0;

  if (legacyFlappy > currentFlappy) {
    hs.flappy = legacyFlappy;
    localStorage.setItem(HS_KEY, JSON.stringify(hs));
  }

  localStorage.removeItem('flappyHighScore');
}

migrateLegacyGameHighScores();

function getHighScore(game) {
  const hs = readLocalJson(HS_KEY, {});
  return Number.isFinite(hs[game]) ? hs[game] : 0;
}

function setHighScore(game, val) {
  const hs = readLocalJson(HS_KEY, {});
  hs[game] = val;
  localStorage.setItem(HS_KEY, JSON.stringify(hs));
}

function pushGameNav(fn) {
  const stack = app.state.navStack || [];
  const top = stack[stack.length - 1];
  if (!top || top.fn !== fn) {
    stack.push({ fn, args: ['forward'] });
    app.state.navStack = stack;
  }
}

function gameScreenShell(content, variant = '') {
  const className = ['game-screen-shell', variant ? `game-screen-shell--${variant}` : '']
    .filter(Boolean)
    .join(' ');
  return `<div class="${className}">${content}</div>`;
}

function useGameControls({ onLeft, onRight, onConfirm, onPlayPause }) {
  const prevOld = prevBtn.onclick, nextOld = nextBtn.onclick;
  const confirmOld = document.getElementById('confirmBtn').onclick;
  const playOld = playPauseBtn.onclick;
  prevBtn.onclick = () => onLeft && onLeft();
  nextBtn.onclick = () => onRight && onRight();
  document.getElementById('confirmBtn').onclick = () => onConfirm && onConfirm();
  playPauseBtn.onclick = () => onPlayPause && onPlayPause();
  return () => {
    prevBtn.onclick = prevOld; nextBtn.onclick = nextOld;
    document.getElementById('confirmBtn').onclick = confirmOld;
    playPauseBtn.onclick = playOld;
  };
}

function renderGamesMenu(direction = 'forward') {
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  app.state.currentMenuIndex = 0;
  renderMenuList({
    title: "Games",
    items: [
      { label: "Brick Paddle", action: renderBrickPaddle },
      { label: "Snake", action: renderSnake },
      { label: "Flappy Dot", action: renderFlappy },
      { label: "Neon Runner", action: renderNeonRunner },
      { label: "Dungeon Crawl", action: renderDungeonCrawler },
      { label: "Monster Tamer", action: renderMonsterTamer },
      { label: "2048 Mini", action: render2048 },
      { label: "Chess (Beta)", action: renderChess },
      { label: "Solitaire", action: renderSolitaire },
      { label: "Number Guess", action: renderNumberGuess }
    ],
    onItemClick: (idx, item) => { app.state.currentMenuIndex = idx; item.action(); },
    onBack: goBack,
    id: "gamesList"
  }, direction);
  masterHighlight({ containerSelector: '#gamesList', itemsSelector: 'li' });
}

function renderNumberGuess(direction = 'forward') {
  pushGameNav(renderNumberGuess);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  const secret = Math.floor(Math.random() * 20) + 1;
  let msg = "Guess 1-20. Confirm to submit.";
  renderScreen(
    gameScreenShell(`
      <div style="font-size:1.2em;font-weight:bold;">Number Guess</div>
      <div id="ngMsg" style="text-align:center;color:#444;">${msg}</div>
      <input id="ngInput" type="number" min="1" max="20" value="10"
        style="width:80px;text-align:center;font-size:1.1em;padding:6px;border-radius:8px;border:1px solid #ccc;">
      <button id="ngSubmit" style="padding:8px 16px;border:none;border-radius:8px;background:#0074d9;color:#fff;cursor:pointer;">Guess</button>
      <button id="ngBack" style="padding:6px 12px;border:none;border-radius:8px;background:#eee;color:#444;cursor:pointer;">Back</button>
    `, 'form'),
    direction
  );
  const input = document.getElementById('ngInput');
  const msgEl = document.getElementById('ngMsg');
  const submit = () => {
    const v = parseInt(input.value, 10);
    if (!Number.isFinite(v)) return;
    if (v === secret) { msgEl.textContent = "Correct! 🎉"; msgEl.style.color = "#2e8b57"; }
    else if (v < secret) { msgEl.textContent = "Higher..."; msgEl.style.color = "#b00020"; }
    else { msgEl.textContent = "Lower..."; msgEl.style.color = "#b00020"; }
  };
  document.getElementById('ngSubmit').onclick = submit;
  document.getElementById('ngBack').onclick = () => goBack();
  releaseGameControls = useGameControls({
    onConfirm: submit,
    onPlayPause: () => goBack()
  });
}

function renderBrickPaddle(direction = 'forward') {
  pushGameNav(renderBrickPaddle);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  renderScreen(
    gameScreenShell(`
      <div style="font-size:1.2em;font-weight:bold;">Brick Paddle</div>
      <canvas id="bpCanvas" width="340" height="220" style="background:#111;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: move | Center: serve | Play/Pause: pause | Menu: back
      </div>
      <div id="bpScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
      <div id="bpHigh" style="font-weight:bold;color:#888;">High: 0</div>
    `),
    direction
  );

  const canvas = document.getElementById('bpCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  let paddle = { x: w/2 - 30, y: h - 18, w: 60, h: 8, speed: 8 };
  let ball = { x: w/2, y: h/2, r: 5, vx: 2.4, vy: -3.2, stuck: true };
  let bricks = [];
  let rows = 4, cols = 8, bw = 34, bh = 12, gap = 6, top = 24;
  let running = true, score = 0, highScore = getHighScore('brick');
  const updateBpUI = () => {
    document.getElementById('bpScore').textContent = `Score: ${score}`;
    document.getElementById('bpHigh').textContent = `High: ${highScore}`;
  };
  updateBpUI();

  function resetBricks() {
    bricks = [];
    for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
      bricks.push({ x: 14 + c*(bw+gap), y: top + r*(bh+gap), w: bw, h: bh, hit:false });
    }
    score = 0;
  }
  resetBricks();

  function serve() {
    if (!ball.stuck) return;
    ball.stuck = false;
    ball.x = paddle.x + paddle.w/2;
    ball.y = paddle.y - ball.r - 1;
    ball.vx = (Math.random()*2 - 1) * 2.6;
    ball.vy = -3.2;
  }

  function movePaddle(dir) {
    paddle.x += dir * paddle.speed;
    if (paddle.x < 8) paddle.x = 8;
    if (paddle.x + paddle.w > w-8) paddle.x = w - 8 - paddle.w;
    if (ball.stuck) {
      ball.x = paddle.x + paddle.w/2;
      ball.y = paddle.y - ball.r - 1;
    }
  }

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0,0,w,h);

    // paddle
    ctx.fillStyle = "#4fc3f7";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    // ball
    if (!ball.stuck) {
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.x - ball.r < 0 || ball.x + ball.r > w) ball.vx *= -1;
      if (ball.y - ball.r < 0) ball.vy *= -1;
      if (ball.y + ball.r > h) { // miss
        ball.stuck = true;
        ball.x = paddle.x + paddle.w/2;
        ball.y = paddle.y - ball.r - 1;
        ball.vx = 0; ball.vy = 0;
        resetBricks();
      }
      // paddle bounce
      if (ball.y + ball.r >= paddle.y &&
          ball.x >= paddle.x && ball.x <= paddle.x + paddle.w &&
          ball.y - ball.r <= paddle.y + paddle.h) {
        ball.vy = -Math.abs(ball.vy);
        const offset = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2);
        ball.vx = offset * 3.2;
      }
      // bricks
      bricks.forEach(b => {
        if (b.hit) return;
        if (ball.x > b.x && ball.x < b.x + b.w &&
            ball.y - ball.r < b.y + b.h && ball.y + ball.r > b.y) {
          b.hit = true;
          ball.vy *= -1;
          score += 10;
          if (score > highScore) { highScore = score; setHighScore('brick', highScore); }
          updateBpUI();
        }
      });
      if (bricks.every(b=>b.hit)) {
        resetBricks();
      }
    }

    // draw bricks
    bricks.forEach(b => {
      if (b.hit) return;
      ctx.fillStyle = "#f7c948";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    // draw ball
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fill();
  }
  tick();

  releaseGameControls = useGameControls({
    onLeft: () => movePaddle(-1),
    onRight: () => movePaddle(1),
    onConfirm: () => serve(),
    onPlayPause: () => { running = !running; if (running) tick(); }
  });

  window.onGameScroll = (dir) => {
    movePaddle(dir > 0 ? 1 : -1);
  };

  // Back via MENU
  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => { 
    running = false; 
    if (releaseGameControls) releaseGameControls(); 
    releaseGameControls = null; 
    window.onGameScroll = null;  
    menuBtn.onclick = oldMenu; 
    goBack(); 
  };
}

function renderSnake(direction = 'forward') {
  pushGameNav(renderSnake);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }

  renderScreen(
    gameScreenShell(`
      <div style="font-size:1.2em;font-weight:bold;">Snake</div>
      <canvas id="snCanvas" width="240" height="240" style="background:#0b0b0b;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: turn | Center: start/restart | Play/Pause: pause | Menu: back
      </div>
      <div id="snScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
      <div id="snHigh" style="font-weight:bold;color:#888;">High: 0</div>
    `, 'compact'),
    direction
  );

  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  const cvs = document.getElementById('snCanvas');
  const ctx = cvs.getContext('2d');
  const size = 12;
  const cells = Math.floor(cvs.width / size);
  let snake, dir, food, running, score, lastStep, highScore = getHighScore('snake');
  function updateSnUI() {
    document.getElementById('snScore').textContent = `Score: ${score}`;
    document.getElementById('snHigh').textContent = `High: ${highScore}`;
  }

  function resetGame() {
    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    dir = { x: 1, y: 0 };
    placeFood();
    running = true;
    score = 0;
    lastStep = performance.now();
    updateSnUI();
    loop();
  }

  function placeFood() {
    while (true) {
      food = { x: Math.floor(Math.random() * cells), y: Math.floor(Math.random() * cells) };
      if (!snake.some(s => s.x === food.x && s.y === food.y)) break;
    }
  }

  function turnLeft() {
    const { x, y } = dir;
    dir = { x: -y, y: x }; // rotate left
  }

  function turnRight() {
    const { x, y } = dir;
    dir = { x: y, y: -x }; // rotate right
  }

  function step() {
    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    // wrap
    const x = (nx + cells) % cells;
    const y = (ny + cells) % cells;

    // collision with body
    if (snake.some(s => s.x === x && s.y === y)) {
      running = false;
      return;
    }

    snake.unshift({ x, y });

    if (x === food.x && y === food.y) {
      score += 10;
      if (score > highScore) { highScore = score; setHighScore('snake', highScore); }
      updateSnUI();
      placeFood();
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // food
    ctx.fillStyle = "#f7c948";
    ctx.fillRect(food.x * size, food.y * size, size, size);

    // snake
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#4fc3f7" : "#29a1c4";
      ctx.fillRect(s.x * size, s.y * size, size, size);
    });

    if (!running) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = "#fff";
      ctx.font = "16px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", cvs.width / 2, cvs.height / 2 - 6);
      ctx.fillText("Press Center to restart", cvs.width / 2, cvs.height / 2 + 14);
    }
  }

  function loop(ts) {
    if (!running) { draw(); return; }
    if (ts - lastStep > 95) { // speed
      step();
      lastStep = ts;
    }
    draw();
    requestAnimationFrame(loop);
  }

  resetGame();

  releaseGameControls = useGameControls({
    onLeft: () => { if (running) turnRight(); },  // flipped
    onRight: () => { if (running) turnLeft(); },  // flipped
    onConfirm: () => { resetGame(); },
    onPlayPause: () => { running = !running; if (running) lastStep = performance.now(); }
  });

  window.onGameScroll = (dir) => {
    if (!running) return;
    if (dir > 0) turnLeft(); else turnRight();
  };

  // Back via MENU
  menuBtn.onclick = () => {
    running = false;
    if (releaseGameControls) releaseGameControls();
    releaseGameControls = null;
    window.onGameScroll = null;  // cleanup wheel handler
    menuBtn.onclick = oldMenu;
    goBack();
  };
}

// --- Flappy Dot ---
function renderFlappy(direction = 'forward') {
  pushGameNav(renderFlappy);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  renderScreen(
    gameScreenShell(`
       <div style="font-size:1.2em;font-weight:bold;">Flappy Dot</div>
       <canvas id="fpCanvas" width="300" height="220" style="background:#2a93c4;border:2px solid #444;border-radius:10px;"></canvas>
       <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
         Center/Play: flap | Menu: back
       </div>
       <div id="fpScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
       <div id="fpHigh" style="font-weight:bold;color:#888;">High: 0</div>
     `),
    direction
  );

  const cvs = document.getElementById('fpCanvas');
  const ctx = cvs.getContext('2d');
  let bird = { x: 50, y: 80, vy: 0, rot: 0 };
  const birdImg = new Image();
  birdImg.src = 'src/img/flailing_bird.png';
  let pipes = [];
  let running = true, score = 0;
  let highScore = getHighScore('flappy');
  let lastFrame = 0;
  let spawnTimer = 0;

  function updateScoreUI() {
    document.getElementById('fpScore').textContent = `Score: ${score}`;
    document.getElementById('fpHigh').textContent = `High: ${highScore}`;
  }

  function reset() {
    bird = { x: 50, y: 80, vy: 0, rot: 0 };
    pipes = [];
    score = 0;
    running = true;
    lastFrame = performance.now();
    spawnTimer = 0;
    updateScoreUI();
    loop(lastFrame);
  }

  function flap() {
    bird.vy = -4.2;
    bird.rot = -0.6; // quick tilt up
  }

  function spawnPipe() {
    const gap = 70;
    const top = 20 + Math.random() * 80;
    pipes.push({ x: cvs.width, top, gap });
  }

  function loop(ts) {
    if (!running) return;
    requestAnimationFrame(loop);

    const deltaMs = ts - lastFrame;
    if (deltaMs < 1000 / 60) return;           // cap ~60 FPS
    const dt = Math.min(deltaMs / 16.67, 2);   // scale speeds, clamp big jumps
    lastFrame = ts;
    spawnTimer += deltaMs;

    if (spawnTimer > 1400) { spawnPipe(); spawnTimer = 0; }

    bird.vy += 0.18 * dt;
    bird.y  += bird.vy * dt;
    const targetRot = Math.max(-0.65, Math.min(0.85, bird.vy * 0.12)); // map vy to angle
    bird.rot += (targetRot - bird.rot) * 0.12; // ease toward target

    pipes.forEach(p => p.x -= 2.1 * dt);
    pipes = pipes.filter(p => p.x > -40);

    pipes.forEach(p => {
      if (p.x + 30 < bird.x && !p.scored) {
        score += 1;
        p.scored = true;
        if (score > highScore) {
            highScore = score;
            setHighScore('flappy', highScore);
        }
        updateScoreUI();
      }
      const inX = bird.x > p.x - 8 && bird.x < p.x + 30 + 8;
      const inY = bird.y < p.top || bird.y > p.top + p.gap;
      if (inX && inY) running = false;
    });
    if (bird.y < 0 || bird.y > cvs.height) running = false;

    const bgGrad = ctx.createLinearGradient(0, 0, cvs.width, cvs.height);
    bgGrad.addColorStop(0, "#2a93c4");
    bgGrad.addColorStop(0.85, "#1b6e96");
    ctx.fillStyle = bgGrad; ctx.fillRect(0,0,cvs.width,cvs.height);

    // draw pipes with depth
    pipes.forEach(p => {
      const x = p.x, wPipe = 32, lipH = 10, r = 4;
      const topH = p.top, gap = p.gap, botY = p.top + gap;

      const drawPipe = (y, h, isTop) => {
        // body
        const grad = ctx.createLinearGradient(x, y, x + wPipe, y);
        grad.addColorStop(0, "#3a6f3a");
        grad.addColorStop(0.25, "#4c8c4c");
        grad.addColorStop(0.65, "#357235");
        grad.addColorStop(1, "#2a5a2a");
        ctx.fillStyle = grad;
        ctx.strokeStyle = "#163516";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + wPipe - r, y);
        ctx.quadraticCurveTo(x + wPipe, y, x + wPipe, y + r);
        ctx.lineTo(x + wPipe, y + h - r);
        ctx.quadraticCurveTo(x + wPipe, y + h, x + wPipe - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // lip
        const lipY = isTop ? y + h - lipH : y;
        ctx.fillStyle = "#4fa84f";
        ctx.strokeStyle = "#1d3f1d";
        ctx.beginPath();
        ctx.moveTo(x - 2, lipY);
        ctx.lineTo(x + wPipe + 2, lipY);
        ctx.lineTo(x + wPipe + 2, lipY + lipH);
        ctx.lineTo(x - 2, lipY + lipH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // highlight stripe
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(x + 4, y + 6, 5, h - 12);
      };

      // top pipe
      drawPipe(0, topH, true);
      // bottom pipe
      drawPipe(botY, cvs.height - botY, false);

      // shadow
      //ctx.fillStyle = "rgba(0,0,0,0.12)";
      //ctx.fillRect(x + wPipe, 0, 3, cvs.height);
    });

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    if (birdImg.complete && birdImg.naturalWidth) {
      const BW = 26, BH = 20;
      ctx.drawImage(birdImg, -BW/2, -BH/2, BW, BH);
    } else {
      // fallback circle while image loads
      ctx.fillStyle = "#4fc3f7";
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    if (!running) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0,0,cvs.width,cvs.height);
      ctx.fillStyle = "#fff";
      ctx.font = "14px Segoe UI"; ctx.textAlign = "center";
      ctx.fillText("Game Over", cvs.width/2, cvs.height/2 - 6);
      ctx.fillText("Center to restart", cvs.width/2, cvs.height/2 + 12);
    }
  }
  updateScoreUI();
  reset();

  releaseGameControls = useGameControls({
    onConfirm: () => { if (running) flap(); else reset(); },
    onPlayPause: () => { if (running) flap(); else reset(); },
  });

  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => { running = false; if (releaseGameControls) releaseGameControls(); releaseGameControls=null; menuBtn.onclick = oldMenu; goBack(); };
}

function renderNeonRunner(direction = 'forward') {
  pushGameNav(renderNeonRunner);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }

  renderScreen(
    gameScreenShell(`
      <div style="font-size:1.2em;font-weight:bold;">Neon Runner</div>
      <canvas id="nrCanvas" width="320" height="220" style="background:#08111f;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: switch lanes | Center: shield | Play/Pause: pause | Menu: back
      </div>
      <div style="display:flex;gap:16px;align-items:center;">
        <div id="nrScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
        <div id="nrHigh" style="font-weight:bold;color:#888;">High: 0</div>
        <div id="nrShield" style="font-weight:bold;color:#2ed1a2;">Shield: 100%</div>
      </div>
    `),
    direction
  );

  const gameKey = 'Neon Runner';
  const canvas = document.getElementById('nrCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const laneCount = 5;
  const laneWidth = w / laneCount;
  const playerY = h - 34;
  const baseSpeed = 2.2;
  const maxShieldCharge = 100;

  let lane = 2;
  let highScore = getHighScore(gameKey);
  let score = 0;
  let running = true;
  let gameOver = false;
  let lastFrame = 0;
  let spawnTimer = 0;
  let shieldCharge = maxShieldCharge;
  let shieldActiveFor = 0;
  let combo = 0;
  let comboFlash = 0;
  let obstacles = [];
  let pickups = [];
  let stars = [];

  function updateRunnerUi() {
    document.getElementById('nrScore').textContent = `Score: ${Math.floor(score)}`;
    document.getElementById('nrHigh').textContent = `High: ${highScore}`;
    document.getElementById('nrShield').textContent = `Shield: ${Math.round(shieldCharge)}%`;
  }

  function resetRunner() {
    lane = 2;
    score = 0;
    running = true;
    gameOver = false;
    lastFrame = performance.now();
    spawnTimer = 0;
    shieldCharge = maxShieldCharge;
    shieldActiveFor = 0;
    combo = 0;
    comboFlash = 0;
    obstacles = [];
    pickups = [];
    stars = Array.from({ length: 48 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: 0.4 + Math.random() * 1.4,
      size: 1 + Math.random() * 1.5
    }));
    updateRunnerUi();
    loop(lastFrame);
  }

  function laneCenter(index) {
    return (index * laneWidth) + laneWidth / 2;
  }

  function moveLane(directionStep) {
    if (!running || gameOver) return;
    lane = Math.max(0, Math.min(laneCount - 1, lane + directionStep));
  }

  function activateShield() {
    if (gameOver) {
      resetRunner();
      return;
    }
    if (!running) return;
    if (shieldCharge < 35 || shieldActiveFor > 0) return;
    shieldCharge -= 35;
    shieldActiveFor = 700;
  }

  function spawnObstacle() {
    const obstacleLane = Math.floor(Math.random() * laneCount);
    const variant = Math.random() < 0.25 ? 'wide' : 'block';
    obstacles.push({
      lane: obstacleLane,
      y: -26,
      speed: baseSpeed + Math.random() * 1.4 + Math.min(score / 220, 2.4),
      width: variant === 'wide' ? laneWidth * 0.72 : laneWidth * 0.48,
      height: variant === 'wide' ? 22 : 18,
      variant
    });
  }

  function spawnPickup() {
    pickups.push({
      lane: Math.floor(Math.random() * laneCount),
      y: -18,
      speed: baseSpeed + 1.6,
      pulse: Math.random() * Math.PI * 2
    });
  }

  function endRun() {
    running = false;
    gameOver = true;
    combo = 0;
  }

  function drawBackground(dt) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#08111f');
    bg.addColorStop(1, '#12061f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    stars.forEach(star => {
      star.y += star.speed * dt * 0.08;
      if (star.y > h) {
        star.y = -2;
        star.x = Math.random() * w;
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    for (let i = 1; i < laneCount; i++) {
      const x = i * laneWidth;
      ctx.strokeStyle = 'rgba(79,195,247,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const x = laneCenter(lane);
    const shieldOn = shieldActiveFor > 0;

    if (shieldOn) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(46,209,162,0.18)';
      ctx.arc(x, playerY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(46,209,162,0.65)';
      ctx.stroke();
    }

    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(x, playerY - 14);
    ctx.lineTo(x - 11, playerY + 10);
    ctx.lineTo(x + 11, playerY + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d7f3ff';
    ctx.fillRect(x - 2, playerY - 2, 4, 10);
    ctx.fillStyle = '#ff7ee2';
    ctx.fillRect(x - 5, playerY + 10, 10, 4);
  }

  function drawObstacle(obstacle) {
    const centerX = laneCenter(obstacle.lane);
    const width = obstacle.width;
    const left = centerX - width / 2;
    const top = obstacle.y;

    const grad = ctx.createLinearGradient(left, top, left + width, top + obstacle.height);
    grad.addColorStop(0, '#ff8a5b');
    grad.addColorStop(1, '#d90429');
    ctx.fillStyle = grad;
    ctx.fillRect(left, top, width, obstacle.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(left + 1, top + 1, width - 2, obstacle.height - 2);
  }

  function drawPickup(pickup) {
    const x = laneCenter(pickup.lane);
    const glow = 7 + Math.sin(pickup.pulse) * 2;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,215,0,0.2)';
    ctx.arc(x, pickup.y, glow + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#ffd54f';
    ctx.arc(x, pickup.y, glow, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHud() {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(12, 10, 96, 8);
    ctx.fillStyle = '#2ed1a2';
    ctx.fillRect(12, 10, 96 * (shieldCharge / maxShieldCharge), 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.strokeRect(12, 10, 96, 8);

    if (comboFlash > 0 && combo > 1) {
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 14px Segoe UI';
      ctx.textAlign = 'right';
      ctx.fillText(`Combo x${combo}`, w - 16, 20);
    }
  }

  function drawOverlay() {
    if (running && !gameOver) return;
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(gameOver ? 'Run Over' : 'Paused', w / 2, h / 2 - 16);
    ctx.font = '13px Segoe UI';
    ctx.fillText(gameOver ? 'Center to restart' : 'Play/Pause to resume', w / 2, h / 2 + 10);
  }

  function loop(ts) {
    if (!running && !gameOver) {
      drawBackground(0);
      obstacles.forEach(drawObstacle);
      pickups.forEach(drawPickup);
      drawPlayer();
      drawHud();
      drawOverlay();
      return;
    }

    if (gameOver) {
      drawBackground(0);
      obstacles.forEach(drawObstacle);
      pickups.forEach(drawPickup);
      drawPlayer();
      drawHud();
      drawOverlay();
      return;
    }

    requestAnimationFrame(loop);
    const deltaMs = Math.min(ts - lastFrame || 16.67, 40);
    const dt = deltaMs / 16.67;
    lastFrame = ts;
    spawnTimer += deltaMs;
    score += 0.32 * dt;
    shieldCharge = Math.min(maxShieldCharge, shieldCharge + 0.08 * dt);
    shieldActiveFor = Math.max(0, shieldActiveFor - deltaMs);
    comboFlash = Math.max(0, comboFlash - deltaMs);

    const spawnInterval = Math.max(340, 760 - Math.min(score * 2.2, 340));
    if (spawnTimer >= spawnInterval) {
      spawnObstacle();
      if (Math.random() < 0.28) spawnPickup();
      spawnTimer = 0;
    }

    drawBackground(dt);

    const playerX = laneCenter(lane);
    const nextObstacles = [];
    obstacles.forEach(obstacle => {
      obstacle.y += obstacle.speed * dt;

      const obstacleCenterX = laneCenter(obstacle.lane);
      const sameLane = Math.abs(obstacleCenterX - playerX) < laneWidth * 0.3;
      const collided = sameLane && obstacle.y + obstacle.height >= playerY - 10 && obstacle.y <= playerY + 12;

      if (collided) {
        if (shieldActiveFor > 0) {
          combo += 1;
          comboFlash = 750;
          score += 6 + combo * 2;
          shieldCharge = Math.min(maxShieldCharge, shieldCharge + 10);
          return;
        }

        if (score > highScore) {
          highScore = Math.floor(score);
          setHighScore(gameKey, highScore);
        }
        updateRunnerUi();
        endRun();
        return;
      }

      if (obstacle.y < h + 28) {
        nextObstacles.push(obstacle);
      } else {
        combo = 0;
        score += 2;
      }

      drawObstacle(obstacle);
    });
    obstacles = nextObstacles;

    const nextPickups = [];
    pickups.forEach(pickup => {
      pickup.y += pickup.speed * dt;
      pickup.pulse += 0.14 * dt;
      const pickupX = laneCenter(pickup.lane);
      const caught = Math.abs(pickupX - playerX) < laneWidth * 0.24 && Math.abs(pickup.y - playerY) < 16;

      if (caught) {
        shieldCharge = Math.min(maxShieldCharge, shieldCharge + 24);
        score += 5;
        comboFlash = 500;
        return;
      }

      if (pickup.y < h + 18) {
        nextPickups.push(pickup);
        drawPickup(pickup);
      }
    });
    pickups = nextPickups;

    drawPlayer();
    drawHud();

    if (Math.floor(score) > highScore) {
      highScore = Math.floor(score);
      setHighScore(gameKey, highScore);
    }

    updateRunnerUi();
  }

  resetRunner();

  releaseGameControls = useGameControls({
    onLeft: () => moveLane(-1),
    onRight: () => moveLane(1),
    onConfirm: () => activateShield(),
    onPlayPause: () => {
      if (gameOver) {
        resetRunner();
        return;
      }

      running = !running;
      if (running) {
        lastFrame = performance.now();
        loop(lastFrame);
      } else {
        drawBackground(0);
        obstacles.forEach(drawObstacle);
        pickups.forEach(drawPickup);
        drawPlayer();
        drawHud();
        drawOverlay();
      }
    }
  });

  window.onGameScroll = (dir) => {
    moveLane(dir > 0 ? 1 : -1);
  };

  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => {
    running = false;
    gameOver = false;
    if (releaseGameControls) releaseGameControls();
    releaseGameControls = null;
    window.onGameScroll = null;
    menuBtn.onclick = oldMenu;
    goBack();
  };
}

function renderDungeonCrawler(direction = 'forward') {
  pushGameNav(renderDungeonCrawler);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }

  renderScreen(
    gameScreenShell(`
      <div style="font-size:1.2em;font-weight:bold;">Dungeon Crawl</div>
      <canvas id="dcCanvas" width="312" height="208" style="background:#0f0f14;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.88em;color:#555;text-align:center;max-width:320px;line-height:1.35;">
        Prev/Next: move left/right | Wheel: move up/down | Center: attack or stairs | Play/Pause: use potion | Menu: back
      </div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;">
        <div id="dcHp" style="font-weight:bold;color:#d90429;">HP: 12/12</div>
        <div id="dcFloor" style="font-weight:bold;color:#0074d9;">Floor: 1</div>
        <div id="dcGold" style="font-weight:bold;color:#d4a017;">Gold: 0</div>
        <div id="dcPotion" style="font-weight:bold;color:#7b5cff;">Potions: 1</div>
        <div id="dcHigh" style="font-weight:bold;color:#888;">High: 0</div>
      </div>
      <div id="dcMsg" style="min-height:20px;font-size:0.9em;color:#444;text-align:center;max-width:320px;">Reach the stairs and survive deeper floors.</div>
    `),
    direction
  );

  const gameKey = 'dungeon';
  const canvas = document.getElementById('dcCanvas');
  const ctx = canvas.getContext('2d');
  const cols = 12;
  const rows = 8;
  const tile = 26;
  const offsetX = 0;
  const offsetY = 0;

  let highScore = getHighScore(gameKey);
  let running = true;
  let gameOver = false;
  let message = 'Reach the stairs and survive deeper floors.';
  let walls = new Set();
  let loot = [];
  let enemies = [];
  let stairs = { x: 10, y: 6 };
  let player = {
    x: 1,
    y: 1,
    hp: 12,
    maxHp: 12,
    potions: 1,
    gold: 0,
    kills: 0,
    floor: 1,
    turn: 0
  };

  function key(x, y) {
    return `${x},${y}`;
  }

  function scoreRun() {
    return (player.floor - 1) * 120 + player.gold * 12 + player.kills * 25 + player.hp * 3;
  }

  function setMessage(text) {
    message = text;
    const el = document.getElementById('dcMsg');
    if (el) el.textContent = text;
  }

  function updateCrawlerUi() {
    const hpEl = document.getElementById('dcHp');
    const floorEl = document.getElementById('dcFloor');
    const goldEl = document.getElementById('dcGold');
    const potionEl = document.getElementById('dcPotion');
    const highEl = document.getElementById('dcHigh');
    if (hpEl) hpEl.textContent = `HP: ${player.hp}/${player.maxHp}`;
    if (floorEl) floorEl.textContent = `Floor: ${player.floor}`;
    if (goldEl) goldEl.textContent = `Gold: ${player.gold}`;
    if (potionEl) potionEl.textContent = `Potions: ${player.potions}`;
    if (highEl) highEl.textContent = `High: ${highScore}`;
  }

  function inBounds(x, y) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
  }

  function isBlocked(x, y) {
    return walls.has(key(x, y));
  }

  function getEnemyAt(x, y) {
    return enemies.find(enemy => enemy.x === x && enemy.y === y) || null;
  }

  function getLootAt(x, y) {
    return loot.find(item => item.x === x && item.y === y) || null;
  }

  function randomFreeCell(used) {
    const open = [];
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const id = key(x, y);
        if (!walls.has(id) && !used.has(id)) open.push({ x, y });
      }
    }
    if (!open.length) return null;
    return open[Math.floor(Math.random() * open.length)];
  }

  function bfsReachable(start, target) {
    const queue = [start];
    const seen = new Set([key(start.x, start.y)]);
    while (queue.length) {
      const current = queue.shift();
      if (current.x === target.x && current.y === target.y) return true;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const id = key(nx, ny);
        if (!inBounds(nx, ny) || walls.has(id) || seen.has(id)) return;
        seen.add(id);
        queue.push({ x: nx, y: ny });
      });
    }
    return false;
  }

  function enemyTemplate(depth) {
    const roll = Math.random();
    if (roll < 0.42) {
      return { name: 'Slime', hp: 3 + Math.floor(depth / 2), maxHp: 3 + Math.floor(depth / 2), atkMin: 1, atkMax: 2, color: '#49c972' };
    }
    if (roll < 0.78) {
      return { name: 'Stalker', hp: 4 + depth, maxHp: 4 + depth, atkMin: 1, atkMax: 3, color: '#8b6cff' };
    }
    return { name: 'Brute', hp: 7 + depth, maxHp: 7 + depth, atkMin: 2, atkMax: 4, color: '#ff8a5b' };
  }

  function generateFloor(depth, keepVitals = true) {
    let generated = false;

    while (!generated) {
      walls = new Set();
      loot = [];
      enemies = [];

      for (let x = 0; x < cols; x++) {
        walls.add(key(x, 0));
        walls.add(key(x, rows - 1));
      }
      for (let y = 0; y < rows; y++) {
        walls.add(key(0, y));
        walls.add(key(cols - 1, y));
      }

      const interiorWallCount = Math.min(10, 4 + depth);
      for (let i = 0; i < interiorWallCount; i++) {
        const wx = 1 + Math.floor(Math.random() * (cols - 2));
        const wy = 1 + Math.floor(Math.random() * (rows - 2));
        if ((wx === 1 && wy === 1) || (wx === cols - 2 && wy === rows - 2)) continue;
        walls.add(key(wx, wy));
      }

      const start = { x: 1, y: 1 };
      const used = new Set([key(start.x, start.y)]);
      player.x = start.x;
      player.y = start.y;
      if (!keepVitals) {
        player.hp = 12;
        player.maxHp = 12;
        player.potions = 1;
        player.gold = 0;
        player.kills = 0;
      }
      player.floor = depth;

      const stairCell = randomFreeCell(used);
      if (!stairCell) continue;
      stairs = stairCell;
      used.add(key(stairs.x, stairs.y));

      if (!bfsReachable(start, stairs)) continue;

      const goldCount = Math.min(7, 3 + depth);
      for (let i = 0; i < goldCount; i++) {
        const cell = randomFreeCell(used);
        if (!cell) break;
        used.add(key(cell.x, cell.y));
        loot.push({ x: cell.x, y: cell.y, type: 'gold', value: 6 + Math.floor(Math.random() * 10) + depth * 2 });
      }

      const potionCount = depth % 2 === 0 ? 2 : 1;
      for (let i = 0; i < potionCount; i++) {
        const cell = randomFreeCell(used);
        if (!cell) break;
        used.add(key(cell.x, cell.y));
        loot.push({ x: cell.x, y: cell.y, type: 'potion', value: 1 });
      }

      const enemyCount = Math.min(8, 3 + depth);
      for (let i = 0; i < enemyCount; i++) {
        const cell = randomFreeCell(used);
        if (!cell) break;
        used.add(key(cell.x, cell.y));
        enemies.push({ x: cell.x, y: cell.y, ...enemyTemplate(depth) });
      }

      generated = true;
    }

    setMessage(`Floor ${depth}. Find the stairs.`);
    updateHighScore();
    updateCrawlerUi();
    drawDungeon();
  }

  function collectLoot() {
    const item = getLootAt(player.x, player.y);
    if (!item) return;

    loot = loot.filter(entry => !(entry.x === item.x && entry.y === item.y));
    if (item.type === 'gold') {
      player.gold += item.value;
      setMessage(`You found ${item.value} gold.`);
    } else if (item.type === 'potion') {
      player.potions += item.value;
      setMessage('You found a potion.');
    }
  }

  function updateHighScore() {
    const runScore = Math.floor(scoreRun());
    if (runScore > highScore) {
      highScore = runScore;
      setHighScore(gameKey, highScore);
    }
  }

  function finishRun(reason) {
    running = false;
    gameOver = true;
    updateHighScore();
    setMessage(`${reason} Final score: ${Math.floor(scoreRun())}. Center to restart.`);
    updateCrawlerUi();
    drawDungeon();
  }

  function attackEnemy(enemy) {
    const damage = 2 + Math.floor(Math.random() * 3) + Math.min(2, Math.floor(player.floor / 3));
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemies = enemies.filter(entry => entry !== enemy);
      player.kills += 1;
      player.gold += 4 + player.floor;
      setMessage(`You defeated the ${enemy.name}.`);
    } else {
      setMessage(`You hit the ${enemy.name} for ${damage}.`);
    }
  }

  function enemyTurn() {
    if (gameOver) return;

    enemies.forEach(enemy => {
      if (gameOver) return;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.abs(dx) + Math.abs(dy);

      if (distance === 1) {
        const damage = enemy.atkMin + Math.floor(Math.random() * (enemy.atkMax - enemy.atkMin + 1));
        player.hp -= damage;
        setMessage(`${enemy.name} hits you for ${damage}.`);
        if (player.hp <= 0) {
          player.hp = 0;
          finishRun('You fell in the dungeon.');
        }
        return;
      }

      if (distance > 6 && Math.random() < 0.55) return;

      const options = [];
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) options.push({ x: enemy.x + Math.sign(dx), y: enemy.y });
      if (dy !== 0) options.push({ x: enemy.x, y: enemy.y + Math.sign(dy) });
      if (Math.abs(dx) < Math.abs(dy) && dx !== 0) options.push({ x: enemy.x + Math.sign(dx), y: enemy.y });
      if (!options.length) return;

      for (const option of options) {
        if (!inBounds(option.x, option.y)) continue;
        if (isBlocked(option.x, option.y)) continue;
        if (option.x === stairs.x && option.y === stairs.y) continue;
        if (option.x === player.x && option.y === player.y) continue;
        if (enemies.some(other => other !== enemy && other.x === option.x && other.y === option.y)) continue;
        enemy.x = option.x;
        enemy.y = option.y;
        break;
      }
    });
  }

  function endPlayerTurn() {
    player.turn += 1;
    enemyTurn();
    updateHighScore();
    updateCrawlerUi();
    drawDungeon();
  }

  function tryMove(dx, dy) {
    if (!running || gameOver) return;

    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!inBounds(nx, ny) || isBlocked(nx, ny)) {
      setMessage('A wall blocks your way.');
      drawDungeon();
      return;
    }

    const enemy = getEnemyAt(nx, ny);
    if (enemy) {
      attackEnemy(enemy);
      endPlayerTurn();
      return;
    }

    player.x = nx;
    player.y = ny;
    collectLoot();
    if (player.x === stairs.x && player.y === stairs.y) {
      setMessage('You found the stairs. Press Center to descend.');
    }
    endPlayerTurn();
  }

  function interact() {
    if (gameOver) {
      player = { x: 1, y: 1, hp: 12, maxHp: 12, potions: 1, gold: 0, kills: 0, floor: 1, turn: 0 };
      running = true;
      gameOver = false;
      highScore = getHighScore(gameKey);
      generateFloor(1, false);
      return;
    }
    if (!running) return;

    if (player.x === stairs.x && player.y === stairs.y) {
      player.hp = Math.min(player.maxHp, player.hp + 2);
      generateFloor(player.floor + 1, true);
      setMessage(`You descend to floor ${player.floor}.`);
      return;
    }

    const adjacentEnemy = enemies.find(enemy => Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) === 1);
    if (adjacentEnemy) {
      attackEnemy(adjacentEnemy);
      endPlayerTurn();
      return;
    }

    if (Math.random() < 0.28) {
      player.gold += 3 + Math.floor(Math.random() * 5);
      setMessage('You search the room and find a few coins.');
    } else {
      setMessage('You search the room but find nothing.');
    }
    endPlayerTurn();
  }

  function usePotion() {
    if (gameOver) {
      interact();
      return;
    }
    if (!running) return;
    if (player.potions <= 0) {
      setMessage('No potions left.');
      drawDungeon();
      return;
    }
    if (player.hp >= player.maxHp) {
      setMessage('You are already at full health.');
      drawDungeon();
      return;
    }

    player.potions -= 1;
    const heal = 4 + Math.floor(Math.random() * 4);
    player.hp = Math.min(player.maxHp, player.hp + heal);
    setMessage(`You drink a potion and recover ${heal} HP.`);
    endPlayerTurn();
  }

  function drawTile(x, y, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.fillRect(offsetX + x * tile, offsetY + y * tile, tile, tile);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.strokeRect(offsetX + x * tile + 0.5, offsetY + y * tile + 0.5, tile - 1, tile - 1);
    }
  }

  function drawDungeon() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b0b10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (isBlocked(x, y)) {
          drawTile(x, y, '#242734', '#303646');
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(offsetX + x * tile + 4, offsetY + y * tile + 4, tile - 8, tile - 8);
        } else {
          drawTile(x, y, '#121622', '#1a2030');
        }
      }
    }

    drawTile(stairs.x, stairs.y, '#123448', '#2ed1ff');
    ctx.fillStyle = '#7be2ff';
    ctx.font = 'bold 16px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('>', offsetX + stairs.x * tile + tile / 2, offsetY + stairs.y * tile + tile / 2 + 1);

    loot.forEach(item => {
      if (item.type === 'gold') {
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.moveTo(offsetX + item.x * tile + tile / 2, offsetY + item.y * tile + 6);
        ctx.lineTo(offsetX + item.x * tile + tile - 8, offsetY + item.y * tile + tile / 2);
        ctx.lineTo(offsetX + item.x * tile + tile / 2, offsetY + item.y * tile - 6 + tile);
        ctx.lineTo(offsetX + item.x * tile + 8, offsetY + item.y * tile + tile / 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#7b5cff';
        ctx.fillRect(offsetX + item.x * tile + 9, offsetY + item.y * tile + 8, 8, 10);
        ctx.fillStyle = '#d6c8ff';
        ctx.fillRect(offsetX + item.x * tile + 10, offsetY + item.y * tile + 5, 6, 4);
      }
    });

    enemies.forEach(enemy => {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(offsetX + enemy.x * tile + tile / 2, offsetY + enemy.y * tile + tile / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(offsetX + enemy.x * tile + 9, offsetY + enemy.y * tile + 9, 2, 2);
      ctx.fillRect(offsetX + enemy.x * tile + 15, offsetY + enemy.y * tile + 9, 2, 2);
      ctx.fillStyle = '#111';
      ctx.fillRect(offsetX + enemy.x * tile + 10, offsetY + enemy.y * tile + 15, 6, 2);
    });

    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(offsetX + player.x * tile + tile / 2, offsetY + player.y * tile + 5);
    ctx.lineTo(offsetX + player.x * tile + 6, offsetY + player.y * tile + tile - 5);
    ctx.lineTo(offsetX + player.x * tile + tile - 6, offsetY + player.y * tile + tile - 5);
    ctx.closePath();
    ctx.fill();

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('Dungeon Fallen', canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = '13px Segoe UI';
      ctx.fillText('Center to begin a new run', canvas.width / 2, canvas.height / 2 + 14);
    }
  }

  generateFloor(1, false);

  releaseGameControls = useGameControls({
    onLeft: () => tryMove(-1, 0),
    onRight: () => tryMove(1, 0),
    onConfirm: () => interact(),
    onPlayPause: () => usePotion()
  });

  window.onGameScroll = (dir) => {
    tryMove(0, dir > 0 ? 1 : -1);
  };

  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => {
    running = false;
    gameOver = false;
    if (releaseGameControls) releaseGameControls();
    releaseGameControls = null;
    window.onGameScroll = null;
    menuBtn.onclick = oldMenu;
    goBack();
  };
}

function renderMonsterTamer(direction = 'forward') {
  pushGameNav(renderMonsterTamer);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }

  renderScreen(
    gameScreenShell(`
      <div style="font-size:1.2em;font-weight:bold;">Monster Tamer</div>
      <div id="mtMsg" style="min-height:18px;font-size:0.84em;color:#444;text-align:center;max-width:312px;line-height:1.25;">Leave town and start hunting</div>
      <canvas id="mtCanvas" width="312" height="208" style="background:#d8f0be;border:2px solid #3e5032;border-radius:10px;"></canvas>
      <div style="font-size:0.88em;color:#555;text-align:center;max-width:320px;line-height:1.35;">
        Prev/Next: walk left/right | Wheel: walk up/down | Center: interact/select | Play/Pause: party menu/back | Menu: back
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center;">
        <div id="mtLead" style="font-weight:bold;color:#0074d9;">Lead: Ember Pup</div>
        <div id="mtPartyHp" style="font-weight:bold;color:#d90429;">HP: 12/12</div>
        <div id="mtCaught" style="font-weight:bold;color:#2e8b57;">Caught: 0</div>
        <div id="mtBadges" style="font-weight:bold;color:#ad7d16;">Badges: 0/6</div>
        <div id="mtCapsules" style="font-weight:bold;color:#7b5cff;">Capsules: 5</div>
        <div id="mtTonics" style="font-weight:bold;color:#2f9689;">Tonics: 0</div>
        <div id="mtRods" style="font-weight:bold;color:#2f7ea5;">Rods: 0</div>
        <div id="mtCoins" style="font-weight:bold;color:#9b6b22;">Coins: 20</div>
        <div id="mtCharm" style="font-weight:bold;color:#d69a12;">Charms: 0</div>
        <div id="mtScore" style="font-weight:bold;color:#d4a017;">Score: 0</div>
        <div id="mtHigh" style="font-weight:bold;color:#888;">High: 0</div>
      </div>
    `),
    direction
  );

  const gameKey = 'monstertamer';
  const canvas = document.getElementById('mtCanvas');
  const ctx = canvas.getContext('2d');
  const tile = 16;
  const viewCols = 19;
  const viewRows = 13;
  const mapOffsetX = 4;
  const chunkSize = 16;
  const chunkRadius = 2;
  const worldSeed = Math.floor(Math.random() * 1000000);
  ctx.imageSmoothingEnabled = false;

  const speciesList = [
    {
      name: 'Ember Pup', color: '#ff8a5b', accent: '#ffd3a8', hp: 12, atkMin: 2, atkMax: 4, catchBase: 0.36,
      sprite: ['........', '..11....', '.1221...', '.12321..', '.13331..', '..3443..', '.4....4.', '........']
    },
    {
      name: 'Mossling', color: '#49c972', accent: '#d8ffe4', hp: 11, atkMin: 1, atkMax: 3, catchBase: 0.48,
      sprite: ['........', '..111...', '.12221..', '.12321..', '..333...', '.4..4...', '.4..4...', '........']
    },
    {
      name: 'Volt Finch', color: '#f7d447', accent: '#fff6c0', hp: 10, atkMin: 2, atkMax: 5, catchBase: 0.32,
      sprite: ['........', '...1....', '..121...', '.12321..', '..3331..', '.44.44..', '........', '........']
    },
    {
      name: 'Gloom Bat', color: '#8b6cff', accent: '#efe7ff', hp: 13, atkMin: 2, atkMax: 4, catchBase: 0.34,
      sprite: ['........', '.11..11.', '12311231', '.123321.', '..3333..', '.4.44.4.', '........', '........']
    },
    {
      name: 'Tide Cub', color: '#4fc3f7', accent: '#d8f4ff', hp: 14, atkMin: 2, atkMax: 3, catchBase: 0.4,
      sprite: ['........', '..111...', '.12221..', '.12321..', '.13331..', '..4.4...', '.4...4..', '........']
    },
    {
      name: 'Petal Lynx', color: '#ff7ab6', accent: '#ffe1f0', hp: 15, atkMin: 3, atkMax: 5, catchBase: 0.24,
      sprite: ['........', '..11.1..', '.122221.', '.123321.', '.133331.', '..3443..', '.4....4.', '........']
    },
    {
      name: 'Brookfin', color: '#3fa0d6', accent: '#dff7ff', hp: 16, atkMin: 3, atkMax: 4, catchBase: 0.23,
      sprite: ['........', '..111...', '.122221.', '1233321.', '.133331.', '..44.4..', '.4...4..', '........']
    },
    {
      name: 'Ripple Fry', color: '#60c4ff', accent: '#e2f7ff', hp: 10, atkMin: 2, atkMax: 3, catchBase: 0.44,
      sprite: ['........', '...11...', '..1221..', '.123221.', '..1331..', '.44..44.', '........', '........']
    },
    {
      name: 'Pebble Koi', color: '#f0a35b', accent: '#fff0d6', hp: 13, atkMin: 2, atkMax: 4, catchBase: 0.34,
      sprite: ['........', '..111...', '.122221.', '1233321.', '.123321.', '..44.44.', '........', '........']
    },
    {
      name: 'Tangle Crab', color: '#cc6c58', accent: '#ffe1d9', hp: 15, atkMin: 3, atkMax: 4, catchBase: 0.28,
      sprite: ['........', '.11..11.', '.122222.', '..2332..', '.233332.', '.4.44.4.', '.4....4.', '........']
    },
    {
      name: 'Lantern Eel', color: '#596fd9', accent: '#eef2ff', hp: 16, atkMin: 3, atkMax: 6, catchBase: 0.2,
      sprite: ['...11...', '..1221..', '.123321.', '..2331..', '.2331...', '.4..44..', '...4....', '........']
    },
    {
      name: 'Storm Ray', color: '#7cc6ff', accent: '#f4fbff', hp: 18, atkMin: 4, atkMax: 6, catchBase: 0.16,
      sprite: ['........', '.11..11.', '12211221', '.123332.', '..2332..', '.4.44.4.', '..4..4..', '........']
    },
    {
      name: 'Mire Owl', color: '#7a67b8', accent: '#efe7ff', hp: 15, atkMin: 2, atkMax: 6, catchBase: 0.22,
      sprite: ['........', '.11..11.', '.122222.', '.123332.', '..3333..', '.4.44.4.', '.4....4.', '........']
    },
    {
      name: 'Static Ram', color: '#f0c64a', accent: '#fff4be', hp: 17, atkMin: 4, atkMax: 6, catchBase: 0.2,
      sprite: ['........', '.11..11.', '12211221', '.123321.', '.133331.', '..4..4..', '.4....4.', '........']
    },
    {
      name: 'Crownwyrm', color: '#d94f4f', accent: '#fff0b0', hp: 18, atkMin: 4, atkMax: 7, catchBase: 0.16,
      sprite: ['..1.1...', '.12221..', '.123321.', '12333321', '.133331.', '..4444..', '.4....4.', '........']
    },
    {
      name: 'Cinder Moth', color: '#ffb25e', accent: '#fff0c2', hp: 11, atkMin: 2, atkMax: 4, catchBase: 0.42,
      sprite: ['........', '.1.11.1.', '.122221.', '..2332..', '.233332.', '..4..4..', '.4....4.', '........']
    },
    {
      name: 'Bramble Hog', color: '#7db85c', accent: '#eef8d2', hp: 14, atkMin: 2, atkMax: 4, catchBase: 0.38,
      sprite: ['........', '..1111..', '.122221.', '.123321.', '.133331.', '..3443..', '.4.44.4.', '........']
    },
    {
      name: 'Marsh Mite', color: '#56b88b', accent: '#dfffee', hp: 12, atkMin: 2, atkMax: 3, catchBase: 0.46,
      sprite: ['........', '..111...', '.12221..', '1233321.', '.123321.', '..4..4..', '.4....4.', '........']
    },
    {
      name: 'Quartz Beetle', color: '#8ca2ff', accent: '#eef1ff', hp: 13, atkMin: 3, atkMax: 4, catchBase: 0.34,
      sprite: ['........', '..111...', '.12221..', '1233321.', '.123321.', '.4.44.4.', '.4....4.', '........']
    },
    {
      name: 'Gale Antler', color: '#c7e46d', accent: '#f6ffd6', hp: 15, atkMin: 3, atkMax: 5, catchBase: 0.28,
      sprite: ['.1....1.', '.122221.', '12333231', '.133331.', '..3443..', '..4..4..', '.4....4.', '........']
    },
    {
      name: 'Ember Hound', color: '#ff6d43', accent: '#ffe0b8', hp: 18, atkMin: 4, atkMax: 6, catchBase: 0.18,
      sprite: ['........', '..11....', '.1221...', '.12321..', '1233321.', '..3443..', '.4....4.', '.4....4.']
    },
    {
      name: 'Moss Guardian', color: '#3fb060', accent: '#d9ffca', hp: 18, atkMin: 3, atkMax: 5, catchBase: 0.22,
      sprite: ['........', '..111...', '.12221..', '.12321..', '.13331..', '.34443..', '.4...4..', '.4...4..']
    },
    {
      name: 'Volt Talon', color: '#efc93a', accent: '#fff2aa', hp: 17, atkMin: 4, atkMax: 7, catchBase: 0.18,
      sprite: ['...11...', '..121...', '.12321..', '1233321.', '..3331..', '.44.44..', '..4.4...', '........']
    },
    {
      name: 'Dread Bat', color: '#6d56cf', accent: '#f1ebff', hp: 20, atkMin: 4, atkMax: 6, catchBase: 0.16,
      sprite: ['.11..11.', '12211221', '.123332.', '12333321', '..3333..', '.4.44.4.', '.4....4.', '........']
    },
    {
      name: 'Riverclaw', color: '#39afd1', accent: '#e1f9ff', hp: 21, atkMin: 4, atkMax: 6, catchBase: 0.19,
      sprite: ['........', '..111...', '.122221.', '1233321.', '.133331.', '.344443.', '.4....4.', '........']
    },
    {
      name: 'Rose Lynx', color: '#ff5f9c', accent: '#ffe8f2', hp: 22, atkMin: 5, atkMax: 7, catchBase: 0.14,
      sprite: ['........', '..11.1..', '.122221.', '12333321', '.133331.', '.334433.', '.4....4.', '.4....4.']
    },
    {
      name: 'Bloom Seraph', color: '#ff89c6', accent: '#fff0fb', hp: 19, atkMin: 4, atkMax: 6, catchBase: 0.15,
      sprite: ['...11...', '..1221..', '.123321.', '.123321.', '..3333..', '..4..4..', '.4....4.', '........'],
      battleSprite: [
        '.....11.....',
        '....1221....',
        '...122221...',
        '..123332321..',
        '.1233333321.',
        '.1233443321.',
        '..123333321..',
        '...2333332...',
        '..24.44.42...',
        '.24..44..42..',
        '..4......4...',
        '............'
      ]
    },
    {
      name: 'Abyss Pike', color: '#3e7bd9', accent: '#dff3ff', hp: 20, atkMin: 4, atkMax: 6, catchBase: 0.15,
      sprite: ['........', '...11...', '.122221.', '12333321', '.123321.', '..44.44.', '...4.4..', '........'],
      battleSprite: [
        '............',
        '....111.....',
        '..1222221...',
        '.123333321..',
        '12333333321.',
        '.1233443321.',
        '..123333321.',
        '...23333321.',
        '..24.4444...',
        '.24..4..4...',
        '....4.......',
        '............'
      ]
    },
    {
      name: 'Hollow Hydra', color: '#6b63b8', accent: '#ece7ff', hp: 21, atkMin: 4, atkMax: 7, catchBase: 0.13,
      sprite: ['........', '.11..11.', '12211221', '.123332.', '.233333.', '.4.44.4.', '.4....4.', '........'],
      battleSprite: [
        '...11..11...',
        '..12211221..',
        '.1222212221.',
        '123333333321',
        '.12333333321',
        '..233434332.',
        '.2333333332.',
        '..4.44.44...',
        '.4..44..4...',
        '4...44...4..',
        '....44......',
        '............'
      ]
    },
    {
      name: 'Sun Stag', color: '#f3c552', accent: '#fff4c6', hp: 22, atkMin: 5, atkMax: 7, catchBase: 0.12,
      sprite: ['.1....1.', '.122221.', '12333231', '.133331.', '.233333.', '..4..4..', '.4....4.', '........'],
      battleSprite: [
        '1........1..',
        '11.111111.1.',
        '.1222222221.',
        '123333333321',
        '.12333433321',
        '..2333333332',
        '.2333333332.',
        '..4.44.44...',
        '.4..44..4...',
        '4...44...4..',
        '....44......',
        '............'
      ]
    }
  ];
  const speciesByName = Object.fromEntries(speciesList.map(species => [species.name, species]));
  const rarityMeta = {
    common: { label: 'Common', catchAdjust: 0, levelBonus: 0, coinBonus: 0 },
    uncommon: { label: 'Uncommon', catchAdjust: -0.06, levelBonus: 1, coinBonus: 4 },
    rare: { label: 'Rare', catchAdjust: -0.12, levelBonus: 2, coinBonus: 10 },
    legendary: { label: 'Legendary', catchAdjust: -0.18, levelBonus: 3, coinBonus: 18 }
  };
  const typeMeta = {
    flame: { label: 'Flame', short: 'FLM', color: '#d86d54' },
    bloom: { label: 'Bloom', short: 'BLM', color: '#5daa61' },
    tide: { label: 'Tide', short: 'TID', color: '#5e97d8' },
    volt: { label: 'Volt', short: 'VLT', color: '#d7b84d' },
    shade: { label: 'Shade', short: 'SHD', color: '#7c6bc0' },
    stone: { label: 'Stone', short: 'STN', color: '#9b8762' },
    gale: { label: 'Gale', short: 'GAL', color: '#8ebc63' }
  };
  const speciesTypesBySpecies = {
    'Ember Pup': 'flame',
    'Cinder Moth': 'flame',
    'Ember Hound': 'flame',
    Crownwyrm: 'flame',
    Mossling: 'bloom',
    'Bramble Hog': 'bloom',
    'Marsh Mite': 'bloom',
    'Petal Lynx': 'bloom',
    'Moss Guardian': 'bloom',
    'Rose Lynx': 'bloom',
    'Bloom Seraph': 'bloom',
    'Tide Cub': 'tide',
    Brookfin: 'tide',
    'Ripple Fry': 'tide',
    'Pebble Koi': 'tide',
    Riverclaw: 'tide',
    'Abyss Pike': 'tide',
    'Volt Finch': 'volt',
    'Lantern Eel': 'volt',
    'Static Ram': 'volt',
    'Volt Talon': 'volt',
    'Storm Ray': 'volt',
    'Gloom Bat': 'shade',
    'Mire Owl': 'shade',
    'Dread Bat': 'shade',
    'Hollow Hydra': 'shade',
    'Quartz Beetle': 'stone',
    'Tangle Crab': 'stone',
    'Gale Antler': 'gale',
    'Sun Stag': 'gale'
  };
  const typeChart = {
    flame: { bloom: 1.3, tide: 0.8, stone: 0.85 },
    bloom: { tide: 1.3, shade: 0.85, flame: 0.8, gale: 0.9 },
    tide: { flame: 1.3, stone: 1.2, bloom: 0.8, volt: 0.8 },
    volt: { tide: 1.3, gale: 1.2, stone: 0.85, bloom: 0.9 },
    shade: { bloom: 1.2, shade: 0.85, gale: 0.9 },
    stone: { volt: 1.2, flame: 1.15, tide: 0.85, bloom: 0.9 },
    gale: { bloom: 1.2, shade: 1.1, volt: 0.85, stone: 0.9 }
  };
  const evolutionData = {
    'Ember Pup': { evolvesTo: 'Ember Hound', minLevel: 5, minBadges: 1 },
    Mossling: { evolvesTo: 'Moss Guardian', minLevel: 5, minBadges: 1 },
    'Volt Finch': { evolvesTo: 'Volt Talon', minLevel: 6, minBadges: 1 },
    'Gloom Bat': { evolvesTo: 'Dread Bat', minLevel: 6, minBadges: 2 },
    'Tide Cub': { evolvesTo: 'Riverclaw', minLevel: 6, minBadges: 2 },
    'Petal Lynx': { evolvesTo: 'Rose Lynx', minLevel: 7, minBadges: 3 }
  };
  const statusMeta = {
    burn: { label: 'Burn', short: 'Burn' },
    stun: { label: 'Stun', short: 'Stun' },
    regen: { label: 'Regen', short: 'Regen' },
    exposed: { label: 'Break', short: 'Break' }
  };
  const passiveTraitsBySpecies = {
    'Ember Pup': { name: 'Blaze Heart', description: '+1 damage above half HP.', highHpBonus: 1 },
    'Ember Hound': { name: 'Blaze Heart', description: '+2 damage above half HP.', highHpBonus: 2 },
    'Cinder Moth': { name: 'Kindled Wings', description: '+1 damage above half HP.', highHpBonus: 1 },
    'Crownwyrm': { name: 'Royal Pyre', description: '+2 damage above half HP.', highHpBonus: 2 },
    Mossling: { name: 'Softroot', description: 'Recover 1 HP at turn start.', turnHeal: 1 },
    'Moss Guardian': { name: 'Deeproot', description: 'Recover 2 HP at turn start.', turnHeal: 2 },
    'Petal Lynx': { name: 'Bloom Veil', description: 'Recover 1 HP at turn start.', turnHeal: 1 },
    'Rose Lynx': { name: 'Bloom Veil', description: 'Recover 2 HP at turn start.', turnHeal: 2 },
    'Bloom Seraph': { name: 'Halo Bloom', description: 'Recover 2 HP at turn start.', turnHeal: 2 },
    'Bramble Hog': { name: 'Bramble Hide', description: 'Take 1 less damage.', incomingReduction: 1 },
    'Quartz Beetle': { name: 'Mirror Shell', description: 'Take 1 less damage.', incomingReduction: 1 },
    'Gloom Bat': { name: 'Night Veil', description: 'Take 1 less damage.', incomingReduction: 1 },
    'Dread Bat': { name: 'Night Veil', description: 'Take 2 less damage.', incomingReduction: 2 },
    'Tangle Crab': { name: 'Hard Clamps', description: 'Take 1 less damage.', incomingReduction: 1 },
    'Pebble Koi': { name: 'Stone Scales', description: 'Take 1 less damage.', incomingReduction: 1 },
    'Volt Finch': { name: 'Shock Hunter', description: '+1 damage to statused foes.', statusHunter: 1 },
    'Volt Talon': { name: 'Shock Hunter', description: '+2 damage to statused foes.', statusHunter: 2 },
    'Static Ram': { name: 'Breaker Horn', description: '+1 damage to statused foes.', statusHunter: 1 },
    'Lantern Eel': { name: 'Flash Feed', description: '+1 damage to statused foes.', statusHunter: 1 },
    'Sun Stag': { name: 'Solar Mantle', description: 'Heal 1 HP and take 1 less damage.', turnHeal: 1, incomingReduction: 1 },
    'Tide Cub': { name: 'Tidal Rhythm', description: 'Recover 1 HP after a hit.', healOnHit: 1 },
    Riverclaw: { name: 'Tidal Rhythm', description: 'Recover 2 HP after a hit.', healOnHit: 2 },
    Brookfin: { name: 'Current Line', description: 'Recover 1 HP after a hit.', healOnHit: 1 },
    'Ripple Fry': { name: 'Current Line', description: 'Recover 1 HP after a hit.', healOnHit: 1 },
    'Storm Ray': { name: 'Rising Surge', description: '+2 damage to healthy foes.', enemyHealthyBonus: 2 },
    'Abyss Pike': { name: 'Rising Surge', description: '+2 damage to healthy foes.', enemyHealthyBonus: 2 },
    'Marsh Mite': { name: 'Bog Ambush', description: '+1 damage to healthy foes.', enemyHealthyBonus: 1 },
    'Gale Antler': { name: 'Wind Chase', description: '+1 damage to healthy foes.', enemyHealthyBonus: 1 },
    'Mire Owl': { name: 'Dusk Watch', description: '+1 damage to higher-level foes.', levelHunter: 1 },
    'Hollow Hydra': { name: 'Many Heads', description: 'Recover 1 HP after a hit.', healOnHit: 1 }
  };
  const thirdMovesBySpecies = {
    'Ember Pup': { name: 'Smoke Pounce', power: 1.05, accuracy: 0.94, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.4 } },
    'Ember Hound': { name: 'Wildfire Leap', power: 1.18, accuracy: 0.92, effect: { type: 'burn', turns: 2, potency: 1, chance: 0.5 } },
    'Cinder Moth': { name: 'Soot Veil', power: 0.95, accuracy: 0.96, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.65 } },
    'Mossling': { name: 'Bud Guard', power: 0.9, accuracy: 0.97, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 1 } },
    'Moss Guardian': { name: 'Canopy Guard', power: 1, accuracy: 0.95, selfEffect: { type: 'regen', turns: 3, potency: 1, chance: 1 } },
    'Bramble Hog': { name: 'Needle Roll', power: 1.1, accuracy: 0.92, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.55 } },
    'Volt Finch': { name: 'Static Peck', power: 1, accuracy: 0.95, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.35 } },
    'Volt Talon': { name: 'Arc Wing', power: 1.15, accuracy: 0.91, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.5 } },
    'Quartz Beetle': { name: 'Facet Flash', type: 'volt', power: 1.04, accuracy: 0.94, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.5 } },
    'Gale Antler': { name: 'Sky Hook', power: 1.1, accuracy: 0.93, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.45 } },
    'Gloom Bat': { name: 'Shade Screen', power: 0.98, accuracy: 0.95, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.45 } },
    'Dread Bat': { name: 'Void Loop', power: 1.08, accuracy: 0.93, healRatio: 0.25 },
    'Mire Owl': { name: 'Grave Blink', type: 'gale', power: 1.06, accuracy: 0.94, effect: { type: 'burn', turns: 2, potency: 1, chance: 0.45 } },
    'Hollow Hydra': { name: 'Echo Bite', power: 1.12, accuracy: 0.9, healRatio: 0.2 },
    'Tide Cub': { name: 'Foam Tackle', power: 1.02, accuracy: 0.95, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.35 } },
    Riverclaw: { name: 'Breaker Wake', power: 1.16, accuracy: 0.92, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.55 } },
    Brookfin: { name: 'Reef Loop', power: 1.05, accuracy: 0.94, healRatio: 0.2 },
    'Marsh Mite': { name: 'Murk Burst', power: 1.02, accuracy: 0.95, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.3 } },
    'Ripple Fry': { name: 'Stream Zip', power: 1, accuracy: 0.96, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.4 } },
    'Pebble Koi': { name: 'River Vault', power: 1.08, accuracy: 0.94, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.38 } },
    'Tangle Crab': { name: 'Barnacle Brace', power: 0.96, accuracy: 0.95, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.5 } },
    'Lantern Eel': { name: 'Lure Flicker', power: 1.06, accuracy: 0.93, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.38 } },
    'Storm Ray': { name: 'Skyfall Sweep', power: 1.14, accuracy: 0.89, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.5 } },
    'Abyss Pike': { name: 'Depth Spiral', power: 1.12, accuracy: 0.91, effect: { type: 'exposed', turns: 3, potency: 1, chance: 0.5 } },
    'Petal Lynx': { name: 'Rose Guard', power: 0.96, accuracy: 0.97, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 1 } },
    'Rose Lynx': { name: 'Blush Fang', power: 1.14, accuracy: 0.92, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.65 } },
    'Bloom Seraph': { name: 'Petal Halo', power: 1.08, accuracy: 0.94, selfEffect: { type: 'regen', turns: 3, potency: 1, chance: 1 } },
    'Static Ram': { name: 'Breaker Step', type: 'stone', power: 1.09, accuracy: 0.92, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.42 } },
    'Sun Stag': { name: 'Dawn Shield', type: 'flame', power: 1.02, accuracy: 0.95, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.8 } },
    'Crownwyrm': { name: 'Crown Guard', power: 1.1, accuracy: 0.91, effect: { type: 'burn', turns: 2, potency: 1, chance: 0.42 } }
  };
  const routeTrainerNames = {
    'Town Outskirts': ['Pip', 'Lena', 'Bo', 'Mika'],
    'Fern Trail': ['Orin', 'Suri', 'Pax', 'Mira'],
    'Creek Bend': ['Nell', 'Toma', 'Rill', 'Caro'],
    'Dusk Hollow': ['Venn', 'Iris', 'Noa', 'Kest'],
    'Thunder Ridge': ['Jett', 'Roux', 'Bram', 'Skye'],
    'Wild Crown': ['Vale', 'Sable', 'Kira', 'Oris']
  };
  const routeTrainerTitles = ['Scout', 'Tamer', 'Ace', 'Ranger', 'Wanderer'];
  const routeProfiles = [
    {
      label: 'Town Outskirts',
      palette: { plain: '#9ecc78', grass: '#84bf5b', path: '#cfbb88', water: '#63aedf' },
      landmark: 'signpost',
      pool: [
        { species: 'Mossling', rarity: 'common', weight: 28 },
        { species: 'Ember Pup', rarity: 'common', weight: 24 },
        { species: 'Cinder Moth', rarity: 'common', weight: 22 },
        { species: 'Bramble Hog', rarity: 'uncommon', weight: 14 },
        { species: 'Volt Finch', rarity: 'uncommon', weight: 8 },
        { species: 'Gloom Bat', rarity: 'rare', weight: 4 }
      ],
      fishPool: [
        { species: 'Ripple Fry', rarity: 'common', weight: 52 },
        { species: 'Pebble Koi', rarity: 'uncommon', weight: 32 },
        { species: 'Tangle Crab', rarity: 'rare', weight: 16 }
      ],
      fishSpecials: [],
      specials: [],
      boss: { trainer: 'Scout Mira', badge: 'Trail', species: 'Ember Pup', rewardCoins: 24, requiredBadges: 0, minCaptures: 2, minDefeated: 2, minLeadLevel: 4, levelBonus: 3 }
    },
    {
      label: 'Fern Trail',
      palette: { plain: '#8ccf71', grass: '#63b14d', path: '#ccb47b', water: '#74b7d8' },
      landmark: 'fern',
      pool: [
        { species: 'Mossling', rarity: 'common', weight: 24 },
        { species: 'Cinder Moth', rarity: 'common', weight: 22 },
        { species: 'Bramble Hog', rarity: 'common', weight: 20 },
        { species: 'Ember Pup', rarity: 'uncommon', weight: 14 },
        { species: 'Volt Finch', rarity: 'uncommon', weight: 12 },
        { species: 'Tide Cub', rarity: 'uncommon', weight: 5 },
        { species: 'Gloom Bat', rarity: 'rare', weight: 3 }
      ],
      fishPool: [
        { species: 'Ripple Fry', rarity: 'common', weight: 40 },
        { species: 'Pebble Koi', rarity: 'common', weight: 30 },
        { species: 'Tangle Crab', rarity: 'uncommon', weight: 20 },
        { species: 'Lantern Eel', rarity: 'rare', weight: 10 }
      ],
      fishSpecials: [],
      specials: [
        { species: 'Petal Lynx', rarity: 'legendary', chance: 0.07, minSteps: 60, minCaptures: 2, terrain: 'grass' },
        { species: 'Bloom Seraph', rarity: 'legendary', chance: 0.028, minSteps: 125, minCaptures: 3, minDefeated: 4, terrain: 'grass' }
      ],
      boss: { trainer: 'Ranger Vale', badge: 'Fern', species: 'Mossling', rewardCoins: 32, requiredBadges: 1, minCaptures: 4, minDefeated: 4, minLeadLevel: 7, levelBonus: 4 }
    },
    {
      label: 'Creek Bend',
      palette: { plain: '#8ac9b0', grass: '#64b19d', path: '#d2c18d', water: '#4da8da' },
      landmark: 'reeds',
      pool: [
        { species: 'Tide Cub', rarity: 'common', weight: 24 },
        { species: 'Marsh Mite', rarity: 'common', weight: 24 },
        { species: 'Mossling', rarity: 'common', weight: 18 },
        { species: 'Bramble Hog', rarity: 'uncommon', weight: 12 },
        { species: 'Volt Finch', rarity: 'uncommon', weight: 10 },
        { species: 'Ember Pup', rarity: 'uncommon', weight: 8 },
        { species: 'Gloom Bat', rarity: 'rare', weight: 4 }
      ],
      fishPool: [
        { species: 'Pebble Koi', rarity: 'common', weight: 34 },
        { species: 'Ripple Fry', rarity: 'common', weight: 26 },
        { species: 'Tangle Crab', rarity: 'uncommon', weight: 24 },
        { species: 'Lantern Eel', rarity: 'rare', weight: 16 }
      ],
      fishSpecials: [
        { species: 'Abyss Pike', rarity: 'legendary', chance: 0.038, minSteps: 170, minCaptures: 3, minDefeated: 5 }
      ],
      specials: [
        { species: 'Brookfin', rarity: 'legendary', chance: 0.06, minSteps: 110, minDefeated: 4, terrain: 'grass' }
      ],
      boss: { trainer: 'Angler Nia', badge: 'Creek', species: 'Tide Cub', rewardCoins: 38, requiredBadges: 2, minCaptures: 5, minDefeated: 6, minLeadLevel: 9, levelBonus: 5 }
    },
    {
      label: 'Dusk Hollow',
      palette: { plain: '#8691a8', grass: '#6c7c99', path: '#9b9078', water: '#556f97' },
      landmark: 'obelisk',
      pool: [
        { species: 'Gloom Bat', rarity: 'common', weight: 24 },
        { species: 'Marsh Mite', rarity: 'common', weight: 18 },
        { species: 'Quartz Beetle', rarity: 'common', weight: 18 },
        { species: 'Mossling', rarity: 'uncommon', weight: 12 },
        { species: 'Tide Cub', rarity: 'uncommon', weight: 10 },
        { species: 'Ember Pup', rarity: 'uncommon', weight: 8 },
        { species: 'Volt Finch', rarity: 'rare', weight: 6 },
        { species: 'Cinder Moth', rarity: 'rare', weight: 4 }
      ],
      fishPool: [
        { species: 'Lantern Eel', rarity: 'common', weight: 42 },
        { species: 'Tangle Crab', rarity: 'uncommon', weight: 28 },
        { species: 'Pebble Koi', rarity: 'rare', weight: 18 },
        { species: 'Storm Ray', rarity: 'rare', weight: 12 }
      ],
      fishSpecials: [
        { species: 'Storm Ray', rarity: 'legendary', chance: 0.05, minSteps: 150, minCaptures: 3 }
      ],
      specials: [
        { species: 'Mire Owl', rarity: 'legendary', chance: 0.055, minSteps: 160, minCaptures: 4, minDefeated: 6, terrain: 'grass' },
        { species: 'Hollow Hydra', rarity: 'legendary', chance: 0.03, minSteps: 235, minCaptures: 5, minDefeated: 8, terrain: 'grass' }
      ],
      boss: { trainer: 'Warden Noir', badge: 'Dusk', species: 'Gloom Bat', rewardCoins: 46, requiredBadges: 3, minCaptures: 6, minDefeated: 8, minLeadLevel: 12, levelBonus: 6 }
    },
    {
      label: 'Thunder Ridge',
      palette: { plain: '#c5b17b', grass: '#b59753', path: '#d7c48d', water: '#6f91b8' },
      landmark: 'teslapost',
      pool: [
        { species: 'Volt Finch', rarity: 'common', weight: 22 },
        { species: 'Quartz Beetle', rarity: 'common', weight: 20 },
        { species: 'Gale Antler', rarity: 'common', weight: 18 },
        { species: 'Ember Pup', rarity: 'uncommon', weight: 14 },
        { species: 'Gloom Bat', rarity: 'uncommon', weight: 10 },
        { species: 'Tide Cub', rarity: 'uncommon', weight: 8 },
        { species: 'Mossling', rarity: 'rare', weight: 5 },
        { species: 'Lantern Eel', rarity: 'rare', weight: 3 }
      ],
      fishPool: [
        { species: 'Lantern Eel', rarity: 'common', weight: 34 },
        { species: 'Tangle Crab', rarity: 'uncommon', weight: 26 },
        { species: 'Storm Ray', rarity: 'rare', weight: 24 },
        { species: 'Pebble Koi', rarity: 'rare', weight: 16 }
      ],
      fishSpecials: [
        { species: 'Storm Ray', rarity: 'legendary', chance: 0.06, minSteps: 210, minDefeated: 6 }
      ],
      specials: [
        { species: 'Static Ram', rarity: 'legendary', chance: 0.045, minSteps: 220, minDefeated: 8, terrain: 'grass' },
        { species: 'Sun Stag', rarity: 'legendary', chance: 0.028, minSteps: 260, minCaptures: 6, minDefeated: 9, terrain: 'grass' }
      ],
      boss: { trainer: 'Ace Rook', badge: 'Storm', species: 'Static Ram', rewardCoins: 58, requiredBadges: 4, minCaptures: 7, minDefeated: 10, minLeadLevel: 15, levelBonus: 7 }
    },
    {
      label: 'Wild Crown',
      palette: { plain: '#8cb46f', grass: '#5f8f47', path: '#d5c17d', water: '#6daec8' },
      landmark: 'crowntree',
      pool: [
        { species: 'Gale Antler', rarity: 'common', weight: 22 },
        { species: 'Bramble Hog', rarity: 'common', weight: 20 },
        { species: 'Ember Pup', rarity: 'uncommon', weight: 14 },
        { species: 'Tide Cub', rarity: 'uncommon', weight: 14 },
        { species: 'Quartz Beetle', rarity: 'uncommon', weight: 10 },
        { species: 'Volt Finch', rarity: 'rare', weight: 8 },
        { species: 'Gloom Bat', rarity: 'rare', weight: 7 },
        { species: 'Mossling', rarity: 'uncommon', weight: 5 }
      ],
      fishPool: [
        { species: 'Storm Ray', rarity: 'uncommon', weight: 36 },
        { species: 'Lantern Eel', rarity: 'rare', weight: 28 },
        { species: 'Tangle Crab', rarity: 'rare', weight: 20 },
        { species: 'Pebble Koi', rarity: 'rare', weight: 16 }
      ],
      fishSpecials: [
        { species: 'Storm Ray', rarity: 'legendary', chance: 0.08, minSteps: 300, minCaptures: 7, minDefeated: 10 },
        { species: 'Abyss Pike', rarity: 'legendary', chance: 0.05, minSteps: 320, minCaptures: 7, minDefeated: 10 }
      ],
      specials: [
        { species: 'Crownwyrm', rarity: 'legendary', chance: 0.03, minSteps: 320, minCaptures: 8, minDefeated: 12, terrain: 'grass' },
        { species: 'Bloom Seraph', rarity: 'legendary', chance: 0.026, minSteps: 290, minCaptures: 7, minDefeated: 10, terrain: 'grass' },
        { species: 'Sun Stag', rarity: 'legendary', chance: 0.024, minSteps: 300, minCaptures: 7, minDefeated: 11, terrain: 'grass' }
      ],
      boss: { trainer: 'Regent Sol', badge: 'Crown', species: 'Crownwyrm', rewardCoins: 72, requiredBadges: 5, minCaptures: 9, minDefeated: 13, minLeadLevel: 18, levelBonus: 8 }
    }
  ];
  const playerSprite = ['........', '..111...', '.112211.', '..1331..', '.133331.', '..3223..', '..2..2..', '..4..4..'];
  const trainerSprite = ['........', '..111...', '.122221.', '..1331..', '.133331.', '..3443..', '..4..4..', '.5....5.'];
  const tallGrassSprite = ['........', '.1.1.1..', '..1.1...', '.1.11.1.', '..11....', '.1..1.1.', '........', '........'];
  const treeSprite = ['...11...', '..1221..', '.122221.', '.122221.', '..2332..', '...33...', '...44...', '..4..4..'];
  const fieldStationSprite = ['11111111', '12222221', '12333321', '12344321', '12344321', '12333321', '12222221', '11111111'];
  const capsuleSprite = ['...11...', '..1221..', '.123321.', '.123321.', '.144441.', '..1441..', '...11...', '........'];
  const coinSprite = ['..1111..', '.122221.', '.123321.', '.123321.', '.122221.', '..1111..', '........', '........'];
  const tonicSprite = ['...11...', '..1221..', '..1331..', '..1331..', '..1331..', '...44...', '..4444..', '........'];
  const cacheSprite = ['11111111', '12222221', '12333321', '12333321', '12333321', '12222221', '14444441', '........'];
  const charmSprite = ['...11...', '..1221..', '.123321.', '12344321', '.123321.', '..1221..', '...11...', '........'];
  const bobberSprite = ['........', '...11...', '..1221..', '..1331..', '...11...', '........', '........', '........'];
  const landmarkSprites = {
    signpost: { sprite: ['........', '..11....', '..11....', '..11....', '.1221...', '.1221...', '111111..', '........'], palette: { '1': '#74502b', '2': '#f3e3b1' } },
    fern: { sprite: ['...1....', '..121...', '.12221..', '..121...', '...1....', '..121...', '.1.1.1..', '........'], palette: { '1': '#2f7c3a', '2': '#68bf63' } },
    reeds: { sprite: ['.1..1...', '.1..1...', '.12.21..', '.12221..', '.1.1.1..', '.1.1.1..', '........', '........'], palette: { '1': '#6f9d4d', '2': '#c9df7c' } },
    obelisk: { sprite: ['...11...', '..1221..', '..1331..', '..1331..', '..1331..', '..1221..', '.444444.', '........'], palette: { '1': '#444b59', '2': '#8992a3', '3': '#5d6675', '4': '#6f5f7a' } },
    teslapost: { sprite: ['...11...', '..1221..', '11133111', '...33...', '...33...', '..3443..', '..3..3..', '........'], palette: { '1': '#f2d468', '2': '#c5b17b', '3': '#6e5a3a', '4': '#99c6ff' } },
    crowntree: { sprite: ['...11...', '..1221..', '.122221.', '.123321.', '..2332..', '..2442..', '..4..4..', '........'], palette: { '1': '#d4c16a', '2': '#4f8a3b', '3': '#6aa24c', '4': '#694721' } }
  };

  let highScore = getHighScore(gameKey);
  let chunks = new Map();
  let player = { x: 0, y: 1 };
  let party = [];
  let storedMonsters = [];
  const activePartyLimit = 6;
  let activeIndex = 0;
  let captures = 0;
  let defeated = 0;
  let steps = 0;
  let gameOver = false;
  let battleTarget = null;
  let worldTick = 0;
  let renderTick = 0;
  let encounterRollCounter = 0;
  let coins = 20;
  let capsules = 5;
  let tonics = 0;
  let rods = 0;
  let charms = 0;
  let caughtMonsterCounter = 0;
  let badges = [];
  const shinyChance = 1 / 128;
  const maxCapsules = 20;
  const maxTonics = 20;
  const maxRods = 20;
  const tonicHealAmount = 12;
  const battleRootOptions = [
    { key: 'attack', label: 'Attack' },
    { key: 'item', label: 'Item' },
    { key: 'switch', label: 'Switch' },
    { key: 'run', label: 'Run' },
    { key: 'capture', label: 'Capture' }
  ];
  const shopItems = [
    { key: 'heal', label: 'Heal Party', cost: 0 },
    { key: 'capsule', label: 'Buy Capsule', cost: 18 },
    { key: 'rod', label: 'Buy Fishing Rod', cost: 22 },
    { key: 'tonic', label: 'Buy Tonic', cost: 18 },
    { key: 'boss', label: 'Town Boss', cost: 0 },
    { key: 'index', label: 'Monster Index', cost: 0 },
    { key: 'storage', label: 'Storage Box', cost: 0 },
    { key: 'leave', label: 'Leave Town', cost: 0 }
  ];
  let townMenuOpen = false;
  let townSelection = 0;
  let indexMenuOpen = false;
  let indexSelection = 0;
  let storageMenuOpen = false;
  let storageMenuColumn = 'party';
  let storagePartySelection = 0;
  let storageBoxSelection = 0;
  let storageSwapPending = null;
  let playerMenuOpen = false;
  let playerMenuMode = 'party';
  let playerMenuSelection = 0;
  let playerMenuActionSelection = 0;
  let playerMenuSwapSelection = 0;
  let townships = [];
  let activeTownship = null;
  let encounterTransition = null;
  let encounterTransitionFrame = null;
  let battleAnimation = null;
  let battleAnimationFrame = null;
  let battleResultBanner = null;
  let fishingAnimation = null;
  let fishingAnimationFrame = null;
  let ambientAnimationFrame = null;
  let ambientLastAt = 0;
  let battleMenuMode = 'root';
  let battleMenuSelection = 0;
  let battleSubSelection = 0;
  const dexKey = 'monsterTamerDex';
  let monsterDex = readLocalJson(dexKey, {});

  function key(x, y) {
    return `${x},${y}`;
  }

  function chunkKey(cx, cy) {
    return `${cx},${cy}`;
  }

  function wrapIndex(value, length) {
    return ((value % length) + length) % length;
  }

  function hashValue(x, y, salt = 0) {
    const raw = Math.sin((x * 127.1) + (y * 311.7) + (salt * 74.7) + (worldSeed * 0.0001)) * 43758.5453123;
    return raw - Math.floor(raw);
  }

  function townshipNameForProfile(profile) {
    return `${profile.label} Township`;
  }

  function biomeDistanceRange(index) {
    if (index === 0) {
      return { min: 5, max: 16 };
    }

    return {
      min: 10 + index * 18,
      max: 20 + index * 20
    };
  }

  function baseTerrainAt(x, y) {
    const routeBandX = Math.abs((((x + Math.floor(hashValue(0, Math.floor(y / 3), 3) * 6)) % 14) + 14) % 14 - 7) <= 1;
    const routeBandY = Math.abs((((y + Math.floor(hashValue(Math.floor(x / 3), 0, 5) * 6)) % 18) + 18) % 18 - 9) <= 1;
    const meadowNoise = hashValue(Math.floor(x / 4), Math.floor(y / 4), 9);
    const waterNoise = hashValue(Math.floor(x / 3), Math.floor(y / 3), 11);
    const treeNoise = hashValue(Math.floor(x / 2), Math.floor(y / 2), 17);

    if (routeBandX || routeBandY) return 'path';
    if (waterNoise > 0.84 && meadowNoise > 0.32) return 'water';
    if (treeNoise > 0.76 && meadowNoise > 0.2) return 'tree';
    if (meadowNoise > 0.28) return 'grass';
    return 'plain';
  }

  function isTownshipFootprintClear(centerX, centerY) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = centerX + dx;
        const ty = centerY + dy;
        const terrain = baseTerrainAt(tx, ty);
        if (terrain === 'water' || terrain === 'tree') return false;
      }
    }
    return true;
  }

  function createTownshipForProfile(profile, index, existingTownships = []) {
    const range = biomeDistanceRange(index);
    const preferredAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI, -Math.PI / 4, Math.PI / 4];
    const preferredAngle = preferredAngles[index % preferredAngles.length];

    for (let attempt = 0; attempt < 160; attempt++) {
      const angle = preferredAngle + (hashValue(index + 1, attempt + 1, 301) - 0.5) * 0.9;
      const distance = range.min + Math.floor(hashValue(index + 1, attempt + 1, 307) * Math.max(1, range.max - range.min + 1));
      const centerX = Math.round(Math.cos(angle) * distance);
      const centerY = Math.round(Math.sin(angle) * distance);

      if (routeProfileAt(centerX, centerY) !== profile) continue;
      if (!isTownshipFootprintClear(centerX, centerY)) continue;

      const overlapsExistingTown = existingTownships.some(town =>
        Math.abs(town.x - centerX) <= 4 && Math.abs(town.y - centerY) <= 4
      );
      if (overlapsExistingTown) continue;

      return {
        key: `town-${index}`,
        name: townshipNameForProfile(profile),
        profile,
        x: centerX,
        y: centerY
      };
    }

    const fallbackDistance = range.min;
    return {
      key: `town-${index}`,
      name: townshipNameForProfile(profile),
      profile,
      x: fallbackDistance,
      y: 0
    };
  }

  function buildTownships() {
    const nextTownships = [];
    routeProfiles.forEach((profile, index) => {
      nextTownships.push(createTownshipForProfile(profile, index, nextTownships));
    });
    return nextTownships;
  }

  function getTownshipAt(x = player.x, y = player.y) {
    return townships.find(town => Math.abs(town.x - x) <= 1 && Math.abs(town.y - y) <= 1) || null;
  }

  function isTownShopTile(x = player.x, y = player.y) {
    const town = getTownshipAt(x, y);
    return !!(town && town.x === x && town.y === y);
  }

  function currentScore() {
    return captures * 140 + defeated * 55 + steps * 2 + party.reduce((total, monster) => total + monster.level * 8, 0) + coins;
  }

  function adventureProgress() {
    return captures + defeated + Math.max(0, party.length - 1);
  }

  function distanceFromOrigin(x, y) {
    return Math.abs(x) + Math.abs(y);
  }

  function progressionLevelCap() {
    return 8 + badgeCount() * 6;
  }

  function highestPartyLevel() {
    return party.reduce((highest, monster) => Math.max(highest, monster?.level || 0), 1);
  }

  function averagePartyLevel() {
    if (!party.length) return 1;
    return party.reduce((total, monster) => total + (monster?.level || 0), 0) / party.length;
  }

  function monsterDisplayName(monster) {
    if (!monster) return '';
    return monster.catchTag ? `${monster.name} ${monster.catchTag}` : monster.name;
  }

  function assignCaughtMonsterTag(monster) {
    if (!monster || monster.catchTag) return monster;
    caughtMonsterCounter += 1;
    monster.catchTag = `#${String(caughtMonsterCounter).padStart(2, '0')}`;
    return monster;
  }

  function directionLabel(dx, dy) {
    const horizontal = dx === 0 ? '' : `${Math.abs(dx)}${dx > 0 ? 'E' : 'W'}`;
    const vertical = dy === 0 ? '' : `${Math.abs(dy)}${dy > 0 ? 'S' : 'N'}`;
    return [horizontal, vertical].filter(Boolean).join(' ');
  }

  function nextTownshipTarget() {
    const remainingRoute = routeProfiles.find(profile => !hasBadge(profile));
    if (!remainingRoute) return null;
    return townships.find(town => town.profile === remainingRoute) || null;
  }

  function nextTownshipHint() {
    const town = nextTownshipTarget();
    if (!town) return 'All towns cleared';
    const dx = town.x - player.x;
    const dy = town.y - player.y;
    if (dx === 0 && dy === 0) return 'Town Here';
    return `${town.profile.label} ${directionLabel(dx, dy)}`;
  }

  function battleBannerTitle(target) {
    if (!target) return 'Battle End';
    if (target.isBoss) return `${target.badgeName} Badge Won`;
    if (target.isTrainer) return 'Trainer Down';
    return 'Victory';
  }

  function showBattleResult(title, detail, durationMs = 1500) {
    battleResultBanner = {
      title,
      detail,
      expiresAt: performance.now() + durationMs
    };
  }

  function earlyGameRelief(x = player.x, y = player.y) {
    const distanceRelief = Math.max(0, 1 - (distanceFromOrigin(x, y) / 26));
    const progressRelief = Math.max(0, 1 - (adventureProgress() / 9));
    return Math.max(distanceRelief * 0.55, progressRelief * 0.75);
  }

  function lootTierAt(x, y) {
    return Math.min(4, Math.floor(distanceFromOrigin(x, y) / 24));
  }

  function routeProfileAt(x = player.x, y = player.y) {
    const distance = Math.abs(x) + Math.abs(y);
    const band = Math.min(routeProfiles.length - 1, Math.max(0, Math.floor(Math.max(0, distance - 4) / 28)));
    return routeProfiles[band];
  }

  function routeLabelAt(x = player.x, y = player.y) {
    const town = getTownshipAt(x, y);
    return town ? town.name : routeProfileAt(x, y).label;
  }

  function routeSortIndex(route) {
    const baseRoute = (route || '').replace(/ Waters$/, '');
    const index = routeProfiles.findIndex(profile => profile.label === baseRoute);
    return index >= 0 ? index : routeProfiles.length;
  }

  function hasLandmarkAt(x, y, profile = routeProfileAt(x, y), type = terrainAt(x, y)) {
    if (!profile || type === 'grass' || type === 'water' || type === 'heal' || type === 'town' || type === 'shop') return false;
    return hashValue(x, y, 201) >= 0.958;
  }

  function routesForSpecies(speciesName) {
    return routeProfiles
      .filter(profile =>
        profile.pool.some(entry => entry.species === speciesName)
        || (profile.specials || []).some(entry => entry.species === speciesName)
        || (profile.fishPool || []).some(entry => entry.species === speciesName)
        || (profile.fishSpecials || []).some(entry => entry.species === speciesName)
      )
      .map(profile => ((profile.fishPool || []).some(entry => entry.species === speciesName) || (profile.fishSpecials || []).some(entry => entry.species === speciesName))
        ? `${profile.label} Waters`
        : profile.label);
  }

  function summarizeMonsterTamerMessage(text) {
    if (!text) return '';

    let match = null;

    const exact = new Map([
      ['Your party rested at town.', 'Party healed'],
      ['Town services are open. Stock up or check your index.', 'Town services open'],
      ['Monster Index opened. Browse routes and discoveries.', 'Index open'],
      ['Storage Box opened. Swap active and stored monsters.', 'Storage open'],
      ['Party menu opened. Check stats, move partners, or use items.', 'Party menu open'],
      ['Back to town services.', 'Back to town'],
      ['Back to your party list.', 'Back to party'],
      ['Closed the party menu.', 'Party menu closed'],
      ['You head back out onto the route.', 'Back on route'],
      ['The town nurse patched up your party.', 'Party healed'],
      ['Not enough coins for that purchase.', 'Not enough coins'],
      ['Your capsule bag is already full.', 'Capsules full'],
      ['You bought one fishing rod.', '+1 rod'],
      ['You bought one capsule.', '+1 capsule'],
      ['Nothing to interact with here right now.', 'Nothing here'],
      ['Only one healthy partner is ready right now.', 'Only one partner ready'],
      ['You are out of capsules. Return to town and buy more.', 'Out of capsules'],
      ['You need a fishing rod first.', 'Need a rod'],
      ['Stand beside water to fish.', 'Need water'],
      ['Water nearby. Center can fish.', 'Fish here'],
      ['Use Prev/Next or the wheel to browse the Monster Index.', 'Browse index'],
      ['Use Prev/Next or the wheel to browse the Storage Box.', 'Browse storage'],
      ['Use Prev/Next or the wheel to browse your party.', 'Browse party'],
      ['Choose a party action.', 'Choose party action'],
      ['Choose a partner to swap positions with.', 'Choose swap target'],
      ['Use Prev/Next or the wheel to browse town services.', 'Browse town menu'],
      ['You are in battle. Use Center or Play/Pause.', 'In battle'],
      ['You are back in town. Center opens the shop.', 'Back in town'],
      ['Leave town, discover route monsters, and return to town to check your index.', 'Leave town and start hunting'],
      ['No lead monster to treat.', 'No lead monster'],
      ['You leave the shop and head back outside.', 'Left the shop']
    ]);

    if (exact.has(text)) {
      return exact.get(text);
    }

    match = text.match(/^(.+) selected\.$/);
    if (match) return match[1];

    match = text.match(/^(.+) entry selected\.$/);
    if (match) return `${match[1]} info`;

    match = text.match(/^(.+) is already at full HP\.$/);
    if (match) return `${match[1]} full HP`;

    match = text.match(/^(.+) recovered with a tonic\.$/);
    if (match) return `${match[1]} healed`;

    if (text === 'You found a field tonic.') return '+1 tonic';
    if (text === 'You bought one tonic.') return '+1 tonic';
    if (text === 'You are out of tonics.') return 'Out of tonics';
    if (text === 'No stored monsters are available right now.') return 'Box empty';
    if (text === 'Party is full. Choose a party monster to swap out.') return 'Choose party swap';
    if (text === 'Choose a boxed monster to swap in.') return 'Choose box swap';
    if (text === 'Choose a party monster to swap out.') return 'Choose party swap';
    if (text === 'Choose an attack.') return 'Choose attack';
    if (text === 'Choose an item.') return 'Choose item';
    if (text === 'Choose a partner.') return 'Choose partner';
    if (text === 'No usable items right now.') return 'No items';
    if (text === 'No healthy partners can switch in.') return 'No partner ready';
    if (text === 'Choose Attack, Item, Switch, Run, or Capture.') return 'Choose action';

    match = text.match(/^Boss (.+) sent out (.+) for the (.+) Badge\.$/);
    if (match) return `${match[3]} Badge boss`;

    match = text.match(/^(.+) won the (.+) Badge and (\d+)c\.(?: (.+))?$/);
    if (match) return `${match[2]} Badge +${match[3]}c`;

    match = text.match(/^(.+) stepped in\.$/);
    if (match) return `Switched ${match[1]}`;

    match = text.match(/^(.+) evolved into (.+)!$/);
    if (match) return `${match[2]} evolved`;

    match = text.match(/^Need (.+) before (.+) can be challenged\.$/);
    if (match) return `${match[2]} locked`;

    match = text.match(/^You escaped from (.+)\.$/);
    if (match) return `Escaped ${match[1]}`;

    match = text.match(/^Couldn't escape! (.+) cuts you off for (\d+)\.$/);
    if (match) return `Run failed · ${match[1]} ${match[2]}`;

    match = text.match(/^You found (\d+) coins in a weathered cache\.$/);
    if (match) return `+${match[1]} coins`;

    match = text.match(/^You found (\d+) capsule(?:s)? in a supply pod\.$/);
    if (match) return `+${match[1]} capsule`;

    match = text.match(/^You found a field tonic\. (.+) recovered (\d+) HP\.$/);
    if (match) return `${match[1]} +${match[2]} HP`;

    match = text.match(/^You found a field tonic\. No one needed it, so you traded it for (\d+) coins\.$/);
    if (match) return `Tonic traded · +${match[1]}c`;

    match = text.match(/^You uncovered a (.+) and found (\d+) coins\.$/);
    if (match) return `${match[1]} · +${match[2]}c`;

    match = text.match(/^You uncovered a (.+) and found (\d+) capsules\.$/);
    if (match) return `${match[1]} · +${match[2]} cap`;

    match = text.match(/^You uncovered a (.+) and restored (\d+) HP across your party\.$/);
    if (match) return `${match[1]} · +${match[2]} HP`;

    if (text === 'You found a capture charm. Your next capture attempt will be stronger.') return '+1 charm';

    if (text === 'You cast out, but nothing bites. The rod still looks usable.') return 'No bite · Rod kept';
    if (text === 'You cast out, but nothing bites. The rod snapped.') return 'No bite · Rod broke';

    match = text.match(/^Capture charm flared\. You caught the (.+) (.+)! (?:.+ recovered \d+ HP\. )?Party (\d+)\. Capsules left: (\d+)\.$/);
    if (match) return `Charm catch · ${match[2]} · Cap ${match[4]}`;

    match = text.match(/^Something tugged the line in (.+)\.$/);
    if (match) return `Fishing · ${match[1]}`;

    match = text.match(/^Capture charm faded\. (.+) lashes out for (\d+)\. Capsules left: (\d+)\.$/);
    if (match) return `Charm spent · ${match[1]} hit ${match[2]}`;

    match = text.match(/^(.+) Final score: (\d+)\.$/);
    if (match) return `${match[1]} Score ${match[2]}`;

    match = text.match(/^A (.+) (.+) appeared on .+ Capsules left: (\d+)\.(?: Shiny Glint theme unlocked\.)?$/);
    if (match) return `${match[1]} ${match[2]} spotted · Cap ${match[3]}`;

    match = text.match(/^(.+) won, earned (\d+)c(?:, (?:and )?grew to Lv(\d+))?(?:, and recovered (\d+) HP)?\.$/);
    if (match) return `${match[1]} won · +${match[2]}c · Lv${match[3]}`;

    match = text.match(/^(.+) defeated (.+), earned (\d+)c(?:, and recovered (\d+) HP)?\.$/);
    if (match) return `${match[1]} beat ${match[2]} · +${match[3]}c`;

    match = text.match(/^(.+) hits (.+) for (\d+)\.$/);
    if (match) return `${match[1]} hit ${match[2]} · ${match[3]}`;

    match = text.match(/^(.+) knocked out (.+)\.$/);
    if (match) return `${match[2]} fainted`;

    match = text.match(/^Lead monster: (.+)\.$/);
    if (match) return `Lead: ${match[1]}`;

    match = text.match(/^(.+) was sent to storage\.$/);
    if (match) return `${match[1]} boxed`;

    match = text.match(/^(.+) joined your party from storage\.$/);
    if (match) return `${match[1]} withdrawn`;

    match = text.match(/^Swapped party (.+) with stored (.+)\.$/);
    if (match) return `${match[1]} ⇄ ${match[2]}`;

    match = text.match(/^You caught the (.+) (.+)! (?:.+ recovered \d+ HP\. )?Party (\d+)\. Capsules left: (\d+)\.$/);
    if (match) return `Caught ${match[2]} · Party ${match[3]} · Cap ${match[4]}`;

    match = text.match(/^Capture failed\. (.+) lashes out for (\d+)\. Capsules left: (\d+)\.$/);
    if (match) return `Missed catch · ${match[1]} hit ${match[2]} · Cap ${match[3]}`;

    match = text.match(/^Tall grass rustles on (.+)\.$/);
    if (match) return `Grass rustles · ${match[1]}`;

    match = text.match(/^You are on (.+)\. Stronger monsters live farther out\.$/);
    if (match) return `Route: ${match[1]}`;

    if (text === 'Thick trees block the route.') return 'Trees block the way';
    if (text === 'Water cuts off the path.') return 'Water blocks the way';

    return text;
  }

  function monsterTamerMessageDuration(message) {
    if (!message) return 2200;
    if (/Caught|spotted|Score|won|Party healed/.test(message)) return 3000;
    if (/In battle|Browse|Route:|Lead:/.test(message)) return 1800;
    return 2200;
  }

  function setMessage(text) {
    const summary = summarizeMonsterTamerMessage(text);
    if (!summary) return;

    const el = document.getElementById('mtMsg');
    if (el) el.textContent = summary;
  }

  function activeMonster() {
    return party[activeIndex] || null;
  }

  function badgeCount() {
    return badges.length;
  }

  function badgeKeyForProfile(profile) {
    return profile?.boss?.badge || '';
  }

  function hasBadge(profile) {
    const keyName = badgeKeyForProfile(profile);
    return !!(keyName && badges.includes(keyName));
  }

  function ensureMonsterState(monster) {
    if (!monster) return null;
    if (!monster.statusKey) monster.statusKey = '';
    if (!Number.isFinite(monster.statusTurns)) monster.statusTurns = 0;
    if (!Number.isFinite(monster.statusPotency)) monster.statusPotency = 0;
    return monster;
  }

  function clearMonsterStatus(monster) {
    ensureMonsterState(monster);
    monster.statusKey = '';
    monster.statusTurns = 0;
    monster.statusPotency = 0;
  }

  function statusShortLabel(monster) {
    ensureMonsterState(monster);
    if (!monster?.statusKey) return '';
    const meta = statusMeta[monster.statusKey];
    return meta ? meta.short : monster.statusKey;
  }

  function statusText(monster) {
    const short = statusShortLabel(monster);
    return short ? ` · ${short}` : '';
  }

  function setMonsterStatus(monster, effect) {
    ensureMonsterState(monster);
    if (!monster || !effect?.type) return false;
    monster.statusKey = effect.type;
    monster.statusTurns = Math.max(1, effect.turns || 1);
    monster.statusPotency = Math.max(1, effect.potency || 1);
    return true;
  }

  function effectLabel(effect) {
    if (!effect?.type) return '';
    const meta = statusMeta[effect.type];
    return meta ? meta.label : effect.type;
  }

  function typeKeyForMonster(monster) {
    return speciesTypesBySpecies[monster?.species || monster?.name] || 'stone';
  }

  function typeMetaForMonster(monster) {
    return typeMeta[typeKeyForMonster(monster)] || typeMeta.stone;
  }

  function typeLabelForMonster(monster) {
    return typeMetaForMonster(monster).label;
  }

  function typeShortForMonster(monster) {
    return typeMetaForMonster(monster).short;
  }

  function moveTypeKey(move, source) {
    return move?.type || typeKeyForMonster(source);
  }

  function moveTypeLabel(move, source) {
    return (typeMeta[moveTypeKey(move, source)] || typeMeta.stone).label;
  }

  function typeModifierForAttack(move, source, target) {
    const attackType = moveTypeKey(move, source);
    const defendType = typeKeyForMonster(target);
    return typeChart[attackType]?.[defendType] || 1;
  }

  function sameTypeAttackBonus(move, source) {
    return moveTypeKey(move, source) === typeKeyForMonster(source) ? 1.12 : 1;
  }

  function typeEffectText(multiplier) {
    if (multiplier >= 1.25) return ' It is super effective.';
    if (multiplier <= 0.86) return ' It is not very effective.';
    return '';
  }

  function moveDetailText(move) {
    if (!move) return '';
    const parts = [moveTypeLabel(move), `${Math.round((move.power || 1) * 100)}%`, `${((move.accuracy || 1) * 100) | 0}%`];
    if (move.effect) parts.push(effectLabel(move.effect));
    if (move.selfEffect) parts.push(`Self ${effectLabel(move.selfEffect)}`);
    if (move.healRatio) parts.push('Drain');
    return parts.join(' · ');
  }

  function passiveTraitForMonster(monster) {
    return passiveTraitsBySpecies[monster?.species] || null;
  }

  function passiveTraitText(monster) {
    const trait = passiveTraitForMonster(monster);
    return trait ? `${trait.name}: ${trait.description}` : 'No passive trait';
  }

  function passiveTraitShort(monster) {
    return passiveTraitForMonster(monster)?.name || 'No Trait';
  }

  function applyPassiveTurnStart(monster) {
    const trait = passiveTraitForMonster(monster);
    if (!trait || !trait.turnHeal || monster.hp <= 0 || monster.hp >= monster.maxHp) return '';
    const recovered = Math.min(trait.turnHeal, monster.maxHp - monster.hp);
    if (recovered <= 0) return '';
    monster.hp += recovered;
    return `${monster.name}'s ${trait.name} restored ${recovered} HP.`;
  }

  function passiveOutgoingBonus(source, target) {
    const trait = passiveTraitForMonster(source);
    if (!trait) return 0;
    let bonus = 0;
    if (trait.highHpBonus && source.hp > source.maxHp / 2) bonus += trait.highHpBonus;
    if (trait.statusHunter && target?.statusKey) bonus += trait.statusHunter;
    if (trait.enemyHealthyBonus && target && target.hp >= Math.ceil(target.maxHp * 0.7)) bonus += trait.enemyHealthyBonus;
    if (trait.levelHunter && target && target.level > source.level) bonus += trait.levelHunter;
    return bonus;
  }

  function passiveIncomingReduction(target) {
    return passiveTraitForMonster(target)?.incomingReduction || 0;
  }

  function passiveAfterHit(source, damage) {
    const trait = passiveTraitForMonster(source);
    if (!trait || !trait.healOnHit || damage <= 0 || source.hp <= 0 || source.hp >= source.maxHp) return '';
    const recovered = Math.min(trait.healOnHit, source.maxHp - source.hp);
    if (recovered <= 0) return '';
    source.hp += recovered;
    return `${source.name}'s ${trait.name} restored ${recovered} HP.`;
  }

  function joinBattleText(...parts) {
    return parts.filter(Boolean).join(' ');
  }

  function startTurnStatus(monster) {
    ensureMonsterState(monster);
    if (!monster || !monster.statusKey || monster.hp <= 0) {
      return { canAct: true, text: '', fainted: false };
    }

    if (monster.statusKey === 'burn') {
      const damage = Math.max(1, monster.statusPotency + Math.floor(monster.level / 4));
      monster.hp = Math.max(0, monster.hp - damage);
      monster.statusTurns = Math.max(0, monster.statusTurns - 1);
      const text = `${monster.name} is burned for ${damage}.`;
      if (monster.statusTurns <= 0 || monster.hp <= 0) clearMonsterStatus(monster);
      return { canAct: monster.hp > 0, text, fainted: monster.hp <= 0 };
    }

    if (monster.statusKey === 'regen') {
      const recovered = Math.min(monster.maxHp - monster.hp, monster.statusPotency + 1);
      if (recovered > 0) {
        monster.hp += recovered;
      }
      monster.statusTurns = Math.max(0, monster.statusTurns - 1);
      const text = recovered > 0 ? `${monster.name} recovered ${recovered} HP.` : '';
      if (monster.statusTurns <= 0) clearMonsterStatus(monster);
      return { canAct: true, text, fainted: false };
    }

    if (monster.statusKey === 'stun') {
      const blocked = Math.random() < Math.min(0.85, 0.45 + monster.statusPotency * 0.1);
      monster.statusTurns = Math.max(0, monster.statusTurns - 1);
      if (monster.statusTurns <= 0) clearMonsterStatus(monster);
      return {
        canAct: !blocked,
        text: blocked ? `${monster.name} is stunned and cannot move.` : `${monster.name} shook off the stun.`,
        fainted: false
      };
    }

    if (monster.statusKey === 'exposed') {
      monster.statusTurns = Math.max(0, monster.statusTurns - 1);
      const text = monster.statusTurns <= 0 ? `${monster.name} steadied its guard.` : '';
      if (monster.statusTurns <= 0) clearMonsterStatus(monster);
      return { canAct: true, text, fainted: false };
    }

    return { canAct: true, text: '', fainted: false };
  }

  function damageAgainstTarget(baseDamage, target, move, source) {
    ensureMonsterState(target);
    const exposedBonus = target?.statusKey === 'exposed' ? 1 + target.statusPotency : 0;
    const typedDamage = Math.round((baseDamage + exposedBonus) * sameTypeAttackBonus(move, source) * typeModifierForAttack(move, source, target));
    return Math.max(1, typedDamage);
  }

  function applyMoveEffects(source, target, move) {
    const messages = [];
    if (move?.effect && target && Math.random() <= (move.effect.chance || 1)) {
      if (setMonsterStatus(target, move.effect)) {
        messages.push(`${target.name} is afflicted with ${effectLabel(move.effect).toLowerCase()}.`);
      }
    }
    if (move?.selfEffect && source && Math.random() <= (move.selfEffect.chance || 1)) {
      if (setMonsterStatus(source, move.selfEffect)) {
        messages.push(`${source.name} gains ${effectLabel(move.selfEffect).toLowerCase()}.`);
      }
    }
    return messages;
  }

  function switchLeadToIndex(nextIndex) {
    if (!Number.isFinite(nextIndex) || nextIndex < 0 || nextIndex >= party.length || nextIndex === activeIndex) return false;
    if ((party[nextIndex]?.hp || 0) <= 0) return false;
    activeIndex = nextIndex;
    return true;
  }

  function switchMenuEntries() {
    return party
      .map((monster, index) => ({
        index,
        label: monsterDisplayName(monster),
        detail: `Lv${monster.level} · HP ${monster.hp}/${monster.maxHp}${statusText(monster)}`
      }))
      .filter(entry => entry.index !== activeIndex && party[entry.index]?.hp > 0);
  }

  function selectedStorageMonster(column = storageMenuColumn) {
    if (column === 'party') return party[storagePartySelection] || null;
    return storedMonsters[storageBoxSelection] || null;
  }

  function resetStorageMenuState() {
    storageMenuColumn = 'party';
    storagePartySelection = Math.max(0, Math.min(storagePartySelection, Math.max(0, party.length - 1)));
    storageBoxSelection = Math.max(0, Math.min(storageBoxSelection, Math.max(0, storedMonsters.length - 1)));
    storageSwapPending = null;
  }

  function openStorageMenu() {
    storageMenuOpen = true;
    indexMenuOpen = false;
    resetStorageMenuState();
    storageMenuColumn = storedMonsters.length ? 'storage' : 'party';
    setMessage('Storage Box opened. Swap active and stored monsters.');
    drawTamerWorld();
  }

  function closeStorageMenu(message = 'Back to town services.') {
    storageMenuOpen = false;
    resetStorageMenuState();
    if (message) setMessage(message);
    updateTamerUi();
    drawTamerWorld();
  }

  function moveStorageSelection(step) {
    if (!storageMenuOpen) return;

    if (storageMenuColumn === 'party') {
      if (!party.length) return;
      storagePartySelection = wrapIndex(storagePartySelection + step, party.length);
      setMessage(`${party[storagePartySelection]?.name || 'Party'} selected.`);
    } else {
      if (!storedMonsters.length) {
        setMessage('No stored monsters are available right now.');
        drawTamerWorld();
        return;
      }
      storageBoxSelection = wrapIndex(storageBoxSelection + step, storedMonsters.length);
      setMessage(`${storedMonsters[storageBoxSelection]?.name || 'Stored'} selected.`);
    }

    drawTamerWorld();
  }

  function swapPartyWithStorage(partyIndex, storageIndex) {
    if (partyIndex < 0 || storageIndex < 0 || partyIndex >= party.length || storageIndex >= storedMonsters.length) return false;
    const partyMonster = party[partyIndex];
    const storageMonster = storedMonsters[storageIndex];
    party[partyIndex] = storageMonster;
    storedMonsters[storageIndex] = partyMonster;
    if (activeIndex === partyIndex) activeIndex = partyIndex;
    return { partyName: partyMonster.name, storedName: storageMonster.name };
  }

  function handleStorageConfirm() {
    if (!storageMenuOpen) return;

    if (storageSwapPending) {
      if (storageSwapPending.source === 'party' && storageMenuColumn === 'storage' && storedMonsters.length) {
        const result = swapPartyWithStorage(storageSwapPending.index, storageBoxSelection);
        resetStorageMenuState();
        if (result) {
          setMessage(`Swapped party ${result.partyName} with stored ${result.storedName}.`);
          updateTamerUi();
        }
        drawTamerWorld();
        return;
      }

      if (storageSwapPending.source === 'storage' && storageMenuColumn === 'party' && party.length) {
        const result = swapPartyWithStorage(storagePartySelection, storageSwapPending.index);
        resetStorageMenuState();
        if (result) {
          setMessage(`Swapped party ${result.partyName} with stored ${result.storedName}.`);
          updateTamerUi();
        }
        drawTamerWorld();
        return;
      }
    }

    if (storageMenuColumn === 'party') {
      if (!party.length) return;
      if (!storedMonsters.length) {
        setMessage('No stored monsters are available right now.');
        drawTamerWorld();
        return;
      }
      storageSwapPending = { source: 'party', index: storagePartySelection };
      storageMenuColumn = 'storage';
      storageBoxSelection = Math.max(0, Math.min(storageBoxSelection, storedMonsters.length - 1));
      setMessage('Choose a boxed monster to swap in.');
      drawTamerWorld();
      return;
    }

    if (!storedMonsters.length) {
      setMessage('No stored monsters are available right now.');
      drawTamerWorld();
      return;
    }

    if (party.length < activePartyLimit) {
      const monster = storedMonsters.splice(storageBoxSelection, 1)[0];
      party.push(monster);
      storageBoxSelection = Math.max(0, Math.min(storageBoxSelection, storedMonsters.length - 1));
      setMessage(`${monsterDisplayName(monster)} joined your party from storage.`);
      updateTamerUi();
      drawTamerWorld();
      return;
    }

    storageSwapPending = { source: 'storage', index: storageBoxSelection };
    storageMenuColumn = 'party';
    storagePartySelection = Math.max(0, Math.min(storagePartySelection, party.length - 1));
    setMessage('Party is full. Choose a party monster to swap out.');
    drawTamerWorld();
  }

  function selectedPartyMonster() {
    return party[playerMenuSelection] || null;
  }

  function swapPartyMembers(firstIndex, secondIndex) {
    if (firstIndex === secondIndex) return false;
    if (firstIndex < 0 || secondIndex < 0 || firstIndex >= party.length || secondIndex >= party.length) return false;

    [party[firstIndex], party[secondIndex]] = [party[secondIndex], party[firstIndex]];

    if (activeIndex === firstIndex) {
      activeIndex = secondIndex;
    } else if (activeIndex === secondIndex) {
      activeIndex = firstIndex;
    }

    return true;
  }

  function usePotionOnMonster(monster) {
    if (!monster) return 'No monster selected.';
    if (tonics <= 0) return 'You are out of tonics.';
    if (monster.hp >= monster.maxHp) return `${monsterDisplayName(monster)} is already at full HP.`;
    tonics -= 1;
    monster.hp = Math.min(monster.maxHp, monster.hp + tonicHealAmount);
    return `${monsterDisplayName(monster)} recovered with a tonic.`;
  }

  function playerMenuActions(monster = selectedPartyMonster()) {
    if (!monster) {
      return [{ key: 'close', label: 'Close', detail: 'Return to play' }];
    }

    return [
      { key: 'lead', label: activeIndex === playerMenuSelection ? 'Lead Ready' : 'Set As Lead', detail: activeIndex === playerMenuSelection ? 'Already leading' : 'Make first battler' },
      { key: 'swap', label: 'Swap Position', detail: party.length > 1 ? 'Reorder party slots' : 'Need another monster' },
      { key: 'tonic', label: `Use Tonic x${tonics}`, detail: `Heal ${tonicHealAmount} HP` },
      { key: 'close', label: 'Close', detail: 'Return to play' }
    ];
  }

  function openPlayerMenu() {
    if (gameOver || encounterTransition || battleAnimation || fishingAnimation || battleTarget) return false;
    playerMenuOpen = true;
    playerMenuMode = 'party';
    playerMenuSelection = Math.max(0, Math.min(activeIndex, Math.max(0, party.length - 1)));
    playerMenuActionSelection = 0;
    playerMenuSwapSelection = Math.max(0, Math.min(playerMenuSelection, Math.max(0, party.length - 1)));
    setMessage('Party menu opened. Check stats, move partners, or use items.');
    updateTamerUi();
    drawTamerWorld();
    return true;
  }

  function closePlayerMenu(message = 'Closed the party menu.') {
    playerMenuOpen = false;
    playerMenuMode = 'party';
    playerMenuActionSelection = 0;
    playerMenuSwapSelection = 0;
    if (message) setMessage(message);
    updateTamerUi();
    drawTamerWorld();
  }

  function movePlayerMenuSelection(step) {
    if (!playerMenuOpen) return;

    if (playerMenuMode === 'party') {
      if (!party.length) return;
      playerMenuSelection = wrapIndex(playerMenuSelection + step, party.length);
      setMessage(`${monsterDisplayName(selectedPartyMonster()) || 'Party'} selected.`);
    } else if (playerMenuMode === 'actions') {
      const actions = playerMenuActions();
      playerMenuActionSelection = wrapIndex(playerMenuActionSelection + step, actions.length);
      setMessage(`${actions[playerMenuActionSelection]?.label || 'Action'} selected.`);
    } else if (playerMenuMode === 'swap') {
      if (party.length <= 1) return;
      playerMenuSwapSelection = wrapIndex(playerMenuSwapSelection + step, party.length);
      setMessage(`${monsterDisplayName(party[playerMenuSwapSelection]) || 'Partner'} selected.`);
    }

    drawTamerWorld();
  }

  function handlePlayerMenuConfirm() {
    if (!playerMenuOpen) return;

    const monster = selectedPartyMonster();
    if (!monster) {
      closePlayerMenu();
      return;
    }

    if (playerMenuMode === 'party') {
      playerMenuMode = 'actions';
      playerMenuActionSelection = 0;
      setMessage('Choose a party action.');
      drawTamerWorld();
      return;
    }

    if (playerMenuMode === 'swap') {
      if (playerMenuSwapSelection === playerMenuSelection) {
        setMessage('Choose a different partner to swap with.');
        drawTamerWorld();
        return;
      }
      if (swapPartyMembers(playerMenuSelection, playerMenuSwapSelection)) {
        const movedMonster = party[playerMenuSwapSelection];
        playerMenuSelection = playerMenuSwapSelection;
        playerMenuMode = 'party';
        playerMenuActionSelection = 0;
        setMessage(`${movedMonster?.name || 'Party'} moved to slot ${playerMenuSelection + 1}.`);
        updateTamerUi();
        drawTamerWorld();
      }
      return;
    }

    const action = playerMenuActions(monster)[playerMenuActionSelection];
    if (!action) return;

    if (action.key === 'lead') {
      activeIndex = playerMenuSelection;
      playerMenuMode = 'party';
      setMessage(`Lead monster: ${monsterDisplayName(activeMonster() || monster)}.`);
      updateTamerUi();
      drawTamerWorld();
      return;
    }

    if (action.key === 'swap') {
      if (party.length <= 1) {
        setMessage('Only one partner is in your party right now.');
        drawTamerWorld();
        return;
      }
      playerMenuMode = 'swap';
      playerMenuSwapSelection = wrapIndex(playerMenuSelection + 1, party.length);
      setMessage('Choose a partner to swap positions with.');
      drawTamerWorld();
      return;
    }

    if (action.key === 'tonic') {
      const result = usePotionOnMonster(monster);
      playerMenuMode = 'party';
      setMessage(result);
      updateTamerUi();
      drawTamerWorld();
      return;
    }

    if (action.key === 'close') {
      closePlayerMenu();
    }
  }

  function handlePlayerMenuBack() {
    if (!playerMenuOpen) return false;
    if (playerMenuMode === 'swap' || playerMenuMode === 'actions') {
      playerMenuMode = 'party';
      playerMenuActionSelection = 0;
      setMessage('Back to your party list.');
      drawTamerWorld();
      return true;
    }
    closePlayerMenu();
    return true;
  }

  function maybeEvolveMonster(monster) {
    ensureMonsterState(monster);
    const rule = evolutionData[monster?.species];
    if (!rule || monster.level < rule.minLevel || badgeCount() < rule.minBadges) return '';
    const evolvedSpecies = speciesByName[rule.evolvesTo];
    if (!evolvedSpecies) return '';

    const previousName = monster.name;
    const hpRatio = monster.maxHp > 0 ? monster.hp / monster.maxHp : 1;
    monster.species = evolvedSpecies.name;
    monster.name = evolvedSpecies.name;
    monster.color = evolvedSpecies.color;
    monster.accent = evolvedSpecies.accent;
    monster.sprite = evolvedSpecies.sprite;
    monster.catchBase = evolvedSpecies.catchBase;
    monster.maxHp = Math.max(monster.maxHp + 4, evolvedSpecies.hp + monster.level + 2);
    monster.atkMin = Math.max(monster.atkMin + 1, evolvedSpecies.atkMin + Math.floor((monster.level - 1) / 2));
    monster.atkMax = Math.max(monster.atkMax + 1, evolvedSpecies.atkMax + Math.floor(monster.level / 2));
    monster.hp = Math.max(1, Math.min(monster.maxHp, Math.round(monster.maxHp * Math.max(0.45, hpRatio))));
    clearMonsterStatus(monster);
    return `${previousName} evolved into ${monster.name}!`;
  }

  function maybeEvolveParty() {
    return party.map(monster => maybeEvolveMonster(monster)).filter(Boolean);
  }

  function bossStateForTown(town = activeTownship || getTownshipAt()) {
    const boss = town?.profile?.boss;
    if (!boss) {
      return { ready: false, cleared: true, short: 'None', message: 'No boss battle is set for this town.' };
    }

    if (hasBadge(town.profile)) {
      return { ready: false, cleared: true, short: 'Won', message: `${boss.badge} Badge already earned here.` };
    }

    const needs = [];
    if (badgeCount() < (boss.requiredBadges || 0)) needs.push(`${boss.requiredBadges - badgeCount()} badge${boss.requiredBadges - badgeCount() === 1 ? '' : 's'}`);
    if (captures < (boss.minCaptures || 0)) needs.push(`${boss.minCaptures - captures} capture${boss.minCaptures - captures === 1 ? '' : 's'}`);
    if (defeated < (boss.minDefeated || 0)) needs.push(`${boss.minDefeated - defeated} win${boss.minDefeated - defeated === 1 ? '' : 's'}`);
    if ((activeMonster()?.level || 0) < (boss.minLeadLevel || 1)) needs.push(`lead Lv${boss.minLeadLevel}`);
    if (needs.length) {
      return { ready: false, cleared: false, short: 'Locked', message: `Need ${needs.join(', ')} before ${boss.trainer} can be challenged.` };
    }

    return { ready: true, cleared: false, short: 'Ready', message: `${boss.trainer} is ready. Win the ${boss.badge} Badge.` };
  }

  function createBossMonster(town) {
    const boss = town?.profile?.boss;
    const species = speciesByName[boss?.species] || speciesList[0];
    const strongest = highestPartyLevel();
    const average = averagePartyLevel();
    const baseLevel = Math.max(boss?.minLeadLevel || 4, regionLevel(town.x, town.y) + (boss?.levelBonus || 0));
    const scaledLevel = Math.max(baseLevel, Math.ceil(average + 2), Math.ceil(strongest * 0.72));
    const level = Math.min(72, scaledLevel);
    const monster = {
      ...cloneMonster(species, level),
      id: `mt-boss-${town.key}`,
      x: town.x,
      y: town.y,
      route: town.name,
      rarity: 'legendary',
      ephemeral: true,
      isBoss: true,
      trainerName: boss.trainer,
      badgeName: boss.badge,
      bossRewardCoins: boss.rewardCoins || 0,
      bossMove: {
        name: `${boss.badge} Burst`,
        power: 1.45,
        accuracy: 0.88,
        effect: ['Fern Trail'].includes(town.profile.label) ? null : { type: ['Dusk Hollow', 'Thunder Ridge'].includes(town.profile.label) ? 'stun' : town.profile.label === 'Wild Crown' ? 'burn' : 'exposed', turns: 2, potency: 1, chance: 0.65 },
        selfEffect: ['Fern Trail'].includes(town.profile.label) ? { type: 'regen', turns: 2, potency: 2, chance: 1 } : null
      }
    };
    monster.maxHp += 16 + routeProfiles.indexOf(town.profile) * 5 + Math.floor(strongest * 0.8);
    monster.hp = monster.maxHp;
    monster.atkMin += 2 + Math.floor(routeProfiles.indexOf(town.profile) / 2) + Math.floor(strongest / 8);
    monster.atkMax += 3 + Math.floor(routeProfiles.indexOf(town.profile) / 2) + Math.floor(strongest / 7);
    return monster;
  }

  function startBossBattle() {
    const town = activeTownship || getTownshipAt();
    const state = bossStateForTown(town);
    if (state.cleared || !town?.profile?.boss) {
      setMessage(state.message);
      drawTamerWorld();
      return;
    }
    if (!state.ready) {
      setMessage(state.message);
      drawTamerWorld();
      return;
    }
    townMenuOpen = false;
    indexMenuOpen = false;
    beginBattle(createBossMonster(town));
  }

  function currentTownSelectionDetail() {
    if (!townMenuOpen || indexMenuOpen) return '';
    const choice = shopItems[townSelection];
    if (!choice) return '';
    if (choice.key === 'storage') return `Storage holds ${storedMonsters.length} monster${storedMonsters.length === 1 ? '' : 's'}. Active party ${party.length}/${activePartyLimit}.`;
    if (choice.key !== 'boss') return `${choice.label} selected.`;

    const bossState = bossStateForTown(activeTownship || getTownshipAt());
    if (bossState.cleared) return bossState.message;
    if (bossState.ready) return `${activeTownship?.profile?.boss?.trainer || 'Town boss'} is ready. Win the ${activeTownship?.profile?.boss?.badge || 'town'} Badge.`;
    return bossState.message;
  }

  function fitTownFooterText(text, maxLength = 44) {
    if (!text) return '';
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
  }

  function resetBattleMenu() {
    battleMenuMode = 'root';
    battleMenuSelection = 0;
    battleSubSelection = 0;
  }

  function isTownTile(x = player.x, y = player.y) {
    return !!getTownshipAt(x, y);
  }

  function cloneMonster(species, level = 1) {
    return {
      species: species.name,
      name: species.name,
      color: species.color,
      accent: species.accent,
      shiny: false,
      sprite: species.sprite,
      level,
      xp: 0,
      xpToNext: 5 + level * 4,
      maxHp: species.hp + level,
      hp: species.hp + level,
      atkMin: species.atkMin + Math.floor((level - 1) / 2),
      atkMax: species.atkMax + Math.floor(level / 2),
      catchBase: species.catchBase,
      statusKey: '',
      statusTurns: 0,
      statusPotency: 0
    };
  }

  const signatureMovesBySpecies = {
    'Ember Pup': { name: 'Cinder Dash', power: 1.2, accuracy: 0.9, effect: { type: 'burn', turns: 2, potency: 1, chance: 0.55 } },
    'Mossling': { name: 'Sap Sip', power: 0.8, accuracy: 0.95, healRatio: 0.45, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.8 } },
    'Volt Finch': { name: 'Bolt Dive', power: 1.35, accuracy: 0.82, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.5 } },
    'Gloom Bat': { name: 'Night Siphon', power: 0.9, accuracy: 0.93, healRatio: 0.35, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.55 } },
    'Tide Cub': { name: 'Wave Crash', power: 1.15, accuracy: 0.92, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.65 } },
    'Petal Lynx': { name: 'Bloom Slash', power: 1.25, accuracy: 0.88, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.55 } },
    'Brookfin': { name: 'Current Snap', power: 1.15, accuracy: 0.92, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.5 } },
    'Cinder Moth': { name: 'Ash Flutter', power: 1.1, accuracy: 0.93, effect: { type: 'burn', turns: 2, potency: 1, chance: 0.42 } },
    'Bramble Hog': { name: 'Thorn Rush', power: 1.15, accuracy: 0.91, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.46 } },
    'Marsh Mite': { name: 'Bog Bubble', power: 0.95, accuracy: 0.96, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.28 } },
    'Quartz Beetle': { name: 'Prism Shell', type: 'volt', power: 1.05, accuracy: 0.94, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.55 } },
    'Gale Antler': { name: 'Wind Rack', power: 1.2, accuracy: 0.9, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.38 } },
    'Ripple Fry': { name: 'Bubble Pop', power: 0.95, accuracy: 0.96, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.3 } },
    'Pebble Koi': { name: 'Stone Spray', power: 1.05, accuracy: 0.94, effect: { type: 'exposed', turns: 2, potency: 1, chance: 0.45 } },
    'Tangle Crab': { name: 'Clamp Crush', power: 1.25, accuracy: 0.87, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.35 } },
    'Lantern Eel': { name: 'Flash Surge', power: 1.3, accuracy: 0.84, effect: { type: 'burn', turns: 2, potency: 1, chance: 0.4 } },
    'Storm Ray': { name: 'Tempest Arc', power: 1.4, accuracy: 0.8, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.55 } },
    'Mire Owl': { name: 'Dusk Cry', type: 'gale', power: 1.1, accuracy: 0.92, effect: { type: 'burn', turns: 2, potency: 1, chance: 0.4 } },
    'Static Ram': { name: 'Thunder Rush', power: 1.35, accuracy: 0.83, effect: { type: 'stun', turns: 1, potency: 1, chance: 0.5 } },
    'Crownwyrm': { name: 'Royal Flame', power: 1.45, accuracy: 0.79, effect: { type: 'burn', turns: 3, potency: 1, chance: 0.6 } },
    'Bloom Seraph': { name: 'Halo Bloom', power: 1.38, accuracy: 0.87, selfEffect: { type: 'regen', turns: 3, potency: 2, chance: 0.9 } },
    'Abyss Pike': { name: 'Undertow Lance', power: 1.4, accuracy: 0.86, effect: { type: 'exposed', turns: 3, potency: 1, chance: 0.72 } },
    'Hollow Hydra': { name: 'Grave Torrent', power: 1.42, accuracy: 0.84, effect: { type: 'burn', turns: 2, potency: 2, chance: 0.58 } },
    'Sun Stag': { name: 'Solar Charge', type: 'flame', power: 1.46, accuracy: 0.83, effect: { type: 'stun', turns: 1, potency: 2, chance: 0.6 } },
    'Ember Hound': { name: 'Blaze Charge', power: 1.35, accuracy: 0.9, effect: { type: 'burn', turns: 2, potency: 2, chance: 0.65 } },
    'Moss Guardian': { name: 'Verdant Ward', power: 0.95, accuracy: 0.94, selfEffect: { type: 'regen', turns: 3, potency: 2, chance: 1 } },
    'Volt Talon': { name: 'Storm Talon', power: 1.45, accuracy: 0.84, effect: { type: 'stun', turns: 1, potency: 2, chance: 0.6 } },
    'Dread Bat': { name: 'Nocturne Fang', power: 1.15, accuracy: 0.92, healRatio: 0.45, effect: { type: 'exposed', turns: 2, potency: 2, chance: 0.7 } },
    Riverclaw: { name: 'Riptide Crush', power: 1.3, accuracy: 0.91, effect: { type: 'exposed', turns: 3, potency: 1, chance: 0.75 } },
    'Rose Lynx': { name: 'Petal Storm', power: 1.4, accuracy: 0.89, selfEffect: { type: 'regen', turns: 2, potency: 2, chance: 0.8 } }
  };

  function attacksForMonster(monster) {
    if (!monster) return [];

    const basicName = {
      'Ember Pup': 'Paw Swipe',
      'Mossling': 'Vine Tap',
      'Volt Finch': 'Quick Peck',
      'Gloom Bat': 'Wing Flick',
      'Tide Cub': 'Splash Bite',
      'Petal Lynx': 'Petal Claw',
      'Brookfin': 'Fin Jab',
      'Cinder Moth': 'Wing Ember',
      'Bramble Hog': 'Bramble Nudge',
      'Marsh Mite': 'Mud Nip',
      'Quartz Beetle': 'Carapace Tap',
      'Gale Antler': 'Hoof Slice',
      'Ripple Fry': 'Tail Flick',
      'Pebble Koi': 'Koi Bump',
      'Tangle Crab': 'Pinch',
      'Lantern Eel': 'Spark Nip',
      'Storm Ray': 'Glide Cut',
      'Mire Owl': 'Shadow Peck',
      'Static Ram': 'Horn Jab',
      'Crownwyrm': 'Scale Strike',
      'Bloom Seraph': 'Petal Lance',
      'Abyss Pike': 'Deep Bite',
      'Hollow Hydra': 'Night Snap',
      'Sun Stag': 'Radiant Kick'
    }[monster.species] || 'Strike';

    const nativeType = typeKeyForMonster(monster);
    const moves = [
      { name: basicName, power: 1, accuracy: 0.96, type: nativeType },
      { type: nativeType, ...(signatureMovesBySpecies[monster.species] || { name: 'Wild Burst', power: 1.2, accuracy: 0.9 }) },
      { type: nativeType, ...(thirdMovesBySpecies[monster.species] || { name: 'Second Wind', power: 1.02, accuracy: 0.94, selfEffect: { type: 'regen', turns: 2, potency: 1, chance: 0.5 } }) }
    ];
    if (monster.bossMove) {
      moves.push({ type: nativeType, ...monster.bossMove });
    }
    return moves.map(move => ({ ...move, detail: move.detail || moveDetailText(move) }));
  }

  function battleItemsForPlayer() {
    const items = [];
    if (tonics > 0) {
      items.push({ key: 'tonic', label: `Tonic x${tonics}`, detail: `Heal ${tonicHealAmount} HP` });
    }
    return items;
  }

  function currentBattleMenuEntries() {
    if (battleMenuMode === 'attack') {
      return attacksForMonster(activeMonster());
    }
    if (battleMenuMode === 'item') {
      return battleItemsForPlayer();
    }
    if (battleMenuMode === 'switch') {
      return switchMenuEntries();
    }
    return battleRootOptions;
  }

  function moveBattleSelection(step) {
    const entries = currentBattleMenuEntries();
    if (!entries.length) return;
    if (battleMenuMode === 'root') {
      battleMenuSelection = wrapIndex(battleMenuSelection + step, entries.length);
      setMessage(`${entries[battleMenuSelection].label} selected.`);
    } else {
      battleSubSelection = wrapIndex(battleSubSelection + step, entries.length);
      setMessage(`${entries[battleSubSelection].name || entries[battleSubSelection].label} selected.`);
    }
    drawTamerWorld();
  }

  function easeRetaliationDamage(baseDamage, x = player.x, y = player.y) {
    const relief = earlyGameRelief(x, y);
    const reduction = relief >= 0.82 ? 2 : relief >= 0.45 ? 1 : 0;
    return Math.max(1, baseDamage - reduction);
  }

  function recoverLeadAfterEncounter(baseAmount = 2, x = player.x, y = player.y) {
    const lead = activeMonster();
    if (!lead || lead.hp <= 0) return 0;
    const amount = Math.max(0, Math.round(baseAmount + earlyGameRelief(x, y) * 2));
    if (amount <= 0) return 0;
    const recovered = Math.min(amount, lead.maxHp - lead.hp);
    lead.hp += recovered;
    return recovered;
  }

  function saveMonsterDex() {
    localStorage.setItem(dexKey, JSON.stringify(monsterDex));
  }

  function recordDexEntry(monster, status = 'seen') {
    if (!monster || !monster.species) return;
    const existing = monsterDex[monster.species] || { seen: false, caught: false, routes: [] };
    existing.seen = existing.seen || status === 'seen' || status === 'caught';
    existing.caught = existing.caught || status === 'caught';
    const route = monster.route || routeLabelAt(monster.x, monster.y);
    if (route && route !== 'Town' && !existing.routes.includes(route)) {
      existing.routes.push(route);
      existing.routes.sort((a, b) => routeSortIndex(a) - routeSortIndex(b));
    }
    monsterDex[monster.species] = existing;
    saveMonsterDex();
  }

  function updateHighScore() {
    const score = currentScore();
    if (score > highScore) {
      highScore = score;
      setHighScore(gameKey, highScore);
    }
  }

  function updateTamerUi() {
    const lead = activeMonster();
    const leadEl = document.getElementById('mtLead');
    const hpEl = document.getElementById('mtPartyHp');
    const caughtEl = document.getElementById('mtCaught');
    const badgeEl = document.getElementById('mtBadges');
    const capsuleEl = document.getElementById('mtCapsules');
    const tonicEl = document.getElementById('mtTonics');
    const rodEl = document.getElementById('mtRods');
    const coinEl = document.getElementById('mtCoins');
    const charmEl = document.getElementById('mtCharm');
    const scoreEl = document.getElementById('mtScore');
    const highEl = document.getElementById('mtHigh');
    if (leadEl) leadEl.textContent = lead ? `Lead: ${monsterDisplayName(lead)} Lv${lead.level}${statusText(lead)}` : 'Lead: None';
    if (hpEl) hpEl.textContent = lead ? `HP: ${lead.hp}/${lead.maxHp} XP:${lead.xp}/${lead.xpToNext}` : 'HP: 0/0';
    if (caughtEl) caughtEl.textContent = `Caught: ${captures} Party:${party.length}`;
    if (badgeEl) badgeEl.textContent = `Badges: ${badgeCount()}/${routeProfiles.length}`;
    if (capsuleEl) capsuleEl.textContent = `Capsules: ${capsules}`;
    if (tonicEl) tonicEl.textContent = `Tonics: ${tonics}/${maxTonics}`;
    if (rodEl) rodEl.textContent = `Rods: ${rods}/${maxRods}`;
    if (coinEl) coinEl.textContent = `Coins: ${coins}`;
    if (charmEl) charmEl.textContent = `Charms: ${charms}`;
    if (scoreEl) scoreEl.textContent = `Score: ${currentScore()}`;
    if (highEl) highEl.textContent = `High: ${highScore}`;
  }

  function terrainAt(x, y) {
    const town = getTownshipAt(x, y);
    if (town) {
      return (town.x === x && town.y === y) ? 'shop' : 'town';
    }

    return baseTerrainAt(x, y);
  }

  function isBlocked(x, y) {
    const terrain = terrainAt(x, y);
    return terrain === 'tree' || terrain === 'water';
  }

  function getRelevantChunks(radius = chunkRadius) {
    const cx = Math.floor(player.x / chunkSize);
    const cy = Math.floor(player.y / chunkSize);
    const relevant = [];
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        relevant.push(getChunk(x, y));
      }
    }
    return relevant;
  }

  function getMonsterAt(x, y) {
    for (const chunk of getRelevantChunks()) {
      const found = chunk.monsters.find(monster => monster.x === x && monster.y === y);
      if (found) return found;
    }
    return null;
  }

  function getLootAt(x, y) {
    for (const chunk of getRelevantChunks()) {
      const found = (chunk.loot || []).find(item => item.x === x && item.y === y);
      if (found) return found;
    }
    return null;
  }

  function adjacentWaterTile(x = player.x, y = player.y) {
    return [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
      .find(tilePos => terrainAt(tilePos.x, tilePos.y) === 'water') || null;
  }

  function firstHealthyMonsterIndex() {
    return party.findIndex(monster => monster.hp > 0);
  }

  function chooseEncounter(x, y, seedOffset = 0) {
    const profile = routeProfileAt(x, y);
    const specials = (profile.specials || []).filter(entry => {
      const terrain = terrainAt(x, y);
      if (entry.terrain && entry.terrain !== terrain) return false;
      if ((entry.minSteps || 0) > steps) return false;
      if ((entry.minCaptures || 0) > captures) return false;
      if ((entry.minDefeated || 0) > defeated) return false;
      return true;
    });

    if (specials.length) {
      const specialRoll = Math.random();
      const pickedSpecial = specials.find(entry => specialRoll < entry.chance);
      if (pickedSpecial) {
        return {
          profile,
          rarity: pickedSpecial.rarity,
          species: speciesByName[pickedSpecial.species] || speciesList[0]
        };
      }
    }

    const totalWeight = profile.pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    let picked = profile.pool[0];
    for (const entry of profile.pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        picked = entry;
        break;
      }
    }
    return {
      profile,
      rarity: picked.rarity,
      species: speciesByName[picked.species] || speciesList[0]
    };
  }

  function chooseFishingEncounter(x, y, seedOffset = 0) {
    const profile = routeProfileAt(x, y);
    const specials = (profile.fishSpecials || []).filter(entry => {
      if ((entry.minSteps || 0) > steps) return false;
      if ((entry.minCaptures || 0) > captures) return false;
      if ((entry.minDefeated || 0) > defeated) return false;
      return true;
    });

    if (specials.length) {
      const specialRoll = Math.random();
      const pickedSpecial = specials.find(entry => specialRoll < entry.chance);
      if (pickedSpecial) {
        return {
          profile,
          rarity: pickedSpecial.rarity,
          species: speciesByName[pickedSpecial.species] || speciesList[0]
        };
      }
    }

    const pool = profile.fishPool || [];
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * Math.max(1, totalWeight);
    let picked = pool[0] || { species: 'Ripple Fry', rarity: 'common', weight: 1 };
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        picked = entry;
        break;
      }
    }
    return {
      profile,
      rarity: picked.rarity,
      species: speciesByName[picked.species] || speciesList[0]
    };
  }

  function regionLevel(x, y) {
    return Math.min(12, 1 + Math.floor((Math.abs(x) + Math.abs(y)) / 18));
  }

  function createWildMonster(x, y, bonusLevel = 0, seedOffset = 0) {
    const encounter = chooseEncounter(x, y, seedOffset);
    const rarity = rarityMeta[encounter.rarity] || rarityMeta.common;
    const species = encounter.species;
    const relief = earlyGameRelief(x, y);
    const baseLevel = Math.min(16, regionLevel(x, y) + bonusLevel + rarity.levelBonus + (hashValue(x + seedOffset, y - seedOffset, 37 + seedOffset * 5) > 0.82 ? 1 : 0));
    const level = Math.max(1, baseLevel - (relief >= 0.52 ? 1 : 0));
    encounterRollCounter += 1;
    const monster = {
      id: `mt-${encounterRollCounter}-${Date.now()}-${x}-${y}`,
      x,
      y,
      ...cloneMonster(species, level),
      shiny: rollEncounterShiny(),
      rarity: encounter.rarity,
      route: encounter.profile.label,
      roamBias: Math.floor(hashValue(x, y, 43 + seedOffset * 3) * 4)
    };
    monster.catchBase = Math.min(0.9, Math.max(0.2, monster.catchBase + rarity.catchAdjust + relief * 0.16));
    return monster;
  }

  function createFishingMonster(x, y) {
    const encounter = chooseFishingEncounter(x, y, steps + captures + defeated);
    const rarity = rarityMeta[encounter.rarity] || rarityMeta.common;
    const species = encounter.species;
    const level = Math.min(14, regionLevel(x, y) + rarity.levelBonus + (hashValue(x, y, 521) > 0.72 ? 1 : 0));
    const monster = {
      id: `mt-fish-${Math.floor(hashValue(x, y, 523) * 1000000)}-${x}-${y}`,
      x,
      y,
      ...cloneMonster(species, level),
      shiny: rollEncounterShiny(),
      rarity: encounter.rarity,
      route: `${encounter.profile.label} Waters`,
      ephemeral: true,
      fromFishing: true
    };
    monster.catchBase = Math.max(0.1, monster.catchBase + rarity.catchAdjust - 0.03);
    return monster;
  }

  function trainerTeamPoolForProfile(profile) {
    const poolSpecies = [
      ...(profile.pool || []).map(entry => entry.species),
      ...(profile.fishPool || []).map(entry => entry.species),
      ...(profile.specials || []).map(entry => entry.species),
      ...(profile.fishSpecials || []).map(entry => entry.species)
    ];
    return [...new Set(poolSpecies)].filter(name => speciesByName[name]);
  }

  function createRouteTrainer(x, y, seedOffset = 0) {
    const profile = routeProfileAt(x, y);
    const profileIndex = Math.max(0, routeProfiles.indexOf(profile));
    const namePool = routeTrainerNames[profile.label] || ['Ari', 'Tess', 'Milo', 'Rune'];
    const trainerName = `${routeTrainerTitles[Math.floor(hashValue(x, y, 571 + seedOffset) * routeTrainerTitles.length)]} ${namePool[Math.floor(hashValue(x, y, 577 + seedOffset) * namePool.length)]}`;
    const teamPool = trainerTeamPoolForProfile(profile);
    const teamSize = Math.min(3, 1 + Math.floor(profileIndex / 2) + (hashValue(x, y, 583 + seedOffset) > 0.72 ? 1 : 0));
    const team = [];

    for (let index = 0; index < teamSize; index++) {
      const speciesName = teamPool[Math.floor(hashValue(x, y, 589 + seedOffset * 3 + index) * teamPool.length)] || profile.pool[0]?.species || speciesList[0].name;
      const species = speciesByName[speciesName] || speciesList[0];
      const level = Math.min(14, Math.max(2, regionLevel(x, y) + (index === 0 ? 1 : 0) + Math.floor(hashValue(x, y, 601 + index + seedOffset) * 2)));
      team.push({
        ...cloneMonster(species, level),
        shiny: false,
        rarity: index === 0 ? 'rare' : 'uncommon',
        route: profile.label,
        trainerRewardCoins: 14 + profileIndex * 9
      });
    }

    const [leadMonster, ...reserve] = team;
    return {
      id: `mt-trainer-${x}-${y}-${seedOffset}`,
      x,
      y,
      ...leadMonster,
      isTrainer: true,
      trainerName,
      trainerReserve: reserve,
      trainerPalette: {
        '1': '#5d6f4d',
        '2': '#f0e0c3',
        '3': '#8aa665',
        '4': '#4e5a70',
        '5': '#704f7d'
      }
    };
  }

  function createLandmarkLoot(x, y, seedOffset = 0) {
    const profile = routeProfileAt(x, y);
    const tier = lootTierAt(x, y);
    const bonusRoll = hashValue(x, y, 127 + seedOffset * 19);
    const themedRewards = {
      signpost: { kind: 'coins', label: 'trail cache', amount: 7 + tier * 4 + Math.floor(bonusRoll * (4 + tier * 2)) },
      fern: { kind: 'party-heal', label: 'herb satchel', amount: 8 + tier * 3 + Math.floor(bonusRoll * (3 + tier * 2)) },
      reeds: { kind: 'capsule', label: 'drift crate', amount: 1 + (tier >= 2 ? 1 : 0) },
      obelisk: { kind: 'charm', label: 'dusk relic', amount: 1 },
      teslapost: { kind: bonusRoll > 0.45 ? 'charm' : 'capsule', label: 'storm battery', amount: bonusRoll > 0.45 ? 1 : 1 + (tier >= 3 ? 1 : 0) },
      crowntree: { kind: bonusRoll > 0.38 ? 'charm' : 'party-heal', label: 'crown stash', amount: bonusRoll > 0.38 ? 1 : 12 + tier * 4 + Math.floor(bonusRoll * (4 + tier * 2)) }
    };
    const reward = themedRewards[profile.landmark] || themedRewards.signpost;
    return {
      id: `loot-landmark-${x}-${y}`,
      x,
      y,
      type: 'landmark-cache',
      rewardType: reward.kind,
      label: reward.label,
      amount: reward.amount,
      profileKey: profile.landmark
    };
  }

  function createWorldLoot(x, y, seedOffset = 0) {
    const tier = lootTierAt(x, y);
    const primaryRoll = hashValue(x, y, 89 + seedOffset * 17);
    const bonusRoll = hashValue(x, y, 97 + seedOffset * 17);

    if (tier >= 3 && primaryRoll > 0.965) {
      return {
        id: `loot-charm-${x}-${y}`,
        x,
        y,
        type: 'charm',
        amount: 1
      };
    }

    if (primaryRoll < Math.max(0.42 - tier * 0.05, 0.2)) {
      return {
        id: `loot-coins-${x}-${y}`,
        x,
        y,
        type: 'coins',
        amount: 4 + tier * 3 + Math.floor(bonusRoll * (4 + tier * 2))
      };
    }

    if (primaryRoll < Math.max(0.72 - tier * 0.02, 0.56)) {
      return {
        id: `loot-capsule-${x}-${y}`,
        x,
        y,
        type: 'capsule',
        amount: 1 + (tier >= 3 && bonusRoll > 0.74 ? 1 : 0)
      };
    }

    return {
      id: `loot-tonic-${x}-${y}`,
      x,
      y,
      type: 'tonic',
      amount: 1
    };
  }

  function getChunk(cx, cy) {
    const id = chunkKey(cx, cy);
    if (!chunks.has(id)) {
      const chunk = { cx, cy, monsters: [], loot: [] };
      const attempts = 1 + Math.floor(hashValue(cx, cy, 47) * 3);
      const occupied = new Set();
      for (let i = 0; i < attempts; i++) {
        const mx = cx * chunkSize + Math.floor(hashValue(cx, cy, 53 + i) * chunkSize);
        const my = cy * chunkSize + Math.floor(hashValue(cx, cy, 61 + i) * chunkSize);
        if (Math.abs(mx) + Math.abs(my) < 7) continue;
        if (occupied.has(key(mx, my))) continue;
        const terrain = terrainAt(mx, my);
        if (terrain !== 'grass' && terrain !== 'plain') continue;
        occupied.add(key(mx, my));
        chunk.monsters.push(createWildMonster(mx, my, i % 2, (cx + 11) * 17 + (cy + 13) * 23 + i * 5));
      }

      if (distanceFromOrigin(cx * chunkSize, cy * chunkSize) > 12 && hashValue(cx, cy, 565) > 0.62) {
        for (let i = 0; i < 3; i++) {
          const tx = cx * chunkSize + Math.floor(hashValue(cx, cy, 567 + i) * chunkSize);
          const ty = cy * chunkSize + Math.floor(hashValue(cx, cy, 573 + i) * chunkSize);
          const terrain = terrainAt(tx, ty);
          if (occupied.has(key(tx, ty))) continue;
          if (terrain !== 'plain' && terrain !== 'path') continue;
          if (getTownshipAt(tx, ty)) continue;
          occupied.add(key(tx, ty));
          chunk.monsters.push(createRouteTrainer(tx, ty, i));
          break;
        }
      }

      const lootAttempts = Math.floor(hashValue(cx, cy, 71) * 2) + (distanceFromOrigin(cx * chunkSize, cy * chunkSize) > 36 ? 1 : 0);
      for (let i = 0; i < lootAttempts; i++) {
        const lx = cx * chunkSize + Math.floor(hashValue(cx, cy, 79 + i) * chunkSize);
        const ly = cy * chunkSize + Math.floor(hashValue(cx, cy, 83 + i) * chunkSize);
        const terrain = terrainAt(lx, ly);
        if (distanceFromOrigin(lx, ly) < 5) continue;
        if (occupied.has(key(lx, ly))) continue;
        if (terrain !== 'plain' && terrain !== 'grass' && terrain !== 'path') continue;
        occupied.add(key(lx, ly));
        chunk.loot.push(createWorldLoot(lx, ly, i));
      }

      for (let i = 0; i < 5; i++) {
        const lx = cx * chunkSize + Math.floor(hashValue(cx, cy, 131 + i) * chunkSize);
        const ly = cy * chunkSize + Math.floor(hashValue(cx, cy, 137 + i) * chunkSize);
        const terrain = terrainAt(lx, ly);
        if (distanceFromOrigin(lx, ly) < 10) continue;
        if (occupied.has(key(lx, ly))) continue;
        if (!hasLandmarkAt(lx, ly, routeProfileAt(lx, ly), terrain)) continue;
        if (hashValue(lx, ly, 143) < 0.18) continue;
        occupied.add(key(lx, ly));
        chunk.loot.push(createLandmarkLoot(lx, ly, i));
      }

      chunks.set(id, chunk);
    }
    return chunks.get(id);
  }

  function ensureWorld() {
    getRelevantChunks(chunkRadius + 1);
  }

  function removeMonster(target) {
    if (!target || target.ephemeral) return;
    for (const chunk of getRelevantChunks(chunkRadius + 1)) {
      const idx = chunk.monsters.findIndex(monster => monster === target || monster.id === target.id);
      if (idx >= 0) {
        chunk.monsters.splice(idx, 1);
        return;
      }
    }
  }

  function removeLoot(target) {
    if (!target) return;
    for (const chunk of getRelevantChunks(chunkRadius + 1)) {
      const idx = (chunk.loot || []).findIndex(item => item === target || item.id === target.id);
      if (idx >= 0) {
        chunk.loot.splice(idx, 1);
        return;
      }
    }
  }

  function monsterOccupied(x, y, ignore) {
    return getRelevantChunks(chunkRadius + 1).some(chunk => chunk.monsters.some(monster => monster !== ignore && monster.x === x && monster.y === y));
  }

  function collectWorldLoot() {
    const item = getLootAt(player.x, player.y);
    if (!item) return false;

    removeLoot(item);

    if (item.type === 'coins') {
      coins += item.amount;
      setMessage(`You found ${item.amount} coins in a weathered cache.`);
    } else if (item.type === 'capsule') {
      const room = Math.max(0, maxCapsules - capsules);
      const gained = Math.min(room, item.amount);
      const overflowCoins = gained < item.amount ? (item.amount - gained) * 8 : 0;
      capsules += gained;
      coins += overflowCoins;
      if (gained > 0) {
        setMessage(`You found ${gained} capsule${gained === 1 ? '' : 's'} in a supply pod.`);
      } else {
        setMessage(`You found ${overflowCoins} coins in a weathered cache.`);
      }
    } else if (item.type === 'tonic') {
      if (tonics < maxTonics) {
        tonics += 1;
        setMessage('You found a field tonic.');
      } else {
        coins += 5;
        setMessage('You found a field tonic. No one needed it, so you traded it for 5 coins.');
      }
    } else if (item.type === 'charm') {
      charms += item.amount;
      setMessage('You found a capture charm. Your next capture attempt will be stronger.');
    } else if (item.type === 'landmark-cache') {
      if (item.rewardType === 'coins') {
        coins += item.amount;
        setMessage(`You uncovered a ${item.label} and found ${item.amount} coins.`);
      } else if (item.rewardType === 'capsule') {
        const room = Math.max(0, maxCapsules - capsules);
        const gained = Math.min(room, item.amount);
        const overflowCoins = Math.max(0, item.amount - gained) * 10;
        capsules += gained;
        coins += overflowCoins;
        if (gained > 0) {
          setMessage(`You uncovered a ${item.label} and found ${gained} capsules.`);
        } else {
          setMessage(`You uncovered a ${item.label} and found ${overflowCoins} coins.`);
        }
      } else if (item.rewardType === 'party-heal') {
        let totalRecovered = 0;
        party.forEach(monster => {
          const recovered = Math.min(item.amount, monster.maxHp - monster.hp);
          monster.hp += recovered;
          totalRecovered += recovered;
        });
        if (totalRecovered > 0) {
          setMessage(`You uncovered a ${item.label} and restored ${totalRecovered} HP across your party.`);
        } else {
          coins += 6;
          setMessage(`You uncovered a ${item.label} and found 6 coins.`);
        }
      } else if (item.rewardType === 'charm') {
        charms += item.amount;
        setMessage('You found a capture charm. Your next capture attempt will be stronger.');
      }
    }

    updateHighScore();
    updateTamerUi();
    return true;
  }

  function healParty() {
    party.forEach(monster => {
      monster.hp = monster.maxHp;
    });
    if (activeMonster()) activeIndex = Math.max(0, firstHealthyMonsterIndex());
    setMessage('Your party rested at town.');
    updateTamerUi();
    drawTamerWorld();
  }

  function openTownMenu() {
    activeTownship = getTownshipAt();
    townMenuOpen = true;
    indexMenuOpen = false;
    storageMenuOpen = false;
    townSelection = 0;
    const bossState = bossStateForTown(activeTownship);
    setMessage(bossState.ready ? `${activeTownship?.profile?.boss?.trainer || 'Town boss'} is ready. Win the ${activeTownship?.profile?.boss?.badge || 'town'} Badge.` : 'Town services are open. Stock up or check your index.');
    drawTamerWorld();
  }

  function castFishingLine() {
    const waterTile = adjacentWaterTile();
    if (!waterTile) {
      setMessage('Stand beside water to fish.');
      drawTamerWorld();
      return true;
    }
    if (rods <= 0) {
      setMessage('You need a fishing rod first.');
      drawTamerWorld();
      return true;
    }

    const biteChance = Math.min(0.68, 0.34 + lootTierAt(waterTile.x, waterTile.y) * 0.07);
    if (Math.random() < biteChance) {
      setMessage(`Something tugged the line in ${routeLabelAt(waterTile.x, waterTile.y)} Waters.`);
      startFishingAnimation(waterTile, { type: 'battle', waterTile });
      updateTamerUi();
      return true;
    }

    setMessage('Casting...');
    startFishingAnimation(waterTile, { type: 'empty', breaksRod: Math.random() >= 0.14 });
    updateTamerUi();
    return true;
  }

  function closeTownMenu(message) {
    townMenuOpen = false;
    indexMenuOpen = false;
    storageMenuOpen = false;
    activeTownship = null;
    if (message) setMessage(message);
    updateTamerUi();
    drawTamerWorld();
  }

  function moveTownSelection(step) {
    if (!townMenuOpen) return;
    if (indexMenuOpen) {
      moveIndexSelection(step);
      return;
    }
    if (storageMenuOpen) {
      moveStorageSelection(step);
      return;
    }
    townSelection = wrapIndex(townSelection + step, shopItems.length);
    setMessage(currentTownSelectionDetail());
    drawTamerWorld();
  }

  function openMonsterIndex() {
    indexMenuOpen = true;
    indexSelection = 0;
    setMessage('Monster Index opened. Browse routes and discoveries.');
    drawTamerWorld();
  }

  function closeMonsterIndex(message) {
    indexMenuOpen = false;
    if (message) setMessage(message);
    drawTamerWorld();
  }

  function moveIndexSelection(step) {
    indexSelection = wrapIndex(indexSelection + step, speciesList.length);
    setMessage(`${speciesList[indexSelection].name} entry selected.`);
    drawTamerWorld();
  }

  function usePotionOnLead() {
    const lead = activeMonster();
    if (!lead) return 'No lead monster to treat.';
    return usePotionOnMonster(lead);
  }

  function buyTownItem() {
    if (!townMenuOpen) return;
    if (indexMenuOpen) {
      closeMonsterIndex('Back to town services.');
      return;
    }
    if (storageMenuOpen) {
      handleStorageConfirm();
      return;
    }
    const choice = shopItems[townSelection];
    if (!choice) return;
    if (choice.key === 'leave') {
      closeTownMenu('You head back out onto the route.');
      return;
    }
    if (choice.key === 'index') {
      openMonsterIndex();
      return;
    }
    if (choice.key === 'storage') {
      openStorageMenu();
      return;
    }
    if (choice.key === 'boss') {
      startBossBattle();
      return;
    }
    if (choice.key === 'heal') {
      healParty();
      setMessage('The town nurse patched up your party.');
      drawTamerWorld();
      return;
    }
    if (coins < choice.cost) {
      setMessage('Not enough coins for that purchase.');
      drawTamerWorld();
      return;
    }
    if (choice.key === 'capsule') {
      if (capsules >= maxCapsules) {
        setMessage('Your capsule bag is already full.');
        drawTamerWorld();
        return;
      }
      coins -= choice.cost;
      capsules += 1;
      setMessage('You bought one capsule.');
    } else if (choice.key === 'rod') {
      if (rods >= maxRods) {
        setMessage('Your rod pouch is already full.');
        drawTamerWorld();
        return;
      }
      coins -= choice.cost;
      rods += 1;
      setMessage('You bought one fishing rod.');
    } else if (choice.key === 'tonic') {
      if (tonics >= maxTonics) {
        setMessage('Your tonic pouch is already full.');
        drawTamerWorld();
        return;
      }
      coins -= choice.cost;
      tonics += 1;
      setMessage('You bought one tonic.');
    }
    updateHighScore();
    updateTamerUi();
    drawTamerWorld();
  }

  function drawPixelSprite(sprite, palette, px, py, scale) {
    for (let sy = 0; sy < sprite.length; sy++) {
      const row = sprite[sy];
      for (let sx = 0; sx < row.length; sx++) {
        const pixel = row[sx];
        if (pixel === '.') continue;
        const fill = palette[pixel];
        if (!fill) continue;
        ctx.fillStyle = fill;
        ctx.fillRect(px + sx * scale, py + sy * scale, scale, scale);
      }
    }
  }

  function drawTypeBadge(typeKey, label, x, y, options = {}) {
    const meta = typeMeta[typeKey] || typeMeta.stone;
    const text = label || meta.short;
    const font = options.font || 'bold 8px Trebuchet MS';
    const paddingX = options.paddingX || 4;
    const height = options.height || 11;
    const minWidth = options.minWidth || 26;
    const radius = options.radius || 2;

    ctx.save();
    ctx.font = font;
    const width = Math.max(minWidth, Math.ceil(ctx.measureText(text).width) + paddingX * 2);
    ctx.fillStyle = colorWithAlpha(meta.color, 0.95);
    ctx.strokeStyle = 'rgba(49,63,42,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fff0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2 + 0.5);
    ctx.restore();
    return width;
  }

  function drawOutlinedPixelSprite(sprite, palette, outlineColor, px, py, scale) {
    const offsets = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    ctx.fillStyle = outlineColor;
    for (let sy = 0; sy < sprite.length; sy++) {
      const row = sprite[sy];
      for (let sx = 0; sx < row.length; sx++) {
        if (row[sx] === '.') continue;
        offsets.forEach(([ox, oy]) => {
          const nx = sx + ox;
          const ny = sy + oy;
          const neighbor = sprite[ny]?.[nx] || '.';
          if (neighbor !== '.') return;
          ctx.fillRect(px + nx * scale, py + ny * scale, scale, scale);
        });
      }
    }

    drawPixelSprite(sprite, palette, px, py, scale);
  }

  function colorWithAlpha(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(255,255,255,${alpha})`;
    let value = hex.replace('#', '').trim();
    if (value.length === 3) {
      value = value.split('').map(ch => ch + ch).join('');
    }
    if (value.length !== 6) return `rgba(255,255,255,${alpha})`;
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function blendHex(hexA, hexB, weight = 0.5) {
    const normalize = (hex) => {
      let value = (hex || '#ffffff').replace('#', '').trim();
      if (value.length === 3) value = value.split('').map(ch => ch + ch).join('');
      if (value.length !== 6) value = 'ffffff';
      return value;
    };
    const first = normalize(hexA);
    const second = normalize(hexB);
    const mix = (index) => {
      const a = parseInt(first.slice(index, index + 2), 16);
      const b = parseInt(second.slice(index, index + 2), 16);
      return Math.round(a * (1 - weight) + b * weight).toString(16).padStart(2, '0');
    };
    return `#${mix(0)}${mix(2)}${mix(4)}`;
  }

  function shinyPaletteForMonster(monster) {
    return {
      color: blendHex(monster?.color || '#ffffff', '#f5d14a', 0.58),
      accent: blendHex(monster?.accent || '#ffffff', '#8ef4ff', 0.5)
    };
  }

  function shinyLabel(monster) {
    return monster?.shiny ? 'Shiny ' : '';
  }

  function rollShiny() {
    return Math.random() < shinyChance;
  }

  function rollEncounterShiny() {
    return rollShiny();
  }

  function battlePaletteForMonster(monster) {
    const shinyPalette = monster?.shiny ? shinyPaletteForMonster(monster) : null;
    return {
      primary: shinyPalette ? shinyPalette.color : (monster?.color || '#ffb36b'),
      secondary: shinyPalette ? shinyPalette.accent : (monster?.accent || '#ffffff'),
      primaryGlow: colorWithAlpha(shinyPalette ? shinyPalette.color : (monster?.color || '#ffb36b'), 0.88),
      secondaryGlow: colorWithAlpha(shinyPalette ? shinyPalette.accent : (monster?.accent || '#ffffff'), 0.92)
    };
  }

  function stopFishingAnimation() {
    if (fishingAnimationFrame) {
      cancelAnimationFrame(fishingAnimationFrame);
      fishingAnimationFrame = null;
    }
    fishingAnimation = null;
  }

  function stopEncounterTransition() {
    if (encounterTransitionFrame) {
      cancelAnimationFrame(encounterTransitionFrame);
      encounterTransitionFrame = null;
    }
    encounterTransition = null;
  }

  function stopBattleAnimation() {
    if (battleAnimationFrame) {
      cancelAnimationFrame(battleAnimationFrame);
      battleAnimationFrame = null;
    }
    battleAnimation = null;
  }

  function finishBattleAnimation() {
    if (!battleAnimation) return;
    const onComplete = battleAnimation.onComplete;
    stopBattleAnimation();
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  function tickBattleAnimation(now) {
    if (!battleAnimation) return;
    const elapsed = now - battleAnimation.startedAt;
    if (elapsed >= battleAnimation.durationMs) {
      finishBattleAnimation();
      return;
    }

    drawTamerWorld();
    battleAnimationFrame = requestAnimationFrame(tickBattleAnimation);
  }

  function startBattleAnimation(type, data, onComplete, durationMs = 620) {
    stopBattleAnimation();
    battleAnimation = {
      type,
      data,
      onComplete,
      startedAt: performance.now(),
      durationMs
    };
    battleAnimationFrame = requestAnimationFrame(tickBattleAnimation);
  }

  function unlockTheme(themeKey) {
    const unlocked = new Set(readLocalJson('unlockedThemes', []));
    const wasUnlocked = unlocked.has(themeKey);
    if (!wasUnlocked) {
      unlocked.add(themeKey);
      localStorage.setItem('unlockedThemes', JSON.stringify([...unlocked]));
    }
    return !wasUnlocked;
  }

  function finishEncounterTransition() {
    if (!encounterTransition) return;
    const nextMonster = encounterTransition.monster;
    stopEncounterTransition();
    battleTarget = nextMonster;
    resetBattleMenu();
    recordDexEntry(nextMonster, 'seen');
    ensureMonsterState(nextMonster);
    const rarityLabel = (rarityMeta[nextMonster.rarity] || rarityMeta.common).label.toLowerCase();
    let unlockSuffix = '';
    if (nextMonster.shiny) {
      localStorage.setItem('monsterTamerShinySeen', 'true');
      if (unlockTheme('shinyglint')) {
        unlockSuffix = ' Shiny Glint theme unlocked.';
      }
    }
    if (nextMonster.isBoss) {
      setMessage(`Boss ${nextMonster.trainerName} sent out ${nextMonster.name} for the ${nextMonster.badgeName} Badge.`);
    } else if (nextMonster.isTrainer) {
      setMessage(`Trainer ${nextMonster.trainerName} challenged you with ${nextMonster.name}.`);
    } else {
      setMessage(`A ${nextMonster.shiny ? 'shiny ' : ''}${rarityLabel} ${nextMonster.name} appeared on ${nextMonster.route || routeLabelAt(nextMonster.x, nextMonster.y)}. Capsules left: ${capsules}.${unlockSuffix}`);
    }
    updateTamerUi();
    drawTamerWorld();
  }

  function tickEncounterTransition(now) {
    if (!encounterTransition) return;
    const elapsed = now - encounterTransition.startedAt;
    const progress = Math.min(1, elapsed / encounterTransition.durationMs);

    if (!encounterTransition.switched && progress >= 0.52) {
      encounterTransition.switched = true;
      battleTarget = encounterTransition.monster;
    }

    if (progress >= 1) {
      finishEncounterTransition();
      return;
    }

    drawTamerWorld();
    encounterTransitionFrame = requestAnimationFrame(tickEncounterTransition);
  }

  function startEncounterTransition(monster) {
    stopEncounterTransition();
    encounterTransition = {
      monster,
      startedAt: performance.now(),
      durationMs: 760,
      switched: false
    };
    battleTarget = null;
    encounterTransitionFrame = requestAnimationFrame(tickEncounterTransition);
  }

  function drawEncounterTransitionOverlay() {
    if (!encounterTransition) return;

    const elapsed = performance.now() - encounterTransition.startedAt;
    const progress = Math.min(1, elapsed / encounterTransition.durationMs);
    const pulse = Math.sin(progress * Math.PI * 6) * 0.5 + 0.5;
    const shutterWidth = Math.ceil((canvas.width / 2) * Math.min(1, progress * 1.8));

    ctx.fillStyle = `rgba(10, 14, 10, ${0.18 + progress * 0.36})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = `rgba(241, 248, 224, ${Math.max(0, 0.42 - progress * 0.55)})`;
    for (let y = 0; y < canvas.height; y += 12) {
      ctx.fillRect(0, y, canvas.width, 6);
    }

    ctx.fillStyle = `rgba(24, 28, 20, ${0.72 - progress * 0.16})`;
    ctx.fillRect(0, 0, shutterWidth, canvas.height);
    ctx.fillRect(canvas.width - shutterWidth, 0, shutterWidth, canvas.height);

    const flashAlpha = progress < 0.58 ? 0 : Math.max(0, 0.9 - ((progress - 0.58) / 0.42) * 1.2);
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(246, 250, 238, ${flashAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.35})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(12 + pulse * 3, 12 + pulse * 2, canvas.width - 24 - pulse * 6, canvas.height - 24 - pulse * 4);
  }

  function resolveFishingAnimation() {
    if (!fishingAnimation) return;

    const outcome = fishingAnimation.outcome;
    stopFishingAnimation();

    if (outcome.type === 'battle') {
      rods = Math.max(0, rods - 1);
      beginBattle(createFishingMonster(outcome.waterTile.x, outcome.waterTile.y));
      return;
    }

    if (outcome.breaksRod) {
      rods = Math.max(0, rods - 1);
      setMessage('You cast out, but nothing bites. The rod snapped.');
    } else {
      setMessage('You cast out, but nothing bites. The rod still looks usable.');
    }
    updateTamerUi();
    drawTamerWorld();
  }

  function tickFishingAnimation(now) {
    if (!fishingAnimation) return;
    const elapsed = now - fishingAnimation.startedAt;
    if (elapsed >= fishingAnimation.durationMs) {
      resolveFishingAnimation();
      return;
    }

    drawTamerWorld();
    fishingAnimationFrame = requestAnimationFrame(tickFishingAnimation);
  }

  function startFishingAnimation(waterTile, outcome) {
    stopFishingAnimation();
    fishingAnimation = {
      waterTile,
      outcome,
      startedAt: performance.now(),
      durationMs: outcome.type === 'battle' ? 900 : 780
    };
    fishingAnimationFrame = requestAnimationFrame(tickFishingAnimation);
  }

  function drawFishingAnimation(cameraX, cameraY) {
    if (!fishingAnimation) return;

    const elapsed = performance.now() - fishingAnimation.startedAt;
    const castDuration = 260;
    const totalDuration = fishingAnimation.durationMs;
    const travelProgress = Math.min(1, elapsed / castDuration);
    const settleProgress = Math.max(0, Math.min(1, (elapsed - castDuration) / Math.max(1, totalDuration - castDuration)));
    const playerSx = mapOffsetX + Math.floor(viewCols / 2) * tile + tile / 2;
    const playerSy = Math.floor(viewRows / 2) * tile + tile / 2;
    const waterSx = mapOffsetX + (fishingAnimation.waterTile.x - cameraX) * tile + tile / 2;
    const waterSy = (fishingAnimation.waterTile.y - cameraY) * tile + tile / 2;
    const bobX = playerSx + (waterSx - playerSx) * travelProgress;
    const bobY = playerSy + (waterSy - playerSy) * travelProgress - Math.sin(travelProgress * Math.PI) * 10;
    const finalBobY = waterSy + Math.sin(elapsed * 0.02) * 1.5;
    const renderBobY = travelProgress < 1 ? bobY : finalBobY;
    const tugOffset = fishingAnimation.outcome.type === 'battle' && settleProgress > 0.55
      ? Math.sin((settleProgress - 0.55) * Math.PI * 10) * 2.5
      : 0;

    ctx.strokeStyle = 'rgba(58,54,47,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playerSx, playerSy - 1);
    ctx.lineTo(bobX, renderBobY + tugOffset);
    ctx.stroke();

    if (travelProgress >= 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      const rippleRadius = 3 + Math.sin(settleProgress * Math.PI * 4) * 1.2;
      ctx.beginPath();
      ctx.arc(waterSx, waterSy + tugOffset, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();
      if (fishingAnimation.outcome.type === 'battle') {
        ctx.beginPath();
        ctx.arc(waterSx, waterSy + tugOffset, rippleRadius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    drawPixelSprite(bobberSprite, { '1': '#ffffff', '2': '#e54d4d', '3': '#2d2d2d' }, bobX - 8, renderBobY - 8 + tugOffset, 2);
  }

  function drawLandmark(profile, sx, sy, worldX, worldY, type) {
    if (!profile || type === 'grass' || type === 'water' || type === 'heal') return;
    const landmark = landmarkSprites[profile.landmark];
    if (!landmark) return;
    if (!hasLandmarkAt(worldX, worldY, profile, type)) return;
    drawPixelSprite(landmark.sprite, landmark.palette, sx, sy, 2);
  }

  function drawWorldTile(type, sx, sy, worldX, worldY) {
    const profile = routeProfileAt(worldX, worldY);
    const palette = profile.palette || { plain: '#98cd72', grass: '#7fbe57', path: '#cab47b', water: '#5aa4de' };
    const town = getTownshipAt(worldX, worldY);
    if (type === 'path') {
      ctx.fillStyle = palette.path;
      ctx.fillRect(sx, sy, tile, tile);
      ctx.fillStyle = '#b09a61';
      ctx.fillRect(sx + 2, sy + 3, 3, 2);
      ctx.fillRect(sx + 10, sy + 8, 2, 2);
      ctx.fillRect(sx + 6, sy + 12, 4, 2);
      drawLandmark(profile, sx, sy, worldX, worldY, type);
      return;
    }
    if (type === 'grass') {
      ctx.fillStyle = palette.grass;
      ctx.fillRect(sx, sy, tile, tile);
      drawPixelSprite(tallGrassSprite, { '1': '#54903a' }, sx, sy + 2, 2);
      ctx.fillStyle = colorWithAlpha('#dff5b4', 0.12 + hashValue(worldX, worldY, 901) * 0.08);
      ctx.fillRect(sx + 2 + Math.sin((renderTick + worldX + worldY) * 0.15) * 1.2, sy + 5, 2, 5);
      ctx.fillRect(sx + 9 + Math.sin((renderTick + worldX * 2 + worldY) * 0.17) * 1.2, sy + 4, 2, 6);
      return;
    }
    if (type === 'water') {
      ctx.fillStyle = palette.water;
      ctx.fillRect(sx, sy, tile, tile);
      ctx.fillStyle = '#8ed0ff';
      ctx.fillRect(sx + 1, sy + 4, 6, 2);
      ctx.fillRect(sx + 8, sy + 10, 6, 2);
      ctx.fillRect(sx + 5, sy + 14, 5, 1);
      ctx.fillStyle = colorWithAlpha('#ffffff', 0.16);
      ctx.fillRect(sx + (((renderTick + worldX + worldY) % 12 + 12) % 12), sy + 3, 4, 1);
      ctx.fillRect(sx + ((((renderTick * 1.4) + worldX * 3 + worldY) % 14 + 14) % 14), sy + 9, 3, 1);
      return;
    }
    ctx.fillStyle = type === 'heal' ? '#d8f0be' : palette.plain;
    ctx.fillRect(sx, sy, tile, tile);
    ctx.fillStyle = '#8ac166';
    ctx.fillRect(sx + 2, sy + 2, 2, 2);
    ctx.fillRect(sx + 11, sy + 6, 2, 2);
    ctx.fillRect(sx + 6, sy + 12, 3, 2);
    if (type === 'tree') {
      drawPixelSprite(treeSprite, { '1': '#245b2f', '2': '#387c44', '3': '#4f9658', '4': '#6c4b2d' }, sx, sy, 2);
      return;
    }
    if (type === 'town' || type === 'shop') {
      const townPalette = {
        '1': '#3f4f34',
        '2': '#efe8cf',
        '3': profile.palette?.path || '#d45252',
        '4': profile.palette?.water || '#87b8e2'
      };

      ctx.fillStyle = profile.palette?.path || '#cab47b';
      ctx.fillRect(sx, sy, tile, tile);
      ctx.strokeStyle = 'rgba(57,70,46,0.35)';
      ctx.strokeRect(sx + 1, sy + 1, tile - 2, tile - 2);

      if (type === 'shop') {
        drawPixelSprite(fieldStationSprite, townPalette, sx, sy, 2);
      } else if (town) {
        const landmark = landmarkSprites[town.profile.landmark];
        if (landmark) {
          drawPixelSprite(landmark.sprite, landmark.palette, sx, sy, 2);
        }
      }
      return;
    }
    drawLandmark(profile, sx, sy, worldX, worldY, type);
  }

  function drawMonsterSprite(monster, sx, sy, scale, variant = 'field') {
    const shinyPalette = monster?.shiny ? shinyPaletteForMonster(monster) : null;
    const sprite = variant === 'battle' && monster?.battleSprite ? monster.battleSprite : monster.sprite;
    const spriteWidth = Math.max(...sprite.map(row => row.length));
    const spriteHeight = sprite.length;
    const offsetX = Math.floor((8 - spriteWidth) * scale / 2);
    const offsetY = Math.floor((8 - spriteHeight) * scale / 2);
    drawPixelSprite(sprite, {
      '1': shinyPalette ? shinyPalette.color : monster.color,
      '2': shinyPalette ? shinyPalette.accent : monster.accent,
      '3': '#2f2f2f',
      '4': '#ffffff'
    }, sx + offsetX, sy + offsetY, scale);
  }

  function drawShinySparkles(cx, cy, radius = 22, phase = performance.now() * 0.004) {
    for (let i = 0; i < 4; i++) {
      const angle = phase + (i * Math.PI / 2);
      const sparkleX = cx + Math.cos(angle) * radius;
      const sparkleY = cy + Math.sin(angle) * (radius * 0.62);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,241,161,0.95)' : 'rgba(164,247,255,0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sparkleX - 3, sparkleY);
      ctx.lineTo(sparkleX + 3, sparkleY);
      ctx.moveTo(sparkleX, sparkleY - 3);
      ctx.lineTo(sparkleX, sparkleY + 3);
      ctx.stroke();
    }
  }

  function battleLayout() {
    return {
      enemyX: 206,
      enemyY: 50,
      allyX: 54,
      allyY: 116,
      enemyCenterX: 222,
      enemyCenterY: 66,
      allyCenterX: 70,
      allyCenterY: 132
    };
  }

  function stopAmbientAnimation() {
    if (ambientAnimationFrame) {
      cancelAnimationFrame(ambientAnimationFrame);
      ambientAnimationFrame = null;
    }
    ambientLastAt = 0;
  }

  function tickAmbientAnimation(now) {
    if (!ambientLastAt) {
      ambientLastAt = now;
    }

    const elapsed = Math.min(42, now - ambientLastAt);
    ambientLastAt = now;

    if (!encounterTransition && !battleAnimation && !fishingAnimation) {
      renderTick += elapsed * 0.024;
      drawTamerWorld();
    }

    ambientAnimationFrame = requestAnimationFrame(tickAmbientAnimation);
  }

  function startAmbientAnimation() {
    stopAmbientAnimation();
    ambientAnimationFrame = requestAnimationFrame(tickAmbientAnimation);
  }

  function drawBattleAnimationEffects(layout) {
    if (!battleAnimation) return { allyOffsetX: 0, allyOffsetY: 0, enemyOffsetX: 0, enemyOffsetY: 0 };

    const elapsed = performance.now() - battleAnimation.startedAt;
    const progress = Math.min(1, elapsed / battleAnimation.durationMs);
    const effects = { allyOffsetX: 0, allyOffsetY: 0, enemyOffsetX: 0, enemyOffsetY: 0 };

    if (battleAnimation.type === 'attack-projectile') {
      const fromEnemy = battleAnimation.data.from === 'enemy';
      const palette = battlePaletteForMonster(battleAnimation.data.monster);
      const startX = fromEnemy ? layout.enemyCenterX : layout.allyCenterX;
      const startY = fromEnemy ? layout.enemyCenterY : layout.allyCenterY;
      const endX = fromEnemy ? layout.allyCenterX : layout.enemyCenterX;
      const endY = fromEnemy ? layout.allyCenterY : layout.enemyCenterY;
      const pulse = Math.sin(progress * Math.PI);
      const shotX = startX + (endX - startX) * progress;
      const shotY = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * 10;

      ctx.strokeStyle = palette.primaryGlow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(shotX, shotY);
      ctx.stroke();

      ctx.strokeStyle = palette.secondaryGlow;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, startY - 2);
      ctx.lineTo(shotX, shotY - 2);
      ctx.stroke();

      ctx.fillStyle = palette.primary;
      ctx.beginPath();
      ctx.arc(shotX, shotY, 4 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.secondary;
      ctx.beginPath();
      ctx.arc(shotX, shotY, 2 + pulse, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 3; i++) {
        const trailOffset = i * 0.1;
        const trailProgress = Math.max(0, progress - trailOffset);
        const trailX = startX + (endX - startX) * trailProgress;
        const trailY = startY + (endY - startY) * trailProgress - Math.sin(trailProgress * Math.PI) * 10;
        ctx.fillStyle = colorWithAlpha(battleAnimation.data.monster?.color || '#ffffff', 0.18 - i * 0.04);
        ctx.beginPath();
        ctx.arc(trailX, trailY, 4 - i, 0, Math.PI * 2);
        ctx.fill();
      }

      if (progress > 0.7) {
        const impactPulse = (progress - 0.7) / 0.3;
        ctx.strokeStyle = palette.secondaryGlow;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc(endX, endY, 4 + impactPulse * (10 + i * 6), 0, Math.PI * 2);
          ctx.stroke();
        }
        if (fromEnemy) {
          effects.allyOffsetX = Math.sin(progress * Math.PI * 16) * 2.2;
          effects.allyOffsetY = Math.sin(progress * Math.PI * 10) * 0.8;
        } else {
          effects.enemyOffsetX = Math.sin(progress * Math.PI * 16) * 2.2;
          effects.enemyOffsetY = Math.sin(progress * Math.PI * 10) * 0.8;
        }
      }
    } else if (battleAnimation.type === 'capsule-throw') {
      const startX = layout.allyCenterX - 8;
      const startY = layout.allyCenterY - 6;
      const endX = layout.enemyCenterX;
      const endY = layout.enemyCenterY + 2;
      const throwProgress = Math.min(1, progress / 0.68);
      const arcX = startX + (endX - startX) * throwProgress;
      const arcY = startY + (endY - startY) * throwProgress - Math.sin(throwProgress * Math.PI) * 28;
      const shakePhase = progress > 0.68 ? (progress - 0.68) / 0.32 : 0;

      if (progress <= 0.68) {
        drawPixelSprite(capsuleSprite, { '1': '#7b5cff', '2': '#c6b8ff', '3': '#2d2d2d', '4': '#ffffff' }, arcX - 8, arcY - 8, 2);
      } else {
        const shakeX = endX + Math.sin(shakePhase * Math.PI * 8) * 5;
        const shakeY = endY + Math.sin(shakePhase * Math.PI * 4) * 1.5;
        drawPixelSprite(capsuleSprite, { '1': '#7b5cff', '2': '#c6b8ff', '3': '#2d2d2d', '4': '#ffffff' }, shakeX - 8, shakeY - 8, 2);
        ctx.strokeStyle = battleAnimation.data.success ? 'rgba(214,255,180,0.9)' : 'rgba(255,210,210,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endX, endY, 8 + shakePhase * 16, 0, Math.PI * 2);
        ctx.stroke();
        effects.enemyOffsetX = Math.sin(shakePhase * Math.PI * 8) * 2;

        const sparkleCount = battleAnimation.data.success ? 5 : 3;
        for (let i = 0; i < sparkleCount; i++) {
          const angle = (Math.PI * 2 * i) / sparkleCount + shakePhase * Math.PI;
          const distance = 10 + shakePhase * 16;
          const sparkleX = endX + Math.cos(angle) * distance;
          const sparkleY = endY + Math.sin(angle) * distance;
          ctx.strokeStyle = battleAnimation.data.success ? 'rgba(225,255,190,0.9)' : 'rgba(255,168,168,0.82)';
          ctx.beginPath();
          ctx.moveTo(sparkleX - 2, sparkleY);
          ctx.lineTo(sparkleX + 2, sparkleY);
          ctx.moveTo(sparkleX, sparkleY - 2);
          ctx.lineTo(sparkleX, sparkleY + 2);
          ctx.stroke();
        }
      }
    }

    return effects;
  }

  function drawBattleResultOverlay() {
    if (!battleResultBanner) return;

    const remaining = battleResultBanner.expiresAt - performance.now();
    if (remaining <= 0) {
      battleResultBanner = null;
      return;
    }

    ctx.fillStyle = 'rgba(20,28,18,0.7)';
    ctx.fillRect(52, 68, 208, 48);
    ctx.strokeStyle = 'rgba(240,248,220,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 68, 208, 48);
    ctx.fillStyle = '#eef8d7';
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(battleResultBanner.title || 'Battle End', canvas.width / 2, 86);
    ctx.font = 'bold 9px Courier New';
    ctx.fillText((battleResultBanner.detail || '').slice(0, 34), canvas.width / 2, 102);
  }

  function drawTamerWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d8f0be';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (battleTarget && !encounterTransition) {
      drawBattleScene();
      return;
    }

    if (playerMenuOpen) {
      drawPlayerMenu();
      return;
    }

    if (indexMenuOpen) {
      drawMonsterIndex();
      return;
    }

    if (storageMenuOpen) {
      drawStorageMenu();
      return;
    }

    if (townMenuOpen) {
      drawTownScene();
      return;
    }

    const cameraX = player.x - Math.floor(viewCols / 2);
    const cameraY = player.y - Math.floor(viewRows / 2);

    for (let vy = 0; vy < viewRows; vy++) {
      for (let vx = 0; vx < viewCols; vx++) {
        const worldX = cameraX + vx;
        const worldY = cameraY + vy;
        drawWorldTile(terrainAt(worldX, worldY), mapOffsetX + vx * tile, vy * tile, worldX, worldY);
      }
    }

    const visibleMonsters = [];
    const visibleLoot = [];
    getRelevantChunks(chunkRadius + 1).forEach(chunk => {
      chunk.monsters.forEach(monster => {
        const sx = monster.x - cameraX;
        const sy = monster.y - cameraY;
        if (sx >= 0 && sx < viewCols && sy >= 0 && sy < viewRows) {
          visibleMonsters.push({ monster, sx, sy });
        }
      });

      (chunk.loot || []).forEach(item => {
        const sx = item.x - cameraX;
        const sy = item.y - cameraY;
        if (sx >= 0 && sx < viewCols && sy >= 0 && sy < viewRows) {
          visibleLoot.push({ item, sx, sy });
        }
      });
    });

    visibleLoot.forEach(({ item, sx, sy }) => {
      const px = mapOffsetX + sx * tile;
      const bob = Math.sin((renderTick + sx * 2 + sy * 3) * 0.55) * 1.5;
      const py = sy * tile + bob;
      const isCache = item.type === 'landmark-cache';
      const isCharm = item.type === 'charm' || item.rewardType === 'charm';
      ctx.fillStyle = isCharm
        ? 'rgba(246,219,112,0.26)'
        : isCache
          ? 'rgba(208,147,88,0.22)'
          : item.type === 'coins'
            ? 'rgba(201,146,45,0.22)'
            : item.type === 'capsule'
              ? 'rgba(123,92,255,0.2)'
              : 'rgba(86,167,184,0.2)';
      ctx.beginPath();
      ctx.arc(px + tile / 2, py + tile / 2, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const sparkleAngle = ((renderTick * 0.35) + (i * Math.PI)) + (sx + sy) * 0.4;
        const sparkleX = px + tile / 2 + Math.cos(sparkleAngle) * 5;
        const sparkleY = py + tile / 2 + Math.sin(sparkleAngle) * 5;
        ctx.beginPath();
        ctx.moveTo(sparkleX - 1.5, sparkleY);
        ctx.lineTo(sparkleX + 1.5, sparkleY);
        ctx.moveTo(sparkleX, sparkleY - 1.5);
        ctx.lineTo(sparkleX, sparkleY + 1.5);
        ctx.stroke();
      }

      if (item.type === 'coins') {
        drawPixelSprite(coinSprite, { '1': '#c9922d', '2': '#f2cf67', '3': '#9b6b22' }, px, py, 2);
      } else if (item.type === 'capsule') {
        drawPixelSprite(capsuleSprite, { '1': '#7b5cff', '2': '#c6b8ff', '3': '#2d2d2d', '4': '#ffffff' }, px, py, 2);
      } else if (item.type === 'charm') {
        drawPixelSprite(charmSprite, { '1': '#f6db70', '2': '#fff4c2', '3': '#eaa94a', '4': '#ffffff' }, px, py, 2);
      } else if (item.type === 'landmark-cache') {
        drawPixelSprite(cacheSprite, {
          '1': '#7a5332',
          '2': '#b68149',
          '3': routeProfileAt(item.x, item.y).palette?.path || '#d8bc78',
          '4': '#e9dcb7'
        }, px, py, 2);
      } else {
        drawPixelSprite(tonicSprite, { '1': '#3f98a5', '2': '#8de0ea', '3': '#53b4c5', '4': '#d9f6fb' }, px, py, 2);
      }
    });

    visibleMonsters.forEach(({ monster, sx, sy }) => {
      const idleBob = Math.sin((renderTick + sx * 3 + sy * 5) * 0.16) * 1.2;
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(mapOffsetX + sx * tile + 4, sy * tile + 11, 8, 3);
      if (monster.isTrainer) {
        drawOutlinedPixelSprite(trainerSprite, monster.trainerPalette || { '1': '#5d6f4d', '2': '#f0e0c3', '3': '#8aa665', '4': '#4e5a70', '5': '#704f7d' }, 'rgba(57,70,46,0.35)', mapOffsetX + sx * tile, sy * tile + idleBob, 2);
        drawTypeBadge(typeKeyForMonster(monster), typeShortForMonster(monster), mapOffsetX + sx * tile - 2, sy * tile - 2 + idleBob, { minWidth: 20, height: 9, font: 'bold 7px Trebuchet MS', paddingX: 3 });
      } else {
        drawMonsterSprite(monster, mapOffsetX + sx * tile, sy * tile + idleBob, 2);
        if (monster.shiny) {
          drawShinySparkles(mapOffsetX + sx * tile + 8, sy * tile + 8 + idleBob, 8, performance.now() * 0.008 + sx * 0.4 + sy * 0.3);
        }
      }
    });

    const playerBob = Math.sin(renderTick * 0.18) * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(mapOffsetX + Math.floor(viewCols / 2) * tile + 4, Math.floor(viewRows / 2) * tile + 11, 8, 3);
    drawOutlinedPixelSprite(playerSprite, { '1': '#d4b9f6', '2': '#fae9df', '3': '#a184e3', '4': '#4a3d61' }, 'rgba(71, 56, 95, 0.45)', mapOffsetX + Math.floor(viewCols / 2) * tile, Math.floor(viewRows / 2) * tile + playerBob, 2);

    drawFishingAnimation(cameraX, cameraY);

    ctx.fillStyle = 'rgba(34,50,20,0.74)';
    ctx.fillRect(0, 0, canvas.width, 18);
    ctx.fillStyle = '#eef8d7';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(routeLabelAt(), 8, 12);
    ctx.textAlign = 'center';
    ctx.fillText(`Badges ${badgeCount()}/${routeProfiles.length}`, canvas.width / 2, 12);
    ctx.textAlign = 'right';
    ctx.fillText(nextTownshipHint(), canvas.width - 8, 12);

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('Party Wiped', canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = '13px Courier New';
      ctx.fillText('Center to start a new hunt', canvas.width / 2, canvas.height / 2 + 14);
    }

    drawBattleResultOverlay();

    drawEncounterTransitionOverlay();
  }

  function drawTownScene() {
    const town = activeTownship || getTownshipAt() || townships[0];
    const profile = town?.profile || routeProfiles[0];
    const panelFill = 'rgba(255,255,255,0.95)';
    const landmark = landmarkSprites[profile.landmark];
    const boss = profile.boss;
    const bossState = bossStateForTown(town);
    const visibleShopRows = 5;
    const shopListStart = Math.max(0, Math.min(
      townSelection - Math.floor(visibleShopRows / 2),
      Math.max(0, shopItems.length - visibleShopRows)
    ));
    const visibleShopItems = shopItems.slice(shopListStart, shopListStart + visibleShopRows);

    ctx.fillStyle = profile.palette?.plain || '#d7efc3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = profile.palette?.grass || '#8fc16d';
    ctx.fillRect(0, 134, canvas.width, 74);
    ctx.fillStyle = profile.palette?.path || '#6e9d51';
    ctx.fillRect(0, 148, canvas.width, 60);

    ctx.fillStyle = '#eadfbc';
    ctx.fillRect(28, 58, 110, 82);
    ctx.fillRect(176, 74, 96, 66);
    ctx.fillStyle = '#cc6a54';
    ctx.fillRect(20, 44, 126, 24);
    ctx.fillRect(168, 62, 112, 18);
    ctx.fillStyle = '#39462e';
    ctx.fillRect(72, 105, 22, 35);
    ctx.fillRect(208, 104, 28, 36);
    ctx.fillStyle = '#9cc8f2';
    ctx.fillRect(42, 78, 20, 16);
    ctx.fillRect(102, 78, 20, 16);
    ctx.fillRect(188, 88, 18, 14);
    ctx.fillRect(242, 88, 18, 14);

    ctx.fillStyle = panelFill;
    ctx.fillRect(14, 12, 284, 184);
    ctx.strokeStyle = '#465538';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 12, 284, 184);
    ctx.fillStyle = 'rgba(207,229,184,0.38)';
    ctx.fillRect(22, 18, 268, 32);
    ctx.fillStyle = 'rgba(70,85,56,0.12)';
    ctx.fillRect(22, 56, 268, 108);

    ctx.fillStyle = '#465538';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(town ? town.name : 'Town Services', canvas.width / 2, 29);
    ctx.font = 'bold 10px Courier New';
    ctx.fillText(boss ? `${boss.badge} Badge · ${boss.trainer} · ${bossState.short}` : `Coins ${coins}  Cap ${capsules}/${maxCapsules}  Rods ${rods}`, canvas.width / 2, 42);

    drawPixelSprite(capsuleSprite, { '1': '#7b5cff', '2': '#c6b8ff', '3': '#2d2d2d', '4': '#ffffff' }, 30, 21, 2);
    drawPixelSprite(coinSprite, { '1': '#c9922d', '2': '#f2cf67', '3': '#9b6b22' }, 256, 21, 2);
    if (landmark) {
      drawPixelSprite(landmark.sprite, landmark.palette, 148, 48, 1);
    }

    visibleShopItems.forEach((item, offset) => {
      const index = shopListStart + offset;
      const y = 74 + offset * 18;
      if (index === townSelection) {
        ctx.fillStyle = colorWithAlpha('#cfe5b8', 0.8 + Math.sin(performance.now() * 0.01) * 0.08);
        ctx.fillRect(26, y - 10, 260, 16);
      }
      ctx.fillStyle = '#39462e';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, 34, y);
      ctx.textAlign = 'right';
      ctx.fillText(item.cost
        ? `${item.cost}c`
        : item.key === 'leave'
          ? 'Exit'
          : item.key === 'boss'
            ? bossState.short
            : 'Free', 278, y);
    });

    if (shopListStart > 0) {
      ctx.fillStyle = '#5c724a';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'right';
      ctx.fillText('^', 284, 63);
    }
    if (shopListStart + visibleShopRows < shopItems.length) {
      ctx.fillStyle = '#5c724a';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'right';
      ctx.fillText('v', 284, 160);
    }

    const footerDetail = fitTownFooterText(currentTownSelectionDetail());
    ctx.fillStyle = 'rgba(45,56,34,0.92)';
    ctx.fillRect(14, 176, 284, 22);
    ctx.fillStyle = '#eff7df';
    ctx.textAlign = 'center';
    ctx.font = `bold ${footerDetail ? 8 : 9}px Courier New`;
    ctx.fillText(footerDetail || 'Wheel/Prev/Next: Browse', canvas.width / 2, 185);
    ctx.font = 'bold 9px Courier New';
    ctx.fillText('Center: Select  |  Play: Exit', canvas.width / 2, 194);
  }

  function drawMonsterIndex() {
    const species = speciesList[indexSelection];
    const dex = monsterDex[species.name] || { seen: false, caught: false, routes: [] };
    const knownRoutes = dex.routes.length ? dex.routes : routesForSpecies(species.name);
    const rarity = routeProfiles.flatMap(profile => ([...(profile.pool || []), ...(profile.specials || []), ...(profile.fishPool || []), ...(profile.fishSpecials || [])]))
      .find(entry => entry.species === species.name)?.rarity || 'common';
    const passiveText = passiveTraitText(species);
    const typeText = typeLabelForMonster(species);

    ctx.fillStyle = '#eef4df';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d9e6bc';
    ctx.fillRect(10, 10, 292, 188);
    ctx.strokeStyle = '#5a7044';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 292, 188);

    ctx.fillStyle = '#415435';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Monster Index', canvas.width / 2, 28);
    ctx.font = 'bold 11px Courier New';
    ctx.fillText(`${species.name}  |  ${(rarityMeta[rarity] || rarityMeta.common).label}`, canvas.width / 2, 44);
    drawTypeBadge(typeKeyForMonster(species), typeLabelForMonster(species), 212, 52, { minWidth: 44, height: 12, font: 'bold 8px Trebuchet MS' });

    drawMonsterSprite({ ...species, sprite: species.sprite }, 32, 58, 4);

    ctx.textAlign = 'left';
    ctx.font = 'bold 10px Courier New';
    ctx.fillStyle = '#415435';
    ctx.fillText(`Seen: ${dex.seen ? 'Yes' : 'No'}`, 138, 70);
    ctx.fillText(`Caught: ${dex.caught ? 'Yes' : 'No'}`, 138, 86);
    ctx.fillText(`Type: ${typeText}`, 138, 102);
    ctx.fillText(`Base HP: ${species.hp}`, 138, 118);
    ctx.fillText(`Atk: ${species.atkMin}-${species.atkMax}`, 138, 134);
    ctx.fillText(`Trait: ${passiveTraitShort(species)}`, 138, 150);

    ctx.font = '9px Courier New';
    const passiveLines = (passiveText.match(/.{1,24}(?:\s|$)/g) || [passiveText]).slice(0, 2);
    passiveLines.forEach((line, index) => {
      ctx.fillText(line.trim(), 138, 160 + index * 9);
    });

    ctx.font = 'bold 10px Courier New';
    ctx.fillText('Routes:', 138, 180);

    ctx.font = '10px Courier New';
    const routeText = knownRoutes.length ? knownRoutes.join(', ') : 'Unknown';
    const routeLines = routeText.match(/.{1,24}(?:, |$)/g) || [routeText];
    routeLines.slice(0, 1).forEach((line, index) => {
      ctx.fillText(line.trim(), 138, 191 + index * 10);
    });

    ctx.fillStyle = 'rgba(45,56,34,0.92)';
    ctx.fillRect(10, 176, 292, 22);
    ctx.fillStyle = '#eff7df';
    ctx.textAlign = 'center';
    ctx.fillText('Prev/Next or Wheel: Browse  |  Center/Play: Back', canvas.width / 2, 191);
  }

  function drawStorageMenu() {
    const uiFont = 'Trebuchet MS';
    const fitText = (text, maxWidth) => {
      const value = String(text || '');
      if (ctx.measureText(value).width <= maxWidth) return value;
      let trimmed = value;
      while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
        trimmed = trimmed.slice(0, -1);
      }
      return `${trimmed}...`;
    };
    const selectedMonster = selectedStorageMonster();
    const activeStart = Math.max(0, Math.min(storagePartySelection, Math.max(0, party.length - 5)));
    const storedStart = Math.max(0, Math.min(storageBoxSelection, Math.max(0, storedMonsters.length - 5)));

    ctx.fillStyle = '#edf3e2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d8e5cd';
    ctx.fillRect(10, 10, 292, 188);
    ctx.strokeStyle = '#5a7044';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 292, 188);

    ctx.fillStyle = '#415435';
    ctx.font = `bold 14px ${uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('Storage Box', canvas.width / 2, 26);
    ctx.font = `bold 9px ${uiFont}`;
    ctx.fillText(`Party ${party.length}/${activePartyLimit}  •  Stored ${storedMonsters.length}`, canvas.width / 2, 39);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(18, 48, 110, 108);
    ctx.fillRect(134, 48, 110, 108);
    ctx.fillRect(250, 48, 44, 108);
    ctx.strokeStyle = '#6a7f57';
    ctx.strokeRect(18, 48, 110, 108);
    ctx.strokeRect(134, 48, 110, 108);
    ctx.strokeRect(250, 48, 44, 108);

    ctx.fillStyle = '#415435';
    ctx.font = `bold 10px ${uiFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('Active', 24, 62);
    ctx.fillText('Stored', 140, 62);
    ctx.fillText('Info', 256, 62);

    party.slice(activeStart, activeStart + 5).forEach((monster, offset) => {
      const index = activeStart + offset;
      const rowY = 72 + offset * 16;
      const highlighted = storageMenuColumn === 'party' && index === storagePartySelection;
      const pending = storageSwapPending?.source === 'party' && storageSwapPending.index === index;
      ctx.fillStyle = pending ? '#f6e29d' : highlighted ? '#d5ebb9' : 'rgba(81,100,69,0.08)';
      ctx.fillRect(22, rowY - 10, 102, 14);
      ctx.fillStyle = '#304027';
      ctx.font = `bold 8px ${uiFont}`;
      ctx.fillText(fitText(`${index === activeIndex ? '> ' : ''}${monsterDisplayName(monster)}`, 70), 25, rowY - 1);
      ctx.textAlign = 'right';
      ctx.fillText(`Lv${monster.level}`, 120, rowY - 1);
      ctx.textAlign = 'left';
    });

    storedMonsters.slice(storedStart, storedStart + 5).forEach((monster, offset) => {
      const index = storedStart + offset;
      const rowY = 72 + offset * 16;
      const highlighted = storageMenuColumn === 'storage' && index === storageBoxSelection;
      const pending = storageSwapPending?.source === 'storage' && storageSwapPending.index === index;
      ctx.fillStyle = pending ? '#f6e29d' : highlighted ? '#d5ebb9' : 'rgba(81,100,69,0.08)';
      ctx.fillRect(138, rowY - 10, 102, 14);
      ctx.fillStyle = '#304027';
      ctx.font = `bold 8px ${uiFont}`;
      ctx.fillText(fitText(monsterDisplayName(monster), 70), 141, rowY - 1);
      ctx.textAlign = 'right';
      ctx.fillText(`Lv${monster.level}`, 236, rowY - 1);
      ctx.textAlign = 'left';
    });

    if (selectedMonster) {
      drawMonsterSprite(selectedMonster, 258, 70, 3, 'battle');
      ctx.fillStyle = '#415435';
      ctx.font = `bold 8px ${uiFont}`;
      ctx.fillText(typeShortForMonster(selectedMonster), 254, 104);
      ctx.fillText(`HP ${selectedMonster.hp}/${selectedMonster.maxHp}`, 254, 116);
      ctx.fillText(`ATK ${selectedMonster.atkMin}-${selectedMonster.atkMax}`, 254, 128);
      ctx.fillText(passiveTraitShort(selectedMonster), 254, 140);
    }

    ctx.fillStyle = 'rgba(45,56,34,0.92)';
    ctx.fillRect(18, 164, 276, 26);
    ctx.fillStyle = '#eff7df';
    ctx.textAlign = 'center';
    ctx.font = `bold 8px ${uiFont}`;
    if (storageSwapPending?.source === 'party') {
      ctx.fillText('Choose a stored monster to swap into the active party.', canvas.width / 2, 174);
      ctx.fillText('Prev/Next Browse  •  Center Confirm Swap  •  Play Back', canvas.width / 2, 184);
    } else if (storageSwapPending?.source === 'storage') {
      ctx.fillText('Choose the active party monster to swap out.', canvas.width / 2, 174);
      ctx.fillText('Prev/Next Browse  •  Center Confirm Swap  •  Play Back', canvas.width / 2, 184);
    } else if (storageMenuColumn === 'storage' && party.length < activePartyLimit) {
      ctx.fillText('Center on a stored monster to move it into an open party slot.', canvas.width / 2, 174);
      ctx.fillText('Prev/Next Browse  •  Center Withdraw  •  Play Back', canvas.width / 2, 184);
    } else {
      ctx.fillText('Center begins a swap. Stored monsters can join if party has room.', canvas.width / 2, 174);
      ctx.fillText('Prev/Next Browse  •  Play Back  •  Use menu row to reopen town', canvas.width / 2, 184);
    }
  }

  function drawPlayerMenu() {
    const monster = selectedPartyMonster();
    const actions = playerMenuActions(monster);
    const selectedAction = actions[playerMenuActionSelection] || actions[0];
    const currentListIndex = playerMenuMode === 'swap' ? playerMenuSwapSelection : playerMenuSelection;
    const listStart = Math.max(0, Math.min(currentListIndex, Math.max(0, party.length - 5)));
    const uiFont = 'Trebuchet MS';
    const fitText = (text, maxWidth) => {
      const value = String(text || '');
      if (ctx.measureText(value).width <= maxWidth) return value;
      let trimmed = value;
      while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
        trimmed = trimmed.slice(0, -1);
      }
      return `${trimmed}...`;
    };
    const wrapText = (text, maxWidth, maxLines = 2) => {
      const words = String(text || '').split(/\s+/).filter(Boolean);
      const lines = [];
      let current = '';

      words.forEach(word => {
        const next = current ? `${current} ${word}` : word;
        if (ctx.measureText(next).width <= maxWidth || !current) {
          current = next;
          return;
        }
        lines.push(current);
        current = word;
      });

      if (current) lines.push(current);
      if (lines.length <= maxLines) return lines;

      const clipped = lines.slice(0, maxLines);
      clipped[maxLines - 1] = fitText(clipped[maxLines - 1], maxWidth);
      return clipped;
    };
    const drawMeter = (x, y, width, height, fillRatio, fillColor, backColor = 'rgba(57,80,57,0.16)', borderColor = 'rgba(63,87,63,0.55)') => {
      const clamped = Math.max(0, Math.min(1, fillRatio || 0));
      ctx.fillStyle = backColor;
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = fillColor;
      ctx.fillRect(x + 1, y + 1, Math.max(0, Math.round((width - 2) * clamped)), Math.max(0, height - 2));
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    };

    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#edf4e4');
    bgGradient.addColorStop(1, '#c9dcb8');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(116,149,94,0.18)';
    for (let y = 0; y < canvas.height; y += 12) {
      ctx.fillRect(0, y, canvas.width, 5);
    }

    ctx.fillStyle = '#d8e4cf';
    ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = '#5b7247';
    ctx.fillRect(8, 8, canvas.width - 16, 6);
    ctx.fillRect(8, canvas.height - 14, canvas.width - 16, 6);
    ctx.fillRect(8, 8, 6, canvas.height - 16);
    ctx.fillRect(canvas.width - 14, 8, 6, canvas.height - 16);
    ctx.strokeStyle = '#516445';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.strokeStyle = 'rgba(247,252,238,0.8)';
    ctx.strokeRect(13, 13, canvas.width - 26, canvas.height - 26);

    [[20, 20], [canvas.width - 20, 20], [20, canvas.height - 20], [canvas.width - 20, canvas.height - 20]].forEach(([cx, cy]) => {
      ctx.fillStyle = '#f4f7ec';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.fillStyle = '#7a9460';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    });

    ctx.fillStyle = '#395039';
    ctx.font = `bold 15px ${uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('Party', canvas.width / 2, 24);
    ctx.font = `600 9px ${uiFont}`;
    ctx.fillText(`Party ${party.length}  •  Tonics ${tonics}  •  Lead ${fitText(monsterDisplayName(activeMonster()) || 'None', 92)}`, canvas.width / 2, 38);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(16, 48, 104, 120);
    ctx.fillRect(126, 48, 168, 120);
    ctx.strokeStyle = '#6a7f57';
    ctx.strokeRect(16, 48, 104, 120);
    ctx.strokeRect(126, 48, 168, 120);

    ctx.fillStyle = '#395039';
    ctx.font = `bold 10px ${uiFont}`;
    ctx.textAlign = 'left';
    ctx.fillText(playerMenuMode === 'swap' ? 'Swap Target' : 'Party List', 24, 62);

    party.slice(listStart, listStart + 5).forEach((entry, offset) => {
      const index = listStart + offset;
      const rowY = 74 + offset * 18;
      const highlighted = playerMenuMode === 'swap' ? index === playerMenuSwapSelection : index === playerMenuSelection;
      ctx.fillStyle = highlighted ? '#d5ebb9' : 'rgba(81,100,69,0.08)';
      ctx.fillRect(20, rowY - 11, 96, 18);
      ctx.fillStyle = highlighted ? '#263926' : '#395039';
      ctx.font = `bold 9px ${uiFont}`;
      ctx.fillText(fitText(`${index === activeIndex ? '> ' : ''}${monsterDisplayName(entry)}`, 66), 24, rowY - 1);
      ctx.textAlign = 'right';
      ctx.fillText(`Lv${entry.level}`, 112, rowY - 1);
      ctx.textAlign = 'left';
      ctx.font = `8px ${uiFont}`;
      ctx.fillStyle = '#546954';
      ctx.fillText(fitText(`HP ${entry.hp}/${entry.maxHp}${statusText(entry)}`, 88), 24, rowY + 7);
    });

    if (monster) {
      drawMonsterSprite(monster, 134, 56, 3, 'battle');
      drawTypeBadge(typeKeyForMonster(monster), typeLabelForMonster(monster), 244, 56, { minWidth: 42, height: 12, font: 'bold 8px Trebuchet MS' });
      ctx.fillStyle = '#395039';
      ctx.font = `bold 12px ${uiFont}`;
      ctx.textAlign = 'left';
      ctx.fillText(fitText(`${monsterDisplayName(monster)}${monster.shiny ? ' *' : ''}`, 56), 182, 64);

      ctx.font = `9px ${uiFont}`;
      ctx.fillStyle = '#4e624e';
      ctx.fillText(fitText(`Species: ${monster.species}`, 52), 182, 76);
      ctx.fillText(fitText(`Type: ${typeLabelForMonster(monster)}`, 52), 182, 86);

      const hpRatio = monster.maxHp > 0 ? monster.hp / monster.maxHp : 0;
      const xpRatio = monster.xpToNext > 0 ? monster.xp / monster.xpToNext : 0;
      ctx.font = `bold 8px ${uiFont}`;
      ctx.fillStyle = '#395039';
      ctx.fillText('HP', 182, 98);
      ctx.fillText('XP', 238, 98);
      drawMeter(182, 101, 48, 7, hpRatio, '#da6f6f');
      drawMeter(238, 101, 48, 7, xpRatio, '#6d96d7');

      const statLines = [
        `Lv ${monster.level}`,
        `HP ${monster.hp}/${monster.maxHp}`,
        `XP ${monster.xp}/${monster.xpToNext}`,
        `ATK ${monster.atkMin}-${monster.atkMax}`,
        `Status ${statusShortLabel(monster) || 'OK'}`
      ];
      ctx.font = `bold 9px ${uiFont}`;
      ctx.fillStyle = '#395039';
      statLines.forEach((line, index) => {
        ctx.fillText(line, 182, 118 + index * 8);
      });

      ctx.font = `bold 9px ${uiFont}`;
      ctx.fillText('Trait', 132, 122);
      ctx.font = `8px ${uiFont}`;
      ctx.fillStyle = '#4e624e';
      wrapText(passiveTraitText(monster), 44, 4).forEach((line, index) => {
        ctx.fillText(line, 132, 132 + index * 8);
      });

      ctx.font = `bold 9px ${uiFont}`;
      ctx.fillStyle = '#395039';
      ctx.fillText('Moves', 238, 118);
      ctx.font = `8px ${uiFont}`;
      attacksForMonster(monster).slice(0, 4).forEach((move, index) => {
        ctx.fillText(fitText(`${index + 1}. ${move.name}`, 48), 238, 128 + index * 8);
      });
    }

    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fillRect(16, 172, 278, 26);
    ctx.strokeStyle = '#6a7f57';
    ctx.strokeRect(16, 172, 278, 26);
    ctx.fillStyle = '#395039';
    ctx.font = `bold 8px ${uiFont}`;
    ctx.textAlign = 'center';

    if (playerMenuMode === 'actions') {
      ctx.fillText(fitText(`${selectedAction?.label || 'Action'} • ${selectedAction?.detail || ''}`, 248), canvas.width / 2, 181);
      ctx.fillText('Prev/Next Action  •  Center Confirm  •  Play Back', canvas.width / 2, 191);
    } else if (playerMenuMode === 'swap') {
      ctx.fillText('Choose who trades positions with the selected monster.', canvas.width / 2, 181);
      ctx.fillText('Prev/Next Target  •  Center Swap  •  Play Cancel', canvas.width / 2, 191);
    } else {
      ctx.fillText('Prev/Next or Wheel Browse  •  Center Actions', canvas.width / 2, 181);
      ctx.fillText('Play Close  •  > marks the current lead monster', canvas.width / 2, 191);
    }
  }

  function drawBattleScene() {
    const lead = activeMonster();
    const layout = battleLayout();
    const now = performance.now();
    const enemyIdle = Math.sin(now * 0.005 + 0.8) * 1.3;
    const allyIdle = Math.sin(now * 0.005 + 2.4) * 1.1;
    const enemyNameText = battleTarget.isBoss
      ? `${battleTarget.trainerName} · ${battleTarget.name} Lv${battleTarget.level}${statusText(battleTarget)}`
      : `${shinyLabel(battleTarget)}${(rarityMeta[battleTarget.rarity] || rarityMeta.common).label} ${battleTarget.name} Lv${battleTarget.level}${statusText(battleTarget)}`;
    const enemyHpText = `HP ${battleTarget.hp}/${battleTarget.maxHp}`;
    const enemyTraitText = `${typeShortForMonster(battleTarget)} · ${passiveTraitShort(battleTarget)}`;
    const leadNameText = `${lead ? `${shinyLabel(lead)}${monsterDisplayName(lead)}` : 'No Lead'} Lv${lead ? lead.level : 0}${lead ? statusText(lead) : ''}`;
    const leadHpText = `HP ${lead ? lead.hp : 0}/${lead ? lead.maxHp : 0}`;
    const leadTraitText = lead ? `${typeShortForMonster(lead)} · ${passiveTraitShort(lead)}` : 'No Trait';

    ctx.fillStyle = '#d6efbf';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#afd67e';
    ctx.fillRect(0, 130, canvas.width, 78);
    ctx.fillStyle = '#96c36f';
    ctx.fillRect(0, 145, canvas.width, 63);

    ctx.font = 'bold 10px Courier New';
    const panelPadding = 8;
    const panelMinWidth = 126;
    const panelMaxWidth = 166;
    const enemyPanelWidth = Math.max(
      panelMinWidth,
      Math.min(panelMaxWidth, Math.ceil(Math.max(ctx.measureText(enemyNameText).width, ctx.measureText(enemyHpText).width)) + panelPadding * 2)
    );
    const leadPanelWidth = Math.max(
      panelMinWidth,
      Math.min(panelMaxWidth, Math.ceil(Math.max(ctx.measureText(leadNameText).width, ctx.measureText(leadHpText).width)) + panelPadding * 2)
    );
    const enemyPanelX = 14;
    const leadPanelX = canvas.width - 14 - leadPanelWidth;
    const wrapBattleText = (text, maxWidth, maxLines = Infinity) => {
      const words = String(text || '').split(/\s+/).filter(Boolean);
      const lines = [];
      let current = '';

      words.forEach(word => {
        const next = current ? `${current} ${word}` : word;
        if (!current || ctx.measureText(next).width <= maxWidth) {
          current = next;
          return;
        }
        lines.push(current);
        current = word;
      });

      if (current) lines.push(current);
      return lines.slice(0, maxLines);
    };
    const enemyNameLines = wrapBattleText(enemyNameText, enemyPanelWidth - 48, 2);
    const enemyTraitLines = wrapBattleText(enemyTraitText, enemyPanelWidth - 48, 2);
    const leadNameLines = wrapBattleText(leadNameText, leadPanelWidth - 48, 2);
    const leadTraitLines = wrapBattleText(leadTraitText, leadPanelWidth - 48, 2);
    const panelLineHeight = 9;
    const panelTopPadding = 10;
    const enemyPanelHeight = panelTopPadding + (enemyNameLines.length * panelLineHeight) + panelLineHeight + (enemyTraitLines.length * panelLineHeight) + 6;
    const leadPanelHeight = panelTopPadding + (leadNameLines.length * panelLineHeight) + panelLineHeight + (leadTraitLines.length * panelLineHeight) + 6;

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(layout.enemyCenterX + 10, layout.enemyCenterY + 24, 28 + Math.sin(now * 0.004) * 1.5, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(layout.allyCenterX + 16, layout.allyCenterY + 28, 26 + Math.sin(now * 0.004 + 1.2) * 1.2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const animationEffects = drawBattleAnimationEffects(layout);

    drawMonsterSprite(battleTarget, layout.enemyX + animationEffects.enemyOffsetX, layout.enemyY + animationEffects.enemyOffsetY + enemyIdle, 4, 'battle');
    if (battleTarget.shiny) {
      drawShinySparkles(layout.enemyCenterX, layout.enemyCenterY - 2, 25, now * 0.006);
    }
    if (lead) {
      drawMonsterSprite(lead, layout.allyX + animationEffects.allyOffsetX, layout.allyY + animationEffects.allyOffsetY + allyIdle, 4, 'battle');
      if (lead.shiny) {
        drawShinySparkles(layout.allyCenterX, layout.allyCenterY, 20, now * 0.006 + 1.2);
      }
    }

    ctx.fillStyle = '#eef7df';
    ctx.fillRect(enemyPanelX, 14, enemyPanelWidth, enemyPanelHeight);
    ctx.fillRect(leadPanelX, 98, leadPanelWidth, leadPanelHeight);
    ctx.strokeStyle = '#39462e';
    ctx.lineWidth = 2;
    ctx.strokeRect(enemyPanelX, 14, enemyPanelWidth, enemyPanelHeight);
    ctx.strokeRect(leadPanelX, 98, leadPanelWidth, leadPanelHeight);

    ctx.fillStyle = '#39462e';
    ctx.textAlign = 'left';
    ctx.font = 'bold 9px Courier New';
    enemyNameLines.forEach((line, index) => {
      ctx.fillText(line, enemyPanelX + panelPadding, 24 + index * panelLineHeight);
    });
    ctx.fillText(enemyHpText, enemyPanelX + panelPadding, 24 + enemyNameLines.length * panelLineHeight + 2);
    enemyTraitLines.forEach((line, index) => {
      ctx.fillText(line, enemyPanelX + panelPadding, 24 + enemyNameLines.length * panelLineHeight + 2 + panelLineHeight + index * panelLineHeight);
    });
    drawTypeBadge(typeKeyForMonster(battleTarget), typeShortForMonster(battleTarget), enemyPanelX + enemyPanelWidth - 30, 17, { minWidth: 22, height: 10, font: 'bold 7px Trebuchet MS' });
    leadNameLines.forEach((line, index) => {
      ctx.fillText(line, leadPanelX + panelPadding, 108 + index * panelLineHeight);
    });
    ctx.fillText(leadHpText, leadPanelX + panelPadding, 108 + leadNameLines.length * panelLineHeight + 2);
    leadTraitLines.forEach((line, index) => {
      ctx.fillText(line, leadPanelX + panelPadding, 108 + leadNameLines.length * panelLineHeight + 2 + panelLineHeight + index * panelLineHeight);
    });
    if (lead) {
      drawTypeBadge(typeKeyForMonster(lead), typeShortForMonster(lead), leadPanelX + leadPanelWidth - 30, 101, { minWidth: 22, height: 10, font: 'bold 7px Trebuchet MS' });
    }

    ctx.fillStyle = 'rgba(45,56,34,0.94)';
    ctx.fillRect(0, 148, canvas.width, 60);
    ctx.strokeStyle = 'rgba(239,247,223,0.18)';
    ctx.strokeRect(0, 148, canvas.width, 60);
    ctx.font = 'bold 10px Courier New';

    if (battleMenuMode === 'root') {
      ctx.fillStyle = '#eff7df';
      ctx.textAlign = 'center';
      ctx.fillText('Choose action', canvas.width / 2, 160);
      battleRootOptions.forEach((option, index) => {
        const isLast = index === battleRootOptions.length - 1 && battleRootOptions.length % 2 === 1;
        const col = isLast ? 0 : index % 2;
        const row = Math.floor(index / 2);
        const boxX = isLast ? 10 : 10 + col * 148;
        const boxY = 166 + row * 13;
        const boxWidth = isLast ? 292 : 144;
        const selected = index === battleMenuSelection;
        ctx.fillStyle = selected ? '#d7efb9' : 'rgba(239,247,223,0.14)';
        ctx.fillRect(boxX, boxY, boxWidth, 12);
        ctx.strokeStyle = selected ? '#eff7df' : 'rgba(239,247,223,0.22)';
        ctx.strokeRect(boxX, boxY, boxWidth, 12);
        ctx.fillStyle = selected ? '#304027' : '#eff7df';
        ctx.textAlign = 'center';
        ctx.fillText(option.label, boxX + boxWidth / 2, boxY + 8);
      });
      return;
    }

    const entries = currentBattleMenuEntries();
    ctx.fillStyle = '#eff7df';
    ctx.textAlign = 'center';
    ctx.fillText(battleMenuMode === 'attack' ? 'Choose an attack' : battleMenuMode === 'item' ? 'Choose an item' : 'Choose a partner', canvas.width / 2, 159);

    if (!entries.length) {
      ctx.fillText(battleMenuMode === 'switch' ? 'No healthy partners' : 'No usable items', canvas.width / 2, 184);
    } else {
      const windowStart = Math.max(0, Math.min(battleSubSelection, Math.max(0, entries.length - 2)));
      entries.slice(windowStart, windowStart + 2).forEach((entry, offset) => {
        const index = windowStart + offset;
        const boxY = 165 + offset * 21;
        const boxHeight = 19;
        const selected = index === battleSubSelection;
        const titleLines = wrapBattleText(entry.name || entry.label, 150, 2);
        ctx.fillStyle = selected ? '#d7efb9' : 'rgba(239,247,223,0.14)';
        ctx.fillRect(12, boxY, 288, boxHeight);
        ctx.strokeStyle = selected ? '#eff7df' : 'rgba(239,247,223,0.22)';
        ctx.strokeRect(12, boxY, 288, boxHeight);
        ctx.fillStyle = selected ? '#304027' : '#eff7df';
        ctx.textAlign = 'left';
        ctx.font = 'bold 9px Courier New';
        titleLines.forEach((line, lineIndex) => {
          ctx.fillText(line, 18, boxY + 8 + lineIndex * 7);
        });
        const detail = entry.detail || moveDetailText(entry);
        const detailLines = wrapBattleText(detail, 116, 2);
        ctx.font = '7px Courier New';
        ctx.fillStyle = selected ? '#304027' : '#d9ebc8';
        detailLines.forEach((line, lineIndex) => {
          ctx.fillText(line, 174, boxY + 8 + lineIndex * 7);
        });
      });
      if (entries.length > 2) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 9px Courier New';
        ctx.fillStyle = '#eff7df';
        ctx.fillText(`${battleSubSelection + 1}/${entries.length}`, canvas.width / 2, 205);
      }
    }
  }

  function endRun(reason) {
    stopEncounterTransition();
    stopBattleAnimation();
    stopFishingAnimation();
    gameOver = true;
    battleTarget = null;
    updateHighScore();
    setMessage(`${reason} Final score: ${currentScore()}.`);
    updateTamerUi();
    drawTamerWorld();
  }

  function switchToHealthyLead() {
    const idx = firstHealthyMonsterIndex();
    if (idx >= 0) {
      activeIndex = idx;
      return true;
    }
    return false;
  }

  function awardExperience(monster, amount) {
    if (!monster) return 0;
    const cap = progressionLevelCap();
    const overCap = Math.max(0, monster.level - cap);
    const modifier = overCap <= 0 ? 1 : Math.max(0.08, 0.48 - overCap * 0.06);
    let levelsGained = 0;
    monster.xp += Math.max(1, Math.round(amount * modifier));
    while (monster.xp >= monster.xpToNext) {
      monster.xp -= monster.xpToNext;
      monster.level += 1;
      monster.maxHp += 2;
      monster.hp = monster.maxHp;
      monster.atkMin += 1;
      if (monster.level % 2 === 0) monster.atkMax += 1;
      monster.xpToNext = 5 + monster.level * 4;
      levelsGained += 1;
    }
    return levelsGained;
  }

  function awardSupportExperience(leadMonster, defeatedMonster) {
    const supportGain = Math.max(1, Math.floor((2 + defeatedMonster.level) * 0.6));
    party.forEach(monster => {
      if (!monster || monster === leadMonster || monster.hp <= 0) return;
      awardExperience(monster, supportGain);
    });
  }

  function stepWorld() {
    worldTick += 1;
    getRelevantChunks(chunkRadius + 1).forEach(chunk => {
      chunk.monsters.forEach(monster => {
        if (monster.isTrainer) return;
        if (Math.random() < 0.68) return;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const choice = dirs[wrapIndex(monster.roamBias + worldTick + monster.x + monster.y, dirs.length)];
        if (!choice) return;
        const nx = monster.x + choice[0];
        const ny = monster.y + choice[1];
        if (Math.abs(nx - player.x) > viewCols || Math.abs(ny - player.y) > viewRows) return;
        if (isBlocked(nx, ny) || (nx === player.x && ny === player.y) || monsterOccupied(nx, ny, monster)) return;
        monster.x = nx;
        monster.y = ny;
      });
    });

    if (steps % 9 === 0) {
      for (let i = 0; i < 6; i++) {
        const px = player.x + Math.floor(Math.random() * (viewCols + 6)) - Math.floor(viewCols / 2) - 3;
        const py = player.y + Math.floor(Math.random() * (viewRows + 4)) - Math.floor(viewRows / 2) - 2;
        if (Math.abs(px - player.x) + Math.abs(py - player.y) < 5) continue;
        if (terrainAt(px, py) !== 'grass' && terrainAt(px, py) !== 'plain') continue;
        if (monsterOccupied(px, py)) continue;
        getChunk(Math.floor(px / chunkSize), Math.floor(py / chunkSize)).monsters.push(createWildMonster(px, py, Math.random() < 0.35 ? 1 : 0, worldTick + steps + i));
        break;
      }
    }

    updateHighScore();
    updateTamerUi();
    drawTamerWorld();
  }

  function beginBattle(monster) {
    resetBattleMenu();
    startEncounterTransition(monster);
    updateTamerUi();
    drawTamerWorld();
  }

  function sendNextTrainerMonster(trainerMonster, introMessage = '') {
    if (!trainerMonster?.isTrainer || !trainerMonster.trainerReserve?.length) return false;

    const nextMonster = trainerMonster.trainerReserve.shift();
    const preserved = {
      id: trainerMonster.id,
      x: trainerMonster.x,
      y: trainerMonster.y,
      isTrainer: true,
      trainerName: trainerMonster.trainerName,
      trainerReserve: trainerMonster.trainerReserve,
      trainerPalette: trainerMonster.trainerPalette
    };

    Object.assign(trainerMonster, nextMonster, preserved);
    battleTarget = trainerMonster;
    resetBattleMenu();
    setMessage(joinBattleText(introMessage, `Trainer ${trainerMonster.trainerName} sent out ${trainerMonster.name}.`));
    updateHighScore();
    updateTamerUi();
    drawTamerWorld();
    return true;
  }

  function resolveBattleVictory(ally, defeatedMonster) {
    const xpGain = 2 + defeatedMonster.level;
    const finalTrainerMon = defeatedMonster.isTrainer && !(defeatedMonster.trainerReserve || []).length;
    const coinGain = 3 + defeatedMonster.level * 2 + Math.max(0, (rarityMeta[defeatedMonster.rarity] || rarityMeta.common).coinBonus - 1) + (defeatedMonster.bossRewardCoins || 0) + (finalTrainerMon ? Math.max(0, (defeatedMonster.trainerRewardCoins || 0) - 4) : 0);
    const levels = awardExperience(ally, xpGain);
    awardSupportExperience(ally, defeatedMonster);
    coins += coinGain;
    const recovery = recoverLeadAfterEncounter(2, defeatedMonster.x, defeatedMonster.y);
    const evolutionMessage = maybeEvolveMonster(ally);
    let victoryMessage = levels > 0
      ? recovery > 0
        ? `${ally.name} won, earned ${coinGain}c, grew to Lv${ally.level}, and recovered ${recovery} HP.`
        : `${ally.name} won, earned ${coinGain}c, and grew to Lv${ally.level}.`
      : recovery > 0
        ? `${ally.name} defeated ${defeatedMonster.name}, earned ${coinGain}c, and recovered ${recovery} HP.`
        : `${ally.name} defeated ${defeatedMonster.name} and earned ${coinGain}c.`;

    if (defeatedMonster.isBoss && defeatedMonster.badgeName && !badges.includes(defeatedMonster.badgeName)) {
      badges.push(defeatedMonster.badgeName);
      victoryMessage = `${ally.name} won the ${defeatedMonster.badgeName} Badge and ${coinGain}c.`;
      const badgeEvolutions = maybeEvolveParty();
      if (badgeEvolutions.length) {
        victoryMessage = joinBattleText(victoryMessage, badgeEvolutions.join(' '));
      }
    }

    if (defeatedMonster.isTrainer && defeatedMonster.trainerReserve?.length) {
      defeated += 1;
      sendNextTrainerMonster(defeatedMonster, joinBattleText(victoryMessage, evolutionMessage));
      return;
    }

    if (finalTrainerMon) {
      victoryMessage = `${ally.name} beat Trainer ${defeatedMonster.trainerName} and earned ${coinGain}c.`;
      if (levels > 0) victoryMessage = `${victoryMessage} ${ally.name} grew to Lv${ally.level}.`;
      if (recovery > 0) victoryMessage = `${victoryMessage} ${ally.name} recovered ${recovery} HP.`;
    }

    showBattleResult(battleBannerTitle(defeatedMonster), coinGain > 0 ? `+${coinGain}c` : 'Battle cleared');
    setMessage(joinBattleText(victoryMessage, evolutionMessage));
    removeMonster(defeatedMonster);
    battleTarget = null;
    defeated += 1;
    resetBattleMenu();
    stepWorld();
  }

  function chooseEnemyMove(enemy) {
    const moves = attacksForMonster(enemy);
    if (!moves.length) return null;
    if (enemy.hp <= Math.ceil(enemy.maxHp * 0.4)) {
      const sustainMove = moves.find(move => move.healRatio || move.selfEffect?.type === 'regen');
      if (sustainMove && Math.random() < 0.7) return sustainMove;
    }
    if (enemy.statusKey !== 'stun') {
      const controlMove = moves.find(move => move.effect?.type === 'stun');
      if (controlMove && Math.random() < 0.35) return controlMove;
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  function resolveEnemyRetaliation(move, message) {
    const ally = activeMonster();
    if (!battleTarget || !ally || !move) return;
    const enemyState = startTurnStatus(battleTarget);
    const passiveStartMessage = applyPassiveTurnStart(battleTarget);
    if (enemyState.fainted) {
      resolveBattleVictory(ally, battleTarget);
      return;
    }
    if (!enemyState.canAct) {
      setMessage(joinBattleText(message, enemyState.text, passiveStartMessage));
      updateHighScore();
      updateTamerUi();
      drawTamerWorld();
      return;
    }
    startBattleAnimation('attack-projectile', { from: 'enemy', monster: battleTarget }, () => {
      if (!battleTarget) return;

      if (Math.random() > (move.accuracy || 1)) {
        setMessage(joinBattleText(message, enemyState.text, passiveStartMessage, `${battleTarget.name}'s ${move.name} missed.`));
        updateHighScore();
        updateTamerUi();
        drawTamerWorld();
        return;
      }

      const baseDamage = battleTarget.atkMin + Math.floor(Math.random() * (battleTarget.atkMax - battleTarget.atkMin + 1));
      const typeMultiplier = typeModifierForAttack(move, battleTarget, ally);
      const retaliation = Math.max(
        1,
        damageAgainstTarget(easeRetaliationDamage(Math.max(1, Math.round(baseDamage * (move.power || 1))), battleTarget.x, battleTarget.y), ally, move, battleTarget)
        + passiveOutgoingBonus(battleTarget, ally)
        - passiveIncomingReduction(ally)
      );
      ally.hp = Math.max(0, ally.hp - retaliation);
      let recovered = 0;
      if (move.healRatio) {
        recovered = Math.min(Math.max(1, Math.round(retaliation * move.healRatio)), battleTarget.maxHp - battleTarget.hp);
        battleTarget.hp += recovered;
      }
      const effectMessages = applyMoveEffects(battleTarget, ally, move);
      const passiveAfterMessage = passiveAfterHit(battleTarget, retaliation);
      let followUpMessage = joinBattleText(message, enemyState.text, passiveStartMessage, `${battleTarget.name} used ${move.name} for ${retaliation}.${typeEffectText(typeMultiplier)}${recovered > 0 ? ` ${battleTarget.name} recovered ${recovered} HP.` : ''}`, passiveAfterMessage, ...effectMessages);

      if (!ally || ally.hp <= 0) {
        if (!switchToHealthyLead()) {
          endRun('All your monsters fainted.');
          return;
        }
        followUpMessage = joinBattleText(followUpMessage, `${activeMonster()?.name || 'A partner'} stepped in.`);
      }

      setMessage(followUpMessage);
      updateHighScore();
      updateTamerUi();
      drawTamerWorld();
    }, 560);
  }

  function takePlayerTurn(onAct) {
    const ally = activeMonster();
    if (!ally || !battleTarget) return;
    const state = startTurnStatus(ally);
    const passiveStartMessage = applyPassiveTurnStart(ally);
    if (state.fainted) {
      if (!switchToHealthyLead()) {
        endRun('All your monsters fainted.');
        return;
      }
      const enemyMove = chooseEnemyMove(battleTarget);
      resolveEnemyRetaliation(enemyMove, joinBattleText(state.text, passiveStartMessage, `${activeMonster()?.name || 'A partner'} stepped in.`));
      return;
    }
    if (!state.canAct) {
      const enemyMove = chooseEnemyMove(battleTarget);
      resolveEnemyRetaliation(enemyMove, joinBattleText(state.text, passiveStartMessage));
      return;
    }
    onAct(joinBattleText(state.text, passiveStartMessage));
  }

  function useBattleAttack(move) {
    const ally = activeMonster();
    if (!ally || !battleTarget || !move) return;

    takePlayerTurn((prefix) => {
      startBattleAnimation('attack-projectile', { from: 'ally', monster: ally }, () => {
        if (!battleTarget) return;

        if (Math.random() > (move.accuracy || 1)) {
          const enemyMove = chooseEnemyMove(battleTarget);
          resolveEnemyRetaliation(enemyMove, joinBattleText(prefix, `${ally.name}'s ${move.name} missed.`));
          return;
        }

        const baseDamage = ally.atkMin + Math.floor(Math.random() * (ally.atkMax - ally.atkMin + 1));
        const typeMultiplier = typeModifierForAttack(move, ally, battleTarget);
        const damage = Math.max(
          1,
          damageAgainstTarget(Math.max(1, Math.round(baseDamage * (move.power || 1))), battleTarget, move, ally)
          + passiveOutgoingBonus(ally, battleTarget)
          - passiveIncomingReduction(battleTarget)
        );
        battleTarget.hp = Math.max(0, battleTarget.hp - damage);
        let recovered = 0;
        if (move.healRatio) {
          recovered = Math.min(Math.max(1, Math.round(damage * move.healRatio)), ally.maxHp - ally.hp);
          ally.hp += recovered;
        }
        const effectMessages = applyMoveEffects(ally, battleTarget, move);
        const passiveAfterMessage = passiveAfterHit(ally, damage);

        if (battleTarget.hp <= 0) {
          resolveBattleVictory(ally, battleTarget);
          return;
        }

        const enemyMove = chooseEnemyMove(battleTarget);
        resolveEnemyRetaliation(enemyMove, joinBattleText(prefix, `${ally.name} used ${move.name} for ${damage}.${typeEffectText(typeMultiplier)}${recovered > 0 ? ` ${ally.name} recovered ${recovered} HP.` : ''}`, passiveAfterMessage, ...effectMessages));
      }, 540);
    });
  }

  function useBattleItem(item) {
    if (!item || item.key !== 'tonic') {
      setMessage('No usable items right now.');
      drawTamerWorld();
      return;
    }

    takePlayerTurn((prefix) => {
      const result = usePotionOnLead();
      if (result === 'You are out of tonics.' || /full HP|No lead/.test(result)) {
        setMessage(result);
        updateTamerUi();
        drawTamerWorld();
        return;
      }

      resetBattleMenu();
      const enemyMove = chooseEnemyMove(battleTarget);
      resolveEnemyRetaliation(enemyMove, joinBattleText(prefix, result));
    });
  }

  function escapeChanceForTarget(target) {
    if (!target) return 0;
    const rarityPenalty = ({ common: 0, uncommon: 0.08, rare: 0.18, legendary: 0.3 })[target.rarity] || 0.1;
    const levelGapPenalty = Math.max(0, target.level - (activeMonster()?.level || target.level)) * 0.04;
    const ephemeralBonus = target.ephemeral ? 0.12 : 0;
    return Math.max(0.12, Math.min(0.92, 0.72 - rarityPenalty - levelGapPenalty + ephemeralBonus));
  }

  function attemptRunFromBattle() {
    if (!battleTarget) return;
    if (battleTarget.isTrainer) {
      setMessage(`Trainer ${battleTarget.trainerName} will not let you run.`);
      updateTamerUi();
      drawTamerWorld();
      return;
    }
    const currentTarget = battleTarget;
    takePlayerTurn((prefix) => {
      const chance = escapeChanceForTarget(currentTarget) - (currentTarget.isBoss ? 0.28 : 0);
      if (Math.random() < chance) {
        battleTarget = null;
        resetBattleMenu();
        setMessage(joinBattleText(prefix, `You escaped from ${currentTarget.name}.`));
        updateTamerUi();
        drawTamerWorld();
        return;
      }

      resetBattleMenu();
      const enemyMove = chooseEnemyMove(currentTarget);
      resolveEnemyRetaliation(enemyMove, joinBattleText(prefix, `Couldn't escape! ${currentTarget.name} cuts you off.`));
    });
  }

  function useBattleSwitch(entry) {
    takePlayerTurn((prefix) => {
      if (!switchLeadToIndex(entry?.index)) {
        setMessage('No healthy partners can switch in.');
        updateTamerUi();
        drawTamerWorld();
        return;
      }

      resetBattleMenu();
      const enemyMove = chooseEnemyMove(battleTarget);
      resolveEnemyRetaliation(enemyMove, joinBattleText(prefix, `${activeMonster().name} stepped in.`));
    });
  }

  function handleBattleConfirm() {
    if (!battleTarget) return;

    if (battleMenuMode === 'root') {
      const action = battleRootOptions[battleMenuSelection];
      if (!action) return;

      if (action.key === 'attack') {
        battleMenuMode = 'attack';
        battleSubSelection = 0;
        setMessage('Choose an attack.');
        drawTamerWorld();
        return;
      }
      if (action.key === 'item') {
        battleMenuMode = 'item';
        battleSubSelection = 0;
        setMessage(battleItemsForPlayer().length ? 'Choose an item.' : 'No usable items right now.');
        drawTamerWorld();
        return;
      }
      if (action.key === 'switch') {
        battleMenuMode = 'switch';
        battleSubSelection = 0;
        setMessage(switchMenuEntries().length ? 'Choose a partner.' : 'No healthy partners can switch in.');
        drawTamerWorld();
        return;
      }
      if (action.key === 'run') {
        attemptRunFromBattle();
        return;
      }
      if (action.key === 'capture') {
        tryCatch();
      }
      return;
    }

    const entries = currentBattleMenuEntries();
    const selected = entries[battleSubSelection];
    if (!selected) {
      setMessage('No usable options right now.');
      drawTamerWorld();
      return;
    }

    if (battleMenuMode === 'attack') {
      resetBattleMenu();
      useBattleAttack(selected);
      return;
    }

    if (battleMenuMode === 'item') {
      useBattleItem(selected);
      return;
    }

    if (battleMenuMode === 'switch') {
      useBattleSwitch(selected);
    }
  }

  function handleBattleBack() {
    if (!battleTarget) return false;
    if (battleMenuMode !== 'root') {
      resetBattleMenu();
      setMessage('Choose Attack, Item, Switch, Run, or Capture.');
      drawTamerWorld();
      return true;
    }
    setMessage('Choose Attack, Item, Switch, Run, or Capture.');
    drawTamerWorld();
    return true;
  }

  function attackWild() {
    if (encounterTransition) {
      return;
    }
    if (battleAnimation) {
      return;
    }
    if (fishingAnimation) {
      return;
    }
    if (gameOver) {
      startRun();
      return;
    }
    if (playerMenuOpen) {
      handlePlayerMenuConfirm();
      return;
    }
    const ally = activeMonster();
    if (!ally) {
      endRun('No monsters left to fight with.');
      return;
    }
    if (!battleTarget) {
      if (townMenuOpen) {
        if (indexMenuOpen) {
          closeMonsterIndex('Back to town services.');
          return;
        }
        buyTownItem();
        return;
      }
      if (isTownShopTile()) {
        openTownMenu();
        return;
      }
      if (isTownTile()) {
        setMessage('Find the shop in town.');
        drawTamerWorld();
        return;
      }
      const nearby = [[0, -1], [1, 0], [0, 1], [-1, 0]]
        .map(([dx, dy]) => getMonsterAt(player.x + dx, player.y + dy))
        .find(Boolean);
      if (nearby) {
        beginBattle(nearby);
        return;
      }
      if (adjacentWaterTile()) {
        castFishingLine();
        return;
      }
      setMessage('Nothing to interact with here right now.');
      drawTamerWorld();
      return;
    }

    handleBattleConfirm();
  }

  function tryCatch() {
    if (encounterTransition) {
      return;
    }
    if (battleAnimation) {
      return;
    }
    if (fishingAnimation) {
      return;
    }
    if (gameOver) {
      startRun();
      return;
    }
    if (playerMenuOpen) {
      handlePlayerMenuBack();
      return;
    }
    if (townMenuOpen) {
      if (indexMenuOpen) {
        closeMonsterIndex('Back to town services.');
        return;
      }
      if (storageMenuOpen) {
        closeStorageMenu('Back to town services.');
        return;
      }
      closeTownMenu('You leave the shop and head back outside.');
      return;
    }
    if (!battleTarget) {
      openPlayerMenu();
      return;
    }

    if (capsules <= 0) {
      setMessage('You are out of capsules. Return to town and buy more.');
      drawTamerWorld();
      return;
    }

    if (battleTarget.isBoss || battleTarget.isTrainer) {
      setMessage(battleTarget.isTrainer ? 'Trainer monsters cannot be captured.' : 'Boss monsters refuse capture.');
      drawTamerWorld();
      return;
    }

    takePlayerTurn((prefix) => {
      capsules -= 1;

      const healthFactor = 1 - (battleTarget.hp / battleTarget.maxHp);
      const chance = Math.min(0.92, battleTarget.catchBase + healthFactor * 0.55 + earlyGameRelief(battleTarget.x, battleTarget.y) * 0.08);
      const usedCharm = charms > 0;
      const boostedChance = Math.min(0.96, chance + (usedCharm ? 0.14 : 0));
      const catchSucceeded = Math.random() < boostedChance;
      if (usedCharm) {
        charms -= 1;
      }

      startBattleAnimation('capsule-throw', { success: catchSucceeded }, () => {
        if (!battleTarget) return;
        if (catchSucceeded) {
          const caughtEncounter = battleTarget;
          const caughtMonster = {
            name: battleTarget.name,
            species: battleTarget.species,
            color: battleTarget.color,
            accent: battleTarget.accent,
            shiny: !!battleTarget.shiny,
            sprite: battleTarget.sprite,
            level: battleTarget.level,
            xp: 0,
            xpToNext: 5 + battleTarget.level * 4,
            maxHp: battleTarget.maxHp,
            hp: Math.max(1, Math.floor(battleTarget.maxHp * 0.75)),
            atkMin: battleTarget.atkMin,
            atkMax: battleTarget.atkMax,
            catchBase: battleTarget.catchBase,
            rarity: battleTarget.rarity || 'common',
            statusKey: '',
            statusTurns: 0,
            statusPotency: 0
          };
          assignCaughtMonsterTag(caughtMonster);
          const caughtX = battleTarget.x;
          const caughtY = battleTarget.y;
          const sentToStorage = party.length >= activePartyLimit;
          if (sentToStorage) {
            storedMonsters.push(caughtMonster);
          } else {
            party.push(caughtMonster);
          }
          captures += 1;
          coins += 2 + battleTarget.level;
          const recovery = recoverLeadAfterEncounter(3, caughtEncounter.x, caughtEncounter.y);
          recordDexEntry(battleTarget, 'caught');
          removeMonster(battleTarget);
          showBattleResult('Capture Complete', sentToStorage ? 'Sent to box' : `Party ${party.length}`);
          setMessage(joinBattleText(prefix, usedCharm
            ? recovery > 0
              ? `Capture charm flared. You caught the ${battleTarget.shiny ? 'shiny ' : ''}${(rarityMeta[battleTarget.rarity] || rarityMeta.common).label.toLowerCase()} ${battleTarget.name}! ${activeMonster()?.name || 'Lead'} recovered ${recovery} HP. ${sentToStorage ? `${battleTarget.name} was sent to storage.` : `Party ${party.length}.`} Capsules left: ${capsules}.`
              : `Capture charm flared. You caught the ${battleTarget.shiny ? 'shiny ' : ''}${(rarityMeta[battleTarget.rarity] || rarityMeta.common).label.toLowerCase()} ${battleTarget.name}! ${sentToStorage ? `${battleTarget.name} was sent to storage.` : `Party ${party.length}.`} Capsules left: ${capsules}.`
            : recovery > 0
              ? `You caught the ${battleTarget.shiny ? 'shiny ' : ''}${(rarityMeta[battleTarget.rarity] || rarityMeta.common).label.toLowerCase()} ${battleTarget.name}! ${activeMonster()?.name || 'Lead'} recovered ${recovery} HP. ${sentToStorage ? `${battleTarget.name} was sent to storage.` : `Party ${party.length}.`} Capsules left: ${capsules}.`
              : `You caught the ${battleTarget.shiny ? 'shiny ' : ''}${(rarityMeta[battleTarget.rarity] || rarityMeta.common).label.toLowerCase()} ${battleTarget.name}! ${sentToStorage ? `${battleTarget.name} was sent to storage.` : `Party ${party.length}.`} Capsules left: ${capsules}.`));
          battleTarget = null;
          resetBattleMenu();
          updateHighScore();
          updateTamerUi();
          drawTamerWorld();
          return;
        }

        const enemyMove = chooseEnemyMove(battleTarget);
        resolveEnemyRetaliation(enemyMove, joinBattleText(prefix, usedCharm
          ? `Capture charm faded. Capsules left: ${capsules}.`
          : `Capture failed. Capsules left: ${capsules}.`));
      }, 960);
    });
  }

  function movePlayer(dx, dy) {
    if (encounterTransition) {
      return;
    }
    if (battleAnimation) {
      return;
    }
    if (fishingAnimation) {
      return;
    }
    if (gameOver) {
      drawTamerWorld();
      return;
    }
    if (playerMenuOpen) {
      setMessage('Use Prev/Next or the wheel to browse your party.');
      drawTamerWorld();
      return;
    }
    if (indexMenuOpen) {
      setMessage('Use Prev/Next or the wheel to browse the Monster Index.');
      drawTamerWorld();
      return;
    }
    if (townMenuOpen) {
      setMessage('Use Prev/Next or the wheel to browse town services.');
      drawTamerWorld();
      return;
    }
    if (battleTarget) {
      setMessage('You are in battle. Use Center or Play/Pause.');
      drawTamerWorld();
      return;
    }

    const nx = player.x + dx;
    const ny = player.y + dy;
    const terrain = terrainAt(nx, ny);
    if (isBlocked(nx, ny)) {
      setMessage(terrain === 'tree' ? 'Thick trees block the route.' : 'Water cuts off the path.');
      drawTamerWorld();
      return;
    }

    const target = getMonsterAt(nx, ny);
    if (target) {
      beginBattle(target);
      return;
    }

    player.x = nx;
    player.y = ny;
    steps += 1;
    ensureWorld();
    if (collectWorldLoot()) {
      stepWorld();
      return;
    }
    if (terrain === 'grass' && Math.random() < (0.11 + Math.min(0.05, adventureProgress() * 0.006))) {
      const wild = createWildMonster(player.x, player.y, 1);
      wild.ephemeral = true;
      beginBattle(wild);
      return;
    }
    if (isTownShopTile()) {
      setMessage('At the shop. Center opens it.');
    } else if (isTownTile()) {
      setMessage(`In ${routeLabelAt()}. Find the shop.`);
    } else if (adjacentWaterTile()) {
      setMessage('Water nearby. Center can fish.');
    } else if (terrain === 'grass') {
      setMessage(`Tall grass rustles on ${routeLabelAt()}.`);
    } else {
      setMessage(`You are on ${routeLabelAt()}. Stronger monsters live farther out.`);
    }
    stepWorld();
  }

  function startRun() {
    stopEncounterTransition();
    stopBattleAnimation();
    stopFishingAnimation();
    highScore = getHighScore(gameKey);
    captures = 0;
    defeated = 0;
    steps = 0;
    renderTick = 0;
    battleResultBanner = null;
    gameOver = false;
    battleTarget = null;
    townMenuOpen = false;
    townSelection = 0;
    indexMenuOpen = false;
    indexSelection = 0;
    storageMenuOpen = false;
    storageMenuColumn = 'party';
    storagePartySelection = 0;
    storageBoxSelection = 0;
    storageSwapPending = null;
    playerMenuOpen = false;
    playerMenuMode = 'party';
    playerMenuSelection = 0;
    playerMenuActionSelection = 0;
    playerMenuSwapSelection = 0;
    townships = buildTownships();
    activeTownship = null;
    chunks = new Map();
    party = [cloneMonster(speciesList[0], 1), cloneMonster(speciesList[1], 1)];
    caughtMonsterCounter = 0;
    party.forEach(assignCaughtMonsterTag);
    storedMonsters = [];
    activeIndex = 0;
    coins = 24;
    capsules = 6;
    tonics = 0;
    rods = 0;
    charms = 0;
    badges = [];
    const homeTown = townships[0] || { x: 0, y: 0 };
    player = { x: homeTown.x, y: homeTown.y + 1 };
    ensureWorld();
    setMessage('Leave town, discover route monsters, and return to town to check your index.');
    updateTamerUi();
    drawTamerWorld();
  }

  startRun();
  startAmbientAnimation();

  releaseGameControls = useGameControls({
    onLeft: () => playerMenuOpen ? movePlayerMenuSelection(-1) : battleTarget ? moveBattleSelection(-1) : (townMenuOpen || indexMenuOpen) ? moveTownSelection(-1) : movePlayer(-1, 0),
    onRight: () => playerMenuOpen ? movePlayerMenuSelection(1) : battleTarget ? moveBattleSelection(1) : (townMenuOpen || indexMenuOpen) ? moveTownSelection(1) : movePlayer(1, 0),
    onConfirm: () => attackWild(),
    onPlayPause: () => gameOver
      ? startRun()
      : playerMenuOpen
        ? handlePlayerMenuBack()
        : battleTarget
          ? handleBattleBack()
          : storageMenuOpen
            ? closeStorageMenu('Back to town services.')
            : indexMenuOpen
              ? closeMonsterIndex('Back to town services.')
              : townMenuOpen
                ? closeTownMenu('You leave the shop and head back outside.')
                : openPlayerMenu()
  });

  window.onGameScroll = (dir) => {
    if (playerMenuOpen) {
      movePlayerMenuSelection(dir > 0 ? 1 : -1);
      return;
    }
    if (battleTarget) {
      moveBattleSelection(dir > 0 ? 1 : -1);
      return;
    }
    if (townMenuOpen || indexMenuOpen) {
      moveTownSelection(dir > 0 ? 1 : -1);
      return;
    }
    movePlayer(0, dir > 0 ? 1 : -1);
  };

  function confirmLeaveMonsterTamer() {
    return window.confirm('Leave Monster Tamer? Progress is not saved!');
  }

  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => {
    if (!confirmLeaveMonsterTamer()) {
      drawTamerWorld();
      return;
    }
    stopAmbientAnimation();
    stopEncounterTransition();
    stopBattleAnimation();
    stopFishingAnimation();
    battleTarget = null;
    gameOver = false;
    if (releaseGameControls) releaseGameControls();
    releaseGameControls = null;
    window.onGameScroll = null;
    menuBtn.onclick = oldMenu;
    goBack();
  };
}

// --- 2048 Mini ---
function render2048(direction = 'forward') {
  pushGameNav(render2048);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  renderScreen(
    gameScreenShell(`
      <div style="font-size:1.2em;font-weight:bold;">2048 Mini</div>
      <canvas id="g2048" width="250" height="250" style="background:#0f0f0f;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: Left/Right | Center: Up | Play/Pause: Down | Menu: back
      </div>
      <div id="g2048Score" style="font-weight:bold;color:#0074d9;">Score: 0</div>
      <div id="g2048High" style="font-weight:bold;color:#888;">High: 0</div>
    `, 'compact'),
    direction
  );

  const cvs = document.getElementById('g2048');
  const ctx = cvs.getContext('2d');
  const n = 4, cell = 54, gap = 6, off = 9;
  let grid, score, highScore = getHighScore('g2048');
  function update2048UI() {
    document.getElementById('g2048Score').textContent = `Score: ${score}`;
    document.getElementById('g2048High').textContent = `High: ${highScore}`;
  }

  function emptyCells() {
    const e = [];
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (!grid[r][c]) e.push({r,c});
    return e;
  }
  function addTile() {
    const e = emptyCells();
    if (!e.length) return;
    const spot = e[Math.floor(Math.random()*e.length)];
    grid[spot.r][spot.c] = Math.random() < 0.9 ? 2 : 4;
  }
  function reset() {
    grid = Array.from({length:n},()=>Array(n).fill(0));
    score = 0;
    addTile(); addTile();
    update2048UI();
    draw();
  }

  function slide(row) {
    const arr = row.filter(Boolean);
    for (let i=0;i<arr.length-1;i++) {
      if (arr[i] === arr[i+1]) { arr[i]*=2; score += arr[i]; arr.splice(i+1,1); }
    }
    while (arr.length < n) arr.push(0);
    return arr;
  }

  function move(dir) {
    let moved = false;
    if (dir === 'left') {
      for (let r=0;r<n;r++) {
        const newRow = slide(grid[r]);
        if (newRow.some((v,i)=>v!==grid[r][i])) moved = true;
        grid[r] = newRow;
      }
    } else if (dir === 'right') {
      for (let r=0;r<n;r++) {
        const rev = slide(grid[r].slice().reverse()).reverse();
        if (rev.some((v,i)=>v!==grid[r][i])) moved = true;
        grid[r] = rev;
      }
    } else if (dir === 'up') {
      for (let c=0;c<n;c++) {
        const col = grid.map(r=>r[c]);
        const slid = slide(col);
        for (let r=0;r<n;r++) { if (grid[r][c] !== slid[r]) moved = true; grid[r][c]=slid[r]; }
      }
    } else if (dir === 'down') {
      for (let c=0;c<n;c++) {
        const col = grid.map(r=>r[c]).reverse();
        const slid = slide(col).reverse();
        for (let r=0;r<n;r++) { if (grid[r][c] !== slid[r]) moved = true; grid[r][c]=slid[r]; }
      }
    }
    if (moved) addTile();
    if (score > highScore) { highScore = score; setHighScore('g2048', highScore); }
    draw();
  }

  function hasMoves() {
    if (emptyCells().length) return true;
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const v = grid[r][c];
      if (r+1<n && grid[r+1][c]===v) return true;
      if (c+1<n && grid[r][c+1]===v) return true;
    }
    return false;
  }

  function draw() {
    ctx.fillStyle = "#0f0f0f"; ctx.fillRect(0,0,cvs.width,cvs.height);
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const v = grid[r][c];
      const x = off + c*(cell+gap), y = off + r*(cell+gap);
      ctx.fillStyle = v ? "#2e7d32" : "#1c1c1c";
      if (v===4) ctx.fillStyle="#388e3c";
      if (v===8) ctx.fillStyle="#f57c00";
      if (v>=16 && v<64) ctx.fillStyle="#f9a825";
      if (v>=64 && v<256) ctx.fillStyle="#ef6c00";
      if (v>=256) ctx.fillStyle="#c62828";
      ctx.fillRect(x,y,cell,cell);
      if (v) {
        ctx.fillStyle="#fff";
        ctx.font="bold 18px Segoe UI";
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillText(String(v), x+cell/2, y+cell/2);
      }
    }
    update2048UI();
    if (!hasMoves()) {
      ctx.fillStyle="rgba(0,0,0,0.6)";
      ctx.fillRect(0,0,cvs.width,cvs.height);
      ctx.fillStyle="#fff"; ctx.font="16px Segoe UI"; ctx.textAlign="center";
      ctx.fillText("Game Over", cvs.width/2, cvs.height/2 - 6);
      ctx.fillText("Center to restart", cvs.width/2, cvs.height/2 + 14);
    }
  }

  reset();

  releaseGameControls = useGameControls({
    onLeft: () => move('left'),
    onRight: () => move('right'),
    onConfirm: () => { if (hasMoves()) move('up'); else reset(); },
    onPlayPause: () => { if (hasMoves()) move('down'); else reset(); }
  });

  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => { if (releaseGameControls) releaseGameControls(); releaseGameControls=null; menuBtn.onclick = oldMenu; goBack(); };
}

// Chess (Beta)

function renderChess(direction = 'forward') {
  pushGameNav(renderChess);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  renderScreen(
    gameScreenShell(`
      <div style="font-size:1.15em;font-weight:bold;">Chess (Beta)</div>
      <canvas id="chCanvas" width="240" height="240" style="background:#111;border:2px solid #444;border-radius:10px;"></canvas>
      <div id="chStatus" style="font-size:0.9em;color:#555;text-align:center;">White to move. Prev/Next: ←/→, wheel: ↑/↓, Center: select/move, Play: cancel, Menu: back</div>
    `, 'tight'),
    direction
  );

  const cvs = document.getElementById('chCanvas');
  const ctx = cvs.getContext('2d');
  const size = 30; // 8x8 board
  const piecesSym = {
    w: { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" },
    b: { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" }
  };
  let mode = 'pvp'; 
  let board = fromFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
  let turn = 'w';
  let cursor = { r: 6, c: 4 }; // start near white pawns
  let sel = null;
  let legal = [];
  const statusEl = document.getElementById('chStatus');

  statusEl.textContent = "Mode: 2P. White to move. Prev/Next: ←/→, wheel: ↑/↓, Center: select/move, Play: cancel/toggle mode, Menu: back";

  // helper to show mode/turn
  function setStatus(extra = "") {
    const turnTxt = (turn === 'w' ? 'White' : 'Black') + " to move.";
    const modeTxt = mode === 'pve' ? "Mode: PvE (Black = CPU)." : "Mode: 2P.";
    statusEl.textContent = `${modeTxt} ${turnTxt} ${extra}`;
  }

// piece values for AI
  const pieceVal = { p:1, n:3, b:3, r:5, q:9, k:100 };

// generate all moves for current side (re-use genMoves)
  function allMoves(color) {
    const moves = [];
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      const p = at(r,c);
      if (p && p.color === color) {
        const list = genMoves(r,c).map(m=>({ from:{r,c}, to:m, piece:p }));
        moves.push(...list);
      }
    }
    return moves;
  }

// simple AI: pick highest capture, else random move
  function doAIMove() {
    if (mode !== 'pve' || turn !== 'b') return;
    const moves = allMoves('b');
    if (!moves.length) { setStatus("Black has no moves. White wins."); return; }
    let best = [];
    let bestScore = -1;
    for (const m of moves) {
      const tgt = at(m.to.r, m.to.c);
      const score = tgt ? pieceVal[tgt.type] || 0 : 0;
      if (score > bestScore) { bestScore = score; best = [m]; }
      else if (score === bestScore) best.push(m);
    }
    const pick = best[Math.floor(Math.random() * best.length)];
    sel = pick.from; move(pick.from, pick.to); // re-use move()
    draw();
    if (mode === 'pve' && turn === 'b') {
      // if still black to move (shouldn't happen), avoid loops
      setStatus("Black stuck.");
    }
  }

  function fromFEN(fen) {
    const rows = fen.split(' ')[0].split('/');
    return rows.map(row => {
      const arr = [];
      for (const ch of row) {
        if (/\d/.test(ch)) {
          for (let i = 0; i < parseInt(ch,10); i++) arr.push(null);
        } else {
          const color = ch === ch.toLowerCase() ? 'b' : 'w';
          const type = ch.toLowerCase();
          arr.push({ color, type });
        }
      }
      return arr;
    });
  }

  function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
  function at(r,c){ return board[r][c]; }

  function genMoves(r,c) {
    const p = at(r,c);
    if (!p || p.color !== turn) return [];
    const res = [];
    const add = (r2,c2) => { if (!inBounds(r2,c2)) return;
      const t = at(r2,c2);
      if (!t || t.color !== p.color) res.push({r:r2,c:c2});
    };
    const ray = (dr,dc) => {
      let rr=r+dr, cc=c+dc;
      while (inBounds(rr,cc)) {
        const t = at(rr,cc);
        if (!t) res.push({r:rr,c:cc});
        else { if (t.color!==p.color) res.push({r:rr,c:cc}); break; }
        rr+=dr; cc+=dc;
      }
    };
    switch(p.type){
      case 'p': {
        const dir = p.color==='w' ? -1 : 1;
        if (!at(r+dir,c)) res.push({r:r+dir,c});
        if ((p.color==='w' && r===6) || (p.color==='b' && r===1)) {
          if (!at(r+dir,c) && !at(r+2*dir,c)) res.push({r:r+2*dir,c});
        }
        for (const dc of [-1,1]) {
          const t = at(r+dir,c+dc);
          if (t && t.color!==p.color) res.push({r:r+dir,c:c+dc});
        }
        break;
      }
      case 'n': [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc)); break;
      case 'b': [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(d=>ray(...d)); break;
      case 'r': [[-1,0],[1,0],[0,-1],[0,1]].forEach(d=>ray(...d)); break;
      case 'q': [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(d=>ray(...d)); break;
      case 'k': [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc)); break;
    }
    return res;
  }

  function promoteIfNeeded(r,c,p) {
    if (p.type==='p' && ((p.color==='w' && r===0) || (p.color==='b' && r===7))) {
      p.type='q';
    }
  }

  function move(sel,to) {
    const p = at(sel.r, sel.c);
    board[to.r][to.c] = p;
    board[sel.r][sel.c] = null;
    promoteIfNeeded(to.r,to.c,p);
    turn = turn==='w'?'b':'w';
    sel = null; legal = [];
    setStatus();
    draw();
    if (mode === 'pve' && turn === 'b') {
      setTimeout(doAIMove, 150);
    }
  }

  function draw() {
    ctx.clearRect(0,0,cvs.width,cvs.height);
    for (let r=0;r<8;r++){
      for (let c=0;c<8;c++){
        const light = (r+c)%2===0;
        ctx.fillStyle = light ? '#d8d8d8' : '#888';
        ctx.fillRect(c*size, r*size, size, size);
        const isCur = cursor.r===r && cursor.c===c;
        const isSel = sel && sel.r===r && sel.c===c;
        const isLegal = legal.some(m=>m.r===r && m.c===c);
        if (isSel) { ctx.fillStyle='rgba(0,116,217,0.28)'; ctx.fillRect(c*size,r*size,size,size); }
        else if (isLegal) { ctx.fillStyle='rgba(79,195,247,0.28)'; ctx.fillRect(c*size,r*size,size,size); }
        if (isCur) {
          ctx.strokeStyle = '#ffcc00';
          ctx.lineWidth = 2;
          ctx.strokeRect(c*size+1, r*size+1, size-2, size-2);
        }
        const p = at(r,c);
        if (p) {
          ctx.fillStyle = p.color==='w' ? '#000' : '#111';
          ctx.font = '22px Segoe UI Symbol';
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(piecesSym[p.color][p.type], c*size+size/2, r*size+size/2+1);
        }
      }
    }
  }

  function cursorLeft(){ cursor.c = (cursor.c+7)%8; draw(); }
  function cursorRight(){ cursor.c = (cursor.c+1)%8; draw(); }
  function cursorUp(){ cursor.r = (cursor.r+7)%8; draw(); }
  function cursorDown(){ cursor.r = (cursor.r+1)%8; draw(); }

  function onConfirm() {
    if (!sel) {
      const p = at(cursor.r,cursor.c);
      if (p && p.color===turn) {
        sel = {r:cursor.r,c:cursor.c};
        legal = genMoves(cursor.r,cursor.c);
      }
    } else {
      const found = legal.find(m=>m.r===cursor.r && m.c===cursor.c);
      if (found) move(sel, found);
      sel = null; legal = [];
    }
    draw();
  }

  function onCancel() {
    sel = null; legal = [];
    setStatus();
    draw();
  }

  function onPlayPause() {
    if (sel) {
      onCancel();
      return;
    }
    mode = mode === 'pvp' ? 'pve' : 'pvp';
    setStatus(mode === 'pve' ? "(Black = CPU)" : "");
    // if we just switched to PvE and it's black's turn, let AI move
    if (mode === 'pve' && turn === 'b') {
      setTimeout(doAIMove, 120);
    }
  }

  // controls
  releaseGameControls = useGameControls({
    onLeft: cursorLeft,
    onRight: cursorRight,
    onConfirm,
    onPlayPause
  });
  window.onGameScroll = (dir) => { // wheel up/down
    if (dir > 0) cursorDown(); else cursorUp();
  };

  // Back via MENU
  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => {
    if (releaseGameControls) releaseGameControls();
    releaseGameControls = null;
    window.onGameScroll = null;
    menuBtn.onclick = oldMenu;
    goBack();
  };

  draw();
}

// Solitaire

function renderSolitaire(direction = 'forward') {
  pushGameNav(renderSolitaire);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }

  renderScreen(
     gameScreenShell(`
       <div style="font-size:1.15em;font-weight:bold;">Solitaire</div>
       <canvas id="solCanvas" width="320" height="260" style="background:#0f0f0f;border:2px solid #444;border-radius:10px;"></canvas>
       <div id="solStatus" style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
         Prev/Next or wheel: move | Center: draw/pick/move | Play: draw/recycle | Menu: back
       </div>
     `, 'tight'),
     direction
  );

  const cvs = document.getElementById('solCanvas');
  const ctx = cvs.getContext('2d');
  const posOrder = ['STOCK','WASTE','F0','F1','F2','F3','T0','T1','T2','T3','T4','T5','T6'];
  const CARD_W = 36, CARD_H = 56;
  const SLOT_PAD = 3;
  const STOCK_X = 10, SLOT_Y = 10;
  const WASTE_X = STOCK_X + CARD_W + SLOT_PAD + 6;
  const FOUND_X0 = 118, FOUND_SP = 46;
  const TAB_X0 = 8, TAB_SP = 44, TAB_Y = 78, TAB_DY = 16;

  let cursor = 0;
  let held = null;           // { src, cardIdx, cards: [] } but pile not yet modified
  let tableauSelect = null;  // { pileIdx, cardIdx }
  let stock = [], waste = [], foundations = [[],[],[],[]], tableaus = [];
  const suits = ['♠','♥','♦','♣'];
  const red = new Set(['♥','♦']);

  function newDeck() {
    const d = [];
    for (const s of suits) for (let r=1;r<=13;r++) d.push({r,s});
    for (let i=d.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [d[i],d[j]]=[d[j],d[i]];
    }
    return d;
  }

  function deal() {
    stock = newDeck();
    waste = [];
    foundations = [[],[],[],[]];
    tableaus = Array.from({length:7}, ()=>[]);
    for (let c=0;c<7;c++){
      for (let r=0;r<=c;r++){
        const card = stock.pop();
        tableaus[c].push({card, up: r===c});
      }
    }
    cursor = 0;
    held = null;
    tableauSelect = null;
  }
  deal();

  const topCard = (pile) => pile[pile.length-1] || null;
  function firstFaceUpIndex(pile) {
    for (let i=0; i<pile.length; i++) if (pile[i].up) return i;
    return pile.length;
  }

  function canToFoundation(card, fIdx) {
    const f = foundations[fIdx];
    if (!card) return false;
    if (!f.length) return card.r === 1;                 // Ace
    const top = f[f.length-1].card;
    return top.s === card.s && card.r === top.r + 1;    // next rank, same suit
  }

  function canToTableau(card, tIdx) {
    if (!card) return false;
    const pile = tableaus[tIdx];
    if (!pile.length) return card.r === 13;             // only King on empty
    const top = pile[pile.length-1];
    if (!top.up) return false;
    const diff = top.card.r - card.r;
    const alt = red.has(top.card.s) !== red.has(card.s);
    return diff === 1 && alt;
  }

  // Flip the top face-down card of each tableau (after successful move out)
  function flipExposed() {
    tableaus.forEach(p => {
      const last = p[p.length - 1];
      if (last && !last.up) last.up = true;
    });
  }

  // Draw from stock to waste; if stock empty, recycle waste back to stock face-down
  function drawStock() {
    if (stock.length) {
      const c = stock.pop();
      c.up = true;
      waste.push({ card: c, up: true });
    } else if (waste.length) {
      while (waste.length) {
        const c = waste.pop();
        c.card.up = false;
        stock.push(c.card);
      }
    }
  }

  // Remove held cards from their source pile (only when a move succeeds)
  function removeHeldFromSource(h) {
    if (!h) return;
    if (h.src === 'WASTE') {
      waste.pop();
    } else if (h.src.startsWith('F')) {
      foundations[Number(h.src[1])].pop();
    } else if (h.src.startsWith('T')) {
      const ti = Number(h.src[1]);
      tableaus[ti].splice(h.cardIdx);
    }
  }

  // Move one or many cards; returns true on success
  function moveCards(h, dst) {
    const cards = h?.cards || [];
    if (!cards.length) return false;

    if (dst.startsWith('F')) {
      if (cards.length !== 1) return false;
      const fi = Number(dst[1]);
      if (!canToFoundation(cards[0].card, fi)) return false;
      removeHeldFromSource(h);
      foundations[fi].push(cards[0]); // keep face-up
      return true;
    }

    if (dst.startsWith('T')) {
      const ti = Number(dst[1]);
      if (!canToTableau(cards[0].card, ti)) return false;
      removeHeldFromSource(h);
      cards.forEach(c => { c.up = true; tableaus[ti].push(c); });
      return true;
    }

    return false;
  }

  function tryMove(dst) {
    if (!held) return;
    const moved = moveCards(held, dst);
    if (moved) {
      held = null;
      flipExposed();
    }
    drawBoard();
  }

  function pickCurrent() {
    const id = posOrder[cursor];

    // If holding, attempt move
    if (held) { tryMove(id); return; }

    // If selecting within a tableau, pick from that card down (no removal yet)
    if (tableauSelect) {
      const { pileIdx, cardIdx } = tableauSelect;
      const pile = tableaus[pileIdx];
      if (cardIdx < pile.length && pile[cardIdx].up) {
        held = { src: `T${pileIdx}`, cardIdx, cards: pile.slice(cardIdx) };
      }
      tableauSelect = null;
      drawBoard();
      return;
    }

    if (id === 'STOCK') {
      drawStock();
    } else if (id === 'WASTE') {
      const top = topCard(waste);
      if (top) held = { src: 'WASTE', cardIdx: waste.length - 1, cards: [top] };
    } else if (id.startsWith('F')) {
      const fi = Number(id[1]);
      const top = topCard(foundations[fi]);
      if (top) held = { src: id, cardIdx: foundations[fi].length - 1, cards: [top] };
    } else if (id.startsWith('T')) {
      const ti = Number(id[1]);
      const pile = tableaus[ti];
      const top = pile[pile.length - 1];
      if (top && top.up) {
        const start = Math.max(firstFaceUpIndex(pile), 0);
        tableauSelect = { pileIdx: ti, cardIdx: pile.length - 1 };
        if (tableauSelect.cardIdx < start) tableauSelect.cardIdx = start;
      }
    }
    drawBoard();
  }

  function cursorLeft() {
    if (tableauSelect) {
      const { pileIdx, cardIdx } = tableauSelect;
      const minIdx = firstFaceUpIndex(tableaus[pileIdx]);
      tableauSelect.cardIdx = Math.max(minIdx, cardIdx - 1);
    } else {
      cursor = (cursor + posOrder.length - 1) % posOrder.length;
    }
    drawBoard();
  }

  function cursorRight() {
    if (tableauSelect) {
      const { pileIdx, cardIdx } = tableauSelect;
      tableauSelect.cardIdx = Math.min(tableaus[pileIdx].length - 1, cardIdx + 1);
    } else {
      cursor = (cursor + 1) % posOrder.length;
    }
    drawBoard();
  }

  function drawBoard() {
    ctx.clearRect(0,0,cvs.width,cvs.height);
    ctx.fillStyle = "#0f0f0f"; ctx.fillRect(0,0,cvs.width,cvs.height);

    ctx.strokeStyle="#444"; ctx.lineWidth=1.5;
    ctx.strokeRect(STOCK_X-2, SLOT_Y-2, CARD_W+4, CARD_H+4);
    ctx.strokeRect(WASTE_X-2, SLOT_Y-2, CARD_W+4, CARD_H+4);
    for (let i=0;i<4;i++) ctx.strokeRect(FOUND_X0 + i*FOUND_SP -2, SLOT_Y-2, CARD_W+4, CARD_H+4);

    const rankStr = (r)=>r===1?'A':r===11?'J':r===12?'Q':r===13?'K':String(r);
    const drawCard = (x,y,card)=>{
      ctx.fillStyle="#222"; ctx.fillRect(x,y,CARD_W,CARD_H);
      ctx.strokeStyle="#666"; ctx.strokeRect(x,y,CARD_W,CARD_H);
      ctx.fillStyle = red.has(card.s) ? "#f55" : "#fff";
      ctx.font="16px Segoe UI"; ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText(rankStr(card.r)+card.s, x+5, y+5);
    };

    const wt = topCard(waste); if (wt) drawCard(WASTE_X, SLOT_Y, wt.card);
    if (stock.length) { ctx.fillStyle="#1c3c5c"; ctx.fillRect(STOCK_X, SLOT_Y, CARD_W, CARD_H); ctx.strokeStyle="#2a5d8a"; ctx.strokeRect(STOCK_X, SLOT_Y, CARD_W, CARD_H); }
    for (let i=0;i<4;i++){ const top = topCard(foundations[i]); if (top) drawCard(FOUND_X0 + i*FOUND_SP, SLOT_Y, top.card); }

    for (let i=0;i<7;i++){
      const pile = tableaus[i];
      let y = TAB_Y;
      pile.forEach((cObj, idx) => {
        if (!cObj.up) { ctx.fillStyle="#222"; ctx.fillRect(TAB_X0 + i*TAB_SP, y, CARD_W, CARD_H); ctx.strokeStyle="#444"; ctx.strokeRect(TAB_X0 + i*TAB_SP, y, CARD_W, CARD_H); }
        else { drawCard(TAB_X0 + i*TAB_SP, y, cObj.card); }

        const isSelect = tableauSelect && tableauSelect.pileIdx === i && idx >= tableauSelect.cardIdx;
        const isHeld = held && held.src === `T${i}` && idx >= held.cardIdx;
        if (isSelect || isHeld) {
          ctx.fillStyle = "rgba(255, 204, 0, 0.20)";
          ctx.fillRect(TAB_X0 + i*TAB_SP, y, CARD_W, CARD_H);
        }
        y += TAB_DY;
      });
    }

    const drawHighlight = (id,color="#00bcd4") => {
      ctx.strokeStyle=color; ctx.lineWidth=2;
      if (id === 'STOCK') ctx.strokeRect(STOCK_X-3, SLOT_Y-3, CARD_W+6, CARD_H+6);
      else if (id === 'WASTE') ctx.strokeRect(WASTE_X-3, SLOT_Y-3, CARD_W+6, CARD_H+6);
      else if (id.startsWith('F')) { const i=Number(id[1]); ctx.strokeRect(FOUND_X0 + i*FOUND_SP -3, SLOT_Y-3, CARD_W+6, CARD_H+6); }
      else if (id.startsWith('T')) { const i=Number(id[1]); ctx.strokeRect(TAB_X0 + i*TAB_SP -3, TAB_Y-3, CARD_W+6, 7*TAB_DY + CARD_H + 6); }
    };
    drawHighlight(posOrder[cursor], "#ffcc00");
    if (held) drawHighlight(held.src, "#00bcd4");

    if (held) {
      const hCard = held.cards[0]?.card;
      ctx.fillStyle="#fff"; ctx.font="12px Segoe UI"; ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText("Held: " + (hCard ? rankStr(hCard.r)+hCard.s : "") + (held.cards.length>1?` (+${held.cards.length-1})`:""), 12, cvs.height-18);
    } else if (tableauSelect) {
      ctx.fillStyle="#ccc"; ctx.font="12px Segoe UI"; ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText("Select card in pile, then Center to pick up", 12, cvs.height-18);
    }
  }

  drawBoard();

  releaseGameControls = useGameControls({
    onLeft: cursorLeft,
    onRight: cursorRight,
    onConfirm: pickCurrent,
    onPlayPause: () => {
      if (tableauSelect) { tableauSelect = null; drawBoard(); return; }
      drawStock(); drawBoard();
    }
  });

  window.onGameScroll = (dir) => {
    if (tableauSelect) { if (dir > 0) cursorRight(); else cursorLeft(); }
    else { if (dir > 0) cursorRight(); else cursorLeft(); }
  };

  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => {
    if (releaseGameControls) releaseGameControls();
    releaseGameControls = null;
    window.onGameScroll = null;
    menuBtn.onclick = oldMenu;
    goBack();
  };
}

window.renderGamesMenu = renderGamesMenu;