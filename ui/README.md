# EventScraper Frontend

The frontend component of EventScraper is a modern React application built with TypeScript and Vite that provides an intuitive interface for extracting, viewing, and managing event data from websites.

## Architecture Overview

The frontend follows a component-based architecture with a clear separation of concerns:

```
ui/
├── src/                      # Source code
│   ├── components/           # React components
│   │   ├── FormElements/     # Reusable form components
│   │   ├── StoredSettings/   # Settings management components
│   │   └── ...               # Other UI components
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API services
│   ├── config/               # Configuration files
│   ├── mocks/                # Mock data for development
│   ├── types.ts              # TypeScript interfaces
│   ├── App.tsx               # Main application component
│   └── main.tsx              # Application entry point
├── public/                   # Static assets
└── dist/                     # Build output
```

## Component Structure

### Core Components

- **App.tsx**: Main application container that manages global state and routes
- **URLInput**: Input form for entering URLs to scrape
- **EventsTable**: Tabular view of extracted events
- **EventCard**: Card view of individual events
- **Filters**: Filtering controls for events by category, search term, etc.
- **ViewSwitch**: Toggle between grid and table views
- **ExportCSVButton**: Export events to CSV format

### Settings Management

- **StoredSettingsTab**: Manages saved URL-specific scraper configurations
- **SettingForm**: Form for editing scraper settings
- **SettingPreview**: Read-only view of settings
- **ScoreDisplay**: Shows quality metrics for extraction attempts

### Advanced Components

- **AdvancedSettingsModal**: Configures detailed scraper settings
- **FormElements/**: Reusable form components (inputs, checkboxes, etc.)

## State Management

The application uses React's built-in hooks for state management:

- **useState**: Local component state
- **useEffect**: Side effects like API calls
- **useMemo**: Computed values based on state changes
- **useRef**: Persistent references between renders

## Data Flow

1. **User Input**: The user enters URLs in the URLInput component
2. **API Request**: The application sends requests to the backend API
3. **Real-time Updates**: Server-sent events (SSE) provide live updates during scraping
4. **State Update**: Component state is updated with the received data
5. **Rendering**: UI components render the extracted events

## API Integration

The frontend communicates with the backend through the `services/api.ts` module:

- **fetchEvents**: Retrieves events from a URL
- **fetchStoredSettings**: Gets saved scraper configurations
- **fetchScoringResults**: Retrieves quality metrics
- **saveSetting**: Creates or updates scraper settings
- **deleteSetting**: Removes stored settings

## Real-time Updates

The application uses Server-Sent Events (SSE) for real-time updates during scraping:

1. A custom hook `useEventSource` establishes an EventSource connection
2. Updates are streamed from the server as they become available
3. The UI is updated in real-time with newly extracted events

## Configuration

The application uses environment-based configuration in `config.ts`:

- **API_URL**: Backend API endpoint
- **USE_MOCK_DATA**: Toggle between real API and mock data
- **DEFAULT_SETTINGS**: Default scraper configuration settings

## Advanced Scraper Settings

The scraper can be fine-tuned with various parameters:

- **Text Processing**: Min/max text length and chunk size
- **AI Parameters**: Model selection and custom prompts
- **Extraction Options**: Categories, iframes, links handling
- **Quality Metrics**: Expected event counts and scoring

## Features

- **Multi-URL Support**: Process multiple websites simultaneously
- **Real-time Updates**: Live extraction progress
- **Flexible Views**: Toggle between grid and table layouts
- **Advanced Filtering**: Search, category, and source filtering
- **Event Storage**: Automatic persistence of extracted events
- **Settings Management**: Save and restore scraper configurations
- **Quality Scoring**: Track extraction accuracy and completeness
- **CSV Export**: Export extracted events in CSV format

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint codebase
npm run lint
```

### Environment Configuration

Create a `.env` file in the ui directory:

```
VITE_API_URL=http://localhost:3000
VITE_USE_MOCK_DATA=false
```

## Technology Stack

- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Native fetch API
- **Icons**: Lucide React
- **UI Components**: Custom components with Tailwind