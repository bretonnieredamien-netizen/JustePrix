// Fichier: api/analyze.js
export const config = {
    runtime: 'edge', // Rend l'API ultra rapide
};

export default async function handler(req) {
    // 1. Sécurité (CORS) - Pour autoriser ton site à parler au serveur
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405 });
    }

    try {
        // 2. Récupération de la clé cachée
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return new Response(JSON.stringify({ error: 'Clé API non configurée sur Vercel' }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const { image } = await req.json();

        // 3. Appel Direct à Google (Modèle Gemini 2.0 Flash)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Tu es un expert automobile. Analyse ce devis.
                        Prix Ref TTC : Vidange 100€, Freins 150€, Distri 600€, Diag 70€. Si Luxe +30%.
                        Réponds UNIQUEMENT ce JSON : {"score": 5, "status": "ORANGE", "verdict": "Cher", "analyse": "...", "conseil": "..."}` },
                        { inline_data: { mime_type: "image/jpeg", data: image } }
                    ]
                }]
            })
        });

        const data = await response.json();

        // 4. Renvoi de la réponse au site
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}