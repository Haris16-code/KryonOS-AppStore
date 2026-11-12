// KryonOS Notepad App
// Multi-resolution text editor with custom saving to FS

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var content = "";
    var STATE_EDIT = 0;
    var STATE_SAVE_DRIVE = 1;

    var state = STATE_EDIT;
    var lastTouch = false;

    var C_PAPER = 0xFFFF;
    var C_TEXT = 0x0000;
    var C_HEADER = 0xF800;
    var C_BTN_SAVE = 0x07E0;
    var C_BTN_CLR = 0xFA20;

    var charsPerLine = Math.max(20, Math.floor((SW - 20) / 8));

    var driveBtnW = Math.min(180, SW - 60);
    var driveBtnH = 44;
    var driveBtnX = Math.floor((SW - driveBtnW) / 2);
    var flashBtnY = Math.floor(SH * 0.30);
    var sdBtnY = flashBtnY + driveBtnH + 12;
    var cancelBtnW = 90;
    var cancelBtnH = 34;
    var cancelBtnX = Math.floor((SW - cancelBtnW) / 2);
    var cancelBtnY = Math.min(SH - cancelBtnH - 12, sdBtnY + driveBtnH + 14);

    function drawEdit() {
        System.fillScreen(C_PAPER);

        System.fillRoundRect(0, 0, SW, 40, 0, C_HEADER);
        System.setTextColor(0xFFFF, C_HEADER);
        System.drawString("Notepad", Math.floor((SW - 96) / 2), 10, 4);

        System.fillRoundRect(5, 5, 60, 30, 4, C_BTN_CLR);
        System.setTextColor(0x0000, C_BTN_CLR);
        System.drawString("CLEAR", 15, 12, 2);

        System.fillRoundRect(SW - 65, 5, 60, 30, 4, C_BTN_SAVE);
        System.setTextColor(0x0000, C_BTN_SAVE);
        System.drawString("SAVE", SW - 52, 12, 2);

        System.setTextColor(C_TEXT, C_PAPER);

        if (content.length === 0) {
            System.setTextColor(0xC618, C_PAPER);
            System.drawString("Tap anywhere on the paper", 10, 50, 2);
            System.drawString("to start typing...", 10, 70, 2);
        } else {
            var disp = content;
            if (disp.length > 500) disp = disp.substring(0, 500) + "...";

            var y = 50;
            for (var i = 0; i < disp.length; i += charsPerLine) {
                System.drawString(disp.substring(i, i + charsPerLine), 10, y, 2);
                y += 20;
                if (y > SH - 20) break;
            }
        }
    }

    function drawSaveDrive() {
        System.fillScreen(0x0000);
        System.setTextColor(0xFFFF, 0x0000);
        System.drawString("Select Save Drive", Math.floor((SW - 180) / 2), Math.floor(SH * 0.12), 4);

        System.fillRoundRect(driveBtnX, flashBtnY, driveBtnW, driveBtnH, 8, 0x01CF);
        System.setTextColor(0xFFFF, 0x01CF);
        System.drawString("Internal Flash (/local)", driveBtnX + 12, flashBtnY + 14, 2);

        System.fillRoundRect(driveBtnX, sdBtnY, driveBtnW, driveBtnH, 8, 0x18E3);
        System.setTextColor(0xFFFF, 0x18E3);
        System.drawString("SD Card (/sd)", driveBtnX + 36, sdBtnY + 14, 2);

        System.fillRoundRect(cancelBtnX, cancelBtnY, cancelBtnW, cancelBtnH, 4, C_HEADER);
        System.setTextColor(0xFFFF, C_HEADER);
        System.drawString("CANCEL", cancelBtnX + 18, cancelBtnY + 9, 2);
    }

    drawEdit();

    while (true) {
        var t = System.getTouch();
        var isTapped = t.touched && !lastTouch;

        if (isTapped) {
            if (state === STATE_EDIT) {
                if (t.y <= 40) {
                    if (t.x <= 70) {
                        content = "";
                        drawEdit();
                    } else if (t.x >= SW - 70) {
                        if (content.length > 0) {
                            state = STATE_SAVE_DRIVE;
                            drawSaveDrive();
                        } else {
                            System.prompt("Notice", "Write something first!");
                            drawEdit();
                        }
                    }
                } else {
                    var added = System.prompt("Enter text to add to document:", "");
                    if (added && added.length > 0) {
                        if (content.length > 0) content += " ";
                        content += added;
                    }
                    drawEdit();
                }
            } else if (state === STATE_SAVE_DRIVE) {
                var selectedDrive = "";

                if (t.x >= driveBtnX && t.x <= driveBtnX + driveBtnW) {
                    if (t.y >= flashBtnY && t.y <= flashBtnY + driveBtnH) {
                        selectedDrive = "/local";
                    } else if (t.y >= sdBtnY && t.y <= sdBtnY + driveBtnH) {
                        selectedDrive = "/sd";
                    }
                }

                if (t.y >= cancelBtnY && t.y <= cancelBtnY + cancelBtnH &&
                    t.x >= cancelBtnX && t.x <= cancelBtnX + cancelBtnW) {
                    state = STATE_EDIT;
                    drawEdit();
                } else if (selectedDrive !== "") {
                    var folder = System.prompt("Folder path? (e.g. /docs) or leave empty", "/docs");
                    var fName = System.prompt("Enter filename (e.g. note.txt)", "note.txt");

                    if (fName && fName.length > 0) {
                        var fullPath = selectedDrive;
                        if (folder && folder.length > 0) {
                            if (folder.charAt(0) !== "/") fullPath += "/";
                            fullPath += folder;
                        }
                        if (fullPath.charAt(fullPath.length - 1) !== "/") fullPath += "/";
                        fullPath += fName;

                        var folderPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
                        if (!FS.exists(folderPath)) {
                            FS.mkdir(folderPath);
                        }

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
})();