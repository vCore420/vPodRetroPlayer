// --- SETTINGS MENU ---
const DEV_UNLOCK_RARES = false;

const defaultTimeSettings = {
  hourFormat: '24', 
  dateFormat: 'DD/MM/YYYY' 
};

function getTimeSettings() {
  return JSON.parse(localStorage.getItem('timeSettings')) || defaultTimeSettings;
}

function saveTimeSettings(settings) {
  localStorage.setItem('timeSettings', JSON.stringify(settings));
}

function renderSettingsMenu(direction = 'forward') {
  app.state.currentMenuIndex = 0;
  renderMenuList({
    title: "Settings",
    items: [
      { label: "Equalizer", action: renderEqualizerMenu },
      { label: "Date and Time", action: renderDateTimeMenu },
      { label: "vPod Colour", action: renderColourMenu },
      { label: "User Stats", action: renderUserStatsMenu },
      { label: "Backup / Restore", action: renderBackupMenu },
      { label: "About", action: renderAboutMenu }
      // Add more settings here 
    ],
    onItemClick: (idx, item) => { 
      app.state.currentMenuIndex = idx; 
      goTo(item.action); 
    },
    onBack: goBack,
    id: "settingsList",
  }, direction);

  masterHighlight({
    containerSelector: '#settingsList',
    itemsSelector: 'li'
  });

  updateHotBarTime();
}

function renderEqualizerMenu(direction = 'forward', selectedIdx = null) {
  const currentPreset = localStorage.getItem('eqPreset') || "Flat";
  const presets = [
    "Flat",
    "Bass Boost",
    "Treble Boost",
    "Rock",
    "Pop",
    "Jazz",
    "Classical",
    "Dance",
    "Vocal Boost",
    "Soft",
    "Loudness",
    "Acoustic",
    "Electronic",
    "Metal",
    "Reggae"
  ];

  if (selectedIdx === null) {
    selectedIdx = presets.findIndex(label => label === currentPreset);
  }
  app.state.currentMenuIndex = selectedIdx;

  renderMenuList({
    title: "Equalizer Presets",
    items: presets.map(label => ({
      label: label + (label === currentPreset
       ? ' <i class="fa-solid fa-check" style="color:#0074d9;font-size:1.1em;"></i>'
       : ''),
      rawLabel: label
    })),
    onItemClick: (idx, item) => {
        player.setEQPreset(item.rawLabel);

        const eqList = document.getElementById('eqList');
        if (eqList) {
            Array.from(eqList.children).forEach((li, i) => {
              li.innerHTML = presets[i] + (i === idx
                ? ' <i class="fa-solid fa-check" style="color:#0074d9;font-size:1.1em;"></i>'
                : '');
            });
        }
        app.state.currentMenuIndex = idx;
    },
    onBack: goBack,
    id: "eqList"
  }, direction);

  const eqList = document.getElementById('eqList');
  if (eqList && eqList.children[selectedIdx]) {
    eqList.children[selectedIdx].classList.add('active');
    eqList.children[selectedIdx].scrollIntoView({ block: 'nearest' });
  }
}

function renderDateTimeMenu(direction = 'forward') {
  const settings = getTimeSettings();
  const now = new Date();

  // Format time
  let hours = now.getHours();
  let minutes = now.getMinutes().toString().padStart(2, '0');
  let ampm = '';
  if (settings.hourFormat === '12') {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }
  const timeStr = `${hours}:${minutes}${ampm}`;

  // Format date
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth()+1).toString().padStart(2, '0');
  const year = now.getFullYear();
  let dateStr = settings.dateFormat === 'MM/DD/YYYY'
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;

  renderScreen(
  `<div style="padding:32px 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
    <div id="dateTimeTime" style="font-size:2em;font-weight:bold;margin-bottom:8px;">${timeStr}</div>
    <div id="dateTimeDate" style="font-size:1.2em;color:#444;margin-bottom:24px;">${dateStr}</div>
      <div style="margin-bottom:12px;">
        <label style="font-size:1em;">Time Format:</label>
        <select id="hourFormatSelect" style="margin-left:8px;font-size:1em;">
          <option value="24" ${settings.hourFormat === '24' ? 'selected' : ''}>24 Hour</option>
          <option value="12" ${settings.hourFormat === '12' ? 'selected' : ''}>12 Hour</option>
        </select>
      </div>
      <div>
        <label style="font-size:1em;">Date Format:</label>
        <select id="dateFormatSelect" style="margin-left:8px;font-size:1em;">
          <option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
          <option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
        </select>
      </div>
    </div>`,
    direction
  );

  // Handlers
  document.getElementById('hourFormatSelect').onchange = (e) => {
    settings.hourFormat = e.target.value;
    saveTimeSettings(settings);
    updateDateTimeMenuDisplay();
  };
  document.getElementById('dateFormatSelect').onchange = (e) => {
    settings.dateFormat = e.target.value;
    saveTimeSettings(settings);
    updateDateTimeMenuDisplay();
  };

  // Live update time/date every second, but only update the text, not the whole screen
  if (window.dateTimeMenuInterval) clearInterval(window.dateTimeMenuInterval);
  window.dateTimeMenuInterval = setInterval(updateDateTimeMenuDisplay, 1000);

}

