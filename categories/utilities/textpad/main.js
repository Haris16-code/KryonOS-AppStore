// ============================================================================
// TextPad — Text File Reader & Editor for KryonOS
// Compatible with Real ESP32 & Kryon Web Emulator
// ============================================================================

var SCREEN_W = System.screenWidth() || 240;
var SCREEN_H = System.screenHeight() || 320;

// Application Modes
var MODE_BROWSER = 0;
var MODE_VIEWER  = 1;
var MODE_EDITOR  = 2;

var currentMode = MODE_BROWSER;
var isRunning = true;

// Storage
var NOTES_DIR = "notes/";
var fileList = [];
var currentFilePath = "";
var currentFileName = "";
var fileLines = [];
var scrollOffset = 0;
var isDirty = false;

// 16-Bit RGB565 Palette
var C_BG     = 0x0000; // Deep Black
var C_PANEL  = 0x18E3; // Dark Slate Navy
var C_BORDER = 0x39E7; // Subtle Grey Border
var C_ACCENT = 0x03D9; // 16-bit Royal Blue
var C_WHITE  = 0xFFFF;
var C_MUTED  = 0x8410; // Slate Grey
var C_YELLOW = 0xFFE0;
var C_GREEN  = 0x07E0;
var C_RED    = 0xF800;
var C_CYAN   = 0x07FF;

// ------------------------------------------------------------------------
// File System Operations
// ------------------------------------------------------------------------
function initApp() {
    if (!FS.exists(NOTES_DIR)) {
        FS.mkdir(NOTES_DIR);
    }

    // Create a starter welcome note if notes folder is empty
    var samplePath = NOTES_DIR + "welcome.txt";
    if (!FS.exists(samplePath)) {
        var welcomeContent = "Welcome to TextPad on KryonOS!\n" +
                             "-----------------------------\n" +
                             "Features:\n" +
                             "1. Read text files smoothly.\n" +
                             "2. Tap 'Edit' to edit lines.\n" +
                             "3. Tap any line to modify it.\n" +
                             "4. Tap '+ Line' to append text.\n" +
                             "5. Tap 'Save' to commit changes.\n" +
                             "\n" +
                             "Enjoy writing on your device!";
        FS.writeTextFile(samplePath, welcomeContent);
    }

    scanFiles();
}

function scanFiles() {
    fileList = [];
    var files = FS.listDir(NOTES_DIR);
    if (files && files.length) {
        for (var i = 0; i < files.length; i++) {
            var fullPath = String(files[i]);
            var lastSlash = fullPath.lastIndexOf("/");
            var fName = (lastSlash >= 0) ? fullPath.substring(lastSlash + 1) : fullPath;
            if (fName.length > 0 && fName.indexOf(".") !== -1) {
                fileList.push(fName);
            }
        }
    }
}

function openFile(fileName) {
    currentFileName = fileName;
    currentFilePath = NOTES_DIR + fileName;
    var content = FS.readTextFile(currentFilePath) || "";
    
    // Normalize newlines and split into line array
    var rawLines = content.replace(/\r/g, "").split("\n");
    fileLines = [];
    for (var i = 0; i < rawLines.length; i++) {
        fileLines.push(rawLines[i]);
    }
    if (fileLines.length === 0) fileLines.push("");

    scrollOffset = 0;
    isDirty = false;
    currentMode = MODE_VIEWER;
    render();
}

function saveCurrentFile() {
    if (!currentFilePath) {
        var newName = System.prompt("Filename (e.g. memo.txt):", "memo.txt");
        if (!newName || newName.trim().length === 0) return;
        newName = newName.trim();
        if (newName.indexOf(".") === -1) newName += ".txt";
        currentFileName = newName;
        currentFilePath = NOTES_DIR + newName;
    }

    var fullText = fileLines.join("\n");
    var ok = FS.writeTextFile(currentFilePath, fullText);
    if (ok) {
        isDirty = false;
        scanFiles();
        if (System.notify) {
            System.notify("Saved", currentFileName, "success", 2000);
        }
    } else {
        if (System.notify) {
            System.notify("Error", "Could not save file!", "error", 2500);
        }
    }
}

