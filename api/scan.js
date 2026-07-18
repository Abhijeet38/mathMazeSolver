module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Get the image data sent by our frontend (index.html)
    const { imageBase64, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; 
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing on the server (Check Vercel Environment Variables).' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `Analyze this image of a math maze puzzle. Extract the 'Target Goal' number and the main grid of numbers and operators (+, -, *, /). Return ONLY a JSON object in this exact format: {"target": 100, "grid": [[2, "*", 6], ["+", 5, "-"]]}. Return valid JSON only, no markdown formatting. Note operators as strings and numbers as integers.`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: mimeType, data: imageBase64 } }
                        ]
                    }
                ],
                // Forcing JSON format (this makes the AI more reliable)
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const result = await response.json();
        
        // --- THIS IS THE FIX ---
        // If Google rejects the request, grab their exact error message!
        if (!response.ok) {
            console.error("Google API Error:", result);
            const googleError = result.error?.message || JSON.stringify(result) || "Unknown error from Google";
            return res.status(500).json({ error: `Google API Error: ${googleError}` });
        }
        
        // Success path
        if (result.candidates && result.candidates.length > 0) {
            const jsonString = result.candidates[0].content.parts[0].text;
            const data = JSON.parse(jsonString);
            return res.status(200).json(data);
        } else {
            console.error("Weird Response format:", result);
            return res.status(500).json({ error: "Gemini didn't return standard response layout." });
        }
        
    } catch (error) {
        console.error("Vercel Code Error:", error);
        return res.status(500).json({ error: `Server crash: ${error.message}` });
    }
}
