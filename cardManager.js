import * as THREE from 'three';

export class CardManager {
  constructor(scene) {
    this.scene = scene;
    this.cardMeshes = [];
    this.animatedCards = new Map();
    this.animationSpeed = 0.1;
  }
  createCard(cardData, row, col) {
    const cardGroup = new THREE.Group();
    
    // Card base
    const cardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
    // Card face texture
    const faceTexture = this.createCardTexture(cardData);
    const faceMaterial = new THREE.MeshBasicMaterial({ 
      map: faceTexture,
      transparent: true
    });
    
    // Create card as a single plane
    const cardGeometry = new THREE.PlaneGeometry(1.2, 1.8);
    const cardMesh = new THREE.Mesh(cardGeometry, faceMaterial);
    cardMesh.rotation.x = -Math.PI / 2;
    cardGroup.add(cardMesh);
    
    // Create outline
    // Use a Shape to create a hollow frame so the center is always transparent
    const shape = new THREE.Shape();
    // Outer rectangle (1.3 x 1.9)
    shape.moveTo(-0.65, -0.95);
    shape.lineTo(0.65, -0.95);
    shape.lineTo(0.65, 0.95);
    shape.lineTo(-0.65, 0.95);
    shape.lineTo(-0.65, -0.95);
    
    // Inner rectangle (hole matching card size 1.2 x 1.8)
    const hole = new THREE.Path();
    hole.moveTo(-0.6, -0.9);
    hole.lineTo(0.6, -0.9);
    hole.lineTo(0.6, 0.9);
    hole.lineTo(-0.6, 0.9);
    hole.lineTo(-0.6, -0.9);
    shape.holes.push(hole);
    const outlineGeometry = new THREE.ShapeGeometry(shape);
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
    
    // Position slightly below the card (Y axis is Up/Down in world, but locally rotated)
    // Since we rotate the outline mesh -90 deg X, its local Z points World Up.
    // But position is relative to parent cardGroup. cardGroup has Y as UP.
    // We want outline BELOW the card. Card is at Y=0 (local to group).
    outlineMesh.position.set(0, -0.01, 0); 
    outlineMesh.rotation.x = -Math.PI / 2;
    outlineMesh.visible = false;
    cardGroup.add(outlineMesh);
    cardMesh.userData.outline = outlineMesh; // Link for easy access
    // Position in grid
    const x = (col - 1) * 1.5;
    const z = (row - 1) * 2.2;
    cardGroup.position.set(x, 0.02, z); // Elevate slightly above table
    // Don't add to scene immediately if it's for animation
    if (row !== -1 || col !== -1) {
        this.scene.add(cardGroup);
    }
    
    this.cardMeshes.push(cardGroup);
    
    return cardGroup;
  }
  removeCardMesh(cardMesh) {
    const index = this.cardMeshes.indexOf(cardMesh);
    if (index > -1) {
        this.cardMeshes.splice(index, 1);
    }
  }

  createCardTexture(cardData) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    // Card background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Add a subtle paper texture/noise
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let i = 0; i < 20000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // Suit color
    const isRed = cardData.suit === 'hearts' || cardData.suit === 'diamonds';
    ctx.fillStyle = isRed ? '#dc143c' : '#000000';

    // Rank in corners
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(cardData.rank, 20, 50);
    ctx.save();
    ctx.rotate(Math.PI);
    ctx.fillText(cardData.rank, -canvas.width + 20, -canvas.height + 50);
    ctx.restore();

    // Suit symbols
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    
    ctx.fillText(suitSymbols[cardData.suit], canvas.width / 2, canvas.height / 2 + 20);
    
    // Small suit symbols in corners
    ctx.font = '20px Arial';
    ctx.fillText(suitSymbols[cardData.suit], 20, 80);
    ctx.save();
    ctx.rotate(Math.PI);
    ctx.fillText(suitSymbols[cardData.suit], -canvas.width + 20, -canvas.height + 80);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  updateCard(cardMesh, newCardData) {
    const faceMesh = cardMesh.children[0];
    const newTexture = this.createCardTexture(newCardData);
    faceMesh.material.map = newTexture;
    faceMesh.material.needsUpdate = true;
  }

  highlightCard(cardMesh, color) {
    const mainCard = cardMesh.children[0];
    if (mainCard && mainCard.userData.outline) {
      mainCard.userData.outline.material.color.setHex(color);
      mainCard.userData.outline.material.opacity = 1.0;
      mainCard.userData.outline.visible = true;
    }
  }
  unhighlightCard(cardMesh) {
    const mainCard = cardMesh.children[0];
    if (mainCard && mainCard.userData.outline) {
      mainCard.userData.outline.visible = false;
    }
  }
  flashCard(cardMesh, color, wasCorrect) {
    const mainCard = cardMesh.children[0];
    if (!mainCard || !mainCard.userData.outline) return;
    this.animatedCards.set(cardMesh, {
      type: 'flash',
      outline: mainCard.userData.outline,
      color,
      startTime: Date.now(),
      duration: 800, // 0.8 seconds
      wasCorrect: wasCorrect
    });
  }

  deactivateCard(cardMesh) {
    // Hide the card's face texture by replacing the material
    const faceMesh = cardMesh.children[0];
    faceMesh.material = new THREE.MeshBasicMaterial({ color: 0x666666 });
    faceMesh.material.needsUpdate = true;
  }

  update() {
    const now = Date.now();
    
    this.animatedCards.forEach((anim, cardMesh) => {
      if (anim.type === 'flash') {
        const elapsed = now - anim.startTime;
        if (elapsed >= anim.duration) {
          // Animation finished
          // Animation finished
          anim.outline.visible = false; // Reset visibility
          this.animatedCards.delete(cardMesh);
        } else {
          // Animate it
          // Animate it
          anim.outline.visible = true;
          const flashColor = new THREE.Color(anim.color);
          // Pulsing effect using Math.sin
          const intensity = (Math.sin(elapsed * 0.02) * 0.5) + 0.5; // oscillates between 0 and 1
          anim.outline.material.color.copy(flashColor.lerp(new THREE.Color(0xffffff), 1 - intensity));
          anim.outline.material.opacity = intensity * 0.5 + 0.5; // Stay visible
        }
      }
    });
  }
}