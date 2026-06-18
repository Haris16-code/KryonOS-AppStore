// HarixOS Advanced File Manager
// A professional, full-featured JS file manager using the expanded FS API

var SW = System.screenWidth();
var SH = System.screenHeight();

// Application State
var STATE_LIST = 0;
var STATE_POPUP = 1;
var state = STATE_LIST;

var currentPath = "/local"; 
var files = [];
var scrollIndex = 0;
var maxDisplay = 6;
var lastTouch = false;

var selectedFile = "";
var isDirCache = {}; // Cache to prevent excessive FS calls while drawing

// Colors
var C_BG = 0x0000;
var C_TOP = 0x01cf; // Deep Blue
var C_BOT = 0x18e3; // Lighter Blue
var C_TEXT = 0xFFFF;
var C_ITEM = 0x2124; // Very dark grey
var C_DIR = 0xFD20; // Orange/Yellow for folders
var C_FILE = 0x07FF; // Cyan for files
var C_MODAL = 0x3186; // Grey
var C_BTN = 0xFA20; // Orange buttons
var C_DEL = 0xF800; // Red

function loadFiles() {
    files = FS.listDir(currentPath) || [];
    scrollIndex = 0;
    
    // Pre-cache types so drawing loop is fast
    isDirCache = {};
    for (var i = 0; i < files.length; i++) {
        isDirCache[files[i]] = FS.isDirectory(files[i]);
    }
}

function goUp() {
    if (currentPath === "/local" || currentPath === "/sd" || currentPath === "/local/" || currentPath === "/sd/") return;
    
    // Remove trailing slash if exists
    if (currentPath.lastIndexOf("/") === currentPath.length - 1) {
        currentPath = currentPath.substring(0, currentPath.length - 1);
    }
    
    var lastSlash = currentPath.lastIndexOf("/");
    if (lastSlash >= 0) {
        currentPath = currentPath.substring(0, lastSlash);
    }
    if (currentPath.length === 0) currentPath = "/local";
    
    loadFiles();
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return Math.floor(bytes / 1024) + " KB";
    else return Math.floor(bytes / 1048576) + " MB";
}

function drawListUI() {
    System.fillScreen(C_BG);
    
    // Top Bar
    System.fillRoundRect(0, 0, SW, 40, 0, C_TOP);
    System.setTextColor(C_TEXT, C_TOP);
    
    var dispPath = currentPath;
    if (dispPath.length > 20) dispPath = ".." + dispPath.substring(dispPath.length - 18);
    System.drawString(dispPath, 45, 12, 2);
    
    // UP Button
    System.fillRoundRect(5, 5, 30, 30, 4, 0x52AA);
    System.setTextColor(C_TEXT, 0x52AA);
    System.drawString("UP", 10, 12, 2);
    
    // New Folder Button
    System.fillRoundRect(SW - 40, 5, 35, 30, 4, 0x07E0);
    System.setTextColor(C_BG, 0x07E0);
    System.drawString("+D", SW - 32, 12, 2);
    
    // File List
    var y = 45;
    if (files.length === 0) {
        System.setTextColor(C_TEXT, C_BG);
        System.drawString("Empty Directory", 15, 60, 2);
    } else {
        var end = scrollIndex + maxDisplay;
        if (end > files.length) end = files.length;
        
        for (var i = scrollIndex; i < end; i++) {
            var fullPath = files[i];
            var fName = fullPath;
            var lastSlash = fName.lastIndexOf("/");
            if (lastSlash >= 0) fName = fName.substring(lastSlash + 1);
            
            var isDir = isDirCache[fullPath];
            
            System.fillRoundRect(5, y, SW - 10, 35, 4, C_ITEM);
            
            if (isDir) {
                System.fillRoundRect(10, y + 8, 20, 18, 3, C_DIR);
                System.setTextColor(C_TEXT, C_ITEM);
                System.drawString(fName.substring(0,16), 40, y + 10, 2);
                System.drawString("<DIR>", SW - 50, y + 10, 2);
            } else {
                System.fillRoundRect(10, y + 8, 16, 20, 2, C_FILE);
                System.setTextColor(C_TEXT, C_ITEM);
                System.drawString(fName.substring(0,18), 35, y + 10, 2);
            }
            
            y += 40;
        }
    }
    
    // Bottom Bar
    System.fillRoundRect(0, SH - 40, SW, 40, 0, C_BOT);
    
    // Storage Space
    var driveBase = (currentPath.indexOf("/sd") === 0) ? "/sd" : "/local";
    var free = FS.getFreeSpace(driveBase);
    var total = FS.getTotalSpace(driveBase);
    var usedPct = total > 0 ? Math.floor(((total - free) / total) * 100) : 0;
    
    System.setTextColor(C_TEXT, C_BOT);
    System.drawString(driveBase + ": " + usedPct + "% full", 5, SH - 30, 2);
    
    // Swap Drive
    System.fillRoundRect(SW - 60, SH - 35, 55, 30, 4, C_BTN);
    System.drawString("SWAP", SW - 48, SH - 28, 2);
    
    // Pagination
    if (scrollIndex > 0) {
        System.fillRoundRect(SW - 110, SH - 35, 40, 30, 4, 0x52AA);
        System.drawString("<", SW - 95, SH - 28, 2);
    }
    if (scrollIndex + maxDisplay < files.length) {
        System.fillRoundRect(SW - 160, SH - 35, 40, 30, 4, 0x52AA);
        System.drawString(">", SW - 145, SH - 28, 2);
    }
}

