import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    // On autorise tout le monde (CORS) pour éviter les blocages
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Si c'est une requête "OPTIONS" (vérification du navigateur), on dit OK
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            throw new Error('Clé API manquante dans Vercel');
        }

        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Pas d\'image reçue' });
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analyse ce devis garage. Donne un JSON : { "score": 5, "status": "ORANGE", "verdict": "Cher", "analyse": "...", "conseil": "..." }`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: image, mimeType: "image/jpeg" } }
        ]);

        const response = await result.response;
        let text = response.text();
        
        // Nettoyage brutal du JSON
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // On essaie de parser
        try {
            const data = JSON.parse(text);
            res.status(200).json(data);
        } catch (e) {
            console.error("Erreur JSON:", text);
            res.status(500).json({ error: "L'IA a mal répondu" });
        }

    } catch (error) {
        console.error("Erreur serveur:", error);
        res.status(500).json({ error: error.message });
    }
}