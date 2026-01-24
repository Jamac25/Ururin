/* ========================================
   OLOLEEYE - Main Application
   Router, Views, Event Handlers
   ======================================== */

// ========================================
// Browser Notifications Utility
// ========================================

const Notifications = {
    permission: 'default',
    enabled: false,
    lastCheck: null,

    async init() {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('Browser does not support notifications');
            return false;
        }

        // Check current permission
        this.permission = Notification.permission;
        this.enabled = this.permission === 'granted';

        // Load user preference
        const settings = DB.getSettings();
        if (settings.notificationsEnabled === false) {
            this.enabled = false;
        }

        // Start daily check if enabled
        if (this.enabled) {
            this.startDailyCheck();
        }

        return this.enabled;
    },

    async requestPermission() {
        if (!('Notification' in window)) {
            Components.toast('Browserkaagu ma taageero notifications', 'error');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.enabled = true;
            DB.saveSetting('notificationsEnabled', true);
            this.startDailyCheck();
            Components.toast('✅ Notifications waa la furtay!', 'success');
            return true;
        }

        if (Notification.permission === 'denied') {
            Components.toast('❌ Notifications waa la diiday. Fur browser settings', 'error');
            return false;
        }

        // Request permission
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.enabled = true;
                this.permission = 'granted';
                DB.saveSetting('notificationsEnabled', true);
                this.startDailyCheck();
                Components.toast('✅ Notifications waa la furtay!', 'success');

                // Show test notification
                this.show('Ololeeye', {
                    body: 'Notifications waa shaqeynayaan! 🎉',
                    icon: '/logo.png'
                });

                return true;
            } else {
                Components.toast('Notifications waa la diiday', 'error');
                return false;
            }
        } catch (error) {
            console.error('Notification permission error:', error);
            return false;
        }
    },

    show(title, options = {}) {
        if (!this.enabled || Notification.permission !== 'granted') {
            return null;
        }

        const notification = new Notification(title, {
            icon: '/logo.png',
            badge: '/logo.png',
            ...options
        });

        try {
            const notification = new Notification(title, {
                icon: '/logo.png',
                badge: '/logo.png',
                ...options
            });

            // Click handler
            notification.onclick = () => {
                window.focus();
                if (options.url) {
                    window.location.hash = options.url;
                }
                notification.close();
            };
            return notification;
        } catch (e) {
            console.error('Notification error:', e);
            return null;
        }
    },

    startDailyCheck() {
        // Check every hour
        setInterval(() => {
            this.checkPendingPayments();
            this.checkMilestones();
        }, 60 * 60 * 1000); // Every hour

        // Also check now
        setTimeout(() => {
            this.checkPendingPayments();
            this.checkMilestones();
        }, 5000);
    },

    checkPendingPayments() {
        if (!this.enabled) return;

        const now = new Date();
        const hour = now.getHours();

        // Only send at 10 AM
        if (hour !== 10) return;

        // Check if already sent today
        const lastCheck = localStorage.getItem('last_reminder_check');
        const today = now.toDateString();

        if (lastCheck === today) return;

        // Count pending payments
        const campaigns = DB.getCampaigns();
        let totalPending = 0;
        let totalPendingAmount = 0;
        const settings = DB.getSettings();

        campaigns.forEach(c => {
            const stats = DB.getCampaignStats(c.id);
            totalPending += stats.pendingCount;

            const contributors = DB.getContributors(c.id);
            contributors.forEach(contrib => {
                if (contrib.status === 'pending') {
                    totalPendingAmount += parseFloat(contrib.amount) || 0;
                }
            });
        });

        if (totalPending > 0) {
            this.show('Ololeeye - Xasuusin', {
                body: `${totalPending} qof oo sugaya (${settings.currencySymbol}${totalPendingAmount.toLocaleString()})`,
                tag: 'daily-reminder',
                url: '#/stats',
                requireInteraction: true
            });

            localStorage.setItem('last_reminder_check', today);

            if (typeof Analytics !== 'undefined') {
                Analytics.trackEvent('Notification', 'daily_reminder', 'sent', totalPending);
            }
        }
    },

    checkMilestones() {
        if (!this.enabled) return;

        const campaigns = DB.getCampaigns();
        const notifiedMilestones = JSON.parse(localStorage.getItem('notified_milestones') || '{}');

        campaigns.forEach(campaign => {
            const stats = DB.getCampaignStats(campaign.id);
            const percent = stats.percent;

            // 50% milestone
            if (percent >= 50 && percent < 100 && !notifiedMilestones[`${campaign.id}_50`]) {
                this.show(`${campaign.emoji || '💰'} ${campaign.name}`, {
                    body: `Hambalyo! 50% ayaa la gaadhay! (${stats.percent}%)`,
                    tag: `milestone-50-${campaign.id}`,
                    url: `#/campaign/${campaign.id}`
                });

                notifiedMilestones[`${campaign.id}_50`] = true;
                localStorage.setItem('notified_milestones', JSON.stringify(notifiedMilestones));

                if (typeof Analytics !== 'undefined') {
                    Analytics.trackEvent('Notification', 'milestone_50', campaign.id);
                }
            }

            // 100% milestone
            if (percent >= 100 && !notifiedMilestones[`${campaign.id}_100`]) {
                this.show(`${campaign.emoji || '🎉'} ${campaign.name}`, {
                    body: `Hambalyo! Ujeedada waa la gaadhay! 🎉 (${stats.percent}%)`,
                    tag: `milestone-100-${campaign.id}`,
                    url: `#/campaign/${campaign.id}`,
                    requireInteraction: true
                });

                notifiedMilestones[`${campaign.id}_100`] = true;
                localStorage.setItem('notified_milestones', JSON.stringify(notifiedMilestones));

                if (typeof Analytics !== 'undefined') {
                    Analytics.trackEvent('Notification', 'milestone_100', campaign.id);
                }
            }
        });
    },

    // Notification for new pending payment
    notifyNewPayment(contributorName, amount, campaignName) {
        const settings = DB.getSettings();
        return this.show('💰 Lacag Cusub!', {
            body: `${contributorName} ayaa sheegay inuu bixiyey ${settings.currencySymbol}${amount}\n\nOlole: ${campaignName}`,
            tag: 'new-payment',
            requireInteraction: true,
            data: { type: 'payment' }
        });
    },

    // Notification for campaign goal reached
    notifyGoalReached(campaignName, collected) {
        const settings = DB.getSettings();
        return this.show('🎉 Hadafka la gaaray!', {
            body: `${campaignName}\n\nWaxaa la ururiyey: ${settings.currencySymbol}${collected}`,
            tag: 'goal-reached',
            requireInteraction: true,
            data: { type: 'goal' }
        });
    },

    // Test notification
    test() {
        return this.show('✅ Notifications waa shaqeynayaan!', {
            body: 'Waxaad heli doontaa notifications marka lacag cusub la soo sheego.',
            tag: 'test'
        });
    },

    disable() {
        this.enabled = false;
        DB.saveSetting('notificationsEnabled', false);
        Components.toast('Notifications waa la xiray', 'success');
    }
};

