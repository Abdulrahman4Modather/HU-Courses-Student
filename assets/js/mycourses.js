// Renders courses on the home page into ongoing and upcoming sections.
// - Fetches assets/data/courses.json and assets/data/instructors.json
// - Renders bootstrap-styled course cards
// - Provides a simple search that filters by course title

(function () {
    const coursesPath = "/assets/data/courses.json";
    const instructorsPath = "/assets/data/instructors.json";
    const sessionsPath = "/assets/data/sessions.json";

    const enrolledContainer = document.getElementById("enrolledCourses");
    const upcomingContainer = document.getElementById("upcomingSessions");

    function formatDate(d) {
        try {
            return new Date(d).toLocaleDateString();
        } catch (e) {
            return d;
        }
    }

    function readLocal(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function instructorMap(list) {
        const m = {};
        (list || []).forEach((i) => (m[i.id] = i));
        return m;
    }

    function createEnrolledCard(
        course,
        instructor,
        completedCount,
        nextSession
    ) {
        const wrapper = document.createElement("div");
        wrapper.className = "mb-4";

        const card = document.createElement("div");
        card.className = "d-flex rounded border p-3 bg-white";

        const img = document.createElement("div");
        img.className = "me-3 flex-shrink-0";
        img.style.width = "260px";
        img.style.height = "140px";
        img.style.background = "#f0f0f0";
        img.style.borderRadius = "6px";
        if (course.thumbnail)
            img.style.backgroundImage = `url(${course.thumbnail})`;
        img.style.backgroundSize = "cover";
        img.style.backgroundPosition = "center";

        const body = document.createElement("div");
        body.className = "flex-grow-1";

        const title = document.createElement("h5");
        title.className = "text-hu-primary mb-2";
        title.textContent = course.title;

        const meta = document.createElement("div");
        meta.className = "small text-black mb-2";

        // Status badge consistent with other pages
        const statusText = course ? course.status || "" : "";
        const status = (statusText || "").toLowerCase();
        const statusContainer = document.createElement("div");
        const statusStrong = document.createElement("strong");
        statusStrong.textContent = "Status:";
        const statusSpan = document.createElement("span");
        statusSpan.className =
            status === "ongoing"
                ? "badge-hu-info badge rounded-pill px-2"
                : status === "completed"
                ? "badge-hu-success badge rounded-pill px-2"
                : "badge-hu-warning badge rounded-pill px-2";
        statusSpan.textContent = statusText;
        statusContainer.appendChild(statusStrong);
        statusContainer.appendChild(document.createTextNode(" "));
        statusContainer.appendChild(statusSpan);
        statusContainer.appendChild(document.createTextNode(" \u00A0 "));

        const startContainer = document.createElement("div");
        const startStrong = document.createElement("strong");
        startStrong.textContent = "Start Date:";
        startContainer.appendChild(startStrong);
        startContainer.appendChild(
            document.createTextNode(" " + formatDate(course.start_date))
        );

        const sessionsContainer = document.createElement("div");
        const sessionsStrong = document.createElement("strong");
        sessionsStrong.textContent = "Sessions:";
        sessionsContainer.appendChild(sessionsStrong);
        sessionsContainer.appendChild(
            document.createTextNode(" " + (course.sessions || ""))
        );
        sessionsContainer.appendChild(document.createTextNode(" \u00A0 "));
        const instStrong = document.createElement("strong");
        instStrong.textContent = "Instructor:";
        sessionsContainer.appendChild(instStrong);
        sessionsContainer.appendChild(
            document.createTextNode(
                " " + (instructor ? instructor.name : "TBA")
            )
        );

        meta.appendChild(statusContainer);
        meta.appendChild(startContainer);
        meta.appendChild(sessionsContainer);

        const stats = document.createElement("div");
        stats.className = "small text-black";
        stats.innerHTML = `<div>Completed Sessions: <strong>${completedCount}</strong></div>
            <div>Next Session: <strong>${
                nextSession
                    ? formatDate(nextSession.date) +
                      " · " +
                      (nextSession.start_time || "")
                    : "TBA"
            }</strong></div>`;

        const right = document.createElement("div");
        right.className =
            "ms-3 align-self-center d-flex flex-column justify-content-start";
        const details = document.createElement("a");
        details.className = "btn btn-warning";
        details.href = `/course/view.html?id=${encodeURIComponent(course.id)}`;
        details.textContent = "View Details";
        right.appendChild(details);

        body.appendChild(title);
        body.appendChild(meta);
        body.appendChild(stats);

        card.appendChild(img);
        card.appendChild(body);
        card.appendChild(right);

        wrapper.appendChild(card);
        return wrapper;
    }

    async function loadData() {
        const localCourses = readLocal("courses");
        const localInstructors = readLocal("instructors");
        const localSessions = readLocal("sessions");

        const [courses, instructors, sessions] = await Promise.all([
            Promise.resolve(
                localCourses || fetch(coursesPath).then((r) => r.json())
            ),
            Promise.resolve(
                localInstructors || fetch(instructorsPath).then((r) => r.json())
            ),
            Promise.resolve(
                localSessions ||
                    fetch(sessionsPath)
                        .then((r) => r.json())
                        .catch(() => [])
            ),
        ]);

        return [courses || [], instructors || [], sessions || []];
    }

    // main
    (async function () {
        if (!enrolledContainer && !upcomingContainer) return;
        try {
            const [courses, instructors, sessions] = await loadData();
            const iMap = instructorMap(instructors || []);

            // get enrolled set via auth helper or fallback to localStorage keys
            let enrolledSet = new Set();
            try {
                if (
                    window.auth &&
                    typeof window.auth.getEnrolledSetForCurrentUser ===
                        "function"
                ) {
                    enrolledSet =
                        await window.auth.getEnrolledSetForCurrentUser();
                } else {
                    const raw =
                        localStorage.getItem("enrollments") ||
                        localStorage.getItem("enrollment");
                    if (raw) {
                        try {
                            const parsed = JSON.parse(raw);
                            const curr = window.auth
                                ? window.auth.getCurrentUserId()
                                : null;
                            if (Array.isArray(parsed) && curr) {
                                parsed.forEach((en) => {
                                    if (!en) return;
                                    const sid =
                                        en.student_id != null
                                            ? String(en.student_id)
                                            : null;
                                    const cid =
                                        en.course_id != null
                                            ? String(en.course_id)
                                            : null;
                                    if (
                                        sid &&
                                        cid &&
                                        String(sid) === String(curr)
                                    )
                                        enrolledSet.add(cid);
                                });
                            }
                        } catch (e) {
                            /* ignore */
                        }
                    }
                }
            } catch (e) {
                console.debug(
                    "mycourses.js: failed to compute enrolled set",
                    e
                );
            }

            // pick enrolled courses only
            const enrolledCourses = (courses || []).filter((c) =>
                enrolledSet.has(String(c.id))
            );

            // build sessions map by course
            const sessionsByCourse = {};
            (sessions || []).forEach((s) => {
                const cid = String(s.course_id);
                sessionsByCourse[cid] = sessionsByCourse[cid] || [];
                sessionsByCourse[cid].push(s);
            });

            // render enrolled courses
            if (enrolledContainer) {
                enrolledContainer.innerHTML = "";
                if (enrolledCourses.length === 0) {
                    enrolledContainer.innerHTML =
                        '<div class="text-muted">You are not enrolled in any courses.</div>';
                } else {
                    enrolledCourses.forEach((c) => {
                        const inst = iMap[c.instructor_id];
                        const courseSessions =
                            sessionsByCourse[String(c.id)] || [];
                        const completedCount = courseSessions.filter(
                            (s) =>
                                (s.status || "").toLowerCase() === "completed"
                        ).length;
                        const now = new Date();
                        const upcoming = courseSessions
                            .filter((s) => {
                                try {
                                    return (
                                        new Date(s.date) >=
                                        new Date(now.toDateString())
                                    );
                                } catch (e) {
                                    return false;
                                }
                            })
                            .sort(
                                (a, b) => new Date(a.date) - new Date(b.date)
                            );
                        const nextSession = upcoming.length
                            ? upcoming[0]
                            : null;
                        enrolledContainer.appendChild(
                            createEnrolledCard(
                                c,
                                inst,
                                completedCount,
                                nextSession
                            )
                        );
                    });
                }
            }

            // render upcoming sessions for enrolled courses
            if (upcomingContainer) {
                upcomingContainer.innerHTML = "";
                const now = new Date();
                const upcomingAll = (sessions || [])
                    .filter((s) => enrolledSet.has(String(s.course_id)))
                    .filter((s) => {
                        try {
                            return (
                                new Date(s.date) >= new Date(now.toDateString())
                            );
                        } catch (e) {
                            return false;
                        }
                    })
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                if (upcomingAll.length === 0) {
                    upcomingContainer.innerHTML =
                        '<div class="text-muted">No upcoming sessions.</div>';
                } else {
                    upcomingAll.slice(0, 6).forEach((s) => {
                        const course = (courses || []).find(
                            (c) => String(c.id) === String(s.course_id)
                        );
                        const card = document.createElement("div");
                        card.className = "mb-2 p-2 border rounded bg-white";
                        card.innerHTML = `<div class="fw-semibold text-hu-primary">${
                            course ? course.title : "Course"
                        }</div>
                            <div class="small text-black">${s.title || ""}</div>
                            <div class="small text-black">${formatDate(
                                s.date
                            )} · ${s.start_time || ""} · ${
                            s.location || ""
                        }</div>`;
                        upcomingContainer.appendChild(card);
                    });
                }
            }
        } catch (err) {
            console.error("Error loading my courses data:", err);
        }
    })();
})();
