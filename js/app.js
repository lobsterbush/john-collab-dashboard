/**
 * Crabtree & Holbein Project Dashboard
 * Fetches project data from a public Google Sheet and renders filterable cards
 */

// ============================================================================
// CONFIGURATION - Update these values with your Google Sheet details
// ============================================================================

const CONFIG = {
    // Your Google Sheet ID (from the URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit)
    SHEET_ID: 'YOUR_SHEET_ID_HERE',
    
    // The sheet/tab name (default is usually "Form Responses 1" for form-linked sheets)
    SHEET_NAME: 'Form Responses 1',
    
    // Your Google Form URL for submissions
    FORM_URL: 'YOUR_FORM_URL_HERE',
    
    // Use demo data from local CSV file (set to false once Google Sheet is configured)
    USE_DEMO_DATA: true,
    DEMO_DATA_URL: 'data/demo_projects.csv'
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
    COLLABORATOR: 4,
    SUBMISSION_DATE: 5,
    TARGET_JOURNAL: 6,
    PRIORITY: 7,
    DEADLINE: 8,
    IRB_STATUS: 9,
    FUNDING: 10,
    DOCS_LINK: 11,
    NOTES: 12,
    KEYWORDS: 13,
    LAST_ACTIVITY: 14
};

// ============================================================================
// Application State
// ============================================================================

