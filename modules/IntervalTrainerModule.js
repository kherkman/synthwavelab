/**
 * Example Synth Module: A Musical Interval Trainer.
 *
 * This module is a self-contained ear-training game. It plays two notes
 * in sequence and asks the user to identify the musical interval between them.
 *
 * This module demonstrates:
 * - An interactive, educational music theory tool.
 * - Self-contained sound generation for a specific purpose.
 * - Game logic and user feedback within a modular structure.
 */
class IntervalTrainerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'intervalTrainerModule';
        this.name = 'Interval Trainer';
        
        // This module is purely for the game, no pass-through audio.
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            vca: this.audioContext.createGain(),
        };
        this.nodes.vca.connect(this.nodes.output);
        
        this.currentInterval = null; // Stores the semitone value of the current interval
        
        // --- Interval Definitions ---
        this.intervals = {
            'Min 2nd': 1, 'Maj 2nd': 2, 'Min 3rd': 3, 'Maj 3rd': 4,
            'Perf 4th': 5, 'Tritone': 6, 'Perf 5th': 7, 'Min 6th': 8,
            'Maj 6th': 9, 'Min 7th': 10, 'Maj 7th': 11, 'Octave': 12
        };
    }

    _midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }
    
    /**
     * Plays the two notes of the current interval.
     * @private
     */
    _playInterval() {
        if (this.rootNoteMidi === undefined || this.currentInterval === undefined) return;
        
        const now = this.audioContext.currentTime;
        const noteDuration = 0.4;
        const gap = 0.1;
        
        const note1Freq = this._midiToFreq(this.rootNoteMidi);
        const note2Freq = this._midiToFreq(this.rootNoteMidi + this.currentInterval);

        const playNote = (freq, startTime) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(this.nodes.vca);
            
            // Envelope
            this.nodes.vca.gain.setValueAtTime(0, startTime);
            this.nodes.vca.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
            this.nodes.vca.gain.linearRampToValueAtTime(0, startTime + noteDuration);

            osc.start(startTime);
            osc.stop(startTime + noteDuration + 0.01);
        };
        
        // Schedule both notes
        playNote(note1Freq, now);
        playNote(note2Freq, now + noteDuration + gap);
    }
    
    /**
     * Generates a new random interval and plays it.
     * @private
     */
    _newQuestion() {
        // Pick a random root note from a comfortable range (C3 to C5)
        this.rootNoteMidi = 48 + Math.floor(Math.random() * 24);
        
        // Pick a random interval
        const intervalNames = Object.keys(this.intervals);
        const randomIntervalName = intervalNames[Math.floor(Math.random() * intervalNames.length)];
        this.currentInterval = this.intervals[randomIntervalName];
        
        this.feedbackDisplay.textContent = 'Which interval did you hear?';
        this.feedbackDisplay.style.color = 'var(--color-text-secondary)';
        
        this._playInterval();
    }
    
    /**
     * Checks the user's answer.
     * @private
     */
    _checkAnswer(guessedIntervalValue) {
        if (this.currentInterval === null) return;
        
        const correctName = Object.keys(this.intervals).find(name => this.intervals[name] === this.currentInterval);

        if (guessedIntervalValue == this.currentInterval) {
            this.feedbackDisplay.textContent = `Correct! It was a ${correctName}.`;
            this.feedbackDisplay.style.color = 'var(--color-neon-green)';
        } else {
            this.feedbackDisplay.textContent = `Incorrect. The correct answer was ${correctName}.`;
            this.feedbackDisplay.style.color = 'var(--color-neon-pink)';
        }
        this.currentInterval = null; // Prevent re-checking the same answer
    }


    getHTML() {
        let buttonsHTML = '<div id="intervalButtons" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">';
        for (const name in this.intervals) {
            buttonsHTML += `<button class="interval-btn" data-interval="${this.intervals[name]}">${name}</button>`;
        }
        buttonsHTML += '</div>';

        return `
            <style>
                .interval-btn { font-size: 0.9em; padding: 8px 4px; text-transform: none; letter-spacing: 0; }
            </style>
            <div class="control-row" style="margin-bottom:15px;">
                <button id="newIntervalBtn" style="width: 50%; height: 40px;">New Interval</button>
                <button id="repeatIntervalBtn" style="width: 50%; height: 40px;">Repeat</button>
            </div>
            <div id="intervalFeedback" style="text-align: center; min-height: 2em; padding: 10px; color: var(--color-text-secondary);">
                Click "New Interval" to start.
            </div>
            ${buttonsHTML}
        `;
    }

    initUI(container) {
        this.newIntervalButton = container.querySelector('#newIntervalBtn');
        this.repeatIntervalButton = container.querySelector('#repeatIntervalBtn');
        this.feedbackDisplay = container.querySelector('#intervalFeedback');
        this.buttonContainer = container.querySelector('#intervalButtons');

        this.newIntervalButton.addEventListener('click', () => this._newQuestion());
        this.repeatIntervalButton.addEventListener('click', () => this._playInterval());
        
        this.buttonContainer.addEventListener('click', (e) => {
            if (e.target.matches('.interval-btn')) {
                const guessedInterval = parseInt(e.target.dataset.interval, 10);
                this._checkAnswer(guessedInterval);
            }
        });
    }

    updateParams() {
        // This module does not have continuously updatable parameters.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(IntervalTrainerModule);