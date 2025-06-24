class ChordInvadersModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'chordInvadersModule';
        this.name = 'Chord Invaders';

        this.nodes = { input: this.audioContext.createGain(), output: this.audioContext.createGain() };
        
        this.gameState = 'idle';
        this.isGameOverDisplayActive = false;
        
        // This Map will store the visual state for each key press feedback.
        this.playerCannonState = new Map(); 

        this.aliens = [];
        this.lasers = [];
        this.score = 0;
        this.gameLoop = null;

        this.rootNote = 60;
        this.scaleType = 'major';
        this.scales = {
            'major': [0, 2, 4, 5, 7, 9, 11],
            'natural_minor': [0, 2, 3, 5, 7, 8, 10],
        };
        this.chordFormulas = {
            'maj': [0, 4, 7], 'min': [0, 3, 7], 'dim': [0, 3, 6]
        };

        this.stars = [];
        this.scanlineOpacity = 0.08;
        this.alienPrimaryColor = '#03dac5';
        this.alienAppendageColor = '#8a70d6';

        this.currentWaveNumber = 1;
        this.alienBaseSpeed = 0.25;
        this.alienSpeedIncreasePerWave = 0.03;
        this.maxAlienSpeed = 1.2;

        // --- NEW: This will watch the piano for changes ---
        this.observer = null;
    }
    
    // --- Core Game Logic Handlers ---
    _handlePlayerKeyPress(noteClass) {
        if (this.gameState !== 'playing') return;
        
        const alienNoteClasses = new Set(this.aliens.map(a => a.note));
        const isRequired = alienNoteClasses.has(noteClass);

        if (isRequired) {
            this.playerCannonState.set(noteClass, { type: 'correct' });
        } else {
            this.playerCannonState.set(noteClass, { type: 'error', decay: 1.0 });
        }
        this._checkWinCondition();
    }

    _handlePlayerKeyRelease(noteClass) {
        if (this.gameState !== 'playing') return;
        const state = this.playerCannonState.get(noteClass);
        if (state && state.type === 'correct') {
            this.playerCannonState.delete(noteClass);
        }
    }

    _checkWinCondition() {
        if (this.gameState !== 'playing' || this.aliens.length === 0) return;
        
        const alienNoteClasses = new Set(this.aliens.map(a => a.note));
        
        const heldCorrectNotes = new Set();
        this.playerCannonState.forEach((state, noteClass) => {
            if (state.type === 'correct') {
                heldCorrectNotes.add(noteClass);
            }
        });

        if (alienNoteClasses.size > 0 && alienNoteClasses.size === heldCorrectNotes.size && [...alienNoteClasses].every(note => heldCorrectNotes.has(note))) {
            this.aliens.forEach(alien => {
                this.lasers.push({ x: alien.x + 10, y: this.canvas.height - 40 });
            });
            // Clear the state so it doesn't fire continuously
            this.playerCannonState.clear();
        }
    }

    _initStars(count) {
        if (!this.canvas) return;
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({ x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height, size: Math.random() * 1.5 + 0.5, speed: Math.random() * 0.3 + 0.1 });
        }
    }

    _startGame() {
        if (this.audioContext.state === 'suspended') { this.audioContext.resume(); }
        this.isGameOverDisplayActive = false;
        this.score = 0;
        this.currentWaveNumber = 1;
        this.aliens = [];
        this.lasers = [];
        this.playerCannonState.clear();
        this.gameState = 'playing';
        if (this.startButton) { this.startButton.textContent = 'Good Luck!'; this.startButton.disabled = true; }
        this._spawnAlienWave();
        if (this.gameLoop) clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => this._update(), 1000 / 60);
    }

    _gameOver() {
        this.isGameOverDisplayActive = true;
        this.gameState = 'idle';
        this.playerCannonState.clear();
        if (this.startButton) { this.startButton.textContent = 'START GAME'; this.startButton.disabled = false; }
        if (this.gameLoop) { clearInterval(this.gameLoop); this.gameLoop = null; }
        this._draw();
    }

    _update() {
        if (this.gameState !== 'playing') return;
        if (this.canvas) {
            this.stars.forEach(star => { star.y += star.speed; if (star.y > this.canvas.height) { star.y = 0; star.x = Math.random() * this.canvas.width; } });
        }
        this.lasers.forEach((laser, index) => { laser.y -= 6; if (laser.y < 0) this.lasers.splice(index, 1); });
        const currentAlienSpeed = Math.min(this.maxAlienSpeed, this.alienBaseSpeed + ((this.currentWaveNumber - 1) * this.alienSpeedIncreasePerWave));
        this.aliens.forEach(alien => {
            alien.y += currentAlienSpeed;
            if (this.canvas && alien.y > this.canvas.height - 30) { this._gameOver(); return; }
            alien.eyeMoveTimer--;
            if (alien.eyeMoveTimer <= 0) { alien.eyeTargetOffsetX = (Math.random() - 0.5) * (alien.eyeSocketWidth * 0.3); alien.eyeMoveTimer = 30 + Math.random() * 90; }
            alien.eyeOffsetX += (alien.eyeTargetOffsetX - alien.eyeOffsetX) * 0.08;
            alien.legPhase += alien.legAnimSpeed;
            if (alien.legPhase > Math.PI * 2) { alien.legPhase -= Math.PI * 2; }
        });
        if (this.gameState !== 'playing') return;
        for (let l_idx = this.lasers.length - 1; l_idx >= 0; l_idx--) {
            const laser = this.lasers[l_idx];
            for (let a_idx = this.aliens.length - 1; a_idx >= 0; a_idx--) {
                const alien = this.aliens[a_idx];
                if (laser.x > alien.x && laser.x < alien.x + 20 && laser.y > alien.y && laser.y < alien.y + 20) {
                    this.aliens.splice(a_idx, 1); this.lasers.splice(l_idx, 1); this.score += 10; break;
                }
            }
        }
        if (this.aliens.length === 0 && this.gameState === 'playing') {
            this.score += 100; this.currentWaveNumber++; this.playerCannonState.clear(); this._spawnAlienWave();
        }
        this._draw();
    }

    _spawnAlienWave() {
        if (!this.canvas) return;
        const scale = this.scales[this.scaleType]; if (!scale) return;
        const randomDegree = Math.floor(Math.random() * scale.length);
        const rootOfChordInScale = this.rootNote + scale[randomDegree];
        let chordTypeKey = 'maj';
        if (this.scaleType === 'major') chordTypeKey = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'][randomDegree];
        else if (this.scaleType === 'natural_minor') chordTypeKey = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'][randomDegree];
        const chordIntervals = this.chordFormulas[chordTypeKey] || this.chordFormulas['maj'];
        const chordNoteClasses = chordIntervals.map(interval => (rootOfChordInScale + interval) % 12);
        const alienBodyWidth = 20;
        const yPos = this.canvas.height * 0.15 + (alienBodyWidth * 0.4); 
        this.aliens = chordNoteClasses.map((noteClass) => {
            const cannonRange = this.canvas.width - 60; const cannonXCenter = 30 + (noteClass / 11.0) * cannonRange;
            return {
                note: noteClass, x: cannonXCenter - (alienBodyWidth / 2), y: yPos, baseColor: this.alienPrimaryColor, glowColor: this.alienPrimaryColor, 
                appendageColor: this.alienAppendageColor, eyeSocketColor: '#FFFFFF', pupilColor: '#000000',
                eyeSocketWidth: alienBodyWidth * 0.5, eyeOffsetX: 0, eyeTargetOffsetX: (Math.random() - 0.5) * (alienBodyWidth * 0.5 * 0.3),
                eyeMoveTimer: Math.random() * 60, legPhase: Math.random() * Math.PI * 2, legAnimSpeed: 0.08 + Math.random() * 0.04, legMaxLengthOffset: 4 
            };
        });
    }

    _draw() { /* Unchanged from previous correct version */
        if (!this.canvas || !this.ctx) return;
        const ctx = this.ctx;
        const { width, height } = this.canvas;
        ctx.fillStyle = '#0d0221';
        ctx.fillRect(0, 0, width, height);
        const applyGlow = (color, blurAmount = 10) => { ctx.shadowBlur = blurAmount; ctx.shadowColor = color; };
        const clearGlow = () => { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; };
        if (this.gameState === 'playing' || this.isGameOverDisplayActive) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.stars.forEach(star => { ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill(); });
            const horizonY = height * 0.55; const vanishingPointX = width / 2; ctx.strokeStyle = 'rgba(255, 7, 235, 0.25)'; ctx.lineWidth = 1.5;
            for (let i = 0; i < 12; i++) { const yP = Math.pow(i/11,2); const y = horizonY + yP*(height-horizonY); if(y>height)break; ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke(); }
            const numVLines = 10; for(let i=0; i<=numVLines; i++) { const pF=i/numVLines; const xOffH=pF*(width*0.8); const xAtB=vanishingPointX+(i*(width/(numVLines*1.5))); ctx.beginPath();ctx.moveTo(vanishingPointX-xOffH,horizonY);ctx.lineTo(vanishingPointX-xAtB,height);ctx.stroke(); ctx.beginPath();ctx.moveTo(vanishingPointX+xOffH,horizonY);ctx.lineTo(vanishingPointX+xAtB,height);ctx.stroke(); }
        }
        if (this.gameState === 'playing') {
            ctx.lineWidth = 3;
            for (let noteClass = 0; noteClass < 12; noteClass++) {
                const state = this.playerCannonState.get(noteClass); if (!state) continue;
                const x = (noteClass / 11) * (width - 60) + 30;
                if (state.type === 'correct') {
                    applyGlow('#03dac5', 15); ctx.fillStyle = '#03dac5';
                    ctx.beginPath(); ctx.moveTo(x, height - 10); ctx.lineTo(x - 8, height - 30); ctx.lineTo(x + 8, height - 30); ctx.closePath(); ctx.fill(); clearGlow();
                } else if (state.type === 'error') {
                    applyGlow(`rgba(255, 80, 80, ${state.decay})`, 15 * state.decay); ctx.strokeStyle = `rgba(255, 80, 80, ${state.decay})`;
                    ctx.beginPath(); ctx.moveTo(x - 8, height - 30); ctx.lineTo(x + 8, height - 10); ctx.moveTo(x + 8, height - 30); ctx.lineTo(x - 8, height - 10); ctx.stroke(); clearGlow();
                    state.decay *= 0.9; if (state.decay < 0.05) { this.playerCannonState.delete(noteClass); }
                }
            }
            this.aliens.forEach(alien => {
                const aw = 20, ah = 20; applyGlow(alien.glowColor, 12); ctx.fillStyle = alien.baseColor; ctx.fillRect(alien.x, alien.y, aw, ah); clearGlow();
                const eyeSocketX = alien.x + aw * 0.25; const eyeSocketY = alien.y + ah * 0.20; const eyeSocketHeight = ah * 0.35;
                ctx.fillStyle = alien.eyeSocketColor; ctx.fillRect(eyeSocketX, eyeSocketY, alien.eyeSocketWidth, eyeSocketHeight);
                const pupilWidth = alien.eyeSocketWidth * 0.35; const pupilHeight = eyeSocketHeight * 0.65;
                const pupilX = eyeSocketX + (alien.eyeSocketWidth - pupilWidth) / 2 + alien.eyeOffsetX; const pupilY = eyeSocketY + (eyeSocketHeight - pupilHeight) / 2;
                ctx.fillStyle = alien.pupilColor; ctx.fillRect(pupilX, pupilY, pupilWidth, pupilHeight);
                applyGlow('rgba(138, 112, 214, 0.4)', 3); ctx.strokeStyle = alien.appendageColor; ctx.lineWidth = 2; ctx.fillStyle = alien.appendageColor;
                ctx.beginPath(); ctx.moveTo(alien.x+aw*0.25, alien.y); ctx.lineTo(alien.x+aw*0.15, alien.y-ah*0.4); ctx.moveTo(alien.x+aw*0.75, alien.y); ctx.lineTo(alien.x+aw*0.85, alien.y-ah*0.4); ctx.stroke();
                ctx.beginPath(); ctx.arc(alien.x+aw*0.15, alien.y-ah*0.4, 2.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(alien.x+aw*0.85, alien.y-ah*0.4, 2.5,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); const leg1YOffset = Math.sin(alien.legPhase) * alien.legMaxLengthOffset; ctx.moveTo(alien.x+aw*0.3, alien.y+ah); ctx.lineTo(alien.x+aw*0.2, alien.y+ah+ah*0.3+leg1YOffset);
                const leg2YOffset = Math.cos(alien.legPhase) * alien.legMaxLengthOffset; ctx.moveTo(alien.x+aw*0.7, alien.y+ah); ctx.lineTo(alien.x+aw*0.8, alien.y+ah+ah*0.3+leg2YOffset); ctx.stroke(); clearGlow();
            });
            this.lasers.forEach(laser => { applyGlow('#ff07eb', 20); ctx.fillStyle = '#ff07eb'; ctx.fillRect(laser.x - 3, laser.y + 5, 6, 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(laser.x - 1.5, laser.y, 3, 15); clearGlow(); });
            applyGlow('#e0e7ff', 8); ctx.fillStyle = '#e0e7ff'; ctx.font = 'bold 20px "Consolas", monospace';
            ctx.textAlign = 'left'; ctx.fillText(`SCORE: ${this.score}`, 15, 30); ctx.textAlign = 'right'; ctx.fillText(`WAVE: ${this.currentWaveNumber}`, width - 15, 30); clearGlow();
        }
        if (this.isGameOverDisplayActive) {
            ctx.fillStyle = 'rgba(13, 2, 33, 0.85)'; ctx.fillRect(0, 0, width, height); ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; this.stars.forEach(star => { ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill(); });
            const horizonY = height * 0.55; const vanishingPointX = width / 2; ctx.strokeStyle = 'rgba(255, 7, 235, 0.25)'; ctx.lineWidth = 1.5;
            for (let i = 0; i < 12; i++) { const yP = Math.pow(i / 11, 2); const y = horizonY + yP * (height - horizonY); if (y > height) break; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
            const numVLines = 10; for (let i = 0; i <= numVLines; i++) { const pF = i / numVLines; const xOffH = pF * (width*0.8); const xAtB = vanishingPointX + (i*(width/(numVLines*1.5))); ctx.beginPath();ctx.moveTo(vanishingPointX-xOffH,horizonY);ctx.lineTo(vanishingPointX-xAtB,height);ctx.stroke(); ctx.beginPath();ctx.moveTo(vanishingPointX+xOffH,horizonY);ctx.lineTo(vanishingPointX+xAtB,height);ctx.stroke(); }
            applyGlow('#ff07eb', 25); ctx.fillStyle = '#ff07eb'; ctx.font = 'bold 52px "Consolas", monospace'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', width/2, height/2 - 35); clearGlow();
            applyGlow('#03dac5', 15); ctx.fillStyle = '#03dac5'; ctx.font = 'bold 28px "Consolas", monospace'; ctx.fillText(`FINAL SCORE: ${this.score}`, width/2, height/2 + 35);
            ctx.font = 'bold 20px "Consolas", monospace'; ctx.fillText(`REACHED WAVE: ${this.currentWaveNumber}`, width/2, height/2 + 70); clearGlow();
        }
        let currentScanlineOpacity = this.scanlineOpacity; if(this.isGameOverDisplayActive) currentScanlineOpacity *= 1.5;
        ctx.fillStyle = `rgba(10, 0, 20, ${Math.min(currentScanlineOpacity, 1.0)})`; for (let y = 0; y < height; y += 4) { ctx.fillRect(0, y, width, 2); }
    }
    
    getHTML() { 
        return `
            <div class="control-row"><button id="ci_startBtn">START GAME</button></div>
            <div style="text-align: center; color: var(--color-text-secondary); margin-bottom: 10px; font-size: 0.9em;">
                Play the correct chord to shoot the invaders.
            </div>
            <div class="control-row"><label for="ci_key">Key:</label><select id="ci_key"></select><label for="ci_scale">Scale:</label><select id="ci_scale"></select></div>
            <canvas id="ci_canvas" width="400" height="400" class="display-canvas" style="background-color:#0d0221; margin-top:10px;"></canvas>
        `; 
    }
    
    initUI(container) {
        this.canvas = container.querySelector('#ci_canvas');
        if (!this.canvas) { return; }
        this.ctx = this.canvas.getContext('2d');
        this._initStars(150);
        this.startButton = container.querySelector('#ci_startBtn');
        this.keySelector = container.querySelector('#ci_key');
        this.scaleSelector = container.querySelector('#ci_scale');
        if (!this.startButton || !this.keySelector || !this.scaleSelector) { return; }
        ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach((n,i) => { this.keySelector.innerHTML += `<option value="${60+i}">${n}</option>`; });
        Object.keys(this.scales).forEach(s => { this.scaleSelector.innerHTML += `<option value="${s}">${s.replace('_',' ')}</option>`; });
        this.keySelector.value = this.rootNote.toString();
        this.scaleSelector.value = this.scaleType;
        this.startButton.addEventListener('click', () => this._startGame());
        this.keySelector.addEventListener('change', (e) => { this.rootNote = parseInt(e.target.value, 10); if (this.gameState === 'playing' && !this.isGameOverDisplayActive) { this.playerCannonState.clear(); this._spawnAlienWave(); } });
        this.scaleSelector.addEventListener('change', (e) => { this.scaleType = e.target.value; if (this.gameState === 'playing' && !this.isGameOverDisplayActive) { this.playerCannonState.clear(); this._spawnAlienWave(); } });
        
        // --- ATTACH OBSERVER ---
        const pianoContainer = document.getElementById('piano');
        if (pianoContainer) {
            const observerCallback = (mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const keyEl = mutation.target;
                        if (keyEl.dataset.midiNote) {
                            const midiNote = parseInt(keyEl.dataset.midiNote, 10);
                            const noteClass = midiNote % 12;
                            if (keyEl.classList.contains('pressed')) {
                                this._handlePlayerKeyPress(noteClass);
                            } else {
                                this._handlePlayerKeyRelease(noteClass);
                            }
                        }
                    }
                }
            };
            this.observer = new MutationObserver(observerCallback);
            this.observer.observe(pianoContainer, { attributes: true, subtree: true, attributeFilter: ['class'] });
        }
        
        this._draw();
    }
    
    updateParams() { /* Satisfies host contract */ }
    
    destroy() { 
        this._gameOver();
        // --- DETACH OBSERVER ---
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

if (window.registerSynthModule) {
    window.registerSynthModule(ChordInvadersModule);
}