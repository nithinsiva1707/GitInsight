# GitHub Portfolio Analyzer Backend

Production-ready REST backend for analyzing GitHub developer portfolios.

## Features

- Express-based clean architecture (`controllers`, `services`, `utils`, `routes`, `middleware`, `config`)
- GitHub API integration with pagination support
- Dynamic analysis and scoring engine (`0-100`) with breakdown:
  - activity
  - quality
  - consistency
  - documentation
- Language distribution analysis
- Repository insights:
  - top repositories
  - missing README repositories
  - processed repository metadata
- Suggestions engine based on actual metrics
- Caching:
  - in-memory by default
  - optional Redis cache via `REDIS_URL`
- Basic abuse prevention using request rate limiting
- Structured error handling and consistent JSON responses

## API Endpoints

- `GET /analyze/:username` - full analysis
- `GET /repos/:username` - repository insights + languages
- `GET /score/:username` - score-only breakdown
- `POST /compare` - compare two usernames
  - body:
    ```json
    {
      "usernameA": "torvalds",
      "usernameB": "gaearon"
    }
    ```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   copy .env.example .env
   ```
3. Update `.env` values:
   - `PORT` (default: `4000`)
   - `GITHUB_TOKEN` (recommended to avoid strict rate limits)
   - `CACHE_TTL_SECONDS` (10-30 minutes suggested, default `1200`)
   - `REDIS_URL` (optional)
4. Run in development:
   ```bash
   npm run dev
   ```
   or production:
   ```bash
   npm start
   ```

## Test with curl

- Health:
  ```bash
  curl http://localhost:4000/health
  ```
- Analyze:
  ```bash
  curl http://localhost:4000/analyze/torvalds
  ```
- Repos:
  ```bash
  curl http://localhost:4000/repos/torvalds
  ```
- Score:
  ```bash
  curl http://localhost:4000/score/torvalds
  ```
- Compare:
  ```bash
  curl -X POST http://localhost:4000/compare ^
    -H "Content-Type: application/json" ^
    -d "{\"usernameA\":\"torvalds\",\"usernameB\":\"gaearon\"}"
  ```

## Error response shape

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## Notes

- This backend can directly support a Chrome extension frontend.
- Optional database persistence can be added later for analysis history without changing API contracts.
