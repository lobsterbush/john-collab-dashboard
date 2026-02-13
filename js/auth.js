/**
 * Simple client-side password protection
 * Note: This is NOT secure - it just provides a basic barrier
 */

(function() {
    const PASS_HASH = '4a091fa4000a00650073'; // Hash for 'erdosrules'
    const STORAGE_KEY = 'crabtree_holbein_auth';
    
    // Simple hash function
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(8, '0') + 
               str.length.toString(16).padStart(4, '0') +
               (str.charCodeAt(0) || 0).toString(16).padStart(4, '0') +
               (str.charCodeAt(str.length - 1) || 0).toString(16).padStart(4, '0');
    }
    
    // Check if already authenticated
    function isAuthenticated() {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored === PASS_HASH;
    }
    
    // Verify password
    function verifyPassword(password) {
        return simpleHash(password) === PASS_HASH;
    }
    
    // Show/hide overlay
    function showOverlay(show) {
        const overlay = document.getElementById('password-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    // Initialize
    function init() {
        const overlay = document.getElementById('password-overlay');
        const input = document.getElementById('password-input');
        const submit = document.getElementById('password-submit');
        const error = document.getElementById('password-error');
        
        if (!overlay) return;
        
        if (isAuthenticated()) {
            showOverlay(false);
            return;
        }
        
        showOverlay(true);
        
        function attemptLogin() {
            const password = input.value;
            if (verifyPassword(password)) {
                sessionStorage.setItem(STORAGE_KEY, PASS_HASH);
                showOverlay(false);
            } else {
                error.textContent = 'Incorrect password';
                input.value = '';
                input.focus();
            }
        }
        
        submit.addEventListener('click', attemptLogin);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // To generate a new password hash, run in browser console:
    // simpleHash('yourpassword')
    window.simpleHash = simpleHash;
})();
