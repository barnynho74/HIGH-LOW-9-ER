export class GameUI {
  constructor(game) {
    this.game = game;
    this.setupUI();
  }

  setupUI() {
    this.deckCountEl = document.getElementById('deck-count');
    this.activeCountEl = document.getElementById('active-count');
    this.predictionUI = document.getElementById('prediction-ui');
    this.gameStatus = document.getElementById('game-status');
    this.statusText = document.getElementById('status-text');
    this.resultInfoEl = document.getElementById('result-info');
    this.usedCardsListEl = document.getElementById('used-cards-list');
    this.usedCardsToggle = document.querySelector('#used-cards-info h4');
    this.probabilityListEl = document.getElementById('probability-list');
    this.pauseMenuEl = document.getElementById('pause-menu');
    this.usedCardsToggle.addEventListener('click', () => {
      this.toggleUsedCards();
    });
    document.getElementById('pause-btn').addEventListener('click', () => this.game.togglePause());
    document.getElementById('resume-game-btn').addEventListener('click', () => this.game.togglePause());
    document.getElementById('back-to-menu-btn').addEventListener('click', () => this.game.exitToMenu());
    document.getElementById('restart-game-btn').addEventListener('click', () => this.game.restart());
    document.getElementById('lower-btn').addEventListener('click', () => {
      this.game.makePrediction(false);
    });
    
    document.getElementById('higher-btn').addEventListener('click', () => {
      this.game.makePrediction(true);
    });
    document.getElementById('save-score-btn').addEventListener('click', () => {
      const nameInput = document.getElementById('player-name-input');
      const score = parseInt(nameInput.dataset.score, 10);
      const name = nameInput.value.trim() || 'Anonymous';
      this.game.leaderboard.addScore({ score, name });
      document.getElementById('highscore-entry').style.display = 'none';
      this.game.leaderboard.leaderboardEl.classList.add('visible');
      document.getElementById('play-again-container').style.display = 'block';
    });
  }

  updateDeckCount(count) {
    this.deckCountEl.textContent = count;
  }

  updateActiveCount(count) {
    this.activeCountEl.textContent = count;
  }

  showPredictionUI(show) {
    if (show) {
      this.predictionUI.classList.add('active');
    } else {
      this.predictionUI.classList.remove('active');
    }
  }

  showGameStatus(message) {
    this.statusText.textContent = message;
    this.gameStatus.style.display = 'block';
    document.getElementById('play-again-container').style.display = 'block';
  }
  showHighScoreInput(score) {
    this.statusText.textContent = this.game.deck.length === 0 ? 'Victory!' : 'Game Over!';
    document.getElementById('game-status').style.display = 'block';
    document.getElementById('highscore-entry').style.display = 'block';
    document.getElementById('play-again-container').style.display = 'none';
    const nameInput = document.getElementById('player-name-input');
    nameInput.dataset.score = score;
    nameInput.focus();
  }
  showPauseMenu(show) {
    if (show) {
      this.pauseMenuEl.classList.add('visible');
    } else {
      this.pauseMenuEl.classList.remove('visible');
    }
  }
  showPredictionResult(nextCard, isCorrect) {
    const cardName = `${nextCard.rank} of ${nextCard.suit.charAt(0).toUpperCase() + nextCard.suit.slice(1)}`;
    const message = `The card was: ${cardName}.`;
    
    this.resultInfoEl.textContent = message;
    this.resultInfoEl.style.color = isCorrect ? '#4CAF50' : '#F44336';
    this.resultInfoEl.style.borderColor = isCorrect ? '#4CAF50' : '#F44336';
    this.resultInfoEl.style.opacity = '1';
    this.resultInfoEl.style.bottom = '120px';
    setTimeout(() => {
        this.resultInfoEl.style.opacity = '0';
        this.resultInfoEl.style.bottom = '110px';
    }, 2500); // Hide after 2.5 seconds
  }
  updateUsedCards(counts) {
    this.usedCardsListEl.innerHTML = ''; // Clear the list
    const groups = {
        'LOW CARDS': ['2', '3', '4', '5'],
        'MIDDLE CARDS': ['6', '7', '8', '9'],
        'HIGH CARDS': ['10', 'J', 'Q', 'K', 'A']
    };
    for (const groupName in groups) {
        const header = document.createElement('div');
        header.className = 'card-group-header';
        header.textContent = groupName;
        this.usedCardsListEl.appendChild(header);
        groups[groupName].forEach(rank => {
            const count = counts[rank] || 0;
            const li = document.createElement('li');
            const rankText = document.createElement('span');
            rankText.textContent = `${rank}: ${count}/4`;
            const progressBarContainer = document.createElement('div');
            progressBarContainer.className = 'progress-bar-container';
            const progressBarFill = document.createElement('div');
            progressBarFill.className = 'progress-bar-fill';
            progressBarFill.style.width = `${(count / 4) * 100}%`;
            progressBarContainer.appendChild(progressBarFill);
            li.appendChild(rankText);
            li.appendChild(progressBarContainer);
            this.usedCardsListEl.appendChild(li);
        });
    }
  }
  updateProbabilities(probabilities) {
    this.probabilityListEl.innerHTML = '';
    for (const groupName in probabilities) {
      const prob = probabilities[groupName];
      const li = document.createElement('li');
      li.innerHTML = `<span>${groupName}:</span> <span>${prob.toFixed(1)}%</span>`;
      this.probabilityListEl.appendChild(li);
    }
  }
  toggleUsedCards() {
      const icon = this.usedCardsToggle.querySelector('.toggle-icon');
      this.usedCardsListEl.classList.toggle('collapsed');
      if (this.usedCardsListEl.classList.contains('collapsed')) {
          icon.style.transform = 'rotate(-90deg)';
      } else {
          icon.style.transform = 'rotate(0deg)';
      }
  }
}