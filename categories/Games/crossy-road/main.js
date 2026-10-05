// ============================================================================
// KryonOS Crossy Road Pro (Debugged & Refined)
// Author: shifat100
// Package: com.shifat100.crossyroad
// ============================================================================

// ----------------------------------------------------------------------------
// 1. কালার প্যালেট (RGB565)
// ----------------------------------------------------------------------------
var C_BLACK         = 0x0000;
var C_WHITE         = 0xFFFF;
var C_BG_DARK       = System.color(12, 14, 22);
var C_PANEL_BG      = System.color(20, 24, 38);
var C_BORDER        = System.color(45, 55, 80);
var C_GOLD          = System.color(255, 215, 0);
var C_CYAN          = System.color(0, 220, 255);
var C_RED           = System.color(255, 55, 75);

// Terrain: Grass & Trees
var C_GRASS_TOP     = System.color(92, 178, 58);
var C_GRASS_SIDE    = System.color(68, 142, 42);
var C_GRASS_SPEC    = System.color(120, 205, 80);
var C_TREE_TOP      = System.color(38, 118, 52);
var C_TREE_SIDE     = System.color(24, 82, 36);
var C_TREE_SHADOW   = System.color(42, 95, 34);

// Terrain: Road & Traffic
var C_ROAD_TOP      = System.color(46, 50, 62);
var C_ROAD_SIDE     = System.color(32, 35, 44);
var C_ROAD_LINE     = System.color(225, 230, 240);
var C_CURB_WHITE    = System.color(200, 205, 215);
var C_CURB_RED      = System.color(190, 40, 50);

// Terrain: River & Logs
var C_WATER_DEEP    = System.color(26, 105, 210);
var C_WATER_SURF    = System.color(45, 140, 240);
var C_WATER_FOAM    = System.color(140, 210, 255);
var C_LOG_TOP       = System.color(142, 92, 54);
var C_LOG_SIDE      = System.color(98, 62, 34);
var C_LOG_RING      = System.color(178, 122, 78);

// Terrain: Railroad
var C_BALLAST       = System.color(62, 58, 54);
var C_TIE_WOOD      = System.color(88, 62, 44);
var C_RAIL_STEEL    = System.color(185, 192, 205);

// Vehicles
var VEHICLE_PALETTES = [
    { top: System.color(235, 55, 65),  side: System.color(165, 30, 42),  glass: System.color(140, 215, 255) },
    { top: System.color(248, 195, 28), side: System.color(182, 138, 16), glass: System.color(130, 200, 240) },
    { top: System.color(42, 145, 240), side: System.color(24, 95, 175),  glass: System.color(175, 230, 255) },
    { top: System.color(165, 75, 235), side: System.color(112, 42, 168), glass: System.color(130, 200, 240) },
    { top: System.color(245, 120, 30), side: System.color(175, 78, 16),  glass: System.color(140, 215, 255) }
];

// Modern Button Styling
var C_BTN_REST      = System.color(22, 28, 44);
var C_BTN_BORDER    = System.color(45, 60, 92);
var C_BTN_ACTIVE    = System.color(0, 180, 230);
var C_BTN_ICON      = System.color(210, 225, 250);

// ----------------------------------------------------------------------------
// 2. স্ক্রিন ও গ্রিড ডাইমেনশন
// ----------------------------------------------------------------------------
var COLS         = 10;
var CELL_SIZE    = 24;                  // 10 cols * 24px = 240px wide
var VISIBLE_ROWS = 10;                  // 10 rows * 24px = 240px high
var GAME_Y       = 24;                  // Top Y Margin
var GAME_H       = VISIBLE_ROWS * CELL_SIZE; // 240px Render window
var HUD_Y        = 268;                 // Bottom Touch Controls

var BTN_CONFIG = [
    { id: "left",  x: 6,   w: 52, dir: "left" },
    { id: "up",    x: 64,  w: 52, dir: "up" },
    { id: "down",  x: 122, w: 52, dir: "down" },
    { id: "right", x: 180, w: 54, dir: "right" }
];

