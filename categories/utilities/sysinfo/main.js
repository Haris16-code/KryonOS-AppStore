// System Information - KryonOS
// Strict Duktape ES5.1 Compatible & Multi-Resolution (240x320 & 320x240)

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var C_BG = 0x0000;
    var C_TEXT = 0xFFFF;
    var C_ACCENT = 0x07E0;

    System.fillScreen(C_BG);
    System.setTextColor(C_TEXT, C_BG);
    System.drawString("System Information", 10, 8, 2);
    System.drawLine(10, 28, SW - 10, 28, C_ACCENT);

    var info = System.getInfo();

    var y = 36;
    var rowCount = 10;
    var availH = SH - y - 10;
    var spacing = Math.min(22, Math.floor(availH / rowCount));
    var valX = Math.min(130, Math.floor(SW * 0.48));

    function drawRow(label, value) {
        System.setTextColor(C_ACCENT, C_BG);
        System.drawString(label + ":", 10, y, 2);
        System.setTextColor(C_TEXT, C_BG);
        System.drawString(value, valX, y, 2);
        y += spacing;
    }

    drawRow("Chip Model", String(info.chipModel));
    drawRow("Cores", "" + info.chipCores);
    drawRow("Revision", "" + info.chipRevision);
    drawRow("CPU Freq", info.cpuFreqMHz + " MHz");
    drawRow("Total RAM", info.totalRAM + " B");
    drawRow("Free RAM", info.freeRAM + " B");
    drawRow("Min Free RAM", info.minFreeRAM + " B");
    drawRow("Max Alloc", info.maxAllocRAM + " B");
    drawRow("Flash Size", info.flashSize + " B");
    drawRow("Uptime", (info.uptimeMs / 1000).toFixed(1) + " sec");

    var lastTouch = false;
    while (true) {
        var touch = System.getTouch();
        if (touch.touched && !lastTouch) {
            break;
        }
        lastTouch = touch.touched;
        System.delay(25);
    }
})();
