// Elements
const searchInput = document.getElementById('searchInput');
const generateBtn = document.getElementById('generateBtn');

// Typing effect
let isTyping = false;

searchInput.addEventListener('input', function() {
    if (!isTyping) {
        isTyping = true;
        this.parentElement.parentElement.style.borderColor = 'rgba(0, 255, 255, 0.8)';

        setTimeout(() => {
            isTyping = false;
            if (!this.value) {
                this.parentElement.parentElement.style.borderColor = 'rgba(0, 255, 255, 0.2)';
            }
        }, 1000);
    }
});

// Generate button animation and search
generateBtn.addEventListener('click', function() {
    const query = searchInput.value.trim();
    if (query) {
        // Button animation
        this.style.background = 'linear-gradient(45deg, #00ff80, #00ffff)';
        this.textContent = 'SEARCHING...';
        this.style.transform = 'scale(0.95)';

        // Update status during processing
        const statusIndicator = document.querySelector('.status-indicator span');
        statusIndicator.textContent = 'Redirecting to Google...';

        // Redirect to Google search after animation
        setTimeout(() => {
            const encodedQuery = encodeURIComponent(query);
            const googleUrl = `https://www.google.com/search?q=${encodedQuery}`;
            window.open(googleUrl, '_blank');

            // Reset button
            this.style.background = 'linear-gradient(45deg, #00ffff, #0080ff)';
            this.textContent = 'GENERATE';
            this.style.transform = 'scale(1)';

            // Reset status
            statusIndicator.textContent = 'AI Engine Ready';
        }, 1000);
    }
});

// Enter key support
searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        generateBtn.click();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const generateBtn = document.getElementById("generateBtn");
    const searchInput = document.getElementById("searchInput");

    // Fonction existante
    generateBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) {
            console.log("User query:", query);
            // TODO: Envoyer la requête vers l'IA plus tard
        }
    });

    // Gestion du modal Paramètres
    const settingsBtn = document.getElementById("settingsBtn");
    const modal = document.getElementById("settingsModal");
    const closeModal = document.getElementById("closeModal");
    const saveBtn = document.querySelector(".save-btn");

    const searchEngineSelect = document.getElementById("searchEngine");
    const aiChoiceSelect = document.getElementById("aiChoice");
    const themeChoiceSelect = document.getElementById("themeChoice");

    // Ouvrir/Fermer modal
    settingsBtn.addEventListener("click", () => {
        modal.style.display = "flex";
    });

    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });

    // Sauvegarder paramètres
    saveBtn.addEventListener("click", () => {
        const settings = {
            searchEngine: searchEngineSelect.value,
            aiChoice: aiChoiceSelect.value,
            themeChoice: themeChoiceSelect.value
        };

        localStorage.setItem("nat2bool-settings", JSON.stringify(settings));
        console.log("Paramètres sauvegardés :", settings);

        modal.style.display = "none";
    });

    // Charger paramètres sauvegardés
    function loadSettings() {
        const saved = localStorage.getItem("nat2bool-settings");
        if (saved) {
            const settings = JSON.parse(saved);
            searchEngineSelect.value = settings.searchEngine || "Google";
            aiChoiceSelect.value = settings.aiChoice || "OpenAI";
            themeChoiceSelect.value = settings.themeChoice || "Cyberpunk";
            console.log("Paramètres chargés :", settings);
        }
    }

    loadSettings();
});

