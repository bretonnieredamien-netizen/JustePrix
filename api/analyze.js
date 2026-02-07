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

        const { image } = await req.json();

        // --- LE SECRET EST ICI : PROMPT UNIVERSEL ---
        const prompt = `
        Tu es un expert universel en tarification (Bâtiment, Auto, Santé, Services).
        1. IDENTIFIE le type de devis (ex: Plomberie, Paysagiste, Dentiste, Garage, Rénovation Toiture...).
        2. ANALYSE les prix par rapport au marché français actuel.
        3. VERDICT : Est-ce honnête ou abusif ?

        Réponds UNIQUEMENT ce JSON brut :
        {
            "profession": "Le métier identifié (ex: Plombier)",
            "score": (Note sur 10. 10=Prix Excellent, 0=Grosse Arnaque),
            "status": "VERT" (Honnête) ou "ORANGE" (Cher) ou "ROUGE" (Arnaque),
            "verdict": "Titre court (ex: Main d'oeuvre abusive !)",
            "analyse": "Explication claire en 2 phrases sur les prix constatés.",
            "conseil": "Conseil d'expert pour négocier ou valider."
        }
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "image/jpeg", data: image } }
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