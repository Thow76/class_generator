export const storyGenerationSchemaVersion = "story-sentences-v1";
export const storySentenceOperationSchemaVersion = "story-sentence-operation-v1";

export const storyGenerationResponseFormat = {
  type: "json_schema",
  name: "story_sentences",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      sentences: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: {
              type: "string",
              description: "A single plain story sentence with no numbering or Markdown."
            }
          },
          required: ["text"]
        }
      }
    },
    required: ["sentences"]
  }
};

export const storySentenceOperationResponseFormat = {
  type: "json_schema",
  name: "story_sentence_operation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      sentence: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: {
            type: "string",
            description: "One plain replacement story sentence with no numbering or Markdown."
          }
        },
        required: ["text"]
      }
    },
    required: ["sentence"]
  }
};