function drawModal() {
    System.fillRoundRect(20, 50, SW - 40, 220, 8, C_MODAL);
    System.drawRoundRect(20, 50, SW - 40, 220, 8, C_TEXT);
    
    var fName = selectedFile;
    var lastSlash = fName.lastIndexOf("/");
    if (lastSlash >= 0) fName = fName.substring(lastSlash + 1);
    
    System.setTextColor(C_TEXT, C_MODAL);
    System.drawString(fName.substring(0, 16), 30, 60, 4);
    
    var size = FS.getFileSize(selectedFile);
    System.drawString("Size: " + formatSize(size), 30, 90, 2);
    
    // Buttons
    System.fillRoundRect(30, 120, 85, 35, 4, C_BTN);
    System.drawString("RENAME", 45, 130, 2);
    
    System.fillRoundRect(125, 120, 85, 35, 4, 0x52AA);
    System.drawString("HASH", 150, 130, 2);
    
    System.fillRoundRect(30, 165, 180, 35, 4, C_DEL);
    System.setTextColor(C_TEXT, C_DEL);
    System.drawString("DELETE PERMANENTLY", 45, 175, 2);
    
    System.fillRoundRect(30, 215, 180, 35, 4, C_BG);
    System.setTextColor(C_TEXT, C_BG);
    System.drawString("CANCEL", 95, 225, 2);
}

loadFiles();
drawListUI();

while (true) {
    var t = System.getTouch();
    var isTapped = t.touched && !lastTouch;
    
    if (isTapped) {
        if (state === STATE_LIST) {
            // UP Button
            if (t.x <= 35 && t.y <= 35) {
                goUp();
                drawListUI();
            }
            // MKDIR Button
            else if (t.x >= SW - 40 && t.y <= 35) {
                var dName = System.prompt("New Folder Name:", "");
                if (dName && dName.length > 0) {
                    FS.mkdir(currentPath + "/" + dName);
                    loadFiles();
                }
                drawListUI();
            }
            // SWAP Button
            else if (t.y >= SH - 40 && t.x >= SW - 65) {
                if (currentPath.indexOf("/local") === 0) {
                    currentPath = "/sd";
                    // Attempt mount silently just in case
                    FS.mountSD();
                } else {
                    currentPath = "/local";
                }
                loadFiles();
                drawListUI();
            }
            // Pagination <
            else if (t.y >= SH - 40 && t.x >= SW - 110 && t.x <= SW - 70 && scrollIndex > 0) {
                scrollIndex -= maxDisplay;
                if (scrollIndex < 0) scrollIndex = 0;
                drawListUI();
            }
            // Pagination >
            else if (t.y >= SH - 40 && t.x >= SW - 160 && t.x <= SW - 120 && scrollIndex + maxDisplay < files.length) {
                scrollIndex += maxDisplay;
                drawListUI();
            }
            // File Click
            else if (t.y >= 45 && t.y <= SH - 40) {
                var y = 45;
                var end = scrollIndex + maxDisplay;
                if (end > files.length) end = files.length;
                for (var i = scrollIndex; i < end; i++) {
                    if (t.y >= y && t.y <= y + 35) {
                        var full = files[i];
                        if (isDirCache[full]) {
                            // Enter directory
                            currentPath = full;
                            loadFiles();
                            drawListUI();
                        } else {
                            // Open File Modal
                            selectedFile = full;
                            state = STATE_POPUP;
                            drawModal();
                        }
                        break;
                    }
                    y += 40;
                }
            }
        } 
        else if (state === STATE_POPUP) {
            // RENAME
            if (t.x >= 30 && t.x <= 115 && t.y >= 120 && t.y <= 155) {
                var newName = System.prompt("New name for file:", "");
                if (newName && newName.length > 0) {
                    var slash = selectedFile.lastIndexOf("/");
                    var newPath = selectedFile.substring(0, slash + 1) + newName;
                    FS.renameFile(selectedFile, newPath);
                    loadFiles();
                }
                state = STATE_LIST;
                drawListUI();
            }
            // HASH
            else if (t.x >= 125 && t.x <= 210 && t.y >= 120 && t.y <= 155) {
                var md5 = FS.getFileMD5(selectedFile);
                System.prompt("MD5 Hash:", md5); // Use prompt to display text
                state = STATE_LIST;
                drawListUI();
            }
            // DELETE
            else if (t.x >= 30 && t.x <= 210 && t.y >= 165 && t.y <= 200) {
                var conf = System.prompt("Type YES to delete", "");
                if (conf === "YES") {
                    FS.deleteFile(selectedFile);
                    loadFiles();
                }
                state = STATE_LIST;
                drawListUI();
            }
            // CANCEL
            else if (t.x >= 30 && t.x <= 210 && t.y >= 215 && t.y <= 250) {
                state = STATE_LIST;
                drawListUI();
            }
        }
    }
    
    lastTouch = t.touched;
    System.delay(20);
}
