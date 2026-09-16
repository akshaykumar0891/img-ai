// Global state management
const AppState = {
    currentTheme: localStorage.getItem('theme') || 'dark',
    isGenerating: false,
    currentImage: null,
    history: [],
    batchPrompts: 2
};

// DOM elements
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    promptInput: document.getElementById('promptInput'),
    styleSelect: document.getElementById('styleSelect'),
    resolutionSelect: document.getElementById('resolutionSelect'),
    generateBtn: document.getElementById('generateBtn'),
    batchBtn: document.getElementById('batchBtn'),
    historyBtn: document.getElementById('historyBtn'),
    loadingState: document.getElementById('loadingState'),
    emptyState: document.getElementById('emptyState'),
    errorState: document.getElementById('errorState'),
    successState: document.getElementById('successState'),
    resultImage: document.getElementById('resultImage'),
    errorMessage: document.getElementById('errorMessage'),
    downloadBtn: document.getElementById('downloadBtn'),
    zoomBtn: document.getElementById('zoomBtn'),
    previewControls: document.getElementById('previewControls'),
    historySection: document.getElementById('historySection'),
    historyGrid: document.getElementById('historyGrid'),
    historyLoading: document.getElementById('historyLoading'),
    historyEmpty: document.getElementById('historyEmpty')
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeEventListeners();
    initializeTemplates();
    
});

// Theme management
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', AppState.currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    AppState.currentTheme = AppState.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', AppState.currentTheme);
    localStorage.setItem('theme', AppState.currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    elements.themeIcon.className = AppState.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Event listeners
function initializeEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Main generation
    elements.generateBtn.addEventListener('click', handleGenerate);
    
    // Batch generation
    elements.batchBtn.addEventListener('click', showBatchModal);
    document.getElementById('startBatchBtn').addEventListener('click', handleBatchGenerate);
    document.getElementById('addPromptBtn').addEventListener('click', addBatchPrompt);
    document.getElementById('removePromptBtn').addEventListener('click', removeBatchPrompt);
    
    // History
    elements.historyBtn.addEventListener('click', toggleHistory);
    
    // Preview controls
    elements.downloadBtn.addEventListener('click', downloadImage);
    elements.zoomBtn.addEventListener('click', showZoomModal);
    
    // Enter key support
    elements.promptInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleGenerate();
        }
    });
    
    // Format selection
    document.querySelectorAll('input[name="formatSelect"]').forEach(radio => {
        radio.addEventListener('change', updateFormatSelection);
    });
}

// Template initialization
function initializeTemplates() {
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const template = this.dataset.template;
            elements.promptInput.value = template;
            elements.promptInput.focus();
            
            // Add visual feedback
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// Main generation function
async function handleGenerate() {
    const prompt = elements.promptInput.value.trim();
    
    if (!prompt) {
        showNotification('Please enter a prompt to generate an image', 'warning');
        elements.promptInput.focus();
        return;
    }
    
    if (prompt.length < 3) {
        showNotification('Prompt must be at least 3 characters long', 'warning');
        return;
    }
    
    if (AppState.isGenerating) {
        showNotification('Generation already in progress', 'info');
        return;
    }
    
    AppState.isGenerating = true;
    showLoadingState();
    
    const requestData = {
        prompt: prompt,
        style: elements.styleSelect.value,
        resolution: elements.resolutionSelect.value,
        format: getSelectedFormat()
    };
    
    try {
        const response = await fetch('https://backend.buildpicoapps.com/aero/run/image-generation-api?pk=v1-AIzaSyAOJHXSjGL7fOfxtd30V33gY4LQSoQr8IM==', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessState(data);
            AppState.currentImage = data;
            showNotification('Image generated successfully!', 'success');
             // Refresh history
        } else {
            showErrorState(data.message || 'Failed to generate image');
            showNotification(data.message || 'Generation failed', 'error');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showErrorState('Network error. Please check your connection and try again.');
        showNotification('Network error occurred', 'error');
    } finally {
        AppState.isGenerating = false;
    }
}

// State management functions
function showLoadingState() {
    hideAllStates();
    elements.loadingState.style.display = 'block';
    elements.generateBtn.disabled = true;
    elements.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
    
    // Animate progress bar
    const progressBar = elements.loadingState.querySelector('.progress-bar');
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
        
        if (!AppState.isGenerating) {
            clearInterval(interval);
            progressBar.style.width = '100%';
        }
    }, 500);
}

