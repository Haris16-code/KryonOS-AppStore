// KryonOS Calendar App
// Multi-resolution support for 240x320 Portrait & 320x240 T-Deck Plus Landscape

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var COLOR_BG = System.color(18, 18, 18);
    var COLOR_TEXT = System.color(255, 255, 255);
    var COLOR_DIM = System.color(150, 150, 150);
    var COLOR_ACCENT = System.color(66, 133, 244);
    var COLOR_HEADER = System.color(30, 30, 30);
    var COLOR_BTN = System.color(50, 50, 50);

    var monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    var dayNames = ["S", "M", "T", "W", "T", "F", "S"];

    var currentYear = System.getYear();
    var currentMonth = System.getMonth();
    var currentDay = System.getDay();

    var viewedYear = currentYear;
    var viewedMonth = currentMonth;
    var lastTouch = false;

    // Responsive Layout Metrics
    var HEADER_H = 44;
    var DAY_ROW_Y = HEADER_H + 6;
    var GRID_TOP = DAY_ROW_Y + 20;
    var FOOTER_H = 34;
    var cellW = Math.floor(SW / 7);
    var gridOffsetX = Math.floor((SW - cellW * 7) / 2);
    var cellH = Math.floor((SH - GRID_TOP - FOOTER_H) / 6);

    var prevBtnX = SW - 110;
    var nextBtnX = SW - 74;
    var navBtnY = 7;

    var todayBtnW = 120;
    var todayBtnH = 24;
    var todayBtnX = Math.floor((SW - todayBtnW) / 2);
    var todayBtnY = SH - todayBtnH - 6;

    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    function getStartDay(year, month) {
        return new Date(year, month - 1, 1).getDay();
    }

    function clearScreen() {
        System.fillScreen(COLOR_BG);
    }

    function drawHeader() {
        System.fillRect(0, 0, SW, HEADER_H, COLOR_HEADER);

        var title = monthNames[viewedMonth - 1] + " " + viewedYear;
        System.setTextColor(COLOR_TEXT, COLOR_HEADER);
        System.drawString(title, 10, 14, 2);

        System.fillRoundRect(prevBtnX, navBtnY, 30, 30, 5, COLOR_BTN);
        System.setTextColor(COLOR_TEXT, COLOR_BTN);
        System.drawString("<", prevBtnX + 10, navBtnY + 7, 2);

        System.fillRoundRect(nextBtnX, navBtnY, 30, 30, 5, COLOR_BTN);
        System.setTextColor(COLOR_TEXT, COLOR_BTN);
        System.drawString(">", nextBtnX + 10, navBtnY + 7, 2);

        for (var i = 0; i < 7; i++) {
            System.setTextColor(COLOR_DIM, COLOR_BG);
            System.drawString(dayNames[i], gridOffsetX + i * cellW + Math.floor(cellW * 0.38), DAY_ROW_Y, 2);
        }
    }

    function drawGrid() {
        System.fillRect(0, GRID_TOP, SW, SH - GRID_TOP, COLOR_BG);

        var daysInMonth = getDaysInMonth(viewedYear, viewedMonth);
        var startDay = getStartDay(viewedYear, viewedMonth);

        var row = 0;
        var col = startDay;

        for (var day = 1; day <= daysInMonth; day++) {
            var cx = gridOffsetX + col * cellW + Math.floor(cellW / 2);
            var y = GRID_TOP + (row * cellH) + Math.max(2, Math.floor((cellH - 16) / 2));

            var isToday = (viewedYear === currentYear && viewedMonth === currentMonth && day === currentDay);

            if (isToday) {
                var boxS = Math.min(24, cellH - 2);
                System.fillRoundRect(cx - Math.floor(boxS / 2), y - 2, boxS, boxS, Math.floor(boxS / 2), COLOR_ACCENT);
                System.setTextColor(System.color(255, 255, 255), COLOR_ACCENT);
            } else {
                System.setTextColor(COLOR_TEXT, COLOR_BG);
            }

            var txt = day.toString();
            var tx = cx - (day < 10 ? 4 : 8);
            System.drawString(txt, tx, y, 2);

            col++;
            if (col > 6) {
                col = 0;
                row++;
            }
        }

        System.fillRoundRect(todayBtnX, todayBtnY, todayBtnW, todayBtnH, 4, COLOR_BTN);
        System.setTextColor(COLOR_TEXT, COLOR_BTN);
        System.drawString("Go to Today", todayBtnX + 16, todayBtnY + 4, 2);
    }

    function updateUI() {
        drawHeader();
        drawGrid();
    }

    function handleTouch(x, y) {
        if (y < HEADER_H) {
            if (x >= prevBtnX && x <= prevBtnX + 30) {
                viewedMonth--;
                if (viewedMonth < 1) {
                    viewedMonth = 12;
                    viewedYear--;
                }
                updateUI();
            } else if (x >= nextBtnX && x <= nextBtnX + 30) {
                viewedMonth++;
                if (viewedMonth > 12) {
                    viewedMonth = 1;
                    viewedYear++;
                }
                updateUI();
            } else if (x < prevBtnX - 5) {
                var yStr = System.prompt("Jump to Year (e.g. 2026):", viewedYear.toString());
                if (yStr !== "") {
                    var mStr = System.prompt("Jump to Month (1-12):", viewedMonth.toString());
                    if (mStr !== "") {
                        var newY = parseInt(yStr, 10);
                        var newM = parseInt(mStr, 10);
                        if (newM >= 1 && newM <= 12 && newY > 1900 && newY < 2100) {
                            viewedYear = newY;
                            viewedMonth = newM;
                        }
                    }
                }
                clearScreen();
                updateUI();
            }
        } else if (y >= todayBtnY - 4 && x >= todayBtnX && x <= todayBtnX + todayBtnW) {
            if (viewedYear !== currentYear || viewedMonth !== currentMonth) {
                viewedYear = currentYear;
                viewedMonth = currentMonth;
                clearScreen();
                updateUI();
            }
        }
    }

    clearScreen();
    updateUI();

    while (true) {
        var sysDay = System.getDay();
        if (sysDay !== currentDay) {
            currentYear = System.getYear();
            currentMonth = System.getMonth();
            currentDay = sysDay;
            if (viewedYear === currentYear && viewedMonth === currentMonth) {
                updateUI();
            }
        }

        var t = System.getTouch();
        if (t.touched) {
            if (!lastTouch) {
                if (t.x >= SW - 40 && t.y <= 40) {
                    break;
                }
                handleTouch(t.x, t.y);
            }
            lastTouch = true;
        } else {
            lastTouch = false;
        }

        System.delay(20);
    }
})();