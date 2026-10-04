// ============================================================================
// KryonStopwatch — Full-Featured Digital Stopwatch for KryonOS
// Compatible with Real ESP32 & Kryon Web Emulator (Zero Flicker Engine)
// ============================================================================

var SCREEN_W = System.screenWidth() || 240;
var SCREEN_H = System.screenHeight() || 320;

var isRunning = true;
var stopwatchActive = false;

// Timing Variables
var startTime = 0;
var accumulatedTime = 0;
var currentElapsed = 0;

var lapStartTime = 0;
var lapAccumulated = 0;
var currentLapElapsed = 0;

// Laps Data Store: { id, lapTime, splitTime }
var laps = [];
var lapScrollOffset = 0;
var MAX_VISIBLE_LAPS = 3;

// Strict 16-Bit RGB565 Color Palette
var C_BG       = 0x0000; // Deep Obsidian Black
var C_PANEL    = 0x18C3; // Dark Navy Slate
var C_BORDER   = 0x39E7; // Sleek Subtle Border
var C_ACCENT   = 0x03D9; // 16-bit #007ACC Blue
var C_WHITE    = 0xFFFF;
var C_MUTED    = 0x8410; // Silver Muted Text
var C_YELLOW   = 0xFFE0; // Warning / Accent
var C_GREEN    = 0x07E0; // Start / Best Lap
var C_RED      = 0xF800; // Stop / Worst Lap
var C_ORANGE   = 0xFDA0; // Lap Button
var C_CYAN     = 0x07FF; // Split Badge

// ------------------------------------------------------------------------
// Time Formatting Utilities
// ------------------------------------------------------------------------
function pad2(n) {
    return (n < 10 ? "0" : "") + n;
}

function formatStopwatchTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var centis = Math.floor((ms % 1000) / 10);
    var secs = totalSec % 60;
    var mins = Math.floor(totalSec / 60) % 60;
    var hours = Math.floor(totalSec / 3600);

    if (hours > 0) {
        return pad2(hours) + ":" + pad2(mins) + ":" + pad2(secs) + "." + pad2(centis);
    }
    return pad2(mins) + ":" + pad2(secs) + "." + pad2(centis);
}

// ------------------------------------------------------------------------
// Stopwatch Logic Operations
// ------------------------------------------------------------------------
function startStopwatch() {
    var now = System.millis();
    startTime = now;
    lapStartTime = now;
    stopwatchActive = true;
}

function pauseStopwatch() {
    var now = System.millis();
    accumulatedTime += (now - startTime);
    lapAccumulated += (now - lapStartTime);
    stopwatchActive = false;
}

function toggleStartStop() {
    if (stopwatchActive) {
        pauseStopwatch();
    } else {
        startStopwatch();
    }
    renderFullUI();
}

function recordLap() {
    if (!stopwatchActive && accumulatedTime === 0) return;

    var split = currentElapsed;
    var lapT = currentLapElapsed;

    var lapNum = laps.length + 1;
    laps.unshift({
        id: lapNum,
        splitTime: split,
        lapTime: lapT
    });

    // Reset current lap timer
    lapStartTime = System.millis();
    lapAccumulated = 0;
    lapScrollOffset = 0;

    renderFullUI();
}

function resetStopwatch() {
    stopwatchActive = false;
    startTime = 0;
    accumulatedTime = 0;
    currentElapsed = 0;
    lapStartTime = 0;
    lapAccumulated = 0;
    currentLapElapsed = 0;
    laps = [];
    lapScrollOffset = 0;
    renderFullUI();
}

function exportLapsToDisk() {
    if (laps.length === 0) {
        if (System.notify) System.notify("Notice", "No laps to export!", "warning", 2000);
        return;
    }

    var report = "=== KryonStopwatch Lap Session ===\n";
    report += "Total Laps: " + laps.length + "\n";
    report += "Total Time: " + formatStopwatchTime(currentElapsed) + "\n\n";
    report += "Lap #   | Lap Time    | Split Time\n";
    report += "-----------------------------------\n";

    for (var i = 0; i < laps.length; i++) {
        var l = laps[i];
        report += "Lap " + pad2(l.id) + " | " + formatStopwatchTime(l.lapTime) + " | " + formatStopwatchTime(l.splitTime) + "\n";
    }

    var ok = FS.writeTextFile("laps.txt", report);
    if (ok) {
        if (System.notify) System.notify("Exported", "Saved to laps.txt", "success", 2000);
    } else {
        if (System.notify) System.notify("Error", "Could not write laps.txt", "error", 2000);
    }
}

