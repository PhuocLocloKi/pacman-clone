let board;
const rowCount = 21;
const columnCount = 43;
const tileSize = 32;
const boardWidth = columnCount * tileSize;
const boardHeight = rowCount * tileSize;
let context;

let blueGhostImage, orangeGhostImage, pinkGhostImage, redGhostImage, scaredGhostImage;
let pacmanUpImage, pacmanDownImage, pacmanLeftImage, pacmanRightImage;
let wallImage, cherryImage; 

let timeDisplay, livesDisplay, scoreDisplay, highScoreDisplay;
let highScore = localStorage.getItem("pacmanHighScore") || 0; 
let startTime;
let timerInterval;
let timeElapsed = 0;

// MAP CONFIGURATION
const tileMap = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "X O   X             X                         X     O X",
    "X XXX X XXX X XXXXX X X XXXXXXXXXXXXXXX  XXXX X XXXXX X",
    "X X   X X   X X   X   X                     X X X   X X",
    "X XXXXX XXXXX X X XXXXXXXXXXXXXXXXXXX X X XXXXX XXXXX X",
    "X               X X                 X X X             X",
    "XXXX XX XXXXX X X X XXXXXXXXXXXXXXX X X X XXXXX XXXXXXX",
    "X     X X   X X X X X             X X X X X   X X     X",
    "X XXX X XX XX X X X X XXXXX-XXXXX X X X X XXXXX X XXX X",
    "X X           X X X X X  b p o  X X X X X           X X",
    "X XXX X XXX X X X   X XXXXXXXXXXX X X   X XXXXX X XXX X",
    "X     X X   X X X X X      r      X X X X X   X X     X",
    "XXXXXXX XXXXX X X X XX XXXXXXXXXXXX X X X XXXXX XXXXXXX",
    "X             X X X                 X X X             X",
    "X XXXXX XX XX X X XXXXXXX  XXXXXXXXXX X X XXXXX XXXXX X",
    "X X   X X   X X X                     X X X   X X   X X",
    "X X XXX XXXXX X XXXXXXXXXXXXXXXXXXXXXXX X XXXXX XXXXX X",
    "X             X            P            X             X",
    "X XXXXXXXXXXXXXXXXXXX XXXXXXXXX XXXXXXXXXXXXXXXXXXXXX X",
    "X                     X       X                     X X",
    "X XXXXXXXXXXXXXXXXXXXXX XXXXX XXXXXXXXXXXXXXXXXXXXXXX X",
    "X O                                                 O X",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
];

// GAME OBJECTS
const walls = new Set();
const foods = new Set();
const powerPellets = new Set();
const ghosts = new Set();
let pacman;

let cherry = null;
let nextCherryTime = 20000; 

const directions = ['U', 'D', 'L', 'R'];
let score = 0;
let lives = 3;
let gameOver = false;
let gameWon = false; 

// AUDIO SETUP 
const soundBeginning = new Audio("./sounds/pacman_beginning.wav");
const soundChomp = new Audio("./sounds/pacman_chomp.wav");
const soundDeath = new Audio("./sounds/pacman_death.wav");
const soundIntermission = new Audio("./sounds/pacman_intermission.wav");
const soundEatFruit = new Audio("./sounds/pacman_eatfruit.wav"); 
const soundEatGhost = new Audio("./sounds/pacman_eatghost.wav"); 

soundBeginning.volume = 0.4;
soundChomp.volume = 0.15; 
soundDeath.volume = 0.5;
soundIntermission.volume = 0.4;
soundEatFruit.volume = 0.6;
soundEatGhost.volume = 0.7;

// UTILITY: Play Sound Effect
function playSFX(audio) {
    audio.currentTime = 0; 
    audio.play().catch(e => {}); 
}

// MAIN: Initialization 
// Entry point: Sets up canvas, loads assets, builds map, and starts loop.
window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d"); 

    timeDisplay = document.getElementById("time-display");
    livesDisplay = document.getElementById("lives-display");
    scoreDisplay = document.getElementById("score-display");
    highScoreDisplay = document.getElementById("high-score-display");

    loadImages();
    loadMap();
    
    updateHUD(); 
    update();
    document.addEventListener("keydown", movePacman); 
}

