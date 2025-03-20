// DOM Elements - Main UI
const recordButton = document.getElementById('recordButton');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTimer = document.getElementById('recordingTimer');
const visualizer = document.getElementById('visualizer');
const visualizerContainer = document.getElementById('visualizer-container');
const conversationText = document.getElementById('conversationText');
const conversationTimeline = document.getElementById('conversationTimeline');
const playButton = document.getElementById('playButton');
const recognizeButton = document.getElementById('recognizeButton');
const audioPlayer = document.getElementById('audioPlayer');
const summaryText = document.getElementById('summary-text');

// DOM Elements - Agent Responses
const agentJoker = document.getElementById('agent-joker');
const agentSkeptic = document.getElementById('agent-skeptic');
const agentSmart = document.getElementById('agent-smart');

// DOM Elements - Settings Panel
const settingsToggle = document.getElementById('settings-toggle');
const closeSettings = document.getElementById('close-settings');
const settingsPanel = document.getElementById('settings-panel');
const sendFrequency = document.getElementById('sendFrequency');
const frequencyValue = document.getElementById('frequencyValue');
const autoSendToggle = document.getElementById('autoSendToggle');
const visualizerToggle = document.getElementById('visualizerToggle');
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

// DOM Elements - Tabs
const tabs = document.querySelectorAll('.tab');
const timelineContainers = document.querySelectorAll('.timeline-container');

