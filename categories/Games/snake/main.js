// ============================================================================
// KryonOS Snake Xenzia Retro Edition
// Author: shifat100
// Package: com.shifat100.snakexenzia
// ============================================================================

// ----------------------------------------------------------------------------
// 1. কালার প্যালেট (Nokia Retro LCD & Modern Frame)
// ----------------------------------------------------------------------------
var C_BLACK         = 0x0000;
var C_WHITE         = 0xFFFF;
var C_PANEL_BG      = System.color(20, 24, 34);   // বেজেল ব্যাকগ্রাউন্ড
var C_BORDER        = System.color(45, 55, 75);
var C_GOLD          = System.color(255, 210, 30);
var C_CYAN          = System.color(0, 220, 255);
var C_RED           = System.color(240, 50, 60);

// Nokia 3310/1100 Retro LCD টোন
var C_LCD_BG        = System.color(154, 178, 122); // ক্লাসিক নোকিয়া হালকা সবুজ LCD
var C_LCD_DARK      = System.color(24, 36, 18);    // ডার্ক পিক্সেল (সাপ ও খাদ্য)
var C_LCD_SHADOW    = System.color(138, 160, 108); // আবছা গ্রিড / বাউন্ডারি
var C_LCD_EYE       = System.color(170, 195, 135); // চোখের জন্য হালকা রঙ
var C_LCD_BONUS     = System.color(45, 62, 32);

// Touch D-Pad বোতাম স্টাইলিং
var C_BTN_REST      = System.color(26, 32, 48);
var C_BTN_BORDER    = System.color(52, 66, 96);
var C_BTN_ACTIVE    = System.color(0, 180, 230);
var C_BTN_ICON      = System.color(210, 225, 250);

// ----------------------------------------------------------------------------
// 2. স্ক্রিন ও গ্রিড ডাইমেনশন
// ----------------------------------------------------------------------------
var GRID_COLS       = 20;
var GRID_ROWS       = 20;
var CELL_SIZE       = 12;                 // 20 cols * 12px = 240px wide
var GAME_Y          = 24;                 // Top Margin (Header)
var GAME_H          = GRID_ROWS * CELL_SIZE; // 20 * 12 = 240px Render window
var HUD_Y           = 268;                // Bottom Touch Controls

var BTN_CONFIG = [
    { id: "left",  x: 6,   w: 52, dir: "left" },
    { id: "up",    x: 64,  w: 52, dir: "up" },
    { id: "down",  x: 122, w: 52, dir: "down" },
    { id: "right", x: 180, w: 54, dir: "right" }
];

// ----------------------------------------------------------------------------
// 3. গেম স্টেট ভেরিয়েবলস
// ----------------------------------------------------------------------------
var snake           = [];
var dirX            = 1;
var dirY            = 0;
var nextDirX        = 1;
var nextDirY        = 0;

var food            = { x: 14, y: 10 };
var bonusFood       = null; // { x, y, timeLeft, totalTime }
var foodsEatenCount = 0;

var score           = 0;
var highScore       = 0;
var gameState       = "TITLE"; // 'TITLE', 'PLAYING', 'DYING', 'GAMEOVER'
var deathStartTime  = 0;
var gameOverShownAt = 0;

var moveTimer       = 0;
var baseStepDelay   = 145;     // মিলিসেকেন্ডে প্রাথমিক গতি
var currentDelay    = 145;
var lastTickTime    = 0;
var lastTouchTime   = 0;
var activeBtnId     = null;
var hasDoubleBuffer = false;

