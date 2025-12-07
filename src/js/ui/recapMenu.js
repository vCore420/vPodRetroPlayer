// --- WEEKLY RECAP MENU ---

// DEBUG: Set to true to always show Weekly Recap menu
const DEBUG_RECAP_ALWAYS_ON = false;

function renderWeeklyRecapMenu(direction = 'forward') {
  const lastWeek = JSON.parse(localStorage.getItem('lastWeekStats') || '{}');
  const totalPlays = Object.values(lastWeek).reduce((sum, h) => sum + (h.plays || 0), 0);
  const totalSkips = Object.values(lastWeek).reduce((sum, h) => sum + (h.skips || 0), 0);
  const totalLikes = Object.values(lastWeek).reduce((sum, h) => sum + (h.weeklyLikes || 0), 0);
  const totalDislikes = Object.values(lastWeek).reduce((sum, h) => sum + (h.weeklyDislikes || 0), 0);
  const mostPlayed = Object.entries(lastWeek)
    .sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0))[0];
  const mostLiked = Object.entries(lastWeek)
    .sort((a, b) => (b[1].weeklyLikes || 0) - (a[1].weeklyLikes || 0))[0];

  // Slides to show
  const slides = [
    { title: "Total Songs Played", value: totalPlays, icon: "fa-music" },
    { title: "Total Likes", value: totalLikes, icon: "fa-thumbs-up" },
    { title: "Total Skips", value: totalSkips, icon: "fa-forward-step" },
    { title: "Total Dislikes", value: totalDislikes, icon: "fa-thumbs-down" },
    {
    title: "Most Played",
    value: mostPlayed && mostPlayed[1].plays > 0
      ? `${mostPlayed[0].split('|')[0]} (${mostPlayed[1].plays} plays)`
      : "No data for last week",
    icon: "fa-star"
  },
  {
    title: "Most Liked",
    value: mostLiked && mostLiked[1].weeklyLikes > 0
      ? `${mostLiked[0].split('|')[0]} (${mostLiked[1].weeklyLikes} likes)`
      : "No data for last week",
    icon: "fa-heart"
  }
  ].filter(Boolean);

  let slideIdx = 0;

  function renderSlide(idx) {
  const slide = slides[idx];
  renderScreen(
    `<div id="recapSlideShow" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;">
      <div style="font-size:1.3em;font-weight:bold;margin-bottom:18px;color:#0074d9;text-shadow:0 2px 8px #4fc3f7;">Your Weekly Recap</div>
      <div class="recap-slide" style="width:100%;height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform 0.4s cubic-bezier(.4,1.3,.6,1);">
        <div style="font-size:2.5em;color:#0074d9;margin-bottom:18px;">
          <i class="fa-solid ${slide.icon}"></i>
        </div>
        <div style="font-size:1.2em;font-weight:bold;color:#222;text-align:center;margin-bottom:12px;">
          ${slide.title}
        </div>
        <div style="font-size:2em;color:#0074d9;font-weight:bold;text-align:center;">
          ${slide.value}
        </div>
      </div>
      <div style="margin-top:22px;text-align:center;font-size:1em;color:#0074d9;">
        <i class="fa-solid fa-arrow-left"></i> Use disk wheel to scroll <i class="fa-solid fa-arrow-right"></i>
      </div>
    </div>`,
    direction
  );
}

  renderSlide(slideIdx);

  // Disk scroll and mouse wheel logic
  window.onRecapScroll = function(direction) {
    const oldIdx = slideIdx;
    slideIdx += direction;
    if (slideIdx < 0) slideIdx = 0;
    if (slideIdx >= slides.length) slideIdx = slides.length - 1;
    if (slideIdx !== oldIdx) {
      // Animate slide out/in
      const recapDiv = document.getElementById('recapSlideShow');
      if (recapDiv) {
        recapDiv.querySelector('.recap-slide').style.transform = `translateX(${direction > 0 ? '-100%' : '100%'})`;
        setTimeout(() => {
          renderSlide(slideIdx);
        }, 350);
      } else {
        renderSlide(slideIdx);
      }
    }
  };

  // Mouse wheel support
  const recapDiv = document.getElementById('recapSlideShow');
  if (recapDiv) {
    recapDiv.onwheel = (e) => {
      if (e.deltaY > 0) window.onRecapScroll(1);
      else if (e.deltaY < 0) window.onRecapScroll(-1);
      e.preventDefault();
    };
  }
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