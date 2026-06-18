// Modern UI Dashboard Demo for HarixOS
// Showcases advanced drawing techniques, physics-based scrolling, and double buffering

var SW = System.screenWidth();
var SH = System.screenHeight();

// Color Palette (RGB565)
var bgTop = System.color(20, 25, 35);
var bgBot = System.color(10, 15, 20);
var cardBg = System.color(35, 45, 60);
var cardBorder = System.color(60, 75, 95);
var accent = System.color(0, 180, 255);
var textPrimary = System.color(250, 250, 250);
var textSecondary = System.color(150, 160, 175);
var shadow = System.color(5, 5, 10);

var cards = [
    { title: "System Status", desc: "All systems operational", val: "100%" },
    { title: "Battery Health", desc: "Charging rapidly", val: "84%" },
    { title: "Wi-Fi Network", desc: "Connected to Home_5G", val: "Excellent" },
    { title: "Storage Space", desc: "Using LittleFS", val: "1.2 MB Free" },
    { title: "Sensors", desc: "Temp / Humidity", val: "24C" },
    { title: "Updates", desc: "HarixOS v2.1.0", val: "Up to date" }
];

// Scrolling physics variables
var scrollY = 0;
var targetScrollY = 0;
var scrollVelocity = 0;
var maxScroll = (cards.length * 85) + 60 - SH + 70; // 85 per card, 60 top padding, 70 bottom padding
if (maxScroll < 0) maxScroll = 0;

var lastTouchY = 0;
var isDragging = false;
var activeTab = 0;

// Setup sliced double buffering (4 bands of 80 pixels) to save RAM and avoid flickering
var sliceHeight = 80;
System.createSprite(SW, sliceHeight);
var sliceY = 0;

// Wrapper functions to offset drawing by sliceY
function fillRect(x, y, w, h, c) { System.fillRect(x, y - sliceY, w, h, c); }
function fillRoundRect(x, y, w, h, r, c) { System.fillRoundRect(x, y - sliceY, w, h, r, c); }
function drawRoundRect(x, y, w, h, r, c) { System.drawRoundRect(x, y - sliceY, w, h, r, c); }
function drawFastHLine(x, y, w, c) { System.drawFastHLine(x, y - sliceY, w, c); }
function drawString(s, x, y, f) { System.drawString(s, x, y - sliceY, f); }
function fillCircle(x, y, rad, c) { System.fillCircle(x, y - sliceY, rad, c); }

function drawGradientBackground() {
    // Draw simple simulated gradient (banding)
    var bands = 40;
    var h = SH / bands;
    for (var i = 0; i < bands; i++) {
        // Interpolate between bgTop and bgBot
        var r = 20 - (10 * i / bands);
        var g = 25 - (10 * i / bands);
        var b = 35 - (15 * i / bands);
        fillRect(0, Math.floor(i * h), SW, Math.ceil(h), System.color(Math.floor(r), Math.floor(g), Math.floor(b)));
    }
}

function drawCards() {
    var startY = 60 - Math.floor(scrollY);
    
    for (var i = 0; i < cards.length; i++) {
        var cy = startY + (i * 85);
        
        // Culling (don't draw if completely off screen)
        if (cy > SH || cy + 75 < 0) continue;
        
        // Shadow
        fillRoundRect(12, cy + 4, SW - 24, 75, 10, shadow);
        // Card Body
        fillRoundRect(10, cy, SW - 20, 75, 10, cardBg);
        // Card Border
        drawRoundRect(10, cy, SW - 20, 75, 10, cardBorder);
        
        // Decorative left bar
        fillRoundRect(10, cy, 8, 75, 10, accent);
        fillRect(14, cy, 4, 75, cardBg); // Clean up overlap
        
        // Text
        System.setTextColor(textPrimary);
        drawString(cards[i].title, 30, cy + 15, 2);
        
        System.setTextColor(accent);
        drawString(cards[i].val, SW - 20 - 70, cy + 15, 2);
        
        System.setTextColor(textSecondary);
        drawString(cards[i].desc, 30, cy + 45, 2);
    }
}

function drawHeader() {
    // Glassmorphism effect blur simulation
    fillRect(0, 0, SW, 50, System.color(15, 20, 25));
    drawFastHLine(0, 50, SW, cardBorder);
    
    System.setTextColor(textPrimary);
    drawString("Dashboard", 15, 15, 4);
    
    // Pulse animation dot
    var time = System.millis();
    var pulse = (Math.sin(time / 200.0) + 1) / 2.0; // 0 to 1
    var r = Math.floor(10 + (pulse * 245));
    var g = Math.floor(180 + (pulse * 75));
    var b = Math.floor(200 + (pulse * 55));
    
    fillCircle(SW - 25, 25, 6, System.color(r, g, b));
}

function drawTabBar() {
    fillRect(0, SH - 60, SW, 60, System.color(15, 20, 25));
    drawFastHLine(0, SH - 60, SW, cardBorder);
    
    var tabWidth = SW / 3;
    var labels = ["Home", "Stats", "Settings"];
    
    for (var i = 0; i < 3; i++) {
        var tx = Math.floor(i * tabWidth + (tabWidth / 2));
        var ty = SH - 30;
        
        if (activeTab === i) {
            fillRoundRect(Math.floor(i * tabWidth + 10), SH - 50, Math.floor(tabWidth - 20), 40, 8, cardBorder);
            System.setTextColor(accent);
        } else {
            System.setTextColor(textSecondary);
        }
        
        drawString(labels[i], Math.floor(tx - 25), ty - 8, 2);
    }
}

function renderFrame() {
    var numSlices = SH / sliceHeight;
    for (var i = 0; i < numSlices; i++) {
        sliceY = i * sliceHeight;
        System.bindSprite(true);
        
        drawGradientBackground();
        drawCards();
        drawHeader();
        drawTabBar();
        
        System.bindSprite(false);
        System.pushSprite(0, sliceY);
    }
}

// Main Loop
while (true) {
    var t = System.getTouch();
    
    if (t.touched) {
        if (!isDragging) {
            isDragging = true;
            lastTouchY = t.y;
            scrollVelocity = 0;
            
            // Tab bar touch detection
            if (t.y > SH - 60) {
                var tabWidth = SW / 3;
                activeTab = Math.floor(t.x / tabWidth);
                if (activeTab > 2) activeTab = 2;
            }
        } else {
            // Calculate drag delta
            var deltaY = t.y - lastTouchY;
            lastTouchY = t.y;
            
            targetScrollY -= deltaY;
            scrollVelocity = -deltaY; // Store for momentum
        }
    } else {
        isDragging = false;
        
        // Apply Momentum Friction
        scrollVelocity *= 0.85; 
        targetScrollY += scrollVelocity;
        
        if (Math.abs(scrollVelocity) < 0.5) scrollVelocity = 0;
    }
    
    // Rubber band bounds clamping
    if (targetScrollY < 0) {
        targetScrollY *= 0.8; // Resistance
        if (!isDragging && Math.abs(scrollVelocity) < 0.1) targetScrollY = 0;
    } else if (targetScrollY > maxScroll) {
        var over = targetScrollY - maxScroll;
        targetScrollY = maxScroll + (over * 0.8);
        if (!isDragging && Math.abs(scrollVelocity) < 0.1) targetScrollY = maxScroll;
    }
    
    // Smooth interpolation (spring effect)
    scrollY += (targetScrollY - scrollY) * 0.4;
    
    renderFrame();
    
    // Enforce framerate cap (~60fps)
    System.delay(16);
}
