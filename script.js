// DOM Elements - Main UI
const recordButton = document.getElementById('recordButton');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTimer = document.getElementById('recordingTimer');
const conversationText = document.getElementById('conversationText');
const conversationTimeline = document.getElementById('conversationTimeline');
const playButton = document.getElementById('playButton');
const recognizeButton = document.getElementById('recognizeButton');
const audioPlayer = document.getElementById('audioPlayer');
const summaryText = document.getElementById('summary-text');

// DOM Elements - Agent Panel
const addAgentBtn = document.getElementById('add-agent-btn');
const agentCards = document.getElementById('agent-cards');

// DOM Elements - Agent Modal
const agentModal = document.getElementById('agent-modal');
const closeModalBtn = document.getElementById('close-modal');
const saveAgentBtn = document.getElementById('save-agent');
const modalTitle = document.getElementById('modal-title');
const agentTypeSelect = document.getElementById('agent-type');
const agentIconSelect = document.getElementById('agent-icon');
const customPromptContainer = document.getElementById('custom-prompt-container');
const customPromptTextarea = document.getElementById('custom-prompt');

// DOM Elements - Settings Panel
const settingsToggle = document.getElementById('settings-toggle');
const closeSettings = document.getElementById('close-settings');
const settingsPanel = document.getElementById('settings-panel');
const sendFrequency = document.getElementById('sendFrequency');
const frequencyValue = document.getElementById('frequencyValue');
const autoSendToggle = document.getElementById('autoSendToggle');
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

// DOM Elements - Tabs
const tabs = document.querySelectorAll('.tab');
const timelineContainers = document.querySelectorAll('.timeline-container');

// DOM Elements - Waveform Visualization
const waveformVisualization = document.querySelector('.waveform-visualization');

