// ============================================================================
// OmniDict — Universal Master Dictionary with Online Pack Downloader
// ============================================================================


    var SCREEN_W = System.screenWidth();
    var SCREEN_H = System.screenHeight();

    // App Navigation States
    var TAB_SEARCH   = 0;
    var TAB_LOCAL    = 1;
    var TAB_DOWNLOAD = 2;
    var STATE_DETAIL = 3;

    var currentTab = TAB_SEARCH;
    var isRunning = true;

    // Master API Catalog URL (Change this to your actual GitHub/API URL)
    var CATALOG_URL = "https://raw.githubusercontent.com/shifat100/KryonOS-DOC/refs/heads/main/storage/omnidict/catalog.json";

    // Storage Paths
    var DICT_DIR = "dicts/";
    var ACTIVE_CONF = "active_dict.txt";

    // Active Dictionary State
    var activeDictId = "en_bn";
    var activeDictName = "English to Bengali";
    var activeDictData = {}; // Stores simple key-value pairs

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
    var downloadProgress = 0;
    var packFilter = "";
    var downloadStatusMsg = "";

    // Local Installed Packs Cache
    var localPacks = [];

    // Colors
    var C_BG     = 0x0000;
    var C_PANEL  = 0x18E3;
    var C_BORDER = 0x39E7;
    var C_ACCENT = 0x007acc; // Royal Blue
    var C_WHITE  = 0xFFFF;
    var C_MUTED  = 0xC618;
    var C_YELLOW = 0xFFE0;
    var C_GREEN  = 0x07E0;
    var C_RED    = 0xF800;
    var C_CYAN   = 0x07FF;

    // ------------------------------------------------------------------------
    // Initialization & Storage Operations
    // ------------------------------------------------------------------------
    function init() {
        if (!FS.exists(DICT_DIR)) {
            FS.mkdir(DICT_DIR);
        }

        // Load active dict ID from storage
        if (FS.exists(ACTIVE_CONF)) {
            var saved = FS.readTextFile(ACTIVE_CONF);
            if (saved && saved.trim().length > 0) {
                activeDictId = saved.trim();
            }
        }

        scanLocalPacks();

        // If active dict file exists, load it into RAM
        loadActiveDictionary();
    }

    function scanLocalPacks() {
        localPacks = [];
        var files = FS.listDir(DICT_DIR);
        for (var i = 0; i < files.length; i++) {
            var fn = files[i];
            if (fn.indexOf(".json") !== -1) {
                var cleanId = fn.substring(fn.lastIndexOf("/") + 1).replace(".json", "");
                localPacks.push(cleanId);
            }
        }
    }

    function loadActiveDictionary() {
        var filePath = DICT_DIR + activeDictId + ".json";
        if (FS.exists(filePath)) {
            try {
                var content = FS.readTextFile(filePath);
                activeDictData = JSON.parse(content) || {};
                activeDictName = activeDictId.toUpperCase().replace("_", " -> ");
            } catch(e) {
                activeDictData = {};
            }
        } else {
            activeDictData = {};
            activeDictName = "No Pack Selected";
        }
        performSearch(searchQuery);
    }

    // ------------------------------------------------------------------------
    // Search Engine (Reads "word": "meaning" OR "word": { meaning, desc })
    // ------------------------------------------------------------------------
    function performSearch(query) {
        searchQuery = (query || "").toLowerCase().trim();
        searchResults = [];
        scrollOffset = 0;

        if (!activeDictData || typeof activeDictData !== "object") return;

        var keys = Object.keys(activeDictData);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
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

                if (searchResults.length >= 50) break; // Limit list size to protect memory
            }
        }
    }

    // ------------------------------------------------------------------------
    // Online Download Logic
    // ------------------------------------------------------------------------
    function fetchOnlineCatalog() {
        if (!Network.isConnected()) {
            Network.showWiFiPrompt();
            downloadStatusMsg = "Please connect WiFi first!";
            return;
        }

        downloadStatusMsg = "Fetching available languages...";
        render();

        var res = Network.get(CATALOG_URL);
        if (res && res.status === 200 && res.body) {
            try {
                var parsed = JSON.parse(res.body);
                onlinePacks = parsed.packs || [];
                catalogLoaded = true;
                downloadStatusMsg = "";
            } catch(e) {
                downloadStatusMsg = "Failed to parse catalog JSON!";
            }
        } else {
            downloadStatusMsg = "Catalog fetch failed (" + (res ? res.status : "Err") + ")";
        }
    }

    function downloadPack(pack) {
        if (!Network.isConnected()) {
            Network.showWiFiPrompt();
            return;
        }

        isDownloading = true;
        downloadProgress = 0;
        downloadStatusMsg = "Downloading " + pack.name + "...";
        render();

        var targetFile = DICT_DIR + pack.id + ".json";

        var ok = Network.downloadFile(pack.url, targetFile, function(loaded, total) {
            if (total > 0) {
                downloadProgress = Math.floor((loaded * 100) / total);
                drawDownloadBar(downloadProgress);
            }
        });

        isDownloading = false;
        if (ok) {
            scanLocalPacks();
            downloadStatusMsg = "Downloaded " + pack.id + "!";
            if (System.notify) {
                System.notify("Downloaded", pack.name + " ready!", "success", 2000);
            }
        } else {
            downloadStatusMsg = "Download Failed!";
        }
        render();
    }

    // ------------------------------------------------------------------------
    // UI Layout Renderers
    // ------------------------------------------------------------------------
    function drawTopBar() {
        System.fillRect(0, 0, SCREEN_W, 32, C_PANEL);
        System.drawLine(0, 32, SCREEN_W, 32, C_BORDER);

        System.setTextColor(C_WHITE, C_PANEL);
        System.drawString("OmniDict", 10, 8, 2);

        // Language indicator badge
        System.setTextColor(C_GREEN, C_PANEL);
        var tag = "[" + activeDictId.toUpperCase() + "]";
        System.drawString(tag, 100, 8, 2);

        // Exit button [X]
        System.fillRect(205, 3, 30, 26, C_RED);
        System.setTextColor(C_WHITE, C_RED);
        System.drawString("X", 215, 8, 2);
    }

    function drawTabBar() {
        System.fillRect(0, 33, SCREEN_W, 32, C_BG);

        var tabs = [
            { id: TAB_SEARCH, label: "Search" },
            { id: TAB_LOCAL,  label: "Packs" },
            { id: TAB_DOWNLOAD, label: "Download" }
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
            System.drawString(tabs[i].label, tx + 14, 40, 2);
        }
    }

    function drawSearchTab() {
        System.fillRect(0, 66, SCREEN_W, SCREEN_H - 66, C_BG);

        // Search Bar Box
        System.fillRoundRect(8, 70, SCREEN_W - 16, 34, 4, C_PANEL);
        System.drawRoundRect(8, 70, SCREEN_W - 16, 34, 4, C_ACCENT);

        System.setTextColor(C_YELLOW, C_PANEL);
        System.drawString("Q:", 16, 78, 2);

        System.setTextColor(searchQuery ? C_WHITE : C_MUTED, C_PANEL);
        var qDisplay = searchQuery ? searchQuery : "Tap here to search word...";
        System.drawString(qDisplay, 38, 78, 2);

        if (searchQuery) {
            System.fillRect(200, 75, 20, 24, C_RED);
            System.setTextColor(C_WHITE, C_RED);
            System.drawString("x", 206, 78, 2);
        }

        // List container
        var startY = 112;
        var itemH = 38;
        var maxVis = 5;

        if (searchResults.length === 0) {
            System.setTextColor(C_MUTED, C_BG);
            System.drawString(searchQuery ? "No matching words found." : "Dictionary empty. Search or download pack.", 14, 150, 2);
            return;
        }

        for (var i = 0; i < maxVis; i++) {
            var idx = scrollOffset + i;
            if (idx >= searchResults.length) break;

            var item = searchResults[idx];
            var curY = startY + (i * itemH);

            System.fillRoundRect(8, curY, SCREEN_W - 16, itemH - 4, 4, C_PANEL);
            System.drawRoundRect(8, curY, SCREEN_W - 16, itemH - 4, 4, C_BORDER);

            System.setTextColor(C_YELLOW, C_PANEL);
            System.drawString(item.word, 14, curY + 4, 2);

            System.setTextColor(C_WHITE, C_PANEL);
            var m = item.meaning;
            if (m.length > 26) m = m.substring(0, 24) + "..";
            System.drawString(m, 14, curY + 20, 1);
        }

        // Up/Down Arrows
        if (searchResults.length > maxVis) {
            if (scrollOffset > 0) System.fillTriangle(220, 116, 230, 126, 210, 126, C_GREEN);
            if (scrollOffset + maxVis < searchResults.length) System.fillTriangle(220, 288, 210, 278, 230, 278, C_GREEN);
        }
    }

    function drawWordDetail() {
        System.fillRect(0, 66, SCREEN_W, SCREEN_H - 66, C_BG);

        System.fillRoundRect(8, 70, SCREEN_W - 16, 205, 5, C_PANEL);
        System.drawRoundRect(8, 70, SCREEN_W - 16, 205, 5, C_BORDER);

        // Word Title
        System.setTextColor(C_YELLOW, C_PANEL);
        System.drawString(selectedWord.toUpperCase(), 16, 78, 4);

        var y = 114;
        System.setTextColor(C_GREEN, C_PANEL);
        System.drawString("Meaning:", 16, y, 2);
        y += 20;

        System.setTextColor(C_WHITE, C_PANEL);
        var mLines = wrapText(selectedMeaning || "No translation provided", 26);
        for (var i = 0; i < mLines.length && i < 3; i++) {
            System.drawString(mLines[i], 16, y, 2);
            y += 18;
        }

        if (selectedDesc) {
            y += 6;
            System.setTextColor(C_CYAN, C_PANEL);
            System.drawString("Description:", 16, y, 1);
            y += 14;

            System.setTextColor(C_MUTED, C_PANEL);
            var dLines = wrapText(selectedDesc, 30);
            for (var d = 0; d < dLines.length && d < 2; d++) {
                System.drawString(dLines[d], 16, y, 1);
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
        System.drawString("Installed Language Files", 12, 72, 2);

        if (localPacks.length === 0) {
            System.setTextColor(C_MUTED, C_BG);
            System.drawString("No files in dicts/", 20, 130, 2);
            System.drawString("Tap 'Download' tab to get packs.", 20, 155, 1);
            return;
        }

        var startY = 96;
        var itemH = 42;

        for (var i = 0; i < localPacks.length && i < 4; i++) {
            var pid = localPacks[i];
            var isAct = (pid === activeDictId);
            var curY = startY + (i * itemH);

            System.fillRoundRect(8, curY, SCREEN_W - 16, itemH - 4, 4, isAct ? 0x02E0 : C_PANEL);
            System.drawRoundRect(8, curY, SCREEN_W - 16, itemH - 4, 4, isAct ? C_GREEN : C_BORDER);

            System.setTextColor(C_WHITE, isAct ? 0x02E0 : C_PANEL);
            System.drawString(pid + ".json", 16, curY + 6, 2);

            System.setTextColor(isAct ? C_YELLOW : C_MUTED, isAct ? 0x02E0 : C_PANEL);
            System.drawString(isAct ? "[ACTIVE PACK]" : "Tap to activate", 16, curY + 22, 1);

            // Delete button
            System.fillRoundRect(180, curY + 6, 44, 26, 3, C_RED);
            System.setTextColor(C_WHITE, C_RED);
            System.drawString("Del", 192, curY + 11, 2);
        }
    }

    function drawDownloadTab() {
        System.fillRect(0, 66, SCREEN_W, SCREEN_H - 66, C_BG);

        // Filter / Refresh Bar
        System.fillRoundRect(8, 70, 150, 30, 4, C_PANEL);
        System.drawRoundRect(8, 70, 150, 30, 4, C_BORDER);
        System.setTextColor(packFilter ? C_WHITE : C_MUTED, C_PANEL);
        System.drawString(packFilter ? packFilter : "Filter (e.g. bn)", 14, 77, 2);

        System.fillRoundRect(164, 70, 68, 30, 4, C_ACCENT);
        System.setTextColor(C_WHITE, C_ACCENT);
        System.drawString("Refresh", 175, 77, 2);

        // Status Toast
        if (downloadStatusMsg) {
            System.setTextColor(C_YELLOW, C_BG);
            System.drawString(downloadStatusMsg, 12, 106, 1);
        }

        if (!catalogLoaded) {
            System.setTextColor(C_MUTED, C_BG);
            System.drawString("Tap 'Refresh' to fetch online packs", 12, 150, 2);
            return;
        }

        var startY = 124;
        var itemH = 46;
        var rendered = 0;

        for (var i = 0; i < onlinePacks.length && rendered < 3; i++) {
            var p = onlinePacks[i];

            // Filter check
            if (packFilter && p.id.indexOf(packFilter.toLowerCase()) === -1 && p.name.toLowerCase().indexOf(packFilter.toLowerCase()) === -1) {
                continue;
            }

            var curY = startY + (rendered * itemH);
            var isInstalled = (localPacks.indexOf(p.id) !== -1);

            System.fillRoundRect(8, curY, SCREEN_W - 16, itemH - 4, 4, C_PANEL);
            System.drawRoundRect(8, curY, SCREEN_W - 16, itemH - 4, 4, C_BORDER);

            System.setTextColor(C_WHITE, C_PANEL);
            System.drawString(p.name, 14, curY + 6, 2);

            System.setTextColor(C_CYAN, C_PANEL);
            System.drawString(p.size + " • " + p.words + " words", 14, curY + 24, 1);

            // Download or Installed button
            if (isInstalled) {
                System.fillRoundRect(155, curY + 8, 68, 26, 3, 0x02E0);
                System.setTextColor(C_WHITE, 0x02E0);
                System.drawString("Ready", 170, curY + 13, 2);
            } else {
                System.fillRoundRect(155, curY + 8, 68, 26, 3, C_GREEN);
                System.setTextColor(C_BG, C_GREEN);
                System.drawString("Get", 178, curY + 13, 2);
            }

            rendered++;
        }
    }

    function drawDownloadBar(pct) {
        System.fillRoundRect(20, 220, 200, 26, 4, C_PANEL);
        System.drawRoundRect(20, 220, 200, 26, 4, C_ACCENT);
        var fillW = Math.floor((pct * 196) / 100);
        if (fillW > 0) {
            System.fillRect(22, 222, fillW, 22, C_GREEN);
        }
        System.setTextColor(C_WHITE, C_PANEL);
        System.drawString(pct + "%", 110, 226, 2);
    }

    function wrapText(str, maxLen) {
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
        if (x >= 200 && y <= 32) {
            isRunning = false;
            return;
        }

        // Tabs
        if (y >= 33 && y <= 65) {
            var tabW = Math.floor(SCREEN_W / 3);
            var clicked = Math.floor(x / tabW);
            currentTab = clicked;
            render();
            return;
        }

        // Search Tab
        if (currentTab === TAB_SEARCH) {
            // Tap search bar
            if (x >= 8 && x <= 195 && y >= 70 && y <= 104) {
                var input = System.prompt("Enter word to search:", searchQuery);
                if (input !== null) {
                    performSearch(input);
                    render();
                }
                return;
            }
            // Clear search
            if (x >= 200 && x <= 232 && y >= 70 && y <= 104 && searchQuery) {
                performSearch("");
                render();
                return;
            }
            // Tap word in list
            if (y >= 112 && y <= 290 && searchResults.length > 0) {
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

        // Word Detail Back
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
                    // Check if Delete tapped
                    if (x >= 180 && x <= 226) {
                        var delId = localPacks[i];
                        FS.deleteFile(DICT_DIR + delId + ".json");
                        scanLocalPacks();
                        if (activeDictId === delId) {
                            activeDictId = localPacks.length > 0 ? localPacks[0] : "";
                            loadActiveDictionary();
                        }
                        render();
                        return;
                    }
                    // Otherwise, activate this pack
                    activeDictId = localPacks[i];
                    FS.writeTextFile(ACTIVE_CONF, activeDictId);
                    loadActiveDictionary();
                    render();
                    return;
                }
            }
        }

        // Online Download Tab
        if (currentTab === TAB_DOWNLOAD) {
            // Tap Filter box
            if (x >= 8 && x <= 158 && y >= 70 && y <= 100) {
                var f = System.prompt("Filter packs:", packFilter);
                if (f !== null) {
                    packFilter = f.trim();
                    render();
                }
                return;
            }
            // Tap Refresh
            if (x >= 164 && x <= 232 && y >= 70 && y <= 100) {
                fetchOnlineCatalog();
                render();
                return;
            }
            // Tap Get / Download on item
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
                        if (x >= 155 && x <= 225) {
                            downloadPack(p);
                            return;
                        }
                    }
                    rendered++;
                }
            }
        }
    }

    // ------------------------------------------------------------------------
    // Loop Run
    // ------------------------------------------------------------------------
    init();
    render();

    var wasTouched = false;
    while (isRunning) {
        var t = System.getTouch();
        if (t.touched) {
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

