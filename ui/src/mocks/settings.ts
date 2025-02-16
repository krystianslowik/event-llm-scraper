import type { AdvancedSettings } from '../App';

export const mockStoredSettings = [
  {
    id: 1,
    source_url: "https://example.com/events",
    settings: {
      minTextLength: 25,
      maxTextLength: 4000,
      maxCombinedSize: 4000,
      categorySet: "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
      customPrompt: "Bitte extrahiere alle Veranstaltungen mit besonderem Fokus auf Familienaktivitäten.",
      gptModel: "gpt-4o-mini",
      showEventsWithoutLinks: false,
      iterateIframes: false,
      expectedEvents: 10
    },
    created_at: "2024-03-15T10:00:00.000Z",
    updated_at: "2024-03-15T10:00:00.000Z"
  },
  {
    id: 2,
    source_url: "https://example.com/kultur",
    settings: {
      minTextLength: 30,
      maxTextLength: 5000,
      maxCombinedSize: 5000,
      categorySet: "Kultur/Lifestyle, Veranstaltungen, Münsterland",
      customPrompt: "Fokussiere auf kulturelle Veranstaltungen und Ausstellungen.",
      gptModel: "gpt-4o-mini",
      showEventsWithoutLinks: true,
      iterateIframes: true,
      expectedEvents: 15
    },
    created_at: "2024-03-15T11:00:00.000Z",
    updated_at: "2024-03-15T11:00:00.000Z"
  }
];