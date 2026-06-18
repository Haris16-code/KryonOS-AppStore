// HarixOS Image Viewer
// Browse and display images from the SD Card

var C_BG = 0x0000;
var C_TEXT = 0xFFFF;
var C_ACCENT = 0x07E0;
var C_SELECT = 0x3186;

var imageFiles = [];
var selectedIndex = 0;
var scrollOffset = 0;
var currentView = 0; // 0 = List, 1 = Image

function scanImages() {
    imageFiles = [];
    var files = FS.listDir("/sd/");
    if (!files || files.length === 0) return;
    
    // Add ALL files without filtering
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        imageFiles.push(f);
    }
}

function drawList() {
    System.fillScreen(C_BG);
    System.setTextColor(C_ACCENT, C_BG);
    System.drawString("IMAGE VIEWER", 10, 10, 4);
    
    if (imageFiles.length === 0) {
        System.setTextColor(0xF800, C_BG);
        System.drawString("No files found", 10, 60, 2);
        System.drawString("on SD Card.", 10, 80, 2);
        return;
    }
    
    var maxItems = 8;
    for (var i = 0; i < maxItems; i++) {
        var listIndex = scrollOffset + i;
        if (listIndex >= imageFiles.length) break;
        
        var y = 45 + (i * 30);
        
        if (listIndex === selectedIndex) {
            System.fillRoundRect(5, y - 5, 230, 25, 4, C_SELECT);
            System.setTextColor(C_TEXT, C_SELECT);
        } else {
            System.setTextColor(C_TEXT, C_BG);
        }
        
        // Extract filename for display (everything after last slash)
        var pathStr = imageFiles[listIndex];
        var lastSlash = pathStr.lastIndexOf("/");
        var dispName = lastSlash >= 0 ? pathStr.substring(lastSlash + 1) : pathStr;
        System.drawString(dispName, 15, y, 2);
    }
    
    // Draw footer buttons
    System.setTextColor(C_TEXT, C_BG);
    System.drawString("UP", 30, 295, 2);
    System.drawString("|", 80, 295, 2);
    System.drawString("VIEW", 105, 295, 2);
    System.drawString("|", 160, 295, 2);
    System.drawString("DN", 190, 295, 2);
}

function drawImage(path) {
    System.fillScreen(C_BG);
    System.setTextColor(C_TEXT, C_BG);
    System.drawString("Loading...", 80, 150, 2);
    
    // Call the newly added native C++ streaming API
    var success = System.drawBMP(path, 0, 0);
    
    if (!success) {
        System.fillScreen(C_BG);
        System.setTextColor(0xF800, C_BG);
        System.drawString("ERROR:", 10, 80, 4);
        System.setTextColor(C_TEXT, C_BG);
        System.drawString("Invalid BMP format.", 10, 130, 2);
        System.drawString("Unsupported or damaged file.", 10, 150, 2);
    }
    
    // Footer back button overlay
    System.fillRoundRect(80, 290, 80, 25, 5, 0xF800); // Red
    System.setTextColor(C_TEXT, 0xF800);
    System.drawString("BACK", 100, 295, 2);
}

// Initial state
scanImages();
drawList();

var lastTouch = false;

while (true) {
    var t = System.getTouch();
    var isTapped = t.touched && !lastTouch;
    
    if (isTapped) {
        if (currentView === 0) {
            // Check footer buttons
            if (t.y >= 280) {
                if (t.x < 80) { // UP
                    if (selectedIndex > 0) {
                        selectedIndex--;
                        if (selectedIndex < scrollOffset) scrollOffset--;
                        drawList();
                    }
                } else if (t.x >= 80 && t.x <= 160) { // VIEW
                    currentView = 1;
                    drawImage(imageFiles[selectedIndex]);
                } else if (t.x > 160) { // DN
                    if (selectedIndex < imageFiles.length - 1) {
                        selectedIndex++;
                        if (selectedIndex >= scrollOffset + 8) scrollOffset++;
                        drawList();
                    }
                }
            } 
            // Direct touch selection
            else if (t.y >= 40 && t.y < 280 && imageFiles.length > 0) {
                var clicked = scrollOffset + Math.floor((t.y - 40) / 30);
                if (clicked < imageFiles.length) {
                    selectedIndex = clicked;
                    currentView = 1;
                    drawImage(imageFiles[selectedIndex]);
                }
            }
        } else if (currentView === 1) {
            // Tap anywhere to go back
            currentView = 0;
            drawList();
        }
    }
    
    lastTouch = t.touched;
    System.delay(20);
}
