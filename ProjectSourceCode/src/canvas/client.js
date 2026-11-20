// Canvas LMS REST API client (Import from Canvas).
// Docs: https://canvas.instructure.com/doc/api/
// The user saves a personal access token on the Settings page (stored encrypted).
// With CANVAS_DEMO=true in .env, sample data from demoData.js is used instead of the real Canvas.
const BASE_URL = (process.env.CANVAS_BASE_URL || "https://canvas.colorado.edu").replace(/\/+$/, "");

class CanvasError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

// Canvas splits long lists into pages and puts the next page's URL in the Link header
function nextLink(linkHeader) {
    if (!linkHeader) return null;
    for (const part of linkHeader.split(",")) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match) return match[1];
    }
    return null;
}

async function getAll(path, token) {
    const results = [];
    let url = `${BASE_URL}/api/v1${path}`;

    // A limit on pages keeps one import from running forever
    for (let page = 0; url && page < 20; page++) {
        // Only follow links that stay on the same Canvas site, so the token is never sent elsewhere
        if (!url.startsWith(`${BASE_URL}/`)) break;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (response.status === 401) {
            throw new CanvasError("Canvas did not accept that token. Make a new one and try again.", 401);
        }
        if (!response.ok) {
            throw new CanvasError(`Canvas returned an error (${response.status}).`, response.status);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new CanvasError("Canvas sent back something unexpected.", 502);
        }
        results.push(...data);
        url = nextLink(response.headers.get("link"));
    }
    return results;
}

const DEMO = process.env.CANVAS_DEMO === "true";
const demo = require("./demoData");

// Courses the user is currently enrolled in
function getCourses(token) {
    if (DEMO) return Promise.resolve(demo.getCourses());
    return getAll("/courses?enrollment_state=active&per_page=100", token);
}

// All assignments of one course, with their due dates
function getAssignments(courseId, token) {
    if (DEMO) return Promise.resolve(demo.getAssignments(courseId));
    return getAll(`/courses/${encodeURIComponent(courseId)}/assignments?per_page=100&order_by=due_at&include[]=submission`, token);
}

module.exports = { getCourses, getAssignments, nextLink, CanvasError, BASE_URL };
