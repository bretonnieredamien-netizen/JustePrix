import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // 1. Sécurité
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // 2. Vérification Clé API
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Clé API Google manquante");
    }

    // 3. Réception de l'image
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Pas d'image reçue" });
    }

    // 4. Préparation pour Gemini
    const base64Data = image.split(",")[1];
    const mimeType = image.split(";")[0].split(":")[1];

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    // 5. LE NOUVEAU PROMPT "VENDEUR D'ÉLITE" (Court & Percutant)
    const prompt = `Agis comme un Top Vendeur Vinted. Ta mission : Vendre cet objet le plus vite possible.
    
    Analyse l'image et rédige une annonce ULTRA-EFFICACE.
    
    Règles d'or pour la description :
    1. SOIS BREF. Pas de blabla inutile.
    2. Mets en avant les MEILLEURS ARGUMENTS (Marque, Rareté, État).
    3. Donne envie immédiatement.

    Réponds UNIQUEMENT avec ce JSON strict :
    {
        "titre": "Marque Modèle + 2 Mots clés forts (ex: Vintage, Neuf)",
        "prix": "XX€ - YY€ (Vise la fourchette haute du marché)",
        "categorie": "Catégorie exacte Vinted",
        "description": "Rédige exactement 3 lignes percutantes avec des émojis :\n- Ligne 1 : L'état précis et la marque (ex: '🌟 État irréprochable, véritable Nike').\n- Ligne 2 : Le détail qui tue (Matière, Coupe, ou Collection).\n- Ligne 3 : L'argument d'urgence (ex: '⚡️ Pièce rare, partira vite !').",
        "hashtags": "10 hashtags pertinents séparés par des espaces"
    }`;

    // 6. Génération
    const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // 7. Envoi de la réponse
    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("ERREUR:", error);
    res.status(500).json({ error: error.message || "Erreur interne" });
  }
}