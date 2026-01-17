// netlify/functions/get-ai-welcome.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key from Netlify Environment Variables
const API_KEY = process.env.GEMINI_API_KEY;

// Initialize the client
const genAI = new GoogleGenerativeAI(API_KEY);

exports.handler = async function(event, context) {
    // 1. Only allow POST requests from your frontend
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    // 2. Critical check for the API Key
    if (!API_KEY) {
        console.error("Netlify Function Error: GEMINI_API_KEY is missing in environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "AI configuration error: API Key missing." })
        };
    }

    try {
        // 3. Parse data sent from your script.js
        const { userName, timeOfDay } = JSON.parse(event.body);

        if (!userName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "User name is required." })
            };
        }

        // 4. Initialize the model (using 1.5-flash for speed)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 5. Construct the specific prompt
        const prompt = `Generate a very short, warm, and professional 1-sentence welcome message for a user named ${userName}. 
        It is currently the ${timeOfDay || 'day'}. 
        Encourage them to be productive with their to-do list. 
        Keep it under 20 words.`;

        // 6. Generate content with the latest SDK syntax
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // 7. Send the successful message back to the frontend
        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" // Helps prevent CORS issues
            },
            body: JSON.stringify({ message: text })
        };

    } catch (error) {
        console.error('Gemini API execution error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "The AI is resting right now. Please try again later!",
                details: error.message 
            })
        };
    }
};