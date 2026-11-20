// Story #23: ask an AI model to break one assignment into smaller steps with suggested dates.
// Uses the Google Gemini REST API. The key comes from the GEMINI_API_KEY environment variable
// (put it in .env, which is gitignored). Nothing else in the app talks to the AI service.

// A "lite" model is fast and plenty for a short step list. If it is busy, the backup model is tried.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", process.env.GEMINI_BACKUP_MODEL || "gemini-flash-lite-latest"];
const MAX_STEPS = 8;
// Newer Gemini models "think" before answering, so allow up to 45 seconds per try
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 45000;
const MAX_ATTEMPTS = 2; // tries per model
const RETRY_DELAY_MS = 3000;
const BUSY_CODES = [429, 503];

function buildPrompt({ title, description, course, dueDate, today }) {
    return [
        "You help a university student plan their work.",
        "Break the assignment below into 3 to 8 short, concrete steps, in the order the student should do them.",
        "Give each step a suggested date to finish it, between today and the due date (inclusive).",
        'Reply with JSON only, in this exact shape: {"steps":[{"text":"...","suggestedDate":"YYYY-MM-DD"}]}',
        "Each step's text must be under 120 characters.",
        "",
        `Course: ${course}`,
        `Assignment: ${title}`,
        `Details: ${description || "(none)"}`,
        `Today: ${today}`,
        `Due date: ${dueDate || "(no due date; spread the steps over the next two weeks)"}`,
    ].join("\n");
}

// Make the model's answer safe to store: right types, sensible length, dates inside the allowed range
function cleanSteps(raw, { today, dueDate }) {
    const steps = raw && Array.isArray(raw.steps) ? raw.steps : null;
    if (!steps || steps.length === 0) {
        throw new Error("The AI reply did not contain any steps.");
    }
    const last = dueDate || null;
    return steps.slice(0, MAX_STEPS)
        .filter((s) => s && typeof s.text === "string" && s.text.trim())
        .map((s) => {
            let date = typeof s.suggestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.suggestedDate)
                ? s.suggestedDate : null;
            if (date && date < today) date = today;
            if (date && last && date > last) date = last;
            return { text: s.text.trim().slice(0, 200), suggestedDate: date };
        });
}

// Returns [{ text, suggestedDate }]. Throws an Error with a message that is safe to show the user.
async function generateSteps(assignment) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error("The AI feature is not set up yet (GEMINI_API_KEY is missing).");
    }

    const body = JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(assignment) }] }],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            // Short planning task, so ask the model to think less and answer faster
            thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING_LEVEL || "low" },
        },
    });

    // Gemini sometimes answers 503 (too busy) or 429 (too many requests), or is too slow.
    // Then wait a little and try again, and after that try the backup model.
    let response = null;
    let timedOut = false;
    for (const model of MODELS) {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const started = Date.now();
            try {
                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
                        body,
                        signal: AbortSignal.timeout(TIMEOUT_MS),
                    }
                );
            } catch (err) {
                const seconds = Math.round((Date.now() - started) / 1000);
                console.error(`AI request to ${model} failed after ${seconds}s:`, err.name, err.message);
                response = null;
                timedOut = true;
                break; // a slow model will likely be slow again, so go to the backup model
            }
            if (response.ok || !BUSY_CODES.includes(response.status)) break;
            console.warn(`${model} is busy (${response.status}), attempt ${attempt} of ${MAX_ATTEMPTS}`);
            if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
        if (response && (response.ok || !BUSY_CODES.includes(response.status))) break;
    }

    if (!response) {
        throw new Error(timedOut ? "The AI service is too slow right now. Please try again in a minute."
            : "Could not reach the AI service. Please try again.");
    }
    if (!response.ok) {
        console.error("AI service error:", response.status, await response.text().catch(() => ""));
        if (BUSY_CODES.includes(response.status)) {
            throw new Error("The AI service is busy right now. Please try again in a minute.");
        }
        throw new Error("The AI service returned an error. Please try again.");
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error("The AI reply could not be read. Please try again.");
    }
    const steps = cleanSteps(parsed, assignment);
    if (steps.length === 0) {
        throw new Error("The AI reply did not contain any steps.");
    }
    return steps;
}

module.exports = { generateSteps, cleanSteps, buildPrompt };
