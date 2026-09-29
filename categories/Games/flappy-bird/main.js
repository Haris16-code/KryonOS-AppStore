// ==============================================================================
//  KryonOS Flappy Bird - Ultimate Arcade Edition
//  KryonOS v2.0.0 (API Level 2)
//  Features: Kryon3D Hardware Acceleration, FastMath Physics, Multiple Skins,
//            Game Modes, Sound FX, Medals, Power-Ups, and Persistent Storage.
// ==============================================================================

(function() {
    "use strict";

    // --------------------------------------------------------------------------
    // 1. HARDWARE CONSTANTS & DISPLAY SETUP
    // --------------------------------------------------------------------------
    var SCREEN_W = 240;
    var SCREEN_H = 320;
    var BUZZER_PIN = 19;
    var SAVE_FILE = "/local/flappy_save.json";

    // 16-bit RGB565 Color Palette
    var COLOR_BLACK       = 0x0000;
    var COLOR_WHITE       = 0xFFFF;
    var COLOR_GRAY        = 0x7BEF;
    var COLOR_DARK_GRAY   = 0x2104;
    var COLOR_CARD_BG     = 0x18C3;
    var COLOR_CARD_BORDER = 0x39E7;

    // Sky Gradients
    var COLOR_SKY_DAY     = 0x4DDF; // Bright Cyan Blue
    var COLOR_SKY_SUNSET  = 0xFA60; // Sunset Orange/Peach
    var COLOR_SKY_NIGHT   = 0x08A9; // Deep Midnight Navy
    var COLOR_CLOUD_WHITE = 0xFFFF;
    var COLOR_CLOUD_SHADOW= 0xCE59;

    // Scenery Colors
    var COLOR_HILL_FAR    = 0x34A7;
    var COLOR_HILL_NEAR   = 0x2424;
    var COLOR_GROUND_TOP  = 0x4EE3; // Bright Grass
    var COLOR_GROUND_BODY = 0xCE52; // Warm Sand / Dirt
    var COLOR_GROUND_DARK = 0x948E;

    // Pipe Colors
    var COLOR_PIPE_BODY   = 0x4DE4;
    var COLOR_PIPE_DARK   = 0x1402;
    var COLOR_PIPE_LIGHT  = 0x87EC;
    var COLOR_PIPE_BORDER = 0x0280;

    // UI & Accents
    var COLOR_GOLD        = 0xFE60;
    var COLOR_COIN_EDGE   = 0xD340;
    var COLOR_RED         = 0xF800;
    var COLOR_ORANGE      = 0xFD20;
    var COLOR_CYAN        = 0x07FF;
    var COLOR_PURPLE      = 0x915C;
    var COLOR_GREEN_BTN   = 0x2664;
    var COLOR_BLUE_BTN    = 0x1B3F;

    // Medals
    var COLOR_BRONZE      = 0xCD08;
    var COLOR_SILVER      = 0xD6BA;
    var COLOR_PLATINUM    = 0x87DF;

    // --------------------------------------------------------------------------
    // 2. FASTMATH ENGINE BINDINGS & FALLBACKS
    // --------------------------------------------------------------------------
    var FM = {
        sin: function(rad) {
            return (typeof FastMath !== "undefined" && FastMath.sin) ? FastMath.sin(rad) : Math.sin(rad);
        },
        cos: function(rad) {
            return (typeof FastMath !== "undefined" && FastMath.cos) ? FastMath.cos(rad) : Math.cos(rad);
        },
        fastSin: function(deg) {
            if (typeof FastMath !== "undefined" && FastMath.fastSin) {
                var d = Math.floor(deg) % 360;
                if (d < 0) d += 360;
                return FastMath.fastSin(d);
            }
            return Math.sin(deg * 0.01745329251);
        },
        fastCos: function(deg) {
            if (typeof FastMath !== "undefined" && FastMath.fastCos) {
                var d = Math.floor(deg) % 360;
                if (d < 0) d += 360;
                return FastMath.fastCos(d);
            }
            return Math.cos(deg * 0.01745329251);
        },
        clamp: function(val, min, max) {
            if (typeof FastMath !== "undefined" && FastMath.clamp) return FastMath.clamp(val, min, max);
            return Math.max(min, Math.min(max, val));
        },
        lerp: function(a, b, t) {
            if (typeof FastMath !== "undefined" && FastMath.lerp) return FastMath.lerp(a, b, t);
            return a + (b - a) * t;
        },
        random: function() {
            if (typeof FastMath !== "undefined" && FastMath.random) return FastMath.random();
            return Math.random();
        },
        randomRange: function(min, max) {
            if (typeof FastMath !== "undefined" && FastMath.randomRange) return FastMath.randomRange(min, max);
            return min + Math.random() * (max - min);
        },
        hypot: function(dx, dy) {
            if (typeof FastMath !== "undefined" && FastMath.hypot) return FastMath.hypot(dx, dy);
            return Math.sqrt(dx * dx + dy * dy);
        }
    };

    // --------------------------------------------------------------------------
    // 3. KRYON3D DOUBLE-BUFFERING & COMPOSITE RENDERER
    // --------------------------------------------------------------------------
    var hasKryon3D = false;
    var hasSprite = false;

    // Attempt 3D Double Buffer allocation
    if (typeof Kryon3D !== "undefined" && Kryon3D.begin) {
        try {
            if (Kryon3D.begin(SCREEN_W, SCREEN_H, 16)) {
                hasKryon3D = true;
            } else if (Kryon3D.begin(SCREEN_W, SCREEN_H, 8)) {
                hasKryon3D = true;
            }
            if (hasKryon3D) {
                if (Kryon3D.setCamera) Kryon3D.setCamera(0, 0, -4.5, 0, 0, 0, 60);
                if (Kryon3D.setLight) Kryon3D.setLight(0.5, 1.0, -0.7, 0.3, 0.7);
            }
        } catch (e3d) {
            hasKryon3D = false;
        }
    }

    // Fallback to Sprite Double Buffering if Kryon3D is unavailable
    if (!hasKryon3D && typeof System.createSprite === "function") {
        try {
            if (System.createSprite(SCREEN_W, SCREEN_H)) {
                hasSprite = true;
                System.bindSprite(true);
            }
        } catch (es) {
            hasSprite = false;
        }
    }

    var useDoubleBuffer = (hasKryon3D || hasSprite);

    var Renderer = {
        is3D: hasKryon3D,
        isDoubleBuffered: useDoubleBuffer,
        clear: function(color) {
            if (hasKryon3D) {
                Kryon3D.clear(color);
            } else if (hasSprite) {
                System.fillScreen(color);
            }
            // In direct-to-glass mode, clear() does NOT call fillScreen!
            // This completely eliminates screen flashing.
        },
        present: function() {
            if (hasKryon3D) {
                Kryon3D.render(0, 0);
            } else if (hasSprite) {
                System.pushSprite(0, 0);
            }
        },
        end: function() {
            if (hasKryon3D) {
                Kryon3D.end();
            } else if (hasSprite) {
                System.deleteSprite();
            }
        }
    };

    // --------------------------------------------------------------------------
    // 4. AUDIO ENGINE (PWM / PIEZO BUZZER)
    // --------------------------------------------------------------------------
    var Sound = {
        enabled: true,
        playTone: function(freq, durationMs) {
            if (!this.enabled) return;
            try {
                if (typeof PWM !== "undefined" && PWM.setTone) {
                    PWM.setTone(BUZZER_PIN, freq, durationMs);
                } else if (typeof System.pwm !== "undefined" && System.pwm.setTone) {
                    System.pwm.setTone(BUZZER_PIN, freq, durationMs);
                }
            } catch (err) {}
        },
        flap: function() {
            this.playTone(520, 35);
        },
        score: function() {
            this.playTone(1046, 60);
        },
        coin: function() {
            this.playTone(1318, 50);
        },
        hit: function() {
            this.playTone(180, 100);
        },
        powerup: function() {
            this.playTone(880, 70);
        },
        medal: function() {
            this.playTone(1568, 150);
        },
        click: function() {
            this.playTone(900, 15);
        }
    };

    // --------------------------------------------------------------------------
    // 5. DATA STORAGE & PERSISTENCE (FS API)
    // --------------------------------------------------------------------------
    var Storage = {
        data: {
            highScore: 0,
            totalCoins: 0,
            gamesPlayed: 0,
            soundEnabled: true,
            selectedSkin: 0,
            selectedMode: 0, // 0: Classic, 1: Hardcore, 2: Gravity Flip, 3: Coin Rush
            use3DGraphics: true,
            showFPS: true,
            unlockedSkins: [1, 0, 0, 0, 0] // Bit 1 = unlocked
        },
        load: function() {
            try {
                if (typeof FS !== "undefined" && FS.exists && FS.exists(SAVE_FILE)) {
                    var content = FS.readTextFile(SAVE_FILE);
                    if (content) {
                        var parsed = JSON.parse(content);
                        if (parsed.highScore !== undefined) this.data.highScore = parsed.highScore;
                        if (parsed.totalCoins !== undefined) this.data.totalCoins = parsed.totalCoins;
                        if (parsed.gamesPlayed !== undefined) this.data.gamesPlayed = parsed.gamesPlayed;
                        if (parsed.soundEnabled !== undefined) this.data.soundEnabled = parsed.soundEnabled;
                        if (parsed.selectedSkin !== undefined) this.data.selectedSkin = parsed.selectedSkin;
                        if (parsed.selectedMode !== undefined) this.data.selectedMode = parsed.selectedMode;
                        if (parsed.use3DGraphics !== undefined) this.data.use3DGraphics = parsed.use3DGraphics;
                        if (parsed.showFPS !== undefined) this.data.showFPS = parsed.showFPS;
                        if (parsed.unlockedSkins !== undefined) this.data.unlockedSkins = parsed.unlockedSkins;
                        Sound.enabled = this.data.soundEnabled;
                    }
                }
            } catch (e) {}
        },
        save: function() {
            try {
                if (typeof FS !== "undefined" && FS.writeTextFile) {
                    FS.writeTextFile(SAVE_FILE, JSON.stringify(this.data));
                }
            } catch (e) {}
        }
    };

    Storage.load();

    // --------------------------------------------------------------------------
    // 6. GAME DEFINITIONS & ASSETS
    // --------------------------------------------------------------------------
    var GAME_MODES = [
        { id: 0, name: "CLASSIC", desc: "Original pipes, pure skill" },
        { id: 1, name: "HARDCORE", desc: "Fast speed, moving pipes!" },
        { id: 2, name: "GRAVITY FLIP", desc: "Tap reverses gravity!" },
        { id: 3, name: "COIN RUSH", desc: "Rich coins & double shield" }
    ];

    var SKINS = [
        { id: 0, name: "Goldie", price: 0, color: 0xFFE0, wing: 0xFD20, beak: 0xF800, eye: 0x0000 },
        { id: 1, name: "Cyber Neon", price: 20, color: 0x07FF, wing: 0xF81F, beak: 0x07E0, eye: 0xFFFF },
        { id: 2, name: "Phoenix", price: 50, color: 0xF800, wing: 0xFE60, beak: 0xFFE0, eye: 0xFFFF },
        { id: 3, name: "Shadow Bat", price: 80, color: 0x2965, wing: 0x7993, beak: 0xC618, eye: 0xF800 },
        { id: 4, name: "Mecha 3D", price: 120, color: 0xD6BA, wing: 0x8410, beak: 0x07FF, eye: 0x07FF }
    ];

    var STATES = {
        MENU: 0,
        MODES: 1,
        SKINS: 2,
        STATS: 3,
        SETTINGS: 4,
        READY: 5,
        PLAYING: 6,
        PAUSED: 7,
        GAMEOVER: 8
    };

    var currentState = STATES.MENU;
    var stateNeedsRedraw = true;
    var hudPrevScore = -1;
    var hudPrevCoins = -1;
    var prevSkyColor = -1;

    function changeState(newState) {
        currentState = newState;
        touchState.justPressed = false;
        touchState.touched = false;
        stateNeedsRedraw = true;
        hudPrevScore = -1;
        hudPrevCoins = -1;
    }

    // --------------------------------------------------------------------------
    // 7. GAME ENTITIES & OBJECT POOLS
    // --------------------------------------------------------------------------
    var bird = {
        x: 60,
        y: 130,
        prevX: 60,
        prevY: 130,
        prevAngle: 0,
        vy: 0,
        angleDeg: 0,
        flapTimer: 0,
        flapCooldown: 0,
        rotDelay: 0,
        gravityDir: 1, // 1 for normal, -1 for reverse gravity
        shieldActive: false,
        shieldTimer: 0,
        slowMoActive: false,
        slowMoTimer: 0,
        doublePoints: false,
        doubleTimer: 0,
        reset: function() {
            this.x = 60;
            this.y = 130;
            this.prevX = 60;
            this.prevY = 130;
            this.prevAngle = 0;
            this.vy = 0;
            this.angleDeg = 0;
            this.flapTimer = 0;
            this.flapCooldown = 0;
            this.rotDelay = 0;
            this.gravityDir = (Storage.data.selectedMode === 2) ? 1 : 1;
            this.shieldActive = false;
            this.shieldTimer = 0;
            this.slowMoActive = false;
            this.slowMoTimer = 0;
            this.doublePoints = false;
            this.doubleTimer = 0;
        }
    };

    // Pre-allocated pipe pairs
    var MAX_PIPES = 3;
    var pipes = [];
    for (var p = 0; p < MAX_PIPES; p++) {
        pipes.push({
            active: false,
            x: 0,
            prevX: -999,
            gapY: 0,
            gapH: 78,
            width: 36,
            passed: false,
            coinPresent: false,
            coinY: 0,
            coinCollected: false,
            powerUp: null, // 'shield', 'slowmo', 'double'
            powerUpCollected: false,
            oscSpeed: 0,
            oscTime: 0
        });
    }

    // Pre-allocated particle pool
    var MAX_PARTICLES = 30;
    var particles = [];
    for (var pt = 0; pt < MAX_PARTICLES; pt++) {
        particles.push({
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            life: 0,
            maxLife: 20,
            color: COLOR_WHITE,
            size: 2
        });
    }

    function spawnParticle(x, y, vx, vy, color, size, life) {
        for (var i = 0; i < MAX_PARTICLES; i++) {
            if (!particles[i].active) {
                particles[i].active = true;
                particles[i].x = x;
                particles[i].y = y;
                particles[i].vx = vx;
                particles[i].vy = vy;
                particles[i].color = color;
                particles[i].size = size || 2;
                particles[i].life = life || 15;
                particles[i].maxLife = particles[i].life;
                break;
            }
        }
    }

    function spawnFeatherBurst(x, y, color) {
        for (var i = 0; i < 6; i++) {
            var angle = FM.randomRange(0, 6.28);
            var speed = FM.randomRange(1.0, 3.2);
            spawnParticle(x, y, FM.cos(angle) * speed, FM.sin(angle) * speed, color, 2, 18);
        }
    }

    function spawnCoinSparkles(x, y) {
        for (var i = 0; i < 8; i++) {
            var angle = FM.randomRange(0, 6.28);
            var speed = FM.randomRange(1.5, 4.0);
            spawnParticle(x, y, FM.cos(angle) * speed, FM.sin(angle) * speed, COLOR_GOLD, 2, 20);
        }
    }

    // --------------------------------------------------------------------------
    // 8. SCENERY & ENVIRONMENT STATE
    // --------------------------------------------------------------------------
    var groundScrollX = 0;
    var cloudScrollX = 0;
    var globalTime = 0;
    var currentScore = 0;
    var coinsEarnedThisRun = 0;
    var isNewRecord = false;
    var medalEarned = "None";
    var screenShakeTimer = 0;

    // Real-Time 60 FPS Measurement
    var fpsCount = 0;
    var fpsLastTime = 0;
    var currentFPS = 60;

    // --------------------------------------------------------------------------
    // 9. TOUCH INPUT SYSTEM (Hardware Contact Debounced)
    // --------------------------------------------------------------------------
    var touchState = {
        touched: false,
        justPressed: false,
        justReleased: false,
        x: 0,
        y: 0,
        prevTouched: false,
        touchHoldFrames: 0,
        update: function() {
            var t = System.getTouch();
            var currTouched = (t && t.touched && t.x > 0 && t.y > 0);
            this.x = t ? t.x : 0;
            this.y = t ? t.y : 0;

            if (currTouched) {
                this.touchHoldFrames++;
                // Register as fresh press strictly on frame 1 of contact
                this.justPressed = (this.touchHoldFrames === 1);
            } else {
                this.justPressed = false;
                this.touchHoldFrames = 0;
            }

            this.justReleased = (!currTouched && this.prevTouched);
            this.touched = currTouched;
            this.prevTouched = currTouched;
        }
    };

    function isTouchInRect(rx, ry, rw, rh) {
        if (!touchState.justPressed) return false;
        return (touchState.x >= rx && touchState.x <= rx + rw &&
                touchState.y >= ry && touchState.y <= ry + rh);
    }

    // --------------------------------------------------------------------------
    // 10. GRAPHICS & DRAWING HELPERS
    // --------------------------------------------------------------------------
    function getSkyColor(score) {
        var cycle = Math.floor(score / 15) % 3;
        if (cycle === 0) return COLOR_SKY_DAY;
        if (cycle === 1) return COLOR_SKY_SUNSET;
        return COLOR_SKY_NIGHT;
    }

    function drawButton(x, y, w, h, text, bgCol, borderCol, textCol, font) {
        var isPressed = (touchState.touched &&
                         touchState.x >= x && touchState.x <= x + w &&
                         touchState.y >= y && touchState.y <= y + h);

        var actualBg = isPressed ? COLOR_WHITE : bgCol;
        var actualText = isPressed ? COLOR_BLACK : (textCol || COLOR_WHITE);

        System.fillRoundRect(x, y, w, h, 6, actualBg);
        System.drawRoundRect(x, y, w, h, 6, borderCol || COLOR_WHITE);
        System.drawRoundRect(x + 1, y + 1, w - 2, h - 2, 5, borderCol || COLOR_WHITE);

        // Center text calculation
        var f = font || 2;
        var charW = (f === 1) ? 6 : (f === 2) ? 10 : 16;
        var textW = text.length * charW;
        var tx = x + Math.floor((w - textW) / 2);
        var ty = y + Math.floor((h - ((f === 1) ? 8 : (f === 2) ? 14 : 24)) / 2);

        System.setTextColor(actualText);
        System.drawString(text, Math.max(x + 4, tx), ty, f);
    }

    function drawCard(x, y, w, h, title) {
        System.fillRoundRect(x, y, w, h, 8, COLOR_CARD_BG);
        System.drawRoundRect(x, y, w, h, 8, COLOR_CARD_BORDER);
        System.drawRoundRect(x + 1, y + 1, w - 2, h - 2, 7, COLOR_CARD_BORDER);

        if (title) {
            System.fillRoundRect(x + 10, y - 8, title.length * 10 + 16, 16, 4, COLOR_BLUE_BTN);
            System.drawRoundRect(x + 10, y - 8, title.length * 10 + 16, 16, 4, COLOR_CYAN);
            System.setTextColor(COLOR_WHITE);
            System.drawString(title, x + 18, y - 6, 2);
        }
    }

    // Paint the complete background once when entering state or when sky changes
    function renderFullBackground(skyColor) {
        System.fillScreen(skyColor);

        // Distant mountain skyline
        System.fillTriangle(0, 275, 55, 230, 110, 275, COLOR_HILL_FAR);
        System.fillTriangle(90, 275, 160, 220, 230, 275, COLOR_HILL_FAR);
        System.fillTriangle(190, 275, 240, 235, 290, 275, COLOR_HILL_FAR);
        System.fillTriangle(40, 275, 95, 245, 150, 275, COLOR_HILL_NEAR);
        System.fillTriangle(140, 275, 195, 240, 250, 275, COLOR_HILL_NEAR);

        // Drifting Clouds
        drawCloud(20, 48, 48);
        drawCloud(140, 82, 38);

        // Ground
        var groundY = 275;
        System.fillRect(0, groundY, SCREEN_W, 5, COLOR_GROUND_TOP);
        System.fillRect(0, groundY + 5, SCREEN_W, SCREEN_H - groundY - 5, COLOR_GROUND_BODY);
        System.drawFastHLine(0, groundY + 5, SCREEN_W, COLOR_GROUND_DARK);
    }

    // Draw Parallax Scenery (Zero-Flicker: only draws in double buffer mode)
    function renderBackground(skyColor) {
        if (Renderer.isDoubleBuffered) {
            Renderer.clear(skyColor);
            System.fillTriangle(0, 275, 55, 230, 110, 275, COLOR_HILL_FAR);
            System.fillTriangle(90, 275, 160, 220, 230, 275, COLOR_HILL_FAR);
            System.fillTriangle(190, 275, 240, 235, 290, 275, COLOR_HILL_FAR);
            System.fillTriangle(40, 275, 95, 245, 150, 275, COLOR_HILL_NEAR);
            System.fillTriangle(140, 275, 195, 240, 250, 275, COLOR_HILL_NEAR);
            var cx1 = Math.floor((cloudScrollX * 0.4) % (SCREEN_W + 60)) - 35;
            var cx2 = Math.floor((cloudScrollX * 0.4 + 130) % (SCREEN_W + 60)) - 35;
            drawCloud(cx1, 48, 48);
            drawCloud(cx2, 82, 38);
            var groundY = 275;
            System.fillRect(0, groundY, SCREEN_W, 5, COLOR_GROUND_TOP);
            System.fillRect(0, groundY + 5, SCREEN_W, SCREEN_H - groundY - 5, COLOR_GROUND_BODY);
            System.drawFastHLine(0, groundY + 5, SCREEN_W, COLOR_GROUND_DARK);
        }
    }

    function drawCloud(x, y, w) {
        System.fillRoundRect(x, y, w, 14, 6, COLOR_CLOUD_WHITE);
        System.fillRoundRect(x + 8, y - 6, w - 16, 12, 5, COLOR_CLOUD_WHITE);
    }

    // Procedural Bird Renderer with Rotation & Flapping (Fast LUT Trigonometry)
    function renderBird(bx, by, angleDeg, flapFrame, skinIndex, hasShield) {
        var s = SKINS[skinIndex] || SKINS[0];

        // Wing vertical offset based on flap frame (0: up, 1: mid, 2: down)
        var wingY = (flapFrame === 0) ? -4 : (flapFrame === 1) ? 0 : 3;

        // Ultra-fast Hardware LUT Trigonometry (zero CPU floating-point overhead)
        var cosA = FM.fastCos(angleDeg);
        var sinA = FM.fastSin(angleDeg);

        // Body Oval
        System.fillCircle(bx, by, 10, s.color);
        System.fillRoundRect(bx - 10, by - 7, 18, 14, 4, s.color);

        // Belly Patch
        System.fillCircle(bx - 3, by + 3, 6, COLOR_WHITE);

        // Eye
        var eyeX = bx + Math.floor(cosA * 4 - sinA * -3);
        var eyeY = by + Math.floor(sinA * 4 + cosA * -3);
        System.fillCircle(eyeX, eyeY, 3, COLOR_WHITE);
        System.fillCircle(eyeX + 1, eyeY, 1, s.eye);

        // Beak
        var beakX = bx + Math.floor(cosA * 9);
        var beakY = by + Math.floor(sinA * 9);
        System.fillTriangle(beakX, beakY - 3, beakX + 6, beakY, beakX, beakY + 3, s.beak);

        // Wing
        var wingX = bx - 5;
        var wy = by + wingY;
        System.fillRoundRect(wingX - 4, wy - 3, 10, 6, 2, s.wing);
        System.drawRoundRect(wingX - 4, wy - 3, 10, 6, 2, COLOR_DARK_GRAY);

        // Tail
        System.fillTriangle(bx - 11, by - 2, bx - 16, by - 6, bx - 11, by + 3, s.wing);

        // Shield Aura
        if (hasShield) {
            var pulse = Math.floor(FM.fastSin(globalTime * 15) * 2);
            System.drawCircle(bx, by, 15 + pulse, COLOR_CYAN);
            System.drawCircle(bx, by, 16 + pulse, COLOR_WHITE);
        }
    }

    // High-Performance 60FPS Hardware-Accelerated Shaded Pipes
    function renderPipe(p) {
        var capH = 14;
        var lip = 4;
        var x = p.x;
        var w = p.width;
        var topH = p.gapY - Math.floor(p.gapH / 2);
        var botY = p.gapY + Math.floor(p.gapH / 2);
        var botH = 275 - botY;

        // TOP PIPE
        if (topH > capH) {
            var topBodyH = topH - capH;
            System.fillRect(x, 0, w, topBodyH, COLOR_PIPE_BODY);
            System.drawFastVLine(x + 2, 0, topBodyH, COLOR_PIPE_LIGHT);
            System.drawFastVLine(x + 3, 0, topBodyH, COLOR_PIPE_LIGHT);
            System.fillRect(x + w - 5, 0, 5, topBodyH, COLOR_PIPE_DARK);
            System.drawRect(x, 0, w, topBodyH, COLOR_PIPE_BORDER);

            // Top Pipe Lip Cap with 3D Bevel
            System.fillRoundRect(x - lip, topBodyH, w + lip * 2, capH, 2, COLOR_PIPE_BODY);
            System.drawFastVLine(x - lip + 2, topBodyH, capH, COLOR_PIPE_LIGHT);
            System.drawFastVLine(x - lip + 3, topBodyH, capH, COLOR_PIPE_LIGHT);
            System.fillRect(x + w + lip - 6, topBodyH, 5, capH, COLOR_PIPE_DARK);
            System.drawRoundRect(x - lip, topBodyH, w + lip * 2, capH, 2, COLOR_PIPE_BORDER);
        }

        // BOTTOM PIPE
        if (botH > capH) {
            // Bottom Pipe Lip Cap with 3D Bevel
            System.fillRoundRect(x - lip, botY, w + lip * 2, capH, 2, COLOR_PIPE_BODY);
            System.drawFastVLine(x - lip + 2, botY, capH, COLOR_PIPE_LIGHT);
            System.drawFastVLine(x - lip + 3, botY, capH, COLOR_PIPE_LIGHT);
            System.fillRect(x + w + lip - 6, botY, 5, capH, COLOR_PIPE_DARK);
            System.drawRoundRect(x - lip, botY, w + lip * 2, capH, 2, COLOR_PIPE_BORDER);

            // Bottom Pipe Body
            var botBodyH = botH - capH;
            var botBodyY = botY + capH;
            System.fillRect(x, botBodyY, w, botBodyH, COLOR_PIPE_BODY);
            System.drawFastVLine(x + 2, botBodyY, botBodyH, COLOR_PIPE_LIGHT);
            System.drawFastVLine(x + 3, botBodyY, botBodyH, COLOR_PIPE_LIGHT);
            System.fillRect(x + w - 5, botBodyY, 5, botBodyH, COLOR_PIPE_DARK);
            System.drawRect(x, botBodyY, w, botBodyH, COLOR_PIPE_BORDER);
        }

        // Render Coin inside Pipe Gap
        if (p.coinPresent && !p.coinCollected) {
            var coinW = Math.max(2, Math.floor(Math.abs(FM.fastCos(globalTime * 6)) * 7));
            System.fillRoundRect(x + Math.floor(w / 2) - coinW, p.coinY - 7, coinW * 2, 14, 3, COLOR_GOLD);
            System.drawRoundRect(x + Math.floor(w / 2) - coinW, p.coinY - 7, coinW * 2, 14, 3, COLOR_COIN_EDGE);
            if (coinW >= 4) {
                System.drawFastVLine(x + Math.floor(w / 2), p.coinY - 4, 8, COLOR_WHITE);
            }
        }

        // Render Power-Up inside Gap
        if (p.powerUp && !p.powerUpCollected) {
            var iconCol = (p.powerUp === "shield") ? COLOR_CYAN : (p.powerUp === "slowmo") ? COLOR_WHITE : COLOR_GOLD;
            System.fillCircle(x + Math.floor(w / 2), p.coinY, 8, iconCol);
            System.drawCircle(x + Math.floor(w / 2), p.coinY, 8, COLOR_WHITE);
            System.setTextColor(COLOR_BLACK);
            System.drawString((p.powerUp === "shield") ? "S" : (p.powerUp === "slowmo") ? "T" : "2X",
                             x + Math.floor(w / 2) - 4, p.coinY - 4, 1);
        }
    }

    // Render Active Particles
    function renderParticles() {
        for (var i = 0; i < MAX_PARTICLES; i++) {
            if (particles[i].active) {
                System.fillRect(Math.floor(particles[i].x), Math.floor(particles[i].y),
                                particles[i].size, particles[i].size, particles[i].color);
            }
        }
    }

    // Update Particles Physics (60 FPS smooth decay)
    function updateParticles() {
        for (var i = 0; i < MAX_PARTICLES; i++) {
            if (particles[i].active) {
                particles[i].x += particles[i].vx;
                particles[i].y += particles[i].vy;
                particles[i].vy += 0.08; // Gentle gravity for smooth 60 FPS float
                particles[i].life--;
                if (particles[i].life <= 0) {
                    particles[i].active = false;
                }
            }
        }
    }

    // --------------------------------------------------------------------------
    // 11. PIPE SPAWNER & COLLISION DETECTION
    // --------------------------------------------------------------------------
    function spawnPipe(pIndex, startX) {
        var p = pipes[pIndex];
        p.active = true;
        p.x = startX;
        p.width = 36;
        p.passed = false;
        p.coinCollected = false;
        p.powerUpCollected = false;

        // Gap calculation based on mode
        var mode = Storage.data.selectedMode;
        p.gapH = (mode === 1) ? 66 : (mode === 3) ? 82 : 74; // Narrower on Hardcore
        p.gapY = Math.floor(FM.randomRange(60 + p.gapH / 2, 210 - p.gapH / 2));
        p.coinY = p.gapY;

        // Oscillating moving pipes for Hardcore (Tuned for 60 FPS)
        if (mode === 1) {
            p.oscSpeed = FM.randomRange(1.2, 2.2);
            p.oscTime = FM.randomRange(0, 360);
        } else {
            p.oscSpeed = 0;
        }

        // Spawn Coin (85% chance)
        p.coinPresent = (FM.random() < 0.85);

        // Spawn Power-Up (15% chance in Coin Rush, 8% otherwise)
        var pChance = (mode === 3) ? 0.25 : 0.08;
        if (FM.random() < pChance) {
            var pick = FM.random();
            p.powerUp = (pick < 0.45) ? "shield" : (pick < 0.75) ? "double" : "slowmo";
            p.coinPresent = false;
        } else {
            p.powerUp = null;
        }
    }

    function checkCollisions() {
        var birdR = 7;
        var bx = bird.x;
        var by = bird.y;

        // Ceiling clamp: softly block bird at the sky instead of killing it!
        if (by - birdR < 6) {
            bird.y = birdR + 6;
            bird.vy = 0;
            by = bird.y;
        }

        // Ground collision (only ground kills from vertical boundary)
        if (by + birdR >= 275) {
            return true;
        }

        // Pipe collisions
        for (var i = 0; i < MAX_PIPES; i++) {
            var p = pipes[i];
            if (!p.active) continue;

            // Check if bird is horizontally inside pipe range
            if (bx + birdR > p.x && bx - birdR < p.x + p.width) {
                var topBottomEdge = p.gapY - Math.floor(p.gapH / 2);
                var botTopEdge = p.gapY + Math.floor(p.gapH / 2);

                if (by - birdR < topBottomEdge || by + birdR > botTopEdge) {
                    if (bird.shieldActive) {
                        // Shield absorbs impact!
                        bird.shieldActive = false;
                        Sound.hit();
                        spawnCoinSparkles(bx, by);
                        bird.vy = (bird.gravityDir === 1) ? -2.8 : 2.8;
                        return false;
                    }
                    return true;
                }
            }

            // High-Speed AABB Coin collection check (Zero sqrt overhead)
            if (p.coinPresent && !p.coinCollected) {
                var cdx = bx - (p.x + p.width / 2);
                if (cdx < 0) cdx = -cdx;
                if (cdx < 16) {
                    var cdy = by - p.coinY;
                    if (cdy < 0) cdy = -cdy;
                    if (cdy < 16) {
                        p.coinCollected = true;
                        var pts = bird.doublePoints ? 2 : 1;
                        currentScore += pts;
                        coinsEarnedThisRun += pts;
                        Storage.data.totalCoins += pts;
                        Sound.coin();
                        spawnCoinSparkles(bx, p.coinY);
                    }
                }
            }

            // High-Speed AABB Power-Up collection check
            if (p.powerUp && !p.powerUpCollected) {
                var pdx = bx - (p.x + p.width / 2);
                if (pdx < 0) pdx = -pdx;
                if (pdx < 16) {
                    var pdy = by - p.coinY;
                    if (pdy < 0) pdy = -pdy;
                    if (pdy < 16) {
                        p.powerUpCollected = true;
                        Sound.powerup();
                        spawnCoinSparkles(bx, p.coinY);
                        if (p.powerUp === "shield") {
                            bird.shieldActive = true;
                            bird.shieldTimer = 450; // Tuned for 60 FPS
                        } else if (p.powerUp === "slowmo") {
                            bird.slowMoActive = true;
                            bird.slowMoTimer = 350;
                        } else if (p.powerUp === "double") {
                            bird.doublePoints = true;
                            bird.doubleTimer = 400;
                        }
                    }
                }
            }
        }
        return false;
    }

    // --------------------------------------------------------------------------
    // 12. SCREEN: MAIN MENU (Zero-Flicker Redraw)
    // --------------------------------------------------------------------------
    function renderMainMenu() {
        var btnY = 145;
        var btnH = 32;
        var btnSpacing = 37;

        if (stateNeedsRedraw || Renderer.isDoubleBuffered) {
            renderBackground(COLOR_SKY_DAY);
            if (!Renderer.isDoubleBuffered) {
                renderFullBackground(COLOR_SKY_DAY);
            }

            // Title Banner Card
            System.fillRoundRect(18, 27, 204, 46, 8, COLOR_CARD_BG);
            System.drawRoundRect(18, 27, 204, 46, 8, COLOR_GOLD);
            System.drawRoundRect(19, 28, 202, 44, 7, COLOR_GOLD);
            System.setTextColor(COLOR_GOLD);
            System.drawString("FLAPPY BIRD", 34, 35, 4);

            // Top Header Stats (High Score & Coins) - Safely ending at x=192 to protect x>=200 emergency exit
            System.fillRoundRect(8, 8, 92, 20, 4, COLOR_CARD_BG);
            System.setTextColor(COLOR_GOLD);
            System.drawString("HI: " + Storage.data.highScore, 14, 12, 2);

            System.fillRoundRect(104, 8, 88, 20, 4, COLOR_CARD_BG);
            System.setTextColor(COLOR_GOLD);
            System.drawString("$: " + Storage.data.totalCoins, 110, 12, 2);

            // Menu Buttons
            drawButton(35, btnY, 170, btnH, "> PLAY", COLOR_GREEN_BTN, COLOR_WHITE, COLOR_WHITE, 2);
            drawButton(35, btnY + btnSpacing, 170, btnH, "MODES", COLOR_BLUE_BTN, COLOR_CYAN, COLOR_WHITE, 2);
            drawButton(35, btnY + btnSpacing * 2, 170, btnH, "SKINS", COLOR_PURPLE, COLOR_GOLD, COLOR_WHITE, 2);
            drawButton(35, btnY + btnSpacing * 3, 170, btnH, "STATS & MEDALS", COLOR_CARD_BG, COLOR_CARD_BORDER, COLOR_WHITE, 2);

            // Small bottom utility buttons
            drawButton(35, 290, 75, 24, "SETTINGS", COLOR_CARD_BG, COLOR_GRAY, COLOR_WHITE, 1);
            drawButton(130, 290, 75, 24, "EXIT", COLOR_CARD_BG, COLOR_RED, COLOR_RED, 1);

            stateNeedsRedraw = false;
        }

        // Flapping Preview Bird under title
        var bob = Math.floor(FM.fastSin(globalTime * 8) * 4);
        var flapF = Math.floor(globalTime / 6) % 3;

        if (!Renderer.isDoubleBuffered) {
            System.fillRect(95, 85, 50, 45, COLOR_SKY_DAY);
        }
        renderBird(120, 105 + bob, 0, flapF, Storage.data.selectedSkin, false);

        // Real-Time FPS Indicator (if enabled in settings)
        if (Storage.data.showFPS) {
            var fpsCol = (currentFPS >= 55) ? COLOR_GROUND_TOP : (currentFPS >= 35) ? COLOR_GOLD : COLOR_RED;
            System.setTextColor(fpsCol, COLOR_SKY_DAY);
            System.drawString(currentFPS + " FPS", 6, 276, 1);
        }

        renderParticles();
        Renderer.present();

        // Touch Navigation
        if (isTouchInRect(35, btnY, 170, btnH)) {
            Sound.click();
            bird.reset();
            currentScore = 0;
            coinsEarnedThisRun = 0;
            isNewRecord = false;
            changeState(STATES.READY);
        } else if (isTouchInRect(35, btnY + btnSpacing, 170, btnH)) {
            Sound.click();
            changeState(STATES.MODES);
        } else if (isTouchInRect(35, btnY + btnSpacing * 2, 170, btnH)) {
            Sound.click();
            changeState(STATES.SKINS);
        } else if (isTouchInRect(35, btnY + btnSpacing * 3, 170, btnH)) {
            Sound.click();
            changeState(STATES.STATS);
        } else if (isTouchInRect(35, 290, 75, 24)) {
            Sound.click();
            changeState(STATES.SETTINGS);
        } else if (isTouchInRect(130, 290, 75, 24)) {
            Sound.click();
            Renderer.end();
            System.exit();
        }
    }

    // --------------------------------------------------------------------------
    // 13. SCREEN: GAME MODES SELECTION (Zero-Flicker Redraw)
    // --------------------------------------------------------------------------
    function renderModesMenu() {
        if (stateNeedsRedraw || Renderer.isDoubleBuffered) {
            renderBackground(COLOR_SKY_SUNSET);
            if (!Renderer.isDoubleBuffered) renderFullBackground(COLOR_SKY_SUNSET);
            drawCard(12, 20, 216, 270, "SELECT MODE");

            var curMode = Storage.data.selectedMode;
            var startY = 50;
            var cardH = 46;

            for (var i = 0; i < GAME_MODES.length; i++) {
                var my = startY + i * (cardH + 8);
                var isSel = (curMode === i);
                var bg = isSel ? COLOR_BLUE_BTN : COLOR_CARD_BG;
                var border = isSel ? COLOR_GOLD : COLOR_CARD_BORDER;

                System.fillRoundRect(22, my, 196, cardH, 6, bg);
                System.drawRoundRect(22, my, 196, cardH, 6, border);
                if (isSel) {
                    System.drawRoundRect(23, my + 1, 194, cardH - 2, 5, border);
                }

                System.setTextColor(isSel ? COLOR_GOLD : COLOR_WHITE);
                System.drawString((isSel ? "* " : "  ") + GAME_MODES[i].name, 30, my + 6, 2);
                System.setTextColor(COLOR_GRAY);
                System.drawString(GAME_MODES[i].desc, 32, my + 26, 1);
            }

            drawButton(60, 260, 120, 26, "< BACK", COLOR_CARD_BG, COLOR_WHITE, COLOR_WHITE, 2);
            Renderer.present();
            stateNeedsRedraw = false;
        }

        var startY = 50;
        var cardH = 46;
        for (var i = 0; i < GAME_MODES.length; i++) {
            var my = startY + i * (cardH + 8);
            if (isTouchInRect(22, my, 196, cardH)) {
                Sound.click();
                Storage.data.selectedMode = i;
                Storage.save();
                stateNeedsRedraw = true;
                break;
            }
        }

        if (isTouchInRect(60, 260, 120, 26)) {
            Sound.click();
            changeState(STATES.MENU);
        }
    }

    // --------------------------------------------------------------------------
    // 14. SCREEN: SKINS & WARDROBE SHOP (Zero-Flicker Redraw)
    // --------------------------------------------------------------------------
    function renderSkinsMenu() {
        var selSkin = Storage.data.selectedSkin;
        var s = SKINS[selSkin];

        if (stateNeedsRedraw || Renderer.isDoubleBuffered) {
            renderBackground(COLOR_SKY_NIGHT);
            if (!Renderer.isDoubleBuffered) renderFullBackground(COLOR_SKY_NIGHT);
            drawCard(12, 15, 216, 290, "BIRD SKINS");

            // Large Preview Stage
            System.fillRoundRect(30, 42, 180, 70, 8, COLOR_CARD_BG);
            System.drawRoundRect(30, 42, 180, 70, 8, COLOR_CYAN);

            System.setTextColor(COLOR_GOLD);
            System.drawString(s.name, 115, 58, 2);
            System.setTextColor(COLOR_WHITE);
            System.drawString("COINS: " + Storage.data.totalCoins, 115, 80, 1);

            // Grid of skins
            var listY = 125;
            for (var i = 0; i < SKINS.length; i++) {
                var itemY = listY + i * 28;
                var isSelected = (selSkin === i);
                var isUnlocked = Storage.data.unlockedSkins[i] === 1;

                System.fillRoundRect(24, itemY, 192, 24, 4, isSelected ? COLOR_BLUE_BTN : COLOR_CARD_BG);
                System.drawRoundRect(24, itemY, 192, 24, 4, isSelected ? COLOR_GOLD : COLOR_CARD_BORDER);

                // Mini bird icon dot
                System.fillCircle(38, itemY + 12, 6, SKINS[i].color);
                System.setTextColor(isSelected ? COLOR_GOLD : COLOR_WHITE);
                System.drawString(SKINS[i].name, 50, itemY + 6, 2);

                if (isUnlocked) {
                    System.setTextColor(COLOR_GROUND_TOP);
                    System.drawString(isSelected ? "EQUIPPED" : "SELECT", 140, itemY + 6, 1);
                } else {
                    System.setTextColor(COLOR_GOLD);
                    System.drawString("$ " + SKINS[i].price, 150, itemY + 6, 1);
                }
            }

            drawButton(60, 272, 120, 26, "< BACK", COLOR_CARD_BG, COLOR_WHITE, COLOR_WHITE, 2);
            stateNeedsRedraw = false;
        }

        // Live preview bird flap on stage
        var previewFlap = Math.floor(globalTime / 6) % 3;
        if (!Renderer.isDoubleBuffered) {
            System.fillRect(60, 56, 46, 42, COLOR_CARD_BG);
        }
        renderBird(80, 77, 0, previewFlap, Storage.data.selectedSkin, false);

        Renderer.present();

        var listY = 125;
        for (var i = 0; i < SKINS.length; i++) {
            var itemY = listY + i * 28;
            if (isTouchInRect(24, itemY, 192, 24)) {
                if (Storage.data.unlockedSkins[i] === 1) {
                    Sound.click();
                    Storage.data.selectedSkin = i;
                    Storage.save();
                    stateNeedsRedraw = true;
                } else if (Storage.data.totalCoins >= SKINS[i].price) {
                    Sound.coin();
                    Storage.data.totalCoins -= SKINS[i].price;
                    Storage.data.unlockedSkins[i] = 1;
                    Storage.data.selectedSkin = i;
                    Storage.save();
                    stateNeedsRedraw = true;
                } else {
                    Sound.hit();
                }
                break;
            }
        }

        if (isTouchInRect(60, 272, 120, 26)) {
            Sound.click();
            changeState(STATES.MENU);
        }
    }

    // --------------------------------------------------------------------------
    // 15. SCREEN: STATS & TROPHY MEDALS (Zero-Flicker Redraw)
    // --------------------------------------------------------------------------
    function renderStatsMenu() {
        if (stateNeedsRedraw || Renderer.isDoubleBuffered) {
            renderBackground(COLOR_SKY_DAY);
            if (!Renderer.isDoubleBuffered) renderFullBackground(COLOR_SKY_DAY);
            drawCard(12, 20, 216, 275, "RECORDS & MEDALS");

            System.setTextColor(COLOR_WHITE);
            System.drawString("BEST SCORE  : " + Storage.data.highScore, 28, 55, 2);
            System.drawString("TOTAL FLIGHTS: " + Storage.data.gamesPlayed, 28, 78, 2);
            System.drawString("TOTAL COINS  : " + Storage.data.totalCoins, 28, 101, 2);

            // Medals Showcase Section
            System.fillRoundRect(22, 130, 196, 95, 6, COLOR_CARD_BG);
            System.drawRoundRect(22, 130, 196, 95, 6, COLOR_GOLD);
            System.setTextColor(COLOR_GOLD);
            System.drawString("- TROPHY HALL -", 58, 138, 2);

            var hs = Storage.data.highScore;
            drawMedalIcon(45, 185, COLOR_BRONZE, hs >= 10, "10+");
            drawMedalIcon(95, 185, COLOR_SILVER, hs >= 25, "25+");
            drawMedalIcon(145, 185, COLOR_GOLD, hs >= 50, "50+");
            drawMedalIcon(195, 185, COLOR_PLATINUM, hs >= 100, "100+");

            drawButton(60, 255, 120, 26, "< BACK", COLOR_CARD_BG, COLOR_WHITE, COLOR_WHITE, 2);
            stateNeedsRedraw = false;
        }

        // 3D Rotating Medal Showcase
        if (hasKryon3D) {
            var rot = globalTime * 0.05;
            Kryon3D.drawCube(0, -0.9, -3.5, 0.45, 0.45, 0.15, 0, rot, 0, (Storage.data.highScore >= 50) ? COLOR_GOLD : COLOR_BRONZE, true);
        }

        Renderer.present();

        if (isTouchInRect(60, 255, 120, 26)) {
            Sound.click();
            changeState(STATES.MENU);
        }
    }

    function drawMedalIcon(cx, cy, col, unlocked, label) {
        if (unlocked) {
            System.fillCircle(cx, cy - 8, 12, col);
            System.drawCircle(cx, cy - 8, 12, COLOR_WHITE);
            System.fillCircle(cx, cy - 8, 6, COLOR_WHITE);
            System.setTextColor(COLOR_WHITE);
        } else {
            System.fillCircle(cx, cy - 8, 12, COLOR_DARK_GRAY);
            System.drawCircle(cx, cy - 8, 12, COLOR_GRAY);
            System.setTextColor(COLOR_GRAY);
        }
        System.drawString(label, cx - 10, cy + 10, 1);
    }

    // --------------------------------------------------------------------------
    // 16. SCREEN: SETTINGS
    // --------------------------------------------------------------------------
    function renderSettingsMenu() {
        renderBackground(COLOR_SKY_NIGHT);
        drawCard(12, 22, 216, 270, "SETTINGS");

        // Sound Toggle
        System.setTextColor(COLOR_WHITE);
        System.drawString("SOUND FX", 28, 58, 2);
        var sText = Sound.enabled ? "ON" : "OFF";
        var sBg = Sound.enabled ? COLOR_GREEN_BTN : COLOR_RED;
        drawButton(155, 53, 55, 24, sText, sBg, COLOR_WHITE, COLOR_WHITE, 2);

        // Graphics Style (3D Voxel vs 2D Retro)
        System.drawString("3D SHADING", 28, 96, 2);
        var gText = Storage.data.use3DGraphics ? "ON" : "OFF";
        var gBg = Storage.data.use3DGraphics ? COLOR_BLUE_BTN : COLOR_DARK_GRAY;
        drawButton(155, 91, 55, 24, gText, gBg, COLOR_WHITE, COLOR_WHITE, 2);

        // FPS Counter Toggle
        System.drawString("SHOW FPS", 28, 134, 2);
        var fText = Storage.data.showFPS ? "ON" : "OFF";
        var fBg = Storage.data.showFPS ? COLOR_GREEN_BTN : COLOR_DARK_GRAY;
        drawButton(155, 129, 55, 24, fText, fBg, COLOR_WHITE, COLOR_WHITE, 2);

        // Reset Data Button
        drawButton(35, 178, 170, 28, "RESET PROGRESS", COLOR_RED, COLOR_WHITE, COLOR_WHITE, 2);

        drawButton(60, 245, 120, 26, "< BACK", COLOR_CARD_BG, COLOR_WHITE, COLOR_WHITE, 2);
        Renderer.present();

        if (isTouchInRect(155, 53, 55, 24)) {
            Sound.enabled = !Sound.enabled;
            Storage.data.soundEnabled = Sound.enabled;
            Storage.save();
            if (Sound.enabled) Sound.click();
        } else if (isTouchInRect(155, 91, 55, 24)) {
            Sound.click();
            Storage.data.use3DGraphics = !Storage.data.use3DGraphics;
            Storage.save();
        } else if (isTouchInRect(155, 129, 55, 24)) {
            Sound.click();
            Storage.data.showFPS = !Storage.data.showFPS;
            Storage.save();
        } else if (isTouchInRect(35, 178, 170, 28)) {
            Sound.hit();
            Storage.data.highScore = 0;
            Storage.data.totalCoins = 0;
            Storage.data.gamesPlayed = 0;
            Storage.data.unlockedSkins = [1, 0, 0, 0, 0];
            Storage.data.selectedSkin = 0;
            Storage.save();
        } else if (isTouchInRect(60, 245, 120, 26)) {
            Sound.click();
            changeState(STATES.MENU);
        }
    }

    // --------------------------------------------------------------------------
    // 17. SCREEN: READY / COUNTDOWN (Zero-Flicker Redraw)
    // --------------------------------------------------------------------------
    function renderReadyScreen() {
        if (stateNeedsRedraw || Renderer.isDoubleBuffered) {
            renderBackground(COLOR_SKY_DAY);
            if (!Renderer.isDoubleBuffered) renderFullBackground(COLOR_SKY_DAY);

            // "GET READY!" Card
            System.fillRoundRect(30, 60, 180, 55, 8, COLOR_CARD_BG);
            System.drawRoundRect(30, 60, 180, 55, 8, COLOR_GOLD);
            System.setTextColor(COLOR_GOLD);
            System.drawString("GET READY!", 50, 72, 4);

            System.setTextColor(COLOR_WHITE);
            System.drawString("TAP ANYWHERE", 52, 215, 2);
            System.drawString("TO FLAP", 84, 235, 2);

            // Selected Mode Badge
            var mName = GAME_MODES[Storage.data.selectedMode].name;
            System.fillRoundRect(50, 130, 140, 20, 4, COLOR_BLUE_BTN);
            System.setTextColor(COLOR_CYAN);
            System.drawString("[" + mName + "]", 58, 134, 1);

            stateNeedsRedraw = false;
        }

        // Bobbing bird
        var bob = Math.floor(FM.fastSin(globalTime * 8) * 4);
        var flapF = Math.floor(globalTime / 6) % 3;

        if (!Renderer.isDoubleBuffered) {
            System.fillRect(bird.x - 18, bird.prevY - 14, 38, 28, COLOR_SKY_DAY);
        }
        renderBird(bird.x, bird.y + bob, 0, flapF, Storage.data.selectedSkin, false);
        bird.prevY = bird.y + bob;

        // Animated tap arrow
        var arrowPulse = Math.floor(FM.fastSin(globalTime * 12) * 6);
        if (!Renderer.isDoubleBuffered) {
            System.fillRect(108, 168, 24, 36, COLOR_SKY_DAY);
        }
        System.fillTriangle(120, 175 + arrowPulse, 110, 195 + arrowPulse, 130, 195 + arrowPulse, COLOR_WHITE);

        Renderer.present();

        // Any tap initiates flight!
        if (touchState.justPressed) {
            Sound.flap();
            bird.reset();
            bird.vy = (bird.gravityDir === 1) ? -4.6 : 4.6;
            bird.angleDeg = (bird.gravityDir === 1) ? -24 : 24;
            bird.rotDelay = 10;
            bird.flapCooldown = 8;
            spawnFeatherBurst(bird.x, bird.y, COLOR_WHITE);

            // Initialize pipes with arcade spacing
            for (var i = 0; i < MAX_PIPES; i++) {
                spawnPipe(i, SCREEN_W + 40 + i * 125);
            }
            changeState(STATES.PLAYING);
        }
    }

    // --------------------------------------------------------------------------
    // 18. SCREEN: PLAYING (100% ZERO-FLICKER & FAST 60 FPS ARCADE SPEED)
    // --------------------------------------------------------------------------
    function updateAndRenderPlaying() {
        globalTime++;

        // Fast, energetic arcade speed
        var scrollSpeed = 2.8;
        if (Storage.data.selectedMode === 1) scrollSpeed = 3.6; // Hardcore is faster!
        if (Storage.data.selectedMode === 3) scrollSpeed = 3.2; // Coin Rush
        if (bird.slowMoActive) {
            scrollSpeed *= 0.65;
            bird.slowMoTimer--;
            if (bird.slowMoTimer <= 0) bird.slowMoActive = false;
        }
        if (bird.doublePoints) {
            bird.doubleTimer--;
            if (bird.doubleTimer <= 0) bird.doublePoints = false;
        }
        if (bird.shieldActive) {
            bird.shieldTimer--;
            if (bird.shieldTimer <= 0) bird.shieldActive = false;
        }

        groundScrollX += scrollSpeed;
        cloudScrollX += scrollSpeed * 0.3;

        // Flap Cooldown tick
        if (bird.flapCooldown > 0) bird.flapCooldown--;

        // Player Touch Controls (Flap or Pause Button)
        if (touchState.justPressed) {
            // Check Pause Button at Top-Left (x: 10, y: 8, w: 36, h: 24)
            if (isTouchInRect(10, 8, 36, 24)) {
                Sound.click();
                changeState(STATES.PAUSED);
                return;
            }

            // Normal Flap (Fast, punchy, arcade responsive)
            if (bird.flapCooldown <= 0) {
                bird.flapCooldown = 6;
                Sound.flap();
                var flapPower = 4.6;

                if (Storage.data.selectedMode === 2) {
                    // Gravity Flip Mode: Tapping inverts flight vector!
                    bird.gravityDir *= -1;
                    bird.vy = bird.gravityDir * -flapPower;
                    bird.angleDeg = (bird.gravityDir === 1) ? -24 : 24;
                } else {
                    bird.vy = -flapPower;
                    bird.angleDeg = -24;
                }

                bird.rotDelay = 10;
                bird.flapTimer = 8;
                spawnFeatherBurst(bird.x, bird.y, SKINS[Storage.data.selectedSkin].wing);
            }
        }

        // Apply Asymmetric Gravity & Physics (Floaty apex, controlled descent)
        var isRising = (bird.vy * bird.gravityDir < 0);
        var gravity = isRising ? 0.26 : 0.34;
        bird.vy += gravity * bird.gravityDir;
        bird.vy = FM.clamp(bird.vy, -5.5, 6.2);
        bird.y += bird.vy;

        // Authentic Flappy Bird Rotation
        if (bird.rotDelay > 0) {
            bird.rotDelay--;
        } else {
            if (bird.vy * bird.gravityDir > 0) {
                bird.angleDeg += 3.2 * bird.gravityDir;
                if (bird.gravityDir === 1 && bird.angleDeg > 70) bird.angleDeg = 70;
                if (bird.gravityDir === -1 && bird.angleDeg < -70) bird.angleDeg = -70;
            }
        }

        // Wing Flap Animation Frame
        var flapFrame = (bird.flapTimer > 0) ? 0 : (bird.vy * bird.gravityDir < 0) ? 1 : 2;
        if (bird.flapTimer > 0) bird.flapTimer--;

        // Update Pipes
        for (var i = 0; i < MAX_PIPES; i++) {
            var p = pipes[i];
            if (!p.active) continue;

            p.x -= scrollSpeed;

            // Oscillate gap vertically for Hardcore mode
            if (p.oscSpeed > 0) {
                p.oscTime += p.oscSpeed;
                p.gapY += Math.floor(FM.fastSin(p.oscTime) * 1.5);
                p.gapY = FM.clamp(p.gapY, 80, 190);
                p.coinY = p.gapY;
            }

            // Score point when passing bird
            if (!p.passed && p.x + p.width < bird.x) {
                p.passed = true;
                currentScore += bird.doublePoints ? 2 : 1;
                Sound.score();
            }

            // Recycle pipe when it scrolls off screen
            if (p.x + p.width < -10) {
                if (!Renderer.isDoubleBuffered) {
                    System.fillRect(0, 0, 12, 275, getSkyColor(currentScore));
                }
                var furthestX = 0;
                for (var j = 0; j < MAX_PIPES; j++) {
                    if (pipes[j].active && pipes[j].x > furthestX) {
                        furthestX = pipes[j].x;
                    }
                }
                spawnPipe(i, furthestX + 125);
            }
        }

        // Check Collisions
        if (checkCollisions()) {
            Sound.hit();
            screenShakeTimer = 8;
            Storage.data.gamesPlayed++;

            if (currentScore > Storage.data.highScore) {
                Storage.data.highScore = currentScore;
                isNewRecord = true;
                Sound.medal();
            } else {
                isNewRecord = false;
            }

            // Determine Medal
            if (currentScore >= 100) medalEarned = "Platinum";
            else if (currentScore >= 50) medalEarned = "Gold";
            else if (currentScore >= 25) medalEarned = "Silver";
            else if (currentScore >= 10) medalEarned = "Bronze";
            else medalEarned = "None";

            Storage.save();
            changeState(STATES.GAMEOVER);
            return;
        }

        // --- RENDER GAMEPLAY (100% Zero-Flicker Pipeline) ---
        var skyCol = getSkyColor(currentScore);

        if (stateNeedsRedraw || skyCol !== prevSkyColor) {
            prevSkyColor = skyCol;
            if (!Renderer.isDoubleBuffered) {
                renderFullBackground(skyCol);
                System.fillRoundRect(10, 8, 36, 24, 4, COLOR_CARD_BG);
                System.drawRoundRect(10, 8, 36, 24, 4, COLOR_WHITE);
                System.fillRect(20, 13, 4, 14, COLOR_WHITE);
                System.fillRect(28, 13, 4, 14, COLOR_WHITE);
            }
            stateNeedsRedraw = false;
            hudPrevScore = -1;
            hudPrevCoins = -1;
            for (var p0 = 0; p0 < MAX_PIPES; p0++) {
                pipes[p0].prevX = -999;
            }
            bird.prevY = bird.y;
            bird.prevAngle = bird.angleDeg;
        }

        if (Renderer.isDoubleBuffered) {
            renderBackground(skyCol);
        } else {
            // Direct Zero-Flicker: Erase old bird bounding box with sky color!
            if (bird.prevY !== bird.y || bird.prevAngle !== bird.angleDeg) {
                System.fillRect(bird.x - 18, bird.prevY - 14, 38, 28, skyCol);
                bird.prevY = bird.y;
                bird.prevAngle = bird.angleDeg;
            }
        }

        // Render Pipes
        for (var k = 0; k < MAX_PIPES; k++) {
            var pk = pipes[k];
            if (!pk.active) continue;

            if (!Renderer.isDoubleBuffered && pk.prevX > 0) {
                // Erase trailing vertical strip left behind by pipe (Zero flicker!)
                var eraseW = Math.ceil(pk.prevX - pk.x) + 3;
                var eraseX = pk.x + pk.width + 4;
                if (eraseW > 0 && eraseW < 40 && eraseX < SCREEN_W) {
                    System.fillRect(eraseX, 0, eraseW, 275, skyCol);
                }
            }
            pk.prevX = pk.x;

            renderPipe(pk);
        }

        // Render Bird
        renderBird(bird.x, bird.y, bird.angleDeg, flapFrame, Storage.data.selectedSkin, bird.shieldActive);

        // Update & Render Particles
        updateParticles();
        renderParticles();

        // Render HUD
        if (Renderer.isDoubleBuffered) {
            System.fillRoundRect(10, 8, 36, 24, 4, COLOR_CARD_BG);
            System.drawRoundRect(10, 8, 36, 24, 4, COLOR_WHITE);
            System.fillRect(20, 13, 4, 14, COLOR_WHITE);
            System.fillRect(28, 13, 4, 14, COLOR_WHITE);
        }

        // Real-Time FPS Badge
        if (Storage.data.showFPS) {
            var fpsCol = (currentFPS >= 55) ? COLOR_GROUND_TOP : (currentFPS >= 35) ? COLOR_GOLD : COLOR_RED;
            System.fillRoundRect(50, 8, 40, 24, 4, COLOR_CARD_BG);
            System.drawRoundRect(50, 8, 40, 24, 4, fpsCol);
            System.setTextColor(fpsCol);
            System.drawString(currentFPS + "F", 54, 12, 2);
        }

        // Score display (Large centered digits with drop shadow)
        if (currentScore !== hudPrevScore || Renderer.isDoubleBuffered) {
            hudPrevScore = currentScore;
            var scoreStr = "" + currentScore;
            var scoreX = Math.floor((SCREEN_W - scoreStr.length * 20) / 2);
            if (!Renderer.isDoubleBuffered) {
                System.fillRect(90, 8, 60, 26, skyCol);
            }
            System.setTextColor(COLOR_BLACK);
            System.drawString(scoreStr, scoreX + 2, 12, 4);
            System.setTextColor(bird.doublePoints ? COLOR_GOLD : COLOR_WHITE);
            System.drawString(scoreStr, scoreX, 10, 4);
        }

        // Coin counter top-right
        if (Storage.data.totalCoins !== hudPrevCoins || Renderer.isDoubleBuffered) {
            hudPrevCoins = Storage.data.totalCoins;
            System.fillRoundRect(128, 8, 64, 24, 4, COLOR_CARD_BG);
            System.drawRoundRect(128, 8, 64, 24, 4, COLOR_GOLD);
            System.setTextColor(COLOR_GOLD);
            System.drawString("$ " + Storage.data.totalCoins, 134, 12, 2);
        }

        // Active Power-Up Notification Bar
        if (bird.slowMoActive || bird.doublePoints || bird.shieldActive) {
            var statStr = bird.shieldActive ? "[SHIELD]" : bird.doublePoints ? "[2X PTS]" : "[SLOW-MO]";
            System.fillRoundRect(70, 48, 100, 16, 3, COLOR_BLUE_BTN);
            System.setTextColor(COLOR_CYAN);
            System.drawString(statStr, 80, 50, 1);
        }

        Renderer.present();
    }

    // --------------------------------------------------------------------------
    // 19. SCREEN: PAUSED (Zero-Flicker Redraw)
    // --------------------------------------------------------------------------
    function renderPausedScreen() {
        if (stateNeedsRedraw || Renderer.isDoubleBuffered) {
            drawCard(25, 60, 190, 200, "PAUSED");

            System.setTextColor(COLOR_WHITE);
            System.drawString("CURRENT: " + currentScore, 50, 100, 2);
            System.drawString("BEST   : " + Storage.data.highScore, 50, 122, 2);

            drawButton(45, 155, 150, 28, "RESUME", COLOR_GREEN_BTN, COLOR_WHITE, COLOR_WHITE, 2);
            drawButton(45, 192, 150, 28, "RETRY", COLOR_BLUE_BTN, COLOR_CYAN, COLOR_WHITE, 2);
            drawButton(45, 228, 150, 26, "MENU", COLOR_CARD_BG, COLOR_RED, COLOR_RED, 2);

            stateNeedsRedraw = false;
        }

        Renderer.present();

        if (isTouchInRect(45, 155, 150, 28)) {
            Sound.click();
            changeState(STATES.PLAYING);
        } else if (isTouchInRect(45, 192, 150, 28)) {
            Sound.click();
            bird.reset();
            currentScore = 0;
            coinsEarnedThisRun = 0;
            changeState(STATES.READY);
        } else if (isTouchInRect(45, 228, 150, 26)) {
            Sound.click();
            changeState(STATES.MENU);
        }
    }

    // --------------------------------------------------------------------------
    // 20. SCREEN: GAME OVER (Zero-Flicker Redraw)
    // --------------------------------------------------------------------------
    function renderGameOverScreen() {
        var skyCol = getSkyColor(currentScore);

        if (stateNeedsRedraw || Renderer.isDoubleBuffered) {
            renderBackground(skyCol);
            if (!Renderer.isDoubleBuffered) renderFullBackground(skyCol);

            // Render dead bird on ground
            renderBird(bird.x, 265, 80, 2, Storage.data.selectedSkin, false);

            // Game Over Banner
            System.fillRoundRect(25, 30, 190, 42, 8, COLOR_CARD_BG);
            System.drawRoundRect(25, 30, 190, 42, 8, COLOR_RED);
            System.setTextColor(COLOR_RED);
            System.drawString("GAME OVER", 44, 38, 4);

            // Stats Summary Box
            drawCard(20, 85, 200, 140, isNewRecord ? "! NEW HIGH SCORE !" : "SCORE SUMMARY");

            System.setTextColor(COLOR_WHITE);
            System.drawString("SCORE     : " + currentScore, 34, 115, 2);
            System.drawString("BEST SCORE: " + Storage.data.highScore, 34, 138, 2);
            System.drawString("COINS     : +" + coinsEarnedThisRun, 34, 161, 2);

            // Earned Medal Badge
            System.drawString("MEDAL     : ", 34, 184, 2);
            var mCol = (medalEarned === "Platinum") ? COLOR_PLATINUM :
                       (medalEarned === "Gold") ? COLOR_GOLD :
                       (medalEarned === "Silver") ? COLOR_SILVER :
                       (medalEarned === "Bronze") ? COLOR_BRONZE : COLOR_GRAY;

            System.setTextColor(mCol);
            System.drawString(medalEarned.toUpperCase(), 126, 184, 2);

            // Action Buttons
            drawButton(35, 235, 170, 32, "PLAY AGAIN", COLOR_GREEN_BTN, COLOR_WHITE, COLOR_WHITE, 2);
            drawButton(35, 275, 80, 28, "MENU", COLOR_CARD_BG, COLOR_GRAY, COLOR_WHITE, 2);
            drawButton(125, 275, 80, 28, "SKINS", COLOR_PURPLE, COLOR_GOLD, COLOR_WHITE, 2);

            stateNeedsRedraw = false;
        }

        // 3D Rotating Trophy Medal in Game Over screen
        if (hasKryon3D && medalEarned !== "None") {
            var rot = globalTime * 0.06;
            Kryon3D.drawCube(1.2, 0.25, -3.2, 0.45, 0.45, 0.25, rot, rot * 0.7, 0, mCol, true);
        }

        Renderer.present();

        if (isTouchInRect(35, 235, 170, 32)) {
            Sound.click();
            bird.reset();
            currentScore = 0;
            coinsEarnedThisRun = 0;
            isNewRecord = false;
            changeState(STATES.READY);
        } else if (isTouchInRect(35, 275, 80, 28)) {
            Sound.click();
            changeState(STATES.MENU);
        } else if (isTouchInRect(125, 275, 80, 28)) {
            Sound.click();
            changeState(STATES.SKINS);
        }
    }

    // --------------------------------------------------------------------------
    // 21. MAIN APPLICATION LOOP (30-40 FPS, FREE-RTOS GC YIELD)
    // --------------------------------------------------------------------------
    while (true) {
        var frameStartTime = System.millis();
        globalTime++;

        // Real-Time 60 FPS Calculation
        fpsCount++;
        if (frameStartTime - fpsLastTime >= 500) {
            var timeDiff = frameStartTime - fpsLastTime;
            if (timeDiff > 0) {
                currentFPS = Math.round((fpsCount * 1000) / timeDiff);
            }
            fpsCount = 0;
            fpsLastTime = frameStartTime;
        }

        // Poll touch input
        touchState.update();

        // Screen Shake FX on impact
        if (screenShakeTimer > 0) {
            screenShakeTimer--;
        }

        // State Machine Dispatcher
        switch (currentState) {
            case STATES.MENU:
                renderMainMenu();
                break;
            case STATES.MODES:
                renderModesMenu();
                break;
            case STATES.SKINS:
                renderSkinsMenu();
                break;
            case STATES.STATS:
                renderStatsMenu();
                break;
            case STATES.SETTINGS:
                renderSettingsMenu();
                break;
            case STATES.READY:
                renderReadyScreen();
                break;
            case STATES.PLAYING:
                updateAndRenderPlaying();
                break;
            case STATES.PAUSED:
                renderPausedScreen();
                break;
            case STATES.GAMEOVER:
                renderGameOverScreen();
                break;
            default:
                changeState(STATES.MENU);
                break;
        }

        // Frame Pacing & FreeRTOS Garbage Collection Yield
        // Target: ~16.6ms per frame (Super-Smooth 60 FPS)
        var frameElapsed = System.millis() - frameStartTime;
        var sleepTime = 16 - frameElapsed;
        if (sleepTime < 1) sleepTime = 1; // 1ms minimum yield for FreeRTOS task feeding & GC
        System.delay(sleepTime);
    }

})();
