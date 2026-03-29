// --- WEEKLY RECAP MENU ---

// DEBUG: Set to true to always show Weekly Recap menu
const DEBUG_RECAP_ALWAYS_ON = false;

const LAST_WEEK_GAME_GAINS_KEY = 'lastWeekGameGains';
const LAST_WEEK_GAME_SCORES_KEY = 'lastWeekGameScores';
const GAME_HS_WEEK_BASE_KEY = 'gameHighScoresWeekBase';
const GAME_RECAP_WEEK_KEY = 'lastWeekGameWeekKey';

function readWeeklyRecapJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Failed to parse ${key}`, error);
    return fallback;
  }
}

function maybeFinalizeWeeklyGameStats() {
  const currentWeekKey = getWeekKey();
  const processedWeekKey = localStorage.getItem(GAME_RECAP_WEEK_KEY) || '';
  const currentScores = readWeeklyRecapJson('gameHighScores', {});
  const baselineScores = readWeeklyRecapJson(GAME_HS_WEEK_BASE_KEY, {});

  if (!processedWeekKey) {
    localStorage.setItem(GAME_HS_WEEK_BASE_KEY, JSON.stringify(currentScores));
    localStorage.setItem(GAME_RECAP_WEEK_KEY, currentWeekKey);
    localStorage.setItem(LAST_WEEK_GAME_GAINS_KEY, JSON.stringify({}));
    localStorage.setItem(LAST_WEEK_GAME_SCORES_KEY, JSON.stringify(currentScores));
    return false;
  }

  if (processedWeekKey === currentWeekKey) {
    return false;
  }

  const gains = {};
  Object.keys(currentScores).forEach(key => {
    const gain = Number(currentScores[key] || 0) - Number(baselineScores[key] || 0);
    if (gain > 0) {
      gains[key] = {
        gain,
        newScore: currentScores[key]
      };
    }
  });

  localStorage.setItem(LAST_WEEK_GAME_GAINS_KEY, JSON.stringify(gains));
  localStorage.setItem(LAST_WEEK_GAME_SCORES_KEY, JSON.stringify(currentScores));
  localStorage.setItem(GAME_HS_WEEK_BASE_KEY, JSON.stringify(currentScores));
  localStorage.setItem(GAME_RECAP_WEEK_KEY, currentWeekKey);

  return true;
}

function maybeResetWeeklyStats() {
  maybeFinalizeWeeklyGameStats();
  if (typeof finalizeWeekIfNeeded === 'function') {
    finalizeWeekIfNeeded();
  }
}

function renderWeeklyRecapMenu(direction = 'forward') {
  maybeResetWeeklyStats();

  const lastWeek = readWeeklyRecapJson('lastWeekStats', {});
  const lastWeekGameGains = readWeeklyRecapJson(LAST_WEEK_GAME_GAINS_KEY, {});
  const lastWeekSmartMixStarts = parseInt(localStorage.getItem('lastWeekSmartMixStarts') || '0', 10);

  const totalPlays = Object.values(lastWeek).reduce((sum, habit) => sum + Number(habit.plays || 0), 0);
  const totalSkips = Object.values(lastWeek).reduce((sum, habit) => sum + Number(habit.skips || 0), 0);
  const totalLikes = Object.values(lastWeek).reduce((sum, habit) => sum + Number(habit.weeklyLikes || 0), 0);
  const totalDislikes = Object.values(lastWeek).reduce((sum, habit) => sum + Number(habit.weeklyDislikes || 0), 0);

  const entries = Object.entries(lastWeek);
  const mostPlayed = entries.slice().sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0))[0];
  const mostLiked = entries.slice().sort((a, b) => (b[1].weeklyLikes || 0) - (a[1].weeklyLikes || 0))[0];

  const tracks = app.state.tracks || [];
  const trackById = new Map(tracks.map(track => [getTrackId(track), track]));
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

  const totalUnique = entries.filter(([, habit]) => (habit.plays || 0) > 0).length;

  const gameGainList = Object.keys(lastWeekGameGains).length
    ? Object.keys(lastWeekGameGains).map(key => {
        const gain = lastWeekGameGains[key];
        return `<div style="font-size:0.9em;color:#333;">${key}: +${gain.gain} (new ${gain.newScore})</div>`;
      }).join('')
    : `<div style="font-size:0.9em;color:#666;">No new game highs last week.</div>`;

  renderScreen(
    `<div style="height:100%;padding:28px 14px 18px 14px;display:flex;flex-direction:column;box-sizing:border-box;">
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:1.3em;font-weight:bold;color:#0074d9;margin-bottom:4px;">Your Weekly Recap</div>
        <div style="font-size:0.9em;color:#666;">Powered by your plays, likes, skips, mixes, and games</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:8px;margin-bottom:10px;">
        <div style="background:#e0eaff;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 4px #0001;">
          <div style="font-size:1.2em;color:#0074d9;margin-bottom:4px;"><i class="fa-solid fa-music"></i></div>
          <div style="font-size:0.8em;color:#444;margin-bottom:2px;">Total Plays</div>
          <div style="font-size:1.4em;font-weight:bold;color:#0074d9;">${totalPlays}</div>
        </div>

        <div style="background:#ffe0e0;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 4px #0001;">
          <div style="font-size:1.2em;color:#d90429;margin-bottom:4px;"><i class="fa-solid fa-forward-step"></i></div>
          <div style="font-size:0.8em;color:#444;margin-bottom:2px;">Skips</div>
          <div style="font-size:1.4em;font-weight:bold;color:#d90429;">${totalSkips}</div>
        </div>

        <div style="background:#e0ffe8;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 4px #0001;">
          <div style="font-size:1.2em;color:#2e8b57;margin-bottom:4px;"><i class="fa-solid fa-thumbs-up"></i></div>
          <div style="font-size:0.8em;color:#444;margin-bottom:2px;">Likes</div>
          <div style="font-size:1.4em;font-weight:bold;color:#2e8b57;">${totalLikes}</div>
        </div>

        <div style="background:#ffe7e7;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 4px #0001;">
          <div style="font-size:1.2em;color:#b00020;margin-bottom:4px;"><i class="fa-solid fa-thumbs-down"></i></div>
          <div style="font-size:0.8em;color:#444;margin-bottom:2px;">Dislikes</div>
          <div style="font-size:1.4em;font-weight:bold;color:#b00020;">${totalDislikes}</div>
        </div>
      </div>

      <div style="background:#f5f5f5;border-radius:10px;padding:10px 10px;margin-bottom:8px;box-shadow:0 1px 4px #0001;">
        <div style="font-size:0.9em;font-weight:bold;color:#0074d9;margin-bottom:4px;">
          <i class="fa-solid fa-headphones"></i> Most Played Last Week
        </div>
        <div style="font-size:0.9em;color:#333;">${mostPlayed && (mostPlayed[1].plays || 0) > 0 ? `${habitLabel(mostPlayed)} (${mostPlayed[1].plays} plays)` : 'No data for last week'}</div>
      </div>

      <div style="background:#f5f5f5;border-radius:10px;padding:10px 10px;margin-bottom:8px;box-shadow:0 1px 4px #0001;">
        <div style="font-size:0.9em;font-weight:bold;color:#d90429;margin-bottom:4px;">
          <i class="fa-solid fa-heart"></i> Most Liked Last Week
        </div>
        <div style="font-size:0.9em;color:#333;">${mostLiked && (mostLiked[1].weeklyLikes || 0) > 0 ? `${habitLabel(mostLiked)} (${mostLiked[1].weeklyLikes} likes)` : 'No data for last week'}</div>
      </div>

      <div style="background:#e8f5ff;border-radius:10px;padding:8px 10px;margin-bottom:8px;box-shadow:0 1px 4px #0001;">
        <div style="font-size:0.9em;font-weight:bold;color:#0074d9;margin-bottom:2px;">
          <i class="fa-solid fa-shuffle"></i> Smart Mix sessions (last week)
        </div>
        <div style="font-size:0.9em;color:#333;">${lastWeekSmartMixStarts || 0}</div>
      </div>

      <div style="background:#f4fff4;border-radius:10px;padding:8px 10px;margin-bottom:8px;box-shadow:0 1px 4px #0001;">
        <div style="font-size:0.9em;font-weight:bold;color:#2f9a54;margin-bottom:4px;">
          <i class="fa-solid fa-gamepad"></i> Game high-score gains (last week)
        </div>
        ${gameGainList}
      </div>

      <div style="background:#e8f5ff;border-radius:10px;padding:8px 10px;margin-top:auto;box-shadow:0 1px 4px #0001;">
        <div style="font-size:0.85em;color:#444;margin-bottom:2px;">
          Unique songs played last week: <b>${totalUnique}</b>
        </div>
      </div>
    </div>`,
    direction
  );
}