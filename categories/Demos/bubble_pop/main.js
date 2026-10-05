/**
 * KryonOS Bubble Pop (Match-2+ Tap & Cascade Refill)
 * Screen: 240x320 Portrait | Smooth Gravity Animation & Touch Debounced
 */

// ============================================================
// Layout & Screen Setup
// ============================================================
var SCREEN_W = System.screenWidth();
var SCREEN_H = System.screenHeight();

var HEADER_H = 40;
var COLS = 8;
var ROWS = 9;
var CELL_SIZE = 26; // বাবল সেলের সাইজ
var BUBBLE_RADIUS = 11;

// গ্রিড সেন্টারিং
var START_X = Math.floor((SCREEN_W - (COLS * CELL_SIZE)) / 2);
var START_Y = 46;

// Color Palette (RGB565)
var COLOR_BG = BLACK;
var COLOR_BORDER = DARKGREY;
var COLOR_PANEL = 0x10A2; // Dark Navy

var BUBBLE_COLORS = [
    RED,        // 0: লাল
    GREEN,      // 1: সবুজ
    BLUE,       // 2: নীল
    YELLOW,     // 3: হলুদ
    PURPLE      // 4: বেগুনী
];

// Touch Debounce
var lastTouchTime = 0;
var TOUCH_COOLDOWN = 260; // ms
var touchReleased = true;

// Double Buffering (PSRAM / Internal RAM Safe)
var useBuffer = false;
try {
    useBuffer = System.createSprite(SCREEN_W, SCREEN_H);
    if (useBuffer) {
        System.bindSprite(true);
    }
} catch (e) {
    useBuffer = false;
}

// ============================================================
// Game State
// ============================================================
var STATE_TITLE = 0;
var STATE_PLAYING = 1;
var STATE_GAMEOVER = 2;
var STATE_LEVEL_CLEAR = 3;

var gameState = STATE_TITLE;
var level = 1;
var score = 0;
var targetScore = 600;
var movesLeft = 22;
var highScore = 0;

// 2D Arrays: grid stores color (0..4), animOffsets stores drop animation Y offset
var grid = [];
var animOffset = [];

// Animations & Particles
var poppingEffects = [];
var scoreFloats = [];

// Optional Buzzer Sound
function playTone(freq, dur) {
    try {
        if (System.pwm && System.pwm.setTone) {
            System.pwm.setTone(19, freq, dur);
        }
    } catch(e) {}
}

// ============================================================
// Grid Management & Cascade Drop
// ============================================================
function initBoard() {
    grid = [];
    animOffset = [];
    for (var r = 0; r < ROWS; r++) {
        var row = [];
        var aRow = [];
        for (var c = 0; c < COLS; c++) {
            row.push(Math.floor(Math.random() * BUBBLE_COLORS.length));
            aRow.push(0);
        }
        grid.push(row);
        animOffset.push(aRow);
    }
}

function startLevel(lvl) {
    level = lvl;
    movesLeft = 20 + Math.min(lvl * 2, 10);
    targetScore = score + (lvl * 550);
    initBoard();
    gameState = STATE_PLAYING;
}

function resetGame() {
    score = 0;
    level = 1;
    startLevel(1);
}

// 4-Directional Neighbor Search (Up, Down, Left, Right)
function findConnectedCluster(startR, startC, targetColor) {
    var visited = {};
    var cluster = [];
    var queue = [{ r: startR, c: startC }];
    visited[startR + "_" + startC] = true;

    var dirs = [
        { r: -1, c: 0 },
        { r: 1,  c: 0 },
        { r: 0,  c: -1 },
        { r: 0,  c: 1 }
    ];

    while (queue.length > 0) {
        var curr = queue.shift();
        cluster.push(curr);

        for (var d = 0; d < dirs.length; d++) {
            var nr = curr.r + dirs[d].r;
            var nc = curr.c + dirs[d].c;

            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                var key = nr + "_" + nc;
                if (!visited[key] && grid[nr][nc] === targetColor) {
                    visited[key] = true;
                    queue.push({ r: nr, c: nc });
                }
            }
        }
    }
    return cluster;
}

