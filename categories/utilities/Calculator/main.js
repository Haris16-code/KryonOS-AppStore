// KryonOS Touch Calculator
// Multi-resolution 5x4 grid layout for 240x320 Portrait & 320x240 T-Deck Plus

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var expression = "";
    var result = "";
    var lastTouch = false;

    var BG_COLOR = 0x18E3;
    var BTN_NUM = 0x3186;
    var BTN_OP = 0x03FF;
    var BTN_EQUAL = 0xFA20;
    var BTN_CLEAR = 0xF800;
    var TEXT_COLOR = 0xFFFF;

    var buttons = [
        { l: "C",   r: 0, c: 0, type: "clear" },
        { l: "(",   r: 0, c: 1, type: "op" },
        { l: ")",   r: 0, c: 2, type: "op" },
        { l: "/",   r: 0, c: 3, type: "op" },

        { l: "7",   r: 1, c: 0, type: "num" },
        { l: "8",   r: 1, c: 1, type: "num" },
        { l: "9",   r: 1, c: 2, type: "num" },
        { l: "*",   r: 1, c: 3, type: "op" },

        { l: "4",   r: 2, c: 0, type: "num" },
        { l: "5",   r: 2, c: 1, type: "num" },
        { l: "6",   r: 2, c: 2, type: "num" },
        { l: "-",   r: 2, c: 3, type: "op" },

        { l: "1",   r: 3, c: 0, type: "num" },
        { l: "2",   r: 3, c: 1, type: "num" },
        { l: "3",   r: 3, c: 2, type: "num" },
        { l: "+",   r: 3, c: 3, type: "op" },

        { l: "0",   r: 4, c: 0, type: "num" },
        { l: ".",   r: 4, c: 1, type: "num" },
        { l: "DEL", r: 4, c: 2, type: "del" },
        { l: "=",   r: 4, c: 3, type: "eq" }
    ];

    var dispX = 10;
    var dispY = 8;
    var dispW = SW - 20;
    var dispH = Math.max(54, Math.floor(SH * 0.23));

    var spacing = 5;
    var startY = dispY + dispH + 8;
    var btnH = Math.floor((SH - startY - 6 - (spacing * 4)) / 5);
    var btnW = Math.floor((SW - 20 - (spacing * 3)) / 4);
    var startX = Math.floor((SW - (4 * btnW + 3 * spacing)) / 2);

    function drawDisplay() {
        System.fillRoundRect(dispX + 2, dispY + 2, dispW - 4, dispH - 4, 5, 0x0000);
        System.setTextColor(TEXT_COLOR, 0x0000);

        var maxChars = Math.floor((dispW - 16) / 12);
        var expDisp = (expression.length > maxChars)
            ? expression.substring(expression.length - maxChars)
            : expression;
        System.drawString(expDisp, dispX + 8, dispY + 6, 2);

        System.setTextColor(0x07FF, 0x0000);
        System.drawString(result, dispX + 8, dispY + Math.floor(dispH * 0.52), 4);
    }

    function drawUI() {
        System.fillScreen(BG_COLOR);
        System.fillRoundRect(dispX, dispY, dispW, dispH, 5, 0x0000);
        System.drawRoundRect(dispX, dispY, dispW, dispH, 5, 0x7BEF);
        drawDisplay();

        for (var i = 0; i < buttons.length; i++) {
            var b = buttons[i];
            var bx = startX + (b.c * (btnW + spacing));
            var by = startY + (b.r * (btnH + spacing));

            var color = BTN_NUM;
            if (b.type === "op") color = BTN_OP;
            if (b.type === "clear" || b.type === "del") color = BTN_CLEAR;
            if (b.type === "eq") color = BTN_EQUAL;

            System.fillRoundRect(bx, by, btnW, btnH, 6, color);

            var font = (b.l === "DEL" || btnH < 32) ? 2 : 4;
            var charW = (font === 4) ? 12 : 7;
            var charH = (font === 4) ? 20 : 14;
            var tx = bx + Math.floor((btnW - (b.l.length * charW)) / 2);
            var ty = by + Math.floor((btnH - charH) / 2);
            System.setTextColor(TEXT_COLOR, color);
            System.drawString(b.l, tx, ty, font);
        }
    }

    function evaluateSafe(expr) {
        if (!expr || !/^[0-9+\-*/().\s]+$/.test(expr)) {
            return "Error";
        }
        try {
            var fn = new Function("return (" + expr + ");");
            var val = fn();
            if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
                return "Error";
            }
            return "= " + String(Math.round(val * 1000000) / 1000000);
        } catch (e) {
            return "Error";
        }
    }

    function handleButton(b) {
        if (b.type === "num" || b.type === "op") {
            expression += b.l;
        } else if (b.type === "clear") {
            expression = "";
            result = "";
        } else if (b.type === "del") {
            if (expression.length > 0) {
                expression = expression.substring(0, expression.length - 1);
            }
        } else if (b.type === "eq") {
            result = evaluateSafe(expression);
        }
        drawDisplay();
    }

    drawUI();

    while (true) {
        var t = System.getTouch();
        var isTapped = t.touched && !lastTouch;

        if (isTapped) {
            if (t.x >= SW - 40 && t.y <= 40) {
                break;
            }
            if (t.y >= startY) {
                for (var i = 0; i < buttons.length; i++) {
                    var b = buttons[i];
                    var bx = startX + (b.c * (btnW + spacing));
                    var by = startY + (b.r * (btnH + spacing));

                    if (t.x >= bx && t.x <= bx + btnW && t.y >= by && t.y <= by + btnH) {
                        System.drawRoundRect(bx, by, btnW, btnH, 6, TEXT_COLOR);
                        System.delay(50);
                        System.drawRoundRect(bx, by, btnW, btnH, 6, BG_COLOR);
                        handleButton(b);
                        break;
                    }
                }
            }
        }

        lastTouch = t.touched;
        System.delay(15);
    }
})();