// ----------------------------------------------------------------------------
// 4. হাই-স্কোর পারসিস্টেন্স
// ----------------------------------------------------------------------------
function loadHighScore() {
    try {
        if (typeof FS !== "undefined" && FS.exists("snake_highscore.json")) {
            var raw = FS.readTextFile("snake_highscore.json");
            if (raw && raw.length > 0) {
                var data = JSON.parse(raw);
                if (data && typeof data.highScore === "number") {
                    highScore = data.highScore;
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
            FS.writeTextFile("snake_highscore.json", JSON.stringify({ highScore: highScore }));
        }
    } catch (e) {}
}

// ----------------------------------------------------------------------------
// 5. ফুড স্পন ও গেম ইনিশিয়ালাইজেশন
// ----------------------------------------------------------------------------
function isOccupied(x, y) {
    for (var i = 0; i < snake.length; i++) {
        if (snake[i].x === x && snake[i].y === y) return true;
    }
    if (food && food.x === x && food.y === y) return true;
    if (bonusFood && bonusFood.x === x && bonusFood.y === y) return true;
    return false;
}

function spawnFood() {
    var valid = false;
    var rx = 0, ry = 0;
    var attempts = 0;

    while (!valid && attempts < 200) {
        rx = Math.floor(Math.random() * (GRID_COLS - 2)) + 1;
        ry = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
        if (!isOccupied(rx, ry)) {
            valid = true;
        }
        attempts++;
    }
    food = { x: rx, y: ry };
}

function spawnBonusBug() {
    var rx = 0, ry = 0;
    var attempts = 0;
    while (attempts < 100) {
        rx = Math.floor(Math.random() * (GRID_COLS - 2)) + 1;
        ry = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
        if (!isOccupied(rx, ry)) {
            bonusFood = {
                x: rx,
                y: ry,
                timeLeft: 8000,
                totalTime: 8000
            };
            return;
        }
        attempts++;
    }
}

function startNewGame() {
    snake = [
        { x: 7, y: 10 },
        { x: 6, y: 10 },
        { x: 5, y: 10 },
        { x: 4, y: 10 }
    ];
    dirX            = 1;
    dirY            = 0;
    nextDirX        = 1;
    nextDirY        = 0;
    score           = 0;
    foodsEatenCount = 0;
    bonusFood       = null;
    currentDelay    = baseStepDelay;
    moveTimer       = 0;
    deathStartTime  = 0;
    gameState       = "PLAYING";

    spawnFood();
    drawFullUI();
}

function triggerGameOver() {
    if (gameState === "PLAYING") {
        gameState = "DYING";
        deathStartTime = System.millis();

        if (score > highScore) {
            highScore = score;
            saveHighScore();
        }
    }
}

// ----------------------------------------------------------------------------
// 6. ডিরেকশন ও ইনপুট বাফারিং
// ----------------------------------------------------------------------------
function changeDirection(dx, dy) {
    if (gameState !== "PLAYING") return;
    // ১৮০ ডিগ্রি ঘুরে নিজের গায়ে আঘাত রোধ (Anti-Reverse)
    if (dx !== 0 && dirX === -dx) return;
    if (dy !== 0 && dirY === -dy) return;

    nextDirX = dx;
    nextDirY = dy;
}

// ----------------------------------------------------------------------------
// 7. গেম লজিক ও আপডেট
// ----------------------------------------------------------------------------
function updateSnakeLogic(dt) {
    if (gameState === "DYING") {
        if (System.millis() - deathStartTime > 1200) {
            gameState = "GAMEOVER";
            gameOverShownAt = System.millis();
        }
        return;
    }

    if (gameState !== "PLAYING") return;

    // বোনাস পোকা/ইনসেক্ট টাইমার আপডেট
    if (bonusFood) {
        bonusFood.timeLeft -= dt;
        if (bonusFood.timeLeft <= 0) {
            bonusFood = null;
        }
    }

    moveTimer += dt;
    if (moveTimer < currentDelay) {
        return;
    }
    moveTimer = 0;

    // বাফার থেকে ডিরেকশন গ্রহণ
    dirX = nextDirX;
    dirY = nextDirY;

    var head = snake[0];
    var newX = head.x + dirX;
    var newY = head.y + dirY;

    // Snake Xenzia Wall Wrapping (বর্ডার পার হলে অপর পাশে আগমন)
    if (newX < 0) newX = GRID_COLS - 1;
    else if (newX >= GRID_COLS) newX = 0;

    if (newY < 0) newY = GRID_ROWS - 1;
    else if (newY >= GRID_ROWS) newY = 0;

    // নিজের শরীরে আঘাত চেক (Self-Collision)
    for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === newX && snake[i].y === newY) {
            triggerGameOver();
            return;
        }
    }

    // নতুন মাথা যোগ করা
    snake.unshift({ x: newX, y: newY });

    // ১. সাধারণ খাবার খাওয়া চেক
    if (newX === food.x && newY === food.y) {
        score += 10;
        foodsEatenCount++;

        // গতি বৃদ্ধি (Snake Acceleration)
        if (currentDelay > 65) {
            currentDelay -= 2;
        }

        spawnFood();

        // প্রতি ৫টি খাবার খাওয়ার পর বোনাস বাগ আসবে
        if (foodsEatenCount % 5 === 0 && !bonusFood) {
            spawnBonusBug();
        }
    } 
    // ২. বোনাস বাগ খাওয়া চেক
    else if (bonusFood && newX === bonusFood.x && newY === bonusFood.y) {
        var bonusPoints = Math.max(20, Math.floor((bonusFood.timeLeft / bonusFood.totalTime) * 100));
        score += bonusPoints;
        bonusFood = null;
    } 
    // খাবার না খেলে লেজ কেটে দৈর্ঘ্য স্থির রাখা
    else {
        snake.pop();
    }
}

