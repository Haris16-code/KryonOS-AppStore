// ============================================================================
// KryonOS Modern Neon Tetris
// Author: shifat100
// ============================================================================

// ----------------------------------------------------------------------------
// Colors & Theme (RGB565 via System.color)
// ----------------------------------------------------------------------------
var COLOR_BG         = System.color(12, 14, 22);
var COLOR_PANEL      = System.color(22, 26, 40);
var COLOR_BORDER     = System.color(48, 58, 86);
var COLOR_GRID_LINE  = System.color(26, 30, 48);
var COLOR_TEXT_MUTED = System.color(130, 140, 170);
var COLOR_TEXT_HEAD  = System.color(240, 245, 255);
var COLOR_BTN_BG     = System.color(28, 34, 54);
var COLOR_BTN_BORDER = System.color(60, 75, 115);
var COLOR_ACCENT     = System.color(0, 210, 255);
var COLOR_WHITE      = System.color(255, 255, 255);
var COLOR_YELLOW     = System.color(255, 215, 0);
var COLOR_RED        = System.color(255, 50, 70);

// Tetromino Colors (1 to 7)
var PIECE_COLORS = [
    0,
    System.color(0, 240, 255),   // 1: I (Cyan)
    System.color(255, 215, 0),   // 2: O (Gold)
    System.color(180, 70, 255),  // 3: T (Purple)
    System.color(50, 230, 80),   // 4: S (Green)
    System.color(255, 60, 80),   // 5: Z (Red)
    System.color(30, 130, 255),  // 6: J (Blue)
    System.color(255, 140, 20)   // 7: L (Orange)
];

var PIECE_HIGHLIGHTS = [
    0,
    System.color(160, 250, 255),
    System.color(255, 245, 140),
    System.color(225, 160, 255),
    System.color(160, 255, 180),
    System.color(255, 160, 170),
    System.color(140, 195, 255),
    System.color(255, 200, 120)
];

var PIECE_SHADOWS = [
    0,
    System.color(0, 120, 140),
    System.color(140, 110, 0),
    System.color(90, 30, 140),
    System.color(20, 120, 40),
    System.color(140, 25, 35),
    System.color(15, 65, 140),
    System.color(140, 65, 10)
];

