// Ku Qaado Configuration
// Change this URL when deploying the backend
const CONFIG = {
    // API_URL: 'https://ku-qaado-api.onrender.com' // Example production URL
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5173'
        : 'https://ku-qaado-api.onrender.com' // Fallback to prompt/placeholder
};

// Helper to get full API path
function getApiUrl(path) {
    // Remove leading slash if present to avoid double slashes
    const CleanPath = path.startsWith('/') ? path.substring(1) : path;
    const Base = CONFIG.API_URL.endsWith('/') ? CONFIG.API_URL.slice(0, -1) : CONFIG.API_URL;
    return `${Base}/api/${CleanPath}`;
}
