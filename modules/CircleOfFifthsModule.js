/**
 * Example Synth Module: A "Circle of Fifths" Interactive Chord Player.
 *
 * This module is a self-contained musical instrument and music theory tool.
 * It displays an interactive Circle of Fifths, allowing the user to play
 * chords by clicking on keys and see the harmonic relationships between them.
 *
 * This module demonstrates:
 * - A powerful, interactive visualization of a core music theory concept.
 * - A tool for composition and learning about functional harmony.
 * - A self-contained polyphonic synthesizer for chord playback.
 */
class CircleOfFifthsModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'circleOfFifthsModule';
        this.name = 'Circle of Fifths';

        this.nodes = { input: this.audioContext.createGain(), output: this.audioContext.createGain() };
        
        // --- State ---
        this.activeVoices = new Map();
        this.tonic = 0; // C
        this.chordType = 'maj';

        // C, G, D, A, E, B, F#, C#, G#, D#, A#, F
        this.fifthsOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    }

    _playChord(rootMidi) {
        this._stopAllVoices();
        
        const chordFormulas = {
            'maj': [0, 4, 7],
            'min': [0, 3, 7],
            'dim': [0, 3, 6],
            'aug': [0, 4, 8],
            'maj7': [0, 4, 7, 11],
            'min7': [0, 3, 7, 10],
            'dom7': [0, 4, 7, 10],
        };
        
        const intervals = chordFormulas[this.chordType];
        if (!intervals) return;
        
        intervals.forEach(interval => {
            const midiNote = rootMidi + interval;
            const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
            this._playVoice(midiNote, freq);
        });
    }

    _playVoice(noteId, freq) {
        const now = this.audioContext.currentTime;
        const voice = {
            osc: this.audioContext.createOscillator(),
            vca: this.audioContext.createGain(),
        };
        
        voice.osc.type = 'triangle';
        voice.osc.frequency.value = freq;
        
        voice.osc.connect(voice.vca).connect(this.nodes.output);
        
        voice.vca.gain.setValueAtTime(0, now);
        voice.vca.gain.linearRampToValueAtTime(0.3, now + 0.01);
        
        voice.osc.start(now);
        this.activeVoices.set(noteId, voice);
    }
    
    _stopAllVoices() {
        const now = this.audioContext.currentTime;
        this.activeVoices.forEach((voice, noteId) => {
            voice.vca.gain.setTargetAtTime(0, now, 0.2);
            voice.osc.stop(now + 1.0);
        });
        this.activeVoices.clear();
    }
    
    _updateChordHighlights() {
        const tonicMidi = this.tonic;
        const relativeChords = {
            I: tonicMidi % 12,
            IV: (tonicMidi + 5) % 12,
            V: (tonicMidi + 7) % 12,
            vi: (tonicMidi + 9) % 12,
        };
        
        this.keyButtons.forEach(button => {
            const keyMidi = parseInt(button.dataset.midi, 10) % 12;
            button.classList.remove('tonic', 'relative');
            
            if (keyMidi === relativeChords.I) button.classList.add('tonic');
            else if (Object.values(relativeChords).includes(keyMidi)) {
                button.classList.add('relative');
            }
        });
    }

    getHTML() {
        return `
            <style>
                #circle-container {
                    position: relative;
                    width: 280px;
                    height: 280px;
                    margin: 20px auto;
                }
                .key-btn {
                    position: absolute;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: 2px solid var(--color-neon-blue);
                    background-color: var(--color-bg-deep);
                    color: var(--color-text-primary);
                    font-size: 1.2em;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.1s ease;
                }
                .key-btn:hover { background-color: var(--color-bg-medium); }
                .key-btn:active { transform: scale(0.95); }
                .key-btn.tonic { border-color: var(--color-neon-yellow); color: var(--color-neon-yellow); font-weight: bold; }
                .key-btn.relative { border-color: var(--color-neon-cyan); }
            </style>
            <div class="control-row">
                <label for="circleChordType">Chord Type:</label>
                <select id="circleChordType" style="flex-grow:1;">
                    <option value="maj" selected>Major</option>
                    <option value="min">Minor</option>
                    <option value="dom7">Dominant 7th</option>
                    <option value="maj7">Major 7th</option>
                    <option value="min7">Minor 7th</option>
                    <option value="dim">Diminished</option>
                    <option value="aug">Augmented</option>
                </select>
            </div>
            <div id="circle-container"></div>
            <p style="font-size: 0.85em; color: var(--color-text-secondary); text-align: center; margin: 0;">
                Click a key to play a chord. Click it again to set it as the Tonic.
            </p>
        `;
    }

    initUI(container) {
        this.container = container.querySelector('#circle-container');
        this.chordTypeSelector = container.querySelector('#circleChordType');
        this.keyButtons = [];
        
        const radius = 110;
        const centerX = 140;
        const centerY = 140;
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * 2 * Math.PI - (Math.PI / 2); // Start at 12 o'clock
            const x = centerX + radius * Math.cos(angle) - 30;
            const y = centerY + radius * Math.sin(angle) - 30;
            
            const rootNoteMidi = this.fifthsOrder[i];
            
            const button = document.createElement('button');
            button.className = 'key-btn';
            button.textContent = this.noteNames[rootNoteMidi];
            button.style.left = `${x}px`;
            button.style.top = `${y}px`;
            button.dataset.midi = rootNoteMidi;
            
            button.addEventListener('mousedown', (e) => {
                const root = parseInt(e.target.dataset.midi, 10);
                if (this.tonic === root) {
                    this._stopAllVoices(); // Stop sound if clicking the tonic again
                } else {
                    this._playChord(60 + root); // Play in 4th octave
                }
            });
            
            button.addEventListener('click', (e) => {
                const root = parseInt(e.target.dataset.midi, 10);
                this.tonic = root;
                this._updateChordHighlights();
            });

            this.container.appendChild(button);
            this.keyButtons.push(button);
        }
        
        this.chordTypeSelector.addEventListener('change', () => {
            this.chordType = this.chordTypeSelector.value;
        });

        document.addEventListener('mouseup', () => this._stopAllVoices());
        
        this._updateChordHighlights();
    }
    
    updateParams() {}
    destroy() { document.removeEventListener('mouseup', this._stopAllVoices); }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(CircleOfFifthsModule);