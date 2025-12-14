// --- GAMES MENU ---
let releaseGameControls = null;

const HS_KEY = 'gameHighScores';

function getHighScore(game) {
  const hs = JSON.parse(localStorage.getItem(HS_KEY) || '{}');
  return Number.isFinite(hs[game]) ? hs[game] : 0;
}

function setHighScore(game, val) {
  const hs = JSON.parse(localStorage.getItem(HS_KEY) || '{}');
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
    `<div style="padding:18px;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.2em;font-weight:bold;">Number Guess</div>
      <div id="ngMsg" style="text-align:center;color:#444;">${msg}</div>
      <input id="ngInput" type="number" min="1" max="20" value="10"
        style="width:80px;text-align:center;font-size:1.1em;padding:6px;border-radius:8px;border:1px solid #ccc;">
      <button id="ngSubmit" style="padding:8px 16px;border:none;border-radius:8px;background:#0074d9;color:#fff;cursor:pointer;">Guess</button>
      <button id="ngBack" style="padding:6px 12px;border:none;border-radius:8px;background:#eee;color:#444;cursor:pointer;">Back</button>
    </div>`,
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
    `<div style="padding-top:32px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
      <div style="font-size:1.2em;font-weight:bold;">Brick Paddle</div>
      <canvas id="bpCanvas" width="340" height="220" style="background:#111;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: move | Center: serve | Play/Pause: pause | Menu: back
      </div>
      <div id="bpScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
      <div id="bpHigh" style="font-weight:bold;color:#888;">High: 0</div>
    </div>`,
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
    `<div style="padding-top:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
      <div style="font-size:1.2em;font-weight:bold;">Snake</div>
      <canvas id="snCanvas" width="240" height="240" style="background:#0b0b0b;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: turn | Center: start/restart | Play/Pause: pause | Menu: back
      </div>
      <div id="snScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
      <div id="snHigh" style="font-weight:bold;color:#888;">High: 0</div>
    </div>`,
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
    `<div style="padding-top:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
       <div style="font-size:1.2em;font-weight:bold;">Flappy Dot</div>
       <canvas id="fpCanvas" width="300" height="220" style="background:#0b0b0b;border:2px solid #444;border-radius:10px;"></canvas>
       <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
         Center/Play: flap | Menu: back
       </div>
       <div id="fpScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
       <div id="fpHigh" style="font-weight:bold;color:#888;">High: 0</div>
     </div>`,
    direction
  );

  const cvs = document.getElementById('fpCanvas');
  const ctx = cvs.getContext('2d');
  let bird = { x: 50, y: 80, vy: 0, rot: 0 };
  const birdImg = new Image();
  birdImg.src = 'src/img/flailing_bird.png';
  let pipes = [];
  let running = true, score = 0;
  let highScore = Math.max(getHighScore('flappy'), Number(localStorage.getItem('flappyHighScore') || 0));
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
            localStorage.setItem('flappyHighScore', highScore);
        }
        updateScoreUI();
      }
      const inX = bird.x > p.x - 8 && bird.x < p.x + 30 + 8;
      const inY = bird.y < p.top || bird.y > p.top + p.gap;
      if (inX && inY) running = false;
    });
    if (bird.y < 0 || bird.y > cvs.height) running = false;

    ctx.fillStyle = "#0b0b0b"; ctx.fillRect(0,0,cvs.width,cvs.height);

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
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(x + wPipe, 0, 3, cvs.height);
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

// --- 2048 Mini ---
function render2048(direction = 'forward') {
  pushGameNav(render2048);
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  renderScreen(
    `<div style="padding-top:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
      <div style="font-size:1.2em;font-weight:bold;">2048 Mini</div>
      <canvas id="g2048" width="250" height="250" style="background:#0f0f0f;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: Left/Right | Center: Up | Play/Pause: Down | Menu: back
      </div>
      <div id="g2048Score" style="font-weight:bold;color:#0074d9;">Score: 0</div>
      <div id="g2048High" style="font-weight:bold;color:#888;">High: 0</div>
    </div>`,
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
    `<div style="padding-top:10px;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;">
      <div style="font-size:1.15em;font-weight:bold;">Chess (Beta)</div>
      <canvas id="chCanvas" width="240" height="240" style="background:#111;border:2px solid #444;border-radius:10px;"></canvas>
      <div id="chStatus" style="font-size:0.9em;color:#555;text-align:center;">White to move. Prev/Next: ←/→, wheel: ↑/↓, Center: select/move, Play: cancel, Menu: back</div>
    </div>`,
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
     `<div style="padding-top:10px;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;">
       <div style="font-size:1.15em;font-weight:bold;">Solitaire</div>
       <canvas id="solCanvas" width="320" height="260" style="background:#0f0f0f;border:2px solid #444;border-radius:10px;"></canvas>
       <div id="solStatus" style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
         Prev/Next or wheel: move | Center: draw/pick/move | Play: draw/recycle | Menu: back
       </div>
     </div>`,
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