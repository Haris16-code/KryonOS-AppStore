const C_BG = 0x0000;
const C_TEXT = 0xFFFF;
const C_ACCENT = 0x07E0; // Green

System.fillScreen(C_BG);
System.setTextColor(C_TEXT, C_BG);
System.drawString("System Information", 10, 10, 2);
System.drawLine(10, 30, 230, 30, C_ACCENT);

var info = System.getInfo();

var y = 45;
var spacing = 20;

function drawRow(label, value) {
    System.setTextColor(C_ACCENT, C_BG);
    System.drawString(label + ":", 10, y, 2);
    System.setTextColor(C_TEXT, C_BG);
    System.drawString(value, 110, y, 2);
    y += spacing;
}

drawRow("Chip Model", info.chipModel);
drawRow("Cores", "" + info.chipCores);
drawRow("Revision", "" + info.chipRevision);
drawRow("CPU Freq", info.cpuFreqMHz + " MHz");
y += 5; // Extra space
drawRow("Total RAM", info.totalRAM + " B");
drawRow("Free RAM", info.freeRAM + " B");
drawRow("Min Free RAM", info.minFreeRAM + " B");
drawRow("Max Alloc", info.maxAllocRAM + " B");
drawRow("Flash Size", info.flashSize + " B");
drawRow("Uptime", (info.uptimeMs / 1000).toFixed(1) + " sec");

// Wait for touch to exit
while (true) {
    var touch = System.getTouch();
    if (touch.touched) {
        break;
    }
}
