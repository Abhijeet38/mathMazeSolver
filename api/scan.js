export default async function handler(req, res) {
    // 1. Security Check: Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // 2. Get the image data sent by our frontend (index.html)
    const { imageBase64, mimeType } = req.body;
    
    // 3. SECURE API KEY ACCESS: Vercel reads this from your hidden project settings
    const apiKey = process.env.GEMINI_API_KEY; 
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing on the server.' });
    }

    // 4. Prepare the exact same prompt for Gemini
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `Analyze this image of a math maze puzzle. Extract the 'Target Goal' number and the main grid of numbers and operators (+, -, *, /). Return ONLY a JSON object in this exact format: {"target": 100, "grid": [[2, "*", 6], ["+", 5, "-"]]}. Return valid JSON only, no markdown formatting. Note operators as strings and numbers as integers.`;

    try {
        // 5. Send the request securely from the Vercel Server -> Google Servers
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
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const result = await response.json();
        
        // 6. Clean the data and send it back to our frontend
        if (result.candidates && result.candidates.length > 0) {
            const jsonString = result.candidates[0].content.parts[0].text;
            const data = JSON.parse(jsonString);
            return res.status(200).json(data);
        } else {
            throw new Error("Invalid response from Gemini AI");
        }
        
    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ error: 'Failed to process image' });
    }
}
