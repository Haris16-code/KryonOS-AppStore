// KryonOS Tic-Tac-Toe Game
// Multi-resolution 1:1 square board for 240x320 & 320x240 T-Deck Plus

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var C_BLACK = 0x0000;
    var C_WHITE = 0xFFFF;
    var C_GREEN = 0x07E0;
    var C_BLUE = 0x001F;
    var C_RED = 0xF800;
    var C_DARKGREY = 0x39E7;

    var STATE_MENU = 0;
    var STATE_PLAYING = 1;
    var STATE_GAMEOVER = 2;

    var state = STATE_MENU;
    var board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var turn = 1;
    var winner = 0;

    var difficulty = 0;
    var diffNames = ["Easy", "Medium", "Hard", "Extreme"];

    // Golden Rule 2: 1:1 square board sized by Math.min(availW, availH)
    var headerH = 44;
    var footerH = 12;
    var availW = SW - 24;
    var availH = SH - headerH - footerH;
    var boardSize = Math.min(availW, availH);
    var cellSize = Math.floor(boardSize / 3);
    boardSize = cellSize * 3;
    var offsetX = Math.floor((SW - boardSize) / 2);
    var offsetY = headerH + Math.floor((availH - boardSize) / 2);
    var symR = Math.floor(cellSize * 0.30);

    // Responsive menu buttons
    var menuBtnW = Math.min(110, Math.floor((SW - 50) / 2));
    var menuBtnH = 40;
    var menuBtn1X = Math.floor(SW / 2) - menuBtnW - 8;
    var menuBtn2X = Math.floor(SW / 2) + 8;
    var menuBtnY = Math.floor(SH * 0.52);

    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    function drawMenu() {
        System.fillScreen(C_BLACK);
        System.setTextColor(C_GREEN, C_BLACK);
        System.drawString("TIC TAC TOE", Math.floor((SW - 165) / 2), Math.floor(SH * 0.14), 4);

        System.setTextColor(C_WHITE, C_BLACK);
        System.drawString("Difficulty: " + diffNames[difficulty], Math.floor((SW - 150) / 2), Math.floor(SH * 0.34), 2);

        System.fillRoundRect(menuBtn1X, menuBtnY, menuBtnW, menuBtnH, 5, C_BLUE);
        System.setTextColor(C_WHITE, C_BLUE);
        System.drawString("CHANGE", menuBtn1X + Math.floor((menuBtnW - 54) / 2), menuBtnY + 12, 2);

        System.fillRoundRect(menuBtn2X, menuBtnY, menuBtnW, menuBtnH, 5, C_RED);
        System.setTextColor(C_WHITE, C_RED);
        System.drawString("PLAY", menuBtn2X + Math.floor((menuBtnW - 36) / 2), menuBtnY + 12, 2);

        System.setTextColor(C_DARKGREY, C_BLACK);
        System.drawString("You: X    Bot: O", Math.floor((SW - 130) / 2), SH - 32, 2);
    }

    function drawGrid() {
        System.fillScreen(C_BLACK);
        System.setTextColor(C_WHITE, C_BLACK);
        System.drawString("Tic Tac Toe", 10, 6, 4);
        if (turn === 1) {
            System.drawString("Your Turn (X)", 10, 32, 2);
        } else {
            System.drawString("Bot Thinking...", 10, 32, 2);
        }

        for (var k = 1; k < 3; k++) {
            System.fillRect(offsetX + k * cellSize - 2, offsetY, 4, boardSize, C_WHITE);
            System.fillRect(offsetX, offsetY + k * cellSize - 2, boardSize, 4, C_WHITE);
        }

        for (var idx = 0; idx < 9; idx++) {
            var row = Math.floor(idx / 3);
            var col = idx % 3;
            var cx = offsetX + col * cellSize + Math.floor(cellSize / 2);
            var cy = offsetY + row * cellSize + Math.floor(cellSize / 2);

            if (board[idx] === 1) {
                System.drawLine(cx - symR, cy - symR, cx + symR, cy + symR, C_BLUE);
                System.drawLine(cx - symR, cy + symR, cx + symR, cy - symR, C_BLUE);
                System.drawLine(cx - symR + 1, cy - symR, cx + symR + 1, cy + symR, C_BLUE);
                System.drawLine(cx - symR + 1, cy + symR, cx + symR + 1, cy - symR, C_BLUE);
            } else if (board[idx] === 2) {
                System.drawCircle(cx, cy, symR, C_RED);
                System.drawCircle(cx, cy, symR - 1, C_RED);
            }
        }
    }

    var modalW = Math.min(220, SW - 32);
    var modalH = 116;
    var modalX = Math.floor((SW - modalW) / 2);
    var modalY = Math.floor((SH - modalH) / 2);
    var againW = 120;
    var againH = 38;
    var againX = Math.floor((SW - againW) / 2);
    var againY = modalY + 62;

    function drawGameOver() {
        System.fillRect(modalX, modalY, modalW, modalH, C_DARKGREY);
        System.drawRect(modalX, modalY, modalW, modalH, C_WHITE);

        System.setTextColor(C_WHITE, C_DARKGREY);
        if (winner === 1) {
            System.drawString("YOU WIN!", modalX + Math.floor((modalW - 110) / 2), modalY + 18, 4);
        } else if (winner === 2) {
            System.drawString("BOT WINS!", modalX + Math.floor((modalW - 120) / 2), modalY + 18, 4);
        } else {
            System.drawString("DRAW!", modalX + Math.floor((modalW - 70) / 2), modalY + 18, 4);
        }

        System.fillRoundRect(againX, againY, againW, againH, 5, C_GREEN);
        System.setTextColor(C_BLACK, C_GREEN);
        System.drawString("AGAIN", againX + 26, againY + 10, 4);
    }

    var WINS = [
        0, 1, 2, 3, 4, 5, 6, 7, 8,
        0, 3, 6, 1, 4, 7, 2, 5, 8,
        0, 4, 8, 2, 4, 6
    ];

    function checkWinnerState(b) {
        for (var m = 0; m < 24; m += 3) {
            var v = b[WINS[m]];
            if (v !== 0 && v === b[WINS[m + 1]] && v === b[WINS[m + 2]]) return v;
        }
        for (var j = 0; j < 9; j++) {
            if (b[j] === 0) return 0;
        }
        return 3;
    }

    function minimax(b, depth, isMaximizing) {
        if (depth === 1) System.delay(1);

        var result = checkWinnerState(b);
        if (result === 2) return 10 - depth;
        if (result === 1) return depth - 10;
        if (result === 3) return 0;
        if (depth > 6) return 0;

        if (isMaximizing) {
            var bestScore = -Infinity;
            for (var i = 0; i < 9; i++) {
                if (b[i] === 0) {
                    b[i] = 2;
                    var score = minimax(b, depth + 1, false);
                    b[i] = 0;
                    if (score > bestScore) bestScore = score;
                }
            }
            return bestScore;
        } else {
            var bestScore2 = Infinity;
            for (var i2 = 0; i2 < 9; i2++) {
                if (b[i2] === 0) {
                    b[i2] = 1;
                    var score2 = minimax(b, depth + 1, true);
                    b[i2] = 0;
                    if (score2 < bestScore2) bestScore2 = score2;
                }
            }
            return bestScore2;
        }
    }

    function botMove() {
        System.delay(200);

        var emptySpots = [];
        for (var e = 0; e < 9; e++) {
            if (board[e] === 0) emptySpots.push(e);
        }

        var choice = -1;
        var doRandom = false;

        if (difficulty === 0) doRandom = true;
        else if (difficulty === 1) doRandom = (Math.random() > 0.5);
        else if (difficulty === 2) doRandom = (Math.random() > 0.8);

        if (doRandom && emptySpots.length > 0) {
            choice = emptySpots[getRandomInt(emptySpots.length)];
        } else if (emptySpots.length > 0) {
            if (emptySpots.length === 9) {
                choice = 4;
            } else if (emptySpots.length === 8) {
                choice = (board[4] === 1) ? 0 : 4;
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

        if (choice !== -1) board[choice] = 2;

        winner = checkWinnerState(board);
        if (winner !== 0) {
            state = STATE_GAMEOVER;
        } else {
            turn = 1;
        }
        drawGrid();
        if (state === STATE_GAMEOVER) drawGameOver();
    }

    function resetGame() {
        for (var c = 0; c < 9; c++) board[c] = 0;
        turn = 1;
        winner = 0;
        state = STATE_PLAYING;
        drawGrid();
    }

    drawMenu();

    while (true) {
        var t = System.getTouch();

        if (t.touched && !(t.x >= SW - 40 && t.y <= 40)) {
            if (state === STATE_MENU) {
                if (t.y >= menuBtnY && t.y <= menuBtnY + menuBtnH) {
                    if (t.x >= menuBtn1X && t.x <= menuBtn1X + menuBtnW) {
                        difficulty = (difficulty + 1) % 4;
                        drawMenu();
                        System.delay(300);
                    } else if (t.x >= menuBtn2X && t.x <= menuBtn2X + menuBtnW) {
                        resetGame();
                        System.delay(300);
                    }
                }
            } else if (state === STATE_PLAYING && turn === 1) {
                if (t.x >= offsetX && t.x < offsetX + boardSize &&
                    t.y >= offsetY && t.y < offsetY + boardSize) {
                    var col = Math.floor((t.x - offsetX) / cellSize);
                    var row = Math.floor((t.y - offsetY) / cellSize);
                    var idx = row * 3 + col;

                    if (board[idx] === 0) {
                        board[idx] = 1;
                        winner = checkWinnerState(board);
                        if (winner !== 0) {
                            state = STATE_GAMEOVER;
                            drawGrid();
                            drawGameOver();
                        } else {
                            turn = 2;
                            drawGrid();
                        }
                        System.delay(300);
                    }
                }
            } else if (state === STATE_GAMEOVER) {
                if (t.x >= againX && t.x <= againX + againW && t.y >= againY && t.y <= againY + againH) {
                    resetGame();
                    System.delay(300);
                }
            }
        }

        if (state === STATE_PLAYING && turn === 2) {
            botMove();
        }

        System.delay(10);
    }
})();
