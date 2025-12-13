// --- WEEKLY RECAP MENU ---

// DEBUG: Set to true to always show Weekly Recap menu
const DEBUG_RECAP_ALWAYS_ON = false;

function renderWeeklyRecapMenu(direction = 'forward') {
  const lastWeek = JSON.parse(localStorage.getItem('lastWeekStats') || '{}');

  const totalPlays = Object.values(lastWeek).reduce((sum, h) => sum + (h.plays || 0), 0);
  const totalSkips = Object.values(lastWeek).reduce((sum, h) => sum + (h.skips || 0), 0);
  const totalLikes = Object.values(lastWeek).reduce((sum, h) => sum + (h.weeklyLikes || 0), 0);
  const totalDislikes = Object.values(lastWeek).reduce((sum, h) => sum + (h.weeklyDislikes || 0), 0);

  const entries = Object.entries(lastWeek);

  const mostPlayed = entries
    .sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0))[0];
  const mostLiked = entries
    .sort((a, b) => (b[1].weeklyLikes || 0) - (a[1].weeklyLikes || 0))[0];

  // Resolve IDs to friendly titles/artists/albums
  const tracks = app.state.tracks || [];
  const trackById = new Map(tracks.map(t => [getTrackId(t), t]));
  const trackByRel = new Map(tracks.filter(t => t.relativePath).map(t => [t.relativePath.toLowerCase(), t]));
  const trackByFile = new Map(tracks.map(t => [(t.fileName || t.file?.name || '').toLowerCase(), t]));

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
    return id.split('|')[0] || 'Unknown Track';
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

  renderScreen(
    `<div style="height:100%;padding:28px 14px 18px 14px;display:flex;flex-direction:column;box-sizing:border-box;">
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:1.3em;font-weight:bold;color:#0074d9;margin-bottom:4px;">
          Your Weekly Recap
        </div>
        <div style="font-size:0.9em;color:#666;">
          Powered by your plays, likes and skips
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:8px;margin-bottom:10px;">
        <div style="background:#e0eaff;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 4px #0001;">
          <div style="font-size:1.2em;color:#0074d9;margin-bottom:4px;">
            <i class="fa-solid fa-music"></i>
          </div>
          <div style="font-size:0.8em;color:#444;margin-bottom:2px;">Total Plays</div>
          <div style="font-size:1.4em;font-weight:bold;color:#0074d9;">${totalPlays}</div>
        </div>

        <div style="background:#ffe0e0;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 4px #0001;">
          <div style="font-size:1.2em;color:#d90429;margin-bottom:4px;">
            <i class="fa-solid fa-forward-step"></i>
          </div>
          <div style="font-size:0.8em;color:#444;margin-bottom:2px;">Skips</div>
          <div style="font-size:1.4em;font-weight:bold;color:#d90429;">${totalSkips}</div>
        </div>

        <div style="background:#e0ffe8;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 4px #0001;">
          <div style="font-size:1.2em;color:#2e8b57;margin-bottom:4px;">
            <i class="fa-solid fa-thumbs-up"></i>
          </div>
          <div style="font-size:0.8em;color:#444;margin-bottom:2px;">Likes</div>
          <div style="font-size:1.4em;font-weight:bold;color:#2e8b57;">${totalLikes}</div>
        </div>

        <div style="background:#ffe7e7;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 4px #0001;">
          <div style="font-size:1.2em;color:#b00020;margin-bottom:4px;">
            <i class="fa-solid fa-thumbs-down"></i>
          </div>
          <div style="font-size:0.8em;color:#444;margin-bottom:2px;">Dislikes</div>
          <div style="font-size:1.4em;font-weight:bold;color:#b00020;">${totalDislikes}</div>
        </div>
      </div>

      <div style="background:#f5f5f5;border-radius:10px;padding:10px 10px;margin-bottom:8px;box-shadow:0 1px 4px #0001;">
        <div style="font-size:0.9em;font-weight:bold;color:#0074d9;margin-bottom:4px;">
          <i class="fa-solid fa-headphones"></i> Most Played This Week
        </div>
        <div style="font-size:0.9em;color:#333;">
          ${mostPlayedLabel}
        </div>
      </div>

      <div style="background:#f5f5f5;border-radius:10px;padding:10px 10px;margin-bottom:8px;box-shadow:0 1px 4px #0001;">
        <div style="font-size:0.9em;font-weight:bold;color:#d90429;margin-bottom:4px;">
          <i class="fa-solid fa-heart"></i> Most Liked This Week
        </div>
        <div style="font-size:0.9em;color:#333;">
          ${mostLikedLabel}
        </div>
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
  const isEightAM = now.getHours() >= 8;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1, 8, 0, 0, 0).getTime();

  if (isMonday && isEightAM && lastReset < weekStart) {
    let userHabits = JSON.parse(localStorage.getItem('userHabits')) || {};
    // Save last week's stats
    localStorage.setItem('lastWeekStats', JSON.stringify(userHabits));
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
    console.log("User stats reset for new week:", new Date(weekStart));
  }
}