// Agent Management System
const AgentManager = (function() {
    // Private variables
    let agents = [];
    let nextAgentId = 2; // Start from 2 since we have one default agent
    let editingAgentId = null;
    
    // Agent types and their configurations
    const agentTypes = {
        'скептик': {
            iconClass: 'fa-question-circle',
            colorClass: 'secondary',
            prompt: 'Ты агент "Скептик". Твоя задача - критически оценить информацию в тексте, найти неточности или противоречия.'
        },
        'шутник': {
            iconClass: 'fa-laugh',
            colorClass: 'primary',
            prompt: 'Ты агент "Шутник". Твоя задача - найти в тексте что-то забавное и прокомментировать с юмором.'
        },
        'умник': {
            iconClass: 'fa-brain',
            colorClass: 'tertiary',
            prompt: 'Ты агент "Умник". Твоя задача - дать интеллектуальный комментарий к тексту, расширить контекст, добавить полезную информацию.'
        },
        'эмоциональный': {
            iconClass: 'fa-heart',
            colorClass: 'quaternary',
            prompt: 'Ты агент "Эмоциональный". Твоя задача - выразить эмоциональную реакцию на текст, показать, как эта информация может влиять на эмоции людей.'
        },
        'критик': {
            iconClass: 'fa-eye',
            colorClass: 'quinary',
            prompt: 'Ты агент "Критик". Твоя задача - сделать критический анализ информации, оценить ее достоверность, логичность и объективность.'
        },
        'переводчик': {
            iconClass: 'fa-language',
            colorClass: 'senary',
            prompt: 'Ты агент "Переводчик". Твоя задача - перевести текст на английский язык, сохраняя смысл и контекст.'
        },
        'кастомный': {
            iconClass: 'fa-star',
            colorClass: 'custom',
            prompt: '' // Будет задан пользователем
        }
    };
    
    // Initialize agents from localStorage or default
    function initAgents() {
        const savedAgents = localStorage.getItem('agents');
        
        if (savedAgents) {
            agents = JSON.parse(savedAgents);
            // Обновляем nextAgentId
            const maxId = agents.reduce((max, agent) => {
                const idNum = parseInt(agent.id.split('-')[1]);
                return idNum > max ? idNum : max;
            }, 0);
            nextAgentId = maxId + 1;
            
            // Отрисовываем сохраненных агентов
            renderAgents();
        } else {
            // Инициализируем с одним агентом по умолчанию (скептик)
            agents = [{
                id: 'agent-1',
                type: 'скептик',
                icon: 'fa-question-circle',
                colorClass: 'secondary',
                prompt: agentTypes['скептик'].prompt
            }];
            saveAgents();
        }
    }
    
    // Save agents to localStorage
    function saveAgents() {
        localStorage.setItem('agents', JSON.stringify(agents));
    }
    
    // Render all agents from the agents array
    function renderAgents() {
        // Clear existing agents
        agentCards.innerHTML = '';
        
        // Render each agent
        agents.forEach(agent => {
            const agentElement = createAgentElement(agent);
            agentCards.appendChild(agentElement);
        });
        
        // Set up event handlers
        setupAgentEventHandlers();
    }
    
    // Create HTML element for an agent
    function createAgentElement(agent) {
        const div = document.createElement('div');
        div.className = `agent-card ${agent.colorClass}`;
        div.setAttribute('data-agent-id', agent.id);
        div.setAttribute('data-agent-type', agent.type);
        
        div.innerHTML = `
            <div class="agent-header">
                <div class="agent-icon">
                    <i class="fas ${agent.icon}"></i>
                </div>
                <h3>${capitalizeFirstLetter(agent.type)}</h3>
                <div class="agent-actions">
                    <button class="agent-edit-btn icon-button" title="Изменить агента">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="agent-delete-btn icon-button" title="Удалить агента">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="expand-button" title="Развернуть">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
            </div>
            <div class="agent-content">
                Ждем вашего сообщения...
            </div>
        `;
        
        return div;
    }
    
    // Set up event handlers for agent cards
    function setupAgentEventHandlers() {
        // Edit buttons
        document.querySelectorAll('.agent-edit-btn').forEach(button => {
            button.addEventListener('click', handleEditAgent);
        });
        
        // Delete buttons
        document.querySelectorAll('.agent-delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteAgent);
        });
        
        // Set up expansion buttons
        setupAgentExpandButtons();
    }
    
    // Handle click on edit agent button
    function handleEditAgent(event) {
        const agentCard = event.currentTarget.closest('.agent-card');
        const agentId = agentCard.getAttribute('data-agent-id');
        const agentType = agentCard.getAttribute('data-agent-type');
        
        // Find agent in our array
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;
        
        // Set modal for editing
        modalTitle.textContent = 'Изменить агента';
        agentTypeSelect.value = agent.type;
        agentIconSelect.value = agent.icon;
        
        // Show custom prompt if it's a custom agent
        if (agent.type === 'кастомный') {
            customPromptContainer.style.display = 'block';
            customPromptTextarea.value = agent.prompt;
        } else {
            customPromptContainer.style.display = 'none';
        }
        
        // Save agent ID being edited
        editingAgentId = agentId;
        
        // Show modal
        agentModal.classList.add('active');
    }
    
    // Handle click on delete agent button
    function handleDeleteAgent(event) {
        if (agents.length <= 1) {
            alert('Необходим минимум один агент');
            return;
        }
        
        const agentCard = event.currentTarget.closest('.agent-card');
        const agentId = agentCard.getAttribute('data-agent-id');
        
        // Confirm deletion
        if (confirm('Вы уверены, что хотите удалить этого агента?')) {
            // Remove agent from array
            agents = agents.filter(agent => agent.id !== agentId);
            
            // Save to localStorage
            saveAgents();
            
            // Remove from DOM
            agentCard.remove();
        }
    }
    
    // Handle adding new agent
    function handleAddAgent() {
        // Reset modal
        modalTitle.textContent = 'Добавить агента';
        agentTypeSelect.value = 'скептик';
        agentIconSelect.value = agentTypes['скептик'].iconClass;
        customPromptContainer.style.display = 'none';
        customPromptTextarea.value = '';
        
        // Clear editing agent ID
        editingAgentId = null;
        
        // Show modal
        agentModal.classList.add('active');
    }
    
    // Handle saving agent (add new or update existing)
    function handleSaveAgent() {
        const type = agentTypeSelect.value;
        const icon = agentIconSelect.value;
        
        // Get color class and prompt based on type
        const colorClass = agentTypes[type].colorClass;
        let prompt = agentTypes[type].prompt;
        
        // For custom agents, use the custom prompt
        if (type === 'кастомный') {
            prompt = customPromptTextarea.value.trim();
            if (!prompt) {
                alert('Пожалуйста, введите промпт для кастомного агента');
                return;
            }
        }
        
        if (editingAgentId) {
            // Update existing agent
            const index = agents.findIndex(agent => agent.id === editingAgentId);
            if (index !== -1) {
                agents[index] = {
                    ...agents[index],
                    type,
                    icon,
                    colorClass,
                    prompt
                };
            }
        } else {
            // Add new agent
            const newAgent = {
                id: `agent-${nextAgentId++}`,
                type,
                icon,
                colorClass,
                prompt
            };
            agents.push(newAgent);
        }
        
        // Save to localStorage
        saveAgents();
        
        // Re-render agents
        renderAgents();
        
        // Close modal
        agentModal.classList.remove('active');
    }
    
    // Handle agent type change in modal
    function handleAgentTypeChange() {
        const selectedType = agentTypeSelect.value;
        
        // Show/hide custom prompt field
        if (selectedType === 'кастомный') {
            customPromptContainer.style.display = 'block';
        } else {
            customPromptContainer.style.display = 'none';
        }
        
        // Update icon
        agentIconSelect.value = agentTypes[selectedType].iconClass;
    }
    
    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Process all agents with the given text
    async function processWithAgents(text) {
        try {
            // Array of promises for processing each agent
            const promises = agents.map(agent => {
                const agentElement = document.querySelector(`[data-agent-id="${agent.id}"] .agent-content`);
                return getAgentResponse(agentElement, text, agent.prompt);
            });
            
            // Process all agents in parallel
            await Promise.all(promises);
        } catch (error) {
            console.error('Error processing with agents:', error);
        }
    }
    
    // Public methods
    return {
        init: function() {
            initAgents();
            
            // Event listeners for modal
            addAgentBtn.addEventListener('click', handleAddAgent);
            closeModalBtn.addEventListener('click', () => agentModal.classList.remove('active'));
            saveAgentBtn.addEventListener('click', handleSaveAgent);
            agentTypeSelect.addEventListener('change', handleAgentTypeChange);
            
            // Close modal when clicking outside
            agentModal.addEventListener('click', (e) => {
                if (e.target === agentModal) {
                    agentModal.classList.remove('active');
                }
            });
        },
        processWithAgents: processWithAgents,
        getAgents: function() {
            return [...agents]; // Return a copy
        }
    };
})();

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
            setupAgentExpandButtons();

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
                
                // Визуальное оповещение о начале записи
                showNotification('Запись началась');
                
                // Setup audio context for waveform visualization
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                
                showStatus('Запись началась...');
                
                // Start waveform animation
                waveformComponent.animateWaveform();
                
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
                
                // Показать уведомление
                showNotification('Запись остановлена', 'success');
                
                showStatus('Recording stopped');
                
                // Stop audio context
                if (audioContext) {
                    audioContext.close().catch(e => console.error('Error closing audio context:', e));
                }
                
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
        // Check if we already have a transcription in progress
        if (document.querySelector('.transcribing-status')) {
            return; // Prevent duplicate processing
        }
        
        // Add status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'transcribing-status';
        statusIndicator.style.display = 'none';
        document.body.appendChild(statusIndicator);
        
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
        
        // Remove status indicator
        statusIndicator.remove();
        
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
        await AgentManager.processWithAgents(transcribedText);
        
        // Update status
        showStatus('Transcription complete');
        
    } catch (error) {
        console.error('Error transcribing audio:', error);
        showStatus('Error in speech recognition');
        
        // Remove status indicator if it exists
        const statusIndicator = document.querySelector('.transcribing-status');
        if (statusIndicator) {
            statusIndicator.remove();
        }
    }
}