var TETROMINOES = {
    "I": [
        [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
        [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
        [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
        [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
    ],
    "O": [
        [[2,2], [2,2]]
    ],
    "T": [
        [[0,3,0], [3,3,3], [0,0,0]],
        [[0,3,0], [0,3,3], [0,3,0]],
        [[0,0,0], [3,3,3], [0,3,0]],
        [[0,3,0], [3,3,0], [0,3,0]]
    ],
    "S": [
        [[0,4,4], [4,4,0], [0,0,0]],
        [[0,4,0], [0,4,4], [0,0,4]],
        [[0,0,0], [0,4,4], [4,4,0]],
        [[4,0,0], [4,4,0], [0,4,0]]
    ],
    "Z": [
        [[5,5,0], [0,5,5], [0,0,0]],
        [[0,0,5], [0,5,5], [0,5,0]],
        [[0,0,0], [5,5,0], [0,5,5]],
        [[0,5,0], [5,5,0], [5,0,0]]
    ],
    "J": [
        [[6,0,0], [6,6,6], [0,0,0]],
        [[0,6,6], [0,6,0], [0,6,0]],
        [[0,0,0], [6,6,6], [0,0,6]],
        [[0,6,0], [0,6,0], [6,6,0]]
    ],
    "L": [
        [[0,0,7], [7,7,7], [0,0,0]],
        [[0,7,0], [0,7,0], [0,7,7]],
        [[0,0,0], [7,7,7], [7,0,0]],
        [[7,7,0], [0,7,0], [0,7,0]]
    ]
};

var SHAPE_NAMES = ["I", "O", "T", "S", "Z", "J", "L"];

// ----------------------------------------------------------------------------
// Board Layout (Screen: 240 x 320)
// ----------------------------------------------------------------------------
var COLS = 10;
var ROWS = 20;
var CELL = 11;
var BOARD_X = 8;
var BOARD_Y = 32;
var BOARD_W = COLS * CELL; // 110 px
var BOARD_H = ROWS * CELL; // 220 px

var BTNS = [
    { id: "left",   label: "<",  x: 6,   w: 42 },
    { id: "right",  label: ">",  x: 52,  w: 42 },
    { id: "rotate", label: "R",  x: 98,  w: 42 },
    { id: "soft",   label: "v",  x: 144, w: 42 },
    { id: "hard",   label: "V",  x: 190, w: 44 }
];

// ----------------------------------------------------------------------------
// State Variables
// ----------------------------------------------------------------------------
var grid = [];
var currentPiece = null;
var nextPieceName = "";
var pieceX = 0;
var pieceY = 0;
var pieceRot = 0;

var score = 0;
var highScore = 0;
var lines = 0;
var level = 1;

var gameState = "TITLE"; // 'TITLE', 'PLAYING', 'GAMEOVER'
var lastDropTime = 0;
var dropInterval = 700;
var lastTouchTime = 0;
var activeTouchBtn = null;

// ----------------------------------------------------------------------------
// High Score Storage
// ----------------------------------------------------------------------------
function loadHighScore() {
    try {
        if (typeof FS !== "undefined" && FS.exists("highscore.json")) {
            var raw = FS.readTextFile("highscore.json");
            if (raw && raw.length > 0) {
                var obj = JSON.parse(raw);
                if (obj && typeof obj.highScore === "number") {
                    highScore = obj.highScore;
                }
            }
        }
    } catch (e) {
        highScore = 0;
    }
}

function saveHighScore() {
    try {
        if (typeof FS !== "undefined") {
            var data = JSON.stringify({ highScore: highScore });
            FS.writeTextFile("highscore.json", data);
        }
    } catch (e) {}
}

// ----------------------------------------------------------------------------
// Drawing Helpers
// ----------------------------------------------------------------------------
function drawBeveledBlock(px, py, colorIdx, size) {
    var c = PIECE_COLORS[colorIdx];
    var hi = PIECE_HIGHLIGHTS[colorIdx];
    var sh = PIECE_SHADOWS[colorIdx];

    System.fillRect(px, py, size, size, c);
    System.drawFastHLine(px, py, size - 1, hi);
    System.drawFastVLine(px, py, size - 1, hi);
    System.drawFastHLine(px, py + size - 1, size, sh);
    System.drawFastVLine(px + size - 1, py, size, sh);
    System.drawPixel(px + 2, py + 2, hi);
}

function drawGhostBlock(px, py, size) {
    System.drawRect(px, py, size, size, System.color(70, 85, 120));
    System.drawRect(px + 2, py + 2, size - 4, size - 4, System.color(35, 45, 65));
}

function resetGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (var c = 0; c < COLS; c++) {
            grid[r][c] = 0;
        }
    }
}

function checkCollision(nx, ny, nrot) {
    var shape = currentPiece.rotations[nrot % currentPiece.rotations.length];
    for (var r = 0; r < shape.length; r++) {
        for (var c = 0; c < shape[r].length; c++) {
            if (shape[r][c] !== 0) {
                var gx = nx + c;
                var gy = ny + r;

                if (gx < 0 || gx >= COLS || gy >= ROWS) {
                    return true;
                }
                if (gy >= 0 && grid[gy][gx] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function spawnPiece(type) {
    var name = type || SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
    var matrix = TETROMINOES[name];
    currentPiece = {
        name: name,
        rotations: matrix
    };
    pieceRot = 0;
    var shape = matrix[0];
    pieceX = Math.floor((COLS - shape[0].length) / 2);
    pieceY = 0;

    if (checkCollision(pieceX, pieceY, pieceRot)) {
        gameState = "GAMEOVER";
        if (score > highScore) {
            highScore = score;
            saveHighScore();
        }
        drawScene();
    }
}

function getGhostY() {
    var gy = pieceY;
    while (!checkCollision(pieceX, gy + 1, pieceRot)) {
        gy++;
    }
    return gy;
}

function clearLines() {
    var cleared = 0;
    for (var r = ROWS - 1; r >= 0; r--) {
        var full = true;
        for (var c = 0; c < COLS; c++) {
            if (grid[r][c] === 0) {
                full = false;
                break;
            }
        }
        if (full) {
            System.fillRect(BOARD_X, BOARD_Y + r * CELL, BOARD_W, CELL, COLOR_WHITE);
            System.delay(20);

            for (var y = r; y > 0; y--) {
                for (var x = 0; x < COLS; x++) {
                    grid[y][x] = grid[y - 1][x];
                }
            }
            for (var x = 0; x < COLS; x++) {
                grid[0][x] = 0;
            }
            cleared++;
            r++;
        }
    }

    if (cleared > 0) {
        var pts = [0, 100, 300, 500, 800];
        score += pts[cleared] * level;
        lines += cleared;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(90, 750 - (level - 1) * 55);

        if (score > highScore) {
            highScore = score;
            saveHighScore();
        }
    }
}

function lockPiece() {
    var shape = currentPiece.rotations[pieceRot];
    for (var r = 0; r < shape.length; r++) {
        for (var c = 0; c < shape[r].length; c++) {
            if (shape[r][c] !== 0) {
                var gy = pieceY + r;
                var gx = pieceX + c;
                if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
                    grid[gy][gx] = shape[r][c];
                }
            }
        }
    }

    clearLines();
    spawnPiece(nextPieceName);
    nextPieceName = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
    drawScene();
}

// ----------------------------------------------------------------------------
// UI Layout
// ----------------------------------------------------------------------------
function drawMainLayout() {
    System.fillScreen(COLOR_BG);

    // Header Title
    System.fillRoundRect(8, 6, 110, 22, 4, COLOR_PANEL);
    System.drawRoundRect(8, 6, 110, 22, 4, COLOR_BORDER);
    System.setTextColor(COLOR_ACCENT, COLOR_PANEL);
    System.setTextDatum(0);
    System.drawString("TETRIS NEON", 16, 10, 2);

    // Board Outer Border
    System.fillRoundRect(BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4, 3, COLOR_PANEL);
    System.drawRoundRect(BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4, 3, COLOR_BORDER);

    // Right Stats Panels
    var px = 126;
    var pw = 106;

    System.fillRoundRect(px, 32, pw, 60, 5, COLOR_PANEL);
    System.drawRoundRect(px, 32, pw, 60, 5, COLOR_BORDER);
    System.setTextColor(COLOR_TEXT_MUTED, COLOR_PANEL);
    System.drawString("NEXT", px + 8, 36, 1);

    System.fillRoundRect(px, 98, pw, 46, 5, COLOR_PANEL);
    System.drawRoundRect(px, 98, pw, 46, 5, COLOR_BORDER);
    System.setTextColor(COLOR_TEXT_MUTED, COLOR_PANEL);
    System.drawString("SCORE", px + 8, 102, 1);

    System.fillRoundRect(px, 150, pw, 46, 5, COLOR_PANEL);
    System.drawRoundRect(px, 150, pw, 46, 5, COLOR_BORDER);
    System.setTextColor(COLOR_TEXT_MUTED, COLOR_PANEL);
    System.drawString("BEST", px + 8, 154, 1);

    System.fillRoundRect(px, 202, pw, 50, 5, COLOR_PANEL);
    System.drawRoundRect(px, 202, pw, 50, 5, COLOR_BORDER);
    System.setTextColor(COLOR_TEXT_MUTED, COLOR_PANEL);
    System.drawString("LEVEL / LINES", px + 8, 206, 1);

    drawTouchControls();
}

function drawTouchControls() {
    var by = 260;
    var bh = 50;

    for (var i = 0; i < BTNS.length; i++) {
        var b = BTNS[i];
        var isDown = (activeTouchBtn === b.id);
        var bgCol = isDown ? COLOR_ACCENT : COLOR_BTN_BG;
        var fgCol = isDown ? COLOR_BG : COLOR_TEXT_HEAD;

        System.fillRoundRect(b.x, by, b.w, bh, 5, bgCol);
        System.drawRoundRect(b.x, by, b.w, bh, 5, COLOR_BTN_BORDER);

        System.setTextColor(fgCol, bgCol);
        System.setTextDatum(4);
        System.drawString(b.label, b.x + Math.floor(b.w / 2), by + 25, 4);
    }
}

function drawStats() {
    var px = 126;

    System.fillRect(px + 8, 118, 90, 20, COLOR_PANEL);
    System.setTextColor(COLOR_YELLOW, COLOR_PANEL);
    System.setTextDatum(0);
    System.drawString(String(score), px + 8, 118, 2);

    System.fillRect(px + 8, 170, 90, 20, COLOR_PANEL);
    System.setTextColor(COLOR_ACCENT, COLOR_PANEL);
    System.drawString(String(highScore), px + 8, 170, 2);

    System.fillRect(px + 8, 222, 90, 24, COLOR_PANEL);
    System.setTextColor(COLOR_TEXT_HEAD, COLOR_PANEL);
    System.drawString("Lv " + String(level) + " (" + String(lines) + ")", px + 8, 222, 2);

    // Next Piece Box
    System.fillRect(px + 12, 48, 80, 40, COLOR_PANEL);
    if (nextPieceName && TETROMINOES[nextPieceName]) {
        var nextMatrix = TETROMINOES[nextPieceName][0];
        var miniCell = 9;
        var offX = px + 28 - Math.floor((nextMatrix[0].length * miniCell) / 2);
        var offY = 52;
        for (var r = 0; r < nextMatrix.length; r++) {
            for (var c = 0; c < nextMatrix[r].length; c++) {
                if (nextMatrix[r][c] !== 0) {
                    drawBeveledBlock(offX + c * miniCell, offY + r * miniCell, nextMatrix[r][c], miniCell);
                }
            }
        }
    }
}

function drawBoard() {
    System.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, COLOR_PANEL);

    // Grid lines
    for (var r = 1; r < ROWS; r++) {
        System.drawFastHLine(BOARD_X, BOARD_Y + r * CELL, BOARD_W, COLOR_GRID_LINE);
    }
    for (var c = 1; c < COLS; c++) {
        System.drawFastVLine(BOARD_X + c * CELL, BOARD_Y, BOARD_H, COLOR_GRID_LINE);
    }

    // Settled blocks
    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            var cellVal = grid[r][c];
            if (cellVal !== 0) {
                drawBeveledBlock(BOARD_X + c * CELL, BOARD_Y + r * CELL, cellVal, CELL);
            }
        }
    }

    if (gameState !== "PLAYING" || !currentPiece) return;

    // Ghost piece
    var ghostY = getGhostY();
    var shape = currentPiece.rotations[pieceRot];
    if (ghostY !== pieceY) {
        for (var r = 0; r < shape.length; r++) {
            for (var c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    var gx = pieceX + c;
                    var gy = ghostY + r;
                    if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
                        drawGhostBlock(BOARD_X + gx * CELL, BOARD_Y + gy * CELL, CELL);
                    }
                }
            }
        }
    }

    // Active piece
    for (var r = 0; r < shape.length; r++) {
        for (var c = 0; c < shape[r].length; c++) {
            if (shape[r][c] !== 0) {
                var px = pieceX + c;
                var py = pieceY + r;
                if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
                    drawBeveledBlock(BOARD_X + px * CELL, BOARD_Y + py * CELL, shape[r][c], CELL);
                }
            }
        }
    }
}