// ----------------------------------------------------------------------------
// 3. স্টেট ভেরিয়েবলস
// ----------------------------------------------------------------------------
var playerCol       = 4;
var playerRow       = 0;
var playerX         = 4 * CELL_SIZE;
var isHopping       = false;
var hopStartTime    = 0;
var hopDuration     = 110;
var hopOriginX      = 0;
var hopTargetX      = 0;
var hopFromRow      = 0;

var cameraRow       = 0.0;
var score           = 0;
var highScore       = 0;
var gameState       = "TITLE"; // 'TITLE', 'PLAYING', 'DYING', 'GAMEOVER'
var lastDeathReason = "";
var deathStartTime  = 0;
var gameOverShownAt = 0;

var rowsPool        = [];
var lastTickTime    = 0;
var lastTouchTime   = 0;
var activeBtnId     = null;
var idleTimerStart  = 0;
var MAX_IDLE_MS     = 16000;
var animTick        = 0;
var hasDoubleBuffer = false;

// ----------------------------------------------------------------------------
// 4. হাই-স্কোর পারসিস্টেন্স
// ----------------------------------------------------------------------------
function loadHighScore() {
    try {
        if (typeof FS !== "undefined" && FS.exists("highscore.json")) {
            var raw = FS.readTextFile("highscore.json");
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
            FS.writeTextFile("highscore.json", JSON.stringify({ highScore: highScore }));
        }
    } catch (e) {}
}

// ----------------------------------------------------------------------------
// 5. প্রসিডিউরাল রো জেনারেশন
// ----------------------------------------------------------------------------
function createRowData(index) {
    if (index <= 3) {
        return {
            type: "grass",
            trees: (index === 0) ? [0, 1, 8, 9] : (index === 1 ? [0, 9] : [])
        };
    }

    var rand = Math.random();

    if (rand < 0.30) {
        var treeCols = [];
        for (var c = 0; c < COLS; c++) {
            if (Math.random() < 0.28 && c !== 4 && c !== 5) {
                treeCols.push(c);
            }
        }
        return { type: "grass", trees: treeCols };
    } 
    else if (rand < 0.65) {
        var dir = (Math.random() < 0.5) ? 1 : -1;
        var carCount = 2;
        var spacing = Math.floor(240 / carCount);
        var speed = 0.045 + Math.random() * 0.045;
        var items = [];

        for (var i = 0; i < carCount; i++) {
            var isTruck = (Math.random() < 0.3);
            items.push({
                x: i * spacing + Math.random() * 20,
                w: isTruck ? 42 : 26,
                isTruck: isTruck,
                palette: VEHICLE_PALETTES[Math.floor(Math.random() * VEHICLE_PALETTES.length)]
            });
        }
        return { type: "road", dir: dir, speed: speed, items: items };
    } 
    else if (rand < 0.88) {
        var rDir = (Math.random() < 0.5) ? 1 : -1;
        var rSpeed = 0.03 + Math.random() * 0.03;
        var logItems = [];
        var logCount = 2;
        var lGap = 120;

        for (var j = 0; j < logCount; j++) {
            logItems.push({
                x: j * lGap + Math.random() * 15,
                w: 56 + Math.floor(Math.random() * 24)
            });
        }
        return { type: "water", dir: rDir, speed: rSpeed, items: logItems };
    } 
    else {
        var railDir = (Math.random() < 0.5) ? 1 : -1;
        return {
            type: "rail",
            dir: railDir,
            trainTimer: 2500 + Math.random() * 3000,
            trainX: (railDir === 1) ? -200 : 320,
            trainSpeed: 0.45,
            trainActive: false,
            warning: false
        };
    }
}

function initWorld() {
    rowsPool = [];
    for (var i = 0; i < 35; i++) {
        rowsPool.push(createRowData(i));
    }
}

function verifyRowBuffer(targetRow) {
    while (rowsPool.length <= targetRow + 15) {
        rowsPool.push(createRowData(rowsPool.length));
    }
}

