/* ========================================
   EXCEL/CSV EXPORT
   Export campaign data to Excel/CSV format
   ======================================== */

const ExcelExport = {
    // Export campaign contributors to CSV
    exportCampaignCSV(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) {
            Components.toast('Kampanja buuro ma la helin', 'error');
            return;
        }

        const contributors = DB.getContributors(campaignId);
        const stats = DB.getCampaignStats(campaignId);
        const settings = DB.getSettings();

        // Create CSV header
        let csv = '\uFEFF'; // BOM for Excel UTF-8
        csv += 'OLOLEEYE - ' + campaign.name + '\n';
        csv += 'Taariikhda: ' + new Date().toLocaleDateString() + '\n';
        csv += 'Hadafka: ' + settings.currencySymbol + stats.goal.toLocaleString() + '\n';
        csv += 'La ururiyey: ' + settings.currencySymbol + stats.collected.toLocaleString() + ' (' + stats.percent + '%)\n';
        csv += '\n';

        // Column headers
        csv += 'Magaca,Telefoon,Lacagta,Xaalada,Taariikhda\n';

        // Data rows
        contributors.forEach(c => {
            const status = c.status === 'paid' ? 'Bixiyey' :
                c.status === 'declined' ? 'Diiday' : 'Sugaya';
            const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '';

            csv += `"${c.name}","${c.phone}","${settings.currencySymbol}${c.amount}","${status}","${date}"\n`;
        });

        // Summary
        csv += '\n';
        csv += 'KOOBAN\n';
        csv += 'Wadarta dadka,' + stats.total + '\n';
        csv += 'Bixiyey,' + stats.paidCount + '\n';
        csv += 'Sugaya,' + stats.pendingCount + '\n';
        csv += 'Diiday,' + stats.declinedCount + '\n';

        this.downloadCSV(csv, `${campaign.name}_contributors.csv`);
        Components.toast('✅ CSV waa la soo dejiyey!', 'success');

        if (typeof Analytics !== 'undefined') {
            Analytics.trackEvent('Export', 'csv', campaignId);
        }
    },

    // Export all campaigns summary
    exportAllCampaignsCSV() {
        const campaigns = DB.getCampaigns();
        const settings = DB.getSettings();

        let csv = '\uFEFF';
        csv += 'OLOLEEYE - Warbixinta Ololalaha\n';
        csv += 'Taariikhda: ' + new Date().toLocaleDateString() + '\n\n';

        csv += 'Magaca,Hadafka,La ururiyey,Boqolkiiba,Dadka,Bixiyey,Sugaya\n';

        let totalGoal = 0;
        let totalCollected = 0;
        let totalContributors = 0;

        campaigns.forEach(campaign => {
            const stats = DB.getCampaignStats(campaign.id);
            totalGoal += stats.goal;
            totalCollected += stats.collected;
            totalContributors += stats.total;

            csv += `"${campaign.name}","${settings.currencySymbol}${stats.goal.toLocaleString()}","${settings.currencySymbol}${stats.collected.toLocaleString()}","${stats.percent}%","${stats.total}","${stats.paidCount}","${stats.pendingCount}"\n`;
        });

        csv += '\n';
        csv += 'WADARTA GUUD\n';
        csv += 'Ololalaha,' + campaigns.length + '\n';
        csv += 'Hadafka wadarta,' + settings.currencySymbol + totalGoal.toLocaleString() + '\n';
        csv += 'La ururiyey wadarta,' + settings.currencySymbol + totalCollected.toLocaleString() + '\n';
        csv += 'Dadka wadarta,' + totalContributors + '\n';

        this.downloadCSV(csv, 'ololeeye_all_campaigns.csv');
        Components.toast('✅ CSV waa la soo dejiyey!', 'success');

        if (typeof Analytics !== 'undefined') {
            Analytics.trackEvent('Export', 'csv_all', campaigns.length);
        }
    },

    // Helper: Download CSV file
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    },

    // Export to Excel (XLSX format using simple table)
    exportCampaignExcel(campaignId) {
        const campaign = DB.getCampaign(campaignId);
        if (!campaign) {
            Components.toast('Kampanja buuro ma la helin', 'error');
            return;
        }

        const contributors = DB.getContributors(campaignId);
        const stats = DB.getCampaignStats(campaignId);
        const settings = DB.getSettings();

        // Create HTML table for Excel
        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="UTF-8">
                <style>
                    table { border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #059669; color: white; }
                    .paid { color: green; }
                    .pending { color: orange; }
                    .declined { color: red; }
                </style>
            </head>
            <body>
                <h1>${campaign.emoji || '💰'} ${campaign.name}</h1>
                <p><strong>Taariikhda:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Hadafka:</strong> ${settings.currencySymbol}${stats.goal.toLocaleString()}</p>
                <p><strong>La ururiyey:</strong> ${settings.currencySymbol}${stats.collected.toLocaleString()} (${stats.percent}%)</p>
                <br>
                <table>
                    <tr>
                        <th>#</th>
                        <th>Magaca</th>
                        <th>Telefoon</th>
                        <th>Lacagta</th>
                        <th>Xaalada</th>
                        <th>Taariikhda</th>
                    </tr>
        `;

        contributors.forEach((c, index) => {
            const statusClass = c.status === 'paid' ? 'paid' : c.status === 'declined' ? 'declined' : 'pending';
            const statusText = c.status === 'paid' ? '✅ Bixiyey' : c.status === 'declined' ? '❌ Diiday' : '⏳ Sugaya';
            const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '';

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${c.name}</td>
                    <td>${c.phone}</td>
                    <td>${settings.currencySymbol}${c.amount}</td>
                    <td class="${statusClass}">${statusText}</td>
                    <td>${date}</td>
                </tr>
            `;
        });

        html += `
                </table>
                <br>
                <h3>KOOBAN</h3>
                <table>
                    <tr><td>Wadarta dadka</td><td>${stats.total}</td></tr>
                    <tr><td>Bixiyey</td><td>${stats.paidCount}</td></tr>
                    <tr><td>Sugaya</td><td>${stats.pendingCount}</td></tr>
                    <tr><td>Diiday</td><td>${stats.declinedCount}</td></tr>
                </table>
            </body>
            </html>
        `;

        this.downloadExcel(html, `${campaign.name}_contributors.xls`);
        Components.toast('✅ Excel waa la soo dejiyey!', 'success');

        if (typeof Analytics !== 'undefined') {
            Analytics.trackEvent('Export', 'excel', campaignId);
        }
    },

    // Helper: Download Excel file
    downloadExcel(content, filename) {
        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
};

// Make globally available
window.ExcelExport = ExcelExport;
