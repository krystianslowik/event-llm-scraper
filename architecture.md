# EventScraper Backend Architecture

## Overview

The EventScraper backend is built using Node.js and TypeScript, following a layered architecture pattern with clear separation of concerns. The application extracts events from web pages using AI-powered analysis, stores them in a PostgreSQL database, and provides an API for the frontend to interact with.

## Architecture Layers

```
┌─────────────────┐
│  API Routes     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controllers    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Services       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Repositories   │◄────┤  Modules        │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
└─────────────────┘
```

### Routes Layer

The routes layer defines the API endpoints and connects them to the appropriate controller methods.

**Key Files:**
- `src/routes/events.ts` - Event-related endpoints
- `src/routes/settings.ts` - Settings management endpoints
- `src/routes/scores.ts` - Scoring metrics endpoints

**Main Endpoints:**
- `/events` - Get events for a URL
- `/events/stream` - Server-sent events stream for real-time updates
- `/settings/all` - Get all stored source settings
- `/settings` - CRUD operations for URL settings
- `/scores/known/:url` - Get scores for URLs with expected event counts
- `/scores/unknown/:url` - Get statistical scores for URLs without expectations

### Controllers Layer

The controllers layer handles HTTP requests, validates input, and returns appropriate responses.

**Key Files:**
- `src/controllers/eventsController.ts` - Handles event extraction and retrieval
- `src/controllers/settingsController.ts` - Manages source URL settings 
- `src/controllers/scoresController.ts` - Provides scoring metrics

### Services Layer

The services layer contains the core business logic of the application.

**Key Files:**
- `src/services/eventsService.ts` - Event extraction orchestration
- `src/services/settingsService.ts` - Settings management logic
- `src/services/scoresService.ts` - Scoring calculation logic

### Repositories Layer

The repositories layer handles data access and persistence.

**Key Files:**
- `src/db/eventsRepository.ts` - Data access for events and related data
- `src/db/db.ts` - Database connection setup

### Modules Layer

Special-purpose modules that implement core functionality.

**Key Files:**
- `src/modules/eventExtractor.ts` - Core event extraction functionality

## Event Extractor Module

The eventExtractor module is the heart of the application, responsible for scraping web pages and extracting structured event data using AI. It implements a sophisticated multi-stage pipeline:

### Detailed Data Flow and Transformation

#### 1. Web Scraping (`scrapePage`)
- **Input**: 
  - URL string (e.g., `"https://example.com/events"`)
  - Settings object (configuration parameters)
  - Retry count (default: 3)
  
- **Process**:
  - Launches headless browser (Playwright) with custom user agent
  - Navigates to the URL with `waitUntil: "domcontentloaded"` and 30s timeout
  - If `settings.iterateIframes` is true, extracts content from all iframes
  
- **Output**:
  - Raw HTML string (complete page content)
  - Example: `"<!DOCTYPE html><html><head>...</head><body>...</body></html>"`

#### 2. HTML Processing (`sanitizeAndChunkHtml`)
- **Input**:
  - Raw HTML string from scraping
  - Base URL for resolving relative links
  - Boolean flag for chunk merging
  - Settings object
  
- **Process**:
  - Loads HTML with Cheerio (`$`)
  - Removes irrelevant elements: `$("script, style, meta, link, nav, footer").remove()`
  - Identifies candidate DOM nodes based on text length parameters
  - Extracts text and links from nodes
  - Combines small chunks if `mergeChunks` is true
  
- **Output**:
  - Array of text chunks with resolved links
  - Example: 
    ```
    [
      "Event: Summer Festival 2025\nThis weekend at City Park.\nLinks found:\nhttps://example.com/summer-festival",
      "Conference: Web Development 2025\nLearn the latest techniques.\nLinks found:\nhttps://example.com/conference"
    ]
    ```

#### 3. AI Summarization (`summarizeChunk`)
- **Input**:
  - Text chunk with links
  - Source URL for reference
  - Index and total count (for logging)
  - Settings object with prompt customization
  
