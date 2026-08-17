import express from "express";
import axios from "axios";
import { saveSDD, listSDD, getSDD } from "./sddController.js";

const router = express.Router();

// ================= CONFIG =================
const APOLLO_BASE = "https://apollo-sdk.tcuat.gocommotion.com/";
const STREAM_BASE = "https://sdk-chat-link-tier0.tcuat.gocommotion.com";

const APP_KEY = "583f5fdd-2855-45c7-a512-b8c43a973f0f";

// ================= SDD ROUTES =================
router.post("/sdd/save", saveSDD);
router.get("/sdd/list", listSDD);
router.get("/sdd/:fileName", getSDD);

// ================= APOLLO GRAPHQL PROXY =================
router.post("/apollo", async (req, res) => {
  try {
    console.log("➡️ Apollo request:", req.body);

    const response = await axios.post(APOLLO_BASE, req.body, {
      headers: {
        "content-type": "application/json",
        "appkey": APP_KEY,
      },
      timeout: 30000
    });
    console.log(response.data)
    res.json(response.data);

  } catch (err) {
    console.error("❌ Apollo Error:", err.message);

    res.status(err.response?.status || 500).json({
      error: true,
      message: err.response?.data || err.message
    });
  }
});

// ================= STREAM PROXY (SSE) =================
router.get("/stream", async (req, res) => {
  try {
    const { requestId, appKey, streamType, version } = req.query;

    // ✅ Validate required params early
    if (!requestId) {
      return res.status(400).json({ error: "Missing requestId" });
    }

    const resolvedAppKey = appKey || APP_KEY;
    const resolvedStreamType = streamType || "TEXT";

    let url = `${STREAM_BASE}/conciergex/stream?streamType=${resolvedStreamType}&requestId=${requestId}&appKey=${resolvedAppKey}`;
    
    // ✅ Append version if provided
    if (version) url += `&version=${version}`;

    console.log("➡️ Stream request:", url);

    const response = await axios.get(url, {
      responseType: "stream",
      headers: {
        accept: "text/event-stream"
      },
      // ✅ Prevent axios from timing out long-lived SSE connections
      timeout: 0
    });

    // ✅ SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // ✅ Disables Nginx buffering if behind a proxy

    response.data.pipe(res);

    response.data.on("end", () => {
      console.log("✅ Stream ended for requestId:", requestId);
      res.end();
    });

    response.data.on("error", (err) => {
      console.error("❌ Stream error:", err.message);
      res.end();
    });

    // ✅ Clean up if client disconnects early
    req.on("close", () => {
      console.log("⚠️ Client disconnected, destroying stream for:", requestId);
      response.data.destroy();
    });

  } catch (err) {
    console.error("❌ Stream Proxy Error:", err.message);
    res.status(500).json({ error: "Stream failed", detail: err.message });
  }
});
export default router;
