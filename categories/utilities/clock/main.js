var TAB_CLOCK = 0;
var TAB_WORLD = 1;
var TAB_ALARM = 2;
var TAB_STOPWATCH = 3;
var TAB_TIMER = 4;
var currentTab = TAB_CLOCK;

var COLOR_BG = System.color(20, 20, 30);
var COLOR_TAB_INACTIVE = System.color(50, 50, 60);
var COLOR_TAB_ACTIVE = System.color(0, 200, 255);
var COLOR_TEXT = System.color(255, 255, 255);
var COLOR_ACCENT = System.color(0, 255, 150);

var lastTouch = false;

// --- World Clock Data ---
var cities = [
    { name: "New York", offset: -5 },
    { name: "London", offset: 0 },
    { name: "Tokyo", offset: 9 },
    { name: "Dubai", offset: 4 }
];

function parseLocalTime() {
    var tStr = System.getTime(); // "14:30" or "02:30 PM"
    var isPM = tStr.indexOf("PM") !== -1;
    var isAM = tStr.indexOf("AM") !== -1;
    var parts = tStr.split(":");
    var h = parseInt(parts[0], 10);
    var mStr = parts[1].split(" ")[0]; // handle "30 PM"
    var m = parseInt(mStr, 10);
    
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return { h: h, m: m };
}

function parseTZOffset() {
    var tz = System.getTimezone(); // e.g. "UTC-5" or "UTC+5:30"
    tz = tz.replace("UTC", "");
    if (tz === "" || tz === "0") return 0;
    var sign = 1;
    if (tz.charAt(0) === '-') sign = -1;
    if (tz.charAt(0) === '+' || tz.charAt(0) === '-') tz = tz.substring(1);
    var parts = tz.split(":");
    var h = parseInt(parts[0], 10);
    var m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    return sign * (h + m / 60.0);
}

function formatCityTime(offset) {
    var local = parseLocalTime();
    var localOffset = parseTZOffset();
    
    var localDec = local.h + (local.m / 60.0);
    var utcDec = localDec - localOffset;
    var cityDec = utcDec + offset;
    
    while (cityDec < 0) cityDec += 24;
    while (cityDec >= 24) cityDec -= 24;
    
    var ch = Math.floor(cityDec);
    var cm = Math.round((cityDec - ch) * 60);
    if (cm === 60) { cm = 0; ch = (ch + 1) % 24; }
    
    var hStr = ch < 10 ? "0" + ch : ch;
    var mStr = cm < 10 ? "0" + cm : cm;
    return hStr + ":" + mStr;
}

// --- Alarm Data ---
var alarmH = 8;
var alarmM = 0;
var alarmOn = false;
var isAlarmRinging = false;

// --- Stopwatch Data ---
var swRunning = false;
var swStart = 0;
var swAccumulated = 0;

// --- Timer Data ---
var timerRunning = false;
var timerStart = 0;
var timerTotalMs = 5 * 60 * 1000; // 5 mins
var timerRemaining = timerTotalMs;

function drawTabs() {
    System.fillRect(0, 280, 240, 40, System.color(10, 10, 15));
    var tabW = 240 / 5;
    var labels = ["Clock", "World", "Alarm", "Stopwatch", "Timer"];
    var xOffsets = [9, 57, 105, 141, 201];
    
    // Draw all backgrounds first so tabs don't overwrite long text from previous tabs
    for (var i = 0; i < 5; i++) {
        var c = (i === currentTab) ? COLOR_TAB_ACTIVE : COLOR_TAB_INACTIVE;
        System.fillRect(i * tabW, 280, tabW - 1, 40, c);
    }
    // Draw all texts
    for (var i = 0; i < 5; i++) {
        var c = (i === currentTab) ? COLOR_TAB_ACTIVE : COLOR_TAB_INACTIVE;
        System.setTextColor(COLOR_TEXT, c);
        System.drawString(labels[i], xOffsets[i], 295, 1);
    }
}

function clearBody() {
    System.fillRect(0, 0, 240, 280, COLOR_BG);
}

function format2(num) {
    return num < 10 ? "0" + num : num;
}

function formatMillis(ms) {
    var totalSec = Math.floor(ms / 1000);
    var mins = Math.floor(totalSec / 60);
    var secs = totalSec % 60;
    var frac = Math.floor((ms % 1000) / 10);
    return format2(mins) + ":" + format2(secs) + "." + format2(frac);
}

// ==========================================
// RENDERERS
// ==========================================

var currentH = 0;
var currentM = 0;
var currentS = 0;

function updateRealtime() {
    var t = parseLocalTime();
    currentH = t.h;
    currentM = t.m;
    currentS = System.getSeconds();
}

