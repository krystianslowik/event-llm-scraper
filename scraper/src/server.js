// Import required modules
const express = require("express");
const cors = require("cors");
const { extractEventsFromUrl } = require("./modules/eventExtractor");

// Initialize the Express app
const app = express();

// Enable CORS
app.use(cors());

// Define the /events endpoint
app.get("/events", async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: "Missing ?url= parameter" });
    }

    try {
        console.log(`[DEBUG] Received request for URL: ${targetUrl}`);
        const events = await extractEventsFromUrl(targetUrl);
        res.json(events);
    } catch (err) {
        console.error(`[ERROR] Failed to extract events for URL: ${targetUrl}`, err.message);
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});