// Bubble Pop & Physics Refill
function popCluster(cluster) {
    var color = grid[cluster[0].r][cluster[0].c];

    // ১. পপিং ইফেক্ট চালু করা
    for (var i = 0; i < cluster.length; i++) {
        var cell = cluster[i];
        var cx = START_X + cell.c * CELL_SIZE + Math.floor(CELL_SIZE / 2);
        var cy = START_Y + cell.r * CELL_SIZE + Math.floor(CELL_SIZE / 2);

        poppingEffects.push({
            x: cx,
            y: cy,
            color: BUBBLE_COLORS[color],
            r: BUBBLE_RADIUS,
            maxR: BUBBLE_RADIUS + 8,
            alpha: 7
        });

        // সেল খালি চিহ্নিত করা
        grid[cell.r][cell.c] = -1;
    }

    // ২. স্কোর গণনা (ক্লাস্টার যত বড়, স্কোর গুণক তত বেশি)
    var earned = cluster.length * cluster.length * 5;
    score += earned;

    var midCell = cluster[Math.floor(cluster.length / 2)];
    var fx = START_X + midCell.c * CELL_SIZE + Math.floor(CELL_SIZE / 2);
    var fy = START_Y + midCell.r * CELL_SIZE;
    scoreFloats.push({
        x: fx,
        y: fy,
        text: "+" + earned,
        color: (cluster.length >= 5) ? YELLOW : WHITE,
        alpha: 22
    });

    playTone(650 + Math.min(cluster.length * 60, 600), 40);

    // ৩. গ্র্যাভিটি ড্রপ ও ওপর থেকে নতুন বাবল রিফিল (Cascade)
    refillBoard();

    movesLeft--;

    // লেভেল ক্লিয়ার বা গেম ওভার চেক
    if (score >= targetScore) {
        if (score > highScore) highScore = score;
        gameState = STATE_LEVEL_CLEAR;
        playTone(1400, 150);
    } else if (movesLeft <= 0) {
        if (score > highScore) highScore = score;
        gameState = STATE_GAMEOVER;
        playTone(300, 250);
    }
}

function refillBoard() {
    // প্রতিটি কলাম নিচে নামবে এবং খালি হওয়া ওপরে নতুন বাবল পড়বে
    for (var c = 0; c < COLS; c++) {
        var existing = [];
        for (var r = ROWS - 1; r >= 0; r--) {
            if (grid[r][c] >= 0) {
                existing.push(grid[r][c]);
            }
        }

        var emptyCount = ROWS - existing.length;

        // নিচ থেকে সাজানো
        for (var r = ROWS - 1; r >= 0; r--) {
            var existIdx = (ROWS - 1) - r;
            if (existIdx < existing.length) {
                var prevColor = grid[r][c];
                grid[r][c] = existing[existIdx];
                // নিচে নেমে আসার মসৃণ অ্যানিমেশন অফসেট
                if (prevColor === -1) {
                    animOffset[r][c] = -emptyCount * 8;
                }
            } else {
                // নতুন বাবল তৈরি ও ওপর থেকে পড়ার অ্যানিমেশন
                grid[r][c] = Math.floor(Math.random() * BUBBLE_COLORS.length);
                animOffset[r][c] = -(emptyCount + 1) * CELL_SIZE;
            }
        }
    }
}

function updateAnimations() {
    // অ্যানিমেশন অফসেটগুলো স্বাভাবিক অবস্থানে (০) আনা
    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            if (animOffset[r][c] < 0) {
                animOffset[r][c] += 4;
                if (animOffset[r][c] > 0) animOffset[r][c] = 0;
            }
        }
    }

    // পপিং অ্যানিমেশন রিং
    for (var p = poppingEffects.length - 1; p >= 0; p--) {
        var pop = poppingEffects[p];
        pop.r += 1.2;
        pop.alpha--;
        if (pop.alpha <= 0 || pop.r >= pop.maxR) {
            poppingEffects.splice(p, 1);
        }
    }

    // ভাসমান স্কোর টেক্সট
    for (var s = scoreFloats.length - 1; s >= 0; s--) {
        scoreFloats[s].y -= 1;
        scoreFloats[s].alpha--;
        if (scoreFloats[s].alpha <= 0) {
            scoreFloats.splice(s, 1);
        }
    }
}

