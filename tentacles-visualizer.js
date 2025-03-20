class TentaclesVisualizer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.isActive = false;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationFrame = null;
        this.volume = 0;
        this.time = 0;

        // Default options
        this.options = {
            numTentacles: options.numTentacles || 8,
            baseColor: options.baseColor || [255, 100, 0],
            tentacleWidth: options.tentacleWidth || 6,
            segments: options.segments || 20,
            cohesionStrength: options.cohesionStrength || 0.01,
            centerAttraction: options.centerAttraction || 0.0005,
            noiseSpeed: options.noiseSpeed || 0.01,
            volumeSmoothing: options.volumeSmoothing || 0.1
        };

        // Initialize tentacles array
        this.tentacles = [];
        this.initTentacles();

        // Bind methods
        this.animate = this.animate.bind(this);
        this.handleResize = this.handleResize.bind(this);

        // Add resize listener
        window.addEventListener('resize', this.handleResize);
        this.handleResize();

        // Load Simplex Noise
        this.loadSimplexNoise().then(() => {
            console.log('Simplex Noise loaded successfully');
        }).catch(error => {
            console.error('Error loading Simplex Noise:', error);
        });
    }

    async loadSimplexNoise() {
        try {
            const module = await import('https://cdn.jsdelivr.net/npm/simplex-noise@2.4.0/simplex-noise.js');
            this.noise = new module.Noise();
        } catch (error) {
            console.error('Error loading Simplex Noise:', error);
            // Fallback to simple random noise
            this.noise = {
                noise2D: (x, y) => (Math.sin(x * 10 + y * 8) + Math.cos(x * 8 - y * 6)) * 0.5
            };
        }
    }

    initTentacles() {
        this.tentacles = [];
        for (let i = 0; i < this.options.numTentacles; i++) {
            this.tentacles.push({
                x: this.canvas.width / 2 + (i - this.options.numTentacles / 2) * 30,
                y: this.canvas.height / 1.5,
                length: Math.random() * 150 + 150,
                angle: Math.random() * Math.PI * 2,
                noiseOffset: Math.random() * 1000,
                speedX: 0,
                speedY: 0
            });
        }
    }

    handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initTentacles();
    }

    setupAudioAnalyser(stream) {
        try {
            // Create audio context and analyser
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // Connect audio source
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);

            // Start animation
            this.isActive = true;
            this.animate();
        } catch (error) {
            console.error('Error setting up audio analyser:', error);
        }
    }

    drawTentacle(tentacle, index) {
        const ctx = this.ctx;
        ctx.beginPath();
        
        // Dynamic coloring based on volume
        const [r, g, b] = this.options.baseColor;
        ctx.strokeStyle = `rgba(${r}, ${Math.floor(g + this.volume * 150)}, ${b}, 0.8)`;
        ctx.lineWidth = this.options.tentacleWidth;
        ctx.lineCap = "round";
        
        ctx.moveTo(tentacle.x, tentacle.y);

        let prevX = tentacle.x;
        let prevY = tentacle.y;

        // Draw segments
        for (let i = 1; i < this.options.segments; i++) {
            let t = i / this.options.segments;
            
            // Get bend angle using noise
            let angle = this.noise.noise2D(t + tentacle.noiseOffset, this.time * 0.01) * Math.PI * 0.2;
            let segLength = tentacle.length / this.options.segments;

            // Sound reactive bending
            let dynamicBend = Math.sin(this.time * 0.05 + i) * this.volume * 20;
            
            // Murmuration effect: attraction to neighboring tentacle
            let cohesion = 0;
            if (index > 0) {
                let neighbor = this.tentacles[index - 1];
                cohesion = (neighbor.x - tentacle.x) * this.options.cohesionStrength;
            }

            let nextX = prevX + Math.cos(tentacle.angle + angle) * segLength + dynamicBend + cohesion;
            let nextY = prevY + Math.sin(tentacle.angle + angle) * segLength;

            ctx.lineTo(nextX, nextY);
            prevX = nextX;
            prevY = nextY;
        }
        
        ctx.stroke();
    }

    animate() {
        if (!this.isActive || !this.analyser) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Get sound spectrum data
        this.analyser.getByteFrequencyData(this.dataArray);
        let newVolume = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length / 128;
        this.volume += (newVolume - this.volume) * this.options.volumeSmoothing;

        // Update and draw each tentacle
        this.tentacles.forEach((tentacle, index) => {
            tentacle.noiseOffset += this.options.noiseSpeed;

            // Swarm effect: attraction to screen center
            tentacle.x += tentacle.speedX;
            tentacle.y += tentacle.speedY;
            tentacle.speedX += (this.canvas.width / 2 - tentacle.x) * this.options.centerAttraction;
            tentacle.speedY += (this.canvas.height / 2 - tentacle.y) * this.options.centerAttraction;

            // Add random displacement on loud sounds
            tentacle.speedX += (Math.random() - 0.5) * this.volume * 2;
            tentacle.speedY += (Math.random() - 0.5) * this.volume * 2;

            // Apply damping to prevent excessive movement
            tentacle.speedX *= 0.95;
            tentacle.speedY *= 0.95;

            this.drawTentacle(tentacle, index);
        });

        this.time += 1;
        this.animationFrame = requestAnimationFrame(this.animate);
    }

    stop() {
        this.isActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.audioContext) {
            this.audioContext.close().catch(console.error);
        }
    }

    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.initTentacles();
    }
}

// Export the visualizer
export { TentaclesVisualizer }; 