/* ========================================
   OLOLEEYE - Data Layer
   Models, LocalStorage, Sample Data
   ======================================== */

const DB = {
    KEYS: {
        CAMPAIGNS: 'ururin_campaigns',
        CONTRIBUTORS: 'ururin_contributors',
        TEMPLATES: 'ururin_templates',
        SETTINGS: 'ururin_settings',
        PAYMENTS: 'ururin_payments',
        LOGS: 'ururin_logs'
    },

    // ========================================
    // Core Storage Methods
    // ========================================

    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('DB.get error:', e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('DB.set error:', e);
            return false;
        }
    },

    // ========================================
    // ID Generation
    // ========================================

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // ========================================
    // Campaign Methods
    // ========================================

    getCampaigns() {
        return this.get(this.KEYS.CAMPAIGNS) || [];
    },

    getCampaign(id) {
        const campaigns = this.getCampaigns();
        return campaigns.find(c => c.id === id) || null;
    },

    getCampaignByCode(code) {
        const campaigns = this.getCampaigns();
        return campaigns.find(c => c.code === code) || null;
    },

    generateCampaignCode() {
        // Generate 4-digit unique code
        const existing = this.getCampaigns().map(c => c.code);
        let code;
        do {
            code = Math.floor(1000 + Math.random() * 9000).toString();
        } while (existing.includes(code));
        return code;
    },

    saveCampaign(campaign) {
        const campaigns = this.getCampaigns();
        const index = campaigns.findIndex(c => c.id === campaign.id);

        if (index >= 0) {
            campaigns[index] = { ...campaigns[index], ...campaign, updatedAt: new Date().toISOString() };
        } else {
            campaign.id = campaign.id || this.generateId();
            campaign.code = campaign.code || this.generateCampaignCode();
            campaign.createdAt = new Date().toISOString();
            campaign.updatedAt = campaign.createdAt;
            campaigns.push(campaign);
        }

        this.set(this.KEYS.CAMPAIGNS, campaigns);
        return campaign;
    },

    deleteCampaign(id) {
        const campaigns = this.getCampaigns().filter(c => c.id !== id);
        this.set(this.KEYS.CAMPAIGNS, campaigns);

        // Also delete related contributors
        const contributors = this.getContributors().filter(c => c.campaignId !== id);
        this.set(this.KEYS.CONTRIBUTORS, contributors);

        return true;
    },

    // ========================================
    // Contributor Methods
    // ========================================

    getContributors(campaignId = null) {
        const contributors = this.get(this.KEYS.CONTRIBUTORS) || [];
        if (campaignId) {
            return contributors.filter(c => c.campaignId === campaignId);
        }
        return contributors;
    },

    getContributor(id) {
        const contributors = this.getContributors();
        return contributors.find(c => c.id === id) || null;
    },

    getContributorByPhone(phone, campaignId = null) {
        // Normalize phone number
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '252' + cleanPhone.substring(1);
        if (!cleanPhone.startsWith('252')) cleanPhone = '252' + cleanPhone;

        const contributors = campaignId ? this.getContributors(campaignId) : this.getContributors();
        return contributors.find(c => {
            let cPhone = c.phone.replace(/\D/g, '');
            if (cPhone.startsWith('0')) cPhone = '252' + cPhone.substring(1);
            if (!cPhone.startsWith('252')) cPhone = '252' + cPhone;
            return cPhone === cleanPhone;
        }) || null;
    },

    saveContributor(contributor) {
        const contributors = this.getContributors();
        const index = contributors.findIndex(c => c.id === contributor.id);

        if (index >= 0) {
            contributors[index] = { ...contributors[index], ...contributor, updatedAt: new Date().toISOString() };
        } else {
            contributor.id = contributor.id || this.generateId();
            contributor.createdAt = new Date().toISOString();
            contributor.updatedAt = contributor.createdAt;
            contributors.push(contributor);
        }

        this.set(this.KEYS.CONTRIBUTORS, contributors);
        return contributor;
    },

    deleteContributor(id) {
        const contributors = this.getContributors().filter(c => c.id !== id);
        this.set(this.KEYS.CONTRIBUTORS, contributors);
        return true;
    },

    // ========================================
    // Campaign Stats
    // ========================================

    getCampaignStats(campaignId) {
        const contributors = this.getContributors(campaignId);
        const campaign = this.getCampaign(campaignId);

        const paid = contributors.filter(c => c.status === 'paid');
        const pending = contributors.filter(c => c.status === 'pending');
        const declined = contributors.filter(c => c.status === 'declined');

        const collected = paid.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        const goal = parseFloat(campaign?.goal) || 0;
        const percent = goal > 0 ? Math.min(100, Math.round((collected / goal) * 100)) : 0;

        return {
            total: contributors.length,
            paidCount: paid.length,
            pendingCount: pending.length,
            declinedCount: declined.length,
            collected,
            goal,
            percent,
            remaining: Math.max(0, goal - collected),
            pendingPayments: this.getPayments(campaignId).filter(p => p.status === 'pending').length
        };
    },

    // ========================================
    // Templates
    // ========================================

    getTemplates() {
        return this.get(this.KEYS.TEMPLATES) || this.getDefaultTemplates();
    },

    getTemplate(type) {
        const templates = this.getTemplates();
        return templates.find(t => t.type === type) || null;
    },

    saveTemplate(template) {
        const templates = this.getTemplates();
        const index = templates.findIndex(t => t.type === template.type);

        if (index >= 0) {
            templates[index] = template;
        } else {
            templates.push(template);
        }

        this.set(this.KEYS.TEMPLATES, templates);
        return template;
    },

    getDefaultTemplates() {
        return [
            {
                type: 'initial_request',
                name: 'Codsiga Ugu Horreeya',
                nameEn: 'Initial Request',
                text: `Assalamu Calaykum {name}!

Waxaan ku martiqaadaynaa inaad ka qayb qaadato ololaha "{campaign_name}".

Hadafkeenna: ${'{goal}'}
{target_per_person}

Fadlan lacagta u dir:
Lambarka: {zaad_number}

Mahadsanid!`,
                variables: ['name', 'campaign_name', 'goal', 'target_per_person', 'zaad_number']
            },
            {
                type: 'reminder',
                name: 'Xasuusinta',
                nameEn: 'Gentle Reminder',
                text: `Assalamu Calaykum {name}!

Waxaan ku xasuusinayaa ololaha "{campaign_name}".

Hadda waxaan gaarnay {percent}% hadafka!

Haddaad bixin kartid, aad baan kuugu mahad naqaynaa.

Lambarka: {zaad_number}

Ilaahay ha kuu sahlo`,
                variables: ['name', 'campaign_name', 'percent', 'zaad_number']
            },
            {
                type: 'thank_you',
                name: 'Mahad Celin',
                nameEn: 'Thank You',
                text: `Assalamu Calaykum {name}!

Aad iyo aad ayaan ugu mahadnaqaynaa bixintaadii ${'{amount}'}!

Waxaad ka qayb qaadatay wax wanaagsan. Ilaahay haka abaalmariyo!

Ololaha: {collected}/${'{goal}'} ({percent}%)

Mahadsanid!`,
                variables: ['name', 'amount', 'collected', 'goal', 'percent']
            },
            {
                type: 'update',
                name: 'War Cusub',
                nameEn: 'Campaign Update',
                text: `Assalamu Calaykum {name}!

War cusub oo ku saabsan ololaha "{campaign_name}":

Waxaan gaarnay: {collected}/${'{goal}'} ({percent}%)
{paid_count} qof ayaa bixiyay

{custom_message}

Mahadsanid taageeradaada!`,
                variables: ['name', 'campaign_name', 'collected', 'goal', 'percent', 'paid_count', 'custom_message']
            },
            {
                type: 'payment_confirmation_link',
                name: 'Xaqiijinta Bixinta',
                nameEn: 'Payment Confirmation Link',
                text: `Assalamu Calaykum {name}!

Waad ku darsantay ololaha "{campaign_name}".

Ballantaada: {amount}

Markii aad bixiso lacagta, xaqiiji halkan:
{confirmation_link}

Lambarka lacagta: {zaad_number}

Mahadsanid!`,
                variables: ['name', 'campaign_name', 'amount', 'confirmation_link', 'zaad_number']
            }
        ];
    },

    // ========================================
    // Settings
    // ========================================

    getSettings() {
        return this.get(this.KEYS.SETTINGS) || this.getDefaultSettings();
    },

    saveSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.set(this.KEYS.SETTINGS, settings);
        return settings;
    },

    getDefaultSettings() {
        return {
            theme: 'light',
            currency: 'USD',
            currencySymbol: '$',
            defaultZaad: '',
            language: 'so'
        };
    },

    // ========================================
    // Export/Import
    // ========================================

    exportAll() {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            campaigns: this.getCampaigns(),
            contributors: this.getContributors(),
            templates: this.getTemplates(),
            settings: this.getSettings()
        };
    },

    importAll(data) {
        if (!data || data.version !== 1) {
            throw new Error('Invalid data format');
        }

        if (data.campaigns) this.set(this.KEYS.CAMPAIGNS, data.campaigns);
        if (data.contributors) this.set(this.KEYS.CONTRIBUTORS, data.contributors);
        if (data.templates) this.set(this.KEYS.TEMPLATES, data.templates);
        if (data.settings) this.set(this.KEYS.SETTINGS, data.settings);

        return true;
    },

    // ========================================
    // Sample Data (DISABLED FOR PRODUCTION)
    // ========================================

    /*
    loadSampleData() {
        // Sample Campaigns with codes
        const campaigns = [
            {
                id: 'camp1',
                code: '4729',
                name: 'Caafimaad Campaign',
                icon: 'heart',
                description: 'Lacag ururinta caafimaad ee qoyska Cali',
                goal: 2500,
                deadline: '2026-02-15',
                zaadNumber: '252634567890',
                createdAt: '2026-01-01T10:00:00Z',
                updatedAt: '2026-01-01T10:00:00Z'
            },
            {
                id: 'camp2',
                code: '8153',
                name: 'Waxbarasho Fund',
                icon: 'academic-cap',
                description: 'Qeybta waxbarashada ardayda',
                goal: 1000,
                deadline: '2026-03-01',
                zaadNumber: '252634567890',
                createdAt: '2026-01-02T10:00:00Z',
                updatedAt: '2026-01-02T10:00:00Z'
            }
        ];

        // Sample Contributors
        const contributors = [
            { id: 'cont1', campaignId: 'camp1', name: 'Axmed Cali', phone: '252634111111', amount: 50, status: 'paid' },
            { id: 'cont2', campaignId: 'camp1', name: 'Fadumo Maxamed', phone: '252634222222', amount: 50, status: 'pending' },
            { id: 'cont3', campaignId: 'camp1', name: 'Cabdi Xasan', phone: '252634333333', amount: 100, status: 'paid' },
            { id: 'cont4', campaignId: 'camp1', name: 'Sahra Yuusuf', phone: '252634444444', amount: 50, status: 'paid' },
            { id: 'cont5', campaignId: 'camp1', name: 'Maxamuud Cumar', phone: '252634555555', amount: 75, status: 'pending' },
            { id: 'cont6', campaignId: 'camp1', name: 'Aamina Ibraahim', phone: '252634666666', amount: 50, status: 'paid' },
            { id: 'cont7', campaignId: 'camp2', name: 'Xasan Nuur', phone: '252634777777', amount: 100, status: 'paid' },
            { id: 'cont8', campaignId: 'camp2', name: 'Khadra Jaamac', phone: '252634888888', amount: 50, status: 'pending' }
        ];

        this.set(this.KEYS.CAMPAIGNS, campaigns);
        this.set(this.KEYS.CONTRIBUTORS, contributors);
        this.set(this.KEYS.TEMPLATES, this.getDefaultTemplates());
        this.set(this.KEYS.SETTINGS, this.getDefaultSettings());

        console.log('Sample data loaded!');
        return true;
    },
    */

    clearAll() {
        localStorage.removeItem(this.KEYS.CAMPAIGNS);
        localStorage.removeItem(this.KEYS.CONTRIBUTORS);
        localStorage.removeItem(this.KEYS.TEMPLATES);
        localStorage.removeItem(this.KEYS.SETTINGS);
        localStorage.removeItem(this.KEYS.PAYMENTS);
        return true;
    },

    // ========================================
    // Payment Methods (Self-Report)
    // ========================================

    getPayments(campaignId = null) {
        const payments = this.get(this.KEYS.PAYMENTS) || [];
        if (campaignId) {
            return payments.filter(p => p.campaignId === campaignId);
        }
        return payments;
    },

    getPayment(id) {
        const payments = this.getPayments();
        return payments.find(p => p.id === id) || null;
    },

    getPendingPayments() {
        return this.getPayments().filter(p => p.status === 'pending');
    },

    savePayment(payment) {
        const payments = this.getPayments();
        const index = payments.findIndex(p => p.id === payment.id);

        if (index >= 0) {
            payments[index] = { ...payments[index], ...payment, updatedAt: new Date().toISOString() };
        } else {
            payment.id = payment.id || this.generateId();
            payment.status = payment.status || 'pending';
            payment.createdAt = new Date().toISOString();
            payment.updatedAt = payment.createdAt;
            payments.push(payment);
        }

        this.set(this.KEYS.PAYMENTS, payments);
        return payment;
    },

    approvePayment(paymentId) {
        const payment = this.getPayment(paymentId);
        if (!payment) return false;

        // Update payment status
        payment.status = 'approved';
        payment.approvedAt = new Date().toISOString();
        this.savePayment(payment);

        // Create/update contributor
        const contributor = {
            campaignId: payment.campaignId,
            name: payment.name,
            phone: '',
            amount: payment.amount,
            status: 'paid',
            paymentId: payment.id
        };
        this.saveContributor(contributor);

        this.logAction(payment.campaignId, 'approve_payment', `Approved payment of ${payment.amount} from ${payment.name}`);

        return true;
    },

    approveAllPayments() {
        const pending = this.getPendingPayments();
        let count = 0;
        pending.forEach(p => {
            if (this.approvePayment(p.id)) {
                count++;
            }
        });
        return count;
    },

    rejectPayment(paymentId) {
        const payment = this.getPayment(paymentId);
        if (!payment) return false;

        payment.status = 'rejected';
        payment.rejectedAt = new Date().toISOString();
        this.savePayment(payment);

        this.logAction(payment.campaignId, 'reject_payment', `Rejected payment of ${payment.amount} from ${payment.name}`);

        return true;
    },

    // ========================================
    // Audit Log Methods
    // ========================================

    getLogs(campaignId = null) {
        const logs = this.get(this.KEYS.LOGS) || [];
        if (campaignId) {
            return logs.filter(l => l.campaignId === campaignId);
        }
        return logs;
    },

    logAction(campaignId, action, details = '') {
        const logs = this.getLogs();
        const log = {
            id: this.generateId(),
            campaignId,
            action,
            details,
            timestamp: new Date().toISOString()
        };
        logs.push(log);
        this.set(this.KEYS.LOGS, logs);
        return log;
    },

    // ========================================
    // Auth Methods
    // ========================================

    verifyPin(campaignId, pin) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return false;
        // If no PIN set, allow (or require setting one)
        if (!campaign.coordinatorPin) return true;
        return campaign.coordinatorPin === pin;
    },

    // ========================================
    // Automation Logic
    // ========================================

    getSuggestedActions(campaignId) {
        const actions = [];
        const stats = this.getCampaignStats(campaignId);
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return actions;

        // 1. New Approvals -> Update Ready
        const logs = this.getLogs(campaignId);
        const lastApproval = logs.filter(l => l.action === 'approve_payment').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        const lastUpdate = logs.filter(l => l.action === 'whatsapp_sent' && l.details.includes('update')).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        if (lastApproval && (!lastUpdate || new Date(lastApproval.timestamp) > new Date(lastUpdate.timestamp))) {
            actions.push({
                type: 'update_ready',
                title: 'War Cusub waa diyaar',
                text: 'Bixiyo cusub ayaa la helay. Dir warbixinta group-ka.',
                btnText: 'Dir Warbixinta',
                route: `/send-messages/${campaignId}`
            });
        }

        // 2. Unpaid > 3 days -> Reminder Ready
        const pendingReminders = WhatsApp.getPendingReminders(campaignId, 72); // 3 days = 72 hours
        if (pendingReminders.length > 0) {
            actions.push({
                type: 'reminder_ready',
                title: `Xasuusin waa diyaar (${pendingReminders.length})`,
                text: 'Dadka qaar ayaan wali bixin. Ma rabtaa inaad xasuusiso?',
                btnText: 'Dir Xasuusinta',
                route: `/reminders/${campaignId}`
            });
        }

        return actions;
    }
};

