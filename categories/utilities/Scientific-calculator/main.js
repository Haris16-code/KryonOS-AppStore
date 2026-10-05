

var SW = System.screenWidth();
var SH = System.screenHeight();

var expression = "";
var result = "";
var lastExpression = "";
var lastResult = "";
var lastTouch = false;

// States
var isSecondMode = false;
var isRadMode = false; // Default DEG

// 16-bit RGB565 Colors
var BG_COLOR    = 0x0841; // Deep AMOLED Black/Slate
var DISP_BG     = 0x10A2; // Display Card
var BTN_NUM     = 0x2104; // Numbers
var BTN_SCI     = 0x1353; // Cyan/Teal (Functions)
var BTN_ACTIVE  = 0x07E0; // Neon Green (When 2nd is ON)
var BTN_OP      = 0x3193; // Indigo (Operators)
var BTN_MEM     = 0x51B0; // Memory/Ans Button (Purple/Violet)
var BTN_EQUAL   = 0xFC00; // Amber/Orange
var BTN_CLEAR   = 0xC902; // Crimson Red
var TEXT_COLOR  = 0xFFFF; // Pure White
var TEXT_DIM    = 0x8410; // Slate Grey

// Dynamic Responsive Geometry (5 Columns x 6 Rows)
var cols = 5;
var rows = 6;
var spacing = 4;
var marginX = 6;
var startY = 85; 

var btnW = Math.floor((SW - (2 * marginX) - ((cols - 1) * spacing)) / cols);
var btnH = Math.floor((SH - startY - 6 - ((rows - 1) * spacing)) / rows);

function getButtons() {
    return [
        // Row 0
        { l: "2nd",   r: 0, c: 0, type: "mode_2nd" },
        { l: isRadMode ? "RAD" : "DEG", r: 0, c: 1, type: "mode_rad" },
        { l: isSecondMode ? "asin" : "sin", r: 0, c: 2, type: "fn", val: isSecondMode ? "asin(" : "sin(" },
        { l: isSecondMode ? "acos" : "cos", r: 0, c: 3, type: "fn", val: isSecondMode ? "acos(" : "cos(" },
        { l: isSecondMode ? "atan" : "tan", r: 0, c: 4, type: "fn", val: isSecondMode ? "atan(" : "tan(" },

        // Row 1
        { l: isSecondMode ? "e^x"  : "ln",  r: 1, c: 0, type: "fn", val: isSecondMode ? "exp(" : "ln(" },
        { l: isSecondMode ? "10^x" : "log", r: 1, c: 1, type: "fn", val: isSecondMode ? "10^(" : "log(" },
        { l: "(",   r: 1, c: 2, type: "op", val: "(" },
        { l: ")",   r: 1, c: 3, type: "op", val: ")" },
        { l: "AC",  r: 1, c: 4, type: "clear" },

        // Row 2
        { l: isSecondMode ? "x²" : "√", r: 2, c: 0, type: "fn", val: isSecondMode ? "^2" : "√(" },
        { l: "7",   r: 2, c: 1, type: "num", val: "7" },
        { l: "8",   r: 2, c: 2, type: "num", val: "8" },
        { l: "9",   r: 2, c: 3, type: "num", val: "9" },
        { l: "/",   r: 2, c: 4, type: "op",  val: "/" },

        // Row 3
        { l: isSecondMode ? "x!" : "^", r: 3, c: 0, type: "op", val: isSecondMode ? "!" : "^" },
        { l: "4",   r: 3, c: 1, type: "num", val: "4" },
        { l: "5",   r: 3, c: 2, type: "num", val: "5" },
        { l: "6",   r: 3, c: 3, type: "num", val: "6" },
        { l: "*",   r: 3, c: 4, type: "op",  val: "*" },

        // Row 4
        { l: isSecondMode ? "|x|" : "π", r: 4, c: 0, type: "fn", val: isSecondMode ? "abs(" : "π" },
        { l: "1",   r: 4, c: 1, type: "num", val: "1" },
        { l: "2",   r: 4, c: 2, type: "num", val: "2" },
        { l: "3",   r: 4, c: 3, type: "num", val: "3" },
        { l: "-",   r: 4, c: 4, type: "op",  val: "-" },

        // Row 5
        { l: "Ans", r: 5, c: 0, type: "ans" },
        { l: "0",   r: 5, c: 1, type: "num", val: "0" },
        { l: ".",   r: 5, c: 2, type: "num", val: "." },
        { l: "DEL", r: 5, c: 3, type: "del" },
        { l: "=",   r: 5, c: 4, type: "eq" }
    ];
}

