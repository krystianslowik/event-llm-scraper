export const mockScoringResults = {
  1: [
    {
      id: 1,
      source_url: "https://example.com/events",
      score_type: "known",
      score_data: {
        score: 0.85,
        accuracy: 0.9,
        completeness: 0.8,
        scraped: 8,
        expected: 10,
        settings: {
          minTextLength: 25,
          maxTextLength: 4000,
          maxCombinedSize: 4000,
          categorySet: "Familienleben, Aktivitäten, Veranstaltungen",
          customPrompt: "Bitte extrahiere alle Veranstaltungen mit besonderem Fokus auf Familienaktivitäten.",
          gptModel: "gpt-4o-mini",
          showEventsWithoutLinks: false,
          iterateIframes: false,
          expectedEvents: 10
        }
      },
      calculated_at: "2024-03-15T10:30:00.000Z"
    }
  ],
  2: [
    {
      id: 2,
      source_url: "https://example.com/kultur",
      score_type: "known",
      score_data: {
        score: 0.92,
        accuracy: 0.95,
        completeness: 0.89,
        scraped: 14,
        expected: 15,
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
        }
      },
      calculated_at: "2024-03-15T11:30:00.000Z"
    }
  ]
};