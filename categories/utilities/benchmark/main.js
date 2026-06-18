// HarixOS Benchmark Tool
// Tests CPU, 2D Graphics, and 3D Graphics performance

var SW = System.screenWidth();
var SH = System.screenHeight();

var STATE_MENU = 0;
var STATE_RUNNING = 1;
var STATE_RESULT = 2;
var state = STATE_MENU;

var selectedBench = 0; // 0=CPU, 1=2D, 2=3D
var lastTouch = false;
var resultText = "";
var resultScore = 0;
var minT = 999;
var maxT = -999;

function drawMenu() {
    System.fillScreen(0x0000);
    System.setTextColor(0x07FF, 0x0000);
    System.drawString("HARIX BENCHMARK", 20, 20, 4);

    System.setTextColor(0xFFFF, 0x0000);
    System.drawString("Select a stress test:", 20, 60, 2);

    // CPU Button
    System.fillRoundRect(30, 90, 180, 45, 5, 0xF800);
    System.setTextColor(0xFFFF, 0xF800);
    System.drawString("CPU & MATH", 70, 105, 2);

    // 2D Button
    System.fillRoundRect(30, 150, 180, 45, 5, 0x07E0);
    System.setTextColor(0x0000, 0x07E0);
    System.drawString("2D GRAPHICS", 65, 165, 2);

    // 3D Button
    System.fillRoundRect(30, 210, 180, 45, 5, 0x001F);
    System.setTextColor(0xFFFF, 0x001F);
    System.drawString("3D GRAPHICS", 65, 225, 2);
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
    System.drawString("CPU BENCHMARK RUNNING", 10, 100, 2);

    while (System.millis() - start < durationMs) {
        var chunkStart = System.millis();
        var tempOps = 0;

        while (System.millis() - chunkStart < 50) {
            // Heavy math payload that mutates
            for (var i = 1; i <= 100; i++) {
                runningVal = Math.sin(runningVal + i) * Math.sqrt(i * 3.14);
                if (runningVal === 0 || isNaN(runningVal)) runningVal = 1.0;
            }
            tempOps++;
        }
        ops += tempOps;

        var t = updateTemps();
        System.fillRect(10, 140, 220, 30, 0);
        System.setTextColor(0xFFFF, 0x0000);
        System.drawString("Ops: " + ops + " Temp: " + Math.floor(t) + "C", 10, 140, 2);
        System.drawString("Val: " + runningVal.toFixed(2), 10, 160, 2);
        System.delay(1); // Watchdog
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
        var w = Math.floor(Math.random() * 100);
        var h = Math.floor(Math.random() * 100);
        var c = colors[Math.floor(Math.random() * colors.length)];

        var shape = Math.floor(Math.random() * 4);
        if (shape === 0) System.fillRect(x1, y1, w, h, c);
        else if (shape === 1) System.fillCircle(x1, y1, w / 2, c);
        else if (shape === 2) System.drawLine(x1, y1, x1 + w, y1 + h, c);
        else if (shape === 3) System.fillRoundRect(x1, y1, w, h, 10, c);

        frames++;

        if (frames % 20 === 0) {
            var t = updateTemps();
            System.fillRect(0, 0, SW, 20, 0x0000);
            System.setTextColor(0xFFFF, 0x0000);
            System.drawString("2D Primitives: " + frames + " Temp: " + Math.floor(t) + "C", 5, 2, 2);
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
        [-1, -1, -1], [ 1, -1, -1], [ 1,  1, -1], [-1,  1, -1],
        [-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1]
    ];
    
    var cubeFaces = [
        { nodes: [0, 1, 2, 3], color: 0xF800 }, // Front (Red)
        { nodes: [5, 4, 7, 6], color: 0x07E0 }, // Back (Green)
        { nodes: [4, 5, 1, 0], color: 0x001F }, // Top (Blue)
        { nodes: [3, 2, 6, 7], color: 0xFFE0 }, // Bottom (Yellow)
        { nodes: [4, 0, 3, 7], color: 0xF81F }, // Left (Magenta)
        { nodes: [1, 5, 6, 2], color: 0x07FF }  // Right (Cyan)
    ];

    var angleX = 0;
    var angleY = 0;
    var sliceH = 32; // 10 slices of 32px = 320px (Reduced to save RAM and keep 16-bit color)
    var numSlices = Math.ceil(SH / sliceH);
    
    var lastFrameTime = System.millis();
    var fps = 0;

    while (System.millis() - start < durationMs) {
        var now = System.millis();
        var dt = now - lastFrameTime;
        if (dt > 0) fps = Math.floor(1000 / dt);
        lastFrameTime = now;

        angleX += 0.05;
        angleY += 0.07;

        var sinX = Math.sin(angleX); var cosX = Math.cos(angleX);
        var sinY = Math.sin(angleY); var cosY = Math.cos(angleY);

        // Transform vertices once per frame
        var proj = [];
        for (var i = 0; i < 8; i++) {
            var x = cubeNodes[i][0];
            var y = cubeNodes[i][1];
            var z = cubeNodes[i][2];

            // Rot Y
            var x1 = x * cosY - z * sinY;
            var z1 = x * sinY + z * cosY;

            // Rot X
            var y2 = y * cosX - z1 * sinX;
            var z2 = y * sinX + z1 * cosX;

            // Project
            var fov = 150;
            var dist = 3.5;
            var zDist = z2 + dist;
            if (zDist < 0.1) zDist = 0.1;

            proj.push({
                px: SW / 2 + (x1 * fov) / zDist,
                py: SH / 2 + (y2 * fov) / zDist,
                pz: zDist
            });
        }

        // Calculate face depths and sort (Painter's Algorithm)
        for (var f = 0; f < 6; f++) {
            var face = cubeFaces[f];
            face.zDepth = (proj[face.nodes[0]].pz + proj[face.nodes[1]].pz + proj[face.nodes[2]].pz + proj[face.nodes[3]].pz) / 4.0;
        }
        cubeFaces.sort(function(a, b) { return b.zDepth - a.zDepth; }); // Draw furthest first
        
        // Draw Slices
        System.createSprite(SW, sliceH);
        for (var slice = 0; slice < numSlices; slice++) {
            var sliceY = slice * sliceH;
            System.bindSprite(true);
            System.fillScreen(0x0000); // Clear slice buffer
            
            // Draw solid faces
            for (var f = 0; f < 6; f++) {
                var face = cubeFaces[f];
                var p0 = proj[face.nodes[0]];
                var p1 = proj[face.nodes[1]];
                var p2 = proj[face.nodes[2]];
                var p3 = proj[face.nodes[3]];
                
                // Basic bounding box culling against the slice
                var minY = Math.min(p0.py, p1.py, p2.py, p3.py);
                var maxY = Math.max(p0.py, p1.py, p2.py, p3.py);
                if (maxY >= sliceY && minY < sliceY + sliceH) {
                    // Draw face as two triangles
                    System.fillTriangle(p0.px, p0.py - sliceY, p1.px, p1.py - sliceY, p2.px, p2.py - sliceY, face.color);
                    System.fillTriangle(p0.px, p0.py - sliceY, p2.px, p2.py - sliceY, p3.px, p3.py - sliceY, face.color);
                }
            }

            // HUD on top slice
            if (slice === 0) {
                var t = updateTemps();
                System.setTextColor(0xFFFF, 0x0000);
                System.drawString("3D FPS: " + fps + " | Temp: " + Math.floor(t) + "C", 5, 5, 2);
            }

            System.bindSprite(false);
            System.pushSprite(0, sliceY);
        }
        System.deleteSprite();

        frames++;
        System.delay(1);
    }

    resultScore = Math.floor((frames * 1000) / durationMs);
    resultText = "Frames/sec (FPS)";
}

function drawResult() {
    System.fillScreen(0x0000);
    System.setTextColor(0x07E0, 0x0000);
    System.drawString("BENCHMARK COMPLETE", 10, 30, 4);

    System.setTextColor(0xFFFF, 0x0000);
    if (selectedBench === 0) System.drawString("Type: CPU & MATH", 20, 80, 2);
    else if (selectedBench === 1) System.drawString("Type: 2D GRAPHICS", 20, 80, 2);
    else if (selectedBench === 2) System.drawString("Type: 3D GRAPHICS", 20, 80, 2);

    System.setTextColor(0xF800, 0x0000);
    System.drawString("SCORE:", 20, 120, 4);

    System.setTextColor(0x07FF, 0x0000);
    System.drawString(resultScore + " " + resultText, 20, 150, 4);

    if (minT !== 999) {
        System.setTextColor(0xFFFF, 0x0000);
        System.drawString("Thermal Impact:", 20, 210, 2);
        System.setTextColor(0x001F, 0x0000);
        System.drawString("Min Temp: " + Math.floor(minT) + " C", 20, 230, 2);
        System.setTextColor(0xF800, 0x0000);
        System.drawString("Max Temp: " + Math.floor(maxT) + " C", 20, 250, 2);
    }

    System.setTextColor(0x7BEF, 0x0000);
    System.drawString("Tap to return", 60, 290, 2);
}

drawMenu();

while (true) {
    var t = System.getTouch();
    var isTapped = t.touched && !lastTouch;

    if (isTapped) {
        if (state === STATE_MENU) {
            var selected = -1;
            if (t.y >= 90 && t.y <= 135) selected = 0;
            else if (t.y >= 150 && t.y <= 195) selected = 1;
            else if (t.y >= 210 && t.y <= 255) selected = 2;

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
