// DOM Elements
const recordButton = document.getElementById('recordButton');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTimer = document.getElementById('recordingTimer');
const visualizer = document.getElementById('visualizer');
const recognitionStatus = document.getElementById('recognitionStatus');
const conversationText = document.getElementById('conversationText');
const agentJoker = document.getElementById('agent-joker');
const agentSkeptic = document.getElementById('agent-skeptic');
const agentSmart = document.getElementById('agent-smart');
const sendFrequency = document.getElementById('sendFrequency');
const frequencyValue = document.getElementById('frequencyValue');
const autoSendToggle = document.getElementById('autoSendToggle');
const playButton = document.getElementById('playButton');
const recognizeButton = document.getElementById('recognizeButton');

// Audio Recording System (Composition pattern)
const AudioRecordingSystem = () => {
    // Private members
    let mediaRecorder;
    let audioChunks = [];
    let recordingStartTime;
    let recordingTimerInterval;
    let audioContext;
    let analyser;
    let stream;
    let isRecording = false;
    let autoSendInterval;
    let sendIntervalMs = 10000; // Default 10 seconds
    let isAutoSendEnabled = true;
    let audioPlayer;
    
    // Audio Processing Component
    const audioProcessor = {
        processAudioChunk: async function(chunks) {
            try {
                const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                
                // Update status
                const statusMessage = `Распознавание речи (фрагмент ${new Date().toLocaleTimeString()})...`;
                updateStatus(statusMessage);
                
                // Send to Google Gemini for transcription
                await transcribeAudio(audioBlob);
                
                return true;
            } catch (error) {
                console.error('Error processing audio chunk:', error);
                updateStatus('Ошибка обработки аудио');
                return false;
            }
        }
    };
    
    // Playback Component
    const playbackComponent = {
        setup: function() {
            // Create audio element
            audioPlayer = document.createElement('audio');
            audioPlayer.className = 'audio-player';
            audioPlayer.controls = true;
            document.querySelector('.recorder-controls').appendChild(audioPlayer);
            
            // Set up play button
            playButton.addEventListener('click', () => {
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    playButton.innerHTML = '<span class="play-icon"></span>Пауза';
                } else {
                    audioPlayer.pause();
                    playButton.innerHTML = '<span class="play-icon"></span>Прослушать';
                }
            });
            
            // Set up audio player events
            audioPlayer.addEventListener('ended', () => {
                playButton.innerHTML = '<span class="play-icon"></span>Прослушать';
            });
        },
        
        updateAudio: function(chunks) {
            const audioBlob = new Blob(chunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            audioPlayer.classList.add('visible');
            playButton.disabled = false;
            recognizeButton.disabled = false;
        },
        
        clear: function() {
            audioPlayer.src = '';
            audioPlayer.classList.remove('visible');
            playButton.disabled = true;
            recognizeButton.disabled = true;
            playButton.innerHTML = '<span class="play-icon"></span>Прослушать';
        }
    };
    
    // Visualizer Component
    const visualizerComponent = {
        setup: function() {
            const visualizerContext = visualizer.getContext('2d');
            
            // Set canvas dimensions
            visualizer.width = visualizer.clientWidth;
            visualizer.height = visualizer.clientHeight;
            
            // Initial clear
            visualizerContext.fillStyle = '#f0f2f5';
            visualizerContext.fillRect(0, 0, visualizer.width, visualizer.height);
            
            return visualizerContext;
        },
        
        draw: function(analyserNode, visualizerContext) {
            if (!isRecording) return;
            
            // Get frequency data
            const bufferLength = analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserNode.getByteFrequencyData(dataArray);
            
            // Clear canvas
            visualizerContext.fillStyle = '#f0f2f5';
            visualizerContext.fillRect(0, 0, visualizer.width, visualizer.height);
            
            // Draw bars
            const barWidth = (visualizer.width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * visualizer.height;
                
                // Use gradient color based on frequency
                const hue = i / bufferLength * 360;
                visualizerContext.fillStyle = `hsl(${hue}, 70%, 60%)`;
                
                visualizerContext.fillRect(x, visualizer.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
            
            // Request next frame
            requestAnimationFrame(() => visualizerComponent.draw(analyserNode, visualizerContext));
        }
    };
    
    // Timer Component
    const timerComponent = {
        start: function(startTime) {
            recordingTimerInterval = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const seconds = Math.floor(elapsedTime / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                
                recordingTimer.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            }, 1000);
        },
        
        stop: function() {
            clearInterval(recordingTimerInterval);
        }
    };
    
    // Auto-sending Component
    const autoSendComponent = {
        start: function(intervalMs) {
            // Clear any existing interval
            if (autoSendInterval) {
                clearInterval(autoSendInterval);
            }
            
            // Set up new interval for auto-sending
            autoSendInterval = setInterval(async () => {
                if (isRecording && isAutoSendEnabled && audioChunks.length > 0) {
                    // Create a copy of current chunks and process them
                    const chunksToProcess = [...audioChunks];
                    
                    // Process the audio chunks
                    await audioProcessor.processAudioChunk(chunksToProcess);
                    
                    // Don't clear audioChunks as we want to keep recording
                    // We just want to process what we have so far
                }
            }, intervalMs);
        },
        
        stop: function() {
            if (autoSendInterval) {
                clearInterval(autoSendInterval);
                autoSendInterval = null;
            }
        },
        
        updateInterval: function(newIntervalMs) {
            sendIntervalMs = newIntervalMs;
            if (isRecording && isAutoSendEnabled) {
                this.stop();
                this.start(newIntervalMs);
            }
        },
        
        setEnabled: function(enabled) {
            isAutoSendEnabled = enabled;
            if (isRecording) {
                if (enabled) {
                    this.start(sendIntervalMs);
                } else {
                    this.stop();
                }
            }
        }
    };
    
    // Public methods
    return {
        init: function() {
            // Initialize UI components and settings
            const visualizerContext = visualizerComponent.setup();
            playbackComponent.setup();
            
            // Set up event listeners
            recordButton.addEventListener('click', () => {
                if (!isRecording) {
                    this.startRecording();
                } else {
                    this.stopRecording();
                }
            });
            
            // Set up send frequency slider
            sendFrequency.addEventListener('input', () => {
                const newFrequencySeconds = parseInt(sendFrequency.value);
                frequencyValue.textContent = newFrequencySeconds;
                autoSendComponent.updateInterval(newFrequencySeconds * 1000);
            });
            
            // Set up auto-send toggle
            autoSendToggle.addEventListener('change', () => {
                autoSendComponent.setEnabled(autoSendToggle.checked);
            });
            
            // Set up recognize button
            recognizeButton.addEventListener('click', async () => {
                if (audioChunks.length > 0) {
                    await audioProcessor.processAudioChunk(audioChunks);
                }
            });
            
            // Initialize with default values
            frequencyValue.textContent = sendFrequency.value;
            sendIntervalMs = parseInt(sendFrequency.value) * 1000;
            isAutoSendEnabled = autoSendToggle.checked;
        },
        
        startRecording: async function() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                isRecording = true;
                recordButton.textContent = '⏹️';
                recordButton.classList.add('recording');
                recordingStatus.textContent = 'Запись началась...';
                
                // Настраиваем визуализатор
                visualizerInstance.setupAudioAnalyser(stream);
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                        // Обновляем аудио для воспроизведения
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        audioPlayer.src = audioUrl;
                        playButton.disabled = false;
                        recognizeButton.disabled = false;
                    }
                };
                
                mediaRecorder.start(1000); // Записываем чанки каждую секунду
                recordingStartTime = Date.now();
                timerComponent.start(recordingStartTime);
                
                // Запускаем автоматическую отправку, если включена
                if (autoSendToggle.checked) {
                    autoSendComponent.start(sendIntervalMs);
                }
            } catch (error) {
                console.error('Ошибка при записи:', error);
                recordingStatus.textContent = 'Ошибка при записи: ' + error.message;
            }
        },
        
        stopRecording: function() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                recordButton.textContent = '🎤';
                recordButton.classList.remove('recording');
                recordingStatus.textContent = 'Запись остановлена';
                
                // Останавливаем визуализатор
                visualizerInstance.stop();
                
                // Останавливаем таймер
                timerComponent.stop();
                
                // Останавливаем автоматическую отправку
                autoSendComponent.stop();
                
                // Останавливаем воспроизведение
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                playButton.textContent = '▶️';
            }
        }
    };
};

