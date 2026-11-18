// Turns Canvas courses and assignments into StudyTrack rows (Import from Canvas).
// Kept separate from the route so it can be unit tested without the network.

// Course codes like "CSCI 3308-100: Software Development" keep the part before ":" and fit courses.code (20 characters)
function cleanCourse(course) {
    const raw = String(course.course_code || course.name || `Course ${course.id}`);
    const code = raw.split(":")[0].trim().slice(0, 20);
    const name = String(course.name || "").trim().slice(0, 100);
    return { canvasId: String(course.id), code, name };
}

// Guess the StudyTrack type from the assignment name
function guessType(name) {
    if (/\b(exam|midterm|final exam|quiz)\b/i.test(name)) return "exam";
    if (/\bproject\b/i.test(name)) return "project";
    return "assignment";
}

// Canvas gives due_at in UTC. StudyTrack stores a date, so convert it to the Boulder date.
function toDenverDate(dueAt) {
    if (!dueAt) return null;
    const date = new Date(dueAt);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(date);
}

// Assignments without a due date are skipped, because every StudyTrack page sorts by due date
function cleanAssignment(assignment) {
    const dueDate = toDenverDate(assignment.due_at);
    if (!dueDate) return null;
    const name = String(assignment.name || "Untitled").trim().slice(0, 100);
    // With include[]=submission, Canvas adds the student's own submission to each assignment
    const state = assignment.submission && assignment.submission.workflow_state;
    const submitted = ["submitted", "graded", "pending_review"].includes(state);
    return { canvasId: String(assignment.id), name, dueDate, type: guessType(name), submitted };
}

module.exports = { cleanCourse, cleanAssignment, guessType, toDenverDate };
