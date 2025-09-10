// utils.js
// Utility functions for the Prompt-to-JSON Enhancer application

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Count words in a text string
 * @param {string} text - Text to count words in
 * @returns {number} Word count
 */
function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Validate prompt input
 * @param {string} prompt - Prompt text to validate
 * @returns {Object} Validation result with isValid and message
 */
function validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
        return { isValid: false, message: 'Prompt is required' };
    }
    
    const trimmedPrompt = prompt.trim();
    
    if (trimmedPrompt.length < 3) {
        return { isValid: false, message: 'Prompt must be at least 3 characters long' };
    }
    
    if (trimmedPrompt.length > 5000) {
        return { isValid: false, message: 'Prompt must be less than 5000 characters' };
    }
    
    const wordCount = countWords(trimmedPrompt);
    if (wordCount < 1) {  // Changed from 2 to 1 word minimum
        return { isValid: false, message: 'Prompt must contain at least 1 word' };
    }
    
    return { isValid: true, message: '' };
}

/**
 * Copy text to clipboard with fallback for older browsers
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Promise that resolves to true if successful
 */
async function copyToClipboard(text) {
    try {
        // Modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        return successful;
    } catch (error) {
        console.error('Failed to copy text to clipboard:', error);
        return false;
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, info)
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove toast
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }
    }, duration);
}

/**
 * Get appropriate icon for toast type
 * @param {string} type - Toast type
 * @returns {string} Icon emoji
 */
function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    return icons[type] || icons.info;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format JSON with proper indentation and syntax highlighting
 * @param {Object} obj - Object to format as JSON
 * @returns {string} Formatted JSON string
 */
function formatJSON(obj) {
    return JSON.stringify(obj, null, 2);
}

/**
 * Update element text with animation
 * @param {HTMLElement} element - Element to update
 * @param {string} newText - New text content
 * @param {number} duration - Animation duration in milliseconds
 */
function updateTextWithAnimation(element, newText, duration = 300) {
    if (!element) return;
    
    element.style.transition = `opacity ${duration / 2}ms ease-out`;
    element.style.opacity = '0';
    
    setTimeout(() => {
        element.textContent = newText;
        element.style.opacity = '1';
    }, duration / 2);
}

/**
 * Animate number count up
 * @param {HTMLElement} element - Element containing the number
 * @param {number} start - Starting number
 * @param {number} end - Ending number
 * @param {number} duration - Animation duration in milliseconds
 * @param {string} suffix - Suffix to add (e.g., '%', 'words')
 */
function animateNumber(element, start, end, duration = 1000, suffix = '') {
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
    }, 16);
}

/**
 * Smooth scroll to element
 * @param {HTMLElement} element - Element to scroll to
 * @param {number} offset - Offset from top in pixels
 */
function scrollToElement(element, offset = 0) {
    if (!element) return;
    
    const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
    const targetTop = elementTop - offset;
    
    window.scrollTo({
        top: targetTop,
        behavior: 'smooth'
    });
}

/**
 * Show loading state for button
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Loading state
 * @param {string} originalText - Original button text
 * @param {string} loadingText - Loading text (optional)
 */
function setButtonLoading(button, loading, originalText, loadingText = '') {
    if (!button) return;
    
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
        if (loadingText) {
            const textElement = button.querySelector('.btn-text');
            if (textElement) textElement.textContent = loadingText;
        }
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        const textElement = button.querySelector('.btn-text');
        if (textElement) textElement.textContent = originalText;
    }
}

/**
 * Update status bar
 * @param {string} message - Status message
 * @param {string} type - Status type (success, error, info, loading)
 */
function updateStatus(message, type = 'info') {
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    
    if (!statusBar || !statusText || !statusIcon) return;
    
    // Update text
    statusText.textContent = message;
    
    // Update icon and styling
    const statusConfig = {
        success: { icon: '✓', bgColor: '#10b981' },
        error: { icon: '✗', bgColor: '#ef4444' },
        info: { icon: 'ℹ', bgColor: '#6366f1' },
        loading: { icon: '⟳', bgColor: '#f59e0b' }
    };
    
    const config = statusConfig[type] || statusConfig.info;
    statusIcon.textContent = config.icon;
    statusBar.style.backgroundColor = config.bgColor;
    
    // Add animation class
    statusBar.classList.add('status-updated');
    setTimeout(() => {
        statusBar.classList.remove('status-updated');
    }, 300);
}

/**
 * Generate unique ID
 * @returns {string} Unique ID string
 */
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Check if device is mobile
 * @returns {boolean} True if mobile device
 */
function isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get relative time string (e.g., "2 minutes ago")
 * @param {Date} date - Date to get relative time for
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

/**
 * Sanitize filename for download
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
}

/**
 * Create and trigger file download
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Export utility functions for use in other modules
window.Utils = {
    debounce,
    countWords,
    validatePrompt,
    copyToClipboard,
    showToast,
    escapeHtml,
    formatJSON,
    updateTextWithAnimation,
    animateNumber,
    scrollToElement,
    setButtonLoading,
    updateStatus,
    generateId,
    isMobile,
    formatFileSize,
    getRelativeTime,
    sanitizeFilename,
    downloadFile
};