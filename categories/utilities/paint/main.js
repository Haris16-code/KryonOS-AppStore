// KryonOS Paint App
// Multi-resolution touch painting with smooth stroke interpolation

(function () {
    var PALETTE_HEIGHT = 40;
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var BLACK = 0x0000;
    var WHITE = 0xFFFF;
    var RED = 0xF800;
    var GREEN = 0x07E0;
    var BLUE = 0x001F;
    var YELLOW = 0xFFE0;
    var DARKGREY = 0x39E7;

    var colors = [RED, GREEN, BLUE, YELLOW, WHITE];
    var selectedColor = WHITE;
    var prevX = -1;
    var prevY = -1;

    function drawUI() {
        System.fillScreen(BLACK);
        System.fillRect(0, 0, SW, PALETTE_HEIGHT, DARKGREY);

        var paletteW = SW - 40;
        var btnWidth = Math.floor(paletteW / (colors.length + 1));
        for (var i = 0; i < colors.length; i++) {
            var cx = i * btnWidth;
            System.fillRect(cx + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, colors[i]);

            if (colors[i] === selectedColor) {
                System.drawRect(cx, 0, btnWidth, PALETTE_HEIGHT, WHITE);
                System.drawRect(cx + 1, 1, btnWidth - 2, PALETTE_HEIGHT - 2, WHITE);
            }
        }

        var clearX = colors.length * btnWidth;
        System.fillRect(clearX + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, BLACK);
        System.drawRect(clearX + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, WHITE);
        System.setTextColor(WHITE, BLACK);
        System.drawString("CLR", clearX + 6, 12, 2);
    }

    drawUI();

    while (true) {
        var touch = System.getTouch();

        if (touch.touched) {
            if (touch.y < PALETTE_HEIGHT) {
                prevX = -1;
                prevY = -1;
                if (touch.x < SW - 40) {
                    var paletteW = SW - 40;
                    var btnWidth = Math.floor(paletteW / (colors.length + 1));
                    var idx = Math.floor(touch.x / btnWidth);

                    if (idx < colors.length) {
                        selectedColor = colors[idx];
                        drawUI();
                        System.delay(200);
                    } else if (idx === colors.length) {
                        drawUI();
                        System.delay(200);
                    }
                } else {
                    break;
                }
            } else {
                if (prevX !== -1 && prevY !== -1) {
                    System.drawLine(prevX, prevY, touch.x, touch.y, selectedColor);
                }
                System.fillCircle(touch.x, touch.y, 4, selectedColor);
                prevX = touch.x;
                prevY = touch.y;
            }
        } else {
            prevX = -1;
            prevY = -1;
        }

        System.delay(10);
    }
})();
