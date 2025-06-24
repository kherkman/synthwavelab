/**
 * Example Synth Module: A Rotary Speaker Simulator (Leslie).
 *
 * This module is an audio processor that simulates the iconic sound of a
 * Leslie rotary speaker. It splits the signal into high and low frequencies
 * and modulates their panning and amplitude at different rates to create a
 * complex, swirling, 3D sound.
 *
 * This module demonstrates:
 * - A simulation of a complex electro-mechanical device.
 * - A multi-band effects processor with independent modulation.
 * - A dynamic effect with a "speed" control that ramps between two states.
 */
class RotarySpeakerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'rotarySpeakerModule';
        this.name = 'Rotary Speaker';
        
        this.isFast = false;
        
        // --- Speed settings in Hz ---
        this.speeds = {
            slow: { horn: 0.8, rotor: 0.7 },
            fast: { horn: 7.0, rotor: 6.0 },
        };
        this.rampTime = 1.5; // Time in seconds to spin up/down

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // --- Crossover Filters ---
            highPass: this.audioContext.createBiquadFilter(),
            lowPass: this.audioContext.createBiquadFilter(),
            
            // --- High Frequency ("Horn") Path ---
            hornPanner: this.audioContext.createStereoPanner(),
            hornVCA: this.audioContext.createGain(),
            hornLFO: this.audioContext.createOscillator(),
            
            // --- Low Frequency ("Rotor") Path ---
            rotorPanner: this.audioContext.createStereoPanner(),
            rotorVCA: this.audioContext.createGain(),
            rotorLFO: this.audioContext.createOscillator(),
        };

        // --- Configure Nodes ---
        const crossoverFreq = 800;
        this.nodes.highPass.type = 'highpass';
        this.nodes.highPass.frequency.value = crossoverFreq;
        this.nodes.lowPass.type = 'lowpass';
        this.nodes.lowPass.frequency.value = crossoverFreq;
        
        this.nodes.hornLFO.type = 'sine';
        this.nodes.rotorLFO.type = 'sine';
        
        // --- Connect Audio Graph ---
        // Input splits into high and low bands
        this.nodes.input.connect(this.nodes.highPass);
        this.nodes.input.connect(this.nodes.lowPass);
        
        // High-frequency path
        this.nodes.highPass.connect(this.nodes.hornVCA);
        this.nodes.hornVCA.connect(this.nodes.hornPanner);
        this.nodes.hornPanner.connect(this.nodes.output);
        
        // Low-frequency path
        this.nodes.lowPass.connect(this.nodes.rotorVCA);
        this.nodes.rotorVCA.connect(this.nodes.rotorPanner);
        this.nodes.rotorPanner.connect(this.nodes.output);
        
        // --- Connect Modulation Graph ---
        // Horn LFO controls horn panning and volume
        this.nodes.hornLFO.connect(this.nodes.hornPanner.pan);
        const hornDepth = this.audioContext.createGain();
        hornDepth.gain.value = 0.15; // Subtle amplitude modulation
        this.nodes.hornLFO.connect(hornDepth).connect(this.nodes.hornVCA.gain);
        
        // Rotor LFO controls rotor panning and volume
        this.nodes.rotorLFO.connect(this.nodes.rotorPanner.pan);
        const rotorDepth = this.audioContext.createGain();
        rotorDepth.gain.value = 0.15;
        this.nodes.rotorLFO.connect(rotorDepth).connect(this.nodes.rotorVCA.gain);
        
        // --- Start LFOs ---
        this.nodes.hornLFO.start(0);
        this.nodes.rotorLFO.start(0);
        
        this.setSpeed(false); // Initialize at slow speed
    }
    
    setSpeed(fast) {
        this.isFast = fast;
        const now = this.audioContext.currentTime;
        const targetSpeeds = fast ? this.speeds.fast : this.speeds.slow;
        
        // Smoothly ramp the LFO frequencies to the new target speeds
        this.nodes.hornLFO.frequency.linearRampToValueAtTime(targetSpeeds.horn, now + this.rampTime);
        this.nodes.rotorLFO.frequency.linearRampToValueAtTime(targetSpeeds.rotor, now + this.rampTime);
        
        if (this.speedButton) {
            this.speedButton.textContent = fast ? 'Tremolo (Fast)' : 'Chorale (Slow)';
            this.speedButton.classList.toggle('active', fast);
        }
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="rotarySpeedBtn" class="toggle-button" style="width: 100%; height: 50px;">Chorale (Slow)</button>
            </div>
            <div class="control-row">
                <label for="rotaryRampTime">Spin Up/Down (s):</label>
                <input type="range" id="rotaryRampTime" min="0.5" max="5.0" value="1.5" step="0.1">
                <span id="rotaryRampTimeVal" class="value-display">1.5</span>
            </div>
        `;
    }

    initUI(container) {
        this.speedButton = container.querySelector('#rotarySpeedBtn');
        this.rampTimeSlider = { slider: container.querySelector('#rotaryRampTime'), val: container.querySelector('#rotaryRampTimeVal') };
        
        this.speedButton.addEventListener('click', () => {
            this.setSpeed(!this.isFast);
        });
        
        this.rampTimeSlider.slider.addEventListener('input', () => {
            this.rampTime = parseFloat(this.rampTimeSlider.slider.value);
            this.rampTimeSlider.val.textContent = this.rampTime.toFixed(1);
        });
    }

    updateParams() {
        // All logic is handled by the setSpeed method.
    }
    
    destroy() {
        Object.values(this.nodes).forEach(node => node.stop && node.stop(0));
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(RotarySpeakerModule);