// ----------------------------------------------------------------------------
// 8. রেন্ডারিং ও আঁকাআঁকি
// ----------------------------------------------------------------------------
function drawVectorArrow(cx, cy, dir, color) {
    if (dir === "up") {
        System.fillTriangle(cx, cy - 8, cx - 8, cy + 1, cx + 8, cy + 1, color);
        System.fillRect(cx - 3, cy + 1, 7, 8, color);
    } 
    else if (dir === "down") {
        System.fillTriangle(cx, cy + 8, cx - 8, cy - 1, cx + 8, cy - 1, color);
        System.fillRect(cx - 3, cy - 8, 7, 8, color);
    } 
    else if (dir === "left") {
        System.fillTriangle(cx - 8, cy, cx + 1, cy - 8, cx + 1, cy + 8, color);
        System.fillRect(cx + 1, cy - 3, 8, 7, color);
    } 
    else if (dir === "right") {
        System.fillTriangle(cx + 8, cy, cx - 1, cy - 8, cx - 1, cy + 8, color);
        System.fillRect(cx - 8, cy - 3, 8, 7, color);
    }
}

function renderBoard(offsetY) {
    // নোকিয়া LCD ক্যানভাস
    System.fillRect(0, offsetY, 240, GAME_H, C_LCD_BG);

    // ডটেড রেট্রো আউটার বর্ডার
    for (var b = 0; b < 240; b += 6) {
        System.fillRect(b, offsetY, 3, 1, C_LCD_SHADOW);
        System.fillRect(b, offsetY + GAME_H - 1, 3, 1, C_LCD_SHADOW);
        System.fillRect(0, offsetY + b, 1, 3, C_LCD_SHADOW);
        System.fillRect(239, offsetY + b, 1, 3, C_LCD_SHADOW);
    }

    // ১. সাধারণ খাবার রেন্ডার (ক্লাসিক ডট-ম্যাট্রিক্স কিউব)
    var fx = food.x * CELL_SIZE;
    var fy = offsetY + food.y * CELL_SIZE;
    System.fillRect(fx + 2, fy + 2, 8, 8, C_LCD_DARK);
    System.fillRect(fx + 4, fy + 4, 4, 4, C_LCD_BG); // সেন্টারে ফাঁপা অ্যাপল লুক

    // ২. বোনাস বাগ রেন্ডার (কাউন্টডাউনসহ ব্লিঙ্কিং পোকা)
    if (bonusFood) {
        var bx = bonusFood.x * CELL_SIZE;
        var by = offsetY + bonusFood.y * CELL_SIZE;
        var blink = (Math.floor(bonusFood.timeLeft / 120) % 2 === 0);

        if (blink) {
            System.fillRect(bx + 1, by + 3, 10, 6, C_LCD_BONUS);
            System.fillRect(bx + 3, by + 1, 6, 10, C_LCD_BONUS);
            // পা ও শুঁড়
            System.fillRect(bx, by + 1, 2, 2, C_LCD_DARK);
            System.fillRect(bx + 10, by + 1, 2, 2, C_LCD_DARK);
            System.fillRect(bx, by + 9, 2, 2, C_LCD_DARK);
            System.fillRect(bx + 10, by + 9, 2, 2, C_LCD_DARK);
        }
    }

    // ৩. সাপের শরীর রেন্ডার
    var isDying = (gameState === "DYING");
    var flashHide = isDying && (Math.floor((System.millis() - deathStartTime) / 100) % 2 === 0);

    if (!flashHide) {
        for (var i = snake.length - 1; i >= 0; i--) {
            var seg = snake[i];
            var sx = seg.x * CELL_SIZE;
            var sy = offsetY + seg.y * CELL_SIZE;

            if (i === 0) {
                // মাথা (চোখসহ)
                System.fillRoundRect(sx + 1, sy + 1, CELL_SIZE - 2, CELL_SIZE - 2, 2, C_LCD_DARK);

                // চোখ (দিক অনুযায়ী বসবে)
                var ex1 = sx + 3, ey1 = sy + 3;
                var ex2 = sx + 8, ey2 = sy + 3;
                if (dirX === 1) {       ex1 = sx + 7; ey1 = sy + 3; ex2 = sx + 7; ey2 = sy + 7; }
                else if (dirX === -1) { ex1 = sx + 3; ey1 = sy + 3; ex2 = sx + 3; ey2 = sy + 7; }
                else if (dirY === 1) {  ex1 = sx + 3; ey1 = sy + 7; ex2 = sx + 7; ey2 = sy + 7; }

                System.fillRect(ex1, ey1, 2, 2, C_LCD_EYE);
                System.fillRect(ex2, ey2, 2, 2, C_LCD_EYE);
            } else {
                // বডি সেগমেন্ট
                System.fillRect(sx + 1, sy + 1, CELL_SIZE - 2, CELL_SIZE - 2, C_LCD_DARK);
                // রেট্রো ডট প্যাটার্ন টেক্সচার
                System.fillRect(sx + 4, sy + 4, 4, 4, C_LCD_SHADOW);
            }
        }
    }
}

