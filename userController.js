import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch (err) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function getMasterAdmin() {
  let user = "admin";
  let pass = "password";
  try {
    const envPath = path.join(__dirname, "../sdd-widget-source/.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const uMatch = content.match(/VITE_USERNAME=(.*)/);
      const pMatch = content.match(/VITE_PASSWORD=(.*)/);
      if (uMatch) user = uMatch[1].trim();
      if (pMatch) pass = pMatch[1].trim();
    }
  } catch (e) {
    console.error("Failed to read master admin from env");
  }
  return { user, pass };
}

export const getUsers = (req, res) => {
  const users = readUsers();
  // We send passwords so admin can potentially see or edit them. Wait, the user asked to edit them. We shouldn't send passwords back typically, but for this local tool we will send it back to the admin.
  // Actually, let's just send the whole object.
  const master = getMasterAdmin();
  const allUsers = [
    { id: "master", username: master.user, role: "admin", created_at: new Date().toISOString() },
    ...users
  ];
  res.json({ users: allUsers });
};

export const createUser = (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  
  const master = getMasterAdmin();
  if (username === master.user) {
    return res.status(400).json({ error: "Cannot modify the master admin via UI" });
  }

  const users = readUsers();
  const existingIndex = users.findIndex(u => u.username === username);
  
  if (existingIndex !== -1) {
    // Update existing user
    users[existingIndex].password = password;
    users[existingIndex].role = role || "operator";
    writeUsers(users);
    return res.json({ success: true, user: users[existingIndex] });
  }

  const newUser = {
    id: crypto.randomUUID(),
    username,
    password,
    role: role || "operator",
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  writeUsers(users);
  res.json({ success: true, user: newUser });
};

export const deleteUser = (req, res) => {
  const { id } = req.params;
  if (id === "master") return res.status(400).json({ error: "Cannot delete master admin" });

  const users = readUsers();
  const updated = users.filter(u => u.id !== id);
  if (updated.length === users.length) return res.status(404).json({ error: "User not found" });
  
  writeUsers(updated);
  res.json({ success: true });
};

export const login = (req, res) => {
  const { username, password } = req.body;
  
  const master = getMasterAdmin();
  // 1. Check Master Admin from Env
  if (username === master.user && password === master.pass) {
    return res.json({
      token: "master-admin-token-" + crypto.randomUUID(),
      user: { username, role: "admin" }
    });
  }

  // 2. Check JSON file
  const users = readUsers();
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    return res.json({
      token: "user-token-" + crypto.randomUUID(),
      user: { username: user.username, role: user.role }
    });
  }

  return res.status(401).json({ error: "Invalid username or password" });
};
