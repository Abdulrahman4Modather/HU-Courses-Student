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
        return params.get("id") || params.get("course");
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
                            parsed.id || parsed.nationalId || parsed.student_id,
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
        isEnrolled,
    ) {
        const statusLower = ((course && course.status) || "").toLowerCase();
        const isCompleted = statusLower === "completed";

        // Enroll button text and state
        let enrollLabel = "سجل الآن";
        let enrollClass = "btn btn-primary";
        let disabledAttr = "";
        if (isEnrolled) {
            enrollLabel = "مسجل";
            enrollClass = "btn btn-secondary disabled";
            disabledAttr = "disabled";
        } else if (isCompleted) {
            // course already completed and user is not enrolled -> disable enroll
            enrollLabel = "مغلقة";
            enrollClass = "btn btn-secondary disabled";
            disabledAttr = "disabled";
        }

        // print certificate button is shown only when course is completed and user is enrolled
        const showPrint = isCompleted && isEnrolled;

        const html = `
                <div class="p-3 rounded shadow-sm bg-white">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h2 class="text-hu-primary">${course.title}</h2>
                        </div>
                        <div id="courseActions">
                            <button id="enrollBtn" class="${enrollClass}" ${disabledAttr}>${enrollLabel}</button>
                            ${showPrint ? '<button id="printCertBtn" type="button" class="btn btn-success ms-2">طباعة الشهادة</button>' : ""}
                        </div>
                    </div>
                    <div class="mt-3 row">
                        <div class="col-md-2"><strong>المجال:</strong>${course.field || ""}</div>
                        <div class="col-md-2"><strong>الحالة:</strong>${course.status || ""}</div>
                        <div class="col-md-2"><strong>تاريخ البدء:</strong>${formatDate(course.start_date) || ""}</div>
                        <div class="col-md-2"><strong>الجلسات:</strong>${course.sessions || ""}</div>
                        <div class="col-md-2"><strong>الجلسات المكتملة:</strong>${completedSessionsCount}</div>
                        <div class="col-md-2"><strong>السعر:</strong>${course.price + "جم" || "TBA"}</div>
                    </div>
                    <div class="mt-2"><strong>المحاضر:</strong> ${instructor ? instructor.name : "TBA"}</div>
                </div>
            `;
        courseHeader.innerHTML = html;
    }

    function renderDescription(course) {
        const text =
            course.description ||
            "Put some text on the course\nWhat's about\nWhat's the outcome of the course\nWhat to do next";
        const html = `<div class="p-3 rounded shadow-sm bg-white"><h5>وصف الدورة</h5><div>${text.replace(
            /\n/g,
            "<br/>",
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
                <div class="small">${formatDate(s.date)} · ${
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
        }</div><div class="small">${m.type || ""}</div>`;
        const right = document.createElement("div");
        const btn = document.createElement("a");
        btn.className = "btn btn-sm btn-primary";
        btn.textContent = "تحميل";
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
        const courseId = qParam();
        if (!courseId) {
            courseHeader.innerHTML =
                '<div class="alert alert-danger">لم يتم تحديد دورة.</div>';
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
                (c) => String(c.id) === String(courseId),
            );
            if (!course) {
                courseHeader.innerHTML =
                    '<div class="alert alert-warning">الدورة غير موجودة.</div>';
                return;
            }

            const instructor = (instructors || []).find(
                (i) => String(i.id) === String(course.instructor_id),
            );

            const courseSessions = (sessions || []).filter(
                (s) => String(s.course_id) === String(course.id),
            );
            const completedCount = courseSessions.filter(
                (s) => (s.status || "").toLowerCase() === "completed",
            ).length;

            // determine if current user is enrolled
            // Prefer centralized helper to ensure consistent id normalization
            const curr =
                window.auth &&
                typeof window.auth.getCurrentUserId === "function"
                    ? window.auth.getCurrentUserId()
                    : getCurrentUserId();

            // Prefer using the shared auth helper to load merged enrollments
            // (it merges server + local and normalizes ids). Fall back to
            // local merge logic if helper isn't available.
            let allEnrollments = (enrollments || []).slice();
            if (
                window.auth &&
                typeof window.auth.loadEnrollmentsMerged === "function"
            ) {
                try {
                    const merged = await window.auth.loadEnrollmentsMerged();
                    if (Array.isArray(merged)) allEnrollments = merged;
                } catch (e) {
                    // fallback to previously-fetched enrollments
                    console.warn(
                        "auth.loadEnrollmentsMerged failed, falling back",
                        e,
                    );
                }
            } else {
                // legacy merge: include localStorage.enrollments entries
                const ls = localStorage.getItem("enrollments");
                if (ls) {
                    try {
                        const parsed = JSON.parse(ls);
                        if (Array.isArray(parsed)) {
                            const map = new Map();
                            (allEnrollments || []).forEach((e) =>
                                map.set(String(e.id), e),
                            );
                            parsed.forEach((e) => map.set(String(e.id), e));
                            allEnrollments = Array.from(map.values());
                        }
                    } catch (e) {
                        /* ignore parse errors */
                    }
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

            // Wire the print certificate button if it was rendered (initial page load)
            const printBtnInit = document.getElementById("printCertBtn");
            if (printBtnInit) {
                try {
                    const existing = (allEnrollments || []).find(
                        (e) =>
                            String(e.student_id) === String(curr) &&
                            String(e.course_id) === String(course.id),
                    );
                    if (existing && existing.id != null) {
                        printBtnInit.onclick = () => {
                            const url = `/course/certificate.html?enrollment=${encodeURIComponent(String(existing.id))}`;
                            // open in a new tab so we don't navigate away from the course view
                            try {
                                window.open(url, "_blank");
                            } catch (e) {
                                // fallback to same-tab navigation
                                window.location.href = url;
                            }
                        };
                    } else {
                        // if no enrollment record found, hide the button
                        printBtnInit.style.display = "none";
                    }
                } catch (e) {
                    printBtnInit.style.display = "none";
                }
            }
            renderDescription(course);

            // render sessions
            sessionsList.innerHTML = "";
            if (courseSessions.length === 0) {
                sessionsList.innerHTML =
                    "<div>لا توجد جلسات متاحة لهذه الدورة.</div>";
            } else {
                courseSessions.forEach((s) =>
                    sessionsList.appendChild(createSessionItem(s)),
                );
            }

            // render materials (materials link to sessions)
            const courseMaterials = (materials || []).filter((m) => {
                // find session for material
                const sess = sessions.find(
                    (ss) => String(ss.id) === String(m.session_id),
                );
                return sess && String(sess.course_id) === String(course.id);
            });

            materialsList.innerHTML = "";
            if (!curr) {
                // user not logged in -> disable tab and show login prompt
                if (materialsTabBtn) materialsTabBtn.classList.add("disabled");
                materialsList.innerHTML =
                    "<div>الرجاء تسجيل الدخول والتسجيل للوصول للمواد.</div>";
            } else if (!isEnrolled) {
                if (materialsTabBtn) materialsTabBtn.classList.add("disabled");
                materialsList.innerHTML =
                    "<div>يجب أن تكون مسجلاً في هذه الدورة لعرض المواد.</div>";
            } else {
                // enabled
                if (materialsTabBtn)
                    materialsTabBtn.classList.remove("disabled");
                if (courseMaterials.length === 0) {
                    materialsList.innerHTML =
                        "<div>لم يتم رفع أي مواد بعد.</div>";
                } else {
                    courseMaterials.forEach((m) =>
                        materialsList.appendChild(createMaterialItem(m, false)),
                    );
                }
            }

            // wire enroll button: allow enrolling (persist to localStorage) if user logged in and not enrolled
            const enrollBtn = document.getElementById("enrollBtn");
            if (enrollBtn) {
                enrollBtn.addEventListener("click", async (e) => {
                    // if already enrolled, do nothing
                    if (isEnrolled) return;
                    if (!curr) {
                        // redirect to login
                        location.href = "/login.html";
                        return;
                    }

                    // Use shared persistEnrollment when available to avoid duplicate logic
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
                            console.warn(
                                "persistEnrollment failed, falling back",
                                e,
                            );
                            newEnroll = null;
                        }
                    }

                    // Fallback: create and persist locally (legacy behavior)
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
                            enrollment_date: new Date()
                                .toISOString()
                                .slice(0, 10),
                        };
                        allEnrollments.push(newEnroll);
                        try {
                            localStorage.setItem(
                                "enrollments",
                                JSON.stringify(allEnrollments),
                            );
                            try {
                                window.dispatchEvent(
                                    new Event("enrollmentsUpdated"),
                                );
                            } catch (e) {}
                        } catch (err) {
                            console.warn(
                                "Failed to persist enrollment to localStorage",
                                err,
                            );
                        }
                    }

                    // update in-memory state and UI
                    enrolledSet.add(String(course.id));
                    isEnrolled = true;
                    enrollBtn.textContent = "مسجل";
                    enrollBtn.classList.remove("btn-primary");
                    enrollBtn.classList.add("btn-secondary", "disabled");
                    enrollBtn.setAttribute("disabled", "");

                    // enable materials tab and render materials
                    if (materialsTabBtn)
                        materialsTabBtn.classList.remove("disabled");
                    materialsList.innerHTML = "";
                    if (courseMaterials.length === 0) {
                        materialsList.innerHTML =
                            "<div>لم يتم رفع أي مواد بعد.</div>";
                    } else {
                        courseMaterials.forEach((m) =>
                            materialsList.appendChild(
                                createMaterialItem(m, false),
                            ),
                        );
                    }

                    // wire print certificate button if present (use the newly created enrollment id)
                    // If course is completed, re-render header to show certificate button
                    if ((course.status || "").toLowerCase() === "completed") {
                        renderHeader(course, instructor, completedCount, true);

                        const printBtn =
                            document.getElementById("printCertBtn");
                        if (printBtn && newEnroll && newEnroll.id != null) {
                            printBtn.onclick = function () {
                                const url =
                                    "/course/certificate.html?enrollment=" +
                                    encodeURIComponent(String(newEnroll.id));
                                window.location.href = url;
                            };
                        }
                    }
                });
            }

            // if materials tab is disabled, ensure clicking does not switch
            if (
                materialsTabBtn &&
                materialsTabBtn.classList.contains("disabled")
            ) {
                materialsTabBtn.addEventListener("click", (e) =>
                    e.preventDefault(),
                );
            }
        } catch (err) {
            console.error("Error loading course view data:", err);
            courseHeader.innerHTML =
                '<div class="alert alert-danger">فشل تحميل بيانات الدورة.</div>';
        }
    })();
})();