// Update conversation text in timeline
function updateConversationText(text) {
    if (!text.trim()) return; // Игнорировать пустой текст
    
    // Get current timestamp
    const timestamp = new Date().toLocaleTimeString();
    const shortTime = timestamp.replace(/:\d\d\s/, ' ');
    
    // Очистить timeline перед добавлением нового сообщения
    conversationTimeline.innerHTML = '';
    
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
    
    // Add animation class
    timelineItem.classList.add('message-fade-in');
    
    // Добавить эффект обновления на timeline
    conversationTimeline.classList.add('updating');
    setTimeout(() => {
        conversationTimeline.classList.remove('updating');
    }, 1000);
    
    // Append to timeline
    conversationTimeline.appendChild(timelineItem);
    
    // Очистить текст перед добавлением новой записи
    conversationText.innerHTML = '';
    
    // Добавить только последнюю запись в текстовое представление
    const formattedText = `<div class="conversation-entry message-fade-in">
        <div class="timestamp">${timestamp}</div>
        <div class="text">${text}</div>
    </div>`;
    
    conversationText.insertAdjacentHTML('beforeend', formattedText);
    
    // Scroll to newest message
    timelineItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
    conversationText.scrollTop = conversationText.scrollHeight;
}

// Process text with AI agents (replace the old function)
async function processWithAgents(text) {
    await AgentManager.processWithAgents(text);
}

