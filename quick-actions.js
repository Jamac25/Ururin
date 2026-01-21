/* ========================================
   QUICK ACTIONS
   Reduce clicks by adding action buttons to cards
   ======================================== */

const QuickActions = {
    init() {
        // Initialize quick actions on page load
        this.attachToCards();

        // Re-attach when view changes
        window.addEventListener('hashchange', () => {
            setTimeout(() => this.attachToCards(), 100);
        });
    },

    attachToCards() {
        // Add quick actions to campaign cards
        const campaignCards = document.querySelectorAll('[data-campaign-id]');
        campaignCards.forEach(card => {
            if (!card.querySelector('.quick-actions')) {
                this.addCampaignActions(card);
            }
        });

        // Add quick actions to contributor cards
        const contributorCards = document.querySelectorAll('[data-contributor-id]');
        contributorCards.forEach(card => {
            if (!card.querySelector('.quick-actions')) {
                this.addContributorActions(card);
            }
        });
    },

    addCampaignActions(card) {
        const campaignId = card.dataset.campaignId;
        if (!campaignId) return;

        const actionsHtml = `
            <div class="quick-actions">
                <button class="quick-action-btn" data-action="add-contributor" data-campaign-id="${campaignId}" title="Ku dar qof">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                </button>
                <button class="quick-action-btn" data-action="copy-list" data-campaign-id="${campaignId}" title="Koobiyee liiska">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <button class="quick-action-btn" data-action="share-whatsapp" data-campaign-id="${campaignId}" title="Wadaag WhatsApp">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </button>
            </div>
        `;

        card.insertAdjacentHTML('beforeend', actionsHtml);
        this.attachActionHandlers(card);
    },

    addContributorActions(card) {
        const contributorId = card.dataset.contributorId;
        const status = card.dataset.status;
        if (!contributorId) return;

        const actionsHtml = `
            <div class="quick-actions">
                <button class="quick-action-btn ${status === 'paid' ? 'active' : ''}" 
                        data-action="mark-paid" 
                        data-contributor-id="${contributorId}" 
                        title="Calaamadee bixiyey">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
                <button class="quick-action-btn ${status === 'pending' ? 'active' : ''}" 
                        data-action="mark-pending" 
                        data-contributor-id="${contributorId}" 
                        title="Calaamadee sugaya">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </button>
                <button class="quick-action-btn" 
                        data-action="send-reminder" 
                        data-contributor-id="${contributorId}" 
                        title="U dir xasuusin">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </button>
            </div>
        `;

        card.insertAdjacentHTML('beforeend', actionsHtml);
        this.attachActionHandlers(card);
    },

    attachActionHandlers(card) {
        const buttons = card.querySelectorAll('.quick-action-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction(btn);
            });
        });
    },

    handleAction(btn) {
        const action = btn.dataset.action;
        const campaignId = btn.dataset.campaignId;
        const contributorId = btn.dataset.contributorId;

        switch (action) {
            case 'add-contributor':
                window.location.hash = `/campaign/${campaignId}/add-contributor`;
                break;

            case 'copy-list':
                this.copyList(campaignId);
                break;

            case 'share-whatsapp':
                this.shareWhatsApp(campaignId);
                break;

            case 'mark-paid':
                this.markStatus(contributorId, 'paid');
                break;

            case 'mark-pending':
                this.markStatus(contributorId, 'pending');
                break;

            case 'send-reminder':
                this.sendReminder(contributorId);
                break;
        }
    },

    copyList(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) return;

        const list = DB.generateWhatsAppList(campaignId);
        navigator.clipboard.writeText(list).then(() => {
            Components.toast('✅ Liiska waa la koobiyeeyay!', 'success');
            if (typeof Analytics !== 'undefined') {
                Analytics.events.listCopied(campaignId);
            }
        });
    },

    shareWhatsApp(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) return;

        const message = DB.generateGroupUpdate(campaignId);
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        if (typeof Analytics !== 'undefined') {
            Analytics.events.whatsappMessageSent('group_update');
        }
    },

    markStatus(contributorId, status) {
        const contributor = DB.getContributor(contributorId);
        if (!contributor) return;

        contributor.status = status;
        contributor.updatedAt = new Date().toISOString();
        DB.saveContributor(contributor);

        Components.toast(
            status === 'paid' ? '✅ Waa la calaamadeeyay bixiyey' : '⏳ Waa la calaamadeeyay sugaya',
            'success'
        );

        // Refresh the view
        if (typeof App !== 'undefined' && App.router) {
            App.router.loadRoute(window.location.hash);
        }

        if (typeof Analytics !== 'undefined') {
            Analytics.events.contributorStatusChanged(status);
        }
    },

    sendReminder(contributorId) {
        const contributor = DB.getContributor(contributorId);
        if (!contributor) return;

        const campaign = DB.getCampaign(contributor.campaignId);
        if (!campaign) return;

        const message = DB.generateIndividualMessage(campaign, contributor);
        const phone = contributor.phone.replace(/\D/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        window.open(url, '_blank');
        Components.toast('📱 WhatsApp waa la furay!', 'success');

        if (typeof Analytics !== 'undefined') {
            Analytics.events.whatsappMessageSent('reminder');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    QuickActions.init();
});
