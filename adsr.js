/**
 * Synthwave Lab - ADSR Module
 * Hallitsee Attack, Decay, Sustain ja Release -parametreja sekä visualisointia.
 * Toimii ilman palvelinta globaalin alustusfunktion kautta.
 */

window.initSynthLabADSR = (ui) => {
    'use strict';

    /**
     * Piirtää ADSR-käyrän keltaisella neon-värillä canvas-elementille.
     * Laskee suhteelliset etäisyydet Attack-, Decay- ja Release-ajoille.
     */
    const drawAdsrCurve = () => {
        const canvas = ui.adsrCanvas;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const styles = getComputedStyle(document.documentElement);

        // Noudetaan arvot liukusäätimistä
        const attack = parseFloat(ui.adsrAttack.value);
        const decay = parseFloat(ui.adsrDecay.value);
        const sustain = parseFloat(ui.adsrSustain.value);
        const release = parseFloat(ui.adsrRelease.value);

        // Tyhjennetään tausta
        ctx.fillStyle = styles.getPropertyValue('--color-bg-container-opaque').trim();
        ctx.fillRect(0, 0, width, height);

        // Lasketaan visualisoinnin aikajanan pituus (kiinteä 1s sustain-vaiheelle visualisointiin)
        const totalDuration = attack + decay + 1 + release;
        const padding = 10;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // Lasketaan pisteet (X, Y)
        const x1 = padding;                                                  // Alku (nolla)
        const x2 = padding + (attack / totalDuration) * graphWidth;          // Attackin huippu
        const x3 = padding + ((attack + decay) / totalDuration) * graphWidth; // Decayn loppu / Sustainin alku
        const x4 = padding + ((attack + decay + 1) / totalDuration) * graphWidth; // Sustainin loppu / Releasen alku
        const x5 = padding + ((attack + decay + 1 + release) / totalDuration) * graphWidth; // Loppu

        const yTop = padding;                                                // Maksimivoimakkuus
        const ySustain = padding + (1 - sustain) * graphHeight;              // Sustain-taso
        const yBottom = padding + graphHeight;                               // Hiljaisuus

        // Piirretään viiva
        ctx.strokeStyle = styles.getPropertyValue('--color-neon-yellow').trim();
        ctx.lineWidth = 2;
        ctx.shadowColor = styles.getPropertyValue('--color-neon-yellow').trim();
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.moveTo(x1, yBottom);    // Aloituspiste
        ctx.lineTo(x2, yTop);       // Attack
        ctx.lineTo(x3, ySustain);    // Decay
        ctx.lineTo(x4, ySustain);    // Sustain (pito)
        ctx.lineTo(x5, yBottom);    // Release
        ctx.stroke();

        ctx.shadowBlur = 0;
    };

    /**
     * Palauttaa nykyiset ADSR-asetukset objektina.
     * Hyödyllinen esim. tallennusta tai playNote-funktiota varten.
     */
    const getSettings = () => {
        return {
            attack: parseFloat(ui.adsrAttack.value),
            decay: parseFloat(ui.adsrDecay.value),
            sustain: parseFloat(ui.adsrSustain.value),
            release: parseFloat(ui.adsrRelease.value),
            velocitySens: parseFloat(ui.adsrVelocitySens.value)
        };
    };

    // --- TAPAHTUMANKUUNTELIJAT ---

    const adsrInputs = [
        ui.adsrAttack,
        ui.adsrDecay,
        ui.adsrSustain,
        ui.adsrRelease,
        ui.adsrVelocitySens
    ];

    adsrInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                drawAdsrCurve();
            });
        }
    });

    // Ensimmäinen piirto alustuksen yhteydessä
    drawAdsrCurve();

    // Rajapinta pääohjelmalle
    return {
        draw: drawAdsrCurve,
        getSettings: getSettings
    };
};