const App = {
    currentRoute: null,
    currentParams: {},
    searchQuery: '',
    activeFilter: 'all',
    sessions: {}, // Simple session store in memory { campaignId: true }

    // ========================================
    // Initialization
    // ========================================

    async init() {
        // Initialize authentication first
        try {
            await Auth.init();
        } catch (error) {
            console.error('Auth initialization failed:', error);
            Components.toast('Connection error: Continuing in offline mode', 'warning');
        }

        // Listen for auth state changes
        Auth.onAuthChange((user, profile) => {
            const hash = window.location.hash;
            const publicRoutes = ['/join', '/confirm-payment', '/payment-success', '/login', '/register'];
            const isPublicRoute = publicRoutes.some(route => hash.includes(route));

            if (!user && !isPublicRoute) {
                // User logged out and not on a public route, redirect to login
                window.location.hash = '#/login';
                this.handleRoute(); // Ensure login page renders
            } else {
                // User logged in or on a public route, reload current view
                this.handleRoute();
            }
        });

        // Check if user is authenticated and on a protected route
        const hash = window.location.hash;
        const publicRoutes = ['/join', '/confirm-payment', '/payment-success', '/login', '/register', '/welcome'];
        const isPublicRoute = publicRoutes.some(route => hash.includes(route));

        // Start on welcome page ONLY if no hash is present
        if (!hash || hash === '#' || hash === '#/') {
            window.location.hash = '#/welcome';
        } else if (!Auth.isAuthenticated() && !isPublicRoute) {
            window.location.hash = '#/login';
        }

        // Load theme
        const settings = DB.getSettings();
        if (settings.theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        // Initialize notifications
        Notifications.init();

        // Ensure all campaigns have codes
        await this.ensureCampaignCodes();

        // Setup router
        window.addEventListener('hashchange', () => this.handleRoute());

        // Setup theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.navigate('/settings'));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
            logoutBtn.classList.toggle('hidden', !Auth.isAuthenticated());
        }

        // Initial route - Always start from landing (Welcome) unless a specific route is bookmarked
        const currentHash = window.location.hash;
        const protectedRoutes = ['/campaign/', '/edit/', '/add-contributor/', '/contributor/', '/edit-contributor/', '/stats'];
        const isProtectedRoute = protectedRoutes.some(route => currentHash.includes(route));

        if (!currentHash || currentHash === '#' || currentHash === '#/') {
            window.location.hash = '#/welcome';
        } else if (isProtectedRoute && !Auth.isAuthenticated()) {
            window.location.hash = '#/login';
        }

        this.handleRoute(); // Always call this to render the page

        // Register Service Worker for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('🚀 Service Worker registered:', reg.scope))
                    .catch(err => console.log('❌ Service Worker failed:', err));
            });
        }

        console.log('🌙 Ololeeye initialized!');
    },

    setLoading(isLoading) {
        const app = document.getElementById('app');
        if (isLoading) {
            app.classList.add('loading-state');
        } else {
            app.classList.remove('loading-state');
        }
    },

    triggerConfetti() {
        const colors = ['#059669', '#10b981', '#34d399', '#f59e0b', '#fbbf24'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = confetti.style.width;
            confetti.style.animation = `confetti-fall ${Math.random() * 2 + 2}s linear forwards`;
            confetti.style.animationDelay = Math.random() * 1 + 's';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }
    },

    ensureCampaignCodes() {
        const campaigns = DB.getCampaigns();
        let updated = false;
        campaigns.forEach(c => {
            if (!c.code) {
                c.code = DB.generateCampaignCode();
                DB.saveCampaign(c);
                updated = true;
            }
        });
        if (updated) {
            console.log('✅ Campaign codes generated');
        }
    },

    // ========================================
    // Router
    // ========================================

    handleRoute() {
        try {
            const hash = window.location.hash.slice(1) || '/';
            const [pathPart, queryPart] = hash.split('?');
            const [path, ...rest] = pathPart.split('/').filter(Boolean);

            // Parse query parameters
            const queryParams = {};
            if (queryPart) {
                queryPart.split('&').forEach(p => {
                    const [key, val] = p.split('=');
                    queryParams[key] = decodeURIComponent(val || '');
                });
            }

            // Parse route and params
            let route = '/' + (path || '');
            let params = { ...queryParams };

            if (rest.length) {
                params.id = rest[0];
                if (rest[1]) {
                    params.subId = rest[1];
                }
            }

            this.currentRoute = route;
            this.currentParams = params;

            // Reset filters when changing routes
            if (route !== this.lastRoute) {
                this.searchQuery = '';
                this.activeFilter = 'all';
            }
            this.lastRoute = route;

            // Page transitions and Rendering
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.style.opacity = '0';
                mainContent.style.transform = 'translateY(10px)';

                setTimeout(async () => {
                    try {
                        // Toggle public modes
                        const publicRoutes = ['/join', '/join-success', '/confirm-payment'];
                        document.body.classList.toggle('public-mode', publicRoutes.includes(route));
                        document.body.classList.toggle('welcome-mode', route === '/welcome');

                        this.updateNavigation(route);

                        // Auth check
                        const publicRoutesList = ['/join', '/confirm-payment', '/payment-success', '/login', '/register', '/welcome'];
                        const isPublicRoute = publicRoutesList.some(r => route.includes(r));
                        const isAuthenticated = Auth.isAuthenticated();

                        if (!isAuthenticated && !isPublicRoute) {
                            console.log('Redirecting to login: Unauthenticated access to', route);
                            window.location.hash = '#/login';
                            return;
                        }

                        // Show logout button if authenticated
                        const logoutBtnResult = document.getElementById('logout-btn');
                        if (logoutBtnResult) {
                            logoutBtnResult.classList.toggle('hidden', !isAuthenticated);
                        }

                        // Show loading state if needed
                        mainContent.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

                        const viewContent = await this.renderView(route, params);
                        mainContent.innerHTML = viewContent;
                        window.scrollTo(0, 0);

                        mainContent.style.opacity = '1';
                        mainContent.style.transform = 'translateY(0)';
                    } catch (e) {
                        console.error('Render error:', e);
                        Components.toast('Khalad ayaa dhacay: ' + e.message, 'error');
                        mainContent.innerHTML = `<div class="p-xl text-center"><h3>Khalad ayaa dhacay</h3><p class="text-secondary mb-md">${e.message}</p><button onclick="location.hash='/'" class="btn btn-primary mt-md">Back to Home</button></div>`;
                        mainContent.style.opacity = '1';
                        mainContent.style.transform = 'translateY(0)';
                    }
                }, 50);
            }
        } catch (error) {
            console.error('Routing error:', error);
            window.location.hash = '#/';
        }
    },

    async renderView(route, params) {
        const routes = {
            '/': () => this.viewHome(),
            '/campaigns': () => this.viewCampaigns(),
            '/campaign': () => this.viewCampaignDetail(params.id),
            '/add': () => this.viewAddCampaign(),
            '/contributors': () => this.viewAllContributors(),
            '/contributor': () => this.viewContributorDetail(params.id),
            '/stats': () => this.viewStats(),
            '/settings': () => this.viewSettings(),
            '/campaign-contributors': () => this.viewCampaignContributors(params.id),
            '/add-contributor': () => this.viewAddContributor(params.id),
            '/edit-contributor': () => this.viewEditContributor(params.id),
            '/edit-campaign': () => this.viewEditCampaign(params.id),
            '/send-messages': () => this.viewSendMessages(params.id),
            '/templates': () => this.viewTemplates(),
            '/bixin': () => this.viewBixin(),
            '/bixin-success': () => this.viewBixinSuccess(),
            '/pending-payments': () => this.viewPendingPayments(),
            '/welcome': () => this.viewWelcome(),
            '/join': () => this.viewJoin(params.c),
            '/join-success': () => this.viewJoinSuccess(),
            '/confirm-payment': () => this.viewConfirmPayment(params.c),
            '/reminders': () => this.viewReminders(params.id),
            '/share': () => this.viewShare(params.id),
            '/auth': () => this.viewAuth(params.id),
            '/logs': () => this.viewLogs(params.id),
            '/login': () => this.viewLogin(),
            '/register': () => this.viewRegister(),
            '/profile': () => this.viewProfile()
        };

        const viewFn = routes[route];
        return viewFn ? await viewFn() : this.view404();
    },

    async logout() {
        if (confirm('Ma hubo qof inaad rabto inaad ka baxdo?')) {
            await Auth.signOut();
            Components.toast('Si guul leh ayaad uga baxday', 'success');
            window.location.hash = '#/welcome';
        }
    },

    navigate(path) {
        window.location.hash = '#' + path;
    },

    updateNavigation(route) {
        // Update bottom nav
        document.querySelectorAll('.nav-item').forEach(item => {
            const itemRoute = item.getAttribute('data-route');
            item.classList.toggle('active',
                (route === '/' && itemRoute === 'home') ||
                (route.includes('campaign') && itemRoute === 'campaigns') ||
                (route.includes('contributor') && itemRoute === 'contributors') ||
                (route === '/stats' && itemRoute === 'stats') ||
                (route === '/add' && itemRoute === 'add')
            );
        });

        // Update header
        const backBtn = document.getElementById('back-btn');
        const headerTitle = document.getElementById('header-title');

        const mainRoutes = ['/', '/campaigns', '/contributors', '/stats', '/add', '/welcome', '/join', '/join-success', '/confirm-payment'];

        if (mainRoutes.includes(route)) {
            backBtn.classList.add('hidden');
            if (route === '/join' || route === '/join-success' || route === '/confirm-payment') {
                headerTitle.textContent = 'OLOLEEYE';
            } else {
                headerTitle.textContent = 'OLOLEEYE';
            }
        } else {
            backBtn.classList.remove('hidden');
            backBtn.onclick = () => history.back();

            const titles = {
                '/add': 'Olole Cusub',
                '/campaign': 'Faahfaahin',
                '/contributor': 'Tabaruce',
                '/settings': 'Dejinta',
                '/templates': 'Templates',
                '/campaign-contributors': 'Tabarucayaasha',
                '/add-contributor': 'Tabaruce Cusub',
                '/edit-contributor': 'Wax ka bedel',
                '/edit-campaign': 'Wax ka bedel',
                '/send-messages': 'Dir Fariimo',
                '/bixin': 'Ilmo Bixin',
                '/bixin-success': 'Mahadsanid',
                '/pending-payments': 'Ilmo Sugaya',
                '/reminders': 'Xasuusinta',
                '/share': 'Wadaag',
                '/auth': 'PIN-ka Maaraynta',
                '/logs': 'Taariikhda (Logs)'
            };
            headerTitle.textContent = titles[route] || 'OLOLEEYE';
        }
    },

    // ========================================
    // Views
    // ========================================

    // ========================================
    // WELCOME LANDING PAGE
    // ========================================

    viewWelcome() {
        return `
            <div class="welcome-page">
                <div class="welcome-logo">
                    <img src="logo-full.png" alt="Ololeeye" class="welcome-logo-icon" />
                    <div class="welcome-logo-text">OLOLEEYE</div>
                    <div class="welcome-logo-subtitle">Ururinta Lacagaha</div>
                </div>
                
                <div class="welcome-tagline">
                    Maamul lacag-ururinta si fudud, bilaa mashquul. WhatsApp-ka ku salaysan.
                </div>
                
                <div class="welcome-steps">
                    <div class="welcome-step">
                        <div class="welcome-step-number">1</div>
                        <div class="welcome-step-title">Abuur Olole</div>
                        <div class="welcome-step-desc">Ku darso summadda aad u baahan tahay, ballanta qof kasta, iyo wakhtiga deadline-ka.</div>
                    </div>
                    
                    <div class="welcome-step">
                        <div class="welcome-step-number">2</div>
                        <div class="welcome-step-title">Wadaag Linkiga</div>
                        <div class="welcome-step-desc">Si toos ah WhatsApp-ka u soo dir. Dadku ay isbuqaan linkiga oo ay sheegaan lacagtii ay bixiyeen.</div>
                    </div>
                    
                    <div class="welcome-step">
                        <div class="welcome-step-number">3</div>
                        <div class="welcome-step-title">Raac & Xaqiiji</div>
                        <div class="welcome-step-desc">Arag qofkii bixiyey iyo qofkii wali sugaya. Xaqiiji markii lacagtu timaado. Automation - xasuusiyaha & mahad-celin.</div>
                    </div>
                </div>
                
                <div class="welcome-actions" style="display: flex; flex-direction: column; gap: var(--spacing-md); width: 100%;">
                    <button class="welcome-cta" onclick="App.navigate('/add')">
                        Ku Bilow - Abuur Olole →
                    </button>
                    
                    ${!Auth.isAuthenticated() ? `
                        <button class="btn btn-secondary btn-block" onclick="App.navigate('/login')">
                            🔐 Gal Akoonkaaga
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-block" onclick="App.navigate('/')">
                            📊 Tag Dashboardka
                        </button>
                    `}
                </div>
            </div>
        `;
    },

    // ========================================
    // HOME DASHBOARD
    // ========================================

    async viewHome() {
        try {
            const campaigns = (await DataLayer.getCampaigns()) || [];

            // Explicit empty state instead of redirecting
            if (!campaigns.length) {
                return `
                    <div class="empty-state">
                        <div class="empty-state-icon">✨</div>
                        <h2 class="empty-state-title">Ku soo dhawaaw Ololeeye</h2>
                        <p class="empty-state-text">Ma haysid wax olole ah hadda. Bilow mid cusub si aad u maamusho lacag-ururintaada.</p>
                        <button class="btn btn-primary" onclick="App.navigate('/add')">➕ Abuur Olole Cusub</button>
                    </div>
                `;
            }

            // Sort by most recently updated
            campaigns.sort((a, b) => {
                const dateA = new Date(a.updated_at || a.updatedAt || 0);
                const dateB = new Date(b.updated_at || b.updatedAt || 0);
                return dateB - dateA;
            });

            // Get totals and stats in parallel
            let totalCollected = 0;
            let totalGoal = 0;
            let totalContributors = 0;

            const campaignsWithStats = await Promise.all(campaigns.map(async c => {
                const stats = await DataLayer.getCampaignStats(c.id);
                totalCollected += stats.collected;
                totalGoal += c.goal;
                totalContributors += stats.total;
                return { ...c, stats }; // Attach stats to campaign object
            }));

            const settings = DataLayer.getSettings(); // Sync
            const pendingPayments = await DataLayer.getPendingPayments();
            const automationBadgesObj = await this.renderHomeAutomationBadges(campaigns);

            // Pre-render campaign cards
            // Note: Components.campaignCard might be synchronous, assuming it takes the campaign object (which now has stats?)
            // Actually Components.campaignCard likely calls DB.getCampaignStats internally? 
            // Let's check Components.campaignCard later. For now assume it might need refactor or we pass stats.
            // If Components.campaignCard calls DB, it will fail/return empty. 
            // FIX: We need to check Components.campaignCard. 
            // For this step, I will assume I need to fetch stats inside ViewHome and maybe update CampaignCard to accept stats?
            // Or if Components.campaignCard uses DB.getCampaignStats, and that redirects to DataLayer (which is async), it will return a Promise.
            // So Components.campaignCard MUST be updated or we need to await it. 

            // Let's await the badge string
            const automationBadges = automationBadgesObj;

            return `
            <div style="background: var(--gradient-hero-mesh); border-radius: 24px; padding: 48px 24px; margin-bottom: 32px; position: relative; overflow: hidden; box-shadow: var(--shadow-hero), var(--glow-hero);">
                <div style="position: relative; z-index: 1; text-align: center;">
                    <div style="font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.95); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
                        Wadarta la ururiyey
                    </div>
                    <div style="font-size: 72px; font-weight: 800; color: white; letter-spacing: -0.03em; line-height: 1; margin-bottom: 12px; text-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(16,185,129,0.3);">
                        ${settings.currencySymbol}${totalCollected.toLocaleString()}
                    </div>
                    <div style="font-size: 16px; color: rgba(255,255,255,0.9); font-weight: 500;">
                        ka mid ah ${settings.currencySymbol}${totalGoal.toLocaleString()} hadafka
                    </div>
                </div>
                <div class="glass" style="position: absolute; bottom: 0; left: 0; right: 0; height: 60%; border-radius: 0 0 24px 24px; border: none;"></div>
            </div>
            
            <div class="stats-grid mb-xl">
                <div class="stat-item">
                    <div class="stat-value">${campaigns.length}</div>
                    <div class="stat-label">Ololaha</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalContributors}</div>
                    <div class="stat-label">Tabarucayaal</div>
                </div>
            </div>
            
            <div class="section-header">
                <h2 class="section-title">Ololahaaga</h2>
                <button class="btn btn-sm btn-ghost" onclick="App.navigate('/campaigns')">
                    Eeg dhammaan →
                </button>
            </div>
            
            <div id="home-campaign-list">
               ${(await Promise.all(campaigns.slice(0, 5).map(async c => await Components.campaignCard(c)))).join('')}
            </div>
            
            ${pendingPayments.length ? `
                <div class="card cursor-pointer border-l-warning" onclick="App.navigate('/pending-payments')">
                    <div class="flex items-center gap-md">
                        <div class="emoji-lg">🟡</div>
                        <div class="flex-1">
                            <div class="card-title">Ilmo Bixin Sugaya</div>
                            <div class="card-subtitle">${pendingPayments.length} sugaya dib u eegid</div>
                        </div>
                        <div class="text-tertiary">→</div>
                    </div>
                </div>
            ` : ''}
            
            ${automationBadges}
        `;
        } catch (error) {
            console.error('viewHome error:', error);
            return `
                <div class="p-xl text-center">
                    <div class="emoji-lg mb-md">⚠️</div>
                    <h3>Khalad ayaa dhacay</h3>
                    <p class="text-secondary">${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary mt-md">Dib u rari</button>
                </div>
            `;
        }
    },

    async renderHomeAutomationBadges(campaigns) {
        let totalActions = 0;
        let reminderCount = 0;
        let updateCount = 0;

        // Process in parallel for speed
        const results = await Promise.all(campaigns.map(c => DataLayer.getSuggestedActions(c.id)));

        results.forEach(actions => {
            actions.forEach(a => {
                totalActions++;
                if (a.type === 'reminder_ready') reminderCount++;
                if (a.type === 'update_ready') updateCount++;
            });
        });

        if (totalActions === 0) return '';

        return `
            <div class="card" style="cursor: pointer; border-left: 4px solid var(--color-primary); background: var(--bg-secondary);" onclick="App.navigate('/campaigns')">
                <div class="flex items-center gap-md">
                    <div class="emoji-lg">✨</div>
                    <div class="flex-1">
                        <div class="card-title">Talooyin Otomaatig ah</div>
                        <div class="card-subtitle">
                            ${reminderCount > 0 ? `📩 ${reminderCount} xasuusin ` : ''}
                            ${updateCount > 0 ? `📢 ${updateCount} cusbooneysiin` : ''}
                        </div>
                    </div>
                    <div style="background: var(--color-primary); color: white; padding: 4px 12px; border-radius: var(--radius-full); font-weight: bold;">${totalActions}</div>
                </div>
            </div>
        `;
    },

    async viewCampaigns() {
        try {
            const campaigns = (await DataLayer.getCampaigns()) || [];

            if (!campaigns.length) {
                return `
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <h2 class="empty-state-title">Wali ma jirto olole</h2>
                        <p class="empty-state-text">Ma haysid wax olole ah hadda. Bilow mid cusub!</p>
                        <button class="btn btn-primary" onclick="App.navigate('/add')">➕ Abuur Olole Cusub</button>
                    </div>
                `;
            }

            // Sort by most recently updated
            campaigns.sort((a, b) => {
                const dateA = new Date(a.updated_at || a.updatedAt || 0);
                const dateB = new Date(b.updated_at || b.updatedAt || 0);
                return dateB - dateA;
            });

            // Note: passing stats explicitly would be better, but lazy loading works too since campaignCard handles it
            const cardHtmls = await Promise.all(campaigns.map(c => Components.campaignCard(c)));

            return `
                <div class="section-header">
                    <h2 class="section-title">Dhammaan Ololaha</h2>
                    <span style="font-size: var(--font-size-sm); color: var(--text-tertiary);">${campaigns.length}</span>
                </div>
                ${cardHtmls.join('')}
            `;
        } catch (error) {
            console.error('viewCampaigns error:', error);
            return `<div class="p-xl text-center"><h3>Khalad ayaa dhacay</h3><p>${error.message}</p></div>`;
        }
    },

    async viewCampaignDetail(id) {
        const campaign = await DataLayer.getCampaign(id);
        if (!campaign) return this.view404();

        const stats = await DataLayer.getCampaignStats(id);
        const settings = DataLayer.getSettings();
        const contributors = await DataLayer.getContributors(id);
        const recentContributors = contributors.slice(0, 3);

        // Ensure renderSuggestedActions is awaited if it becomes async (it uses getSuggestedActions which is async)
        // I need to check renderSuggestedActions implementation. Assuming I need to update it too.
        const suggestedActionsHtml = await this.renderSuggestedActions(id);

        return `
            <div class="text-center mb-xl">
                <div class="hero-icon">${Icons.render('folder', 'icon icon-xl icon-primary')}</div>
                <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin-bottom: var(--spacing-xs); letter-spacing: -0.02em;">${campaign.name}</h1>
                ${campaign.description ? `<p style="color: var(--text-secondary); font-size: var(--font-size-sm); max-width: 300px; margin: 0 auto var(--spacing-sm);">${campaign.description}</p>` : ''}
                <div style="display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: 6px 12px; background: var(--bg-tertiary); border-radius: var(--radius-full); font-size: var(--font-size-sm);">
                    <span style="color: var(--text-tertiary);">Koodka:</span>
                    <span style="font-weight: var(--font-weight-bold); font-family: monospace; color: var(--color-primary);">#${campaign.code || '----'}</span>
                </div>
            </div>
            
            <div class="card" style="cursor: default; border: none; background: linear-gradient(135deg, var(--color-primary-subtle), transparent);">
                <div class="text-center mb-lg">
                    <div style="font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.03em;">
                        ${settings.currencySymbol}${stats.collected.toLocaleString()}
                    </div>
                    <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">
                        ka mid ah ${settings.currencySymbol}${campaign.goal.toLocaleString()}
                    </div>
                </div>
                <div class="progress-bar" style="height: 10px;">
                    <div class="progress-fill" style="width: ${stats.percent}%"></div>
                </div>
                <div style="text-align: center; margin-top: var(--spacing-md);">
                    <span style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--text-primary);">${stats.percent}%</span>
                    <span style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-left: var(--spacing-xs);">la gaaray</span>
                </div>
            </div>
            
            ${suggestedActionsHtml}
            
            <div class="stats-grid">
                <div class="stat-item" style="border-left: 3px solid var(--color-success);">
                    <div class="stat-value" style="color: var(--color-success);">${stats.paidCount}</div>
                    <div class="stat-label">Bixiyey</div>
                </div>
                <div class="stat-item" style="border-left: 3px solid var(--color-warning);">
                    <div class="stat-value" style="color: var(--color-warning);">${stats.pendingCount}</div>
                    <div class="stat-label">Sugaya</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Wadarta</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${settings.currencySymbol}${stats.remaining.toLocaleString()}</div>
                    <div class="stat-label">Haray</div>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm); margin-top: var(--spacing-xl);">
                <button class="btn btn-primary btn-block btn-lg" onclick="App.navigate('/share/${id}')" style="background: linear-gradient(135deg, #10b981, #059669);">
                    ${Icons.render('share', 'icon icon-md')} Wadaag Linkiga
                </button>
                
                <button class="btn btn-whatsapp btn-block btn-lg" onclick="App.navigate('/send-messages/${id}')">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Dir Fariimo WhatsApp
                </button>
                
                ${stats.pendingCount > 0 ? `
                    <button class="btn btn-secondary btn-block" onclick="App.navigate('/reminders/${id}')" style="border-color: var(--color-warning); color: var(--color-warning);">
                        ${Icons.render('bell', 'icon icon-md')} Xasuusi ${stats.pendingCount} qof
                    </button>
                ` : ''}
                
                <button class="btn btn-secondary btn-block" onclick="App.navigate('/campaign-contributors/${id}')">
                    ${Icons.render('users', 'icon icon-md')} Tabarucayaasha (${stats.total})
                </button>
                
                <button class="btn btn-outline btn-block" onclick="App.navigate('/add-contributor/${id}')">
                    Ku dar Tabaruce Cusub
                </button>
            </div>
            
            ${recentContributors.length ? `
                <div class="section-header" style="margin-top: var(--spacing-xl);">
                    <h3 class="section-title">Tabarucayaasha ugu dambeeya</h3>
                </div>
                ${recentContributors.map(c => Components.contributorRow(c)).join('')}
            ` : ''}
            
            <div class="section-header" style="margin-top: var(--spacing-xl);">
                <h3 class="section-title">Aaladaha Degdega</h3>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
                <button class="btn btn-secondary" onclick="App.copyJoinLink('${id}')">
                    ${Icons.render('link', 'icon icon-sm')} Koobiya Join-ka
                </button>
                <button class="btn btn-secondary" onclick="App.copyGroupUpdate('${id}')">
                    ${Icons.render('send', 'icon icon-sm')} Koobiya Wargeyska
                </button>
                <button class="btn btn-secondary" onclick="CSVExport.exportCampaignContributors('${id}'); Components.toast('CSV la soo dejiyey!', 'success');">
                    ${Icons.render('download', 'icon icon-sm')} Export Tabarucayaal
                </button>
                <button class="btn btn-secondary" onclick="CSVExport.exportCampaignSummary('${id}'); Components.toast('Warbixin la soo dejiyey!', 'success');">
                    ${Icons.render('document', 'icon icon-sm')} Export Warbixin
                </button>
            </div>
            
            <div class="flex gap-sm">
                <button class="btn btn-outline flex-1" onclick="App.navigate('/edit-campaign/${id}')">
                    Wax ka bedel
                </button>
                <button class="btn btn-outline" style="flex: 1; color: var(--color-error); border-color: var(--color-error);" 
                        onclick="App.deleteCampaign('${id}')">
                    Tirtir
                </button>
            </div>
            
            <button class="btn btn-ghost btn-block mt-md" onclick="App.navigate('/logs/${id}')">
                ${Icons.render('barChart', 'icon icon-sm')} Eeg Taariikhda (Audit Log)
            </button>
        `;
    },

    viewAddCampaign() {
        return this.renderCampaignForm(null);
    },

    viewEditCampaign(id) {
        const campaign = DB.getCampaign(id);
        if (!campaign) return this.view404();
        return this.renderCampaignForm(campaign);
    },

    renderCampaignForm(existingCampaign) {
        const campaign = existingCampaign || { icon: 'folder', name: '', description: '', goal: '', deadline: '', zaadNumber: '' };
        const settings = DB.getSettings();
        const isEdit = !!existingCampaign;

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">${isEdit ? '✏️' : '✨'}</div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">
                    ${isEdit ? 'Wax ka bedel Ololaha' : 'Olole Cusub'}
                </h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                    ${isEdit ? 'Cusbooneysi xogta ololaha' : 'Samee olole cusub oo lacag ururin ah'}
                </p>
            </div>
            
            <form id="campaign-form" onsubmit="App.saveCampaign(event)">
                ${isEdit ? `<input type="hidden" name="id" value="${existingCampaign.id}">` : ''}
                
                ${Components.iconPicker(campaign.icon || 'folder')}
                
                ${Components.formGroup({
            label: 'Magaca Ololaha',
            name: 'name',
            value: campaign.name,
            placeholder: 'Tusaale: Caafimaad Fund',
            required: true
        })}
                
                ${Components.formGroup({
            label: 'Sharaxaad (ikhtiyaari)',
            name: 'description',
            type: 'textarea',
            value: campaign.description,
            placeholder: 'Sharax ujeeddada ololahan...'
        })}
                
                ${Components.formGroup({
            label: `Hadafka Lacagta (${settings.currencySymbol})`,
            name: 'goal',
            type: 'number',
            value: campaign.goal,
            placeholder: '2500',
            required: true,
            hint: 'Lacagta guud ee aad rabto inaad urursato'
        })}
                
                ${Components.formGroup({
            label: 'Wakhtiga Dhamaadka (ikhtiyaari)',
            name: 'deadline',
            type: 'date',
            value: campaign.deadline
        })}
                
                ${Components.formGroup({
            label: 'Lambarka Lacagta (EVC/Zaad/Cash)',
            name: 'zaadNumber',
            value: campaign.zaadNumber || settings.defaultZaad,
            placeholder: '252634567890',
            hint: 'Lambarka lacagta lagu diro'
        })}
                
                ${Components.formGroup({
            label: 'PIN-ka Maaraynta (4 god)',
            name: 'coordinatorPin',
            type: 'password',
            value: campaign.coordinatorPin || '',
            placeholder: '1234',
            required: true,
            hint: 'PIN-kan waxaa loo isticmaali doonaa maaraynta ololaha'
        })}
                
                <button type="submit" class="btn btn-primary btn-block btn-lg mt-lg">
                    ${isEdit ? '💾 Kaydi Isbedelka' : '✨ Abuur Ololaha'}
                </button>
            </form>
        `;
    },

    async viewCampaignContributors(campaignId) {
        const campaign = await DataLayer.getCampaign(campaignId);
        if (!campaign) return this.view404();

        const stats = await DataLayer.getCampaignStats(campaignId);
        let contributors = await DataLayer.getContributors(campaignId);

        // Apply filter
        if (this.activeFilter === 'paid') {
            contributors = contributors.filter(c => c.status === 'paid');
        } else if (this.activeFilter === 'pending') {
            contributors = contributors.filter(c => c.status === 'pending');
        }

        // Apply search
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            contributors = contributors.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.phone.includes(query)
            );
        }

        const filters = [
            { value: 'all', label: 'Dhammaan', count: stats.total },
            { value: 'paid', label: 'Bixiyey', count: stats.paidCount },
            { value: 'pending', label: 'Sugaya', count: stats.pendingCount }
        ];

        return `
            <div style="margin-bottom: var(--spacing-lg);">
                <div style="font-size: 1.5rem; margin-bottom: var(--spacing-xs);">${campaign.emoji || '📂'} ${campaign.name}</div>
                <div style="color: var(--text-secondary); font-size: var(--font-size-sm);">${stats.total} tabaruce</div>
            </div>
            
            ${Components.searchBar('Raadi magac ama telefoon...', 'App.handleSearch')}
            ${Components.filterTabs(filters, this.activeFilter, 'App.setFilter')}
            
            ${contributors.length ?
                contributors.map(c => Components.contributorRow(c, false, campaign)).join('') :
                `<div class="empty-state" style="padding: var(--spacing-xl);">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">👥</div>
                    <div style="color: var(--text-secondary);">Ma jiro tabaruce ${this.activeFilter !== 'all' ? 'la helay' : ''}</div>
                </div>`
            }
            
            <div class="fab">
                <button class="btn btn-primary fab-btn" onclick="App.navigate('/add-contributor/${campaignId}')">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                </button>
            </div>
        `;
    },

    viewAddContributor(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) return this.view404();
        return this.renderContributorForm(campaignId, null);
    },

    viewEditContributor(id) {
        const contributor = DB.getContributor(id);
        if (!contributor) return this.view404();
        return this.renderContributorForm(contributor.campaignId, contributor);
    },

    renderContributorForm(campaignId, existingContributor) {
        const campaign = DB.getCampaign(campaignId);
        const settings = DB.getSettings();
        const isEdit = !!existingContributor;
        const contributor = existingContributor || { name: '', phone: '', amount: '', status: 'pending' };

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">👤</div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">
                    ${isEdit ? 'Wax ka bedel' : 'Tabaruce Cusub'}
                </h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${campaign.emoji} ${campaign.name}</p>
            </div>
            
            <form id="contributor-form" onsubmit="App.saveContributor(event)">
                ${isEdit ? `<input type="hidden" name="id" value="${contributor.id}">` : ''}
                <input type="hidden" name="campaignId" value="${campaignId}">
                
                ${Components.formGroup({
            label: 'Magaca Buuxa',
            name: 'name',
            value: contributor.name,
            placeholder: 'Tusaale: Axmed Cali Xasan',
            required: true
        })}
                
                ${Components.phoneInput('phone', contributor.phone, true)}
                
                ${Components.formGroup({
            label: `Lacagta Lagu Filayo (${settings.currencySymbol})`,
            name: 'amount',
            type: 'number',
            value: contributor.amount,
            placeholder: '50',
            hint: 'Qiimaha tabaruca ee la sugayo'
        })}
                
                ${Components.formGroup({
            label: 'Xaalada',
            name: 'status',
            type: 'select',
            value: contributor.status,
            options: [
                { value: 'pending', label: 'Sugaya - Wali ma bixin' },
                { value: 'paid', label: 'Bixiyey - Waa la helay lacagta' },
                { value: 'declined', label: '✗ Diidey - Ma bixi karo' }
            ]
        })}
                
                <button type="submit" class="btn btn-primary btn-block btn-lg mt-lg">
                    ${isEdit ? 'Kaydi Isbedelka' : 'Ku dar Tabarucaha'}
                </button>
                
                ${isEdit ? `
                    <button type="button" class="btn btn-outline btn-block mt-md" style="color: var(--color-error); border-color: var(--color-error);" 
                            onclick="App.deleteContributor('${contributor.id}')">
                        Tirtir Tabarucahan
                    </button>
                ` : ''}
            </form>
        `;
    },

    async viewContributorDetail(id) {
        const contributor = await DataLayer.getContributor(id);
        if (!contributor) return this.view404();

        const campaign = await DataLayer.getCampaign(contributor.campaignId);
        const settings = DataLayer.getSettings();
        const initials = contributor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        const statusOptions = [
            { value: 'pending', label: 'Sugaya', class: 'badge-warning' },
            { value: 'paid', label: 'Bixiyey', class: 'badge-success' },
            { value: 'declined', label: '✗ Diidey', class: 'badge-error' }
        ];

        const currentStatus = statusOptions.find(s => s.value === contributor.status) || statusOptions[0];

        return `
            <div class="text-center mb-xl">
                <div class="contributor-avatar" style="width: 88px; height: 88px; font-size: var(--font-size-2xl); margin: 0 auto var(--spacing-lg);">
                    ${initials}
                </div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); margin-bottom: var(--spacing-xs);">${contributor.name}</h1>
                <p style="color: var(--text-tertiary); font-family: monospace;">+${contributor.phone}</p>
                ${campaign ? `<p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-top: var(--spacing-sm);">${campaign.emoji || '📂'} ${campaign.name}</p>` : ''}
            </div>
            
            <div class="card" style="cursor: default;">
                <div class="flex-between" style="margin-bottom: var(--spacing-lg);">
                    <span style="color: var(--text-secondary);">Lacagta</span>
                    <span style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">${settings.currencySymbol}${contributor.amount || 0}</span>
                </div>
                <div class="flex-between">
                    <span style="color: var(--text-secondary);">Xaalada</span>
                    <span class="badge ${currentStatus.class}">${currentStatus.label}</span>
                </div>
            </div>
            
            <div class="section-header">
                <h3 class="section-title">Bedel Xaalada</h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm); margin-bottom: var(--spacing-xl);">
                ${statusOptions.map(s => `
                    <button class="btn ${s.value === contributor.status ? 'btn-primary' : 'btn-secondary'}" 
                            style="padding: var(--spacing-md); font-size: var(--font-size-sm);"
                            onclick="App.updateContributorStatus('${id}', '${s.value}')">
                        ${s.label.split(' ')[0]}
                    </button>
                `).join('')}
            </div>
            
            <div class="section-header">
                <h3 class="section-title">Dir Fariin WhatsApp</h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm); margin-bottom: var(--spacing-xl);">
                <button class="btn btn-whatsapp btn-block" onclick="App.sendWhatsAppMessage('${id}', 'initial_request')">
                    Codsiga Ugu Horreeya
                </button>
                <button class="btn btn-whatsapp btn-block" onclick="App.sendWhatsAppMessage('${id}', 'reminder')">
                    Xasuusinta
                </button>
                <button class="btn btn-whatsapp btn-block" onclick="App.sendWhatsAppMessage('${id}', 'thank_you')">
                    Mahad Celin
                </button>
            </div>
            
            <div class="flex gap-sm">
                <button class="btn btn-secondary flex-1" onclick="App.navigate('/edit-contributor/${id}')">
                    Wax ka bedel
                </button>
                <button class="btn btn-outline" style="flex: 1; color: var(--color-error); border-color: var(--color-error);" 
                        onclick="App.deleteContributor('${id}')">
                    Tirtir
                </button>
            </div>
        `;
    },

    async viewAllContributors() {
        let contributors = await DataLayer.getContributors();

        if (!contributors.length) {
            return Components.emptyState(
                '👥',
                'Ma jiro tabarucayaal',
                'Abuur olole oo ku dar tabarucayaal si aad u bilowdo.',
                '➕ Abuur Olole',
                '/add'
            );
        }

        const campaigns = await DataLayer.getCampaigns();
        const campaignMap = new Map(campaigns.map(c => [c.id, c]));

        // Calculate stats for filters
        const allContributors = [...contributors];
        const paidCount = allContributors.filter(c => c.status === 'paid').length;
        const pendingCount = allContributors.filter(c => c.status === 'pending').length;

        // Apply filter
        if (this.activeFilter === 'paid') {
            contributors = contributors.filter(c => c.status === 'paid');
        } else if (this.activeFilter === 'pending') {
            contributors = contributors.filter(c => c.status === 'pending');
        }

        // Apply search
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            contributors = contributors.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.phone.includes(query)
            );
        }

        // Sort by name
        contributors.sort((a, b) => a.name.localeCompare(b.name));

        const filters = [
            { value: 'all', label: 'Dhammaan', count: allContributors.length },
            { value: 'paid', label: 'Bixiyey', count: paidCount },
            { value: 'pending', label: 'Sugaya', count: pendingCount }
        ];

        return `
            <div class="section-header">
                <h2 class="section-title">Dhammaan Tabarucayaasha</h2>
                <span style="color: var(--text-tertiary); font-size: var(--font-size-sm);">${allContributors.length} qof</span>
            </div>
            
            ${Components.searchBar('Raadi magac ama telefoon...', 'App.handleSearch')}
            ${Components.filterTabs(filters, this.activeFilter, 'App.setFilter')}
            
            ${contributors.length ?
                contributors.map(c => Components.contributorRow(c, true, campaignMap.get(c.campaignId))).join('') :
                `<div class="empty-state" style="padding: var(--spacing-xl);">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">${Icons.render('users', 'icon icon-xl icon-primary')}</div>
                    <div style="color: var(--text-secondary);">Ma jiro tabaruce ${this.activeFilter !== 'all' ? 'la helay' : ''}</div>
                </div>`
            }
        `;
    },

    async viewSendMessages(campaignId) {
        const campaign = await DataLayer.getCampaign(campaignId);
        if (!campaign) return this.view404();

        const stats = await DataLayer.getCampaignStats(campaignId);
        const templates = DataLayer.getTemplates();

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">📱</div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">Dir Fariimo</h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${campaign.emoji} ${campaign.name}</p>
            </div>
            
            <div class="card" style="cursor: default; margin-bottom: var(--spacing-xl);">
                <div class="section-title" style="margin-bottom: var(--spacing-md);">1️⃣ Dooro Qofka La Diri</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm);">
                    <button class="btn ${this.activeFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}" 
                            style="flex-direction: column; padding: var(--spacing-md);"
                            onclick="App.setMessageFilter('pending')">
                        <span style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);">${stats.pendingCount}</span>
                        <span style="font-size: var(--font-size-xs);">⏳ Sugaya</span>
                    </button>
                    <button class="btn ${this.activeFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}" 
                            style="flex-direction: column; padding: var(--spacing-md);"
                            onclick="App.setMessageFilter('paid')">
                        <span style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);">${stats.paidCount}</span>
                        <span style="font-size: var(--font-size-xs);">✓ Bixiyey</span>
                    </button>
                    <button class="btn ${this.activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" 
                            style="flex-direction: column; padding: var(--spacing-md);"
                            onclick="App.setMessageFilter('all')">
                        <span style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);">${stats.total}</span>
                        <span style="font-size: var(--font-size-xs);">👥 Dhammaan</span>
                    </button>
                </div>
            </div>
            
            <div class="card" style="cursor: default;">
                <div class="section-title" style="margin-bottom: var(--spacing-md);">2️⃣ Dooro Fariinta</div>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                    ${templates.map(t => `
                        <button class="btn btn-whatsapp btn-block" 
                                onclick="App.showMessagePreview('${campaignId}', '${t.type}')">
                            ${t.type === 'initial_request' ? '📩' : t.type === 'reminder' ? '🔔' : t.type === 'thank_you' ? '💚' : '📢'}
                            ${t.name}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-lg);">
                <button class="btn btn-ghost flex-1" onclick="App.navigate('/templates')">
                    ✏️ Muokkaa pohjia
                </button>
                <button class="btn btn-secondary flex-1" onclick="App.copyGroupUpdate('${campaignId}')">
                    📢 Koobiya fariinta kooxda
                </button>
            </div>
        `;
    },

    async viewTemplates() {
        const templates = DataLayer.getTemplates();

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">📝</div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">Message Templates</h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">Fariimaha automaatik ah ee WhatsApp</p>
            </div>
            
            ${templates.map(t => `
                <div class="card" onclick="App.editTemplate('${t.type}')">
                    <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                        <span class="emoji-lg">${t.type === 'initial_request' ? '📩' : t.type === 'reminder' ? '🔔' : t.type === 'thank_you' ? '💚' : '📢'}</span>
                        <div>
                            <div class="card-title">${t.name}</div>
                            <div class="card-subtitle">${t.nameEn}</div>
                        </div>
                    </div>
                    <div class="message-preview-text" style="font-size: var(--font-size-xs); max-height: 80px; overflow: hidden;">
                        ${t.text.slice(0, 150)}...
                    </div>
                </div>
            `).join('')}
        `;
    },

    async viewStats() {
        const campaigns = await DataLayer.getCampaigns();
        const allContributors = await DataLayer.getContributors();
        const settings = DataLayer.getSettings();
        const recentActivity = await DataLayer.getRecentActivity(8);

        // Calculate totals
        let totalCollected = 0;
        let totalGoal = 0;
        let totalPaid = 0;
        let totalPending = 0;

        // Parallel fetch of stats for each campaign
        const campaignsWithStats = await Promise.all(campaigns.map(async c => {
            const stats = await DataLayer.getCampaignStats(c.id);
            return { ...c, stats };
        }));

        campaignsWithStats.forEach(c => {
            totalCollected += c.stats.collected;
            totalGoal += c.goal;
            totalPaid += c.stats.paidCount;
            totalPending += c.stats.pendingCount;
        });

        const overallPercent = totalGoal > 0 ? Math.round((totalCollected / totalGoal) * 100) : 0;

        // Calculate Top Campaigns
        const topCampaigns = [...campaignsWithStats]
            .sort((a, b) => b.stats.collected - a.stats.collected)
            .slice(0, 3)
            .map(c => ({
                id: c.id,
                name: c.name,
                percent: c.stats.percent,
                collected: c.stats.collected
            }));

        // Calculate Top Contributors
        const contributorMap = {};
        allContributors.forEach(c => {
            if (c.status === 'paid') {
                const amount = parseFloat(c.amount) || 0;
                const key = c.phone || c.name; // Use phone or name as unique key
                if (!contributorMap[key]) {
                    contributorMap[key] = { name: c.name, totalAmount: 0, campaignCount: 0 };
                }
                contributorMap[key].totalAmount += amount;
                contributorMap[key].campaignCount++;
            }
        });

        const topContributors = Object.values(contributorMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);

        // Stats for Chart (last 14 days)
        const today = new Date();
        const timeline = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Sum payments for this day (based on updatedAt of paid contributors)
            const dailyTotal = allContributors
                .filter(c => c.status === 'paid' && c.updatedAt && c.updatedAt.startsWith(dateStr))
                .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

            timeline.push({ date: date.toLocaleDateString('so-SO', { day: 'numeric', month: 'short' }), amount: dailyTotal });
        }

        // Status Breakdown
        const statusBreakdown = {
            paid: {
                count: allContributors.filter(c => c.status === 'paid').length,
                amount: allContributors.filter(c => c.status === 'paid').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
            },
            pending: {
                count: allContributors.filter(c => c.status === 'pending').length,
                amount: allContributors.filter(c => c.status === 'pending').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
            },
            declined: {
                count: allContributors.filter(c => c.status === 'declined').length,
                amount: allContributors.filter(c => c.status === 'declined').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
            }
        };

        // Calculate success metrics
        const successRate = allContributors.length ? Math.round((allContributors.filter(c => c.status === 'paid').length / allContributors.length) * 100) : 0;

        // Collection rate (avg per day over last 7 days)
        const last7DaysTotal = timeline.slice(7).reduce((sum, d) => sum + d.amount, 0);
        const collectionRate = Math.round(last7DaysTotal / 7);

        // Render the view first, then initialize charts
        setTimeout(() => this.initializeStatsCharts([], timeline, statusBreakdown), 100);

        return `
            <div class="hero-summary">
                <div class="label">💰 Wadarta La Ururiyey</div>
                <div class="value">${settings.currencySymbol}${totalCollected.toLocaleString()}</div>
                <div style="margin-top: var(--spacing-md);">
                    <div style="background: var(--color-primary-subtle); height: 8px; border-radius: var(--radius-lg); overflow: hidden;">
                        <div style="width: ${overallPercent}%; height: 100%; background: var(--color-primary); border-radius: var(--radius-lg); transition: width 0.3s ease;"></div>
                    </div>
                    <div class="subtitle" style="margin-top: var(--spacing-sm);">${overallPercent}% hadafka (${settings.currencySymbol}${totalGoal.toLocaleString()})</div>
                </div>
                <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-md); font-size: var(--font-size-sm); color: var(--text-secondary);">
                    <div>📈 ${settings.currencySymbol}${collectionRate}/maalin</div>
                    <div>•</div>
                    <div>✅ ${successRate}% guulaystay</div>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-item" style="cursor: pointer;" onclick="App.navigate('/campaigns')">
                    <div class="stat-value">${campaigns.length}</div>
                    <div class="stat-label">Kampanjat</div>
                </div>
                <div class="stat-item" style="cursor: pointer;" onclick="App.navigate('/contributors')">
                    <div class="stat-value">${allContributors.length}</div>
                    <div class="stat-label">Lahjoittajat</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: var(--color-success);">${totalPaid}</div>
                    <div class="stat-label">Maksettu</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: var(--color-warning);">${totalPending}</div>
                    <div class="stat-label">Odottaa</div>
                </div>
            </div>

            <div class="section-header" style="margin-top: var(--spacing-xl);">
                <h3 class="section-title">📊 Kampanjoiden Suorituskyky</h3>
            </div>
            <div class="card" style="cursor: default; padding: var(--spacing-lg);">
                <canvas id="campaign-performance-chart" style="max-height: 300px;"></canvas>
            </div>

            ${topCampaigns.length > 0 || topContributors.length > 0 ? `
                <div class="section-header" style="margin-top: var(--spacing-xl);">
                    <h3 class="section-title">🏆 Parhaat Suorittajat</h3>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                    ${topCampaigns.length > 0 ? `
                        <div class="card" style="cursor: default;">
                            <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-md); color: var(--text-secondary); font-size: var(--font-size-sm);">
                                🥇 Top Kampanjat
                            </div>
                            ${topCampaigns.map((c, i) => `
                                <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); padding: var(--spacing-sm); background: var(--bg-secondary); border-radius: var(--radius-md); cursor: pointer;" onclick="App.navigate('/campaign/${c.id}')">
                                    <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'};">${i + 1}</div>
                                    <div style="flex: 1;">
                                        <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${c.name}</div>
                                        <div style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${c.percent}% • ${settings.currencySymbol}${c.collected.toLocaleString()}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${topContributors.length > 0 ? `
                        <div class="card" style="cursor: default;">
                            <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-md); color: var(--text-secondary); font-size: var(--font-size-sm);">
                                💎 Top Lahjoittajat
                            </div>
                            ${topContributors.map((c, i) => `
                                <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); padding: var(--spacing-sm); background: var(--bg-secondary); border-radius: var(--radius-md);">
                                    <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'};">${i + 1}</div>
                                    <div style="flex: 1;">
                                        <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${c.name}</div>
                                        <div style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${settings.currencySymbol}${c.totalAmount.toLocaleString()} • ${c.campaignCount} olole</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            ${timeline.length > 0 ? `
                <div class="section-header" style="margin-top: var(--spacing-xl);">
                    <h3 class="section-title">📈 Jadwalka Ururinta (14 maalmood)</h3>
                </div>
                <div class="card" style="cursor: default; padding: var(--spacing-lg);">
                    <canvas id="timeline-chart" style="max-height: 250px;"></canvas>
                </div>
            ` : ''}

            ${statusBreakdown ? `
                <div class="section-header" style="margin-top: var(--spacing-xl);">
                    <h3 class="section-title">📊 Tila-jako</h3>
                </div>
                <div class="card" style="cursor: default; padding: var(--spacing-lg);">
                    <canvas id="status-chart" style="max-height: 250px;"></canvas>
                </div>
            ` : ''}

            ${recentActivity.length > 0 ? `
                <div class="section-header" style="margin-top: var(--spacing-xl);">
                    <h3 class="section-title">📋 Dhacdooyinka Ugu Dambeeyey</h3>
                </div>
                <div class="card" style="cursor: default;">
                    ${recentActivity.map(a => {
            const icon = a.type === 'payment_received' ? '💰' :
                a.type === 'campaign_created' ? '✨' :
                    a.type === 'approve_payment' ? '✅' : '📝';
            // Simple time ago strictly for display
            const timeAgo = this.getTimeAgo(new Date(a.timestamp));
            return `
                            <div style="display: flex; gap: var(--spacing-md); padding: var(--spacing-md); border-bottom: 1px solid var(--border-color);">
                                <div style="font-size: var(--font-size-xl);">${icon}</div>
                                <div style="flex: 1;">
                                    <div style="font-size: var(--font-size-sm);">${a.text}</div>
                                    <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: 2px;">${a.campaignName} • ${timeAgo}</div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            ` : ''}
            
            ${Auth.isAuthenticated() && DataLayer.hasLocalData() ? `
                <div class="section-header" style="margin-top: var(--spacing-xl);">
                    <h3 class="section-title">☁️ Isku-Dubaridka Daruuraha</h3>
                </div>
                <div class="card" style="border-left: 4px solid var(--color-primary);">
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <button class="btn btn-primary" style="flex: 1;" onclick="App.handleMigrateToCloud()" id="migrate-btn">
                            ${Icons.render('upload', 'icon icon-sm')} Gudbiso Cloud-ka
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <div class="section-header" style="margin-top: var(--spacing-xl);">
                <h3 class="section-title">Maamulka Xogta</h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                <button class="btn btn-primary btn-block" onclick="CSVExport.exportAllCampaigns(); Components.toast('Excel la soo dejiyey!', 'success');">
                    ${Icons.render('download', 'icon icon-md')} Export Dhammaan Ololaha (Excel)
                </button>
                <button class="btn btn-secondary btn-block" onclick="App.exportData()">
                    Export Data (JSON)
                </button>
                <button class="btn btn-secondary btn-block" onclick="App.importData()">
                    Import Data
                </button>
                <button class="btn btn-outline btn-block" style="color: var(--color-error); border-color: var(--color-error);" onclick="App.clearAllData()">
                    Tirtir Dhammaan Xogta
                </button>
            </div>
        `;
    },

    // Helper function for time ago
    getTimeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'hadda';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} daqiiqo ka hor`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} saac ka hor`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} maalmood ka hor`;
        return date.toLocaleDateString('so-SO');
    },

    // Initialize charts for stats dashboard
    initializeStatsCharts(performance, timeline, statusBreakdown) {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }

        // Campaign Performance Bar Chart
        const perfCanvas = document.getElementById('campaign-performance-chart');
        if (perfCanvas && performance.length > 0) {
            new Chart(perfCanvas, {
                type: 'bar',
                data: {
                    labels: performance.map(c => c.name),
                    datasets: [{
                        label: 'La ururiyey %',
                        data: performance.map(c => c.percent),
                        backgroundColor: performance.map(c =>
                            c.percent >= 75 ? '#10b981' :
                                c.percent >= 25 ? '#f59e0b' : '#ef4444'
                        ),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const campaign = performance[context.dataIndex];
                                    return `${campaign.percent}% (${DB.getSettings().currencySymbol}${campaign.collected.toLocaleString()})`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: (value) => value + '%'
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            this.navigate('/campaign/' + performance[index].id);
                        }
                    }
                }
            });
        }

        // Timeline Line Chart
        const timelineCanvas = document.getElementById('timeline-chart');
        if (timelineCanvas && timeline.length > 0) {
            new Chart(timelineCanvas, {
                type: 'line',
                data: {
                    labels: timeline.map(t => {
                        const date = new Date(t.date);
                        return date.toLocaleDateString('so-SO', { month: 'short', day: 'numeric' });
                    }),
                    datasets: [{
                        label: 'La ururiyey',
                        data: timeline.map(t => t.amount),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${DB.getSettings().currencySymbol}${context.parsed.y.toLocaleString()}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => DB.getSettings().currencySymbol + value
                            }
                        }
                    }
                }
            });
        }

        // Status Breakdown Doughnut Chart
        const statusCanvas = document.getElementById('status-chart');
        if (statusCanvas && statusBreakdown) {
            new Chart(statusCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Bixiyey', 'Sugaya', 'Diiday'],
                    datasets: [{
                        data: [
                            statusBreakdown.paid.count,
                            statusBreakdown.pending.count,
                            statusBreakdown.declined.count
                        ],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label;
                                    const count = context.parsed;
                                    const amounts = [
                                        statusBreakdown.paid.amount,
                                        statusBreakdown.pending.amount,
                                        statusBreakdown.declined.amount
                                    ];
                                    return `${label}: ${count} dad (${DB.getSettings().currencySymbol}${amounts[context.dataIndex].toLocaleString()})`;
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    viewSettings() {
        const settings = DB.getSettings();

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">⚙️</div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">Dejinta</h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">Habeyn app-ka</p>
            </div>
            
            <form id="settings-form" onsubmit="App.saveSettings(event)">
                ${Components.formGroup({
            label: 'Calaamadda Lacagta',
            name: 'currencySymbol',
            value: settings.currencySymbol,
            placeholder: '$',
            hint: 'Tusaale: $, €, £, ر.س'
        })}
                
                ${Components.formGroup({
            label: 'Lambarka Zaad ee Default',
            name: 'defaultZaad',
            value: settings.defaultZaad,
            placeholder: '252634567890',
            hint: 'Lambarka lacagaha lagu diro'
        })}
                
                <button type="submit" class="btn btn-primary btn-block btn-lg">💾 Kaydi Dejinta</button>
            </form>
            
            <div class="section-header mt-2xl">
                <h3 class="section-title">🔔 Notifications</h3>
            </div>
            
            <div class="card" style="cursor: default;">
                <div class="mb-md">
                    <div style="font-weight: var(--font-weight-semibold);" class="mb-xs">Ogeysiisyada Browser-ka</div>
                    <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">
                        Hel ogeysiis marka lacag cusub la soo sheego
                    </div>
                </div>
                
                ${Notifications.enabled ? `
                    <div class="flex flex-col gap-sm">
                        <div class="p-md" style="background: var(--color-success-bg); border-radius: var(--radius-lg); color: var(--color-success); font-size: var(--font-size-sm);">
                            ✅ Notifications waa furan yihiin
                        </div>
                        <button class="btn btn-secondary btn-block" onclick="Notifications.test()">
                            ${Icons.render('bell', 'icon icon-sm')} Tijaabi Ogeysiis
                        </button>
                        <button class="btn btn-outline btn-block" onclick="Notifications.disable(); App.handleRoute();">
                            Xir Notifications
                        </button>
                    </div>
                ` : `
                    <div class="flex flex-col gap-sm">
                        <div class="p-md" style="background: var(--bg-tertiary); border-radius: var(--radius-lg); font-size: var(--font-size-sm); color: var(--text-secondary);">
                            Notifications waa xiran yihiin
                        </div>
                        <button class="btn btn-primary btn-block" onclick="Notifications.requestPermission().then(() => App.handleRoute());">
                            ${Icons.render('bell', 'icon icon-sm')} Fur Notifications
                        </button>
                    </div>
                `}
            </div>
            
            <!-- Templates Section -->
            <div class="mt-2xl">
                ${typeof TemplateManager !== 'undefined' ? TemplateManager.renderTemplatesSection() : ''}
            </div>
            
            <!-- Export Section -->
            <div class="section-header mt-2xl">
                <h3 class="section-title">📊 Export Data</h3>
            </div>
            
            <div class="card" style="cursor: default;">
                <div class="mb-md">
                    <div style="font-weight: var(--font-weight-semibold);" class="mb-xs">Soo dejiso xogta</div>
                    <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">
                        Soo dejiso ololalaha oo dhan CSV ama Excel ahaan
                    </div>
                </div>
                
                <div class="export-btn-group">
                    <button class="export-btn" onclick="ExcelExport.exportAllCampaignsCSV()">
                        📄 CSV
                    </button>
                </div>
            </div>
            
            <!-- Cloud Sync Section -->
            <div class="section-header mt-2xl">
                <h3 class="section-title">☁️ Isku-Dubaridka Daruuraha</h3>
            </div>
            
            <div class="card" style="cursor: default;">
                <div class="mb-md">
                    <div style="font-weight: var(--font-weight-semibold);" class="mb-xs">Supabase Sync</div>
                    <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">
                        Ku keydi xogtaada daruuraha (cloud)
                    </div>
                </div>
                
                <div class="p-md" style="background: var(--bg-tertiary); border-radius: var(--radius-lg); font-size: var(--font-size-sm); color: var(--text-secondary);">
                    ${typeof Auth !== 'undefined' && Auth.isAuthenticated() ?
                '✅ Waxaad ku xiran tahay: ' + Auth.getUser()?.email :
                '⚠️ Fadlan soo gal si aad u isticmaasho cloud sync'}
                </div>
            </div>
            
            <div class="mt-2xl pt-xl" style="border-top: 1px solid var(--border-color);">
                <div class="text-center" style="color: var(--text-tertiary); font-size: var(--font-size-sm);">
                    <div class="emoji-lg mb-sm">🌙</div>
                    <div style="font-weight: var(--font-weight-semibold); color: var(--text-secondary);">OLOLEEYE</div>
                    <div>Version 2.0</div>
                    <div class="mt-xs">Ololeeynta Lacagaha ee WhatsApp</div>
                </div>
            </div>
        `;
    },

    view404() {
        return Components.emptyState(
            '🔍',
            'Lama helin',
            'Boggan lama heli karo. Fadlan dib u noqo.',
            '← Dib u noqo Guriga',
            '/'
        );
    },

    // ========================================
    // Event Handlers
    // ========================================

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        DB.saveSetting('theme', newTheme);
    },

    handleSearch(query) {
        App.searchQuery = query;
        App.handleRoute();
    },

    setFilter(filter) {
        App.activeFilter = filter;
        App.handleRoute();
    },

    setMessageFilter(filter) {
        App.activeFilter = filter;
        App.handleRoute();
    },

    async saveCampaign(event) {
        event.preventDefault();
        const form = event.target;
        const data = new FormData(form);

        const campaign = {
            id: data.get('id') || null,
            emoji: data.get('emoji'),
            name: data.get('name').trim(),
            description: data.get('description').trim(),
            goal: parseFloat(data.get('goal')) || 0,
            deadline: data.get('deadline'),
            zaadNumber: data.get('zaadNumber').trim(),
            coordinatorPin: data.get('coordinatorPin').trim()
        };

        // Validate name
        if (!campaign.name) {
            Components.toast('Fadlan geli magaca ololaha', 'error');
            return;
        }

        // Validate goal
        if (campaign.goal <= 0) {
            Components.toast('Fadlan geli hadaf sax ah', 'error');
            return;
        }

        // Validate PIN (must be exactly 4 digits)
        if (!campaign.coordinatorPin || campaign.coordinatorPin.length !== 4 || !/^\d{4}$/.test(campaign.coordinatorPin)) {
            Components.toast('PIN-ku waa inuu ahaadaa 4 lambar', 'error');
            return;
        }

        // Validate Zaad number
        if (!campaign.zaadNumber || campaign.zaadNumber.length < 9) {
            Components.toast('Fadlan geli lambar lacagta sax ah (ugu yaraan 9 lambar)', 'error');
            return;
        }

        // Validate deadline (must be in future if provided)
        if (campaign.deadline && new Date(campaign.deadline) < new Date()) {
            Components.toast('Wakhtiga waa inuu ka dambeeyo maanta', 'error');
            return;
        }

        const saved = await DataLayer.saveCampaign(campaign);
        Components.toast('Ololaha waa la keydiyey! ✓', 'success');

        setTimeout(() => {
            this.navigate('/campaign/' + saved.id);
        }, 500);
    },

    async deleteCampaign(id) {
        const campaign = await DataLayer.getCampaign(id);
        if (!campaign) return;

        if (confirm(`Ma hubtaa inaad tirtirto "${campaign.name}"?\n\nDhammaan tabarucayaasha ololahanna waa la tirtiri doonaa.`)) {
            await DataLayer.deleteCampaign(id);
            Components.toast('Ololaha waa la tirtiray', 'success');
            this.navigate('/');
        }
    },

    async saveContributor(event) {
        event.preventDefault();
        const form = event.target;
        const data = new FormData(form);

        let phone = data.get('phone').replace(/\D/g, '');
        if (phone.startsWith('0')) {
            phone = '252' + phone.substring(1);
        }
        if (!phone.startsWith('252')) {
            phone = '252' + phone;
        }

        if (phone.length < 9) {
            Components.toast('Fadlan geli lambar telefoon sax ah', 'error');
            return;
        }

        const contributor = {
            id: data.get('id') || null,
            campaignId: data.get('campaignId'),
            name: data.get('name').trim(),
            phone: phone,
            amount: parseFloat(data.get('amount')) || 0,
            status: data.get('status') || 'pending'
        };

        // Validate name
        if (!contributor.name) {
            Components.toast('Fadlan geli magaca', 'error');
            return;
        }

        // Validate amount (must be greater than 0)
        if (!contributor.amount || contributor.amount <= 0) {
            Components.toast('Fadlan geli lacag sax ah (ka weyn 0)', 'error');
            return;
        }

        // Check for duplicate phone number in same campaign
        const existing = await DataLayer.getContributorByPhone(phone, contributor.campaignId);
        if (existing && (!contributor.id || existing.id !== contributor.id)) {
            Components.toast('Lambarkaan horay ayaa loo isticmaalay ololahan', 'error');
            return;
        }

        await DataLayer.saveContributor(contributor);
        Components.toast('Tabarucaha waa la keydiyey! ✓', 'success');

        setTimeout(() => {
            this.navigate('/campaign-contributors/' + contributor.campaignId);
        }, 500);
    },

    async updateContributorStatus(id, status) {
        const contributor = await DataLayer.getContributor(id);
        if (contributor) {
            contributor.status = status;
            await DataLayer.saveContributor(contributor);

            const msg = status === 'paid' ? 'Waa la calaamadiyey bixiyey ✓' :
                status === 'declined' ? 'Waa la calaamadiyey diidey' :
                    'Waa la calaamadiyey sugaya';
            Components.toast(msg, 'success');
            this.handleRoute();
        }
    },

    async deleteContributor(id) {
        const contributor = await DataLayer.getContributor(id);
        if (contributor && confirm(`Ma hubtaa inaad tirtirto ${contributor.name}?`)) {
            const campaignId = contributor.campaignId;
            await DataLayer.deleteContributor(id);
            Components.toast('Tabarucaha waa la tirtiray', 'success');
            this.navigate('/campaign-contributors/' + campaignId);
        }
    },

    // ========================================
    // WhatsApp Functions
    // ========================================

    async openWhatsAppQuick(contributorId) {
        const contributor = await DataLayer.getContributor(contributorId);
        if (!contributor) return;
        const campaign = await DataLayer.getCampaign(contributor.campaignId);
        const template = DataLayer.getTemplate(contributor.status === 'paid' ? 'thank_you' : 'reminder');
        const settings = DataLayer.getSettings();
        const stats = await DataLayer.getCampaignStats(campaign.id);

        const variables = {
            name: contributor.name.split(' ')[0],
            campaign_name: campaign.name,
            amount: `${settings.currencySymbol}${contributor.amount}`,
            goal: `${settings.currencySymbol}${campaign.goal}`,
            collected: `${settings.currencySymbol}${stats.collected}`,
            percent: `${stats.percent}%`,
            zaad_number: campaign.zaadNumber || settings.defaultZaad
        };

        const message = WhatsApp.generateMessage(template.type, variables);
        WhatsApp.openChat(contributor.phone, message);
        // DB.logAction(campaign.id, 'whatsapp_sent', `Quick WhatsApp ${template.type} to ${contributor.name}`);
        Components.toast('WhatsApp waa la furay', 'success');
    },

    async sendWhatsAppMessage(contributorId, templateType) {
        const contributor = await DataLayer.getContributor(contributorId);
        if (!contributor) return;

        const campaign = await DataLayer.getCampaign(contributor.campaignId);
        const stats = await DataLayer.getCampaignStats(contributor.campaignId);
        const settings = DataLayer.getSettings();

        const variables = {
            name: contributor.name.split(' ')[0],
            campaign_name: campaign?.name || '',
            goal: `${settings.currencySymbol}${campaign?.goal || 0}`,
            amount: `${settings.currencySymbol}${contributor.amount || 0}`,
            collected: `${settings.currencySymbol}${stats.collected}`,
            percent: `${stats.percent}`,
            target_per_person: contributor.amount ? `Waxaa lagu filayaa: ${settings.currencySymbol}${contributor.amount}` : '',
            zaad_number: campaign?.zaadNumber || settings.defaultZaad,
            paid_count: stats.paidCount
        };

        const message = WhatsApp.generateMessage(templateType, variables);
        WhatsApp.openChat(contributor.phone, message);

        Components.toast('WhatsApp waa la furay', 'success');
    },

    async renderSuggestedActions(campaignId) {
        const actions = await DataLayer.getSuggestedActions(campaignId);
        if (!actions.length) return '';

        return `
            <div style="margin-bottom: var(--spacing-xl);">
                <div class="section-header">
                    <h3 class="section-title">Fiiro gaar ah</h3>
                </div>
                ${actions.map(action => `
                    <div class="card" style="border-left: 4px solid var(--color-primary); background: var(--bg-secondary);">
                        <div style="display: flex; align-items: flex-start; gap: var(--spacing-md);">
                            <div class="flex-1">
                                <div style="font-weight: var(--font-weight-bold); margin-bottom: 4px;">${action.title}</div>
                                <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: var(--spacing-md);">${action.text}</div>
                                <button class="btn btn-primary btn-sm" onclick="App.navigate('${action.route}')">
                                    ${action.btnText}
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    showMessagePreview(campaignId, templateType) {
        const messages = WhatsApp.generateBulkMessages(campaignId, templateType, this.activeFilter);

        if (!messages.length) {
            Components.toast('Ma jiro qof la doortay', 'warning');
            return;
        }

        const body = `
            <div style="margin-bottom: var(--spacing-lg); text-align: center;">
                <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">${messages.length}</div>
                <div style="color: var(--text-secondary);">qof ayaa la diri doonaa fariinta</div>
            </div>
            
            <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--spacing-md);">Tusaale fariinta:</div>
            
            ${messages.slice(0, 2).map(m => Components.messagePreviewCard(m.contributor, m.message, m.link)).join('')}
            
            ${messages.length > 2 ? `
                <div style="text-align: center; color: var(--text-tertiary); padding: var(--spacing-lg); font-size: var(--font-size-sm);">
                    + ${messages.length - 2} qof kale...
                </div>
            ` : ''}
            
            <div style="background: var(--bg-tertiary); padding: var(--spacing-md); border-radius: var(--radius-lg); margin-top: var(--spacing-lg);">
                <div style="font-size: var(--font-size-sm); color: var(--text-secondary); text-align: center;">
                    💡 Guji midkood WhatsApp si aad ugu dirto fariinta
                </div>
            </div>
        `;

        Components.showModal(`Dir ${messages.length} Fariin`, body, '');
    },

    editTemplate(type) {
        const template = DB.getTemplate(type);
        if (!template) return;

        Components.showModal('Wax ka bedel Template', Components.templateEditor(template), '');
    },

    saveTemplate(event) {
        event.preventDefault();
        const data = new FormData(event.target);

        const name = data.get('name').trim();
        const text = data.get('text').trim();

        // Validate name
        if (!name) {
            Components.toast('Fadlan geli magaca template-ka', 'error');
            return;
        }

        // Validate text content
        if (!text) {
            Components.toast('Fadlan geli qoraalka template-ka', 'error');
            return;
        }

        const existingTemplate = DB.getTemplate(data.get('type'));
        const template = {
            ...existingTemplate,
            name: name,
            text: text
        };

        DB.saveTemplate(template);
        Components.closeModal();
        Components.toast('Template waa la keydiyey! ✓', 'success');
        this.handleRoute();
    },

    saveSettings(event) {
        event.preventDefault();
        const data = new FormData(event.target);

        const currencySymbol = data.get('currencySymbol').trim();
        const defaultZaad = data.get('defaultZaad').trim();

        // Validate currency symbol
        if (!currencySymbol) {
            Components.toast('Fadlan geli calaamadda lacagta', 'error');
            return;
        }

        // Validate default Zaad number
        if (!defaultZaad || defaultZaad.length < 9) {
            Components.toast('Fadlan geli lambar sax ah (ugu yaraan 9 lambar)', 'error');
            return;
        }

        DB.saveSetting('currencySymbol', currencySymbol);
        DB.saveSetting('defaultZaad', defaultZaad);

        Components.toast('Dejinta waa la keydiyey! ✓', 'success');
    },

    exportData() {
        const data = DB.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ururin-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
        Components.toast('Data waa la soo dejiyey! 📤', 'success');
    },

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    DB.importAll(data);
                    Components.toast('Data waa la soo galiyey! 📥', 'success');
                    setTimeout(() => this.handleRoute(), 500);
                } catch (err) {
                    Components.toast('Khalad: File-ka ma ahan sax', 'error');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    },

    clearAllData() {
        if (confirm('MA HUBTAA?\n\nTani waxay tirtiri doontaa dhammaan:\n- Ololaha\n- Tabarucayaasha\n- Dejinta\n\nTani dibna lagama soo celin karo!')) {
            if (confirm('Haddana ma hubtaa? Fadlan hubi.')) {
                DB.clearAll();
                Components.toast('Dhammaan xogta waa la tirtiray', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        }
    },

    // ========================================
    // Self-Report (Bixin) Views
    // ========================================

    viewBixin() {
        const settings = DB.getSettings();

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">💰</div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">Ilmo Bixin</h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">Soo sheeg bixintaada si aan u xaqiijino</p>
            </div>
            
            <form id="bixin-form" onsubmit="App.submitBixin(event)">
                ${Components.formGroup({
            label: 'Magacaaga Buuxa',
            name: 'name',
            placeholder: 'Tusaale: Axmed Cali Xasan',
            required: true
        })}
                
                ${Components.formGroup({
            label: 'Lambarka Ururinta',
            name: 'campaignCode',
            placeholder: 'Tusaale: 4729',
            required: true,
            hint: 'Lambarka ay ku siiyeen maamulaha'
        })}
                
                ${Components.formGroup({
            label: `Lacagta Aad Bixisay (${settings.currencySymbol})`,
            name: 'amount',
            type: 'number',
            placeholder: '50',
            required: true
        })}
                
                ${Components.formGroup({
            label: 'Habka Lacag Bixinta',
            name: 'method',
            type: 'select',
            required: true,
            options: [
                { value: '', label: '-- Dooro habka --' },
                { value: 'EVC', label: 'EVC Plus (Hormuud)' },
                { value: 'Zaad', label: 'Zaad (Telesom)' },
                { value: 'eDahab', label: 'eDahab (Dahabshiil)' },
                { value: 'Bank', label: 'Bank Transfer' },
                { value: 'Cash', label: 'Lacag Caddaan ah' }
            ]
        })}
                
                <div class="form-group">
                    <label class="form-label">Caddeyn (Ikhtiyaari)</label>
                    <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                        <button type="button" class="btn btn-secondary flex-1" onclick="App.toggleProofType('image')">
                            📷 Sawir
                        </button>
                        <button type="button" class="btn btn-secondary flex-1" onclick="App.toggleProofType('text')">
                            📝 Qoraal
                        </button>
                    </div>
                    
                    <div id="proof-image-section" style="display: none;">
                        <input type="file" id="proof-image" name="proofImage" accept="image/*" 
                               onchange="App.handleProofImage(this)" style="display: none;">
                        <button type="button" class="btn btn-outline btn-block" onclick="document.getElementById('proof-image').click()">
                            📤 Soo geli sawir
                        </button>
                        <div id="proof-image-preview" style="margin-top: var(--spacing-sm);"></div>
                    </div>
                    
                    <div id="proof-text-section" style="display: none;">
                        <textarea class="form-textarea" name="proofText" 
                                  placeholder="Ku dheji halkan fariinta SMS/WhatsApp ee lacag bixinta..."
                                  rows="4" oninput="App.handleProofText(this.value)"></textarea>
                    </div>
                    
                    <div id="system-read" style="display: none; margin-top: var(--spacing-sm); padding: var(--spacing-md); background: var(--color-primary-subtle); border-radius: var(--radius-md);">
                        <div style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-bottom: var(--spacing-xs);">🤖 System Read:</div>
                        <div id="system-read-content"></div>
                    </div>
                    
                    <div class="form-hint">Sawir ama qoraal ka dheji fariinta lacag bixinta (SMS/WhatsApp)</div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block btn-lg mt-lg">
                    ✅ Dir Ilmo Bixinta
                </button>
            </form>
        `;
    },

    viewBixinSuccess() {
        return `
            <div style="text-align: center; padding: var(--spacing-2xl) var(--spacing-lg);">
                <div style="font-size: 72px; margin-bottom: var(--spacing-lg);">✅</div>
                <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin-bottom: var(--spacing-md); color: var(--color-success);">
                    Waad mahadsan tahay!
                </h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-lg); margin-bottom: var(--spacing-lg);">
                    Ilmo-bixintaada waa la helay.
                </p>
                
                <div style="display: inline-flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-md) var(--spacing-lg); background: var(--color-warning-bg); border-radius: var(--radius-lg); margin-bottom: var(--spacing-xl);">
                    <span class="emoji-lg">🟡</span>
                    <div style="text-align: left;">
                        <div style="font-weight: var(--font-weight-semibold); color: var(--color-warning);">Xaalada: Sugaya Xaqiijin</div>
                        <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">Maamulaha ayaa xaqiijin doona</div>
                    </div>
                </div>
                
                <p style="color: var(--text-tertiary); font-size: var(--font-size-sm); max-width: 280px; margin: 0 auto var(--spacing-xl);">
                    Ma laha inaad wax sameyso. Maamulaha ayaa kula soo xiriiri doona haddii loo baahdo.
                </p>
                
                <button class="btn btn-secondary" onclick="App.navigate('/bixin')">
                    ← Dir mid kale
                </button>
            </div>
        `;
    },

    viewPendingPayments() {
        const pendingPayments = DB.getPendingPayments();
        const settings = DB.getSettings();

        if (!pendingPayments.length) {
            return Components.emptyState(
                '✅',
                'Ma jiro ilmo sugaya',
                'Dhammaan ilmo-bixinaha ayaa la xaqiijiyey.',
                '← Dib u noqo',
                '/'
            );
        }

        return `
            <div class="section-header">
                <div>
                    <h2 class="section-title">🟡 Ilmo Bixin Sugaya</h2>
                    <span style="color: var(--text-tertiary);">${pendingPayments.length} ayaa la soo sheegay</span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="App.confirmAllPayments()">
                    ✅ Runta ka wada dhig
                </button>
            </div>
            
            ${pendingPayments.map(payment => {
            const campaign = DB.getCampaign(payment.campaignId);
            const systemRead = payment.systemRead || {};

            return `
                    <div class="card" style="cursor: default; border-left: 4px solid var(--color-warning);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md);">
                            <div>
                                <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-lg);">${payment.name}</div>
                                <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">
                                    ${campaign ? `${campaign.emoji} ${campaign.name}` : 'Unknown campaign'} 
                                    <span style="color: var(--text-tertiary);">(#${payment.campaignCode})</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">
                                    ${settings.currencySymbol}${payment.amount}
                                </div>
                                <div class="badge badge-warning">${payment.method}</div>
                            </div>
                        </div>
                        
                        ${payment.proofText ? `
                            <div style="margin-bottom: var(--spacing-md);">
                                <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-bottom: var(--spacing-xs);">📝 Qoraalka Caddeynta:</div>
                                <div class="message-preview-text" style="font-size: var(--font-size-sm);">${payment.proofText}</div>
                            </div>
                        ` : ''}
                        
                        ${payment.proofImage ? `
                            <div style="margin-bottom: var(--spacing-md);">
                                <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-bottom: var(--spacing-xs);">📷 Sawirka Caddeynta:</div>
                                <img src="${payment.proofImage}" style="max-width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-color);" onclick="window.open('${payment.proofImage}', '_blank')">
                            </div>
                        ` : ''}
                        
                        ${(systemRead.amount || systemRead.method || systemRead.account) ? `
                            <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-primary-subtle); border-radius: var(--radius-md);">
                                <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-bottom: var(--spacing-xs);">🤖 System Read:</div>
                                <div style="font-size: var(--font-size-sm);">
                                    ${systemRead.amount ? `<div>Lacag: <strong>${settings.currencySymbol}${systemRead.amount}</strong> ${systemRead.amount == payment.amount ? '✓' : '⚠️'}</div>` : ''}
                                    ${systemRead.method ? `<div>Habka: <strong>${systemRead.method}</strong></div>` : ''}
                                    ${systemRead.account ? `<div>Account: <strong>${systemRead.account}</strong></div>` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-bottom: var(--spacing-md);">
                            ${new Date(payment.createdAt).toLocaleString('so-SO')}
                        </div>
                        
                        <div class="flex gap-sm">
                            <button class="btn btn-primary flex-1" onclick="App.approvePayment('${payment.id}')">
                                ✅ Aqbal
                            </button>
                            <button class="btn btn-outline" style="flex: 1; color: var(--color-error); border-color: var(--color-error);" onclick="App.rejectPayment('${payment.id}')">
                                ❌ Diid
                            </button>
                        </div>
                    </div>
                `;
        }).join('')}
        `;
    },

    // ========================================
    // Self-Report Handlers
    // ========================================

    toggleProofType(type) {
        const imageSection = document.getElementById('proof-image-section');
        const textSection = document.getElementById('proof-text-section');

        if (type === 'image') {
            imageSection.style.display = imageSection.style.display === 'none' ? 'block' : 'none';
            textSection.style.display = 'none';
        } else {
            textSection.style.display = textSection.style.display === 'none' ? 'block' : 'none';
            imageSection.style.display = 'none';
        }
    },

    handleProofImage(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            document.getElementById('proof-image-preview').innerHTML = `
                <img src="${dataUrl}" style="max-width: 100%; max-height: 200px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            `;

            // Store for form submission
            this.currentProofImage = dataUrl;

            // Try OCR if available
            this.runOCR(dataUrl);
        };
        reader.readAsDataURL(file);
    },

    async runOCR(imageDataUrl) {
        const systemReadDiv = document.getElementById('system-read');
        const contentDiv = document.getElementById('system-read-content');

        systemReadDiv.style.display = 'block';
        contentDiv.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div> Analyzing...';

        const result = await ProofParser.parseImage(imageDataUrl);
        this.currentSystemRead = result;

        if (result.amount || result.method || result.account) {
            contentDiv.innerHTML = `
                ${result.amount ? `<div>Lacag: <strong>$${result.amount}</strong></div>` : ''}
                ${result.method ? `<div>Habka: <strong>${result.method}</strong></div>` : ''}
                ${result.account ? `<div>Account: <strong>${result.account}</strong></div>` : ''}
            `;
        } else {
            contentDiv.innerHTML = '<div style="color: var(--text-tertiary);">Ma la aqrin karin - maamulaha ayaa eegi doona</div>';
        }
    },

    handleProofText(text) {
        if (!text || text.length < 10) {
            document.getElementById('system-read').style.display = 'none';
            return;
        }

        const result = ProofParser.parseText(text);
        this.currentSystemRead = result;

        const systemReadDiv = document.getElementById('system-read');
        const contentDiv = document.getElementById('system-read-content');

        if (result.amount || result.method || result.account) {
            systemReadDiv.style.display = 'block';
            contentDiv.innerHTML = `
                ${result.amount ? `<div>Lacag: <strong>$${result.amount}</strong></div>` : ''}
                ${result.method ? `<div>Habka: <strong>${result.method}</strong></div>` : ''}
                ${result.account ? `<div>Account: <strong>${result.account}</strong></div>` : ''}
            `;
        } else {
            systemReadDiv.style.display = 'none';
        }
    },

    submitBixin(event) {
        event.preventDefault();
        const form = event.target;
        const data = new FormData(form);

        const campaignCode = data.get('campaignCode').trim();
        const campaign = DB.getCampaignByCode(campaignCode);

        if (!campaign) {
            Components.toast('Lambarka ururinta lama helin', 'error');
            return;
        }

        const name = data.get('name').trim();
        if (!name) {
            Components.toast('Fadlan geli magacaaga', 'error');
            return;
        }

        const amount = parseFloat(data.get('amount'));
        if (!amount || amount <= 0) {
            Components.toast('Fadlan geli lacag sax ah', 'error');
            return;
        }

        const method = data.get('method');
        if (!method) {
            Components.toast('Fadlan dooro habka lacag bixinta', 'error');
            return;
        }

        const payment = {
            name: name,
            amount: amount,
            campaignId: campaign.id,
            campaignCode: campaignCode,
            method: method,
            proofImage: this.currentProofImage || null,
            proofText: data.get('proofText') || null,
            systemRead: this.currentSystemRead || null,
            status: 'pending'
        };

        DB.savePayment(payment);

        // Clear stored data
        this.currentProofImage = null;
        this.currentSystemRead = null;

        this.navigate('/bixin-success');
    },

    approvePayment(paymentId) {
        if (confirm('Ma hubtaa inaad aqbasho ilmo-bixintan?')) {
            DB.approvePayment(paymentId);
            Components.toast('Waa la aqbalay ✅', 'success');
            this.handleRoute();
        }
    },

    rejectPayment(paymentId) {
        if (confirm('Ma hubtaa inaad diido ilmo-bixintan?')) {
            DB.rejectPayment(paymentId);
            Components.toast('Waa la diidey ❌', 'success');
            this.handleRoute();
        }
    },

    confirmAllPayments() {
        if (confirm(`Ma hubtaa inaad hal mar xaqiijiso dhammaan ${DB.getPendingPayments().length} ilmo-bixinood?`)) {
            const count = DB.approveAllPayments();
            Components.toast(`${count} ilmo-bixinood ayaa la xaqiijiyey! ✅`, 'success');
            this.handleRoute();
        }
    },

    // ========================================
    // PUBLIC JOIN FLOW (/join?c=XXXX)
    // ========================================

    viewJoin(campaignCode) {
        // Enable public mode for minimal UI
        document.body.classList.add('public-mode');

        if (!campaignCode) {
            return `
                <div class="public-status">
                    <div class="public-status-text">Fadlan isticmaal linkiga saxda ah ee maamulaha ku siiyey.</div>
                </div>
            `;
        }

        const campaign = DB.getCampaignByCode(campaignCode);
        if (!campaign) {
            return `
                <div class="public-status">
                    <div class="public-status-text">Lambarka "${campaignCode}" lama aqoonsanin.</div>
                </div>
            `;
        }

        const stats = DB.getCampaignStats(campaign.id);
        const settings = DB.getSettings();
        const remaining = stats.goal - stats.collected;

        // Store campaign code for later
        this.currentJoinCampaign = campaign;

        return `
            <button class="public-back" onclick="App.navigate('/')">
                <span class="public-back-icon">←</span> Guriga
            </button>
            
            <div class="public-title">${campaign.name}</div>
            
            ${campaign.description ? `
                <div class="public-purpose-label">Ujeeddo</div>
                <div class="public-purpose">${campaign.description}</div>
            ` : ''}
            
            <div class="public-progress">
                <div class="public-progress-bar">
                    <div class="public-progress-fill" style="width: ${stats.percent}%"></div>
                </div>
                <div class="public-progress-text">
                    <span><strong>${settings.currencySymbol}${stats.collected.toLocaleString()}</strong> ururiyey</span>
                    <span>•</span>
                    <span><strong>${settings.currencySymbol}${remaining.toLocaleString()}</strong> ka dhiman</span>
                    ${campaign.deadline ? `<span>• ⏳ ${Math.max(0, Math.ceil((new Date(campaign.deadline) - new Date()) / (1000 * 60 * 60 * 24)))} maalmood</span>` : ''}
                </div>
            </div>
            
            <div class="public-divider"></div>
            
            <form id="join-form" onsubmit="App.submitJoin(event)">
                <input type="hidden" name="campaignId" value="${campaign.id}">
                <input type="hidden" name="campaignCode" value="${campaignCode}">
                
                <div class="public-field">
                    <div class="public-field-label">
                        <span class="icon">📱</span> Lambarka taleefanka
                    </div>
                    <div class="public-phone-group">
                        <span class="public-phone-prefix">+252</span>
                        <input type="tel" class="public-input public-phone-input" name="phone" 
                               placeholder="63 1234567" required inputmode="tel">
                    </div>
                </div>
                
                <div class="public-field">
                    <div class="public-field-label">
                        <span class="icon">👤</span> Magacaaga
                    </div>
                    <input type="text" class="public-input" name="name" placeholder="Axmed Cali" required>
                </div>
                
                <div class="public-field">
                    <div class="public-field-label">
                        <span class="icon">💵</span> Lacagta aad ballan qaaday
                    </div>
                    <div class="public-amount-grid">
                        <button type="button" class="public-amount-btn" data-amount="50" onclick="App.selectPublicAmount(50)">${settings.currencySymbol}50</button>
                        <button type="button" class="public-amount-btn" data-amount="100" onclick="App.selectPublicAmount(100)">${settings.currencySymbol}100</button>
                        <button type="button" class="public-amount-btn" data-amount="200" onclick="App.selectPublicAmount(200)">${settings.currencySymbol}200</button>
                    </div>
                    <input type="number" class="public-input public-amount-other" name="amount" id="join-amount" 
                           placeholder="Muu ___" min="1" required>
                </div>
                
                <button type="submit" class="public-submit">KU DAR LIISKA</button>
            </form>
        `;
    },

    selectPublicAmount(amount) {
        document.getElementById('join-amount').value = amount;
        document.querySelectorAll('.public-amount-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.amount == amount);
        });
    },

    submitJoin(event) {
        event.preventDefault();

        try {
            const form = event.target;
            const data = new FormData(form);

            let phone = data.get('phone').replace(/\D/g, '');
            if (phone.startsWith('0')) phone = '252' + phone.substring(1);
            if (!phone.startsWith('252')) phone = '252' + phone;

            if (phone.length < 9) {
                Components.toast('Fadlan geli lambar telefoon sax ah', 'error');
                return;
            }

            const campaignId = data.get('campaignId');
            const campaignCode = data.get('campaignCode');

            // Check if user already exists for this campaign
            const existing = DB.getContributorByPhone(phone, campaignId);
            if (existing) {
                // Redirect to confirm payment page
                this.existingContributor = existing;
                this.navigate(`/confirm-payment?c=${campaignCode}`);
                return;
            }

            const name = data.get('name').trim();
            if (!name) {
                Components.toast('Fadlan geli magacaaga', 'error');
                return;
            }

            const amount = parseFloat(data.get('amount'));
            if (!amount || amount <= 0) {
                Components.toast('Fadlan geli lacag', 'error');
                return;
            }

            // Save as new contributor with "pending" status
            const contributor = {
                campaignId: campaignId,
                name: name,
                phone: phone,
                amount: amount,
                status: 'pending' // Ballan qaaday - waiting for payment
            };

            DB.saveContributor(contributor);
            Components.toast('Waad ku dartay liiska! ✅', 'success');

            // Automatically send confirmation message to contributor via WhatsApp
            const campaign = DB.getCampaign(campaignId);
            const message = WhatsApp.generateConfirmationMessage(contributor, campaign);
            WhatsApp.openChat(phone, message);

            this.navigate('/join-success');
        } catch (error) {
            console.error('Error in submitJoin:', error);
            Components.toast('Waan ka xunnahay, qalad ayaa dhacay.', 'error');
        }
    },

    viewJoinSuccess() {
        document.body.classList.add('public-mode');
        const campaign = this.currentJoinCampaign;

        // Trigger celebration!
        setTimeout(() => this.triggerConfetti(), 300);
        const settings = DB.getSettings();

        return `
            <div class="public-status">
                <div class="public-status-title">Waad ku darsantay ololaha.</div>
                
                <div class="public-status-text">Xaaladdaada:</div>
                <div class="public-status-badge">⏳ Sugaya bixin</div>
            </div>
            
            ${campaign ? `
                <div class="public-payment-info">
                    <div class="public-payment-label">Lacagta u dir</div>
                    <div class="public-payment-number">📱 ${campaign.zaadNumber || settings.defaultZaad}</div>
                </div>
            ` : ''}
            
            <div class="text-center mt-2xl">
                <button class="public-back" onclick="App.navigate('/')" style="margin: 0 auto;">
                    <span class="public-back-icon">←</span> Guriga
                </button>
            </div>
        `;
    },

    viewConfirmPayment(campaignCode) {
        document.body.classList.add('public-mode');
        const campaign = DB.getCampaignByCode(campaignCode);
        if (!campaign) return this.view404();

        // Check if phone parameter is in URL
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const phoneParam = urlParams.get('phone');

        let contributor = this.existingContributor;

        // If phone parameter exists and no existing contributor, try to find by phone
        if (phoneParam && !contributor) {
            const decodedPhone = decodeURIComponent(phoneParam);
            contributor = DB.getContributorByPhone(decodedPhone, campaign.id);
            if (contributor) {
                this.existingContributor = contributor;
            }
        }

        const settings = DB.getSettings();

        if (!contributor) {
            return `
                <button class="public-back" onclick="App.navigate('/')">
                    <span class="public-back-icon">←</span> Guriga
                </button>
                
                <div class="public-field" style="margin-top: var(--spacing-xl);">
                    <div class="public-field-label">
                        <span class="icon">📱</span> Lambarka taleefankaaga
                    </div>
                    <form id="check-phone-form" onsubmit="App.checkPhone(event, '${campaignCode}')">
                        <div class="public-phone-group">
                            <span class="public-phone-prefix">+252</span>
                            <input type="tel" class="public-input public-phone-input" name="phone" 
                                   placeholder="63 1234567" required inputmode="tel">
                        </div>
                        <button type="submit" class="public-submit">Sii wad</button>
                    </form>
                </div>
            `;
        }

        const isPending = contributor.status === 'pending';
        const firstName = contributor.name.split(' ')[0];

        if (!isPending) {
            // Already paid
            return `
                <div class="public-status">
                    <div class="public-status-title">Waad mahadsan tahay 🤲</div>
                    <div class="public-status-text">Xaaladda:</div>
                    <div class="public-status-badge">✓ Bixintaada waa la helay</div>
                </div>
                
                <div class="text-center mt-2xl">
                    <button class="public-back" onclick="App.navigate('/')" style="margin: 0 auto;">
                        <span class="public-back-icon">←</span> Guriga
                    </button>
                </div>
            `;
        }

        return `
            <button class="public-back" onclick="App.navigate('/')">
                <span class="public-back-icon">←</span> Guriga
            </button>
            
            <div class="public-welcome">
                <span class="public-welcome-name">Salaan ${firstName}</span>
                <span class="public-welcome-wave">👋</span>
            </div>
            
            <div class="public-status">
                <div class="public-status-text">Xaaladdaada:</div>
                <div class="public-status-badge">⏳ Sugaya bixin</div>
            </div>
            
            <div class="public-confirm-amount">
                <div class="public-confirm-amount-value">${settings.currencySymbol}${contributor.amount}</div>
            </div>
            
            <div class="public-question">
                <div class="public-question-text">Ma bixisay hadda?</div>
                <div class="public-question-buttons">
                    <button class="public-question-btn public-question-btn-yes" onclick="App.confirmPaid('${contributor.id}')">
                        Haa, waan bixiyey
                    </button>
                    <button class="public-question-btn public-question-btn-no" onclick="App.navigate('/join-success')">
                        Maya
                    </button>
                </div>
            </div>
            
            <div class="public-payment-info">
                <div class="public-payment-label">Lacagta u dir</div>
                <div class="public-payment-number">📱 ${campaign.zaadNumber || settings.defaultZaad}</div>
            </div>
        `;
    },

    checkPhone(event, campaignCode) {
        event.preventDefault();
        const data = new FormData(event.target);
        let phone = data.get('phone').replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '252' + phone.substring(1);
        if (!phone.startsWith('252')) phone = '252' + phone;

        const campaign = DB.getCampaignByCode(campaignCode);
        if (!campaign) {
            Components.toast('Olole lama helin', 'error');
            return;
        }

        const contributor = DB.getContributorByPhone(phone, campaign.id);
        if (contributor) {
            this.existingContributor = contributor;
            this.handleRoute();
        } else {
            // New user - go to join
            this.navigate(`/join?c=${campaignCode}`);
        }
    },

    confirmPaid(contributorId) {
        const contributor = DB.getContributor(contributorId);
        if (!contributor) return;

        // Update status to awaiting confirmation
        contributor.status = 'pending'; // Keep pending until coordinator approves
        contributor.paymentReportedAt = new Date().toISOString();
        DB.saveContributor(contributor);

        // Create a payment record for coordinator review
        const campaign = DB.getCampaign(contributor.campaignId);
        const payment = {
            name: contributor.name,
            amount: contributor.amount,
            campaignId: contributor.campaignId,
            campaignCode: campaign?.code,
            method: 'Self-reported',
            contributorId: contributorId,
            status: 'pending'
        };
        DB.savePayment(payment);

        // Trigger browser notification for coordinator
        if (Notifications.enabled) {
            Notifications.notifyNewPayment(contributor.name, contributor.amount, campaign.name);
        }

        Components.toast('Mahadsanid! Maamulaha ayaa xaqiijin doona.', 'success');
        this.existingContributor = { ...contributor, status: 'pending' };
        this.handleRoute();
    },

    // ========================================
    // COORDINATOR TOOLS
    // ========================================

    viewReminders(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) return this.view404();

        const pendingContributors = DB.getContributors(campaignId).filter(c => c.status === 'pending');
        const settings = DB.getSettings();

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">📩</div>
                <h1 style="font-size: var(--font-size-xl);">Xasuusinta</h1>
                <p style="color: var(--text-secondary);">${campaign.emoji} ${campaign.name}</p>
            </div>

            ${pendingContributors.length === 0 ? `
                <div class="empty-state">
                    <div style="font-size: 48px;">✅</div>
                    <div style="color: var(--color-success);">Dhammaan waa la bixiyey!</div>
                </div>
            ` : `
                <div class="section-header">
                    <h3 class="section-title">⏳ ${pendingContributors.length} qof wali sugaya</h3>
                </div>

                ${pendingContributors.map(c => {
            const message = WhatsApp.generateReminder(c, campaign);
            const link = WhatsApp.createLink(c.phone, message);

            return `
                        <div class="card" style="cursor: default;">
                            <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                                <div class="contributor-avatar">${c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                                <div class="flex-1">
                                    <div style="font-weight: var(--font-weight-semibold);">${c.name}</div>
                                    <div style="font-size: var(--font-size-sm); color: var(--text-tertiary);">${settings.currencySymbol}${c.amount}</div>
                                </div>
                                <a href="${link}" target="_blank" class="btn btn-whatsapp">
                                    📩 Xasuusi
                                </a>
                            </div>
                        </div>
                    `;
        }).join('')}
            `}

            <div class="section-header" style="margin-top: var(--spacing-xl);">
                <h3 class="section-title">📢 Fariinta Kooxda</h3>
            </div>
            <div class="card" style="cursor: default;">
                <div class="message-preview-text" style="font-size: var(--font-size-sm); white-space: pre-wrap;">${WhatsApp.generateGroupUpdate(campaign)}</div>
                <button class="btn btn-secondary btn-block mt-md" onclick="App.copyGroupUpdate('${campaignId}')">
                    📋 Koobiya fariinta
                </button>
            </div>
        `;
    },

    copyGroupUpdate(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        const message = WhatsApp.generateGroupUpdate(campaign);
        navigator.clipboard.writeText(message);
        Components.toast('Fariintii waa la koobiyey! 📋', 'success');
    },

    copyDetailedList(campaignId) {
        const message = WhatsApp.generateDetailedList(campaignId);
        navigator.clipboard.writeText(message);
        Components.toast('Liiska faahfaahisan waa la koobiyey! 📋', 'success');
        DB.logAction(campaignId, 'copy_detailed_list', 'Copied detailed contributor list to clipboard');
    },

    viewShare(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) return this.view404();

        const joinLink = WhatsApp.getJoinLink(campaign.code);
        const announcement = WhatsApp.generateAnnouncement(campaign);

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">🔗</div>
                <h1 style="font-size: var(--font-size-xl);">Wadaag Linkiga</h1>
                <p style="color: var(--text-secondary);">${campaign.emoji} ${campaign.name}</p>
            </div>

            <div class="card" style="cursor: default;">
                <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--spacing-sm);">Linkiga ka qayb qaadashada:</div>
                <div style="display: flex; gap: var(--spacing-sm); align-items: center; background: var(--bg-tertiary); padding: var(--spacing-md); border-radius: var(--radius-lg); margin-bottom: var(--spacing-md);">
                    <code style="flex: 1; font-size: var(--font-size-sm); word-break: break-all;">${joinLink}</code>
                </div>
                <button class="btn btn-primary btn-block" onclick="App.copyLink('${joinLink}')">
                    📋 Koobiya linkiga
                </button>
            </div>

            <div class="section-header" style="margin-top: var(--spacing-xl);">
                <h3 class="section-title">📊 Liiska Faahfaahsan</h3>
            </div>
            <div class="card" style="cursor: default;">
                <div class="message-preview-text" style="font-size: var(--font-size-sm); white-space: pre-wrap; max-height: 200px; overflow-y: auto;">${WhatsApp.generateDetailedList(campaignId)}</div>
                <button class="btn btn-secondary btn-block mt-md" onclick="App.copyDetailedList('${campaignId}')">
                    📋 Koobiya liiska
                </button>
            </div>
        `;
    },

    copyLink(link) {
        navigator.clipboard.writeText(link);
        Components.toast('Linkiga waa la koobiyey! 📋', 'success');
    },

    copyJoinLink(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) return;
        const link = WhatsApp.getJoinLink(campaign.code);
        navigator.clipboard.writeText(link);
        Components.toast('Join-linkiga waa la koobiyey! 📋', 'success');
        DB.logAction(campaignId, 'copy_join_link', 'Copied join link to clipboard');
    },

    copyAnnouncement(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        const message = WhatsApp.generateAnnouncement(campaign);
        navigator.clipboard.writeText(message);
        Components.toast('Fariintii waa la koobiyey! 📋', 'success');
        DB.logAction(campaignId, 'copy_announcement', 'Copying announcement message to clipboard');
    },

    viewAuth(id) {
        const campaign = DB.getCampaign(id);
        if (!campaign) return this.view404();

        return `
            <div class="text-center mb-xl">
                <div class="emoji-hero mb-md">🔒</div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">PIN-ka Maaraynta</h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${campaign.emoji} ${campaign.name}</p>
                <p style="color: var(--text-tertiary); font-size: var(--font-size-xs); margin-top: var(--spacing-sm);">Fadlan geli PIN-ka si aad u maareyso ololaha.</p>
            </div>
            
            <form onsubmit="App.handleAuth(event, '${id}')">
                <div class="form-group">
                    <input type="password" name="pin" class="form-input" 
                           placeholder="****" maxlength="4" required autofocus
                           style="text-align: center; font-size: 32px; letter-spacing: 0.5em; height: 72px;">
                </div>
                <button type="submit" class="btn btn-primary btn-block btn-lg mt-lg">🔓 Gal Maaraynta</button>
                <button type="button" class="btn btn-ghost btn-block mt-md" onclick="history.back()">Dib u noqo</button>
            </form>
        `;
    },

    handleAuth(e, id) {
        e.preventDefault();
        const pin = e.target.pin.value;
        if (DB.verifyPin(id, pin)) {
            this.sessions[id] = true;
            this.handleRoute(); // Refresh current route
            Components.toast('Si guul leh ayaad u gashay!', 'success');
            DB.logAction(id, 'login', 'Successfully logged into coordination dashboard');
        } else {
            Components.toast('PIN-ku waa khalad!', 'error');
            e.target.pin.value = '';
            DB.logAction(id, 'login_failed', 'Failed login attempt');
        }
    },

    viewLogs(campaignId) {
        const logs = DB.getLogs(campaignId);
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) return this.view404();

        return `
            <div style="margin-bottom: var(--spacing-lg);">
                <div style="font-size: 1.5rem; margin-bottom: var(--spacing-xs);">${campaign.emoji} Taariikhda Kormeerka</div>
                <div style="color: var(--text-secondary); font-size: var(--font-size-sm);">${logs.length} dhacdo</div>
            </div>
            
            ${logs.length === 0 ? `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">📜</div>
                    <div style="color: var(--text-secondary);">Wali wax taariikh ah ma jiraan</div>
                </div>
            ` : logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => `
                <div class="card" style="padding: var(--spacing-md); cursor: default; margin-bottom: var(--spacing-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <span class="badge ${log.action.includes('approve') ? 'badge-success' : log.action.includes('reject') ? 'badge-error' : 'badge-warning'}" style="font-size: 10px;">
                            ${log.action.toUpperCase().replace('_', ' ')}
                        </span>
                        <span style="font-size: var(--font-size-xs); color: var(--text-tertiary);">
                            ${new Date(log.timestamp).toLocaleString('so-SO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                        </span>
                    </div>
                    <div style="font-size: var(--font-size-sm); color: var(--text-primary);">${log.details}</div>
                </div>
            `).join('')}
        `;
    },

    // ========================================
    // Authentication Views
    // ========================================

    viewLogin() {
        return `
            <div class="text-center mb-xl">
                <img src="logo.png" alt="Ololeeye" style="width: 80px; height: 80px; margin: 0 auto var(--spacing-lg);">
                <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin-bottom: var(--spacing-xs);">Soo dhawoow</h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">Gal akoonkaaga si aad u maarayso ololahaaga</p>
            </div>

            <form onsubmit="App.handleLogin(event); return false;" class="card">
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="login-email" class="form-input" placeholder="example@email.com" required autofocus>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
                </div>

                <button type="submit" class="btn btn-primary btn-block" id="login-btn">
                    ${Icons.render('login', 'icon icon-sm')} Gal
                </button>

                <div style="text-align: center; margin-top: var(--spacing-lg); padding-top: var(--spacing-lg); border-top: 1px solid var(--border-color);">
                    <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-sm);">
                        Ma haysatid akoon?
                    </p>
                    <button type="button" class="btn btn-secondary btn-block" onclick="App.navigate('/register')">
                        Samee Akoon Cusub
                    </button>
                </div>
            </form>

            <div style="text-align: center; margin-top: var(--spacing-md);">
                <a href="#" onclick="App.handleForgotPassword(); return false;" style="color: var(--color-primary); font-size: var(--font-size-sm);">
                    Ilaawe Password?
                </a>
            </div>
        `;
    },

    viewRegister() {
        return `
            <div class="text-center mb-xl">
                <img src="logo.png" alt="Ololeeye" style="width: 80px; height: 80px; margin: 0 auto var(--spacing-lg);">
                <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin-bottom: var(--spacing-xs);">Samee Akoon</h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">Bilow ururinta lacagaha si fudud</p>
            </div>

            <form onsubmit="App.handleRegister(event); return false;" class="card">
                <div class="form-group">
                    <label class="form-label">Magaca Oo Dhan</label>
                    <input type="text" id="register-name" class="form-input" placeholder="Magacaaga" required autofocus>
                </div>

                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="register-email" class="form-input" placeholder="example@email.com" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="register-password" class="form-input" placeholder="Ugu yaraan 6 xaraf" required minlength="6">
                    <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: 4px;">
                        Ugu yaraan 6 xaraf
                    </div>
                </div>

                <button type="submit" class="btn btn-primary btn-block" id="register-btn">
                    ${Icons.render('userPlus', 'icon icon-sm')} Samee Akoon
                </button>

                <div style="text-align: center; margin-top: var(--spacing-lg); padding-top: var(--spacing-lg); border-top: 1px solid var(--border-color);">
                    <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-sm);">
                        Hore ayaad u haysatay akoon?
                    </p>
                    <button type="button" class="btn btn-secondary btn-block" onclick="App.navigate('/login')">
                        Gal Akoonkaaga
                    </button>
                </div>
            </form>
        `;
    },

    viewProfile() {
        const user = Auth.getCurrentUser();
        const profile = Auth.getCurrentProfile();

        if (!user) {
            this.navigate('/login');
            return '';
        }

        return `
            <div class="text-center mb-xl">
                <div class="contributor-avatar" style="width: 88px; height: 88px; font-size: var(--font-size-2xl); margin: 0 auto var(--spacing-lg);">
                    ${profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                </div>
                <h1 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">Profile</h1>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${user.email}</p>
            </div>

            <div class="card">
                <h3 class="section-title">Macluumaadka Shakhsiga</h3>
                
                <div class="form-group">
                    <label class="form-label">Magaca Oo Dhan</label>
                    <input type="text" id="profile-name" class="form-input" value="${profile?.full_name || ''}" placeholder="Magacaaga">
                </div>

                <div class="form-group">
                    <label class="form-label">Telefoon (Ikhtiyaari)</label>
                    <input type="tel" id="profile-phone" class="form-input" value="${profile?.phone || ''}" placeholder="+252...">
                </div>

                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" value="${user.email}" disabled style="opacity: 0.6;">
                    <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: 4px;">
                        Email-ka lama bedeli karo
                    </div>
                </div>

                <button class="btn btn-primary btn-block" onclick="App.handleUpdateProfile()">
                    ${Icons.render('save', 'icon icon-sm')} Kaydi Isbeddelka
                </button>
            </div>

            <div class="card" style="margin-top: var(--spacing-lg);">
                <h3 class="section-title">Xogta Xisaabta</h3>
                
                <div style="display: flex; justify-content: space-between; padding: var(--spacing-md) 0; border-bottom: 1px solid var(--border-color);">
                    <span style="color: var(--text-secondary);">La diiwaangeliyey</span>
                    <span style="font-weight: var(--font-weight-semibold);">
                        ${new Date(user.created_at).toLocaleDateString('so-SO')}
                    </span>
                </div>

                <div style="display: flex; justify-content: space-between; padding: var(--spacing-md) 0;">
                    <span style="color: var(--text-secondary);">User ID</span>
                    <span style="font-family: monospace; font-size: var(--font-size-xs); color: var(--text-tertiary);">
                        ${user.id.slice(0, 8)}...
                    </span>
                </div>
            </div>

            <div style="margin-top: var(--spacing-xl);">
                <button class="btn btn-outline btn-block" style="color: var(--color-error); border-color: var(--color-error);" onclick="App.handleLogout()">
                    ${Icons.render('logout', 'icon icon-sm')} Ka Bax
                </button>
            </div>
        `;
    },

    // ========================================
    // Authentication Handlers
    // ========================================

    async handleLogin(event) {
        event.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');

        btn.disabled = true;
        btn.textContent = 'Soo galaya...';

        const result = await Auth.signIn(email, password);

        if (result.success) {
            Components.toast('Waad soo gashay!', 'success');
            this.navigate('/');
        } else {
            if (result.error && result.error.includes('confirm')) {
                Components.toast('Fadlan xaqiiji email-kaaga (Check your email)', 'warning');
            } else {
                Components.toast(result.error || 'Login failed', 'error');
            }
            btn.disabled = false;
            btn.innerHTML = `${Icons.render('login', 'icon icon-sm')} Gal`;
        }
    },

    async handleRegister(event) {
        event.preventDefault();

        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const btn = document.getElementById('register-btn');

        btn.disabled = true;
        btn.textContent = 'Samaynaya...';

        const result = await Auth.signUp(email, password, name);

        if (result.success) {
            Components.toast('Akoon la sameeyey! Fadlan hubi email-kaaga.', 'success');
            this.navigate('/login');
        } else {
            Components.toast(result.error || 'Registration failed', 'error');
            btn.disabled = false;
            btn.innerHTML = `${Icons.render('userPlus', 'icon icon-sm')} Samee Akoon`;
        }
    },

    async handleLogout() {
        if (!confirm('Ma hubtaa inaad ka baxayso?')) return;

        const result = await Auth.signOut();

        if (result.success) {
            Components.toast('Waad ka baxday', 'success');
            this.navigate('/login');
        } else {
            Components.toast('Khalad ayaa dhacay', 'error');
        }
    },

    async handleUpdateProfile() {
        const name = document.getElementById('profile-name').value;
        const phone = document.getElementById('profile-phone').value;

        const result = await Auth.updateProfile({
            full_name: name,
            phone: phone
        });

        if (result.success) {
            Components.toast('Profile la cusboonaysiiyey!', 'success');
        } else {
            Components.toast(result.error || 'Update failed', 'error');
        }
    },

    async handleForgotPassword() {
        const email = prompt('Geli email-kaaga:');
        if (!email) return;

        const result = await Auth.resetPassword(email);

        if (result.success) {
            Components.toast('Email la soo diray! Hubi inbox-kaaga.', 'success');
        } else {
            Components.toast(result.error || 'Failed to send email', 'error');
        }
    },

    // ========================================
    // Migration Handlers
    // ========================================

    async handleMigrateToCloud() {
        if (!Auth.isAuthenticated()) {
            Components.toast('Fadlan gal akoonkaaga', 'error');
            return;
        }

        if (!confirm('Ma hubtaa inaad gudbinayso xogtaada cloud-ka? Tani waqti yar qaadan kartaa.')) {
            return;
        }

        const btn = document.getElementById('migrate-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Gudbinaya...';
        }

        try {
            const result = await DataLayer.migrateToSupabase();

            if (result.success) {
                Components.toast(
                    `✅ Gudbinta waa guulaysatay!\n${result.campaigns} olole, ${result.contributors} tabaruce, ${result.payments} bixin`,
                    'success'
                );

                // Ask if they want to clear local data
                if (confirm('Xogta waa la gudbiyey cloud-ka. Ma rabtaa inaad tirtirto xogta maxaliga ah?')) {
                    this.handleClearLocalData();
                } else {
                    // Reload to show updated UI
                    this.handleRoute();
                }
            } else {
                Components.toast('Khalad: ' + result.error, 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `${Icons.render('upload', 'icon icon-sm')} Gudbiso Cloud-ka`;
                }
            }
        } catch (error) {
            console.error('Migration error:', error);
            Components.toast('Khalad ayaa dhacay: ' + error.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `${Icons.render('upload', 'icon icon-sm')} Gudbiso Cloud-ka`;
            }
        }
    },

    handleClearLocalData() {
        if (!confirm('⚠️ MA HUBTAA?\n\nTani waxay tirtiri doontaa DHAMMAAN xogta maxaliga ah. Tani lama celin karo!\n\nFadlan hubi inaad gudbisay cloud-ka ka hor intaadan tirtirin.')) {
            return;
        }

        if (!confirm('Xaqiijin kale: Xogta maxaliga ah oo dhan ayaa la tirtiri doonaa. Ma hubtaa?')) {
            return;
        }

        try {
            // Clear all localStorage data
            localStorage.removeItem('campaigns');
            localStorage.removeItem('contributors');
            localStorage.removeItem('payments');
            localStorage.removeItem('logs');

            Components.toast('Xogta maxaliga ah waa la tirtiray', 'success');

            // Reload page
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Clear data error:', error);
            Components.toast('Khalad ayaa dhacay', 'error');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
