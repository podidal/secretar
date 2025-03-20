/**
 * Advanced Audio Visualizer with Murmuration Effect
 * Создает визуализацию звука как в профессиональных аудиоредакторах
 * с эффектом мурмурации (стайного поведения частиц)
 */

class AdvancedVisualizer {
    constructor(canvasElement, options = {}) {
        // Проверяем поддержку Web Audio API
        if (!window.AudioContext && !window.webkitAudioContext) {
            throw new Error('Web Audio API не поддерживается в вашем браузере');
        }

        // Настройка холста
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Не удалось получить контекст canvas');
        }
        
        // Сохраняем обработчик изменения размера для последующего удаления
        this.resizeHandler = () => this.resizeCanvas();
        window.addEventListener('resize', this.resizeHandler);
        
        // Настройки по умолчанию
        this.options = {
            waveColor: options.waveColor || '#4285f4',
            backgroundColor: options.backgroundColor || '#000',
            particleColor: options.particleColor || '#fff',
            particleCount: options.particleCount || 300,
            particleSize: options.particleSize || 2,
            particleSpeed: options.particleSpeed || 1,
            murmurmationStrength: options.murmurmationStrength || 0.5,
            mode: options.mode || 'waves+particles', // 'waves', 'particles', 'waves+particles'
            waveThickness: options.waveThickness || 2,
            waveGap: options.waveGap || 2,
            frequencyRange: options.frequencyRange || { min: 20, max: 20000 },
            visualMode: options.visualMode || 'spectrum' // 'spectrum', 'waveform', 'circular'
        };
        
        // Инициализация аудио-анализатора
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.isPlaying = false;
        
        // Инициализация частиц для эффекта мурмурации
        this.particles = [];
        this.audioDataSnapshot = [];
        
        // Настройка размеров
        this.resizeCanvas();
        
        // Инициализация частиц
        this.initParticles();
        