- **Process**:
  - Constructs AI prompt combining:
    - Base prompt (default or custom from settings)
    - Mandatory instructions for event extraction
    - The chunk text
  - Example prompt:
    ```
    Please provide a concise summary of the following text.
    If no events, state "No events found." Do not skip any event. Make sure all of them are taken from the text provided. No markdown.
    Response in German.
    DO NOT BE LAZY. THIS IS IMPORTANT.
    
    If you find any events, ensure the summary mentions:
    - "Event Title"
    - "Short Description"
    - "URL" 
    - "Category" - assign to one of following if possible: Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber. If none category apply, use "Andere'
    - "Date" - convert to ISO 8601. Only one date. If no year provided, use 2025.
    
    Here's the text:
    Event: Summer Festival 2025
    This weekend at City Park.
    Links found:
    https://example.com/summer-festival
    ```
  - Sends to OpenAI API:
    ```typescript
    const response = await openai.chat.completions.create({
        model: settings.gptModel, // e.g., "gpt-4o-mini"
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.7,
    });
    ```
  
- **Output**:
  - Summarized text with identified events in natural language
  - Example:
    ```
    Event Title: Sommerfestival 2025
    Short Description: Dieses Wochenende im Stadtpark.
    URL: https://example.com/summer-festival
    Category: Veranstaltungen
    Date: 2025-06-21
    ```

#### 4. Event Extraction (`extractEventsFromSummary`)
- **Input**:
  - Summarized text from OpenAI
  - Source URL for reference
  - Settings object
  
- **Process**:
  - Constructs a structured JSON extraction prompt:
    ```
    You are a helpful assistant. Return the data in valid JSON (no code fences).
    Structure it exactly as:
    {
      "events": [
        {
          "title": "<string>",
          "description": "<string>",
          "url": "<string>",
          "category": "<string>",
          "date": "<string>"
        }
      ]
    }
    
    Extract EVERY event details from the summary below:
    - Title
    - Description
    - URL
    - Category
    - Date (any recognized date format)
    If there are no events, return {"events":[]}.
    
    Make sure there's no unterminated json, and answer only in the format requested.
    Source: https://example.com/events
    Summary:
    Event Title: Sommerfestival 2025
    Short Description: Dieses Wochenende im Stadtpark.
    URL: https://example.com/summer-festival
    Category: Veranstaltungen
    Date: 2025-06-21
    ```
  - Sends to OpenAI API with lower temperature (0.2) for more consistent formatting:
    ```typescript
    const response = await openai.chat.completions.create({
        model: settings.gptModel,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.2,
    });
    ```
  - Parses the response as JSON
  
- **Output**:
  - Structured JSON object with events array
  - Example:
    ```json
    {
      "events": [
        {
          "title": "Sommerfestival 2025",
          "description": "Dieses Wochenende im Stadtpark.",
          "url": "https://example.com/summer-festival",
          "category": "Veranstaltungen",
          "date": "2025-06-21"
        }
      ]
    }
    ```

#### 5. URL Normalization (`ensureAbsoluteEventUrls`)
- **Input**:
  - Array of event objects with possibly relative URLs
  - Base URL for resolution
  
- **Process**:
  - For each event, if URL doesn't start with "http":
    ```typescript
    if (ev.url && !ev.url.startsWith("http")) {
        try {
            ev.url = new URL(ev.url, baseUrl).href;
        } catch {}
    }
    ```
  
- **Output**:
  - Same event objects with normalized absolute URLs
  - Example: 
    ```
    { 
      "url": "https://example.com/summer-festival" 
    }
    ```

#### 6. Deduplication (`fuzzyDeduplicate`)
- **Input**:
  - Array of extracted event objects
  
- **Process**:
  - For each event, compares with previously processed events
  - Uses string similarity on title and exact match on date:
    ```typescript
    const similarity = stringSimilarity.compareTwoStrings(titleA, titleB);
    if (similarity > 0.3 && dateA === dateB) {
        // Mark as duplicate
    }
    ```
  
