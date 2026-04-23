const cacheService = require("./cacheService");
const githubService = require("./githubService");
const {
  scoreActivity,
  scoreQuality,
  scoreConsistency,
  scoreDocumentation,
  computeTotalScore
} = require("../utils/scoring");
const { ApiError, roundTo, computeDaysSince, safeUsername } = require("../utils/helpers");

const CACHE_PREFIX = "github-analysis";
const README_CONCURRENCY = 5;

const runInBatches = async (items, batchSize, worker) => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    // Batching avoids API abuse while still reducing total wait time.
    const chunkResults = await Promise.all(chunk.map(worker));
    results.push(...chunkResults);
  }
  return results;
};

const aggregateLanguages = (repos) => {
  const languageCounts = repos.reduce((acc, repo) => {
    if (!repo.language) {
      return acc;
    }
    acc[repo.language] = (acc[repo.language] || 0) + 1;
    return acc;
  }, {});

  const total = Object.values(languageCounts).reduce((sum, count) => sum + count, 0);
  if (!total) {
    return {};
  }

  const distribution = {};
  for (const [language, count] of Object.entries(languageCounts)) {
    distribution[language] = roundTo((count / total) * 100);
  }
  return distribution;
};

const getTopRepositories = (repos) => {
  return [...repos]
    .sort((a, b) => {
      const scoreA = a.stargazers_count * 2 + a.forks_count;
      const scoreB = b.stargazers_count * 2 + b.forks_count;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return new Date(b.pushed_at) - new Date(a.pushed_at);
    })
    .slice(0, 5)
    .map((repo) => ({
      name: repo.name,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      lastUpdated: repo.updated_at,
      pushedAt: repo.pushed_at,
      hasReadme: repo.hasReadme
    }));
};

const generateSuggestions = (analysis) => {
  const suggestions = [];
  const { profile, repositories, score } = analysis;
  const missingReadmeCount = repositories.missingReadme.length;
  const recentPushes = repositories.all.filter((repo) => computeDaysSince(repo.pushed_at) <= 60).length;
  const languageCount = Object.keys(analysis.languages.distribution).length;

  if (missingReadmeCount > 0) {
    suggestions.push(`Add README to ${missingReadmeCount} ${missingReadmeCount === 1 ? "repository" : "repositories"}`);
  }
  if (recentPushes < 3) {
    suggestions.push("Increase commit frequency to show consistent activity");
  }
  if (!profile.bio) {
    suggestions.push("Add a bio to improve profile completeness");
  }
  if (languageCount < 3) {
    suggestions.push("Use more diverse technologies across your projects");
  }
  if (score.breakdown.documentation < 60) {
    suggestions.push("Improve documentation quality in active repositories");
  }

  return suggestions;
};

const profileCompleteness = (profile) => {
  return {
    bioPresent: Boolean(profile.bio),
    avatarPresent: Boolean(profile.avatar_url),
    publicReposThresholdMet: profile.public_repos >= 5
  };
};

const enrichReadmeData = async (username, repos) => {
  const mapped = await runInBatches(repos, README_CONCURRENCY, async (repo) => {
    const hasReadme = await githubService.checkReadmePresence(username, repo.name);
    return { ...repo, hasReadme };
  });
  return mapped;
};

const fetchRawAnalysisData = async (username) => {
  const user = await githubService.fetchUser(username);
  const repos = await githubService.fetchRepos(username);

  if (!user?.login) {
    throw new ApiError(500, "INVALID_USER_PAYLOAD", "GitHub returned invalid user payload");
  }

  const enrichedRepos = await enrichReadmeData(user.login, repos);

  return { user, repos: enrichedRepos };
};

const buildAnalysisPayload = ({ user, repos }) => {
  const breakdown = {
    activity: scoreActivity(repos),
    quality: scoreQuality(repos),
    consistency: scoreConsistency(repos),
    documentation: scoreDocumentation(repos, user)
  };

  const score = {
    totalScore: computeTotalScore(breakdown),
    breakdown
  };

  const languages = {
    distribution: aggregateLanguages(repos),
    totalDistinct: new Set(repos.map((repo) => repo.language).filter(Boolean)).size
  };

  const missingReadme = repos
    .filter((repo) => !repo.hasReadme)
    .map((repo) => ({
      name: repo.name,
      stars: repo.stargazers_count,
      language: repo.language,
      lastUpdated: repo.updated_at
    }));

  const payload = {
    username: user.login,
    profile: {
      id: user.id,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      publicGists: user.public_gists,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      completeness: profileCompleteness(user)
    },
    score,
    languages,
    repositories: {
      total: repos.length,
      top: getTopRepositories(repos),
      missingReadme,
      all: repos.map((repo) => ({
        name: repo.name,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        lastUpdated: repo.updated_at,
        pushedAt: repo.pushed_at,
        hasReadme: repo.hasReadme
      }))
    }
  };

  payload.suggestions = generateSuggestions(payload);
  return payload;
};

const getAnalysis = async (username) => {
  const normalized = safeUsername(username);
  const cacheKey = `${CACHE_PREFIX}:${normalized}:full`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const raw = await fetchRawAnalysisData(normalized);
  const analysis = buildAnalysisPayload(raw);
  await cacheService.set(cacheKey, analysis);
  return analysis;
};

const getRepos = async (username) => {
  const analysis = await getAnalysis(username);
  return {
    username: analysis.username,
    repositories: analysis.repositories,
    languages: analysis.languages
  };
};

const getScore = async (username) => {
  const analysis = await getAnalysis(username);
  return {
    username: analysis.username,
    score: analysis.score
  };
};

const compareUsers = async (usernameA, usernameB) => {
  const [a, b] = await Promise.all([getAnalysis(usernameA), getAnalysis(usernameB)]);

  return {
    users: [
      {
        username: a.username,
        totalScore: a.score.totalScore,
        breakdown: a.score.breakdown,
        repoCount: a.repositories.total,
        languageDiversity: a.languages.totalDistinct
      },
      {
        username: b.username,
        totalScore: b.score.totalScore,
        breakdown: b.score.breakdown,
        repoCount: b.repositories.total,
        languageDiversity: b.languages.totalDistinct
      }
    ],
    winner:
      a.score.totalScore === b.score.totalScore
        ? "tie"
        : a.score.totalScore > b.score.totalScore
          ? a.username
          : b.username
  };
};

module.exports = {
  getAnalysis,
  getRepos,
  getScore,
  compareUsers
};
