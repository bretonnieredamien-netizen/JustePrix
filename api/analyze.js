export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
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
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return new Response(JSON.stringify({ error: 'Clé API non configurée' }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // On récupère le fichier (fileData) et son type (mimeType)
        const { fileData, mimeType } = await req.json();

        const prompt = `
        Tu es un expert tarification réaliste et pragmatique (Contexte économique 2024-2025).
        Ta mission : Analyser ce document (Devis PDF ou Image) et rassurer l'utilisateur ou l'alerter.

        RÈGLES DE JUGEMENT :
        1. LOCALISATION : Cherche l'adresse. Si grande ville/zone dense, tolère prix +30%.
        2. INFLATION : Prends en compte la hausse des matériaux/main d'oeuvre.
        3. TOLERANCE : 
           - Prix moyen ou jusqu'à +20% : "VERT" (Correct).
           - +30% à +50% : "ORANGE" (Un peu cher).
           - > +60% ou incohérent : "ROUGE" (Arnaque).

        FORMAT JSON :
        {
            "profession": "Métier identifié (ex: Maçon, Pisciniste, Garagiste...)",
            "score": (Note sur 10),
            "status": "VERT" ou "ORANGE" ou "ROUGE",
            "verdict": "Titre court",
            "analyse": "Explication bienveillante et factuelle.",
            "conseil": "Conseil pro."
        }
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { 
                            inline_data: { 
                                mime_type: mimeType, // ICI : On passe "application/pdf" ou "image/jpeg" dynamiquement
                                data: fileData 
                            } 
                        }
                    ]
                }]
            })
        });

        const data = await response.json();

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