// --- USER HABITS TRACKING & SUGGESTIONS ---

// Data structure for user habits
let userHabits = JSON.parse(localStorage.getItem('userHabits')) || {};

function loadSmartMixStats() {
  return JSON.parse(localStorage.getItem('smartMixStats') || '{"weekStarts":0,"lifetimeStarts":0}');
}
function saveSmartMixStats(obj) {
  localStorage.setItem('smartMixStats', JSON.stringify(obj));
}

// Get/Set last stats reset timestamp
function getLastStatsReset() {
  return parseInt(localStorage.getItem('userStatsLastReset') || '0', 10);
}
function setLastStatsReset(ts) {
  localStorage.setItem('userStatsLastReset', ts.toString());
}

function getCurrentWeekStart() {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay() + 1, // Monday
    8, 0, 0, 0
  ).getTime();
}

// Get a unique track ID
function getTrackId(track) {
  const rawRel = (track.file && track.file.webkitRelativePath) || track.relativePath || '';
  const rel = (typeof normalizePath === 'function') ? normalizePath(rawRel) : rawRel;
  const name = (track.file && track.file.name) || track.fileName || '';
  const title = track.title || name || 'unknown_title';
  const artist = track.artist || 'unknown_artist';
  const album = track.album || 'unknown_album';
  if (rel) return rel.toLowerCase();
  if (name) return `${name}|${album}|${artist}`.toLowerCase();
  return `${title}|${artist}|${album}`.toLowerCase();
}

// Log when a song is played
function logTrackPlay(track) {
  const id = getTrackId(track);
  if (!userHabits[id]) userHabits[id] = {
    plays: 0,
    lastPlayed: 0,
    skips: 0,
    liked: false,         // UI: liked this week
    disliked: false,      // UI: disliked this week
    likeCount: 0,         // Lifetime likes
    dislikeCount: 0,      // Lifetime dislikes
    weeklyLikes: 0,       // Likes this week
    weeklyDislikes: 0     // Dislikes this week
  };
  userHabits[id].plays += 1;
  userHabits[id].lastPlayed = Date.now();
  saveUserHabits();
}

// Log when a song is skipped (next/prev before halfway)
function logTrackSkip(track) {
  const id = getTrackId(track);
  if (!userHabits[id]) userHabits[id] = {
    plays: 0,
    lastPlayed: 0,
    skips: 0,
    liked: false,         // UI: liked this week
    disliked: false,      // UI: disliked this week
    likeCount: 0,         // Lifetime likes
    dislikeCount: 0,      // Lifetime dislikes
    weeklyLikes: 0,       // Likes this week
    weeklyDislikes: 0     // Dislikes this week
  };
  userHabits[id].skips += 1;
  saveUserHabits();
  if (app.state.smartMixActive) {
    app.state.smartMixHistory = app.state.smartMixHistory || [];
    app.state.smartMixSessionSkips = app.state.smartMixSessionSkips || [];
    app.state.smartMixSkipArtists = app.state.smartMixSkipArtists || [];
    const tid = getTrackId(track);
    const artist = (track.artist || '').trim().toLowerCase();
    if (artist) {
      app.state.smartMixSkipArtists.unshift(artist);
      app.state.smartMixSkipArtists = app.state.smartMixSkipArtists.slice(0, 12); // keep recent 12
    }
    if (!app.state.smartMixHistory.includes(tid)) app.state.smartMixHistory.push(tid);
    if (!app.state.smartMixSessionSkips.includes(tid)) app.state.smartMixSessionSkips.push(tid);
    refreshSmartMixTail?.();
    ensureSmartMixBuffer?.(10);
  }
}