// ----------------------------------------------------------------------------
// 6. গেম স্টেট হ্যান্ডলারস
// ----------------------------------------------------------------------------
function startNewGame() {
    initWorld();
    playerCol       = 4;
    playerRow       = 0;
    playerX         = 4 * CELL_SIZE;
    isHopping       = false;
    cameraRow       = 0.0;
    score           = 0;
    gameState       = "PLAYING";
    lastTickTime    = System.millis();
    idleTimerStart  = System.millis();
    lastDeathReason = "";
    deathStartTime  = 0;

    drawFullUI();
}

function triggerGameOver(reason) {
    if (gameState === "PLAYING") {
        gameState = "DYING";
        deathStartTime = System.millis();
        lastDeathReason = reason;

        if (score > highScore) {
            highScore = score;
            saveHighScore();
        }
    }
}

// ----------------------------------------------------------------------------
// 7. মুভমেন্ট ও লাফের ফিজিক্স
// ----------------------------------------------------------------------------
function isTileAccessible(c, r) {
    if (c < 0 || c >= COLS || r < 0) return false;
    verifyRowBuffer(r);
    var row = rowsPool[r];
    if (row && row.type === "grass") {
        for (var i = 0; i < row.trees.length; i++) {
            if (row.trees[i] === c) return false;
        }
    }
    return true;
}

function requestHop(dc, dr) {
    if (gameState !== "PLAYING" || isHopping) return;

    var destC = playerCol + dc;
    var destR = playerRow + dr;

    if (isTileAccessible(destC, destR)) {
        isHopping = true;
        hopStartTime = System.millis();
        hopOriginX = playerX;
        hopTargetX = destC * CELL_SIZE;
        hopFromRow = playerRow;

        playerCol = destC;
        playerRow = destR;

        if (playerRow > score) {
            score = playerRow;
            if (score > highScore) {
                highScore = score;
            }
        }
        idleTimerStart = System.millis();
    }
}