// ========================================
// WhatsApp Message Generator
// ========================================

const WhatsApp = {
    formatPhone(phone) {
        // Remove all non-digits
        let clean = phone.replace(/\D/g, '');

        // Ensure it starts with country code
        if (clean.startsWith('0')) {
            clean = '252' + clean.substring(1);
        }
        if (!clean.startsWith('252')) {
            clean = '252' + clean;
        }

        return clean;
    },

    generateMessage(templateType, variables) {
        const template = DB.getTemplate(templateType);
        if (!template) return '';

        let message = template.text;

        // Replace all variables
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            message = message.replace(regex, value || '');
        }

        return message;
    },

    createLink(phone, message) {
        const formattedPhone = this.formatPhone(phone);
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    },

    openChat(phone, message) {
        const link = this.createLink(phone, message);
        window.open(link, '_blank');
    },

    generateBulkMessages(campaignId, templateType, filter = 'all') {
        const campaign = DB.getCampaign(campaignId);
        const stats = DB.getCampaignStats(campaignId);
        let contributors = DB.getContributors(campaignId);

        // Apply filter
        if (filter === 'pending') {
            contributors = contributors.filter(c => c.status === 'pending');
        } else if (filter === 'paid') {
            contributors = contributors.filter(c => c.status === 'paid');
        }

        const settings = DB.getSettings();

        return contributors.map(contributor => {
            const variables = {
                name: contributor.name.split(' ')[0], // First name
                campaign_name: campaign.name,
                goal: `${settings.currencySymbol}${campaign.goal}`,
                amount: `${settings.currencySymbol}${contributor.amount}`,
                collected: `${settings.currencySymbol}${stats.collected}`,
                percent: `${stats.percent}%`,
                target_per_person: contributor.amount ? `Waxaa lagu filayaa: ${settings.currencySymbol}${contributor.amount}` : '',
                zaad_number: campaign.zaadNumber || settings.defaultZaad,
                paid_count: stats.paidCount
            };

            const message = this.generateMessage(templateType, variables);

            return {
                contributor,
                message,
                link: this.createLink(contributor.phone, message)
            };
        });
    },

    // Generate shareable join link for campaign
    getJoinLink(campaignCode) {
        // Use full URL minus hash to handle subdirectories (like on GitHub Pages)
        const baseUrl = window.location.href.split('#')[0];
        // Ensure it doesn't end with index.html
        const cleanBase = baseUrl.replace(/\/index\.html$/, '/').replace(/\/$/, '');
        return `${cleanBase}/#/join?c=${campaignCode}`;
    },

    // Generate individual reminder message
    generateReminder(contributor, campaign) {
        const settings = DB.getSettings();
        const firstName = contributor.name.split(' ')[0];
        const baseUrl = window.location.href.split('#')[0].replace(/\/index\.html$/, '/').replace(/\/$/, '');
        const confirmLink = `${baseUrl}/#/confirm-payment?c=${campaign.code}`;

        return `Asc ${firstName},

xasuusin yar oo ku saabsan ${campaign.name}.

Ballantaadii ${settings.currencySymbol}${contributor.amount} wali waa sugaysaa.

Haddii aad bixisay, fadlan xaqiiji halkan:
${confirmLink}

Mahadsanid`;
    },

    // Generate group update message
    generateGroupUpdate(campaign) {
        const stats = DB.getCampaignStats(campaign.id);
        const settings = DB.getSettings();
        const remaining = stats.goal - stats.collected;

        let motivation = '';
        if (stats.percent >= 90) {
            motivation = 'Wax yar ayaa ka dhiman! Aan dhammaystirno!';
        } else if (stats.percent >= 75) {
            motivation = 'Waan ku dhownahay hadafka!';
        } else if (stats.percent >= 50) {
            motivation = 'Waa nuskal! Sii wad!';
        } else {
            motivation = 'Fadlan ka qayb qaado!';
        }

        return `CUSBOONAYSIIN - ${campaign.name}

La ururiyey: ${settings.currencySymbol}${stats.collected.toLocaleString()}
Hadaf: ${settings.currencySymbol}${stats.goal.toLocaleString()}
Hadhay: ${settings.currencySymbol}${remaining.toLocaleString()}

${stats.paidCount} qof ayaa bixiyay
${stats.pendingCount} qof wali sugaya

${motivation}

Si aad uga qayb qaadato:
${this.getJoinLink(campaign.code)}`;
    },

    // Generate announcement message for new campaign
    generateAnnouncement(campaign) {
        const settings = DB.getSettings();

        return `OLOLEEYE - ${campaign.name}

${campaign.description || ''}

Hadaf: ${settings.currencySymbol}${campaign.goal.toLocaleString()}
Zaad: ${campaign.zaadNumber || settings.defaultZaad}

Si aad uga qayb qaadato:
${this.getJoinLink(campaign.code)}

Mahadsanid!`;
    },

    // Generate detailed list for sharing
    generateDetailedList(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        const contributors = DB.getContributors(campaignId);
        const stats = DB.getCampaignStats(campaignId);
        const settings = DB.getSettings();

        if (!campaign) return '';

        let list = `💰 LIISKA URURINTA LACAGTA – ${campaign.name.toUpperCase()}\n\n`;

        if (campaign.description) {
            list += `(${campaign.description})\n\n`;
        }

        list += `Qiimaha guud ee loo baahan yahay waa ${settings.currencySymbol}${campaign.goal.toLocaleString()}.\n\n`;

        contributors.forEach((c, index) => {
            const statusIcon = c.status === 'paid' ? '✅' : '❌';
            list += `${index + 1}. ${c.name} — ${settings.currencySymbol}${parseFloat(c.amount).toLocaleString()} ${statusIcon}\n`;
        });

        const remaining = Math.max(0, stats.goal - stats.collected);

        list += `\n📊 SUMMARY\n`;
        list += `* paid (✅): ${settings.currencySymbol}${stats.collected.toLocaleString()}\n`;
        list += `* unpaid (❌): ${settings.currencySymbol}${contributors.filter(c => c.status !== 'paid').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString()}\n`;
        list += `* Wadarta Guud ee Liiska: ${settings.currencySymbol}${contributors.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString()}\n`;
        list += `* Target: ${settings.currencySymbol}${stats.goal.toLocaleString()}\n`;
        list += `* Lacagta Hadhay: ${settings.currencySymbol}${remaining.toLocaleString()}\n\n`;

        list += `📦 Account Numberka lagu shubayo: ${campaign.zaadNumber || settings.defaultZaad}`;

        return list;
    },

    // Generate payment confirmation message with personal link
    generateConfirmationMessage(contributor, campaign) {
        const settings = DB.getSettings();
        const firstName = contributor.name.split(' ')[0];
        const baseUrl = window.location.href.split('#')[0].replace(/\/index\.html$/, '/').replace(/\/$/, '');
        const confirmLink = `${baseUrl}/#/confirm-payment?c=${campaign.code}&phone=${encodeURIComponent(contributor.phone)}`;

        const variables = {
            name: firstName,
            campaign_name: campaign.name,
            amount: `${settings.currencySymbol}${contributor.amount}`,
            confirmation_link: confirmLink,
            zaad_number: campaign.zaadNumber || settings.defaultZaad
        };

        return this.generateMessage('payment_confirmation_link', variables);
    },

    // Get pending contributors who need reminders
    getPendingReminders(campaignId, hoursThreshold = 24) {
        const contributors = DB.getContributors(campaignId);
        const now = new Date();
        const threshold = hoursThreshold * 60 * 60 * 1000;

        return contributors.filter(c => {
            if (c.status !== 'pending') return false;
            const created = new Date(c.createdAt);
            return (now - created) > threshold;
        });
    }
};