function createNewFile() {
    var newName = System.prompt("New Filename:", "note.txt");
    if (!newName || newName.trim().length === 0) return;
    newName = newName.trim();
    if (newName.indexOf(".") === -1) newName += ".txt";

    currentFileName = newName;
    currentFilePath = NOTES_DIR + newName;
    fileLines = [""];
    scrollOffset = 0;
    isDirty = true;
    currentMode = MODE_EDITOR;
    render();
}

function deleteCurrentFile(fileName) {
    var target = NOTES_DIR + fileName;
    if (FS.exists(target)) {
        FS.deleteFile(target);
        scanFiles();
        if (System.notify) {
            System.notify("Deleted", fileName, "warning", 2000);
        }
    }
}

// ------------------------------------------------------------------------
// UI Drawing Routines
// ------------------------------------------------------------------------
function drawTopBar() {
    System.fillRect(0, 0, SCREEN_W, 32, C_PANEL);
    System.drawLine(0, 32, SCREEN_W, 32, C_BORDER);

    System.setTextColor(C_WHITE, C_PANEL);
    System.drawString("TextPad", 14, 8, 2);

    // Mode Tag
    System.setTextColor(C_CYAN, C_PANEL);
    var modeTag = "[Files]";
    if (currentMode === MODE_VIEWER) modeTag = "[Read]";
    if (currentMode === MODE_EDITOR) modeTag = isDirty ? "[Edit*]" : "[Edit]";
    System.drawString(modeTag, 90, 8, 2);

    // Exit Button [X]
    System.fillRect(SCREEN_W - 35, 3, 30, 26, C_RED);
    System.setTextColor(C_WHITE, C_RED);
    System.drawString("X", SCREEN_W - 25, 8, 2);
}

// ------------------------------------------------------------------------
// 1. FILE BROWSER SCREEN
// ------------------------------------------------------------------------
function drawBrowserScreen() {
    System.fillRect(0, 33, SCREEN_W, SCREEN_H - 33, C_BG);

    // Action Header
    System.fillRoundRect(12, 38, 100, 28, 4, C_ACCENT);
    System.setTextColor(C_WHITE, C_ACCENT);
    System.drawString("+ New File", 25, 44, 2);

    System.fillRoundRect(125, 38, 100, 28, 4, C_PANEL);
    System.drawRoundRect(125, 38, 100, 28, 4, C_BORDER);
    System.setTextColor(C_WHITE, C_PANEL);
    System.drawString("Refresh", 148, 44, 2);

    // List Container
    var startY = 74;
    var itemH = 38;
    var maxVis = 5;

    if (fileList.length === 0) {
        System.setTextColor(C_MUTED, C_BG);
        System.drawString("No files in notes/", 20, 140, 2);
        System.drawString("Tap '+ New File' to create one.", 20, 165, 1);
        return;
    }

    for (var i = 0; i < maxVis; i++) {
        var idx = scrollOffset + i;
        if (idx >= fileList.length) break;

        var fName = fileList[idx];
        var curY = startY + (i * itemH);

        System.fillRoundRect(12, curY, SCREEN_W - 24, itemH - 4, 4, C_PANEL);
        System.drawRoundRect(12, curY, SCREEN_W - 24, itemH - 4, 4, C_BORDER);

        // Document Icon & Name
        System.setTextColor(C_YELLOW, C_PANEL);
        System.drawString("#", 18, curY + 9, 2);

        System.setTextColor(C_WHITE, C_PANEL);
        var dispName = fName;
        if (dispName.length > 16) dispName = dispName.substring(0, 14) + "..";
        System.drawString(dispName, 32, curY + 9, 2);

        // Delete Button
        System.fillRoundRect(SCREEN_W - 55, curY + 5, 38, 24, 3, C_RED);
        System.setTextColor(C_WHITE, C_RED);
        System.drawString("Del", SCREEN_W - 46, curY + 9, 1);
    }

    // Scroll Footer
    if (fileList.length > maxVis) {
        System.fillRoundRect(12, 276, 100, 30, 4, (scrollOffset > 0) ? C_ACCENT : C_PANEL);
        System.setTextColor(C_WHITE, (scrollOffset > 0) ? C_ACCENT : C_PANEL);
        System.drawString("< UP", 42, 283, 2);

        var canDown = (scrollOffset + maxVis < fileList.length);
        System.fillRoundRect(SCREEN_W - 112, 276, 100, 30, 4, canDown ? C_ACCENT : C_PANEL);
        System.setTextColor(C_WHITE, canDown ? C_ACCENT : C_PANEL);
        System.drawString("DN >", SCREEN_W - 75, 283, 2);
    }
}