function showSuccessState(data) {
    hideAllStates();
    elements.successState.style.display = 'block';
    elements.resultImage.src = data.imageUrl;
    elements.resultImage.alt = `Generated image: ${data.prompt}`;
    
    // Update image info
    document.getElementById('imagePrompt').textContent = data.prompt;
    document.getElementById('imageStyle').textContent = data.style;
    document.getElementById('imageResolution').textContent = data.resolution;
    
    // Show preview controls
    elements.previewControls.style.display = 'block';
    
    // Reset generate button
    resetGenerateButton();
}

function showErrorState(message) {
    hideAllStates();
    elements.errorState.style.display = 'block';
    elements.errorMessage.textContent = message;
    elements.previewControls.style.display = 'none';
    resetGenerateButton();
}

function hideAllStates() {
    elements.loadingState.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.successState.style.display = 'none';
}

function resetPreview() {
    hideAllStates();
    elements.emptyState.style.display = 'block';
    elements.previewControls.style.display = 'none';
    AppState.currentImage = null;
}

function resetGenerateButton() {
    elements.generateBtn.disabled = false;
    elements.generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Image';
}

// Utility functions
function getSelectedFormat() {
    return document.querySelector('input[name="formatSelect"]:checked').value;
}

function updateFormatSelection() {
    // Visual feedback for format selection
    document.querySelectorAll('label[for^="format"]').forEach(label => {
        label.classList.remove('active');
    });
    
    const selected = document.querySelector('input[name="formatSelect"]:checked');
    if (selected) {
        document.querySelector(`label[for="${selected.id}"]`).classList.add('active');
    }
}

