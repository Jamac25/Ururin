/* ========================================
   LOADING STATES & ERROR HANDLING
   Improved UX with loading indicators and error messages
   ======================================== */

const LoadingStates = {
    // Show loading overlay
    show(message = 'Waa la soo raraya...') {
        // Remove existing if any
        this.hide();

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner-container">
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    // Hide loading overlay
    hide() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 300);
        }
    },

    // Show inline loading spinner
    inline(element, message = '') {
        if (!element) return;

        const originalContent = element.innerHTML;
        element.dataset.originalContent = originalContent;
        element.innerHTML = `
            <span class="inline-spinner"></span>
            ${message}
        `;
        element.disabled = true;
    },

    // Restore inline element
    restore(element) {
        if (!element || !element.dataset.originalContent) return;

        element.innerHTML = element.dataset.originalContent;
        element.disabled = false;
        delete element.dataset.originalContent;
    },

    // Show skeleton loading for cards
    skeleton(container, count = 3) {
        if (!container) return;

        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-card">
                    <div class="skeleton-line wide"></div>
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line short"></div>
                </div>
            `;
        }
        container.innerHTML = html;
    }
};

const ErrorHandler = {
    // Map of error types to user-friendly messages
    messages: {
        'network': 'Internetka ma shaqeynayo. Fadlan isku day mar kale.',
        'auth': 'Fadlan soo gal adigoo isticmaalaya akoonkaaga.',
        'permission': 'Uma fasaxna qalabkan. Fadlan hubi ogolaanshaha.',
        'notfound': 'Xogta lama helin. Waxaa laga yaabaa in la tirtiray.',
        'validation': 'Fadlan hubi macluumaadka aad gelisay.',
        'server': 'Cilad ka dhacday serverka. Fadlan isku day mar kale.',
        'offline': 'Ma leh xiriir. App-ka ayaa u shaqeynaya offline mode.',
        'default': 'Cilad aan la fileyn ayaa dhacday. Fadlan isku day mar kale.'
    },

    // Handle and display error
    handle(error, context = '') {
        console.error(`[Error] ${context}:`, error);

        // Determine error type
        let type = 'default';
        const errorMessage = error?.message?.toLowerCase() || '';

        if (!navigator.onLine || errorMessage.includes('network') || errorMessage.includes('fetch')) {
            type = 'offline';
        } else if (errorMessage.includes('auth') || errorMessage.includes('login') || errorMessage.includes('permission denied')) {
            type = 'auth';
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            type = 'notfound';
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            type = 'validation';
        } else if (errorMessage.includes('500') || errorMessage.includes('server')) {
            type = 'server';
        }

        // Show user-friendly message
        const message = this.messages[type];
        Components.toast(message, 'error');

        // If auth error, redirect to login
        if (type === 'auth') {
            setTimeout(() => {
                window.location.hash = '#/login';
            }, 1500);
        }

        // Track error
        if (typeof Analytics !== 'undefined') {
            Analytics.trackEvent('Error', type, context);
        }

        return { type, message };
    },

    // Show offline banner
    showOfflineBanner() {
        if (document.getElementById('offline-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'offline-banner';
        banner.innerHTML = `
            <span>📴 Ma jirto xiriir - App-ka ayaa u shaqeynaya offline</span>
            <button onclick="ErrorHandler.hideOfflineBanner()">✕</button>
        `;

        document.body.insertBefore(banner, document.body.firstChild);
    },

    // Hide offline banner
    hideOfflineBanner() {
        const banner = document.getElementById('offline-banner');
        if (banner) banner.remove();
    },

    // Show retry option
    showRetry(message, retryCallback) {
        Components.showModal('⚠️ Cilad', `
            <p style="margin-bottom: var(--spacing-lg);">${message}</p>
            <div style="display: flex; gap: var(--spacing-md); justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="Components.closeModal()">Xir</button>
                <button class="btn btn-primary" onclick="Components.closeModal(); (${retryCallback})();">
                    🔄 Isku day mar kale
                </button>
            </div>
        `);
    }
};

// Network status listeners
window.addEventListener('online', () => {
    ErrorHandler.hideOfflineBanner();
    Components.toast('✅ Xiriirka waa la soo celiyey!', 'success');
});

window.addEventListener('offline', () => {
    ErrorHandler.showOfflineBanner();
    Components.toast('📴 Xiriirka waa la waayey', 'error');
});

// Global error handler
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    ErrorHandler.handle(event.reason, 'Unhandled Promise');
});

// Make globally available
window.LoadingStates = LoadingStates;
window.ErrorHandler = ErrorHandler;