// ----------------------------------------------------------------------------
// 8. ফিজিক্স আপডেট ও কলিশন ডিটেকশন
// ----------------------------------------------------------------------------
function updatePhysics(dt) {
    if (gameState === "DYING") {
        if (System.millis() - deathStartTime > 1300) {
            gameState = "GAMEOVER";
            gameOverShownAt = System.millis();
        }
    }

    if (gameState !== "PLAYING" && gameState !== "DYING") return;

    verifyRowBuffer(playerRow);
    animTick += dt;

    // শুধুমাত্র স্ক্রিনের কাছাকাছি রো-গুলোর ফিজিক্স আপডেট হবে (Optimization)
    var startR = Math.max(0, Math.floor(cameraRow) - 1);
    var endR = Math.min(rowsPool.length, Math.floor(cameraRow) + VISIBLE_ROWS + 2);

    for (var rIdx = startR; rIdx < endR; rIdx++) {
        var r = rowsPool[rIdx];

        if (r.type === "road" || r.type === "water") {
            for (var i = 0; i < r.items.length; i++) {
                var it = r.items[i];
                it.x += r.dir * r.speed * dt;

                if (r.dir === 1 && it.x > 245) {
                    it.x = -it.w;
                } else if (r.dir === -1 && it.x < -it.w) {
                    it.x = 245;
                }
            }
        } 
        else if (r.type === "rail") {
            r.trainTimer -= dt;
            if (r.trainTimer <= 1200 && r.trainTimer > 0) {
                r.warning = (Math.floor(r.trainTimer / 120) % 2 === 0);
            } else if (r.trainTimer <= 0) {
                r.trainActive = true;
                r.warning = false;
                r.trainX += r.dir * r.trainSpeed * dt;

                if ((r.dir === 1 && r.trainX > 320) || (r.dir === -1 && r.trainX < -220)) {
                    r.trainActive = false;
                    r.trainTimer = 3000 + Math.random() * 3000;
                    r.trainX = (r.dir === 1) ? -200 : 320;
                }
            }
        }
    }

    // লাফের স্মুথ মুভমেন্ট (X ইন্টারপোলেশন)
    if (isHopping) {
        var elapsed = System.millis() - hopStartTime;
        var progress = elapsed / hopDuration;
        if (progress >= 1.0) {
            isHopping = false;
            playerX = hopTargetX;
        } else {
            playerX = hopOriginX + (hopTargetX - hopOriginX) * progress;
        }
    }

    // ক্যামেরা স্মুথ ফলো
    var targetCam = Math.max(0, playerRow - 3);
    if (targetCam > cameraRow) {
        cameraRow += (targetCam - cameraRow) * 0.2;
    }

    if (gameState === "DYING") return;

    // ক্যামেরার নিচে পড়ে গেলে মৃত্যু
    if (playerRow < Math.floor(cameraRow) - 1) {
        triggerGameOver("FELL BEHIND");
        return;
    }

    // কলিশন ডিটেকশন (মাটিতে ল্যান্ড করার পর নিখুঁতভাবে চেক হবে)
    if (!isHopping) {
        var curRow = rowsPool[playerRow];
        var playerCenter = playerX + (CELL_SIZE / 2);

        if (curRow.type === "road") {
            for (var cIdx = 0; cIdx < curRow.items.length; cIdx++) {
                var car = curRow.items[cIdx];
                if (playerX + 5 < car.x + car.w && playerX + CELL_SIZE - 5 > car.x) {
                    triggerGameOver("SQUASHED BY CAR");
                    return;
                }
            }
        } 
        else if (curRow.type === "water") {
            var onLog = false;
            for (var lIdx = 0; lIdx < curRow.items.length; lIdx++) {
                var log = curRow.items[lIdx];
                if (playerCenter >= log.x - 3 && playerCenter <= log.x + log.w + 3) {
                    onLog = true;
                    break;
                }
            }

            if (onLog) {
                playerX += curRow.dir * curRow.speed * dt;
                playerCol = Math.floor((playerX + CELL_SIZE / 2) / CELL_SIZE);

                if (playerX < -8 || playerX > 224) {
                    triggerGameOver("DRIFTED OFF SCREEN");
                    return;
                }
            } else {
                triggerGameOver("DROWNED IN WATER");
                return;
            }
        } 
        else if (curRow.type === "rail" && curRow.trainActive) {
            if (playerX + 4 < curRow.trainX + 175 && playerX + CELL_SIZE - 4 > curRow.trainX) {
                triggerGameOver("HIT BY TRAIN");
                return;
            }
        }
    }

    // অতিরিক্ত অলসতায় ঈগলের আক্রমণ
    if (System.millis() - idleTimerStart > MAX_IDLE_MS) {
        triggerGameOver("SNATCHED BY EAGLE");
        return;
    }
}

// ----------------------------------------------------------------------------
// 9. রেন্ডারিং ইঞ্জিন
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

function drawPlayer(px, py, jumpOffset) {
    var bx = Math.floor(px) + 3;
    var by = Math.floor(py) + 3 - jumpOffset;

    if (gameState === "DYING" || gameState === "GAMEOVER") {
        if (lastDeathReason === "DROWNED IN WATER") {
            System.drawCircle(bx + 8, by + 8, 6, C_WHITE);
            System.drawCircle(bx + 8, by + 8, 10, C_CYAN);
            return;
        } else if (lastDeathReason === "SNATCHED BY EAGLE") {
            return; // ঈগল নিয়ে গেছে, স্ক্রিনে মুরগি নেই
        } else {
            System.fillRect(bx - 2, by + 12, 20, 5, C_WHITE);
            System.fillRect(bx + 5, by + 10, 6, 3, C_RED);
            return;
        }
    }

    if (jumpOffset > 0) {
        System.fillRoundRect(bx + 1, Math.floor(py) + 16, 14, 5, 2, System.color(20, 24, 30));
    }

    System.fillRoundRect(bx, by, 16, 14, 3, C_WHITE);
    System.fillRect(bx, by + 10, 16, 4, System.color(210, 215, 225));
    System.drawFastHLine(bx + 2, by, 12, System.color(255, 255, 255));

    // ঝুঁটি ও ঠোঁট
    System.fillRoundRect(bx + 6, by - 4, 5, 4, 1, C_RED);
    System.fillRect(bx + 6, by + 5, 8, 4, C_GOLD);
    System.drawFastHLine(bx + 6, by + 8, 8, System.color(200, 130, 0));

    // চোখ
    System.fillRect(bx + 4, by + 4, 2, 3, C_BLACK);
    System.fillRect(bx + 13, by + 4, 2, 3, C_BLACK);

    // ডানা
    System.fillRoundRect(bx - 1, by + 5, 2, 7, 1, System.color(220, 225, 235));
    System.fillRoundRect(bx + 15, by + 5, 2, 7, 1, System.color(220, 225, 235));
}

