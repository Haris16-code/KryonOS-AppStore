// ============================================================================
// KryonOS Cloud AI Studio (JS App)
// Package: com.kryonos.ai
// Powered by KryonOS JS API Guide - Section 17 (KryonCloud AI Engine)
// Multi-resolution support for 240x320 Portrait & 320x240 T-Deck Plus
// ============================================================================

var SW = System.screenWidth();
var SH = System.screenHeight();

// 16-bit RGB565 Color Palette (Deep Cyber Theme)
var C_BLACK = 0x0000;
var C_WHITE = 0xFFFF;
var C_BG = 0x0821; // Deep Navy Background
var C_PANEL = 0x10A3; // Dark Card Surface
var C_PANEL_ALT = 0x1927; // Secondary Surface
var C_BORDER = 0x2A4C; // Subtle Border
var C_CYAN = 0x07FF; // Cyan Accent
var C_PURPLE = 0x991F; // Neon Purple Accent
var C_VIOLET = 0x717A; // Deep Violet
var C_GREEN = 0x07E0; // Success Green
var C_YELLOW = 0xFFE0; // Warning Yellow
var C_RED = 0xF800; // Danger Red
var C_ORANGE = 0xFD20; // Amber Accent
var C_GRAY = 0x7BEF; // Muted Gray
var C_DARKGRAY = 0x39E7; // Dark Muted Gray

// Responsive Layout Metrics
var HDR_H = 30;
var TAB_H = 28;
var TAB_Y = SH - TAB_H;
var STATUS_H = 14;
var STATUS_Y = TAB_Y - STATUS_H;

// Tab 0 Layout
var PROMPT_CARD_Y = 34;
var PROMPT_CARD_H = 44;
var ACTION_H = 24;
var ACTION_Y = STATUS_Y - ACTION_H - 4;
var CHAT_CARD_Y = PROMPT_CARD_Y + PROMPT_CARD_H + 4;
var CHAT_CARD_H = Math.max(48, ACTION_Y - CHAT_CARD_Y - 4);
var WRAP_CHARS = Math.max(28, Math.floor((SW - 24) / 6));
var maxVisibleLines = Math.max(3, Math.floor((CHAT_CARD_H - 26) / 12));

// Tab 0 Button Geometry
var pBtnGap = 4;
var pBtnW = Math.floor((SW - 24 - pBtnGap * 3) / 4);
var pBtnY = PROMPT_CARD_Y + 28;
var pBtnX0 = 12;
var pBtnX1 = pBtnX0 + pBtnW + pBtnGap;
var pBtnX2 = pBtnX1 + pBtnW + pBtnGap;
var pBtnX3 = pBtnX2 + pBtnW + pBtnGap;

var actUpW = 32;
var actDnW = 32;
var actModeW = 56;
var actMainW = Math.max(84, SW - 12 - actUpW - actDnW - actModeW - 12);
var actX0 = 6;
var actX1 = actX0 + actUpW + 4;
var actX2 = actX1 + actDnW + 4;
var actX3 = actX2 + actModeW + 4;

// Tab 1 Layout
var EXT_IN_Y = 34;
var EXT_IN_H = (SH <= 250) ? 56 : 68;
var EXT_BTN_W = Math.floor((SW - 30) / 2);
var EXT_BTN_Y = EXT_IN_Y + EXT_IN_H - 16;
var EXT_ACT_Y = EXT_IN_Y + EXT_IN_H + 4;
var EXT_RES_Y = EXT_ACT_Y + 28;
var EXT_RES_H = Math.max(48, STATUS_Y - EXT_RES_Y - 4);

// Tab 2 Layout
var QUOTA_Y = 34;
var QUOTA_H = (SH <= 250) ? 84 : 104;
var VIS_Y = QUOTA_Y + QUOTA_H + 4;
var VIS_H = Math.max(60, STATUS_Y - VIS_Y - 4);
var VIS_BTN_Y = VIS_Y + 22;

// Application State
var activeTab = 0; // 0: Chat/Stream, 1: Smart Extract, 2: Status & Vision
var isStreaming = false;
var isBusy = false;
var statusMessage = "Ready";