function renderOverlays(baseY) {
    if (gameState === "GAMEOVER") {
        System.fillRoundRect(22, baseY + 62, 196, 116, 6, C_PANEL_BG);
        System.drawRoundRect(22, baseY + 62, 196, 116, 6, C_RED);

        System.setTextDatum(4);
        System.setTextColor(C_RED, C_PANEL_BG);
        System.drawString("GAME OVER", 120, baseY + 84, 4);

        System.setTextColor(C_WHITE, C_PANEL_BG);
        System.drawString("SCORE: " + String(score), 120, baseY + 114, 2);

        System.setTextColor(C_GOLD, C_PANEL_BG);
        System.drawString("BEST: " + String(highScore), 120, baseY + 136, 2);

        System.setTextColor(C_CYAN, C_PANEL_BG);
        System.drawString("TAP TO RETRY", 120, baseY + 160, 2);
    } 
    else if (gameState === "TITLE") {
        System.fillRoundRect(20, baseY + 56, 200, 128, 6, C_PANEL_BG);
        System.drawRoundRect(20, baseY + 56, 200, 128, 6, C_CYAN);

        System.setTextDatum(4);
        System.setTextColor(C_CYAN, C_PANEL_BG);
        System.drawString("SNAKE XENZIA", 120, baseY + 80, 4);

        System.setTextColor(C_WHITE, C_PANEL_BG);
        System.drawString("CLASSIC RETRO", 120, baseY + 108, 2);

        System.setTextColor(C_GOLD, C_PANEL_BG);
        System.drawString("RECORD: " + String(highScore), 120, baseY + 132, 2);

        System.setTextColor(C_GOLD, C_PANEL_BG);
        System.drawString("TAP TO START", 120, baseY + 162, 2);
    }
}

// ----------------------------------------------------------------------------
// 9. ইউজার ইন্টারফেস ও টাচ বাটন কন্ট্রোলস
// ----------------------------------------------------------------------------
function drawFullUI() {
    System.fillScreen(C_PANEL_BG);

    // Top Header Bar
    System.fillRect(0, 0, 240, GAME_Y, C_PANEL_BG);
    System.drawFastHLine(0, GAME_Y - 1, 240, C_BORDER);

    System.setTextColor(C_CYAN, C_PANEL_BG);
    System.setTextDatum(0);
    System.drawString("XENZIA", 8, 5, 2);

    updateScoreHeader();
    drawTouchButtons();
}

