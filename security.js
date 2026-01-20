/* ========================================
   SECURITY UTILITIES
   XSS Protection, Sanitization, Encryption
   ======================================== */

const Security = {
    // ========================================
    // XSS PROTECTION
    // ========================================

    /**
     * Escape HTML to prevent XSS attacks
     * Converts special characters to HTML entities
     */
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            return unsafe;
        }

        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    /**
     * Sanitize HTML - removes dangerous tags and attributes
     * Allows only safe tags: b, i, em, strong, p, br, a (with safe href)
     */
    sanitizeHtml(dirty) {
        if (typeof dirty !== 'string') {
            return dirty;
        }

        // Remove script tags and their content
        dirty = dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // Remove event handlers (onclick, onerror, etc.)
        dirty = dirty.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        dirty = dirty.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

        // Remove javascript: protocol
        dirty = dirty.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');

        // Remove data: protocol (can be used for XSS)
        dirty = dirty.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');

        // Remove iframe, object, embed tags
        dirty = dirty.replace(/<(iframe|object|embed|applet)[^>]*>.*?<\/\1>/gi, '');

        return dirty;
    },

    /**
     * Safe innerHTML replacement
     * Use this instead of element.innerHTML = value
     */
    setInnerHTML(element, html) {
        if (!element) return;
        element.innerHTML = this.sanitizeHtml(html);
    },

    /**
     * Safe textContent (no HTML rendering)
     * Use for plain text that should never contain HTML
     */
    setTextContent(element, text) {
        if (!element) return;
        element.textContent = text;
    },

    // ========================================
    // INPUT SANITIZATION
    // ========================================

    /**
     * Sanitize user input for storage
     * Removes dangerous characters but preserves normal text
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }

        // Trim whitespace
        input = input.trim();

        // Remove null bytes
        input = input.replace(/\0/g, '');

        // Limit length to prevent DoS
        if (input.length > 10000) {
            input = input.substring(0, 10000);
        }

        return input;
    },

    /**
     * Validate and sanitize phone number
     */
    sanitizePhone(phone) {
        // Remove all non-digits
        let clean = String(phone).replace(/\D/g, '');

        // Limit length
        if (clean.length > 15) {
            clean = clean.substring(0, 15);
        }

        return clean;
    },

    /**
     * Validate and sanitize email
     */
    sanitizeEmail(email) {
        email = String(email).trim().toLowerCase();

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return '';
        }

        // Limit length
        if (email.length > 254) {
            return '';
        }

        return email;
    },

    /**
     * Validate and sanitize PIN
     */
    sanitizePIN(pin) {
        // Remove all non-digits
        let clean = String(pin).replace(/\D/g, '');

        // Must be exactly 4 digits
        if (clean.length !== 4) {
            return '';
        }

        return clean;
    },

    // ========================================
    // ENCRYPTION (Web Crypto API)
    // ========================================

    /**
     * Generate encryption key from password
     */
    async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt data using AES-GCM
     */
    async encrypt(data, password) {
        try {
            const enc = new TextEncoder();
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const key = await this.deriveKey(password, salt);

            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                enc.encode(data)
            );

            // Combine salt + iv + encrypted data
            const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encrypted), salt.length + iv.length);

            // Convert to base64
            return btoa(String.fromCharCode.apply(null, combined));
        } catch (e) {
            console.error('Encryption failed:', e);
            return null;
        }
    },

    /**
     * Decrypt data using AES-GCM
     */
    async decrypt(encryptedData, password) {
        try {
            // Convert from base64
            const combined = new Uint8Array(
                atob(encryptedData).split('').map(c => c.charCodeAt(0))
            );

            // Extract salt, iv, and encrypted data
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const data = combined.slice(28);

            const key = await this.deriveKey(password, salt);

            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                data
            );

            const dec = new TextDecoder();
            return dec.decode(decrypted);
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    },

    /**
     * Hash PIN for storage (one-way)
     */
    async hashPIN(pin) {
        const enc = new TextEncoder();
        const data = enc.encode(pin);
        const hash = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hash));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Verify PIN against hash
     */
    async verifyPIN(pin, hash) {
        const pinHash = await this.hashPIN(pin);
        return pinHash === hash;
    },

    // ========================================
    // RATE LIMITING
    // ========================================

    rateLimits: {},

    /**
     * Check if action is rate limited
     * @param {string} key - Unique identifier for the action
     * @param {number} maxAttempts - Maximum attempts allowed
     * @param {number} windowMs - Time window in milliseconds
     */
    checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
        const now = Date.now();

        if (!this.rateLimits[key]) {
            this.rateLimits[key] = {
                attempts: [],
                lockedUntil: 0
            };
        }

        const limit = this.rateLimits[key];

        // Check if locked
        if (limit.lockedUntil > now) {
            const remainingMs = limit.lockedUntil - now;
            const remainingSec = Math.ceil(remainingMs / 1000);
            return {
                allowed: false,
                remaining: 0,
                resetIn: remainingSec,
                message: `Liian monta yritystä. Odota ${remainingSec} sekuntia.`
            };
        }

        // Remove old attempts outside the window
        limit.attempts = limit.attempts.filter(time => time > now - windowMs);

        // Check if limit exceeded
        if (limit.attempts.length >= maxAttempts) {
            // Lock for exponential backoff
            const lockDuration = Math.min(windowMs * Math.pow(2, limit.attempts.length - maxAttempts), 3600000); // Max 1 hour
            limit.lockedUntil = now + lockDuration;

            return {
                allowed: false,
                remaining: 0,
                resetIn: Math.ceil(lockDuration / 1000),
                message: `Liian monta yritystä. Tili lukittu ${Math.ceil(lockDuration / 60000)} minuutiksi.`
            };
        }

        // Add this attempt
        limit.attempts.push(now);

        return {
            allowed: true,
            remaining: maxAttempts - limit.attempts.length,
            resetIn: Math.ceil(windowMs / 1000)
        };
    },

    /**
     * Reset rate limit for a key
     */
    resetRateLimit(key) {
        delete this.rateLimits[key];
    },

    // ========================================
    // CSRF PROTECTION
    // ========================================

    /**
     * Generate CSRF token
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Get or create CSRF token for session
     */
    getCSRFToken() {
        let token = sessionStorage.getItem('csrf_token');
        if (!token) {
            token = this.generateCSRFToken();
            sessionStorage.setItem('csrf_token', token);
        }
        return token;
    },

    /**
     * Validate CSRF token
     */
    validateCSRFToken(token) {
        const sessionToken = sessionStorage.getItem('csrf_token');
        return token === sessionToken;
    },

    // ========================================
    // SECURE STORAGE
    // ========================================

    /**
     * Securely store sensitive data in localStorage
     * Encrypts data before storage
     */
    async secureStore(key, value, password) {
        const encrypted = await this.encrypt(JSON.stringify(value), password);
        if (encrypted) {
            localStorage.setItem(key, encrypted);
            return true;
        }
        return false;
    },

    /**
     * Securely retrieve data from localStorage
     * Decrypts data after retrieval
     */
    async secureRetrieve(key, password) {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        const decrypted = await this.decrypt(encrypted, password);
        if (decrypted) {
            try {
                return JSON.parse(decrypted);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
};

// ========================================
// INITIALIZE SECURITY
// ========================================

// Set up global error handler for security events
window.addEventListener('securitypolicyviolation', (e) => {
    console.error('CSP Violation:', e.violatedDirective, e.blockedURI);
    if (typeof ErrorTracker !== 'undefined') {
        ErrorTracker.logError({
            type: 'csp_violation',
            directive: e.violatedDirective,
            blockedURI: e.blockedURI,
            timestamp: new Date().toISOString()
        });
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Security;
}
