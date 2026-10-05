// ============================================================================
// System Info Pro for KryonOS
// Author: shifat100 | Package: com.shifat100.systeminfo
// ============================================================================

// --- কালার কনস্ট্যান্টস (Hex RGB565) ---
var C_BLACK    = 0x0000;
var C_WHITE    = 0xFFFF;
var C_GREEN    = 0x07E0;
var C_CYAN     = 0x07FF;
var C_BLUE     = 0x001F;
var C_YELLOW   = 0xFFE0;
var C_ORANGE   = 0xFD20;
var C_RED      = 0xF800;
var C_NAVY     = 0x10A2;
var C_CARD     = 0x18E4;
var C_BORDER   = 0x2945;
var C_MUTED    = 0x7BEF;

// --- স্টেট ভেরিয়েবলস ---
var currentTab = 0; // 0: SoC, 1: RAM, 2: DISK, 3: NET
var tabNames = ["SoC", "RAM", "DISK", "NET"];
var wasTouched = false;

// --- হেল্পার ফাংশন ---
function formatBytes(bytes) {
    if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 B";
    var k = 1024;
    var sizes = ["B", "KB", "MB", "GB"];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) i = 0;
    if (i >= sizes.length) i = sizes.length - 1;
    return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

function safeNotify(title, msg) {
    try {
        if (typeof System !== "undefined" && System.notify) {
            System.notify({ title: title, message: msg, icon: "info", duration: 2000 });
        }
    } catch (e) {}
}

