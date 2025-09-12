// === Sélecteurs DOM globaux ===
const generateBtn = document.getElementById("generateBtn");
const searchInput = document.getElementById("searchInput");

const settingsBtn = document.getElementById("settingsBtn");
const modal = document.getElementById("settingsModal");
const closeModal = document.getElementById("closeModal");
const saveBtn = document.querySelector(".save-btn");

const searchEngineSelect = document.getElementById("searchEngine");
const aiChoiceSelect = document.getElementById("aiChoice");
const themeChoiceSelect = document.getElementById("themeChoice");
const apiKeyInput = document.getElementById("apiKey");

// === Etat local ===
let isGenerating = false;
let originalGenerateText = generateBtn ? generateBtn.innerText : "Generate";

const prompt = `
You are an expert assistant specialized in information retrieval and advanced search query generation.

Your task is to transform a user’s natural language request into the most appropriate search output.
There are three possible cases:

1. **Famous website requests**
   - If the user clearly asks for a well-known website (e.g., “go to YouTube”, “Apple official site”, “LinkedIn website”),
     return only the direct URL (e.g., https://www.youtube.com, https://www.apple.com, https://www.linkedin.com).
   - Do not add explanations, only the URL.

2. **Simple factual questions**
   - If the user’s request is very basic (e.g., “What’s the weather in Paris tomorrow?”, “time in Tokyo now”),
     output a simple, short search query in natural language, without unnecessary boolean operators.
   - Keep it concise and natural, so the search engine can handle it.

3. **Complex or research-oriented queries**
   - If the request implies research, filtering, or precision (e.g., academic papers, technical files, sourcing, investigations),
     generate an optimized search query using:
       - Boolean operators: AND, OR, NOT
       - Quotation marks for exact phrases
       - Parentheses for grouping
       - Advanced operators like:
         • filetype:pdf, filetype:py, etc.
         • site:example.com, site:.gov, site:.edu
         • intitle:, inurl:, intext:
         • before:YYYY-MM-DD, after:YYYY-MM-DD
         • related:, cache:
         • AROUND(n) for proximity
   - Always output only the query string, without commentary.

---

### Special rules
- If the user request mentions a file type (PDF, Word, Python script, etc.):
  • Do not keep generic words like "document", "pdf", "file" as plain text.
  • Instead, remove those generic words and apply the correct operator (e.g., filetype:pdf).
- Example:
  User: "documents pdf containing the name SOLTNER"
  → "SOLTNER" filetype:pdf

---

### Rules
- Always decide the best output type depending on the user’s intent:
  • Famous website → return URL
  • Simple factual question → plain query
  • Research/complex request → advanced boolean query
- Never add explanations, context, or formatting outside the final result.
- Output only one string (either URL or query).

---

### Good examples
User: *Go to YouTube*
→ https://www.youtube.com

User: *Weather in Paris tomorrow*
→ weather Paris tomorrow

User: *Documents PDF containing the name SOLTNER*
→ "SOLTNER" filetype:pdf

User: *Research papers on renewable energy after 2022*
→ "renewable energy" AND "research papers" after:2022-01-01

---

### Bad examples
❌ Adding explanations: *Here is your boolean query: ...*
❌ Mixing formats: *weather Paris tomorrow (AND site:weather.com)*
❌ Ignoring clear filetype intent: ("document pdf" AND "SOLTNER") filetype:pdf

---

### Final instruction
Always return only one result string (URL or query) that best matches the user’s true intent.

# Current User Query
User:
`

// === Gestion des paramètres ===
function loadSettings() {
    const saved = localStorage.getItem("nat2bool-settings");
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);
        if (searchEngineSelect) searchEngineSelect.value = settings.searchEngine || "Google";
        if (aiChoiceSelect) aiChoiceSelect.value = settings.aiChoice || "OpenAI";
        if (themeChoiceSelect) themeChoiceSelect.value = settings.themeChoice || "Cyberpunk";
        if (apiKeyInput) apiKeyInput.value = settings.apiKey || "";
    } catch (err) {
        console.warn("Impossible de parser nat2bool-settings :", err);
    }
}