// Log when a song is liked/disliked
function setTrackRating(track, rating) {
  const id = getTrackId(track);
  if (!userHabits[id]) {
    userHabits[id] = {
      plays: 0,
      lastPlayed: 0,
      skips: 0,
      liked: false,         // kept for compatibility, but not used as a lock
      disliked: false,
      likeCount: 0,
      dislikeCount: 0,
      weeklyLikes: 0,
      weeklyDislikes: 0,
      lastLiked: 0
    };
  }

  if (rating === 'like') {
    userHabits[id].likeCount = (userHabits[id].likeCount || 0) + 1;
    userHabits[id].weeklyLikes = (userHabits[id].weeklyLikes || 0) + 1;
    userHabits[id].lastLiked = Date.now();
    userHabits[id].liked = true;      // still mark last action for filters
    userHabits[id].disliked = false;
    rememberPositive(track);
  } else if (rating === 'dislike') {
    userHabits[id].dislikeCount = (userHabits[id].dislikeCount || 0) + 1;
    userHabits[id].weeklyDislikes = (userHabits[id].weeklyDislikes || 0) + 1;
    userHabits[id].lastDisliked = Date.now();
    userHabits[id].disliked = true;
    userHabits[id].liked = false;
  } else {
    // neutral / clear (if you want to support it)
    userHabits[id].liked = false;
    userHabits[id].disliked = false;
  }
  saveUserHabits();
  if (app.state.smartMixActive) {
      app.state.smartMixHistory = app.state.smartMixHistory || [];
      app.state.smartMixSessionSkips = app.state.smartMixSessionSkips || [];
      app.state.smartMixSkipArtists = app.state.smartMixSkipArtists || [];
      const artist = (track.artist || '').trim().toLowerCase();
      const tid = getTrackId(track);
      if (artist) {
        app.state.smartMixSkipArtists.unshift(artist);
        app.state.smartMixSkipArtists = app.state.smartMixSkipArtists.slice(0, 12);
      }
      if (!app.state.smartMixHistory.includes(tid)) app.state.smartMixHistory.push(tid);
      if (!app.state.smartMixSessionSkips.includes(tid)) app.state.smartMixSessionSkips.push(tid);
    }
}

// Save habits to localStorage
function saveUserHabits() {
  localStorage.setItem('userHabits', JSON.stringify(userHabits));
}

