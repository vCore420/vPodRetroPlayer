// --- SETTINGS MENU ---
const DEV_UNLOCK_RARES = false;

const defaultTimeSettings = {
  hourFormat: '24', 
  dateFormat: 'DD/MM/YYYY' 
};

function getTimeSettings() {
  const settings = readLocalJson('timeSettings', defaultTimeSettings);
  return {
    hourFormat: settings.hourFormat || defaultTimeSettings.hourFormat,
    dateFormat: settings.dateFormat || defaultTimeSettings.dateFormat
  };
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
  if (typeof maybeResetWeeklyStats === 'function') maybeResetWeeklyStats();
  if (typeof ensureCurrentWeekFlags === 'function') ensureCurrentWeekFlags();

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

  const habitsSource = typeof loadUserHabits === 'function'
    ? loadUserHabits()
    : (window.userHabits || {});
  const habits = Object.fromEntries(
    Object.entries(habitsSource).map(([id, habit]) => [id, syncHabitShape(habit)])
  );

  const gameScores = readLocalJson('gameHighScores', {});
  const getHS = (game) => Number.isFinite(gameScores[game]) ? gameScores[game] : 0;

  const tracks = app.state.tracks || [];
  const trackById = new Map(tracks.map(track => [getTrackId(track), track]));

  const totals = Object.entries(habits).reduce((acc, [id, habit]) => {
    const track = trackById.get(id);
    acc.plays += Number(habit.lifetimePlays || 0);
    acc.likes += Number(habit.likeCount || 0);
    acc.dislikes += Number(habit.dislikeCount || 0);
    acc.skips += Number(habit.lifetimeSkips || 0);

    if ((habit.lifetimePlays || 0) > 0) acc.uniquePlayed += 1;

    const duration = track && Number.isFinite(track.duration) ? track.duration : 0;
    acc.playSeconds += Number(habit.lifetimePlays || 0) * duration;

    return acc;
  }, {
    plays: 0,
    likes: 0,
    dislikes: 0,
    skips: 0,
    uniquePlayed: 0,
    playSeconds: 0
  });

  const rareThemes = [
    { key: 'mono',      label: 'Monochrome',     preview: 'linear-gradient(160deg,#f7f7f7 0%,#dcdcdc 60%,#bfbfbf 100%)', requires: { plays: 50 } },
    { key: 'contrast',  label: 'High Contrast',  preview: 'linear-gradient(160deg,#0e1726 0%,#0b1020 60%,#05070c 100%)', requires: { plays: 200 } },
    { key: 'u2',        label: 'U2 Red/Black',   preview: 'linear-gradient(160deg,#0b0b0b 0%,#1d0000 50%,#4a0000 100%)', requires: { likes: 20 } },
    { key: 'midnight',  label: 'Midnight Neon',  preview: 'linear-gradient(160deg,#0c1020 0%,#12264a 55%,#00b4ff 100%)', requires: { plays: 550 } },
    { key: 'neonwave',  label: 'Neon Wave',      preview: 'linear-gradient(160deg,#1a0f2e 0%,#5327ff 50%,#ff7ee2 100%)', requires: { likes: 250 } },
    { key: 'carbon',    label: 'Carbon',         preview: 'linear-gradient(160deg,#0f0f0f 0%,#1f1f1f 55%,#3a3a3a 100%)', requires: { dislikes: 150 } },
    { key: 'forest',    label: 'Deep Forest',    preview: 'linear-gradient(160deg,#0b2e1c 0%,#1f6a3b 55%,#7bd27f 100%)', requires: { uniquePlayed: 300 } },
    { key: 'aqua',      label: 'Aqua Glass',     preview: 'linear-gradient(160deg,#022c43 0%,#1b9aaa 55%,#72efdd 100%)', requires: { playSeconds: 86400 } },
    { key: 'sunset',    label: 'Sunset Fade',    preview: 'linear-gradient(160deg,#2d0b3a 0%,#ff5f6d 55%,#ffc371 100%)', requires: { plays: 1000 } },
    { key: 'plasma',    label: 'Plasma Pulse',   preview: 'linear-gradient(160deg,#1b0036 0%,#4a148c 40%,#ff3cac 100%)', requires: { plays: 1500, likes: 500 } },
    { key: 'aurora',    label: 'Aurora Drift',   preview: 'linear-gradient(160deg,#041427 0%,#0b3a52 45%,#35ffc5 100%)', requires: { likes: 800, plays: 2000 } },
    { key: 'lava',      label: 'Lava Core',      preview: 'linear-gradient(160deg,#1a0300 0%,#6d1000 50%,#ff5a00 100%)', requires: { plays: 2500, dislikes: 80 } },
    { key: 'crystal',   label: 'Crystal Ice',    preview: 'linear-gradient(160deg,#021019 0%,#0f2e4f 40%,#7be2ff 100%)', requires: { playSeconds: 200000 } },
    { key: 'starlight', label: 'Starlight',      preview: 'linear-gradient(160deg,#060612 0%,#14143a 50%,#c7a4ff 100%)', requires: { uniquePlayed: 800, likes: 600 } },
    { key: 'onyx',      label: 'Onyx Gold',      preview: 'linear-gradient(160deg,#060606 0%,#151515 55%,#b38b00 100%)', requires: { plays: 3000, likes: 900 } }
  ];

  const gameThemes = [
    { key: 'brickmaster',   label: 'Brick Master',    preview: 'linear-gradient(160deg,#161616 0%,#2a2a2a 55%,#ffb347 100%)', requires: { highScore: { game: 'brick', score: 180 } } },
    { key: 'snakebyte',     label: 'Snake Byte',      preview: 'linear-gradient(160deg,#0a150c 0%,#12311b 55%,#1e6a32 100%)', requires: { highScore: { game: 'snake', score: 60 } } },
    { key: 'flappysky',     label: 'Flappy Sky',      preview: 'linear-gradient(160deg,#071a30 0%,#0f4a82 55%,#6fe0ff 100%)', requires: { highScore: { game: 'flappy', score: 25 } } },
    { key: 'pipeflight',    label: 'Pipes & Flight',  preview: 'linear-gradient(160deg,#0b0b0b 0%,#123212 55%,#3dcf74 100%)', requires: { highScore: { game: 'flappy', score: 40 } } },
    { key: 'gridglow',      label: 'Porcelain Signal', preview: 'linear-gradient(160deg,#f6f0e6 0%,#d9d2c3 55%,#ff6b4a 100%)', requires: { highScore: { game: 'Neon Runner', score: 1000 } } },
    { key: 'hyperlane',     label: 'Hazard Run',      preview: 'repeating-linear-gradient(135deg,#171717 0 18px,#171717 18px,#f7d447 18px 36px)', requires: { highScore: { game: 'Neon Runner', score: 2000 } } },
    { key: 'catacomb',      label: 'Catacomb Brass',  preview: 'linear-gradient(160deg,#120d0b 0%,#3a2a1d 48%,#a8742a 100%)', requires: { highScore: { game: 'dungeon', score: 3000 } } },
    { key: 'mooncrypt',     label: 'Moon Crypt',      preview: 'linear-gradient(160deg,#0f141c 0%,#33465f 45%,#d9e3ef 100%)', requires: { highScore: { game: 'dungeon', score: 8000 } } },
    { key: 'pocketgrove',   label: 'Pocket Grove',    preview: 'linear-gradient(160deg,#d6d9b8 0%,#8fb06a 52%,#3d6d4d 100%)', requires: { highScore: { game: 'monstertamer', score: 1000 } } },
    { key: 'capsulepop',    label: 'Capsule Pop',     preview: 'linear-gradient(160deg,#fff7e2 0%,#ffd466 45%,#3d71d8 100%)', requires: { highScore: { game: 'monstertamer', score: 2000 } } },
    { key: 'shinyglint',    label: 'Shiny Glint',     preview: 'linear-gradient(160deg,#fff8fd 0%,#e7dcff 36%,#a5e9ff 68%,#ffe89a 100%)', requires: { shinyEncounter: true } },
    { key: 'twentyforty',   label: '2048 Tiles',      preview: 'linear-gradient(160deg,#1d1d1d 0%,#2f2f2f 50%,#f0a73b 100%)', requires: { highScore: { game: 'g2048', score: 2048 } } },
    { key: 'chessboard',    label: 'Checker Faceplate', preview: 'linear-gradient(90deg,#000 25%,#fff 25%,#fff 50%,#000 50%,#000 75%,#fff 75%,#fff 100%),linear-gradient(0deg,#000 25%,#fff 25%,#fff 50%,#000 50%,#000 75%,#fff 75%,#fff 100%);background-size:12px 12px,12px 12px;background-position:0 0,6px 6px;', requires: { highScore: { game: 'chess', score: 1 } } },
    { key: 'solitaireclub', label: 'Solitaire Green', preview: 'linear-gradient(160deg,#0a190f 0%,#114024 55%,#2fa35a 100%)', requires: { highScore: { game: 'solitaire', score: 1 } } },
    { key: 'numberwhiz',    label: 'Number Whiz',     preview: 'linear-gradient(160deg,#0e111c 0%,#1f2d52 55%,#6e8dff 100%)', requires: { highScore: { game: 'number', score: 15 } } },
    { key: 'arcadegold',    label: 'Arcade Gold',     preview: 'linear-gradient(160deg,#160d00 0%,#2f1d00 55%,#e2b23b 100%)', requires: { highScore: { game: 'brick', score: 250 } } },
    { key: 'zenrunner',     label: 'Zen Runner',      preview: 'linear-gradient(160deg,#0b0f1a 0%,#132a44 55%,#5ef1d2 100%)', requires: { highScore: { game: 'snake', score: 90 } } }
  ];

  const unlocked = new Set(readLocalJson('unlockedThemes', []));

  const meetsReq = (req) => {
    if (DEV_UNLOCK_RARES) return true;
    if (!req) return true;
    if (req.plays && totals.plays < req.plays) return false;
    if (req.likes && totals.likes < req.likes) return false;
    if (req.dislikes && totals.dislikes < req.dislikes) return false;
    if (req.skips && totals.skips < req.skips) return false;
    if (req.uniquePlayed && totals.uniquePlayed < req.uniquePlayed) return false;
    if (req.playSeconds && totals.playSeconds < req.playSeconds) return false;
    if (req.shinyEncounter && localStorage.getItem('monsterTamerShinySeen') !== 'true') return false;
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
    dungeon: 'Dungeon Crawl',
    monstertamer: 'Monster Tamer',
    'Neon Runner': 'Neon Runner',
    g2048: '2048 Mini',
    chess: 'Chess',
    solitaire: 'Solitaire',
    number: 'Number Guess'
  };

  const describeReq = (req) => {
    if (!req) return '';
    if (req.highScore && req.highScore.game && req.highScore.score) {
      const game = req.highScore.game;
      const label = gameLabel[game] || game;
      return `Get ${req.highScore.score}+ in ${label}`;
    }
    if (req.shinyEncounter) return 'Encounter a shiny monster';
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

  rareThemes.forEach(theme => {
    if (meetsReq(theme.requires)) unlocked.add(theme.key);
  });
  gameThemes.forEach(theme => {
    if (meetsReq(theme.requires)) unlocked.add(theme.key);
  });
  localStorage.setItem('unlockedThemes', JSON.stringify([...unlocked]));

  const currentTheme = localStorage.getItem('themeName') || 'default';
  let selectedIdx = parseInt(localStorage.getItem('vpodColourIdx'), 10);
  if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= colourSwatches.length) selectedIdx = 0;

  const items = [
    ...colourSwatches.map((colour, idx) => ({ ...colour, idx, type: 'colour' })),
    ...rareThemes.map((theme, i) => ({
      name: theme.label,
      value: theme.preview,
      key: theme.key,
      requires: theme.requires,
      unlocked: unlocked.has(theme.key),
      type: 'theme',
      idx: colourSwatches.length + i
    })),
    ...gameThemes.map((theme, i) => ({
      name: theme.label,
      value: theme.preview,
      key: theme.key,
      requires: theme.requires,
      unlocked: unlocked.has(theme.key),
      type: 'theme',
      idx: colourSwatches.length + rareThemes.length + i
    }))
  ];

  let activeIdx = selectedIdx;
  if (currentTheme !== 'default') {
    const found = items.findIndex(item => item.type === 'theme' && item.key === currentTheme);
    if (found >= 0) activeIdx = found;
  }
  app.state.currentMenuIndex = activeIdx;

  renderScreen(
    `<div style="padding:8px 0 0 0;display:flex;flex-direction:column;align-items:center;gap:12px;height:100%;">
      <div style="font-size:1.2em;font-weight:bold;">Colours & Themes</div>
      <div id="colourGrid" style="display:grid;grid-template-columns:repeat(4, 64px);gap:14px;justify-content:center;">
        ${items.map((item, i) => {
          const isColour = item.type === 'colour';
          const isActive = isColour ? i === selectedIdx && currentTheme === 'default' : currentTheme === item.key;
          const locked = item.type === 'theme' && !item.unlocked;
          return `
            <button class="colour-btn${isActive ? ' active' : ''}"
              data-idx="${i}" data-type="${item.type}" data-key="${item.key || ''}"
              title="${item.name}" style="
              width:60px;height:60px;border-radius:14px;border:3px solid ${isActive ? '#0074d9' : '#ccc'};
              background:${item.value};box-shadow:0 2px 8px rgba(0,0,0,0.13);cursor:${locked ? 'not-allowed' : 'pointer'};
              outline:none;position:relative;overflow:hidden;">
              ${isActive ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : ''}
              ${locked ? `<span style="
                position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
                background:rgba(0,0,0,0.55);color:#fff;font-size:0.8em;padding:6px;text-align:center;line-height:1.2;">
                <i class="fa-solid fa-lock" style="margin-bottom:4px;"></i>
                ${describeReq(item.requires)}
              </span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
      <div style="font-size:0.9em;color:#666;padding:0 12px;text-align:center;max-width:320px;">
        Rare themes unlock from lifetime listening and game progress. They’re listed after the main colours.
      </div>
    </div>`,
    direction
  );

  const buttons = Array.from(document.querySelectorAll('.colour-btn'));
  const totalItems = items.length;

  function highlight(idx) {
    buttons.forEach((btn, i) => {
      const isColour = btn.dataset.type === 'colour';
      const isFocused = i === idx;
      const isThemeActive = btn.dataset.type === 'theme' && (items[i].key === (localStorage.getItem('themeName') || 'default'));
      const active = isColour
        ? (isFocused && (localStorage.getItem('themeName') || 'default') === 'default')
        : isThemeActive;

      const locked = items[i].type === 'theme' && !items[i].unlocked;

      btn.classList.toggle('active', active);
      btn.style.borderColor = active ? '#0074d9' : '#ccc';
      btn.innerHTML = active ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : '';
      btn.style.boxShadow = isFocused
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
    if (cont) cont.style.background = '';
  }

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
  const debugEnabled = typeof isDebugLoggingEnabled === 'function' && isDebugLoggingEnabled();
  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.3em;font-weight:bold;margin-bottom:18px;">About vRetro Player</div>
      <div style="font-size:1em;color:#444;text-align:center;max-width:320px;margin-bottom:18px;">
        vRetro Player is a web-based local music player inspired by the 7th Gen iPod Classic with some modern features.<br>
        <br>        
        Version: <b>3.0.3</b><br>
        Developed by: <b>vCore</b><br>
        <br>
        Enjoy your music with a retro touch!
      </div>
      <label for="aboutDebugLogging" style="display:flex;align-items:center;gap:8px;font-size:0.85em;color:#666;margin-top:10px;cursor:pointer;user-select:none;">
        <input id="aboutDebugLogging" type="checkbox" ${debugEnabled ? 'checked' : ''} style="width:14px;height:14px;cursor:pointer;">
        <span>Enable debug logging</span>
      </label>
    </div>`,
    direction
  );

  const debugCheckbox = document.getElementById('aboutDebugLogging');
  if (debugCheckbox) {
    debugCheckbox.onchange = (event) => {
      const nextValue = !!event.target.checked;
      setDebugLogging(nextValue);
      if (typeof showHotBarMessage === 'function') {
        showHotBarMessage(`Debug logging ${nextValue ? 'enabled' : 'disabled'}`, 1600);
      }
    };
  }
}

function renderUserStatsMenu(direction = 'forward') {
  if (typeof maybeResetWeeklyStats === 'function') maybeResetWeeklyStats();
  if (typeof ensureCurrentWeekFlags === 'function') ensureCurrentWeekFlags();

  let serial = localStorage.getItem('vpodSerial');
  if (!serial) {
    serial = Math.floor(Math.random() * 1e8).toString(16);
    localStorage.setItem('vpodSerial', serial);
  }

  const habitsSource = typeof loadUserHabits === 'function'
    ? loadUserHabits()
    : (window.userHabits || {});

  const habits = Object.fromEntries(
    Object.entries(habitsSource).map(([id, habit]) => [id, syncHabitShape(habit)])
  );

  const readLocalJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`Failed to parse ${key}`, error);
      return fallback;
    }
  };

  const gameHS = readLocalJson('gameHighScores', {});
  const smStats = typeof loadSmartMixStats === 'function'
    ? loadSmartMixStats()
    : { weekStarts: 0, lifetimeStarts: 0 };

  const tracks = app.state.tracks || [];
  const playlists = app.state.playlists || [];
  const trackById = new Map(tracks.map(track => [getTrackId(track), track]));

  const totals = Object.entries(habits).reduce((acc, [id, habit]) => {
    acc.weeklyPlays += Number(habit.weeklyPlays || 0);
    acc.weeklySkips += Number(habit.weeklySkips || 0);
    acc.weeklyLikes += Number(habit.weeklyLikes || 0);
    acc.weeklyDislikes += Number(habit.weeklyDislikes || 0);

    acc.lifetimePlays += Number(habit.lifetimePlays || 0);
    acc.lifetimeSkips += Number(habit.lifetimeSkips || 0);
    acc.lifetimeLikes += Number(habit.likeCount || 0);
    acc.lifetimeDislikes += Number(habit.dislikeCount || 0);

    const track = trackById.get(id) || null;
    const duration = track && Number.isFinite(track.duration) ? Number(track.duration) : 0;
    acc.weeklySeconds += Number(habit.weeklyPlays || 0) * duration;
    acc.lifetimeSeconds += Number(habit.lifetimePlays || 0) * duration;

    return acc;
  }, {
    weeklyPlays: 0,
    weeklySkips: 0,
    weeklyLikes: 0,
    weeklyDislikes: 0,
    lifetimePlays: 0,
    lifetimeSkips: 0,
    lifetimeLikes: 0,
    lifetimeDislikes: 0,
    weeklySeconds: 0,
    lifetimeSeconds: 0
  });

  const weeklyUniquePlayed = Object.values(habits).filter(habit => (habit.weeklyPlays || 0) > 0).length;
  const weeklyUniqueLiked = Object.values(habits).filter(habit => (habit.weeklyLikes || 0) > 0).length;
  const weeklyUniqueDisliked = Object.values(habits).filter(habit => (habit.weeklyDislikes || 0) > 0).length;
  const weeklyUniqueSkipped = Object.values(habits).filter(habit => (habit.weeklySkips || 0) > 0).length;

  const lifetimeUniquePlayed = Object.values(habits).filter(habit => (habit.lifetimePlays || 0) > 0).length;
  const lifetimeUniqueLiked = Object.values(habits).filter(habit => (habit.likeCount || 0) > 0).length;
  const lifetimeUniqueDisliked = Object.values(habits).filter(habit => (habit.dislikeCount || 0) > 0).length;
  const lifetimeUniqueSkipped = Object.values(habits).filter(habit => (habit.lifetimeSkips || 0) > 0).length;

  const topEntryBy = (metricKey) =>
    Object.entries(habits)
      .slice()
      .sort((a, b) => Number(b[1][metricKey] || 0) - Number(a[1][metricKey] || 0))[0];

  const mostPlayedWeek = topEntryBy('weeklyPlays');
  const mostLikedWeek = topEntryBy('weeklyLikes');
  const mostPlayedLifetime = topEntryBy('lifetimePlays');
  const mostLikedLifetime = topEntryBy('likeCount');
  const mostSkippedLifetime = topEntryBy('lifetimeSkips');
  const mostDislikedLifetime = topEntryBy('dislikeCount');
  const trackByRel = new Map(
    tracks
      .filter(track => track.relativePath)
      .map(track => [track.relativePath.toLowerCase(), track])
  );
  const trackByFile = new Map(
    tracks.map(track => [(track.fileName || track.file?.name || '').toLowerCase(), track])
  );

  const prettyFromPath = (id) => {
    const base = (id || '').split(/[\\/]/).pop() || id;
    const noExt = base.replace(/\.(mp3|flac)$/i, '');
    const noTrackNum = noExt.replace(/^[\d\s._-]{1,6}/, '').trim();
    return noTrackNum || noExt || base || 'Unknown Track';
  };

  const habitLabel = (entry) => {
    if (!entry || !entry[1]) return '';
    const [id] = entry;

    const direct = trackById.get(id);
    if (direct) {
      return `${direct.title || 'Unknown Track'}${direct.artist ? ' — ' + direct.artist : ''}${direct.album ? ' (' + direct.album + ')' : ''}`;
    }

    const idLower = (id || '').toLowerCase();
    const rel = trackByRel.get(idLower) || trackByRel.get(idLower.replace(/^[\\/]/, ''));
    if (rel) {
      return `${rel.title || 'Unknown Track'}${rel.artist ? ' — ' + rel.artist : ''}${rel.album ? ' (' + rel.album + ')' : ''}`;
    }

    const fileName = idLower.split(/[\\/]/).pop();
    const byFile = trackByFile.get(fileName);
    if (byFile) {
      return `${byFile.title || 'Unknown Track'}${byFile.artist ? ' — ' + byFile.artist : ''}${byFile.album ? ' (' + byFile.album + ')' : ''}`;
    }

    return prettyFromPath(id);
  };

  const mostPlayedWeekLabel = mostPlayedWeek && (mostPlayedWeek[1].weeklyPlays || 0) > 0
    ? `${habitLabel(mostPlayedWeek)} (${mostPlayedWeek[1].weeklyPlays} plays)`
    : 'No plays yet this week';

  const mostLikedWeekLabel = mostLikedWeek && (mostLikedWeek[1].weeklyLikes || 0) > 0
    ? `${habitLabel(mostLikedWeek)} (${mostLikedWeek[1].weeklyLikes} likes)`
    : 'No likes yet this week';

  const mostPlayedLifetimeLabel = mostPlayedLifetime && (mostPlayedLifetime[1].lifetimePlays || 0) > 0
    ? `${habitLabel(mostPlayedLifetime)} (${mostPlayedLifetime[1].lifetimePlays} plays)`
    : 'No lifetime play data yet';

  const mostLikedLifetimeLabel = mostLikedLifetime && (mostLikedLifetime[1].likeCount || 0) > 0
    ? `${habitLabel(mostLikedLifetime)} (${mostLikedLifetime[1].likeCount} likes)`
    : 'No lifetime like data yet';

  const mostSkippedLifetimeLabel = mostSkippedLifetime && (mostSkippedLifetime[1].lifetimeSkips || 0) > 0
    ? `${habitLabel(mostSkippedLifetime)} (${mostSkippedLifetime[1].lifetimeSkips} skips)`
    : 'No lifetime skip data yet';

  const mostDislikedLifetimeLabel = mostDislikedLifetime && (mostDislikedLifetime[1].dislikeCount || 0) > 0
    ? `${habitLabel(mostDislikedLifetime)} (${mostDislikedLifetime[1].dislikeCount} dislikes)`
    : 'No lifetime dislike data yet';

  const hsList = Object.keys(gameHS).length
    ? Object.entries(gameHS)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => ({ key, value }))
    : [];

  const formatPlayTime = (seconds) => {
    const totalMinutes = Math.round(Number(seconds || 0) / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const formatStat = (value) => Number(value || 0).toLocaleString();
  const libraryCoverage = tracks.length
    ? Math.round((lifetimeUniquePlayed / tracks.length) * 100)
    : 0;

  const weeklyMetrics = [
    { label: 'Plays', value: formatStat(totals.weeklyPlays) },
    { label: 'Unique', value: formatStat(weeklyUniquePlayed) },
    { label: 'Likes', value: formatStat(totals.weeklyLikes) },
    { label: 'Skips', value: formatStat(totals.weeklySkips) },
    { label: 'Listening', value: formatPlayTime(totals.weeklySeconds) },
    { label: 'Smart Mix', value: formatStat(smStats.weekStarts || 0) }
  ];

  const lifetimeMetrics = [
    { label: 'Plays', value: formatStat(totals.lifetimePlays) },
    { label: 'Library', value: `${libraryCoverage}%` },
    { label: 'Likes', value: formatStat(totals.lifetimeLikes) },
    { label: 'Skips', value: formatStat(totals.lifetimeSkips) },
    { label: 'Dislikes', value: formatStat(totals.lifetimeDislikes) },
    { label: 'Listening', value: formatPlayTime(totals.lifetimeSeconds) }
  ];

  const renderMetricGrid = (metrics) => metrics.map(metric => `
    <div class="stats-metric-tile">
      <span class="stats-metric-value">${metric.value}</span>
      <span class="stats-metric-label">${metric.label}</span>
    </div>
  `).join('');

  const renderScoreRows = () => {
    if (!hsList.length) {
      return `<div class="stats-note">No game high scores saved yet.</div>`;
    }

    return hsList.map(({ key, value }) => `
      <div class="stats-row-item">
        <span>${key}</span>
        <strong>${formatStat(value)}</strong>
      </div>
    `).join('');
  };

  renderScreen(
    `<div class="stats-screen">
      <div class="stats-hero-card">
        <div class="stats-hero-top">
          <div>
            <div class="user-stats-title">User Stats</div>
            <div class="user-stats-subtitle">A clear view of your vPod listening history.</div>
          </div>
          <button id="wipeStatsBtn" class="stats-danger-btn" title="Wipe All User Stats">
            <i class="fa-solid fa-trash"></i>
            <span>Wipe Data</span>
          </button>
        </div>

        <div class="stats-device-grid">
          <div class="stats-device-item">
            <span class="stats-device-label">Name</span>
            <strong>vPod User</strong>
          </div>
          <div class="stats-device-item">
            <span class="stats-device-label">Model</span>
            <strong>vPod Classic</strong>
          </div>
          <div class="stats-device-item">
            <span class="stats-device-label">Serial</span>
            <strong>#${serial}</strong>
          </div>
          <div class="stats-device-item">
            <span class="stats-device-label">Library</span>
            <strong>${formatStat(tracks.length)} songs</strong>
          </div>
          <div class="stats-device-item">
            <span class="stats-device-label">Playlists</span>
            <strong>${formatStat(playlists.length)}</strong>
          </div>
          <div class="stats-device-item">
            <span class="stats-device-label">Tracked Songs</span>
            <strong>${formatStat(Object.keys(habits).length)}</strong>
          </div>
        </div>
      </div>

      <div class="user-stats-box">
        <div class="stats-section-title">This Week</div>
        <div class="stats-metric-grid">${renderMetricGrid(weeklyMetrics)}</div>
        <div class="stats-spotlight-list">
          <div class="stats-spotlight-item">
            <span class="stats-spotlight-label">Top played</span>
            <span class="stats-spotlight-value">${mostPlayedWeekLabel}</span>
          </div>
          <div class="stats-spotlight-item">
            <span class="stats-spotlight-label">Top liked</span>
            <span class="stats-spotlight-value">${mostLikedWeekLabel}</span>
          </div>
        </div>
      </div>

      <div class="user-stats-box">
        <div class="stats-section-title">Lifetime</div>
        <div class="stats-metric-grid">${renderMetricGrid(lifetimeMetrics)}</div>
        <div class="stats-spotlight-list">
          <div class="stats-spotlight-item">
            <span class="stats-spotlight-label">Most played</span>
            <span class="stats-spotlight-value">${mostPlayedLifetimeLabel}</span>
          </div>
          <div class="stats-spotlight-item">
            <span class="stats-spotlight-label">Most liked</span>
            <span class="stats-spotlight-value">${mostLikedLifetimeLabel}</span>
          </div>
          <div class="stats-spotlight-item">
            <span class="stats-spotlight-label">Most skipped</span>
            <span class="stats-spotlight-value">${mostSkippedLifetimeLabel}</span>
          </div>
          <div class="stats-spotlight-item">
            <span class="stats-spotlight-label">Most disliked</span>
            <span class="stats-spotlight-value">${mostDislikedLifetimeLabel}</span>
          </div>
        </div>
      </div>

      <div class="user-stats-box user-stats-box--compact">
        <div class="stats-section-title">Extras</div>
        <div class="stats-row-list">
          <div class="stats-row-item">
            <span>Weekly dislikes</span>
            <strong>${formatStat(totals.weeklyDislikes)}</strong>
          </div>
          <div class="stats-row-item">
            <span>Unique liked this week</span>
            <strong>${formatStat(weeklyUniqueLiked)}</strong>
          </div>
          <div class="stats-row-item">
            <span>Unique skipped this week</span>
            <strong>${formatStat(weeklyUniqueSkipped)}</strong>
          </div>
          <div class="stats-row-item">
            <span>Unique disliked this week</span>
            <strong>${formatStat(weeklyUniqueDisliked)}</strong>
          </div>
          <div class="stats-row-item">
            <span>Smart Mix lifetime starts</span>
            <strong>${formatStat(smStats.lifetimeStarts || 0)}</strong>
          </div>
          <div class="stats-row-item">
            <span>Lifetime unique liked</span>
            <strong>${formatStat(lifetimeUniqueLiked)}</strong>
          </div>
          <div class="stats-row-item">
            <span>Lifetime unique skipped</span>
            <strong>${formatStat(lifetimeUniqueSkipped)}</strong>
          </div>
          <div class="stats-row-item">
            <span>Lifetime unique disliked</span>
            <strong>${formatStat(lifetimeUniqueDisliked)}</strong>
          </div>
        </div>
      </div>

      <div class="user-stats-box user-stats-box--compact">
        <div class="stats-section-title">Game High Scores</div>
        <div class="stats-row-list">
          ${renderScoreRows()}
        </div>
      </div>
    </div>`,
    direction
  );

  document.getElementById('wipeStatsBtn').onclick = async () => {
    const ok = confirm("Wipe ALL vPod data (playlists, habits, settings, themes, games, cache)? This will restart the app.");
    if (!ok) return;

    try {
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

      localStorage.clear();
      sessionStorage.clear?.();

      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }

      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      }

      location.reload(true);
    } catch (error) {
      console.error("Wipe failed:", error);
      alert("Could not fully wipe data. Try reloading manually.");
    }
  };

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
      pl.tracks = pl.tracks.map(track => ({
        ...track,
        relativePath: norm(track.relativePath || track.file?.webkitRelativePath || ''),
        fileName: track.fileName || track.file?.name
      }));
    });
  }

  const habits = data.userHabits || {};
  const normalizedHabits = {};
  Object.entries(habits).forEach(([key, value]) => {
    const hasPipe = key.includes('|');
    const normalizedKey = hasPipe ? key.toLowerCase() : norm(key).toLowerCase();
    normalizedHabits[normalizedKey] = typeof syncHabitShape === 'function'
      ? syncHabitShape(value)
      : value;
  });
  data.userHabits = normalizedHabits;

  return data;
}

function applyBackup(data) {
  const clean = normalizeBackupData(data);

  localStorage.setItem('playlists', JSON.stringify(clean.playlists || []));
  localStorage.setItem('userHabits', JSON.stringify(clean.userHabits || {}));
  localStorage.setItem('timeSettings', JSON.stringify(clean.timeSettings || defaultTimeSettings));
  localStorage.setItem('vpodColour', clean.vpodColour || '');
  localStorage.setItem('vpodColourIdx', String(clean.vpodColourIdx || 0));
  localStorage.setItem('themeName', clean.themeName || 'default');
  localStorage.setItem('unlockedThemes', JSON.stringify(clean.unlockedThemes || []));
  localStorage.setItem('eqPreset', clean.eqPreset || 'Flat');

  localStorage.setItem('lastWeekStats', JSON.stringify(clean.lastWeekStats || {}));
  localStorage.setItem('lastWeekSmartMixStarts', String(clean.lastWeekSmartMixStarts || 0));
  localStorage.setItem('lastWeekGameGains', JSON.stringify(clean.lastWeekGameGains || {}));
  localStorage.setItem('lastWeekGameScores', JSON.stringify(clean.lastWeekGameScores || {}));
  localStorage.setItem('gameHighScores', JSON.stringify(clean.gameHighScores || {}));
  localStorage.setItem('gameHighScoresWeekBase', JSON.stringify(clean.gameHighScoresWeekBase || {}));
  localStorage.setItem('lastWeekGameWeekKey', clean.lastWeekGameWeekKey || '');
  localStorage.setItem('smartMixStats', JSON.stringify(clean.smartMixStats || { weekStarts: 0, lifetimeStarts: 0 }));

  localStorage.setItem('userStatsMeta', JSON.stringify(clean.userStatsMeta || {
    currentWeekKey: typeof getWeekKey === 'function' ? getWeekKey() : '',
    lastFinalizedWeekKey: null,
    lastResetAt: 0
  }));

  if (clean.userStatsSchemaVersion) {
    localStorage.setItem('userStatsSchemaVersion', String(clean.userStatsSchemaVersion));
  }

  app.state.playlists = clean.playlists || [];

  if (typeof loadUserHabits === 'function') {
    loadUserHabits();
  } else {
    window.userHabits = clean.userHabits || {};
    if (typeof userHabits !== 'undefined') userHabits = window.userHabits;
  }

  if (app.state.tracks && app.state.tracks.length && typeof migrateHabitsToStableIds === 'function') {
    migrateHabitsToStableIds(app.state.tracks);
  }

  const theme = localStorage.getItem('themeName') || 'default';
  applyTheme(theme);
  setEQPreset(localStorage.getItem('eqPreset') || 'Flat');

  if (typeof maybeResetWeeklyStats === 'function') maybeResetWeeklyStats();
  if (typeof ensureCurrentWeekFlags === 'function') ensureCurrentWeekFlags();

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
  const readLocalJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`Failed to parse ${key}`, error);
      return fallback;
    }
  };

  const habits = typeof loadUserHabits === 'function'
    ? loadUserHabits()
    : readLocalJson('userHabits', {});

  const data = {
    version: '2.9.1',
    timestamp: Date.now(),
    userStatsSchemaVersion: localStorage.getItem('userStatsSchemaVersion') || '1',

    playlists: app.state.playlists || [],
    userHabits: habits,
    userStatsMeta: readLocalJson('userStatsMeta', {
      currentWeekKey: typeof getWeekKey === 'function' ? getWeekKey() : '',
      lastFinalizedWeekKey: null,
      lastResetAt: 0
    }),

    timeSettings: getTimeSettings(),
    vpodColour: localStorage.getItem('vpodColour') || '',
    vpodColourIdx: localStorage.getItem('vpodColourIdx') || '0',
    themeName: localStorage.getItem('themeName') || 'default',
    unlockedThemes: readLocalJson('unlockedThemes', []),
    eqPreset: localStorage.getItem('eqPreset') || 'Flat',

    lastWeekStats: readLocalJson('lastWeekStats', {}),
    smartMixStats: typeof loadSmartMixStats === 'function'
      ? loadSmartMixStats()
      : readLocalJson('smartMixStats', { weekStarts: 0, lifetimeStarts: 0 }),
    lastWeekSmartMixStarts: localStorage.getItem('lastWeekSmartMixStarts') || '0',

    gameHighScores: readLocalJson('gameHighScores', {}),
    gameHighScoresWeekBase: readLocalJson('gameHighScoresWeekBase', {}),
    lastWeekGameGains: readLocalJson('lastWeekGameGains', {}),
    lastWeekGameScores: readLocalJson('lastWeekGameScores', {}),
    lastWeekGameWeekKey: localStorage.getItem('lastWeekGameWeekKey') || ''
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
