export const DEFAULT_SETTINGS = {
  minTextLength: 25,
  maxTextLength: 4000,
  maxCombinedSize: 4000,
  categorySet: "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
  customPrompt: `Please provide a concise summary of the following text. If no events, state "No events found.". Do not skip any event. Make sure all of them are taken from the text provided. No markdown. Response in German. DO NOT BE LAZY. THIS IS IMPORTANT.`,
  gptModel: 'gpt-4o-mini',
  showEventsWithoutLinks: false,
  iterateIframes: false,
  expectedEvents: 0,
};