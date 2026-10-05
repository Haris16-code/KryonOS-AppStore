/**
 * KryonOS Bubble Shooter (Enhanced Animation & Fixed Grid Edition)
 * Screen: 240x320 Portrait | Touch Debounced & Physics Enabled
 */

// ============================================================
// Display & Layout Configuration
// ============================================================
var SCREEN_W = System.screenWidth();
var SCREEN_H = System.screenHeight();

var TOP_Y = 28;
var LEFT_WALL = 10;
var RIGHT_WALL = SCREEN_W - 10;
var DANGER_Y = 245;
var SHOOTER_X = Math.floor(SCREEN_W / 2);
var SHOOTER_Y = 285;

var BUBBLE_RADIUS = 10;
var BUBBLE_DIAMETER = 20;
var ROW_HEIGHT = 17; // Hexagonal vertical step: R * sqrt(3)

var GRID_ROWS = 12;

// Color Palette (RGB565 via KryonOS System constants)
var COLOR_BG = BLACK;
var COLOR_BORDER = DARKGREY;
var COLOR_TEXT = WHITE;
var COLOR_DANGER = RED;

var BUBBLE_COLORS = [
    RED,        // 0: Red
    GREEN,      // 1: Green
    BLUE,       // 2: Blue
    YELLOW,     // 3: Yellow
    PURPLE,     // 4: Magenta / Purple
    CYAN        // 5: Cyan / Sky
];

// Touch Debounce
var lastTouchTime = 0;
var TOUCH_COOLDOWN = 260; // ms
var touchReleased = true;

// Double Buffering (Safe allocation)
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
// Game State & Animation Queues
// ============================================================
var STATE_TITLE = 0;
var STATE_PLAYING = 1;
var STATE_GAMEOVER = 2;
var STATE_VICTORY = 3;

var gameState = STATE_TITLE;
var score = 0;
var highScore = 0;
var shotsFired = 0;
var missesUntilDrop = 5;
var currentMisses = 0;
var ceilingDropCount = 0;

var grid = []; // 2D array [row][col] storing color index (0..5), or -1

var currentBubbleColor = 0;
var nextBubbleColor = 0;

var bullet = {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    color: 0
};

var cannonAngle = -Math.PI / 2;

// Animation Collections
var poppingBubbles = [];  // Bubbles bursting into rings and sparks
var fallingBubbles = [];  // Floating bubbles dropping down with gravity
var particles = [];       // Floating score texts (+10, +20, etc.)

// Optional Sound FX
function playTone(freq, dur) {
    try {
        if (System.pwm && System.pwm.setTone) {
            System.pwm.setTone(19, freq, dur);
        }
    } catch(e) {}
}

// ============================================================
// Clean Grid Sizing & Coordinates
// ============================================================
function getCols(r) {
    // Parity depends on row index plus ceiling drop count
    return ((r + ceilingDropCount) % 2 === 0) ? 11 : 10;
}

function initGrid(startingRows) {
    grid = [];
    ceilingDropCount = 0;
    for (var r = 0; r < GRID_ROWS; r++) {
        var cols = getCols(r);
        var row = [];
        for (var c = 0; c < cols; c++) {
            if (r < startingRows) {
                row.push(Math.floor(Math.random() * BUBBLE_COLORS.length));
            } else {
                row.push(-1);
            }
        }
        grid.push(row);
    }
}

function getCellPos(r, c) {
    var isOdd = ((r + ceilingDropCount) % 2 !== 0);
    var startX = isOdd ? (LEFT_WALL + BUBBLE_RADIUS * 2) : (LEFT_WALL + BUBBLE_RADIUS);
    var x = startX + c * (BUBBLE_RADIUS * 2);
    var y = TOP_Y + BUBBLE_RADIUS + r * ROW_HEIGHT;
    return { x: x, y: y };
}

