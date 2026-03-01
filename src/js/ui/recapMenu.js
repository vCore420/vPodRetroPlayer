// --- WEEKLY RECAP MENU ---

// DEBUG: Set to true to always show Weekly Recap menu
const DEBUG_RECAP_ALWAYS_ON = false;

function renderWeeklyRecapMenu(direction = 'forward') {
  const lastWeek = JSON.parse(localStorage.getItem('lastWeekStats') || '{}');
  const lastWeekGameGains = JSON.parse(localStorage.getItem('lastWeekGameGains') || '{}');
  const lastWeekSmartMixStarts = parseInt(localStorage.getItem('lastWeekSmartMixStarts') || '0', 10);

  const totalPlays = Object.values(lastWeek).reduce((sum, h) => sum + (h.plays || 0), 0);
  const totalSkips = Object.values(lastWeek).reduce((sum, h) => sum + (h.skips || 0), 0);
  const totalLikes = Object.values(lastWeek).reduce((sum, h) => sum + (h.weeklyLikes || 0), 0);
  const totalDislikes = Object.values(lastWeek).reduce((sum, h) => sum + (h.weeklyDislikes || 0), 0);

  const entries = Object.entries(lastWeek);

  const mostPlayed = entries.sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0))[0];
  const mostLiked = entries.sort((a, b) => (b[1].weeklyLikes || 0) - (a[1].weeklyLikes || 0))[0];

  // Resolve IDs to friendly titles/artists/albums
  const tracks = app.state.tracks || [];
  const trackById = new Map(tracks.map(t => [getTrackId(t), t]));
  const trackByRel = new Map(tracks.filter(t => t.relativePath).map(t => [t.relativePath.toLowerCase(), t]));
  const trackByFile = new Map(tracks.map(t => [(t.fileName || t.file?.name || '').toLowerCase(), t]));

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
    const fname = idLower.split(/[\\/]/).pop();
    const byFile = trackByFile.get(fname);
    if (byFile) {
      return `${byFile.title || 'Unknown Track'}${byFile.artist ? ' — ' + byFile.artist : ''}${byFile.album ? ' (' + byFile.album + ')' : ''}`;
    }
    return prettyFromPath(id);
  };

  const mostPlayedLabel =
    mostPlayed && (mostPlayed[1].plays || 0) > 0
      ? `${habitLabel(mostPlayed)} (${mostPlayed[1].plays} plays)`
      : "No data for last week";

  const mostLikedLabel =
    mostLiked && (mostLiked[1].weeklyLikes || 0) > 0
      ? `${habitLabel(mostLiked)} (${mostLiked[1].weeklyLikes} likes)`
      : "No data for last week";

  const totalUnique = entries.filter(([_, h]) => (h.plays || 0) > 0).length;

  const gameGainList = Object.keys(lastWeekGameGains).map(k => {
    const g = lastWeekGameGains[k];
    return `<div style="font-size:0.9em;color:#333;">${k}: +${g.gain} (new ${g.newScore})</div>`;
  }).join('') || `<div style="font-size:0.9em;color:#666;">No new game highs last week.</div>`;

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
          <i class="fa-solid fa-headphones"></i> Most Played This Week
        </div>
        <div style="font-size:0.9em;color:#333;">${mostPlayed && (mostPlayed[1].plays||0) > 0 ? `${habitLabel(mostPlayed)} (${mostPlayed[1].plays} plays)` : "No data for last week"}</div>
      </div>

      <div style="background:#f5f5f5;border-radius:10px;padding:10px 10px;margin-bottom:8px;box-shadow:0 1px 4px #0001;">
        <div style="font-size:0.9em;font-weight:bold;color:#d90429;margin-bottom:4px;">
          <i class="fa-solid fa-heart"></i> Most Liked This Week
        </div>
        <div style="font-size:0.9em;color:#333;">${mostLiked && (mostLiked[1].weeklyLikes||0) > 0 ? `${habitLabel(mostLiked)} (${mostLiked[1].weeklyLikes} likes)` : "No data for last week"}</div>
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
          Unique songs played this week: <b>${totalUnique}</b>
        </div>
      </div>
    </div>`,
    direction
  );
}

// Try Reset weekly stats on app start
function maybeResetWeeklyStats() {
  const now = new Date();
  const lastReset = getLastStatsReset();
  const isMonday = now.getDay() === 1;
  const isEightAM = now.getHours() >= 7;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1, 8, 0, 0, 0).getTime();

  if (now.getTime() >= weekStart && lastReset < weekStart) {
    let userHabits = JSON.parse(localStorage.getItem('userHabits') || '{}');
    localStorage.setItem('lastWeekStats', JSON.stringify(userHabits));

    // games: capture gains vs baseline
    const hsCur = JSON.parse(localStorage.getItem('gameHighScores') || '{}');
    const hsBase = JSON.parse(localStorage.getItem('gameHighScoresWeekBase') || '{}');
    const hsGains = {};
    Object.keys(hsCur).forEach(k => {
      const gain = (hsCur[k] || 0) - (hsBase[k] || 0);
      if (gain > 0) hsGains[k] = { gain, newScore: hsCur[k] };
    });
    localStorage.setItem('lastWeekGameGains', JSON.stringify(hsGains));
    localStorage.setItem('lastWeekGameScores', JSON.stringify(hsCur));
    localStorage.setItem('gameHighScoresWeekBase', JSON.stringify(hsCur)); // new baseline

    // smart mix weekly starts
    const smStats = JSON.parse(localStorage.getItem('smartMixStats') || '{"weekStarts":0,"lifetimeStarts":0}');
    localStorage.setItem('lastWeekSmartMixStarts', smStats.weekStarts || 0);
    smStats.weekStarts = 0;
    localStorage.setItem('smartMixStats', JSON.stringify(smStats));

    Object.keys(userHabits).forEach(id => {
      userHabits[id].plays = 0;
      userHabits[id].skips = 0;
      userHabits[id].liked = false;
      userHabits[id].disliked = false;
      userHabits[id].weeklyLikes = 0;
      userHabits[id].weeklyDislikes = 0;
    });
    localStorage.setItem('userHabits', JSON.stringify(userHabits));
    setLastStatsReset(weekStart);
    if (typeof window.userHabits !== 'undefined') window.userHabits = userHabits;
    console.log("User stats reset for new week:", new Date(weekStart));
  }
}