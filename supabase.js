/* ========================================
   SUPABASE DATA SERVICE
   Cloud-based data layer replacing data.js
   ======================================== */

import { supabase } from './supabase-config.js';

// Initialize Supabase client
// const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Removed: using shared instance

const SupabaseDB = {
    // ========================================
    // Campaign Methods
    // ========================================

    async getCampaigns() {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('getCampaigns error:', error);
            return [];
        }
    },

    async getCampaign(id) {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('getCampaign error:', error);
            return null;
        }
    },

    async getCampaignByCode(code) {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('code', code)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('getCampaignByCode error:', error);
            return null;
        }
    },

    async generateCampaignCode() {
        // Generate 4-digit unique code
        let code;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            code = Math.floor(1000 + Math.random() * 9000).toString();
            const existing = await this.getCampaignByCode(code);
            if (!existing) return code;
            attempts++;
        } while (attempts < maxAttempts);

        // Fallback: use timestamp-based code
        return Date.now().toString().slice(-4);
    },

    async saveCampaign(campaign) {
        try {
            const userId = Auth.getUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            // If no ID, this is a new campaign
            if (!campaign.id) {
                campaign.code = campaign.code || await this.generateCampaignCode();
                campaign.user_id = userId;

                const { data, error } = await supabase
                    .from('campaigns')
                    .insert([campaign])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Update existing campaign
                const { data, error } = await supabase
                    .from('campaigns')
                    .update(campaign)
                    .eq('id', campaign.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        } catch (error) {
            console.error('saveCampaign error:', error);
            throw error;
        }
    },

    async deleteCampaign(id) {
        try {
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('deleteCampaign error:', error);
            return false;
        }
    },

    // ========================================
    // Contributor Methods
    // ========================================

    async getContributors(campaignId = null) {
        try {
            let query = supabase
                .from('contributors')
                .select('*')
                .order('created_at', { ascending: false });

            if (campaignId) {
                query = query.eq('campaign_id', campaignId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('getContributors error:', error);
            return [];
        }
    },

    async getContributor(id) {
        try {
            const { data, error } = await supabase
                .from('contributors')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('getContributor error:', error);
            return null;
        }
    },

    async getContributorByPhone(phone, campaignId = null) {
        try {
            // Normalize phone number
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '252' + cleanPhone.substring(1);
            if (!cleanPhone.startsWith('252')) cleanPhone = '252' + cleanPhone;

            let query = supabase
                .from('contributors')
                .select('*')
                .eq('phone', cleanPhone);

            if (campaignId) {
                query = query.eq('campaign_id', campaignId);
            }

            const { data, error } = await query.maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('getContributorByPhone error:', error);
            return null;
        }
    },

    async saveContributor(contributor) {
        try {
            // Normalize phone number
            if (contributor.phone) {
                let cleanPhone = contributor.phone.replace(/\D/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '252' + cleanPhone.substring(1);
                if (!cleanPhone.startsWith('252')) cleanPhone = '252' + cleanPhone;
                contributor.phone = cleanPhone;
            }

            if (!contributor.id) {
                // Insert new contributor
                const { data, error } = await supabase
                    .from('contributors')
                    .insert([contributor])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Update existing contributor
                const { data, error } = await supabase
                    .from('contributors')
                    .update(contributor)
                    .eq('id', contributor.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        } catch (error) {
            console.error('saveContributor error:', error);
            throw error;
        }
    },

    async deleteContributor(id) {
        try {
            const { error } = await supabase
                .from('contributors')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('deleteContributor error:', error);
            return false;
        }
    },

    // ========================================
    // Campaign Stats
    // ========================================

    async getCampaignStats(campaignId) {
        try {
            const [campaign, contributors, payments] = await Promise.all([
                this.getCampaign(campaignId),
                this.getContributors(campaignId),
                this.getPayments(campaignId)
            ]);

            if (!campaign) return null;

            const paid = contributors.filter(c => c.status === 'paid');
            const pending = contributors.filter(c => c.status === 'pending');
            const declined = contributors.filter(c => c.status === 'declined');

            const collected = paid.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            const goal = parseFloat(campaign.goal) || 0;
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
                pendingPayments: payments.filter(p => p.status === 'pending').length
            };
        } catch (error) {
            console.error('getCampaignStats error:', error);
            return null;
        }
    },

    // ========================================
    // Payment Methods
    // ========================================

    async getPayments(campaignId = null) {
        try {
            let query = supabase
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false });

            if (campaignId) {
                query = query.eq('campaign_id', campaignId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('getPayments error:', error);
            return [];
        }
    },

    async getPayment(id) {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('getPayment error:', error);
            return null;
        }
    },

    async getPendingPayments() {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('getPendingPayments error:', error);
            return [];
        }
    },

    async savePayment(payment) {
        try {
            if (!payment.id) {
                // Insert new payment
                const { data, error } = await supabase
                    .from('payments')
                    .insert([payment])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Update existing payment
                const { data, error } = await supabase
                    .from('payments')
                    .update(payment)
                    .eq('id', payment.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        } catch (error) {
            console.error('savePayment error:', error);
            throw error;
        }
    },

    async approvePayment(paymentId) {
        try {
            const payment = await this.getPayment(paymentId);
            if (!payment) return false;

            // Update payment status
            await supabase
                .from('payments')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString()
                })
                .eq('id', paymentId);

            // Create or update contributor
            const contributor = {
                campaign_id: payment.campaign_id,
                name: payment.name,
                phone: payment.phone || '',
                amount: payment.amount,
                status: 'paid',
                payment_id: payment.id
            };

            await this.saveContributor(contributor);

            return true;
        } catch (error) {
            console.error('approvePayment error:', error);
            return false;
        }
    },

    async approveAllPayments() {
        try {
            const pending = await this.getPendingPayments();
            let count = 0;

            for (const payment of pending) {
                if (await this.approvePayment(payment.id)) {
                    count++;
                }
            }

            return count;
        } catch (error) {
            console.error('approveAllPayments error:', error);
            return 0;
        }
    },

    async rejectPayment(paymentId) {
        try {
            const { error } = await supabase
                .from('payments')
                .update({
                    status: 'rejected',
                    rejected_at: new Date().toISOString()
                })
                .eq('id', paymentId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('rejectPayment error:', error);
            return false;
        }
    },

    // ========================================
    // Templates (Keep local for now)
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

    // ========================================
    // Settings (Keep local for now)
    // ========================================

    getSettings() {
        return DB.getSettings();
    },

    saveSetting(key, value) {
        return DB.saveSetting(key, value);
    },

    // ========================================
    // Real-time Subscriptions
    // ========================================

    subscribeToCampaigns(callback) {
        const userId = Auth.getUserId();
        if (!userId) return null;

        return supabase
            .channel('campaigns')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'campaigns',
                filter: `user_id=eq.${userId}`
            }, callback)
            .subscribe();
    },

    subscribeToContributors(campaignId, callback) {
        return supabase
            .channel(`contributors-${campaignId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'contributors',
                filter: `campaign_id=eq.${campaignId}`
            }, callback)
            .subscribe();
    },

    subscribeToPayments(campaignId, callback) {
        return supabase
            .channel(`payments-${campaignId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'payments',
                filter: `campaign_id=eq.${campaignId}`
            }, callback)
            .subscribe();
    },

    unsubscribe(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription);
        }
    }
};

// Export for use in app
window.SupabaseDB = SupabaseDB;
