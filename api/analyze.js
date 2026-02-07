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

        // --- PROMPT "DIPLOMATE & EXPERT" ---
        const prompt = `
        Tu es un expert en négociation de travaux et services (Marché 2026).
        Analyse ce devis.

        OBJECTIF : Fournir une analyse juste et un texte de négociation respectueux qui ne braque pas l'artisan.

        RÈGLES DE JUGEMENT :
        1. Contextualise (Ville, Urgence, Complexité).
        2. Tolérance : Accepte jusqu'à +25% au dessus du marché (Qualité).
        
        FORMAT JSON ATTENDU :
        {
            "profession": "Métier identifié",
            "score": (Note sur 10),
            "status": "VERT" ou "ORANGE" ou "ROUGE",
            "verdict": "Titre court",
            "analyse": "Analyse factuelle des prix.",
            "conseil": "Conseil technique ou stratégique.",
            "negotiation_text": "Rédige un message (Email/SMS) diplomatique, poli et construit. Structure : 1. Remercie pour le devis et la réactivité. 2. Valide la qualité perçue. 3. Pointe spécifiquement l'élément qui bloque (Main d'oeuvre ou Matériau X) en disant 'J'ai noté que ce poste est au-dessus des standards habituels'. 4. Propose une ouverture : 'Si un geste est possible sur ce point, je suis prêt à valider le devis rapidement'. Ton : Partenariat, pas confrontation."
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