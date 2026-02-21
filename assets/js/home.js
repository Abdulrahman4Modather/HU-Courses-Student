// Renders courses on the home page into ongoing and upcoming sections.
// - Fetches assets/data/courses.json and assets/data/instructors.json
// - Renders bootstrap-styled course cards
// - Provides a simple search that filters by course title

(function () {
    const coursesPath = "/assets/data/courses.json";
    const instructorsPath = "/assets/data/instructors.json";

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
        card.className = "card text-dark h-100 shadow-lg";
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

        // Status badge
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

        meta.appendChild(document.createTextNode(" \u00A0 "));
        const priceStrong = document.createElement("strong");
        priceStrong.textContent = "السعر:";
        meta.appendChild(priceStrong);
        meta.appendChild(
            document.createTextNode(
                " " + (course ? course.price + "جم" : "TBA"),
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
        .then(async ([courses, instructors]) => {
            const iMap = instructorMap(instructors);

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
                    // fallback to reading localStorage directly if auth not ready (rare)
                    const raw = localStorage.getItem("enrollments");
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        const curr = localStorage.getItem("currentUser"); // simple check
                        parsed.forEach((e) => {
                            if (String(e.student_id) === String(curr))
                                enrolledSet.add(String(e.course_id));
                        });
                    }
                }
            } catch (e) {
                console.debug("home.js: failed to get enrolledSet", e);
            }

            let ongoing = (courses || []).filter(
                (c) => (c.status || "").toLowerCase() === "ongoing",
            );
            let upcoming = (courses || []).filter(
                (c) => (c.status || "").toLowerCase() === "upcoming",
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
                                enrolledSet.has(String(c.id)),
                            ),
                        ),
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
                                enrolledSet.has(String(c.id)),
                            ),
                        ),
                    );
            }

            renderLists();

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
                    html =
                        '<div class="empty text-black">لا توجد دورات مطابقة</div>';
                } else {
                    html = '<div class="results-list">';
                    matches.forEach((c) => {
                        const inst = iMap[c.instructor_id];
                        const title = (c.title || "").replace(/</g, "&lt;");
                        const thumb =
                            c.thumbnail || "/assets/images/courses/default.png";
                        const status = c.status || "";
                        const start = formatDate(c.start_date);
                        html += `
                            <a class="result-item" href="/course/view.html?id=${encodeURIComponent(
                                c.id,
                            )}">
                                <img src="${thumb}" alt="${title}" />
                                <div class="meta">
                                    <div class="title">${title}</div>
                                    <div class="small text-black">${status} · ${start} · ${
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

            if (searchInput) {
                let t;
                searchInput.addEventListener("input", (e) => {
                    clearTimeout(t);
                    const val = e.target.value || "";
                    t = setTimeout(() => {
                        if (!val.trim()) {
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

                document.addEventListener("click", (ev) => {
                    const target = ev.target;
                    if (!searchModule) return;
                    if (target === searchInput || searchModule.contains(target))
                        return;
                    searchModule.style.display = "none";
                    searchModule.innerHTML = "";
                });
            }

            // Event delegation for 'Enroll Now' buttons
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
                } catch (e) {}

                if (!curr) {
                    window.location.href = "/login.html";
                    return;
                }

                // Use shared persistence logic
                const result = await window.auth.persistEnrollment(
                    curr,
                    courseId,
                );
                if (!result) return;

                // Update UI
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
