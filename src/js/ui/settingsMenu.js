// --- SETTINGS MENU ---

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
  renderMenuList({
    title: "Settings",
    items: [
      { label: "Equalizer", action: renderEqualizerMenu },
      { label: "Date and Time", action: renderDateTimeMenu },
      { label: "iPod Colour", action: renderColourMenu },
      { label: "User Stats", action: renderUserStatsMenu },
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
      label: label + (label === currentPreset ? ' <span style="color:#0074d9;font-size:1.2em;">•</span>' : ''),
      rawLabel: label
    })),
    onItemClick: (idx, item) => {
        player.setEQPreset(item.rawLabel);

        const eqList = document.getElementById('eqList');
        if (eqList) {
            Array.from(eqList.children).forEach((li, i) => {
              li.innerHTML = presets[i] + (i === idx ? ' <span style="color:#0074d9;font-size:1.2em;">•</span>' : '');
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
  const colours = [
    { name: "White", value: "linear-gradient(160deg, #fff 0%, #f6f6f8 60%, #e2e2e4 100%)" },
    { name: "Silver", value: "linear-gradient(160deg, #e0e0e0 0%, #bdbdbd 60%, #757575 100%)" },
    { name: "Black", value: "linear-gradient(160deg, #222 0%, #444 60%, #888 100%)" },
    { name: "Gold", value: "linear-gradient(160deg, #fff8e1 0%, #ffd700 60%, #bfa640 100%)" },
    { name: "Red", value: "linear-gradient(160deg, #ffe0e0 0%, #ff5252 60%, #b71c1c 100%)" },
    { name: "Orange", value: "linear-gradient(160deg, #fff3e0 0%, #ffb74d 60%, #ff9800 100%)" },
    { name: "Yellow", value: "linear-gradient(160deg, #fffde7 0%, #fff176 60%, #ffd600 100%)" },
    { name: "Green", value: "linear-gradient(160deg, #e0ffe0 0%, #a1f7a1 60%, #00d974 100%)" },
    { name: "Blue", value: "linear-gradient(160deg, #e0eaff 0%, #4fc3f7 60%, #0074d9 100%)" },
    { name: "Pink", value: "linear-gradient(160deg, #ffe0f7 0%, #f7a1e3 60%, #d90074 100%)" },
    { name: "Purple", value: "linear-gradient(160deg, #f3e0ff 0%, #b39ddb 60%, #6a1b9a 100%)" }
    
  ];
  let selectedIdx = parseInt(localStorage.getItem('vpodColourIdx'), 10);
  if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= colours.length) selectedIdx = 0;
  app.state.currentMenuIndex = selectedIdx;

  renderScreen(
    `<div style="padding:4px 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.2em;font-weight:bold;margin-bottom:18px;">Choose iPod Colour</div>
      <div id="colourGrid" style="display:grid;grid-template-columns:repeat(4, 64px);gap:14px;">
        ${colours.map((c, idx) =>
          `<button class="colour-btn${idx === selectedIdx ? ' active' : ''}" data-idx="${idx}" title="${c.name}" style="
            width:60px;height:60px;border-radius:14px;border:3px solid ${idx === selectedIdx ? '#0074d9' : '#ccc'};
            background:${c.value};box-shadow:0 2px 8px rgba(0,0,0,0.13);cursor:pointer;outline:none;">
            ${idx === selectedIdx ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : ''}
          </button>`
        ).join('')}
      </div>
    </div>`,
    direction
  );

  // Disk control support
  let gridBtns = Array.from(document.querySelectorAll('.colour-btn'));

  function highlightColour(idx) {
    gridBtns.forEach((btn, i) => btn.classList.toggle('active', i === idx));
    gridBtns.forEach((btn, i) => btn.style.borderColor = i === idx ? '#0074d9' : '#ccc');
    gridBtns.forEach((btn, i) => btn.innerHTML = i === idx ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : '');
  }
  highlightColour(app.state.currentMenuIndex);

  gridBtns.forEach((btn, idx) => {
    btn.onclick = () => {
      app.state.currentMenuIndex = idx;
      localStorage.setItem('vpodColourIdx', idx);
      highlightColour(idx);
      localStorage.setItem('vpodColour', colours[idx].value);
      document.querySelector('.vpod-container').style.background = colours[idx].value;
    };
  });

  window.onColourMenuConfirm = () => {
    const idx = app.state.currentMenuIndex;
    localStorage.setItem('vpodColour', colours[idx].value);
    localStorage.setItem('vpodColourIdx', idx);
    document.querySelector('.vpod-container').style.background = colours[idx].value;
    highlightColour(idx);
  };

  window.onColourMenuScroll = (direction) => {
    let idx = app.state.currentMenuIndex;
    idx += direction;
    if (idx < 0) idx = gridBtns.length - 1;
    if (idx >= gridBtns.length) idx = 0;
    app.state.currentMenuIndex = idx;
    localStorage.setItem('vpodColourIdx', idx);
    highlightColour(idx);
  };

  // Set colour on load
  const savedColour = localStorage.getItem('vpodColour');
  if (savedColour) document.querySelector('.vpod-container').style.background = savedColour;
}

// About Menu
function renderAboutMenu(direction = 'forward') {
  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.3em;font-weight:bold;margin-bottom:18px;">About vRetro Player</div>
      <div style="font-size:1em;color:#444;text-align:center;max-width:320px;margin-bottom:18px;">
        vRetro Player is a web-based local music player inspired by the ipod classic with some modern features.<br>
        <br>        
        Version: <b>2.2</b><br>
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

  renderScreen(
    `<div style="padding:56px 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;position:relative;">
      <button id="wipeStatsBtn" title="Wipe All User Stats" style="
        position:absolute;top:12px;right:18px;z-index:10;
        background:none;border:none;cursor:pointer;font-size:1.5em;color:#d90429;">
        <i class="fa-solid fa-trash"></i>
      </button>
      <div style="font-size:1.1em;font-weight:bold;margin-bottom:6px;margin-top:18px;">User Info</div>
      <div style="padding:10px 18px;">
        <div style="font-size:1em;color:#222;">
          Name: <b>iPod User</b><br>
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
          ${mostPlayed && mostPlayed[1].plays > 0 ? `Most Played Song: <b>${mostPlayed[0].split('|')[0]}</b> (${mostPlayed[1].plays} plays)<br>` : ''}
          ${mostLiked && mostLiked[1].likeCount > 0 ? `Most Liked Song: <b>${mostLiked[0].split('|')[0]}</b> (${mostLiked[1].likeCount} likes)<br>` : ''}
          ${mostSkipped && mostSkipped[1].skips > 0 ? `Most Skipped Song: <b>${mostSkipped[0].split('|')[0]}</b> (${mostSkipped[1].skips} skips)<br>` : ''}
          ${mostDisliked && mostDisliked[1].dislikeCount > 0 ? `Most Disliked Song: <b>${mostDisliked[0].split('|')[0]}</b> (${mostDisliked[1].dislikeCount} dislikes)<br>` : ''}
        </div>
      </div>
    </div>`,
    direction
  );

  // Trash button handler
  document.getElementById('wipeStatsBtn').onclick = () => {
    if (confirm("Are you sure you want to wipe all user stats? This cannot be undone.")) {
      localStorage.removeItem('userHabits');
      localStorage.removeItem('lastWeekStats');
      localStorage.removeItem('userStatsLastReset');
      // Do NOT remove playlists!
      renderUserStatsMenu('forward');
    }
  };

  // Save serial if not set
  if (!localStorage.getItem('vpodSerial')) {
    const serial = Math.floor(Math.random() * 1e8).toString(16);
    localStorage.setItem('vpodSerial', serial);
  }
}