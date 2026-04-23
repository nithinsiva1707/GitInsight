const { clamp, normalizeScore, roundTo, computeDaysSince } = require("./helpers");

const scoreActivity = (repos) => {
  if (!repos.length) {
    return 0;
  }

  const recentPushCount = repos.filter((repo) => computeDaysSince(repo.pushed_at) <= 90).length;
  const recentRatio = recentPushCount / repos.length;
  const repoVolume = normalizeScore(repos.length, 40) / 100;

  return roundTo(clamp((recentRatio * 0.7 + repoVolume * 0.3) * 100, 0, 100));
};

const scoreQuality = (repos) => {
  if (!repos.length) {
    return 0;
  }

  const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const forks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
  const combined = stars * 1.6 + forks * 1.2;

  return roundTo(normalizeScore(combined, 600));
};

const scoreConsistency = (repos) => {
  if (!repos.length) {
    return 0;
  }

  const activeMonths = new Set();
  for (const repo of repos) {
    const date = new Date(repo.pushed_at);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    activeMonths.add(`${date.getUTCFullYear()}-${date.getUTCMonth()}`);
  }

  const consistencyBase = normalizeScore(activeMonths.size, 12) / 100;
  const archivedPenalty = repos.filter((repo) => repo.archived).length / repos.length;

  return roundTo(clamp((consistencyBase * 0.8 + (1 - archivedPenalty) * 0.2) * 100, 0, 100));
};

const scoreDocumentation = (repos, profile) => {
  if (!repos.length) {
    const profileScore = profile.bio ? 40 : 20;
    return roundTo(profileScore);
  }

  const withReadme = repos.filter((repo) => repo.hasReadme).length;
  const readmeRatio = withReadme / repos.length;

  const bioScore = profile.bio ? 100 : 40;
  const avatarScore = profile.avatar_url ? 100 : 0;
  const profileCompleteness = (bioScore * 0.6 + avatarScore * 0.4) / 100;

  return roundTo(clamp((readmeRatio * 0.8 + profileCompleteness * 0.2) * 100, 0, 100));
};

const computeTotalScore = (breakdown) => {
  const weighted =
    breakdown.activity * 0.3 +
    breakdown.quality * 0.3 +
    breakdown.consistency * 0.2 +
    breakdown.documentation * 0.2;

  return roundTo(clamp(weighted, 0, 100));
};

module.exports = {
  scoreActivity,
  scoreQuality,
  scoreConsistency,
  scoreDocumentation,
  computeTotalScore
};