// Download functionality
function downloadImage() {
    if (!AppState.currentImage || !AppState.currentImage.imageUrl) {
        showNotification('No image to download', 'warning');
        return;
    }
    
    const link = document.createElement('a');
    link.href = AppState.currentImage.imageUrl;
    link.download = `generated-image-${Date.now()}.${AppState.currentImage.format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Image download started', 'success');
}

// Zoom functionality
function showZoomModal() {
    if (!AppState.currentImage || !AppState.currentImage.imageUrl) {
        return;
    }
    
    document.getElementById('zoomImage').src = AppState.currentImage.imageUrl;
    const zoomModal = new bootstrap.Modal(document.getElementById('zoomModal'));
    zoomModal.show();
}

// History management
async function loadHistory() {
    try {
        elements.historyLoading.style.display = 'block';
        elements.historyEmpty.style.display = 'none';
        
        const response = await Promise.resolve({ json: () => ({ status: 'success', images: [] }) });
        const data = await response.json();
        
        if (data.status === 'success') {
            AppState.history = data.images;
            renderHistory(data.images);
        } else {
            console.error('Failed to load history:', data.message);
        }
    } catch (error) {
        console.error('History loading error:', error);
    } finally {
        elements.historyLoading.style.display = 'none';
    }
}

function renderHistory(images) {
    elements.historyGrid.innerHTML = '';
    
    if (images.length === 0) {
        elements.historyEmpty.style.display = 'block';
        return;
    }
    
    images.forEach(image => {
        const historyItem = createHistoryItem(image);
        elements.historyGrid.appendChild(historyItem);
    });
}

function createHistoryItem(image) {
    const col = document.createElement('div');
    col.className = 'col-md-3 col-sm-6 mb-3';
    
    const status = image.status || 'unknown';
    const statusClass = `status-${status}`;
    
    col.innerHTML = `
        <div class="history-item" onclick="loadHistoryImage(${image.id})">
            ${image.image_url ? 
                `<img src="${image.image_url}" alt="${image.prompt}" class="history-image">` :
                `<div class="history-image d-flex align-items-center justify-content-center bg-secondary">
                    <i class="fas fa-image fa-2x text-white"></i>
                </div>`
            }
            <div class="history-prompt">${image.prompt}</div>
            <div class="history-meta">
                <span class="status-badge ${statusClass}">${status}</span>
                <small>${formatDate(image.created_at)}</small>
            </div>
        </div>
    `;
    
    return col;
}

function loadHistoryImage(imageId) {
    const image = AppState.history.find(img => img.id === imageId);
    if (image && image.image_url) {
        AppState.currentImage = {
            imageUrl: image.image_url,
            prompt: image.prompt,
            style: image.style,
            resolution: image.resolution,
            format: image.format
        };
        
        showSuccessState(AppState.currentImage);
        
        // Update form with image settings
        elements.promptInput.value = image.prompt;
        elements.styleSelect.value = image.style;
        elements.resolutionSelect.value = image.resolution;
        
        // Set format radio button
        const formatRadio = document.querySelector(`input[value="${image.format}"]`);
        if (formatRadio) {
            formatRadio.checked = true;
            updateFormatSelection();
        }
        
        showNotification('Image loaded from history', 'info');
    }
}

function toggleHistory() {
    const isVisible = elements.historySection.style.display !== 'none';
    elements.historySection.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        
        elements.historySection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Batch generation
function showBatchModal() {
    const batchModal = new bootstrap.Modal(document.getElementById('batchModal'));
    batchModal.show();
}

function addBatchPrompt() {
    if (AppState.batchPrompts >= 5) {
        showNotification('Maximum 5 prompts allowed', 'warning');
        return;
    }
    
    AppState.batchPrompts++;
    const promptDiv = document.createElement('div');
    promptDiv.className = 'mb-3';
    promptDiv.innerHTML = `
        <textarea class="form-control batch-prompt" rows="2" placeholder="Prompt ${AppState.batchPrompts}..."></textarea>
    `;
    
    document.getElementById('batchPrompts').appendChild(promptDiv);
}

function removeBatchPrompt() {
    if (AppState.batchPrompts <= 1) {
        showNotification('At least one prompt is required', 'warning');
        return;
    }
    
    const batchPrompts = document.getElementById('batchPrompts');
    const lastPrompt = batchPrompts.lastElementChild;
    if (lastPrompt) {
        lastPrompt.remove();
        AppState.batchPrompts--;
    }
}

async function handleBatchGenerate() {
    const prompts = Array.from(document.querySelectorAll('.batch-prompt'))
        .map(textarea => textarea.value.trim())
        .filter(prompt => prompt.length >= 3);
    
    if (prompts.length === 0) {
        showNotification('Please enter at least one valid prompt', 'warning');
        return;
    }
    
    const requestData = {
        prompts: prompts,
        style: elements.styleSelect.value,
        resolution: elements.resolutionSelect.value,
        format: getSelectedFormat()
    };
    
    try {
        const response = await fetch('/batch_generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification(`Batch generation started for ${data.results.length} images`, 'success');
            
            // Close modal
            const batchModal = bootstrap.Modal.getInstance(document.getElementById('batchModal'));
            batchModal.hide();
            
            // Refresh history after a delay
            setTimeout(() => {
                
            }, 2000);
        } else {
            showNotification(data.message || 'Batch generation failed', 'error');
        }
    } catch (error) {
        console.error('Batch generation error:', error);
        showNotification('Network error during batch generation', 'error');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 80px;
        right: 20px;
        z-index: 1050;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${iconMap[type]} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!AppState.isGenerating) {
            handleGenerate();
        }
    }
    
    // Escape to close modals/panels
    if (e.key === 'Escape') {
        if (elements.historySection.style.display === 'block') {
            toggleHistory();
        }
    }
});

// Error handling for images
document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        e.target.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.className = 'bg-secondary d-flex align-items-center justify-content-center';
        placeholder.style.cssText = e.target.style.cssText;
        placeholder.innerHTML = '<i class="fas fa-image fa-2x text-white"></i>';
        e.target.parentNode.insertBefore(placeholder, e.target);
    }
}, true);

// Performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Smooth scroll behavior
function smoothScrollTo(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

// Initialize tooltips (if Bootstrap tooltips are needed)
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
