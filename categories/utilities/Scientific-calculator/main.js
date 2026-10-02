// KryonOS Ultimate Scientific Calculator
// Vendor: shifat100
// Features: Splash Screen, 2nd Functions (nCr, nPr, Inv Trig), DEG/RAD, Ans Memory

var SW = System.screenWidth();
var SH = System.screenHeight();

var expression = "";
var result = "";
var lastExpression = "";
var lastResult = "";
var lastTouch = false;

// States
var isSecondMode = false;
var isRadMode = false; // Default: DEG

// 16-bit RGB565 Colors
var BG_COLOR    = 0x0841; // Deep Slate/Black
var DISP_BG     = 0x10A2; // Display Card
var BTN_NUM     = 0x2104; // Numbers
var BTN_SCI     = 0x1353; // Cyan/Teal (Functions)
var BTN_ACTIVE  = 0x07E0; // Neon Green (When 2nd is ON)
var BTN_OP      = 0x3193; // Indigo (Operators)
var BTN_MEM     = 0x51B0; // Memory/Ans Button (Purple)
var BTN_EQUAL   = 0xFC00; // Amber/Orange
var BTN_CLEAR   = 0xC902; // Crimson Red
var TEXT_COLOR  = 0xFFFF; // Pure White
var TEXT_DIM    = 0x8410; // Slate Grey
var ACCENT_CYAN = 0x07FF; // Brand Cyan

// Responsive Keypad Dimensions
var cols = 5;
var rows = 6;
var spacing = 4;
var marginX = 6;
var startY = 85; 

var btnW = Math.floor((SW - (2 * marginX) - ((cols - 1) * spacing)) / cols);
var btnH = Math.floor((SH - startY - 6 - ((rows - 1) * spacing)) / rows);

// ----------------------------------------------------
// 1. BRANDED SPLASH SCREEN (shifat100)
// ----------------------------------------------------
function showSplashScreen() {
    System.fillScreen(BG_COLOR);

    var centerX = Math.floor(SW / 2);
    var centerY = Math.floor(SH / 2);

    // Vendor Branding Box
    System.fillRoundRect(centerX - 80, centerY - 60, 160, 110, 8, DISP_BG);
    System.drawRoundRect(centerX - 80, centerY - 60, 160, 110, 8, ACCENT_CYAN);

    // Vendor Title
    System.setTextColor(ACCENT_CYAN, DISP_BG);
    System.drawString("shifat100", centerX - 42, centerY - 45, 4);

    // Subtitle
    System.setTextColor(TEXT_DIM, DISP_BG);
    System.drawString("SciCalc OS v2.0", centerX - 42, centerY - 15, 2);

    // Animated Loading Bar
    var barW = 120;
    var barH = 6;
    var barX = centerX - Math.floor(barW / 2);
    var barY = centerY + 22;

    System.drawRoundRect(barX - 2, barY - 2, barW + 4, barH + 4, 3, TEXT_DIM);

    for (var p = 0; p <= barW; p += 6) {
        System.fillRoundRect(barX, barY, p, barH, 2, ACCENT_CYAN);
        System.delay(25); // Splash Animation Speed
    }

    System.delay(200); // Short Pause before entering app
}

// ----------------------------------------------------
// 2. BUTTON LAYOUT SETUP
// ----------------------------------------------------
function getButtons() {
    return [
        // Row 0
        { l: "2nd",   r: 0, c: 0, type: "mode_2nd" },
        { l: isRadMode ? "RAD" : "DEG", r: 0, c: 1, type: "mode_rad" },
        { l: isSecondMode ? "asin" : "sin", r: 0, c: 2, type: "fn", val: isSecondMode ? "asin(" : "sin(" },
        { l: isSecondMode ? "acos" : "cos", r: 0, c: 3, type: "fn", val: isSecondMode ? "acos(" : "cos(" },
        { l: isSecondMode ? "atan" : "tan", r: 0, c: 4, type: "fn", val: isSecondMode ? "atan(" : "tan(" },

        // Row 1
        { l: isSecondMode ? "nPr"  : "ln",  r: 1, c: 0, type: "fn", val: isSecondMode ? "P" : "ln(" },
        { l: isSecondMode ? "nCr"  : "log", r: 1, c: 1, type: "fn", val: isSecondMode ? "C" : "log(" },
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
        { l: isSecondMode ? "%" : "π", r: 4, c: 0, type: "op", val: isSecondMode ? "%" : "π" },
        { l: "1",   r: 4, c: 1, type: "num", val: "1" },
        { l: "2",   r: 4, c: 2, type: "num", val: "2" },
        { l: "3",   r: 4, c: 3, type: "num", val: "3" },
        { l: "-",   r: 4, c: 4, type: "op",  val: "-" },

        // Row 5
        { l: "Ans", r: 5, c: 0, type: "ans" },
        { l: "0",   r: 5, c: 1, type: "num", val: "0" },
        { l: ".",   r: 5, c: 2, type: "num", val: "." },
        { l: "DEL", r: 5, c: 3, type: "del" },
        { l: "=",   r: 5, c: 4, type: "eq" },
        { l: "+",   r: 5, c: 4, type: "op",  val: "+" } // Visual placement handled by coordinate
    ];
}

