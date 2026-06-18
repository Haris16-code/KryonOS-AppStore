// HarixOS Hardware LED Controller
// Demonstrates direct GPIO hardware control from JavaScript

var SW = System.screenWidth();
var SH = System.screenHeight();

// Standard ESP32 onboard blue LED is usually on GPIO 2
var LED_PIN = 2; 

// Initialize the physical hardware pin as an OUTPUT
System.gpio.pinMode(LED_PIN, System.gpio.OUTPUT);

var ledState = false;
var lastTouch = false;

function applyState() {
    if (ledState) {
        System.gpio.digitalWrite(LED_PIN, System.gpio.HIGH); // 3.3v Output
    } else {
        System.gpio.digitalWrite(LED_PIN, System.gpio.LOW);  // 0v Output
    }
}

function drawUI() {
    System.fillScreen(0x0000); // Deep Black
    
    // Header
    System.setTextColor(0x07FF, 0x0000); // Cyan
    System.drawString("HARDWARE CONTROL", 10, 20, 4);
    System.setTextColor(0xFFFF, 0x0000);
    System.drawString("GPIO Pin 2 (Onboard LED)", 20, 50, 2);
    
    // Main Power Button
    var btnColor = ledState ? 0x07E0 : 0xF800; // Green if ON, Red if OFF
    System.fillRoundRect(40, 100, 160, 120, 15, btnColor);
    System.drawRoundRect(40, 100, 160, 120, 15, 0xFFFF); // White border
    
    // Button Text
    System.setTextColor(0xFFFF, btnColor);
    var text = ledState ? "POWER OFF" : "POWER ON";
    System.drawString(text, 60, 145, 4);
    
    // Instruction Footer
    System.setTextColor(0x7BEF, 0x0000);
    System.drawString("Tap the big button to physically", 15, 260, 2);
    System.drawString("toggle the blue LED on your ESP32!", 15, 280, 2);
}

// Set initial state to OFF
applyState();
drawUI();

while (true) {
    var t = System.getTouch();
    var isTapped = t.touched && !lastTouch;
    
    if (isTapped) {
        // Did they tap inside the Power Button box?
        if (t.x >= 40 && t.x <= 200 && t.y >= 100 && t.y <= 220) {
            
            // Toggle the state
            ledState = !ledState;
            
            // Send the electrical signal to the physical pin!
            applyState();
            
            // Visual click feedback (flash the button border yellow)
            System.drawRoundRect(40, 100, 160, 120, 15, 0xFFE0);
            System.delay(60);
            
            // Redraw the UI with the new color
            drawUI();
        }
    }
    
    lastTouch = t.touched;
    
    // Required system yield for Garbage Collection & touch polling
    System.delay(20); 
}
