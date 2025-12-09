// --- USER HABITS TRACKING & SUGGESTIONS ---

// Data structure for user habits
let userHabits = JSON.parse(localStorage.getItem('userHabits')) || {};

// Get/Set last stats reset timestamp
function getLastStatsReset() {
  return parseInt(localStorage.getItem('userStatsLastReset') || '0', 10);
}
function setLastStatsReset(ts) {
  localStorage.setItem('userStatsLastReset', ts.toString());
}

// Get a unique track ID
function getTrackId(track) {
  return `${track.title}|${track.artist}|${track.album}`;
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
  } else if (rating === 'dislike') {
    userHabits[id].dislikeCount = (userHabits[id].dislikeCount || 0) + 1;
    userHabits[id].weeklyDislikes = (userHabits[id].weeklyDislikes || 0) + 1;
    userHabits[id].disliked = true;
    userHabits[id].liked = false;
  } else {
    // neutral / clear (if you want to support it)
    userHabits[id].liked = false;
    userHabits[id].disliked = false;
  }
  saveUserHabits();
}

// Save habits to localStorage
function saveUserHabits() {
  localStorage.setItem('userHabits', JSON.stringify(userHabits));
}

// Get suggested tracks
function getSuggestedTracks(tracks, limit = 20) {
  const now = Date.now();
  const habits = JSON.parse(localStorage.getItem('userHabits')) || {};

  // Gather seed data from liked songs
  const seedArtists = new Set();
  const seedAlbums = new Set();
  const seedGenres = new Set();
  const seedBPMs = [];
  Object.entries(habits).forEach(([id, habit]) => {
    if (habit.likeCount > 0) {
      const [title, artist, album] = id.split('|');
      const track = tracks.find(t => getTrackId(t) === id);
      seedArtists.add(artist);
      seedAlbums.add(album);
      if (track && track.genre) seedGenres.add(track.genre);
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

    // Similarity to liked songs
    if (seedArtists.has(track.artist)) score += 2;
    if (seedAlbums.has(track.album)) score += 1;
    if (seedGenres.has(track.genre)) score += 2;

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

  renderSongList({
    songs: suggested,
    onSongClick: (track, idx) => {
      app.state.currentMenuIndex = idx;
      playTrackFromAlbum(track, suggested);
    },
    albumCover: allAlbums[suggested[0]?.album]?.cover
  }, direction);
}