// Fix 5x6 layout coordinates for bottom row
var currentButtons = [
    // R0
    { l: "2nd",   r: 0, c: 0, type: "mode_2nd" },
    { l: "DEG",   r: 0, c: 1, type: "mode_rad" },
    { l: "sin",   r: 0, c: 2, type: "fn", val: "sin(" },
    { l: "cos",   r: 0, c: 3, type: "fn", val: "cos(" },
    { l: "tan",   r: 0, c: 4, type: "fn", val: "tan(" },
    // R1
    { l: "ln",    r: 1, c: 0, type: "fn", val: "ln(" },
    { l: "log",   r: 1, c: 1, type: "fn", val: "log(" },
    { l: "(",     r: 1, c: 2, type: "op", val: "(" },
    { l: ")",     r: 1, c: 3, type: "op", val: ")" },
    { l: "AC",    r: 1, c: 4, type: "clear" },
    // R2
    { l: "√",     r: 2, c: 0, type: "fn", val: "√(" },
    { l: "7",     r: 2, c: 1, type: "num", val: "7" },
    { l: "8",     r: 2, c: 2, type: "num", val: "8" },
    { l: "9",     r: 2, c: 3, type: "num", val: "9" },
    { l: "/",     r: 2, c: 4, type: "op",  val: "/" },
    // R3
    { l: "^",     r: 3, c: 0, type: "op", val: "^" },
    { l: "4",     r: 3, c: 1, type: "num", val: "4" },
    { l: "5",     r: 3, c: 2, type: "num", val: "5" },
    { l: "6",     r: 3, c: 3, type: "num", val: "6" },
    { l: "*",     r: 3, c: 4, type: "op",  val: "*" },
    // R4
    { l: "π",     r: 4, c: 0, type: "num", val: "π" },
    { l: "1",     r: 4, c: 1, type: "num", val: "1" },
    { l: "2",     r: 4, c: 2, type: "num", val: "2" },
    { l: "3",     r: 4, c: 3, type: "num", val: "3" },
    { l: "-",     r: 4, c: 4, type: "op",  val: "-" },
    // R5
    { l: "Ans",   r: 5, c: 0, type: "ans" },
    { l: "0",     r: 5, c: 1, type: "num", val: "0" },
    { l: "DEL",   r: 5, c: 2, type: "del" },
    { l: "=",     r: 5, c: 3, type: "eq" },
    { l: "+",     r: 5, c: 4, type: "op",  val: "+" }
];

function updateDynamicButtons() {
    currentButtons[1].l = isRadMode ? "RAD" : "DEG";
    
    // Row 0
    currentButtons[2].l = isSecondMode ? "asin" : "sin";
    currentButtons[2].val = isSecondMode ? "asin(" : "sin(";
    currentButtons[3].l = isSecondMode ? "acos" : "cos";
    currentButtons[3].val = isSecondMode ? "acos(" : "cos(";
    currentButtons[4].l = isSecondMode ? "atan" : "tan";
    currentButtons[4].val = isSecondMode ? "atan(" : "tan(";

    // Row 1
    currentButtons[5].l = isSecondMode ? "nPr" : "ln";
    currentButtons[5].val = isSecondMode ? "P" : "ln(";
    currentButtons[6].l = isSecondMode ? "nCr" : "log";
    currentButtons[6].val = isSecondMode ? "C" : "log(";

    // Row 2 & 3
    currentButtons[10].l = isSecondMode ? "x²" : "√";
    currentButtons[10].val = isSecondMode ? "^2" : "√(";
    currentButtons[15].l = isSecondMode ? "x!" : "^";
    currentButtons[15].val = isSecondMode ? "!" : "^";

    // Row 4
    currentButtons[20].l = isSecondMode ? "%" : "π";
    currentButtons[20].val = isSecondMode ? "%" : "π";
}

// ----------------------------------------------------
// 3. UI RENDERING
// ----------------------------------------------------
function drawUI() {
    System.fillScreen(BG_COLOR);
    
    // Main Display Card
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
    
    var txtClr = (b.type === "mode_2nd" && isSecondMode) ? 0x0000 : TEXT_COLOR;
    System.setTextColor(txtClr, color);
    
    var font = (b.l.length > 2) ? 2 : (b.type === "num" ? 4 : 2);
    var approxCharWidth = (font === 4) ? 10 : 6;
    var tx = bx + Math.floor((btnW - (b.l.length * approxCharWidth)) / 2);
    var ty = by + Math.floor((btnH - (font === 4 ? 14 : 10)) / 2);
    
    System.drawString(b.l, tx, ty, font);
}