// DOM Elements - Waveform Visualization
const waveformVisualization = document.querySelector('.waveform-visualization');

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
    let waveformLines = [];
    
    // Audio Processing Component
    const audioProcessor = {
        processAudioChunk: async function(chunks) {
            try {
                const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                
                // Update status
                updateStatus(`Распознавание речи (${new Date().toLocaleTimeString()})...`);
                
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
    
    // Waveform Visualization Component
    const waveformComponent = {
        setup: function() {
            // Clear any existing waveform
            waveformVisualization.innerHTML = '';
            waveformLines = [];
            
            // Create waveform lines
            const numLines = 60;
            for (let i = 0; i < numLines; i++) {
                const line = document.createElement('div');
                line.className = 'waveform-line';
                line.style.height = '2px';
                waveformVisualization.appendChild(line);
                waveformLines.push(line);
            }
        },
        
        updateWaveform: function(dataArray) {
            if (!waveformLines.length) return;
            
            // Get a slice of the data array for visualization
            const sliceWidth = Math.floor(dataArray.length / waveformLines.length);
            
            for (let i = 0; i < waveformLines.length; i++) {
                // Calculate the height based on the audio data
                let value = 0;
                for (let j = 0; j < sliceWidth; j++) {
                    const index = i * sliceWidth + j;
                    if (index < dataArray.length) {
                        value += dataArray[index];
                    }
                }
                value = value / sliceWidth;
                
                // Scale value to a reasonable height
                const height = (value / 255) * 100;
                waveformLines[i].style.height = `${Math.max(2, height)}px`;
            }
        },
        
        animateWaveform: function() {
            if (!analyser || !isRecording) return;
            
            // Get frequency data
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            
            // Update the waveform visualization
            this.updateWaveform(dataArray);
            
            // Request next animation frame
            requestAnimationFrame(() => this.animateWaveform());
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
            this.setupEventListeners();
            waveformComponent.setup();
            
            // Initialize with default values
            frequencyValue.textContent = sendFrequency.value;
            sendIntervalMs = parseInt(sendFrequency.value) * 1000;
            isAutoSendEnabled = autoSendToggle.checked;
        },
        
        setupEventListeners: function() {
            // Set up record button
            recordButton.addEventListener('click', () => {
                if (!isRecording) {
                    this.startRecording();
                } else {
                    this.stopRecording();
                }
            });
            
            // Set up settings toggle
            settingsToggle.addEventListener('click', () => {
                settingsPanel.classList.add('active');
            });
            
            // Set up close settings button
            closeSettings.addEventListener('click', () => {
                settingsPanel.classList.remove('active');
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
            
            // Set up visualizer toggle
            visualizerToggle.addEventListener('change', () => {
                visualizerContainer.style.display = visualizerToggle.checked ? 'block' : 'none';
            });
            
            // Set up recognize button
            recognizeButton.addEventListener('click', async () => {
                if (audioChunks.length > 0) {
                    await audioProcessor.processAudioChunk(audioChunks);
                }
            });
            
            // Set up play button
            playButton.addEventListener('click', () => {
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    playButton.innerHTML = '<i class="fas fa-pause"></i> Пауза';
                } else {
                    audioPlayer.pause();
                    playButton.innerHTML = '<i class="fas fa-play"></i> Прослушать';
                }
            });
            
            // Set up audio player events
            audioPlayer.addEventListener('ended', () => {
                playButton.innerHTML = '<i class="fas fa-play"></i> Прослушать';
            });
            
            // Set up tabs
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs
                    tabs.forEach(t => t.classList.remove('active'));
                    
                    // Add active class to clicked tab
                    tab.classList.add('active');
                    
                    // Hide all tab contents
                    timelineContainers.forEach(content => {
                        content.style.display = 'none';
                    });
                    
                    // Show selected tab content
                    const tabId = tab.getAttribute('data-tab');
                    document.getElementById(`${tabId}-tab`).style.display = 'block';
                });
            });
            
            // Close settings panel when clicking outside
            document.addEventListener('click', (event) => {
                if (settingsPanel.classList.contains('active') && 
                    !settingsPanel.contains(event.target) && 
                    event.target !== settingsToggle) {
                    settingsPanel.classList.remove('active');
                }
            });

            // Set up agent card expansion buttons
            document.querySelectorAll('.expand-button').forEach(button => {
                button.addEventListener('click', () => {
                    const card = button.closest('.agent-card');
                    const content = card.querySelector('.agent-content');
                    const icon = button.querySelector('i');
                    
                    if (content.style.maxHeight) {
                        content.style.maxHeight = null;
                        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
                    } else {
                        content.style.maxHeight = content.scrollHeight + "px";
                        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
                    }
                });
            });

            // Set up search functionality
            const searchInput = document.querySelector('.search-input');
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                
                // Search in conversation timeline
                const timelineItems = document.querySelectorAll('.timeline-item .message-block');
                timelineItems.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    const messageBlock = item.closest('.timeline-item');
                    if (text.includes(searchTerm)) {
                        messageBlock.style.display = 'flex';
                        // Highlight matching text
                        if (searchTerm) {
                            const regex = new RegExp(`(${searchTerm})`, 'gi');
                            item.innerHTML = item.textContent.replace(regex, '<mark>$1</mark>');
                        }
                    } else {
                        messageBlock.style.display = 'none';
                    }
                });
                
                // Search in full text view
                const textEntries = document.querySelectorAll('.conversation-entry');
                textEntries.forEach(entry => {
                    const text = entry.querySelector('.text').textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        entry.style.display = 'block';
                        // Highlight matching text
                        if (searchTerm) {
                            const textElement = entry.querySelector('.text');
                            const regex = new RegExp(`(${searchTerm})`, 'gi');
                            textElement.innerHTML = textElement.textContent.replace(regex, '<mark>$1</mark>');
                        }
                    } else {
                        entry.style.display = 'none';
                    }
                });
            });

            // Theme toggle
            themeToggle.addEventListener('change', toggleTheme);
        },
        
        startRecording: async function() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                isRecording = true;
                recordButton.innerHTML = '<i class="fas fa-stop"></i>';
                recordButton.classList.add('recording');
                
                // Setup audio context for waveform visualization
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                
                showStatus('Запись началась...');
                
                // Start waveform animation
                waveformComponent.animateWaveform();
                
                // Setup visualizer
                try {
                    visualizerInstance.setupAudioAnalyser(stream);
                } catch (vizError) {
                    console.error('Ошибка настройки визуализатора:', vizError);
                }
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                        // Update audio for playback
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        audioPlayer.src = audioUrl;
                        playButton.disabled = false;
                        recognizeButton.disabled = false;
                    }
                };
                
                mediaRecorder.start(1000); // Capture chunks every second
                recordingStartTime = Date.now();
                timerComponent.start(recordingStartTime);
                
                // Start auto-sending if enabled
                if (autoSendToggle.checked) {
                    autoSendComponent.start(sendIntervalMs);
                }
            } catch (error) {
                console.error('Error starting recording:', error);
                showStatus('Error starting recording: ' + error.message);
            }
        },
        
        stopRecording: function() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                recordButton.innerHTML = '<i class="fas fa-microphone"></i>';
                recordButton.classList.remove('recording');
                showStatus('Recording stopped');
                
                // Stop audio context
                if (audioContext) {
                    audioContext.close().catch(e => console.error('Error closing audio context:', e));
                }
                
                // Stop visualizer
                visualizerInstance.stop();
                
                // Stop timer
                timerComponent.stop();
                
                // Stop auto-sending
                autoSendComponent.stop();
                
                // Stop playback
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                playButton.innerHTML = '<i class="fas fa-play"></i> Прослушать';
                
                // Generate summary
                generateSummary();
            }
        }
    };
};

