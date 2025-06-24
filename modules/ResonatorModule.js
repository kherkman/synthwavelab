/**
 * Example Synth Module: A Resonator Bank.
 *
 * This module simulates the resonant properties of an object by running the
 * input signal through a parallel bank of sharp, tuned band-pass filters.
 * It can impose a chordal or melodic character onto any sound source.
 *
 * This module demonstrates:
 * - A parallel bank of BiquadFilterNodes for physical modeling.
 * - Programmatically calculating filter frequencies based on musical scales.
 * - Combining multiple audio sources back into a single output.
 */
class ResonatorModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'resonatorModule';
        this.name = 'Resonator Bank';
        this.numResonators = 5; // Create a 5-note chord resonator
        this.resonatorFilters = [];

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
        };

        // --- Create the parallel filter bank ---
        for (let i = 0; i < this.numResonators; i++) {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            
            // The input signal is sent to every filter in parallel
            this.nodes.input.connect(filter);
            // The output of every filter is mixed into the master wet gain node
            filter.connect(this.nodes.wetGain);

            this.resonatorFilters.push(filter);
        }

        // --- Connect Wet/Dry Mix ---
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        this.nodes.wetGain.connect(this.nodes.output);
    }

    /**
     * Converts a MIDI note number to a frequency in Hz.
     * @private
     */
    _midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        // Create options for MIDI root notes
        let noteOptions = '';
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        for (let i = 24; i <= 84; i++) { // From C1 to C6
            const noteName = noteNames[i % 12];
            const octave = Math.floor(i / 12) - 1;
            const selected = i === 48 ? 'selected' : ''; // Default to C3
            noteOptions += `<option value="${i}" ${selected}>${noteName}${octave}</option>`;
        }

        return `
            <div class="control-row">
                <label for="resRootNote">Root Note:</label>
                <select id="resRootNote" style="flex-grow:1;">${noteOptions}</select>
            </div>
            <div class="control-row">
                <label for="resChordType">Chord Type:</label>
                <select id="resChordType" style="flex-grow:1;">
                    <option value="major" selected>Major</option>
                    <option value="minor">Minor</option>
                    <option value="major7">Major 7th</option>
                    <option value="minor7">Minor 7th</option>
                    <option value="dom7">Dominant 7th</option>
                    <option value="octaves">Octaves</option>
                    <option value="fifths">Fifths</option>
                </select>
            </div>
            <div class="control-row">
                <label for="resQ">Resonance (Q):</label>
                <input type="range" id="resQ" min="10" max="200" value="80" step="1">
                <span id="resQVal" class="value-display">80</span>
            </div>
            <div class="control-row">
                <label for="resMix">Mix (Wet):</label>
                <input type="range" id="resMix" min="0" max="1" value="0.7" step="0.01">
                <span id="resMixVal" class="value-display">0.70</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.rootNote = { selector: container.querySelector('#resRootNote') };
        this.chordType = { selector: container.querySelector('#resChordType') };
        this.q = { slider: container.querySelector('#resQ'), val: container.querySelector('#resQVal') };
        this.mix = { slider: container.querySelector('#resMix'), val: container.querySelector('#resMixVal') };

        // Attach listeners
        this.rootNote.selector.addEventListener('change', () => this.updateParams());
        this.chordType.selector.addEventListener('change', () => this.updateParams());
        
        this.q.slider.addEventListener('input', () => {
            this.q.val.textContent = this.q.slider.value;
            this.updateParams();
        });
        this.mix.slider.addEventListener('input', () => {
            this.mix.val.textContent = parseFloat(this.mix.slider.value).toFixed(2);
            this.updateParams();
        });

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (this.resonatorFilters.length === 0) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const rootMidi = parseInt(this.rootNote.selector.value, 10);
        const chordType = this.chordType.selector.value;
        const q = parseFloat(this.q.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // --- Define Chord Intervals (in semitones) ---
        const intervals = {
            major:   [0, 4, 7, 12, 16],
            minor:   [0, 3, 7, 12, 15],
            major7:  [0, 4, 7, 11, 12],
            minor7:  [0, 3, 7, 10, 12],
            dom7:    [0, 4, 7, 10, 12],
            octaves: [0, 12, 24, 36, 48],
            fifths:  [0, 7, 12, 19, 24],
        };
        const currentIntervals = intervals[chordType];

        // --- Tune each filter in the bank ---
        this.resonatorFilters.forEach((filter, i) => {
            const midiNote = rootMidi + currentIntervals[i];
            const frequency = this._midiToFreq(midiNote);
            
            filter.frequency.setTargetAtTime(frequency, time, smoothing);
            filter.Q.setTargetAtTime(q, time, smoothing);
        });
        
        // --- Update Wet/Dry Mix ---
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ResonatorModule);