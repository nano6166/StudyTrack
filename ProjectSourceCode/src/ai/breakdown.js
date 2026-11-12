// Story #23: ask an AI model to break one assignment into smaller steps with suggested dates.
// Uses the Google Gemini REST API. The key comes from the GEMINI_API_KEY environment variable
// (put it in .env, which is gitignored). Nothing else in the app talks to the AI service.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_STEPS = 8;

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

    let response;
    try {
        response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": key },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildPrompt(assignment) }] }],
                    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
                }),
                signal: AbortSignal.timeout(30000),
            }
        );
    } catch (err) {
        console.error("AI request failed:", err);
        throw new Error("Could not reach the AI service. Please try again.");
    }

    if (!response.ok) {
        console.error("AI service error:", response.status, await response.text().catch(() => ""));
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
