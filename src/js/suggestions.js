// --- USER HABITS TRACKING & SUGGESTIONS ---

// Data structure for user habits
let userHabits = JSON.parse(localStorage.getItem('userHabits')) || {};

// Get a unique track ID
function getTrackId(track) {
  return `${track.title}|${track.artist}|${track.album}`;
}

// Log when a song is played
function logTrackPlay(track) {
  const id = getTrackId(track);
  if (!userHabits[id]) userHabits[id] = { plays: 0, lastPlayed: 0, skips: 0, liked: false, disliked: false };
  userHabits[id].plays += 1;
  userHabits[id].lastPlayed = Date.now();
  saveUserHabits();
}

// Log when a song is skipped (next/prev before halfway)
function logTrackSkip(track) {
  const id = getTrackId(track);
  if (!userHabits[id]) userHabits[id] = { plays: 0, lastPlayed: 0, skips: 0, liked: false, disliked: false };
  userHabits[id].skips += 1;
  saveUserHabits();
}

// Log when a song is liked/disliked
function setTrackRating(track, rating) {
  const id = getTrackId(track);
  if (!userHabits[id]) userHabits[id] = { plays: 0, lastPlayed: 0, skips: 0, liked: false, disliked: false };
  userHabits[id].liked = rating === 'like';
  userHabits[id].disliked = rating === 'dislike';
  saveUserHabits();
}

// Save habits to localStorage
function saveUserHabits() {
  localStorage.setItem('userHabits', JSON.stringify(userHabits));
}

// Get suggested tracks
function getSuggestedTracks(tracks, limit = 20) {
  const seedArtists = new Set();
  const seedAlbums = new Set();
  Object.entries(userHabits).forEach(([id, habit]) => {
    if (habit.liked || habit.plays > 0) {
      const [title, artist, album] = id.split('|');
      if (artist) seedArtists.add(artist);
      if (album) seedAlbums.add(album);
    }
  });

  const albumSuggestionCount = {};

  const scored = tracks
    .map(track => {
      const id = getTrackId(track);
      const habit = userHabits[id] || {};
      let score = 0;
      // Habit-based scoring
      if (habit.liked) score += 10;
      if (habit.disliked) score -= 10;
      score += (habit.plays || 0) * 2;
      score -= (habit.skips || 0);
      if (habit.lastPlayed && Date.now() - habit.lastPlayed < 7 * 24 * 3600 * 1000) score += 5;
      // Similarity scoring: only for tracks with no habit data
      if (
        !habit.liked &&
        !habit.plays &&
        !habit.disliked &&
        !habit.skips
      ) {
        if (seedAlbums.has(track.album)) score += 1; // Lower album bonus
        if (seedArtists.has(track.artist)) score += 2; // Lower artist bonus
      }
      return { track, score, habit };
    })
    // Only include tracks with at least one play, like, dislike, skip, or similarity
    .filter(obj =>
      obj.habit.plays > 0 ||
      obj.habit.liked ||
      obj.habit.disliked ||
      obj.habit.skips > 0 ||
      (seedArtists.has(obj.track.artist) && !obj.habit.plays && !obj.habit.liked && !obj.habit.disliked && !obj.habit.skips) ||
      (seedAlbums.has(obj.track.album) && !obj.habit.plays && !obj.habit.liked && !obj.habit.disliked && !obj.habit.skips)
    )
    .sort((a, b) => b.score - a.score)
    // Limit number of suggestions per album
    .filter(obj => {
      const album = obj.track.album;
      albumSuggestionCount[album] = (albumSuggestionCount[album] || 0) + 1;
      return albumSuggestionCount[album] <= 2; // max 2 per album
    });

  // Debug: Show top 5 suggestions
  console.log("Top Suggestions:");
  scored.slice(0, 5).forEach(obj => {
    console.log(
      `${obj.track.title} (${obj.track.artist}) | Score: ${obj.score}`,
      obj.habit
    );
  });

  return scored.slice(0, limit).map(obj => obj.track);
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

// Export functions for use in other files
window.logTrackPlay = logTrackPlay;
window.logTrackSkip = logTrackSkip;
window.setTrackRating = setTrackRating;
window.getSuggestedTracks = getSuggestedTracks;