var currentButtons = getButtons();

function drawUI() {
    System.fillScreen(BG_COLOR);
    
    // Display Screen Frame
    System.fillRoundRect(marginX, 8, SW - (2 * marginX), startY - 14, 6, DISP_BG);
    System.drawRoundRect(marginX, 8, SW - (2 * marginX), startY - 14, 6, BTN_SCI);
    
    drawDisplay();
    drawKeypad();
}

function drawKeypad() {
    for (var i = 0; i < currentButtons.length; i++) {
        drawButton(currentButtons[i], false);
    }
}

function drawButton(b, isPressed) {
    var bx = marginX + (b.c * (btnW + spacing));
    var by = startY + (b.r * (btnH + spacing));
    
    var color = BTN_NUM;
    if (b.type === "fn" || b.type === "mode_rad") color = BTN_SCI;
    else if (b.type === "mode_2nd") color = isSecondMode ? BTN_ACTIVE : BTN_SCI;
    else if (b.type === "op") color = BTN_OP;
    else if (b.type === "ans") color = BTN_MEM;
    else if (b.type === "clear" || b.type === "del") color = BTN_CLEAR;
    else if (b.type === "eq") color = BTN_EQUAL;

    if (isPressed) {
        System.fillRoundRect(bx, by, btnW, btnH, 5, TEXT_COLOR);
        return;
    }

    System.fillRoundRect(bx, by, btnW, btnH, 5, color);
    
    // Text Color setup
    var txtClr = (b.type === "mode_2nd" && isSecondMode) ? 0x0000 : TEXT_COLOR;
    System.setTextColor(txtClr, color);
    
    var font = (b.l.length > 2) ? 2 : (b.type === "num" ? 4 : 2);
    var approxCharWidth = (font === 4) ? 10 : 6;
    var tx = bx + Math.floor((btnW - (b.l.length * approxCharWidth)) / 2);
    var ty = by + Math.floor((btnH - (font === 4 ? 14 : 10)) / 2);
    
    System.drawString(b.l, tx, ty, font);
}

function drawDisplay() {
    // Clear Inner Display Card
    System.fillRoundRect(marginX + 2, 10, SW - (2 * marginX) - 4, startY - 18, 4, DISP_BG);
    
    // Status Bar (DEG/RAD & 2nd indicator + History indicator)
    System.setTextColor(TEXT_DIM, DISP_BG);
    var statusText = (isRadMode ? "RAD" : "DEG") + (isSecondMode ? "  [2nd]" : "");
    if (lastResult !== "") statusText += "  [HIST]";
    System.drawString(statusText, marginX + 8, 12, 1);

    // Expression line
    var maxChars = Math.floor((SW - 30) / 9);
    var dispExpr = expression;
    if (dispExpr.length > maxChars) {
        dispExpr = "..." + dispExpr.substring(dispExpr.length - (maxChars - 3));
    }
    System.setTextColor(TEXT_DIM, DISP_BG);
    System.drawString(dispExpr === "" ? "0" : dispExpr, marginX + 8, 26, 2);
    
    // Result line
    System.setTextColor(TEXT_COLOR, DISP_BG);
    var dispResult = result;
    if (dispResult.length > maxChars) {
        dispResult = dispResult.substring(0, maxChars - 3) + "...";
    }
    System.drawString(dispResult, marginX + 8, 48, 4);
}

// Math Utility Functions
function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) return NaN;
    if (n === 0 || n === 1) return 1;
    var res = 1;
    for (var i = 2; i <= n; i++) res *= i;
    return res;
}

