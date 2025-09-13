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

const apiUrlGroup = document.getElementById("apiUrlGroup");
const apiUrlInput = document.getElementById("apiUrl");


// === Etat local ===
let isGenerating = false;
let originalGenerateText = generateBtn ? generateBtn.innerText : "Generate";



const DEFAULT_SETTINGS = {
    searchEngine: "Google",
    aiChoice: "mistral",
    themeChoice: "cyberpunk",
    apiKey: "",
    apiUrl: ""
};

const prompt = `
You are an expert assistant specialized in transforming user input into the single best Google search output (either a direct URL or a search query string). Return exactly one line: either a URL or a search query. Do NOT add any explanations, commentary, or extra characters.

--- OUTPUT DECISION (three exclusive cases)
1) FAMOUS WEBSITE REDIRECT — return a direct URL ONLY IF:
   A) The user explicitly asks to go/visit/open the site using verbs like "go to", "visit", "open", "official site", "website of".
   OR
   B) The user input matches exactly the canonical site name or a well-known multi-word brand token (case-insensitive), like "YouTube", "LinkedIn", "Le Monde", "New York Times", "Apple", "GitHub".
   - If the site name appears with other words beyond the official brand token, treat as a search query instead.
   - Return the canonical URL (e.g., https://www.youtube.com, https://www.lemonde.fr).

2) SIMPLE FACTUAL QUESTIONS — produce a concise natural-language search query for basic facts: time, weather, conversion, definition, location.
   - Avoid Boolean operators or advanced syntax.
   - Example: "Weather in Paris tomorrow" → weather Paris tomorrow

3) COMPLEX / RESEARCH-ORIENTED QUERIES — generate an optimized Google query using Boolean operators, quotes, parentheses, and advanced operators: filetype:, site:, intitle:, inurl:, intext:, before:, after:, related:, cache:, AROUND(n).
   - Detect as complex if input contains keywords like research, paper, study, report, dataset, filetype:, pdf, docx, ipynb, after:, before:, intitle:, inurl:, site:, or has more than 4 words with qualifiers.
   - Normalize dates to YYYY-MM-DD when using after: or before:.
   - For file types (PDF, Word, Python), remove generic words like "document" and use filetype:pdf, filetype:docx, filetype:py.
   - Combine site constraints with complex queries if needed: "Musk on LinkedIn" → Musk site:linkedin.com

--- SITE REDIRECTION RULES
- Default to a search query unless one of the strict redirect conditions above is met.
- Single-token or multi-word brand/site tokens are eligible for redirect if they match exactly, with no extra words.
- If the input includes a site token WITH other words, never redirect — generate a search query instead.
- Treat phrases like "open X profile on LinkedIn" or "view X on LinkedIn" as search queries (X site:linkedin.com) unless a full URL is explicitly provided.

--- FORMATTING RULES
- Output exactly one string: either a full URL starting with https:// or a search query ready for Google.
- Never wrap output in quotes or add commentary.
- Use quotes only for exact phrases within the query.
- Keep queries concise and focused.

--- EXAMPLES
Good:
- "YouTube" → https://www.youtube.com
- "Le Monde" → https://www.lemonde.fr
- "Musk on LinkedIn" → Musk site:linkedin.com
- "LinkedIn jobs Paris" → LinkedIn jobs Paris site:linkedin.com
- "Weather in Paris tomorrow" → weather Paris tomorrow
- "documents pdf about climate change" → "climate change" filetype:pdf
- "Research papers on renewable energy after 2022" → "renewable energy" AND "research papers" after:2022-01-01

Bad:
- Return a URL for "Musk on LinkedIn"
- Add any commentary
- Mix formats or leave generic file words

--- FINAL INSTRUCTION
Decide the single best output (URL OR query) and return only that one-line string.

# Current User Query
User:
`;




function setTheme(themeName) {
    const themeLink = document.getElementById("themeStylesheet");
    themeLink.href = `styles/${themeName}.css`;
    localStorage.setItem("nat2bool-theme", themeName);
}

function updateApiUrlVisibility() {
    if (["ollama"].includes(aiChoiceSelect.value)) {
        apiUrlGroup.style.display = "flex";
    } else {
        apiUrlGroup.style.display = "none";
    }
}
aiChoiceSelect.addEventListener("change", updateApiUrlVisibility);



// === Gestion des paramètres ===
function loadSettings() {
    const saved = localStorage.getItem("nat2bool-settings");
    let settings = DEFAULT_SETTINGS;

    if (saved) {
        try {
            settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (err) {
            console.warn("Impossible de parser nat2bool-settings :", err);
            settings = DEFAULT_SETTINGS;
        }
    }

    searchEngineSelect.value = settings.searchEngine;
    aiChoiceSelect.value = settings.aiChoice;
    themeChoiceSelect.value = settings.themeChoice;
    apiKeyInput.value = settings.apiKey;

    apiUrlInput.value = settings.apiUrl || DEFAULT_SETTINGS.apiUrl;

    updateApiUrlVisibility()
    setTheme(settings.themeChoice);
}


function saveSettings() {
    const settings = {
        searchEngine: searchEngineSelect.value,
        aiChoice: aiChoiceSelect.value,
        themeChoice: themeChoiceSelect.value,
        apiKey: apiKeyInput.value,
        apiUrl: apiUrlInput.value
    };

    localStorage.setItem("nat2bool-settings", JSON.stringify(settings));
    console.log("Paramètres sauvegardés :", settings);
    loadSettings();
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
        if (settings.aiChoice === "mistral") {
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
    if (settingsBtn) settingsBtn.addEventListener("click", () => {
         if (modal) modal.style.display = "flex";
    });
    if (closeModal) closeModal.addEventListener("click", () => {
         if (modal) modal.style.display = "none";
         loadSettings();
    }
    );
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
