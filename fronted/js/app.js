// app.js
// Main application logic for Prompt-to-JSON Enhancer

/**
 * Application state management
 */
class AppState {
    constructor() {
        this.currentPrompt = '';
        this.enhancementType = 'general';
        this.targetAudience = 'general';
        this.lastEnhancedData = null;
        this.isProcessing = false;
        this.templates = null;
        this.listeners = [];
    }

    /**
     * Update state and notify listeners
     * @param {Object} updates - State updates
     */
    update(updates) {
        Object.assign(this, updates);
        this.notifyListeners();
    }

    /**
     * Add state change listener
     * @param {Function} listener - Listener function
     */
    addListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * Notify all listeners of state change
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }
}

// Global application state
const appState = new AppState();

/**
 * DOM elements cache
 */
const elements = {
    // Input elements
    originalPrompt: null,
    enhancementType: null,
    targetAudience: null,
    enhanceBtn: null,
    inputWordCount: null,

    // Output elements
    resultsSection: null,
    enhancedPrompt: null,
    improvementScore: null,
    originalWordCount: null,
    enhancedWordCount: null,
    improvementsList: null,
    usageTips: null,

    // Structure elements
    structureContext: null,
    structureObjective: null,
    structureRequirements: null,
    structureAudience: null,
    structureFormat: null,
    structureTone: null,
    structureExamples: null,
    structureConstraints: null,
    examplesCard: null,
    constraintsCard: null,

    // Control elements
    copyEnhancedBtn: null,
    copyStructureBtn: null,
    loadingOverlay: null,
    aboutModal: null,
    aboutLink: null,
    apiDocsLink: null,

    // Example elements
    exampleCards: null
};

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log('Initializing Prompt-to-JSON Enhancer...');
        
        // Cache DOM elements
        cacheElements();

        // Set up event listeners
        setupEventListeners();

        // Load templates and initialize UI
        await loadTemplates();

        // Initialize state listeners
        setupStateListeners();

        // Test API connection
        await testAPIConnection();

        // Show ready status
        Utils.updateStatus('Ready to enhance your prompts', 'success');

        console.log('Application initialized successfully');

    } catch (error) {
        console.error('Failed to initialize application:', error);
        Utils.updateStatus('Application initialization failed', 'error');
        Utils.showToast('Failed to initialize application. Please refresh the page.', 'error', 5000);
    }
}

/**
 * Cache DOM elements for performance
 */
