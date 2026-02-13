/**
 * Crabtree & Holbein Project Dashboard
 * Fetches project data from a public Google Sheet and renders filterable cards
 */

// ============================================================================
// CONFIGURATION - Update these values with your Google Sheet details
// ============================================================================

const CONFIG = {
    // Preferred data source (static JSON committed to repo)
    DATA_URL_JSON: 'data/projects.json',
    // Google Sheets published CSV (provided by you)
    SHEET_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcaV3c26B7OdZzLLRT3Ck3zqgdeMsjZ-grsZ3r0zTiBHITWnceSsFEUGm9d0eTFNJseNLtbbf9aDMA/pub?gid=690535049&single=true&output=csv',
    // Fallback to local CSV if others not available
    DATA_URL_CSV: 'data/projects.csv'
};

// ============================================================================
// Column mapping - maps sheet columns to data fields
// Update these if your form questions are in a different order
// ============================================================================

const COLUMNS = {
    TIMESTAMP: 0,
    TITLE: 1,
    ABSTRACT: 2,
    STATUS: 3,
    SUBMISSION_DATE: 4,
    TARGET_JOURNAL: 5,
    PRIORITY: 6,
    DEADLINE: 7,
    IRB_STATUS: 8,
    FUNDING: 9,
    DOCS_LINK: 10,
    COAUTHORS: 11,
    KEYWORDS: 12,
    LAST_ACTIVITY: 13
};

// ============================================================================
// Application State
// ============================================================================

let allProjects = [];
let filteredProjects = [];
let currentSource = 'embedded'; // embedded | json | sheets | csv

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
    search: document.getElementById('search'),
    filterStatus: document.getElementById('filter-status'),
    filterPriority: document.getElementById('filter-priority'),
    filterIRB: document.getElementById('filter-irb'),
    clearFilters: document.getElementById('clear-filters'),
    projectsGrid: document.getElementById('projects'),
    resultsCount: document.getElementById('results-count'),
    lastUpdated: document.getElementById('last-updated'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error')
};

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchProjects(preferred = 'auto') {
    // 0) Embedded global (works over file://)
    if (preferred === 'embedded' || preferred === 'auto') {
        if (window.__PROJECTS__ && Array.isArray(window.__PROJECTS__.projects)) {
            currentSource = 'embedded';
            return window.__PROJECTS__.projects;
        }
    }

    // 1) JSON (http/https)
    if (preferred === 'json' || preferred === 'auto') {
        try {
            const r = await fetch(CONFIG.DATA_URL_JSON, { cache: 'no-store' });
            if (r.ok) {
                const payload = await r.json();
                if (payload && Array.isArray(payload.projects)) { currentSource = 'json'; return payload.projects; }
                if (Array.isArray(payload)) { currentSource = 'json'; return payload; }
            }
            console.warn('JSON fetch failed or invalid');
        } catch (e) {
            console.warn('JSON fetch error:', e);
        }
    }

    // 2) Google Sheets CSV
    if (preferred === 'sheets' || preferred === 'auto') {
        try {
            const bust = `&_ts=${Date.now()}`;
            const response = await fetch(CONFIG.SHEET_CSV_URL + bust, { cache: 'no-store' });
            if (response.ok) {
                const txt = await response.text();
                currentSource = 'sheets';
                return parseCSV(txt);
            }
        } catch (e) {
            console.warn('Sheets fetch error:', e);
        }
    }

    // 3) Local CSV
    const response = await fetch(CONFIG.DATA_URL_CSV, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    currentSource = 'csv';
    const csvText = await response.text();
    return parseCSV(csvText);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const projects = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        
        if (row.length > 1 && row[COLUMNS.TITLE]) {
            projects.push({
                timestamp: row[COLUMNS.TIMESTAMP] || '',
                title: row[COLUMNS.TITLE] || '',
                abstract: row[COLUMNS.ABSTRACT] || '',
                status: row[COLUMNS.STATUS] || '',
                submissionDate: row[COLUMNS.SUBMISSION_DATE] || '',
                targetJournal: row[COLUMNS.TARGET_JOURNAL] || '',
                priority: row[COLUMNS.PRIORITY] || '',
                deadline: row[COLUMNS.DEADLINE] || '',
                irbStatus: row[COLUMNS.IRB_STATUS] || '',
                funding: row[COLUMNS.FUNDING] || '',
                docsLink: row[COLUMNS.DOCS_LINK] || '',
                coauthors: row[COLUMNS.COAUTHORS] || '',
                keywords: row[COLUMNS.KEYWORDS] || '',
                lastActivity: row[COLUMNS.LAST_ACTIVITY] || ''
            });
        }
    }
    
    return projects;
}

