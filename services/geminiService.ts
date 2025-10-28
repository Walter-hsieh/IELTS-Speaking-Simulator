import { GoogleGenAI, Type } from "@google/genai";
import { IEvaluation, IPracticeItem, IComprehensiveTest, IChartData, TestType } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModel = "gemini-2.5-pro";
const imageModel = "imagen-4.0-generate-001";

// Schema for generating a full test
const comprehensiveTestSchema = {
  type: Type.OBJECT,
  properties: {
    listening: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          description: "Generate 5 diverse listening comprehension questions based on the video's transcript.",
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['short-answer'] },
              answer: { type: Type.STRING, description: "The correct answer for the question, derived directly from the transcript." }
            },
            required: ['question', 'type', 'answer'],
          },
        },
      },
      required: ['questions'],
    },
    reading: {
      type: Type.OBJECT,
      properties: {
        transcript: {
          type: Type.STRING,
          description: "The user-provided transcript. This should be copied directly from the input prompt.",
        },
        questions: {
          type: Type.ARRAY,
          description: "Generate 5 diverse reading comprehension questions based on the transcript.",
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['short-answer', 'true-false-not-given'] },
              answer: { type: Type.STRING, description: "The correct answer for the question, derived directly from the transcript." }
            },
            required: ['question', 'type', 'answer'],
          },
        },
      },
      required: ['transcript', 'questions'],
    },
    writing: {
      type: Type.OBJECT,
      properties: {
        task1: {
            type: Type.OBJECT,
            description: "An IELTS Writing Task 1 prompt that involves a visual chart. Generate both the text prompt and the structured data for the chart.",
            properties: {
                prompt: { 
                    type: Type.STRING, 
                    description: "The full text prompt for the user, describing the chart and the task."
                },
                chartData: {
                    type: Type.OBJECT,
                    description: "Structured data for a chart (bar, line, pie, or table) logically derived from the transcript.",
                    properties: {
                        type: { type: Type.STRING, enum: ['bar chart', 'line chart', 'pie chart', 'table'] },
                        title: { type: Type.STRING },
                        data: { type: Type.STRING, description: "A simple, string-based representation of the data (e.g., 'Category A: 50, Category B: 75' or a CSV-like string for a table where the first row must be the headers)." }
                    },
                    required: ['type', 'title', 'data']
                }
            },
            required: ['prompt', 'chartData']
        },
        task2: {
          type: Type.STRING,
          description: "An IELTS Writing Task 2 essay prompt that explores a deeper aspect of the video's topic, using the transcript as context.",
        },
      },
      required: ['task1', 'task2'],
    },
    speaking: {
      type: Type.ARRAY,
      description: "A full set of 8 IELTS speaking questions (4 for part 1, 1 cue card for part 2, 3 for part 3) related to the video transcript's topic.",
      items: {
        type: Type.OBJECT,
        properties: {
          part: { type: Type.NUMBER },
          type: { type: Type.STRING, enum: ['introduction', 'cue-card', 'discussion'] },
          question: { type: Type.STRING },
          cueCard: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              topic: { type: Type.STRING },
              points: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
        required: ['part', 'type', 'question'],
      },
    },
  },
  required: ['listening', 'reading', 'writing', 'speaking'],
};