// Tab 0: Chat & Stream State
var promptPresets = [
    "Explain ESP32-S3 Dual Core architecture",
    "Write a high-performance C++ FreeRTOS task",
    "How does KryonCloud zero-auth telemetry work?",
    "Explain I2C bus arbitration concisely",
    "Tell a funny programmer joke"
];
var presetIndex = 0;
var currentPrompt = promptPresets[0];
var streamMode = true;
var temperatures = [0.2, 0.5, 0.8];
var tempLabels = ["Precise (0.2)", "Balanced (0.5)", "Creative (0.8)"];
var tempIndex = 1;
var responseText = "Tap 'Start AI Stream' or select a preset to generate real-time AI responses.";
var responseLines = [];
var scrollOffset = 0;
var tokensReceived = 0;

// Tab 1: Smart Extract State
var rawSensorInput = "KryonOS Hardware Log: Core Temp is 28.4C, Free Heap is 198240 bytes, WiFi RSSI -62dBm, Uptime 340s. System healthy.";
var extractedData = null;
var extractStatus = "Tap 'Extract JSON' to parse raw sensor data into structured objects.";

// Tab 2: Status & Vision State
var aiStatus = null;
var visionResult = "";
var visionStatus = "Tap 'Run Vision Analysis' to inspect device environment.";

// Helper: Word-wrap text into lines of maxChars length
function formatWrappedLines(text, maxChars) {
    if (!text || text.length === 0) return [""];
    var words = text.split(" ");
    var lines = [];
    var currentLine = "";

    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        var subWords = word.split("\n");
        for (var s = 0; s < subWords.length; s++) {
            var sub = subWords[s];
            if (s > 0) {
                lines.push(currentLine);
                currentLine = "";
            }
            if ((currentLine + (currentLine.length > 0 ? " " : "") + sub).length <= maxChars) {
                currentLine += (currentLine.length > 0 ? " " : "") + sub;
            } else {
                if (currentLine.length > 0) lines.push(currentLine);
                while (sub.length > maxChars) {
                    lines.push(sub.substring(0, maxChars));
                    sub = sub.substring(maxChars);
                }
                currentLine = sub;
            }
        }
    }
    if (currentLine.length > 0) lines.push(currentLine);
    return lines;
}

function updateResponseText(newText) {
    responseText = newText;
    responseLines = formatWrappedLines(responseText, WRAP_CHARS);
    if (responseLines.length > maxVisibleLines) {
        scrollOffset = responseLines.length - maxVisibleLines;
    } else {
        scrollOffset = 0;
    }
}

// UI Drawing Primitives
function drawButton(x, y, w, h, label, bgCol, textCol, borderCol) {
    System.fillRoundRect(x, y, w, h, 4, bgCol);
    System.drawRoundRect(x, y, w, h, 4, borderCol || C_BORDER);
    System.setTextColor(textCol || C_WHITE, bgCol);
    System.setTextSize(1);
    var textW = label.length * 6;
    var tx = x + Math.floor((w - textW) / 2);
    var ty = y + Math.floor((h - 8) / 2);
    System.drawString(label, tx > x ? tx : x + 2, ty);
}

function drawHeader() {
    System.fillRect(0, 0, SW, HDR_H, C_PANEL);
    System.drawFastHLine(0, HDR_H, SW, C_PURPLE);

    System.setTextColor(C_CYAN, C_PANEL);
    System.setTextSize(1);
    System.drawString("KRYON AI STUDIO", 8, 11);

    var isOnline = (System.getIPAddress && System.getIPAddress().length > 0);
    var statX = SW - 74;
    System.fillCircle(statX, 15, 3, isOnline ? C_GREEN : C_RED);
    System.setTextColor(isOnline ? C_GREEN : C_RED, C_PANEL);
    System.drawString(isOnline ? "LIVE" : "OFFLINE", statX + 8, 11);

    drawButton(SW - 22, 4, 18, 22, "X", C_RED, C_WHITE, C_WHITE);
}

