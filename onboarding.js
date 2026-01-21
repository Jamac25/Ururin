/* ========================================
   ONBOARDING SYSTEM
   Simple welcome tour for new users
   ======================================== */

const Onboarding = {
    currentStep: 0,
    steps: [
        {
            target: '.nav-add',
            title: 'Samee Olole Cusub',
            message: 'Riix halkan si aad u abuurto ololaha koowaad',
            position: 'top'
        },
        {
            target: '[data-campaign-id]',
            title: 'Maamulka Ololaha',
            message: 'Riix ololaha si aad u aragto faahfaahinta iyo inaad ku darto dadka',
            position: 'bottom'
        },
        {
            target: '.quick-action-btn[data-action="copy-list"]',
            title: 'Wadaag WhatsApp',
            message: 'Isticmaal quick actions si aad ugu dhaqso badan u wadaagto liiska',
            position: 'top'
        }
    ],

    init() {
        // Check if user has completed onboarding
        const completed = localStorage.getItem('onboarding_completed');
        if (completed === 'true') {
            return;
        }

        // Show welcome modal on first visit
        setTimeout(() => {
            this.showWelcomeModal();
        }, 1000);
    },

    showWelcomeModal() {
        const modal = Components.modal({
            title: '👋 Ku Soo Dhawoow Ololeeye!',
            content: `
                <div style="text-align: center; padding: var(--spacing-xl);">
                    <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">💰</div>
                    <h2 style="margin-bottom: var(--spacing-md); color: var(--text-primary);">
                        Maamulka Lacag-ururinta Si Fudud
                    </h2>
                    <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl); line-height: 1.6;">
                        Ololeeye waa nidaam fudud oo ku caawina inaad maamusho ololalaha lacag-ururinta 
                        adiga oo isticmaalaya WhatsApp.
                    </p>
                    
                    <div style="background: var(--bg-secondary); padding: var(--spacing-lg); border-radius: var(--radius-lg); margin-bottom: var(--spacing-xl); text-align: left;">
                        <h3 style="margin-bottom: var(--spacing-md); color: var(--text-primary);">✨ Waxa aad samayn karto:</h3>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            <li style="padding: var(--spacing-sm) 0; color: var(--text-secondary);">
                                ✓ Samee ololal lacag-ururin ah
                            </li>
                            <li style="padding: var(--spacing-sm) 0; color: var(--text-secondary);">
                                ✓ Ku dar dadka tabarucaya
                            </li>
                            <li style="padding: var(--spacing-sm) 0; color: var(--text-secondary);">
                                ✓ Wadaag liiska WhatsApp-ka
                            </li>
                            <li style="padding: var(--spacing-sm) 0; color: var(--text-secondary);">
                                ✓ La socdo lacagta la ururiyay
                            </li>
                        </ul>
                    </div>

                    <div style="display: flex; gap: var(--spacing-md); justify-content: center;">
                        <button onclick="Onboarding.skipTour()" class="btn btn-secondary">
                            Dhaaf
                        </button>
                        <button onclick="Onboarding.startTour()" class="btn btn-primary">
                            🚀 Bilow Tour-ka (30 ilbiriqsi)
                        </button>
                    </div>
                </div>
            `,
            showFooter: false
        });
    },

    startTour() {
        Components.closeModal();
        this.currentStep = 0;

        // Navigate to home if not there
        if (window.location.hash !== '#/') {
            window.location.hash = '#/';
        }

        setTimeout(() => {
            this.showStep(0);
        }, 500);
    },

    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.completeTour();
            return;
        }

        const step = this.steps[stepIndex];
        const target = document.querySelector(step.target);

        if (!target) {
            // Skip to next step if target not found
            this.showStep(stepIndex + 1);
            return;
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-spotlight"></div>
            <div class="onboarding-tooltip onboarding-tooltip-${step.position}">
                <div class="onboarding-tooltip-header">
                    <span class="onboarding-step-counter">Tallaabo ${stepIndex + 1}/${this.steps.length}</span>
                    <button class="onboarding-close" onclick="Onboarding.skipTour()">✕</button>
                </div>
                <h3 class="onboarding-tooltip-title">${step.title}</h3>
                <p class="onboarding-tooltip-message">${step.message}</p>
                <div class="onboarding-tooltip-footer">
                    ${stepIndex > 0 ? '<button onclick="Onboarding.previousStep()" class="btn btn-secondary btn-sm">← Dib</button>' : '<div></div>'}
                    <button onclick="Onboarding.nextStep()" class="btn btn-primary btn-sm">
                        ${stepIndex < this.steps.length - 1 ? 'Xiga →' : 'Dhammaystir ✓'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Position spotlight and tooltip
        setTimeout(() => {
            this.positionElements(target, step.position);
        }, 50);

        this.currentStep = stepIndex;
    },

    positionElements(target, position) {
        const rect = target.getBoundingClientRect();
        const spotlight = document.querySelector('.onboarding-spotlight');
        const tooltip = document.querySelector('.onboarding-tooltip');

        if (!spotlight || !tooltip) return;

        // Position spotlight
        spotlight.style.top = `${rect.top - 8}px`;
        spotlight.style.left = `${rect.left - 8}px`;
        spotlight.style.width = `${rect.width + 16}px`;
        spotlight.style.height = `${rect.height + 16}px`;

        // Position tooltip
        const tooltipRect = tooltip.getBoundingClientRect();

        if (position === 'top') {
            tooltip.style.top = `${rect.top - tooltipRect.height - 20}px`;
            tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
        } else if (position === 'bottom') {
            tooltip.style.top = `${rect.bottom + 20}px`;
            tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
        }

        // Ensure tooltip is within viewport
        const tooltipLeft = parseFloat(tooltip.style.left);
        if (tooltipLeft < 10) {
            tooltip.style.left = '10px';
        } else if (tooltipLeft + tooltipRect.width > window.innerWidth - 10) {
            tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
        }
    },

    nextStep() {
        this.removeOverlay();
        this.showStep(this.currentStep + 1);
    },

    previousStep() {
        this.removeOverlay();
        this.showStep(this.currentStep - 1);
    },

    skipTour() {
        this.removeOverlay();
        Components.closeModal();
        this.markCompleted();
    },

    completeTour() {
        this.removeOverlay();
        this.markCompleted();

        Components.toast('🎉 Mahadsanid! Waxaad dhammaystirtay tour-ka!', 'success');

        // Ask for notification permission
        setTimeout(() => {
            if (typeof Notifications !== 'undefined') {
                Notifications.requestPermission();
            }
        }, 1000);
    },

    removeOverlay() {
        const overlay = document.querySelector('.onboarding-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    markCompleted() {
        localStorage.setItem('onboarding_completed', 'true');
    },

    reset() {
        localStorage.removeItem('onboarding_completed');
        Components.toast('Onboarding waa la reset gareeyay', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to load
    setTimeout(() => {
        Onboarding.init();
    }, 2000);
});