// GAME LOGIC: Timer 
function startTimer() {
    if (timerInterval) return; 
    startTime = Date.now() - timeElapsed; 
    timerInterval = setInterval(() => {
        if(gameOver || gameWon) {
            clearInterval(timerInterval);
            timerInterval = null;
            return;
        }
        timeElapsed = Date.now() - startTime;
        let totalSeconds = Math.floor(timeElapsed / 1000);
        let mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        let secs = (totalSeconds % 60).toString().padStart(2, '0');
        let ms = Math.floor((timeElapsed % 1000) / 10).toString().padStart(2, '0'); 
        if(timeDisplay) timeDisplay.innerText = `${mins}:${secs}.${ms}`;
    }, 10);
}

// UI: Update Heads-Up Display 
function updateHUD() {
    if(scoreDisplay) scoreDisplay.innerText = score;
    if(livesDisplay) {
        let livesText = "";
        for(let i = 0; i < lives; i++) livesText += "🟡"; 
        livesDisplay.innerText = livesText || "💀"; 
    }
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("pacmanHighScore", highScore);
    }
    if(highScoreDisplay) highScoreDisplay.innerText = highScore;
}

// ASSETS: Load Sprites 

function loadImages() {
    wallImage = new Image(); wallImage.src = "./images/wall.png";
    blueGhostImage = new Image(); blueGhostImage.src = "./images/blueGhost.png";
    orangeGhostImage = new Image(); orangeGhostImage.src = "./images/orangeGhost.png";
    pinkGhostImage = new Image(); pinkGhostImage.src = "./images/pinkGhost.png";
    redGhostImage = new Image(); redGhostImage.src = "./images/redGhost.png";
    scaredGhostImage = new Image(); scaredGhostImage.src = "./images/scaredGhost.png"; 
    pacmanUpImage = new Image(); pacmanUpImage.src = "./images/pacmanUp.png";
    pacmanDownImage = new Image(); pacmanDownImage.src = "./images/pacmanDown.png";
    pacmanLeftImage = new Image(); pacmanLeftImage.src = "./images/pacmanLeft.png";
    pacmanRightImage = new Image(); pacmanRightImage.src = "./images/pacmanRight.png";
    cherryImage = new Image(); cherryImage.src = "./images/cherry.png"; 
}

// SETUP: Build Level

function loadMap() {
    walls.clear(); foods.clear(); powerPellets.clear(); ghosts.clear();
    cherry = null; 
    nextCherryTime = timeElapsed + 20000;

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
            const tileMapChar = tileMap[r][c];
            const x = c*tileSize; const y = r*tileSize;

            if (tileMapChar == 'X') { 
                walls.add(new Block(wallImage, x, y, tileSize, tileSize)); 
            }
            else if (tileMapChar == '-') {
                let door = new Block(null, x, y, tileSize, tileSize);
                door.isDoor = true; walls.add(door);
            }
            else if (tileMapChar == 'O') { 
                powerPellets.add(new Block(null, x + 8, y + 8, 16, 16)); 
            }
            else if (tileMapChar == 'r') { 
                let ghost = new Block(redGhostImage, x, y, tileSize, tileSize);
                ghost.updateDirection(directions[Math.floor(Math.random()*4)]);
                ghosts.add(ghost); 
            }
            else if (tileMapChar == 'p') { 
                let ghost = new Block(pinkGhostImage, x, y, tileSize, tileSize);
                ghost.trapDelay = 5000; ghost.isTrapped = true; ghost.releaseTime = timeElapsed + 5000;
                ghosts.add(ghost); 
            }
            else if (tileMapChar == 'b') { 
                let ghost = new Block(blueGhostImage, x, y, tileSize, tileSize);
                ghost.trapDelay = 10000; ghost.isTrapped = true; ghost.releaseTime = timeElapsed + 10000;
                ghosts.add(ghost); 
            }
            else if (tileMapChar == 'o') { 
                let ghost = new Block(orangeGhostImage, x, y, tileSize, tileSize);
                ghost.trapDelay = 15000; ghost.isTrapped = true; ghost.releaseTime = timeElapsed + 15000;
                ghosts.add(ghost); 
            }
            else if (tileMapChar == 'P') { pacman = new Block(pacmanRightImage, x, y, tileSize, tileSize); }
            else if (tileMapChar == ' ') { foods.add(new Block(null, x + 14, y + 14, 4, 4)); }
        }
    }
}

