import fs from "fs";
import path from "path";

const SDD_DIR = path.join(process.cwd(), "sdd_store");

// ensure folder exists
if (!fs.existsSync(SDD_DIR)) {
  fs.mkdirSync(SDD_DIR);
}

// ─── SAVE SDD ─────────────────────────────
export const saveSDD = (req, res) => {
  try {
    const data = req.body;
    console.log(data.Q1_client_name)
    const fileName = `${data.Q1_client_name || "unknown"}_${Date.now()}.json`;
    const filePath = path.join(SDD_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    res.json({
      success: true,
      message: "SDD saved successfully",
      filePath,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET ALL SDD FILES ────────────────────
export const listSDD = (req, res) => {
  try {
    const files = fs.readdirSync(SDD_DIR);

    res.json({
      success: true,
      files,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── READ ONE SDD ─────────────────────────
export const getSDD = (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(SDD_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const data = JSON.parse(fs.readFileSync(filePath));

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};