/* ========================================
   DATA LAYER WRAPPER
   Gradual migration from localStorage to Supabase
   ======================================== */

// Configuration: Set to true to use Supabase, false for localStorage
const USE_SUPABASE = true;

// Unified DB interface that works with both localStorage and Supabase
const DataLayer = {
    // ========================================
    // Campaign Methods
    // ========================================

    async getCampaigns() {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.getCampaigns();
        }
        return DB.getCampaigns();
    },

    async getCampaign(id) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.getCampaign(id);
        }
        return DB.getCampaign(id);
    },

    async getCampaignByCode(code) {
        if (USE_SUPABASE) {
            return await SupabaseDB.getCampaignByCode(code);
        }
        return DB.getCampaignByCode(code);
    },

    async saveCampaign(campaign) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.saveCampaign(campaign);
        }
        return DB.saveCampaign(campaign);
    },

    async deleteCampaign(id) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.deleteCampaign(id);
        }
        return DB.deleteCampaign(id);
    },

    // ========================================
    // Contributor Methods
    // ========================================

    async getContributors(campaignId = null) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.getContributors(campaignId);
        }
        return DB.getContributors(campaignId);
    },

    async getContributor(id) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.getContributor(id);
        }
        return DB.getContributor(id);
    },

    async getContributorByPhone(phone, campaignId = null) {
        if (USE_SUPABASE) {
            return await SupabaseDB.getContributorByPhone(phone, campaignId);
        }
        return DB.getContributorByPhone(phone, campaignId);
    },

    async saveContributor(contributor) {
        if (USE_SUPABASE) {
            return await SupabaseDB.saveContributor(contributor);
        }
        return DB.saveContributor(contributor);
    },

    async deleteContributor(id) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.deleteContributor(id);
        }
        return DB.deleteContributor(id);
    },

    // ========================================
    // Campaign Stats
    // ========================================

    async getCampaignStats(campaignId) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.getCampaignStats(campaignId);
        }
        return DB.getCampaignStats(campaignId);
    },

    // ========================================
    // Payment Methods
    // ========================================

    async getPayments(campaignId = null) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.getPayments(campaignId);
        }
        return DB.getPayments(campaignId);
    },

    async getPayment(id) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.getPayment(id);
        }
        return DB.getPayment(id);
    },

    async getPendingPayments() {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.getPendingPayments();
        }
        return DB.getPendingPayments();
    },

    async savePayment(payment) {
        if (USE_SUPABASE) {
            return await SupabaseDB.savePayment(payment);
        }
        return DB.savePayment(payment);
    },

    async approvePayment(paymentId) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.approvePayment(paymentId);
        }
        return DB.approvePayment(paymentId);
    },

    async approveAllPayments() {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.approveAllPayments();
        }
        return DB.approveAllPayments();
    },

    async rejectPayment(paymentId) {
        if (USE_SUPABASE && Auth.isAuthenticated()) {
            return await SupabaseDB.rejectPayment(paymentId);
        }
        return DB.rejectPayment(paymentId);
    },

    // ========================================
    // Templates & Settings (Keep local)
    // ========================================

    getTemplates() {
        return DB.getTemplates();
    },

    getTemplate(type) {
        return DB.getTemplate(type);
    },

    saveTemplate(template) {
        return DB.saveTemplate(template);
    },

    getSettings() {
        return DB.getSettings();
    },

    saveSetting(key, value) {
        return DB.saveSetting(key, value);
    },

    // ========================================
    // Migration Helpers
    // ========================================

    async migrateToSupabase() {
        if (!Auth.isAuthenticated()) {
            throw new Error('Must be logged in to migrate data');
        }

        try {
            // Get all local data
            const localCampaigns = DB.getCampaigns();
            const localContributors = DB.getContributors();
            const localPayments = DB.getPayments();

            let migratedCampaigns = 0;
            let migratedContributors = 0;
            let migratedPayments = 0;

            // Migrate campaigns
            for (const campaign of localCampaigns) {
                try {
                    // Remove old ID, let Supabase generate new one
                    const { id, createdAt, updatedAt, ...campaignData } = campaign;
                    const newCampaign = await SupabaseDB.saveCampaign(campaignData);

                    // Migrate contributors for this campaign
                    const campaignContributors = localContributors.filter(c => c.campaignId === id);
                    for (const contributor of campaignContributors) {
                        const { id: contId, campaignId, createdAt, updatedAt, ...contData } = contributor;
                        contData.campaign_id = newCampaign.id;
                        await SupabaseDB.saveContributor(contData);
                        migratedContributors++;
                    }

                    // Migrate payments for this campaign
                    const campaignPayments = localPayments.filter(p => p.campaignId === id);
                    for (const payment of campaignPayments) {
                        const { id: payId, campaignId, createdAt, updatedAt, ...payData } = payment;
                        payData.campaign_id = newCampaign.id;
                        await SupabaseDB.savePayment(payData);
                        migratedPayments++;
                    }

                    migratedCampaigns++;
                } catch (error) {
                    console.error('Error migrating campaign:', campaign.name, error);
                }
            }

            return {
                success: true,
                campaigns: migratedCampaigns,
                contributors: migratedContributors,
                payments: migratedPayments
            };
        } catch (error) {
            console.error('Migration error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // ========================================
    // Audit Logs
    // ========================================

    async getLogs(campaignId = null) {
        // Currently logs are local only, but we wrap it to be async-ready
        return DB.getLogs(campaignId);
    },

    // ========================================
    // Automation Logic
    // ========================================

    async getSuggestedActions(campaignId) {
        const actions = [];
        // Note: Using await for future-proofing, though current underlying calls might be mixed
        const stats = await this.getCampaignStats(campaignId);
        const campaign = await this.getCampaign(campaignId);

        if (!campaign) return actions;

        // 1. New Approvals -> Update Ready
        // For now, logs are local. If we move logs to Supabase, we'd fetch them here.
        const logs = await this.getLogs(campaignId);
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
        // We re-implement the logic here using DataLayer methods instead of relying on synchronous WhatsApp utility
        const contributors = await this.getContributors(campaignId);
        const now = new Date();
        const threshold = 72 * 60 * 60 * 1000; // 72 hours

        const pendingReminders = contributors.filter(c => {
            if (c.status !== 'pending') return false;
            const created = new Date(c.createdAt);
            return (now - created) > threshold;
        });

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
    },

    async getRecentActivity(limit = 8) {
        return DB.getRecentActivity(limit);
    },

    hasLocalData() {
        const campaigns = DB.getCampaigns();
        return campaigns && campaigns.length > 0;
    }
};

// Export for use in app
window.DataLayer = DataLayer;