function saveSettings() {
    const settings = {
        searchEngine: searchEngineSelect.value,
        aiChoice: aiChoiceSelect.value,
        themeChoice: themeChoiceSelect.value,
        apiKey: apiKeyInput.value
    };

    localStorage.setItem("nat2bool-settings", JSON.stringify(settings));
    console.log("Paramètres sauvegardés :", settings);
    if (modal) modal.style.display = "none";
    return settings;
}

// === Helpers pour l'état du bouton ===
function startGeneration(text) {
    if (!generateBtn) return;
    if (isGenerating) return;
    isGenerating = true;
    originalGenerateText = generateBtn.innerText;
    generateBtn.disabled = true;
    generateBtn.innerText = text || "Recherche...";
    generateBtn.setAttribute("aria-busy", "true");
}

function endGeneration() {
    if (!generateBtn) return;
    isGenerating = false;
    generateBtn.disabled = false;
    generateBtn.innerText = originalGenerateText || "Generate";
    generateBtn.removeAttribute("aria-busy");
}


// === API Calls ===
async function callMistralAPI(userMessage, apiKey) {
    const url = "https://api.mistral.ai/v1/chat/completions";
    const model = "mistral-small-latest"; // adapter si besoin

    const body = {
        model,
        messages: [{ role: "user", content: userMessage }]
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Erreur API Mistral :", response.status, errText);
            return `ERROR ${response.status}: ${errText}`;
        }

        const respJson = await response.json();
        console.log("Réponse brute Mistral :", respJson);
        return respJson.choices[0].message.content;
    } catch (err) {
        console.error("Erreur fetch Mistral :", err);
        return `FETCH_ERROR: ${err.message || err}`;
    }
}

function handleLLMResponse(responseText) {
    if (!responseText || typeof responseText !== "string") {
        console.error("Invalid LLM response");
        return;
    }

    const trimmed = responseText.trim();

    // Vérifie si c'est une URL (commence par http:// ou https:// ou ressemble à un domaine)
    const urlPattern = /^(https?:\/\/[^\s]+)$/i;
    const domainPattern = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

    if (urlPattern.test(trimmed) || domainPattern.test(trimmed)) {
        // Cas 1: C'est un lien → redirection directe
        const url = trimmed.startsWith("http") ? trimmed : "https://" + trimmed;
        window.location.href = url;
    } else {
        // Cas 2: C'est une requête → recherche Google
        const googleUrl = "https://www.google.com/search?q=" + encodeURIComponent(trimmed);
        window.location.href = googleUrl;
    }
}


// === Gestion de la recherche ===
async function handleGenerateClick() {
    if (isGenerating) {
        console.log("Génération déjà en cours — attente de la fin.");
        return;
    }

    const query = (searchInput && searchInput.value) ? searchInput.value.trim() : "";
    if (!query) {
        console.log("Aucune requête fournie.");
        return;
    }

    const settings = {
        searchEngine: searchEngineSelect?.value,
        aiChoice: aiChoiceSelect?.value,
        apiKey: apiKeyInput?.value
    };

    console.log("Recherche :", query, "avec paramètres :", settings);

    let currentPrompt = prompt + query;


    // démarrer l'état "génération"
    startGeneration("Searching...");

    let resultText = "";

    try {
        if (settings.aiChoice === "Mistral") {
            if (!settings.apiKey) {
                console.error("Clé API Mistral non fournie !");
                return;
            }
            resultText = await callMistralAPI(currentPrompt, settings.apiKey);
            console.log("Contenu retourné par Mistral :", resultText);
        } else {
            // comportement pour autres IA (pour l'instant on log)
            console.log("IA non-Mistral sélectionnée — pas encore implémentée");
        }
    } finally {
        if(resultText !== ""){
            handleLLMResponse(resultText);
        }
        // réactiver le bouton quoi qu'il arrive
        endGeneration();
    }
}

// === Gestion du modal ===
function setupModal() {
    if (settingsBtn) settingsBtn.addEventListener("click", () => { if (modal) modal.style.display = "flex"; });
    if (closeModal) closeModal.addEventListener("click", () => { if (modal) modal.style.display = "none"; });
    window.addEventListener("click", e => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
    if (saveBtn) saveBtn.addEventListener("click", saveSettings);
}

// === Initialisation ===
function init() {
    loadSettings();
    setupModal();
    if (generateBtn) generateBtn.addEventListener("click", handleGenerateClick);
}

// lancer init après chargement DOM
document.addEventListener("DOMContentLoaded", init);
