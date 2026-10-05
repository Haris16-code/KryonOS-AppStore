// ============================================================================
// OmniDict — Universal Master Dictionary for KryonOS
// Auto-Fetch Online Catalog & Dynamic Pack Installer
// ============================================================================

var SCREEN_W = System.screenWidth() || 240;
var SCREEN_H = System.screenHeight() || 320;

// App Navigation States
var TAB_SEARCH   = 0;
var TAB_LOCAL    = 1;
var TAB_DOWNLOAD = 2;
var STATE_DETAIL = 3;

var currentTab = TAB_SEARCH;
var isRunning = true;

// Master API Catalog URL (Your exact GitHub Raw URL)
var CATALOG_URL = "https://raw.githubusercontent.com/shifat100/KryonOS-Web/refs/heads/main/storage/omnidict/catalog.json";

// Storage Paths
var DICT_DIR = "dicts/";
var ACTIVE_CONF = "active_dict.txt";

// Active Dictionary State
var activeDictId = "default";
var activeDictData = {};

// Search Engine Variables
var searchQuery = "";
var searchResults = [];
var scrollOffset = 0;
var selectedWord = "";
var selectedMeaning = "";
var selectedDesc = "";

// Online Download Manager Variables
var onlinePacks = [];
var catalogLoaded = false;
var isDownloading = false;
var packFilter = "";
var downloadStatusMsg = "";

// Local Installed Packs Cache
var localPacks = [];

// Strict 16-Bit RGB565 Colors
var C_BG     = 0x0000; // Deep Black
var C_PANEL  = 0x18E3; // Dark Slate Navy
var C_BORDER = 0x39E7; // Subtle Border
var C_ACCENT = 0x03D9; // 16-bit #007ACC Blue
var C_WHITE  = 0xFFFF;
var C_MUTED  = 0x8410;
var C_YELLOW = 0xFFE0;
var C_GREEN  = 0x07E0;
var C_RED    = 0xF800;
var C_CYAN   = 0x07FF;

// ------------------------------------------------------------------------
// Dual Network Handler (Emulator Promise + ESP32 Sync Support)
// ------------------------------------------------------------------------
function fetchUrl(url, callback) {
    try {
        var res = Network.get(url);
        if (res && typeof res.then === "function") {
            // Browser Emulator Async Promise
            res.then(function(realRes) {
                callback(realRes);
            })["catch"](function(err) {
                callback({ status: 0, error: String(err) });
            });
        } else {
            // Real ESP32 Synchronous
            callback(res);
        }
    } catch(e) {
        callback({ status: 0, error: String(e) });
    }
}

// ------------------------------------------------------------------------
// Initialization & Storage Operations
// ------------------------------------------------------------------------
function init() {
    if (!FS.exists(DICT_DIR)) {
        FS.mkdir(DICT_DIR);
    }

    // Starter pack (named 'default.json' so it never conflicts with 'en_bn.json')
    var starterPath = DICT_DIR + "default.json";
    if (!FS.exists(starterPath)) {
        var starterData = {
            "apple": "আপেল (ফল)",
            "book": "বই বা পুস্তক",
            "computer": "কম্পিউটার বা গণকযন্ত্র",
            "hello": "নমস্কার বা হ্যালো",
            "kryonos": "একটি শক্তিশালী এমবেডেড ওএস"
        };
        FS.writeTextFile(starterPath, JSON.stringify(starterData));
    }

    // Load active dict ID from storage
    if (FS.exists(ACTIVE_CONF)) {
        var saved = FS.readTextFile(ACTIVE_CONF);
        if (saved && saved.trim().length > 0) {
            activeDictId = saved.trim();
        }
    }

    scanLocalPacks();
    loadActiveDictionary();
}

function scanLocalPacks() {
    localPacks = [];
    var files = FS.listDir(DICT_DIR);
    if (files && files.length) {
        for (var i = 0; i < files.length; i++) {
            var fn = String(files[i]);
            if (fn.indexOf(".json") !== -1) {
                var lastSlash = fn.lastIndexOf("/");
                var cleanName = (lastSlash >= 0) ? fn.substring(lastSlash + 1) : fn;
                var cleanId = cleanName.replace(".json", "");
                if (cleanId.length > 0) {
                    localPacks.push(cleanId);
                }
            }
        }
    }
    if (!activeDictId || localPacks.indexOf(activeDictId) === -1) {
        activeDictId = (localPacks.length > 0) ? localPacks[0] : "default";
    }
}

