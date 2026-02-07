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

        // --- PROMPT "NEGOCIATION SUBTILE" ---
        const prompt = `
        Tu es un expert en achat et négociation (Contexte 2026).
        Analyse ce devis.

        MISSION : Rédiger un argumentaire de négociation qui ne braque pas l'artisan.

        RÈGLES CRITIQUES POUR LE TEXTE DE NÉGOCIATION :
        1. MOTS INTERDITS : Ne jamais utiliser "geste commercial", "rabais", "réduction", "trop cher". Ça dévalorise le travail.
        2. MOTS CLES : Utiliser "ajustement", "optimisation", "budget alloué", "compétitivité sur ce poste", "standard marché".
        3. APPROCHE : "Je veux travailler avec vous, aidez-moi à faire passer le dossier."
        
        STRUCTURE DU MESSAGE A GENERER ("negotiation_text") :
        - Etape 1 (Validation) : Remercier pour la réactivité et valider la qualité technique/le sérieux perçu. (ex: "Votre proposition technique me semble solide").
        - Etape 2 (Le blocage précis) : Ne pas critiquer le total. Isoler une ligne précise (Main d'oeuvre, Matériau X, Forfait Y) en expliquant qu'elle est au-dessus des standards constatés ailleurs.
        - Etape 3 (L'ouverture) : Demander s'il est possible de revoir ce point spécifique ou de trouver une alternative technique moins coûteuse pour rentrer dans le budget.
        - Etape 4 (Closing) : "Si nous trouvons un accord là-dessus, je valide le devis immédiatement."

        FORMAT JSON ATTENDU :
        {
            "profession": "Métier identifié",
            "score": (Note sur 10),
            "status": "VERT" ou "ORANGE" ou "ROUGE",
            "verdict": "Titre court",
            "analyse": "Analyse factuelle des prix.",
            "conseil": "Conseil technique.",
            "negotiation_text": "Le message complet, poli et argumenté (environ 3-4 phrases)."
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