// ============================================================
// Drawing Routines
// ============================================================
function drawBubble(cx, cy, color) {
    System.fillCircle(cx, cy, BUBBLE_RADIUS, color);
    System.drawCircle(cx, cy, BUBBLE_RADIUS, COLOR_BORDER);
    // 3D গ্লাস রিফ্লেকশন হাইলাইট
    System.fillCircle(cx - 3, cy - 3, 2, WHITE);
}

function render() {
    System.fillScreen(COLOR_BG);

    // Header Panel
    System.fillRect(0, 0, SCREEN_W, HEADER_H, COLOR_PANEL);
    System.drawFastHLine(0, HEADER_H, SCREEN_W, COLOR_BORDER);

    System.setTextColor(WHITE, COLOR_PANEL);
    System.drawString("Lvl:" + level, 8, 8, 2);

    System.setTextColor(YELLOW, COLOR_PANEL);
    System.drawString("Score:" + score, 65, 8, 2);

    System.setTextColor(CYAN, COLOR_PANEL);
    System.drawString("Moves:" + movesLeft, 130, 8, 2);

    // Reserved OS Exit Button [X]
    System.fillRoundRect(205, 5, 26, 20, 3, RED);
    System.setTextColor(WHITE, RED);
    System.drawString("X", 214, 7, 2);

    // Target Score Sub-header
    System.setTextColor(0xBDD7, COLOR_PANEL);
    System.drawString("Target: " + targetScore, 8, 24, 1);

    if (gameState === STATE_TITLE) {
        System.setTextColor(YELLOW, COLOR_BG);
        System.drawString("BUBBLE POP", Math.floor(SCREEN_W / 2) - 65, 90, 4);

        System.setTextColor(WHITE, COLOR_BG);
        System.drawString("Tap 2 or more of same color!", 20, 135, 2);
        System.drawString("Single bubbles will NOT pop.", 22, 155, 2);

        System.fillRoundRect(35, 210, 170, 38, 6, 0x03E0);
        System.setTextColor(WHITE, 0x03E0);
        System.drawString("START GAME", Math.floor(SCREEN_W / 2) - 45, 222, 2);
    }
    else if (gameState === STATE_PLAYING) {
        // বোর্ড ও বাবল আঁকা
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (grid[r] && grid[r][c] >= 0) {
                    var cx = START_X + c * CELL_SIZE + Math.floor(CELL_SIZE / 2);
                    var cy = START_Y + r * CELL_SIZE + Math.floor(CELL_SIZE / 2) + animOffset[r][c];

                    drawBubble(cx, cy, BUBBLE_COLORS[grid[r][c]]);
                }
            }
        }

        // পপিং বিস্ফোরণ অ্যানিমেশন
        for (var p = 0; p < poppingEffects.length; p++) {
            var pop = poppingEffects[p];
            System.drawCircle(pop.x, pop.y, Math.floor(pop.r), pop.color);
            System.drawCircle(pop.x, pop.y, Math.floor(pop.r - 2), WHITE);
        }

        // ভাসমান স্কোর পার্টিকেল
        for (var s = 0; s < scoreFloats.length; s++) {
            System.setTextColor(scoreFloats[s].color, COLOR_BG);
            System.drawString(scoreFloats[s].text, scoreFloats[s].x - 10, scoreFloats[s].y, 2);
        }
    }
    else if (gameState === STATE_LEVEL_CLEAR || gameState === STATE_GAMEOVER) {
        // পেছনের গ্রিড হালকা প্রদর্শন
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                if (grid[r] && grid[r][c] >= 0) {
                    var cx = START_X + c * CELL_SIZE + Math.floor(CELL_SIZE / 2);
                    var cy = START_Y + r * CELL_SIZE + Math.floor(CELL_SIZE / 2);
                    drawBubble(cx, cy, DARKGREY);
                }
            }
        }

        var boxY = 95;
        System.fillRoundRect(20, boxY, 200, 130, 8, 0x18C3);
        System.drawRoundRect(20, boxY, 200, 130, 8, (gameState === STATE_LEVEL_CLEAR) ? GREEN : RED);

        System.setTextColor((gameState === STATE_LEVEL_CLEAR) ? GREEN : RED, 0x18C3);
        System.drawString((gameState === STATE_LEVEL_CLEAR) ? "LEVEL CLEARED!" : "GAME OVER", 36, boxY + 14, 4);

        System.setTextColor(WHITE, 0x18C3);
        System.drawString("Final Score: " + score, 48, boxY + 50, 2);

        System.fillRoundRect(45, boxY + 80, 150, 32, 5, BLUE);
        System.setTextColor(WHITE, BLUE);
        System.drawString((gameState === STATE_LEVEL_CLEAR) ? "NEXT LEVEL" : "PLAY AGAIN", 68, boxY + 88, 2);
    }

    if (useBuffer) {
        System.pushSprite(0, 0);
    }
}

