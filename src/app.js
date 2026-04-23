const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json({ limit: "256kb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Try again later."
    }
  }
});

app.use(limiter);

app.get("/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      service: "github-portfolio-analyzer-backend",
      status: "ok"
    }
  });
});

app.use("/", routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
