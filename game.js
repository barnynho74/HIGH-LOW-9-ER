import * as THREE from 'three';
import { CardManager } from './cardManager.js';
import { GameUI } from './gameUI.js';
import { Leaderboard } from './leaderboard.js';

export class Game {
  constructor(renderer, onExit, onRestart) {
    this.renderer = renderer;
    this.onExit = onExit;
    this.onRestart = onRestart;
    this.scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    
    this.deck = this.createDeck();
    this.gameGrid = [];
    this.selectedCard = null;
    this.hoveredCard = null;
    this.gameState = 'select'; // 'select', 'predict', 'animating', 'gameOver', 'paused'
    this.prePauseGameState = null;
    this.animations = [];
    this.usedCardCounts = {};
    
    this.setupScene();
    this.cardManager = new CardManager(this.scene);
    this.deckMesh = null;
    this.ui = new GameUI(this);
    this.leaderboard = new Leaderboard(this.ui);
    this.setupGame();
    this.setupInput();
  }

  createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    suits.forEach(suit => {
      ranks.forEach((rank, index) => {
        deck.push({
          suit,
          rank,
          value: index + 2, // 2=2, 3=3, ..., K=13, A=14
          id: `${rank}_${suit}`
        });
      });
    });
    
    return this.shuffleDeck(deck);
  }

  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  setupScene() {
    // Simple lighting for 2D
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);
    // Green table surface
    const tableGeometry = new THREE.PlaneGeometry(20, 15);
    const tableMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x228B22 // Forest Green
    });
    this.table = new THREE.Mesh(tableGeometry, tableMaterial);
    this.table.rotation.x = -Math.PI / 2;
    this.scene.add(this.table);
    // Camera position
    this.camera.position.set(0, 9, 1);
    this.camera.lookAt(0, 0, 0);
  }

  setupGame() {
    // Initialize used card counts
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    ranks.forEach(rank => {
      this.usedCardCounts[rank] = 0;
    });
    // Deal 9 cards for the 3x3 grid
    for (let i = 0; i < 9; i++) {
      const card = this.deck.pop();
      const row = Math.floor(i / 3);
      const col = i % 3;
      
      const cardObj = this.cardManager.createCard(card, row, col);
      this.gameGrid.push({
        card,
        mesh: cardObj,
        active: true,
        row,
        col
      });
    }
    // Count the initial grid cards as used
    this.gameGrid.forEach(gridItem => {
        this.usedCardCounts[gridItem.card.rank]++;
    });
    this.createDeckMesh();
    this.ui.updateDeckCount(this.deck.length);
    this.ui.updateUsedCards(this.usedCardCounts);
    this.updateProbabilities();
  }
  setupInput() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.renderer.domElement.addEventListener('click', this.boundHandleClick);
    this.renderer.domElement.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }
  handleClick(event) {
    if (this.gameState === 'paused') return;
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this.gameState === 'select' || this.gameState === 'predict') {
      this.handleCardClick();
    }
  }
  handleMouseMove(event) {
    if (this.gameState === 'paused') return;
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.handleCardHover();
  }
  handleKeyDown(event) {
    if (this.gameState !== 'predict') return;
    if (event.key === 'w' || event.key === 'W') {
      this.makePrediction(true);
    } else if (event.key === 's' || event.key === 'S') {
      this.makePrediction(false);
    }
  }
  handleCardHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const activeCards = this.gameGrid.filter(item => item.active).map(item => item.mesh);
    const intersects = this.raycaster.intersectObjects(activeCards, true);
    const newHoveredCard = intersects.length > 0
      ? this.gameGrid.find(item => item.mesh === (intersects[0].object.parent || intersects[0].object))
      : null;
    if (newHoveredCard !== this.hoveredCard) {
      this.hoveredCard = newHoveredCard;
      this.updateHighlights();
    }
    this.renderer.domElement.style.cursor = this.hoveredCard ? 'pointer' : 'default';
  }

  handleCardClick() {
    const activeCards = this.gameGrid.filter(item => item.active).map(item => item.mesh);
    const intersects = this.raycaster.intersectObjects(activeCards, true);
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object.parent || intersects[0].object;
      const cardItem = this.gameGrid.find(item => item.mesh === clickedMesh);
      if (cardItem && cardItem.active) {
        if (this.selectedCard === cardItem) {
          this.deselectCard();
        } else {
          this.selectCard(cardItem);
        }
      }
    } else {
      // If no card was clicked, deselect any currently selected card
      if (this.selectedCard) {
        this.deselectCard();
      }
    }
  }
  setCardAnimation(mesh, targetY) {
    // Remove any existing vertical animation for this mesh to avoid conflicts
    this.animations = this.animations.filter(anim => anim.mesh !== mesh);
    this.animations.push({ mesh, targetY });
  }
  selectCard(cardItem) {
    if (this.selectedCard && this.selectedCard !== cardItem) {
      this.setCardAnimation(this.selectedCard.mesh, 0.02);
    }
    this.selectedCard = cardItem;
    this.setCardAnimation(cardItem.mesh, 0.3);
    this.gameState = 'predict';
    this.ui.showPredictionUI(true);
    this.updateHighlights();
  }
  deselectCard() {
    if (!this.selectedCard) return;
    this.setCardAnimation(this.selectedCard.mesh, 0.02);
    this.selectedCard = null;
    this.gameState = 'select';
    this.ui.showPredictionUI(false);
    this.updateHighlights();
  }
  makePrediction(isHigher) {
    if (!this.selectedCard || this.deck.length === 0) return;
    const nextCard = this.deck.pop();
    this.usedCardCounts[nextCard.rank]++;
    this.ui.updateUsedCards(this.usedCardCounts);
    const currentValue = this.selectedCard.card.value;
    const nextValue = nextCard.value;
    
    let correct = false;
    if (isHigher && nextValue > currentValue) correct = true;
    if (!isHigher && nextValue < currentValue) correct = true;
    this.ui.showPredictionUI(false);
    if (!correct) {
      this.ui.showPredictionResult(nextCard, correct);
    }
    // Directly replace the card without animation
    this.replaceCard(this.selectedCard, nextCard, correct);
    this.updateDeckMesh();
    this.updateProbabilities();
  }
  replaceCard(targetCardItem, newCardData, isCorrect) {
    // Update the actual grid card data
    targetCardItem.card = newCardData;
    this.cardManager.updateCard(targetCardItem.mesh, newCardData);
    // Animate the card back down
    this.setCardAnimation(targetCardItem.mesh, 0.02);
    if (isCorrect) {
        this.cardManager.flashCard(targetCardItem.mesh, 0x00ff00, true);
    } else {
        targetCardItem.active = false;
        this.cardManager.deactivateCard(targetCardItem.mesh);
        this.cardManager.flashCard(targetCardItem.mesh, 0xff0000, false);
    }
    
    // Unhighlight is now handled by the flash animation completion
    this.selectedCard = null;
    this.gameState = 'select';
    this.updateHighlights();
    
    this.ui.updateDeckCount(this.deck.length);
    this.ui.updateActiveCount(this.gameGrid.filter(item => item.active).length);
    
    this.checkGameEnd();
  }
  checkGameEnd() {
    const activeCards = this.gameGrid.filter(item => item.active).length;
    
    if (this.deck.length === 0 || activeCards === 0) {
      const score = this.deck.length;
      const isHighScore = this.leaderboard.scores.length < 10 || score < this.leaderboard.scores[this.leaderboard.scores.length - 1].score;
      if (isHighScore) {
        this.ui.showHighScoreInput(score);
      } else {
        this.leaderboard.leaderboardEl.classList.add('visible');
      }
      if (this.deck.length === 0) {
        this.ui.showGameStatus('Victory! You used the entire deck!');
      } else {
        this.ui.showGameStatus('Game Over! No more active cards.');
      }
    }
  }
  destroy() {
    this.renderer.domElement.removeEventListener('click', this.boundHandleClick);
    this.renderer.domElement.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    // Clear the scene to ensure nothing is left for the next game instance
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }
  togglePause() {
    if (this.gameState === 'paused') {
      this.resume();
    } else {
      this.pause();
    }
  }
  pause() {
    if (this.gameState === 'gameOver' || this.gameState === 'paused') return;
    this.prePauseGameState = this.gameState;
    this.gameState = 'paused';
    this.ui.showPauseMenu(true);
  }
  resume() {
    if (this.gameState !== 'paused') return;
    this.gameState = this.prePauseGameState;
    this.ui.showPauseMenu(false);
  }
  exitToMenu() {
    if (this.onExit) {
      this.onExit();
    }
  }
  restart() {
    if (this.onRestart) {
      this.onRestart();
    }
  }
  updateHighlights() {
    this.gameGrid.forEach(item => {
      if (item.active) {
        if (item === this.selectedCard) {
          this.cardManager.highlightCard(item.mesh, 0x90ee90); // Light green for selected
        } else if (item === this.hoveredCard) {
          this.cardManager.highlightCard(item.mesh, 0xffff00); // Yellow for hovered
        } else {
          this.cardManager.unhighlightCard(item.mesh);
        }
      } else {
        this.cardManager.unhighlightCard(item.mesh);
      }
    });
  }
  updateProbabilities() {
    const remainingDeckSize = this.deck.length;
    if (remainingDeckSize === 0) {
      this.ui.updateProbabilities({ 'LOW': 0, 'MID': 0, 'HIGH': 0 });
      return;
    }
    const groups = {
        'LOW': ['2', '3', '4', '5'],
        'MID': ['6', '7', '8', '9'],
        'HIGH': ['10', 'J', 'Q', 'K', 'A']
    };
    const initialCounts = { 'LOW': 16, 'MID': 16, 'HIGH': 20 };
    const probabilities = {};
    for (const groupName in groups) {
        let remainingInGroup = initialCounts[groupName];
        groups[groupName].forEach(rank => {
            remainingInGroup -= this.usedCardCounts[rank];
        });
        probabilities[groupName] = (remainingInGroup / remainingDeckSize) * 100;
    }
    this.ui.updateProbabilities(probabilities);
  }
  createDeckMesh() {
    const cardHeight = 0.05;
    const geometry = new THREE.BoxGeometry(1.2, cardHeight, 1.8);
    const material = new THREE.MeshLambertMaterial({ color: 0x607d8b }); // Blue Grey
    this.deckMesh = new THREE.Mesh(geometry, material);
    const x = -4; // Position left of the grid
    const z = 0;
    this.deckMesh.position.set(x, 0, z);
    this.scene.add(this.deckMesh);
    this.updateDeckMesh(true); // Initial setup
  }
  updateDeckMesh(isInitial = false) {
    if (!this.deckMesh) return;
    const deckThickness = 0.01;
    const newHeight = this.deck.length * deckThickness;
    // Prevent scaling to zero which can cause issues
    if (newHeight <= 0) {
      this.deckMesh.visible = false;
      return;
    }
    this.deckMesh.scale.y = newHeight / 0.05; // 0.05 is the initial geometry height
    this.deckMesh.position.y = newHeight / 2;
  }
  update() {
    if (this.gameState === 'paused') return;
    this.cardManager.update();
    // Process animations
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i];
      const mesh = anim.mesh;
      const diff = anim.targetY - mesh.position.y;
      
      if (Math.abs(diff) < 0.01) {
        mesh.position.y = anim.targetY;
        this.animations.splice(i, 1);
      } else {
        mesh.position.y += diff * this.cardManager.animationSpeed;
      }
    }
  }
}