// ------------------------------------------------------------------------
// 2. TEXT VIEWER SCREEN (Reader Mode)
// ------------------------------------------------------------------------
function drawViewerScreen() {
    System.fillRect(0, 33, SCREEN_W, SCREEN_H - 33, C_BG);

    // Subheader Actions
    System.fillRoundRect(12, 38, 70, 26, 4, C_PANEL);
    System.drawRoundRect(12, 38, 70, 26, 4, C_BORDER);
    System.setTextColor(C_WHITE, C_PANEL);
    System.drawString("< Files", 24, 43, 2);

    System.fillRoundRect(88, 38, 70, 26, 4, C_ACCENT);
    System.setTextColor(C_WHITE, C_ACCENT);
    System.drawString("Edit", 108, 43, 2);

    System.setTextColor(C_MUTED, C_BG);
    var titleDisplay = currentFileName;
    if (titleDisplay.length > 10) titleDisplay = titleDisplay.substring(0, 8) + "..";
    System.drawString(titleDisplay, 168, 44, 1);

    // Text Display Area
    var startY = 72;
    var lineH = 17;
    var maxVisLines = 11; // 11 lines visible comfortably

    System.fillRoundRect(8, startY, SCREEN_W - 16, 196, 4, C_PANEL);
    System.drawRoundRect(8, startY, SCREEN_W - 16, 196, 4, C_BORDER);

    for (var i = 0; i < maxVisLines; i++) {
        var lineIdx = scrollOffset + i;
        if (lineIdx >= fileLines.length) break;

        var curY = startY + 6 + (i * lineH);

        // Line number
        System.setTextColor(C_YELLOW, C_PANEL);
        var numStr = String(lineIdx + 1);
        if (numStr.length === 1) numStr = " " + numStr;
        System.drawString(numStr, 12, curY, 1);

        // Line text
        System.setTextColor(C_WHITE, C_PANEL);
        var text = fileLines[lineIdx];
        if (text.length > 32) text = text.substring(0, 30) + "..";
        System.drawString(text, 36, curY, 1);
    }

    // Scroll Control
    System.fillRoundRect(12, 276, 100, 30, 4, (scrollOffset > 0) ? C_ACCENT : C_PANEL);
    System.setTextColor(C_WHITE, (scrollOffset > 0) ? C_ACCENT : C_PANEL);
    System.drawString("< UP", 42, 283, 2);

    var canDown = (scrollOffset + maxVisLines < fileLines.length);
    System.fillRoundRect(SCREEN_W - 112, 276, 100, 30, 4, canDown ? C_ACCENT : C_PANEL);
    System.setTextColor(C_WHITE, canDown ? C_ACCENT : C_PANEL);
    System.drawString("DN >", SCREEN_W - 75, 283, 2);
}

