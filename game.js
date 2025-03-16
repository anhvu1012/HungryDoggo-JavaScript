/** @type {HTMLCanvasElement} */ // Autovervollständigung

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

const canvasSize = {
  width: 500,
  height: 500
}

// DOM 
const gameStartButton = document.getElementById('startGame');
const gameStartDiv = document.getElementById('startGameDiv');
const gameEndDiv = document.getElementById('endGameDiv');
const endGameStatus = document.getElementById('endGameStatus');
const endScore = document.getElementById('endGameScore');

// ASSETS VORAB LADEN
const bg = new Image();
bg.src = 'assets/bg.png';

// Sprites für Animationen (Hund)
const dog_idle_right = new Image();
dog_idle_right.src = 'assets/Dog/Idle.png';
const dog_idle_left = new Image();
dog_idle_left.src = 'assets/Dog/Idle_left.png';
const dog_walk_right = new Image();
dog_walk_right.src = 'assets/Dog/Walk_right.png';
const dog_walk_left = new Image();
dog_walk_left.src = 'assets/Dog/Walk_left.png';
const dog_hurt = new Image();
dog_hurt.src = 'assets/Dog/Hurt.png';
const dog_die = new Image();
dog_die.src = 'assets/Dog/Death.png';

// Futter
const drumstick_img = new Image();
drumstick_img.src = 'assets/chicken_drumstick.png';
const chocolate_img = new Image();
chocolate_img.src = 'assets/icecream.png';

// Lebenssystem
const heart_full = new Image();
heart_full.src = 'assets/health/heart_full.png';
const heart_empty= new Image();
heart_empty.src = 'assets/health/heart_empty.png';

// Musik, Sound
const bg_music = new Audio('assets/sound/bg_music(edit).mp3'); 
bg_music.volume = 0.1;
const crunch = new Audio('assets/sound/crunch.mp3');

const animations = {
  idle_right: {image: dog_idle_right, numColumns: 4, fps: 5},
  idle_left: {image: dog_idle_left, numColumns: 4, fps: 5},
  walkRight: {image: dog_walk_right, numColumns: 6, fps: 12},
  walkLeft: {image: dog_walk_left, numColumns: 6, fps: 12},
  hurt: {image: dog_hurt, numColumns: 2, fps: 5},
  death: {image: dog_die, numColumns: 4, fps: 4}
}

let keys= {};
let points = 0;
let remainingTime = 30; // Timer 30 Sekunden
let isGameOver = true;
const full_lives = 5;
let chocolateDropStarted = false;

// define Player class
class Player {
  constructor(){
    this.x = canvasSize.width/2 - 40;
    this.y = canvasSize.height - 159;
    this.width = 80;
    this.height = 80;
    this.vx = 0;
    this.speed = 4;
    this.currentAnimation = 'idle_right';
    this.direction = 1 // Richtung rechts

    // Sprite-Rahmengröße 
    this.frameWidth = 48;
    this.frameHeight = 48;
    this.currentFrame = 0;
    this.lastFrameTime = 0;

    this.lives = 5; 
    this.isHurt = false; 
    this.hurtEndTime = 0;
    this.isDead = false;
    this.deathEndTime = 0;
  }

  draw(){
    // draw dog
    const animation = animations[this.currentAnimation];
    const frameX = this.currentFrame * this.frameWidth;
    const frameY = 0;
    context.drawImage(animation.image, frameX, frameY, this.frameWidth, this.frameHeight, this.x, this.y, this.width, this.height);
    // context.strokeRect(this.x, this.y, this.width, this.height); // Debug-Rechteck
  }

  setHurt(timeStamp){
    this.currentAnimation = 'hurt';
    this.isHurt = true;
    this.hurtEndTime = timeStamp + 1000; // Dauer 1s
  }

  update(timeStamp) {
    if (this.isHurt){
      if(timeStamp >= this.hurtEndTime){
        this.isHurt = false;
        this.currentAnimation = 'idle_left';
      }
    }
    if (!this.isHurt){
      // Bewegungen und AAnimationen des Hundes kontrollieren
      if (keys['ArrowLeft']) {
        this.vx = -this.speed;
        this.currentAnimation = 'walkLeft';
        this.direction = -1;
      } else if (keys['ArrowRight']) {
        this.vx = this.speed;
        this.currentAnimation = 'walkRight';
        this.direction = 1;
      } else {
        this.vx = 0;
        this.setIdleAnimation();
      }
      this.x += this.vx;
    }

    // Den Hund im Canvasbereich halten
    this.x = Math.max(0, Math.min(this.x, canvasSize.width - this.width));
  }

  // Animationswiedergabe kontrollieren
  updateAnimation(timeStamp){
    // aktuelle Animation updaten
    const animation = animations[this.currentAnimation];
    // Dauer eines Frames
    const frameDuration = 1000/animation.fps;
    // Prüf die vergangene Zeit zwischen 2 Frames
    if (timeStamp - this.lastFrameTime > frameDuration) {
      // nächster Sprite im Sprite-Sheet zeigen
      this.currentFrame = (this.currentFrame + 1) % animation.numColumns;
      this.lastFrameTime = timeStamp;
    }
  }

  setIdleAnimation(){
    if (this.direction === 1) {
      this.currentAnimation = 'idle_right';
    } else if (this.direction === -1) {
      this.currentAnimation = 'idle_left';
    }
  }
}