function updateScoreHeader() {
    System.fillRect(80, 2, 156, 20, C_PANEL_BG);

    System.setTextColor(C_WHITE, C_PANEL_BG);
    System.setTextDatum(0);
    System.drawString("SCR:" + String(score), 84, 5, 2);

    System.setTextColor(C_GOLD, C_PANEL_BG);
    System.drawString("HI:" + String(highScore), 160, 5, 2);

    // বোনাস বাউন্টি প্রগ্রেস বার
    if (bonusFood) {
        var barW = Math.max(0, Math.floor((bonusFood.timeLeft / bonusFood.totalTime) * 32));
        System.drawRect(128, 7, 34, 10, C_BORDER);
        System.fillRect(129, 8, barW, 8, C_GOLD);
    }
}

function drawTouchButtons() {
    for (var i = 0; i < BTN_CONFIG.length; i++) {
        var b = BTN_CONFIG[i];
        var isDown = (activeBtnId === b.id);
        var bg = isDown ? C_BTN_ACTIVE : C_BTN_REST;
        var iconColor = isDown ? C_BLACK : C_BTN_ICON;

        System.fillRoundRect(b.x, HUD_Y, b.w, 46, 6, bg);
        System.drawRoundRect(b.x, HUD_Y, b.w, 46, 6, C_BTN_BORDER);

        var centerX = b.x + Math.floor(b.w / 2);
        var centerY = HUD_Y + 23;
        drawVectorArrow(centerX, centerY, b.dir, iconColor);
    }
}

function renderFrame() {
    updateScoreHeader();

    if (hasDoubleBuffer) {
        System.bindSprite(true);
        renderBoard(0);
        renderOverlays(0);
        System.bindSprite(false);
        System.pushSprite(0, GAME_Y);
    } else {
        renderBoard(GAME_Y);
        renderOverlays(GAME_Y);
    }
}

// ----------------------------------------------------------------------------
// 10. টাচ ইনপুট হ্যান্ডলার
// ----------------------------------------------------------------------------
function handleInput() {
    var touch = System.getTouch();
    if (!touch || !touch.touched) {
        if (activeBtnId) {
            activeBtnId = null;
            drawTouchButtons();
        }
        return;
    }

    var now = System.millis();
    if (now - lastTouchTime < 110) return;
    lastTouchTime = now;

    var tx = touch.x;
    var ty = touch.y;

    if (gameState === "DYING") return;

    if (gameState === "TITLE") {
        startNewGame();
        return;
    }

    if (gameState === "GAMEOVER") {
        if (now - gameOverShownAt > 350) {
            startNewGame();
        }
        return;
    }

    // নিচের বাটন কন্ট্রোলস
    if (ty >= HUD_Y - 4 && ty <= 318) {
        for (var i = 0; i < BTN_CONFIG.length; i++) {
            var btn = BTN_CONFIG[i];
            if (tx >= btn.x && tx <= btn.x + btn.w) {
                activeBtnId = btn.id;
                drawTouchButtons();

                if (btn.id === "left")       changeDirection(-1, 0);
                else if (btn.id === "up")    changeDirection(0, -1);
                else if (btn.id === "down")  changeDirection(0, 1);
                else if (btn.id === "right") changeDirection(1, 0);
                break;
            }
        }
        return;
    }

    // স্ক্রিনের ভেতর সরাসরি ডিরেকশন সোয়াইপ/ট্যাপ
    if (ty >= GAME_Y && ty < GAME_Y + GAME_H) {
        var localY = ty - GAME_Y;
        if (localY < 65) {
            changeDirection(0, -1); // Up
        } else if (localY > 175) {
            changeDirection(0, 1);  // Down
        } else if (tx < 120) {
            changeDirection(-1, 0); // Left
        } else {
            changeDirection(1, 0);  // Right
        }
    }
}

// ----------------------------------------------------------------------------
// 11. এক্সিকিউশন ও মেইন লুপ
// ----------------------------------------------------------------------------
loadHighScore();

hasDoubleBuffer = System.createSprite(240, GAME_H);

drawFullUI();
renderFrame();
lastTickTime = System.millis();

while (true) {
    var nowTime = System.millis();
    var dt = nowTime - lastTickTime;
    if (dt > 100) dt = 100;
    lastTickTime = nowTime;

    handleInput();
    updateSnakeLogic(dt);
    renderFrame();

    System.delay(20);
}
