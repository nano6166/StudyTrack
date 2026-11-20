// Sample Canvas data for demos (CANVAS_DEMO=true in .env).
// CU Boulder does not let students make Canvas access tokens, so this lets the team show
// Sync with Canvas without a real token. The objects have the same shape as Canvas API replies,
// so the normal import code runs on them. Due dates are counted from today, so they never go stale.

function daysFromToday(days) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    date.setUTCHours(23 + 6, 59, 0, 0); // 11:59pm in Boulder
    return date.toISOString();
}

const submitted = { workflow_state: "submitted" };
const unsubmitted = { workflow_state: "unsubmitted" };

const courses = [
    { id: 900001, course_code: "CSCI 3308-100: Software Development", name: "Software Development Methods and Tools" },
    { id: 900002, course_code: "MATH 2300-010: Calculus 2", name: "Calculus 2" },
    { id: 900003, course_code: "WRTG 3035-101", name: "Technical Communication and Design" },
];

const assignments = {
    900001: [
        { id: 910001, name: "Lab 12: Deploy to Render", due_at: daysFromToday(-3), submission: submitted },
        { id: 910002, name: "Final Project Presentation", due_at: daysFromToday(13), submission: unsubmitted },
        { id: 910003, name: "Quiz 9: CI/CD", due_at: daysFromToday(4), submission: unsubmitted },
        { id: 910004, name: "Lab 13 Reflection", due_at: null, submission: unsubmitted },
    ],
    900002: [
        { id: 920001, name: "Homework 10: Series", due_at: daysFromToday(2), submission: unsubmitted },
        { id: 920002, name: "Midterm 3", due_at: daysFromToday(8), submission: unsubmitted },
    ],
    900003: [
        { id: 930001, name: "Usability Report Draft", due_at: daysFromToday(6), submission: unsubmitted },
    ],
};

function getCourses() {
    return courses;
}

function getAssignments(courseId) {
    return assignments[courseId] || [];
}

module.exports = { getCourses, getAssignments };
