export const characterExtractionSchemaVersion = "character-extract-v1";

export const characterExtractionResponseFormat = {
  type: "json_schema",
  name: "character_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      characters: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: {
              type: "string",
              description: "The character card name."
            },
            role: {
              type: "string",
              enum: ["main", "secondary", "supporting"],
              description: "The character's story role."
            },
            age: {
              type: "string",
              description: "Known age or broad age range. Empty when unknown."
            },
            sex: {
              type: "string",
              enum: ["Woman", "Man", "Non-binary", "Unspecified"],
              description: "Known sex or gender. Use Unspecified when unknown."
            },
            background: {
              type: "string",
              description:
                "Known background or nationality. Empty when unknown."
            },
            notes: {
              type: "array",
              items: {
                type: "string"
              },
              description:
                "Compatibility field. Character extraction should return an empty array."
            },
            storySentenceIds: {
              type: "array",
              items: {
                type: "string"
              },
              description:
                "Locked story sentence ids that ground this character."
            }
          },
          required: [
            "name",
            "role",
            "age",
            "sex",
            "background",
            "notes",
            "storySentenceIds"
          ]
        }
      }
    },
    required: ["characters"]
  }
};