function getHexNeighbors(r, c) {
    var isOdd = ((r + ceilingDropCount) % 2 !== 0);
    var neighbors = [];

    // Left and right neighbors
    neighbors.push({ r: r, c: c - 1 });
    neighbors.push({ r: r, c: c + 1 });

    if (isOdd) {
        neighbors.push({ r: r - 1, c: c });
        neighbors.push({ r: r - 1, c: c + 1 });
        neighbors.push({ r: r + 1, c: c });
        neighbors.push({ r: r + 1, c: c + 1 });
    } else {
        neighbors.push({ r: r - 1, c: c - 1 });
        neighbors.push({ r: r - 1, c: c });
        neighbors.push({ r: r + 1, c: c - 1 });
        neighbors.push({ r: r + 1, c: c });
    }

    var valid = [];
    for (var i = 0; i < neighbors.length; i++) {
        var nr = neighbors[i].r;
        var nc = neighbors[i].c;
        if (nr >= 0 && nr < GRID_ROWS) {
            var maxCols = getCols(nr);
            if (nc >= 0 && nc < maxCols) {
                valid.push({ r: nr, c: nc });
            }
        }
    }
    return valid;
}

function getRandomActiveColor() {
    var available = [];
    for (var r = 0; r < GRID_ROWS; r++) {
        var cols = getCols(r);
        for (var c = 0; c < cols; c++) {
            if (grid[r] && grid[r][c] >= 0) {
                var clr = grid[r][c];
                if (available.indexOf(clr) === -1) {
                    available.push(clr);
                }
            }
        }
    }
    if (available.length === 0) {
        return Math.floor(Math.random() * BUBBLE_COLORS.length);
    }
    return available[Math.floor(Math.random() * available.length)];
}

function nextTurnBubble() {
    currentBubbleColor = nextBubbleColor;
    nextBubbleColor = getRandomActiveColor();
}

function resetGame() {
    score = 0;
    shotsFired = 0;
    currentMisses = 0;
    particles = [];
    poppingBubbles = [];
    fallingBubbles = [];
    bullet.active = false;
    initGrid(4);
    nextBubbleColor = getRandomActiveColor();
    nextTurnBubble();
    gameState = STATE_PLAYING;
}

// ============================================================
// Popping & Falling Animation Triggers
// ============================================================
function triggerBubblePop(x, y, color) {
    // Expanding ring and spark particles
    poppingBubbles.push({
        x: x,
        y: y,
        color: BUBBLE_COLORS[color],
        radius: BUBBLE_RADIUS,
        maxRadius: BUBBLE_RADIUS + 7,
        alpha: 8,
        sparks: [
            { vx: -2.0, vy: -1.5 }, { vx: 2.0, vy: -1.5 },
            { vx: -1.5, vy: 2.0 },  { vx: 1.5, vy: 2.0 },
            { vx: 0.0,  vy: -2.5 }, { vx: 0.0, vy: 2.5 }
        ]
    });
    playTone(1200, 30);
}

function triggerBubbleFall(x, y, color) {
    fallingBubbles.push({
        x: x,
        y: y,
        color: BUBBLE_COLORS[color],
        vx: (Math.random() - 0.5) * 2.5,
        vy: -2.0 - Math.random() * 1.5,
        gravity: 0.55
    });
}