// CORE: Game Loop 

function update() {
    if (gameOver || gameWon) {
        draw(); 
        return;
    }
    move();
    draw();
    setTimeout(update, 50); 
}

// RENDER: Draw Frame 
function draw() {
    context.clearRect(0, 0, board.width, board.height);
    context.lineJoin = "round"; 
    context.lineWidth = 3;      
    for (let wall of walls.values()) {
        if (wall.isDoor) {
            context.shadowBlur = 15; context.shadowColor = "#ff69b4"; context.fillStyle = "#ff69b4";
            context.fillRect(wall.x, wall.y + tileSize/2 - 2, wall.width, 4);
            context.shadowBlur = 0; continue;
        }

        context.shadowBlur = 25; context.shadowColor = "#0088ff"; context.fillStyle = "#000814";    
        context.fillRect(wall.x + 2, wall.y + 2, wall.width - 4, wall.height - 4);

        context.shadowBlur = 0;
        let gradient = context.createLinearGradient(wall.x, wall.y, wall.x + wall.width, wall.y + wall.height);
        gradient.addColorStop(0, "rgba(0, 220, 255, 0.9)");   
        gradient.addColorStop(0.5, "rgba(0, 100, 255, 0.8)"); 
        gradient.addColorStop(1, "rgba(0, 40, 150, 0.9)");    

        context.fillStyle = gradient;
        context.fillRect(wall.x + 5, wall.y + 5, wall.width - 10, wall.height - 10);
        context.strokeStyle = "rgba(180, 240, 255, 0.6)";
        context.strokeRect(wall.x + 5, wall.y + 5, wall.width - 10, wall.height - 10);
    }
    context.shadowBlur = 0; 
    if (cherry) {
        context.shadowBlur = 15; context.shadowColor = "#ff0000";
        context.drawImage(cherry.image, cherry.x, cherry.y, cherry.width, cherry.height);
        context.shadowBlur = 0;
    }

    context.save(); 
    context.shadowBlur = 25; context.shadowColor = "#ffff00"; context.globalAlpha = 0.7;       
    context.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);
    context.shadowBlur = 0; context.globalAlpha = 1.0;       
    context.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);
    context.restore(); 

    for (let ghost of ghosts.values()) {
        context.save();
        let glowColor = "#ffffff"; 
        let currentImage = ghost.image;

        if (ghost.isScared) {
            currentImage = scaredGhostImage;
            glowColor = "#0000ff"; 
            if (ghost.scaredEndTime - timeElapsed < 2000) {
                if (Math.floor(timeElapsed / 200) % 2 === 0) glowColor = "#ffffff";
            }
        } else {
            if (ghost.image === redGhostImage) glowColor = "#ff0000";      
            else if (ghost.image === pinkGhostImage) glowColor = "#ff69b4"; 
            else if (ghost.image === blueGhostImage) glowColor = "#00ffff"; 
            else if (ghost.image === orangeGhostImage) glowColor = "#ffaa00";
        }

        context.shadowBlur = 20; context.shadowColor = glowColor; context.globalAlpha = 0.6; 
        context.drawImage(currentImage, ghost.x, ghost.y, ghost.width, ghost.height);
        context.shadowBlur = 0; context.globalAlpha = 1.0;
        context.drawImage(currentImage, ghost.x, ghost.y, ghost.width, ghost.height);
        context.restore();
    }

    let pulse = Math.abs(Math.sin(Date.now() / 200)); 
    
    for (let food of foods.values()) {
        context.beginPath(); context.arc(food.x + food.width/2, food.y + food.height/2, 3, 0, 2 * Math.PI);
        context.fillStyle = "rgba(255, 255, 255, " + (0.5 + pulse * 0.5) + ")";
        context.shadowBlur = 5; context.shadowColor = "white"; context.fill();
    }

    for (let pellet of powerPellets.values()) {
        context.beginPath(); context.arc(pellet.x + pellet.width/2, pellet.y + pellet.height/2, 8, 0, 2 * Math.PI);
        context.fillStyle = "rgba(255, 255, 100, " + (0.5 + pulse * 0.5) + ")";
        context.shadowBlur = 15; context.shadowColor = "yellow"; context.fill();
    }
    context.shadowBlur = 0; 

    if (gameOver || gameWon) {
        context.fillStyle = "rgba(0, 5, 15, 0.75)"; context.fillRect(0, 0, board.width, board.height);
        let screenPulse = Math.abs(Math.sin(Date.now() / 300)); 
        context.textAlign = "center"; context.textBaseline = "middle"; context.font = "bold 65px 'Courier New'";

        if (gameOver) {
            context.shadowBlur = 20 + (screenPulse * 25); context.shadowColor = "#ff0055"; context.fillStyle = "#ff0055";
            context.fillText("GAME OVER", board.width / 2, board.height / 2 - 20);
        } 
        else if (gameWon) {
            context.shadowBlur = 20 + (screenPulse * 25); context.shadowColor = "#00ffcc"; context.fillStyle = "#00ffcc";
            context.fillText("YOU WIN!", board.width / 2, board.height / 2 - 20);
        }

        context.font = "bold 22px 'Courier New'";
        context.shadowBlur = 10 + (screenPulse * 10); context.shadowColor = "#ffff00"; context.fillStyle = "#ffff00";
        context.globalAlpha = 0.3 + (screenPulse * 0.7); 
        context.fillText("PRESS ANY KEY TO PLAY AGAIN", board.width / 2, board.height / 2 + 40);
        context.globalAlpha = 1.0; context.shadowBlur = 0; 
    }
}

