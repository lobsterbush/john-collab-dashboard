# Crabtree & Holbein Projects

A filterable dashboard for tracking research collaborations between Charles Crabtree and John Holbein.

## Features

- **Greyscale design** with smooth animations
- **Filter by**: Collaborator (Charles/John/Both), Status, Priority, IRB Status
- **Full-text search** across titles, abstracts, keywords, and notes
- **Password protection** (client-side)
- **Google Sheets integration** for easy project management

## Project Fields

| Field | Description |
|-------|-------------|
| Title | Project name |
| Abstract | Brief description of the research |
| Status | Idea → Research design → Data collected → Data analyzed → Writing → Submitted |
| Collaborator | Charles only / John only / Both |
| Submission Date | Date submitted (if status = Submitted) |
| Target Journal | Where you plan to submit |
| Priority | High / Medium / Low |
| Deadline | For grants, special issues, etc. |
| IRB Status | Approved / Pending / Not needed |
| Funding | Source if applicable |
| Docs Link | Link to shared Google Doc, Overleaf, etc. |
| Notes | Free-form comments |
| Keywords | Comma-separated tags |
| Last Activity | When someone last worked on it |

## Setup

### 1. Create a Google Form

Create a Google Form with questions matching the fields above. Link it to a new Google Sheet.

### 2. Publish the Google Sheet

1. Open your Google Sheet
2. Go to **File → Share → Publish to web**
3. Select the sheet tab and choose **CSV** format
4. Click **Publish**

### 3. Configure the Dashboard

Edit `js/app.js` and update the `CONFIG` object:

```javascript
const CONFIG = {
    SHEET_ID: 'your-google-sheet-id',
    SHEET_NAME: 'Form Responses 1',
    FORM_URL: 'your-google-form-url',
    USE_DEMO_DATA: false  // Set to false to use Google Sheet
};
```

### 4. Set a Password

1. Open browser console on the dashboard
2. Run: `simpleHash('yourpassword')`
3. Copy the result
4. Update `PASS_HASH` in `js/auth.js`

### 5. Deploy

Host on GitHub Pages:

1. Create a new GitHub repo
2. Push these files
3. Enable GitHub Pages in repo settings
4. (Optional) Add a custom domain via CNAME file

## Local Development

Just open `index.html` in a browser. The demo data will load automatically.

## File Structure

```
john-collab-dashboard/
├── index.html           # Main page
├── README.md            # This file
├── css/
│   └── style.css        # Greyscale styling with animations
├── js/
│   ├── app.js           # Data fetching, filtering, rendering
│   └── auth.js          # Password protection
└── data/
    └── demo_projects.csv # Demo/backup data
```

---

Co-Authored-By: Warp <agent@warp.dev>
