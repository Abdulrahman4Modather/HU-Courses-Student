document.addEventListener("DOMContentLoaded", async () => {
    // Get user ID from localStorage (set by login page) or URL params
    // Accept multiple shapes: string id, JSON { id, name }, or full student object
    let currentUserData = null;
    const storedUserData = localStorage.getItem("currentUser");
    if (storedUserData) {
        try {
            currentUserData = JSON.parse(storedUserData);
        } catch (e) {
            // stored as plain string (id or email)
            currentUserData = { id: storedUserData };
        }
    }

    const userId =
        currentUserData?.id ||
        currentUserData?.nationalId ||
        currentUserData?.email ||
        new URLSearchParams(window.location.search).get("id");
    if (!userId) {
        console.warn("No user ID found. Redirect to login.");
        return;
    }

    // Fetch students.json from data folder (use relative path to support subpaths)
    let students = [];
    try {
        // use absolute path to data to avoid relative-path issues
        const res = await fetch("/assets/data/students.json");
        if (res && res.ok) students = await res.json();
    } catch (err) {
        console.error("Failed to load students.json", err);
        return;
    }

    // Merge any locally persisted student overrides from localStorage so edits are visible here
    try {
        const rawOverrides = localStorage.getItem("students");
        if (rawOverrides) {
            const overrides = JSON.parse(rawOverrides);
            if (Array.isArray(overrides)) {
                // apply overrides by nationalId (replace existing entry or add new)
                overrides.forEach((ov) => {
                    if (!ov) return;
                    const key =
                        ov.nationalId ||
                        ov.id ||
                        ov.nationalID ||
                        ov.nid ||
                        ov.email;
                    if (!key) return;
                    const idx = students.findIndex(
                        (s) =>
                            String(s.nationalId) === String(ov.nationalId) ||
                            (s.email && s.email === ov.email)
                    );
                    if (idx >= 0)
                        students[idx] = Object.assign({}, students[idx], ov);
                    else students.push(ov);
                });
            }
        }
    } catch (e) {
        console.debug("Could not merge local student overrides", e);
    }

    // Find student by id or by email (in case currentUser stored email)
    // students.json uses `nationalId` for the id field. Accept matches by nationalId or email.
    const student = Array.isArray(students)
        ? students.find(
              (a) =>
                  String(a.nationalId) === String(userId) ||
                  (a.email && a.email === userId)
          )
        : null;
    if (!student) {
        console.warn("student not found for id", userId);
        return;
    }

    // Allow persisted password overrides in localStorage so changes survive page reloads
    // password override key should be tied to the student's nationalId
    const storedPasswordKey = `student-${student.nationalId}-password`;
    const storedPassword = localStorage.getItem(storedPasswordKey);
    const currentStoredPassword = storedPassword ?? student.pass;

    // Populate page fields with student data from JSON
    const idInput = document.getElementById("userId");
    const nameInput = document.getElementById("userName");
    const emailInput = document.getElementById("userEmail");
    const phoneInput = document.getElementById("userPhone");

    if (idInput) idInput.value = student.nationalId ?? "";
    if (nameInput) nameInput.value = student.name ?? "";
    if (emailInput) emailInput.value = student.email ?? "";
    if (phoneInput) phoneInput.value = student.phone ?? "";

    // Enrollment history container
    const enrollBody = document.getElementById("enrollHistoryBody");

    // helper to read localStorage JSON safely
    function readLocal(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    // render enrollment history for this student
    async function renderEnrollHistory() {
        if (!enrollBody) return;
        enrollBody.innerHTML = "";

        // load merged enrollments via auth helper if available
        let enrollments = [];
        try {
            if (
                window.auth &&
                typeof window.auth.loadEnrollmentsMerged === "function"
            ) {
                enrollments = await window.auth.loadEnrollmentsMerged();
            } else {
                // fallback: fetch server enrollments and merge with local overrides
                try {
                    const res = await fetch("/assets/data/enrollment.json");
                    if (res && res.ok) enrollments = await res.json();
                } catch (e) {
                    /* ignore */
                }

                // merge local overrides
                const raw1 = readLocal("enrollments");
                const raw2 = readLocal("enrollment");
                const local = [];
                if (Array.isArray(raw1)) local.push(...raw1);
                if (Array.isArray(raw2)) local.push(...raw2);
                if (local.length) {
                    const map = new Map();
                    (enrollments || []).forEach((e) =>
                        map.set(String(e.id), e)
                    );
                    local.forEach((e) => {
                        if (e && e.id != null) map.set(String(e.id), e);
                        else
                            map.set(
                                "__local_" +
                                    Math.random().toString(36).slice(2),
                                e
                            );
                    });
                    enrollments = Array.from(map.values());
                }
            }
        } catch (e) {
            console.debug("account.js: failed to load enrollments", e);
        }

        // filter for current student
        const myEnrolls = (enrollments || []).filter(
            (en) => String(en.student_id) === String(student.nationalId)
        );

        // load courses map to get course names and statuses
        let courses = readLocal("courses");
        if (!Array.isArray(courses)) {
            try {
                const res = await fetch("/assets/data/courses.json");
                if (res && res.ok) courses = await res.json();
            } catch (e) {
                courses = [];
            }
        }
        const courseMap = {};
        (courses || []).forEach((c) => (courseMap[String(c.id)] = c));

        if (myEnrolls.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.setAttribute("colspan", "4");
            td.className = "text-muted";
            td.textContent = "لا يوجد سجل للتسجيل.";
            tr.appendChild(td);
            enrollBody.appendChild(tr);
            return;
        }

        myEnrolls.forEach((en) => {
            const tr = document.createElement("tr");
            const course = courseMap[String(en.course_id)];

            const nameTd = document.createElement("td");
            nameTd.textContent = course
                ? course.title
                : `Course ${en.course_id}`;

            const dateTd = document.createElement("td");
            dateTd.textContent = en.enrollment_date || "";

            const statusTd = document.createElement("td");
            const status = course ? (course.status || "").toLowerCase() : "";
            const span = document.createElement("span");
            span.className =
                status === "ongoing"
                    ? "badge-hu-info badge rounded-pill px-2"
                    : status === "completed"
                    ? "badge-hu-success badge rounded-pill px-2"
                    : "badge-hu-warning badge rounded-pill px-2";
            span.textContent = course ? course.status || "" : "";
            statusTd.appendChild(span);

            const actionTd = document.createElement("td");
            const view = document.createElement("a");
            view.className = "btn btn-sm btn-primary";
            view.href = `/course/view.html?id=${encodeURIComponent(
                en.course_id
            )}`;
            view.textContent = "عرض";
            actionTd.appendChild(view);

            tr.appendChild(nameTd);
            tr.appendChild(dateTd);
            tr.appendChild(statusTd);
            tr.appendChild(actionTd);
            enrollBody.appendChild(tr);
        });
    }

    // initial render of enrollment history
    renderEnrollHistory();

    // Keep the enrollment history up-to-date when other pages/tabs modify localStorage
    window.addEventListener("storage", (e) => {
        if (!e || !e.key) return;
        if (
            [
                "enrollments",
                "enrollment",
                "students",
                "student",
                "currentUser",
            ].includes(e.key)
        ) {
            try {
                renderEnrollHistory();
            } catch (err) {
                /* ignore */
            }
        }
    });

    // Also listen for an in-page custom event dispatched after scripts persist enrollments
    window.addEventListener("enrollmentsUpdated", () => {
        try {
            renderEnrollHistory();
        } catch (err) {
            /* ignore */
        }
    });

    // Wire up Edit Info / Save Changes button for personal info
    const saveBtn = document.getElementById("saveChangesBtn");
    let editing = false;
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            // inputs that are editable (leave id readonly)
            const editableInputs = [nameInput, emailInput, phoneInput];
            if (!editing) {
                // enable editing
                editableInputs.forEach((el) => {
                    if (el) el.removeAttribute("readonly");
                });
                if (nameInput) nameInput.focus();
                saveBtn.textContent = "حفظ التغييرات";
                editing = true;
                return;
            }

            // Save path
            const newName = (nameInput?.value || "").trim();
            const newEmail = (emailInput?.value || "").trim();
            const newPhone = (phoneInput?.value || "").trim();

            // Basic validation: name required
            if (!newName) {
                alert("الرجاء إدخال اسمك الكامل.");
                return;
            }

            // update student object
            student.name = newName;
            student.email = newEmail;
            student.phone = newPhone;

            // Persist changes to localStorage 'students' overrides array
            try {
                const raw = localStorage.getItem("students");
                let localStudents = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(localStudents)) localStudents = [];

                // use nationalId as the stable id key
                const idx = localStudents.findIndex(
                    (s) =>
                        (s.nationalId || "").toString() ===
                        (student.nationalId || "").toString()
                );
                if (idx >= 0) {
                    localStudents[idx] = student;
                } else {
                    localStudents.push(student);
                }
                localStorage.setItem("students", JSON.stringify(localStudents));

                // update the per-session keys used elsewhere
                localStorage.setItem("student", JSON.stringify(student));
                // store currentUser as JSON object for consistency
                localStorage.setItem(
                    "currentUser",
                    JSON.stringify({
                        id: student.nationalId,
                        name: student.name,
                    })
                );
            } catch (err) {
                console.warn("Failed to persist student changes locally", err);
                alert("لا يمكن حفظ التغييرات محلياً.");
                return;
            }

            // disable editing again
            [nameInput, emailInput, phoneInput].forEach((el) => {
                if (el) el.setAttribute("readonly", "readonly");
            });
            saveBtn.textContent = "تعديل البيانات";
            editing = false;
            alert("تم تحديث الملف الشخصي محلياً.");
            // re-render the enrollment history immediately so changes appear without reload
            try {
                renderEnrollHistory();
            } catch (e) {
                /* ignore */
            }
        });
    }

    // Find the password form. There's a single form on the page for profile/password.
    const passwordForm = document.querySelector("form");
    if (!passwordForm) return;

    passwordForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const currentPassword = (
            document.getElementById("currentPassword")?.value || ""
        ).trim();
        const newPassword = (
            document.getElementById("newPassword")?.value || ""
        ).trim();

        if (!currentPassword || !newPassword) {
            alert("الرجاء إدخال كلمة المرور الحالية والجديدة.");
            return;
        }

        // Recompute stored/override password at submit time
        const storedPasswordKey = `student-${student.nationalId}-password`;
        const storedPassword = localStorage.getItem(storedPasswordKey);
        const effectivePassword = storedPassword ?? student.pass;

        // Validate current password against stored override (if any) or original password
        if (currentPassword !== effectivePassword) {
            alert("كلمة المرور الحالية غير صحيحة!");
            return;
        }

        if (newPassword.length < 6) {
            alert("يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل.");
            return;
        }

        // Persist the new password to localStorage (client-side only).
        // Note: This does not modify server-side files — to persist to server you need an API endpoint.
        localStorage.setItem(storedPasswordKey, newPassword);

        alert("تم تحديث كلمة المرور بنجاح!");

        // clear the form fields
        const cur = document.getElementById("currentPassword");
        const nw = document.getElementById("newPassword");
        if (cur) cur.value = "";
        if (nw) nw.value = "";
    });
});