function loadActiveDictionary() {
    if (!activeDictId) activeDictId = "default";
    var filePath = DICT_DIR + activeDictId + ".json";
    if (FS.exists(filePath)) {
        try {
            var content = FS.readTextFile(filePath);
            activeDictData = JSON.parse(content) || {};
        } catch(e) {
            activeDictData = {};
        }
    } else {
        activeDictData = {};
    }
    performSearch(searchQuery);
}

// ------------------------------------------------------------------------
// Search Engine
// ------------------------------------------------------------------------
function performSearch(query) {
    searchQuery = (query || "").toLowerCase().trim();
    searchResults = [];
    scrollOffset = 0;

    if (!activeDictData || typeof activeDictData !== "object") return;

    for (var k in activeDictData) {
        if (activeDictData.hasOwnProperty(k)) {
            if (searchQuery.length === 0 || k.toLowerCase().indexOf(searchQuery) === 0) {
                var val = activeDictData[k];
                var m = "";
                var d = "";

                if (typeof val === "string") {
                    m = val;
                } else if (val && typeof val === "object") {
                    m = val.meaning || val.m || "";
                    d = val.desc || val.d || "";
                }

                searchResults.push({
                    word: k,
                    meaning: m,
                    desc: d
                });

                if (searchResults.length >= 60) break;
            }
        }
    }
}

// ------------------------------------------------------------------------
// Online Catalog & Download Logic
// ------------------------------------------------------------------------
function fetchOnlineCatalog() {
    if (!Network.isConnected()) {
        Network.showWiFiPrompt();
        downloadStatusMsg = "WiFi not connected!";
        render();
        return;
    }

    downloadStatusMsg = "Loading Catalog from GitHub...";
    render();

    fetchUrl(CATALOG_URL, function(res) {
        var status = (res && typeof res.status !== "undefined") ? res.status : ((res && res.statusCode) || 0);
        var body = (res && res.body) ? res.body : ((res && res.data) || "");

        if (status === 200 && body) {
            try {
                var parsed = JSON.parse(body);
                onlinePacks = parsed.packs || [];
                catalogLoaded = true;
                downloadStatusMsg = "";
            } catch(e) {
                downloadStatusMsg = "Catalog format error!";
            }
        } else {
            downloadStatusMsg = "Catalog fetch failed (HTTP " + status + ")";
        }
        render();
    });
}

function downloadPack(pack) {
    if (!Network.isConnected()) {
        Network.showWiFiPrompt();
        return;
    }

    isDownloading = true;
    downloadStatusMsg = "Downloading " + pack.name + "...";
    render();

    var targetFile = DICT_DIR + pack.id + ".json";

    fetchUrl(pack.url, function(res) {
        isDownloading = false;
        var status = (res && typeof res.status !== "undefined") ? res.status : ((res && res.statusCode) || 0);
        var body = (res && res.body) ? res.body : ((res && res.data) || "");

        if (status === 200 && body && body.length > 2) {
            try {
                JSON.parse(body); // Validate JSON format
                FS.writeTextFile(targetFile, body);
                scanLocalPacks();

                // Automatically activate newly downloaded language
                activeDictId = pack.id;
                FS.writeTextFile(ACTIVE_CONF, activeDictId);
                loadActiveDictionary();

                downloadStatusMsg = pack.name + " installed & activated!";
                if (System.notify) {
                    System.notify("Downloaded", pack.name + " activated!", "success", 2500);
                }
            } catch(e) {
                downloadStatusMsg = "Invalid JSON file from server!";
            }
        } else {
            downloadStatusMsg = "Download failed (HTTP " + status + ")";
        }
        render();
    });
}

