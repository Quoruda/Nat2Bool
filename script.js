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
const modelGroup = document.getElementById("modelGroup");
const modelInput = document.getElementById("model");

// === Etat local ===
let isGenerating = false;
let originalGenerateText = generateBtn ? generateBtn.innerText : "Generate";



const DEFAULT_SETTINGS = {
    searchEngine: "Google",
    aiChoice: "mistral",
    themeChoice: "cyberpunk",
    apiKey: "",
    apiUrl: "http://localhost:11434"
};

const prompt = `
You are an assistant that converts a user's free-text input into a single, immediately usable Google-target (one line only): either (A) a canonical HTTPS URL for a website/profile, or (B) a Google search query string optimized to get the best results. Output exactly one line and nothing else (no commentary, no extra whitespace, no quotes around the entire output).

--- PREPROCESSING
- Trim whitespace, normalize Unicode accents, light spelling correction on short tokens
- Preserve the user's original language for natural queries

--- CORE RULES (applied in order of priority)

## RULE 1: DIRECT URL RESOLUTION
**When to apply:** User explicitly requests to visit/open/go to a site, OR input is a clear brand/site name (1-3 words, no qualifiers)
**Action:** Return canonical HTTPS URL
**Examples:**
- "facebook" → https://www.facebook.com
- "go to linkedin" → https://www.linkedin.com
- "open gmail" → https://mail.google.com

## RULE 2: PROFILE PATTERN DETECTION
**When to apply:** Input matches deterministic profile patterns with valid syntax
**Action:** Return canonical profile URL
**Examples:**
- "/in/johnsmith" → https://www.linkedin.com/in/johnsmith
- "@username" → https://twitter.com/username

## RULE 3: CODE/FILE SEARCH OPTIMIZATION
**When to apply:** Input contains code indicators: file extensions (.py, .ipynb, .js), keywords ("script", "source", "repo", "implementation", "github", "gitlab"), or language names (python, java, etc.)

**Sub-rules:**
- **3a) Explicit file request:** Use content-based search with filetype
  - "python script for sorting" → intext:"sorting" filetype:py
  - "notebook machine learning" → intext:"machine learning" filetype:ipynb

- **3b) Repository/implementation request:** Use site-specific search
  - "numpy implementation github" → site:github.com "numpy"
  - "react components repository" → site:github.com "react components"

- **3c) Platform explicitly mentioned:** Include site constraint
  - "python tutorial on github" → site:github.com python tutorial

**Fallback:** If ambiguous between code and docs, combine both approaches:
- "python tutorial" → python tutorial (filetype:py OR filetype:pdf)

## RULE 4: GENERAL SEARCH CONSTRUCTION
**When to apply:** All other cases

**Query building logic:**
- Use meaningful keywords without over-quoting
- Quote only exact phrases or hyphenated terms that must match exactly
- Add filetype: constraints when file types are implied
- Use after:/before: for date ranges (YYYY-MM-DD format)
- Group OR operators properly: (main terms) (filetype:pdf OR filetype:docx)

**Examples:**
- "machine learning pdf 2023" → machine learning filetype:pdf after:2023-01-01
- "climate change report" → "climate change" report filetype:pdf

## RULE 5: SAFETY & FALLBACKS
**PII Protection:** If input contains personal identifiers (SSN patterns, credit cards, phone numbers, emails, addresses), return generic search removing sensitive data
**Ambiguous cases:** When intent is unclear, prefer broader search over wrong URL
**Invalid syntax:** If generated query would be malformed, simplify to basic keyword search

--- EXAMPLES FOR VALIDATION

**Input:** "neat-python"
**Output:** https://github.com/neat-python

**Input:** "fichier python pour tri"
**Output:** intext:"tri" filetype:py

**Input:** "pandas documentation"
**Output:** pandas documentation

**Input:** "react tutorial github 2024"
**Output:** site:github.com react tutorial after:2024-01-01

**Input:** "john.doe@company.com resume"
**Output:** resume template

**Input:** "visit stackoverflow"
**Output:** https://stackoverflow.com

--- IMPLEMENTATION NOTES
- Maintain configurable brand-to-domain mapping table
- Keep code indicator keywords and file extensions in updateable lists
- Validate final query syntax before output
- Test edge cases regularly with the provided examples

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
        modelGroup.style.display = "flex";
    } else {
        apiUrlGroup.style.display = "none";
        modelGroup.style.display = "none";
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
    modelInput.value = settings.model || DEFAULT_SETTINGS.model;

    updateApiUrlVisibility()
    setTheme(settings.themeChoice);
}


function saveSettings() {
    const settings = {
        searchEngine: searchEngineSelect.value,
        aiChoice: aiChoiceSelect.value,
        themeChoice: themeChoiceSelect.value,
        apiKey: apiKeyInput.value,
        apiUrl: apiUrlInput.value,
        model: modelInput.value
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

async function callOllamaAPI(userMessage, apiUrl, model = "llama3.2") {
    // Construire l'URL complète pour l'API Ollama
    const fullUrl = apiUrl.endsWith('/') ? apiUrl + "api/chat" : apiUrl + "/api/chat";

    const body = {
        model: model,
        messages: [
            {
                role: "user",
                content: userMessage
            }
        ],
        stream: false
    };

    try {
        const response = await fetch(fullUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Erreur API Ollama :", response.status, errText);
            return `ERROR ${response.status}: ${errText}`;
        }

        const respJson = await response.json();
        console.log("Réponse brute Ollama :", respJson);

        // Ollama avec /api/chat retourne la réponse dans message.content
        return respJson.message.content;
    } catch (err) {
        console.error("Erreur fetch Ollama :", err);
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
        console.log("Génération déjà en cours – attente de la fin.");
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
        apiKey: apiKeyInput?.value,
        apiUrl: apiUrlInput?.value,
        model: modelInput?.value
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
                alert("Veuillez configurer votre clé API Mistral dans les paramètres.");
                return;
            }
            resultText = await callMistralAPI(currentPrompt, settings.apiKey);
            console.log("Contenu retourné par Mistral :", resultText);
        } else if (settings.aiChoice === "ollama") {
            if (!settings.apiUrl) {
                console.error("URL API Ollama non fournie !");
                alert("Veuillez configurer l'URL de votre serveur Ollama dans les paramètres.");
                return;
            }
            resultText = await callOllamaAPI(currentPrompt, settings.apiUrl, settings.model);
            console.log("Contenu retourné par Ollama :", resultText);
        } else {
            // comportement pour autres IA (pour l'instant on log)
            console.log("IA non supportée sélectionnée");
            alert("Cette IA n'est pas encore supportée.");
        }
    } catch (error) {
        console.error("Erreur lors de l'appel API :", error);
        alert("Erreur lors de l'appel à l'API. Vérifiez votre configuration et votre connexion.");
    } finally {
        if(resultText !== "" && !resultText.startsWith("ERROR") && !resultText.startsWith("FETCH_ERROR")) {
            handleLLMResponse(resultText);
        } else if (resultText.startsWith("ERROR") || resultText.startsWith("FETCH_ERROR")) {
            console.error("Erreur API :", resultText);
            alert("Erreur lors de l'appel à l'API : " + resultText);
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