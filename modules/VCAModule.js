/**
 * Example Synth Module: A Voltage Controlled Amplifier (VCA).
 *
 * This module is a fundamental utility that acts as a volume control that can
 * be modulated by other signals. It features its own internal, tempo-synced
 * LFO for creating tremolo effects, and can also be controlled by an external
 * module to demonstrate the concept of "Control Voltage" (CV).
 *
 * This module demonstrates:
 * - A fundamental building block of modular synthesis.
 * - The concept of "Control Voltage" and inter-module patching.
 * - A versatile tool for creating tremolo and other amplitude modulation effects.
 */
class VCAModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'vcaModule';
        this.name = 'VCA';
        
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // The vcaGain is the core of the module. Audio passes through it.
            vcaGain: this.audioContext.createGain(),
            
            // --- Internal LFO for Tremolo ---
            internalLFO: this.audioContext.createOscillator(),
            internalLFODepth: this.audioContext.createGain(),
        };

        // --- Configure and Start LFO ---
        this.nodes.internalLFO.type = 'sine';
        this.nodes.internalLFO.start(0);

        // --- Connect Audio Graph ---
        // The audio path is simple: input -> vcaGain -> output
        this.nodes.input.connect(this.nodes.vcaGain);
        this.nodes.vcaGain.connect(this.nodes.output);
        
        // The 'gain' AudioParam of vcaGain is our modulation target.
        this.modulationTarget = this.nodes.vcaGain.gain;
        
        // By default, the internal LFO is connected.
        this.nodes.internalLFO.connect(this.nodes.internalLFODepth);
        this.nodes.internalLFODepth.connect(this.modulationTarget);
    }
    
    updateModulationSource(source) {
        // Disconnect all existing modulation sources from our target
        this.nodes.internalLFODepth.disconnect();
        if (this.externalSourceNode) {
            this.externalSourceNode.disconnect(this.modulationTarget);
        }

        if (source === 'internal') {
            // Reconnect the internal LFO
            this.nodes.internalLFODepth.connect(this.modulationTarget);
            this.externalSourceNode = null;
        } else if (source === 'external') {
            // Attempt to connect to an external source.
            // For this demo, we'll hard-code it to the "Wobble LFO" module's output.
            if (window.wobbleLFOModule && window.wobbleLFOModule.nodes.depth) {
                this.externalSourceNode = window.wobbleLFOModule.nodes.depth;
                this.externalSourceNode.connect(this.modulationTarget);
                console.log("VCA connected to external Wobble LFO.");
            } else {
                console.warn("VCA: External source 'wobbleLFOModule' not found. Reverting to internal LFO.");
                // Fallback to internal if the external one doesn't exist.
                this.nodes.internalLFODepth.connect(this.modulationTarget);
                this.sourceSelector.value = 'internal';
            }
        }
        this.updateParams();
    }
    
    updateParams() {
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        const initialLevel = parseFloat(this.level.slider.value);
        const modDepth = parseFloat(this.depth.slider.value);
        
        // The base gain is set by the "Initial Level" knob.
        this.modulationTarget.setValueAtTime(initialLevel, time);
        
        // The modulation depth is controlled by the gain of our LFO's output.
        // The LFO signal is bipolar (-1 to 1). We scale it by the depth.
        // The final result is: initialLevel + (lfoSignal * modDepth)
        this.nodes.internalLFODepth.gain.setTargetAtTime(modDepth, time, smoothing);
        
        // If an external source is used, we assume its output gain is controlled by its own module.
        // The "Mod Depth" knob on this VCA will have no effect in external mode.
        this.depth.slider.disabled = this.sourceSelector.value === 'external';

        // Update the internal LFO's rate regardless, so it's ready if switched back.
        const bpm = window.bpm || 120;
        const rateDivision = parseFloat(this.rate.selector.value);
        const lfoRateHz = 1 / ((60 / bpm) * (4 / rateDivision));
        this.nodes.internalLFO.frequency.setTargetAtTime(lfoRateHz, time, smoothing);
    }
    
    getHTML() {
        return `
            <div class="control-row">
                <label for="vcaLevel">Initial Level:</label>
                <input type="range" id="vcaLevel" min="0" max="1" value="1.0" step="0.01">
                <span id="vcaLevelVal" class="value-display">1.00</span>
            </div>
            <hr style="border-color: var(--color-bg-medium); margin: 15px 0;">
            <div class="control-row">
                <label for="vcaModSource">Mod Source:</label>
                <select id="vcaModSource" style="flex-grow:1;">
                    <option value="internal" selected>Internal LFO</option>
                    <option value="external">External (Wobble)</option>
                </select>
            </div>
            <div class="control-row">
                <label for="vcaModDepth">Mod Depth:</label>
                <input type="range" id="vcaModDepth" min="0" max="1" value="0" step="0.01">
                <span id="vcaModDepthVal" class="value-display">0.00</span>
            </div>
             <div class="control-row">
                <label for="vcaRate">Internal LFO Rate:</label>
                <select id="vcaRate" style="flex-grow:1;">
                    <option value="4">1/4</option>
                    <option value="8" selected>1/8</option>
                    <option value="16">1/16</option>
                </select>
            </div>
        `;
    }

    initUI(container) {
        this.level = { slider: container.querySelector('#vcaLevel'), val: container.querySelector('#vcaLevelVal') };
        this.depth = { slider: container.querySelector('#vcaModDepth'), val: container.querySelector('#vcaModDepthVal') };
        this.sourceSelector = container.querySelector('#vcaModSource');
        this.rate = { selector: container.querySelector('#vcaRate') };

        this.level.slider.addEventListener('input', () => {
            this.level.val.textContent = parseFloat(this.level.slider.value).toFixed(2);
            this.updateParams();
        });
        this.depth.slider.addEventListener('input', () => {
            this.depth.val.textContent = parseFloat(this.depth.slider.value).toFixed(2);
            this.updateParams();
        });
        
        this.sourceSelector.addEventListener('change', () => {
            this.updateModulationSource(this.sourceSelector.value);
        });
        
        this.rate.selector.addEventListener('change', () => this.updateParams());
        
        this.updateParams();
    }
    
    destroy() {
        this.nodes.internalLFO.stop();
        if (this.externalSourceNode) {
            this.externalSourceNode.disconnect(this.modulationTarget);
        }
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(VCAModule);