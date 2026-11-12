// KryonOS Hardware LED Controller
// Demonstrates direct GPIO hardware control from JavaScript

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var LED_PIN = 2;
    System.gpio.pinMode(LED_PIN, System.gpio.OUTPUT);

    var ledState = false;
    var lastTouch = false;

    var btnW = Math.min(180, SW - 60);
    var btnH = Math.min(100, Math.floor(SH * 0.36));
    var btnX = Math.floor((SW - btnW) / 2);
    var btnY = Math.floor((SH - btnH) / 2);

    function applyState() {
        if (ledState) {
            System.gpio.digitalWrite(LED_PIN, System.gpio.HIGH);
        } else {
            System.gpio.digitalWrite(LED_PIN, System.gpio.LOW);
        }
    }

    function drawUI() {
        System.fillScreen(0x0000);

        System.setTextColor(0x07FF, 0x0000);
        System.drawString("HARDWARE CONTROL", 12, 14, 4);
        System.setTextColor(0xFFFF, 0x0000);
        System.drawString("GPIO Pin 2 (Onboard LED)", 14, 46, 2);

        var btnColor = ledState ? 0x07E0 : 0xF800;
        System.fillRoundRect(btnX, btnY, btnW, btnH, 15, btnColor);
        System.drawRoundRect(btnX, btnY, btnW, btnH, 15, 0xFFFF);

        System.setTextColor(0xFFFF, btnColor);
        var text = ledState ? "POWER OFF" : "POWER ON";
        System.drawString(text, btnX + Math.floor((btnW - (text.length * 13)) / 2), btnY + Math.floor((btnH - 22) / 2), 4);

        System.setTextColor(0x7BEF, 0x0000);
        System.drawString("Tap button to toggle GPIO LED", 14, SH - 32, 2);
    }

    applyState();
    drawUI();

    while (true) {
        var t = System.getTouch();
        var isTapped = t.touched && !lastTouch;

        if (isTapped) {
            if (t.x >= SW - 40 && t.y <= 40) {
                break;
            }
            if (t.x >= btnX && t.x <= btnX + btnW && t.y >= btnY && t.y <= btnY + btnH) {
                ledState = !ledState;
                applyState();

                System.drawRoundRect(btnX, btnY, btnW, btnH, 15, 0xFFE0);
                System.delay(60);
                drawUI();
            }
        }

        lastTouch = t.touched;
        System.delay(20);
    }
})();