// Helper function to update status message
function updateStatus(message) {
    recordingStatus.textContent = message;
    recognitionStatus.textContent = message;
}

// Gemini API Key
const GEMINI_API_KEY = 'AIzaSyB8oKZIbyeH7Ttv2kmTn8cEhFiUYKolv3g';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-1.5-flash'; // Using Gemini 1.5 Flash for faster responses

// Convert audio blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Get the base64 string by removing the Data URL prefix
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Transcribe audio using Google Gemini API
async function transcribeAudio(audioBlob) {
    try {
        // Convert audio blob to base64
        const audioBase64 = await blobToBase64(audioBlob);
        
        // Prepare the request payload
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: "Пожалуйста, расшифруй следующую аудиозапись на русском языке. Дай только текст без дополнительных комментариев."
                        },
                        {
                            inline_data: {
                                mime_type: "audio/wav",
                                data: audioBase64
                            }
                        }
                    ]
                }
            ],
            generation_config: {
                temperature: 0.2,
                top_p: 0.8,
                top_k: 40
            }
        };
        
        // Make the API request
        const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        // Check if the request was successful
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error.message || response.statusText}`);
        }
        
        // Parse the response
        const data = await response.json();
        
        // Extract the transcribed text
        const transcribedText = data.candidates[0].content.parts[0].text;
        
        // Update the conversation text
        updateConversationText(transcribedText);
        
        // Process text with agents
        await processWithAgents(transcribedText);
        
        // Update status
        recognitionStatus.textContent = 'Распознавание завершено';
        
    } catch (error) {
        console.error('Error transcribing audio:', error);
        recognitionStatus.textContent = 'Ошибка распознавания речи';
    }
}

// Update conversation text
function updateConversationText(text) {
    // Get current timestamp
    const timestamp = new Date().toLocaleTimeString();
    
    // Append new text with timestamp
    const formattedText = `<div class="conversation-entry">
        <div class="timestamp">${timestamp}</div>
        <div class="text">${text}</div>
    </div>`;
    
    conversationText.innerHTML += formattedText;
    
    // Scroll to the bottom
    conversationText.scrollTop = conversationText.scrollHeight;
}

// Process text with AI agents
async function processWithAgents(text) {
    try {
        // Process with all agents in parallel
        await Promise.all([
            getAgentResponse(agentJoker, text, 'шутник'),
            getAgentResponse(agentSkeptic, text, 'скептик'),
            getAgentResponse(agentSmart, text, 'умник')
        ]);
    } catch (error) {
        console.error('Error processing with agents:', error);
    }
}

// Get response from an AI agent
async function getAgentResponse(element, text, agentType) {
    try {
        element.innerHTML = 'Обработка...';
        
        // Prepare prompt based on agent type
        let prompt;
        switch (agentType) {
            case 'шутник':
                prompt = `Ты агент "Шутник". Твоя задача - найти в тексте что-то забавное и прокомментировать с юмором. Текст: "${text}"`;
                break;
            case 'скептик':
                prompt = `Ты агент "Скептик". Твоя задача - критически оценить информацию в тексте, найти неточности или противоречия. Текст: "${text}"`;
                break;
            case 'умник':
                prompt = `Ты агент "Умник". Твоя задача - дать интеллектуальный комментарий к тексту, расширить контекст, добавить полезную информацию. Текст: "${text}"`;
                break;
            default:
                prompt = `Прокомментируй текст: "${text}"`;
        }
        
        // Prepare the request payload
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generation_config: {
                temperature: 0.7,
                top_p: 0.9,
                top_k: 40,
                max_output_tokens: 200
            }
        };
        
        // Make the API request
        const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        // Check if the request was successful
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error.message || response.statusText}`);
        }
        
        // Parse the response
        const data = await response.json();
        
        // Extract the agent's response
        const agentResponse = data.candidates[0].content.parts[0].text;
        
        // Update the agent's response element
        element.innerHTML = agentResponse;
        
    } catch (error) {
        console.error(`Error getting ${agentType} response:`, error);
        element.innerHTML = `Ошибка обработки`;
    }
}

// Инициализация визуализатора
const visualizerInstance = new AdvancedVisualizer(visualizer, {
    mode: 'waves+particles',
    visualMode: 'spectrum',
    particleCount: 200,
    particleSize: 2,
    murmurmationStrength: 0.3,
    waveColor: '#4285f4',
    backgroundColor: '#000',
    particleColor: '#fff'
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const recordingSystem = AudioRecordingSystem();
    recordingSystem.init();
}); 