// ------------------------------------------------------------------------
// UI Drawing Routines
// ------------------------------------------------------------------------
function drawTopBar() {
    System.fillRect(0, 0, SCREEN_W, 32, C_PANEL);
    System.drawLine(0, 32, SCREEN_W, 32, C_BORDER);

    System.setTextColor(C_WHITE, C_PANEL);
    System.drawString("Stopwatch", 14, 8, 2);

    System.setTextColor(C_CYAN, C_PANEL);
    var countTag = "[Laps: " + pad2(laps.length) + "]";
    System.drawString(countTag, 105, 8, 2);

    // Exit Button [X]
    System.fillRect(SCREEN_W - 35, 3, 30, 26, C_RED);
    System.setTextColor(C_WHITE, C_RED);
    System.drawString("X", SCREEN_W - 25, 8, 2);
}

// Flicker-Free Timer Display Box
function updateTimerDisplayOnly() {
    // Only repaint digits inside the card
    System.fillRect(16, 42, SCREEN_W - 32, 68, C_PANEL);

    var mainTimeStr = formatStopwatchTime(currentElapsed);
    var font = (mainTimeStr.length > 8) ? 2 : 4;

    // Main Clock Digits
    System.setTextColor(stopwatchActive ? C_GREEN : C_WHITE, C_PANEL);
    System.drawString(mainTimeStr, 24, 48, font);

    // Current Active Lap Progress
    System.setTextColor(C_MUTED, C_PANEL);
    System.drawString("Lap Progress: ", 24, 84, 1);
    System.setTextColor(C_YELLOW, C_PANEL);
    System.drawString(formatStopwatchTime(currentLapElapsed), 115, 84, 1);
}

function drawTimerCardContainer() {
    System.fillRoundRect(10, 38, SCREEN_W - 20, 76, 6, C_PANEL);
    System.drawRoundRect(10, 38, SCREEN_W - 20, 76, 6, stopwatchActive ? C_GREEN : C_BORDER);
    updateTimerDisplayOnly();
}

function drawControls() {
    var btnY = 120;
    var btnH = 40;
    var btnW = Math.floor((SCREEN_W - 28) / 2);

    // Button 1: Start / Pause
    if (stopwatchActive) {
        System.fillRoundRect(10, btnY, btnW, btnH, 5, C_RED);
        System.setTextColor(C_WHITE, C_RED);
        System.drawString("PAUSE", 38, btnY + 12, 2);
    } else {
        System.fillRoundRect(10, btnY, btnW, btnH, 5, C_GREEN);
        System.setTextColor(C_BG, C_GREEN);
        System.drawString("START", 40, btnY + 12, 2);
    }

    // Button 2: Lap / Reset
    var btn2X = 18 + btnW;
    if (stopwatchActive) {
        System.fillRoundRect(btn2X, btnY, btnW, btnH, 5, C_ORANGE);
        System.setTextColor(C_BG, C_ORANGE);
        System.drawString("+ LAP", btn2X + 32, btnY + 12, 2);
    } else {
        var canReset = (accumulatedTime > 0 || laps.length > 0);
        System.fillRoundRect(btn2X, btnY, btnW, btnH, 5, canReset ? C_PANEL : C_BG);
        System.drawRoundRect(btn2X, btnY, btnW, btnH, 5, canReset ? C_BORDER : C_MUTED);
        System.setTextColor(canReset ? C_WHITE : C_MUTED, canReset ? C_PANEL : C_BG);
        System.drawString("RESET", btn2X + 28, btnY + 12, 2);
    }
}

function drawLapsTable() {
    var tableY = 168;
    System.fillRect(0, tableY, SCREEN_W, 105, C_BG);

    // Table Header
    System.fillRect(10, tableY, SCREEN_W - 20, 20, C_PANEL);
    System.drawRoundRect(10, tableY, SCREEN_W - 20, 20, 3, C_BORDER);

    System.setTextColor(C_CYAN, C_PANEL);
    System.drawString("LAP", 16, tableY + 4, 1);
    System.drawString("SPLIT TIME", 70, tableY + 4, 1);
    System.drawString("LAP TIME", 165, tableY + 4, 1);

    if (laps.length === 0) {
        System.setTextColor(C_MUTED, C_BG);
        System.drawString("No laps recorded yet.", 45, tableY + 45, 2);
        return;
    }

    // Determine Best and Worst Laps for Color Highlighting
    var minLap = 999999999;
    var maxLap = -1;
    var minIdx = -1;
    var maxIdx = -1;

    if (laps.length >= 2) {
        for (var k = 0; k < laps.length; k++) {
            if (laps[k].lapTime < minLap) { minLap = laps[k].lapTime; minIdx = k; }
            if (laps[k].lapTime > maxLap) { maxLap = laps[k].lapTime; maxIdx = k; }
        }
    }

    var rowY = tableY + 24;
    var rowH = 26;

    for (var i = 0; i < MAX_VISIBLE_LAPS; i++) {
        var idx = lapScrollOffset + i;
        if (idx >= laps.length) break;

        var l = laps[idx];
        var curY = rowY + (i * rowH);

        System.fillRoundRect(10, curY, SCREEN_W - 20, rowH - 2, 3, C_PANEL);
        System.drawRoundRect(10, curY, SCREEN_W - 20, rowH - 2, 3, C_BORDER);

        // Highlight fastest green, slowest red
        var timeColor = C_WHITE;
        if (idx === minIdx) timeColor = C_GREEN;
        else if (idx === maxIdx) timeColor = C_RED;

        System.setTextColor(C_YELLOW, C_PANEL);
        System.drawString("#" + pad2(l.id), 16, curY + 6, 2);

        System.setTextColor(C_WHITE, C_PANEL);
        System.drawString(formatStopwatchTime(l.splitTime), 62, curY + 6, 2);

        System.setTextColor(timeColor, C_PANEL);
        System.drawString(formatStopwatchTime(l.lapTime), 154, curY + 6, 2);
    }
}