class Food {
  constructor(image, pointValue){
    this.image = image;
    this.pointValue = pointValue;
    this.x = 0;
    this.y = 0;
    this.size = 30;
    this.vy = 0;
    this.gravity = 981;
    this.bounciness = 0.3;
    this.hasBounced = false;
  }

  getRandomX(){
    return Math.floor(Math.random() * (canvasSize.width - this.size));
  }

  draw(){
    context.drawImage(this.image, this.x, this.y, this.size, this.size);
    // context.strokeRect(this.x, this.y, this.size, this.size); // Debug-Rechteck
  }

  update(){
    // Elemente fallen runter
    this.vy += this.gravity / 60; // Geschwindigkeiten pro Frame addieren, bei 60fps
    this.y += this.vy / 60; // neue Position pro Frame aktualisieren, bei 60fps

    // Position prüfen
    if (this.y + this.size >= player.y + player.height) {
      if (!this.hasBounced) {
        // Abpralleffekt
        this.vy = -this.vy * this.bounciness;
        this.hasBounced = true;
      }
    }
    // Zustand wechseln, wenn Schwellenwert erreicht
    const bounceHeightThreshold = player.y + 40;
    if (this.hasBounced && this.vy > 0 && this.y >= bounceHeightThreshold){
      this.reset();
    }
  }

  reset(){
    this.vy = 0; 
    this.y = 0;
    this.x = this.getRandomX();
    this.hasBounced = false;
  }

  checkCollision (){
    // Das Essen soll ungefähr bei dem Kopf des Hundes landen
    const isColliding = this.x + this.size >= player.x + 20 &&
            this.y + this.size >= player.y + 35 &&
            this.x <= player.x + player.width - 30;

    if (isColliding){
      points += this.pointValue;
    }

    return isColliding;
  }
}

const player = new Player();
const drumstick = new Food(drumstick_img, +1);
const chocolate = new Food(chocolate_img, -1);

// Timer-Einstellungen
let countdownTimer; // zum Speichern der Intervall-ID
function startTimer(){
  countdownTimer = setInterval(() => {
    remainingTime--;
    if (remainingTime === 0){
      gameOver();
    }
  }, 1000); 
}

document.addEventListener('keydown', (event) => {
  keys[event.key] = true; 
});
document.addEventListener('keyup', (event) => {
  keys[event.key] = false; 
});

function draw(){
  context.clearRect(0, 0, canvasSize.width, canvasSize.height);

  // Bg zeichnen
  context.drawImage(bg, 0, 0, canvasSize.width, canvasSize.height);

  player.draw();

  // Futter zeichnen
  drumstick.draw();
  if (chocolateDropStarted){
    chocolate.draw();
  }

  // Punktzahl 
  context.font = '700 25px Fredoka';
  context.fillStyle = 'white';
  context.fillText(`Score: ${points}`, 10, 30);

  // Timer
  context.fillText(`Remaining Time: ${remainingTime}`, 275, 30);

  // Leere Herzen hinter die vollen zeichnen(5)
  for (let i = 0; i < full_lives; i++){
    context.drawImage(heart_empty, 10 + i*25, 40, 25, 25);
  }
  // Volle Herzen (5)
  for (let i = 0; i < player.lives; i++){
    context.drawImage(heart_full, 10 + i*25, 40, 25, 25);
  }
}

function update(timeStamp){
  if (player.lives === 0 && !player.isDead){
    player.isDead = true;
    player.currentAnimation = 'death';
    deathEndTime = timeStamp + 900;
  }
  if(player.isDead){
    if(timeStamp >= deathEndTime){
      gameOver();
    }
  }

  player.update(timeStamp);

  drumstick.update();

  // Kollisionabfrage
  if (drumstick.checkCollision()) {
    crunch.play();
    drumstick.reset();
    console.log('ate');
  }

  if (!chocolateDropStarted && remainingTime <= 15){
    chocolateDropStarted = true;
    chocolate.reset();
  }

  if(chocolateDropStarted){
    chocolate.update();
    if (chocolate.checkCollision()){
      player.setHurt(performance.now());
      player.lives--;
      chocolate.reset();
      console.log('ate chocolate');
    }
  }
}

function gameOver(){
  isGameOver = true;
  clearInterval(countdownTimer);
  bg_music.pause();

  if (points >= 15){
    endGameStatus.style.color = '#28A745';
    endGameStatus.innerHTML = 'YOU WIN';
  } else {
    endGameStatus.style.color = '#DC3545';
    endGameStatus.innerHTML = 'YOU LOSE';
  }

  endScore.innerHTML = points;
  gameEndDiv.style.display = 'flex';
}

function gameLoop (timeStamp){
  if (isGameOver) return;
  player.updateAnimation(timeStamp);
  update(timeStamp);
  draw();
  requestAnimationFrame(gameLoop);
}

function startGame(){
  points = 0;
  remainingTime = 30;
  isGameOver = false;
  drumstick.reset();

  gameStartDiv.style.display = 'none';
  gameEndDiv.style.display = 'none';

  bg_music.loop = true;
  bg_music.play();

  startTimer();
  gameLoop();
}

gameStartButton.addEventListener('click', () => {
  startGame();
  // console.log('start game');
});
