// Modern UI Dashboard Demo for KryonOS
// Showcases advanced drawing techniques, physics-based scrolling, and double buffering

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    // Color Palette (RGB565)
    var bgTop = System.color(20, 25, 35);
    var cardBg = System.color(35, 45, 60);
    var cardBorder = System.color(60, 75, 95);
    var accent = System.color(0, 180, 255);
    var textPrimary = System.color(250, 250, 250);
    var textSecondary = System.color(150, 160, 175);
    var shadow = System.color(5, 5, 10);
    var barBg = System.color(15, 20, 25);

    var cards = [
        { title: "System Status", desc: "All systems operational", val: "100%" },
        { title: "Battery Health", desc: "Power telemetry active", val: "84%" },
        { title: "Wi-Fi Network", desc: "Connected to Home_5G", val: "Excellent" },
        { title: "Storage Space", desc: "Using LittleFS", val: "1.2 MB Free" },
        { title: "Sensors", desc: "Temp / Humidity", val: "24C" },
        { title: "Updates", desc: "KryonOS System", val: "Up to date" }
    ];

    var HEADER_H = 46;
    var TAB_H = 48;
    var CARD_H = 68;
    var CARD_STEP = 78;

    var scrollY = 0;
    var targetScrollY = 0;
    var scrollVelocity = 0;
    var maxScroll = (cards.length * CARD_STEP) + HEADER_H + 8 - SH + TAB_H;
    if (maxScroll < 0) maxScroll = 0;

    var lastTouchY = 0;
    var isDragging = false;
    var activeTab = 0;

    // Sliced double buffering using Math.ceil(SH / sliceHeight)
    var sliceHeight = 30;
    var numSlices = Math.ceil(SH / sliceHeight);
    var useSprite = System.createSprite(SW, sliceHeight);
    var sliceY = 0;

    function fillRect(x, y, w, h, c) { System.fillRect(x, y - sliceY, w, h, c); }
    function fillRoundRect(x, y, w, h, r, c) { System.fillRoundRect(x, y - sliceY, w, h, r, c); }
    function drawRoundRect(x, y, w, h, r, c) { System.drawRoundRect(x, y - sliceY, w, h, r, c); }
    function drawFastHLine(x, y, w, c) { System.drawFastHLine(x, y - sliceY, w, c); }
    function drawString(s, x, y, f) { System.drawString(s, x, y - sliceY, f); }
    function fillCircle(x, y, rad, c) { System.fillCircle(x, y - sliceY, rad, c); }

    function drawGradientBackground() {
        var bands = 16;
        var h = Math.ceil(SH / bands);
        for (var i = 0; i < bands; i++) {
            var y0 = i * h;
            if (useSprite && (y0 + h < sliceY || y0 >= sliceY + sliceHeight)) continue;
            var r = Math.floor(20 - (10 * i / bands));
            var g = Math.floor(25 - (10 * i / bands));
            var b = Math.floor(35 - (15 * i / bands));
            fillRect(0, y0, SW, h, System.color(r, g, b));
        }
    }

    function drawCards() {
        var startY = HEADER_H + 8 - Math.floor(scrollY);

        for (var i = 0; i < cards.length; i++) {
            var cy = startY + (i * CARD_STEP);
            if (cy > SH - TAB_H || cy + CARD_H < HEADER_H) continue;
            if (useSprite && (cy + CARD_H < sliceY || cy >= sliceY + sliceHeight)) continue;

            fillRoundRect(12, cy + 3, SW - 24, CARD_H, 8, shadow);
            fillRoundRect(10, cy, SW - 20, CARD_H, 8, cardBg);
            drawRoundRect(10, cy, SW - 20, CARD_H, 8, cardBorder);

            fillRoundRect(10, cy, 8, CARD_H, 8, accent);
            fillRect(14, cy, 4, CARD_H, cardBg);

            System.setTextColor(textPrimary, cardBg);
            drawString(cards[i].title, 28, cy + 12, 2);

            System.setTextColor(accent, cardBg);
            drawString(cards[i].val, SW - 24 - (cards[i].val.length * 8), cy + 12, 2);

            System.setTextColor(textSecondary, cardBg);
            drawString(cards[i].desc, 28, cy + 40, 2);
        }
    }

    function drawHeader() {
        if (useSprite && sliceY >= HEADER_H) return;
        fillRect(0, 0, SW, HEADER_H, barBg);
        drawFastHLine(0, HEADER_H - 1, SW, cardBorder);

        System.setTextColor(textPrimary, barBg);
        drawString("Dashboard", 14, 10, 4);

        var time = System.millis();
        var pulse = (Math.sin(time / 200.0) + 1) / 2.0;
        var r = Math.floor(10 + (pulse * 245));
        var g = Math.floor(180 + (pulse * 75));
        var b = Math.floor(200 + (pulse * 55));

        fillCircle(SW - 52, 23, 6, System.color(r, g, b));
    }

    function drawTabBar() {
        var tabTop = SH - TAB_H;
        if (useSprite && sliceY + sliceHeight <= tabTop) return;

        fillRect(0, tabTop, SW, TAB_H, barBg);
        drawFastHLine(0, tabTop, SW, cardBorder);

        var tabWidth = Math.floor(SW / 3);
        var labels = ["Home", "Stats", "Settings"];

        for (var i = 0; i < 3; i++) {
            var bx = i * tabWidth;
            var tx = bx + Math.floor(tabWidth / 2);
            var ty = tabTop + Math.floor((TAB_H - 16) / 2);

            if (activeTab === i) {
                fillRoundRect(bx + 8, tabTop + 6, tabWidth - 16, TAB_H - 12, 8, cardBorder);
                System.setTextColor(accent, cardBorder);
            } else {
                System.setTextColor(textSecondary, barBg);
            }

            drawString(labels[i], tx - Math.floor((labels[i].length * 7) / 2), ty, 2);
        }
    }

    function renderFrame() {
        if (useSprite) {
            for (var i = 0; i < numSlices; i++) {
                sliceY = i * sliceHeight;
                System.bindSprite(true);
                System.fillScreen(bgTop);

                drawGradientBackground();
                drawCards();
                drawHeader();
                drawTabBar();

                System.bindSprite(false);
                System.pushSprite(0, sliceY);
            }
        } else {
            sliceY = 0;
            System.fillScreen(bgTop);
            drawCards();
            drawHeader();
            drawTabBar();
        }
    }

    while (true) {
        var t = System.getTouch();

        if (t.touched) {
            if (t.x >= SW - 40 && t.y <= 40) {
                break;
            }
            if (!isDragging) {
                isDragging = true;
                lastTouchY = t.y;
                scrollVelocity = 0;

                if (t.y > SH - TAB_H) {
                    var tabWidth = SW / 3;
                    activeTab = Math.floor(t.x / tabWidth);
                    if (activeTab > 2) activeTab = 2;
                }
            } else if (t.y <= SH - TAB_H) {
                var deltaY = t.y - lastTouchY;
                lastTouchY = t.y;

                targetScrollY -= deltaY;
                scrollVelocity = -deltaY;
            }
        } else {
            isDragging = false;
            scrollVelocity *= 0.85;
            targetScrollY += scrollVelocity;
            if (Math.abs(scrollVelocity) < 0.5) scrollVelocity = 0;
        }

        if (targetScrollY < 0) {
            targetScrollY *= 0.8;
            if (!isDragging && Math.abs(scrollVelocity) < 0.1) targetScrollY = 0;
        } else if (targetScrollY > maxScroll) {
            var over = targetScrollY - maxScroll;
            targetScrollY = maxScroll + (over * 0.8);
            if (!isDragging && Math.abs(scrollVelocity) < 0.1) targetScrollY = maxScroll;
        }

        scrollY += (targetScrollY - scrollY) * 0.4;

        renderFrame();
        System.delay(16);
    }

    if (useSprite) {
        System.deleteSprite();
    }
})();