function drawFooterBar() {
    var footY = 276;
    System.fillRect(0, footY, SCREEN_W, SCREEN_H - footY, C_BG);

    // Save/Export Button
    System.fillRoundRect(10, footY, 70, 32, 4, (laps.length > 0) ? C_ACCENT : C_PANEL);
    System.setTextColor(C_WHITE, (laps.length > 0) ? C_ACCENT : C_PANEL);
    System.drawString("Save", 26, footY + 8, 2);

    // Scroll UP
    var hasUp = (lapScrollOffset > 0);
    System.fillRoundRect(90, footY, 65, 32, 4, hasUp ? C_ACCENT : C_PANEL);
    System.setTextColor(hasUp ? C_WHITE : C_MUTED, hasUp ? C_ACCENT : C_PANEL);
    System.drawString("< UP", 102, footY + 8, 2);

    // Scroll DN
    var hasDn = (lapScrollOffset + MAX_VISIBLE_LAPS < laps.length);
    System.fillRoundRect(165, footY, 65, 32, 4, hasDn ? C_ACCENT : C_PANEL);
    System.setTextColor(hasDn ? C_WHITE : C_MUTED, hasDn ? C_ACCENT : C_PANEL);
    System.drawString("DN >", 177, footY + 8, 2);
}

function renderFullUI() {
    drawTopBar();
    drawTimerCardContainer();
    drawControls();
    drawLapsTable();
    drawFooterBar();
}

// ------------------------------------------------------------------------
// Touch Handler
// ------------------------------------------------------------------------
function handleTouch(x, y) {
    // 1. Top Exit Button [X]
    if (x >= SCREEN_W - 40 && y <= 32) {
        isRunning = false;
        return;
    }

    // 2. Control Buttons (Y: 120..160)
    var btnY = 120;
    var btnH = 40;
    var btnW = Math.floor((SCREEN_W - 28) / 2);

    // Start / Pause
    if (x >= 10 && x <= 10 + btnW && y >= btnY && y <= btnY + btnH) {
        toggleStartStop();
        return;
    }

    // Lap / Reset
    var btn2X = 18 + btnW;
    if (x >= btn2X && x <= btn2X + btnW && y >= btnY && y <= btnY + btnH) {
        if (stopwatchActive) {
            recordLap();
        } else {
            resetStopwatch();
        }
        return;
    }

    // 3. Footer Actions (Y: 276..310)
    var footY = 276;
    if (y >= footY && y <= footY + 36) {
        // Save Laps to Disk (10..80)
        if (x >= 10 && x <= 80) {
            exportLapsToDisk();
            return;
        }

        // Scroll UP (90..155)
        if (x >= 90 && x <= 155 && lapScrollOffset > 0) {
            lapScrollOffset = Math.max(0, lapScrollOffset - 1);
            drawLapsTable();
            drawFooterBar();
            return;
        }

        // Scroll DOWN (165..230)
        if (x >= 165 && x <= 230 && lapScrollOffset + MAX_VISIBLE_LAPS < laps.length) {
            lapScrollOffset++;
            drawLapsTable();
            drawFooterBar();
            return;
        }
    }
}

// ------------------------------------------------------------------------
// Main Execution Loop
// ------------------------------------------------------------------------
System.fillScreen(C_BG);
renderFullUI();

var wasTouched = false;
var lastRenderMs = 0;

while (isRunning) {
    var now = System.millis();

    // Calculate current times if active
    if (stopwatchActive) {
        currentElapsed = accumulatedTime + (now - startTime);
        currentLapElapsed = lapAccumulated + (now - lapStartTime);

        // Update timer digits smoothly every 40ms (~25 FPS) without redrawing whole screen
        if (now - lastRenderMs >= 40) {
            updateTimerDisplayOnly();
            lastRenderMs = now;
        }
    }

    // Touch Poll
    var t = System.getTouch();
    if (t && t.touched) {
        if (!wasTouched) {
            wasTouched = true;
            handleTouch(t.x, t.y);
        }
    } else {
        wasTouched = false;
    }

    System.delay(20);
}

// Cleanup on exit
System.fillScreen(C_BG);
