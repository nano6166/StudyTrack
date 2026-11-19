
// this script filters the deadlines based on the selected course from the dropdown menu
const courseFilter = document.getElementById("courseFilter");
// get all the deadlines elements
const deadlines = document.querySelectorAll(".deadline");
// get the empty message element
const emptyMessage = document.getElementById("emptyMessage");
//this adds a event listener
courseFilter.addEventListener("change", function () {

    const selectedCourse = this.value;

    let visibleCount = 0;

    deadlines.forEach(function (deadline) {

        const deadlineCourse = deadline.dataset.course;
// check if the selected course is "all" or matches the deadline's course
        if (
            selectedCourse === "all" ||
            deadlineCourse === selectedCourse
        ) {
            deadline.style.display = "block";
            visibleCount++;
        } else {
            deadline.style.display = "none";
        }

    });
    emptyMessage.hidden = visibleCount > 0;

});
