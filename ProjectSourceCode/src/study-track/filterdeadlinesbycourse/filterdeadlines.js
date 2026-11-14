
const courseFilter = document.getElementById("courseFilter");

const deadlines = document.querySelectorAll(".deadline");

const emptyMessage = document.getElementById("emptyMessage");

courseFilter.addEventListener("change", function () {

    const selectedCourse = this.value;

    let visibleCount = 0;

    deadlines.forEach(function (deadline) {

        const deadlineCourse = deadline.dataset.course;

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