function drawTabBar() {
    System.fillRect(0, TAB_Y, SW, TAB_H, C_PANEL);
    System.drawFastHLine(0, TAB_Y, SW, C_BORDER);

    var tabW = Math.floor(SW / 3);
    var tabs = ["Chat", "Extract", "Status"];

    for (var i = 0; i < 3; i++) {
        var tx = i * tabW;
        var isSel = (activeTab === i);
        var bg = isSel ? C_PURPLE : C_PANEL;
        var fg = isSel ? C_WHITE : C_GRAY;
        System.fillRect(tx + 2, TAB_Y + 2, tabW - 4, 24, bg);
        if (isSel) {
            System.drawRoundRect(tx + 2, TAB_Y + 2, tabW - 4, 24, 3, C_CYAN);
        }
        System.setTextColor(fg, bg);
        System.setTextSize(1);
        var label = tabs[i];
        var lx = tx + Math.floor((tabW - (label.length * 6)) / 2);
        System.drawString(label, lx, TAB_Y + 9);
    }
}

// ============================================================================
// TAB 0: CHAT & REAL-TIME TOKEN STREAMING
// ============================================================================
function drawChatTab() {
    System.fillRoundRect(6, PROMPT_CARD_Y, SW - 12, PROMPT_CARD_H, 4, C_PANEL);
    System.drawRoundRect(6, PROMPT_CARD_Y, SW - 12, PROMPT_CARD_H, 4, C_BORDER);

    System.setTextColor(C_YELLOW, C_PANEL);
    System.drawString("Prompt (" + (presetIndex + 1) + "/" + promptPresets.length + "):", 12, PROMPT_CARD_Y + 5);

    System.setTextColor(C_WHITE, C_PANEL);
    var maxSnip = WRAP_CHARS;
    var pSnippet = currentPrompt.length > maxSnip ? currentPrompt.substring(0, maxSnip - 3) + "..." : currentPrompt;
    System.drawString(pSnippet, 12, PROMPT_CARD_Y + 17);

    drawButton(pBtnX0, pBtnY, pBtnW, 14, "< Prev", C_PANEL_ALT, C_CYAN);
    drawButton(pBtnX1, pBtnY, pBtnW, 14, "Next >", C_PANEL_ALT, C_CYAN);
    drawButton(pBtnX2, pBtnY, pBtnW, 14, "Edit", C_VIOLET, C_WHITE);
    drawButton(pBtnX3, pBtnY, pBtnW, 14, "T:" + temperatures[tempIndex], C_PANEL_ALT, C_ORANGE);

    System.fillRoundRect(6, CHAT_CARD_Y, SW - 12, CHAT_CARD_H, 4, C_PANEL);
    System.drawRoundRect(6, CHAT_CARD_Y, SW - 12, CHAT_CARD_H, 4, isStreaming ? C_CYAN : C_BORDER);

    System.setTextColor(isStreaming ? C_CYAN : C_PURPLE, C_PANEL);
    System.drawString(isStreaming ? ">>> STREAMING (" + tokensReceived + ")..." : "AI RESPONSE:", 12, CHAT_CARD_Y + 6);

    var textStartY = CHAT_CARD_Y + 20;
    var endIdx = Math.min(responseLines.length, scrollOffset + maxVisibleLines);
    for (var l = scrollOffset; l < endIdx; l++) {
        var lineY = textStartY + ((l - scrollOffset) * 12);
        System.setTextColor(C_WHITE, C_PANEL);
        System.drawString(responseLines[l], 12, lineY);
    }

    if (responseLines.length > maxVisibleLines) {
        System.setTextColor(C_GRAY, C_PANEL);
        System.drawString((scrollOffset + 1) + "-" + endIdx + "/" + responseLines.length, SW - 64, CHAT_CARD_Y + 6);
    }

    drawButton(actX0, ACTION_Y, actUpW, ACTION_H, "UP", scrollOffset > 0 ? C_PANEL_ALT : C_DARKGRAY, C_WHITE);
    drawButton(actX1, ACTION_Y, actDnW, ACTION_H, "DN", (scrollOffset + maxVisibleLines < responseLines.length) ? C_PANEL_ALT : C_DARKGRAY, C_WHITE);
    drawButton(actX2, ACTION_Y, actModeW, ACTION_H, streamMode ? "STREAM" : "1-SHOT", C_PANEL_ALT, streamMode ? C_CYAN : C_YELLOW);

    var btnColor = isBusy ? C_DARKGRAY : (streamMode ? C_PURPLE : C_GREEN);
    var btnLabel = isStreaming ? "STOP" : (streamMode ? "START STREAM" : "ASK ONCE");
    drawButton(actX3, ACTION_Y, actMainW, ACTION_H, btnLabel, btnColor, C_WHITE, C_CYAN);

    System.setTextColor(C_GRAY, C_BG);
    System.drawString(statusMessage.substring(0, WRAP_CHARS), 8, STATUS_Y);
}

