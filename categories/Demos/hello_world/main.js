// Hello World Test App
// Clears the screen to blue, then writes white text

System.fillScreen(0x001F); // TFT_BLUE

System.drawString("Hello from HarixOS JS!", 20, 50);
System.drawString("JavaScript is working!", 20, 80);
System.drawString("This is running natively", 20, 110);
System.drawString("on your ESP32!", 20, 140);
