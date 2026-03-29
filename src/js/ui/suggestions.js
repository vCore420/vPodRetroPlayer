// --- USER HABITS TRACKING & SUGGESTIONS ---

// Data structure for user habits
const USER_HABITS_KEY = 'userHabits';
const USER_STATS_META_KEY = 'userStatsMeta';
const USER_STATS_SCHEMA_KEY = 'userStatsSchemaVersion';
const USER_STATS_SCHEMA_VERSION = 1;
const LAST_WEEK_STATS_KEY = 'lastWeekStats';
const LAST_WEEK_SMART_MIX_STARTS_KEY = 'lastWeekSmartMixStarts';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Failed to parse ${key}`, error);
    return fallback;
  }
}

function loadSmartMixStats() {
  const stats = readJson('smartMixStats', { weekStarts: 0, lifetimeStarts: 0 });
  return {
    weekStarts: Number(stats.weekStarts || 0),
    lifetimeStarts: Number(stats.lifetimeStarts || 0)
  };
}

function saveSmartMixStats(obj) {
  localStorage.setItem('smartMixStats', JSON.stringify({
    weekStarts: Number(obj?.weekStarts || 0),
    lifetimeStarts: Number(obj?.lifetimeStarts || 0)
  }));
}

function getWeekStartDate(input = new Date()) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);

  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diffToMonday);
  return date;
}

function getWeekKey(input = new Date()) {
  const weekStart = getWeekStartDate(input);
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Compatibility helpers while the rest of the app is updated
function getLastStatsReset() {
  const meta = loadUserStatsMeta();
  return Number(meta.lastResetAt || 0);
}

function setLastStatsReset(ts) {
  const meta = loadUserStatsMeta();
  meta.lastResetAt = Number(ts || 0);
  saveUserStatsMeta(meta);
}

function getCurrentWeekStart() {
  return getWeekStartDate(new Date()).getTime();
}

function createEmptyHabit() {
  return syncHabitShape({});
}

function syncHabitShape(habit = {}) {
  const synced = {
    lifetimePlays: Number(habit.lifetimePlays || 0),
    lifetimeSkips: Number(habit.lifetimeSkips || 0),
    likeCount: Number(habit.likeCount || habit.lifetimeLikes || 0),
    dislikeCount: Number(habit.dislikeCount || habit.lifetimeDislikes || 0),

    weeklyPlays: Number(habit.weeklyPlays ?? habit.plays ?? 0),
    weeklySkips: Number(habit.weeklySkips ?? habit.skips ?? 0),
    weeklyLikes: Number(habit.weeklyLikes || 0),
    weeklyDislikes: Number(habit.weeklyDislikes || 0),

    likedThisWeek: Boolean(habit.likedThisWeek ?? habit.liked ?? false),
    dislikedThisWeek: Boolean(habit.dislikedThisWeek ?? habit.disliked ?? false),

    lastPlayedAt: Number(habit.lastPlayedAt ?? habit.lastPlayed ?? 0),
    lastLikedAt: Number(habit.lastLikedAt ?? habit.lastLiked ?? 0),
    lastDislikedAt: Number(habit.lastDislikedAt ?? habit.lastDisliked ?? 0)
  };

  // Legacy aliases kept in sync until all readers are updated
  synced.plays = synced.weeklyPlays;
  synced.skips = synced.weeklySkips;
  synced.liked = synced.likedThisWeek;
  synced.disliked = synced.dislikedThisWeek;
  synced.lastPlayed = synced.lastPlayedAt;
  synced.lastLiked = synced.lastLikedAt;
  synced.lastDisliked = synced.lastDislikedAt;
  synced.lifetimeLikes = synced.likeCount;
  synced.lifetimeDislikes = synced.dislikeCount;

  return synced;
}

function syncHabitsShape(habits = {}) {
  const synced = {};
  Object.entries(habits || {}).forEach(([id, habit]) => {
    synced[id] = syncHabitShape(habit);
  });
  return synced;
}

function createEmptyUserStatsMeta() {
  return {
    currentWeekKey: getWeekKey(),
    lastFinalizedWeekKey: null,
    lastResetAt: 0
  };
}

function loadUserStatsMeta() {
  const meta = readJson(USER_STATS_META_KEY, createEmptyUserStatsMeta());
  return {
    currentWeekKey: meta.currentWeekKey || getWeekKey(),
    lastFinalizedWeekKey: meta.lastFinalizedWeekKey || null,
    lastResetAt: Number(meta.lastResetAt || 0)
  };
}

function saveUserStatsMeta(meta) {
  localStorage.setItem(USER_STATS_META_KEY, JSON.stringify({
    currentWeekKey: meta.currentWeekKey || getWeekKey(),
    lastFinalizedWeekKey: meta.lastFinalizedWeekKey || null,
    lastResetAt: Number(meta.lastResetAt || 0)
  }));
}

let userHabits = {};

function loadUserHabits() {
  userHabits = syncHabitsShape(readJson(USER_HABITS_KEY, {}));
  window.userHabits = userHabits;
  return userHabits;
}

function saveUserHabits(nextHabits = userHabits) {
  userHabits = syncHabitsShape(nextHabits);
  localStorage.setItem(USER_HABITS_KEY, JSON.stringify(userHabits));
  window.userHabits = userHabits;
  return userHabits;
}

function getOrCreateHabit(trackId) {
  if (!userHabits[trackId]) {
    userHabits[trackId] = createEmptyHabit();
  } else {
    userHabits[trackId] = syncHabitShape(userHabits[trackId]);
  }
  return userHabits[trackId];
}

function buildLastWeekStatsSnapshot(habits) {
  const snapshot = {};
  Object.entries(syncHabitsShape(habits)).forEach(([id, habit]) => {
    snapshot[id] = {
      plays: habit.weeklyPlays,
      skips: habit.weeklySkips,
      weeklyLikes: habit.weeklyLikes,
      weeklyDislikes: habit.weeklyDislikes,
      liked: habit.likedThisWeek,
      disliked: habit.dislikedThisWeek,
      likeCount: habit.likeCount,
      dislikeCount: habit.dislikeCount,
      lifetimePlays: habit.lifetimePlays,
      lifetimeSkips: habit.lifetimeSkips
    };
  });
  return snapshot;
}

function clearWeeklyHabitStats(habit) {
  return syncHabitShape({
    ...habit,
    weeklyPlays: 0,
    weeklySkips: 0,
    weeklyLikes: 0,
    weeklyDislikes: 0,
    likedThisWeek: false,
    dislikedThisWeek: false
  });
}

function finalizeWeekIfNeeded() {
  let meta = loadUserStatsMeta();
  const currentWeekKey = getWeekKey();

  if (!meta.currentWeekKey) {
    meta.currentWeekKey = currentWeekKey;
    saveUserStatsMeta(meta);
    return false;
  }

  if (meta.currentWeekKey === currentWeekKey) {
    return false;
  }

  const habits = loadUserHabits();
  localStorage.setItem(LAST_WEEK_STATS_KEY, JSON.stringify(buildLastWeekStatsSnapshot(habits)));

  const smStats = loadSmartMixStats();
  localStorage.setItem(LAST_WEEK_SMART_MIX_STARTS_KEY, String(smStats.weekStarts || 0));
  smStats.weekStarts = 0;
  saveSmartMixStats(smStats);

  const clearedHabits = {};
  Object.entries(habits).forEach(([id, habit]) => {
    clearedHabits[id] = clearWeeklyHabitStats(habit);
  });
  saveUserHabits(clearedHabits);

  meta = {
    currentWeekKey,
    lastFinalizedWeekKey: meta.currentWeekKey,
    lastResetAt: Date.now()
  };
  saveUserStatsMeta(meta);

  console.log('Weekly stats finalized for', meta.lastFinalizedWeekKey);
  return true;
}

function initializeUserStatsStorage() {
  const version = Number(localStorage.getItem(USER_STATS_SCHEMA_KEY) || 0);

  if (version !== USER_STATS_SCHEMA_VERSION) {
    localStorage.removeItem(USER_HABITS_KEY);
    localStorage.removeItem(USER_STATS_META_KEY);
    localStorage.removeItem('userStatsLastReset');
    localStorage.removeItem(LAST_WEEK_STATS_KEY);
    localStorage.removeItem(LAST_WEEK_SMART_MIX_STARTS_KEY);
    localStorage.removeItem('smartMixStats');

    localStorage.setItem(USER_STATS_SCHEMA_KEY, String(USER_STATS_SCHEMA_VERSION));
    saveUserHabits({});
    saveUserStatsMeta(createEmptyUserStatsMeta());
    localStorage.setItem(LAST_WEEK_STATS_KEY, JSON.stringify({}));
    localStorage.setItem(LAST_WEEK_SMART_MIX_STARTS_KEY, '0');
    saveSmartMixStats({ weekStarts: 0, lifetimeStarts: 0 });
  }

  loadUserHabits();
  finalizeWeekIfNeeded();
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
  finalizeWeekIfNeeded();

  const id = getTrackId(track);
  const habit = getOrCreateHabit(id);

  habit.lifetimePlays += 1;
  habit.weeklyPlays += 1;
  habit.lastPlayedAt = Date.now();

  saveUserHabits();
}

// Log when a song is skipped (next/prev before halfway)
function logTrackSkip(track) {
  finalizeWeekIfNeeded();

  const id = getTrackId(track);
  const habit = getOrCreateHabit(id);

  habit.lifetimeSkips += 1;
  habit.weeklySkips += 1;

  saveUserHabits();

  if (app.state.smartMixActive) {
    app.state.smartMixHistory = app.state.smartMixHistory || [];
    app.state.smartMixSessionSkips = app.state.smartMixSessionSkips || [];
    app.state.smartMixSkipArtists = app.state.smartMixSkipArtists || [];
    const tid = getTrackId(track);
    const artist = (track.artist || '').trim().toLowerCase();
    if (artist) {
      app.state.smartMixSkipArtists.unshift(artist);
      app.state.smartMixSkipArtists = app.state.smartMixSkipArtists.slice(0, 12);
    }
    if (!app.state.smartMixHistory.includes(tid)) app.state.smartMixHistory.push(tid);
    if (!app.state.smartMixSessionSkips.includes(tid)) app.state.smartMixSessionSkips.push(tid);
    refreshSmartMixTail?.();
    ensureSmartMixBuffer?.(10);
  }
}

// Log when a song is liked/disliked
function setTrackRating(track, rating) {
  finalizeWeekIfNeeded();

  const id = getTrackId(track);
  const habit = getOrCreateHabit(id);

  if (rating === 'like') {
    habit.likeCount += 1;
    habit.weeklyLikes += 1;
    habit.lastLikedAt = Date.now();
    habit.likedThisWeek = true;
    habit.dislikedThisWeek = false;
    rememberPositive(track);
  } else if (rating === 'dislike') {
    habit.dislikeCount += 1;
    habit.weeklyDislikes += 1;
    habit.lastDislikedAt = Date.now();
    habit.dislikedThisWeek = true;
    habit.likedThisWeek = false;
  } else {
    habit.likedThisWeek = false;
    habit.dislikedThisWeek = false;
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

function ensureCurrentWeekFlags() {
  finalizeWeekIfNeeded();
  loadUserHabits();
}

window.ensureCurrentWeekFlags = ensureCurrentWeekFlags;
window.finalizeWeekIfNeeded = finalizeWeekIfNeeded;

initializeUserStatsStorage();

// Get suggested tracks
function getSuggestedTracks(tracks, limit = 20) {
  finalizeWeekIfNeeded();
  const now = Date.now();
  const habits = loadUserHabits();

  const trackById = new Map(tracks.map(t => [getTrackId(t), t]));
  const norm = (s = '') => s.trim().toLowerCase();

  const seedArtists = new Set();
  const seedAlbums = new Set();
  const seedGenres = new Set();

  Object.entries(habits).forEach(([id, habit]) => {
    if ((habit.likeCount || 0) > 0) {
      const track = trackById.get(id);
      if (!track) return;
      if (track.artist) seedArtists.add(norm(track.artist));
      if (track.album) seedAlbums.add(norm(track.album));
      if (track.genre) seedGenres.add(norm(track.genre));
    }
  });

  function recencyScore(habit) {
    if (!habit.lastLikedAt) return 0;
    const weeksAgo = (now - habit.lastLikedAt) / (7 * 24 * 3600 * 1000);
    if (weeksAgo < 1) return 5;
    if (weeksAgo < 4) return 2;
    return 0;
  }

  const scored = tracks.map(track => {
    const id = getTrackId(track);
    const habit = syncHabitShape(habits[id] || {});
    let score = 0;

    if ((habit.lifetimePlays || 0) < 3) score += 4 - (habit.lifetimePlays || 0);
    score += (habit.likeCount || 0) * 2;
    score += (habit.weeklyLikes || 0) * 3;
    score += recencyScore(habit);

    if (seedArtists.has(norm(track.artist))) score += 2;
    if (seedAlbums.has(norm(track.album))) score += 1;
    if (seedGenres.has(norm(track.genre))) score += 2;

    if ((habit.dislikeCount || 0) > 0 || (habit.weeklyDislikes || 0) > 0 || habit.dislikedThisWeek) {
      score -= 8;
    }

    if ((habit.lifetimePlays || 0) > 10) score -= 2;

    return { track, score, habit };
  });

  const filtered = scored.filter(obj =>
    (obj.habit.lifetimePlays || 0) < 10 &&
    !obj.habit.likedThisWeek &&
    !obj.habit.dislikedThisWeek &&
    (obj.habit.dislikeCount || 0) === 0
  );

  filtered.sort((a, b) => b.score - a.score);

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
  finalizeWeekIfNeeded();

  const id = getTrackId(track);
  const habit = getOrCreateHabit(id);

  habit.lifetimePlays = 0;
  habit.lifetimeSkips = 0;
  habit.likeCount = 0;
  habit.dislikeCount = 0;

  habit.weeklyPlays = 0;
  habit.weeklySkips = 0;
  habit.weeklyLikes = 0;
  habit.weeklyDislikes = 0;

  habit.likedThisWeek = false;
  habit.dislikedThisWeek = false;

  habit.lastPlayedAt = 0;
  habit.lastLikedAt = 0;
  habit.lastDislikedAt = 0;

  saveUserHabits();
}

// Debug summary
function debugUserHabits() {
  finalizeWeekIfNeeded();
  const habitsArr = Object.entries(loadUserHabits()).map(([id, data]) => ({ id, ...syncHabitShape(data) }));
  habitsArr.sort((a, b) => (b.lifetimePlays || 0) - (a.lifetimePlays || 0));

  console.log("Most Played Songs:");
  habitsArr.slice(0, 5).forEach(h => {
    console.log(`${h.id} | Lifetime Plays: ${h.lifetimePlays}, Weekly Plays: ${h.weeklyPlays}, Lifetime Skips: ${h.lifetimeSkips}`);
  });

  console.log("Most Liked Songs:");
  habitsArr
    .filter(h => (h.likeCount || 0) > 0)
    .slice(0, 5)
    .forEach(h => {
      console.log(`${h.id} | Lifetime Likes: ${h.likeCount}, Weekly Likes: ${h.weeklyLikes}`);
    });

  console.log("Most Skipped Songs:");
  habitsArr
    .slice()
    .sort((a, b) => (b.lifetimeSkips || 0) - (a.lifetimeSkips || 0))
    .slice(0, 3)
    .forEach(h => {
      console.log(`${h.id} | Lifetime Skips: ${h.lifetimeSkips}, Weekly Skips: ${h.weeklySkips}`);
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
  app.state.smartMixLikedAlbums = pushBounded(app.state.smartMixLikedAlbums, norm(track.album));
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

  finalizeWeekIfNeeded();

  const queue = app.state.smartMixQueue || [];
  const idx = app.state.currentSongIndex ?? 0;
  const seed = app.state.currentTrack || queue[idx] || null;
  if (!seed) return;

  const sessionSkips = new Set(app.state.smartMixSessionSkips || []);
  const history = new Set(app.state.smartMixHistory || []);
  sessionSkips.forEach(id => history.add(id));
  queue.slice(0, idx + 1).forEach(t => history.add(getTrackId(t)));

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

  finalizeWeekIfNeeded();

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
  app.state.smartMixLikedAlbums = app.state.smartMixLikedAlbums || [];
  app.state.smartMixHeardArtists = app.state.smartMixHeardArtists || [];
  app.state.currentAlbumSongs = app.state.smartMixQueue;
  app.state.currentSongIndex = startIdx;

  const seedTrack = app.state.smartMixQueue[startIdx];
  playTrackFromAlbum(seedTrack, app.state.smartMixQueue, { smartMix: true });

  app.state.smartMixHistory.push(getTrackId(seedTrack));
  ensureSmartMixBuffer(10);
}
window.ensureSmartMixBuffer = ensureSmartMixBuffer;
window.refreshSmartMixTail = refreshSmartMixTail;
window.startSmartMixFromList = startSmartMixFromList;

function getSmartMixTracks(tracks, seedTrack, limit = 30) {
  if (!tracks || !tracks.length) return [];

  finalizeWeekIfNeeded();

  const habits = loadUserHabits();
  const trackById = new Map(tracks.map(t => [getTrackId(t), t]));
  const norm = s => (s || '').trim().toLowerCase();

  const sessionSkips = new Set(app.state.smartMixSessionSkips || []);
  const skipArtists = new Set((app.state.smartMixSkipArtists || []).map(norm));
  const likedArtists = new Set((app.state.smartMixLikedArtists || []).map(norm));
  const likedAlbums = new Set((app.state.smartMixLikedAlbums || []).map(norm));
  const heardArtists = new Set((app.state.smartMixHeardArtists || []).map(norm));

  const recentArtists = (() => {
    const q = app.state.smartMixQueue || [];
    const idx = app.state.currentSongIndex ?? 0;
    const start = Math.max(0, idx - 6);
    const last = q.slice(start, idx + 1);
    return last.map(t => norm(t.artist));
  })();

  const recentArtistCounts = recentArtists.reduce((map, artist) => {
    map[artist] = (map[artist] || 0) + 1;
    return map;
  }, {});

  let seed = seedTrack || app.state.currentTrack || null;
  if (!seed) {
    const byLikes = Object.entries(habits).sort((a, b) => (b[1].likeCount || 0) - (a[1].likeCount || 0));
    const topLike = byLikes.find(entry => trackById.has(entry[0]));
    if (topLike) seed = trackById.get(topLike[0]);
  }
  if (!seed) {
    const byPlays = Object.entries(habits).sort((a, b) => (b[1].lifetimePlays || 0) - (a[1].lifetimePlays || 0));
    const topPlay = byPlays.find(entry => trackById.has(entry[0]));
    if (topPlay) seed = trackById.get(topPlay[0]);
  }
  if (!seed) return [];

  const seedArtist = norm(seed.artist);
  const seedAlbum = norm(seed.album);
  const seedGenre = norm(seed.genre);

  const scored = tracks
    .filter(t => getTrackId(t) !== getTrackId(seed))
    .map(t => {
      const id = getTrackId(t);
      const h = syncHabitShape(habits[id] || {});
      const artistN = norm(t.artist);

      if ((h.dislikeCount || 0) > 0 || (h.weeklyDislikes || 0) > 0 || h.dislikedThisWeek) return null;
      if (sessionSkips.has(id)) return null;
      if ((h.lifetimeSkips || 0) >= 2) return null;
      if (recentArtistCounts[artistN] >= 2) return null;

      let score = 0;

      if (artistN === seedArtist) score += 4;
      if (norm(t.album) === seedAlbum) score += 2.5;
      if (seedGenre && norm(t.genre) === seedGenre) score += 2.5;

      score += (h.likeCount || 0) * 2;
      score -= (h.dislikeCount || 0) * 6;
      score -= (h.lifetimeSkips || 0) * 3;

      if ((h.lifetimePlays || 0) === 0) score += 5;
      else if ((h.lifetimePlays || 0) < 3) score += 3;

      if (skipArtists.has(artistN)) score -= 8;
      if (recentArtistCounts[artistN]) score -= 4;

      if (likedArtists.has(artistN)) score += 6;
      if (likedAlbums.has(norm(t.album))) score += 4;
      if (heardArtists.has(artistN)) score += 3;

      score += Math.random();

      return { track: t, score, artistN };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const artistSeen = {};

  for (const scoredTrack of scored) {
    const artist = scoredTrack.artistN;
    const baseCap = 2;
    const cap = skipArtists.has(artist) || recentArtistCounts[artist] ? 1 : baseCap;
    const count = artistSeen[artist] || 0;

    if (count < cap || picked.length < 6) {
      picked.push(scoredTrack.track);
      artistSeen[artist] = count + 1;
    }

    if (picked.length >= limit) break;
  }

  if (picked.length < limit) {
    const filler = tracks
      .filter(t => norm(t.artist) !== seedArtist)
      .filter(t => !picked.some(p => getTrackId(p) === getTrackId(t)))
      .map(t => {
        const id = getTrackId(t);
        const h = syncHabitShape(habits[id] || {});
        const artistN = norm(t.artist);

        if ((h.dislikeCount || 0) > 0 || (h.weeklyDislikes || 0) > 0 || h.dislikedThisWeek) return null;
        if (sessionSkips.has(id)) return null;
        if ((h.lifetimeSkips || 0) >= 2) return null;
        if (skipArtists.has(artistN)) return null;
        if (recentArtistCounts[artistN] >= 2) return null;

        let score = 0;
        if ((h.lifetimePlays || 0) === 0) score += 3;
        if ((h.likeCount || 0) > 0) score += 2;
        score += Math.random();

        return { track: t, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit - picked.length)
      .map(item => item.track);

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