// PHYSICS: Movement & Collision Logic

function move() {
    
    // Cherry Logic: Spawns cherry periodically
    if (timeElapsed > nextCherryTime && !cherry) {
        cherry = new Block(cherryImage, 21 * tileSize, 13 * tileSize, tileSize, tileSize);
        cherry.despawnTime = timeElapsed + 10000; 
        nextCherryTime = timeElapsed + 20000;
    }
    if (cherry) {
        if (timeElapsed > cherry.despawnTime) cherry = null; 
        else if (collision(pacman, cherry)) {
            score += 100; updateHUD(); playSFX(soundEatFruit); cherry = null;
        }
    }

    // Move Pacman
    pacman.x += pacman.velocityX;
    pacman.y += pacman.velocityY;

    for (let wall of walls.values()) {
        if (collision(pacman, wall)) {
            pacman.x -= pacman.velocityX; pacman.y -= pacman.velocityY; break;
        }
    }

    // Move Ghosts
    for (let ghost of ghosts.values()) {
        
        if (ghost.isScared && timeElapsed > ghost.scaredEndTime) {
            ghost.isScared = false; 
        }

        if (ghost.isTrapped) {
            ghost.y += (ghost.velocityY || 2);
            if (ghost.y > ghost.startY + 4 || ghost.y < ghost.startY - 4) ghost.velocityY = -(ghost.velocityY || 2);
            
            if (timeElapsed >= ghost.releaseTime) {
                ghost.isTrapped = false;
                ghost.x = 21 * tileSize; 
                ghost.y = 9 * tileSize; 
                ghost.updateDirection('L'); 
            }
            continue; 
        }

        // Pacman Collision with Ghost
        if (collision(ghost, pacman)) {
            if (ghost.isScared) {
                playSFX(soundEatGhost);
                score += 200; updateHUD();
                ghost.x = ghost.startX; ghost.y = ghost.startY;
                ghost.isTrapped = true;
                ghost.isScared = false;
                ghost.releaseTime = timeElapsed + 3000; 
            } else {
                soundDeath.play(); 
                lives -= 1; updateHUD(); 
                if (lives == 0) { gameOver = true; return; }
                resetPositions();
            }
        }

        if (ghost.y == tileSize*9 && ghost.direction != 'U' && ghost.direction != 'D') ghost.updateDirection('U');

        ghost.x += ghost.velocityX; ghost.y += ghost.velocityY;
        for (let wall of walls.values()) {
            if (collision(ghost, wall) || ghost.x <= 0 || ghost.x + ghost.width >= boardWidth) {
                ghost.x -= ghost.velocityX; ghost.y -= ghost.velocityY;
                const newDirection = directions[Math.floor(Math.random()*4)];
                ghost.updateDirection(newDirection);
            }
        }
    }
    
    // Eating Logic
    let foodEaten = null;
    for (let food of foods.values()) {
        if (collision(pacman, food)) {
            foodEaten = food; score += 10; updateHUD(); playSFX(soundChomp); break;
        }
    }
    foods.delete(foodEaten);
    
    let pelletEaten = null;
    for (let pellet of powerPellets.values()) {
        if (collision(pacman, pellet)) {
            pelletEaten = pellet;
            score += 50; updateHUD();
            for (let ghost of ghosts.values()) {
                if (!ghost.isTrapped) {
                    ghost.isScared = true;
                    ghost.scaredEndTime = timeElapsed + 7000; 
                }
            }
            break;
        }
    }
    powerPellets.delete(pelletEaten);
    
    if (foods.size == 0 && powerPellets.size == 0) {
        soundIntermission.play(); gameWon = true; 
    }
}

