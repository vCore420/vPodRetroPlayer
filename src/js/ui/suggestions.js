// --- USER HABITS TRACKING & SUGGESTIONS ---

// Data structure for user habits
const USER_HABITS_KEY = 'userHabits';
const USER_STATS_META_KEY = 'userStatsMeta';
const USER_STATS_SCHEMA_KEY = 'userStatsSchemaVersion';
const USER_STATS_SCHEMA_VERSION = 1;
const LAST_WEEK_STATS_KEY = 'lastWeekStats';
const LAST_WEEK_SMART_MIX_STARTS_KEY = 'lastWeekSmartMixStarts';
const SUGGESTED_TUNE_MODE_KEY = 'suggestedTuneMode';
const SMART_MIX_MODE_KEY = 'smartMixMode';

const SUGGESTED_TUNE_MODES = {
  familiar: {
    key: 'familiar',
    label: 'Familiar',
    subtitle: 'More of what already fits you',
    exploreWeight: 0.75,
    affinityWeight: 1.3,
    recencyWeight: 1.15,
    diversityArtistCap: 3,
    diversityAlbumCap: 2,
    quickSkipPenalty: 5,
    deepSkipPenalty: 1.4
  },
  balanced: {
    key: 'balanced',
    label: 'Balanced',
    subtitle: 'A mix of safe picks and rediscoveries',
    exploreWeight: 1,
    affinityWeight: 1,
    recencyWeight: 1,
    diversityArtistCap: 2,
    diversityAlbumCap: 2,
    quickSkipPenalty: 4,
    deepSkipPenalty: 1.15
  },
  discovery: {
    key: 'discovery',
    label: 'Discovery',
    subtitle: 'More variety and low-play songs',
    exploreWeight: 1.45,
    affinityWeight: 0.82,
    recencyWeight: 0.8,
    diversityArtistCap: 1,
    diversityAlbumCap: 1,
    quickSkipPenalty: 3.2,
    deepSkipPenalty: 0.9
  }
};

const SMART_MIX_MODE_ORDER = ['warmup', 'blend', 'leftturn'];

const SMART_MIX_MODES = {
  warmup: {
    key: 'warmup',
    label: 'More Like This',
    subtitle: 'Mostly familiar songs from artists and albums you already enjoy',
    affinityWeight: 1.28,
    exploreWeight: 0.82,
    diversityArtistCap: 3,
    diversityAlbumCap: 2,
    chapterSize: 3,
    sequence: ['familiar', 'familiar', 'blend', 'recovery']
  },
  blend: {
    key: 'blend',
    label: 'Balanced Mix',
    subtitle: 'A balanced mix of favorites, nearby picks and a few fresher songs',
    affinityWeight: 1,
    exploreWeight: 1,
    diversityArtistCap: 2,
    diversityAlbumCap: 2,
    chapterSize: 3,
    sequence: ['familiar', 'blend', 'blend', 'discovery']
  },
  leftturn: {
    key: 'leftturn',
    label: 'Mix It Up',
    subtitle: 'More variety, deeper cuts and more adventurous changes',
    affinityWeight: 0.84,
    exploreWeight: 1.38,
    diversityArtistCap: 1,
    diversityAlbumCap: 1,
    chapterSize: 3,
    sequence: ['blend', 'discovery', 'discovery', 'recovery']
  }
};

const SMART_MIX_LANES = {
  familiar: {
    key: 'familiar',
    label: 'More Like This',
    summary: 'More songs close to what you already like.',
    artistWeight: 4.6,
    albumWeight: 2.8,
    genreWeight: 2.2,
    likeWeight: 2.4,
    heardWeight: 2.1,
    lowPlayWeight: 0.8,
    underplayedWeight: 0.55,
    quickSkipPenalty: 5.4,
    deepSkipPenalty: 1.8,
    repeatPenalty: 5.1
  },
  blend: {
    key: 'blend',
    label: 'Keep the Feel',
    summary: 'Keeping the same feel with nearby artists and genres.',
    artistWeight: 3.2,
    albumWeight: 2.1,
    genreWeight: 2.6,
    likeWeight: 2,
    heardWeight: 1.7,
    lowPlayWeight: 1.05,
    underplayedWeight: 0.9,
    quickSkipPenalty: 4.1,
    deepSkipPenalty: 1.3,
    repeatPenalty: 4.3
  },
  discovery: {
    key: 'discovery',
    label: 'Fresh Picks',
    summary: 'A few fresher picks that still fit your taste.',
    artistWeight: 1.8,
    albumWeight: 1.2,
    genreWeight: 2.8,
    likeWeight: 1.55,
    heardWeight: 1.1,
    lowPlayWeight: 1.7,
    underplayedWeight: 1.28,
    quickSkipPenalty: 3.2,
    deepSkipPenalty: 0.95,
    repeatPenalty: 3.8
  },
  recovery: {
    key: 'recovery',
    label: 'Back to Favorites',
    summary: 'Returning to safer picks after trying something new.',
    artistWeight: 3.8,
    albumWeight: 2.4,
    genreWeight: 1.9,
    likeWeight: 2.5,
    heardWeight: 2.3,
    lowPlayWeight: 0.7,
    underplayedWeight: 0.45,
    quickSkipPenalty: 5,
    deepSkipPenalty: 1.4,
    repeatPenalty: 4.8
  }
};

function getSuggestedTuneMode() {
  const mode = localStorage.getItem(SUGGESTED_TUNE_MODE_KEY) || 'balanced';
  return SUGGESTED_TUNE_MODES[mode] ? mode : 'balanced';
}

function setSuggestedTuneMode(mode) {
  const nextMode = SUGGESTED_TUNE_MODES[mode] ? mode : 'balanced';
  localStorage.setItem(SUGGESTED_TUNE_MODE_KEY, nextMode);
  return nextMode;
}

function cycleSuggestedTuneMode() {
  const order = ['familiar', 'balanced', 'discovery'];
  const current = getSuggestedTuneMode();
  const next = order[(order.indexOf(current) + 1) % order.length];
  return setSuggestedTuneMode(next);
}

function getSuggestedTuneConfig(mode = getSuggestedTuneMode()) {
  return SUGGESTED_TUNE_MODES[mode] || SUGGESTED_TUNE_MODES.balanced;
}

