/**
 * Modular Scoring Calculations
 */
const calculatePortfolioScore = (userData, repos) => {
    let score = 0;
    const weights = {
        repoCount: 10,
        stars: 30,
        documentation: 20,
        activity: 20,
        completeness: 20
    };

    const starCount = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
    const hasBio = userData.bio ? 1 : 0;
    const readmeRatio = repos.filter(r => r.has_pages).length / repos.length;

    return {
        total: Math.min(100, (starCount * 2) + (hasBio * 20)),
        breakdown: {
            activity: 80, 
            docs: Math.round(readmeRatio * 100),
            quality: 75,
            diversity: 60
        }
    };
};