// Calculation Parser Engine
function calculateResult(expr) {
    if (!expr) return "";
    
    try {
        var parsed = expr;

        // Auto Close Brackets (e.g., sin(30 -> sin(30))
        var openCount = (parsed.match(/\(/g) || []).length;
        var closeCount = (parsed.match(/\)/g) || []).length;
        while (openCount > closeCount) {
            parsed += ")";
            closeCount++;
        }

        // Implicit Multiplication (e.g., 2π -> 2*π, 5(2) -> 5*(2))
        parsed = parsed.replace(/(\d)(\()/g, "$1*$2");
        parsed = parsed.replace(/(\))(\d)/g, "$1*$2");
        parsed = parsed.replace(/(\d)(π|e|sin|cos|tan|ln|log|√|abs)/g, "$1*$2");
        parsed = parsed.replace(/(π|e)(\d)/g, "$1*$2");

        // DEG/RAD handling for Trig
        if (!isRadMode) {
            parsed = parsed.split("asin(").join("(180/Math.PI)*Math.asin(");
            parsed = parsed.split("acos(").join("(180/Math.PI)*Math.acos(");
            parsed = parsed.split("atan(").join("(180/Math.PI)*Math.atan(");
            parsed = parsed.split("sin(").join("Math.sin((Math.PI/180)*");
            parsed = parsed.split("cos(").join("Math.cos((Math.PI/180)*");
            parsed = parsed.split("tan(").join("Math.tan((Math.PI/180)*");
        } else {
            parsed = parsed.split("asin(").join("Math.asin(");
            parsed = parsed.split("acos(").join("Math.acos(");
            parsed = parsed.split("atan(").join("Math.atan(");
            parsed = parsed.split("sin(").join("Math.sin(");
            parsed = parsed.split("cos(").join("Math.cos(");
            parsed = parsed.split("tan(").join("Math.tan(");
        }

        // Standard Functions
        parsed = parsed.split("ln(").join("Math.log(");
        parsed = parsed.split("log(").join("Math.log10(");
        parsed = parsed.split("exp(").join("Math.exp(");
        parsed = parsed.split("√(").join("Math.sqrt(");
        parsed = parsed.split("abs(").join("Math.abs(");
        parsed = parsed.split("π").join("Math.PI");
        parsed = parsed.split("e").join("Math.E");
        parsed = parsed.split("^").join("**");

        // Factorial Replacement
        parsed = parsed.replace(/(\d+)!/g, function(match, num) {
            return "factorial(" + num + ")";
        });

        var val = eval(parsed);

        if (val === undefined || isNaN(val)) return "Error";
        
        // Float precision fix
        if (typeof val === "number" && !Number.isInteger(val)) {
            val = Number(val.toFixed(6));
        }

        // Store History
        lastExpression = expr;
        lastResult = String(val);

        return "= " + String(val);
    } catch (e) {
        return "Error";
    }
}

function handleButton(b) {
    if (b.type === "mode_2nd") {
        isSecondMode = !isSecondMode;
        currentButtons = getButtons();
        drawKeypad();
    }
    else if (b.type === "mode_rad") {
        isRadMode = !isRadMode;
        currentButtons = getButtons();
        drawKeypad();
    }
    else if (b.type === "ans") {
        if (lastResult !== "") {
            expression += lastResult;
        }
    }
    else if (b.type === "num" || b.type === "op" || b.type === "fn") {
        expression += b.val;
    } 
    else if (b.type === "clear") {
        expression = "";
        result = "";
    } 
    else if (b.type === "del") {
        if (expression.length > 0) {
            var fnTokens = ["asin(", "acos(", "atan(", "sin(", "cos(", "tan(", "ln(", "log(", "exp(", "10^(", "√(", "abs("];
            var matched = false;
            for (var k = 0; k < fnTokens.length; k++) {
                if (expression.endsWith(fnTokens[k])) {
                    expression = expression.substring(0, expression.length - fnTokens[k].length);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                expression = expression.substring(0, expression.length - 1);
            }
        }
    } 
    else if (b.type === "eq") {
        result = calculateResult(expression);
    }
    
    drawDisplay();
}

// Initial draw
drawUI();

// Event Loop
while (true) {
    var t = System.getTouch();
    var isTapped = t.touched && !lastTouch;
    
    if (isTapped) {
        // Feature: Tap the display card to recall the previous equation!
        if (t.y >= 8 && t.y < startY - 14 && lastExpression !== "") {
            expression = lastExpression;
            result = "= " + lastResult;
            drawDisplay();
        }
        // Button Clicks
        else if (t.y >= startY) {
            for (var i = 0; i < currentButtons.length; i++) {
                var b = currentButtons[i];
                var bx = marginX + (b.c * (btnW + spacing));
                var by = startY + (b.r * (btnH + spacing));
                
                if (t.x >= bx && t.x <= bx + btnW && t.y >= by && t.y <= by + btnH) {
                    drawButton(b, true);
                    System.delay(40);
                    drawButton(b, false);
                    
                    handleButton(b);
                    break;
                }
            }
        }
    }
    
    lastTouch = t.touched;
    System.delay(10);
            }
