/* ========================================
   GLOBAL SEARCH FUNCTIONALITY
   Real-time search for campaigns and contributors
   ======================================== */

const GlobalSearch = {
    searchInput: null,
    searchResults: null,
    searchClear: null,
    debounceTimer: null,

    init() {
        this.searchInput = document.getElementById('global-search');
        this.searchResults = document.getElementById('search-results');
        this.searchClear = document.getElementById('search-clear');

        if (!this.searchInput) return;

        // Event listeners
        this.searchInput.addEventListener('input', (e) => this.handleInput(e));
        this.searchInput.addEventListener('focus', () => this.handleFocus());
        this.searchInput.addEventListener('blur', () => this.handleBlur());

        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => this.clear());
        }

        // Keyboard shortcut: / to focus search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !this.isInputFocused()) {
                e.preventDefault();
                this.searchInput.focus();
                this.searchInput.select(); // Select all text to prevent concatenation
            }
            if (e.key === 'Escape' && document.activeElement === this.searchInput) {
                this.clear();
                this.searchInput.blur();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-center') && !e.target.closest('.mobile-search-toggle')) {
                this.hideResults();
                this.hideMobileSearch();
            }
        });

        // Mobile search toggle
        const mobileToggle = document.getElementById('mobile-search-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileSearch();
            });
        }
    },

    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
    },

    handleInput(e) {
        const query = e.target.value.trim();

        // Show/hide clear button
        if (this.searchClear) {
            this.searchClear.classList.toggle('hidden', !query);
        }

        // Debounce search
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (query.length >= 2) {
                this.search(query);
            } else if (query.length === 0) {
                this.hideResults();
            }
        }, 300);
    },

    handleFocus() {
        const query = this.searchInput.value.trim();
        if (query.length >= 2) {
            this.search(query);
        }
    },

    handleBlur() {
        // Delay to allow click on results
        setTimeout(() => {
            if (!this.searchResults.matches(':hover')) {
                this.hideResults();
            }
        }, 200);
    },

    search(query) {
        const results = this.performSearch(query);
        this.renderResults(results, query);
    },

    performSearch(query) {
        const lowerQuery = query.toLowerCase();
        const results = {
            campaigns: [],
            contributors: []
        };

        // Search campaigns
        const campaigns = DB.getCampaigns();
        campaigns.forEach(campaign => {
            const nameMatch = campaign.name.toLowerCase().includes(lowerQuery);
            const descMatch = campaign.description?.toLowerCase().includes(lowerQuery);
            const codeMatch = campaign.code?.toLowerCase().includes(lowerQuery);

            if (nameMatch || descMatch || codeMatch) {
                const stats = DB.getCampaignStats(campaign.id);
                results.campaigns.push({
                    ...campaign,
                    stats
                });
            }
        });

        // Search contributors
        const contributors = DB.getContributors();
        contributors.forEach(contributor => {
            const nameMatch = contributor.name.toLowerCase().includes(lowerQuery);
            const phoneMatch = contributor.phone.includes(query);
            const amountMatch = contributor.amount.toString().includes(query);

            if (nameMatch || phoneMatch || amountMatch) {
                const campaign = DB.getCampaign(contributor.campaignId);
                results.contributors.push({
                    ...contributor,
                    campaignName: campaign?.name || 'Unknown'
                });
            }
        });

        return results;
    },

    renderResults(results, query) {
        const totalResults = results.campaigns.length + results.contributors.length;

        if (totalResults === 0) {
            this.searchResults.innerHTML = `
                <div class="search-results-empty">
                    <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">🔍</div>
                    <div>Lama helin "${query}"</div>
                    <div style="font-size: var(--font-size-xs); margin-top: var(--spacing-xs);">
                        Isku magac olole, qof, ama lambarka telefoonka
                    </div>
                </div>
            `;
            this.showResults();
            return;
        }

        let html = '';

        // Render campaigns
        if (results.campaigns.length > 0) {
            html += `
                <div class="search-results-group">
                    <div class="search-results-group-title">
                        Ololaha (${results.campaigns.length})
                    </div>
                    ${results.campaigns.map(c => this.renderCampaignResult(c)).join('')}
                </div>
            `;
        }

        // Render contributors
        if (results.contributors.length > 0) {
            html += `
                <div class="search-results-group">
                    <div class="search-results-group-title">
                        Tabarucayaal (${results.contributors.length})
                    </div>
                    ${results.contributors.map(c => this.renderContributorResult(c)).join('')}
                </div>
            `;
        }

        this.searchResults.innerHTML = html;
        this.showResults();

        // Add click handlers
        this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) {
                    window.location.hash = url;
                    this.clear();
                }
            });
        });
    },

    renderCampaignResult(campaign) {
        const settings = DB.getSettings();
        return `
            <div class="search-result-item" data-url="/campaign/${campaign.id}">
                <div class="search-result-icon">${campaign.emoji || '💰'}</div>
                <div class="search-result-content">
                    <div class="search-result-title">${Security.escapeHtml(campaign.name)}</div>
                    <div class="search-result-subtitle">
                        ${settings.currencySymbol}${campaign.stats.collected.toLocaleString()} / ${settings.currencySymbol}${campaign.goal.toLocaleString()} 
                        (${campaign.stats.percent}%)
                    </div>
                </div>
                <div class="search-result-badge ${campaign.stats.percent >= 100 ? 'paid' : 'pending'}">
                    ${campaign.stats.percent >= 100 ? '✓ Dhammaystiran' : campaign.stats.total + ' qof'}
                </div>
            </div>
        `;
    },

    renderContributorResult(contributor) {
        const settings = DB.getSettings();
        const statusClass = contributor.status === 'paid' ? 'paid' :
            contributor.status === 'declined' ? 'declined' : 'pending';
        const statusText = contributor.status === 'paid' ? 'Bixiyey' :
            contributor.status === 'declined' ? 'Diidey' : 'Sugaya';

        return `
            <div class="search-result-item" data-url="/campaign/${contributor.campaignId}">
                <div class="search-result-icon">👤</div>
                <div class="search-result-content">
                    <div class="search-result-title">${Security.escapeHtml(contributor.name)}</div>
                    <div class="search-result-subtitle">
                        ${Security.escapeHtml(contributor.campaignName)} • ${settings.currencySymbol}${contributor.amount.toLocaleString()}
                    </div>
                </div>
                <div class="search-result-badge ${statusClass}">
                    ${statusText}
                </div>
            </div>
        `;
    },

    showResults() {
        this.searchResults.classList.remove('hidden');
    },

    hideResults() {
        this.searchResults.classList.add('hidden');
    },

    clear() {
        this.searchInput.value = '';
        if (this.searchClear) {
            this.searchClear.classList.add('hidden');
        }
        this.hideResults();
    },

    toggleMobileSearch() {
        const headerCenter = document.querySelector('.header-center');
        const mobileToggle = document.getElementById('mobile-search-toggle');

        if (headerCenter.classList.contains('active')) {
            this.hideMobileSearch();
        } else {
            this.showMobileSearch();
        }
    },

    showMobileSearch() {
        const headerCenter = document.querySelector('.header-center');
        const mobileToggle = document.getElementById('mobile-search-toggle');

        headerCenter.classList.add('active');
        if (mobileToggle) {
            mobileToggle.classList.add('active');
        }
        this.searchInput.focus();
    },

    hideMobileSearch() {
        const headerCenter = document.querySelector('.header-center');
        const mobileToggle = document.getElementById('mobile-search-toggle');

        headerCenter.classList.remove('active');
        if (mobileToggle) {
            mobileToggle.classList.remove('active');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    GlobalSearch.init();
});