// ========================================
// Proof Parser (OCR / Text Analysis)
// ========================================

const ProofParser = {
    // Parse text proof (SMS/WhatsApp message)
    parseText(text) {
        const result = {
            amount: null,
            method: null,
            account: null,
            confidence: 'low'
        };

        if (!text) return result;

        const cleanText = text.toLowerCase();

        // Extract amount patterns
        // Patterns: $50, 50$, USD 50, 50 USD, 50.00, etc.
        const amountPatterns = [
            /\$\s*(\d+(?:[.,]\d{1,2})?)/,
            /(\d+(?:[.,]\d{1,2})?)\s*\$/,
            /usd\s*(\d+(?:[.,]\d{1,2})?)/i,
            /(\d+(?:[.,]\d{1,2})?)\s*usd/i,
            /amount[:\s]+(\d+(?:[.,]\d{1,2})?)/i,
            /lacag[:\s]+(\d+(?:[.,]\d{1,2})?)/i,
            /(\d{2,}(?:[.,]\d{1,2})?)/  // Any number 2+ digits
        ];

        for (const pattern of amountPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.amount = parseFloat(match[1].replace(',', '.'));
                break;
            }
        }

        // Detect payment method
        if (cleanText.includes('evc') || cleanText.includes('hormuud')) {
            result.method = 'EVC';
        } else if (cleanText.includes('zaad') || cleanText.includes('telesom')) {
            result.method = 'Zaad';
        } else if (cleanText.includes('edahab') || cleanText.includes('dahabshiil')) {
            result.method = 'eDahab';
        } else if (cleanText.includes('bank') || cleanText.includes('account')) {
            result.method = 'Bank';
        } else if (cleanText.includes('cash') || cleanText.includes('lacag caddaan')) {
            result.method = 'Cash';
        }

        // Extract phone/account number
        const phonePatterns = [
            /(?:to|u dir|account)[:\s]*(\+?252\s*\d{2}\s*\d{3}\s*\d{4})/i,
            /(?:to|u dir|account)[:\s]*(\d{9,12})/i,
            /(\+?252\s*\d{2}\s*\d{3}\s*\d{4})/,
            /(0\d{8,9})/
        ];

        for (const pattern of phonePatterns) {
            const match = text.match(pattern);
            if (match) {
                result.account = match[1].replace(/\s/g, '');
                break;
            }
        }

        // Set confidence
        if (result.amount && result.method) {
            result.confidence = 'high';
        } else if (result.amount || result.method) {
            result.confidence = 'medium';
        }

        return result;
    },

    // Parse image using browser's native capability
    // Returns promise with extracted text
    async parseImage(imageDataUrl) {
        // For MVP, we use a simple approach
        // In production, integrate with Tesseract.js or cloud OCR

        // Check if Tesseract is available
        if (typeof Tesseract !== 'undefined') {
            try {
                const result = await Tesseract.recognize(imageDataUrl, 'eng');
                return this.parseText(result.data.text);
            } catch (e) {
                console.error('OCR error:', e);
                return { amount: null, method: null, account: null, confidence: 'none', error: 'OCR failed' };
            }
        }

        // Fallback: no OCR available, return empty
        return {
            amount: null,
            method: null,
            account: null,
            confidence: 'none',
            note: 'OCR not available - manual review needed'
        };
    },

    // Compare reported amount with parsed amount
    validateAmount(reported, parsed) {
        if (!parsed) return { match: false, note: 'No amount detected' };
        if (reported === parsed) return { match: true, note: 'Amounts match ✓' };
        const diff = Math.abs(reported - parsed);
        const percent = (diff / reported) * 100;
        if (percent <= 5) return { match: true, note: 'Amounts approximately match' };
        return { match: false, note: `Mismatch: reported $${reported}, detected $${parsed}` };
    }
};

// Initialize with sample data if empty
if (!DB.getCampaigns().length) {
    DB.loadSampleData();
}