// ------------------------------------------------------------------------
// UI Layout Renderers
// ------------------------------------------------------------------------
function drawTopBar() {
    System.fillRect(0, 0, SCREEN_W, 32, C_PANEL);
    System.drawLine(0, 32, SCREEN_W, 32, C_BORDER);

    System.setTextColor(C_WHITE, C_PANEL);
    System.drawString("OmniDict", 16, 8, 2);

    System.setTextColor(C_GREEN, C_PANEL);
    var tag = "[" + (activeDictId || "DEFAULT").toUpperCase() + "]";
    System.drawString(tag, 105, 8, 2);

    // Exit [X]
    System.fillRect(SCREEN_W - 35, 3, 30, 26, C_RED);
    System.setTextColor(C_WHITE, C_RED);
    System.drawString("X", SCREEN_W - 25, 8, 2);
}

function drawTabBar() {
    System.fillRect(0, 33, SCREEN_W, 32, C_BG);

    var tabs = [
        { id: TAB_SEARCH, label: "Search" },
        { id: TAB_LOCAL,  label: "Packs" },
        { id: TAB_DOWNLOAD, label: "Online" }
    ];

    var tabW = Math.floor(SCREEN_W / tabs.length);
    for (var i = 0; i < tabs.length; i++) {
        var tx = i * tabW;
        var isSel = (currentTab === tabs[i].id && currentTab !== STATE_DETAIL);

        if (isSel) {
            System.fillRect(tx + 2, 35, tabW - 4, 26, C_ACCENT);
            System.setTextColor(C_WHITE, C_ACCENT);
        } else {
            System.fillRoundRect(tx + 2, 35, tabW - 4, 26, 3, C_PANEL);
            System.setTextColor(C_MUTED, C_PANEL);
        }
        System.drawString(tabs[i].label, tx + 12, 40, 2);
    }
}

function drawSearchTab() {
    System.fillRect(0, 66, SCREEN_W, SCREEN_H - 66, C_BG);

    // Search Bar Box
    System.fillRoundRect(12, 70, SCREEN_W - 24, 34, 4, C_PANEL);
    System.drawRoundRect(12, 70, SCREEN_W - 24, 34, 4, C_ACCENT);

    System.setTextColor(C_YELLOW, C_PANEL);
    System.drawString("Q:", 18, 78, 2);

    System.setTextColor(searchQuery ? C_WHITE : C_MUTED, C_PANEL);
    var qDisplay = searchQuery ? searchQuery : "Tap to search word...";
    if (qDisplay.length > 18) qDisplay = qDisplay.substring(0, 16) + "..";
    System.drawString(qDisplay, 40, 78, 2);

    if (searchQuery) {
        System.fillRect(SCREEN_W - 40, 75, 22, 24, C_RED);
        System.setTextColor(C_WHITE, C_RED);
        System.drawString("x", SCREEN_W - 34, 78, 2);
    }

    var startY = 112;
    var itemH = 38;
    var maxVis = 4;

    if (searchResults.length === 0) {
        System.setTextColor(C_MUTED, C_BG);
        System.drawString(searchQuery ? "No matching words found." : "Type a word or select pack.", 16, 150, 2);
        return;
    }

    for (var i = 0; i < maxVis; i++) {
        var idx = scrollOffset + i;
        if (idx >= searchResults.length) break;

        var item = searchResults[idx];
        var curY = startY + (i * itemH);

        System.fillRoundRect(12, curY, SCREEN_W - 24, itemH - 4, 4, C_PANEL);
        System.drawRoundRect(12, curY, SCREEN_W - 24, itemH - 4, 4, C_BORDER);

        System.setTextColor(C_YELLOW, C_PANEL);
        System.drawString(item.word, 18, curY + 4, 2);

        System.setTextColor(C_WHITE, C_PANEL);
        var m = item.meaning;
        if (m.length > 24) m = m.substring(0, 22) + "..";
        System.drawString(m, 18, curY + 20, 1);
    }

    // Scroll Buttons
    if (searchResults.length > maxVis) {
        System.fillRoundRect(12, 276, 100, 30, 4, (scrollOffset > 0) ? C_ACCENT : C_PANEL);
        System.setTextColor(C_WHITE, (scrollOffset > 0) ? C_ACCENT : C_PANEL);
        System.drawString("< UP", 42, 283, 2);

        var canDown = (scrollOffset + maxVis < searchResults.length);
        System.fillRoundRect(SCREEN_W - 112, 276, 100, 30, 4, canDown ? C_ACCENT : C_PANEL);
        System.setTextColor(C_WHITE, canDown ? C_ACCENT : C_PANEL);
        System.drawString("DN >", SCREEN_W - 75, 283, 2);
    }
}