function getSmartMixMode() {
  const mode = localStorage.getItem(SMART_MIX_MODE_KEY) || 'blend';
  return SMART_MIX_MODES[mode] ? mode : 'blend';
}

function setSmartMixMode(mode) {
  const nextMode = SMART_MIX_MODES[mode] ? mode : 'blend';
  localStorage.setItem(SMART_MIX_MODE_KEY, nextMode);
  return nextMode;
}

function cycleSmartMixMode() {
  const current = getSmartMixMode();
  const next = SMART_MIX_MODE_ORDER[(SMART_MIX_MODE_ORDER.indexOf(current) + 1) % SMART_MIX_MODE_ORDER.length];
  return setSmartMixMode(next);
}

function getSmartMixModeConfig(mode = getSmartMixMode()) {
  return SMART_MIX_MODES[mode] || SMART_MIX_MODES.blend;
}

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
    lifetimePlays: Number(habit.lifetimePlays ?? 0),
    lifetimeSkips: Number(habit.lifetimeSkips ?? 0),
    lifetimeQuickSkips: Number(habit.lifetimeQuickSkips ?? 0),
    lifetimeDeepSkips: Number(habit.lifetimeDeepSkips ?? 0),
    likeCount: Number(habit.likeCount ?? habit.lifetimeLikes ?? 0),
    dislikeCount: Number(habit.dislikeCount ?? habit.lifetimeDislikes ?? 0),

    weeklyPlays: Number(habit.weeklyPlays ?? habit.plays ?? 0),
    weeklySkips: Number(habit.weeklySkips ?? habit.skips ?? 0),
    weeklyQuickSkips: Number(habit.weeklyQuickSkips ?? 0),
    weeklyDeepSkips: Number(habit.weeklyDeepSkips ?? 0),
    weeklyLikes: Number(habit.weeklyLikes ?? 0),
    weeklyDislikes: Number(habit.weeklyDislikes ?? 0),

    likedThisWeek: Boolean(habit.likedThisWeek ?? habit.liked ?? false),
    dislikedThisWeek: Boolean(habit.dislikedThisWeek ?? habit.disliked ?? false),

    lastPlayedAt: Number(habit.lastPlayedAt ?? habit.lastPlayed ?? 0),
    lastSkipAt: Number(habit.lastSkipAt ?? 0),
    lastLikedAt: Number(habit.lastLikedAt ?? habit.lastLiked ?? 0),
    lastDislikedAt: Number(habit.lastDislikedAt ?? habit.lastDisliked ?? 0)
  };

  // Legacy aliases kept in sync until all readers are updated
  synced.plays = synced.weeklyPlays;
  synced.skips = synced.weeklySkips;
  synced.liked = synced.likedThisWeek;
  synced.disliked = synced.dislikedThisWeek;
  synced.lastPlayed = synced.lastPlayedAt;
  synced.lastSkip = synced.lastSkipAt;
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
      weeklyQuickSkips: habit.weeklyQuickSkips,
      weeklyDeepSkips: habit.weeklyDeepSkips,
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
    weeklyQuickSkips: 0,
    weeklyDeepSkips: 0,
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
  const sameTrack = app.state.currentTrack && getTrackId(app.state.currentTrack) === id;
  const duration = sameTrack
    ? Number(audioPlayer.duration || track.duration || 0)
    : Number(track.duration || 0);
  const currentTime = sameTrack ? Number(audioPlayer.currentTime || 0) : 0;
  const progress = duration > 0 ? (currentTime / duration) : 0;
  const quickSkip = (duration > 0 && progress <= 0.2) || (duration <= 0 && currentTime <= 15);
  const deepSkip = (duration > 0 && progress >= 0.55) || app.state.halfPlayedMark === id;

  habit.lifetimeSkips += 1;
  habit.weeklySkips += 1;
  habit.lastSkipAt = Date.now();

  if (quickSkip) {
    habit.lifetimeQuickSkips += 1;
    habit.weeklyQuickSkips += 1;
  } else if (deepSkip) {
    habit.lifetimeDeepSkips += 1;
    habit.weeklyDeepSkips += 1;
  }

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
    if (!app.state.smartMixHistory.includes(tid)) app.state.smartMixHistory.push(tid);

    if (rating === 'like') {
      if (artist) {
        app.state.smartMixSkipArtists = (app.state.smartMixSkipArtists || []).filter(name => name !== artist);
      }
      app.state.smartMixSessionSkips = (app.state.smartMixSessionSkips || []).filter(id => id !== tid);
      refreshSmartMixTail?.();
      ensureSmartMixBuffer?.(10);
    } else if (rating === 'dislike') {
      if (artist) {
        app.state.smartMixSkipArtists.unshift(artist);
        app.state.smartMixSkipArtists = app.state.smartMixSkipArtists.slice(0, 12);
      }
      if (!app.state.smartMixSessionSkips.includes(tid)) app.state.smartMixSessionSkips.push(tid);
      refreshSmartMixTail?.();
      ensureSmartMixBuffer?.(10);
    }
  }
}

function ensureCurrentWeekFlags() {
  finalizeWeekIfNeeded();
  loadUserHabits();
}

window.ensureCurrentWeekFlags = ensureCurrentWeekFlags;
window.finalizeWeekIfNeeded = finalizeWeekIfNeeded;

initializeUserStatsStorage();

function getRecommendationTier(score) {
  if (score >= 12) return 'Strong Match';
  if (score >= 7) return 'Good Fit';
  if (score >= 4) return 'Fresh Pick';
  return 'Wildcard';
}