// ============================================================================
// TAB 1: SMART JSON DATA EXTRACTION
// ============================================================================
function drawExtractTab() {
    System.fillRoundRect(6, EXT_IN_Y, SW - 12, EXT_IN_H, 4, C_PANEL);
    System.drawRoundRect(6, EXT_IN_Y, SW - 12, EXT_IN_H, 4, C_BORDER);

    System.setTextColor(C_YELLOW, C_PANEL);
    System.drawString("RAW TELEMETRY / LOG:", 12, EXT_IN_Y + 5);

    System.setTextColor(C_GRAY, C_PANEL);
    var inputSnippet = rawSensorInput.length > 70 ? rawSensorInput.substring(0, 68) + "..." : rawSensorInput;
    var inLines = formatWrappedLines(inputSnippet, WRAP_CHARS);
    var maxInLines = (SH <= 250) ? 2 : 3;
    for (var i = 0; i < Math.min(inLines.length, maxInLines); i++) {
        System.drawString(inLines[i], 12, EXT_IN_Y + 17 + (i * 11));
    }

    drawButton(12, EXT_BTN_Y, EXT_BTN_W, 14, "Edit Input Log", C_PANEL_ALT, C_CYAN);
    drawButton(18 + EXT_BTN_W, EXT_BTN_Y, EXT_BTN_W, 14, "Load Sensors", C_PANEL_ALT, C_GREEN);

    drawButton(6, EXT_ACT_Y, SW - 12, 24, isBusy ? "EXTRACTING JSON..." : "RUN AI EXTRACTION", isBusy ? C_DARKGRAY : C_PURPLE, C_WHITE, C_CYAN);

    System.fillRoundRect(6, EXT_RES_Y, SW - 12, EXT_RES_H, 4, C_PANEL);
    System.drawRoundRect(6, EXT_RES_Y, SW - 12, EXT_RES_H, 4, extractedData ? C_GREEN : C_BORDER);

    System.setTextColor(C_CYAN, C_PANEL);
    System.drawString("EXTRACTED STRUCTURED OBJECT:", 12, EXT_RES_Y + 6);

    var maxKvRows = Math.max(2, Math.floor((EXT_RES_H - 24) / 14));
    if (extractedData) {
        var kvY = EXT_RES_Y + 20;
        var keys = Object.keys(extractedData);
        for (var k = 0; k < Math.min(keys.length, maxKvRows); k++) {
            var key = keys[k];
            var val = JSON.stringify(extractedData[key]);
            System.setTextColor(C_YELLOW, C_PANEL);
            System.drawString(key + ":", 14, kvY + (k * 14));
            System.setTextColor(C_WHITE, C_PANEL);
            System.drawString(String(val), 110, kvY + (k * 14));
        }
    } else {
        System.setTextColor(C_GRAY, C_PANEL);
        var statusLines = formatWrappedLines(extractStatus, WRAP_CHARS);
        for (var s = 0; s < Math.min(statusLines.length, maxKvRows); s++) {
            System.drawString(statusLines[s], 14, EXT_RES_Y + 22 + (s * 13));
        }
    }

    System.setTextColor(C_GRAY, C_BG);
    System.drawString(statusMessage.substring(0, WRAP_CHARS), 8, STATUS_Y);
}

