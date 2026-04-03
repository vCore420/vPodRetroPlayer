// --- USER HABITS TRACKING & SUGGESTIONS ---

// Data structure for user habits
const USER_HABITS_KEY = 'userHabits';
const USER_STATS_META_KEY = 'userStatsMeta';
const USER_STATS_SCHEMA_KEY = 'userStatsSchemaVersion';
const USER_STATS_SCHEMA_VERSION = 1;
const LAST_WEEK_STATS_KEY = 'lastWeekStats';
const LAST_WEEK_SMART_MIX_STARTS_KEY = 'lastWeekSmartMixStarts';
const SUGGESTED_TUNE_MODE_KEY = 'suggestedTuneMode';

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