// Helper function to update status message
function updateStatus(message) {
    showStatus(message);
}

// Helper function to show status temporarily
function showStatus(message) {
    recordingStatus.textContent = message;
    recordingStatus.classList.add('active');
    
    // Hide after 3 seconds
    setTimeout(() => {
        recordingStatus.classList.remove('active');
    }, 3000);
}

// Generate summary of conversation
async function generateSummary() {
    try {
        if (conversationText.textContent.trim() === '') {
            summaryText.textContent = 'Недостаточно данных для формирования итогов.';
            return;
        }
        
        summaryText.textContent = 'Формирование итогов...';
        
        // Prepare the request payload for summary
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: `Создай краткое резюме следующего разговора: "${conversationText.textContent}"`
                        }
                    ]
                }
            ],
            generation_config: {
                temperature: 0.4,
                top_p: 0.8,
                top_k: 40,
                max_output_tokens: 300
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
        
        // Extract the summary
        const summary = data.candidates[0].content.parts[0].text;
        
        // Update the summary text
        summaryText.textContent = summary;
        
    } catch (error) {
        console.error('Error generating summary:', error);
        summaryText.textContent = 'Ошибка при формировании итогов.';
    }
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
        showStatus('Transcription complete');
        
    } catch (error) {
        console.error('Error transcribing audio:', error);
        showStatus('Error in speech recognition');
    }
}

// Update conversation text in timeline
function updateConversationText(text) {
    // Get current timestamp
    const timestamp = new Date().toLocaleTimeString();
    const shortTime = timestamp.replace(/:\d\d\s/, ' ');
    
    // Create timeline item
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    
    // Add timestamp and message
    timelineItem.innerHTML = `
        <div class="timestamp">${shortTime}</div>
        <div class="message-block primary">
            <p>${text}</p>
        </div>
    `;
    
    // Append to timeline
    conversationTimeline.appendChild(timelineItem);
    
    // Also append to conversation text view
    const formattedText = `<div class="conversation-entry">
        <div class="timestamp">${timestamp}</div>
        <div class="text">${text}</div>
    </div>`;
    
    conversationText.innerHTML += formattedText;
    
    // Scroll to newest message
    timelineItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
        element.innerHTML = `Error processing`;
    }
}

// Theme handling
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'light';
    themeLabel.textContent = savedTheme === 'light' ? 'Светлая' : 'Тёмная';
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeLabel.textContent = newTheme === 'light' ? 'Светлая' : 'Тёмная';
}

// Initialize visualizer
let visualizerInstance;
try {
    // Import TentaclesVisualizer
    import('./tentacles-visualizer.js').then(module => {
        const { TentaclesVisualizer } = module;
        
        // Create tentacles visualizer with theme-aware colors
        visualizerInstance = new TentaclesVisualizer(visualizer, {
            numTentacles: 8,
            baseColor: [220, 53, 69], // Match the red theme
            tentacleWidth: 6,
            segments: 20,
            cohesionStrength: 0.01,
            centerAttraction: 0.0005,
            noiseSpeed: 0.01,
            volumeSmoothing: 0.1
        });
        
        console.log('Tentacles visualizer initialized successfully');
    }).catch(error => {
        console.error('Error importing TentaclesVisualizer:', error);
        createFallbackVisualizer();
    });
} catch (error) {
    console.error('Error initializing visualizer:', error);
    createFallbackVisualizer();
}

// Create fallback visualizer
function createFallbackVisualizer() {
    visualizerInstance = {
        setupAudioAnalyser: function() {},
        stop: function() {},
        setVisualMode: function() {},
        setMode: function() {}
    };
}

// Create and initialize the waveform visualization
function createWaveformVisualization() {
    const container = document.querySelector('.waveform-visualization');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create animation lines
    for (let i = 0; i < 60; i++) {
        const line = document.createElement('div');
        line.className = 'waveform-line';
        line.style.height = `${Math.random() * 50 + 5}px`;
        container.appendChild(line);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const recordingSystem = AudioRecordingSystem();
    recordingSystem.init();
}); 