// ------------------------------------------------------------------------
// 3. TEXT EDITOR SCREEN (Line-By-Line Editor)
// ------------------------------------------------------------------------
function drawEditorScreen() {
    System.fillRect(0, 33, SCREEN_W, SCREEN_H - 33, C_BG);

    // Subheader Actions: [ < View ] [ + Line ] [ Save ]
    System.fillRoundRect(12, 38, 65, 26, 4, C_PANEL);
    System.drawRoundRect(12, 38, 65, 26, 4, C_BORDER);
    System.setTextColor(C_WHITE, C_PANEL);
    System.drawString("< View", 22, 43, 2);

    System.fillRoundRect(82, 38, 70, 26, 4, C_ACCENT);
    System.setTextColor(C_WHITE, C_ACCENT);
    System.drawString("+ Line", 94, 43, 2);

    System.fillRoundRect(157, 38, 70, 26, 4, C_GREEN);
    System.setTextColor(C_BG, C_GREEN);
    System.drawString("Save", 175, 43, 2);

    // Editable Lines List
    var startY = 72;
    var boxH = 38;
    var maxVis = 5;

    for (var i = 0; i < maxVis; i++) {
        var idx = scrollOffset + i;
        var curY = startY + (i * boxH);

        if (idx < fileLines.length) {
            System.fillRoundRect(8, curY, SCREEN_W - 16, boxH - 4, 3, C_PANEL);
            System.drawRoundRect(8, curY, SCREEN_W - 16, boxH - 4, 3, C_BORDER);

            // Line number
            System.setTextColor(C_YELLOW, C_PANEL);
            System.drawString(String(idx + 1) + ":", 14, curY + 10, 2);

            // Line text preview
            System.setTextColor(C_WHITE, C_PANEL);
            var lText = fileLines[idx] || "(empty line)";
            if (lText.length > 22) lText = lText.substring(0, 20) + "..";
            System.drawString(lText, 44, curY + 10, 2);
        }
    }

    // Scroll Control
    System.fillRoundRect(12, 276, 100, 30, 4, (scrollOffset > 0) ? C_ACCENT : C_PANEL);
    System.setTextColor(C_WHITE, (scrollOffset > 0) ? C_ACCENT : C_PANEL);
    System.drawString("< UP", 42, 283, 2);

    var canDown = (scrollOffset + maxVis < fileLines.length);
    System.fillRoundRect(SCREEN_W - 112, 276, 100, 30, 4, canDown ? C_ACCENT : C_PANEL);
    System.setTextColor(C_WHITE, canDown ? C_ACCENT : C_PANEL);
    System.drawString("DN >", SCREEN_W - 75, 283, 2);
}

function render() {
    drawTopBar();
    if (currentMode === MODE_BROWSER) drawBrowserScreen();
    else if (currentMode === MODE_VIEWER) drawViewerScreen();
    else if (currentMode === MODE_EDITOR) drawEditorScreen();
}