function renderWorldFrame(offsetY) {
    for (var i = VISIBLE_ROWS - 1; i >= 0; i--) {
        var rIdx = Math.floor(cameraRow) + i;
        var sy = offsetY + GAME_H - ((i + 1) * CELL_SIZE);

        if (rIdx >= rowsPool.length) {
            System.fillRect(0, sy, 240, CELL_SIZE, C_GRASS_TOP);
            continue;
        }

        var r = rowsPool[rIdx];

        if (r.type === "grass") {
            System.fillRect(0, sy, 240, CELL_SIZE - 2, C_GRASS_TOP);
            System.fillRect(0, sy + CELL_SIZE - 2, 240, 2, C_GRASS_SIDE);

            System.drawFastHLine(18, sy + 6, 6, C_GRASS_SPEC);
            System.drawFastHLine(95, sy + 14, 8, C_GRASS_SPEC);
            System.drawFastHLine(185, sy + 8, 7, C_GRASS_SPEC);

            for (var t = 0; t < r.trees.length; t++) {
                var tx = r.trees[t] * CELL_SIZE + 2;
                System.fillRoundRect(tx + 2, sy + 15, 18, 7, 3, C_TREE_SHADOW);
                System.fillRect(tx + 8, sy + 12, 4, 8, C_LOG_SIDE);
                System.fillRoundRect(tx + 1, sy + 2, 18, 14, 3, C_TREE_TOP);
                System.fillRect(tx + 1, sy + 11, 18, 5, C_TREE_SIDE);
                System.drawFastHLine(tx + 3, sy + 3, 14, System.color(55, 155, 75));
            }
        }
        else if (r.type === "road") {
            System.fillRect(0, sy, 240, CELL_SIZE - 2, C_ROAD_TOP);
            System.fillRect(0, sy + CELL_SIZE - 2, 240, 2, C_ROAD_SIDE);

            for (var k = 0; k < 240; k += 16) {
                var curbC = (k % 32 === 0) ? C_CURB_RED : C_CURB_WHITE;
                System.drawFastHLine(k, sy, 8, curbC);
            }

            for (var dx = 0; dx < 240; dx += 28) {
                System.drawFastHLine(dx + 6, sy + 11, 12, C_ROAD_LINE);
            }

            for (var c = 0; c < r.items.length; c++) {
                var car = r.items[c];
                var cx = Math.floor(car.x);
                var pal = car.palette;

                System.fillRoundRect(cx, sy + 3, car.w, 17, 3, pal.top);
                System.fillRect(cx, sy + 15, car.w, 5, pal.side);

                if (car.isTruck) {
                    System.drawFastVLine(cx + 12, sy + 4, 15, C_ROAD_SIDE);
                    System.drawFastVLine(cx + 26, sy + 4, 15, C_ROAD_SIDE);
                    System.fillRect(cx + car.w - 10, sy + 5, 8, 10, pal.glass);
                } else {
                    System.fillRect(cx + 5, sy + 5, car.w - 10, 8, pal.glass);
                    System.fillRect(cx + 8, sy + 6, car.w - 16, 6, pal.top);
                }

                var hlX = (r.dir === 1) ? (cx + car.w - 2) : cx;
                System.fillRect(hlX, sy + 5, 2, 3, C_GOLD);
                System.fillRect(hlX, sy + 14, 2, 3, C_GOLD);

                System.fillRect(cx + 3, sy + 1, 4, 2, C_BLACK);
                System.fillRect(cx + car.w - 7, sy + 1, 4, 2, C_BLACK);
                System.fillRect(cx + 3, sy + 19, 4, 2, C_BLACK);
                System.fillRect(cx + car.w - 7, sy + 19, 4, 2, C_BLACK);
            }
        }
        else if (r.type === "water") {
            System.fillRect(0, sy, 240, CELL_SIZE, C_WATER_DEEP);

            var rippleShift = Math.floor(animTick * 0.05) % 24;
            for (var wX = -24; wX < 240; wX += 36) {
                System.drawFastHLine(wX + rippleShift, sy + 6, 12, C_WATER_SURF);
                System.drawFastHLine(wX - rippleShift + 18, sy + 17, 16, C_WATER_FOAM);
            }

            for (var l = 0; l < r.items.length; l++) {
                var log = r.items[l];
                var lx = Math.floor(log.x);

                System.fillRoundRect(lx, sy + 3, log.w, 18, 4, C_LOG_TOP);
                System.fillRect(lx, sy + 16, log.w, 5, C_LOG_SIDE);

                System.fillCircle(lx + 4, sy + 11, 4, C_LOG_RING);
                System.fillCircle(lx + log.w - 5, sy + 11, 4, C_LOG_RING);

                System.drawFastHLine(lx + 8, sy + 7, log.w - 16, C_LOG_SIDE);
                System.drawFastHLine(lx + 12, sy + 13, log.w - 24, System.color(165, 108, 62));
            }
        }
        else if (r.type === "rail") {
            System.fillRect(0, sy, 240, CELL_SIZE, C_BALLAST);

            for (var tie = 0; tie < 240; tie += 12) {
                System.fillRect(tie, sy + 2, 5, 20, C_TIE_WOOD);
            }

            System.drawFastHLine(0, sy + 6, 240, C_RAIL_STEEL);
            System.drawFastHLine(0, sy + 7, 240, System.color(240, 245, 255));
            System.drawFastHLine(0, sy + 16, 240, C_RAIL_STEEL);
            System.drawFastHLine(0, sy + 17, 240, System.color(240, 245, 255));

            if (r.warning) {
                System.fillCircle(14, sy + 11, 5, C_RED);
                System.fillCircle(226, sy + 11, 5, C_RED);
            }

            if (r.trainActive) {
                var txPos = Math.floor(r.trainX);
                System.fillRoundRect(txPos, sy + 2, 175, 20, 5, System.color(230, 42, 42));
                System.fillRect(txPos, sy + 16, 175, 6, System.color(160, 24, 24));

                for (var wn = 14; wn < 165; wn += 18) {
                    System.fillRect(txPos + wn, sy + 6, 11, 7, System.color(30, 36, 50));
                }
            }
        }
    }

    // স্মুথ Y ইন্টারপোলেশন ও জাম্প আর্ক
    var jumpY = 0;
    var visualRow = playerRow;
    if (isHopping) {
        var hopProgress = Math.min(1.0, (System.millis() - hopStartTime) / hopDuration);
        jumpY = Math.floor(Math.sin(hopProgress * Math.PI) * 8);
        visualRow = hopFromRow + (playerRow - hopFromRow) * hopProgress;
    }

    var playerScreenY = offsetY + GAME_H - ((visualRow - Math.floor(cameraRow) + 1) * CELL_SIZE);
    drawPlayer(playerX, playerScreenY, jumpY);
}

