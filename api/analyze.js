const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // 1. Gérer les permissions (CORS) pour que le site ait le droit de parler au serveur
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Si le navigateur demande juste "Est-ce que je peux ?", on dit OUI.
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Vérifier la méthode (POST uniquement)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 3. Récupérer la clé API
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            throw new Error('Clé API manquante dans les réglages Vercel');
        }

        // 4. Récupérer l'image
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Aucune image reçue' });
        }

        // 5. Configurer Gemini
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analyse ce devis garage.
        Prix de ref TTC : Vidange 100€, Plaquettes 150€, Distri 600€, Diag 70€.
        Réponds UNIQUEMENT un JSON : { "score": 5, "status": "ORANGE", "verdict": "Cher", "analyse": "...", "conseil": "..." }`;

        // 6. Envoyer à l'IA
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: image, mimeType: "image/jpeg" } }
        ]);

        const response = await result.response;
        let text = response.text();

        // Nettoyage
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 7. Renvoyer le résultat
        const data = JSON.parse(text);
        res.status(200).json(data);

    } catch (error) {
        console.error("Erreur Backend:", error);
        res.status(500).json({ error: error.message || 'Erreur interne' });
    }
};