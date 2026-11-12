// KryonOS Advanced File Manager
// Multi-resolution file manager using the expanded FS API (API Level 2+)

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var STATE_LIST = 0;
    var STATE_POPUP = 1;
    var state = STATE_LIST;

    var currentPath = "/local";
    var files = [];
    var scrollIndex = 0;
    var ROW_STEP = 40;
    var maxDisplay = Math.max(3, Math.floor((SH - 84) / ROW_STEP));
    var lastTouch = false;

    var selectedFile = "";
    var isDirCache = {};

    var C_BG = 0x0000;
    var C_TOP = 0x01CF;
    var C_BOT = 0x18E3;
    var C_TEXT = 0xFFFF;
    var C_ITEM = 0x2124;
    var C_DIR = 0xFD20;
    var C_FILE = 0x07FF;
    var C_MODAL = 0x3186;
    var C_BTN = 0xFA20;
    var C_DEL = 0xF800;

    // Responsive Modal Geometry
    var modalW = Math.min(240, SW - 28);
    var modalH = Math.min(200, SH - 30);
    var modalX = Math.floor((SW - modalW) / 2);
    var modalY = Math.floor((SH - modalH) / 2);
    var halfBtnW = Math.floor((modalW - 30) / 2);
    var fullBtnW = modalW - 20;
    var mBtn1Y = modalY + 62;
    var mBtn2Y = modalY + 106;
    var mBtn3Y = modalY + 150;

    function loadFiles() {
        files = FS.listDir(currentPath) || [];
        scrollIndex = 0;
        isDirCache = {};
        for (var i = 0; i < files.length; i++) {
            isDirCache[files[i]] = FS.isDirectory(files[i]);
        }
    }

    function goUp() {
        if (currentPath === "/local" || currentPath === "/sd" || currentPath === "/local/" || currentPath === "/sd/") return;
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

        System.fillRoundRect(0, 0, SW, 40, 0, C_TOP);
        System.setTextColor(C_TEXT, C_TOP);

        var dispPath = currentPath;
        if (dispPath.length > 20) dispPath = ".." + dispPath.substring(dispPath.length - 18);
        System.drawString(dispPath, 42, 12, 2);

        System.fillRoundRect(5, 5, 30, 30, 4, 0x52AA);
        System.setTextColor(C_TEXT, 0x52AA);
        System.drawString("UP", 10, 12, 2);

        System.fillRoundRect(SW - 80, 5, 35, 30, 4, 0x07E0);
        System.setTextColor(C_BG, 0x07E0);
        System.drawString("+D", SW - 72, 12, 2);

        var y = 44;
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
                    System.drawString(fName.substring(0, 18), 40, y + 10, 2);
                    System.drawString("<DIR>", SW - 50, y + 10, 2);
                } else {
                    System.fillRoundRect(10, y + 8, 16, 20, 2, C_FILE);
                    System.setTextColor(C_TEXT, C_ITEM);
                    System.drawString(fName.substring(0, 20), 35, y + 10, 2);
                }

                y += ROW_STEP;
            }
        }

        System.fillRoundRect(0, SH - 40, SW, 40, 0, C_BOT);

        var driveBase = (currentPath.indexOf("/sd") === 0) ? "/sd" : "/local";
        var free = FS.getFreeSpace(driveBase);
        var total = FS.getTotalSpace(driveBase);
        var usedPct = total > 0 ? Math.floor(((total - free) / total) * 100) : 0;

        System.setTextColor(C_TEXT, C_BOT);
        System.drawString(driveBase + ": " + usedPct + "%", 5, SH - 28, 2);

        System.fillRoundRect(SW - 60, SH - 35, 55, 30, 4, C_BTN);
        System.drawString("SWAP", SW - 48, SH - 28, 2);

        if (scrollIndex > 0) {
            System.fillRoundRect(SW - 106, SH - 35, 38, 30, 4, 0x52AA);
            System.drawString("<", SW - 92, SH - 28, 2);
        }
        if (scrollIndex + maxDisplay < files.length) {
            System.fillRoundRect(SW - 150, SH - 35, 38, 30, 4, 0x52AA);
            System.drawString(">", SW - 136, SH - 28, 2);
        }
    }

    function drawModal() {
        System.fillRoundRect(modalX, modalY, modalW, modalH, 8, C_MODAL);
        System.drawRoundRect(modalX, modalY, modalW, modalH, 8, C_TEXT);

        var fName = selectedFile;
        var lastSlash = fName.lastIndexOf("/");
        if (lastSlash >= 0) fName = fName.substring(lastSlash + 1);

        System.setTextColor(C_TEXT, C_MODAL);
        System.drawString(fName.substring(0, 16), modalX + 10, modalY + 10, 4);

        var size = FS.getFileSize(selectedFile);
        System.drawString("Size: " + formatSize(size), modalX + 10, modalY + 38, 2);

        System.fillRoundRect(modalX + 10, mBtn1Y, halfBtnW, 34, 4, C_BTN);
        System.drawString("RENAME", modalX + 20, mBtn1Y + 10, 2);

        System.fillRoundRect(modalX + 20 + halfBtnW, mBtn1Y, halfBtnW, 34, 4, 0x52AA);
        System.drawString("HASH", modalX + 36 + halfBtnW, mBtn1Y + 10, 2);

        System.fillRoundRect(modalX + 10, mBtn2Y, fullBtnW, 34, 4, C_DEL);
        System.setTextColor(C_TEXT, C_DEL);
        System.drawString("DELETE FILE", modalX + Math.floor((fullBtnW - 88) / 2) + 10, mBtn2Y + 10, 2);

        System.fillRoundRect(modalX + 10, mBtn3Y, fullBtnW, 34, 4, C_BG);
        System.setTextColor(C_TEXT, C_BG);
        System.drawString("CANCEL", modalX + Math.floor((fullBtnW - 54) / 2) + 10, mBtn3Y + 10, 2);
    }

    loadFiles();
    drawListUI();

    while (true) {
        var t = System.getTouch();
        var isTapped = t.touched && !lastTouch;

        if (isTapped) {
            if (t.x >= SW - 40 && t.y <= 40) {
                break;
            }
            if (state === STATE_LIST) {
                if (t.x <= 35 && t.y <= 35) {
                    goUp();
                    drawListUI();
                } else if (t.x >= SW - 80 && t.x < SW - 40 && t.y <= 35) {
                    var dName = System.prompt("New Folder Name:", "");
                    if (dName && dName.length > 0) {
                        FS.mkdir(currentPath + "/" + dName);
                        loadFiles();
                    }
                    drawListUI();
                } else if (t.y >= SH - 40 && t.x >= SW - 65) {
                    if (currentPath.indexOf("/local") === 0) {
                        if (typeof FS.isSDMounted !== "function" || FS.isSDMounted() || FS.mountSD()) {
                            currentPath = "/sd";
                        }
                    } else {
                        currentPath = "/local";
                    }
                    loadFiles();
                    drawListUI();
                } else if (t.y >= SH - 40 && t.x >= SW - 106 && t.x <= SW - 68 && scrollIndex > 0) {
                    scrollIndex -= maxDisplay;
                    if (scrollIndex < 0) scrollIndex = 0;
                    drawListUI();
                } else if (t.y >= SH - 40 && t.x >= SW - 150 && t.x <= SW - 112 && scrollIndex + maxDisplay < files.length) {
                    scrollIndex += maxDisplay;
                    drawListUI();
                } else if (t.y >= 44 && t.y <= SH - 40) {
                    var y = 44;
                    var end = scrollIndex + maxDisplay;
                    if (end > files.length) end = files.length;
                    for (var i = scrollIndex; i < end; i++) {
                        if (t.y >= y && t.y <= y + 35) {
                            var full = files[i];
                            if (isDirCache[full]) {
                                currentPath = full;
                                loadFiles();
                                drawListUI();
                            } else {
                                selectedFile = full;
                                state = STATE_POPUP;
                                drawModal();
                            }
                            break;
                        }
                        y += ROW_STEP;
                    }
                }
            } else if (state === STATE_POPUP) {
                if (t.y >= mBtn1Y && t.y <= mBtn1Y + 34 && t.x >= modalX + 10 && t.x <= modalX + 10 + halfBtnW) {
                    var newName = System.prompt("New name for file:", "");
                    if (newName && newName.length > 0) {
                        var slash = selectedFile.lastIndexOf("/");
                        var newPath = selectedFile.substring(0, slash + 1) + newName;
                        FS.renameFile(selectedFile, newPath);
                        loadFiles();
                    }
                    state = STATE_LIST;
                    drawListUI();
                } else if (t.y >= mBtn1Y && t.y <= mBtn1Y + 34 && t.x >= modalX + 20 + halfBtnW && t.x <= modalX + 20 + halfBtnW * 2) {
                    var md5 = FS.getFileMD5(selectedFile);
                    System.prompt("MD5 Hash:", md5);
                    state = STATE_LIST;
                    drawListUI();
                } else if (t.y >= mBtn2Y && t.y <= mBtn2Y + 34 && t.x >= modalX + 10 && t.x <= modalX + 10 + fullBtnW) {
                    var conf = System.prompt("Type YES to delete", "");
                    if (conf === "YES") {
                        FS.deleteFile(selectedFile);
                        loadFiles();
                    }
                    state = STATE_LIST;
                    drawListUI();
                } else if (t.y >= mBtn3Y && t.y <= mBtn3Y + 34 && t.x >= modalX + 10 && t.x <= modalX + 10 + fullBtnW) {
                    state = STATE_LIST;
                    drawListUI();
                }
            }
        }

        lastTouch = t.touched;
        System.delay(20);
    }
})();
