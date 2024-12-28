// Connect to Phantom Wallet
const connectWalletButton = document.getElementById('connectWalletButton');
const disconnectWalletButton = document.getElementById('disconnectWalletButton');
const walletAddressDisplay = document.getElementById('walletAddress');
const walletBalanceDisplay = document.getElementById('walletBalance');

// Define Solana connection and wallet
let connection = new solanaWeb3.Connection('https://thrilling-nameless-putty.solana-mainnet.quiknode.pro/5cccb831dcbfae27bf943c7ed261957b06643f4d', 'confirmed');
let wallet;

// Check if Phantom is installed
if (window.solana && window.solana.isPhantom) {
    console.log('Phantom Wallet detected!');
    // Enable the Connect button
    connectWalletButton.disabled = false;
} else {
    console.log('Phantom Wallet not detected!');
}

// Connect to Phantom wallet
connectWalletButton.addEventListener('click', async () => {
    try {
        wallet = await window.solana.connect();
        walletAddressDisplay.textContent = wallet.publicKey.toString();
        connectWalletButton.style.display = 'none';
        disconnectWalletButton.style.display = 'inline-block';
        fetchBalance();
    } catch (err) {
        console.error(err);
    }
});

// Disconnect from Phantom wallet
disconnectWalletButton.addEventListener('click', () => {
    window.solana.disconnect();
    walletAddressDisplay.textContent = 'Not connected';
    walletBalanceDisplay.textContent = '0';
    connectWalletButton.style.display = 'inline-block';
    disconnectWalletButton.style.display = 'none';
});

// Fetch Solana balance
async function fetchBalance() {
    if (!wallet) return;
    
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
    walletBalanceDisplay.textContent = solBalance.toFixed(2);
}

// WebSocket for Real-Time Updates
const wsConnection = new WebSocket('wss://thrilling-nameless-putty.solana-mainnet.quiknode.pro/5cccb831dcbfae27bf943c7ed261957b06643f4d');

wsConnection.onmessage = (event) => {
    console.log('Received WebSocket message:', event.data);
    // You can implement logic to update your UI with real-time data here
};

wsConnection.onopen = () => {
    console.log('WebSocket connection established');
};

wsConnection.onerror = (error) => {
    console.error('WebSocket error:', error);
};

wsConnection.onclose = () => {
    console.log('WebSocket connection closed');
};

// Game setup and logic
let tileSize = 32;
let rows = 16;
let columns = 16;

let board;
let boardWidth = tileSize * columns;
let boardHeight = tileSize * rows;
let context;

// Ship
let shipWidth = tileSize * 2;
let shipHeight = tileSize;
let shipX = tileSize * columns / 2 - tileSize;
let shipY = tileSize * rows - tileSize * 2;

let ship = {
    x: shipX,
    y: shipY,
    width: shipWidth,
    height: shipHeight
};

let shipImg;
let shipVelocityX = tileSize;

// Ghosts
let ghostArray = [];
let ghostWidth = tileSize * 2;
let ghostHeight = tileSize;
let ghostX = tileSize;
let ghostY = tileSize;
let ghostImg;

let ghostRows = 2;
let ghostColumns = 3;
let ghostCount = 0;
let ghostVelocityX = 1;

// Bullets
let bulletArray = [];
let bulletVelocityY = -10;

let score = 0;
let gameOver = false;

// Background music
let bgMusic;

window.onload = function () {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    // Load images
    shipImg = new Image();
    shipImg.src = "./CHARACTER_SHOOTING.png";
    shipImg.onload = function () {
        context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);
    };

    ghostImg = new Image();
    ghostImg.src = "./GHOST_BOSS.png";
    createGhosts();

    // Load background music
    bgMusic = document.getElementById("gameAudio");
    bgMusic.volume = 0.5;

    // Fix autoplay restrictions
    document.addEventListener(
        "keydown",
        () => {
            bgMusic.play().catch((err) => console.error("Audio playback error:", err));
        },
        { once: true }
    );

    // Event listeners
    document.addEventListener("keydown", moveShip);
    document.addEventListener("keyup", shoot);

    document.getElementById("restartButton").addEventListener("click", restartGame);
    document.getElementById("scoreForm").addEventListener("submit", saveHighScore);

    // Display leaderboard
    displayLeaderboard();

    // Start the game loop
    requestAnimationFrame(update);
};

