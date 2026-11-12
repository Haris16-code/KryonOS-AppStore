// Hello World Test App
// Clears the screen to blue, centers text dynamically for 240x320 & 320x240, and waits for touch exit

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var C_BLUE = 0x001F;
    var C_WHITE = 0xFFFF;
    var C_CYAN = 0x07FF;

    System.fillScreen(C_BLUE);
    System.drawRect(6, 6, SW - 12, SH - 12, C_CYAN);

    var startY = Math.floor(SH * 0.22);
    System.setTextColor(C_WHITE, C_BLUE);
    System.drawString("Hello from KryonOS JS!", 20, startY, 2);
    System.drawString("JavaScript is working!", 20, startY + 28, 2);
    System.drawString("This is running natively", 20, startY + 56, 2);
    System.drawString("on your ESP32!", 20, startY + 84, 2);

    System.setTextColor(C_CYAN, C_BLUE);
    System.drawString("Tap anywhere to exit", 20, SH - 36, 2);

    var lastTouch = false;
    while (true) {
        var t = System.getTouch();
        if (t.touched && !lastTouch) {
            break;
        }
        lastTouch = t.touched;
        System.delay(25);
    }
})();