// Schema for evaluating a full test
const comprehensiveEvaluationSchema = {
  type: Type.OBJECT,
  properties: {
    overallBandScore: { type: Type.NUMBER, description: 'The overall IELTS band score, from 1.0 to 9.0, in 0.5 increments.' },
    detailedScores: {
      type: Type.ARRAY,
      description: 'An array of evaluations for each of the four main skills AND the specific IELTS sub-criteria.',
      items: {
        type: Type.OBJECT,
        properties: {
          criterion: { type: Type.STRING, description: 'The name of the criterion (e.g., "Listening", "Reading", "Writing Task 1", "Speaking - Fluency and Coherence").' },
          score: { type: Type.NUMBER, description: 'The band score for this specific criterion.' },
          feedback: { type: Type.STRING, description: 'Specific, constructive feedback for this criterion, explaining the score.' },
        },
        required: ['criterion', 'score', 'feedback'],
      },
    },
    summary: { type: Type.STRING, description: 'A brief, encouraging summary of the user\'s performance across all four skills.' },
    improvedAnswers: {
        type: Type.OBJECT,
        description: 'Improved versions of the user\'s writing and speaking answers, rewritten to a Band 7.5 level.',
        properties: {
            writingTask1: { type: Type.STRING, description: 'The user\'s Writing Task 1, rewritten to a Band 7.5 standard.' },
            writingTask2: { type: Type.STRING, description: 'The user\'s Writing Task 2, rewritten to a Band 7.5 standard.' },
            speaking: {
                type: Type.ARRAY,
                description: 'The user\'s speaking answers, rewritten to a Band 7.5 standard.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING, description: 'The original question asked.' },
                        improvedAnswer: { type: Type.STRING, description: 'The user\'s answer, rewritten to a Band 7.5 standard.' }
                    },
                    required: ['question', 'improvedAnswer']
                }
            }
        },
        required: ['writingTask1', 'writingTask2', 'speaking']
    }
  },
  required: ['overallBandScore', 'detailedScores', 'summary', 'improvedAnswers'],
};


export const generateComprehensiveTest = async (videoUrl: string, transcript: string, testType: TestType): Promise<IComprehensiveTest> => {
    const requestedSection = testType === 'full' ? 'all sections' : `only the ${testType} section`;
    const prompt = `
      You are an expert IELTS test creator. Your task is to create a realistic IELTS mock test based on the provided video transcript. You must generate content for ${requestedSection}.

      Video URL: ${videoUrl}
      
      **Video Transcript:**
      ---
      ${transcript}
      ---

      **Instructions:**
      1.  **Always** place the user-provided transcript **unmodified** into the 'transcript' field of the 'reading' section in the final JSON output.
      2.  Generate questions/prompts for the requested section(s) ONLY. All content must be thematically linked to the transcript.
      3.  For any sections NOT requested, you MUST provide empty or default values (e.g., empty arrays for questions, empty strings for prompts) to satisfy the schema. Do not omit any top-level keys.
      4.  For Listening and Reading questions, you MUST provide a correct 'answer' for each question.
      5.  For Writing Task 1, if you generate a table, the 'data' field must be a string in a clean, unformatted, raw CSV format. The first line MUST be the comma-separated headers. Subsequent lines are data rows. DO NOT include any markdown, code blocks, or styling characters. For example: 'Year,Revenue\\n2022,5M\\n2023,8M'.
      
      Strictly adhere to the JSON schema provided.
    `;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: comprehensiveTestSchema,
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as IComprehensiveTest;
    } catch (error) {
        console.error("Failed to parse test content JSON:", response.text);
        throw new Error("Could not generate the test from the AI. The response was not valid JSON.");
    }
};

export const generateChartImage = async (chartData: IChartData): Promise<string> => {
    const prompt = `Generate a clean, simple, and easy-to-read ${chartData.type} for an IELTS test. The title of the chart should be "${chartData.title}". The data for the chart is: ${chartData.data}. The chart should be visually clear, with labeled axes if appropriate. Do not add any text outside of the chart image itself. The style should be professional, minimalist, and use a muted color palette.`;

    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
    } else {
        throw new Error("Failed to generate chart image.");
    }
};


