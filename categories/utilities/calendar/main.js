var COLOR_BG = System.color(18, 18, 18);
var COLOR_TEXT = System.color(255, 255, 255);
var COLOR_DIM = System.color(150, 150, 150);
var COLOR_ACCENT = System.color(66, 133, 244); // Google Blue
var COLOR_HEADER = System.color(30, 30, 30);
var COLOR_BTN = System.color(50, 50, 50);

var monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
var dayNames = ["S", "M", "T", "W", "T", "F", "S"];

var currentYear = System.getYear();
var currentMonth = System.getMonth(); // 1-12
var currentDay = System.getDay();

var viewedYear = currentYear;
var viewedMonth = currentMonth;

var lastTouch = false;

function getDaysInMonth(year, month) {
    // Standard JS: passing 0 for day gets the last day of the previous month.
    return new Date(year, month, 0).getDate();
}

function getStartDay(year, month) {
    // JS Date month is 0-indexed (0=Jan)
    return new Date(year, month - 1, 1).getDay(); // 0 = Sun
}

function clearScreen() {
    System.fillScreen(COLOR_BG);
}

function drawHeader() {
    System.fillRect(0, 0, 240, 50, COLOR_HEADER);
    
    // Title
    var title = monthNames[viewedMonth - 1] + " " + viewedYear;
    System.setTextColor(COLOR_TEXT, COLOR_HEADER);
    System.drawString(title, 10, 18, 2);
    
    // < Button
    System.fillRoundRect(120, 10, 30, 30, 5, COLOR_BTN);
    System.setTextColor(COLOR_TEXT, COLOR_BTN);
    System.drawString("<", 128, 18, 2);
    
    // > Button
    System.fillRoundRect(160, 10, 30, 30, 5, COLOR_BTN);
    System.setTextColor(COLOR_TEXT, COLOR_BTN);
    System.drawString(">", 168, 18, 2);
    
    // Days of Week
    var cellW = 240 / 7;
    for (var i = 0; i < 7; i++) {
        System.setTextColor(COLOR_DIM, COLOR_BG);
        System.drawString(dayNames[i], i * cellW + 12, 60, 2);
    }
}

function drawGrid() {
    System.fillRect(0, 80, 240, 240, COLOR_BG); // clear grid area
    
    var daysInMonth = getDaysInMonth(viewedYear, viewedMonth);
    var startDay = getStartDay(viewedYear, viewedMonth);
    
    var cellW = 240 / 7;
    var cellH = 35;
    
    var row = 0;
    var col = startDay;
    
    for (var day = 1; day <= daysInMonth; day++) {
        var x = col * cellW + 10;
        var y = 90 + (row * cellH);
        
        var isToday = (viewedYear === currentYear && viewedMonth === currentMonth && day === currentDay);
        
        if (isToday) {
            // Android style circular highlight
            System.fillRoundRect(x - 6, y - 4, 26, 26, 13, COLOR_ACCENT);
            System.setTextColor(System.color(255, 255, 255), COLOR_ACCENT);
        } else {
            System.setTextColor(COLOR_TEXT, COLOR_BG);
        }
        
        // Single digit numbers need extra offset to look centered
        var dx = (day < 10) ? 4 : 0;
        System.drawString(day.toString(), x + dx, y, 2);
        
        col++;
        if (col > 6) {
            col = 0;
            row++;
        }
    }
    
    // Draw "Return to Today" Button at bottom
    System.fillRoundRect(60, 290, 120, 25, 4, COLOR_BTN);
    System.setTextColor(COLOR_TEXT, COLOR_BTN);
    System.drawString("Go to Today", 75, 295, 2);
}

function updateUI() {
    drawHeader();
    drawGrid();
}

function handleTouch(x, y) {
    if (y < 50) {
        if (x >= 120 && x <= 150) {
            // Prev month
            viewedMonth--;
            if (viewedMonth < 1) {
                viewedMonth = 12;
                viewedYear--;
            }
            updateUI();
        } else if (x >= 160 && x <= 190) {
            // Next month
            viewedMonth++;
            if (viewedMonth > 12) {
                viewedMonth = 1;
                viewedYear++;
            }
            updateUI();
        } else if (x < 110) {
            // Header clicked -> Jump!
            var yStr = System.prompt("Jump to Year (e.g. 2026):", viewedYear.toString());
            if (yStr !== "") {
                var mStr = System.prompt("Jump to Month (1-12):", viewedMonth.toString());
                if (mStr !== "") {
                    var newY = parseInt(yStr, 10);
                    var newM = parseInt(mStr, 10);
                    if (newM >= 1 && newM <= 12 && newY > 1900 && newY < 2100) {
                        viewedYear = newY;
                        viewedMonth = newM;
                        clearScreen();
                        updateUI();
                    }
                } else {
                    // Repaint after prompt
                    clearScreen();
                    updateUI();
                }
            } else {
                // Repaint after prompt
                clearScreen();
                updateUI();
            }
        }
    } else if (y > 280 && x >= 50 && x <= 190) {
        // Tap "Go to Today" button
        if (viewedYear !== currentYear || viewedMonth !== currentMonth) {
            viewedYear = currentYear;
            viewedMonth = currentMonth;
            clearScreen();
            updateUI();
        }
    }
}

// Initial draw
clearScreen();
updateUI();

while (true) {
    // Check if the actual OS day ticked over (e.g. midnight passed)
    var sysDay = System.getDay();
    if (sysDay !== currentDay) {
        currentYear = System.getYear();
        currentMonth = System.getMonth();
        currentDay = sysDay;
        // If we are looking at the current month, we should refresh to highlight the new day
        if (viewedYear === currentYear && viewedMonth === currentMonth) {
            updateUI();
        }
    }

    var t = System.getTouch();
    if (t.touched) {
        if (!lastTouch) {
            handleTouch(t.x, t.y);
        }
        lastTouch = true;
    } else {
        lastTouch = false;
    }
    
    System.delay(20);
}
