// HarixOS Hardware Thermals Monitor
// Displays real-time ESP32 internal CPU core temperature

var SW = System.screenWidth();
var SH = System.screenHeight();

// UI Colors
var C_BG = 0x0000;       // Black
var C_TEXT = 0xFFFF;     // White
var C_RED = 0xF800;      // Hot
var C_GREEN = 0x07E0;    // Normal
var C_BLUE = 0x001F;     // Cold
var C_GREY = 0x3186;     // Frame

function mapColor(tempC) {
    if (tempC < 30) return C_BLUE;
    if (tempC > 65) return C_RED;
    return C_GREEN;
}

// Initial Sensor Check
var hasSensor = System.hasTemperatureSensor();

if (!hasSensor) {
    System.fillScreen(C_BG);
    System.setTextColor(C_RED, C_BG);
    System.drawString("UNSUPPORTED", 40, 50, 4);
    
    System.setTextColor(C_TEXT, C_BG);
    System.drawString("This specific ESP32 chip", 10, 100, 2);
    System.drawString("revision does not have", 10, 120, 2);
    System.drawString("a physical thermal sensor.", 10, 140, 2);
    
    System.drawString("Tap to exit...", 60, 200, 2);
    
    while (true) {
        if (System.getTouch().touched) break;
        System.delay(50);
    }
} else {
    // Sensor Supported - Run App
    System.fillScreen(C_BG);
    
    // Header
    System.setTextColor(0x07FF, C_BG); // Cyan
    System.drawString("THERMAL MONITOR", 20, 20, 4);
    
    // Draw Thermometer Outline
    System.drawRoundRect(90, 80, 60, 160, 10, C_GREY);
    System.fillCircle(120, 240, 40, C_GREY); // Bulb outline
    System.fillCircle(120, 240, 36, C_BG);   // Bulb inner
    System.fillRect(92, 230, 56, 15, C_BG);  // Connect pipe to bulb
    
    var maxTemp = -999;
    var lastUpdate = 0;
    
    while (true) {
        var now = System.millis();
        
        // Update display every 500ms
        if (now - lastUpdate > 500) {
            var temp = System.getTemperature();
            
            if (temp > maxTemp) maxTemp = temp;
            
            var tColor = mapColor(temp);
            
            // Draw Bulb
            System.fillCircle(120, 240, 34, tColor);
            
            // Map temperature (0C to 80C) to bar height (0 to 140 pixels)
            var barHeight = Math.floor((temp / 80.0) * 140);
            if (barHeight < 0) barHeight = 0;
            if (barHeight > 140) barHeight = 140;
            
            // Clear pipe
            System.fillRect(95, 85, 50, 140, C_BG);
            
            // Fill pipe
            System.fillRect(95, 225 - barHeight, 50, barHeight, tColor);
            
            // Display numbers
            System.setTextColor(tColor, C_BG);
            // Quick hack to clear previous text by overwriting with spaces or drawing a black box
            System.fillRect(10, 280, 220, 30, C_BG); 
            System.drawString("Core: " + Math.floor(temp) + " C", 20, 280, 4);
            
            System.setTextColor(C_TEXT, C_BG);
            System.fillRect(160, 120, 70, 40, C_BG);
            System.drawString("MAX", 170, 120, 2);
            System.setTextColor(C_RED, C_BG);
            System.drawString(Math.floor(maxTemp) + " C", 170, 140, 2);
            
            lastUpdate = now;
        }
        
        var t = System.getTouch();
        if (t.touched) {
            // Give them a way out if they tap the top right X (handled by Kernel)
            // Or if they tap anywhere on the screen
        }
        
        System.delay(20);
    }
}