function cacheElements() {
    console.log('Caching DOM elements...');
    
    // Input elements
    elements.originalPrompt = document.getElementById('originalPrompt');
    elements.enhancementType = document.getElementById('enhancementType');
    elements.targetAudience = document.getElementById('targetAudience');
    elements.enhanceBtn = document.getElementById('enhanceBtn');
    elements.inputWordCount = document.getElementById('inputWordCount');

    // Output elements
    elements.resultsSection = document.getElementById('resultsSection');
    elements.enhancedPrompt = document.getElementById('enhancedPrompt');
    elements.improvementScore = document.getElementById('improvementScore');
    elements.originalWordCount = document.getElementById('originalWordCount');
    elements.enhancedWordCount = document.getElementById('enhancedWordCount');
    elements.improvementsList = document.getElementById('improvementsList');
    elements.usageTips = document.getElementById('usageTips');

    // Structure elements
    elements.structureContext = document.getElementById('structureContext');
    elements.structureObjective = document.getElementById('structureObjective');
    elements.structureRequirements = document.getElementById('structureRequirements');
    elements.structureAudience = document.getElementById('structureAudience');
    elements.structureFormat = document.getElementById('structureFormat');
    elements.structureTone = document.getElementById('structureTone');
    elements.structureExamples = document.getElementById('structureExamples');
    elements.structureConstraints = document.getElementById('structureConstraints');
    elements.examplesCard = document.getElementById('examplesCard');
    elements.constraintsCard = document.getElementById('constraintsCard');

    // Control elements
    elements.copyEnhancedBtn = document.getElementById('copyEnhancedBtn');
    elements.copyStructureBtn = document.getElementById('copyStructureBtn');
    elements.loadingOverlay = document.getElementById('loadingOverlay');
    elements.aboutModal = document.getElementById('aboutModal');
    elements.aboutLink = document.getElementById('aboutLink');
    elements.apiDocsLink = document.getElementById('apiDocsLink');

    // Example elements
    elements.exampleCards = document.querySelectorAll('.example-card');

    // Validate critical elements
    const criticalElements = ['originalPrompt', 'enhanceBtn', 'resultsSection'];
    const missingElements = [];
    
    for (const elementKey of criticalElements) {
        if (!elements[elementKey]) {
            missingElements.push(elementKey);
        }
    }
    
    if (missingElements.length > 0) {
        throw new Error(`Critical elements not found: ${missingElements.join(', ')}`);
    }
    
    console.log('DOM elements cached successfully');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Input change handlers
    if (elements.originalPrompt) {
        // Debounced input handler for word count
        const debouncedInputHandler = Utils.debounce(handlePromptInput, 300);
        elements.originalPrompt.addEventListener('input', debouncedInputHandler);
        elements.originalPrompt.addEventListener('paste', () => {
            setTimeout(debouncedInputHandler, 50); // Handle paste after it's processed
        });
    }

    // Dropdown change handlers
    if (elements.enhancementType) {
        elements.enhancementType.addEventListener('change', handleEnhancementTypeChange);
    }
    if (elements.targetAudience) {
        elements.targetAudience.addEventListener('change', handleTargetAudienceChange);
    }

    // Button handlers
    if (elements.enhanceBtn) {
        elements.enhanceBtn.addEventListener('click', handleEnhanceClick);
    }
    if (elements.copyEnhancedBtn) {
        elements.copyEnhancedBtn.addEventListener('click', () => copyEnhancedPrompt());
    }
    if (elements.copyStructureBtn) {
        elements.copyStructureBtn.addEventListener('click', () => copyStructureJSON());
    }

    // Example card handlers
    if (elements.exampleCards) {
        elements.exampleCards.forEach(card => {
            card.addEventListener('click', () => handleExampleClick(card));
        });
    }

    // Modal handlers
    if (elements.aboutLink) {
        elements.aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAboutModal();
        });
    }
    if (elements.apiDocsLink) {
        elements.apiDocsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const apiUrl = `${window.API_CONFIG.BASE_URL}/docs`;
            window.open(apiUrl, '_blank');
        });
    }

    // Modal close handlers
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', hideAboutModal);
    }
    if (elements.aboutModal) {
        elements.aboutModal.addEventListener('click', (e) => {
            if (e.target === elements.aboutModal) {
                hideAboutModal();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // API event listeners
    if (window.EnhancedAPI) {
        EnhancedAPI.on('enhance:start', handleEnhanceStart);
        EnhancedAPI.on('enhance:success', handleEnhanceSuccess);
        EnhancedAPI.on('enhance:error', handleEnhanceError);
        EnhancedAPI.on('connection:online', handleConnectionOnline);
        EnhancedAPI.on('connection:offline', handleConnectionOffline);
    }
    
    console.log('Event listeners set up successfully');
}

/**
 * Set up state listeners
 */
function setupStateListeners() {
    appState.addListener((state) => {
        // Update enhance button state
        updateEnhanceButtonState();
        
        // Update UI based on processing state
        if (state.isProcessing) {
            showLoadingOverlay();
        } else {
            hideLoadingOverlay();
        }
    });
}

/**
 * Load templates from API
 */
async function loadTemplates() {
    try {
        console.log('Loading templates from API...');
        const templates = await EnhancedAPI.getTemplates();
        appState.update({ templates });
        
        // Update UI with templates
        updateEnhancementTypeOptions(templates.enhancement_types);
        updateTargetAudienceOptions(templates.target_audiences);
        
        console.log('Templates loaded successfully');
        
    } catch (error) {
        console.warn('Failed to load templates, using defaults:', error);
        // Default templates are already in the HTML
    }
}

/**
 * Test API connection on startup
 */
async function testAPIConnection() {
    try {
        console.log('Testing API connection...');
        const isConnected = await EnhancedAPI.testConnection();
        if (isConnected) {
            Utils.updateStatus('Connected to AI service', 'success');
            console.log('API connection successful');
        } else {
            Utils.updateStatus('AI service unavailable', 'error');
            Utils.showToast('AI service is currently unavailable. Some features may not work.', 'warning', 8000);
            console.warn('API connection failed');
        }
    } catch (error) {
        console.error('API connection test failed:', error);
        Utils.updateStatus('Failed to connect to AI service', 'error');
    }
}

/**
 * Handle prompt input changes
 */
function handlePromptInput(event) {
    const prompt = event.target.value;
    const wordCount = Utils.countWords(prompt);
    
    // Update word count display
    if (elements.inputWordCount) {
        elements.inputWordCount.textContent = wordCount;
    }
    
    // Update app state
    appState.update({ currentPrompt: prompt });
    
    // Validate and update button state
    updateEnhanceButtonState();
}

/**
 * Handle enhancement type change
 */
function handleEnhancementTypeChange(event) {
    appState.update({ enhancementType: event.target.value });
    console.log('Enhancement type changed to:', event.target.value);
}

/**
 * Handle target audience change
 */
function handleTargetAudienceChange(event) {
    appState.update({ targetAudience: event.target.value });
    console.log('Target audience changed to:', event.target.value);
}

/**
 * Handle enhance button click
 */
async function handleEnhanceClick() {
    if (appState.isProcessing) {
        console.log('Enhancement already in progress, ignoring click');
        return;
    }

    const validation = Utils.validatePrompt(appState.currentPrompt);
    if (!validation.isValid) {
        Utils.showToast(validation.message, 'error');
        console.log('Prompt validation failed:', validation.message);
        return;
    }

    try {
        console.log('Starting prompt enhancement...');
        appState.update({ isProcessing: true });
        
        const promptData = {
            original_prompt: appState.currentPrompt,
            enhancement_type: appState.enhancementType,
            target_audience: appState.targetAudience,
            include_examples: true
        };

        console.log('Sending enhancement request:', promptData);
        const result = await EnhancedAPI.enhancePrompt(promptData);
        console.log('Enhancement successful:', result);
        
        appState.update({ 
            lastEnhancedData: result,
            isProcessing: false 
        });
        
        // Display results
        displayEnhancedResults(result);
        
        // Scroll to results
        Utils.scrollToElement(elements.resultsSection, 20);
        
    } catch (error) {
        appState.update({ isProcessing: false });
        console.error('Enhancement failed:', error);
        
        let errorMessage = 'Failed to enhance prompt. Please try again.';
        if (error instanceof APIError) {
            errorMessage = error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        Utils.showToast(errorMessage, 'error', 5000);
        Utils.updateStatus('Enhancement failed', 'error');
    }
}

/**
 * Handle example card clicks
 */
function handleExampleClick(card) {
    const prompt = card.getAttribute('data-prompt');
    if (prompt && elements.originalPrompt) {
        elements.originalPrompt.value = prompt;
        elements.originalPrompt.focus();
        
        // Trigger input event to update word count and state
        const inputEvent = new Event('input', { bubbles: true });
        elements.originalPrompt.dispatchEvent(inputEvent);
        
        // Scroll to input
        Utils.scrollToElement(elements.originalPrompt, 100);
        
        Utils.showToast('Example loaded! Click "Enhance Prompt" to see the magic.', 'success');
        console.log('Example prompt loaded:', prompt);
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Enter to enhance
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (elements.enhanceBtn && !elements.enhanceBtn.disabled) {
            handleEnhanceClick();
        }
    }
    
    // Escape to close modal
    if (event.key === 'Escape') {
        if (elements.aboutModal && elements.aboutModal.style.display !== 'none') {
            hideAboutModal();
        }
    }
}

/**
 * Update enhance button state
 */
function updateEnhanceButtonState() {
    if (!elements.enhanceBtn) return;
    
    const validation = Utils.validatePrompt(appState.currentPrompt);
    const isEnabled = validation.isValid && !appState.isProcessing;
    
    elements.enhanceBtn.disabled = !isEnabled;
    
    if (!validation.isValid && appState.currentPrompt.length > 0) {
        elements.enhanceBtn.title = validation.message;
    } else if (appState.isProcessing) {
        elements.enhanceBtn.title = 'Enhancement in progress...';
    } else {
        elements.enhanceBtn.title = 'Enhance your prompt with AI';
    }
}

/**
 * Display enhanced results
 */
function displayEnhancedResults(data) {
    if (!data || !elements.resultsSection) {
        console.error('No data or results section not found');
        return;
    }
    
    console.log('Displaying enhanced results:', data);
    
    // Show results section with animation
    elements.resultsSection.style.display = 'block';
    
    // Update metrics with animation
    if (elements.improvementScore) {
        Utils.animateNumber(elements.improvementScore, 0, data.estimated_improvement, 1000, '%');
    }
    if (elements.originalWordCount) {
        Utils.animateNumber(elements.originalWordCount, 0, data.word_count_original, 800);
    }
    if (elements.enhancedWordCount) {
        Utils.animateNumber(elements.enhancedWordCount, 0, data.word_count_enhanced, 800);
    }
    
    // Update enhanced prompt
    if (elements.enhancedPrompt) {
        elements.enhancedPrompt.textContent = data.enhanced_prompt;
    }
    
    // Update improvements list
    if (elements.improvementsList && data.improvement_summary) {
        elements.improvementsList.innerHTML = '';
        data.improvement_summary.forEach(improvement => {
            const li = document.createElement('li');
            li.textContent = improvement;
            elements.improvementsList.appendChild(li);
        });
    }
    
    // Update usage tips
    if (elements.usageTips && data.usage_tips) {
        elements.usageTips.innerHTML = '';
        data.usage_tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            elements.usageTips.appendChild(li);
        });
    }
    
    // Update structure breakdown
    updateStructureBreakdown(data.prompt_structure);
    
    Utils.updateStatus('Prompt enhanced successfully!', 'success');
}

/**
 * Update structure breakdown section
 */
function updateStructureBreakdown(structure) {
    if (!structure) {
        console.warn('No structure data provided');
        return;
    }
    
    console.log('Updating structure breakdown:', structure);
    
    // Update text fields
    const textFields = {
        structureContext: structure.context,
        structureObjective: structure.objective,
        structureAudience: structure.target_audience,
        structureFormat: structure.output_format,
        structureTone: structure.tone_and_style
    };
    
    Object.entries(textFields).forEach(([elementKey, value]) => {
        const element = elements[elementKey];
        if (element && value) {
            element.textContent = value;
        }
    });
    
    // Update requirements list
    updateStructureList(elements.structureRequirements, structure.requirements);
    
    // Update examples (if available)
    if (structure.examples && structure.examples.length > 0) {
        updateStructureList(elements.structureExamples, structure.examples);
        if (elements.examplesCard) elements.examplesCard.style.display = 'block';
    } else {
        if (elements.examplesCard) elements.examplesCard.style.display = 'none';
    }
    
    // Update constraints (if available)
    if (structure.constraints && structure.constraints.length > 0) {
        updateStructureList(elements.structureConstraints, structure.constraints);
        if (elements.constraintsCard) elements.constraintsCard.style.display = 'block';
    } else {
        if (elements.constraintsCard) elements.constraintsCard.style.display = 'none';
    }
}

/**
 * Update structure list elements
 */
function updateStructureList(element, items) {
    if (!element) return;
    
    element.innerHTML = '';
    
    if (!items || !Array.isArray(items)) {
        const li = document.createElement('li');
        li.textContent = 'Not specified';
        li.style.fontStyle = 'italic';
        li.style.color = '#6b7280';
        element.appendChild(li);
        return;
    }
    
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        element.appendChild(li);
    });
}