- **Output**:
  - Deduplicated array of event objects
  - Example: Original 8 events → 5 unique events after deduplication

#### 7. Orchestration (`extractEventsFromUrl`)
- **Input**:
  - URL string
  - Settings object with extraction parameters
  
- **Process**:
  - Creates effective settings by merging defaults with provided settings
  - Calls `scrapePage` to get HTML
  - Calls `sanitizeAndChunkHtml` with `mergeChunks=true`
  - For each chunk, calls `summarizeChunk` in parallel
  - For each summary, calls `extractEventsFromSummary`
  - Combines all events
  - If no events found, tries fallback with `mergeChunks=false`
  - Calls `ensureAbsoluteEventUrls` and `fuzzyDeduplicate`
  - Records attempt in database with performance metrics
  - Calculates scoring if expected event count exists
  
- **Output**:
  - Final object with events array and categories array
  - Example:
    ```json
    {
      "events": [
        {
          "title": "Sommerfestival 2025",
          "description": "Dieses Wochenende im Stadtpark.",
          "url": "https://example.com/summer-festival",
          "category": "Veranstaltungen",
          "date": "2025-06-21"
        },
        {
          "title": "Web Development Konferenz 2025",
          "description": "Lernen Sie die neuesten Techniken.",
          "url": "https://example.com/conference",
          "category": "Tipps & Ratgeber",
          "date": "2025-09-15"
        }
      ],
      "categories": ["Veranstaltungen", "Tipps & Ratgeber"]
    }
    ```

### OpenAI API Integration

The system makes two distinct calls to the OpenAI API in the extraction pipeline:

#### 1. First API Call: Event Identification
- **Purpose**: Identify events in HTML content and present them in a standardized format
- **Model**: Configurable (default: gpt-4o-mini)
- **Temperature**: 0.7 (allows some creativity in summarization)
- **Input**: HTML chunks with text and links
- **Output**: Natural language summary of identified events
- **Prompt Engineering**:
  - Includes explicit instructions for event field identification
  - Emphasizes completeness (don't skip events)
  - Provides format guidance
  - Includes category mapping instructions
  - Standardizes date format (ISO 8601)

#### 2. Second API Call: Structured Extraction
- **Purpose**: Convert natural language summaries into structured JSON
- **Model**: Same as first call (configurable)
- **Temperature**: 0.2 (lower for consistent JSON formatting)
- **Input**: Natural language event summaries
- **Output**: Structured JSON with arrays of event objects
- **Prompt Engineering**:
  - Provides exact JSON schema
  - Emphasizes valid JSON syntax
  - Includes handling for no-events case

### Data Flow Diagram

```
┌─────────────────────┐
│       URL Input     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     Playwright      │
│    Web Scraping     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Raw HTML Content  │ ◄─────────────────────────┐
└──────────┬──────────┘                           │
           │                                      │
           ▼                                      │
┌─────────────────────┐                           │
│  Cheerio HTML Parse │                           │
└──────────┬──────────┘                           │
           │                                      │
           ▼                                      │
┌─────────────────────┐     ┌──────────────────┐  │
│ Candidate DOM Nodes │ ─── │  minTextLength   │  │
└──────────┬──────────┘     │  maxTextLength   │  │
           │                └──────────────────┘  │
           ▼                                      │
┌─────────────────────┐                           │
│   Text Chunks with  │                           │
│    Resolved Links   │                           │
└──────────┬──────────┘                           │
           │                                      │
           ▼                                      │
┌─────────────────────┐     ┌──────────────────┐  │
│  OpenAI API Call #1 │ ─── │Event identification│ │
└──────────┬──────────┘     │     prompt       │  │
           │                └──────────────────┘  │
           ▼                                      │
┌─────────────────────┐                           │
│ Event Summaries in  │                           │
│  Natural Language   │                           │
└──────────┬──────────┘                           │
           │                                      │
           ▼                                      │
┌─────────────────────┐     ┌──────────────────┐  │
│  OpenAI API Call #2 │ ─── │JSON extraction   │  │
└──────────┬──────────┘     │     prompt       │  │
           │                └──────────────────┘  │
           ▼                                      │
┌─────────────────────┐                           │
│  Structured JSON    │                           │
│    Event Objects    │                           │
└──────────┬──────────┘                           │
           │                                      │
           ▼                                      │
┌─────────────────────┐                           │
│ URL Normalization   │                           │
└──────────┬──────────┘                           │
           │                                      │
           ▼                                      │
┌─────────────────────┐     ┌──────────────────┐  │
│ Fuzzy Deduplication │ ─── │String similarity │  │
└──────────┬──────────┘     │    threshold     │  │
           │                └──────────────────┘  │
           ▼                                      │
┌─────────────────────┐     ┌──────────────────┐  │
│   Result Events     │     │Fallback strategy │  │
│     & Categories    │ ──► │   if no events   │ ─┘
└─────────────────────┘     └──────────────────┘
```

### Configurable Parameters

| Parameter          | Default          | Description                                    |
|--------------------|------------------|------------------------------------------------|
| minTextLength      | 25               | Minimum text length for node selection         |
| maxTextLength      | 4000             | Maximum text length for node selection         |
| maxCombinedSize    | 4000             | Maximum size when combining chunks            |
| categorySet        | "Familienleben, Aktivitäten..." | Comma-separated list of categories |
| gptModel           | "gpt-4o-mini"    | OpenAI model to use                           |
| customPrompt       | null             | Optional custom prompt override               |
| showEventsWithoutLinks | false        | Whether to process nodes without links        |
| iterateIframes     | false            | Whether to process iframe content             |

## Data Flow

### Event Extraction Flow

```
Client Request → eventsController → eventsService → eventExtractor → OpenAI API
                                                                        ↓
                  Database ← eventsRepository ← eventsService ← Extracted Events
                      ↓
                  Response → Controller → Client
```

1. Client requests event extraction for a URL
2. Controller validates input and passes to service
3. Service initializes extraction process
4. Event extractor:
   - Scrapes the page with Playwright
   - Chunks content with Cheerio
   - Processes text with OpenAI
   - Extracts structured events
5. Events are stored in the database
6. Service returns results to controller
7. Controller formats and sends response to client

### Settings Management Flow

```
Client Request → settingsController → settingsService → eventsRepository → Database
                                                                ↓
                                       Client ← Response ← settingsController
```

1. Client sends settings for a URL
2. Controller validates input
3. Service processes settings
4. Repository stores settings in database
5. Response sent to client

## Database Schema

```
┌──────────────────────┐       ┌──────────────────────┐
│      events          │       │   source_settings    │
├──────────────────────┤       ├──────────────────────┤
│ id                   │       │ id                   │
│ title                │       │ url                  │
│ description          │       │ settings (JSON)      │
│ url                  │       │ expected_event_count │
│ source_url           │       │ created_at           │
│ category             │       │ updated_at           │
│ date                 │       └──────────────────────┘
│ created_at           │
│ updated_at           │       ┌──────────────────────┐
└──────────────────────┘       │  scraping_attempts   │
                               ├──────────────────────┤
┌──────────────────────┐       │ id                   │
│   scoring_results    │       │ url                  │
├──────────────────────┤       │ settings_used (JSON) │
│ id                   │       │ event_count          │
│ url                  │       │ created_at           │
│ score                │       └──────────────────────┘
│ metrics (JSON)       │
│ created_at           │
└──────────────────────┘
```

## Key Technologies

- **Node.js/Express**: API server
- **TypeScript**: Type-safe development
- **Knex.js**: SQL query builder and migrations
- **PostgreSQL**: Data storage
- **Playwright**: Web page rendering and interaction
- **Cheerio**: HTML parsing and manipulation
- **OpenAI API**: Natural language processing and content extraction
- **Server-Sent Events**: Real-time extraction status updates