function renderOverlays(baseY) {
    if (gameState === "GAMEOVER") {
        System.fillRoundRect(22, baseY + 64, 196, 112, 6, C_PANEL_BG);
        System.drawRoundRect(22, baseY + 64, 196, 112, 6, C_RED);

        System.setTextDatum(4);
        System.setTextColor(C_RED, C_PANEL_BG);
        System.drawString("GAME OVER", 120, baseY + 84, 4);

        System.setTextColor(System.color(160, 170, 190), C_PANEL_BG);
        System.drawString(lastDeathReason, 120, baseY + 108, 1);

        System.setTextColor(C_WHITE, C_PANEL_BG);
        System.drawString("SCORE: " + String(score), 120, baseY + 128, 2);

        System.setTextColor(C_CYAN, C_PANEL_BG);
        System.drawString("TAP TO PLAY AGAIN", 120, baseY + 154, 2);
    } 
    else if (gameState === "TITLE") {
        System.fillRoundRect(22, baseY + 60, 196, 120, 6, C_PANEL_BG);
        System.drawRoundRect(22, baseY + 60, 196, 120, 6, C_CYAN);

        System.setTextDatum(4);
        System.setTextColor(C_CYAN, C_PANEL_BG);
        System.drawString("CROSSY ROAD", 120, baseY + 84, 4);

        System.setTextColor(C_GOLD, C_PANEL_BG);
        System.drawString("BEST RECORD: " + String(highScore), 120, baseY + 116, 2);

        System.setTextColor(C_WHITE, C_PANEL_BG);
        System.drawString("TAP TO HOP IN", 120, baseY + 150, 2);
    }
}

