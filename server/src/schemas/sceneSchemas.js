export const scenePlanningSchemaVersion = "scene-plan-v1";

export const scenePlanningResponseFormat = {
  type: "json_schema",
  name: "scene_planning",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      scenes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: {
              type: "string",
              description: "Short editable scene label."
            },
            sentenceIds: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Locked story sentence ids covered by this scene."
            },
            location: {
              type: "string",
              description: "Concise visual location for the scene."
            },
            description: {
              type: "string",
              description: "Concise editable description of what happens."
            },
            characterIds: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Approved character ids visible or visually relevant."
            },
            imageMode: {
              type: "string",
              enum: ["generate", "reuse"],
              description: "How a later phase should source the visual asset."
            },
            reuseSceneId: {
              anyOf: [
                {
                  type: "string"
                },
                {
                  type: "null"
                }
              ],
              description: "Existing scene id to reuse, or null."
            }
          },
          required: [
            "label",
            "sentenceIds",
            "location",
            "description",
            "characterIds",
            "imageMode",
            "reuseSceneId"
          ]
        }
      }
    },
    required: ["scenes"]
  }
};
