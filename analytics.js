/* ========================================
   ANALYTICS & ERROR TRACKING
   Google Analytics + Error Logging
   ======================================== */

const Analytics = {
    // Google Analytics ID (replace with your own)
    GA_ID: 'G-XXXXXXXXXX', // TODO: Replace with actual GA4 ID

    // Initialize Google Analytics
    init() {
        if (typeof gtag === 'undefined') {
            console.warn('Google Analytics not loaded');
            return;
        }

        // Configure GA
        gtag('config', this.GA_ID, {
            page_path: window.location.hash || '/',
            send_page_view: false // We'll send manually
        });

        // Track initial page view
        this.trackPageView();

        // Listen for route changes
        window.addEventListener('hashchange', () => {
            this.trackPageView();
        });
    },

    // Track page views
    trackPageView(path = null) {
        if (typeof gtag === 'undefined') return;

        const page = path || window.location.hash || '/';
        gtag('event', 'page_view', {
            page_path: page,
            page_title: document.title
        });
    },

    // Track events
    trackEvent(category, action, label = null, value = null) {
        if (typeof gtag === 'undefined') return;

        gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value
        });
    },

    // Predefined event trackers
    events: {
        // Campaign events
        campaignCreated: (campaignId) => {
            Analytics.trackEvent('Campaign', 'create', campaignId);
        },
        campaignEdited: (campaignId) => {
            Analytics.trackEvent('Campaign', 'edit', campaignId);
        },
        campaignDeleted: (campaignId) => {
            Analytics.trackEvent('Campaign', 'delete', campaignId);
        },

        // Contributor events
        contributorAdded: (campaignId) => {
            Analytics.trackEvent('Contributor', 'add', campaignId);
        },
        contributorStatusChanged: (status) => {
            Analytics.trackEvent('Contributor', 'status_change', status);
        },

        // WhatsApp events
        whatsappMessageSent: (type) => {
            Analytics.trackEvent('WhatsApp', 'message_sent', type);
        },
        listCopied: (campaignId) => {
            Analytics.trackEvent('WhatsApp', 'list_copied', campaignId);
        },
        groupUpdateCopied: (campaignId) => {
            Analytics.trackEvent('WhatsApp', 'group_update_copied', campaignId);
        },

        // Export events
        excelExported: () => {
            Analytics.trackEvent('Export', 'excel', 'all_campaigns');
        },
        jsonExported: () => {
            Analytics.trackEvent('Export', 'json', 'backup');
        },

        // Auth events
        userRegistered: () => {
            Analytics.trackEvent('Auth', 'register');
        },
        userLoggedIn: () => {
            Analytics.trackEvent('Auth', 'login');
        },
        userLoggedOut: () => {
            Analytics.trackEvent('Auth', 'logout');
        },

        // Cloud sync events
        dataM igratedToCloud: (itemCount) => {
            Analytics.trackEvent('Cloud', 'migrate', 'success', itemCount);
        },
        dataSyncFailed: (error) => {
            Analytics.trackEvent('Cloud', 'sync_failed', error);
        },

        // Chart interactions
        chartClicked: (chartType) => {
            Analytics.trackEvent('Stats', 'chart_click', chartType);
        }
    }
};

// ========================================
// ERROR TRACKING
// ========================================

const ErrorTracker = {
    errors: [],
    maxErrors: 100,

    // Initialize error tracking
    init() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'unhandled_rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Load stored errors
        this.loadErrors();
    },

    // Log an error
    logError(error) {
        // Add to memory
        this.errors.unshift(error);
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }

        // Save to localStorage
        this.saveErrors();

        // Log to console in development
        if (window.location.hostname === 'localhost') {
            console.error('Error tracked:', error);
        }

        // Track in analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.trackEvent('Error', error.type, error.message);
        }

        // TODO: Send to external service (Sentry, LogRocket, etc.)
        // this.sendToExternalService(error);
    },

    // Save errors to localStorage
    saveErrors() {
        try {
            localStorage.setItem('app_errors', JSON.stringify(this.errors));
        } catch (e) {
            console.error('Failed to save errors:', e);
        }
    },

    // Load errors from localStorage
    loadErrors() {
        try {
            const stored = localStorage.getItem('app_errors');
            if (stored) {
                this.errors = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load errors:', e);
        }
    },

    // Get all errors
    getErrors() {
        return this.errors;
    },

    // Clear errors
    clearErrors() {
        this.errors = [];
        localStorage.removeItem('app_errors');
    },

    // Get error summary
    getSummary() {
        const types = {};
        this.errors.forEach(err => {
            types[err.type] = (types[err.type] || 0) + 1;
        });
        return {
            total: this.errors.length,
            byType: types,
            recent: this.errors.slice(0, 5)
        };
    },

    // Export errors for debugging
    exportErrors() {
        const data = JSON.stringify(this.errors, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `errors_${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
};

// ========================================
// USER FEEDBACK
// ========================================

const Feedback = {
    // Show feedback form
    show() {
        const modal = Components.modal({
            title: '📝 Anna Palautetta / Give Feedback',
            content: `
                <form id="feedback-form">
                    <div class="form-group">
                        <label>Tyyppi / Type</label>
                        <select name="type" required class="form-control">
                            <option value="bug">🐛 Virhe / Bug</option>
                            <option value="feature">💡 Ehdotus / Feature Request</option>
                            <option value="question">❓ Kysymys / Question</option>
                            <option value="other">📋 Muu / Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Viesti / Message</label>
                        <textarea name="message" required class="form-control" rows="5" 
                            placeholder="Kerro meille mitä ajattelet..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Sähköposti (valinnainen) / Email (optional)</label>
                        <input type="email" name="email" class="form-control" 
                            placeholder="your@email.com">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        📤 Lähetä / Send
                    </button>
                </form>
            `
        });

        document.getElementById('feedback-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = new FormData(e.target);
            this.submit({
                type: data.get('type'),
                message: data.get('message'),
                email: data.get('email'),
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
            Components.closeModal();
        });
    },

    // Submit feedback
    submit(feedback) {
        // Save locally
        const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
        feedbacks.unshift(feedback);
        localStorage.setItem('feedbacks', JSON.stringify(feedbacks.slice(0, 50)));

        // Track in analytics
        Analytics.trackEvent('Feedback', feedback.type, feedback.message.substring(0, 100));

        // TODO: Send to backend/email service
        // this.sendToBackend(feedback);

        Components.toast('Kiitos palautteesta! / Thank you for your feedback! 🙏', 'success');
    },

    // Get all feedback
    getAll() {
        return JSON.parse(localStorage.getItem('feedbacks') || '[]');
    }
};

// ========================================
// INITIALIZE ON PAGE LOAD
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize analytics
    if (typeof gtag !== 'undefined') {
        Analytics.init();
    }

    // Initialize error tracking
    ErrorTracker.init();

    // Add feedback button to settings page (optional)
    // You can add this manually in the settings view
});
