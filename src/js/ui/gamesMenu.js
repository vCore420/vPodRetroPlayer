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
      <canvas id="mtCanvas" width="312" height="208" style="background:#d8f0be;border:2px solid #3e5032;border-radius:10px;"></canvas>
      <div style="font-size:0.88em;color:#555;text-align:center;max-width:320px;line-height:1.35;">
        Prev/Next: walk left/right | Wheel: walk up/down | Center: interact/attack | Play/Pause: catch/swap lead | Menu: back
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center;">
        <div id="mtLead" style="font-weight:bold;color:#0074d9;">Lead: Ember Pup</div>
        <div id="mtPartyHp" style="font-weight:bold;color:#d90429;">HP: 12/12</div>
        <div id="mtCaught" style="font-weight:bold;color:#2e8b57;">Caught: 0</div>
        <div id="mtCapsules" style="font-weight:bold;color:#7b5cff;">Capsules: 5</div>
        <div id="mtCoins" style="font-weight:bold;color:#9b6b22;">Coins: 20</div>
        <div id="mtScore" style="font-weight:bold;color:#d4a017;">Score: 0</div>
        <div id="mtHigh" style="font-weight:bold;color:#888;">High: 0</div>
      </div>
      <div id="mtMsg" style="min-height:20px;font-size:0.9em;color:#444;text-align:center;max-width:320px;">Hunt wild monsters, return to town, and restock at the shop.</div>
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
    }
  ];
  const speciesByName = Object.fromEntries(speciesList.map(species => [species.name, species]));
  const rarityMeta = {
    common: { label: 'Common', catchAdjust: 0, levelBonus: 0, coinBonus: 0 },
    uncommon: { label: 'Uncommon', catchAdjust: -0.06, levelBonus: 1, coinBonus: 4 },
    rare: { label: 'Rare', catchAdjust: -0.12, levelBonus: 2, coinBonus: 10 },
    legendary: { label: 'Legendary', catchAdjust: -0.18, levelBonus: 3, coinBonus: 18 }
  };
  const routeProfiles = [
    {
      label: 'Town Outskirts',
      palette: { plain: '#9ecc78', grass: '#84bf5b', path: '#cfbb88', water: '#63aedf' },
      landmark: 'signpost',
      pool: [
        { species: 'Mossling', rarity: 'common', weight: 42 },
        { species: 'Ember Pup', rarity: 'common', weight: 32 },
        { species: 'Volt Finch', rarity: 'uncommon', weight: 18 },
        { species: 'Gloom Bat', rarity: 'rare', weight: 8 }
      ],
      specials: []
    },
    {
      label: 'Fern Trail',
      palette: { plain: '#8ccf71', grass: '#63b14d', path: '#ccb47b', water: '#74b7d8' },
      landmark: 'fern',
      pool: [
        { species: 'Mossling', rarity: 'common', weight: 34 },
        { species: 'Ember Pup', rarity: 'common', weight: 24 },
        { species: 'Volt Finch', rarity: 'uncommon', weight: 20 },
        { species: 'Tide Cub', rarity: 'uncommon', weight: 14 },
        { species: 'Gloom Bat', rarity: 'rare', weight: 8 }
      ],
      specials: [
        { species: 'Petal Lynx', rarity: 'legendary', chance: 0.07, minSteps: 60, minCaptures: 2, terrain: 'grass' }
      ]
    },
    {
      label: 'Creek Bend',
      palette: { plain: '#8ac9b0', grass: '#64b19d', path: '#d2c18d', water: '#4da8da' },
      landmark: 'reeds',
      pool: [
        { species: 'Tide Cub', rarity: 'common', weight: 38 },
        { species: 'Mossling', rarity: 'common', weight: 24 },
        { species: 'Volt Finch', rarity: 'uncommon', weight: 16 },
        { species: 'Ember Pup', rarity: 'uncommon', weight: 14 },
        { species: 'Gloom Bat', rarity: 'rare', weight: 8 }
      ],
      specials: [
        { species: 'Brookfin', rarity: 'legendary', chance: 0.06, minSteps: 110, minDefeated: 4, terrain: 'grass' }
      ]
    },
    {
      label: 'Dusk Hollow',
      palette: { plain: '#8691a8', grass: '#6c7c99', path: '#9b9078', water: '#556f97' },
      landmark: 'obelisk',
      pool: [
        { species: 'Gloom Bat', rarity: 'common', weight: 34 },
        { species: 'Mossling', rarity: 'common', weight: 22 },
        { species: 'Tide Cub', rarity: 'uncommon', weight: 18 },
        { species: 'Ember Pup', rarity: 'uncommon', weight: 16 },
        { species: 'Volt Finch', rarity: 'rare', weight: 10 }
      ],
      specials: [
        { species: 'Mire Owl', rarity: 'legendary', chance: 0.055, minSteps: 160, minCaptures: 4, minDefeated: 6, terrain: 'grass' }
      ]
    },
    {
      label: 'Thunder Ridge',
      palette: { plain: '#c5b17b', grass: '#b59753', path: '#d7c48d', water: '#6f91b8' },
      landmark: 'teslapost',
      pool: [
        { species: 'Volt Finch', rarity: 'common', weight: 36 },
        { species: 'Ember Pup', rarity: 'uncommon', weight: 24 },
        { species: 'Gloom Bat', rarity: 'uncommon', weight: 20 },
        { species: 'Tide Cub', rarity: 'uncommon', weight: 12 },
        { species: 'Mossling', rarity: 'rare', weight: 8 }
      ],
      specials: [
        { species: 'Static Ram', rarity: 'legendary', chance: 0.045, minSteps: 220, minDefeated: 8, terrain: 'grass' }
      ]
    },
    {
      label: 'Wild Crown',
      palette: { plain: '#8cb46f', grass: '#5f8f47', path: '#d5c17d', water: '#6daec8' },
      landmark: 'crowntree',
      pool: [
        { species: 'Ember Pup', rarity: 'uncommon', weight: 24 },
        { species: 'Tide Cub', rarity: 'uncommon', weight: 22 },
        { species: 'Volt Finch', rarity: 'rare', weight: 20 },
        { species: 'Gloom Bat', rarity: 'rare', weight: 18 },
        { species: 'Mossling', rarity: 'uncommon', weight: 16 }
      ],
      specials: [
        { species: 'Crownwyrm', rarity: 'legendary', chance: 0.03, minSteps: 320, minCaptures: 8, minDefeated: 12, terrain: 'grass' }
      ]
    }
  ];
  const playerSprite = ['........', '..111...', '..1221..', '.133331.', '.133331.', '..344...', '.4...4..', '........'];
  const tallGrassSprite = ['........', '.1.1.1..', '..1.1...', '.1.11.1.', '..11....', '.1..1.1.', '........', '........'];
  const treeSprite = ['...11...', '..1221..', '.122221.', '.122221.', '..2332..', '...33...', '...44...', '..4..4..'];
  const fieldStationSprite = ['11111111', '12222221', '12333321', '12344321', '12344321', '12333321', '12222221', '11111111'];
  const capsuleSprite = ['...11...', '..1221..', '.123321.', '.123321.', '.144441.', '..1441..', '...11...', '........'];
  const coinSprite = ['..1111..', '.122221.', '.123321.', '.123321.', '.122221.', '..1111..', '........', '........'];
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
  let activeIndex = 0;
  let captures = 0;
  let defeated = 0;
  let steps = 0;
  let gameOver = false;
  let battleTarget = null;
  let worldTick = 0;
  let coins = 20;
  let capsules = 5;
  const maxCapsules = 9;
  const shopItems = [
    { key: 'heal', label: 'Heal Party', cost: 0 },
    { key: 'capsule', label: 'Buy Capsule', cost: 12 },
    { key: 'tonic', label: 'Buy Tonic', cost: 18 },
    { key: 'index', label: 'Monster Index', cost: 0 },
    { key: 'leave', label: 'Leave Town', cost: 0 }
  ];
  let townMenuOpen = false;
  let townSelection = 0;
  let indexMenuOpen = false;
  let indexSelection = 0;
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

  function currentScore() {
    return captures * 140 + defeated * 55 + steps * 2 + party.reduce((total, monster) => total + monster.level * 8, 0) + coins;
  }

  function routeProfileAt(x = player.x, y = player.y) {
    const distance = Math.abs(x) + Math.abs(y);
    const band = Math.min(routeProfiles.length - 1, Math.max(0, Math.floor(Math.max(0, distance - 4) / 28)));
    return routeProfiles[band];
  }

  function routeLabelAt(x = player.x, y = player.y) {
    return isTownTile(x, y) ? 'Town' : routeProfileAt(x, y).label;
  }

  function routesForSpecies(speciesName) {
    return routeProfiles
      .filter(profile => profile.pool.some(entry => entry.species === speciesName) || (profile.specials || []).some(entry => entry.species === speciesName))
      .map(profile => profile.label);
  }

  function setMessage(text) {
    const el = document.getElementById('mtMsg');
    if (el) el.textContent = text;
  }

  function activeMonster() {
    return party[activeIndex] || null;
  }

  function isTownTile(x = player.x, y = player.y) {
    return x === 0 && y === 0;
  }

  function cloneMonster(species, level = 1) {
    return {
      species: species.name,
      name: species.name,
      color: species.color,
      accent: species.accent,
      sprite: species.sprite,
      level,
      xp: 0,
      xpToNext: 5 + level * 4,
      maxHp: species.hp + level,
      hp: species.hp + level,
      atkMin: species.atkMin + Math.floor((level - 1) / 2),
      atkMax: species.atkMax + Math.floor(level / 2),
      catchBase: species.catchBase
    };
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
      existing.routes.sort((a, b) => routeProfiles.findIndex(profile => profile.label === a) - routeProfiles.findIndex(profile => profile.label === b));
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
    const capsuleEl = document.getElementById('mtCapsules');
    const coinEl = document.getElementById('mtCoins');
    const scoreEl = document.getElementById('mtScore');
    const highEl = document.getElementById('mtHigh');
    if (leadEl) leadEl.textContent = lead ? `Lead: ${lead.name} Lv${lead.level}` : 'Lead: None';
    if (hpEl) hpEl.textContent = lead ? `HP: ${lead.hp}/${lead.maxHp} XP:${lead.xp}/${lead.xpToNext}` : 'HP: 0/0';
    if (caughtEl) caughtEl.textContent = `Caught: ${captures} Party:${party.length}`;
    if (capsuleEl) capsuleEl.textContent = `Capsules: ${capsules}`;
    if (coinEl) coinEl.textContent = `Coins: ${coins}`;
    if (scoreEl) scoreEl.textContent = `Score: ${currentScore()}`;
    if (highEl) highEl.textContent = `High: ${highScore}`;
  }

  function terrainAt(x, y) {
    if (x === 0 && y === 0) return 'heal';
    if (Math.abs(x) <= 2 && Math.abs(y) <= 2) return 'path';

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

  function firstHealthyMonsterIndex() {
    return party.findIndex(monster => monster.hp > 0);
  }

  function chooseEncounter(x, y) {
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
      const specialRoll = hashValue(x, y, 149);
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
    let roll = hashValue(x, y, 31) * totalWeight;
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

  function regionLevel(x, y) {
    return Math.min(12, 1 + Math.floor((Math.abs(x) + Math.abs(y)) / 18));
  }

  function createWildMonster(x, y, bonusLevel = 0) {
    const encounter = chooseEncounter(x, y);
    const rarity = rarityMeta[encounter.rarity] || rarityMeta.common;
    const species = encounter.species;
    const level = Math.min(14, regionLevel(x, y) + bonusLevel + rarity.levelBonus + (hashValue(x, y, 37) > 0.82 ? 1 : 0));
    const monster = {
      id: `mt-${Math.floor(hashValue(x, y, 41) * 1000000)}-${x}-${y}`,
      x,
      y,
      ...cloneMonster(species, level),
      rarity: encounter.rarity,
      route: encounter.profile.label,
      roamBias: Math.floor(hashValue(x, y, 43) * 4)
    };
    monster.catchBase = Math.max(0.12, monster.catchBase + rarity.catchAdjust);
    return monster;
  }

  function getChunk(cx, cy) {
    const id = chunkKey(cx, cy);
    if (!chunks.has(id)) {
      const chunk = { cx, cy, monsters: [] };
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
        chunk.monsters.push(createWildMonster(mx, my, i % 2));
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

  function monsterOccupied(x, y, ignore) {
    return getRelevantChunks(chunkRadius + 1).some(chunk => chunk.monsters.some(monster => monster !== ignore && monster.x === x && monster.y === y));
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
    townMenuOpen = true;
    indexMenuOpen = false;
    townSelection = 0;
    setMessage('Town services are open. Stock up or check your index.');
    drawTamerWorld();
  }

  function closeTownMenu(message) {
    townMenuOpen = false;
    indexMenuOpen = false;
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
    townSelection = wrapIndex(townSelection + step, shopItems.length);
    setMessage(`${shopItems[townSelection].label} selected.`);
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
    if (lead.hp >= lead.maxHp) return `${lead.name} is already at full HP.`;
    lead.hp = Math.min(lead.maxHp, lead.hp + 8);
    return `${lead.name} recovered with a tonic.`;
  }

  function buyTownItem() {
    if (!townMenuOpen) return;
    if (indexMenuOpen) {
      closeMonsterIndex('Back to town services.');
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
    } else if (choice.key === 'tonic') {
      coins -= choice.cost;
      setMessage(usePotionOnLead());
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

  function drawLandmark(profile, sx, sy, worldX, worldY, type) {
    if (!profile || type === 'grass' || type === 'water' || type === 'heal') return;
    const landmark = landmarkSprites[profile.landmark];
    if (!landmark) return;
    if (hashValue(worldX, worldY, 201) < 0.972) return;
    drawPixelSprite(landmark.sprite, landmark.palette, sx, sy, 2);
  }

  function drawWorldTile(type, sx, sy, worldX, worldY) {
    const profile = routeProfileAt(worldX, worldY);
    const palette = profile.palette || { plain: '#98cd72', grass: '#7fbe57', path: '#cab47b', water: '#5aa4de' };
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
      return;
    }
    if (type === 'water') {
      ctx.fillStyle = palette.water;
      ctx.fillRect(sx, sy, tile, tile);
      ctx.fillStyle = '#8ed0ff';
      ctx.fillRect(sx + 1, sy + 4, 6, 2);
      ctx.fillRect(sx + 8, sy + 10, 6, 2);
      ctx.fillRect(sx + 5, sy + 14, 5, 1);
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
    if (type === 'heal') {
      drawPixelSprite(fieldStationSprite, { '1': '#3f4f34', '2': '#efe8cf', '3': '#d45252', '4': '#87b8e2' }, sx, sy, 2);
      return;
    }
    drawLandmark(profile, sx, sy, worldX, worldY, type);
  }

  function drawMonsterSprite(monster, sx, sy, scale) {
    drawPixelSprite(monster.sprite, {
      '1': monster.color,
      '2': monster.accent,
      '3': '#2f2f2f',
      '4': '#ffffff'
    }, sx, sy, scale);
  }

  function drawTamerWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d8f0be';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (battleTarget) {
      drawBattleScene();
      return;
    }

    if (indexMenuOpen) {
      drawMonsterIndex();
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
    getRelevantChunks(chunkRadius + 1).forEach(chunk => {
      chunk.monsters.forEach(monster => {
        const sx = monster.x - cameraX;
        const sy = monster.y - cameraY;
        if (sx >= 0 && sx < viewCols && sy >= 0 && sy < viewRows) {
          visibleMonsters.push({ monster, sx, sy });
        }
      });
    });

    visibleMonsters.forEach(({ monster, sx, sy }) => {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(mapOffsetX + sx * tile + 4, sy * tile + 11, 8, 3);
      drawMonsterSprite(monster, mapOffsetX + sx * tile, sy * tile, 2);
    });

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(mapOffsetX + Math.floor(viewCols / 2) * tile + 4, Math.floor(viewRows / 2) * tile + 11, 8, 3);
    drawPixelSprite(playerSprite, { '1': '#cf4949', '2': '#f2d8b6', '3': '#356ec9', '4': '#2a2a2a' }, mapOffsetX + Math.floor(viewCols / 2) * tile, Math.floor(viewRows / 2) * tile, 2);

    ctx.fillStyle = 'rgba(34,50,20,0.74)';
    ctx.fillRect(0, 0, canvas.width, 18);
    ctx.fillStyle = '#eef8d7';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(routeLabelAt(), 8, 12);
    ctx.textAlign = 'right';
    ctx.fillText(`X:${player.x} Y:${player.y}`, canvas.width - 8, 12);

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
  }

  function drawTownScene() {
    ctx.fillStyle = '#d7efc3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8fc16d';
    ctx.fillRect(0, 134, canvas.width, 74);
    ctx.fillStyle = '#6e9d51';
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

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(14, 12, 284, 184);
    ctx.strokeStyle = '#465538';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 12, 284, 184);

    ctx.fillStyle = '#465538';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Town Services', canvas.width / 2, 32);
    ctx.font = 'bold 10px Courier New';
    ctx.fillText(`Coins ${coins}  Capsules ${capsules}/${maxCapsules}`, canvas.width / 2, 48);

    drawPixelSprite(capsuleSprite, { '1': '#7b5cff', '2': '#c6b8ff', '3': '#2d2d2d', '4': '#ffffff' }, 32, 22, 2);
    drawPixelSprite(coinSprite, { '1': '#c9922d', '2': '#f2cf67', '3': '#9b6b22' }, 258, 22, 2);

    shopItems.forEach((item, index) => {
      const y = 68 + index * 28;
      if (index === townSelection) {
        ctx.fillStyle = '#cfe5b8';
        ctx.fillRect(26, y - 12, 260, 20);
      }
      ctx.fillStyle = '#39462e';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, 34, y);
      ctx.textAlign = 'right';
      ctx.fillText(item.cost ? `${item.cost}c` : item.key === 'leave' ? 'Exit' : 'Free', 278, y);
    });

    ctx.fillStyle = 'rgba(45,56,34,0.92)';
    ctx.fillRect(14, 164, 284, 32);
    ctx.fillStyle = '#eff7df';
    ctx.textAlign = 'center';
    ctx.fillText('Prev/Next or Wheel: Browse  |  Center: Buy/Use  |  Play: Leave', canvas.width / 2, 184);
  }

  function drawMonsterIndex() {
    const species = speciesList[indexSelection];
    const dex = monsterDex[species.name] || { seen: false, caught: false, routes: [] };
    const knownRoutes = dex.routes.length ? dex.routes : routesForSpecies(species.name);
    const rarity = routeProfiles.flatMap(profile => ([...(profile.pool || []), ...(profile.specials || [])]))
      .find(entry => entry.species === species.name)?.rarity || 'common';

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

    drawMonsterSprite({ ...species, sprite: species.sprite }, 32, 58, 4);

    ctx.textAlign = 'left';
    ctx.font = 'bold 10px Courier New';
    ctx.fillStyle = '#415435';
    ctx.fillText(`Seen: ${dex.seen ? 'Yes' : 'No'}`, 138, 70);
    ctx.fillText(`Caught: ${dex.caught ? 'Yes' : 'No'}`, 138, 86);
    ctx.fillText(`Base HP: ${species.hp}`, 138, 102);
    ctx.fillText(`Atk: ${species.atkMin}-${species.atkMax}`, 138, 118);
    ctx.fillText('Routes:', 138, 136);

    ctx.font = '10px Courier New';
    const routeText = knownRoutes.length ? knownRoutes.join(', ') : 'Unknown';
    const routeLines = routeText.match(/.{1,24}(?:, |$)/g) || [routeText];
    routeLines.slice(0, 3).forEach((line, index) => {
      ctx.fillText(line.trim(), 138, 150 + index * 12);
    });

    ctx.fillStyle = 'rgba(45,56,34,0.92)';
    ctx.fillRect(10, 176, 292, 22);
    ctx.fillStyle = '#eff7df';
    ctx.textAlign = 'center';
    ctx.fillText('Prev/Next or Wheel: Browse  |  Center/Play: Back', canvas.width / 2, 191);
  }

  function drawBattleScene() {
    const lead = activeMonster();
    ctx.fillStyle = '#d6efbf';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#afd67e';
    ctx.fillRect(0, 130, canvas.width, 78);
    ctx.fillStyle = '#96c36f';
    ctx.fillRect(0, 145, canvas.width, 63);

    ctx.fillStyle = '#eef7df';
    ctx.fillRect(14, 18, 126, 36);
    ctx.fillRect(172, 126, 126, 36);
    ctx.strokeStyle = '#39462e';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 18, 126, 36);
    ctx.strokeRect(172, 126, 126, 36);

    ctx.fillStyle = '#39462e';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(`${(rarityMeta[battleTarget.rarity] || rarityMeta.common).label} ${battleTarget.name} Lv${battleTarget.level}`, 22, 32);
    ctx.fillText(`HP ${battleTarget.hp}/${battleTarget.maxHp}`, 22, 46);
    ctx.fillText(`${lead ? lead.name : 'No Lead'} Lv${lead ? lead.level : 0}`, 180, 140);
    ctx.fillText(`HP ${lead ? lead.hp : 0}/${lead ? lead.maxHp : 0}`, 180, 154);

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(232, 108, 28, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(86, 160, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    drawMonsterSprite(battleTarget, 206, 72, 4);
    if (lead) {
      drawMonsterSprite(lead, 54, 122, 4);
    }

    ctx.fillStyle = 'rgba(45,56,34,0.9)';
    ctx.fillRect(0, 176, canvas.width, 32);
    ctx.fillStyle = '#eff7df';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`Center: Attack  |  Play/Pause: Capsule x${capsules}`, canvas.width / 2, 196);
  }

  function endRun(reason) {
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
    let levelsGained = 0;
    monster.xp += amount;
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

  function stepWorld() {
    worldTick += 1;
    getRelevantChunks(chunkRadius + 1).forEach(chunk => {
      chunk.monsters.forEach(monster => {
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
        getChunk(Math.floor(px / chunkSize), Math.floor(py / chunkSize)).monsters.push(createWildMonster(px, py, Math.random() < 0.35 ? 1 : 0));
        break;
      }
    }

    updateHighScore();
    updateTamerUi();
    drawTamerWorld();
  }

  function beginBattle(monster) {
    battleTarget = monster;
    recordDexEntry(monster, 'seen');
    const rarityLabel = (rarityMeta[monster.rarity] || rarityMeta.common).label.toLowerCase();
    setMessage(`A ${rarityLabel} ${monster.name} appeared on ${monster.route || routeLabelAt(monster.x, monster.y)}. Capsules left: ${capsules}.`);
    updateTamerUi();
    drawTamerWorld();
  }

  function attackWild() {
    if (gameOver) {
      startRun();
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
      if (isTownTile()) {
        openTownMenu();
        return;
      }
      const nearby = [[0, -1], [1, 0], [0, 1], [-1, 0]]
        .map(([dx, dy]) => getMonsterAt(player.x + dx, player.y + dy))
        .find(Boolean);
      if (nearby) {
        beginBattle(nearby);
        return;
      }
      setMessage('Nothing to interact with here right now.');
      drawTamerWorld();
      return;
    }

    const damage = ally.atkMin + Math.floor(Math.random() * (ally.atkMax - ally.atkMin + 1));
    battleTarget.hp -= damage;
    if (battleTarget.hp <= 0) {
      const xpGain = 3 + battleTarget.level * 2;
      const coinGain = 5 + battleTarget.level * 3 + (rarityMeta[battleTarget.rarity] || rarityMeta.common).coinBonus;
      const levels = awardExperience(ally, xpGain);
      coins += coinGain;
      setMessage(levels > 0
        ? `${ally.name} won, earned ${coinGain}c, and grew to Lv${ally.level}.`
        : `${ally.name} defeated ${battleTarget.name} and earned ${coinGain}c.`);
      removeMonster(battleTarget);
      battleTarget = null;
      defeated += 1;
      stepWorld();
      return;
    }

    setMessage(`${ally.name} hits ${battleTarget.name} for ${damage}.`);
    const retaliation = battleTarget.atkMin + Math.floor(Math.random() * (battleTarget.atkMax - battleTarget.atkMin + 1));
    ally.hp = Math.max(0, ally.hp - retaliation);

    if (ally.hp <= 0) {
      setMessage(`${battleTarget.name} knocked out ${ally.name}.`);
      if (!switchToHealthyLead()) {
        endRun('All your monsters fainted.');
        return;
      }
    }

    updateHighScore();
    updateTamerUi();
    drawTamerWorld();
  }

  function tryCatch() {
    if (gameOver) {
      startRun();
      return;
    }
    if (townMenuOpen) {
      if (indexMenuOpen) {
        closeMonsterIndex('Back to town services.');
        return;
      }
      closeTownMenu('You leave the shop and head back outside.');
      return;
    }
    if (!battleTarget) {
      const healthy = party.filter(monster => monster.hp > 0);
      if (healthy.length > 1) {
        do {
          activeIndex = (activeIndex + 1) % party.length;
        } while (party[activeIndex].hp <= 0);
        setMessage(`Lead monster: ${activeMonster().name}.`);
        updateTamerUi();
        drawTamerWorld();
      } else {
        setMessage('Only one healthy partner is ready right now.');
      }
      return;
    }

    if (capsules <= 0) {
      setMessage('You are out of capsules. Return to town and buy more.');
      drawTamerWorld();
      return;
    }

    capsules -= 1;

    const healthFactor = 1 - (battleTarget.hp / battleTarget.maxHp);
    const chance = Math.min(0.9, battleTarget.catchBase + healthFactor * 0.55);
    if (Math.random() < chance) {
      party.push({
        name: battleTarget.name,
        species: battleTarget.species,
        color: battleTarget.color,
        accent: battleTarget.accent,
        sprite: battleTarget.sprite,
        level: battleTarget.level,
        xp: 0,
        xpToNext: 5 + battleTarget.level * 4,
        maxHp: battleTarget.maxHp,
        hp: Math.max(1, Math.floor(battleTarget.maxHp * 0.75)),
        atkMin: battleTarget.atkMin,
        atkMax: battleTarget.atkMax,
        catchBase: battleTarget.catchBase,
        rarity: battleTarget.rarity || 'common'
      });
      captures += 1;
      coins += 10 + battleTarget.level * 2;
      recordDexEntry(battleTarget, 'caught');
      removeMonster(battleTarget);
      setMessage(`You caught the ${(rarityMeta[battleTarget.rarity] || rarityMeta.common).label.toLowerCase()} ${battleTarget.name}! Party ${party.length}. Capsules left: ${capsules}.`);
      battleTarget = null;
      updateHighScore();
      updateTamerUi();
      drawTamerWorld();
      return;
    }

    const ally = activeMonster();
    const retaliation = battleTarget.atkMin + Math.floor(Math.random() * (battleTarget.atkMax - battleTarget.atkMin + 1));
    if (ally) {
      ally.hp = Math.max(0, ally.hp - retaliation);
    }
    setMessage(`Capture failed. ${battleTarget.name} lashes out for ${retaliation}. Capsules left: ${capsules}.`);

    if (!ally || ally.hp <= 0) {
      if (!switchToHealthyLead()) {
        endRun('All your monsters fainted.');
        return;
      }
    }

    updateHighScore();
    updateTamerUi();
    drawTamerWorld();
  }

  function movePlayer(dx, dy) {
    if (gameOver) {
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
    if (terrain === 'grass' && Math.random() < 0.16) {
      const wild = createWildMonster(player.x, player.y, 1);
      wild.ephemeral = true;
      beginBattle(wild);
      return;
    }
    if (isTownTile()) {
      setMessage('You are back in town. Center opens the shop.');
    } else if (terrain === 'grass') {
      setMessage(`Tall grass rustles on ${routeLabelAt()}.`);
    } else {
      setMessage(`You are on ${routeLabelAt()}. Stronger monsters live farther out.`);
    }
    stepWorld();
  }

  function startRun() {
    highScore = getHighScore(gameKey);
    captures = 0;
    defeated = 0;
    steps = 0;
    gameOver = false;
    battleTarget = null;
    townMenuOpen = false;
    townSelection = 0;
    indexMenuOpen = false;
    indexSelection = 0;
    chunks = new Map();
    party = [cloneMonster(speciesList[0], 1)];
    activeIndex = 0;
    coins = 20;
    capsules = 5;
    player = { x: 0, y: 1 };
    ensureWorld();
    setMessage('Leave town, discover route monsters, and return to town to check your index.');
    updateTamerUi();
    drawTamerWorld();
  }

  startRun();

  releaseGameControls = useGameControls({
    onLeft: () => (townMenuOpen || indexMenuOpen) ? moveTownSelection(-1) : movePlayer(-1, 0),
    onRight: () => (townMenuOpen || indexMenuOpen) ? moveTownSelection(1) : movePlayer(1, 0),
    onConfirm: () => attackWild(),
    onPlayPause: () => tryCatch()
  });

  window.onGameScroll = (dir) => {
    if (townMenuOpen || indexMenuOpen) {
      moveTownSelection(dir > 0 ? 1 : -1);
      return;
    }
    movePlayer(0, dir > 0 ? 1 : -1);
  };

  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => {
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