function drawWordDetail() {
    System.fillRect(0, 66, SCREEN_W, SCREEN_H - 66, C_BG);

    System.fillRoundRect(12, 70, SCREEN_W - 24, 205, 5, C_PANEL);
    System.drawRoundRect(12, 70, SCREEN_W - 24, 205, 5, C_BORDER);

    if (!selectedWord) return;

    System.setTextColor(C_YELLOW, C_PANEL);
    var fSize = (selectedWord.length > 10) ? 2 : 4;
    System.drawString(selectedWord.toUpperCase(), 18, 78, fSize);

    var y = 114;
    System.setTextColor(C_GREEN, C_PANEL);
    System.drawString("Meaning:", 18, y, 2);
    y += 20;

    System.setTextColor(C_WHITE, C_PANEL);
    var mLines = wrapText(selectedMeaning || "No meaning provided", 26);
    for (var i = 0; i < mLines.length && i < 3; i++) {
        System.drawString(mLines[i], 18, y, 2);
        y += 18;
    }

    if (selectedDesc && selectedDesc.length > 0) {
        y += 6;
        System.setTextColor(C_CYAN, C_PANEL);
        System.drawString("Description:", 18, y, 1);
        y += 14;

        System.setTextColor(C_MUTED, C_PANEL);
        var dLines = wrapText(selectedDesc, 30);
        for (var d = 0; d < dLines.length && d < 2; d++) {
            System.drawString(dLines[d], 18, y, 1);
            y += 14;
        }
    }

    // Back button
    System.fillRoundRect(70, 236, 100, 30, 4, C_ACCENT);
    System.setTextColor(C_WHITE, C_ACCENT);
    System.drawString("< Back", 98, 243, 2);
}

function drawLocalTab() {
    System.fillRect(0, 66, SCREEN_W, SCREEN_H - 66, C_BG);

    System.setTextColor(C_WHITE, C_BG);
    System.drawString("Installed Language Files", 16, 72, 2);

    if (localPacks.length === 0) {
        System.setTextColor(C_MUTED, C_BG);
        System.drawString("No files in dicts/", 20, 130, 2);
        System.drawString("Tap 'Online' tab to get packs.", 20, 155, 1);
        return;
    }

    var startY = 96;
    var itemH = 42;

    for (var i = 0; i < localPacks.length && i < 4; i++) {
        var pid = localPacks[i];
        var isAct = (pid === activeDictId);
        var curY = startY + (i * itemH);

        System.fillRoundRect(12, curY, SCREEN_W - 24, itemH - 4, 4, isAct ? 0x02E0 : C_PANEL);
        System.drawRoundRect(12, curY, SCREEN_W - 24, itemH - 4, 4, isAct ? C_GREEN : C_BORDER);

        System.setTextColor(C_WHITE, isAct ? 0x02E0 : C_PANEL);
        System.drawString(pid + ".json", 18, curY + 6, 2);

        System.setTextColor(isAct ? C_YELLOW : C_MUTED, isAct ? 0x02E0 : C_PANEL);
        System.drawString(isAct ? "[ACTIVE PACK]" : "Tap to activate", 18, curY + 22, 1);

        // Delete button (Prevent deleting the only remaining pack)
        if (localPacks.length > 1) {
            System.fillRoundRect(SCREEN_W - 55, curY + 6, 40, 26, 3, C_RED);
            System.setTextColor(C_WHITE, C_RED);
            System.drawString("Del", SCREEN_W - 46, curY + 11, 2);
        }
    }
}

