// Course view page script
// - Reads ?course=<id> from the URL
// - Loads courses, instructors, sessions, materials and enrollments
// - Renders header info, description, sessions list and materials list
// - Disables materials tab and download buttons if user is not logged in or not enrolled

(function () {
    const coursesPath = "/assets/data/courses.json";
    const instructorsPath = "/assets/data/instructors.json";
    const sessionsPath = "/assets/data/sessions.json";
    const materialsPath = "/assets/data/materials.json";
    const enrollmentPath = "/assets/data/enrollment.json";

    const courseHeader = document.getElementById("courseHeader");
    const courseDescription = document.getElementById("courseDescription");
    const sessionsList = document.getElementById("sessionsList");
    const materialsList = document.getElementById("materialsList");
    const materialsTabBtn = document.getElementById("materials-tab");

    function qParam() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id");
    }

    function formatDate(d) {
        try {
            return new Date(d).toLocaleDateString();
        } catch (e) {
            return d;
        }
    }

    function getCurrentUserId() {
        let current = localStorage.getItem("currentUser");
        if (!current) {
            const st = localStorage.getItem("student");
            if (st) {
                try {
                    const parsed = JSON.parse(st);
                    if (
                        parsed &&
                        (parsed.id || parsed.nationalId || parsed.student_id)
                    ) {
                        current = String(
                            parsed.id || parsed.nationalId || parsed.student_id
                        );
                    }
                } catch (e) {
                    /* ignore */
                }
            }
        }
        return current ? String(current) : null;
    }

    function renderHeader(
        course,
        instructor,
        completedSessionsCount,
        isEnrolled
    ) {
        const enrollLabel = isEnrolled ? "Enrolled" : "Enroll Now";
        const enrollClass = isEnrolled
            ? "btn btn-secondary disabled"
            : "btn btn-primary";
        const disabledAttr = isEnrolled ? "disabled" : "";
        const html = `
            <div class="p-3 rounded shadow-sm bg-white">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h2 class="text-hu-primary">${course.title}</h2>
                    </div>
                    <div>
                        <button id="enrollBtn" class="${enrollClass}" ${disabledAttr}>${enrollLabel}</button>
                    </div>
                </div>
                <div class="mt-3 row">
                    <div class="col-md-2"><strong>Field:</strong><div>${
                        course.field || ""
                    }</div></div>
                    <div class="col-md-2"><strong>Round:</strong><div>${
                        course.round || ""
                    }</div></div>
                    <div class="col-md-2"><strong>Status:</strong><div>${
                        course.status || ""
                    }</div></div>
                    <div class="col-md-2"><strong>Start Date:</strong><div>${
                        formatDate(course.start_date) || ""
                    }</div></div>
                    <div class="col-md-1"><strong>Sessions:</strong><div>${
                        course.sessions || ""
                    }</div></div>
                    <div class="col-md-3"><strong>Completed Sessions:</strong><div>${completedSessionsCount}</div></div>
                </div>
                <div class="mt-2"><strong>Instructor:</strong> ${
                    instructor ? instructor.name : "TBA"
                }</div>
            </div>
        `;
        courseHeader.innerHTML = html;
    }

    function renderDescription(course) {
        const text =
            course.description ||
            "Put some text on the course\nWhat's about\nWhat's the outcome of the course\nWhat to do next";
        const html = `<div class="p-3 rounded shadow-sm bg-white"><h5>Course Description</h5><div>${text.replace(
            /\n/g,
            "<br/>"
        )}</div></div>`;
        courseDescription.innerHTML = html;
    }

    function createSessionItem(s) {
        const itm = document.createElement("div");
        itm.className =
            "list-group-item d-flex justify-content-between align-items-start";
        itm.innerHTML = `
            <div>
                <div class="fw-semibold">${s.title}</div>
                <div class="small text-muted">${formatDate(s.date)} · ${
            s.start_time || ""
        } · ${s.location || ""}</div>
            </div>
            <div class="text-end">
                <div class="small">${s.status || ""}</div>
            </div>
        `;
        return itm;
    }

    function createMaterialItem(m, disabled) {
        const itm = document.createElement("div");
        itm.className =
            "list-group-item d-flex justify-content-between align-items-center";
        const left = document.createElement("div");
        left.innerHTML = `<div class="fw-semibold">${
            m.title
        }</div><div class="small text-muted">${m.type || ""}</div>`;
        const right = document.createElement("div");
        const btn = document.createElement("a");
        btn.className = "btn btn-sm btn-primary";
        btn.textContent = "Download";
        btn.href = m.file || "#";
        if (disabled) {
            btn.classList.add("disabled");
            btn.setAttribute("aria-disabled", "true");
            btn.addEventListener("click", (e) => e.preventDefault());
        }
        right.appendChild(btn);
        itm.appendChild(left);
        itm.appendChild(right);
        return itm;
    }

    // main flow
    (async function load() {
        const courseId = qParam("course");
        if (!courseId) {
            courseHeader.innerHTML =
                '<div class="alert alert-danger">No course specified.</div>';
            return;
        }

        try {
            const [courses, instructors, sessions, materials, enrollments] =
                await Promise.all([
                    fetch(coursesPath).then((r) => r.json()),
                    fetch(instructorsPath).then((r) => r.json()),
                    fetch(sessionsPath)
                        .then((r) => r.json())
                        .catch(() => []),
                    fetch(materialsPath)
                        .then((r) => r.json())
                        .catch(() => []),
                    fetch(enrollmentPath)
                        .then((r) => r.json())
                        .catch(() => []),
                ]);

            const course = (courses || []).find(
                (c) => String(c.id) === String(courseId)
            );
            if (!course) {
                courseHeader.innerHTML =
                    '<div class="alert alert-warning">Course not found.</div>';
                return;
            }

            const instructor = (instructors || []).find(
                (i) => String(i.id) === String(course.instructor_id)
            );

            const courseSessions = (sessions || []).filter(
                (s) => String(s.course_id) === String(course.id)
            );
            const completedCount = courseSessions.filter(
                (s) => (s.status || "").toLowerCase() === "completed"
            ).length;

            // determine if current user is enrolled
            const curr = getCurrentUserId();

            // prefer enrollments from localStorage if present, otherwise use fetched enrollments
            const ls = localStorage.getItem("enrollments");
            let allEnrollments = (enrollments || []).slice();
            if (ls) {
                try {
                    const parsed = JSON.parse(ls);
                    if (Array.isArray(parsed)) {
                        // merge: include parsed entries and keep unique by id
                        const map = new Map();
                        (allEnrollments || []).forEach((e) =>
                            map.set(String(e.id), e)
                        );
                        parsed.forEach((e) => map.set(String(e.id), e));
                        allEnrollments = Array.from(map.values());
                    }
                } catch (e) {
                    /* ignore parse errors */
                }
            }

            const enrolledSet = new Set();
            (allEnrollments || []).forEach((en) => {
                if (!en || en.student_id == null || en.course_id == null)
                    return;
                if (String(en.student_id) === String(curr))
                    enrolledSet.add(String(en.course_id));
            });
            let isEnrolled = curr && enrolledSet.has(String(course.id));

            renderHeader(course, instructor, completedCount, isEnrolled);
            renderDescription(course);

            // render sessions
            sessionsList.innerHTML = "";
            if (courseSessions.length === 0) {
                sessionsList.innerHTML =
                    '<div class="text-muted">No sessions available for this course.</div>';
            } else {
                courseSessions.forEach((s) =>
                    sessionsList.appendChild(createSessionItem(s))
                );
            }

            // render materials (materials link to sessions)
            const courseMaterials = (materials || []).filter((m) => {
                // find session for material
                const sess = sessions.find(
                    (ss) => String(ss.id) === String(m.session_id)
                );
                return sess && String(sess.course_id) === String(course.id);
            });

            materialsList.innerHTML = "";
            if (!curr) {
                // user not logged in -> disable tab and show login prompt
                if (materialsTabBtn) materialsTabBtn.classList.add("disabled");
                materialsList.innerHTML =
                    '<div class="text-muted">Please log in and enroll to access materials.</div>';
            } else if (!isEnrolled) {
                if (materialsTabBtn) materialsTabBtn.classList.add("disabled");
                materialsList.innerHTML =
                    '<div class="text-muted">You must be enrolled in this course to view materials.</div>';
            } else {
                // enabled
                if (materialsTabBtn)
                    materialsTabBtn.classList.remove("disabled");
                if (courseMaterials.length === 0) {
                    materialsList.innerHTML =
                        '<div class="text-muted">No materials uploaded yet.</div>';
                } else {
                    courseMaterials.forEach((m) =>
                        materialsList.appendChild(createMaterialItem(m, false))
                    );
                }
            }

            // wire enroll button: allow enrolling (persist to localStorage) if user logged in and not enrolled
            const enrollBtn = document.getElementById("enrollBtn");
            if (enrollBtn) {
                enrollBtn.addEventListener("click", (e) => {
                    // if already enrolled, do nothing
                    if (isEnrolled) return;
                    if (!curr) {
                        // redirect to login
                        location.href = "/login.html";
                        return;
                    }

                    // create a new enrollment and persist to localStorage
                    const nextId =
                        (allEnrollments || []).reduce(
                            (max, it) => Math.max(max, Number(it.id || 0)),
                            0
                        ) + 1;
                    const newEnroll = {
                        id: nextId,
                        student_id: isFinite(Number(curr))
                            ? Number(curr)
                            : curr,
                        course_id: isFinite(Number(course.id))
                            ? Number(course.id)
                            : course.id,
                        enrollment_date: new Date().toISOString().slice(0, 10),
                    };
                    allEnrollments.push(newEnroll);
                    try {
                        localStorage.setItem(
                            "enrollments",
                            JSON.stringify(allEnrollments)
                        );
                        // notify other scripts in this tab that enrollments changed
                        try {
                            window.dispatchEvent(
                                new Event("enrollmentsUpdated")
                            );
                        } catch (e) {
                            /* ignore */
                        }
                    } catch (err) {
                        console.warn(
                            "Failed to persist enrollment to localStorage",
                            err
                        );
                    }

                    // update in-memory state and UI
                    enrolledSet.add(String(course.id));
                    isEnrolled = true;
                    enrollBtn.textContent = "Enrolled";
                    enrollBtn.classList.remove("btn-primary");
                    enrollBtn.classList.add("btn-secondary", "disabled");
                    enrollBtn.setAttribute("disabled", "");

                    // enable materials tab and render materials
                    if (materialsTabBtn)
                        materialsTabBtn.classList.remove("disabled");
                    materialsList.innerHTML = "";
                    if (courseMaterials.length === 0) {
                        materialsList.innerHTML =
                            '<div class="text-muted">No materials uploaded yet.</div>';
                    } else {
                        courseMaterials.forEach((m) =>
                            materialsList.appendChild(
                                createMaterialItem(m, false)
                            )
                        );
                    }
                });
            }

            // if materials tab is disabled, ensure clicking does not switch
            if (
                materialsTabBtn &&
                materialsTabBtn.classList.contains("disabled")
            ) {
                materialsTabBtn.addEventListener("click", (e) =>
                    e.preventDefault()
                );
            }
        } catch (err) {
            console.error("Error loading course view data:", err);
            courseHeader.innerHTML =
                '<div class="alert alert-danger">Failed to load course data.</div>';
        }
    })();
})();
