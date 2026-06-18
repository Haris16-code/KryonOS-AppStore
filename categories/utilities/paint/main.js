// HarixOS Paint App
// Demonstrates touch input, color picking, and drawing primitives!

// Define layout
var PALETTE_HEIGHT = 40;
var SW = System.screenWidth();
var SH = System.screenHeight();

// Colors available
var colors = [RED, GREEN, BLUE, YELLOW, WHITE];
var selectedColor = WHITE;

// Draw initial UI
function drawUI() {
    System.fillScreen(BLACK);
    
    // Draw palette bar
    System.fillRect(0, 0, SW, PALETTE_HEIGHT, DARKGREY);
    
    // Draw color buttons
    var btnWidth = SW / (colors.length + 1); // +1 for clear button
    for (var i = 0; i < colors.length; i++) {
        var cx = i * btnWidth;
        System.fillRect(cx + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, colors[i]);
        
        // Highlight selected
        if (colors[i] === selectedColor) {
            System.drawRect(cx, 0, btnWidth, PALETTE_HEIGHT, WHITE);
            System.drawRect(cx + 1, 1, btnWidth - 2, PALETTE_HEIGHT - 2, WHITE);
        }
    }
    
    // Draw clear button
    var clearX = colors.length * btnWidth;
    System.fillRect(clearX + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, BLACK);
    System.drawRect(clearX + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, WHITE);
    System.setTextColor(WHITE, BLACK);
    System.drawString("CLR", clearX + 8, 12, 2);
}

drawUI();

// Main interaction loop
while (true) {
    var touch = System.getTouch();
    
    // The red X button is drawn at (200, 0, 40, 30) by the OS
    // If we touch there, the OS will exit the app automatically.
    // We just need to handle our own UI.
    
    if (touch.touched) {
        if (touch.y < PALETTE_HEIGHT) {
            // Touched the palette area (avoiding the top right X button at x > 200)
            if (touch.x < 200) {
                var btnWidth = SW / (colors.length + 1);
                var idx = Math.floor(touch.x / btnWidth);
                
                if (idx < colors.length) {
                    // Changed color
                    selectedColor = colors[idx];
                    drawUI(); // Redraw UI to update highlight
                    System.delay(200); // Debounce
                } else if (idx === colors.length) {
                    // Clear canvas
                    drawUI(); 
                    System.delay(200); // Debounce
                }
            }
        } else {
            // Touched the canvas area! Draw!
            System.fillCircle(touch.x, touch.y, 4, selectedColor);
        }
    }
    
    System.delay(10); // Yield to prevent lockup
}