function drawScene() {
    drawBoard();
    drawStats();

    if (gameState === "GAMEOVER") {
        System.fillRoundRect(24, 90, 192, 100, 6, COLOR_BG);
        System.drawRoundRect(24, 90, 192, 100, 6, COLOR_RED);

        System.setTextDatum(4);
        System.setTextColor(COLOR_RED, COLOR_BG);
        System.drawString("GAME OVER", 120, 115, 4);

        System.setTextColor(COLOR_TEXT_HEAD, COLOR_BG);
        System.drawString("Score: " + String(score), 120, 142, 2);

        System.setTextColor(COLOR_ACCENT, COLOR_BG);
        System.drawString("Tap Screen to Play", 120, 168, 2);
    } else if (gameState === "TITLE") {
        System.fillRoundRect(24, 90, 192, 100, 6, COLOR_BG);
        System.drawRoundRect(24, 90, 192, 100, 6, COLOR_ACCENT);

        System.setTextDatum(4);
        System.setTextColor(COLOR_ACCENT, COLOR_BG);
        System.drawString("TETRIS", 120, 115, 4);

        System.setTextColor(COLOR_YELLOW, COLOR_BG);
        System.drawString("Best: " + String(highScore), 120, 142, 2);

        System.setTextColor(COLOR_TEXT_HEAD, COLOR_BG);
        System.drawString("Tap Screen to Start", 120, 168, 2);
    }
}

