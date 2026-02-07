export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // Gestion des autorisations (CORS)
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

        // --- NOUVEAU PROMPT "REALISTE" ---
        const prompt = `
        Tu es un expert tarification réaliste et pragmatique (Contexte économique 2024-2025).
        Ta mission : Analyser ce devis (Bâtiment, Auto, Santé, Services, etc.) et rassurer l'utilisateur ou l'alerter.

        RÈGLES DE JUGEMENT (TRES IMPORTANT) :
        1. LOCALISATION : Cherche l'adresse sur le devis. Si c'est une grande ville (Paris, Lyon, etc.) ou une zone dense, tolère automatiquement des prix +30% plus élevés.
        2. INFLATION : Prends en compte la hausse récente des matières premières et main d'oeuvre. Ne te base pas sur des prix datés.
        3. TOLERANCE : 
           - Si le prix est dans la moyenne ou jusqu'à +20% au-dessus : C'est "VERT" (Correct/Standard). La qualité se paie.
           - Si le prix est +30% à +50% au-dessus : C'est "ORANGE" (Un peu cher).
           - Si le prix dépasse +60% ou contient des incohérences flagrantes : C'est "ROUGE" (Arnaque).

        FORMAT DE REPONSE ATTENDU (JSON BRUT) :
        {
            "profession": "Le métier identifié (ex: Couvreur, Garagiste, Dentiste...)",
            "score": (Note sur 10. 8-10 = Prix Excellent/Correct, 5-7 = Un peu cher, 0-4 = Arnaque),
            "status": "VERT" (si note >= 7) ou "ORANGE" (si note entre 4 et 6) ou "ROUGE" (si note < 4),
            "verdict": "Titre court et rassurant si vert (ex: Prix Cohérent)",
            "analyse": "Explication bienveillante. Si c'est un peu cher, explique que c'est peut-être dû à la qualité ou la région.",
            "conseil": "Conseil pro (ex: Vérifiez juste les délais, sinon foncez)."
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