var lastRenderedClock = "";
function renderClock() {
    var str = format2(currentH) + ":" + format2(currentM) + ":" + format2(currentS);
    if (str !== lastRenderedClock) {
        System.setTextColor(COLOR_ACCENT, COLOR_BG);
        System.drawString(str, 40, 80, 4);
        
        System.setTextColor(COLOR_TEXT, COLOR_BG);
        System.drawString("Date: " + System.getDate() + "   ", 30, 140, 2);
        System.drawString("Zone: " + System.getTimezone() + "   ", 30, 170, 2);
        lastRenderedClock = str;
    }
}

function renderWorld() {
    System.setTextColor(COLOR_ACCENT, COLOR_BG);
    System.drawString("World Clock", 50, 15, 2);
    
    var y = 60;
    for (var i = 0; i < cities.length; i++) {
        var tStr = formatCityTime(cities[i].offset);
        System.setTextColor(COLOR_TEXT, COLOR_BG);
        System.drawString(cities[i].name, 20, y, 2);
        
        System.setTextColor(System.color(255,200,0), COLOR_BG);
        System.drawString(tStr + "   ", 160, y, 2);
        y += 40;
    }
}

function renderAlarm() {
    System.setTextColor(COLOR_ACCENT, COLOR_BG);
    System.drawString("Alarm", 90, 15, 2);
    
    // Live ticking current time
    System.setTextColor(System.color(150,150,150), COLOR_BG);
    System.drawString("Now: " + format2(currentH) + ":" + format2(currentM) + ":" + format2(currentS), 55, 45, 2);
    
    System.setTextColor(COLOR_TEXT, COLOR_BG);
    System.drawString(format2(alarmH) + ":" + format2(alarmM), 65, 80, 4);
    
    // Buttons + - (H, M)
    System.fillRoundRect(20, 140, 40, 40, 5, System.color(50,50,50));
    System.drawString("H+", 30, 150, 2);
    System.fillRoundRect(70, 140, 40, 40, 5, System.color(50,50,50));
    System.drawString("H-", 80, 150, 2);
    
    System.fillRoundRect(130, 140, 40, 40, 5, System.color(50,50,50));
    System.drawString("M+", 140, 150, 2);
    System.fillRoundRect(180, 140, 40, 40, 5, System.color(50,50,50));
    System.drawString("M-", 190, 150, 2);
    
    // Toggle
    var tc = alarmOn ? System.color(0, 255, 0) : System.color(255, 0, 0);
    System.fillRoundRect(50, 210, 140, 40, 5, tc);
    System.setTextColor(System.color(0,0,0), tc);
    System.drawString(alarmOn ? "ALARM ON" : "ALARM OFF", 75, 222, 2);
}

function renderStopwatch() {
    System.setTextColor(COLOR_ACCENT, COLOR_BG);
    System.drawString("Stopwatch", 65, 15, 2);
    
    var currentMs = swAccumulated;
    if (swRunning) {
        currentMs += (System.millis() - swStart);
    }
    
    System.setTextColor(COLOR_TEXT, COLOR_BG);
    System.drawString(formatMillis(currentMs), 50, 80, 4);
    
    System.fillRoundRect(20, 180, 90, 40, 5, swRunning ? System.color(255,100,0) : System.color(0,200,0));
    System.setTextColor(System.color(0,0,0));
    System.drawString(swRunning ? "STOP" : "START", 45, 192, 2);
    
    System.fillRoundRect(130, 180, 90, 40, 5, System.color(100,100,100));
    System.drawString("RESET", 155, 192, 2);
}

function renderTimer() {
    System.setTextColor(COLOR_ACCENT, COLOR_BG);
    System.drawString("Timer", 90, 15, 2);
    
    var currentMs = timerRemaining;
    if (timerRunning) {
        currentMs = timerTotalMs - (System.millis() - timerStart);
        if (currentMs <= 0) {
            currentMs = 0;
            timerRunning = false;
            timerRemaining = 0;
            isAlarmRinging = true; // trigger alarm screen
        }
    } else {
        currentMs = timerTotalMs; // reset visual
    }
    
    System.setTextColor(COLOR_TEXT, COLOR_BG);
    System.drawString(formatMillis(currentMs), 50, 80, 4);
    
    if (!timerRunning) {
        System.fillRoundRect(20, 140, 90, 30, 5, System.color(50,50,50));
        System.setTextColor(COLOR_TEXT);
        System.drawString("+1 Min", 45, 148, 2);
        
        System.fillRoundRect(130, 140, 90, 30, 5, System.color(50,50,50));
        System.drawString("-1 Min", 155, 148, 2);
    } else {
        System.fillRect(20, 140, 200, 30, COLOR_BG); // hide edit buttons
    }
    
    System.fillRoundRect(20, 200, 90, 40, 5, timerRunning ? System.color(255,100,0) : System.color(0,200,0));
    System.setTextColor(System.color(0,0,0));
    System.drawString(timerRunning ? "PAUSE" : "START", 45, 212, 2);
    
    System.fillRoundRect(130, 200, 90, 40, 5, System.color(100,100,100));
    System.drawString("RESET", 155, 212, 2);
}

