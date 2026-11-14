async function loadStats() {
    try {
        //Statistic 1
        const course_total_res = await fetch('/database/getTotalCourses');

        if (!course_total_res.ok) {
            throw new Error(`Failed to load total courses: ${course_total_res.status}`);
        }

        const course_total = await course_total_res.json();


        //Statistic 2
        const lifetime_assigments_res = await fetch('/database/getLifetimeStudyAssignments');

        if (!lifetime_assigments_res.ok) {
            throw new Error(`Failed to load lifetime assignments: ${lifetime_assigments_res.status}`);
        }

        const lifetime_assigments = await lifetime_assigments_res.json();

        //statisic 3
        try{
            const minutes_total_res = await fetch('/database/getLifetimeStudyMinutes');

            if (!course_total_res.ok) {
                throw new Error(`Failed to load total courses: ${course_total_res.status}`);
            }

            const minutes_total = await minutes_total_res.json();
            document.getElementById('lifetimeStudyMinutes').textContent = minutes_total_res;
        } catch (err){
                document.getElementById('lifetimeStudyMinutes').textContent = '0';
            console.log(err)
        }



        document.getElementById('totalCourses').textContent = course_total.total_courses;
        document.getElementById('lifetimeStudyAssignments').textContent = lifetime_assigments.total_assignments;

    } catch (error) {
        console.error('Error loading dashboard statistics:', error);

        document.getElementById('totalCourses').textContent = 'Unavailable';
        document.getElementById('lifetimeStudyAssignments').textContent = 'Unavailable';
    }
}

loadStats();