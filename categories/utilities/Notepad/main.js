// HarixOS Notepad App
// An interactive text editor with custom saving to FS

var SW = System.screenWidth();
var SH = System.screenHeight();

var content = "";
var STATE_EDIT = 0;
var STATE_SAVE_DRIVE = 1;

var state = STATE_EDIT;
var lastTouch = false;

var saveDrive = "";

// Colors
var C_PAPER = 0xFFFF; // White
var C_TEXT = 0x0000; // Black
var C_HEADER = 0xF800; // Red
var C_BTN_SAVE = 0x07E0; // Green
var C_BTN_CLR = 0xFA20; // Orange

function drawEdit() {
    System.fillScreen(C_PAPER);
    
    // Header Bar
    System.fillRoundRect(0, 0, SW, 40, 0, C_HEADER);
    System.setTextColor(0xFFFF, C_HEADER);
    System.drawString("Notepad", 80, 10, 4);
    
    // CLEAR Button
    System.fillRoundRect(5, 5, 60, 30, 4, C_BTN_CLR);
    System.setTextColor(0x0000, C_BTN_CLR);
    System.drawString("CLEAR", 15, 12, 2);
    
    // SAVE Button
    System.fillRoundRect(SW - 65, 5, 60, 30, 4, C_BTN_SAVE);
    System.setTextColor(0x0000, C_BTN_SAVE);
    System.drawString("SAVE", SW - 52, 12, 2);
    
    // Drawing Content Text
    System.setTextColor(C_TEXT, C_PAPER);
    
    if (content.length === 0) {
        System.setTextColor(0xC618, C_PAPER); // Light grey text
        System.drawString("Tap anywhere on the paper", 10, 50, 2);
        System.drawString("to start typing...", 10, 70, 2);
    } else {
        var disp = content;
        if (disp.length > 500) disp = disp.substring(0, 500) + "..."; // Prevent massive render lag
        
        var y = 50;
        var charsPerLine = 26; 
        
        // Custom simple word-wrap logic
        for (var i = 0; i < disp.length; i += charsPerLine) {
            System.drawString(disp.substring(i, i + charsPerLine), 10, y, 2);
            y += 20;
            if (y > SH - 20) break; // Don't draw offscreen
        }
    }
}

function drawSaveDrive() {
    System.fillScreen(0x0000);
    System.setTextColor(0xFFFF, 0x0000);
    System.drawString("Select Save Drive", 30, 50, 4);
    
    // Internal Flash Button
    System.fillRoundRect(40, 100, 160, 50, 8, 0x01cf);
    System.setTextColor(0xFFFF, 0x01cf);
    System.drawString("Internal Flash", 60, 110, 2);
    System.drawString("(/local)", 90, 130, 2);
    
    // SD Card Button
    System.fillRoundRect(40, 170, 160, 50, 8, 0x18e3);
    System.setTextColor(0xFFFF, 0x18e3);
    System.drawString("SD Card", 90, 180, 2);
    System.drawString("(/sd)", 100, 200, 2);
    
    // Cancel Button
    System.fillRoundRect(80, 240, 80, 35, 4, C_HEADER);
    System.setTextColor(0xFFFF, C_HEADER);
    System.drawString("CANCEL", 95, 250, 2);
}

drawEdit();

while (true) {
    var t = System.getTouch();
    var isTapped = t.touched && !lastTouch;
    
    if (isTapped) {
        if (state === STATE_EDIT) {
            if (t.y <= 40) {
                // Header tapped
                if (t.x <= 70) {
                    // CLEAR
                    content = "";
                    drawEdit();
                } else if (t.x >= SW - 70) {
                    // SAVE
                    if (content.length > 0) {
                        state = STATE_SAVE_DRIVE;
                        drawSaveDrive();
                    } else {
                        System.prompt("Notice", "Write something first!");
                        drawEdit();
                    }
                }
            } else {
                // Paper tapped - start typing
                var added = System.prompt("Enter text to add to document:", "");
                if (added && added.length > 0) {
                    if (content.length > 0) content += " ";
                    content += added;
                }
                drawEdit();
            }
        } 
        else if (state === STATE_SAVE_DRIVE) {
            var selectedDrive = "";
            
            if (t.x >= 40 && t.x <= 200) {
                if (t.y >= 100 && t.y <= 150) {
                    selectedDrive = "/local";
                } else if (t.y >= 170 && t.y <= 220) {
                    selectedDrive = "/sd";
                }
            }
            
            if (t.y >= 240 && t.y <= 275 && t.x >= 80 && t.x <= 160) {
                // Cancel
                state = STATE_EDIT;
                drawEdit();
            } else if (selectedDrive !== "") {
                // Drive Selected! Now ask for folder and filename
                var folder = System.prompt("Folder path? (e.g. /apps or /docs) or leave empty", "/docs");
                var fName = System.prompt("Enter filename (e.g. note.txt)", "note.txt");
                
                if (fName && fName.length > 0) {
                    var fullPath = selectedDrive;
                    
                    if (folder && folder.length > 0) {
                        if (folder.charAt(0) !== '/') fullPath += "/";
                        fullPath += folder;
                    }
                    
                    if (fullPath.charAt(fullPath.length - 1) !== '/') fullPath += "/";
                    fullPath += fName;
                    
                    // Create folder if it doesn't exist
                    var folderPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
                    if (!FS.exists(folderPath)) {
                        FS.mkdir(folderPath);
                    }
                    
                    // Save file
                    var success = FS.writeTextFile(fullPath, content);
                    
                    if (success) {
                        System.prompt("Success", "File saved to " + fullPath);
                    } else {
                        System.prompt("Error", "Failed to save to " + fullPath);
                    }
                }
                
                state = STATE_EDIT;
                drawEdit();
            }
        }
    }
    
    lastTouch = t.touched;
    System.delay(20);
}