// ============================================================================
// TAB 2: AI TELEMETRY, QUOTA & VISION
// ============================================================================
function drawStatusTab() {
    System.fillRoundRect(6, QUOTA_Y, SW - 12, QUOTA_H, 4, C_PANEL);
    System.drawRoundRect(6, QUOTA_Y, SW - 12, QUOTA_H, 4, C_BORDER);

    System.setTextColor(C_CYAN, C_PANEL);
    System.drawString("KRYONCLOUD AI STATUS", 12, QUOTA_Y + 6);

    if (aiStatus) {
        System.setTextColor(C_WHITE, C_PANEL);
        System.drawString("Paired: " + (aiStatus.paired ? "YES" : "NO (Anonymous)"), 12, QUOTA_Y + 22);
        if (QUOTA_H >= 96) {
            if (aiStatus.paired) {
                System.drawString("User: " + (aiStatus.userName || "Kryon User"), 12, QUOTA_Y + 36);
            } else {
                System.drawString("Mode: Zero-Auth Direct Telemetry", 12, QUOTA_Y + 36);
            }
        }

        var used = aiStatus.dailyUsed || 0;
        var limit = aiStatus.dailyLimit || 100;
        var rem = aiStatus.remaining !== undefined ? aiStatus.remaining : (limit - used);
        var pct = Math.min(100, Math.floor((used / (limit > 0 ? limit : 100)) * 100));

        var callsY = QUOTA_Y + QUOTA_H - 34;
        System.setTextColor(C_YELLOW, C_PANEL);
        System.drawString("Calls: " + used + "/" + limit + " (" + rem + " left)", 12, callsY);

        var barX = 12;
        var barY = QUOTA_Y + QUOTA_H - 18;
        var barW = SW - 36;
        var barH = 11;
        System.fillRect(barX, barY, barW, barH, C_PANEL_ALT);
        System.drawRect(barX, barY, barW, barH, C_BORDER);
        var fillW = Math.floor((barW * pct) / 100);
        var barCol = (pct > 85) ? C_RED : ((pct > 50) ? C_ORANGE : C_GREEN);
        if (fillW > 2) System.fillRect(barX + 1, barY + 1, fillW - 2, barH - 2, barCol);
    } else {
        System.setTextColor(C_GRAY, C_PANEL);
        System.drawString("Querying Kryon.ai.status()...", 12, QUOTA_Y + 26);
    }

    drawButton(SW - 72, QUOTA_Y + 4, 60, 16, "Refresh", C_PANEL_ALT, C_CYAN);

    System.fillRoundRect(6, VIS_Y, SW - 12, VIS_H, 4, C_PANEL);
    System.drawRoundRect(6, VIS_Y, SW - 12, VIS_H, 4, C_BORDER);

    System.setTextColor(C_PURPLE, C_PANEL);
    System.drawString("KRYON VISION ENGINE", 12, VIS_Y + 6);

    drawButton(12, VIS_BTN_Y, SW - 24, 20, isBusy ? "ANALYZING..." : "RUN VISION & DIAGNOSTICS", isBusy ? C_DARKGRAY : C_VIOLET, C_WHITE, C_CYAN);

    var maxVisLines = Math.max(1, Math.floor((VIS_H - 48) / 12));
    var vLines = formatWrappedLines(visionResult.length > 0 ? visionResult : visionStatus, WRAP_CHARS);
    for (var v = 0; v < Math.min(vLines.length, maxVisLines); v++) {
        System.setTextColor(visionResult.length > 0 ? C_WHITE : C_GRAY, C_PANEL);
        System.drawString(vLines[v], 12, VIS_Y + 46 + (v * 12));
    }

    System.setTextColor(C_GRAY, C_BG);
    System.drawString(statusMessage.substring(0, WRAP_CHARS), 8, STATUS_Y);
}

// Master Render Routine
function renderUI() {
    System.fillRect(0, 0, SW, SH, C_BG);
    drawHeader();

    if (activeTab === 0) {
        drawChatTab();
    } else if (activeTab === 1) {
        drawExtractTab();
    } else if (activeTab === 2) {
        drawStatusTab();
    }

    drawTabBar();
}

// ============================================================================
// AI ENGINE WORKFLOWS (Kryon.ai APIs)
// ============================================================================