function getStableSuggestionJitter(trackId, nonce = 0) {
  let hash = 0;
  const input = `${trackId}:${nonce}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

function createReason(weight, label) {
  return { weight, label };
}

function summarizeReasons(reasons = []) {
  const ordered = reasons
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .map(reason => reason.label)
    .filter((label, index, arr) => arr.indexOf(label) === index);

  return ordered.slice(0, 2);
}

function getSuggestionExplanation(tier, reasonLabels = []) {
  const filtered = reasonLabels.filter(label => {
    if (tier === 'Fresh Pick' && (label === 'Fresh pick' || label === 'Underplayed')) return false;
    return true;
  });

  return filtered[0] || '';
}

function getSuggestedRecommendations(tracks, options = {}) {
  finalizeWeekIfNeeded();
  const now = Date.now();
  const habits = loadUserHabits();
  const limit = Number(options.limit || 20);
  const modeKey = options.mode || getSuggestedTuneMode();
  const tune = getSuggestedTuneConfig(modeKey);
  const refreshNonce = Number(options.refreshNonce || 0);

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
    const reasons = [];
    const artistNorm = norm(track.artist);
    const albumNorm = norm(track.album);
    const genreNorm = norm(track.genre);

    const lowPlayBonus = Math.max(0, 4 - (habit.lifetimePlays || 0)) * tune.exploreWeight;
    if ((habit.lifetimePlays || 0) < 3) {
      score += lowPlayBonus;
      reasons.push(createReason(lowPlayBonus, (habit.lifetimePlays || 0) === 0 ? 'Fresh pick' : 'Underplayed'));
    }

    const likeBonus = (habit.likeCount || 0) * 2 * tune.affinityWeight;
    if (likeBonus > 0) {
      score += likeBonus;
      reasons.push(createReason(likeBonus, 'You liked this before'));
    }

    const weeklyLikeBonus = (habit.weeklyLikes || 0) * 3 * tune.affinityWeight;
    if (weeklyLikeBonus > 0) {
      score += weeklyLikeBonus;
      reasons.push(createReason(weeklyLikeBonus, 'Liked this week'));
    }

    const recentBonus = recencyScore(habit) * tune.recencyWeight;
    if (recentBonus > 0) {
      score += recentBonus;
      reasons.push(createReason(recentBonus, 'Recent positive signal'));
    }

    if (seedArtists.has(artistNorm)) {
      const artistBonus = 2 * tune.affinityWeight;
      score += artistBonus;
      reasons.push(createReason(artistBonus, 'Artist you like'));
    }
    if (seedAlbums.has(albumNorm)) {
      const albumBonus = 1 * tune.affinityWeight;
      score += albumBonus;
      reasons.push(createReason(albumBonus, 'Album you revisit'));
    }
    if (seedGenres.has(genreNorm)) {
      const genreBonus = 2 * tune.affinityWeight;
      score += genreBonus;
      reasons.push(createReason(genreBonus, 'Genre match'));
    }

    const quickSkipPenalty = (habit.lifetimeQuickSkips || 0) * tune.quickSkipPenalty;
    const deepSkipPenalty = (habit.lifetimeDeepSkips || 0) * tune.deepSkipPenalty;
    if (quickSkipPenalty > 0) score -= quickSkipPenalty;
    if (deepSkipPenalty > 0) score -= deepSkipPenalty;

    if ((habit.dislikeCount || 0) > 0 || (habit.weeklyDislikes || 0) > 0 || habit.dislikedThisWeek) {
      score -= 8;
    }

    if ((habit.lifetimePlays || 0) > 10) score -= 2;

    if ((habit.lifetimePlays || 0) > 8 && (habit.likeCount || 0) === 0) {
      score -= 1.5;
    }

    score += getStableSuggestionJitter(id, refreshNonce);

    const summaryReasons = summarizeReasons(reasons);

    return {
      track,
      score,
      habit,
      reasons,
      reasonLabels: summaryReasons,
      tier: getRecommendationTier(score)
    };
  });

  const filtered = scored.filter(obj =>
    (obj.habit.lifetimePlays || 0) < 10 &&
    !obj.habit.likedThisWeek &&
    !obj.habit.dislikedThisWeek &&
    (obj.habit.dislikeCount || 0) === 0 &&
    (obj.habit.lifetimeQuickSkips || 0) < 3 &&
    !((obj.habit.lifetimeSkips || 0) >= 5 && (obj.habit.likeCount || 0) === 0)
  );

  filtered.sort((a, b) => b.score - a.score);

  const picked = [];
  const artistSeen = new Map();
  const albumSeen = new Map();

  filtered.forEach(obj => {
    if (picked.length >= limit) return;

    const artistKey = norm(obj.track.artist);
    const albumKey = norm(obj.track.album);
    const artistCount = artistSeen.get(artistKey) || 0;
    const albumCount = albumSeen.get(albumKey) || 0;
    const allowOverflow = picked.length < 5;

    if (!allowOverflow) {
      if (artistKey && artistCount >= tune.diversityArtistCap) return;
      if (albumKey && albumCount >= tune.diversityAlbumCap) return;
    }

    picked.push(obj);
    if (artistKey) artistSeen.set(artistKey, artistCount + 1);
    if (albumKey) albumSeen.set(albumKey, albumCount + 1);
  });

  console.log("Top Suggestions:");
  picked.slice(0, 5).forEach(obj => {
    console.log(
      `${obj.track.title} (${obj.track.artist}) | Score: ${obj.score}`,
      obj.habit
    );
  });

  return picked.slice(0, limit).map(obj => ({
    ...obj,
    explanation: getSuggestionExplanation(obj.tier, obj.reasonLabels)
  }));
}

// Get suggested tracks
function getSuggestedTracks(tracks, limit = 20, options = {}) {
  return getSuggestedRecommendations(tracks, { ...options, limit }).map(item => item.track);
}

function resetTrackRatings(track) {
  finalizeWeekIfNeeded();

  const id = getTrackId(track);
  loadUserHabits();

  if (userHabits[id]) {
    delete userHabits[id];
    saveUserHabits();
  }

  const lastWeekStats = readJson(LAST_WEEK_STATS_KEY, {});
  if (lastWeekStats[id]) {
    delete lastWeekStats[id];
    localStorage.setItem(LAST_WEEK_STATS_KEY, JSON.stringify(lastWeekStats));
  }
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
window.getSuggestedRecommendations = getSuggestedRecommendations;
window.resetTrackRatings = resetTrackRatings;

// -- SUGGESTED SONGS MENU ---

function renderSuggestedMenu(direction = 'forward') {
  const allTracks = app.state.tracks || [];
  const allAlbums = app.state.albums || {};

  app.state.suggestedRefreshNonce = Number(app.state.suggestedRefreshNonce || 0);

  const buildSuggestedState = () => {
    const mode = getSuggestedTuneMode();
    const tune = getSuggestedTuneConfig(mode);
    const suggested = window.getSuggestedRecommendations
      ? window.getSuggestedRecommendations(allTracks, {
          limit: 20,
          mode,
          refreshNonce: app.state.suggestedRefreshNonce
        })
      : [];

    return { mode, tune, suggested };
  };

  let { mode: tuneMode, tune, suggested } = buildSuggestedState();

  if (!suggested.length) {
    renderScreen(
      `<div class="suggested-empty-state">
        <div class="suggested-empty-icon"><i class="fa-solid fa-star"></i></div>
        <div class="suggested-empty-title">Suggested Songs</div>
        <div class="suggested-empty-copy">
          Your recommendations will improve as you listen.<br>
          Play songs through, like what fits, and skip what you want less of.
        </div>
        <div class="suggested-empty-steps">
          <div>1. Play a few songs fully</div>
          <div>2. Like tracks you want more of</div>
          <div>3. Skip early when something is not for you</div>
        </div>
        <button id="suggestedEmptyTuneBtn" class="suggested-action-btn suggested-action-btn--secondary">
          Mode: ${tune.label}
        </button>
      </div>`,
      direction
    );

    const emptyTuneBtn = document.getElementById('suggestedEmptyTuneBtn');
    if (emptyTuneBtn) {
      emptyTuneBtn.onclick = () => {
        cycleSuggestedTuneMode();
        renderSuggestedMenu(direction);
      };
    }
    return;
  }

  app.state.currentMenuIndex = 0;

  renderScreen(
    `<div class="album-list suggested-layout">
      <div class="album-list-left suggested-pane" id="suggestedListContainer">
        <div class="suggested-pane-header">
          <div class="suggested-pane-heading">
            <div class="suggested-pane-title">Suggested</div>
            <div class="suggested-pane-subtitle" id="suggestedSubtitle">${tune.subtitle}</div>
          </div>
          <div class="suggested-pane-actions">
            <button id="suggestedTuneBtn" class="suggested-action-btn suggested-action-btn--secondary">${tune.label}</button>
            <button id="suggestedRefreshBtn" class="suggested-action-btn" title="Refresh Recommendations">
              <i class="fa-solid fa-shuffle"></i>
              <span>Shuffle</span>
            </button>
          </div>
        </div>
        <div id="suggestedList"></div>
      </div>
      <div class="album-list-right suggested-art-pane" id="suggestedArtContainer">
        <img id="suggestedArt" src="${allAlbums[suggested[0]?.track?.albumKey || suggested[0]?.track?.album]?.cover || 'src/img/default-cover.png'}" class="album-cover" alt="Album Cover">
      </div>
    </div>`,
    direction
  );

  const suggestedList = document.getElementById('suggestedList');
  const suggestedSubtitle = document.getElementById('suggestedSubtitle');
  const suggestedTuneBtn = document.getElementById('suggestedTuneBtn');
  const suggestedRefreshBtn = document.getElementById('suggestedRefreshBtn');
  const suggestedArt = document.getElementById('suggestedArt');

  const renderSuggestedHighlight = () => {
    const idx = app.state.currentMenuIndex;
    const rows = Array.from(suggestedList.querySelectorAll('.menu-list-song'));
    rows.forEach((row, rowIdx) => row.classList.toggle('active', rowIdx === idx));

    const current = suggested[idx] || suggested[0];
    if (!current) return;

    const albumObj = allAlbums[current.track.albumKey || current.track.album] || {};

    if (suggestedArt) suggestedArt.src = albumObj.cover || 'src/img/default-cover.png';
  };

  const renderSuggestedRows = () => {
    suggestedList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    suggested.forEach((item, idx) => {
      const track = item.track;
      const isNowPlaying = app.state.currentTrack && getTrackId(app.state.currentTrack) === getTrackId(track);
      const nowPlayingLabel = isNowPlaying
        ? `<span class="nowplaying-pill"><i class="fa-solid fa-play"></i></span>`
        : '';

      const row = document.createElement('div');
      row.className = 'menu-list-song suggested-song-row';
      row.dataset.idx = idx;
      row.innerHTML = `
        ${nowPlayingLabel}
        <div class="suggested-song-copy">
          <div class="suggested-song-topline">
            <span class="suggested-song-title">${track.title || 'Unknown Track'}</span>
            <span class="suggested-tier-pill">${item.tier}</span>
          </div>
          <div class="suggested-song-meta">${track.artist || 'Unknown Artist'}${track.album ? ` • ${track.album}` : ''}</div>
          ${item.explanation ? `<div class="suggested-song-reason">${item.explanation}</div>` : ''}
        </div>
      `;

      row.onclick = () => {
        app.state.currentMenuIndex = idx;
        renderSuggestedHighlight();
        playTrackFromAlbum(track, suggested.map(entry => entry.track));
      };

      fragment.appendChild(row);
    });

    suggestedList.appendChild(fragment);

    requestAnimationFrame(() => {
      renderSuggestedHighlight();

      if (!suggestedList.children.length) {
        renderSuggestedMenu('forward');
      }
    });
  };

  const refreshSuggestedView = ({ resetIndex = true, bumpNonce = false } = {}) => {
    if (bumpNonce) {
      app.state.suggestedRefreshNonce = Number(app.state.suggestedRefreshNonce || 0) + 1;
    }

    const nextState = buildSuggestedState();
    tuneMode = nextState.mode;
    tune = nextState.tune;
    suggested = nextState.suggested;

    if (!suggested.length) {
      renderSuggestedMenu('forward');
      return;
    }

    if (resetIndex) {
      app.state.currentMenuIndex = 0;
      suggestedList.scrollTop = 0;
    } else if (app.state.currentMenuIndex >= suggested.length) {
      app.state.currentMenuIndex = Math.max(0, suggested.length - 1);
    }

    if (suggestedSubtitle) suggestedSubtitle.textContent = tune.subtitle;
    if (suggestedTuneBtn) suggestedTuneBtn.textContent = tune.label;
    renderSuggestedRows();
  };

  if (suggestedRefreshBtn) {
    suggestedRefreshBtn.onclick = () => {
      refreshSuggestedView({ resetIndex: true, bumpNonce: true });
    };
  }

  if (suggestedTuneBtn) {
    suggestedTuneBtn.onclick = () => {
    cycleSuggestedTuneMode();
      refreshSuggestedView({ resetIndex: true, bumpNonce: true });
    };
  }

  window.updateHighlightedSong = () => renderSuggestedHighlight();
  renderSuggestedRows();

  const rows = suggestedList.querySelectorAll('.menu-list-song');
  if (rows[0]) {
    rows[0].scrollIntoView({ block: 'nearest' });
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

function getSmartMixLaneConfig(lane = 'blend') {
  return SMART_MIX_LANES[lane] || SMART_MIX_LANES.blend;
}

function getSmartMixExplanation(laneLabel, reasons = []) {
  if (!reasons.length) return laneLabel;
  return `${laneLabel}: ${reasons.slice(0, 2).join(' • ')}`;
}

function buildSmartMixChapterPlan(limit, modeConfig) {
  const plan = [];
  const sequence = modeConfig.sequence || ['blend'];
  const chapterSize = Math.max(1, Number(modeConfig.chapterSize || 3));
  let chapter = 0;

  while (plan.length < limit) {
    const lane = sequence[chapter % sequence.length] || 'blend';
    for (let pick = 0; pick < chapterSize && plan.length < limit; pick++) {
      plan.push({ lane, chapter: chapter + 1 });
    }
    chapter += 1;
  }

  return plan;
}

function resolveSmartMixSeedTrack(tracks, habits, explicitSeed) {
  if (explicitSeed) return explicitSeed;
  if (app.state.currentTrack) return app.state.currentTrack;

  const trackById = new Map(tracks.map(track => [getTrackId(track), track]));

  const topLike = Object.entries(habits)
    .sort((a, b) => (b[1].likeCount || 0) - (a[1].likeCount || 0))
    .find(([id]) => trackById.has(id));
  if (topLike) return trackById.get(topLike[0]);

  const topPlay = Object.entries(habits)
    .sort((a, b) => (b[1].lifetimePlays || 0) - (a[1].lifetimePlays || 0))
    .find(([id]) => trackById.has(id));
  if (topPlay) return trackById.get(topPlay[0]);

  return tracks[0] || null;
}

function storeSmartMixEntries(entries, { append = false } = {}) {
  const nextMeta = append ? { ...(app.state.smartMixTrackMeta || {}) } : {};

  entries.forEach((entry, index) => {
    const track = entry.track || entry;
    if (!track) return;

    const id = getTrackId(track);
    const lane = entry.lane || 'blend';
    const laneConfig = getSmartMixLaneConfig(lane);

    nextMeta[id] = {
      lane,
      laneLabel: entry.laneLabel || laneConfig.label,
      laneSummary: entry.laneSummary || laneConfig.summary,
      explanation: entry.explanation || laneConfig.summary,
      chapter: Number(entry.chapter || Math.floor(index / 3) + 1),
      score: Number(entry.score || 0)
    };
  });

  app.state.smartMixTrackMeta = nextMeta;
}

function getStoredSmartMixEntry(track, index = 0) {
  const meta = (app.state.smartMixTrackMeta || {})[getTrackId(track)] || {};
  const lane = meta.lane || 'blend';
  const laneConfig = getSmartMixLaneConfig(lane);

  return {
    track,
    lane,
    laneLabel: meta.laneLabel || laneConfig.label,
    laneSummary: meta.laneSummary || laneConfig.summary,
    explanation: meta.explanation || laneConfig.summary,
    chapter: Number(meta.chapter || Math.floor(index / 3) + 1),
    score: Number(meta.score || 0)
  };
}

function getSmartMixActiveEntries(limit = 24) {
  const queue = app.state.smartMixQueue || [];
  return queue.slice(0, limit).map((track, index) => getStoredSmartMixEntry(track, index));
}

function syncSmartMixSessionNote(entries, modeConfig = getSmartMixModeConfig()) {
  const current = entries && entries.length ? entries[0] : null;
  app.state.smartMixSessionNote = current?.laneSummary || modeConfig.subtitle;
}

function clearSmartMixSessionLearning() {
  app.state.smartMixSessionSkips = [];
  app.state.smartMixSkipArtists = [];
  app.state.smartMixLikedArtists = [];
  app.state.smartMixLikedAlbums = [];
  app.state.smartMixHeardArtists = [];
  app.state.smartMixRefreshNonce = Number(app.state.smartMixRefreshNonce || 0) + 1;

  if (app.state.smartMixActive) {
    refreshSmartMixTail();
    ensureSmartMixBuffer(10);
  }
}

function getSmartMixRecommendations(tracks, options = {}) {
  if (!tracks || !tracks.length) return [];

  finalizeWeekIfNeeded();

  const habits = loadUserHabits();
  const norm = s => (s || '').trim().toLowerCase();
  const modeKey = options.mode || getSmartMixMode();
  const modeConfig = getSmartMixModeConfig(modeKey);
  const refreshNonce = Number(options.refreshNonce || 0);
  const sessionSkips = new Set(options.sessionSkips || app.state.smartMixSessionSkips || []);
  const skipArtists = new Set((options.skipArtists || app.state.smartMixSkipArtists || []).map(norm));
  const likedArtists = new Set((options.likedArtists || app.state.smartMixLikedArtists || []).map(norm));
  const likedAlbums = new Set((options.likedAlbums || app.state.smartMixLikedAlbums || []).map(norm));
  const heardArtists = new Set((options.heardArtists || app.state.smartMixHeardArtists || []).map(norm));
  const excludeIds = new Set(options.excludeIds || []);
  const recentQueue = options.recentQueue || app.state.smartMixQueue || [];
  const recentWindow = recentQueue.slice(Math.max(0, recentQueue.length - 8));
  const recentArtistCounts = new Map();
  const recentAlbumCounts = new Map();

  recentWindow.forEach(track => {
    const artistKey = norm(track.artist);
    const albumKey = norm(track.album);
    if (artistKey) recentArtistCounts.set(artistKey, (recentArtistCounts.get(artistKey) || 0) + 1);
    if (albumKey) recentAlbumCounts.set(albumKey, (recentAlbumCounts.get(albumKey) || 0) + 1);
  });

  const seed = resolveSmartMixSeedTrack(tracks, habits, options.seedTrack);
  if (!seed) return [];

  const seedArtist = norm(seed.artist);
  const seedAlbum = norm(seed.album);
  const seedGenre = norm(seed.genre);

  const chapterPlan = buildSmartMixChapterPlan(Number(options.limit || 18), modeConfig);
  const picked = [];
  const usedIds = new Set(excludeIds);
  const artistSeen = new Map();
  const albumSeen = new Map();

  chapterPlan.forEach(step => {
    if (picked.length >= Number(options.limit || 18)) return;

    const laneConfig = getSmartMixLaneConfig(step.lane);

    const scored = tracks
      .filter(track => !usedIds.has(getTrackId(track)))
      .filter(track => getTrackId(track) !== getTrackId(seed))
      .map(track => {
        const id = getTrackId(track);
        const habit = syncHabitShape(habits[id] || {});
        const artistKey = norm(track.artist);
        const albumKey = norm(track.album);
        const genreKey = norm(track.genre);

        if ((habit.dislikeCount || 0) > 0 || (habit.weeklyDislikes || 0) > 0 || habit.dislikedThisWeek) return null;
        if (sessionSkips.has(id)) return null;
        if ((habit.lifetimeQuickSkips || 0) >= 3 && (habit.likeCount || 0) === 0) return null;

        let score = 0;
        const reasons = [];

        if (artistKey && artistKey === seedArtist) {
          score += laneConfig.artistWeight * modeConfig.affinityWeight;
          reasons.push('From the same artist');
        }

        if (albumKey && albumKey === seedAlbum) {
          score += laneConfig.albumWeight * modeConfig.affinityWeight;
          reasons.push('From the same album');
        }

        if (genreKey && seedGenre && genreKey === seedGenre) {
          score += laneConfig.genreWeight * modeConfig.affinityWeight;
          reasons.push('Similar sound');
        }

        if (likedArtists.has(artistKey)) {
          score += 3.2 * modeConfig.affinityWeight;
          reasons.push('You liked this artist');
        }

        if (likedAlbums.has(albumKey)) {
          score += 2.1 * modeConfig.affinityWeight;
          reasons.push('You liked this album');
        }

        if (heardArtists.has(artistKey)) {
          score += laneConfig.heardWeight;
          reasons.push('You listened through before');
        }

        if ((habit.likeCount || 0) > 0) {
          score += (habit.likeCount || 0) * laneConfig.likeWeight * 0.7;
          reasons.push('You liked this before');
        }

        if ((habit.lifetimePlays || 0) === 0) {
          score += 4.5 * laneConfig.lowPlayWeight * modeConfig.exploreWeight;
          reasons.push('Fresh pick');
        } else if ((habit.lifetimePlays || 0) < 4) {
          score += 2.3 * laneConfig.underplayedWeight * modeConfig.exploreWeight;
          reasons.push('Underplayed');
        }

        if ((habit.lifetimePlays || 0) > 10 && (habit.likeCount || 0) === 0) {
          score -= 2.4;
        }

        score -= (habit.lifetimeQuickSkips || 0) * laneConfig.quickSkipPenalty;
        score -= (habit.lifetimeDeepSkips || 0) * laneConfig.deepSkipPenalty;
        score -= (habit.lifetimeSkips || 0) * 1.25;

        if (skipArtists.has(artistKey)) score -= 8.5;
        if ((recentArtistCounts.get(artistKey) || 0) > 0) score -= laneConfig.repeatPenalty;
        if ((recentAlbumCounts.get(albumKey) || 0) > 1) score -= 2.8;

        if (step.lane === 'recovery' && ((habit.likeCount || 0) > 0 || heardArtists.has(artistKey) || artistKey === seedArtist)) {
          score += 2.4;
          reasons.push('Safer pick');
        }

        score += getStableSuggestionJitter(id, refreshNonce + step.chapter * 17);

        return {
          track,
          score,
          lane: step.lane,
          laneLabel: laneConfig.label,
          laneSummary: laneConfig.summary,
          chapter: step.chapter,
          reasonLabels: Array.from(new Set(reasons)).slice(0, 2),
          artistKey,
          albumKey
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const pickedEntry = scored.find(entry => {
      const artistCount = artistSeen.get(entry.artistKey) || 0;
      const albumCount = albumSeen.get(entry.albumKey) || 0;
      const allowOverflow = picked.length < 3;

      if (!allowOverflow && entry.artistKey && artistCount >= modeConfig.diversityArtistCap) return false;
      if (!allowOverflow && entry.albumKey && albumCount >= modeConfig.diversityAlbumCap) return false;

      return true;
    });

    if (!pickedEntry) return;

    usedIds.add(getTrackId(pickedEntry.track));
    if (pickedEntry.artistKey) artistSeen.set(pickedEntry.artistKey, (artistSeen.get(pickedEntry.artistKey) || 0) + 1);
    if (pickedEntry.albumKey) albumSeen.set(pickedEntry.albumKey, (albumSeen.get(pickedEntry.albumKey) || 0) + 1);

    picked.push({
      ...pickedEntry,
      explanation: getSmartMixExplanation(pickedEntry.laneLabel, pickedEntry.reasonLabels)
    });
  });

  return picked.slice(0, Number(options.limit || 18));
}

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

  const candidates = getSmartMixRecommendations(tracks, {
    seedTrack: seed,
    limit: Math.max(need * 4, 18),
    mode: getSmartMixMode(),
    refreshNonce: Number(app.state.smartMixRefreshNonce || 0),
    excludeIds: Array.from(history),
    recentQueue: queue.slice(Math.max(0, idx - 7), idx + 1)
  });

  const toAdd = candidates.slice(0, need);
  if (toAdd.length) {
    app.state.smartMixQueue = queue.concat(toAdd.map(entry => entry.track));
    app.state.currentAlbumSongs = app.state.smartMixQueue;
    storeSmartMixEntries(toAdd, { append: true });
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

  const tail = getSmartMixRecommendations(tracks, {
    seedTrack: seed,
    limit: 12,
    mode: getSmartMixMode(),
    refreshNonce: Number(app.state.smartMixRefreshNonce || 0),
    excludeIds: Array.from(history),
    recentQueue: head.slice(Math.max(0, head.length - 8))
  });

  app.state.smartMixQueue = head.concat(tail.map(entry => entry.track));
  app.state.currentAlbumSongs = app.state.smartMixQueue;

  const headEntries = head.map((track, index) => getStoredSmartMixEntry(track, index));
  storeSmartMixEntries(headEntries.concat(tail));
  syncSmartMixSessionNote(tail.length ? tail : headEntries);
}

function startSmartMixFromList(list, startIdx = 0) {
  if (!list || !list.length) return;

  finalizeWeekIfNeeded();

  const entries = list.map((entry, index) => {
    if (entry && entry.track) return entry;

    const laneConfig = getSmartMixLaneConfig('blend');
    return {
      track: entry,
      lane: 'blend',
      laneLabel: laneConfig.label,
      laneSummary: laneConfig.summary,
      explanation: laneConfig.summary,
      chapter: Math.floor(index / 3) + 1,
      score: 0
    };
  });
  const queueTracks = entries.map(entry => entry.track);
  const modeConfig = getSmartMixModeConfig();

  app.state.smartMixActive = true;
  const smStats = loadSmartMixStats();
  smStats.weekStarts = (smStats.weekStarts || 0) + 1;
  smStats.lifetimeStarts = (smStats.lifetimeStarts || 0) + 1;
  saveSmartMixStats(smStats);

  app.state.smartMixHistory = [];
  app.state.smartMixQueue = queueTracks.slice();
  app.state.smartMixSessionSkips = [];
  app.state.smartMixSkipArtists = [];
  app.state.smartMixLikedArtists = [];
  app.state.smartMixLikedAlbums = [];
  app.state.smartMixHeardArtists = [];
  app.state.smartMixRefreshNonce = Number(app.state.smartMixRefreshNonce || 0);
  app.state.currentAlbumSongs = app.state.smartMixQueue;
  app.state.currentSongIndex = startIdx;
  storeSmartMixEntries(entries);
  syncSmartMixSessionNote(entries, modeConfig);

  const seedTrack = app.state.smartMixQueue[startIdx];
  playTrackFromAlbum(seedTrack, app.state.smartMixQueue, { smartMix: true });

  app.state.smartMixHistory.push(getTrackId(seedTrack));
  ensureSmartMixBuffer(10);
}
window.ensureSmartMixBuffer = ensureSmartMixBuffer;
window.refreshSmartMixTail = refreshSmartMixTail;
window.startSmartMixFromList = startSmartMixFromList;

function getSmartMixTracks(tracks, seedTrack, limit = 30) {
  return getSmartMixRecommendations(tracks, {
    seedTrack,
    limit,
    mode: getSmartMixMode(),
    refreshNonce: Number(app.state.smartMixRefreshNonce || 0)
  }).map(entry => entry.track);
}

function renderSmartMixMenu(direction = 'forward') {
  const allTracks = app.state.tracks || [];

  app.state.smartMixRefreshNonce = Number(app.state.smartMixRefreshNonce || 0);

  if (!allTracks.length) {
    renderScreen(
      `<div class="smartmix-empty-state">
        <div class="smartmix-empty-icon"><i class="fa-solid fa-radio"></i></div>
        <div class="smartmix-empty-title">Smart Mix</div>
        <div class="smartmix-empty-copy">Load music to start a personal mix that updates as you listen.</div>
        <div class="smartmix-empty-steps">
          <div>1. Load your library</div>
          <div>2. Play and rate a few songs</div>
          <div>3. Let Smart Mix keep the mix going for you</div>
        </div>
      </div>`,
      direction
    );
    return;
  }

  const buildSmartMixState = () => {
    const mode = getSmartMixMode();
    const modeConfig = getSmartMixModeConfig(mode);
    const active = Boolean(app.state.smartMixActive && app.state.smartMixQueue?.length);
    const entries = active
      ? getSmartMixActiveEntries(24)
      : getSmartMixRecommendations(allTracks, {
          seedTrack: app.state.currentTrack || null,
          limit: 18,
          mode,
          refreshNonce: Number(app.state.smartMixRefreshNonce || 0)
        });

    return { mode, modeConfig, active, entries };
  };

  let state = buildSmartMixState();

  if (!state.entries.length) {
    renderScreen(
      `<div class="smartmix-empty-state">
        <div class="smartmix-empty-icon"><i class="fa-solid fa-wave-square"></i></div>
        <div class="smartmix-empty-title">Smart Mix</div>
        <div class="smartmix-empty-copy">Play a few songs through and use likes or skips so Smart Mix can learn what fits you.</div>
      </div>`,
      direction
    );
    return;
  }

  app.state.currentMenuIndex = 0;

  renderScreen(
    `<div class="smartmix-pane smartmix-pane--full" id="smartMixListContainer">
        <div class="smartmix-pane-header">
          <div class="smartmix-pane-heading">
            <div class="smartmix-pane-title">Smart Mix</div>
            <div class="smartmix-pane-subtitle" id="smartMixSubtitle">${state.active ? (app.state.smartMixSessionNote || state.modeConfig.subtitle) : state.modeConfig.subtitle}</div>
          </div>
          <div class="smartmix-session-badge" id="smartMixSessionBadge">${state.active ? 'Now Playing' : 'Ready to Start'}</div>
        </div>
        <div id="smartMixList" class="smartmix-list"></div>
    </div>`,
    direction
  );

  const smartMixList = document.getElementById('smartMixList');
  const smartMixSubtitle = document.getElementById('smartMixSubtitle');
  const smartMixSessionBadge = document.getElementById('smartMixSessionBadge');
  let rowState = [];

  const buildRows = () => {
    const actionRows = [
      {
        type: 'action',
        key: 'start',
        icon: 'fa-solid fa-play',
        title: state.active ? 'Start Again From Here' : 'Start Smart Mix',
        value: state.active ? 'On' : 'Ready',
        note: state.active
          ? 'Use the current song to rebuild the mix from here.'
          : 'Start this personal mix from the songs below.'
      },
      {
        type: 'action',
        key: 'mode',
        icon: 'fa-solid fa-sliders',
        title: 'Style',
        value: state.modeConfig.label,
        note: state.modeConfig.subtitle
      },
      {
        type: 'action',
        key: 'refresh',
        icon: 'fa-solid fa-shuffle',
        title: state.active ? 'Refresh Up Next' : 'Refresh Songs',
        value: 'New',
        note: 'Build a fresh set of songs without leaving Smart Mix.'
      },
      {
        type: 'action',
        key: 'clear',
        icon: 'fa-solid fa-eraser',
        title: 'Clear This Session',
        value: 'Reset',
        note: 'Forget temporary likes, skips and recent session signals.'
      }
    ];

    return actionRows.concat(
      state.entries.map((entry, index) => ({
        type: 'track',
        entry,
        entryIndex: index
      }))
    );
  };

  const updateSmartMixPane = (row) => {
    if (row?.type === 'track') {
      if (smartMixSubtitle) smartMixSubtitle.textContent = row.entry.explanation || row.entry.laneSummary || state.modeConfig.subtitle;
      if (smartMixSessionBadge) smartMixSessionBadge.textContent = `Set ${row.entry.chapter} • ${row.entry.laneLabel}`;
      return;
    }

    if (smartMixSubtitle) smartMixSubtitle.textContent = row?.note || state.modeConfig.subtitle;
    if (smartMixSessionBadge) smartMixSessionBadge.textContent = state.active ? 'Now Playing' : 'Ready to Start';
  };

  const renderSmartMixHighlight = () => {
    const rows = Array.from(smartMixList.querySelectorAll('.menu-list-song'));
    const idx = app.state.currentMenuIndex;
    rows.forEach((row, rowIdx) => row.classList.toggle('active', rowIdx === idx));
    updateSmartMixPane(rowState[idx] || rowState[0]);
  };

  const rerenderSmartMix = ({ resetIndex = false } = {}) => {
    state = buildSmartMixState();

    if (!state.entries.length) {
      renderSmartMixMenu('forward');
      return;
    }

    rowState = buildRows();

    if (resetIndex) {
      app.state.currentMenuIndex = 0;
      smartMixList.scrollTop = 0;
    } else if (app.state.currentMenuIndex >= rowState.length) {
      app.state.currentMenuIndex = Math.max(0, rowState.length - 1);
    }

    const fragment = document.createDocumentFragment();

    rowState.forEach((row, rowIndex) => {
      const item = document.createElement('div');
      item.className = row.type === 'action'
        ? 'menu-list-song smartmix-action-row'
        : 'menu-list-song smartmix-song-row';
      item.dataset.idx = rowIndex;

      if (row.type === 'action') {
        item.innerHTML = `
          <div class="smartmix-action-main">
            <span class="smartmix-action-icon"><i class="${row.icon}"></i></span>
            <div class="smartmix-action-copy">
              <div class="smartmix-action-title">${row.title}</div>
              <div class="smartmix-action-note">${row.note}</div>
            </div>
          </div>
          <span class="smartmix-action-value">${row.value}</span>
        `;

        item.onclick = () => {
          if (row.key === 'start') {
            if (state.active && app.state.currentTrack) {
              startSmartMixFromList(getSmartMixActiveEntries(24), Math.max(0, app.state.currentSongIndex || 0));
            } else {
              startSmartMixFromList(state.entries, 0);
            }
            rerenderSmartMix({ resetIndex: true });
            return;
          }

          if (row.key === 'mode') {
            cycleSmartMixMode();
            if (app.state.smartMixActive) {
              app.state.smartMixRefreshNonce = Number(app.state.smartMixRefreshNonce || 0) + 1;
              refreshSmartMixTail();
              ensureSmartMixBuffer(10);
            }
            rerenderSmartMix({ resetIndex: true });
            return;
          }

          if (row.key === 'refresh') {
            app.state.smartMixRefreshNonce = Number(app.state.smartMixRefreshNonce || 0) + 1;
            if (app.state.smartMixActive) {
              refreshSmartMixTail();
              ensureSmartMixBuffer(10);
            }
            rerenderSmartMix({ resetIndex: true });
            return;
          }

          if (row.key === 'clear') {
            clearSmartMixSessionLearning();
            rerenderSmartMix({ resetIndex: true });
          }
        };
      } else {
        const track = row.entry.track;
        const isNowPlaying = app.state.currentTrack && getTrackId(app.state.currentTrack) === getTrackId(track);
        const nowPlayingLabel = isNowPlaying
          ? `<span class="nowplaying-pill"><i class="fa-solid fa-play"></i></span>`
          : '';

        item.innerHTML = `
          ${nowPlayingLabel}
          <div class="smartmix-song-copy">
            <div class="smartmix-song-topline">
              <span class="smartmix-song-title">${track.title || 'Unknown Track'}</span>
              <span class="smartmix-lane-pill">${row.entry.laneLabel}</span>
            </div>
            <div class="smartmix-song-meta">${track.artist || 'Unknown Artist'}${track.album ? ` • ${track.album}` : ''}</div>
            <div class="smartmix-song-reason">${row.entry.explanation}</div>
          </div>
          <span class="smartmix-chapter-pill">Set ${row.entry.chapter}</span>
        `;

        item.onclick = () => {
          app.state.currentMenuIndex = rowIndex;

          if (!state.active) {
            startSmartMixFromList(state.entries, row.entryIndex);
            rerenderSmartMix({ resetIndex: false });
            return;
          }

          playTrackFromAlbum(track, app.state.smartMixQueue || state.entries.map(entry => entry.track), { smartMix: true });
          renderSmartMixHighlight();
        };
      }

      fragment.appendChild(item);
    });

    smartMixList.innerHTML = '';
    smartMixList.appendChild(fragment);

    requestAnimationFrame(() => {
      renderSmartMixHighlight();
    });
  };

  window.updateHighlightedSong = () => renderSmartMixHighlight();
  rerenderSmartMix({ resetIndex: true });
}
window.renderSmartMixMenu = renderSmartMixMenu;