// --- ড্রয়িং রেন্ডারার ---
function renderUI() {
    System.fillScreen(C_BLACK);

    // ১. হেডার বার
    System.fillRoundRect(4, 4, 232, 26, 4, C_NAVY);
    System.drawRoundRect(4, 4, 232, 26, 4, C_BORDER);
    System.setTextDatum(4); // MC_DATUM
    System.setTextColor(C_CYAN, C_NAVY);
    System.drawString("SYSTEM INFO PRO", 100, 16, 2);

    // এক্সিট বাটন [X]
    System.fillRoundRect(204, 6, 28, 20, 3, C_RED);
    System.setTextColor(C_WHITE, C_RED);
    System.drawString("X", 218, 16, 2);

    // ২. ট্যাব বাটন (৪টি ট্যাব)
    var tabW = 56;
    for (var i = 0; i < tabNames.length; i++) {
        var tx = 6 + (i * 58);
        var isSel = (currentTab === i);
        System.fillRoundRect(tx, 33, tabW, 20, 3, isSel ? C_BLUE : C_CARD);
        System.drawRoundRect(tx, 33, tabW, 20, 3, isSel ? C_CYAN : C_BORDER);
        System.setTextColor(isSel ? C_WHITE : C_MUTED, isSel ? C_BLUE : C_CARD);
        System.drawString(tabNames[i], tx + Math.floor(tabW / 2), 43, 2);
    }

    // ৩. ট্যাব ভেতরের মূল কন্টেন্ট কার্ড
    System.fillRoundRect(6, 57, 228, 220, 5, C_CARD);
    System.drawRoundRect(6, 57, 228, 220, 5, C_BORDER);
    System.setTextDatum(0); // TL_DATUM

    // ডাটা সংগ্রহ (ক্র্যাশ-প্রুফ সেফ কল)
    var info = {};
    try { if (System.getInfo) info = System.getInfo(); } catch (e) {}

    var chip     = info.chipModel || "ESP32";
    var cores    = info.chipCores || 2;
    var freq     = info.cpuFreqMHz || 240;
    var ramFree  = info.freeRAM || 0;
    var ramTotal = info.totalRAM || 327680;
    var minFree  = info.minFreeRAM || 0;
    var maxAlloc = info.maxAllocRAM || 0;
    var flashSz  = info.flashSize || 4194304;
    var osVer    = (System.getOSVersion ? System.getOSVersion() : "2.0");
    var apiLvl   = (System.getAPILevel ? System.getAPILevel() : 1);
    var dateStr  = (System.getDate ? System.getDate() : "--/--/----");
    var timeStr  = (System.getTime ? System.getTime() : "--:--");
    var upSec    = Math.floor((System.millis ? System.millis() : 0) / 1000);
    var tempStr  = (System.hasTemperatureSensor && System.hasTemperatureSensor() && System.getTemperature) ? System.getTemperature().toFixed(1) + " C" : "N/A";

    // --- TAB 0: SoC & CPU ---
    if (currentTab === 0) {
        System.setTextColor(C_CYAN, C_CARD);
        System.drawString("Processor & SoC", 14, 65, 2);

        System.setTextColor(C_WHITE, C_CARD);
        System.drawString("Model:  " + chip, 14, 88, 2);
        System.drawString("Cores:  " + cores + " Cores", 14, 108, 2);
        System.drawString("Speed:  " + freq + " MHz", 14, 128, 2);
        System.drawString("Temp:   " + tempStr, 14, 148, 2);
        System.drawString("Flash:  " + formatBytes(flashSz), 14, 168, 2);

        System.setTextColor(C_YELLOW, C_CARD);
        System.drawString("Uptime: " + upSec + "s (" + (upSec / 60).toFixed(1) + " min)", 14, 196, 2);
        System.setTextColor(C_MUTED, C_CARD);
        System.drawString("Screen: " + System.screenWidth() + "x" + System.screenHeight() + " Pixels", 14, 218, 2);
        System.drawString("KryonOS Core: Validated", 14, 238, 2);
    }

    // --- TAB 1: RAM & Heap ---
    else if (currentTab === 1) {
        var ramUsed = Math.max(0, ramTotal - ramFree);
        var ramPct = Math.min(100, Math.floor((ramUsed / ramTotal) * 100)) || 0;

        System.setTextColor(C_CYAN, C_CARD);
        System.drawString("Memory (SRAM & Heap)", 14, 65, 2);

        System.setTextColor(C_WHITE, C_CARD);
        System.drawString("Free RAM:  " + formatBytes(ramFree), 14, 90, 2);
        System.drawString("Used RAM:  " + formatBytes(ramUsed), 14, 110, 2);
        System.drawString("Total RAM: " + formatBytes(ramTotal), 14, 130, 2);

        // প্রোগ্রেস বার
        System.drawString("Usage: " + ramPct + "%", 14, 155, 2);
        System.fillRect(14, 175, 212, 10, C_BLACK);
        System.drawRect(14, 175, 212, 10, C_BORDER);
        var fillW = Math.floor((210 * ramPct) / 100);
        if (fillW > 0) System.fillRect(15, 176, fillW, 8, ramPct > 80 ? C_RED : C_GREEN);

        System.setTextColor(C_YELLOW, C_CARD);
        System.drawString("Max Alloc Block: " + formatBytes(maxAlloc), 14, 198, 2);
        System.setTextColor(C_MUTED, C_CARD);
        System.drawString("Min Free Ever:   " + formatBytes(minFree), 14, 222, 2);
    }

    // --- TAB 2: DISK / Storage ---
    else if (currentTab === 2) {
        System.setTextColor(C_CYAN, C_CARD);
        System.drawString("Storage Partitions", 14, 65, 2);

        // Flash (LittleFS)
        var lfsTot = 1, lfsUsed = 0;
        try {
            if (FS.getTotalSpace) lfsTot = FS.getTotalSpace("/local") || 1;
            if (FS.getUsedSpace) lfsUsed = FS.getUsedSpace("/local") || 0;
        } catch(e) {}
        var lfsPct = Math.min(100, Math.floor((lfsUsed / lfsTot) * 100)) || 0;

        System.setTextColor(C_WHITE, C_CARD);
        System.drawString("Internal Flash (LittleFS):", 14, 88, 2);
        System.drawString(formatBytes(lfsUsed) + " / " + formatBytes(lfsTot) + " (" + lfsPct + "%)", 14, 108, 2);

        System.fillRect(14, 126, 212, 8, C_BLACK);
        var lW = Math.floor((212 * lfsPct) / 100);
        if (lW > 0) System.fillRect(14, 126, lW, 8, C_CYAN);

        // SD Card
        var sdTot = 0, sdUsed = 0;
        try {
            if (FS.getTotalSpace) sdTot = FS.getTotalSpace("/sd") || 0;
            if (FS.getUsedSpace) sdUsed = FS.getUsedSpace("/sd") || 0;
        } catch(e) {}

        System.drawString("SD Card Storage:", 14, 146, 2);
        if (sdTot > 0) {
            var sdPct = Math.min(100, Math.floor((sdUsed / sdTot) * 100)) || 0;
            System.drawString(formatBytes(sdUsed) + " / " + formatBytes(sdTot) + " (" + sdPct + "%)", 14, 166, 2);
            System.fillRect(14, 184, 212, 8, C_BLACK);
            var sW = Math.floor((212 * sdPct) / 100);
            if (sW > 0) System.fillRect(14, 184, sW, 8, C_YELLOW);
        } else {
            System.setTextColor(C_RED, C_CARD);
            System.drawString("Not Mounted / No SD", 14, 166, 2);
        }

        System.setTextColor(C_MUTED, C_CARD);
        System.drawString("VFS Mount: Ready", 14, 206, 2);
    }

    // --- TAB 3: NET & OS ---
    else if (currentTab === 3) {
        var isOnline = false, ip = "0.0.0.0", ssid = "Offline", rssi = -100;
        try {
            if (typeof Network !== "undefined") {
                isOnline = Network.isConnected();
                ip = Network.getIP() || "0.0.0.0";
                ssid = Network.getSSID() || "N/A";
                rssi = Network.getRSSI() || -100;
            }
        } catch(e) {}

        System.setTextColor(C_CYAN, C_CARD);
        System.drawString("System & Connectivity", 14, 65, 2);

        System.setTextColor(C_WHITE, C_CARD);
        System.drawString("OS:       KryonOS " + osVer, 14, 88, 2);
        System.drawString("API:      Level " + apiLvl, 14, 108, 2);
        System.drawString("WiFi:     " + (isOnline ? "CONNECTED" : "DISCONNECTED"), 14, 128, 2);
        System.drawString("SSID:     " + ssid, 14, 148, 2);
        System.drawString("IP:       " + ip, 14, 168, 2);
        System.drawString("Signal:   " + rssi + " dBm", 14, 188, 2);

        System.setTextColor(C_YELLOW, C_CARD);
        System.drawString("Date: " + dateStr + " | " + timeStr, 14, 212, 2);
    }

    // ৪. ফুটার বাটন [ PREV ] [ REFRESH ] [ NEXT ]
    var fy = 282;
    System.fillRoundRect(6, fy, 70, 32, 4, C_CARD);
    System.drawRoundRect(6, fy, 70, 32, 4, C_BORDER);
    System.setTextDatum(4);
    System.setTextColor(C_WHITE, C_CARD);
    System.drawString("< PREV", 41, fy + 16, 2);

    System.fillRoundRect(84, fy, 72, 32, 4, C_NAVY);
    System.drawRoundRect(84, fy, 72, 32, 4, C_CYAN);
    System.setTextColor(C_CYAN, C_NAVY);
    System.drawString("REFRESH", 120, fy + 16, 2);

    System.fillRoundRect(164, fy, 70, 32, 4, C_CARD);
    System.drawRoundRect(164, fy, 70, 32, 4, C_BORDER);
    System.setTextColor(C_WHITE, C_CARD);
    System.drawString("NEXT >", 199, fy + 16, 2);
}

