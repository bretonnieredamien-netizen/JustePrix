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

        // --- PROMPT AVEC KIT DE NEGOCIATION ---
        const prompt = `
        Tu es un expert tarification réaliste (Marché 2026).
        Analyse ce devis (Image ou PDF).

        RÈGLES :
        1. CONTEXTE 2026 : Prends en compte l'inflation.
        2. LOCALISATION : Tolère +30% pour les grandes villes.
        3. BARÈME :
           - Prix moyen à +25% : "VERT".
           - +30% à +50% : "ORANGE".
           - > +60% ou incohérent : "ROUGE".

        FORMAT JSON :
        {
            "profession": "Métier identifié",
            "score": (Note sur 10),
            "status": "VERT" ou "ORANGE" ou "ROUGE",
            "verdict": "Titre court (ex: Main d'oeuvre abusive)",
            "analyse": "Explication factuelle.",
            "conseil": "Conseil pro.",
            "negotiation_text": "Un texte court (SMS style) que le client peut copier pour négocier avec le pro. (ex: 'Bonjour, j'ai comparé votre devis, le poste X me semble 30% au dessus du marché...')"
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