function drawDisplay() {
    System.fillRoundRect(marginX + 2, 10, SW - (2 * marginX) - 4, startY - 18, 4, DISP_BG);
    
    // Status Header (Brand + Modes)
    System.setTextColor(ACCENT_CYAN, DISP_BG);
    System.drawString("shifat100", marginX + 8, 12, 1);
    
    System.setTextColor(TEXT_DIM, DISP_BG);
    var statusText = (isRadMode ? "RAD" : "DEG") + (isSecondMode ? " [2nd]" : "");
    if (lastResult !== "") statusText += " [HIST]";
    System.drawString(statusText, SW - 85, 12, 1);

    // Expression Line
    var maxChars = Math.floor((SW - 30) / 9);
    var dispExpr = expression;
    if (dispExpr.length > maxChars) {
        dispExpr = "..." + dispExpr.substring(dispExpr.length - (maxChars - 3));
    }
    System.drawString(dispExpr === "" ? "0" : dispExpr, marginX + 8, 26, 2);
    
    // Result Line
    System.setTextColor(TEXT_COLOR, DISP_BG);
    var dispResult = result;
    if (dispResult.length > maxChars) {
        dispResult = dispResult.substring(0, maxChars - 3) + "...";
    }
    System.drawString(dispResult, marginX + 8, 48, 4);
}

// ----------------------------------------------------
// 4. ADVANCED MATH LOGIC
// ----------------------------------------------------
function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) return NaN;
    if (n === 0 || n === 1) return 1;
    var res = 1;
    for (var i = 2; i <= n; i++) res *= i;
    return res;
}

function nPr(n, r) {
    if (n < r || n < 0 || r < 0) return NaN;
    return factorial(n) / factorial(n - r);
}

function nCr(n, r) {
    if (n < r || n < 0 || r < 0) return NaN;
    return factorial(n) / (factorial(r) * factorial(n - r));
}

function calculateResult(expr) {
    if (!expr) return "";
    
    try {
        var parsed = expr;

        // Auto Close Parentheses
        var openCount = (parsed.match(/\(/g) || []).length;
        var closeCount = (parsed.match(/\)/g) || []).length;
        while (openCount > closeCount) {
            parsed += ")";
            closeCount++;
        }

        // Implicit Multiplications
        parsed = parsed.replace(/(\d)(\()/g, "$1*$2");
        parsed = parsed.replace(/(\))(\d)/g, "$1*$2");
        parsed = parsed.replace(/(\d)(π|e|sin|cos|tan|ln|log|√)/g, "$1*$2");

        // Degree vs Radian
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

        // Conversions
        parsed = parsed.split("ln(").join("Math.log(");
        parsed = parsed.split("log(").join("Math.log10(");
        parsed = parsed.split("√(").join("Math.sqrt(");
        parsed = parsed.split("π").join("Math.PI");
        parsed = parsed.split("^").join("**");
        parsed = parsed.split("%").join("/100");

        // Factorials
        parsed = parsed.replace(/(\d+)!/g, function(m, n) {
            return "factorial(" + n + ")";
        });

        // Permutations (nPr) and Combinations (nCr)
        parsed = parsed.replace(/(\d+)P(\d+)/g, function(m, n, r) {
            return "nPr(" + n + "," + r + ")";
        });
        parsed = parsed.replace(/(\d+)C(\d+)/g, function(m, n, r) {
            return "nCr(" + n + "," + r + ")";
        });

        var val = eval(parsed);
        if (val === undefined || isNaN(val)) return "Error";

        if (typeof val === "number" && !Number.isInteger(val)) {
            val = Number(val.toFixed(6));
        }

        lastExpression = expr;
        lastResult = String(val);
        return "= " + String(val);
    } catch (e) {
        return "Error";
    }
}

// ----------------------------------------------------
// 5. INPUT HANDLER
// ----------------------------------------------------
function handleButton(b) {
    if (b.type === "mode_2nd") {
        isSecondMode = !isSecondMode;
        updateDynamicButtons();
        drawKeypad();
    }
    else if (b.type === "mode_rad") {
        isRadMode = !isRadMode;
        updateDynamicButtons();
        drawKeypad();
    }
    else if (b.type === "ans") {
        if (lastResult !== "") expression += lastResult;
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
            var fnTokens = ["asin(", "acos(", "atan(", "sin(", "cos(", "tan(", "ln(", "log(", "√("];
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

// ----------------------------------------------------
// 6. MAIN EXECUTION PIPELINE
// ----------------------------------------------------
// Step 1: Run Splash Screen
showSplashScreen();

// Step 2: Initialize UI
drawUI();

// Step 3: Touch Loop
while (true) {
    var t = System.getTouch();
    var isTapped = t.touched && !lastTouch;
    
    if (isTapped) {
        // Tap top display to recall history
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
