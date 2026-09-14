export const characterAppearanceSchemaVersion = "character-appearance-v1";

export const characterAppearanceResponseFormat = {
  type: "json_schema",
  name: "character_appearance",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      appearanceDescription: {
        type: "string",
        description: "Concise stable physical appearance description only."
      }
    },
    required: ["appearanceDescription"]
  }
};
