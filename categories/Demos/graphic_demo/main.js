// Graphic Demo
// Draws random rectangles across the full SW x SH screen

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var C_BLACK = 0x0000;
    var C_WHITE = 0xFFFF;
    var C_DARK = 0x18E3;

    function drawDemo() {
        System.fillScreen(C_BLACK);
        var drawH = SH - 32;

        for (var i = 0; i < 50; i++) {
            var w = 10 + Math.floor(Math.random() * Math.floor(SW * 0.25));
            var h = 10 + Math.floor(Math.random() * Math.floor(drawH * 0.25));
            var x = Math.floor(Math.random() * Math.max(1, SW - w));
            var y = Math.floor(Math.random() * Math.max(1, drawH - h));
            var color = Math.floor(Math.random() * 65535);
            System.fillRect(x, y, w, h, color);
        }

        System.fillRect(0, SH - 30, SW, 30, C_DARK);
        System.setTextColor(C_WHITE, C_DARK);
        System.drawString("Tap: Redraw (Top-R: Exit)", 10, SH - 22, 2);
    }

    drawDemo();

    var lastTouch = false;
    while (true) {
        var t = System.getTouch();
        if (t.touched && !lastTouch) {
            if (t.x >= SW - 40 && t.y <= 40) {
                break;
            }
            drawDemo();
        }
        lastTouch = t.touched;
        System.delay(25);
    }
})();
