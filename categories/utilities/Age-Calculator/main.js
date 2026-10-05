/**
 * KryonOS Modern Dual-Date (From & To) Calculator
 * Screen: 240x320 Portrait | Touch Debounced & Card Dashboard
 */

// ============================================================
// Layout & Palette Configuration
// ============================================================
var SCREEN_W = System.screenWidth();
var SCREEN_H = System.screenHeight();

// Modern Cyber Dark Theme Colors (RGB565)
var COLOR_BG          = 0x0821; // Deep Obsidian Black
var COLOR_HEADER      = 0x10A2; // Elevated Dark Navy
var COLOR_CARD        = 0x18C3; // Card Surface
var COLOR_CARD_HI     = 0x2125; // Elevated Pill
var COLOR_BORDER      = 0x39E8; // Slate Border
var COLOR_ACCENT_BLUE = 0x229F; // Royal Blue
var COLOR_ACCENT_CYAN = 0x3DFE; // Cyan
var COLOR_ACCENT_GOLD = 0xFDA0; // Gold / Amber
var COLOR_TEXT_MUTED  = 0xC618; // Silver Muted Text

// Touch Debouncing
var lastTouchTime = 0;
var TOUCH_COOLDOWN = 180; // ms for fast responsive touch
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
// Date State Initialization
// ============================================================
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Read Current Clock from KryonOS System
var sysYear  = System.getYear();
var sysMonth = System.getMonth();
var sysDay   = System.getDay();

if (!sysYear || sysYear < 2020) sysYear = 2026;
if (!sysMonth || sysMonth < 1 || sysMonth > 12) sysMonth = 10;
if (!sysDay || sysDay < 1 || sysDay > 31) sysDay = 5;

// Mode: "FROM" or "TO" (Whichever is being edited)
var activeTarget = "FROM";

// 1. FROM DATE (Default: 15 Oct 2000)
var fromDate = {
    d: 15,
    m: 10,
    y: 2000
};

// 2. TO DATE (Default: System Current Date)
var toDate = {
    d: sysDay,
    m: sysMonth,
    y: sysYear
};

var needsRedraw = true;

// ============================================================
// Calendar Calculations
// ============================================================
function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function getDaysInMonth(y, m) {
    if (m === 2) return isLeapYear(y) ? 29 : 28;
    if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
    return 31;
}

function clampDate(dt) {
    if (dt.y < 1900) dt.y = 1900;
    if (dt.y > 2100) dt.y = 2100;
    if (dt.m < 1) dt.m = 1;
    if (dt.m > 12) dt.m = 12;

    var maxDays = getDaysInMonth(dt.y, dt.m);
    if (dt.d > maxDays) dt.d = maxDays;
    if (dt.d < 1) dt.d = 1;
}

function calculateDifference() {
    clampDate(fromDate);
    clampDate(toDate);

    var start = { d: fromDate.d, m: fromDate.m, y: fromDate.y };
    var end   = { d: toDate.d,   m: toDate.m,   y: toDate.y };

    var startDate = new Date(start.y, start.m - 1, start.d);
    var endDate   = new Date(end.y,   end.m - 1,   end.d);

    var isReversed = false;
    if (startDate.getTime() > endDate.getTime()) {
        isReversed = true;
        var temp = start; start = end; end = temp;
        var tempD = startDate; startDate = endDate; endDate = tempD;
    }

    var y = end.y - start.y;
    var m = end.m - start.m;
    var d = end.d - start.d;

    if (d < 0) {
        m--;
        var prevM = end.m - 1;
        var prevY = end.y;
        if (prevM === 0) {
            prevM = 12;
            prevY--;
        }
        d += getDaysInMonth(prevY, prevM);
    }

    if (m < 0) {
        y--;
        m += 12;
    }

    var diffMs = Math.abs(endDate.getTime() - startDate.getTime());
    var totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    var totalWeeks = Math.floor(totalDays / 7);
    var remDays = totalDays % 7;
    var totalMonths = (y * 12) + m;

    var fromDayName = DAY_NAMES[startDate.getDay()];
    var toDayName   = DAY_NAMES[endDate.getDay()];

    return {
        years: y,
        months: m,
        days: d,
        totalDays: totalDays,
        totalWeeks: totalWeeks,
        remDays: remDays,
        totalMonths: totalMonths,
        fromDayName: fromDayName,
        toDayName: toDayName,
        isReversed: isReversed
    };
}