function ensureCurrentWeekFlags() {
  const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  const weekStart = getCurrentWeekStart();
  let changed = false;

  Object.keys(habits).forEach(id => {
    const h = habits[id];
    if (!h) return;
    // Clear weekly likes if they predate this week
    if ((h.weeklyLikes || 0) > 0 && (!h.lastLiked || h.lastLiked < weekStart)) {
      h.weeklyLikes = 0;
      h.liked = false;
      changed = true;
    }
    // Clear weekly dislikes if they predate this week (track lastDisliked below)
    if ((h.weeklyDislikes || 0) > 0 && (!h.lastDisliked || h.lastDisliked < weekStart)) {
      h.weeklyDislikes = 0;
      h.disliked = false;
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem('userHabits', JSON.stringify(habits));
    if (typeof userHabits !== 'undefined') userHabits = habits;
  }
}
window.ensureCurrentWeekFlags = ensureCurrentWeekFlags;

// Get suggested tracks
function getSuggestedTracks(tracks, limit = 20) {
  const now = Date.now();
  const habits = JSON.parse(localStorage.getItem('userHabits')) || {};

  // Build a lookup map for fast, reliable track resolution
  const trackById = new Map(tracks.map(t => [getTrackId(t), t]));
  const norm = (s = '') => s.trim().toLowerCase();

  // Gather seed data from liked songs
  const seedArtists = new Set();
  const seedAlbums = new Set();
  const seedGenres = new Set();
  Object.entries(habits).forEach(([id, habit]) => {
    if (habit.likeCount > 0) {
      const track = trackById.get(id);
      if (!track) return;
      if (track.artist) seedArtists.add(norm(track.artist));
      if (track.album) seedAlbums.add(norm(track.album));
      if (track.genre)  seedGenres.add(norm(track.genre));
    }
  });

  // Helper: score recency of last like
  function recencyScore(habit) {
    if (!habit.lastLiked) return 0;
    const weeksAgo = (now - habit.lastLiked) / (7 * 24 * 3600 * 1000);
    if (weeksAgo < 1) return 5;
    if (weeksAgo < 4) return 2;
    return 0;
  }

  // Score each track
  const scored = tracks.map(track => {
    const id = getTrackId(track);
    const habit = habits[id] || {};
    let score = 0;

    // Push songs with low play count
    if ((habit.plays || 0) < 3) score += 4 - (habit.plays || 0);

    // Lifetime likes
    score += (habit.likeCount || 0) * 2;

    // Weekly likes
    score += (habit.weeklyLikes || 0) * 3;

    // Recency of last like
    score += recencyScore(habit);

    // Similarity to liked songs (normalized)
    if (seedArtists.has(norm(track.artist))) score += 2;
    if (seedAlbums.has(norm(track.album)))  score += 1;
    if (seedGenres.has(norm(track.genre)))   score += 2;

    // Penalize disliked songs
    if (habit.disliked || habit.weeklyDislikes > 0) score -= 8;

    // Penalize heavily played songs
    if ((habit.plays || 0) > 10) score -= 2;

    return { track, score, habit };
  });

  // Only suggest songs not heavily played or liked this week
  const filtered = scored.filter(obj =>
    (obj.habit.plays || 0) < 10 &&
    !obj.habit.liked &&
    !obj.habit.disliked
  );

  // Sort and limit
  filtered.sort((a, b) => b.score - a.score);

  // Debug: Show top 5 suggestions
  console.log("Top Suggestions:");
  filtered.slice(0, 5).forEach(obj => {
    console.log(
      `${obj.track.title} (${obj.track.artist}) | Score: ${obj.score}`,
      obj.habit
    );
  });

  return filtered.slice(0, limit).map(obj => obj.track);
}

function resetTrackRatings(track) {
  const id = getTrackId(track);
  if (!userHabits[id]) return;

  userHabits[id].likeCount = 0;
  userHabits[id].dislikeCount = 0;
  userHabits[id].weeklyLikes = 0;
  userHabits[id].weeklyDislikes = 0;
  userHabits[id].liked = false;
  userHabits[id].disliked = false;
  userHabits[id].lastLiked = 0;
  saveUserHabits();
}

// Debug summary
function debugUserHabits() {
  const habitsArr = Object.entries(userHabits).map(([id, data]) => ({ id, ...data }));
  habitsArr.sort((a, b) => b.plays - a.plays);

  console.log("Most Played Songs:");
  habitsArr.slice(0, 5).forEach(h => {
    console.log(`${h.id} | Plays: ${h.plays}, Liked: ${h.liked}, Skipped: ${h.skips}`);
  });

  console.log("Most Liked Songs:");
  habitsArr.filter(h => h.liked).forEach(h => {
    console.log(`${h.id} | Plays: ${h.plays}, Skipped: ${h.skips}`);
  });

  console.log("Most Skipped Songs:");
  habitsArr.sort((a, b) => b.skips - a.skips).slice(0, 3).forEach(h => {
    console.log(`${h.id} | Skipped: ${h.skips}, Plays: ${h.plays}`);
  });
}

// Export functions
window.logTrackPlay = logTrackPlay;
window.logTrackSkip = logTrackSkip;
window.setTrackRating = setTrackRating;
window.getSuggestedTracks = getSuggestedTracks;
window.resetTrackRatings = resetTrackRatings;

// -- SUGGESTED SONGS MENU ---

function renderSuggestedMenu(direction = 'forward') {
  const allTracks = app.state.tracks;  
  const allAlbums = app.state.albums;

  const suggested = window.getSuggestedTracks
    ? window.getSuggestedTracks(allTracks, 20)
    : [];

  if (!suggested.length) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:12px;">Suggested Songs</div>
        <div style="font-size:1em;color:#444;text-align:center;">
          Not enough listening data yet.<br>
          Play, like, or skip songs to get suggestions!
        </div>
      </div>`,
      direction
    );
    return;
  }

  app.state.currentMenuIndex = 0;

  renderSongList({
    songs: suggested,
    onSongClick: (track, idx) => {
      app.state.currentMenuIndex = idx;
      playTrackFromAlbum(track, suggested);
    },
    albumCover: allAlbums[suggested[0]?.albumKey || suggested[0]?.album]?.cover
  }, direction);

  // initial highlight
  if (typeof window.updateHighlightedSong === 'function') {
    window.updateHighlightedSong();
  }
}

// --- Smart Mix Functions ---

function pushBounded(arr, val, max = 12) {
  if (!val) return arr;
  arr = arr || [];
  if (!arr.includes(val)) {
    arr.unshift(val);
    if (arr.length > max) arr = arr.slice(0, max);
  }
  return arr;
}

function rememberPositive(track) {
  const norm = s => (s || '').trim().toLowerCase();
  app.state.smartMixLikedArtists = pushBounded(app.state.smartMixLikedArtists, norm(track.artist));
  app.state.smartMixLikedAlbums  = pushBounded(app.state.smartMixLikedAlbums,  norm(track.album));
}

function markDeepListen(track) {
  const norm = s => (s || '').trim().toLowerCase();
  app.state.smartMixHeardArtists = pushBounded(app.state.smartMixHeardArtists, norm(track.artist));
}
window.markDeepListen = markDeepListen;

function ensureSmartMixBuffer(bufferSize = 8) {
  if (!app.state.smartMixActive) return;
  const tracks = app.state.tracks || [];
  if (!tracks.length) return;

  const queue = app.state.smartMixQueue || [];
  const idx = app.state.currentSongIndex ?? 0;
  const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  const seed = app.state.currentTrack || queue[idx] || null;
  if (!seed) return;

  // history set to avoid quick repeats
  const sessionSkips = new Set(app.state.smartMixSessionSkips || []);
  const history = new Set(app.state.smartMixHistory || []);
  sessionSkips.forEach(id => history.add(id));
  queue.slice(0, idx + 1).forEach(t => history.add(getTrackId(t)));

  // need more?
  const need = bufferSize - (queue.length - (idx + 1));
  if (need <= 0) return;

  const candidates = getSmartMixTracks(tracks, seed, 60)
    .filter(t => !history.has(getTrackId(t)))
    .filter(t => !queue.some(q => getTrackId(q) === getTrackId(t)));

  const toAdd = candidates.slice(0, need);
  if (toAdd.length) {
    app.state.smartMixQueue = queue.concat(toAdd);
    app.state.currentAlbumSongs = app.state.smartMixQueue;
  }
}

function refreshSmartMixTail() {
  if (!app.state.smartMixActive) return;
  const tracks = app.state.tracks || [];
  const queue = app.state.smartMixQueue || [];
  const idx = app.state.currentSongIndex ?? 0;
  const head = queue.slice(0, idx + 1);
  const seed = app.state.currentTrack || head[idx] || null;
  if (!seed) return;

  const sessionSkips = new Set(app.state.smartMixSessionSkips || []);
  const history = new Set(app.state.smartMixHistory || []);
  sessionSkips.forEach(id => history.add(id));
  head.forEach(t => history.add(getTrackId(t)));

  const tail = getSmartMixTracks(tracks, seed, 80)
    .filter(t => !history.has(getTrackId(t)))
    .slice(0, 12);

  app.state.smartMixQueue = head.concat(tail);
  app.state.currentAlbumSongs = app.state.smartMixQueue;
}

function startSmartMixFromList(list, startIdx = 0) {
  if (!list || !list.length) return;
  app.state.smartMixActive = true;
  const smStats = loadSmartMixStats();
  smStats.weekStarts = (smStats.weekStarts || 0) + 1;
  smStats.lifetimeStarts = (smStats.lifetimeStarts || 0) + 1;
  saveSmartMixStats(smStats);
  app.state.smartMixHistory = [];
  app.state.smartMixQueue = list.slice();
  app.state.smartMixSessionSkips = [];
  app.state.smartMixSkipArtists = [];
  app.state.smartMixLikedArtists = app.state.smartMixLikedArtists || [];
  app.state.smartMixLikedAlbums  = app.state.smartMixLikedAlbums  || [];
  app.state.smartMixHeardArtists = app.state.smartMixHeardArtists || [];
  app.state.currentAlbumSongs = app.state.smartMixQueue;
  app.state.currentSongIndex = startIdx;
  const seedTrack = app.state.smartMixQueue[startIdx];
  playTrackFromAlbum(seedTrack, app.state.smartMixQueue, { smartMix: true });
  // record history
  app.state.smartMixHistory.push(getTrackId(seedTrack));
  ensureSmartMixBuffer(10);
}
window.ensureSmartMixBuffer = ensureSmartMixBuffer;
window.refreshSmartMixTail = refreshSmartMixTail;
window.startSmartMixFromList = startSmartMixFromList;

function getSmartMixTracks(tracks, seedTrack, limit = 30) {
  if (!tracks || !tracks.length) return [];
  const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  const trackById = new Map(tracks.map(t => [getTrackId(t), t]));
  const norm = s => (s || '').trim().toLowerCase();

  const sessionSkips = new Set(app.state.smartMixSessionSkips || []);
  const skipArtists = new Set((app.state.smartMixSkipArtists || []).map(norm));
  const likedArtists = new Set((app.state.smartMixLikedArtists || []).map(norm));
  const likedAlbums  = new Set((app.state.smartMixLikedAlbums  || []).map(norm));
  const heardArtists = new Set((app.state.smartMixHeardArtists || []).map(norm));

  // recent artists from the currently played part of the Smart Mix queue
  const recentArtists = (() => {
    const q = app.state.smartMixQueue || [];
    const idx = app.state.currentSongIndex ?? 0;
    const start = Math.max(0, idx - 6);
    const last = q.slice(start, idx + 1);
    return last.map(t => norm(t.artist));
  })();
  const recentArtistCounts = recentArtists.reduce((m, a) => {
    m[a] = (m[a] || 0) + 1;
    return m;
  }, {});

  // Seed selection
  let seed = seedTrack || app.state.currentTrack || null;
  if (!seed) {
    const byLikes = Object.entries(habits).sort((a, b) => (b[1].likeCount || 0) - (a[1].likeCount || 0));
    const topLike = byLikes.find(e => trackById.has(e[0]));
    if (topLike) seed = trackById.get(topLike[0]);
  }
  if (!seed) {
    const byPlays = Object.entries(habits).sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0));
    const topPlay = byPlays.find(e => trackById.has(e[0]));
    if (topPlay) seed = trackById.get(topPlay[0]);
  }
  if (!seed) return [];

  const seedArtist = norm(seed.artist);
  const seedAlbum  = norm(seed.album);
  const seedGenre  = norm(seed.genre);

  const scored = tracks
    .filter(t => getTrackId(t) !== getTrackId(seed))
    .map(t => {
      const id = getTrackId(t);
      const h = habits[id] || {};
      const artistN = norm(t.artist);

      // Hard filters
      if (h.dislikeCount > 0 || h.weeklyDislikes > 0 || h.disliked) return null;
      if (sessionSkips.has(id)) return null;           // skipped this session
      if ((h.skips || 0) >= 2) return null;            // too many lifetime skips
      if (recentArtistCounts[artistN] >= 2) return null; // avoid recent ping‑pong

      let score = 0;

      // Similarity
      if (artistN === seedArtist) score += 4;
      if (norm(t.album) === seedAlbum) score += 2.5;
      if (seedGenre && norm(t.genre) === seedGenre) score += 2.5;

      // User feedback
      score += (h.likeCount || 0) * 2;
      score -= (h.dislikeCount || 0) * 6;
      score -= (h.skips || 0) * 3;

      // Freshness
      if ((h.plays || 0) === 0) score += 5;
      else if ((h.plays || 0) < 3) score += 3;

      // Penalize recently skipped artists + recently played artists
      if (skipArtists.has(artistN)) score -= 8;
      if (recentArtistCounts[artistN]) score -= 4;

      // Boost liked artists/albums and heard artists
      if (likedArtists.has(artistN)) score += 6;
      if (likedAlbums.has(norm(t.album))) score += 4;
      if (heardArtists.has(artistN)) score += 3;

      // Tiny jitter
      score += Math.random();

      return { track: t, score, artistN };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  // Diversity with stricter caps if artist was recently skipped/played
  const picked = [];
  const artistSeen = {};
  for (const s of scored) {
    const a = s.artistN;
    const baseCap = 2;
    const cap = skipArtists.has(a) || recentArtistCounts[a] ? 1 : baseCap;
    const count = artistSeen[a] || 0;
    if (count < cap || picked.length < 6) {
      picked.push(s.track);
      artistSeen[a] = count + 1;
    }
    if (picked.length >= limit) break;
  }

  // Fillers from other artists if short
  if (picked.length < limit) {
    const seedArtistLower = seedArtist;
    const filler = tracks
      .filter(t => norm(t.artist) !== seedArtistLower)
      .filter(t => !picked.some(p => getTrackId(p) === getTrackId(t)))
      .map(t => {
        const id = getTrackId(t);
        const h = habits[id] || {};
        const aN = norm(t.artist);
        if (h.dislikeCount > 0 || h.weeklyDislikes > 0 || h.disliked) return null;
        if (sessionSkips.has(id)) return null;
        if ((h.skips || 0) >= 2) return null;
        if (skipArtists.has(aN)) return null;
        if (recentArtistCounts[aN] >= 2) return null;
        let s = 0;
        if ((h.plays || 0) === 0) s += 3;
        if ((h.likeCount || 0) > 0) s += 2;
        s += Math.random();
        return { track: t, score: s, artistN: aN };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit - picked.length)
      .map(x => x.track);
    picked.push(...filler);
  }

  return picked.slice(0, limit);
}

function renderSmartMixMenu(direction = 'forward') {
  const allTracks = app.state.tracks || [];
  if (!allTracks.length) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:0 18px;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:10px;">Smart Mix</div>
        <div style="font-size:0.95em;color:#444;">Load music to start a mix.</div>
      </div>`,
      direction
    );
    return;
  }

  let mix;
  if (app.state.smartMixActive && app.state.smartMixQueue?.length) {
    mix = app.state.smartMixQueue;
  } else {
    const seed = app.state.currentTrack || null;
    mix = getSmartMixTracks(allTracks, seed, 30);
  }

  if (!mix.length) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:0 18px;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:10px;">Smart Mix</div>
        <div style="font-size:0.95em;color:#444;">Not enough listening data yet.</div>
      </div>`,
      direction
    );
    return;
  }

  app.state.currentMenuIndex = 0;
  renderSongList({
    songs: mix,
    albumCover: (app.state.albums[mix[0]?.albumKey || mix[0]?.album] || {}).cover,
    onSongClick: (track, idx) => {
      app.state.currentMenuIndex = idx;
      startSmartMixFromList(mix, idx);
    }
  }, direction);

  if (typeof window.updateHighlightedSong === 'function') window.updateHighlightedSong();
}
window.renderSmartMixMenu = renderSmartMixMenu;