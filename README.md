# EventScraper

A powerful web scraping application that extracts, processes, and organizes event information from websites using AI and natural language processing.

## Project Overview

EventScraper is a full-stack application designed to extract event details from any website. It uses Playwright for web scraping and OpenAI's models (like GPT-4o-mini) to intelligently identify and extract event data such as titles, descriptions, dates, URLs, and categories.

The application consists of two main components:
- **Backend** (`/scraper/`): A Node.js/TypeScript service that handles web scraping, AI processing, and database operations
- **Frontend** (`/ui/`): A React application that provides a user-friendly interface for interacting with the scraper

## Architecture

### Backend Architecture

The backend follows a modular design with these components:
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic for processing and managing data
- **Repositories**: Manage database operations
- **Modules**: House core functionality like the event extraction engine

Data flow:
1. The user submits URLs through the frontend
2. The backend scrapes the content using Playwright
3. Content is processed by OpenAI to extract events
4. Events are stored in PostgreSQL
5. Server-sent events (SSE) provide real-time updates to the frontend

### Database

PostgreSQL database with tables for:
- `events`: Stores extracted event data
- `source_settings`: Stores configuration settings for each source URL
- `scraping_attempts`: Logs scraping attempts and results
- `scoring_results`: Stores evaluation metrics for scraping accuracy

## Tech Stack

### Backend
- **Language**: TypeScript/Node.js
- **Web Framework**: Express
- **Database**: PostgreSQL
- **ORM/Query Builder**: Knex.js
- **Web Scraping**: Playwright
- **AI Integration**: OpenAI API
- **HTML Parsing**: Cheerio

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Installation & Setup

### Prerequisites
- Docker & Docker Compose
- Node.js v20+ (for local development)
- OpenAI API key

### Environment Variables
Create a `.env` file in the project root:
```
OPENAI_API_KEY=your_openai_api_key
PG_USER=scraper_old
PG_PASSWORD=scraperpass
PG_DATABASE=eventsdb
```

### Running with Docker (recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f scraper_ts
```

### Running Without Docker
#### Backend Setup
```bash
cd scraper
npm install
npm run dev
```

#### Frontend Setup
```bash
cd ui
npm install
npm run dev
```

#### Database Setup
```bash
# Install PostgreSQL
# Create database and user according to .env configuration
cd scraper
npx knex migrate:latest
```

## API Endpoints

### Events API
- `GET /events?url=<url>`: Retrieve events from a specific URL
- `GET /events/stream?url=<url>`: Real-time event updates via SSE

### Settings API
- `GET /settings/all`: Get all stored source settings
- `GET /settings?sourceUrl=<url>`: Get settings for a specific URL
- `POST /settings`: Create or update settings
- `DELETE /settings?sourceUrl=<url>`: Delete settings

### Scores API
- `GET /scores/known/<url>`: Get known scores for a URL
- `GET /scores/unknown/<url>`: Get unknown scores for a URL

## Scraper Settings

The scraper can be customized with these parameters:
- `minTextLength`: Minimum text length to consider
- `maxTextLength`: Maximum text length for each chunk
- `maxCombinedSize`: Maximum size for combined chunks
- `categorySet`: Comma-separated list of event categories
- `customPrompt`: Custom prompt for the AI model
- `gptModel`: Which OpenAI model to use (default: gpt-4o-mini)
- `showEventsWithoutLinks`: Include events without links
- `iterateIframes`: Search through iframes for content

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add feature-name'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

ISC License