/**
 * UI Injection Logic
 */
const injectAnalyzerUI = (data) => {
    // Check if we are on a profile page (GitHub sidebar has a specific class)
    const sidebar = document.querySelector('.js-profile-editable-cnt');
    if (!sidebar || document.getElementById('gh-analyzer-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'gh-analyzer-panel';

    panel.innerHTML = `
        <div class="gha-header">
            <span class="gha-title">Portfolio Insights</span>
            <button class="gha-btn" id="reanalyze-btn">Re-analyze</button>
        </div>

        <div class="gha-score-container">
            <div class="gha-score-circle">${data.score}</div>
            <div>
                <div style="font-weight: 600;">Overall Rank</div>
                <div style="font-size: 12px; color: var(--color-fg-muted);">${data.rank}</div>
            </div>
        </div>

        <div class="gha-grid">
            <div class="gha-stat-card">
                <span class="gha-label">Activity</span>
                <span class="gha-value">${data.breakdown.activity}%</span>
            </div>
            <div class="gha-stat-card">
                <span class="gha-label">Docs</span>
                <span class="gha-value">${data.breakdown.docs}%</span>
            </div>
            <div class="gha-stat-card">
                <span class="gha-label">Quality</span>
                <span class="gha-value">${data.breakdown.quality}%</span>
            </div>
            <div class="gha-stat-card">
                <span class="gha-label">Diversity</span>
                <span class="gha-value">${data.breakdown.diversity}%</span>
            </div>
        </div>

        <div class="gha-suggestions">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">Suggestions</div>
            ${data.suggestions.map(s => `
                <div class="gha-suggestion-item">
                    <span class="gha-dot"></span>
                    <span>${s}</span>
                </div>
            `).join('')}
        </div>
    `;

    sidebar.parentNode.insertBefore(panel, sidebar.nextSibling);
    
    document.getElementById('reanalyze-btn').addEventListener('click', () => {
        location.reload();
    });
};

// Initialize the extension
const init = () => {
    const username = window.location.pathname.split('/')[1];
    const isProfile = document.querySelector('meta[property="profile:username"]');

    if (isProfile && username) {
        // Mock data for frontend demo
        const mockData = {
            score: 82,
            rank: "Advanced Developer",
            breakdown: { activity: 90, docs: 65, quality: 85, diversity: 70 },
            suggestions: [
                "Add a README to your 'Project-X' repo",
                "Pin more repositories to showcase variety",
                "Increase commit frequency on weekends"
            ]
        };
        
        injectAnalyzerUI(mockData);
    }
};

// Run on page load and during GitHub's soft navigations
init();
document.addEventListener('turbo:render', init);
