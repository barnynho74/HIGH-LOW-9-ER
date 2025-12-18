export class Leaderboard {
  constructor(gameUI) {
    this.gameUI = gameUI;
    this.scores = this.loadScores();
    this.leaderboardEl = document.getElementById('leaderboard');
    this.leaderboardListEl = document.getElementById('leaderboard-list');
    this.setupEventListeners();
    this.renderScores();
  }

  loadScores() {
    const scoresJSON = localStorage.getItem('highScores');
    return scoresJSON ? JSON.parse(scoresJSON) : [];
  }

  saveScores() {
    localStorage.setItem('highScores', JSON.stringify(this.scores));
  }

  addScore(cardsPlayed) {
    const newScore = cardsPlayed;

    this.scores.push(newScore);
    this.scores.sort((a, b) => a.score - b.score); // Sort ascending (fewer cards left is better)
    this.scores = this.scores.slice(0, 10); // Keep top 10
    this.saveScores();
    this.renderScores();
    return this.scores.findIndex(s => s === newScore);
  }

  removeScore(index) {
    this.scores.splice(index, 1);
    this.saveScores();
    this.renderScores();
  }

  renderScores() {
    this.leaderboardListEl.innerHTML = '';
    if (this.scores.length === 0) {
      this.leaderboardListEl.innerHTML = '<li>No high scores yet!</li>';
      return;
    }
    this.scores.forEach((score, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${index + 1}.</span>
        <span style="font-weight: bold;">${score.name || 'Anonymous'}</span>
        <span>${score.score} cards left</span>
        <span>${score.date}</span>
        <button class="remove-score-btn" data-index="${index}">×</button>
      `;
      this.leaderboardListEl.appendChild(li);
    });
  }

  setupEventListeners() {
    // For showing/hiding the leaderboard
    document.getElementById('leaderboard-btn').addEventListener('click', () => {
      this.leaderboardEl.classList.toggle('visible');
    });

    document.getElementById('close-leaderboard-btn').addEventListener('click', () => {
      this.leaderboardEl.classList.remove('visible');
    });

    // For removing a score
    this.leaderboardListEl.addEventListener('click', (event) => {
      if (event.target.classList.contains('remove-score-btn')) {
        const index = parseInt(event.target.dataset.index, 10);
        this.removeScore(index);
      }
    });
  }
}