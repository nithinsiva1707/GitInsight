const API_BASE_URLS = ["http://localhost:4000", "http://localhost:4011"];
const PROFILE_ROUTE_BLOCKLIST = new Set([
    "features",
    "topics",
    "collections",
    "events",
    "marketplace",
    "sponsors",
    "settings",
    "orgs",
    "organizations",
    "search",
    "notifications",
    "new",
    "login",
    "join",
    "explore",
    "pulls",
    "issues"
]);

let activeUsername = null;
let initSequence = 0;

const classifyRank = (score) => {
    if (score >= 85) return "Elite Developer";
    if (score >= 70) return "Advanced Developer";
    if (score >= 50) return "Growing Developer";
    return "Early Stage Developer";
};

const getSidebar = () => {
    return (
        document.querySelector(".Layout-sidebar") ||
        document.querySelector(".js-profile-editable-area") ||
        document.querySelector(".js-profile-editable-cnt")
    );
};

const getInjectTarget = () => {
    return (
        getSidebar() ||
        document.querySelector(".Layout-main") ||
        document.querySelector("main")
    );
};

const ensureFloatingContainer = () => {
    let container = document.getElementById("gh-analyzer-floating-root");
    if (container) return container;

    container = document.createElement("div");
    container.id = "gh-analyzer-floating-root";
    container.style.position = "fixed";
    container.style.top = "80px";
    container.style.right = "20px";
    container.style.width = "320px";
    container.style.zIndex = "99999";
    document.body.appendChild(container);
    return container;
};

const mountPanel = (panel) => {
    const target = getInjectTarget();
    if (target && typeof target.prepend === "function") {
        target.prepend(panel);
        return;
    }
    ensureFloatingContainer().appendChild(panel);
};

const waitForSidebar = (timeoutMs = 7000) => {
    const immediate = getSidebar();
    if (immediate) {
        return Promise.resolve(immediate);
    }

    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            const sidebar = getSidebar();
            if (sidebar) {
                observer.disconnect();
                resolve(sidebar);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeoutMs);
    });
};

const injectAnalyzerUI = (data) => {
    if (document.getElementById("gh-analyzer-panel")) return;

    const panel = document.createElement("div");
    panel.id = "gh-analyzer-panel";

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
                <span class="gha-label">Consistency</span>
                <span class="gha-value">${data.breakdown.consistency}%</span>
            </div>
        </div>

        <div class="gha-suggestions">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">Suggestions</div>
            ${data.suggestions.map((s) => `
                <div class="gha-suggestion-item">
                    <span class="gha-dot"></span>
                    <span>${s}</span>
                </div>
            `).join("")}
        </div>
    `;

    mountPanel(panel);

    const button = document.getElementById("reanalyze-btn");
    if (button) {
        button.addEventListener("click", () => {
            const existing = document.getElementById("gh-analyzer-panel");
            if (existing) existing.remove();
            init();
        });
    }
};

const injectErrorUI = (message) => {
    if (document.getElementById("gh-analyzer-panel")) return;

    const panel = document.createElement("div");
    panel.id = "gh-analyzer-panel";
    panel.innerHTML = `
        <div class="gha-header">
            <span class="gha-title">Portfolio Insights</span>
        </div>
        <div style="font-size: 13px; color: var(--color-fg-muted);">
            ${message}
        </div>
    `;
    mountPanel(panel);
};

const fetchAnalysis = async (username) => {
    let lastError = null;
    for (const baseUrl of API_BASE_URLS) {
        try {
            const response = await fetch(`${baseUrl}/analyze/${encodeURIComponent(username)}`);
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload?.error?.message || `Backend error at ${baseUrl}`);
            }
            return payload.data;
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(lastError?.message || "Failed to connect to local backend");
};

const toUiModel = (analysis) => ({
    score: Math.round(analysis.score.totalScore),
    rank: classifyRank(analysis.score.totalScore),
    breakdown: {
        activity: Math.round(analysis.score.breakdown.activity),
        docs: Math.round(analysis.score.breakdown.documentation),
        quality: Math.round(analysis.score.breakdown.quality),
        consistency: Math.round(analysis.score.breakdown.consistency)
    },
    suggestions: analysis.suggestions?.length
        ? analysis.suggestions
        : ["Keep contributing consistently to maintain your score"]
});

const toInt = (value) => {
    const parsed = Number(String(value || "").replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
};

const buildFallbackFromPage = () => {
    const repoCountText = document.querySelector('a[href$="?tab=repositories"] .Counter')?.textContent;
    const followersText = document.querySelector('a[href$="?tab=followers"] .Counter')?.textContent;
    const followingText = document.querySelector('a[href$="?tab=following"] .Counter')?.textContent;

    const repoCount = toInt(repoCountText);
    const followers = toInt(followersText);
    const following = toInt(followingText);

    const activity = Math.min(100, Math.round((repoCount / 20) * 100));
    const quality = Math.min(100, Math.round((followers / 200) * 100));
    const consistency = 55;
    const docs = 60;
    const score = Math.round(activity * 0.3 + quality * 0.3 + consistency * 0.2 + docs * 0.2);

    return {
        score,
        rank: classifyRank(score),
        breakdown: { activity, docs, quality, consistency },
        suggestions: [
            "Live API analysis is temporarily rate-limited",
            "Set a valid GITHUB_TOKEN in backend .env for full accuracy",
            following === 0 ? "Consider engaging with other developers" : "Keep collaborating actively"
        ]
    };
};

const getUsernameFromRoute = () => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    if (pathParts.length !== 1) {
        return null;
    }

    const candidate = pathParts[0];
    if (!candidate || PROFILE_ROUTE_BLOCKLIST.has(candidate.toLowerCase())) {
        return null;
    }
    return candidate;
};

const init = async () => {
    const runId = ++initSequence;
    document.documentElement.setAttribute("data-gh-analyzer-loaded", "true");

    const usernameMeta = document.querySelector('meta[property="profile:username"]');
    const username = usernameMeta?.content || getUsernameFromRoute();
    if (!username) return;

    if (activeUsername && activeUsername !== username) {
        document.getElementById("gh-analyzer-panel")?.remove();
    }
    activeUsername = username;

    await waitForSidebar();
    if (runId !== initSequence) return;

    try {
        const analysis = await fetchAnalysis(username);
        if (runId !== initSequence) return;
        injectAnalyzerUI(toUiModel(analysis));
    } catch (error) {
        if (runId !== initSequence) return;
        if (String(error.message || "").toLowerCase().includes("rate limit")) {
            injectAnalyzerUI(buildFallbackFromPage());
            return;
        }
        injectErrorUI(`Could not load analysis: ${error.message}`);
    }
};

init();
document.addEventListener("turbo:render", init);
document.addEventListener("turbo:load", init);