function updateAnimations() {
    // 1. Update Popping Expanding Burst Rings
    for (var p = poppingBubbles.length - 1; p >= 0; p--) {
        var pop = poppingBubbles[p];
        pop.radius += 0.8;
        pop.alpha--;
        for (var s = 0; s < pop.sparks.length; s++) {
            pop.sparks[s].x = (pop.sparks[s].x || pop.x) + pop.sparks[s].vx;
            pop.sparks[s].y = (pop.sparks[s].y || pop.y) + pop.sparks[s].vy;
        }
        if (pop.alpha <= 0 || pop.radius >= pop.maxRadius) {
            poppingBubbles.splice(p, 1);
        }
    }

    // 2. Update Falling Orphan Bubbles (Physics)
    for (var f = fallingBubbles.length - 1; f >= 0; f--) {
        var b = fallingBubbles[f];
        b.x += b.vx;
        b.y += b.vy;
        b.vy += b.gravity;

        // Off screen boundary check
        if (b.y > SCREEN_H + 15) {
            fallingBubbles.splice(f, 1);
            score += 20; // Bonus for dropped bubble
        }
    }

    // 3. Floating Score Text Particles
    for (var i = particles.length - 1; i >= 0; i--) {
        particles[i].y -= 1;
        particles[i].alpha--;
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// ============================================================
// Match-3 & Orphan Detection
// ============================================================
function findCluster(startR, startC, targetColor) {
    var visited = {};
    var cluster = [];
    var queue = [{ r: startR, c: startC }];
    visited[startR + "_" + startC] = true;

    while (queue.length > 0) {
        var curr = queue.shift();
        cluster.push(curr);

        var nbrs = getHexNeighbors(curr.r, curr.c);
        for (var i = 0; i < nbrs.length; i++) {
            var n = nbrs[i];
            var key = n.r + "_" + n.c;
            if (!visited[key] && grid[n.r] && grid[n.r][n.c] === targetColor) {
                visited[key] = true;
                queue.push(n);
            }
        }
    }
    return cluster;
}

function removeFloatingBubbles() {
    var connected = {};
    var queue = [];

    var topCols = getCols(0);
    for (var c = 0; c < topCols; c++) {
        if (grid[0] && grid[0][c] >= 0) {
            connected["0_" + c] = true;
            queue.push({ r: 0, c: c });
        }
    }

    while (queue.length > 0) {
        var curr = queue.shift();
        var nbrs = getHexNeighbors(curr.r, curr.c);
        for (var i = 0; i < nbrs.length; i++) {
            var n = nbrs[i];
            var key = n.r + "_" + n.c;
            if (!connected[key] && grid[n.r] && grid[n.r][n.c] >= 0) {
                connected[key] = true;
                queue.push(n);
            }
        }
    }

    // Any cell not connected falls down
    for (var r = 0; r < GRID_ROWS; r++) {
        var cols = getCols(r);
        for (var col = 0; col < cols; col++) {
            if (grid[r] && grid[r][col] >= 0 && !connected[r + "_" + col]) {
                var pos = getCellPos(r, col);
                triggerBubbleFall(pos.x, pos.y, grid[r][col]);
                grid[r][col] = -1;
            }
        }
    }
}

function dropCeiling() {
    ceilingDropCount++;

    // New clean top row with new correct column count
    var topCols = getCols(0);
    var newTopRow = [];
    for (var c = 0; c < topCols; c++) {
        newTopRow.push(Math.floor(Math.random() * BUBBLE_COLORS.length));
    }

    // Shift rows down while ensuring array bounds strictly match getCols(r)
    var newGrid = [newTopRow];
    for (var r = 0; r < GRID_ROWS - 1; r++) {
        var targetCols = getCols(r + 1);
        var oldRow = grid[r];
        var shiftedRow = [];
        for (var i = 0; i < targetCols; i++) {
            if (i < oldRow.length && oldRow[i] >= 0) {
                shiftedRow.push(oldRow[i]);
            } else {
                shiftedRow.push(-1);
            }
        }
        newGrid.push(shiftedRow);
    }
    grid = newGrid;

    playTone(450, 60);
    checkGameOver();
}

function checkGameOver() {
    var bottomCols = getCols(GRID_ROWS - 1);
    for (var c = 0; c < bottomCols; c++) {
        if (grid[GRID_ROWS - 1] && grid[GRID_ROWS - 1][c] >= 0) {
            gameState = STATE_GAMEOVER;
            if (score > highScore) highScore = score;
            playTone(300, 200);
            return;
        }
    }

    var remaining = 0;
    for (var r = 0; r < GRID_ROWS; r++) {
        var cols = getCols(r);
        for (var col = 0; col < cols; col++) {
            if (grid[r] && grid[r][col] >= 0) remaining++;
        }
    }
    if (remaining === 0) {
        score += 1000;
        if (score > highScore) highScore = score;
        gameState = STATE_VICTORY;
        playTone(1500, 150);
    }
}

// ============================================================
// Collision & Snapping Mechanics
// ============================================================
function snapBulletToGrid() {
    var bestDist = 999999;
    var bestR = -1;
    var bestC = -1;

    for (var r = 0; r < GRID_ROWS; r++) {
        var cols = getCols(r);
        for (var c = 0; c < cols; c++) {
            // Strict check: cell must be currently empty
            if (grid[r] && grid[r][c] === -1) {
                var pos = getCellPos(r, c);
                var dx = bullet.x - pos.x;
                var dy = bullet.y - pos.y;
                var d2 = dx * dx + dy * dy;

                var hasAnchor = (r === 0);
                if (!hasAnchor) {
                    var nbrs = getHexNeighbors(r, c);
                    for (var n = 0; n < nbrs.length; n++) {
                        if (grid[nbrs[n].r] && grid[nbrs[n].r][nbrs[n].c] >= 0) {
                            hasAnchor = true;
                            break;
                        }
                    }
                }

                if (hasAnchor && d2 < bestDist) {
                    bestDist = d2;
                    bestR = r;
                    bestC = c;
                }
            }
        }
    }

    if (bestR !== -1 && bestC !== -1) {
        grid[bestR][bestC] = bullet.color;
        bullet.active = false;

        var cluster = findCluster(bestR, bestC, bullet.color);
        if (cluster.length >= 3) {
            for (var i = 0; i < cluster.length; i++) {
                var cell = cluster[i];
                var p = getCellPos(cell.r, cell.c);
                triggerBubblePop(p.x, p.y, grid[cell.r][cell.c]);
                grid[cell.r][cell.c] = -1;
            }
            score += cluster.length * 10;
            removeFloatingBubbles();
        } else {
            currentMisses++;
            if (currentMisses >= missesUntilDrop) {
                currentMisses = 0;
                dropCeiling();
            }
            playTone(600, 20);
        }

        checkGameOver();
        nextTurnBubble();
    } else {
        bullet.active = false;
        nextTurnBubble();
    }
}

function updateBullet() {
    if (!bullet.active) return;

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    // Wall bounce
    if (bullet.x - BUBBLE_RADIUS <= LEFT_WALL) {
        bullet.x = LEFT_WALL + BUBBLE_RADIUS;
        bullet.vx = -bullet.vx;
        playTone(700, 15);
    } else if (bullet.x + BUBBLE_RADIUS >= RIGHT_WALL) {
        bullet.x = RIGHT_WALL - BUBBLE_RADIUS;
        bullet.vx = -bullet.vx;
        playTone(700, 15);
    }

    // Top ceiling collision
    if (bullet.y - BUBBLE_RADIUS <= TOP_Y) {
        snapBulletToGrid();
        return;
    }

    // Grid bubbles collision check
    for (var r = 0; r < GRID_ROWS; r++) {
        var cols = getCols(r);
        for (var c = 0; c < cols; c++) {
            if (grid[r] && grid[r][c] >= 0) {
                var pos = getCellPos(r, c);
                var dx = bullet.x - pos.x;
                var dy = bullet.y - pos.y;
                var distSq = dx * dx + dy * dy;
                if (distSq <= (BUBBLE_DIAMETER - 2) * (BUBBLE_DIAMETER - 2)) {
                    snapBulletToGrid();
                    return;
                }
            }
        }
    }
}

// ============================================================
// Drawing Routines
// ============================================================
function drawBubble(cx, cy, color, isGhost) {
    if (isGhost) {
        System.drawCircle(cx, cy, BUBBLE_RADIUS, color);
        return;
    }
    // Main circle
    System.fillCircle(cx, cy, BUBBLE_RADIUS, color);
    // Outer border
    System.drawCircle(cx, cy, BUBBLE_RADIUS, COLOR_BORDER);
    // 3D Glass shine highlight
    System.fillCircle(cx - 3, cy - 3, 2, WHITE);
}

function drawGrid() {
    for (var r = 0; r < GRID_ROWS; r++) {
        var cols = getCols(r);
        for (var c = 0; c < cols; c++) {
            // Strict check: ONLY draw cells with valid color indices
            if (grid[r] && grid[r][c] >= 0 && grid[r][c] < BUBBLE_COLORS.length) {
                var pos = getCellPos(r, c);
                drawBubble(pos.x, pos.y, BUBBLE_COLORS[grid[r][c]], false);
            }
        }
    }
}

function render() {
    System.fillScreen(COLOR_BG);

    // Header & Score
    System.fillRect(0, 0, SCREEN_W, TOP_Y - 2, 0x10A2); // Dark Navy
    System.drawFastHLine(0, TOP_Y - 2, SCREEN_W, COLOR_BORDER);

    System.setTextColor(WHITE, 0x10A2);
    System.drawString("SCORE: " + score, 8, 7, 2);

    System.setTextColor(YELLOW, 0x10A2);
    System.drawString("HI: " + highScore, 115, 7, 2);

    // Reserved OS Exit Button Hint [X]
    System.fillRoundRect(205, 3, 26, 18, 3, RED);
    System.setTextColor(WHITE, RED);
    System.drawString("X", 214, 4, 2);

    // Boundaries
    System.drawFastVLine(LEFT_WALL - 1, TOP_Y, DANGER_Y - TOP_Y + 40, COLOR_BORDER);
    System.drawFastVLine(RIGHT_WALL + 1, TOP_Y, DANGER_Y - TOP_Y + 40, COLOR_BORDER);

    // Danger Line
    System.drawFastHLine(LEFT_WALL, DANGER_Y, RIGHT_WALL - LEFT_WALL, COLOR_DANGER);

    if (gameState === STATE_TITLE) {
        System.setTextColor(YELLOW, COLOR_BG);
        System.drawString("BUBBLE", Math.floor(SCREEN_W / 2) - 45, 90, 4);
        System.setTextColor(CYAN, COLOR_BG);
        System.drawString("SHOOTER", Math.floor(SCREEN_W / 2) - 55, 125, 4);

        System.setTextColor(WHITE, COLOR_BG);
        System.drawString("KryonOS Edition", Math.floor(SCREEN_W / 2) - 45, 160, 2);

        System.fillRoundRect(35, 200, 170, 36, 6, 0x03E0);
        System.setTextColor(WHITE, 0x03E0);
        System.drawString("TAP TO START", Math.floor(SCREEN_W / 2) - 45, 210, 2);
    } 
    else if (gameState === STATE_PLAYING) {
        drawGrid();

        // Draw Ceiling Drop Warning Dots
        var warningX = 14;
        for (var w = 0; w < (missesUntilDrop - currentMisses); w++) {
            System.fillCircle(warningX, DANGER_Y + 8, 3, YELLOW);
            warningX += 10;
        }

        // Aiming Trajectory Line
        var aimLength = 40;
        var endX = SHOOTER_X + Math.cos(cannonAngle) * aimLength;
        var endY = SHOOTER_Y + Math.sin(cannonAngle) * aimLength;
        System.drawLine(SHOOTER_X, SHOOTER_Y, Math.floor(endX), Math.floor(endY), DARKGREY);

        // Next Bubble Preview
        System.setTextColor(DARKGREY, COLOR_BG);
        System.drawString("NEXT", 24, SHOOTER_Y - 26, 1);
        drawBubble(35, SHOOTER_Y, BUBBLE_COLORS[nextBubbleColor], false);

        // Shooter Base and Loaded Bubble
        System.drawCircle(SHOOTER_X, SHOOTER_Y, BUBBLE_RADIUS + 4, COLOR_BORDER);
        if (!bullet.active) {
            drawBubble(SHOOTER_X, SHOOTER_Y, BUBBLE_COLORS[currentBubbleColor], false);
        }

        // Active Bullet in flight
        if (bullet.active) {
            drawBubble(Math.floor(bullet.x), Math.floor(bullet.y), BUBBLE_COLORS[bullet.color], false);
        }

        // --- Render Falling Orphan Bubbles ---
        for (var f = 0; f < fallingBubbles.length; f++) {
            var fb = fallingBubbles[f];
            drawBubble(Math.floor(fb.x), Math.floor(fb.y), fb.color, false);
        }

        // --- Render Burst Popping Animations ---
        for (var p = 0; p < poppingBubbles.length; p++) {
            var pop = poppingBubbles[p];
            // Expanding ring
            System.drawCircle(Math.floor(pop.x), Math.floor(pop.y), Math.floor(pop.radius), pop.color);
            // Sparks
            for (var s = 0; s < pop.sparks.length; s++) {
                var sp = pop.sparks[s];
                System.fillCircle(Math.floor(sp.x || pop.x), Math.floor(sp.y || pop.y), 2, pop.color);
            }
        }

        // Score Particles
        for (var pt = 0; pt < particles.length; pt++) {
            System.setTextColor(particles[pt].color, COLOR_BG);
            System.drawString(particles[pt].text, Math.floor(particles[pt].x - 8), Math.floor(particles[pt].y), 2);
        }
    } 
    else if (gameState === STATE_GAMEOVER || gameState === STATE_VICTORY) {
        drawGrid();

        var boxY = 110;
        System.fillRoundRect(20, boxY, 200, 110, 8, 0x18C3);
        System.drawRoundRect(20, boxY, 200, 110, 8, (gameState === STATE_VICTORY) ? GREEN : RED);

        System.setTextColor((gameState === STATE_VICTORY) ? GREEN : RED, 0x18C3);
        System.drawString((gameState === STATE_VICTORY) ? "LEVEL CLEARED!" : "GAME OVER", 40, boxY + 12, 4);

        System.setTextColor(WHITE, 0x18C3);
        System.drawString("Final Score: " + score, 48, boxY + 45, 2);

        System.fillRoundRect(50, boxY + 70, 140, 28, 4, BLUE);
        System.setTextColor(WHITE, BLUE);
        System.drawString("PLAY AGAIN", 80, boxY + 76, 2);
    }

    if (useBuffer) {
        System.pushSprite(0, 0);
    }
}

// ============================================================
// Input Handling
// ============================================================
function handleTouchInput() {
    var touch = System.getTouch();
    var now = System.millis();

    if (!touch || !touch.touched) {
        touchReleased = true;
        return;
    }

    // Bypass OS exit zone (x >= 195, y <= 40)
    if (touch.x >= 195 && touch.y <= 40) return;

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

    if (gameState === STATE_GAMEOVER || gameState === STATE_VICTORY) {
        if (ty >= 170 && ty <= 220) {
            touchReleased = false;
            lastTouchTime = now;
            resetGame();
        }
        return;
    }

    if (gameState === STATE_PLAYING && !bullet.active) {
        if (ty < SHOOTER_Y) {
            var dx = tx - SHOOTER_X;
            var dy = ty - SHOOTER_Y;
            var angle = Math.atan2(dy, dx);

            // Clamp cannon angle (-165° to -15°)
            if (angle < -2.88) angle = -2.88;
            if (angle > -0.26) angle = -0.26;

            cannonAngle = angle;

            var speed = 7.5;
            bullet.x = SHOOTER_X;
            bullet.y = SHOOTER_Y;
            bullet.vx = Math.cos(angle) * speed;
            bullet.vy = Math.sin(angle) * speed;
            bullet.color = currentBubbleColor;
            bullet.active = true;
            shotsFired++;

            playTone(850, 25);

            touchReleased = false;
            lastTouchTime = now;
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
        updateBullet();
        updateAnimations();
    }

    render();

    // Watchdog yield & target ~60 FPS
    System.delay(16);
}