// Get response from an AI agent
async function getAgentResponse(element, text, prompt) {
    try {
        element.innerHTML = 'Обработка...';
        element.classList.add('processing');
        
        // Prepare the request payload
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: `${prompt} Текст: "${text}"`
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
        
        // Update the agent's response element with animation
        element.classList.remove('processing');
        element.classList.add('response-update');
        element.innerHTML = agentResponse;
        
        // Expand the agent card to show response
        const agentCard = element.closest('.agent-card');
        if (agentCard) {
            const content = agentCard.querySelector('.agent-content');
            const expandButton = agentCard.querySelector('.expand-button i');
            if (content && expandButton) {
                content.style.maxHeight = content.scrollHeight + "px";
                expandButton.classList.replace('fa-chevron-down', 'fa-chevron-up');
            }
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove('response-update');
        }, 1000);
        
    } catch (error) {
        console.error(`Error getting agent response:`, error);
        element.classList.remove('processing');
        element.innerHTML = `Ошибка обработки`;
    }
}

// Theme handling
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Проверка существования элементов перед использованием
    const themeToggleElement = document.getElementById('themeToggle');
    const themeLabelElement = document.getElementById('themeLabel');
    
    if (themeToggleElement) {
        themeToggleElement.checked = savedTheme === 'light';
    }
    
    if (themeLabelElement) {
        themeLabelElement.textContent = savedTheme === 'light' ? 'Светлая' : 'Тёмная';
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Проверка существования элемента перед использованием
    const themeLabelElement = document.getElementById('themeLabel');
    if (themeLabelElement) {
        themeLabelElement.textContent = newTheme === 'light' ? 'Светлая' : 'Тёмная';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация темы
    initTheme();
    
    // Проверка ошибок при инициализации DOM элементов
    checkDOMElements();
    
    // Инициализация системы агентов
    AgentManager.init();
    
    // Настройка анимаций разворачивания карточек
    setupAgentExpandButtons();
    
    // Инициализация системы записи
    const recordingSystem = AudioRecordingSystem();
    recordingSystem.init();
});

// Проверка DOM-элементов перед использованием
function checkDOMElements() {
    const requiredElements = [
        { id: 'themeToggle', name: 'Theme Toggle' },
        { id: 'themeLabel', name: 'Theme Label' },
        { id: 'recordButton', name: 'Record Button' }
    ];
    
    requiredElements.forEach(el => {
        if (!document.getElementById(el.id)) {
            console.warn(`Element ${el.name} (${el.id}) not found in DOM.`);
        }
    });
}

// Improved setup for agent card expansion buttons
function setupAgentExpandButtons() {
    document.querySelectorAll('.expand-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const card = button.closest('.agent-card');
            const content = card.querySelector('.agent-content');
            const icon = button.querySelector('i');
            
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                content.classList.remove('expanded');
                icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
                button.setAttribute('title', 'Развернуть');
            } else {
                content.classList.add('expanded');
                content.style.maxHeight = content.scrollHeight + "px";
                icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
                button.setAttribute('title', 'Свернуть');
            }
            
            // Animate the content with a subtle highlight
            content.classList.add('response-update');
            setTimeout(() => {
                content.classList.remove('response-update');
            }, 800);
            
            e.stopPropagation(); // Prevent event bubbling
        });
    });
}

// Function to show notification
function showNotification(message, type = 'info') {
    // Создать элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Добавить на страницу
    document.body.appendChild(notification);
    
    // Показать с анимацией
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Удалить через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
} 