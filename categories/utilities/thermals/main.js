// KryonOS Hardware Thermals Monitor
// Displays real-time ESP32 internal CPU core temperature
// Multi-resolution support for 240x320 Portrait & 320x240 Landscape

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();
    var IS_LANDSCAPE = (SW > SH);

    var C_BG = 0x0000;
    var C_TEXT = 0xFFFF;
    var C_RED = 0xF800;
    var C_GREEN = 0x07E0;
    var C_BLUE = 0x001F;
    var C_GREY = 0x3186;
    var C_CYAN = 0x07FF;

    function mapColor(tempC) {
        if (tempC < 30) return C_BLUE;
        if (tempC > 65) return C_RED;
        return C_GREEN;
    }

    var hasSensor = System.hasTemperatureSensor();

    if (!hasSensor) {
        System.fillScreen(C_BG);
        System.setTextColor(C_RED, C_BG);
        System.drawString("UNSUPPORTED", 20, Math.floor(SH * 0.16), 4);

        System.setTextColor(C_TEXT, C_BG);
        System.drawString("This specific ESP32 chip", 14, Math.floor(SH * 0.36), 2);
        System.drawString("revision does not have", 14, Math.floor(SH * 0.44), 2);
        System.drawString("a physical thermal sensor.", 14, Math.floor(SH * 0.52), 2);

        System.drawString("Tap to exit...", 20, SH - 36, 2);

        var lastT = false;
        while (true) {
            var t = System.getTouch();
            if (t.touched && !lastT) break;
            lastT = t.touched;
            System.delay(50);
        }
    } else {
        System.fillScreen(C_BG);
        System.setTextColor(C_CYAN, C_BG);
        System.drawString("THERMAL MONITOR", 14, 12, 4);

        // Adaptive thermometer geometry
        var pipeW = 46;
        var bulbR = IS_LANDSCAPE ? 26 : 34;
        var pipeX = IS_LANDSCAPE ? 44 : Math.floor((SW - pipeW) / 2);
        var pipeTop = 52;
        var bulbCY = IS_LANDSCAPE ? (SH - bulbR - 14) : (SH - bulbR - 54);
        var pipeH = bulbCY - pipeTop - 4;
        var bulbCX = pipeX + Math.floor(pipeW / 2);

        var statsX = IS_LANDSCAPE ? (pipeX + pipeW + 40) : 20;
        var coreY = IS_LANDSCAPE ? 90 : (SH - 42);
        var maxX = IS_LANDSCAPE ? statsX : (SW - 78);
        var maxY = IS_LANDSCAPE ? 150 : 100;

        // Thermometer outline
        System.drawRoundRect(pipeX, pipeTop, pipeW, pipeH, 8, C_GREY);
        System.fillCircle(bulbCX, bulbCY, bulbR, C_GREY);
        System.fillCircle(bulbCX, bulbCY, bulbR - 4, C_BG);
        System.fillRect(pipeX + 2, bulbCY - 12, pipeW - 4, 16, C_BG);

        var maxTemp = -999;
        var lastUpdate = 0;
        var lastTouch = false;
        var innerH = pipeH - 12;

        while (true) {
            var now = System.millis();

            if (now - lastUpdate > 500) {
                var temp = System.getTemperature();
                if (temp > maxTemp) maxTemp = temp;

                var tColor = mapColor(temp);
                System.fillCircle(bulbCX, bulbCY, bulbR - 6, tColor);

                var barHeight = Math.floor((temp / 80.0) * innerH);
                if (barHeight < 0) barHeight = 0;
                if (barHeight > innerH) barHeight = innerH;

                System.fillRect(pipeX + 5, pipeTop + 5, pipeW - 10, innerH, C_BG);
                System.fillRect(pipeX + 5, (pipeTop + 5 + innerH) - barHeight, pipeW - 10, barHeight, tColor);

                System.fillRect(statsX, coreY, 150, 32, C_BG);
                System.setTextColor(tColor, C_BG);
                System.drawString("Core: " + Math.floor(temp) + " C", statsX, coreY, 4);

                System.fillRect(maxX, maxY, 72, 42, C_BG);
                System.setTextColor(C_TEXT, C_BG);
                System.drawString("MAX", maxX, maxY, 2);
                System.setTextColor(C_RED, C_BG);
                System.drawString(Math.floor(maxTemp) + " C", maxX, maxY + 20, 2);

                lastUpdate = now;
            }

            var touch = System.getTouch();
            if (touch.touched && !lastTouch) {
                if (touch.x >= SW - 40 && touch.y <= 40) {
                    break;
                }
            }
            lastTouch = touch.touched;
            System.delay(25);
        }
    }
})();