// ------------------------------------------------------------------------
// Touch Event Router
// ------------------------------------------------------------------------
function handleTouch(x, y) {
    // 1. Exit Button [X]
    if (x >= SCREEN_W - 40 && y <= 32) {
        isRunning = false;
        return;
    }

    // 2. Browser Mode Touches
    if (currentMode === MODE_BROWSER) {
        // '+ New File' (12..112, 38..66)
        if (x >= 12 && x <= 112 && y >= 38 && y <= 66) {
            createNewFile();
            return;
        }

        // 'Refresh' (125..225, 38..66)
        if (x >= 125 && x <= 225 && y >= 38 && y <= 66) {
            scanFiles();
            render();
            return;
        }

        // Scroll UP
        if (fileList.length > 5 && x >= 12 && x <= 112 && y >= 276 && y <= 310) {
            if (scrollOffset > 0) {
                scrollOffset = Math.max(0, scrollOffset - 5);
                render();
            }
            return;
        }

        // Scroll DOWN
        if (fileList.length > 5 && x >= SCREEN_W - 112 && x <= SCREEN_W - 12 && y >= 276 && y <= 310) {
            if (scrollOffset + 5 < fileList.length) {
                scrollOffset = scrollOffset + 5;
                render();
            }
            return;
        }

        // File Item Tap
        var startY = 74;
        var itemH = 38;
        if (y >= startY && y <= startY + (5 * itemH)) {
            var relIdx = Math.floor((y - startY) / itemH);
            var fileIdx = scrollOffset + relIdx;
            if (fileIdx < fileList.length) {
                // Check if 'Del' button tapped (right side)
                if (x >= SCREEN_W - 60 && x <= SCREEN_W - 12) {
                    deleteCurrentFile(fileList[fileIdx]);
                    render();
                    return;
                }
                // Open file
                openFile(fileList[fileIdx]);
                return;
            }
        }
    }

    // 3. Viewer Mode Touches
    if (currentMode === MODE_VIEWER) {
        // '< Files' (Back to browser)
        if (x >= 12 && x <= 82 && y >= 38 && y <= 66) {
            currentMode = MODE_BROWSER;
            scrollOffset = 0;
            render();
            return;
        }

        // 'Edit' Button
        if (x >= 88 && x <= 158 && y >= 38 && y <= 66) {
            currentMode = MODE_EDITOR;
            scrollOffset = 0;
            render();
            return;
        }

        // Scroll UP
        if (x >= 12 && x <= 112 && y >= 276 && y <= 310) {
            if (scrollOffset > 0) {
                scrollOffset = Math.max(0, scrollOffset - 11);
                render();
            }
            return;
        }

        // Scroll DOWN
        if (x >= SCREEN_W - 112 && x <= SCREEN_W - 12 && y >= 276 && y <= 310) {
            if (scrollOffset + 11 < fileLines.length) {
                scrollOffset = scrollOffset + 11;
                render();
            }
            return;
        }
    }

    // 4. Editor Mode Touches
    if (currentMode === MODE_EDITOR) {
        // '< View' (Return to reading)
        if (x >= 12 && x <= 77 && y >= 38 && y <= 66) {
            currentMode = MODE_VIEWER;
            scrollOffset = 0;
            render();
            return;
        }

        // '+ Line' (Append new line)
        if (x >= 82 && x <= 152 && y >= 38 && y <= 66) {
            var newText = System.prompt("New Line Text:", "");
            if (typeof newText === "string") {
                fileLines.push(newText);
                isDirty = true;
                // Auto scroll to bottom
                if (fileLines.length > 5) {
                    scrollOffset = fileLines.length - 5;
                }
                render();
            }
            return;
        }

        // 'Save' Button
        if (x >= 157 && x <= 227 && y >= 38 && y <= 66) {
            saveCurrentFile();
            render();
            return;
        }

        // Tap a line to edit it
        var eStartY = 72;
        var eBoxH = 38;
        if (y >= eStartY && y <= eStartY + (5 * eBoxH)) {
            var eRelIdx = Math.floor((y - eStartY) / eBoxH);
            var targetIdx = scrollOffset + eRelIdx;
            if (targetIdx < fileLines.length) {
                var edited = System.prompt("Edit Line " + (targetIdx + 1) + ":", fileLines[targetIdx]);
                if (typeof edited === "string") {
                    fileLines[targetIdx] = edited;
                    isDirty = true;
                    render();
                }
                return;
            }
        }

        // Scroll UP
        if (x >= 12 && x <= 112 && y >= 276 && y <= 310) {
            if (scrollOffset > 0) {
                scrollOffset = Math.max(0, scrollOffset - 5);
                render();
            }
            return;
        }

        // Scroll DOWN
        if (x >= SCREEN_W - 112 && x <= SCREEN_W - 12 && y >= 276 && y <= 310) {
            if (scrollOffset + 5 < fileLines.length) {
                scrollOffset = scrollOffset + 5;
                render();
            }
            return;
        }
    }
}

// ------------------------------------------------------------------------
// Main Execution Loop
// ------------------------------------------------------------------------
initApp();
render();

var wasTouched = false;
while (isRunning) {
    var t = System.getTouch();
    if (t && t.touched) {
        if (!wasTouched) {
            wasTouched = true;
            handleTouch(t.x, t.y);
        }
    } else {
        wasTouched = false;
    }

    System.delay(20);
}

System.fillScreen(C_BG);