/**
 * Copy enhanced prompt to clipboard
 */
async function copyEnhancedPrompt() {
    if (!appState.lastEnhancedData) {
        Utils.showToast('No enhanced prompt to copy', 'warning');
        return;
    }
    
    try {
        const success = await Utils.copyToClipboard(appState.lastEnhancedData.enhanced_prompt);
        if (success) {
            Utils.showToast('Enhanced prompt copied to clipboard!', 'success');
            console.log('Enhanced prompt copied successfully');
        } else {
            throw new Error('Copy operation failed');
        }
    } catch (error) {
        console.error('Failed to copy enhanced prompt:', error);
        Utils.showToast('Failed to copy to clipboard', 'error');
    }
}

/**
 * Copy structure JSON to clipboard
 */
async function copyStructureJSON() {
    if (!appState.lastEnhancedData) {
        Utils.showToast('No structure data to copy', 'warning');
        return;
    }
    
    try {
        const structureJSON = Utils.formatJSON(appState.lastEnhancedData.prompt_structure);
        const success = await Utils.copyToClipboard(structureJSON);
        
        if (success) {
            Utils.showToast('Structure JSON copied to clipboard!', 'success');
            console.log('Structure JSON copied successfully');
        } else {
            throw new Error('Copy operation failed');
        }
    } catch (error) {
        console.error('Failed to copy structure JSON:', error);
        Utils.showToast('Failed to copy to clipboard', 'error');
    }
}

