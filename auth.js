/* ========================================
   AUTHENTICATION SERVICE
   Handles user registration, login, logout
   ======================================== */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const Auth = {
    currentUser: null,
    currentProfile: null,
    onAuthChangeCallbacks: [],

    // ========================================
    // Initialize & Session Management
    // ========================================

    async init() {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            this.currentUser = session.user;
            await this.loadProfile();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);

            if (session) {
                this.currentUser = session.user;
                await this.loadProfile();
            } else {
                this.currentUser = null;
                this.currentProfile = null;
            }

            // Notify listeners
            this.onAuthChangeCallbacks.forEach(callback => callback(this.currentUser, this.currentProfile));
        });

        return this.currentUser;
    },

    // Subscribe to auth changes
    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    },

    // ========================================
    // Registration
    // ========================================

    async signUp(email, password, fullName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            // Profile is automatically created by database trigger
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // Login
    // ========================================

    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.currentUser = data.user;
            await this.loadProfile();

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // Logout
    // ========================================

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            this.currentProfile = null;

            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // Password Reset
    // ========================================

    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#/reset-password`
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    },

    async updatePassword(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Update password error:', error);
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // Profile Management
    // ========================================

    async loadProfile() {
        if (!this.currentUser) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;

            this.currentProfile = data;
            return data;
        } catch (error) {
            console.error('Load profile error:', error);
            return null;
        }
    },

    async updateProfile(updates) {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            this.currentProfile = data;
            return { success: true, profile: data };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // Helpers
    // ========================================

    isAuthenticated() {
        return !!this.currentUser;
    },

    getCurrentUser() {
        return this.currentUser;
    },

    getCurrentProfile() {
        return this.currentProfile;
    },

    getUserId() {
        return this.currentUser?.id || null;
    }
};

// Export for use in other modules
window.Auth = Auth;
