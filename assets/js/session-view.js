// Session view page script — clean, single implementation
// Usage: /course/session-view.html?id=<sessionId>

(function () {
    const PATHS = {
        courses: "/assets/data/courses.json",
        sessions: "/assets/data/sessions.json",
        materials: "/assets/data/materials.json",
        enrollments: "/assets/data/enrollment.json",
    };

    const el = {
        buttonsContainer: document.getElementById("buttonsContainer"),
        headerContainer: document.getElementById("headerContainer"),
        sessionHeader: document.getElementById("sessionHeader"),
        video: document.getElementById("videoContainer"),
        materials: document.getElementById("materialsContainer"),
        sidebar: document.getElementById("sessionsSidebar"),
    };

    function qParam() {
        const p = new URLSearchParams(window.location.search);
        return p.get("id");
    }

    function fmtDate(d) {
        try {
            return new Date(d).toLocaleDateString();
        } catch (e) {
            return d || "";
        }
    }

    function getCurrentUserId() {
        if (window.auth && typeof window.auth.getCurrentUserId === "function")
            return window.auth.getCurrentUserId();
        const raw =
            localStorage.getItem("currentUser") ||
            localStorage.getItem("student");
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return String(
                parsed.id || parsed.nationalId || parsed.student_id || parsed,
            );
        } catch (e) {
            return String(raw);
        }
    }

    function materialNode(m) {
        const itm = document.createElement("div");
        itm.className =
            "list-group-item d-flex justify-content-between align-items-center";
        const left = document.createElement("div");
        left.innerHTML = `<div class="fw-semibold">${m.title}</div>`;
        const right = document.createElement("div");
        const a = document.createElement("a");
        a.className = "btn btn-sm btn-primary";
        a.textContent = "تحميل";
        a.href = m.file || "#";
        right.appendChild(a);
        itm.appendChild(left);
        itm.appendChild(right);
        return itm;
    }

    function waitForHeader(maxTries = 10, interval = 80) {
        return new Promise((resolve) => {
            let tries = 0;
            const t = setInterval(() => {
                tries += 1;
                const h = el.headerContainer && el.headerContainer.offsetHeight;
                if (h || tries >= maxTries) {
                    clearInterval(t);
                    resolve();
                }
            }, interval);
        });
    }

    async function loadJson(path) {
        try {
            const r = await fetch(path);
            return await r.json();
        } catch (e) {
            return [];
        }
    }

    async function load() {
        const sessionId = qParam();
        if (!sessionId) {
            if (el.video)
                el.video.innerHTML =
                    '<div class="alert alert-danger">لم يتم تحديد الجلسة.</div>';
            return;
        }

        await waitForHeader();

        const [courses, sessions, materials, enrollments] = await Promise.all([
            loadJson(PATHS.courses),
            loadJson(PATHS.sessions),
            loadJson(PATHS.materials),
            loadJson(PATHS.enrollments),
        ]);

        const session = (sessions || []).find(
            (s) => String(s.id) === String(sessionId),
        );
        if (!session) {
            if (el.video)
                el.video.innerHTML =
                    '<div class="alert alert-warning">الجلسة غير موجودة.</div>';
            return;
        }

        const course = (courses || []).find(
            (c) => String(c.id) === String(session.course_id),
        );
        if (!course) {
            if (el.video)
                el.video.innerHTML =
                    '<div class="alert alert-warning">الدورة الخاصة بهذه الجلسة غير موجودة.</div>';
            return;
        }

        const courseSessions = (sessions || [])
            .filter((s) => String(s.course_id) === String(course.id))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // enrollments / user
        const curr = getCurrentUserId();
        let allEnrollments = (enrollments || []).slice();
        if (
            window.auth &&
            typeof window.auth.loadEnrollmentsMerged === "function"
        ) {
            try {
                allEnrollments = await window.auth.loadEnrollmentsMerged();
            } catch (e) {
                /* ignore */
            }
        } else {
            try {
                const ls = localStorage.getItem("enrollments");
                if (ls) {
                    const parsed = JSON.parse(ls);
                    if (Array.isArray(parsed))
                        allEnrollments = allEnrollments.concat(parsed);
                }
            } catch (e) {}
        }

        const enrolledSet = new Set();
        (allEnrollments || []).forEach((en) => {
            if (!en || en.student_id == null || en.course_id == null) return;
            if (String(en.student_id) === String(curr))
                enrolledSet.add(String(en.course_id));
        });
        const isEnrolled = curr && enrolledSet.has(String(course.id));

        if (el.buttonsContainer) {
            el.buttonsContainer.innerHTML = "";
            el.buttonsContainer.className =
                "mb-3 d-flex justify-content-between align-items-center";
            const backLink = document.createElement("a");
            backLink.className = "btn btn-outline-secondary";
            backLink.href = `/course/view.html?id=${encodeURIComponent(String(course.id))}`;
            backLink.textContent = "العودة للدورة ←";

            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "btn btn-primary sidebar-toggle-btn";
            toggle.textContent = "الجلسات";
            toggle.addEventListener("click", () => {
                const isOpen = el.sidebar.classList.contains("open");
                if (isOpen) closeSidebar();
                else openSidebar();
            });

            el.buttonsContainer.appendChild(toggle);
            el.buttonsContainer.appendChild(backLink);
        }

        if (window.innerWidth > 768) {
            document.addEventListener("click", function (e) {
                if (!el.sidebar) return;

                const isInside = el.sidebar.contains(e.target);
                const isToggle = e.target.closest(".sidebar-toggle-btn");

                if (!isInside && !isToggle) closeSidebar();
            });
        }

        // session header
        if (el.sessionHeader) {
            el.sessionHeader.innerHTML = "";
            const hWrap = document.createElement("div");
            hWrap.className = "p-3 rounded shadow-sm bg-white";

            const courseTitle = document.createElement("h6");
            courseTitle.textContent = course.title || "";

            const sessionTitle = document.createElement("h3");
            sessionTitle.className = "text-hu-primary mt-2";
            sessionTitle.textContent = session.title || "";

            const meta = document.createElement("div");
            meta.className = "small";
            meta.textContent = `${fmtDate(session.date)} · ${session.start_time || ""} · ${session.location || ""}`;

            hWrap.appendChild(courseTitle);
            hWrap.appendChild(sessionTitle);
            hWrap.appendChild(meta);

            el.sessionHeader.appendChild(hWrap);
        }

        // video
        if (el.video) {
            el.video.innerHTML = "";
            const container = document.createElement("div");
            container.className = "p-3 rounded shadow-sm bg-white text-center";
            const nextBtn = document.createElement("button");
            const nextSession = getNextSession(courseSessions, session.id);

            if (nextSession) {
                nextBtn.className = "btn btn-secondary mt-2";
                nextBtn.textContent = "التالي ▶";
                nextBtn.disabled = true;

                nextBtn.onclick = () => {
                    window.location.href = `/course/session-view.html?id=${encodeURIComponent(nextSession.id)}`;
                };
            }

            if (session.video && session.video !== "#") {
                if (String(session.video).startsWith("http")) {
                    container.innerHTML = `
            <div class="ratio ratio-16x9">
                <iframe src="${session.video}" allowfullscreen></iframe>
            </div>`;

                    if (nextSession) {
                        nextBtn.disabled = false;
                        nextBtn.classList.remove("btn-secondary");
                        nextBtn.classList.add("btn-success");
                        container.appendChild(nextBtn);
                    }
                } else {
                    const vid = document.createElement("video");
                    vid.controls = true;
                    vid.style.width = "100%";

                    const src = document.createElement("source");
                    src.src = session.video;
                    src.type = "video/mp4";

                    vid.appendChild(src);

                    vid.addEventListener("ended", () => {
                        // prevent duplicates
                        if (container.querySelector(".alert-success")) return;

                        if (nextSession) {
                            nextBtn.disabled = false;
                            nextBtn.classList.remove("btn-secondary");
                            nextBtn.classList.add("btn-success");
                        } else {
                            if (!isEnrolled) return;

                            const doneBox = document.createElement("div");
                            doneBox.className =
                                "alert alert-success mt-3 text-center";
                            doneBox.innerHTML = `
                    <h5>🎉 تهانينا! لقد أنهيت الدورة</h5>
                    <button class="btn btn-success mt-2">عرض الشهادة</button>
                `;

                            container.appendChild(doneBox);

                            const btn = doneBox.querySelector("button");
                            btn.addEventListener(
                                "click",
                                redirectToCertificate,
                            );
                        }
                    });

                    container.appendChild(vid);
                    if (nextSession) container.appendChild(nextBtn);
                }
            } else {
                container.innerHTML =
                    '<div class="alert alert-info">لم يتم رفع فيديو لهذه الجلسة بعد.</div>';
            }
            el.video.appendChild(container);
        }

        function redirectToCertificate() {
            try {
                const curr = getCurrentUserId();

                if (!curr) {
                    window.location.href = "/login.html";
                    return;
                }

                function go(allEnrollments) {
                    const enrollment = (allEnrollments || []).find(
                        (e) =>
                            String(e.student_id) === String(curr) &&
                            String(e.course_id) === String(course.id),
                    );

                    if (enrollment && enrollment.id != null) {
                        window.location.href = `/course/certificate.html?enrollment=${encodeURIComponent(enrollment.id)}`;
                    } else {
                        alert("لم يتم العثور على بيانات التسجيل.");
                    }
                }

                if (
                    window.auth &&
                    typeof window.auth.loadEnrollmentsMerged === "function"
                ) {
                    window.auth.loadEnrollmentsMerged().then(go);
                } else {
                    let enrollments = [];
                    try {
                        const raw = localStorage.getItem("enrollments");
                        if (raw) enrollments = JSON.parse(raw);
                    } catch (e) {}
                    go(enrollments);
                }
            } catch (e) {
                console.error("certificate redirect failed", e);
            }
        }

        // materials
        if (el.materials) {
            el.materials.innerHTML = "";
            const sessionMaterials = (materials || []).filter(
                (m) => String(m.session_id) === String(session.id),
            );
            if (!sessionMaterials.length)
                el.materials.innerHTML =
                    '<div class="p-3 rounded shadow-sm bg-white">لا توجد مواد لهذه الجلسة.</div>';
            else if (!curr)
                el.materials.innerHTML =
                    '<div class="p-3 rounded shadow-sm bg-white">الرجاء تسجيل الدخول والتسجيل للوصول للمواد.</div>';
            else if (!isEnrolled)
                el.materials.innerHTML =
                    '<div class="p-3 rounded shadow-sm bg-white">يجب أن تكون مسجلاً في هذه الدورة لعرض المواد.</div>';
            else {
                const list = document.createElement("div");
                list.className = "list-group p-3 bg-white rounded shadow-sm";
                sessionMaterials.forEach((m) =>
                    list.appendChild(materialNode(m)),
                );
                el.materials.appendChild(list);
            }
        }

        // sidebar
        if (el.sidebar) buildSidebar(courseSessions, session.id);

        // small enroll CTA
        if (!isEnrolled && curr && el.sessionHeader) {
            const cta = document.createElement("div");
            cta.className = "mt-2";
            const btn = document.createElement("button");
            btn.className = "btn btn-primary";
            btn.textContent = "سجل الآن";
            btn.addEventListener("click", async () => {
                let newEnroll = null;
                if (
                    window.auth &&
                    typeof window.auth.persistEnrollment === "function"
                ) {
                    try {
                        newEnroll = await window.auth.persistEnrollment(
                            curr,
                            course.id,
                        );
                    } catch (e) {
                        newEnroll = null;
                    }
                }
                if (!newEnroll) {
                    const nextId =
                        (allEnrollments || []).reduce(
                            (max, it) => Math.max(max, Number(it.id || 0)),
                            0,
                        ) + 1;
                    newEnroll = {
                        id: nextId,
                        student_id: isFinite(Number(curr))
                            ? Number(curr)
                            : curr,
                        course_id: isFinite(Number(course.id))
                            ? Number(course.id)
                            : course.id,
                        enrollment_date: new Date().toISOString().slice(0, 10),
                    };
                    try {
                        localStorage.setItem(
                            "enrollments",
                            JSON.stringify(
                                (allEnrollments || []).concat([newEnroll]),
                            ),
                        );
                        window.dispatchEvent(new Event("enrollmentsUpdated"));
                    } catch (e) {}
                }
                btn.textContent = "مسجل";
                btn.disabled = true;
                // re-render materials
                if (el.materials) {
                    const sessionMaterials = (materials || []).filter(
                        (m) => String(m.session_id) === String(session.id),
                    );
                    el.materials.innerHTML = "";
                    if (!sessionMaterials.length)
                        el.materials.innerHTML =
                            '<div class="p-3 rounded shadow-sm bg-white">لا توجد مواد لهذه الجلسة.</div>';
                    else {
                        const list = document.createElement("div");
                        list.className =
                            "list-group p-3 bg-white rounded shadow-sm";
                        sessionMaterials.forEach((m) =>
                            list.appendChild(materialNode(m)),
                        );
                        el.materials.appendChild(list);
                    }
                }
            });
            cta.appendChild(btn);
            el.sessionHeader.appendChild(cta);
        }
    }

    function buildSidebar(courseSessions, currentSessionId) {
        if (!el.sidebar) return;
        el.sidebar.innerHTML = "";
        try {
            const h = el.headerContainer ? el.headerContainer.offsetHeight : 0;
            el.sidebar.style.top = h + "px";
            el.sidebar.style.height = `calc(100vh - ${h}px)`;
        } catch (e) {}

        const header = document.createElement("div");
        header.className = "sidebar-header";
        const title = document.createElement("div");
        title.innerHTML = "<strong>الجلسات</strong>";
        const closeBtn = document.createElement("button");
        closeBtn.className = "close-btn";
        closeBtn.type = "button";
        closeBtn.innerHTML = "&times;";
        closeBtn.addEventListener("click", () => {
            closeSidebar();
            localStorage.setItem("sessionsSidebarCollapsed", "1");
        });
        header.appendChild(title);
        header.appendChild(closeBtn);
        el.sidebar.appendChild(header);

        const list = document.createElement("div");
        list.className = "list-group";
        courseSessions.forEach((s) => {
            const a = document.createElement("a");
            a.className = "list-group-item";
            a.textContent = s.title || "بدون عنوان";
            a.href = `/course/session-view.html?id=${encodeURIComponent(String(s.id))}`;
            if (String(s.id) === String(currentSessionId))
                a.classList.add("active");
            list.appendChild(a);
        });
        el.sidebar.appendChild(list);

        const collapsed =
            localStorage.getItem("sessionsSidebarCollapsed") === "1";
        if (collapsed) {
            el.sidebar.classList.remove("open");
            el.sidebar.setAttribute("aria-hidden", "true");
        } else {
            el.sidebar.classList.add("open");
            el.sidebar.setAttribute("aria-hidden", "false");
        }
        el.sidebar.style.overflowY = "auto";
    }

    function openSidebar() {
        if (!el.sidebar) return;
        el.sidebar.classList.add("open");
        el.sidebar.setAttribute("aria-hidden", "false");
        localStorage.setItem("sessionsSidebarCollapsed", "0");
    }
    function closeSidebar() {
        if (!el.sidebar) return;
        el.sidebar.classList.remove("open");
        el.sidebar.setAttribute("aria-hidden", "true");
        localStorage.setItem("sessionsSidebarCollapsed", "1");
    }

    function getNextSession(courseSessions, currentSessionId) {
        const index = courseSessions.findIndex(
            (s) => String(s.id) === String(currentSessionId),
        );

        if (index === -1) return null;
        if (index + 1 >= courseSessions.length) return null;

        return courseSessions[index + 1];
    }

    load().catch((e) => {
        console.error("session-view load failed", e);
        if (el.video)
            el.video.innerHTML =
                '<div class="alert alert-danger">فشل تحميل بيانات الجلسة.</div>';
    });
})();