// ============================================================
// UI Render Routines
// ============================================================
function drawUI() {
    var diff = calculateDifference();

    System.fillScreen(COLOR_BG);

    // ── 1. Top Header Bar (0 to 32) ───────────────────────────
    System.fillRect(0, 0, SCREEN_W, 32, COLOR_HEADER);
    System.drawFastHLine(0, 32, SCREEN_W, COLOR_BORDER);

    System.setTextColor(WHITE, COLOR_HEADER);
    System.drawString("Date & Age Calc", 10, 8, 2);

    // OS Exit Button [X]
    System.fillRoundRect(206, 5, 26, 22, 4, 0x9000);
    System.setTextColor(WHITE, 0x9000);
    System.drawString("X", 215, 8, 2);

    // ── 2. FROM and TO Interactive Cards (36 to 78) ───────────
    // Card 1: FROM DATE (x: 8, w: 110)
    var isFromActive = (activeTarget === "FROM");
    System.fillRoundRect(8, 36, 110, 42, 5, isFromActive ? COLOR_CARD_HI : COLOR_CARD);
    System.drawRoundRect(8, 36, 110, 42, 5, isFromActive ? COLOR_ACCENT_CYAN : COLOR_BORDER);

    System.setTextColor(isFromActive ? COLOR_ACCENT_CYAN : COLOR_TEXT_MUTED, isFromActive ? COLOR_CARD_HI : COLOR_CARD);
    System.drawString("FROM (START)", 14, 40, 1);

    var fStr = (fromDate.d < 10 ? "0" : "") + fromDate.d + " " + MONTH_NAMES[fromDate.m - 1] + " " + fromDate.y;
    System.setTextColor(WHITE, isFromActive ? COLOR_CARD_HI : COLOR_CARD);
    System.drawString(fStr, 14, 56, 2);

    // Card 2: TO DATE (x: 122, w: 110)
    var isToActive = (activeTarget === "TO");
    System.fillRoundRect(122, 36, 110, 42, 5, isToActive ? COLOR_CARD_HI : COLOR_CARD);
    System.drawRoundRect(122, 36, 110, 42, 5, isToActive ? COLOR_ACCENT_CYAN : COLOR_BORDER);

    System.setTextColor(isToActive ? COLOR_ACCENT_CYAN : COLOR_TEXT_MUTED, isToActive ? COLOR_CARD_HI : COLOR_CARD);
    System.drawString("TO (END)", 128, 40, 1);

    var tStr = (toDate.d < 10 ? "0" : "") + toDate.d + " " + MONTH_NAMES[toDate.m - 1] + " " + toDate.y;
    System.setTextColor(WHITE, isToActive ? COLOR_CARD_HI : COLOR_CARD);
    System.drawString(tStr, 128, 56, 2);

    // ── 3. Active Date Stepper Card (82 to 166) ────────────────
    var activeObj = (activeTarget === "FROM") ? fromDate : toDate;

    System.fillRoundRect(8, 82, 224, 84, 6, COLOR_CARD);
    System.drawRoundRect(8, 82, 224, 84, 6, COLOR_BORDER);

    // Header label inside editing card
    System.setTextColor(COLOR_ACCENT_GOLD, COLOR_CARD);
    System.drawString("EDITING: " + activeTarget + " DATE", 14, 86, 1);

    // [Set Today] Shortcut Button (x: 110, y: 84)
    System.fillRoundRect(110, 84, 52, 14, 3, 0x03E0);
    System.setTextColor(WHITE, 0x03E0);
    System.drawString("Today", 122, 85, 1);

    // [Type Year] Shortcut Button (x: 168, y: 84)
    System.fillRoundRect(168, 84, 58, 14, 3, COLOR_ACCENT_BLUE);
    System.setTextColor(WHITE, COLOR_ACCENT_BLUE);
    System.drawString("Type Yr", 176, 85, 1);

    // 3 Column Steppers: Day (14), Month (88), Year (162)
    var colX = [14, 88, 162];
    var colW = 64;

    // [+] Buttons (y: 104 to 122)
    for (var i = 0; i < 3; i++) {
        System.fillRoundRect(colX[i], 104, colW, 18, 4, COLOR_CARD_HI);
        System.drawRoundRect(colX[i], 104, colW, 18, 4, COLOR_BORDER);
        System.setTextColor(COLOR_ACCENT_CYAN, COLOR_CARD_HI);
        System.drawString("+", colX[i] + 28, 105, 2);
    }

    // Display Values (y: 125)
    var dVal = (activeObj.d < 10 ? "0" : "") + activeObj.d;
    var mVal = MONTH_NAMES[activeObj.m - 1];
    var yVal = "" + activeObj.y;

    System.setTextColor(WHITE, COLOR_CARD);
    System.drawString(dVal, colX[0] + 22, 125, 2);
    System.drawString(mVal, colX[1] + 19, 125, 2);
    System.drawString(yVal, colX[2] + 14, 125, 2);

    // [-] Buttons (y: 144 to 162)
    for (var i = 0; i < 3; i++) {
        System.fillRoundRect(colX[i], 144, colW, 18, 4, COLOR_CARD_HI);
        System.drawRoundRect(colX[i], 144, colW, 18, 4, COLOR_BORDER);
        System.setTextColor(COLOR_ACCENT_CYAN, COLOR_CARD_HI);
        System.drawString("-", colX[i] + 30, 145, 2);
    }

    // ── 4. Difference Result Card (170 to 242) ────────────────
    System.fillRoundRect(8, 170, 224, 72, 6, COLOR_HEADER);
    System.drawRoundRect(8, 170, 224, 72, 6, COLOR_ACCENT_CYAN);

    System.setTextColor(COLOR_ACCENT_CYAN, COLOR_HEADER);
    var resTitle = diff.isReversed ? "DIFFERENCE (INVERTED)" : "EXACT DIFFERENCE";
    System.drawString(resTitle, 14, 174, 1);

    var resW = 68;
    var resX = [14, 86, 158];

    // Years Badge
    System.fillRoundRect(resX[0], 186, resW, 50, 4, COLOR_CARD_HI);
    System.setTextColor(COLOR_ACCENT_GOLD, COLOR_CARD_HI);
    var yrText = "" + diff.years;
    System.drawString(yrText, resX[0] + (diff.years > 99 ? 8 : 16), 190, 4);
    System.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_HI);
    System.drawString("Years", resX[0] + 18, 222, 1);

    // Months Badge
    System.fillRoundRect(resX[1], 186, resW, 50, 4, COLOR_CARD_HI);
    System.setTextColor(GREEN, COLOR_CARD_HI);
    var moText = (diff.months < 10 ? "0" : "") + diff.months;
    System.drawString(moText, resX[1] + 16, 190, 4);
    System.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_HI);
    System.drawString("Months", resX[1] + 14, 222, 1);

    // Days Badge
    System.fillRoundRect(resX[2], 186, resW, 50, 4, COLOR_CARD_HI);
    System.setTextColor(COLOR_ACCENT_CYAN, COLOR_CARD_HI);
    var dyText = (diff.days < 10 ? "0" : "") + diff.days;
    System.drawString(dyText, resX[2] + 16, 190, 4);
    System.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_HI);
    System.drawString("Days", resX[2] + 20, 222, 1);

    // ── 5. Detailed Life / Interval Stats (246 to 314) ────────
    System.fillRoundRect(8, 246, 224, 68, 6, COLOR_CARD);
    System.drawRoundRect(8, 246, 224, 68, 6, COLOR_BORDER);

    System.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD);
    System.drawString("Total Days:", 14, 252, 1);
    System.setTextColor(WHITE, COLOR_CARD);
    System.drawString(diff.totalDays.toLocaleString() + " days", 84, 252, 1);

    System.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD);
    System.drawString("Total Weeks:", 14, 270, 1);
    System.setTextColor(WHITE, COLOR_CARD);
    System.drawString(diff.totalWeeks.toLocaleString() + " wks (" + diff.totalMonths + " mo)", 84, 270, 1);

    System.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD);
    System.drawString("Timeline:", 14, 288, 1);
    System.setTextColor(COLOR_ACCENT_CYAN, COLOR_CARD);
    System.drawString(diff.fromDayName + "  -->  " + diff.toDayName, 84, 288, 1);

    if (useBuffer) {
        System.pushSprite(0, 0);
    }
}

