/* ========================================
   URURIN - UI Components
   Premium reusable component library
   ======================================== */

const Components = {

    // ========================================
    // Campaign Card - Premium
    // ========================================

    campaignCard(campaign) {
        const stats = DB.getCampaignStats(campaign.id);
        const settings = DB.getSettings();

        // Calculate days remaining
        let daysText = '';
        if (campaign.deadline) {
            const days = Math.ceil((new Date(campaign.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            if (days > 0) {
                daysText = `<span style="color: var(--text-tertiary); font-size: var(--font-size-xs);">${Icons.render('calendar', 'icon icon-sm')} ${days} maalmood haray</span>`;
            } else if (days === 0) {
                daysText = `<span style="color: var(--color-warning); font-size: var(--font-size-xs);">${Icons.render('bell', 'icon icon-sm')} Maanta dhammaanayo!</span>`;
            } else {
                daysText = `<span style="color: var(--color-error); font-size: var(--font-size-xs);">${Icons.render('xCircle', 'icon icon-sm')} Waa la dhaafay</span>`;
            }
        }

        return `
            <div class="card" data-campaign-id="${campaign.id}" onclick="App.navigate('/campaign/${campaign.id}')">
                <div style="display: flex; align-items: flex-start; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                    <div class="card-icon">${Icons.render('folder', 'icon icon-xl icon-primary')}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title">${campaign.name}</div>
                        <div class="card-subtitle">
                            Hadaf: ${settings.currencySymbol}${campaign.goal.toLocaleString()}
                            <span style="margin-left: var(--spacing-sm); color: var(--text-tertiary);">#${campaign.code || '----'}</span>
                        </div>
                        ${daysText}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">${stats.percent}%</div>
                    </div>
                </div>
                <div class="progress-container" style="margin: 0;">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${stats.percent}%"></div>
                    </div>
                    <div class="progress-text">
                        <span class="progress-amount">${settings.currencySymbol}${stats.collected.toLocaleString()}</span>
                        <span style="display: flex; gap: var(--spacing-md);">
                            <span style="color: var(--color-success);">${Icons.render('checkCircle', 'icon icon-sm')} ${stats.paidCount}</span>
                            <span style="color: var(--color-warning);">${Icons.render('clock', 'icon icon-sm')} ${stats.pendingCount}</span>
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================
    // Contributor Row - Modern
    // ========================================

    contributorRow(contributor, showCampaign = false) {
        const settings = DB.getSettings();
        const nameParts = contributor.name.split(' ');
        const initials = nameParts.map(n => n[0]).join('').toUpperCase().slice(0, 2);

        // Format phone display
        const phoneDisplay = contributor.phone.replace(/(\d{3})(\d{2})(\d{3})(\d{4})/, '+$1 $2 $3 $4');

        const statusConfig = {
            paid: {
                badge: `<span class="badge badge-success">${Icons.render('checkCircle', 'icon icon-sm')} Bixiyey</span>`,
                btnText: Icons.render('heart', 'icon icon-sm')
            },
            pending: {
                badge: `<span class="badge badge-warning">${Icons.render('clock', 'icon icon-sm')} Sugaya</span>`,
                btnText: Icons.render('bell', 'icon icon-sm')
            },
            declined: {
                badge: `<span class="badge badge-error">${Icons.render('xCircle', 'icon icon-sm')} Diidey</span>`,
                btnText: Icons.render('mail', 'icon icon-sm')
            }
        };

        const status = statusConfig[contributor.status] || statusConfig.pending;

        let campaignInfo = '';
        if (showCampaign) {
            const campaign = DB.getCampaign(contributor.campaignId);
            if (campaign) {
                campaignInfo = `<div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: 2px;">${campaign.emoji} ${campaign.name}</div>`;
            }
        }

        return `
            <div class="contributor-row" data-contributor-id="${contributor.id}">
                <div class="contributor-avatar">${initials}</div>
                <div class="contributor-info" onclick="App.navigate('/contributor/${contributor.id}')">
                    <div class="contributor-name">${contributor.name}</div>
                    <div class="contributor-phone">${phoneDisplay}</div>
                    ${campaignInfo}
                </div>
                <div style="text-align: right;">
                    <div class="contributor-amount">${settings.currencySymbol}${contributor.amount || 0}</div>
                    <div class="contributor-status">${status.badge}</div>
                </div>
                <div class="contributor-actions">
                    <button class="whatsapp-btn" onclick="event.stopPropagation(); App.openWhatsAppQuick('${contributor.id}')" title="Dir WhatsApp">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================
    // Empty State - Animated
    // ========================================

    emptyState(icon, title, text, actionLabel = null, actionRoute = null) {
        const action = actionLabel && actionRoute
            ? `<button class="btn btn-primary btn-lg" onclick="App.navigate('${actionRoute}')">${actionLabel}</button>`
            : '';

        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <div class="empty-state-title">${title}</div>
                <div class="empty-state-text">${text}</div>
                ${action}
            </div>
        `;
    },

    // ========================================
    // Filter Tabs - Pills
    // ========================================

    filterTabs(filters, activeFilter, onChangeHandler) {
        return `
            <div class="filter-tabs">
                ${filters.map(f => `
                    <button class="filter-tab ${f.value === activeFilter ? 'active' : ''}" 
                            onclick="${onChangeHandler}('${f.value}')">
                        ${f.label}${f.count !== undefined ? ` (${f.count})` : ''}
                    </button>
                `).join('')}
            </div>
        `;
    },

    // ========================================
    // Search Bar - Floating
    // ========================================

    searchBar(placeholder, onInputHandler) {
        return `
            <div class="search-bar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" 
                       class="form-input" 
                       placeholder="${placeholder}"
                       value="${App.searchQuery || ''}"
                       oninput="${onInputHandler}(this.value)">
            </div>
        `;
    },

    // ========================================
    // Form Input - Modern
    // ========================================

    formGroup(config) {
        const { label, name, type = 'text', value = '', placeholder = '', required = false, hint = '', options = [] } = config;

        let inputHtml;

        if (type === 'textarea') {
            inputHtml = `<textarea class="form-textarea" name="${name}" placeholder="${placeholder}" ${required ? 'required' : ''}>${value}</textarea>`;
        } else if (type === 'select') {
            inputHtml = `
                <select class="form-select" name="${name}" ${required ? 'required' : ''}>
                    ${options.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}
                </select>
            `;
        } else {
            inputHtml = `<input type="${type}" class="form-input" name="${name}" value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''} ${type === 'number' ? 'min="0" step="any"' : ''}>`;
        }

        return `
            <div class="form-group">
                <label class="form-label">${label}${required ? '' : ''}</label>
                ${inputHtml}
                ${hint ? `<div class="form-hint">${hint}</div>` : ''}
            </div>
        `;
    },

    // ========================================
    // Phone Input - Somalia Format
    // ========================================

    phoneInput(name, value = '', required = false) {
        let cleanValue = value.replace(/\D/g, '');
        if (cleanValue.startsWith('252')) {
            cleanValue = cleanValue.substring(3);
        }

        return `
            <div class="form-group">
                <label class="form-label">Telefoonka</label>
                <div class="phone-input-group">
                    <input type="text" class="form-input phone-prefix" value="+252" readonly tabindex="-1">
                    <input type="tel" class="form-input phone-number" name="${name}" 
                           value="${cleanValue}" placeholder="63 1234567" ${required ? 'required' : ''}
                           inputmode="tel">
                </div>
                <div class="form-hint">Tusaale: 63 1234567</div>
            </div>
        `;
    },

    // ========================================
    // Modal - Premium Slide-up
    // ========================================

    showModal(title, bodyHtml, footerHtml = '') {
        const container = document.getElementById('modal-container');
        const modal = container.querySelector('.modal');

        modal.querySelector('.modal-title').textContent = title;
        modal.querySelector('.modal-body').innerHTML = bodyHtml;
        modal.querySelector('.modal-footer').innerHTML = footerHtml;

        container.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Close handlers
        container.querySelector('.modal-backdrop').onclick = Components.closeModal;
        container.querySelector('.modal-close').onclick = Components.closeModal;

        // ESC key closes modal
        document.addEventListener('keydown', Components.handleModalEsc);
    },

    closeModal() {
        const container = document.getElementById('modal-container');
        container.classList.add('hidden');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', Components.handleModalEsc);
    },

    handleModalEsc(e) {
        if (e.key === 'Escape') {
            Components.closeModal();
        }
    },

    // ========================================
    // Toast Notifications - Floating
    // ========================================

    toast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: Icons.render('checkCircle', 'icon icon-sm icon-success'),
            error: '✗',
            warning: '⚠'
        };

        toast.innerHTML = `
            <span style="font-size: 1.2em;">${icons[type] || icons.success}</span>
            <span style="flex: 1;">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastIn 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // ========================================
    // Message Preview Card
    // ========================================

    messagePreviewCard(contributor, message, link) {
        const initials = contributor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        return `
            <div class="message-preview-card">
                <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                    <div class="contributor-avatar" style="width: 40px; height: 40px; font-size: var(--font-size-sm);">${initials}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: var(--font-weight-semibold);">${contributor.name}</div>
                        <div style="font-size: var(--font-size-xs); color: var(--text-tertiary);">+${contributor.phone}</div>
                    </div>
                </div>
                <div class="message-preview-text">${message}</div>
                <a href="${link}" target="_blank" class="btn btn-whatsapp btn-block mt-md">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Dir WhatsApp
                </a>
            </div>
        `;
    },

    // ========================================
    // Template Editor
    // ========================================

    templateEditor(template) {
        return `
            <form id="template-form" onsubmit="App.saveTemplate(event)">
                <input type="hidden" name="type" value="${template.type}">
                
                ${this.formGroup({
            label: 'Magaca Template',
            name: 'name',
            value: template.name,
            required: true
        })}
                
                <div class="form-group">
                    <label class="form-label">Qoraalka Fariinta</label>
                    <textarea class="form-textarea" name="text" rows="12" required style="min-height: 240px; font-size: var(--font-size-sm); line-height: 1.6;">${template.text}</textarea>
                    <div class="form-hint" style="margin-top: var(--spacing-sm);">
                        <strong>Variables:</strong> ${template.variables.map(v => `<code style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-size: var(--font-size-xs);">{${v}}</code>`).join(' ')}
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block btn-lg">Kaydi Template</button>
            </form>
        `;
    },

    // ========================================
    // Emoji Picker - Grid
    // ========================================

    iconPicker(selected = 'folder') {
        const icons = [
            { name: 'folder', label: 'Folder' },
            { name: 'heart', label: 'Health' },
            { name: 'academicCap', label: 'Education' },
            { name: 'home', label: 'Home' },
            { name: 'buildingLibrary', label: 'Building' },
            { name: 'car', label: 'Transport' },
            { name: 'plane', label: 'Travel' },
            { name: 'briefcase', label: 'Business' },
            { name: 'gift', label: 'Gift' },
            { name: 'handRaised', label: 'Prayer' },
            { name: 'sparkles', label: 'Sparkles' },
            { name: 'star', label: 'Star' },
            { name: 'moon', label: 'Moon' },
            { name: 'sun', label: 'Sun' },
            { name: 'flower', label: 'Flower' },
            { name: 'currencyDollar', label: 'Money' },
            { name: 'users', label: 'Community' },
            { name: 'globe', label: 'Globe' }
        ];

        return `
            <div class="form-group">
                <label class="form-label">Sawir (Icon)</label>
                <div class="icon-picker">
                    ${icons.map(icon => `
                        <button type="button" class="icon-picker-btn ${icon.name === selected ? 'selected' : ''}" 
                                onclick="this.closest('.icon-picker').querySelectorAll('.icon-picker-btn').forEach(b => b.classList.remove('selected')); this.classList.add('selected'); document.querySelector('input[name=icon]').value = '${icon.name}';" 
                                title="${icon.label}">
                            ${Icons.render(icon.name, 'icon icon-lg')}
                        </button>
                    `).join('')}
                </div>
                <input type="hidden" name="icon" value="${selected}">
            </div>
        `;
    }
};
