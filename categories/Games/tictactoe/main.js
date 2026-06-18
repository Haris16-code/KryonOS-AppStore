// HarixOS Tic-Tac-Toe Game
// Play against a Bot!

var SW = System.screenWidth();
var SH = System.screenHeight();

var STATE_MENU = 0;
var STATE_PLAYING = 1;
var STATE_GAMEOVER = 2;

var state = STATE_MENU;
var board = [0,0,0, 0,0,0, 0,0,0]; // 0=Empty, 1=Player(X), 2=Bot(O)
var turn = 1; // 1 = Player, 2 = Bot
var winner = 0; // 0=None, 1=Player, 2=Bot, 3=Draw

var difficulty = 0; // 0=Easy, 1=Medium, 2=Hard, 3=Extreme
var diffNames = ["Easy", "Medium", "Hard", "Extreme"];

// Math.random polyfill if needed, but Duktape has it
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function drawMenu() {
    System.fillScreen(BLACK);
    System.setTextColor(GREEN, BLACK);
    System.drawString("TIC TAC TOE", 20, 50, 4);
    
    System.setTextColor(WHITE, BLACK);
    System.drawString("Difficulty: " + diffNames[difficulty], 20, 100, 2);
    
    // Difficulty Button
    System.fillRoundRect(20, 140, 90, 40, 5, BLUE);
    System.setTextColor(WHITE, BLUE);
    System.drawString("CHANGE", 25, 150, 2);
    
    // Play Button
    System.fillRoundRect(130, 140, 90, 40, 5, RED);
    System.setTextColor(WHITE, RED);
    System.drawString("PLAY", 155, 150, 2);
    
    System.setTextColor(DARKGREY, BLACK);
    System.drawString("You: X    Bot: O", 40, 240, 2);
}

function drawGrid() {
    System.fillScreen(BLACK);
    System.setTextColor(WHITE, BLACK);
    System.drawString("Tic Tac Toe", 10, 10, 4);
    if (turn === 1) {
        System.drawString("Your Turn (X)", 10, 40, 2);
    } else {
        System.drawString("Bot Thinking...", 10, 40, 2);
    }

    var cellSize = 60;
    var offsetX = 30;
    var offsetY = 80;

    // Draw grid lines
    for (var k = 1; k < 3; k++) {
        System.fillRect(offsetX + k * cellSize - 2, offsetY, 4, cellSize * 3, WHITE);
        System.fillRect(offsetX, offsetY + k * cellSize - 2, cellSize * 3, 4, WHITE);
    }

    // Draw X and O
    for (var idx = 0; idx < 9; idx++) {
        var row = Math.floor(idx / 3);
        var col = idx % 3;
        var cx = offsetX + col * cellSize + cellSize / 2;
        var cy = offsetY + row * cellSize + cellSize / 2;

        if (board[idx] === 1) {
            // Draw X
            System.drawLine(cx - 15, cy - 15, cx + 15, cy + 15, BLUE);
            System.drawLine(cx - 15, cy + 15, cx + 15, cy - 15, BLUE);
            // Thicken X
            System.drawLine(cx - 14, cy - 15, cx + 16, cy + 15, BLUE);
            System.drawLine(cx - 14, cy + 15, cx + 16, cy - 15, BLUE);
        } else if (board[idx] === 2) {
            // Draw O
            System.drawCircle(cx, cy, 18, RED);
            System.drawCircle(cx, cy, 17, RED);
        }
    }
}

function drawGameOver() {
    System.fillRect(20, 100, 200, 120, DARKGREY);
    System.drawRect(20, 100, 200, 120, WHITE);
    
    System.setTextColor(WHITE, DARKGREY);
    if (winner === 1) {
        System.drawString("YOU WIN!", 70, 120, 4);
    } else if (winner === 2) {
        System.drawString("BOT WINS!", 65, 120, 4);
    } else {
        System.drawString("DRAW!", 90, 120, 4);
    }
    
    System.fillRoundRect(60, 160, 120, 40, 5, GREEN);
    System.setTextColor(BLACK, GREEN);
    System.drawString("AGAIN", 90, 170, 4);
}

var WINS = [
    0,1,2, 3,4,5, 6,7,8, // Rows
    0,3,6, 1,4,7, 2,5,8, // Cols
    0,4,8, 2,4,6         // Diagonals
];

function checkWinnerState(b) {
    for (var m = 0; m < 24; m += 3) {
        var v = b[WINS[m]];
        if (v !== 0 && v === b[WINS[m+1]] && v === b[WINS[m+2]]) return v;
    }
    for (var j = 0; j < 9; j++) {
        if (b[j] === 0) return 0; // Not finished
    }
    return 3; // Draw
}

function checkWinner() {
    return checkWinnerState(board);
}