// INPUT: Handle Controls
function movePacman(e) {
    if(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) e.preventDefault();
    startTimer();
    if (soundBeginning.paused && score == 0 && lives == 3) soundBeginning.play().catch(err => {});

    if (gameOver || gameWon) {
        loadMap(); resetPositions();
        lives = 3; score = 0; gameOver = false; gameWon = false;
        timeElapsed = 0; if(timeDisplay) timeDisplay.innerText = "00:00.00";
        updateHUD(); update(); return;
    }

    if (e.code == "ArrowUp" || e.code == "KeyW") pacman.updateDirection('U');
    else if (e.code == "ArrowDown" || e.code == "KeyS") pacman.updateDirection('D');
    else if (e.code == "ArrowLeft" || e.code == "KeyA") pacman.updateDirection('L');
    else if (e.code == "ArrowRight" || e.code == "KeyD") pacman.updateDirection('R');

    if (pacman.direction == 'U') pacman.image = pacmanUpImage; 
    else if (pacman.direction == 'D') pacman.image = pacmanDownImage; 
    else if (pacman.direction == 'L') pacman.image = pacmanLeftImage; 
    else if (pacman.direction == 'R') pacman.image = pacmanRightImage; 
}

// UTILITY: Collision Detection 

function collision(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;    
}

// GAME STATE: Reset Positions
function resetPositions() {
    pacman.reset(); pacman.velocityX = 0; pacman.velocityY = 0;
    for (let ghost of ghosts.values()) {
        ghost.reset();
        ghost.isScared = false; 
        if (ghost.trapDelay) {
            ghost.isTrapped = true; ghost.releaseTime = timeElapsed + ghost.trapDelay;
        } else {
            const newDirection = directions[Math.floor(Math.random()*4)];
            ghost.updateDirection(newDirection);
        }
    }
}

// CLASS: Game Block 

class Block {
    constructor(image, x, y, width, height) {
        this.image = image; this.x = x; this.y = y; this.width = width; this.height = height;
        this.startX = x; this.startY = y;
        this.direction = 'R'; this.velocityX = 0; this.velocityY = 0;
    }
    updateDirection(direction) {
        const prevDirection = this.direction; this.direction = direction; this.updateVelocity();
        this.x += this.velocityX; this.y += this.velocityY;
        for (let wall of walls.values()) {
            if (collision(this, wall)) {
                this.x -= this.velocityX; this.y -= this.velocityY;
                this.direction = prevDirection; this.updateVelocity(); return;
            }
        }
    }
    updateVelocity() {
        if (this.direction == 'U') { this.velocityX = 0; this.velocityY = -tileSize/4; }
        else if (this.direction == 'D') { this.velocityX = 0; this.velocityY = tileSize/4; }
        else if (this.direction == 'L') { this.velocityX = -tileSize/4; this.velocityY = 0; }
        else if (this.direction == 'R') { this.velocityX = tileSize/4; this.velocityY = 0; }
    }
    reset() { this.x = this.startX; this.y = this.startY; }
}