# Event Scraper Project

A Node.js-based web scraper for extracting and summarizing event details from websites.

## Prerequisites

- Docker & Docker Compose installed
- OpenAI API key

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/krystianslowik/event-llm-scraper.git
   cd event-llm-scraper
   ```

2. Add a `.env` file in the project root with the following content (replace OpenAI API key):
   ```
   OPENAI_API_KEY=sk-proj-yourapikey
   ```

3. Build and run the project using Docker Compose:
   ```bash
   docker-compose up --build
   ```

## Interface

Interface available under http://localhost (port 80)

## Endpoints

### **GET `localhost:3000/events`**

Query parameters:
- `url` (required): URL of the page to scrape

Example:
```
http://localhost:3000/events?url=https://example.com
```

## API Response

Example response:
```json
{
   "events": {
      "events": [
         {
            "title": "Tech Conference 2025",
            "description": "A conference for tech enthusiasts.",
            "url": "https://example.com/event-details",
            "category": "Technology",
            "date": "2025-03-10",
            "needsUrlCheck": true
         }
      ],
      "categories": ["Technology"]
   }
}
```

## Project Structure

- **`./ollama`**: tbd
- **`ui`**: Angular UI 
- **`scraper`**: Node.js scraper backend

---