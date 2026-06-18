// Graphic Demo
// Draws random rectangles and colors

System.fillScreen(0x0000); // TFT_BLACK

// Draw random rectangles
for (var i = 0; i < 50; i++) {
    var x = Math.random() * 200;
    var y = Math.random() * 250;
    var w = 10 + Math.random() * 50;
    var h = 10 + Math.random() * 50;
    
    // Generate a random 16-bit RGB565 color
    var color = Math.floor(Math.random() * 65535);
    
    System.fillRect(x, y, w, h, color);
}

System.drawString("Graphics Demo Finished!", 10, 300);