function drawDownloadTab() {
    System.fillRect(0, 66, SCREEN_W, SCREEN_H - 66, C_BG);

    // Filter Bar & Refresh Button
    System.fillRoundRect(12, 70, 135, 30, 4, C_PANEL);
    System.drawRoundRect(12, 70, 135, 30, 4, C_BORDER);
    System.setTextColor(packFilter ? C_WHITE : C_MUTED, C_PANEL);
    var filterTxt = packFilter ? packFilter : "Filter (e.g. bn)";
    System.drawString(filterTxt, 18, 77, 2);

    System.fillRoundRect(155, 70, 72, 30, 4, C_ACCENT);
    System.setTextColor(C_WHITE, C_ACCENT);
    System.drawString("Refresh", 168, 77, 2);

    if (downloadStatusMsg) {
        System.setTextColor(C_YELLOW, C_BG);
        var dispMsg = downloadStatusMsg;
        if (dispMsg.length > 30) dispMsg = dispMsg.substring(0, 28) + "..";
        System.drawString(dispMsg, 16, 106, 1);
    }

    if (!catalogLoaded) {
        System.setTextColor(C_MUTED, C_BG);
        System.drawString("Loading catalog from GitHub...", 16, 150, 2);
        return;
    }

    var startY = 124;
    var itemH = 46;
    var rendered = 0;

    for (var i = 0; i < onlinePacks.length && rendered < 3; i++) {
        var p = onlinePacks[i];

        if (packFilter && p.id.indexOf(packFilter.toLowerCase()) === -1 && p.name.toLowerCase().indexOf(packFilter.toLowerCase()) === -1) {
            continue;
        }

        var curY = startY + (rendered * itemH);
        var isInstalled = (localPacks.indexOf(p.id) !== -1);
        var isActive = (activeDictId === p.id);

        System.fillRoundRect(12, curY, SCREEN_W - 24, itemH - 4, 4, C_PANEL);
        System.drawRoundRect(12, curY, SCREEN_W - 24, itemH - 4, 4, C_BORDER);

        System.setTextColor(C_WHITE, C_PANEL);
        System.drawString(p.name, 18, curY + 6, 2);

        System.setTextColor(C_CYAN, C_PANEL);
        System.drawString(p.size + " - " + p.words + " words", 18, curY + 24, 1);

        if (isActive) {
            System.fillRoundRect(SCREEN_W - 75, curY + 8, 60, 26, 3, 0x02E0);
            System.setTextColor(C_WHITE, 0x02E0);
            System.drawString("Active", SCREEN_W - 65, curY + 13, 2);
        } else if (isInstalled) {
            System.fillRoundRect(SCREEN_W - 75, curY + 8, 60, 26, 3, C_ACCENT);
            System.setTextColor(C_WHITE, C_ACCENT);
            System.drawString("Use", SCREEN_W - 57, curY + 13, 2);
        } else {
            System.fillRoundRect(SCREEN_W - 75, curY + 8, 60, 26, 3, C_GREEN);
            System.setTextColor(C_BG, C_GREEN);
            System.drawString("Get", SCREEN_W - 55, curY + 13, 2);
        }

        rendered++;
    }
}

function wrapText(str, maxLen) {
    if (!str || typeof str !== "string") return [];
    var lines = [];
    var words = str.split(" ");
    var cur = "";
    for (var i = 0; i < words.length; i++) {
        if ((cur + " " + words[i]).trim().length <= maxLen) {
            cur = (cur + " " + words[i]).trim();
        } else {
            if (cur.length > 0) lines.push(cur);
            cur = words[i];
        }
    }
    if (cur.length > 0) lines.push(cur);
    return lines;
}

function render() {
    drawTopBar();
    drawTabBar();
    if (currentTab === TAB_SEARCH) drawSearchTab();
    else if (currentTab === STATE_DETAIL) drawWordDetail();
    else if (currentTab === TAB_LOCAL) drawLocalTab();
    else if (currentTab === TAB_DOWNLOAD) drawDownloadTab();
}

