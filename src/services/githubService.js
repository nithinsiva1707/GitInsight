const axios = require("axios");
const config = require("../config");
const { ApiError, safeUsername } = require("../utils/helpers");

const githubClient = axios.create({
  baseURL: config.githubApiBaseUrl,
  timeout: 15000,
  headers: {
    Accept: "application/vnd.github+json",
    ...(config.githubToken ? { Authorization: `Bearer ${config.githubToken}` } : {})
  }
});

const throwFromGithubError = (error, fallbackMessage = "GitHub API request failed") => {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || fallbackMessage;

    if (status === 404) {
      throw new ApiError(404, "USER_NOT_FOUND", "GitHub user not found");
    }
    if (status === 403 && String(message).toLowerCase().includes("rate limit")) {
      throw new ApiError(429, "GITHUB_RATE_LIMIT", "GitHub API rate limit exceeded");
    }
    throw new ApiError(status, "GITHUB_API_ERROR", message, error.response.data);
  }

  throw new ApiError(503, "NETWORK_ERROR", "Unable to communicate with GitHub API");
};

const checkRateLimitHeaders = (headers) => {
  const remaining = Number(headers["x-ratelimit-remaining"]);
  if (!Number.isNaN(remaining) && remaining <= 0) {
    throw new ApiError(429, "GITHUB_RATE_LIMIT", "GitHub API rate limit exceeded");
  }
};

const mapRepo = (repo) => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.full_name,
  htmlUrl: repo.html_url,
  description: repo.description,
  language: repo.language,
  stargazers_count: repo.stargazers_count,
  forks_count: repo.forks_count,
  open_issues_count: repo.open_issues_count,
  watchers_count: repo.watchers_count,
  size: repo.size,
  created_at: repo.created_at,
  updated_at: repo.updated_at,
  pushed_at: repo.pushed_at,
  archived: repo.archived,
  fork: repo.fork,
  visibility: repo.visibility
});

const fetchUser = async (username) => {
  const normalized = safeUsername(username);

  try {
    const response = await githubClient.get(`/users/${normalized}`);
    checkRateLimitHeaders(response.headers);
    return response.data;
  } catch (error) {
    throwFromGithubError(error, "Failed to fetch user profile");
  }
};

const fetchRepos = async (username) => {
  const normalized = safeUsername(username);
  const allRepos = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    try {
      const response = await githubClient.get(`/users/${normalized}/repos`, {
        params: { per_page: perPage, page, sort: "updated", direction: "desc" }
      });
      checkRateLimitHeaders(response.headers);

      const repos = response.data.map(mapRepo);
      allRepos.push(...repos);

      if (repos.length < perPage) {
        break;
      }
      page += 1;
    } catch (error) {
      throwFromGithubError(error, "Failed to fetch repositories");
    }
  }

  return allRepos;
};

const checkReadmePresence = async (owner, repo) => {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/readme`);
    checkRateLimitHeaders(response.headers);
    return Boolean(response.data?.name);
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    throwFromGithubError(error, `Failed to fetch README for ${owner}/${repo}`);
  }
};

module.exports = {
  fetchUser,
  fetchRepos,
  checkReadmePresence
};
