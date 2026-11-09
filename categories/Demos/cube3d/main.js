// KryonOS 3D Cube Engine
// Solid Multi-Colored Live FPS (FastMath Hardware Accelerated)

var SW = System.screenWidth();
var SH = System.screenHeight();

var STATE_MENU = 0;
var STATE_PLAYING = 1;
var state = STATE_MENU;

// 3D Cube Vertices (x, y, z)
var vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1]
];

// Faces definition with distinct colors for a solid color cube
var faces = [
    { indices: [0, 1, 2, 3], color: RED },     // Front (Red)
    { indices: [5, 4, 7, 6], color: GREEN },   // Back (Green)
    { indices: [4, 5, 1, 0], color: BLUE },    // Top (Blue)
    { indices: [3, 2, 6, 7], color: YELLOW },  // Bottom (Yellow)
    { indices: [4, 0, 3, 7], color: MAGENTA }, // Left (Magenta)
    { indices: [1, 5, 6, 2], color: CYAN }     // Right (Cyan)
];

var angleX = 0;
var angleY = 0;
var angleZ = 0;

var lastTouchX = 0;
var lastTouchY = 0;
var isDragging = false;

// Pre-allocated vertex projection cache
var proj = [
    { px: 0, py: 0, pz: 0 },
    { px: 0, py: 0, pz: 0 },
    { px: 0, py: 0, pz: 0 },
    { px: 0, py: 0, pz: 0 },
    { px: 0, py: 0, pz: 0 },
    { px: 0, py: 0, pz: 0 },
    { px: 0, py: 0, pz: 0 },
    { px: 0, py: 0, pz: 0 }
];

// Pre-allocated face depth buffer
var processedFaces = [
    { p0: null, p1: null, p2: null, p3: null, color: RED, z: 0 },
    { p0: null, p1: null, p2: null, p3: null, color: GREEN, z: 0 },
    { p0: null, p1: null, p2: null, p3: null, color: BLUE, z: 0 },
    { p0: null, p1: null, p2: null, p3: null, color: YELLOW, z: 0 },
    { p0: null, p1: null, p2: null, p3: null, color: MAGENTA, z: 0 },
    { p0: null, p1: null, p2: null, p3: null, color: CYAN, z: 0 }
];

// Sliced double buffer allocated ONCE at startup
var sliceH = 32;
var numSlices = ((SH + sliceH - 1) / sliceH) | 0;
var useSprite = System.createSprite(SW, sliceH);

var halfSW = (SW * 0.5) | 0;
var halfSH = (SH * 0.5) | 0;
var minDim = (SW < SH) ? SW : SH;
var fov = (minDim * 0.62) | 0;
var dist = 3.5;

// Real-time FPS measurement tracking
var fpsFrameCount = 0;
var fpsLastTime = System.millis();
var currentFPS = 60;

function drawMenu() {
    System.fillScreen(BLACK);

    System.drawRect(10, 10, SW - 20, SH - 20, CYAN);
    System.drawRect(12, 12, SW - 24, SH - 24, BLUE);

    System.setTextColor(GREEN, BLACK);
    System.drawString("3D Cube", ((SW - 130) * 0.5) | 0, (SH * 0.18) | 0, 4);

    System.setTextColor(WHITE, BLACK);
    System.drawString("FastMath Hardware 3D", ((SW - 170) * 0.5) | 0, (SH * 0.32) | 0, 2);

    var btnW = 140;
    var btnH = 46;
    var btnX = ((SW - btnW) * 0.5) | 0;
    var btnY = (SH * 0.54) | 0;

    System.fillRoundRect(btnX, btnY, btnW, btnH, 8, RED);
    System.drawRoundRect(btnX, btnY, btnW, btnH, 8, WHITE);
    System.setTextColor(WHITE, RED);
    System.drawString("START", btnX + 34, btnY + 12, 4);

    System.setTextColor(DARKGREY, BLACK);
    System.drawString("Drag finger to rotate", ((SW - 160) * 0.5) | 0, (SH * 0.82) | 0, 2);
}