function minimax(b, depth, isMaximizing) {
    // Pet the watchdog occasionally on deep branches
    if (depth === 1) System.delay(1);
    
    var result = checkWinnerState(b);
    if (result === 2) return 10 - depth; // Bot wins
    if (result === 1) return depth - 10; // Player wins
    if (result === 3) return 0; // Draw
    
    // Limit depth to avoid out-of-memory or watchdog resets on slow ESP32
    if (depth > 6) return 0;
    
    if (isMaximizing) {
        var bestScore = -Infinity;
        for (var i = 0; i < 9; i++) {
            if (b[i] === 0) {
                b[i] = 2; // Bot
                var score = minimax(b, depth + 1, false);
                b[i] = 0;
                if (score > bestScore) bestScore = score;
            }
        }
        return bestScore;
    } else {
        var bestScore = Infinity;
        for (var i = 0; i < 9; i++) {
            if (b[i] === 0) {
                b[i] = 1; // Player
                var score = minimax(b, depth + 1, true);
                b[i] = 0;
                if (score < bestScore) bestScore = score;
            }
        }
        return bestScore;
    }
}

function botMove() {
    System.delay(200); // Fake thinking delay
    
    var emptySpots = [];
    for (var e=0; e<9; e++) {
        if (board[e] === 0) emptySpots.push(e);
    }
    
    var choice = -1;
    var doRandom = false;
    
    if (difficulty === 0) doRandom = true;
    else if (difficulty === 1) doRandom = (Math.random() > 0.5); // 50% optimal
    else if (difficulty === 2) doRandom = (Math.random() > 0.8); // 80% optimal
    else doRandom = false; // Extreme
    
    if (doRandom && emptySpots.length > 0) {
        choice = emptySpots[getRandomInt(emptySpots.length)];
    } else if (emptySpots.length > 0) {
        // Fast hardcoded first move logic (avoids 300,000 branch depth searches for first move)
        if (emptySpots.length === 9) {
            choice = 4; // Center
        } else if (emptySpots.length === 8) {
            // If player took center, take corner. Else take center.
            if (board[4] === 1) choice = 0;
            else choice = 4;
        } else {
            var bestScore = -Infinity;
            for (var i = 0; i < emptySpots.length; i++) {
                var spot = emptySpots[i];
                board[spot] = 2;
                var score = minimax(board, 0, false);
                board[spot] = 0;
                
                if (score > bestScore || (score === bestScore && Math.random() > 0.5)) {
                    bestScore = score;
                    choice = spot;
                }
            }
        }
        if (choice === -1) choice = emptySpots[0];
    }
    
    if (choice !== -1) {
        board[choice] = 2; // Bot is O
    }
    
    winner = checkWinner();
    if (winner !== 0) {
        state = STATE_GAMEOVER;
    } else {
        turn = 1;
    }
    drawGrid();
    if (state === STATE_GAMEOVER) drawGameOver();
}

function resetGame() {
    for (var c=0; c<9; c++) board[c] = 0;
    turn = 1;
    winner = 0;
    state = STATE_PLAYING;
    drawGrid();
}

// Initial draw
drawMenu();

while (true) {
    var t = System.getTouch();
    
    // Wait for touch release logic
    if (t.touched && t.x < 200) { // Avoid top right OS close button
        if (state === STATE_MENU) {
            // CHANGE Difficulty
            if (t.x >= 20 && t.x <= 110 && t.y >= 140 && t.y <= 180) {
                difficulty = (difficulty + 1) % 4;
                drawMenu();
                System.delay(300); // Debounce
            }
            // PLAY GAME
            else if (t.x >= 130 && t.x <= 220 && t.y >= 140 && t.y <= 180) {
                resetGame();
                System.delay(300); // Debounce
            }
        } 
        else if (state === STATE_PLAYING && turn === 1) {
            var cellSize = 60;
            var offsetX = 30;
            var offsetY = 80;
            
            if (t.x >= offsetX && t.x <= offsetX + cellSize*3 &&
                t.y >= offsetY && t.y <= offsetY + cellSize*3) {
                
                var col = Math.floor((t.x - offsetX) / cellSize);
                var row = Math.floor((t.y - offsetY) / cellSize);
                var idx = row * 3 + col;
                
                if (board[idx] === 0) {
                    board[idx] = 1; // Player move
                    winner = checkWinner();
                    if (winner !== 0) {
                        state = STATE_GAMEOVER;
                        drawGrid();
                        drawGameOver();
                    } else {
                        turn = 2; // Bot turn
                        drawGrid();
                    }
                    System.delay(300); // Debounce
                }
            }
        }
        else if (state === STATE_GAMEOVER) {
            if (t.x >= 60 && t.x <= 180 && t.y >= 160 && t.y <= 200) {
                resetGame();
                System.delay(300); // Debounce
            }
        }
    }
    
    if (state === STATE_PLAYING && turn === 2) {
        botMove();
    }
    
    System.delay(10);
}