function renderRinging() {
    System.fillRect(0,0,240,320, System.color(255,0,0));
    System.setTextColor(System.color(255,255,255), System.color(255,0,0));
    System.drawString("WAKE UP!", 40, 100, 4);
    
    System.fillRoundRect(40, 200, 160, 60, 10, System.color(255,255,255));
    System.setTextColor(System.color(0,0,0), System.color(255,255,255));
    System.drawString("DISMISS", 80, 220, 2);
}

// ==========================================
// INPUT HANDLers
// ==========================================
function handleTabs(x, y) {
    if (y >= 280) {
        var tabW = 240 / 5;
        var newTab = Math.floor(x / tabW);
        if (newTab !== currentTab) {
            currentTab = newTab;
            lastRenderedClock = ""; // force clock redraw, don't touch lastTimeStr!
            clearBody();
            drawTabs();
        }
        return true;
    }
    return false;
}

function handleAlarmTouch(x, y) {
    if (y >= 140 && y <= 180) {
        if (x >= 20 && x <= 60) { alarmH = (alarmH + 1) % 24; }
        if (x >= 70 && x <= 110) { alarmH = (alarmH - 1 + 24) % 24; }
        if (x >= 130 && x <= 170) { alarmM = (alarmM + 1) % 60; }
        if (x >= 180 && x <= 220) { alarmM = (alarmM - 1 + 60) % 60; }
        System.fillRect(0, 70, 240, 50, COLOR_BG); // clear old text area just in case
        renderAlarm();
    }
    if (y >= 210 && y <= 250 && x >= 50 && x <= 190) {
        alarmOn = !alarmOn;
        renderAlarm();
    }
}

function handleStopwatchTouch(x, y) {
    if (y >= 180 && y <= 220) {
        if (x >= 20 && x <= 110) {
            // Start/Stop
            if (swRunning) {
                swAccumulated += (System.millis() - swStart);
                swRunning = false;
            } else {
                swStart = System.millis();
                swRunning = true;
            }
            renderStopwatch();
        }
        if (x >= 130 && x <= 220) {
            // Reset
            swRunning = false;
            swAccumulated = 0;
            renderStopwatch();
        }
    }
}

function handleTimerTouch(x, y) {
    if (!timerRunning && y >= 140 && y <= 170) {
        if (x >= 20 && x <= 110) { timerTotalMs += 60000; }
        if (x >= 130 && x <= 220) { timerTotalMs -= 60000; if(timerTotalMs < 0) timerTotalMs = 0; }
        timerRemaining = timerTotalMs;
        renderTimer();
    }
    
    if (y >= 200 && y <= 240) {
        if (x >= 20 && x <= 110) {
            // Start/Pause
            if (timerRunning) {
                timerTotalMs = timerTotalMs - (System.millis() - timerStart);
                timerRunning = false;
            } else {
                if (timerTotalMs > 0) {
                    timerStart = System.millis();
                    timerRunning = true;
                }
            }
            renderTimer();
        }
        if (x >= 130 && x <= 220) {
            // Reset
            timerRunning = false;
            timerTotalMs = 5 * 60 * 1000;
            timerRemaining = timerTotalMs;
            clearBody();
            renderTimer();
        }
    }
}

// ==========================================
// MAIN LOOP
// ==========================================
System.fillScreen(COLOR_BG);
drawTabs();

while (true) {
    updateRealtime();
    
    // Check Alarm Trigger
    if (alarmOn && !isAlarmRinging) {
        if (currentH === alarmH && currentM === alarmM) {
            isAlarmRinging = true;
            alarmOn = false; // Trigger once
        }
    }
    
    // Handle Input
    var t = System.getTouch();
    if (t.touched) {
        if (!lastTouch) {
            if (isAlarmRinging) {
                if (t.x >= 40 && t.x <= 200 && t.y >= 200 && t.y <= 260) {
                    isAlarmRinging = false;
                    System.fillScreen(COLOR_BG);
                    drawTabs();
                    lastTimeStr = "";
                }
            } else {
                if (!handleTabs(t.x, t.y)) {
                    if (currentTab === TAB_ALARM) handleAlarmTouch(t.x, t.y);
                    if (currentTab === TAB_STOPWATCH) handleStopwatchTouch(t.x, t.y);
                    if (currentTab === TAB_TIMER) handleTimerTouch(t.x, t.y);
                }
            }
        }
        lastTouch = true;
    } else {
        lastTouch = false;
    }

    // Render Logic
    if (isAlarmRinging) {
        // Flash screen logic could be added here, but static red is fine
        renderRinging();
    } else {
        if (currentTab === TAB_CLOCK) renderClock();
        if (currentTab === TAB_WORLD) renderWorld();
        if (currentTab === TAB_ALARM) renderAlarm(); // passive
        if (currentTab === TAB_STOPWATCH) renderStopwatch();
        if (currentTab === TAB_TIMER) renderTimer();
    }
    
    System.delay(20); // ~50fps
}