// ----------------------------------------------------------------------------
// Movement Actions
// ----------------------------------------------------------------------------
function moveLeft() {
    if (!checkCollision(pieceX - 1, pieceY, pieceRot)) {
        pieceX--;
        drawBoard();
    }
}

function moveRight() {
    if (!checkCollision(pieceX + 1, pieceY, pieceRot)) {
        pieceX++;
        drawBoard();
    }
}

function rotatePiece() {
    var nrot = (pieceRot + 1) % currentPiece.rotations.length;
    if (!checkCollision(pieceX, pieceY, nrot)) {
        pieceRot = nrot;
    } else if (!checkCollision(pieceX - 1, pieceY, nrot)) {
        pieceX--;
        pieceRot = nrot;
    } else if (!checkCollision(pieceX + 1, pieceY, nrot)) {
        pieceX++;
        pieceRot = nrot;
    }
    drawBoard();
}

function softDrop() {
    if (!checkCollision(pieceX, pieceY + 1, pieceRot)) {
        pieceY++;
        score += 1;
        drawBoard();
        drawStats();
        return true;
    } else {
        lockPiece();
        return false;
    }
}

function hardDrop() {
    var dropCount = 0;
    while (!checkCollision(pieceX, pieceY + 1, pieceRot)) {
        pieceY++;
        dropCount++;
    }
    score += dropCount * 2;
    lockPiece();
}