function startAiStream() {
    if (isBusy) return;
    isBusy = true;
    isStreaming = true;
    tokensReceived = 0;
    statusMessage = "Streaming from KryonCloud AI...";
    updateResponseText("");
    renderUI();

    var prompt = currentPrompt;
    var temp = temperatures[tempIndex];

    var ok = Kryon.ai.stream({
        prompt: prompt,
        system: "You are KryonOS embedded AI Assistant. Provide helpful, concise answers for microcontroller users.",
        temperature: temp,
        onToken: function (token) {
            tokensReceived++;
            updateResponseText(responseText + token);
            renderUI();
            System.delay(5);
        },
        onComplete: function (fullText, usage) {
            isStreaming = false;
            isBusy = false;
            statusMessage = "Complete! Remaining quota: " + (usage ? usage.remaining : "OK");
            renderUI();
        },
        onError: function (err) {
            isStreaming = false;
            isBusy = false;
            statusMessage = "AI Error: " + err;
            updateResponseText("Failed to complete stream: " + err);
            renderUI();
        }
    });

    if (!ok) {
        isStreaming = false;
        isBusy = false;
        statusMessage = "Stream failed to launch (Check WiFi / Quota).";
        updateResponseText("Error: Could not connect to AI gateway.");
        renderUI();
    }
}

function startAiAsk() {
    if (isBusy) return;
    isBusy = true;
    statusMessage = "Querying AI (1-Shot)...";
    updateResponseText("Sending prompt to Kryon AI gateway, please wait...");
    renderUI();

    var prompt = currentPrompt;
    var temp = temperatures[tempIndex];

    Kryon.ai.ask({
        prompt: prompt,
        system: "You are a concise embedded engineer assistant.",
        temperature: temp
    }, function (err, reply, usage) {
        isBusy = false;
        if (err) {
            statusMessage = "Error: " + err;
            updateResponseText("AI Request Failed: " + err);
        } else {
            statusMessage = "Answer received! Left: " + (usage ? usage.remaining : "N/A");
            updateResponseText(reply || "No response text.");
        }
        renderUI();
    });
}

function startAiExtract() {
    if (isBusy) return;
    isBusy = true;
    statusMessage = "Extracting structured JSON schema...";
    extractStatus = "AI analyzing input with schema constraints...";
    extractedData = null;
    renderUI();

    Kryon.ai.extract({
        prompt: "Extract temperature, memory metrics, uptime, and system status from this log.",
        input: rawSensorInput,
        schema: {
            temperature_c: "number",
            free_heap_bytes: "number",
            wifi_rssi_dbm: "number",
            uptime_seconds: "number",
            status_summary: "string"
        }
    }, function (err, result) {
        isBusy = false;
        if (err || !result) {
            statusMessage = "Extraction failed: " + (err || "Unknown error");
            extractStatus = "Failed to extract JSON. Ensure WiFi is connected.";
        } else {
            statusMessage = "JSON successfully extracted!";
            extractedData = result;
        }
        renderUI();
    });
}

function startAiVision() {
    if (isBusy) return;
    isBusy = true;
    statusMessage = "Running Kryon Vision diagnostics...";
    visionResult = "";
    visionStatus = "AI analyzing hardware display and state...";
    renderUI();

    Kryon.ai.vision({
        prompt: "Describe the device operating status, UI layout and embedded hardware capabilities."
    }, function (err, description) {
        isBusy = false;
        if (err || !description) {
            statusMessage = "Vision query failed.";
            visionResult = "Vision analysis error: " + (err || "Unknown");
        } else {
            statusMessage = "Vision analysis completed!";
            visionResult = description;
        }
        renderUI();
    });
}

function refreshStatus() {
    try {
        aiStatus = Kryon.ai.status();
        statusMessage = "Status updated.";
    } catch (e) {
        aiStatus = null;
        statusMessage = "Could not fetch status.";
    }
    renderUI();
}

// ============================================================================
// INITIALIZATION & EVENT LOOP
// ============================================================================

updateResponseText(responseText);
refreshStatus();
renderUI();

var lastTouchTime = 0;

