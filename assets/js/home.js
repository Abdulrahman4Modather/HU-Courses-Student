// Renders courses on the home page into ongoing and upcoming sections.
// - Fetches assets/data/courses.json and assets/data/instructors.json
// - Renders bootstrap-styled course cards
// - Provides a simple search that filters by course title

(function () {
    const coursesPath = "/assets/data/courses.json";
    const instructorsPath = "/assets/data/instructors.json";
    // enrollmentPath no longer used here; auth helper will provide merged enrollments

    const ongoingContainer = document.getElementById("ongoingCourses");
    const upcomingContainer = document.getElementById("upcomingCourses");
    const searchInput = document.getElementById("searchInput");

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

    function createCard(course, instructor, isUpcoming, enrolled) {
        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-lg-4 course-col";

        const card = document.createElement("div");
        card.className = "card text-dark h-100";
        card.style.background = "#fff";

        // image wrapper (for overlay badge)
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
            // mark card visually and with a data attribute for easier debugging
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

        // Status badge (colored similar to account page)
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
            document.createTextNode(" " + formatDate(course.start_date))
        );
        meta.appendChild(document.createTextNode(" \u00A0 "));
        meta.appendChild(document.createElement("br"));

        const sessionsStrong = document.createElement("strong");
        sessionsStrong.textContent = "الجلسات:";
        meta.appendChild(sessionsStrong);
        meta.appendChild(
            document.createTextNode(" " + (course.sessions || ""))
        );
        meta.appendChild(document.createTextNode(" \u00A0 "));
        const instStrong = document.createElement("strong");
        instStrong.textContent = "المحاضر:";
        meta.appendChild(instStrong);
        meta.appendChild(
            document.createTextNode(
                " " + (instructor ? instructor.name : "TBA")
            )
        );

        const btnRow = document.createElement("div");
        btnRow.className =
            "btn-row d-flex justify-content-between align-items-center mt-3";

        const detailsBtn = document.createElement("a");
        detailsBtn.className = "btn btn-warning";
        detailsBtn.href = `/course/view.html?id=${encodeURIComponent(
            course.id
        )}`;
        detailsBtn.textContent = "عرض التفاصيل";

        // if enrolled, only show details. otherwise show enroll (unless upcoming)
        if (enrolled) {
            btnRow.appendChild(detailsBtn);
        } else {
            const enrollBtn = document.createElement("button");
            enrollBtn.className = isUpcoming
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

    // helper: prefer localStorage copies if present (login may preload them)
    function readLocal(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed;
        } catch (e) {
            return null;
        }
    }

    async function loadData() {
        // try localStorage first
        const localCourses = readLocal("courses");
        const localInstructors = readLocal("instructors");

        const courses =
            localCourses || (await fetch(coursesPath).then((r) => r.json()));
        const instructors =
            localInstructors ||
            (await fetch(instructorsPath).then((r) => r.json()));

        return [courses || [], instructors || []];
    }

    // fetch data and render
    loadData()
        .then(async ([courses, instructors]) => {
            const iMap = instructorMap(instructors);

            // get enrolled set for current user via shared auth helper (handles local overrides)
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
                    // fallback: read enrollments from localStorage (support legacy key)
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
                    "home.js: failed to get enrolledSet from auth helper",
                    e
                );
            }

            // helper to persist a new enrollment locally (merge with possible legacy key)
            function persistEnrollment(studentId, courseId) {
                try {
                    // load both keys and merge
                    const raw1 = localStorage.getItem("enrollments");
                    const raw2 = localStorage.getItem("enrollment");
                    let arr = [];
                    if (raw1) {
                        const p1 = JSON.parse(raw1);
                        if (Array.isArray(p1)) arr = arr.concat(p1);
                    }
                    if (raw2) {
                        try {
                            const p2 = JSON.parse(raw2);
                            if (Array.isArray(p2)) arr = arr.concat(p2);
                        } catch (e) {
                            // ignore
                        }
                    }

                    const nextId =
                        (arr || []).reduce(
                            (max, it) => Math.max(max, Number(it.id || 0)),
                            0
                        ) + 1;
                    const newEnroll = {
                        id: nextId,
                        student_id: isFinite(Number(studentId))
                            ? Number(studentId)
                            : studentId,
                        course_id: isFinite(Number(courseId))
                            ? Number(courseId)
                            : courseId,
                        enrollment_date: new Date().toISOString().slice(0, 10),
                    };
                    arr.push(newEnroll);
                    // persist to preferred key 'enrollments'
                    localStorage.setItem("enrollments", JSON.stringify(arr));
                    // Notify other scripts in this tab that enrollments changed
                    try {
                        window.dispatchEvent(new Event("enrollmentsUpdated"));
                    } catch (e) {
                        /* ignore */
                    }
                    return newEnroll;
                } catch (err) {
                    console.warn("home.js: failed to persist enrollment", err);
                    return null;
                }
            }

            let ongoing = (courses || []).filter(
                (c) => (c.status || "").toLowerCase() === "ongoing"
            );
            let upcoming = (courses || []).filter(
                (c) => (c.status || "").toLowerCase() === "upcoming"
            );

            function renderLists(filterText = "") {
                const q = (filterText || "").trim().toLowerCase();
                ongoingContainer.innerHTML = "";
                upcomingContainer.innerHTML = "";

                ongoing
                    .filter((c) => c.title.toLowerCase().includes(q))
                    .slice(0, 3)
                    .forEach((c) =>
                        ongoingContainer.appendChild(
                            createCard(
                                c,
                                iMap[c.instructor_id],
                                false,
                                enrolledSet.has(String(c.id))
                            )
                        )
                    );

                upcoming
                    .filter((c) => c.title.toLowerCase().includes(q))
                    .slice(0, 3)
                    .forEach((c) =>
                        upcomingContainer.appendChild(
                            createCard(
                                c,
                                iMap[c.instructor_id],
                                true,
                                enrolledSet.has(String(c.id))
                            )
                        )
                    );
            }

            // initial render
            renderLists();

            // debug: log detected current user and enrollments
            try {
                const detected = window.auth
                    ? window.auth.getCurrentUserId()
                    : null;
                console.debug("home.js: detected currentUser =", detected);
                console.debug(
                    "home.js: enrolled course ids =",
                    Array.from(enrolledSet)
                );
            } catch (e) {
                /* ignore */
            }

            const searchModule = document.getElementById("searchResultsModule");

            function renderSearchModule(q) {
                if (!searchModule) return;
                const text = (q || "").trim().toLowerCase();
                if (!text) {
                    searchModule.style.display = "none";
                    searchModule.innerHTML = "";
                    return;
                }

                const all = (courses || []).slice();
                const matches = all
                    .filter((c) => (c.title || "").toLowerCase().includes(text))
                    .slice(0, 5);

                let html = "";
                if (matches.length === 0) {
                    html = '<div class="empty">لا توجد دورات مطابقة</div>';
                } else {
                    html = '<div class="results-list">';
                    matches.forEach((c) => {
                        const inst = iMap[c.instructor_id];
                        const title = (c.title || "").replace(/</g, "&lt;");
                        const thumb =
                            c.thumbnail || "/assets/images/courses/default.png";
                        const status = c.status || "";
                        const start = formatDate(c.start_date);
                        // use relative URL to respect hosting path; clicking the link will navigate to the course view
                        html += `
                            <a class="result-item" href="/course/view.html?id=${encodeURIComponent(
                                c.id
                            )}">
                                <img src="${thumb}" alt="${title}" />
                                <div class="meta">
                                    <div class="title">${title}</div>
                                    <div class="small text-muted">${status} · ${start} · ${
                            inst ? inst.name : "TBA"
                        }</div>
                                </div>
                            </a>
                        `;
                    });
                    html += "</div>";
                }

                searchModule.innerHTML = html;
                searchModule.style.display = "block";
            }

            // search wiring: show suggestion module while typing (but keep page sections visible)
            if (searchInput) {
                let t;
                searchInput.addEventListener("input", (e) => {
                    clearTimeout(t);
                    const val = e.target.value || "";
                    t = setTimeout(() => {
                        if (!val.trim()) {
                            // clear module but keep sections rendered
                            if (searchModule) {
                                searchModule.style.display = "none";
                                searchModule.innerHTML = "";
                            }
                            renderLists("");
                        } else {
                            renderSearchModule(val);
                        }
                    }, 150);
                });

                // close module when clicking outside (but don't hide the page sections)
                document.addEventListener("click", (ev) => {
                    const target = ev.target;
                    if (!searchModule) return;
                    if (target === searchInput || searchModule.contains(target))
                        return;
                    searchModule.style.display = "none";
                    searchModule.innerHTML = "";
                });
            }

            // Event delegation for 'Enroll Now' buttons on the home cards
            document.addEventListener("click", function (ev) {
                const btn = ev.target.closest && ev.target.closest("button");
                if (!btn) return;
                // must be an active enroll button (primary) with text 'Enroll Now'
                if (!btn.classList.contains("btn-primary")) return;
                if (
                    !btn.textContent ||
                    btn.textContent.trim().toLowerCase() !== "enroll now"
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

                // current user id
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

                const newEnroll = persistEnrollment(curr, courseId);
                if (!newEnroll) return;

                // update UI for this card
                const imgWrapper = cardCol.querySelector(
                    ".card-img-top-wrapper"
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
