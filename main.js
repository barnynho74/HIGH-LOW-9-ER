import * as THREE from 'three';
import { Game } from './game.js';

class App {
  constructor() {
    this.initRenderer();
    this.game = null;
    this.setupMenu();
    this.animate();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.game) {
        this.game.togglePause();
      }
    });
  }
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x2c1810);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.onWindowResize());
  }
  setupMenu() {
    const startGameBtn = document.getElementById('start-game-btn');
    const howToPlayBtn = document.getElementById('how-to-play-btn');
    const closeHowToPlayBtn = document.getElementById('close-how-to-play-btn');
    const mainMenu = document.getElementById('main-menu');
    const howToPlayModal = document.getElementById('how-to-play-modal');
    startGameBtn.addEventListener('click', () => {
      mainMenu.style.display = 'none';
      this.startGame();
    });
    howToPlayBtn.addEventListener('click', () => {
      howToPlayModal.classList.add('visible');
    });
    closeHowToPlayBtn.addEventListener('click', () => {
      howToPlayModal.classList.remove('visible');
    });
  }
  startGame() {
    document.getElementById('ui-container').style.display = 'block';
    this.game = new Game(this.renderer, this.returnToMenu.bind(this), this.restartGame.bind(this));
  }
  restartGame() {
    if (this.game) {
      this.game.destroy();
    }
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.classList.remove('visible');
    }
    this.game = new Game(this.renderer, this.returnToMenu.bind(this), this.restartGame.bind(this));
  }
  returnToMenu() {
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }
    document.getElementById('ui-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.classList.remove('visible');
    }
  }
  onWindowResize() {
    if (this.game) {
      this.game.camera.aspect = window.innerWidth / window.innerHeight;
      this.game.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.game) {
      this.game.update();
      this.renderer.render(this.game.scene, this.game.camera);
    } else {
      // If there's no active game, clear the renderer to hide the last frame
      this.renderer.clear();
    }
  }
}

new App();