while (true) {
    var t = System.getTouch();

    if (t.touched && (System.millis() - lastTouchTime > 220)) {
        lastTouchTime = System.millis();

        // 1. Global Close Button (Top-Right)
        if (t.x >= SW - 34 && t.y <= 32) {
            break;
        }

        // 2. Tab Bar Selection (Bottom Bar)
        if (t.y >= TAB_Y) {
            var tabW = Math.floor(SW / 3);
            var selected = Math.floor(t.x / tabW);
            if (selected >= 0 && selected < 3 && selected !== activeTab) {
                activeTab = selected;
                if (activeTab === 2) refreshStatus();
                renderUI();
            }
        }

        // 3. Tab 0 Interactions (Chat & Stream)
        else if (activeTab === 0) {
            if (t.y >= pBtnY - 4 && t.y <= pBtnY + 18) {
                if (t.x >= pBtnX0 && t.x <= pBtnX0 + pBtnW) {
                    presetIndex = (presetIndex - 1 + promptPresets.length) % promptPresets.length;
                    currentPrompt = promptPresets[presetIndex];
                    renderUI();
                } else if (t.x >= pBtnX1 && t.x <= pBtnX1 + pBtnW) {
                    presetIndex = (presetIndex + 1) % promptPresets.length;
                    currentPrompt = promptPresets[presetIndex];
                    renderUI();
                } else if (t.x >= pBtnX2 && t.x <= pBtnX2 + pBtnW) {
                    var custom = System.prompt("Enter AI Prompt:", currentPrompt);
                    if (custom && custom.length > 0) {
                        currentPrompt = custom;
                        renderUI();
                    }
                } else if (t.x >= pBtnX3 && t.x <= pBtnX3 + pBtnW) {
                    tempIndex = (tempIndex + 1) % temperatures.length;
                    statusMessage = "Temp: " + tempLabels[tempIndex];
                    renderUI();
                }
            } else if (t.y >= ACTION_Y - 2 && t.y <= ACTION_Y + ACTION_H + 2) {
                if (t.x >= actX0 && t.x <= actX0 + actUpW) {
                    if (scrollOffset > 0) {
                        scrollOffset = Math.max(0, scrollOffset - 2);
                        renderUI();
                    }
                } else if (t.x >= actX1 && t.x <= actX1 + actDnW) {
                    if (scrollOffset + maxVisibleLines < responseLines.length) {
                        scrollOffset = Math.min(responseLines.length - maxVisibleLines, scrollOffset + 2);
                        renderUI();
                    }
                } else if (t.x >= actX2 && t.x <= actX2 + actModeW) {
                    streamMode = !streamMode;
                    renderUI();
                } else if (t.x >= actX3 && t.x <= actX3 + actMainW) {
                    if (streamMode) {
                        startAiStream();
                    } else {
                        startAiAsk();
                    }
                }
            }
        }

        // 4. Tab 1 Interactions (Smart Extract)
        else if (activeTab === 1) {
            if (t.y >= EXT_BTN_Y - 4 && t.y <= EXT_BTN_Y + 18) {
                if (t.x >= 12 && t.x <= 12 + EXT_BTN_W) {
                    var customLog = System.prompt("Enter Log Text:", rawSensorInput);
                    if (customLog && customLog.length > 0) {
                        rawSensorInput = customLog;
                        renderUI();
                    }
                } else if (t.x >= 18 + EXT_BTN_W && t.x <= 18 + EXT_BTN_W * 2) {
                    var info = System.getInfo ? System.getInfo() : null;
                    var freeRam = info ? info.freeRAM : 180000;
                    var temp = System.hasTemperatureSensor && System.hasTemperatureSensor() ? System.getTemperature() : 29.2;
                    var uptime = Math.floor(System.millis() / 1000);
                    rawSensorInput = "Live ESP32 State: Core Temp " + temp + "C, Free Heap " + freeRam + " bytes, Uptime " + uptime + "s. System operating nominally.";
                    statusMessage = "Live sensor metrics loaded into input.";
                    renderUI();
                }
            } else if (t.x >= 6 && t.x <= SW - 6 && t.y >= EXT_ACT_Y - 2 && t.y <= EXT_ACT_Y + 26) {
                startAiExtract();
            }
        }

        // 5. Tab 2 Interactions (Status & Vision)
        else if (activeTab === 2) {
            if (t.x >= SW - 72 && t.y >= QUOTA_Y && t.y <= QUOTA_Y + 24) {
                refreshStatus();
            } else if (t.x >= 12 && t.x <= SW - 12 && t.y >= VIS_BTN_Y - 2 && t.y <= VIS_BTN_Y + 24) {
                startAiVision();
            }
        }
    }

    System.delay(30);
}