let allProjects = [];
let filteredProjects = [];

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
    search: document.getElementById('search'),
    filterCollaborator: document.getElementById('filter-collaborator'),
    filterStatus: document.getElementById('filter-status'),
    filterPriority: document.getElementById('filter-priority'),
    filterIRB: document.getElementById('filter-irb'),
    clearFilters: document.getElementById('clear-filters'),
    submitLinkHeader: document.getElementById('submit-link-header'),
    projectsGrid: document.getElementById('projects'),
    resultsCount: document.getElementById('results-count'),
    lastUpdated: document.getElementById('last-updated'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error')
};

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchProjects() {
    let csvUrl;
    
    if (CONFIG.USE_DEMO_DATA) {
        csvUrl = CONFIG.DEMO_DATA_URL;
    } else {
        csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;
    }
    
    try {
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
    }
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
                collaborator: row[COLUMNS.COLLABORATOR] || '',
                submissionDate: row[COLUMNS.SUBMISSION_DATE] || '',
                targetJournal: row[COLUMNS.TARGET_JOURNAL] || '',
                priority: row[COLUMNS.PRIORITY] || '',
                deadline: row[COLUMNS.DEADLINE] || '',
                irbStatus: row[COLUMNS.IRB_STATUS] || '',
                funding: row[COLUMNS.FUNDING] || '',
                docsLink: row[COLUMNS.DOCS_LINK] || '',
                notes: row[COLUMNS.NOTES] || '',
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
    const collaboratorFilter = elements.filterCollaborator.value;
    const statusFilter = elements.filterStatus.value;
    const priorityFilter = elements.filterPriority.value;
    const irbFilter = elements.filterIRB.value;
    
    filteredProjects = allProjects.filter(project => {
        // Search filter
        if (searchTerm) {
            const searchableText = `${project.title} ${project.abstract} ${project.keywords} ${project.notes}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        // Collaborator filter
        if (collaboratorFilter && project.collaborator !== collaboratorFilter) {
            return false;
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
    elements.filterCollaborator.value = '';
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
    const collaboratorClass = getCollaboratorClass(project.collaborator);
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
            <span class="collaborator-badge ${collaboratorClass}">${escapeHtml(project.collaborator)}</span>
            <h2>${titleHtml}</h2>
            <p class="project-abstract">${escapeHtml(project.abstract)}</p>
            
            <div class="project-meta-grid">
                <div class="meta-item">
                    <span class="meta-icon">📊</span>
                    <span class="meta-content">
                        <span class="meta-label">Status</span>
                        <span class="status-badge ${statusClass}">${escapeHtml(project.status)}</span>
                    </span>
                </div>
                ${project.priority ? `
                <div class="meta-item">
                    <span class="meta-icon">⚡</span>
                    <span class="meta-content">
                        <span class="meta-label">Priority</span>
                        <span class="priority-badge ${priorityClass}">${escapeHtml(project.priority)}</span>
                    </span>
                </div>
                ` : ''}
                ${project.targetJournal && project.status !== 'Submitted' ? `
                <div class="meta-item">
                    <span class="meta-icon">📚</span>
                    <span class="meta-content">
                        <span class="meta-label">Target</span>
                        <span class="meta-value">${escapeHtml(project.targetJournal)}</span>
                    </span>
                </div>
                ` : ''}
                ${project.deadline ? `
                <div class="meta-item">
                    <span class="meta-icon">📅</span>
                    <span class="meta-content">
                        <span class="meta-label">Deadline</span>
                        <span class="meta-value">${escapeHtml(project.deadline)}</span>
                    </span>
                </div>
                ` : ''}
                ${project.irbStatus ? `
                <div class="meta-item">
                    <span class="meta-icon">✓</span>
                    <span class="meta-content">
                        <span class="meta-label">IRB</span>
                        <span class="meta-value">${escapeHtml(project.irbStatus)}</span>
                    </span>
                </div>
                ` : ''}
                ${project.funding ? `
                <div class="meta-item">
                    <span class="meta-icon">💰</span>
                    <span class="meta-content">
                        <span class="meta-label">Funding</span>
                        <span class="meta-value">${escapeHtml(project.funding)}</span>
                    </span>
                </div>
                ` : ''}
            </div>
            
            ${project.notes ? `
            <div class="info-section">
                <div class="info-header">
                    <span class="meta-icon">📝</span>
                    <span class="meta-label">Notes</span>
                </div>
                <div class="info-content">${escapeHtml(project.notes)}</div>
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
    const p = priority.toLowerCase();
    if (p === 'high') return 'priority-high';
    if (p === 'medium') return 'priority-medium';
    if (p === 'low') return 'priority-low';
    return '';
}

function getCollaboratorClass(collaborator) {
    const c = collaborator.toLowerCase();
    if (c.includes('charles') && !c.includes('john') && !c.includes('both')) return 'collaborator-charles';
    if (c.includes('john') && !c.includes('charles') && !c.includes('both')) return 'collaborator-john';
    return 'collaborator-both';
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
            elements.lastUpdated.textContent = `Last updated: ${formattedDate}`;
        }
    }
}

// ============================================================================
// Utilities
// ============================================================================

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
    elements.filterCollaborator.addEventListener('change', applyFilters);
    elements.filterStatus.addEventListener('change', applyFilters);
    elements.filterPriority.addEventListener('change', applyFilters);
    elements.filterIRB.addEventListener('change', applyFilters);
    
    // Clear filters button
    elements.clearFilters.addEventListener('click', clearFilters);
    
    // Set form URL
    elements.submitLinkHeader.href = CONFIG.FORM_URL;
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
    setupEventListeners();
    
    // Check if configuration is set (skip check if using demo data)
    if (!CONFIG.USE_DEMO_DATA && CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE') {
        elements.loading.style.display = 'none';
        elements.error.style.display = 'block';
        elements.error.innerHTML = `
            <p><strong>Configuration Required</strong></p>
            <p>Please update the CONFIG object in js/app.js with your Google Sheet ID and Form URL.</p>
        `;
        return;
    }
    
    try {
        allProjects = await fetchProjects();
        filteredProjects = [...allProjects];
        
        elements.loading.style.display = 'none';
        
        renderProjects();
        updateResultsCount();
    } catch (error) {
        elements.loading.style.display = 'none';
        elements.error.style.display = 'block';
        console.error('Failed to initialize:', error);
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
