import express from "express";
import cors from "cors";
import https from "https";
import fs from "fs";
import routes from "./routes.js";
import path from "path";
import { fileURLToPath } from "url";

// Needed because you're using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ CORS (update for prod if needed)
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ccass-prototype.kaleyra.dev",
	  "http://10.64.9.213:5173"
  ],
  methods: ["GET", "POST", "DELETE", "PUT"],
  credentials: true,
}));

app.use(express.json());
app.use("/api", routes);

import { login, getUsers, createUser, deleteUser } from "./userController.js";

app.post("/api_1/auth/login", login);
app.get("/api_1/auth/users", getUsers);
app.post("/api_1/auth/users", createUser);
app.delete("/api_1/auth/users/:id", deleteUser);

app.use(express.static(path.join(__dirname, "public")));

// 🔐 SSL CERT FILES (you must create these)
const options = {
  key: fs.readFileSync("./certs/private.key"),
  cert: fs.readFileSync("./certs/certificate.crt"),
};

import http from "http";

// ✅ HTTPS SERVER
https.createServer(options, app).listen(5000, () => {
  console.log("🚀 HTTPS Server running on https://localhost:5000");
}).on('error', (err) => {
  console.log("⚠️ Port 5000 might be in use.");
});

// ✅ HTTP SERVER (for local dev without SSL issues)
http.createServer(app).listen(5001, () => {
  console.log("🚀 HTTP Server running on http://localhost:5001");
});
