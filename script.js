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

// Generate button animation
generateBtn.addEventListener('click', function() {
    const query = searchInput.value.trim();
    if (query) {
        // Button animation
        this.style.background = 'linear-gradient(45deg, #00ff80, #00ffff)';
        this.textContent = 'PROCESSING...';
        this.style.transform = 'scale(0.95)';

        // Simulate processing
        setTimeout(() => {
            this.style.background = 'linear-gradient(45deg, #00ffff, #0080ff)';
            this.textContent = 'GENERATE';
            this.style.transform = 'scale(1)';
        }, 2500);

        // Update status during processing
        const statusIndicator = document.querySelector('.status-indicator span');
        statusIndicator.textContent = 'Processing Query...';

        setTimeout(() => {
            statusIndicator.textContent = 'AI Engine Ready';
        }, 2500);
    }
});

// Enter key support
searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        generateBtn.click();
    }
});