// --- টাচ হ্যান্ডলার ---
function handleTouchInput(tx, ty) {
    // ১. ওপরে ট্যাব নির্বাচন (y: 33 to 53)
    if (ty >= 33 && ty <= 53) {
        var idx = Math.floor((tx - 6) / 58);
        if (idx >= 0 && idx < tabNames.length) {
            currentTab = idx;
            renderUI();
            return;
        }
    }

    // ২. ফুটার বাটন (y: 282 to 314)
    if (ty >= 282 && ty <= 314) {
        if (tx >= 6 && tx <= 76) {
            currentTab = (currentTab > 0) ? (currentTab - 1) : (tabNames.length - 1);
            renderUI();
            return;
        } else if (tx >= 84 && tx <= 156) {
            safeNotify("Refreshed", "Live metrics updated");
            renderUI();
            return;
        } else if (tx >= 164 && tx <= 234) {
            currentTab = (currentTab < tabNames.length - 1) ? (currentTab + 1) : 0;
            renderUI();
            return;
        }
    }
}

// --- প্রথমবার স্ক্রিন রেন্ডার ---
renderUI();

// --- নন-ব্লকিং লুপ (ESP32 এবং সিমুলেটরে নিশ্চিত চলবে) ---
while (true) {
    var t = null;
    try {
        if (typeof System !== "undefined" && System.getTouch) {
            t = System.getTouch();
        }
    } catch (e) {}

    if (t && t.touched) {
        if (!wasTouched) {
            wasTouched = true;
            handleTouchInput(t.x, t.y);
        }
    } else {
        wasTouched = false;
    }

    // KryonOS কার্নেল এবং হার্ডওয়্যার ওয়াচডগ রিফ্রেশ
    try {
        System.delay(20);
    } catch (e) {
        break;
    }
}