/**
 * Show about modal
 */
function showAboutModal() {
    if (elements.aboutModal) {
        elements.aboutModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('About modal shown');
    }
}

/**
 * Hide about modal
 */
function hideAboutModal() {
    if (elements.aboutModal) {
        elements.aboutModal.style.display = 'none';
        document.body.style.overflow = '';
        console.log('About modal hidden');
    }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'flex';
    }
    
    Utils.setButtonLoading(elements.enhanceBtn, true, 'Enhance Prompt');
    Utils.updateStatus('Enhancing your prompt...', 'loading');
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'none';
    }
    
    Utils.setButtonLoading(elements.enhanceBtn, false, 'Enhance Prompt');
}

/**
 * Update enhancement type options
 */
function updateEnhancementTypeOptions(types) {
    if (!elements.enhancementType || !types) return;
    
    const currentValue = elements.enhancementType.value;
    elements.enhancementType.innerHTML = '';
    
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        option.title = type.description;
        if (type.id === currentValue) {
            option.selected = true;
        }
        elements.enhancementType.appendChild(option);
    });
    
    console.log('Enhancement type options updated');
}

/**
 * Update target audience options
 */
function updateTargetAudienceOptions(audiences) {
    if (!elements.targetAudience || !audiences) return;
    
    const currentValue = elements.targetAudience.value;
    elements.targetAudience.innerHTML = '';
    
    audiences.forEach(audience => {
        const option = document.createElement('option');
        option.value = audience.id;
        option.textContent = audience.name;
        if (audience.id === currentValue) {
            option.selected = true;
        }
        elements.targetAudience.appendChild(option);
    });
    
    console.log('Target audience options updated');
}