function startNewGame() {
    resetGrid();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 700;
    gameState = "PLAYING";

    nextPieceName = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
    spawnPiece();
    lastDropTime = System.millis();

    drawMainLayout();
    drawScene();
}

// ----------------------------------------------------------------------------
// Touch Input Handler
// ----------------------------------------------------------------------------
function handleTouchInput() {
    var t = System.getTouch();
    if (!t || !t.touched) {
        if (activeTouchBtn) {
            activeTouchBtn = null;
            drawTouchControls();
        }
        return;
    }

    var now = System.millis();
    if (now - lastTouchTime < 130) return;
    lastTouchTime = now;

    var tx = t.x;
    var ty = t.y;

    if (gameState === "TITLE" || gameState === "GAMEOVER") {
        startNewGame();
        return;
    }

    // Tap on grid quadrants
    if (ty >= BOARD_Y && ty <= BOARD_Y + BOARD_H && tx >= BOARD_X && tx <= BOARD_X + BOARD_W) {
        if (ty < BOARD_Y + 70) {
            rotatePiece();
        } else if (ty > BOARD_Y + 160) {
            softDrop();
        } else if (tx < BOARD_X + (BOARD_W / 2)) {
            moveLeft();
        } else {
            moveRight();
        }
        return;
    }

    // Tap bottom virtual control buttons
    if (ty >= 260 && ty <= 315) {
        for (var i = 0; i < BTNS.length; i++) {
            var b = BTNS[i];
            if (tx >= b.x && tx <= b.x + b.w) {
                activeTouchBtn = b.id;
                drawTouchControls();
