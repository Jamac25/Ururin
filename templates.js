/* ========================================
   TEMPLATE MANAGER
   UI for managing message templates
   ======================================== */

const TemplateManager = {
    // Default templates
    defaults: {
        'group_update': {
            id: 'group_update',
            name: 'Cusbooneysiin Koox',
            text: `💰 LIISKA URURINTA LACAGTA – {campaign_name}

📊 Guud ahaan:
Ujeedada: {goal}
La ururiyey: {collected} ({percent}%)
Hadhay: {remaining}

👥 Dadka ({total_people} qof):
{contributors_list}

📱 Zaad: {zaad_number}

📅 Deadline: {deadline}

✅ Lacag bixin: fadlan u dir lacagta lambarka kor ku qoran.
❓ Su'aalo: {coordinator_name}`,
            type: 'group_update'
        },
        'individual_reminder': {
            id: 'individual_reminder',
            name: 'Xasuusin Shakhsi',
            text: `Salaan {name},

Waxaan kugu xasuusinayaa tabarucaadkaaga oo ah {amount} ee ololaha {campaign_name}.

📱 Zaad: {zaad_number}

Mahadsanid!`,
            type: 'individual_reminder'
        },
        'thank_you': {
            id: 'thank_you',
            name: 'Mahadsanid',
            text: `Mahadsanid {name}! 🙏

Waxaanu helnay lacagtaada {amount} ee ololaha {campaign_name}.

Taageradaada aad bay muhiim u tahay!

✅ Xaalad: La helay`,
            type: 'thank_you'
        }
    },

    init() {
        // Ensure default templates exist
        const templates = DB.getTemplates();
        if (!templates || templates.length === 0) {
            Object.values(this.defaults).forEach(template => {
                DB.saveTemplate(template);
            });
        }
    },

    // Render templates section in settings
    renderTemplatesSection() {
        const templates = DB.getTemplates();

        return `
            <div class="section-header">
                <h3>💬 Templates-ka Fariimaha</h3>
                <button class="btn btn-sm btn-primary" onclick="TemplateManager.showAddModal()">
                    + Ku dar cusub
                </button>
            </div>
            <div class="templates-list">
                ${templates.length === 0 ? `
                    <div class="empty-state">
                        <p>Ma jiraan templates. Riix "Ku dar cusub" si aad u sameyso mid cusub.</p>
                    </div>
                ` : templates.map(t => this.renderTemplateCard(t)).join('')}
            </div>
        `;
    },

    renderTemplateCard(template) {
        return `
            <div class="template-card" data-template-id="${template.id}">
                <div class="template-card-header">
                    <span class="template-card-title">${template.name}</span>
                    <div style="display: flex; gap: var(--spacing-xs);">
                        <button class="btn btn-sm btn-secondary" onclick="TemplateManager.edit('${template.id}')">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="TemplateManager.delete('${template.id}')">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="template-card-preview">${template.text.substring(0, 100)}...</div>
            </div>
        `;
    },

    showAddModal() {
        Components.showModal('Ku Dar Template Cusub', `
            <form id="template-form" onsubmit="TemplateManager.save(event)">
                <div class="form-group">
                    <label>Magaca Template</label>
                    <input type="text" name="name" required placeholder="e.g., Xasuusin Bisha">
                </div>
                <div class="form-group">
                    <label>Nooca</label>
                    <select name="type">
                        <option value="group_update">Cusbooneysiin Koox</option>
                        <option value="individual_reminder">Xasuusin Shakhsi</option>
                        <option value="thank_you">Mahadsanid</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Qoraalka</label>
                    <textarea name="text" rows="8" required placeholder="Qoraalka template-ka..."></textarea>
                    <small class="form-help">Variables: {name}, {amount}, {campaign_name}, {goal}, {collected}, {zaad_number}</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Components.closeModal()">Xir</button>
                    <button type="submit" class="btn btn-primary">Kaydi</button>
                </div>
            </form>
        `);
    },

    edit(templateId) {
        const template = DB.getTemplate(templateId);
        if (!template) return;

        Components.showModal('Wax ka bedel Template', `
            <form id="template-form" onsubmit="TemplateManager.update(event, '${templateId}')">
                <div class="form-group">
                    <label>Magaca Template</label>
                    <input type="text" name="name" required value="${template.name}">
                </div>
                <div class="form-group">
                    <label>Nooca</label>
                    <select name="type">
                        <option value="group_update" ${template.type === 'group_update' ? 'selected' : ''}>Cusbooneysiin Koox</option>
                        <option value="individual_reminder" ${template.type === 'individual_reminder' ? 'selected' : ''}>Xasuusin Shakhsi</option>
                        <option value="thank_you" ${template.type === 'thank_you' ? 'selected' : ''}>Mahadsanid</option>
                        <option value="custom" ${template.type === 'custom' ? 'selected' : ''}>Custom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Qoraalka</label>
                    <textarea name="text" rows="8" required>${template.text}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Components.closeModal()">Xir</button>
                    <button type="submit" class="btn btn-primary">Kaydi</button>
                </div>
            </form>
        `);
    },

    save(event) {
        event.preventDefault();
        const form = event.target;

        const template = {
            id: 'template_' + Date.now(),
            name: form.name.value,
            type: form.type.value,
            text: form.text.value,
            createdAt: new Date().toISOString()
        };

        DB.saveTemplate(template);
        Components.closeModal();
        Components.toast('✅ Template waa la kaydiyey!', 'success');

        // Refresh settings view
        if (window.location.hash.includes('settings')) {
            App.router.loadRoute('#/settings');
        }
    },

    update(event, templateId) {
        event.preventDefault();
        const form = event.target;

        const template = {
            id: templateId,
            name: form.name.value,
            type: form.type.value,
            text: form.text.value,
            updatedAt: new Date().toISOString()
        };

        DB.saveTemplate(template);
        Components.closeModal();
        Components.toast('✅ Template waa la cusbooneysiiyey!', 'success');

        if (window.location.hash.includes('settings')) {
            App.router.loadRoute('#/settings');
        }
    },

    delete(templateId) {
        if (!confirm('Ma hubtaa inaad tirtirayso template-kan?')) return;

        const templates = DB.getTemplates().filter(t => t.id !== templateId);
        localStorage.setItem('templates', JSON.stringify(templates));

        Components.toast('🗑️ Template waa la tirtiray', 'success');

        if (window.location.hash.includes('settings')) {
            App.router.loadRoute('#/settings');
        }
    },

    // Apply template with variables
    applyTemplate(templateId, data) {
        const template = DB.getTemplate(templateId);
        if (!template) return '';

        let text = template.text;

        // Replace variables
        const variables = {
            '{name}': data.name || '',
            '{amount}': data.amount || '',
            '{campaign_name}': data.campaignName || '',
            '{goal}': data.goal || '',
            '{collected}': data.collected || '',
            '{remaining}': data.remaining || '',
            '{percent}': data.percent || '',
            '{total_people}': data.totalPeople || '',
            '{zaad_number}': data.zaadNumber || '',
            '{coordinator_name}': data.coordinatorName || '',
            '{deadline}': data.deadline || '',
            '{contributors_list}': data.contributorsList || ''
        };

        Object.entries(variables).forEach(([key, value]) => {
            text = text.replaceAll(key, value);
        });

        return text;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    TemplateManager.init();
});

// Make globally available
window.TemplateManager = TemplateManager;