function draw3DFrame() {
    // Hardware FPU single-cycle trigonometry
    var sinX = FastMath.sin(angleX);
    var cosX = FastMath.cos(angleX);
    var sinY = FastMath.sin(angleY);
    var cosY = FastMath.cos(angleY);

    // Transform and project vertices using FastMath FPU calculations
    for (var i = 0; i < 8; i++) {
        var v = vertices[i];
        var x = v[0];
        var y = v[1];
        var z = v[2];

        // Rotate Y
        var x1 = x * cosY - z * sinY;
        var z1 = x * sinY + z * cosY;

        // Rotate X
        var y2 = y * cosX - z1 * sinX;
        var z2 = y * sinX + z1 * cosX;

        // Perspective Projection
        var zDist = z2 + dist;
        if (zDist < 0.1) zDist = 0.1;

        var p = proj[i];
        p.px = (halfSW + (x1 * fov) / zDist) | 0;
        p.py = (halfSH + (y2 * fov) / zDist) | 0;
        p.pz = zDist;
    }

    // Pre-calculate face properties for Painter's algorithm
    for (var i = 0; i < 6; i++) {
        var face = faces[i];
        var item = processedFaces[i];
        item.p0 = proj[face.indices[0]];
        item.p1 = proj[face.indices[1]];
        item.p2 = proj[face.indices[2]];
        item.p3 = proj[face.indices[3]];
        item.color = face.color;
        item.z = (item.p0.pz + item.p1.pz + item.p2.pz + item.p3.pz) * 0.25;
    }

    // Sort descending by zDist: furthest faces drawn first, closest faces drawn last
    processedFaces.sort(function (a, b) { return b.z - a.z; });

    // Sliced rendering pipeline for zero flicker
    for (var slice = 0; slice < numSlices; slice++) {
        var sliceY = slice * sliceH;

        if (useSprite) {
            System.bindSprite(true);
            System.fillScreen(BLACK);
        } else {
            System.fillRect(0, sliceY, SW, sliceH, BLACK);
        }

        // Title bar overlay with dynamic live FPS display
        if (slice === 0) {
            System.fillRect(0, 0, SW, 28, DARKGREY);
            System.setTextColor(CYAN, DARKGREY);
            System.drawString("3D Cube", 10, 6, 2);

            // Right-aligned actual FPS readout
            System.setTextColor(GREEN, DARKGREY);
            System.drawString("FPS: " + currentFPS, SW - 75, 6, 2);
        }

        // Draw all 6 faces in correct depth order
        for (var i = 0; i < 6; i++) {
            var f = processedFaces[i];

            var minY = f.p0.py;
            if (f.p1.py < minY) minY = f.p1.py;
            if (f.p2.py < minY) minY = f.p2.py;
            if (f.p3.py < minY) minY = f.p3.py;

            var maxY = f.p0.py;
            if (f.p1.py > maxY) maxY = f.p1.py;
            if (f.p2.py > maxY) maxY = f.p2.py;
            if (f.p3.py > maxY) maxY = f.p3.py;

            if (maxY >= sliceY && minY < sliceY + sliceH) {
                var yOffset = useSprite ? sliceY : 0;
                System.fillTriangle(
                    f.p0.px, f.p0.py - yOffset,
                    f.p1.px, f.p1.py - yOffset,
                    f.p2.px, f.p2.py - yOffset,
                    f.color
                );
                System.fillTriangle(
                    f.p0.px, f.p0.py - yOffset,
                    f.p2.px, f.p2.py - yOffset,
                    f.p3.px, f.p3.py - yOffset,
                    f.color
                );
            }
        }

        if (useSprite) {
            System.bindSprite(false);
            System.pushSprite(0, sliceY);
        }
    }
}

drawMenu();

while (true) {
    var frameStart = System.millis();
    var t = System.getTouch();

    if (t.touched && t.x < (SW - 40)) { // Avoid OS close button
        if (state === STATE_MENU) {
            var btnW = 140;
            var btnH = 46;
            var btnX = ((SW - btnW) * 0.5) | 0;
            var btnY = (SH * 0.54) | 0;

            if (t.x >= btnX && t.x <= (btnX + btnW) && t.y >= btnY && t.y <= (btnY + btnH)) {
                state = STATE_PLAYING;
                fpsLastTime = System.millis();
                fpsFrameCount = 0;
                System.delay(200); // Debounce
            }
        } else if (state === STATE_PLAYING) {
            if (!isDragging) {
                isDragging = true;
                lastTouchX = t.x;
                lastTouchY = t.y;
            } else {
                var dx = t.x - lastTouchX;
                var dy = t.y - lastTouchY;

                // Hardware FPU hypotenuse measurement
                var dragDist = FastMath.hypot(dx, dy);
                if (dragDist < 113.13) {
                    angleY += dx * 0.02;
                    angleX += dy * 0.02;
                }

                lastTouchX = t.x;
                lastTouchY = t.y;
            }
        }
    } else {
        isDragging = false;
    }

    if (state === STATE_PLAYING) {
        // Auto-rotation when not interacting
        if (!isDragging) {
            angleX += 0.035;
            angleY += 0.025;
            angleZ += 0.010;
        }

        // Hardware FastMath.TWO_PI normalization
        var PI2 = FastMath.TWO_PI;
        angleX = angleX % PI2;
        angleY = angleY % PI2;
        angleZ = angleZ % PI2;
        if (angleX < 0) angleX += PI2;
        if (angleY < 0) angleY += PI2;
        if (angleZ < 0) angleZ += PI2;

        draw3DFrame();

        // Calculate actual live FPS every 500ms
        fpsFrameCount++;
        var now = System.millis();
        var elapsed = now - fpsLastTime;
        if (elapsed >= 500) {
            currentFPS = ((fpsFrameCount * 1000) / elapsed) | 0;
            fpsFrameCount = 0;
            fpsLastTime = now;
        }
    }

    // Dynamic frame pacing target (~16.6ms per frame for up to 60+ FPS)
    var frameDuration = System.millis() - frameStart;
    if (frameDuration < 16) {
        System.delay(16 - frameDuration);
    } else {
        System.delay(1); // GC yield if frame took >= 16ms
    }
}