function updateDateTimeMenuDisplay() {
  const settings = getTimeSettings();
  const now = new Date();

  // Format time
  let hours = now.getHours();
  let minutes = now.getMinutes().toString().padStart(2, '0');
  let ampm = '';
  if (settings.hourFormat === '12') {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }
  const timeStr = `${hours}:${minutes}${ampm}`;

  // Format date
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth()+1).toString().padStart(2, '0');
  const year = now.getFullYear();
  let dateStr = settings.dateFormat === 'MM/DD/YYYY'
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;

  const timeEl = document.getElementById('dateTimeTime');
  const dateEl = document.getElementById('dateTimeDate');
  if (timeEl) timeEl.textContent = timeStr;
  if (dateEl) dateEl.textContent = dateStr;
}

function renderColourMenu(direction = 'forward') {
  const colourSwatches = [
    { name: "White",   value: "linear-gradient(160deg, #fff 0%, #f6f6f8 60%, #e2e2e4 100%)", type: 'colour' },
    { name: "Silver",  value: "linear-gradient(160deg, #e0e0e0 0%, #bdbdbd 60%, #757575 100%)", type: 'colour' },
    { name: "Black",   value: "linear-gradient(160deg, #222 0%, #444 60%, #888 100%)", type: 'colour' },
    { name: "Gold",    value: "linear-gradient(160deg, #fff8e1 0%, #ffd700 60%, #bfa640 100%)", type: 'colour' },
    { name: "Red",     value: "linear-gradient(160deg, #ffe0e0 0%, #ff5252 60%, #b71c1c 100%)", type: 'colour' },
    { name: "Orange",  value: "linear-gradient(160deg, #fff3e0 0%, #ffb74d 60%, #ff9800 100%)", type: 'colour' },
    { name: "Yellow",  value: "linear-gradient(160deg, #fffde7 0%, #fff176 60%, #ffd600 100%)", type: 'colour' },
    { name: "Green",   value: "linear-gradient(160deg, #e0ffe0 0%, #a1f7a1 60%, #00d974 100%)", type: 'colour' },
    { name: "Blue",    value: "linear-gradient(160deg, #e0eaff 0%, #4fc3f7 60%, #0074d9 100%)", type: 'colour' },
    { name: "Pink",    value: "linear-gradient(160deg, #ffe0f7 0%, #f7a1e3 60%, #d90074 100%)", type: 'colour' },
    { name: "Purple",  value: "linear-gradient(160deg, #f3e0ff 0%, #b39ddb 60%, #6a1b9a 100%)", type: 'colour' }
  ];

  const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  const gameScores = JSON.parse(localStorage.getItem('gameHighScores') || '{}');
  const getHS = (game) => Number.isFinite(gameScores[game]) ? gameScores[game] : 0;
  const tracks = app.state.tracks || [];
  const trackById = new Map(tracks.map(t => [getTrackId(t), t]));
  const totals = Object.values(habits).reduce((acc, h, i, arr) => {
    const id = Object.keys(habits)[i];
    const t = trackById.get(id);
    acc.plays += h.plays || 0;
    acc.likes += h.likeCount || 0;
    acc.dislikes += h.dislikeCount || 0;
    acc.skips += h.skips || 0;
    if ((h.plays || 0) > 0) acc.uniquePlayed += 1;
    const dur = (t && Number.isFinite(t.duration) ? t.duration : 0);
    acc.playSeconds += (h.plays || 0) * dur;
    return acc;
  }, { plays: 0, likes: 0, dislikes: 0, skips: 0, uniquePlayed: 0, playSeconds: 0 });

  const rareThemes = [
    { key: 'mono',      label: 'Monochrome',     preview: 'linear-gradient(160deg,#f7f7f7 0%,#dcdcdc 60%,#bfbfbf 100%)', requires: { plays: 50 } },
    { key: 'contrast',  label: 'High Contrast',  preview: 'linear-gradient(160deg,#0e1726 0%,#0b1020 60%,#05070c 100%)', requires: { plays: 200 } },
    { key: 'u2',        label: 'U2 Red/Black',   preview: 'linear-gradient(160deg,#0b0b0b 0%,#1d0000 50%,#4a0000 100%)', requires: { likes: 20 } },
    { key: 'midnight',  label: 'Midnight Neon',  preview: 'linear-gradient(160deg,#0c1020 0%,#12264a 55%,#00b4ff 100%)', requires: { plays: 550 } },
    { key: 'neonwave',  label: 'Neon Wave',      preview: 'linear-gradient(160deg,#1a0f2e 0%,#5327ff 50%,#ff7ee2 100%)', requires: { likes: 250 } },
    { key: 'carbon',    label: 'Carbon',         preview: 'linear-gradient(160deg,#0f0f0f 0%,#1f1f1f 55%,#3a3a3a 100%)', requires: { dislikes: 150 } },
    { key: 'forest',    label: 'Deep Forest',    preview: 'linear-gradient(160deg,#0b2e1c 0%,#1f6a3b 55%,#7bd27f 100%)', requires: { uniquePlayed: 300 } },
    { key: 'aqua',      label: 'Aqua Glass',     preview: 'linear-gradient(160deg,#022c43 0%,#1b9aaa 55%,#72efdd 100%)', requires: { playSeconds: 86400 } }, // 24 hours
    { key: 'sunset',    label: 'Sunset Fade',    preview: 'linear-gradient(160deg,#2d0b3a 0%,#ff5f6d 55%,#ffc371 100%)', requires: { plays: 1000 } },
    { key: 'plasma',    label: 'Plasma Pulse',   preview: 'linear-gradient(160deg,#1b0036 0%,#4a148c 40%,#ff3cac 100%)', requires: { plays: 1500, likes: 500 } },
    { key: 'aurora',    label: 'Aurora Drift',   preview: 'linear-gradient(160deg,#041427 0%,#0b3a52 45%,#35ffc5 100%)', requires: { likes: 800, plays: 2000 } },
    { key: 'lava',      label: 'Lava Core',      preview: 'linear-gradient(160deg,#1a0300 0%,#6d1000 50%,#ff5a00 100%)', requires: { plays: 2500, dislikes: 80 } },
    { key: 'crystal',   label: 'Crystal Ice',    preview: 'linear-gradient(160deg,#021019 0%,#0f2e4f 40%,#7be2ff 100%)', requires: { playSeconds: 200000 } },
    { key: 'starlight', label: 'Starlight',      preview: 'linear-gradient(160deg,#060612 0%,#14143a 50%,#c7a4ff 100%)', requires: { uniquePlayed: 800, likes: 600 } },
    { key: 'onyx',      label: 'Onyx Gold',      preview: 'linear-gradient(160deg,#060606 0%,#151515 55%,#b38b00 100%)', requires: { plays: 3000, likes: 900 } }
  ];

  const gameThemes = [
    { key: 'brickmaster',   label: 'Brick Master',    preview: 'linear-gradient(160deg,#161616 0%,#2a2a2a 55%,#ffb347 100%)', requires: { highScore: { game:'brick', score: 180 } } },
    { key: 'snakebyte',     label: 'Snake Byte',      preview: 'linear-gradient(160deg,#0a150c 0%,#12311b 55%,#1e6a32 100%)', requires: { highScore: { game:'snake', score: 60 } } },
    { key: 'flappysky',     label: 'Flappy Sky',      preview: 'linear-gradient(160deg,#071a30 0%,#0f4a82 55%,#6fe0ff 100%)', requires: { highScore: { game:'flappy', score: 25 } } },
    { key: 'pipeflight',    label: 'Pipes & Flight',  preview: 'linear-gradient(160deg,#0b0b0b 0%,#123212 55%,#3dcf74 100%)', requires: { highScore: { game:'flappy', score: 40 } } },
    { key: 'twentyforty',   label: '2048 Tiles',      preview: 'linear-gradient(160deg,#1d1d1d 0%,#2f2f2f 50%,#f0a73b 100%)', requires: { highScore: { game:'g2048', score: 2048 } } },
    { key: 'chessboard',    label: 'Checker Faceplate', preview: 'linear-gradient(90deg,#000 25%,#fff 25%,#fff 50%,#000 50%,#000 75%,#fff 75%,#fff 100%),linear-gradient(0deg,#000 25%,#fff 25%,#fff 50%,#000 50%,#000 75%,#fff 75%,#fff 100%);background-size:12px 12px,12px 12px;background-position:0 0,6px 6px;', requires: { highScore: { game:'chess', score: 1 } } },
    { key: 'solitaireclub', label: 'Solitaire Green', preview: 'linear-gradient(160deg,#0a190f 0%,#114024 55%,#2fa35a 100%)', requires: { highScore: { game:'solitaire', score: 1 } } },
    { key: 'numberwhiz',    label: 'Number Whiz',     preview: 'linear-gradient(160deg,#0e111c 0%,#1f2d52 55%,#6e8dff 100%)', requires: { highScore: { game:'number', score: 15 } } },
    { key: 'arcadegold',    label: 'Arcade Gold',     preview: 'linear-gradient(160deg,#160d00 0%,#2f1d00 55%,#e2b23b 100%)', requires: { highScore: { game:'brick', score: 250 } } },
    { key: 'zenrunner',     label: 'Zen Runner',      preview: 'linear-gradient(160deg,#0b0f1a 0%,#132a44 55%,#5ef1d2 100%)', requires: { highScore: { game:'snake', score: 90 } } }
  ];

  const unlocked = new Set(JSON.parse(localStorage.getItem('unlockedThemes') || '[]'));
  const meetsReq = (req) => {
    if (DEV_UNLOCK_RARES) return true;
    if (!req) return true;
    if (req.plays && totals.plays < req.plays) return false;
    if (req.likes && totals.likes < req.likes) return false;
    if (req.dislikes && totals.dislikes < req.dislikes) return false;
    if (req.skips && totals.skips < req.skips) return false;
    if (req.uniquePlayed && totals.uniquePlayed < req.uniquePlayed) return false;
    if (req.playSeconds && totals.playSeconds < req.playSeconds) return false;
    if (req.highScore) {
      const { game, score } = req.highScore;
      if (!game || !score) return false;
      if (getHS(game) < score) return false;
    }
    return true;
  };
  const gameLabel = {
    flappy: 'Flappy Dot',
    brick: 'Brick Paddle',
    snake: 'Snake',
    g2048: '2048 Mini',
    chess: 'Chess',
    solitaire: 'Solitaire',
    number: 'Number Guess'
  };
  const describeReq = (req) => {
    if (!req) return '';
    if (req.highScore && req.highScore.game && req.highScore.score) {
      const g = req.highScore.game;
      const label = gameLabel[g] || g;
      return `Get ${req.highScore.score}+ in ${label}`;
    }
    if (req.plays) return `${req.plays} plays`;
    if (req.likes) return `${req.likes} likes`;
    if (req.dislikes) return `${req.dislikes} dislikes`;
    if (req.skips) return `${req.skips} skips`;
    if (req.uniquePlayed) return `${req.uniquePlayed} unique plays`;
    if (req.playSeconds) {
      const hrs = Math.ceil(req.playSeconds / 3600);
      return `${hrs} hours played`;
    }
    return 'Locked';
  };
  rareThemes.forEach(t => { if (meetsReq(t.requires)) unlocked.add(t.key); });
  gameThemes.forEach(t => { if (meetsReq(t.requires)) unlocked.add(t.key); });
  localStorage.setItem('unlockedThemes', JSON.stringify([...unlocked]));

  const currentTheme = localStorage.getItem('themeName') || 'default';
  let selectedIdx = parseInt(localStorage.getItem('vpodColourIdx'), 10);
  if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= colourSwatches.length) selectedIdx = 0;

  const items = [
    ...colourSwatches.map((c, idx) => ({ ...c, idx, type: 'colour' })),
    ...rareThemes.map((t, i) => ({
      name: t.label,
      value: t.preview,
      key: t.key,
      requires: t.requires,
      unlocked: unlocked.has(t.key),
      type: 'theme',
      idx: colourSwatches.length + i
    })),
    ...gameThemes.map((t, i) => ({
      name: t.label,
      value: t.preview,
      key: t.key,
      requires: t.requires,
      unlocked: unlocked.has(t.key),
      type: 'theme',
      idx: colourSwatches.length + rareThemes.length + i
    }))
  ];

  // Determine the active index (theme wins over colour)
  let activeIdx = selectedIdx;
  if (currentTheme !== 'default') {
    const found = items.findIndex(it => it.type === 'theme' && it.key === currentTheme);
    if (found >= 0) activeIdx = found;
  }
  app.state.currentMenuIndex = activeIdx;

  renderScreen(
    `<div style="padding:8px 0 0 0;display:flex;flex-direction:column;align-items:center;gap:12px;height:100%;">
      <div style="font-size:1.2em;font-weight:bold;">Colours & Themes</div>
      <div id="colourGrid" style="display:grid;grid-template-columns:repeat(4, 64px);gap:14px;justify-content:center;">
        ${items.map((it, i) => {
          const isColour = it.type === 'colour';
          const isActive = isColour ? i === selectedIdx && currentTheme === 'default' : currentTheme === it.key;
          const locked = it.type === 'theme' && !it.unlocked;
          return `
            <button class="colour-btn${isActive ? ' active' : ''}"
              data-idx="${i}" data-type="${it.type}" data-key="${it.key || ''}"
              title="${it.name}" style="
              width:60px;height:60px;border-radius:14px;border:3px solid ${isActive ? '#0074d9' : '#ccc'};
              background:${it.value};box-shadow:0 2px 8px rgba(0,0,0,0.13);cursor:${locked ? 'not-allowed' : 'pointer'};
              outline:none;position:relative;overflow:hidden;">
              ${isActive ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : ''}
              ${locked ? `<span style="
                position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
                background:rgba(0,0,0,0.55);color:#fff;font-size:0.8em;padding:6px;text-align:center;line-height:1.2;">
                <i class="fa-solid fa-lock" style="margin-bottom:4px;"></i>
                ${describeReq(it.requires)}
              </span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
      <div style="font-size:0.9em;color:#666;padding:0 12px;text-align:center;max-width:320px;">
        Rare themes unlock as you listen (plays/likes). They’re listed after the main colours.
      </div>
    </div>`,
    direction
  );

  const buttons = Array.from(document.querySelectorAll('.colour-btn'));
  const totalItems = items.length; // include rare themes

  function highlight(idx) {
    buttons.forEach((btn, i) => {
      const isColour = btn.dataset.type === 'colour';
      const isActive = i === idx;
      const isThemeActive = btn.dataset.type === 'theme' && (items[i].key === (localStorage.getItem('themeName') || 'default'));
      const active = isColour
        ? (isActive && (localStorage.getItem('themeName') || 'default') === 'default')
        : isThemeActive;

      const locked = items[i].type === 'theme' && !items[i].unlocked;

      btn.classList.toggle('active', active);
      btn.style.borderColor = active ? '#0074d9' : '#ccc';
      btn.innerHTML = active ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : '';

      // Focus ring even on locked items so you can see where you are
      btn.style.boxShadow = isActive
        ? '0 0 0 2px #0074d9 inset, 0 2px 8px rgba(0,0,0,0.18)'
        : '0 2px 8px rgba(0,0,0,0.13)';

      if (locked) {
        btn.innerHTML += `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,0.45);color:#fff;"><i class="fa-solid fa-lock"></i></span>`;
      }
    });
    const btn = buttons[idx];
    if (btn && btn.scrollIntoView) {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }

  function applyColour(idx) {
    localStorage.setItem('vpodColourIdx', idx);
    localStorage.setItem('vpodColour', items[idx].value);
    localStorage.setItem('themeName', 'default');
    document.body.setAttribute('data-theme', 'default');
    const cont = document.querySelector('.vpod-container');
    if (cont) cont.style.background = items[idx].value;
  }

  function applyThemeName(name) {
    localStorage.setItem('themeName', name);
    document.body.setAttribute('data-theme', name);
    const cont = document.querySelector('.vpod-container');
    if (cont) cont.style.background = ''; // clear inline colour so theme shows
  }

  // Click handlers
  buttons.forEach((btn, i) => {
    btn.onclick = () => {
      const item = items[i];
      if (item.type === 'colour') {
        app.state.currentMenuIndex = i;
        applyColour(i);
        highlight(i);
      } else {
        if (!item.unlocked && !DEV_UNLOCK_RARES) {
          const reqText = describeReq(item.requires);
          alert(`Locked theme. Unlock by: ${reqText || 'keep listening!'}`);
          return;
        }
        applyThemeName(item.key);
        app.state.currentMenuIndex = i;
        highlight(i);
      }
    };
  });

  // Disk scroll across all items
  window.onColourMenuScroll = (direction) => {
    let idx = Number.isFinite(app.state.currentMenuIndex) ? app.state.currentMenuIndex : 0;
    idx += direction;
    if (idx < 0) idx = totalItems - 1;
    if (idx >= totalItems) idx = 0;
    app.state.currentMenuIndex = idx;
    highlight(idx);
  };
  window.onColourMenuConfirm = () => {
    const idx = Number.isFinite(app.state.currentMenuIndex) ? app.state.currentMenuIndex : 0;
    buttons[idx]?.click();
  };

  highlight(app.state.currentMenuIndex);
}

// About Menu
function renderAboutMenu(direction = 'forward') {
  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.3em;font-weight:bold;margin-bottom:18px;">About vRetro Player</div>
      <div style="font-size:1em;color:#444;text-align:center;max-width:320px;margin-bottom:18px;">
        vRetro Player is a web-based local music player inspired by the ipod classic with some modern features.<br>
        <br>        
        Version: <b>2.9.0</b><br>
        Developed by: <b>vCore</b><br>
        <br>
        Enjoy your music with a retro touch!
      </div>
    </div>`,
    direction
  );
}

function renderUserStatsMenu(direction = 'forward') {
  // Gather stats from suggestions.js
  const habits = JSON.parse(localStorage.getItem('userHabits')) || {};
  const gameHS = JSON.parse(localStorage.getItem('gameHighScores') || '{}');
  const smStats = JSON.parse(localStorage.getItem('smartMixStats') || '{"weekStarts":0,"lifetimeStarts":0}');
  const totalLifetimePlays = Object.values(habits).reduce((sum, h) => sum + (h.plays || 0), 0);
  const totalLifetimeSkips = Object.values(habits).reduce((sum, h) => sum + (h.skips || 0), 0);
  const totalLifetimeLikes = Object.values(habits).reduce((sum, h) => sum + (h.likeCount || 0), 0);
  const totalLifetimeDislikes = Object.values(habits).reduce((sum, h) => sum + (h.dislikeCount || 0), 0);

  const uniquePlayed = Object.values(habits).filter(h => h.plays > 0).length;
  const uniqueLiked = Object.values(habits).filter(h => h.likeCount > 0).length;
  const uniqueDisliked = Object.values(habits).filter(h => h.dislikeCount > 0).length;
  const uniqueSkipped = Object.values(habits).filter(h => h.skips > 0).length;

  const mostPlayed = Object.entries(habits)
    .sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0))[0];
  const mostLiked = Object.entries(habits)
    .sort((a, b) => (b[1].likeCount || 0) - (a[1].likeCount || 0))[0];
  const mostSkipped = Object.entries(habits)
    .sort((a, b) => (b[1].skips || 0) - (a[1].skips || 0))[0];
  const mostDisliked = Object.entries(habits)
    .sort((a, b) => (b[1].dislikeCount || 0) - (a[1].dislikeCount || 0))[0];

  const tracks = app.state.tracks || [];
  const trackById = new Map(tracks.map(t => [getTrackId(t), t]));
  const trackByRel = new Map(
    tracks
      .filter(t => t.relativePath)
      .map(t => [t.relativePath.toLowerCase(), t])
  );
  const trackByFile = new Map(
    tracks.map(t => [(t.fileName || t.file?.name || '').toLowerCase(), t])
  );

  const prettyFromPath = (id) => {
    const base = (id || '').split(/[\\/]/).pop() || id;
    const noExt = base.replace(/\.(mp3|flac)$/i, '');
    const noTrackNum = noExt.replace(/^[\d\s._-]{1,6}/, '').trim();
    return noTrackNum || noExt || base || 'Unknown Track';
  };

  const habitLabel = (entry, metricKey) => {
    if (!entry || !entry[1] || (entry[1][metricKey] || 0) <= 0) return '';
    const [id] = entry;
    const tDirect = trackById.get(id);
    if (tDirect) {
      return `${tDirect.title || 'Unknown Track'}${tDirect.artist ? ' — ' + tDirect.artist : ''}${tDirect.album ? ' (' + tDirect.album + ')' : ''}`;
    }
    const idLower = (id || '').toLowerCase();
    const rel = trackByRel.get(idLower) || trackByRel.get(idLower.replace(/^[\\/]/, ''));
    if (rel) {
      return `${rel.title || 'Unknown Track'}${rel.artist ? ' — ' + rel.artist : ''}${rel.album ? ' (' + rel.album + ')' : ''}`;
    }
    const fname = idLower.split(/[\\/]/).pop();
    const byFile = trackByFile.get(fname);
    if (byFile) {
      return `${byFile.title || 'Unknown Track'}${byFile.artist ? ' — ' + byFile.artist : ''}${byFile.album ? ' (' + byFile.album + ')' : ''}`;
    }
    return prettyFromPath(entry?.[0] || '');
  };

  const mostPlayedLabel   = habitLabel(mostPlayed, 'plays');
  const mostLikedLabel    = habitLabel(mostLiked, 'likeCount');
  const mostSkippedLabel  = habitLabel(mostSkipped, 'skips');
  const mostDislikedLabel = habitLabel(mostDisliked, 'dislikeCount');

  const hsList = Object.keys(gameHS).length
    ? Object.entries(gameHS).map(([k,v]) => `${k}: <b>${v}</b>`).join('<br>')
    : 'No game highs yet';

 renderScreen(
    `<div style="padding:140px 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;position:relative;">
      <button id="wipeStatsBtn" title="Wipe All User Stats" style="position:absolute;top:12px;right:18px;z-index:10;background:none;border:none;cursor:pointer;font-size:1.5em;color:#d90429;">
        <i class="fa-solid fa-trash"></i>
      </button>
      <div style="font-size:1.1em;font-weight:bold;margin-bottom:6px;margin-top:18px;">User Info</div>
      <div style="padding:10px 18px;">
        <div style="font-size:1em;color:#222;">
          Name: <b>vPod User</b><br>
          Model: <b>vPod Classic</b><br>
          Serial: <b>#${(localStorage.getItem('vpodSerial') || (Math.floor(Math.random()*1e8).toString(16)) )}</b><br>
          <hr style="margin:6px 0;">
          <b>Lifetime Stats</b><br>
          Total Songs Played: <b>${totalLifetimePlays}</b><br>
          Total Songs Skipped: <b>${totalLifetimeSkips}</b><br>
          Total Songs Liked: <b>${totalLifetimeLikes}</b><br>
          Total Songs Disliked: <b>${totalLifetimeDislikes}</b><br>
          Unique Songs Played: <b>${uniquePlayed}</b><br>
          Unique Songs Liked: <b>${uniqueLiked}</b><br>
          Unique Songs Disliked: <b>${uniqueDisliked}</b><br>
          Unique Songs Skipped: <b>${uniqueSkipped}</b><br>
          ${mostPlayed && mostPlayed[1].plays > 0 ? `Most Played Song: <b>${mostPlayedLabel}</b> (${mostPlayed[1].plays} plays)<br>` : ''}
          ${mostLiked && mostLiked[1].likeCount > 0 ? `Most Liked Song: <b>${mostLikedLabel}</b> (${mostLiked[1].likeCount} likes)<br>` : ''}
          ${mostSkipped && mostSkipped[1].skips > 0 ? `Most Skipped Song: <b>${mostSkippedLabel}</b> (${mostSkipped[1].skips} skips)<br>` : ''}
          ${mostDisliked && mostDisliked[1].dislikeCount > 0 ? `Most Disliked Song: <b>${mostDislikedLabel}</b> (${mostDisliked[1].dislikeCount} dislikes)<br>` : ''}
          <hr style="margin:6px 0;">
          <b>Smart Mix</b><br>
          Sessions started (lifetime): <b>${smStats.lifetimeStarts || 0}</b><br>
          <hr style="margin:6px 0;">
          <b>Game High Scores</b><br>
          ${hsList}
        </div>
      </div>
    </div>`,
    direction
  );

  // Trash button handler
  document.getElementById('wipeStatsBtn').onclick = async () => {
    const ok = confirm("Wipe ALL vPod data (playlists, habits, settings, themes, games, cache)? This will restart the app.");
    if (!ok) return;

    try {
      // clear app state
      if (app?.state) {
        app.state.tracks = [];
        app.state.albums = {};
        app.state.playlists = [];
        app.state.currentTrack = null;
        app.state.currentAlbumSongs = [];
        app.state.currentSongIndex = -1;
        app.state.navStack = [];
        app.state.albumCoverURLs?.forEach(url => URL.revokeObjectURL(url));
        app.state.albumCoverURLs = [];
      }

      // clear storage
      localStorage.clear();
      sessionStorage.clear?.();

      // clear caches
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }

      // unregister service worker
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }

      // reload to fresh state
      location.reload(true);
    } catch (err) {
      console.error("Wipe failed:", err);
      alert("Could not fully wipe data. Try reloading manually.");
    }
  };

  // Save serial if not set
  if (!localStorage.getItem('vpodSerial')) {
    const serial = Math.floor(Math.random() * 1e8).toString(16);
    localStorage.setItem('vpodSerial', serial);
  }
}

function renderBackupMenu(direction = 'forward') {
  renderScreen(
    `<div style="padding:32px 16px;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.2em;font-weight:bold;">Backup / Restore</div>
      <div style="font-size:0.95em;color:#444;text-align:center;max-width:280px;">
        Export your playlists, likes/skips stats, settings, colours, and weekly recap snapshot.
      </div>
      <button id="backupExportBtn" style="padding:10px 18px;border:none;border-radius:10px;background:#0074d9;color:#fff;font-size:1em;cursor:pointer;">
        Export Backup
      </button>
      <button id="backupImportBtn" style="padding:10px 18px;border:none;border-radius:10px;background:#eee;color:#444;font-size:1em;cursor:pointer;">
        Import Backup
      </button>
      <input type="file" id="backupFileInput" accept=".json" style="display:none;">
      <div style="font-size:0.9em;color:#666;text-align:center;max-width:260px;">
        Note: Music files are not included. Load the same library after restoring.
      </div>
    </div>`,
    direction
  );

  document.getElementById('backupExportBtn').onclick = exportBackup;
  document.getElementById('backupImportBtn').onclick = () => document.getElementById('backupFileInput').click();
  document.getElementById('backupFileInput').onchange = (e) => {
    const f = e.target.files[0];
    if (f) importBackup(f);
    e.target.value = '';
  };
}

// Helpers
function normalizeBackupData(data = {}) {
  const norm = (p = '') => (typeof normalizePath === 'function' ? normalizePath(p) : p);
  if (Array.isArray(data.playlists)) {
    data.playlists.forEach(pl => {
      if (!Array.isArray(pl.tracks)) return;
      pl.tracks = pl.tracks.map(t => ({
        ...t,
        relativePath: norm(t.relativePath || t.file?.webkitRelativePath || ''),
        fileName: t.fileName || t.file?.name
      }));
    });
  }
  const habits = data.userHabits || {};
  const newHabits = {};
  Object.entries(habits).forEach(([k, v]) => {
    const hasPipe = k.includes('|');
    const nk = hasPipe ? k.toLowerCase() : norm(k).toLowerCase();
    newHabits[nk] = v;
  });
  data.userHabits = newHabits;
  return data;
}

function applyBackup(data) {
  const clean = normalizeBackupData(data);

  // Persist all user data
  localStorage.setItem('playlists', JSON.stringify(clean.playlists || []));
  localStorage.setItem('userHabits', JSON.stringify(clean.userHabits || {}));
  localStorage.setItem('timeSettings', JSON.stringify(clean.timeSettings || defaultTimeSettings));
  localStorage.setItem('vpodColour', clean.vpodColour || '');
  localStorage.setItem('vpodColourIdx', clean.vpodColourIdx || 0);
  if (clean.themeName) localStorage.setItem('themeName', clean.themeName);
  if (clean.unlockedThemes) localStorage.setItem('unlockedThemes', JSON.stringify(clean.unlockedThemes));
  localStorage.setItem('eqPreset', clean.eqPreset || 'Flat');
  localStorage.setItem('lastWeekStats', JSON.stringify(clean.lastWeekStats || {}));
  localStorage.setItem('smartMixStats', JSON.stringify(clean.smartMixStats || { weekStarts: 0, lifetimeStarts: 0 }));
  localStorage.setItem('gameHighScores', JSON.stringify(clean.gameHighScores || {}));
  localStorage.setItem('gameHighScoresWeekBase', clean.gameHighScoresWeekBase || '{}');
  localStorage.setItem('lastWeekGameGains', clean.lastWeekGameGains || '{}');
  localStorage.setItem('lastWeekSmartMixStarts', clean.lastWeekSmartMixStarts || '0');
  if (clean.userStatsLastReset) localStorage.setItem('userStatsLastReset', clean.userStatsLastReset);

  // Refresh in-memory state
  app.state.playlists = clean.playlists || [];
  window.userHabits = clean.userHabits || {};
  app.state.smartMixActive = false;
  app.state.smartMixQueue = null;
  app.state.currentTrack = null;

  // Reapply theme/colour/EQ
  const theme = localStorage.getItem('themeName') || 'default';
  applyTheme(theme);
  setEQPreset(localStorage.getItem('eqPreset') || 'Flat');

  // Reset nav/UI
  app.state.navStack = [];
  renderMainMenu('forward');
  app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
  if (typeof showHotBarMessage === 'function') showHotBarMessage('Backup restored', 1800);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const json = JSON.parse(ev.target.result);
      applyBackup(json);
    } catch (err) {
      console.error('Backup import failed', err);
      alert('Invalid backup file.');
    }
  };
  reader.readAsText(file);
}

function exportBackup() {
  const data = {
    version: '2.9.0',
    timestamp: Date.now(),
    playlists: app.state.playlists || [],
    userHabits: JSON.parse(localStorage.getItem('userHabits') || '{}'),
    timeSettings: getTimeSettings(),
    vpodColour: localStorage.getItem('vpodColour') || '',
    vpodColourIdx: localStorage.getItem('vpodColourIdx') || 0,
    themeName: localStorage.getItem('themeName') || 'default',
    unlockedThemes: JSON.parse(localStorage.getItem('unlockedThemes') || '[]'),
    eqPreset: localStorage.getItem('eqPreset') || 'Flat',
    lastWeekStats: JSON.parse(localStorage.getItem('lastWeekStats') || '{}'),
    smartMixStats: JSON.parse(localStorage.getItem('smartMixStats') || '{"weekStarts":0,"lifetimeStarts":0}'),
    gameHighScores: JSON.parse(localStorage.getItem('gameHighScores') || '{}'),
    gameHighScoresWeekBase: localStorage.getItem('gameHighScoresWeekBase') || '{}',
    lastWeekGameGains: localStorage.getItem('lastWeekGameGains') || '{}',
    lastWeekSmartMixStarts: localStorage.getItem('lastWeekSmartMixStarts') || '0',
    userStatsLastReset: localStorage.getItem('userStatsLastReset') || null
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vmusic-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showHotBarMessage === 'function') showHotBarMessage('Backup exported', 1800);
}