function update() {
    if (gameOver) return;

    requestAnimationFrame(update);
    context.clearRect(0, 0, board.width, board.height);

    // Ship
    context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);

    // Ghosts
    for (let i = 0; i < ghostArray.length; i++) {
        let ghost = ghostArray[i];
        if (ghost.alive) {
            ghost.x += ghostVelocityX;

            if (ghost.x + ghost.width >= board.width || ghost.x <= 0) {
                ghostVelocityX *= -1;
                ghost.x += ghostVelocityX * 2;

                for (let j = 0; j < ghostArray.length; j++) {
                    ghostArray[j].y += ghostHeight;
                }
            }
            context.drawImage(ghostImg, ghost.x, ghost.y, ghost.width, ghost.height);

            if (ghost.y >= ship.y) {
                endGame();
            }
        }
    }

    // Bullets
    for (let i = 0; i < bulletArray.length; i++) {
        let bullet = bulletArray[i];
        bullet.y += bulletVelocityY;
        context.fillStyle = "white";
        context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

        for (let j = 0; j < ghostArray.length; j++) {
            let ghost = ghostArray[j];
            if (!bullet.used && ghost.alive && detectCollision(bullet, ghost)) {
                bullet.used = true;
                ghost.alive = false;
                ghostCount--;
                score += 100;
            }
        }
    }

    while (bulletArray.length > 0 && (bulletArray[0].used || bulletArray[0].y < 0)) {
        bulletArray.shift();
    }

    if (ghostCount == 0) {
        score += ghostColumns * ghostRows * 100;
        ghostColumns = Math.min(ghostColumns + 1, columns / 2 - 2);
        ghostRows = Math.min(ghostRows + 1, rows - 4);
        ghostVelocityX += ghostVelocityX > 0 ? 0.2 : -0.2;
        ghostArray = [];
        bulletArray = [];
        createGhosts();
    }

    context.fillStyle = "white";
    context.font = "16px courier";
    context.fillText(`Score: ${score}`, 5, 20);
}

function endGame() {
    gameOver = true;
    bgMusic.pause();

    document.getElementById("gameOverContainer").style.display = "block";
    document.getElementById("finalScore").textContent = score;
}

function restartGame() {
    score = 0;
    gameOver = false;
    ghostArray = [];
    createGhosts();
    document.getElementById("gameOverContainer").style.display = "none";
    bgMusic.play();
    requestAnimationFrame(update);
}

function saveHighScore(event) {
    event.preventDefault();

    const playerName = document.getElementById("playerName").value;
    const highScores = JSON.parse(localStorage.getItem("highScores")) || [];
    highScores.push({ name: playerName, score: score });
    highScores.sort((a, b) => b.score - a.score);
    localStorage.setItem("highScores", JSON.stringify(highScores));

    displayLeaderboard();
    document.getElementById("gameOverContainer").style.display = "none";
}

function displayLeaderboard() {
    const highScores = JSON.parse(localStorage.getItem("highScores")) || [];
    const leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = highScores
        .slice(0, 5)
        .map((entry) => `<li>${entry.name}: ${entry.score}</li>`)
        .join("");
}

function moveShip(e) {
    if (gameOver) return;

    if (e.code === "ArrowLeft" && ship.x - shipVelocityX >= 0) {
        ship.x -= shipVelocityX;
    } else if (e.code === "ArrowRight" && ship.x + shipVelocityX + ship.width <= board.width) {
        ship.x += shipVelocityX;
    }
}

function createGhosts() {
    for (let c = 0; c < ghostColumns; c++) {
        for (let r = 0; r < ghostRows; r++) {
            let ghost = {
                img: ghostImg,
                x: ghostX + c * ghostWidth,
                y: ghostY + r * ghostHeight,
                width: ghostWidth,
                height: ghostHeight,
                alive: true
            };
            ghostArray.push(ghost);
        }
    }
    ghostCount = ghostArray.length;
}

function shoot(e) {
    if (gameOver) return;

    if (e.code === "Space") {
        let bullet = {
            x: ship.x + shipWidth * 15 / 32,
            y: ship.y,
            width: tileSize / 8,
            height: tileSize / 2,
            used: false
        };
        bulletArray.push(bullet);
    }
}

function detectCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}
