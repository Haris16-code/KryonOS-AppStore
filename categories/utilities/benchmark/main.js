// KryonOS Benchmark Tool
// Tests CPU, 2D Graphics, and 3D Graphics performance across 240x320 & 320x240

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();

    var STATE_MENU = 0;
    var STATE_RESULT = 2;
    var state = STATE_MENU;

    var selectedBench = 0;
    var lastTouch = false;
    var resultText = "";
    var resultScore = 0;
    var minT = 999;
    var maxT = -999;

    var btnW = Math.min(200, SW - 48);
    var btnX = Math.floor((SW - btnW) / 2);
    var btnH = Math.min(44, Math.floor((SH - 84) / 3) - 10);
    var btnStartY = 70;
    var btnStep = btnH + 10;

    function drawMenu() {
        System.fillScreen(0x0000);
        System.setTextColor(0x07FF, 0x0000);
        System.drawString("KRYON BENCHMARK", 14, 14, 4);

        System.setTextColor(0xFFFF, 0x0000);
        System.drawString("Select a stress test:", 16, 46, 2);

        var y0 = btnStartY;
        var y1 = btnStartY + btnStep;
        var y2 = btnStartY + btnStep * 2;

        System.fillRoundRect(btnX, y0, btnW, btnH, 5, 0xF800);
        System.setTextColor(0xFFFF, 0xF800);
        System.drawString("CPU & MATH", btnX + Math.floor((btnW - 88) / 2), y0 + Math.floor((btnH - 14) / 2), 2);

        System.fillRoundRect(btnX, y1, btnW, btnH, 5, 0x07E0);
        System.setTextColor(0x0000, 0x07E0);
        System.drawString("2D GRAPHICS", btnX + Math.floor((btnW - 96) / 2), y1 + Math.floor((btnH - 14) / 2), 2);

        System.fillRoundRect(btnX, y2, btnW, btnH, 5, 0x001F);
        System.setTextColor(0xFFFF, 0x001F);
        System.drawString("3D GRAPHICS", btnX + Math.floor((btnW - 96) / 2), y2 + Math.floor((btnH - 14) / 2), 2);
    }

    function updateTemps() {
        if (System.hasTemperatureSensor()) {
            var t = System.getTemperature();
            if (t < minT) minT = t;
            if (t > maxT) maxT = t;
            return t;
        }
        return 0;
    }

    function runCPU(durationMs) {
        var start = System.millis();
        var ops = 0;
        var runningVal = 1.0;

        System.fillScreen(0x0000);
        System.setTextColor(0x07FF, 0x0000);
        System.drawString("CPU BENCHMARK RUNNING", 10, Math.floor(SH * 0.30), 2);

        while (System.millis() - start < durationMs) {
            var chunkStart = System.millis();
            var tempOps = 0;

            while (System.millis() - chunkStart < 50) {
                for (var i = 1; i <= 100; i++) {
                    runningVal = Math.sin(runningVal + i) * Math.sqrt(i * 3.14);
                    if (runningVal === 0 || isNaN(runningVal)) runningVal = 1.0;
                }
                tempOps++;
            }
            ops += tempOps;

            var t = updateTemps();
            System.fillRect(10, Math.floor(SH * 0.45), SW - 20, 44, 0x0000);
            System.setTextColor(0xFFFF, 0x0000);
            System.drawString("Ops: " + ops + " Temp: " + Math.floor(t) + "C", 10, Math.floor(SH * 0.45), 2);
            System.drawString("Val: " + runningVal.toFixed(2), 10, Math.floor(SH * 0.45) + 22, 2);
            System.delay(1);
        }

        resultScore = Math.floor((ops * 1000) / durationMs);
        resultText = "Math OPs/sec";
    }

    function run2D(durationMs) {
        var start = System.millis();
        var frames = 0;
        var colors = [0xF800, 0x07E0, 0x001F, 0xFFE0, 0xF81F, 0x07FF, 0xFFFF];

        while (System.millis() - start < durationMs) {
            var x1 = Math.floor(Math.random() * SW);
            var y1 = Math.floor(Math.random() * SH);
            var w = Math.floor(Math.random() * 80);
            var h = Math.floor(Math.random() * 80);
            var c = colors[Math.floor(Math.random() * colors.length)];

            var shape = Math.floor(Math.random() * 4);
            if (shape === 0) System.fillRect(x1, y1, w, h, c);
            else if (shape === 1) System.fillCircle(x1, y1, Math.floor(w / 2), c);
            else if (shape === 2) System.drawLine(x1, y1, x1 + w, y1 + h, c);
            else System.fillRoundRect(x1, y1, w, h, 8, c);

            frames++;

            if (frames % 20 === 0) {
                var t = updateTemps();
                System.fillRect(0, 0, SW, 22, 0x0000);
                System.setTextColor(0xFFFF, 0x0000);
                System.drawString("2D: " + frames + " | " + Math.floor(t) + "C", 5, 3, 2);
                System.delay(1);
            }
        }

        resultScore = Math.floor((frames * 1000) / durationMs);
        resultText = "Primitives/sec";
    }

    function run3D(durationMs) {
        var start = System.millis();
        var frames = 0;

        var cubeNodes = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
        ];

        var cubeFaces = [
            { nodes: [0, 1, 2, 3], color: 0xF800 },
            { nodes: [5, 4, 7, 6], color: 0x07E0 },
            { nodes: [4, 5, 1, 0], color: 0x001F },
            { nodes: [3, 2, 6, 7], color: 0xFFE0 },
            { nodes: [4, 0, 3, 7], color: 0xF81F },
            { nodes: [1, 5, 6, 2], color: 0x07FF }
        ];

        var angleX = 0;
        var angleY = 0;
        var sliceH = 30;
        var numSlices = Math.ceil(SH / sliceH);
        var useSprite = System.createSprite(SW, sliceH);
        var fov = Math.floor(Math.min(SW, SH) * 0.55);
        var dist = 3.5;

        var lastFrameTime = System.millis();
        var fps = 0;

        while (System.millis() - start < durationMs) {
            var now = System.millis();
            var dt = now - lastFrameTime;
            if (dt > 0) fps = Math.floor(1000 / dt);
            lastFrameTime = now;

            angleX += 0.05;
            angleY += 0.07;

            var sinX = Math.sin(angleX);
            var cosX = Math.cos(angleX);
            var sinY = Math.sin(angleY);
            var cosY = Math.cos(angleY);

            var proj = [];
            for (var i = 0; i < 8; i++) {
                var x = cubeNodes[i][0];
                var y = cubeNodes[i][1];
                var z = cubeNodes[i][2];

                var x1 = x * cosY - z * sinY;
                var z1 = x * sinY + z * cosY;
                var y2 = y * cosX - z1 * sinX;
                var z2 = y * sinX + z1 * cosX;

                var zDist = z2 + dist;
                if (zDist < 0.1) zDist = 0.1;

                proj.push({
                    px: Math.floor(SW / 2 + (x1 * fov) / zDist),
                    py: Math.floor(SH / 2 + (y2 * fov) / zDist),
                    pz: zDist
                });
            }

            for (var f = 0; f < 6; f++) {
                var face = cubeFaces[f];
                face.zDepth = (proj[face.nodes[0]].pz + proj[face.nodes[1]].pz + proj[face.nodes[2]].pz + proj[face.nodes[3]].pz) / 4.0;
            }
            cubeFaces.sort(function (a, b) { return b.zDepth - a.zDepth; });

            if (useSprite) {
                for (var slice = 0; slice < numSlices; slice++) {
                    var sliceY = slice * sliceH;
                    System.bindSprite(true);
                    System.fillScreen(0x0000);

                    for (var f2 = 0; f2 < 6; f2++) {
                        var fc = cubeFaces[f2];
                        var p0 = proj[fc.nodes[0]];
                        var p1 = proj[fc.nodes[1]];
                        var p2 = proj[fc.nodes[2]];
                        var p3 = proj[fc.nodes[3]];
                        var minY = Math.min(p0.py, p1.py, p2.py, p3.py);
                        var maxY = Math.max(p0.py, p1.py, p2.py, p3.py);
                        if (maxY >= sliceY && minY < sliceY + sliceH) {
                            System.fillTriangle(p0.px, p0.py - sliceY, p1.px, p1.py - sliceY, p2.px, p2.py - sliceY, fc.color);
                            System.fillTriangle(p0.px, p0.py - sliceY, p2.px, p2.py - sliceY, p3.px, p3.py - sliceY, fc.color);
                        }
                    }

                    if (slice === 0) {
                        var t = updateTemps();
                        System.setTextColor(0xFFFF, 0x0000);
                        System.drawString("3D FPS: " + fps + " | Temp: " + Math.floor(t) + "C", 5, 5, 2);
                    }

                    System.bindSprite(false);
                    System.pushSprite(0, sliceY);
                }
            } else {
                System.fillScreen(0x0000);
                for (var f3 = 0; f3 < 6; f3++) {
                    var fc2 = cubeFaces[f3];
                    var q0 = proj[fc2.nodes[0]];
                    var q1 = proj[fc2.nodes[1]];
                    var q2 = proj[fc2.nodes[2]];
                    var q3 = proj[fc2.nodes[3]];
                    System.fillTriangle(q0.px, q0.py, q1.px, q1.py, q2.px, q2.py, fc2.color);
                    System.fillTriangle(q0.px, q0.py, q2.px, q2.py, q3.px, q3.py, fc2.color);
                }
            }

            frames++;
            System.delay(1);
        }

        if (useSprite) {
            System.deleteSprite();
        }

        resultScore = Math.floor((frames * 1000) / durationMs);
        resultText = "Frames/sec (FPS)";
    }

    function drawResult() {
        System.fillScreen(0x0000);
        System.setTextColor(0x07E0, 0x0000);
        System.drawString("BENCHMARK COMPLETE", 12, 16, 4);

        System.setTextColor(0xFFFF, 0x0000);
        if (selectedBench === 0) System.drawString("Type: CPU & MATH", 16, 54, 2);
        else if (selectedBench === 1) System.drawString("Type: 2D GRAPHICS", 16, 54, 2);
        else if (selectedBench === 2) System.drawString("Type: 3D GRAPHICS", 16, 54, 2);

        System.setTextColor(0xF800, 0x0000);
        System.drawString("SCORE:", 16, 84, 4);

        System.setTextColor(0x07FF, 0x0000);
        System.drawString(resultScore + " " + resultText, 16, 114, 2);

        if (minT !== 999) {
            System.setTextColor(0xFFFF, 0x0000);
            System.drawString("Thermal: " + Math.floor(minT) + "C - " + Math.floor(maxT) + "C", 16, 148, 2);
        }

        System.setTextColor(0x7BEF, 0x0000);
        System.drawString("Tap to return", Math.floor((SW - 104) / 2), SH - 32, 2);
    }

    drawMenu();

    while (true) {
        var t = System.getTouch();
        var isTapped = t.touched && !lastTouch;

        if (isTapped) {
            if (t.x >= SW - 40 && t.y <= 40) {
                break;
            }
            if (state === STATE_MENU) {
                var selected = -1;
                if (t.x >= btnX && t.x <= btnX + btnW) {
                    if (t.y >= btnStartY && t.y <= btnStartY + btnH) selected = 0;
                    else if (t.y >= btnStartY + btnStep && t.y <= btnStartY + btnStep + btnH) selected = 1;
                    else if (t.y >= btnStartY + btnStep * 2 && t.y <= btnStartY + btnStep * 2 + btnH) selected = 2;
                }

                if (selected !== -1) {
                    selectedBench = selected;
                    var timeStr = System.prompt("Enter duration in seconds (1-999):", "10");
                    var sec = parseInt(timeStr, 10);

                    if (sec > 0 && sec <= 999) {
                        minT = 999;
                        maxT = -999;
                        if (selected === 0) runCPU(sec * 1000);
                        else if (selected === 1) run2D(sec * 1000);
                        else if (selected === 2) run3D(sec * 1000);

                        state = STATE_RESULT;
                        drawResult();
                    } else {
                        drawMenu();
                    }
                }
            } else if (state === STATE_RESULT) {
                state = STATE_MENU;
                drawMenu();
            }
        }

        lastTouch = t.touched;
        System.delay(20);
    }
})();