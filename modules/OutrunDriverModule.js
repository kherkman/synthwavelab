class OutrunDriverModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'outrunDriverModule';
        this.name = 'Outrun Driver'; // Shortened name for display

        this.nodes = { input: this.audioContext.createGain(), output: this.audioContext.createGain() };
        
        this.playerCar = {
            xOffset: 0, 
            widthRatio: 0.22, 
            heightRatio: 0.22 * 0.45, 
            color: '#8B0000', 
            pixelWidth: 0, 
            pixelHeight: 0 
        };

        this.isEngineOn = false; this.engine = {}; this.speed = 0; this.rpm = 0; this.gear = 1;
        this.gearRatios = [0, 2.5, 1.8, 1.3, 1.0, 0.8];
        this.roadSegmentLength = 20; this.roadSegmentCount = 100; this.roadWidth = 0.9; this.roadPosition = 0;
        this.isDrawing = false; this.animationFrameId = null; this.keysPressed = {}; this.carMoveSpeed = 7;

        this.npcCars = []; this.npcBaseWidthRatio = 0.20; this.npcBaseHeightRatio = this.npcBaseWidthRatio * 0.5;
        this.npcSpawnInterval = 120; this.npcSpawnTimer = this.npcSpawnInterval;
        this.npcBaseSpeed = 1.0; 
        this.npcColors = ['#003366', '#660066', '#404040', '#005000', '#502000'];
        this.score = 0; this.isGameOver = false; this.cameraDepth = 300;

        this.midiAccess = null; this.midiInputs = []; this.modWheelValue = 63.5;
        this.midiModWheelActive = false; 
    }

    _resetAndStartGame() { 
        this.isGameOver=false;this.score=0;this.playerCar.xOffset=0;this.npcCars=[];this.npcSpawnTimer=this.npcSpawnInterval;
        this.speed=0;this.rpm=0;this.gear=1;this.modWheelValue=63.5; this.midiModWheelActive = false;
        if(this.engineButton){this.engineButton.textContent="Start Engine";this.engineButton.disabled=false;this.engineButton.classList.remove('active');}
        if(this.accelerator&&this.accelerator.slider){this.accelerator.slider.disabled=false;this.accelerator.slider.value=0;if(this.accelerator.val)this.accelerator.val.textContent="0.00";}
        if(this.leftButton)this.leftButton.disabled=false;if(this.rightButton)this.rightButton.disabled=false;
        this.isEngineOn=false;if(Object.keys(this.engine).length>0){const now=this.audioContext.currentTime>0?this.audioContext.currentTime:0.001;if(this.engine.vca)this.engine.vca.gain.setTargetAtTime(0,now,0.01);Object.values(this.engine).forEach(node=>{if(node instanceof AudioScheduledSourceNode)node.stop(now+0.05);});this.engine={};}
        if(!this.isDrawing){this._startDrawing();}
    }

    _performToggleEngine(start) {
        const now=this.audioContext.currentTime>0?this.audioContext.currentTime:0.001;
        if(start&&!this.isEngineOn){this.isEngineOn=true;if(this.engineButton){this.engineButton.classList.add('active');this.engineButton.textContent="Engine ON";}this.engine.osc1=this.audioContext.createOscillator();this.engine.osc2=this.audioContext.createOscillator();this.engine.turbo=this.audioContext.createOscillator();this.engine.filter=this.audioContext.createBiquadFilter();this.engine.vca=this.audioContext.createGain();this.engine.turboGain=this.audioContext.createGain();this.engine.osc1.type='sawtooth';this.engine.osc2.type='sawtooth';this.engine.turbo.type='sine';this.engine.filter.type='lowpass';this.engine.osc1.connect(this.engine.filter);this.engine.osc2.connect(this.engine.filter);this.engine.filter.connect(this.engine.vca);this.engine.turbo.connect(this.engine.turboGain);this.engine.turboGain.connect(this.engine.vca);this.engine.vca.connect(this.nodes.output);this.engine.vca.gain.setValueAtTime(0,now);this.engine.turboGain.gain.setValueAtTime(0,now);Object.values(this.engine).forEach(node=>{if(node instanceof AudioScheduledSourceNode)node.start(now);});if(!this.isDrawing)this._startDrawing();}
        else if(!start&&this.isEngineOn){this.isEngineOn=false;if(this.engineButton){this.engineButton.classList.remove('active');this.engineButton.textContent="Start Engine";}if(this.engine.vca){this.engine.vca.gain.setTargetAtTime(0,now,0.2);Object.values(this.engine).forEach(node=>{if(node instanceof AudioScheduledSourceNode)node.stop(now+0.5);});}this.engine={};if(this.accelerator&&parseFloat(this.accelerator.slider.value)===0&&!this.isGameOver){this._stopDrawing();}}
    }
    
    _toggleEngine(startCommand) {
        if(this.isGameOver){this._resetAndStartGame();return;}if(this.audioContext.state==='suspended'){this.audioContext.resume().then(()=>{this._performToggleEngine(startCommand);}).catch(err=>console.error("AudioContext resume failed:",err));return;}this._performToggleEngine(startCommand);
    }

    _spawnNpc() { 
        if(!this.canvas)return;const lane=Math.floor(Math.random()*3)-1;const color=this.npcColors[Math.floor(Math.random()*this.npcColors.length)];const horizonY=this.canvas.height*0.4;this.npcCars.push({lane:lane,y:horizonY,z:0,color:color,widthRatio:this.npcBaseWidthRatio*(0.8+Math.random()*0.2),heightRatio:this.npcBaseHeightRatio*(0.8+Math.random()*0.2)});
    }

    _updateNpcsAndCollision() { 
        if(!this.canvas)return;const horizonY=this.canvas.height*0.4;const playerBottomMargin=this.canvas.height*0.03;const playerRect={x:this.canvas.width/2+this.playerCar.xOffset-this.playerCar.pixelWidth/2,y:this.canvas.height-this.playerCar.pixelHeight-playerBottomMargin,width:this.playerCar.pixelWidth,height:this.playerCar.pixelHeight};
        const acceleratorValue=this.accelerator?parseFloat(this.accelerator.slider.value):0;
        for(let i=this.npcCars.length-1;i>=0;i--){const npc=this.npcCars[i];npc.y+=this.npcBaseSpeed+(this.speed*2)+(acceleratorValue*2.5);
        let p_npc=(npc.y-horizonY)/(this.canvas.height-horizonY);p_npc=Math.max(0.01,Math.min(1,p_npc));const npcDrawWidth=this.canvas.width*npc.widthRatio*p_npc;const npcDrawHeight=this.canvas.width*npc.heightRatio*p_npc;const roadWidthAtNpcY=this.canvas.width*this.roadWidth*p_npc;const laneCenterOffset=(npc.lane*roadWidthAtNpcY/3);const npcScreenX=this.canvas.width/2+laneCenterOffset-npcDrawWidth/2;const npcRect={x:npcScreenX,y:npc.y-npcDrawHeight,width:npcDrawWidth,height:npcDrawHeight};
        if(npc.y-npcDrawHeight>this.canvas.height){this.npcCars.splice(i,1);this.score++;continue;}
        if(npcRect.y+npcRect.height>playerRect.y&&npcRect.y<playerRect.y+playerRect.height){if(playerRect.x<npcRect.x+npcRect.width&&playerRect.x+playerRect.width>npcRect.x){this.isGameOver=true;this._handleGameOver();break;}}}
    }
    
    _handleGameOver() {
        if(this.isEngineOn){this._performToggleEngine(false);}
        if(this.engineButton){this.engineButton.textContent="Start New Game";this.engineButton.disabled=false;this.engineButton.classList.remove('active');}
        if(this.accelerator&&this.accelerator.slider)this.accelerator.slider.disabled=true;
        if(this.leftButton)this.leftButton.disabled=true;if(this.rightButton)this.rightButton.disabled=true;
        if(!this.isDrawing)this._startDrawing();
    }

    _update() {
        if(!this.canvas||(!this.isDrawing&&!this.isEngineOn&&this.accelerator&&parseFloat(this.accelerator.slider.value)===0&&!this.isGameOver)){if(this.animationFrameId)cancelAnimationFrame(this.animationFrameId);this.animationFrameId=null;if(this.isGameOver)this._drawRoad();return;}
        const now=this.audioContext.currentTime>0?this.audioContext.currentTime:0.001;
        
        if(!this.isGameOver){
            const accelerator = this.accelerator ? parseFloat(this.accelerator.slider.value) : 0;
            
            let maxCarCenterOffset=0; if(this.canvas){const carPixelWidth=this.canvas.width*this.playerCar.widthRatio; const roadPixelWidthAtPlayer=this.canvas.width*this.roadWidth; maxCarCenterOffset=(roadPixelWidthAtPlayer-carPixelWidth)/2;}
            if(this.midiModWheelActive){const normalizedMod=(this.modWheelValue/127.0)*2.0-1.0; this.playerCar.xOffset=normalizedMod*maxCarCenterOffset;}
            else{if(this.keysPressed['ArrowLeft']||this.keysPressed['ButtonLeft']){this.playerCar.xOffset-=this.carMoveSpeed;} if(this.keysPressed['ArrowRight']||this.keysPressed['ButtonRight']){this.playerCar.xOffset+=this.carMoveSpeed;}}
            this.playerCar.xOffset=Math.max(-maxCarCenterOffset,Math.min(maxCarCenterOffset,this.playerCar.xOffset));
            
            const accelerationFactor=0.03;const decelerationFactor=0.01; if(accelerator>this.speed)this.speed+=(accelerator-this.speed)*accelerationFactor; else this.speed-=(this.speed-accelerator)*decelerationFactor+0.0005; this.speed=Math.max(0,Math.min(1,this.speed)); const effectiveGearRatio=this.gearRatios[this.gear]||this.gearRatios[1];this.rpm=this.speed/effectiveGearRatio; this.rpm=Math.max(0,Math.min(1.2,this.rpm)); if(this.isEngineOn){if(this.rpm>1.0&&this.gear<this.gearRatios.length-1)this.gear++;else if(this.rpm<0.35&&this.gear>1)this.gear--;} else if(this.speed<0.05)this.gear=1;
            if(this.isEngineOn&&this.engine.osc1){const idleRpm=0.1;const displayRpm=this.isEngineOn?Math.max(idleRpm,this.rpm):this.rpm;const baseFreq=30+displayRpm*120;const cutoff=200+Math.pow(displayRpm,2)*8000+this.speed*1000;const volume=0.05+Math.pow(this.speed,2)*0.3+(this.isEngineOn?0.05:0);const turboThreshold=0.6;const turboStrength=Math.max(0,(this.speed-turboThreshold)/(1-turboThreshold));const turboVolume=Math.pow(turboStrength,2)*0.15;const turboPitch=2000+displayRpm*3000+turboStrength*3000;this.engine.osc1.frequency.setTargetAtTime(baseFreq,now,0.02);this.engine.osc2.frequency.setTargetAtTime(baseFreq*1.505,now,0.02);this.engine.filter.frequency.setTargetAtTime(Math.min(12000,cutoff),now,0.03);this.engine.filter.Q.setTargetAtTime(1+displayRpm*2,now,0.03);this.engine.vca.gain.setTargetAtTime(volume,now,0.03);this.engine.turbo.frequency.setTargetAtTime(turboPitch,now,0.05);if(this.engine.turboGain)this.engine.turboGain.gain.setTargetAtTime(turboVolume,now,0.05);}
            this.roadPosition+=this.speed*this.roadSegmentLength*0.2; 
            
            // Conditional NPC Spawn Logic
            if (accelerator > 0) { 
                this.npcSpawnTimer--;
                if (this.npcSpawnTimer <= 0) {
                    this._spawnNpc();
                    this.npcSpawnTimer = this.npcSpawnInterval * (0.8 + Math.random() * 0.4);
                }
            } else if (this.npcCars.length === 0) {
                 this.npcSpawnTimer = this.npcSpawnInterval * 0.2; 
            }
            this._updateNpcsAndCollision();
        }
        this._drawRoad(); this.animationFrameId=requestAnimationFrame(()=>this._update());
    }
    
    _startDrawing() {
        if(this.isDrawing&&!this.isGameOver)return;this.isDrawing=true;if(!this.animationFrameId){this._update();}
    }

    _stopDrawing() {
        if(this.accelerator&&!this.isEngineOn&&parseFloat(this.accelerator.slider.value)===0&&!this.isGameOver){this.isDrawing=false;}
    }
    
    _drawRoad() { 
        if(!this.canvas)return;const ctx=this.ctx;const width=this.canvas.width;const height=this.canvas.height;const horizon=height*0.4;
        const skyGradient=ctx.createLinearGradient(0,0,0,horizon);skyGradient.addColorStop(0,'#1c0530');skyGradient.addColorStop(0.7,'#3c1053');skyGradient.addColorStop(1,'#ff6666');ctx.fillStyle=skyGradient;ctx.fillRect(0,0,width,horizon);
        const mountainColor1='#2a003f';const mountainColor2='#3d005b';ctx.save();ctx.fillStyle=mountainColor1;ctx.beginPath();ctx.moveTo(0,horizon);ctx.lineTo(width*0.05,horizon*0.85);ctx.lineTo(width*0.1,horizon*0.9);ctx.lineTo(width*0.2,horizon*0.7);ctx.lineTo(width*0.3,horizon*0.85);ctx.lineTo(width*0.4,horizon*0.75);ctx.lineTo(width*0.5,horizon*0.9);ctx.lineTo(width*0.6,horizon*0.6);ctx.lineTo(width*0.75,horizon*0.8);ctx.lineTo(width*0.85,horizon*0.75);ctx.lineTo(width,horizon*0.8);ctx.lineTo(width,horizon);ctx.closePath();ctx.fill();ctx.fillStyle=mountainColor2;ctx.beginPath();ctx.moveTo(0,horizon);ctx.lineTo(width*0.15,horizon*0.75);ctx.lineTo(width*0.25,horizon*0.85);ctx.lineTo(width*0.35,horizon*0.65);ctx.lineTo(width*0.5,horizon*0.8);ctx.lineTo(width*0.6,horizon*0.7);ctx.lineTo(width*0.7,horizon*0.85);ctx.lineTo(width*0.8,horizon*0.75);ctx.lineTo(width*0.9,horizon*0.9);ctx.lineTo(width,horizon);ctx.closePath();ctx.fill();ctx.restore();
        const sunRadius=Math.min(width,height)*0.15;const sunX=width/2;const sunY=horizon;ctx.beginPath();ctx.arc(sunX,sunY,sunRadius*1.5,0,Math.PI*2);ctx.fillStyle='rgba(255,204,102,0.2)';ctx.fill();ctx.beginPath();ctx.arc(sunX,sunY,sunRadius,0,Math.PI*2);ctx.fillStyle='rgba(255,230,153,0.8)';ctx.fill();
        ctx.fillStyle='#100018';ctx.fillRect(0,horizon,width,height-horizon);ctx.strokeStyle='rgba(0,200,255,0.2)';ctx.lineWidth=1;const gridLineCount=15;for(let i=1;i<=gridLineCount;i++){const p=Math.pow(i/gridLineCount,2);const y=horizon+(height-horizon)*p;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();if(i>gridLineCount/2){const xL=width/2-(width/2*p);const xR=width/2+(width/2*p);ctx.beginPath();ctx.moveTo(width/2,horizon);ctx.lineTo(xL,height);ctx.stroke();ctx.beginPath();ctx.moveTo(width/2,horizon);ctx.lineTo(xR,height);ctx.stroke();}}ctx.strokeStyle='rgba(0,220,255,0.3)';for(let i=0;i<=10;i++){const xF=(i/10-0.5)*2*this.roadWidth*1.5;ctx.beginPath();ctx.moveTo(width/2,horizon);ctx.lineTo(width/2+xF*width/1.5,height);ctx.stroke();}
        let y_prev=horizon;let w_prev=0;for(let i=1;i<=this.roadSegmentCount;i++){const p_curr=Math.pow(i/this.roadSegmentCount,1.6);const y_curr=horizon+(height-horizon)*p_curr;const w_curr=width*this.roadWidth*p_curr;const effective_segment_index=Math.floor(this.roadPosition/this.roadSegmentLength)+i;const rumbleColor=(effective_segment_index%10<5)?'#FF00FF':'#00FFFF';const roadColor='#1A1A22';ctx.fillStyle=roadColor;ctx.beginPath();ctx.moveTo(width/2-w_prev/2,y_prev);ctx.lineTo(width/2+w_prev/2,y_prev);ctx.lineTo(width/2+w_curr/2,y_curr);ctx.lineTo(width/2-w_curr/2,y_curr);ctx.closePath();ctx.fill();const rumbleWidthFactor=0.04;ctx.fillStyle=rumbleColor;if(w_prev>1&&w_curr>1){ctx.beginPath();ctx.moveTo(width/2-w_prev/2,y_prev);ctx.lineTo(width/2-w_prev/2+w_prev*rumbleWidthFactor,y_prev);ctx.lineTo(width/2-w_curr/2+w_curr*rumbleWidthFactor,y_curr);ctx.lineTo(width/2-w_curr/2,y_curr);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(width/2+w_prev/2,y_prev);ctx.lineTo(width/2+w_prev/2-w_prev*rumbleWidthFactor,y_prev);ctx.lineTo(width/2+w_curr/2-w_curr*rumbleWidthFactor,y_curr);ctx.lineTo(width/2+w_curr/2,y_curr);ctx.closePath();ctx.fill();}if(y_curr-y_prev>2&&(effective_segment_index%4<2)){const centerLineWidthFactor=0.015;ctx.fillStyle='#FFFF88';ctx.beginPath();ctx.moveTo(width/2-w_prev*centerLineWidthFactor/2,y_prev);ctx.lineTo(width/2+w_prev*centerLineWidthFactor/2,y_prev);ctx.lineTo(width/2+w_curr*centerLineWidthFactor/2,y_curr);ctx.lineTo(width/2-w_curr*centerLineWidthFactor/2,y_curr);ctx.closePath();ctx.fill();}y_prev=y_curr;w_prev=w_curr;}
        for(const npc of this.npcCars){let p_npc=(npc.y-horizon)/(height-horizon);p_npc=Math.max(0.01,Math.min(1,p_npc));const npcDrawWidth=width*npc.widthRatio*p_npc;const npcDrawHeight=width*npc.heightRatio*p_npc;const roadWidthAtNpcY=width*this.roadWidth*p_npc;const laneCenterOffset=(npc.lane*roadWidthAtNpcY/3);const npcScreenX=width/2+laneCenterOffset-npcDrawWidth/2;ctx.fillStyle=npc.color;ctx.fillRect(npcScreenX,npc.y-npcDrawHeight,npcDrawWidth,npcDrawHeight);}
        this.playerCar.pixelWidth=width*this.playerCar.widthRatio;this.playerCar.pixelHeight=width*this.playerCar.heightRatio;const carCenterX=width/2+this.playerCar.xOffset;const carXBase=carCenterX-this.playerCar.pixelWidth/2;const carYBase=height-this.playerCar.pixelHeight-(height*0.03);const shakeX=(Math.random()-0.5)*Math.min(5,this.rpm*this.speed*5+this.rpm*2);const shakeY=(Math.random()-0.5)*Math.min(3,this.rpm*this.speed*3+this.rpm*1);
        ctx.save();ctx.translate(carXBase+shakeX,carYBase+shakeY);ctx.fillStyle=this.playerCar.color;ctx.beginPath();ctx.fillRect(0,this.playerCar.pixelHeight*0.25,this.playerCar.pixelWidth,this.playerCar.pixelHeight*0.75);ctx.moveTo(this.playerCar.pixelWidth*0.1,this.playerCar.pixelHeight*0.3);ctx.lineTo(this.playerCar.pixelWidth*0.25,this.playerCar.pixelHeight*0.05);ctx.lineTo(this.playerCar.pixelWidth*0.75,this.playerCar.pixelHeight*0.05);ctx.lineTo(this.playerCar.pixelWidth*0.9,this.playerCar.pixelHeight*0.3);ctx.closePath();ctx.fill();ctx.fillStyle='#500000';ctx.fillRect(this.playerCar.pixelWidth*0.02,this.playerCar.pixelHeight*0.20,this.playerCar.pixelWidth*0.96,this.playerCar.pixelHeight*0.1);const tailLightIntensity=Math.min(1,0.3+this.speed*0.7+(this.isEngineOn?0.1:0));ctx.fillStyle=`rgba(255,20,20,${tailLightIntensity})`;const tlW=this.playerCar.pixelWidth*0.3;const tlH=this.playerCar.pixelHeight*0.15;const tlY=this.playerCar.pixelHeight*0.45;ctx.fillRect(this.playerCar.pixelWidth*0.08,tlY,tlW,tlH);ctx.fillRect(this.playerCar.pixelWidth-tlW-this.playerCar.pixelWidth*0.08,tlY,tlW,tlH);ctx.restore();
        ctx.fillStyle="rgba(255,255,255,0.8)";ctx.font=Math.max(16,width*0.03)+"px 'Courier New',Courier,monospace";ctx.textAlign="left";ctx.fillText("Score: "+this.score,10,Math.max(20,width*0.04));
        if(this.isGameOver){ctx.fillStyle="rgba(0,0,0,0.7)";ctx.fillRect(0,0,width,height);ctx.font=Math.max(30,width*0.1)+"px 'Arial Black',Gadget,sans-serif";ctx.fillStyle="#FF3333";ctx.textAlign="center";ctx.fillText("GAME OVER",width/2,height/2-Math.max(15,width*0.02));ctx.font=Math.max(18,width*0.04)+"px 'Courier New',Courier,monospace";ctx.fillStyle="#FFAAAA";ctx.fillText("Final Score: "+this.score,width/2,height/2+Math.max(20,width*0.05));}
    }

    getHTML() { 
        return `<canvas id="outrunCanvas" width="600" height="300" class="display-canvas" style="margin-bottom:10px;background-color:#1c0530;border:1px solid #555;"></canvas><div class="control-row"><button id="outrunIgnitionBtn" class="toggle-button" style="width:100%;height:35px;margin-bottom:8px;">Start Engine</button></div><div class="control-row" style="margin-bottom:8px;"><label for="outrunAccelerator" style="color:#eee;">Accelerator:</label><input type="range" id="outrunAccelerator" min="0" max="1" value="0" step="0.01" style="flex-grow:1;margin:0 8px;"><span id="outrunAcceleratorVal" class="value-display">0.00</span></div><div class="control-row" style="justify-content: center;"><button id="outrunLeftBtn" style="padding: 8px 25px;">&lt;&lt;</button><button id="outrunRightBtn" style="padding: 8px 25px;">&gt;&gt;</button></div>`;
    }

    _handleKeyDown(e) { if(this.isGameOver)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.keysPressed[e.key]=true;}}
    _handleKeyUp(e) { if(this.isGameOver)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.keysPressed[e.key]=false;}}
    _handleButtonPress(key,isPressed) { if(this.isGameOver)return;this.keysPressed[key]=isPressed;}
    _handleMidiMessage(event) { if(this.isGameOver)return;const status=event.data[0]&0xF0;const controllerNumber=event.data[1];const controllerValue=event.data[2];if(status===0xB0&&controllerNumber===1){this.modWheelValue=controllerValue;this.midiModWheelActive=true;}}
    
    _initMidi() { 
        if(navigator.requestMIDIAccess){
            navigator.requestMIDIAccess().then(
                (midiAccess)=>{
                    this.midiAccess=midiAccess;
                    const inputs=midiAccess.inputs.values();
                    for(let input=inputs.next();input&&!input.done;input=inputs.next()){
                        const boundListener=this._handleMidiMessage.bind(this);
                        input.value.onmidimessage=boundListener;
                        this.midiInputs.push({port:input.value,listener:boundListener});
                    }
                },
                ()=>{console.warn("MIDI access denied or not available.");
            });
        } else {
            console.warn("Web MIDI API not supported in this browser.");
        }
    }

    initUI(container) {
        this.canvas=container.querySelector('#outrunCanvas');if(!this.canvas){console.error("Canvas not found!");return;}this.ctx=this.canvas.getContext('2d');this.engineButton=container.querySelector('#outrunIgnitionBtn');this.accelerator={slider:container.querySelector('#outrunAccelerator'),val:container.querySelector('#outrunAcceleratorVal')};this.leftButton=container.querySelector('#outrunLeftBtn');this.rightButton=container.querySelector('#outrunRightBtn');
        this.engineButton.addEventListener('click',()=>this._toggleEngine(!this.isEngineOn||this.isGameOver));
        this.accelerator.slider.addEventListener('input',()=>{if(this.isGameOver)return;const val=parseFloat(this.accelerator.slider.value);this.accelerator.val.textContent=val.toFixed(2);if(val>0&&!this.isDrawing)this._startDrawing();else if(val===0&&!this.isEngineOn&&this.isDrawing)this._stopDrawing();});
        const setupButtonEvents=(button,keyName)=>{if(!button)return;button.addEventListener('mousedown',()=>this._handleButtonPress(keyName,true));button.addEventListener('mouseup',()=>this._handleButtonPress(keyName,false));button.addEventListener('mouseleave',()=>this._handleButtonPress(keyName,false));button.addEventListener('touchstart',(e)=>{e.preventDefault();this._handleButtonPress(keyName,true);},{passive:false});button.addEventListener('touchend',(e)=>{e.preventDefault();this._handleButtonPress(keyName,false);});};
        setupButtonEvents(this.leftButton,'ButtonLeft');setupButtonEvents(this.rightButton,'ButtonRight');
        this.boundKeyDown=this._handleKeyDown.bind(this);this.boundKeyUp=this._handleKeyUp.bind(this);window.addEventListener('keydown',this.boundKeyDown);window.addEventListener('keyup',this.boundKeyUp);
        this._initMidi();this._drawRoad();
    }
    
    updateParams() { /* This module has no external params to update. */ }
    
    destroy() {
        this._toggleEngine(false);if(this.animationFrameId){cancelAnimationFrame(this.animationFrameId);this.animationFrameId=null;}this.isDrawing=false;if(this.nodes&&this.nodes.output)this.nodes.output.disconnect();if(this.boundKeyDown)window.removeEventListener('keydown',this.boundKeyDown);if(this.boundKeyUp)window.removeEventListener('keyup',this.boundKeyUp);
        this.midiInputs.forEach(inputObj=>{if(inputObj.port)inputObj.port.onmidimessage=null;});this.midiInputs=[];
    }
}

// --- This line is crucial for the main app to load the module ---
if (window.registerSynthModule) {
    window.registerSynthModule(OutrunDriverModule);
}