// ----------------------------------------------------------------------------
// 10. ইউজার ইন্টারফেস ও টাচ বাটন কন্ট্রোলস
// ----------------------------------------------------------------------------
function drawFullUI() {
    System.fillScreen(C_BG_DARK);

    System.fillRect(0, 0, 240, GAME_Y, C_PANEL_BG);
    System.drawFastHLine(0, GAME_Y - 1, 240, C_BORDER);

    System.setTextColor(C_CYAN, C_PANEL_BG);
    System.setTextDatum(0);
    System.drawString("CROSSY", 8, 5, 2);

    updateScoreHeader();
    drawTouchButtons();
}

function updateScoreHeader() {
    System.fillRect(90, 2, 146, 20, C_PANEL_BG);

    System.setTextColor(C_WHITE, C_PANEL_BG);
    System.setTextDatum(0);
    System.drawString("SCR: " + String(score), 96, 5, 2);

    System.setTextColor(C_GOLD, C_PANEL_BG);
    System.drawString("HI: " + String(highScore), 170, 5, 2);
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
        renderWorldFrame(0);
        renderOverlays(0); // স্প্রাইটের ভেতর ওভারলে আঁকা (নো ফ্লিকার)
        System.bindSprite(false);
        System.pushSprite(0, GAME_Y);
    } else {
        renderWorldFrame(GAME_Y);
        renderOverlays(GAME_Y);
    }
}

// ----------------------------------------------------------------------------
// 11. টাচ ইনপুট হ্যান্ডলার
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
    if (now - lastTouchTime < 135) return;
    lastTouchTime = now;

    var tx = touch.x;
    var ty = touch.y;

    if (gameState === "DYING") return;

    if (gameState === "TITLE") {
        startNewGame();
        return;
    }

    if (gameState === "GAMEOVER") {
        if (now - gameOverShownAt > 400) {
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

                if (btn.id === "left") requestHop(-1, 0);
                else if (btn.id === "up") requestHop(0, 1);
                else if (btn.id === "down") requestHop(0, -1);
                else if (btn.id === "right") requestHop(1, 0);
                break;
            }
        }
        return;
    }

    // স্ক্রিন ডাইরেক্ট টাচ
    if (ty >= GAME_Y && ty < GAME_Y + GAME_H) {
        if (ty < GAME_Y + 80) {
            requestHop(0, 1);
        } else if (ty > GAME_Y + 160) {
            requestHop(0, -1);
        } else if (tx < 120) {
            requestHop(-1, 0);
        } else {
            requestHop(1, 0);
        }
    }
}

// ----------------------------------------------------------------------------
// 12. এক্সিকিউশন ও মেইন লুপ
// ----------------------------------------------------------------------------
loadHighScore();

hasDoubleBuffer = System.createSprite(240, GAME_H);

initWorld();
drawFullUI();
renderFrame();
lastTickTime = System.millis();

while (true) {
    var nowTime = System.millis();
    var dt = nowTime - lastTickTime;
    if (dt > 100) dt = 100;
    lastTickTime = nowTime;

    handleInput();
    updatePhysics(dt);
    renderFrame();

    System.delay(33);
}