// ============================================================
// Touch Input Handling
// ============================================================
function handleTouchInput() {
    var touch = System.getTouch();
    var now = System.millis();

    if (!touch || !touch.touched) {
        touchReleased = true;
        return;
    }

    var tx = touch.x;
    var ty = touch.y;

    // Reserved OS Exit Button Area (Top-Right)
    if (tx >= 195 && ty <= 40) return;

    if (!touchReleased || (now - lastTouchTime < TOUCH_COOLDOWN)) {
        return;
    }

    // ── A. Switch Active Card (FROM vs TO) ────────────────────
    if (ty >= 36 && ty <= 78) {
        if (tx >= 8 && tx <= 118) {
            // Tap FROM card
            activeTarget = "FROM";
            touchReleased = false;
            lastTouchTime = now;
            needsRedraw = true;
            return;
        } else if (tx >= 122 && tx <= 232) {
            // Tap TO card
            activeTarget = "TO";
            touchReleased = false;
            lastTouchTime = now;
            needsRedraw = true;
            return;
        }
    }

    var activeObj = (activeTarget === "FROM") ? fromDate : toDate;

    // ── B. [Set Today] Button (x: 108..164, y: 80..100) ──────
    if (tx >= 106 && tx <= 164 && ty >= 80 && ty <= 102) {
        activeObj.d = sysDay;
        activeObj.m = sysMonth;
        activeObj.y = sysYear;
        touchReleased = false;
        lastTouchTime = now;
        needsRedraw = true;
        return;
    }

    // ── C. [Type Year] Button (x: 166..228, y: 80..100) ──────
    if (tx >= 166 && tx <= 228 && ty >= 80 && ty <= 102) {
        touchReleased = false;
        lastTouchTime = now;
        var typed = System.prompt("Enter " + activeTarget + " Year (1900-2100):", "" + activeObj.y);
        if (typed) {
            var parsedY = parseInt(typed, 10);
            if (!isNaN(parsedY) && parsedY >= 1900 && parsedY <= 2100) {
                activeObj.y = parsedY;
                needsRedraw = true;
            }
        }
        return;
    }

    // ── D. Stepper Buttons (+ / -) ───────────────────────────
    var colX = [14, 88, 162];
    var colW = 64;

    // Check [+] Row (y: 102 to 124)
    if (ty >= 102 && ty <= 124) {
        if (tx >= colX[0] && tx <= colX[0] + colW) {
            // Day +
            activeObj.d++;
            var maxD = getDaysInMonth(activeObj.y, activeObj.m);
            if (activeObj.d > maxD) activeObj.d = 1;
            touchReleased = false;
            lastTouchTime = now;
            needsRedraw = true;
            return;
        } else if (tx >= colX[1] && tx <= colX[1] + colW) {
            // Month +
            activeObj.m++;
            if (activeObj.m > 12) activeObj.m = 1;
            touchReleased = false;
            lastTouchTime = now;
            needsRedraw = true;
            return;
        } else if (tx >= colX[2] && tx <= colX[2] + colW) {
            // Year +
            if (activeObj.y < 2100) activeObj.y++;
            touchReleased = false;
            lastTouchTime = now;
            needsRedraw = true;
            return;
        }
    }

    // Check [-] Row (y: 142 to 164)
    if (ty >= 142 && ty <= 164) {
        if (tx >= colX[0] && tx <= colX[0] + colW) {
            // Day -
            activeObj.d--;
            if (activeObj.d < 1) activeObj.d = getDaysInMonth(activeObj.y, activeObj.m);
            touchReleased = false;
            lastTouchTime = now;
            needsRedraw = true;
            return;
        } else if (tx >= colX[1] && tx <= colX[1] + colW) {
            // Month -
            activeObj.m--;
            if (activeObj.m < 1) activeObj.m = 12;
            touchReleased = false;
            lastTouchTime = now;
            needsRedraw = true;
            return;
        } else if (tx >= colX[2] && tx <= colX[2] + colW) {
            // Year -
            if (activeObj.y > 1900) activeObj.y--;
            touchReleased = false;
            lastTouchTime = now;
            needsRedraw = true;
            return;
        }
    }
}

// ============================================================
// Main Application Loop
// ============================================================
drawUI();

while (true) {
    handleTouchInput();

    if (needsRedraw) {
        drawUI();
        needsRedraw = false;
    }

    // FreeRTOS Watchdog yield & 60 FPS loop
    System.delay(16);
    }