function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// ============================================================================
// Filtering
// ============================================================================

function applyFilters() {
    const searchTerm = elements.search.value.toLowerCase();
    const statusFilter = elements.filterStatus.value;
    const priorityFilter = elements.filterPriority.value;
    const irbFilter = elements.filterIRB.value;
    
    filteredProjects = allProjects.filter(project => {
        // Search filter
        if (searchTerm) {
            const searchableText = `${project.title} ${project.abstract} ${project.keywords} ${project.coauthors}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        // Status filter
        if (statusFilter && project.status !== statusFilter) {
            return false;
        }
        
        // Priority filter
        if (priorityFilter && project.priority !== priorityFilter) {
            return false;
        }
        
        // IRB filter
        if (irbFilter && project.irbStatus !== irbFilter) {
            return false;
        }
        
        return true;
    });
    
    renderProjects();
    updateResultsCount();
}

function clearFilters() {
    elements.search.value = '';
    elements.filterStatus.value = '';
    elements.filterPriority.value = '';
    elements.filterIRB.value = '';
    applyFilters();
}

// ============================================================================
// Rendering
// ============================================================================

function renderProjects() {
    if (filteredProjects.length === 0) {
        elements.projectsGrid.innerHTML = `
            <div class="empty-state">
                <p>No projects match your filters.</p>
            </div>
        `;
        return;
    }
    
    // Sort by priority (High first), then by last activity (newest first)
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2, '': 3 };
    const sorted = [...filteredProjects].sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.lastActivity || b.timestamp) - new Date(a.lastActivity || a.timestamp);
    });
    
    elements.projectsGrid.innerHTML = sorted.map(project => renderProjectCard(project)).join('');
}

function renderProjectCard(project) {
    const statusClass = getStatusClass(project.status);
    const priorityClass = getPriorityClass(project.priority);
    const keywordsHtml = renderKeywords(project.keywords);
    
    const titleHtml = project.docsLink 
        ? `<a href="${escapeHtml(project.docsLink)}" target="_blank">${escapeHtml(project.title)}</a>`
        : escapeHtml(project.title);
    
    const submissionInfo = project.status === 'Submitted' && project.submissionDate
        ? `<div class="submission-info">Submitted: <strong>${escapeHtml(project.submissionDate)}</strong>${project.targetJournal ? ` to ${escapeHtml(project.targetJournal)}` : ''}</div>`
        : '';
    
    const lastActivityFormatted = formatDate(project.lastActivity || project.timestamp);
    
    return `
        <article class="project-card">
            <h2>${titleHtml}</h2>
            <p class="project-abstract">${escapeHtml(project.abstract)}</p>
            
            <div class="project-meta-grid">
                <div class="meta-item">
                    <span class="meta-icon icon-badge ${statusClass}">📊</span>
                    <span class="meta-content">
                        <span class="meta-label">Status</span>
                        <span class="status-badge ${statusClass}">${escapeHtml(project.status)}</span>
                    </span>
                </div>
                ${project.priority ? `
                <div class="meta-item">
                    <span class="meta-icon icon-badge">⚡</span>
                    <span class="meta-content">
                        <span class="meta-label">Priority</span>
                        <span class="priority-badge ${priorityClass}">${escapeHtml(project.priority)}</span>
                    </span>
                </div>
                ` : ''}
                ${project.targetJournal && project.status !== 'Submitted' ? `
                <div class="meta-item">
                    <span class="meta-icon icon-badge">📚</span>
                    <span class="meta-content">
                        <span class="meta-label">Target</span>
                        <span class="meta-value">${escapeHtml(project.targetJournal)}</span>
                    </span>
                </div>
                ` : ''}
${project.deadline ? `
                <div class="meta-item">
                    <span class="meta-icon icon-badge">📅</span>
                    <span class="meta-content">
                        <span class="meta-label">Deadline</span>
                        <span class="meta-value">${escapeHtml(project.deadline)}</span>
                    </span>
                </div>
                ` : ''}
                ${project.irbStatus ? `
                <div class="meta-item">
                    <span class="meta-icon icon-badge">✓</span>
                    <span class="meta-content">
                        <span class="meta-label">IRB</span>
                        <span class="meta-value ${getIRBClass(project.irbStatus)}">${escapeHtml(project.irbStatus)}</span>
                    </span>
                </div>
                ` : ''}
                ${project.funding ? `
                <div class="meta-item">
                    <span class="meta-icon icon-badge">💰</span>
                    <span class="meta-content">
                        <span class="meta-label">Funding</span>
                        <span class="meta-value">${escapeHtml(project.funding)}</span>
                    </span>
                </div>
                ` : ''}
            </div>
            
            ${project.coauthors ? `
            <div class="info-section">
                <div class="info-header">
                    <span class="meta-icon icon-badge">👥</span>
                    <span class="meta-label">Coauthors</span>
                </div>
                <div class="info-content">${escapeHtml(project.coauthors)}</div>
            </div>
            ` : ''}
            
            ${keywordsHtml}
            
            <div class="project-footer">
                ${submissionInfo}
                <span class="date-info">Last activity: ${lastActivityFormatted}</span>
            </div>
        </article>
    `;
}

function renderKeywords(keywordsStr) {
    if (!keywordsStr) return '';
    
    const keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k);
    if (keywords.length === 0) return '';
    
    return `
        <div class="keywords">
            ${keywords.map(k => `<span class="keyword">${escapeHtml(k)}</span>`).join('')}
        </div>
    `;
}

function getStatusClass(status) {
    const statusLower = status.toLowerCase();
    if (statusLower === 'idea') return 'status-idea';
    if (statusLower === 'research design') return 'status-design';
    if (statusLower === 'data collected') return 'status-collected';
    if (statusLower === 'data analyzed') return 'status-analyzed';
    if (statusLower === 'writing') return 'status-writing';
    if (statusLower === 'submitted') return 'status-submitted';
    return '';
}

function getPriorityClass(priority) {
    const p = String(priority || '').toLowerCase();
    if (p === 'high') return 'priority-high';
    if (p === 'medium') return 'priority-medium';
    if (p === 'low') return 'priority-low';
    return '';
}

function getIRBClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('approved')) return 'irb-approved';
    if (s.includes('pending')) return 'irb-pending';
    if (s.includes('not needed') || s === 'n/a' || s === 'na') return 'irb-na';
    return '';
}

function updateResultsCount() {
    const total = allProjects.length;
    const showing = filteredProjects.length;
    
    if (showing === total) {
        elements.resultsCount.textContent = `Showing all ${total} projects`;
    } else {
        elements.resultsCount.textContent = `Showing ${showing} of ${total} projects`;
    }
    
    // Show last updated timestamp
    if (allProjects.length > 0) {
        const timestamps = allProjects.map(p => new Date(p.lastActivity || p.timestamp)).filter(d => !isNaN(d));
        if (timestamps.length > 0) {
            const mostRecent = new Date(Math.max(...timestamps));
            const formattedDate = mostRecent.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
            });
            elements.lastUpdated.textContent = `Last updated: ${formattedDate} • Source: ${currentSource}`;
        }
    }
}

// ============================================================================
// Utilities
// ============================================================================

function showError(message) {
    if (elements.loading) elements.loading.style.display = 'none';
    if (elements.error) {
        elements.error.style.display = 'block';
        elements.error.innerHTML = `<p><strong>Error</strong></p><pre style="white-space:pre-wrap;text-align:left">${escapeHtml(String(message))}</pre>`;
    } else {
        console.error(message);
    }
}

// Surface uncaught errors to the UI
window.addEventListener('error', (e) => {
    showError(`${e.message} (at ${e.filename}:${e.lineno}:${e.colno})`);
});
window.addEventListener('unhandledrejection', (e) => {
    showError(`Unhandled promise rejection: ${e.reason}`);
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch {
        return dateStr;
    }
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
    // Search with debounce
    let searchTimeout;
    elements.search.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });
    
    // Filter dropdowns
    elements.filterStatus.addEventListener('change', applyFilters);
    elements.filterPriority.addEventListener('change', applyFilters);
    elements.filterIRB.addEventListener('change', applyFilters);
    
    // Clear filters button
    elements.clearFilters.addEventListener('click', clearFilters);

    // Refresh from Google Sheets
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            elements.loading.style.display = 'block';
            try {
                allProjects = await fetchProjects('sheets');
                filteredProjects = [...allProjects];
                renderProjects();
                updateResultsCount();
            } catch (e) {
                showError(`Refresh failed: ${e}`);
            } finally {
                elements.loading.style.display = 'none';
            }
        });
    }
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
    setupEventListeners();
    
    try {
        allProjects = await fetchProjects('auto');
        filteredProjects = Array.isArray(allProjects) ? [...allProjects] : [];
        
        if (elements.loading) elements.loading.style.display = 'none';
        
        renderProjects();
        updateResultsCount();
    } catch (error) {
        showError(`Failed to initialize: ${error && error.message ? error.message : error}`);
        console.error('Failed to initialize:', error);
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
