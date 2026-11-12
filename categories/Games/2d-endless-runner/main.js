// 2D Endless Runner
// Uses Sliced Rendering for 0% Flickering and Multi-Resolution Layout

(function () {
    var SW = System.screenWidth();
    var SH = System.screenHeight();
    var SLICE_H = 30;
    var SLICES = Math.ceil(SH / SLICE_H);

    // Allocate Sliced Double Buffer
    if (!System.createSprite(SW, SLICE_H)) {
        System.print("Error: Not enough memory for sprite buffer!");
        while (true) System.delay(100);
    }

    // Colors
    var C_BG = 0x18E3;
    var C_LANE = 0x2124;
    var C_PLAYER = 0x07FF;
    var C_TRAIN = 0xF800;
    var C_COIN = 0xFFE0;
    var C_TEXT = 0xFFFF;

    // Game States
    var STATE_MENU = 0;
    var STATE_PLAY = 1;
    var STATE_GAMEOVER = 2;
    var STATE_SETTINGS = 3;
    var currentState = STATE_MENU;

    var showFPS = false;
    var showTemp = false;

    // Responsive Lane & Player Geometry
    var lanes = [
        Math.floor(SW * 0.20),
        Math.floor(SW * 0.50),
        Math.floor(SW * 0.80)
    ];
    var sep1 = Math.floor(SW * 0.35);
    var sep2 = Math.floor(SW * 0.65);
    var playerLane = 1;
    var playerY = Math.floor(SH * 0.80);
    var playerBob = 0;

    var btnW = Math.min(180, SW - 60);
    var btnX = Math.floor((SW - btnW) / 2);
    var btnH = 36;

    var score = 0;
    var speed = 150;
    var distanceTraveled = 0;
    var entities = [];

    var lastTime = System.millis();
    var lastTouch = false;
    var fps = 0;
    var frames = 0;
    var lastFpsTime = System.millis();
    var spawnTimer = 0;

    function resetGame() {
        playerLane = 1;
        score = 0;
        speed = 150;
        distanceTraveled = 0;
        entities = [];
        spawnTimer = 0;
        lastTime = System.millis();
    }

    function update(dt) {
        var moveDist = speed * dt;
        distanceTraveled += moveDist;
        playerBob = Math.sin(System.millis() / 150.0) * 5;

        spawnTimer += dt;
        var spawnRate = 1.0 - (speed / 1000.0);
        if (spawnRate < 0.2) spawnRate = 0.2;

        if (spawnTimer > spawnRate) {
            spawnTimer = 0;
            var lane = Math.floor(Math.random() * 3);
            if (lane > 2) lane = 2;

            if (Math.random() > 0.3) {
                entities.push({ type: "train", lane: lane, y: -90, h: 72 });
            } else {
                entities.push({ type: "coin", lane: lane, y: -20, h: 20 });
            }
        }

        var pY = playerY - 20;
        var pH = 40;

        for (var i = entities.length - 1; i >= 0; i--) {
            var e = entities[i];
            e.y += moveDist;

            if (e.y > SH + 20) {
                entities.splice(i, 1);
                if (e.type === "train") score += 5;
                continue;
            }

            if (e.lane === playerLane) {
                if (e.type === "train") {
                    if (pY < e.y + e.h && pY + pH > e.y) {
                        currentState = STATE_GAMEOVER;
                    }
                } else if (e.type === "coin") {
                    if (pY < e.y + 10 && pY + pH > e.y - 10) {
                        score += 50;
                        entities.splice(i, 1);
                    }
                }
            }
        }

        speed += dt * 5.0;
    }

    function drawSlice(sliceY) {
        System.bindSprite(true);
        System.fillScreen(C_BG);

        var trackOffset = Math.floor(distanceTraveled) % 40;
        for (var y = -40; y < SH; y += 40) {
            var realY = y + trackOffset;
            if (realY + 20 >= sliceY && realY < sliceY + SLICE_H) {
                System.fillRect(sep1 - 2, realY - sliceY, 4, 20, C_LANE);
                System.fillRect(sep2 - 2, realY - sliceY, 4, 20, C_LANE);
            }
        }

        if (currentState === STATE_PLAY) {
            for (var i = 0; i < entities.length; i++) {
                var e = entities[i];
                if (e.y + e.h >= sliceY && e.y < sliceY + SLICE_H) {
                    var ex = lanes[e.lane];
                    if (e.type === "train") {
                        System.fillRoundRect(ex - 26, e.y - sliceY, 52, e.h, 5, C_TRAIN);
                        System.fillRect(ex - 21, e.y - sliceY + 5, 42, 14, 0x0000);
                    } else if (e.type === "coin") {
                        System.fillCircle(ex, e.y - sliceY, 14, C_COIN);
                        System.fillCircle(ex, e.y - sliceY, 9, 0xFEA0);
                    }
                }
            }

            if (playerY + 28 >= sliceY && playerY - 22 < sliceY + SLICE_H) {
                var px = lanes[playerLane];
                var py = playerY + playerBob;
                System.fillRoundRect(px - 15, py - sliceY - 10, 30, 40, 8, 0x0000);
                System.fillRoundRect(px - 15, py - sliceY - 15, 30, 40, 8, C_PLAYER);
                System.fillCircle(px, py - sliceY + 20, 8, 0x07FF);
            }

            if (sliceY === 0) {
                System.setTextColor(C_TEXT, C_BG);
                System.drawString("SCORE: " + score, 10, 10, 2);
            }
        } else if (currentState === STATE_MENU) {
            var titleBob = Math.sin(System.millis() / 200.0) * 6;
            var titleY = Math.floor(SH * 0.14);
            var startY = Math.floor(SH * 0.54);
            var setY = startY + btnH + 12;

            System.setTextColor(0x07FF, C_BG);
            System.drawString("NEON", Math.floor((SW - 72) / 2), titleY + titleBob - sliceY, 4);
            System.drawString("SURFER", Math.floor((SW - 108) / 2), titleY + 38 + titleBob - sliceY, 4);

            System.fillRoundRect(btnX, startY - sliceY, btnW, btnH, 5, 0x07E0);
            System.setTextColor(0x0000, 0x07E0);
            System.drawString("START GAME", Math.floor((SW - 90) / 2), startY + 10 - sliceY, 2);

            System.fillRoundRect(btnX, setY - sliceY, btnW, btnH, 5, 0x7BEF);
            System.setTextColor(0x0000, 0x7BEF);
            System.drawString("SETTINGS", Math.floor((SW - 72) / 2), setY + 10 - sliceY, 2);
        } else if (currentState === STATE_SETTINGS) {
            var y1 = Math.floor(SH * 0.28);
            var y2 = y1 + btnH + 12;
            var y3 = y2 + btnH + 16;

            System.setTextColor(C_TEXT, C_BG);
            System.drawString("SETTINGS", Math.floor((SW - 120) / 2), Math.floor(SH * 0.08) - sliceY, 4);

            System.fillRoundRect(btnX, y1 - sliceY, btnW, btnH, 5, showFPS ? 0x07E0 : 0x7BEF);
            System.setTextColor(0x0000, showFPS ? 0x07E0 : 0x7BEF);
            System.drawString("FPS: " + (showFPS ? "ON" : "OFF"), btnX + 20, y1 + 10 - sliceY, 2);

            System.fillRoundRect(btnX, y2 - sliceY, btnW, btnH, 5, showTemp ? 0x07E0 : 0x7BEF);
            System.setTextColor(0x0000, showTemp ? 0x07E0 : 0x7BEF);
            System.drawString("Temp: " + (showTemp ? "ON" : "OFF"), btnX + 20, y2 + 10 - sliceY, 2);

            System.fillRoundRect(btnX, y3 - sliceY, btnW, btnH, 5, 0xF800);
            System.setTextColor(0x0000, 0xF800);
            System.drawString("BACK", Math.floor((SW - 36) / 2), y3 + 10 - sliceY, 2);
        } else if (currentState === STATE_GAMEOVER) {
            var gy = Math.floor(SH * 0.28);
            var againY = Math.floor(SH * 0.66);

            System.setTextColor(0xF800, C_BG);
            System.drawString("CRASHED!", Math.floor((SW - 130) / 2), gy - sliceY, 4);

            System.setTextColor(C_TEXT, C_BG);
            System.drawString("FINAL SCORE: " + score, Math.floor((SW - 130) / 2), gy + 44 - sliceY, 2);

            System.fillRoundRect(btnX, againY - sliceY, btnW, btnH, 5, 0x07E0);
            System.setTextColor(0x0000, 0x07E0);
            System.drawString("PLAY AGAIN", Math.floor((SW - 90) / 2), againY + 10 - sliceY, 2);
        }

        if (sliceY === 0) {
            if (showFPS) {
                System.setTextColor(0xFFE0, C_BG);
                System.drawString("FPS:" + fps, SW - 105, 10, 2);
            }
            if (showTemp && System.hasTemperatureSensor()) {
                System.setTextColor(0x07FF, C_BG);
                System.drawString(System.getTemperature().toFixed(1) + "C", SW - 105, 28, 2);
            }
        }

        System.bindSprite(false);
        System.pushSprite(0, sliceY);
    }

    function handleInput() {
        var t = System.getTouch();

        if (t.touched && t.y <= 40 && t.x >= SW - 40) {
            return true;
        }

        if (t.touched && !lastTouch) {
            if (currentState === STATE_MENU) {
                var startY = Math.floor(SH * 0.54);
                var setY = startY + btnH + 12;
                if (t.x >= btnX && t.x <= btnX + btnW) {
                    if (t.y >= startY && t.y <= startY + btnH) {
                        resetGame();
                        currentState = STATE_PLAY;
                    } else if (t.y >= setY && t.y <= setY + btnH) {
                        currentState = STATE_SETTINGS;
                    }
                }
            } else if (currentState === STATE_SETTINGS) {
                var y1 = Math.floor(SH * 0.28);
                var y2 = y1 + btnH + 12;
                var y3 = y2 + btnH + 16;
                if (t.x >= btnX && t.x <= btnX + btnW) {
                    if (t.y >= y1 && t.y <= y1 + btnH) showFPS = !showFPS;
                    else if (t.y >= y2 && t.y <= y2 + btnH) showTemp = !showTemp;
                    else if (t.y >= y3 && t.y <= y3 + btnH) currentState = STATE_MENU;
                }
            } else if (currentState === STATE_PLAY) {
                if (t.x < SW / 2) {
                    if (playerLane > 0) playerLane--;
                } else {
                    if (playerLane < 2) playerLane++;
                }
            } else if (currentState === STATE_GAMEOVER) {
                var againY = Math.floor(SH * 0.66);
                if (t.x >= btnX && t.x <= btnX + btnW && t.y >= againY && t.y <= againY + btnH) {
                    resetGame();
                    currentState = STATE_PLAY;
                }
            }
        }
        lastTouch = t.touched;
        return false;
    }

    while (true) {
        var now = System.millis();
        var dt = (now - lastTime) / 1000.0;
        lastTime = now;
        if (dt > 0.1) dt = 0.1;

        if (handleInput()) break;

        if (currentState === STATE_PLAY) {
            update(dt);
        }

        for (var slice = 0; slice < SLICES; slice++) {
            drawSlice(slice * SLICE_H);
        }

        frames++;
        if (now - lastFpsTime >= 1000) {
            fps = frames;
            frames = 0;
            lastFpsTime = now;
        }

        System.delay(1);
    }

    System.deleteSprite();
    System.fillScreen(0x0000);
})();