export const evaluateComprehensiveTest = async (payload: { testContent: IComprehensiveTest, userAnswers: any }): Promise<IEvaluation> => {
    const { testContent, userAnswers } = payload;
    
    const prompt = `
      You are an expert IELTS examiner. Evaluate a user's full IELTS test performance. Provide scores for each of the four main skills (Listening, Reading, Writing, Speaking) and for the specific sub-criteria of Writing and Speaking. The evaluation should be strict and align with official IELTS band descriptors.

      **Primary Task:** Evaluate the user's answers and provide scores/feedback for any submitted Writing and Speaking responses.
      **Secondary Task:** Rewrite the user's Writing and Speaking answers to a Band 7.5 level. These improved versions will be shown to the user for learning.

      Test Content and User Answers:
      
      **Source Text (Video Transcript):** "${testContent.reading.transcript}"

      1. Listening:
      (The user has been provided with the correct answers separately. Do not evaluate this section, but acknowledge it was part of the test.)
      Questions: ${JSON.stringify(testContent.listening.questions.map(q => q.question))}
      User's Answers: ${JSON.stringify(userAnswers.listening)}

      2. Reading:
      (The user has been provided with the correct answers separately. Do not evaluate this section, but acknowledge it was part of the test.)
      Reading passage is the source text above.
      Questions: ${JSON.stringify(testContent.reading.questions.map(q => q.question))}
      User's Answers: ${JSON.stringify(userAnswers.reading)}

      3. Writing:
      Task 1 Prompt: "${testContent.writing.task1.prompt}"
      User's Task 1 Answer: "${userAnswers.writing.task1}"
      Task 2 Prompt: "${testContent.writing.task2}"
      User's Task 2 Answer: "${userAnswers.writing.task2}"

      4. Speaking:
      ${userAnswers.speaking.map((t: any, i: number) => `Question ${i + 1}: "${t.question}"\nAnswer: "${t.answer}"`).join('\\n\\n')}

      **Instructions for Output:**
      1.  **Evaluation:** Provide an overall band score and a detailed breakdown of scores and feedback for each criterion provided in the user answers. If a section (e.g., Writing) was not part of the test, reflect this in the scores.
      2.  **Model Answers:** In the 'improvedAnswers' field, provide high-quality, rewritten versions of the user's Writing (Task 1 & 2) and all Speaking answers if they exist. These rewrites must exemplify a Band 7.5 level of English.
      
      Strictly adhere to the JSON schema provided.
    `;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: comprehensiveEvaluationSchema,
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as IEvaluation;
    } catch (error) {
        console.error("Failed to parse evaluation JSON:", response.text);
        throw new Error("Could not parse the evaluation from the AI.");
    }
};

const practicePlanSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            area: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            exercise: { type: Type.STRING }
        },
        required: ['area', 'title', 'description', 'exercise']
    }
};

// FIX: Refactored to use an if/else block to make control flow explicit for the TypeScript compiler.
export const getPracticePlan = async (evaluation: IEvaluation): Promise<IPracticeItem[]> => {
    const weaknesses = evaluation.detailedScores.filter(s => s.score < 7.5);

    if (weaknesses.length === 0) {
        return [{
            area: "Overall Excellence",
            title: "Maintain Your High Standard",
            description: "Your performance is already at a high level. The key now is to maintain consistency and continue practicing with a wide range of topics to stay sharp.",
            exercise: "Challenge yourself with complex abstract topics. Record yourself speaking for 2 minutes on topics like 'The future of artificial intelligence' or 'The role of art in society', then self-evaluate."
        }];
    } else {
        const prompt = `
      Based on the following IELTS speaking evaluation, create a personalized practice plan to help the user achieve a band score of 7.5. 
      The user's current evaluation is:
      Overall Score: ${evaluation.overallBandScore}
      Weakest Areas:
      ${weaknesses.map(w => `- ${w.criterion} (Score: ${w.score}): ${w.feedback}`).join('\n')}

      Generate 3 distinct, actionable practice exercises. Each exercise should target one of the user's weakest areas across any of the four skills (Listening, Reading, Writing, Speaking).
      
      Strictly adhere to the JSON schema provided.
    `;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: practicePlanSchema,
            }
        });

        try {
            const jsonText = response.text.trim();
            return JSON.parse(jsonText) as IPracticeItem[];
        } catch (error) {
            console.error("Failed to parse practice plan JSON:", response.text);
            throw new Error("Could not parse the practice plan from the AI.");
        }
    }
};