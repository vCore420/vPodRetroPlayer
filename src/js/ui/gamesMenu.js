// --- GAMES MENU ---
let releaseGameControls = null;

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
      { label: "Number Guess", action: renderNumberGuess }
    ],
    onItemClick: (idx, item) => { app.state.currentMenuIndex = idx; item.action(); },
    onBack: goBack,
    id: "gamesList"
  }, direction);
  masterHighlight({ containerSelector: '#gamesList', itemsSelector: 'li' });
}

function renderNumberGuess(direction = 'forward') {
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
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
      <div style="font-size:1.2em;font-weight:bold;">Brick Paddle</div>
      <canvas id="bpCanvas" width="320" height="220" style="background:#111;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: move | Center: serve | Play/Pause: pause | Menu: back
      </div>
      <div id="bpScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
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
  let running = true, score = 0;

  function resetBricks() {
    bricks = [];
    for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
      bricks.push({ x: 14 + c*(bw+gap), y: top + r*(bh+gap), w: bw, h: bh, hit:false });
    }
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
          document.getElementById('bpScore').textContent = `Score: ${score}`;
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

  // Back via MENU
  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => { running = false; if (releaseGameControls) releaseGameControls(); releaseGameControls=null; menuBtn.onclick = oldMenu; goBack(); };
}

function renderSnake(direction = 'forward') {
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }

  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
      <div style="font-size:1.2em;font-weight:bold;">Snake</div>
      <canvas id="snCanvas" width="240" height="240" style="background:#0b0b0b;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: turn | Center: start/restart | Play/Pause: pause | Menu: back
      </div>
      <div id="snScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
    </div>`,
    direction
  );

  const cvs = document.getElementById('snCanvas');
  const ctx = cvs.getContext('2d');
  const size = 12;
  const cells = Math.floor(cvs.width / size);
  let snake, dir, food, running, score, lastStep;

  function resetGame() {
    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    dir = { x: 1, y: 0 };
    placeFood();
    running = true;
    score = 0;
    lastStep = performance.now();
    document.getElementById('snScore').textContent = `Score: ${score}`;
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
      document.getElementById('snScore').textContent = `Score: ${score}`;
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
    onLeft: () => { if (running) turnLeft(); },
    onRight: () => { if (running) turnRight(); },
    onConfirm: () => { resetGame(); },
    onPlayPause: () => { running = !running; if (running) lastStep = performance.now(); }
  });

  // Back via MENU
  const menuBtn = document.getElementById('menuBtn');
  const oldMenu = menuBtn.onclick;
  menuBtn.onclick = () => {
    running = false;
    if (releaseGameControls) releaseGameControls();
    releaseGameControls = null;
    menuBtn.onclick = oldMenu;
    goBack();
  };
}

// --- Flappy Dot ---
function renderFlappy(direction = 'forward') {
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
      <div style="font-size:1.2em;font-weight:bold;">Flappy Dot</div>
      <canvas id="fpCanvas" width="240" height="200" style="background:#0b0b0b;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Center/Play: flap | Menu: back
      </div>
      <div id="fpScore" style="font-weight:bold;color:#0074d9;">Score: 0</div>
    </div>`,
    direction
  );

  const cvs = document.getElementById('fpCanvas');
  const ctx = cvs.getContext('2d');
  let bird = { x: 50, y: 80, vy: 0 };
  let pipes = [];
  let running = true, score = 0;
  let lastFrame = 0;
  let spawnTimer = 0;

  function reset() {
    bird = { x: 50, y: 80, vy: 0 };
    pipes = [];
    score = 0;
    document.getElementById('fpScore').textContent = `Score: ${score}`;
    running = true;
    lastFrame = performance.now();
    spawnTimer = 0;
    loop(lastFrame);
  }

  function flap() { bird.vy = -4.2; }

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
    bird.y += bird.vy * dt;

    // move pipes
    pipes.forEach(p => p.x -= 2.1 * dt);
    pipes = pipes.filter(p => p.x > -40);

    // collisions / score
    pipes.forEach(p => {
      if (p.x + 30 < bird.x && !p.scored) { score += 1; p.scored = true; document.getElementById('fpScore').textContent = `Score: ${score}`; }
      const inX = bird.x > p.x - 8 && bird.x < p.x + 30 + 8;
      const inY = bird.y < p.top || bird.y > p.top + p.gap;
      if (inX && inY) running = false;
    });
    if (bird.y < 0 || bird.y > cvs.height) running = false;

    // draw
    ctx.fillStyle = "#0b0b0b"; ctx.fillRect(0,0,cvs.width,cvs.height);
    ctx.fillStyle = "#4fc3f7"; ctx.beginPath(); ctx.arc(bird.x, bird.y, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#4caf50";
    pipes.forEach(p => {
      ctx.fillRect(p.x, 0, 30, p.top);
      ctx.fillRect(p.x, p.top + p.gap, 30, cvs.height - (p.top + p.gap));
    });

    if (!running) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0,0,cvs.width,cvs.height);
      ctx.fillStyle = "#fff";
      ctx.font = "14px Segoe UI"; ctx.textAlign = "center";
      ctx.fillText("Game Over", cvs.width/2, cvs.height/2 - 6);
      ctx.fillText("Center to restart", cvs.width/2, cvs.height/2 + 12);
    }
  }
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
  if (releaseGameControls) { releaseGameControls(); releaseGameControls = null; }
  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
      <div style="font-size:1.2em;font-weight:bold;">2048 Mini</div>
      <canvas id="g2048" width="240" height="240" style="background:#0f0f0f;border:2px solid #444;border-radius:10px;"></canvas>
      <div style="font-size:0.9em;color:#555;text-align:center;max-width:320px;">
        Prev/Next: Left/Right | Center: Up | Play/Pause: Down | Menu: back
      </div>
      <div id="g2048Score" style="font-weight:bold;color:#0074d9;">Score: 0</div>
    </div>`,
    direction
  );

  const cvs = document.getElementById('g2048');
  const ctx = cvs.getContext('2d');
  const n = 4, cell = 54, gap = 6, off = 9;
  let grid, score;

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
    document.getElementById('g2048Score').textContent = `Score: ${score}`;
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

window.renderGamesMenu = renderGamesMenu;