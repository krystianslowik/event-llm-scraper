const express = require("express");
const { extractEventsFromUrl } = require("./modules/eventExtractor");
const cors = require("cors");

const app = express();
app.use(cors());
app.get("/events", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: "Missing ?url= parameter" });
    }
    try {
        const events = await extractEventsFromUrl(targetUrl);
        res.json({ events });
    } catch (err) {
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});