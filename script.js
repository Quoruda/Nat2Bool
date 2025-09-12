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