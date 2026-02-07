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

        const { fileData, mimeType } = await req.json();

        // --- PROMPT MIS À JOUR 2026 ---
        const prompt = `
        Tu es un expert tarification réaliste et pragmatique.
        DATE ACTUELLE : 2026.
        
        Ta mission : Analyser ce document (Devis PDF ou Image) et juger les prix selon le marché ACTUEL (2026).

        RÈGLES DE JUGEMENT CRITIQUES :
        1. CONTEXTE 2026 : Oublie les prix de 2024. Prends en compte l'inflation cumulée (Matériaux + Main d'oeuvre + Énergie). Ce qui était cher en 2024 est peut-être standard aujourd'hui.
        2. LOCALISATION : Si c'est une grande ville ou zone tendue, accepte des prix +30% supérieurs à la moyenne nationale sans pénalité.
        3. QUALITÉ vs PRIX : Ne cherche pas le prix le plus bas ("Low Cost"). Cherche le "Juste Prix" pour un travail pro.

        BARÈME : 
        - Prix dans la moyenne marché 2026 : "VERT" (Correct).
        - Prix jusqu'à +25% au-dessus (Marge de sécurité) : "VERT" (Correct/Standard).
        - Prix +30% à +50% : "ORANGE" (Un peu cher).
        - Prix > +60% ou incohérent : "ROUGE" (Arnaque).

        FORMAT JSON :
        {
            "profession": "Métier identifié (ex: Maçon, Pisciniste, Garagiste...)",
            "score": (Note sur 10. 8-10 = Prix Excellent/Correct, 5-7 = Un peu cher, 0-4 = Arnaque),
            "status": "VERT" ou "ORANGE" ou "ROUGE",
            "verdict": "Titre court",
            "analyse": "Explication brève qui cite des références de prix 2026.",
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
                                mime_type: mimeType || 'image/jpeg',
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