// ------------------------------------------------------------------------
// Touch Input Dispatcher
// ------------------------------------------------------------------------
function handleTouch(x, y) {
    // Exit App
    if (x >= SCREEN_W - 40 && y <= 32) {
        isRunning = false;
        return;
    }

    // Tabs
    if (y >= 33 && y <= 65) {
        var tabW = Math.floor(SCREEN_W / 3);
        var newTab = Math.floor(x / tabW);
        if (newTab !== currentTab) {
            currentTab = newTab;
            // AUTO-FETCH: Automatically load catalog when tapping 'Online' tab!
            if (currentTab === TAB_DOWNLOAD && !catalogLoaded) {
                fetchOnlineCatalog();
            } else if (currentTab === TAB_LOCAL) {
                scanLocalPacks();
            }
            render();
        }
        return;
    }

    // Search Tab
    if (currentTab === TAB_SEARCH) {
        if (x >= 12 && x <= SCREEN_W - 50 && y >= 70 && y <= 104) {
            var input = System.prompt("Search word:", searchQuery);
            if (typeof input === "string") {
                performSearch(input);
                render();
            }
            return;
        }
        if (x >= SCREEN_W - 45 && x <= SCREEN_W - 12 && y >= 70 && y <= 104 && searchQuery) {
            performSearch("");
            render();
            return;
        }
        // Scroll UP
        if (searchResults.length > 4 && x >= 12 && x <= 112 && y >= 276 && y <= 310) {
            if (scrollOffset > 0) {
                scrollOffset = Math.max(0, scrollOffset - 4);
                render();
            }
            return;
        }
        // Scroll DOWN
        if (searchResults.length > 4 && x >= SCREEN_W - 112 && x <= SCREEN_W - 12 && y >= 276 && y <= 310) {
            if (scrollOffset + 4 < searchResults.length) {
                scrollOffset = scrollOffset + 4;
                render();
            }
            return;
        }
        // Word Tap
        if (y >= 112 && y <= 270 && searchResults.length > 0) {
            var relIdx = Math.floor((y - 112) / 38);
            var selIdx = scrollOffset + relIdx;
            if (selIdx < searchResults.length) {
                var item = searchResults[selIdx];
                selectedWord = item.word;
                selectedMeaning = item.meaning;
                selectedDesc = item.desc;
                currentTab = STATE_DETAIL;
                render();
            }
            return;
        }
    }

    // Detail View Back
    if (currentTab === STATE_DETAIL) {
        if (x >= 70 && x <= 170 && y >= 236 && y <= 270) {
            currentTab = TAB_SEARCH;
            render();
            return;
        }
    }

    // Local Packs Tab
    if (currentTab === TAB_LOCAL) {
        var startY = 96;
        var itemH = 42;
        for (var i = 0; i < localPacks.length && i < 4; i++) {
            var curY = startY + (i * itemH);
            if (y >= curY && y <= curY + itemH) {
                // Delete
                if (x >= SCREEN_W - 60 && x <= SCREEN_W - 12) {
                    if (localPacks.length > 1) {
                        var delId = localPacks[i];
                        FS.deleteFile(DICT_DIR + delId + ".json");
                        scanLocalPacks();
                        if (activeDictId === delId) {
                            activeDictId = (localPacks.length > 0) ? localPacks[0] : "default";
                            loadActiveDictionary();
                        }
                        render();
                    }
                    return;
                }
                // Activate
                activeDictId = localPacks[i];
                FS.writeTextFile(ACTIVE_CONF, activeDictId);
                loadActiveDictionary();
                render();
                return;
            }
        }
    }

    // Download Tab
    if (currentTab === TAB_DOWNLOAD) {
        if (x >= 12 && x <= 147 && y >= 70 && y <= 100) {
            var f = System.prompt("Filter packs:", packFilter);
            if (typeof f === "string") {
                packFilter = f.trim();
                render();
            }
            return;
        }
        if (x >= 155 && x <= 228 && y >= 70 && y <= 100) {
            fetchOnlineCatalog();
            return;
        }
        if (catalogLoaded && !isDownloading) {
            var dY = 124;
            var dH = 46;
            var rendered = 0;
            for (var j = 0; j < onlinePacks.length && rendered < 3; j++) {
                var p = onlinePacks[j];
                if (packFilter && p.id.indexOf(packFilter.toLowerCase()) === -1 && p.name.toLowerCase().indexOf(packFilter.toLowerCase()) === -1) {
                    continue;
                }
                var itemTop = dY + (rendered * dH);
                if (y >= itemTop && y <= itemTop + dH) {
                    if (x >= SCREEN_W - 80 && x <= SCREEN_W - 12) {
                        var isInstalled = (localPacks.indexOf(p.id) !== -1);
                        if (isInstalled) {
                            // If already installed, tapping it directly activates it!
                            activeDictId = p.id;
                            FS.writeTextFile(ACTIVE_CONF, activeDictId);
                            loadActiveDictionary();
                            render();
                        } else {
                            // If not installed, download it!
                            downloadPack(p);
                        }
                        return;
                    }
                }
                rendered++;
            }
        }
    }
}

// ------------------------------------------------------------------------
// Main Execution Loop
// ------------------------------------------------------------------------
init();
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
