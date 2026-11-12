// Physics Drop - Verlet Integration Sandbox
// Dynamic multi-resolution sliced double buffering

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var BLACK = 0x0000;
    var WHITE = 0xFFFF;
    var RED = 0xF800;
    var BLUE = 0x001F;

    var points = [];
    var sticks = [];
    var MAX_POINTS = 150;

    var gravity = 0.4;
    var friction = 0.999;
    var bounce = 0.8;

    var isDrawing = false;
    var lastPointIdx = -1;

    function addPoint(x, y) {
        if (points.length >= MAX_POINTS) return -1;
        points.push({ x: x, y: y, oldx: x, oldy: y, pinned: false });
        return points.length - 1;
    }

    function addStick(p0_idx, p1_idx, length) {
        sticks.push({ p0: p0_idx, p1: p1_idx, length: length });
    }

    function getDistance(p0, p1) {
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function updatePoints() {
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            if (!p.pinned) {
                var vx = (p.x - p.oldx) * friction;
                var vy = (p.y - p.oldy) * friction;
                p.oldx = p.x;
                p.oldy = p.y;
                p.x += vx;
                p.y += vy + gravity;
            }
        }
    }

    function updateSticks() {
        for (var i = 0; i < sticks.length; i++) {
            var s = sticks[i];
            var p0 = points[s.p0];
            var p1 = points[s.p1];
            var dx = p1.x - p0.x;
            var dy = p1.y - p0.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) continue;

            var diff = s.length - dist;
            var percent = (diff / dist) / 2;
            var offsetX = dx * percent;
            var offsetY = dy * percent;

            if (!p0.pinned) { p0.x -= offsetX; p0.y -= offsetY; }
            if (!p1.pinned) { p1.x += offsetX; p1.y += offsetY; }
        }
    }

    function constrainPoints() {
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            if (p.pinned) continue;
            var vx = (p.x - p.oldx) * friction;
            var vy = (p.y - p.oldy) * friction;

            if (p.x < 0) { p.x = 0; p.oldx = p.x + vx * bounce; }
            else if (p.x > SW) { p.x = SW; p.oldx = p.x + vx * bounce; }

            if (p.y < 0) { p.y = 0; p.oldy = p.y + vy * bounce; }
            else if (p.y > SH) { p.y = SH; p.oldy = p.y + vy * bounce; }
        }
    }

    var SLICE_HEIGHT = 30;
    var SLICES = Math.ceil(SH / SLICE_HEIGHT);
    var useSprite = System.createSprite(SW, SLICE_HEIGHT);

    function drawContent(startY) {
        for (var i = 0; i < sticks.length; i++) {
            var s = sticks[i];
            var p0 = points[s.p0];
            var p1 = points[s.p1];
            System.drawLine(Math.floor(p0.x), Math.floor(p0.y) - startY, Math.floor(p1.x), Math.floor(p1.y) - startY, WHITE);
        }

        for (var j = 0; j < points.length; j++) {
            var p = points[j];
            System.fillRect(Math.floor(p.x) - 1, Math.floor(p.y) - 1 - startY, 3, 3, BLUE);
        }

        if (points.length === 0) {
            System.setTextColor(WHITE, BLACK);
            System.drawString("Draw falling lines!", Math.floor((SW - 160) / 2), Math.floor(SH * 0.48) - startY, 2);
        } else {
            System.setTextColor(WHITE, BLACK);
            System.drawString("Points: " + points.length + "/" + MAX_POINTS, 70, 10 - startY, 1);
        }

        System.fillRect(0, 0 - startY, 60, 30, RED);
        System.setTextColor(WHITE, RED);
        System.drawString("CLEAR", 15, 10 - startY, 1);
    }

    function drawScene() {
        if (useSprite) {
            for (var slice = 0; slice < SLICES; slice++) {
                var startY = slice * SLICE_HEIGHT;
                System.bindSprite(true);
                System.fillScreen(BLACK);
                drawContent(startY);
                System.bindSprite(false);
                System.pushSprite(0, startY);
            }
        } else {
            System.fillScreen(BLACK);
            drawContent(0);
        }
    }

    drawScene();

    while (true) {
        var t = System.getTouch();

        if (t.touched) {
            if (t.x >= SW - 40 && t.y <= 40) {
                break;
            }
            if (t.x < 60 && t.y < 30) {
                points = [];
                sticks = [];
                isDrawing = false;
                lastPointIdx = -1;
                drawScene();
                System.delay(300);
            } else {
                if (!isDrawing) {
                    isDrawing = true;
                    lastPointIdx = addPoint(t.x, t.y);
                    if (lastPointIdx !== -1) {
                        points[lastPointIdx].pinned = true;
                    }
                } else if (lastPointIdx !== -1) {
                    var lp = points[lastPointIdx];
                    var dist = getDistance({ x: t.x, y: t.y }, lp);
                    if (dist > 15) {
                        var newIdx = addPoint(t.x, t.y);
                        if (newIdx !== -1) {
                            addStick(lastPointIdx, newIdx, dist);
                            points[newIdx].pinned = true;
                            lp.pinned = false;
                            lastPointIdx = newIdx;
                        }
                    } else {
                        lp.x = t.x;
                        lp.y = t.y;
                    }
                }
            }
        } else if (isDrawing) {
            isDrawing = false;
            if (lastPointIdx !== -1) {
                points[lastPointIdx].pinned = false;
                lastPointIdx = -1;
            }
        }

        updatePoints();
        for (var iter = 0; iter < 4; iter++) {
            updateSticks();
            constrainPoints();
        }

        drawScene();
        System.delay(10);
    }

    if (useSprite) {
        System.deleteSprite();
    }
})();