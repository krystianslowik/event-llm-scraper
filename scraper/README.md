# EventScraper Backend

The backend component of EventScraper is a modular TypeScript/Node.js application that handles web scraping, AI-powered event extraction, and persistence of event data.

## Architecture Overview

The backend follows a clean, modular architecture with clear separation of concerns:

```
scraper/
├── src/                     # Source code
│   ├── controllers/         # HTTP request handlers
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic
│   ├── modules/             # Core functionality modules
│   ├── db/                  # Database related code
│   │   ├── migrations/      # Database schema migrations
│   │   └── ...
│   ├── utils/               # Utility functions
│   └── server.ts            # Application entry point
├── Dockerfile               # Container configuration
└── knexfile.js              # Database configuration
```

## Modules & Components

### `server.ts`

The entry point that initializes the Express application, sets up middleware, registers routes, and starts the HTTP server.

### Controllers Layer (`/controllers`)

Controllers handle HTTP requests and responses, performing input validation and error handling.

- **`eventsController.ts`**: Handles event retrieval and extraction requests
- **`settingsController.ts`**: Manages source-specific settings
- **`scoresController.ts`**: Provides endpoints for quality metrics

### Services Layer (`/services`)

Services contain business logic, orchestrating data flow between controllers and repositories.

- **`eventsService.ts`**: Manages event data and extraction jobs
- **`settingsService.ts`**: Handles source settings persistence
- **`scoresService.ts`**: Calculates and retrieves quality metrics for extractions

### Repositories (`/db`)

Repositories provide data access abstractions for the database.

- **`eventsRepository.ts`**: CRUD operations for events
- **`db.ts`**: Database connection setup with Knex.js

### Core Modules (`/modules`)

Specialized modules containing core business logic.

- **`eventExtractor.ts`**: Core scraping and extraction logic:
  - Web page scraping with Playwright
  - Content cleaning and chunking with Cheerio
  - Event extraction using OpenAI models
  - Duplicate detection and URL normalization

### Routes (`/routes`)

Route definitions that map API endpoints to controller functions.

- **`events.ts`**: Event-related API endpoints
- **`settings.ts`**: Settings management endpoints
- **`scores.ts`**: Quality metrics endpoints

### Utils (`/utils`)

Utility functions and helpers.

- **`helpers.ts`**: Common utility functions like median calculation

## Data Flow

1. **Request Handling**: HTTP requests are received and routed to the appropriate controller.
2. **Controller Processing**: Controllers validate input and delegate to services.
3. **Service Logic**: Services orchestrate the business logic, calling repositories and modules as needed.
4. **Data Access**: Repositories handle database interactions using Knex.js.
5. **Response**: Results are returned through the controller to the client.

## Event Extraction Process

1. **Page Scraping**: Using Playwright to fetch HTML content from target URLs
2. **Content Processing**:
   - Remove irrelevant content (scripts, styles)
   - Identify potential event-containing elements
   - Chunk content into manageable pieces
3. **AI Analysis**:
   - Send content chunks to OpenAI's API
   - Extract structured event data using custom prompts
4. **Post-Processing**:
   - Normalize URLs and dates
   - Fuzzy deduplication to remove similar events
   - Categorization of events
5. **Persistence**:
   - Store events in PostgreSQL database
   - Calculate quality metrics when expected values are known

## Real-time Updates

The backend uses Server-Sent Events (SSE) to provide real-time updates to clients:

1. Clients subscribe to updates for specific URLs
2. When new events are extracted, all subscribed clients receive updates
3. Connections are maintained until explicitly closed by clients

## Error Handling

- **Controller Level**: HTTP-specific error handling
- **Service Level**: Business logic errors
- **Repository Level**: Database-specific errors
- **Module Level**: Extraction-specific error handling

## Database Schema

The application uses PostgreSQL with the following tables:

- **`events`**: Stores extracted event data
- **`source_settings`**: Configuration for each source URL
- **`scraping_attempts`**: Records of scraping operations
- **`scoring_results`**: Quality metrics for scraping accuracy

## Environment Variables

```
# Database Configuration
PG_HOST=postgres
PG_USER=scraper_old
PG_PASSWORD=scraperpass
PG_DATABASE=eventsdb
PG_PORT=5432

# API Keys
OPENAI_API_KEY=your_openai_api_key

# Optional Configuration
SCORING_ACCURACY_WEIGHT=0.7
SCORING_COMPLETENESS_WEIGHT=0.3
```

## API Reference

See the OpenAPI specification in `/openapi.yaml` for detailed API documentation.