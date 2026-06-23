"use strict";

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const houseRoutes = require("./routes/houseRoutes");
const characterRoutes = require("./routes/characterRoutes");
const quoteRoutes = require("./routes/quoteRoutes");

connectDB();

const app = express();

app.use(cors());

app.use(express.json());

const swaggerDocument = YAML.load(path.join(__dirname, "docs", "swagger.yaml"));
app.get("/api/docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerDocument);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const port = process.env.PORT || 3001;

app.use("/api/houses", houseRoutes);
app.use("/api/characters", characterRoutes);
app.use("/api/quotes", quoteRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Server Error" });
});

app.listen(port, function () {
  console.log("Server running on port", port);
});