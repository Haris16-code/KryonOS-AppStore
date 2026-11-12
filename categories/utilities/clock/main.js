// KryonOS Clock App (Clock, World, Alarm, Stopwatch, Timer)
// Multi-resolution support for 240x320 Portrait & 320x240 T-Deck Plus Landscape

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var TAB_H = 38;
    var BODY_H = SH - TAB_H;

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

    var cities = [
        { name: "New York", offset: -5 },
        { name: "London", offset: 0 },
        { name: "Tokyo", offset: 9 },
        { name: "Dubai", offset: 4 }
    ];

    function parseLocalTime() {
        var tStr = System.getTime();
        var isPM = tStr.indexOf("PM") !== -1;
        var isAM = tStr.indexOf("AM") !== -1;
        var parts = tStr.split(":");
        var h = parseInt(parts[0], 10);
        var mStr = parts[1].split(" ")[0];
        var m = parseInt(mStr, 10);

        if (isPM && h !== 12) h += 12;
        if (isAM && h === 12) h = 0;
        return { h: h, m: m };
    }

    function parseTZOffset() {
        var tz = System.getTimezone();
        tz = tz.replace("UTC", "");
        if (tz === "" || tz === "0") return 0;
        var sign = 1;
        if (tz.charAt(0) === "-") sign = -1;
        if (tz.charAt(0) === "+" || tz.charAt(0) === "-") tz = tz.substring(1);
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

        var hStr = ch < 10 ? "0" + ch : "" + ch;
        var mStr = cm < 10 ? "0" + cm : "" + cm;
        return hStr + ":" + mStr;
    }

    var alarmH = 8;
    var alarmM = 0;
    var alarmOn = false;
    var isAlarmRinging = false;

    var swRunning = false;
    var swStart = 0;
    var swAccumulated = 0;

    var timerRunning = false;
    var timerStart = 0;
    var timerTotalMs = 5 * 60 * 1000;
    var timerRemaining = timerTotalMs;

    function drawTabs() {
        System.fillRect(0, BODY_H, SW, TAB_H, System.color(10, 10, 15));
        var tabW = Math.floor(SW / 5);
        var labels = ["Clock", "World", "Alarm", "Stopw", "Timer"];

        for (var i = 0; i < 5; i++) {
            var c = (i === currentTab) ? COLOR_TAB_ACTIVE : COLOR_TAB_INACTIVE;
            System.fillRect(i * tabW, BODY_H, tabW - 1, TAB_H, c);
            System.setTextColor(COLOR_TEXT, c);
            var tx = i * tabW + Math.max(4, Math.floor((tabW - (labels[i].length * 6)) / 2));
            System.drawString(labels[i], tx, BODY_H + 14, 1);
        }
    }

    function clearBody() {
        System.fillRect(0, 0, SW, BODY_H, COLOR_BG);
    }

    function format2(num) {
        return num < 10 ? "0" + num : "" + num;
    }

    function formatMillis(ms) {
        var totalSec = Math.floor(ms / 1000);
        var mins = Math.floor(totalSec / 60);
        var secs = totalSec % 60;
        var frac = Math.floor((ms % 1000) / 10);
        return format2(mins) + ":" + format2(secs) + "." + format2(frac);
    }

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
            System.drawString(str, Math.floor((SW - 160) / 2), Math.floor(BODY_H * 0.28), 4);

            System.setTextColor(COLOR_TEXT, COLOR_BG);
            System.drawString("Date: " + System.getDate() + "   ", 24, Math.floor(BODY_H * 0.54), 2);
            System.drawString("Zone: " + System.getTimezone() + "   ", 24, Math.floor(BODY_H * 0.68), 2);
            lastRenderedClock = str;
        }
    }

    function renderWorld() {
        System.setTextColor(COLOR_ACCENT, COLOR_BG);
        System.drawString("World Clock", Math.floor((SW - 90) / 2), 12, 2);

        var rowStep = Math.floor((BODY_H - 52) / cities.length);
        var y = 46;
        for (var i = 0; i < cities.length; i++) {
            var tStr = formatCityTime(cities[i].offset);
            System.setTextColor(COLOR_TEXT, COLOR_BG);
            System.drawString(cities[i].name, 20, y, 2);

            System.setTextColor(System.color(255, 200, 0), COLOR_BG);
            System.drawString(tStr + "   ", SW - 80, y, 2);
            y += rowStep;
        }
    }

    // Responsive Alarm Geometry
    var alarmBtnY = Math.floor(BODY_H * 0.50);
    var alarmToggleY = Math.floor(BODY_H * 0.74);
    var alarmToggleW = Math.min(160, SW - 60);
    var alarmToggleX = Math.floor((SW - alarmToggleW) / 2);
    var alarmStartX = Math.floor((SW - 200) / 2);

    function renderAlarm() {
        System.setTextColor(COLOR_ACCENT, COLOR_BG);
        System.drawString("Alarm", Math.floor((SW - 45) / 2), 10, 2);

        System.setTextColor(System.color(150, 150, 150), COLOR_BG);
        System.drawString("Now: " + format2(currentH) + ":" + format2(currentM) + ":" + format2(currentS), Math.floor((SW - 120) / 2), 34, 2);

        System.setTextColor(COLOR_TEXT, COLOR_BG);
        System.drawString(format2(alarmH) + ":" + format2(alarmM), Math.floor((SW - 96) / 2), Math.floor(BODY_H * 0.27), 4);

        var btnCol = System.color(50, 50, 50);
        var xs = [alarmStartX, alarmStartX + 50, alarmStartX + 110, alarmStartX + 160];
        var lbls = ["H+", "H-", "M+", "M-"];
        for (var i = 0; i < 4; i++) {
            System.fillRoundRect(xs[i], alarmBtnY, 40, 36, 5, btnCol);
            System.setTextColor(COLOR_TEXT, btnCol);
            System.drawString(lbls[i], xs[i] + 10, alarmBtnY + 10, 2);
        }

        var tc = alarmOn ? System.color(0, 255, 0) : System.color(255, 0, 0);
        System.fillRoundRect(alarmToggleX, alarmToggleY, alarmToggleW, 36, 5, tc);
        System.setTextColor(System.color(0, 0, 0), tc);
        System.drawString(alarmOn ? "ALARM ON" : "ALARM OFF", alarmToggleX + Math.floor((alarmToggleW - 80) / 2), alarmToggleY + 10, 2);
    }

    // Responsive Stopwatch / Timer Geometry
    var actionBtnW = Math.min(100, Math.floor((SW - 50) / 2));
    var actionBtn1X = Math.floor(SW / 2) - actionBtnW - 10;
    var actionBtn2X = Math.floor(SW / 2) + 10;
    var actionBtnY = Math.floor(BODY_H * 0.68);

    function renderStopwatch() {
        System.setTextColor(COLOR_ACCENT, COLOR_BG);
        System.drawString("Stopwatch", Math.floor((SW - 80) / 2), 12, 2);

        var currentMs = swAccumulated;
        if (swRunning) {
            currentMs += (System.millis() - swStart);
        }

        System.setTextColor(COLOR_TEXT, COLOR_BG);
        System.drawString(formatMillis(currentMs), Math.floor((SW - 140) / 2), Math.floor(BODY_H * 0.30), 4);

        var c1 = swRunning ? System.color(255, 100, 0) : System.color(0, 200, 0);
        System.fillRoundRect(actionBtn1X, actionBtnY, actionBtnW, 38, 5, c1);
        System.setTextColor(System.color(0, 0, 0), c1);
        System.drawString(swRunning ? "STOP" : "START", actionBtn1X + Math.floor((actionBtnW - 44) / 2), actionBtnY + 11, 2);

        var c2 = System.color(100, 100, 100);
        System.fillRoundRect(actionBtn2X, actionBtnY, actionBtnW, 38, 5, c2);
        System.setTextColor(System.color(0, 0, 0), c2);
        System.drawString("RESET", actionBtn2X + Math.floor((actionBtnW - 44) / 2), actionBtnY + 11, 2);
    }

    var timerEditY = Math.floor(BODY_H * 0.48);

    function renderTimer() {
        System.setTextColor(COLOR_ACCENT, COLOR_BG);
        System.drawString("Timer", Math.floor((SW - 45) / 2), 12, 2);

        var currentMs = timerRemaining;
        if (timerRunning) {
            currentMs = timerTotalMs - (System.millis() - timerStart);
            if (currentMs <= 0) {
                currentMs = 0;
                timerRunning = false;
                timerRemaining = 0;
                isAlarmRinging = true;
            }
        } else {
            currentMs = timerTotalMs;
        }

        System.setTextColor(COLOR_TEXT, COLOR_BG);
        System.drawString(formatMillis(currentMs), Math.floor((SW - 140) / 2), Math.floor(BODY_H * 0.24), 4);

        if (!timerRunning) {
            var eb = System.color(50, 50, 50);
            System.fillRoundRect(actionBtn1X, timerEditY, actionBtnW, 30, 5, eb);
            System.setTextColor(COLOR_TEXT, eb);
            System.drawString("+1 Min", actionBtn1X + Math.floor((actionBtnW - 50) / 2), timerEditY + 7, 2);

            System.fillRoundRect(actionBtn2X, timerEditY, actionBtnW, 30, 5, eb);
            System.drawString("-1 Min", actionBtn2X + Math.floor((actionBtnW - 50) / 2), timerEditY + 7, 2);
        } else {
            System.fillRect(0, timerEditY, SW, 32, COLOR_BG);
        }

        var c1 = timerRunning ? System.color(255, 100, 0) : System.color(0, 200, 0);
        System.fillRoundRect(actionBtn1X, actionBtnY, actionBtnW, 38, 5, c1);
        System.setTextColor(System.color(0, 0, 0), c1);
        System.drawString(timerRunning ? "PAUSE" : "START", actionBtn1X + Math.floor((actionBtnW - 44) / 2), actionBtnY + 11, 2);

        var c2 = System.color(100, 100, 100);
        System.fillRoundRect(actionBtn2X, actionBtnY, actionBtnW, 38, 5, c2);
        System.setTextColor(System.color(0, 0, 0), c2);
        System.drawString("RESET", actionBtn2X + Math.floor((actionBtnW - 44) / 2), actionBtnY + 11, 2);
    }

    var dismissW = Math.min(160, SW - 60);
    var dismissH = 52;
    var dismissX = Math.floor((SW - dismissW) / 2);
    var dismissY = Math.floor(SH * 0.60);

    function renderRinging() {
        System.fillRect(0, 0, SW, SH, System.color(255, 0, 0));
        System.setTextColor(System.color(255, 255, 255), System.color(255, 0, 0));
        System.drawString("WAKE UP!", Math.floor((SW - 140) / 2), Math.floor(SH * 0.30), 4);

        System.fillRoundRect(dismissX, dismissY, dismissW, dismissH, 10, System.color(255, 255, 255));
        System.setTextColor(System.color(0, 0, 0), System.color(255, 255, 255));
        System.drawString("DISMISS", dismissX + Math.floor((dismissW - 60) / 2), dismissY + 18, 2);
    }

    function handleTabs(x, y) {
        if (y >= BODY_H) {
            var tabW = SW / 5;
            var newTab = Math.floor(x / tabW);
            if (newTab > 4) newTab = 4;
            if (newTab !== currentTab) {
                currentTab = newTab;
                lastRenderedClock = "";
                clearBody();
                drawTabs();
            }
            return true;
        }
        return false;
    }

    function handleAlarmTouch(x, y) {
        if (y >= alarmBtnY && y <= alarmBtnY + 36) {
            if (x >= alarmStartX && x <= alarmStartX + 40) alarmH = (alarmH + 1) % 24;
            else if (x >= alarmStartX + 50 && x <= alarmStartX + 90) alarmH = (alarmH - 1 + 24) % 24;
            else if (x >= alarmStartX + 110 && x <= alarmStartX + 150) alarmM = (alarmM + 1) % 60;
            else if (x >= alarmStartX + 160 && x <= alarmStartX + 200) alarmM = (alarmM - 1 + 60) % 60;
            System.fillRect(0, Math.floor(BODY_H * 0.22), SW, 44, COLOR_BG);
            renderAlarm();
        }
        if (y >= alarmToggleY && y <= alarmToggleY + 36 && x >= alarmToggleX && x <= alarmToggleX + alarmToggleW) {
            alarmOn = !alarmOn;
            renderAlarm();
        }
    }

    function handleStopwatchTouch(x, y) {
        if (y >= actionBtnY && y <= actionBtnY + 38) {
            if (x >= actionBtn1X && x <= actionBtn1X + actionBtnW) {
                if (swRunning) {
                    swAccumulated += (System.millis() - swStart);
                    swRunning = false;
                } else {
                    swStart = System.millis();
                    swRunning = true;
                }
                renderStopwatch();
            } else if (x >= actionBtn2X && x <= actionBtn2X + actionBtnW) {
                swRunning = false;
                swAccumulated = 0;
                renderStopwatch();
            }
        }
    }

    function handleTimerTouch(x, y) {
        if (!timerRunning && y >= timerEditY && y <= timerEditY + 30) {
            if (x >= actionBtn1X && x <= actionBtn1X + actionBtnW) timerTotalMs += 60000;
            else if (x >= actionBtn2X && x <= actionBtn2X + actionBtnW) {
                timerTotalMs -= 60000;
                if (timerTotalMs < 0) timerTotalMs = 0;
            }
            timerRemaining = timerTotalMs;
            renderTimer();
        }

        if (y >= actionBtnY && y <= actionBtnY + 38) {
            if (x >= actionBtn1X && x <= actionBtn1X + actionBtnW) {
                if (timerRunning) {
                    timerTotalMs = timerTotalMs - (System.millis() - timerStart);
                    timerRunning = false;
                } else if (timerTotalMs > 0) {
                    timerStart = System.millis();
                    timerRunning = true;
                }
                renderTimer();
            } else if (x >= actionBtn2X && x <= actionBtn2X + actionBtnW) {
                timerRunning = false;
                timerTotalMs = 5 * 60 * 1000;
                timerRemaining = timerTotalMs;
                clearBody();
                renderTimer();
            }
        }
    }

    System.fillScreen(COLOR_BG);
    drawTabs();

    while (true) {
        updateRealtime();

        if (alarmOn && !isAlarmRinging) {
            if (currentH === alarmH && currentM === alarmM) {
                isAlarmRinging = true;
                alarmOn = false;
            }
        }

        var t = System.getTouch();
        if (t.touched) {
            if (!lastTouch) {
                if (t.x >= SW - 40 && t.y <= 40) {
                    break;
                }
                if (isAlarmRinging) {
                    if (t.x >= dismissX && t.x <= dismissX + dismissW && t.y >= dismissY && t.y <= dismissY + dismissH) {
                        isAlarmRinging = false;
                        System.fillScreen(COLOR_BG);
                        drawTabs();
                        lastRenderedClock = "";
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

        if (isAlarmRinging) {
            renderRinging();
        } else {
            if (currentTab === TAB_CLOCK) renderClock();
            if (currentTab === TAB_WORLD) renderWorld();
            if (currentTab === TAB_ALARM) renderAlarm();
            if (currentTab === TAB_STOPWATCH) renderStopwatch();
            if (currentTab === TAB_TIMER) renderTimer();
        }

        System.delay(20);
    }
})();