        // Запуск анимации
        this.render = this.render.bind(this);
        requestAnimationFrame(this.render);
    }
    
    /**
     * Устанавливает размеры холста под текущий размер элемента
     */
    resizeCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        
        // Обновляем частицы при изменении размера
        this.initParticles();
    }
    
    /**
     * Инициализация аудио-анализатора
     * @param {MediaStream} stream - поток с микрофона
     */
    setupAudioAnalyser(stream) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        source.connect(this.analyser);
        this.isPlaying = true;
    }
    
    /**
     * Инициализирует частицы для эффекта мурмурации
     */
    initParticles() {
        this.particles = [];
        const count = this.options.particleCount;
        
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: (Math.random() * 2 + 1) * this.options.particleSize,
                speedX: (Math.random() - 0.5) * this.options.particleSpeed,
                speedY: (Math.random() - 0.5) * this.options.particleSpeed,
                hue: Math.random() * 60 + 170, // Синие и фиолетовые оттенки
                opacity: Math.random() * 0.5 + 0.5
            });
        }
    }
    
    /**
     * Заполняет аудио-фрейм для синхронизации с частицами
     */
    updateAudioData() {
        if (!this.isPlaying || !this.analyser) return;
        this.analyser.getByteFrequencyData(this.dataArray);
        this.audioDataSnapshot = [...this.dataArray];
    }
    
    /**
     * Обновляет позиции частиц с учетом мурмурации и аудио-данных
     */
    updateParticles() {
        const audioInfluence = this.isPlaying ? this.getAverageVolume() / 255 : 0;
        const strength = this.options.murmurmationStrength;
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Добавляем коллективное поведение (мурмурация)
            let vx = 0;
            let vy = 0;
            
            // Для каждой частицы вычисляем влияние соседних частиц
            for (let j = 0; j < this.particles.length; j++) {
                if (i !== j) {
                    const neighbor = this.particles[j];
                    const dx = neighbor.x - p.x;
                    const dy = neighbor.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 50) { // Радиус влияния
                        // Выравнивание - стремление двигаться в том же направлении
                        vx += neighbor.speedX;
                        vy += neighbor.speedY;
                        
                        // Сплоченность - стремление к центру масс группы
                        vx += dx / 1000;
                        vy += dy / 1000;
                        
                        // Разделение - избегание столкновений
                        if (dist < 30) {
                            vx -= dx / 500;
                            vy -= dy / 500;
                        }
                    }
                }
            }
            
            // Применяем стайное поведение с заданной силой
            p.speedX += vx * strength;
            p.speedY += vy * strength;
            
            // Влияние звука
            if (this.isPlaying) {
                // Индекс в массиве аудио данных, соответствующий позиции частицы
                const audioIndex = Math.floor(i / this.particles.length * this.bufferLength);
                const amplitude = this.audioDataSnapshot[audioIndex] / 255 || 0;
                
                // Создаем импульс от звука
                p.speedX += (Math.random() - 0.5) * amplitude * 0.5;
                p.speedY += (Math.random() - 0.5) * amplitude * 0.5;
                
                // Изменяем размер и прозрачность в зависимости от громкости
                p.size = (Math.random() * 2 + 1) * this.options.particleSize * (1 + amplitude);
                p.opacity = Math.min(1, 0.5 + amplitude * 0.5);
            }
            
            // Ограничиваем скорость
            const speed = Math.sqrt(p.speedX * p.speedX + p.speedY * p.speedY);
            if (speed > 2) {
                p.speedX = (p.speedX / speed) * 2;
                p.speedY = (p.speedY / speed) * 2;
            }
            
            // Обновляем позицию
            p.x += p.speedX;
            p.y += p.speedY;
            
            // Обрабатываем выход за границы экрана
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
        }
    }
    
    /**
     * Рисует частицы на холсте
     */
    drawParticles() {
        for (const p of this.particles) {
            this.ctx.beginPath();
            
            // Создаем градиент для каждой частицы
            const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${p.opacity})`);
            gradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Рисует связи между частицами
     */
    drawConnections() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 60) { // Максимальная дистанция для связи
                    const opacity = 1 - dist / 60;
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    /**
     * Рисует стандартную волновую визуализацию
     */
    drawWaves() {
        if (!this.isPlaying || !this.dataArray) return;
        
        switch (this.options.visualMode) {
            case 'spectrum':
                this.drawSpectrumWaves();
                break;
            case 'waveform':
                this.drawWaveform();
                break;
            case 'circular':
                this.drawCircularWaves();
                break;
            default:
                this.drawSpectrumWaves();
        }
    }
    
    /**
     * Рисует спектр частот
     */
    drawSpectrumWaves() {
        const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
        let x = 0;
        
        // Создаем эффект полноэкранного спектра
        const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
        gradient.addColorStop(0, '#0575E6');
        gradient.addColorStop(1, '#00F260');
        
        // Рисуем каждую полосу
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;
            
            // Динамический цвет в зависимости от частоты и громкости
            const hue = i / this.bufferLength * 360;
            const saturation = 80 + (this.dataArray[i] / 255) * 20;
            const lightness = 50 + (this.dataArray[i] / 255) * 10;
            this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
            // Рисуем столбик
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth - 1, barHeight);
            
            // Рисуем зеркальное отражение (как в аудиоредакторах)
            const mirrorHeight = barHeight * 0.3;
            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.5)`;
            this.ctx.fillRect(x, 0, barWidth - 1, mirrorHeight);
            
            x += barWidth;
        }
    }
    
    /**
     * Рисует волновую форму (временная область)
     */
    drawWaveform() {
        // Для волновой формы нам нужны данные временной области
        const timeDataArray = new Uint8Array(this.bufferLength);
        this.analyser.getByteTimeDomainData(timeDataArray);
        
        // Настройка стиля линии
        this.ctx.lineWidth = this.options.waveThickness;
        
        // Цветной градиент для волны
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        gradient.addColorStop(0, '#ff00cc');
        gradient.addColorStop(0.5, '#3399ff');
        gradient.addColorStop(1, '#00ff99');
        this.ctx.strokeStyle = gradient;
        
        // Рисуем волновую форму
        this.ctx.beginPath();
        
        const sliceWidth = this.canvas.width / this.bufferLength;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const v = timeDataArray[i] / 128.0;
            const y = v * this.canvas.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
        
        // Добавляем отражение для эффекта аудиоредактора
        this.ctx.globalAlpha = 0.2;
        this.ctx.strokeStyle = gradient;
        
        this.ctx.beginPath();
        x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const v = timeDataArray[i] / 128.0;
            const y = this.canvas.height - (v * this.canvas.height / 2);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Рисует круговую визуализацию
     */
    drawCircularWaves() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.stroke();
        
        // Рисуем кольца, соответствующие частотам
        for (let i = 0; i < 5; i++) {
            const freqIndex = Math.floor(this.bufferLength / 10 * i);
            const amplitude = this.dataArray[freqIndex] / 255;
            const ringRadius = radius * (0.2 + i * 0.2) * (1 + amplitude * 0.2);
            
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `hsla(${i * 60}, 100%, 60%, ${amplitude * 0.8})`;
            this.ctx.lineWidth = 2 + amplitude * 8;
            this.ctx.stroke();
        }
        
        // Рисуем лучи, исходящие из центра
        const rayCount = 180;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2;
            const freqIndex = Math.floor((i / rayCount) * this.bufferLength);
            const amplitude = this.dataArray[freqIndex] / 255;
            
            const rayLength = radius * amplitude;
            
            const x1 = centerX + Math.cos(angle) * radius * 0.2;
            const y1 = centerY + Math.sin(angle) * radius * 0.2;
            const x2 = centerX + Math.cos(angle) * (radius * 0.2 + rayLength);
            const y2 = centerY + Math.sin(angle) * (radius * 0.2 + rayLength);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = `hsla(${angle * 180 / Math.PI}, 100%, 60%, ${amplitude})`;
            this.ctx.lineWidth = 1 + amplitude * 2;
            this.ctx.stroke();
        }
    }
    
    /**
     * Вычисляет среднюю громкость звука
     */
    getAverageVolume() {
        if (!this.dataArray) return 0;
        
        let sum = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            sum += this.dataArray[i];
        }
        return sum / this.bufferLength;
    }
    
    /**
     * Основной цикл рендеринга
     */
    render() {
        // Очищаем холст
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Обновляем аудио данные
        this.updateAudioData();
        
        // Рисуем в зависимости от выбранного режима
        if (this.options.mode === 'waves' || this.options.mode === 'waves+particles') {
            this.drawWaves();
        }
        
        if (this.options.mode === 'particles' || this.options.mode === 'waves+particles') {
            this.updateParticles();
            this.drawConnections();
            this.drawParticles();
        }
        
        // Продолжаем анимацию
        requestAnimationFrame(this.render);
    }
    
    /**
     * Переключает режим визуализации
     * @param {string} mode - режим визуализации ('waves', 'particles', 'waves+particles')
     */
    setMode(mode) {
        if (['waves', 'particles', 'waves+particles'].includes(mode)) {
            this.options.mode = mode;
        }
    }
    
    /**
     * Переключает тип визуализации волны
     * @param {string} visualMode - тип визуализации ('spectrum', 'waveform', 'circular')
     */
    setVisualMode(visualMode) {
        if (['spectrum', 'waveform', 'circular'].includes(visualMode)) {
            this.options.visualMode = visualMode;
        }
    }
    
    /**
     * Устанавливает количество частиц
     * @param {number} count - количество частиц
     */
    setParticleCount(count) {
        this.options.particleCount = count;
        this.initParticles();
    }
    
    /**
     * Устанавливает силу эффекта мурмурации
     * @param {number} strength - сила эффекта (0-1)
     */
    setMurmurmationStrength(strength) {
        this.options.murmurmationStrength = Math.max(0, Math.min(1, strength));
    }
    
    /**
     * Останавливает визуализацию
     */
    stop() {
        this.isPlaying = false;
    }

    /**
     * Изменяет цвет волн
     * @param {string} color - цвет в формате HEX или RGB
     */
    setWaveColor(color) {
        this.options.waveColor = color;
    }

    /**
     * Изменяет цвет фона
     * @param {string} color - цвет в формате HEX или RGB
     */
    setBackgroundColor(color) {
        this.options.backgroundColor = color;
    }

    /**
     * Изменяет цвет частиц
     * @param {string} color - цвет в формате HEX или RGB
     */
    setParticleColor(color) {
        this.options.particleColor = color;
    }

    /**
     * Изменяет размер частиц
     * @param {number} size - размер частиц
     */
    setParticleSize(size) {
        this.options.particleSize = size;
        this.initParticles();
    }

    /**
     * Изменяет скорость частиц
     * @param {number} speed - скорость частиц
     */
    setParticleSpeed(speed) {
        this.options.particleSpeed = speed;
        this.initParticles();
    }

    /**
     * Полностью очищает ресурсы визуализатора
     */
    destroy() {
        // Останавливаем анимацию
        this.isPlaying = false;
        
        // Очищаем аудио контекст
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Очищаем анализатор
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        
        // Очищаем массивы данных
        this.dataArray = null;
        this.audioDataSnapshot = [];
        
        // Удаляем обработчик изменения размера
        window.removeEventListener('resize', this.resizeHandler);
        
        // Очищаем холст
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Очищаем частицы
        this.particles = [];
    }

    /**
     * Проверяет, поддерживается ли Web Audio API
     * @returns {boolean} - результат проверки
     */
    static isSupported() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    /**
     * Получает текущие настройки визуализатора
     * @returns {Object} - текущие настройки
     */
    getOptions() {
        return { ...this.options };
    }

    /**
     * Обновляет несколько настроек сразу
     * @param {Object} newOptions - новые настройки
     */
    updateOptions(newOptions) {
        this.options = {
            ...this.options,
            ...newOptions
        };
        
        // Переинициализируем частицы если изменились связанные параметры
        if (newOptions.particleCount || newOptions.particleSize || newOptions.particleSpeed) {
            this.initParticles();
        }
    }
}

// Экспортируем класс для использования в других файлах
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = AdvancedVisualizer;
} else {
    window.AdvancedVisualizer = AdvancedVisualizer;
} 