// API Event Handlers
function handleEnhanceStart(data) {
    console.log('Enhancement started:', data);
    Utils.updateStatus('Processing your prompt...', 'loading');
}

function handleEnhanceSuccess({ promptData, result }) {
    console.log('Enhancement successful:', result);
    Utils.updateStatus('Enhancement completed successfully!', 'success');
}

function handleEnhanceError({ promptData, error }) {
    console.error('Enhancement error:', error);
    Utils.updateStatus('Enhancement failed', 'error');
}

function handleConnectionOnline() {
    Utils.showToast('Connection restored! AI service is available.', 'success');
    Utils.updateStatus('Connected to AI service', 'success');
    console.log('Connection restored');
}

function handleConnectionOffline() {
    Utils.showToast('Connection lost. Please check your internet connection.', 'warning', 5000);
    Utils.updateStatus('No internet connection', 'error');
    console.log('Connection lost');
}

/**
 * Error boundary for unhandled errors
 */
window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
    Utils.updateStatus('An unexpected error occurred', 'error');
    Utils.showToast('Something went wrong. Please refresh the page if the problem persists.', 'error', 5000);
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Utils.updateStatus('An unexpected error occurred', 'error');
    Utils.showToast('An unexpected error occurred. Please try again.', 'error', 5000);
    event.preventDefault(); // Prevent the default browser error handling
});

/**
 * Page visibility change handler (for performance optimization)
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - pausing non-essential operations');
        // Could pause animations, stop polling, etc.
    } else {
        console.log('Page visible - resuming operations');
        // Could resume animations, restart polling, etc.
    }
});

/**
 * Initialize app when DOM is loaded
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded
    initializeApp();
}

/**
 * Export app functions for debugging and testing
 */
window.App = {
    state: appState,
    elements,
    initializeApp,
    handleEnhanceClick,
    displayEnhancedResults,
    copyEnhancedPrompt,
    copyStructureJSON,
    showAboutModal,
    hideAboutModal,
    updateEnhanceButtonState,
    loadTemplates,
    testAPIConnection
};