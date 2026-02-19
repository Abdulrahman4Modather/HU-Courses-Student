// Renders courses on the home page into ongoing and upcoming sections.
(function () {
    const coursesPath = "/assets/data/courses.json";
    const instructorsPath = "/assets/data/instructors.json";

    const coursesContainer = document.getElementById("coursesContainer");
    const searchInput = document.getElementById("search-input");
    const fieldsFilter = document.getElementById("fields-filter");
    const statusFilter = document.getElementById("status-filter");
    const instructorsFilter = document.getElementById("instructors-filter");

    function formatDate(d) {
        try {
            const dt = new Date(d);
            return dt.toLocaleDateString();
        } catch (e) {
            return d;
        }
    }

    function instructorMap(list) {
        const m = {};
        (list || []).forEach((i) => (m[i.id] = i));
        return m;
    }

    function createCard(course, instructor, enrolled) {
        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-lg-4 course-col";

        const card = document.createElement("div");
        card.className = "card text-dark h-100 shadow-lg";
        card.style.background = "#fff";

        const imgWrapper = document.createElement("div");
        imgWrapper.className = "card-img-top-wrapper mb-3";
        const img = document.createElement("img");
        img.src = course.thumbnail || "/assets/images/courses/default.png";
        img.alt = course.title;
        img.className = "card-img-top";
        imgWrapper.appendChild(img);

        if (enrolled) {
            const badge = document.createElement("div");
            badge.className = "enrolled-badge";
            badge.textContent = "✓ مسجل";
            imgWrapper.appendChild(badge);
            card.classList.add("enrolled");
            card.dataset.enrolled = "true";
        }

        const body = document.createElement("div");
        body.className = "card-body text-dark d-flex flex-column";

        const title = document.createElement("h5");
        title.className = "card-title text-hu-primary";
        title.textContent = course.title;

        const meta = document.createElement("p");
        meta.className = "small mb-2";

        const statusText = course ? course.status || "" : "";
        const status = (statusText || "").toLowerCase();
        const statusStrong = document.createElement("strong");
        statusStrong.textContent = "الحالة:";
        const statusSpan = document.createElement("span");
        statusSpan.className =
            status === "ongoing"
                ? "badge-hu-info badge rounded-pill px-2"
                : status === "completed"
                  ? "badge-hu-success badge rounded-pill px-2"
                  : "badge-hu-warning badge rounded-pill px-2";
        statusSpan.textContent = statusText;

        meta.appendChild(statusStrong);
        meta.appendChild(document.createTextNode(" "));
        meta.appendChild(statusSpan);
        meta.appendChild(document.createTextNode(" \u00A0 \u00A0 "));

        const startStrong = document.createElement("strong");
        startStrong.textContent = "تاريخ البدء:";
        meta.appendChild(startStrong);
        meta.appendChild(
            document.createTextNode(" " + formatDate(course.start_date)),
        );
        meta.appendChild(document.createTextNode(" \u00A0 "));
        meta.appendChild(document.createElement("br"));

        const sessionsStrong = document.createElement("strong");
        sessionsStrong.textContent = "الجلسات:";
        meta.appendChild(sessionsStrong);
        meta.appendChild(
            document.createTextNode(" " + (course.sessions || "")),
        );
        meta.appendChild(document.createTextNode(" \u00A0 "));
        const instStrong = document.createElement("strong");
        instStrong.textContent = "المحاضر:";
        meta.appendChild(instStrong);
        meta.appendChild(
            document.createTextNode(
                " " + (instructor ? instructor.name : "TBA"),
            ),
        );

        const btnRow = document.createElement("div");
        btnRow.className =
            "btn-row d-flex justify-content-between align-items-center mt-3";

        const detailsBtn = document.createElement("a");
        detailsBtn.className = "btn btn-warning";
        detailsBtn.href = `/course/view.html?id=${encodeURIComponent(
            course.id,
        )}`;
        detailsBtn.textContent = "عرض التفاصيل";

        if (enrolled) {
            btnRow.appendChild(detailsBtn);
        } else {
            const enrollBtn = document.createElement("button");
            enrollBtn.className =
                (course.status || "").toLowerCase() === "upcoming"
                    ? "btn btn-secondary disabled"
                    : "btn btn-primary";
            enrollBtn.textContent = "سجل الآن";
            btnRow.appendChild(detailsBtn);
            btnRow.appendChild(enrollBtn);
        }

        body.appendChild(title);
        body.appendChild(meta);
        body.appendChild(btnRow);

        card.appendChild(imgWrapper);
        card.appendChild(body);
        col.appendChild(card);

        return col;
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

    async function loadData() {
        const localCourses = readLocal("courses");
        const localInstructors = readLocal("instructors");
        const courses =
            localCourses || (await fetch(coursesPath).then((r) => r.json()));
        const instructors =
            localInstructors ||
            (await fetch(instructorsPath).then((r) => r.json()));
        return [courses || [], instructors || []];
    }

    loadData()
        .then(async ([coursesData, instructors]) => {
            const iMap = instructorMap(instructors || []);
            const courses = (coursesData || []).slice();

            const fields = Array.from(
                new Set(courses.map((c) => c.field).filter(Boolean)),
            ).sort();
            const statuses = Array.from(
                new Set(
                    courses
                        .map((c) => (c.status || "").toLowerCase())
                        .filter(Boolean),
                ),
            ).sort();

            if (fieldsFilter) {
                fields.forEach((f) => {
                    const opt = document.createElement("option");
                    opt.value = f;
                    opt.textContent = f;
                    fieldsFilter.appendChild(opt);
                });
            }

            if (statusFilter) {
                statuses.forEach((s) => {
                    const opt = document.createElement("option");
                    opt.value = s;
                    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
                    statusFilter.appendChild(opt);
                });
            }

            if (instructorsFilter) {
                (instructors || []).forEach((inst) => {
                    const opt = document.createElement("option");
                    opt.value = inst.id;
                    opt.textContent = inst.name;
                    instructorsFilter.appendChild(opt);
                });
            }

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
                    // Fallback
                    const raw = localStorage.getItem("enrollments");
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        const curr = localStorage.getItem("currentUser");
                        if (Array.isArray(parsed) && curr) {
                            parsed.forEach((e) => {
                                if (String(e.student_id) === String(curr))
                                    enrolledSet.add(String(e.course_id));
                            });
                        }
                    }
                }
            } catch (e) {
                console.debug("courses.js: failed to obtain enrolled set", e);
            }

            function render(filterText = "") {
                const q = (filterText || "").trim().toLowerCase();
                const fld = fieldsFilter ? fieldsFilter.value : "";
                const st = statusFilter ? statusFilter.value.toLowerCase() : "";
                const instSel = instructorsFilter
                    ? instructorsFilter.value
                    : "";

                coursesContainer.innerHTML = "";

                courses
                    .filter((c) => {
                        if (q && !(c.title || "").toLowerCase().includes(q))
                            return false;
                        if (fld && c.field !== fld) return false;
                        if (st && (c.status || "").toLowerCase() !== st)
                            return false;
                        if (
                            instSel &&
                            String(c.instructor_id) !== String(instSel)
                        )
                            return false;
                        return true;
                    })
                    .forEach((c) =>
                        coursesContainer.appendChild(
                            createCard(
                                c,
                                iMap[c.instructor_id],
                                enrolledSet.has(String(c.id)),
                            ),
                        ),
                    );
            }

            render();

            if (searchInput) {
                let t;
                searchInput.addEventListener("input", (e) => {
                    clearTimeout(t);
                    t = setTimeout(() => render(e.target.value), 150);
                });
            }

            if (fieldsFilter)
                fieldsFilter.addEventListener("change", () =>
                    render(searchInput ? searchInput.value : ""),
                );
            if (statusFilter)
                statusFilter.addEventListener("change", () =>
                    render(searchInput ? searchInput.value : ""),
                );
            if (instructorsFilter)
                instructorsFilter.addEventListener("change", () =>
                    render(searchInput ? searchInput.value : ""),
                );

            document.addEventListener("click", async function (ev) {
                const btn = ev.target.closest && ev.target.closest("button");
                if (!btn) return;
                if (!btn.classList.contains("btn-primary")) return;
                if (
                    !btn.textContent ||
                    (btn.textContent.trim().toLowerCase() !== "enroll now" &&
                        btn.textContent.trim() !== "سجل الآن")
                )
                    return;

                const cardCol = btn.closest(".course-col");
                if (!cardCol) return;
                const detailsLink = cardCol.querySelector("a.btn-warning");
                if (!detailsLink) return;
                const href = detailsLink.getAttribute("href") || "";
                const match = href.match(/id=(.+)$/);
                if (!match) return;
                const courseId = decodeURIComponent(match[1]);

                let curr = null;
                try {
                    curr = window.auth ? window.auth.getCurrentUserId() : null;
                } catch (e) {
                    const st = localStorage.getItem("currentUser");
                    try {
                        curr = st ? JSON.parse(st).id : null;
                    } catch (err) {
                        curr = st;
                    }
                }
                if (!curr) {
                    window.location.href = "/login.html";
                    return;
                }

                // Call shared persistence
                const newEnroll = await window.auth.persistEnrollment(
                    curr,
                    courseId,
                );
                if (!newEnroll) return;

                const imgWrapper = cardCol.querySelector(
                    ".card-img-top-wrapper",
                );
                if (
                    imgWrapper &&
                    !imgWrapper.querySelector(".enrolled-badge")
                ) {
                    const badge = document.createElement("div");
                    badge.className = "enrolled-badge";
                    badge.textContent = "✓ مسجل";
                    imgWrapper.appendChild(badge);
                }
                const card = cardCol.querySelector(".card");
                if (card) {
                    card.classList.add("enrolled");
                    card.dataset.enrolled = "true";
                }
                btn.textContent = "مسجل";
                btn.classList.remove("btn-primary");
                btn.classList.add("btn-secondary");
                btn.disabled = true;
            });
        })
        .catch((err) => console.error("Error loading courses data:", err));
})();