// ============================================================
// Touch Input Handling (Debounced & Releases)
// ============================================================
function handleTouchInput() {
    var touch = System.getTouch();
    var now = System.millis();

    if (!touch || !touch.touched) {
        touchReleased = true;
        return;
    }

    // ওএস এক্সিট এলাকা (x >= 195, y <= 40) সরাসরি ক্লিকেবল
    if (touch.x >= 195 && touch.y <= 40) return;

    // কুলডাউন চেক ও আগের টাচ পুরোপুরি ছেড়ে দেওয়ার শর্ত
    if (!touchReleased || (now - lastTouchTime < TOUCH_COOLDOWN)) {
        return;
    }

    var tx = touch.x;
    var ty = touch.y;

    if (gameState === STATE_TITLE) {
        touchReleased = false;
        lastTouchTime = now;
        resetGame();
        return;
    }

    if (gameState === STATE_LEVEL_CLEAR) {
        touchReleased = false;
        lastTouchTime = now;
        startLevel(level + 1);
        return;
    }

    if (gameState === STATE_GAMEOVER) {
        touchReleased = false;
        lastTouchTime = now;
        resetGame();
        return;
    }

    if (gameState === STATE_PLAYING) {
        // গ্রিড এলাকার মধ্যে টাচ হয়েছে কিনা যাচাই
        if (tx >= START_X && tx < START_X + (COLS * CELL_SIZE) &&
            ty >= START_Y && ty < START_Y + (ROWS * CELL_SIZE)) {

            var c = Math.floor((tx - START_X) / CELL_SIZE);
            var r = Math.floor((ty - START_Y) / CELL_SIZE);

            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] >= 0) {
                var targetColor = grid[r][c];
                var cluster = findConnectedCluster(r, c, targetColor);

                // নিয়ম: একের অধিক (২ বা ততোধিক) হলেই কেবল ফুটবে
                if (cluster.length >= 2) {
                    popCluster(cluster);

                    touchReleased = false;
                    lastTouchTime = now;
                } else {
                    // সিঙ্গেল বাবল হলে হালকা নেগেটিভ সাউন্ড
                    playTone(200, 20);
                    touchReleased = false;
                    lastTouchTime = now;
                }
            }
        }
    }
}

// ============================================================
// Main Loop
// ============================================================
resetGame();
gameState = STATE_TITLE;

while (true) {
    handleTouchInput();

    if (gameState === STATE_PLAYING) {
        updateAnimations();
    }

    render();

    // সিস্টেম ওয়াচডগ ফিড ও স্থির ৬০ এফপিএস
    System.delay(16);
      }
