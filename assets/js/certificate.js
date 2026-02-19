// Populate certificate from query params: ?course=<id-or-title>&student=<id>
const params = new URLSearchParams(window.location.search);
const courseParam = params.get('course');
const studentParam = params.get('student');
const enrollmentParam = params.get('enrollment');

function readLocal(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

async function resolveData() {
    // If enrollment id provided, prefer resolving course & student from that
    let courseTitle = courseParam || '';
    let resolvedStudentId = studentParam || '';
    try {
        if (enrollmentParam) {
            // Load enrollments (prefer localStorage)
            let enrolls = readLocal('enrollments');
            if (!Array.isArray(enrolls)) {
                try {
                    const res = await fetch('/assets/data/enrollment.json');
                    if (res && res.ok) enrolls = await res.json();
                } catch (e) { enrolls = []; }
            }
            if (Array.isArray(enrolls)) {
                const foundEnroll = enrolls.find(e => String(e.id) === String(enrollmentParam));
                if (foundEnroll) {
                    resolvedStudentId = String(foundEnroll.student_id);
                    courseTitle = courseTitle || String(foundEnroll.course_id);
                }
            }
        }
    } catch (e) { /* ignore */ }
    try {
        const localCourses = readLocal('courses');
        let courses = localCourses;
        if (!Array.isArray(courses)) {
            const res = await fetch('/assets/data/courses.json');
            if (res && res.ok) courses = await res.json();
        }
        if (Array.isArray(courses) && (courseParam || courseTitle)) {
            // match by id first, then fallback to title
            const needle = courseParam || courseTitle;
            const found = courses.find(c => String(c.id) === String(needle) || String(c.title) === String(needle));
            if (found) courseTitle = found.title || courseTitle;
        }
    } catch (e) { /* ignore */ }

    // Try to resolve student name (use resolvedStudentId if available)
    let studentName = '';
    try {
        const localStudents = readLocal('students');
        let students = localStudents;
        if (!Array.isArray(students)) {
            const res = await fetch('/assets/data/students.json');
            if (res && res.ok) students = await res.json();
        }
        const needle = resolvedStudentId || studentParam;
        if (Array.isArray(students) && needle) {
            const found = students.find(s => String(s.nationalId) === String(needle) || String(s.id) === String(needle) || (s.email && s.email === needle));
            if (found) studentName = found.name || '';
        }
    } catch (e) { /* ignore */ }

    // Fallbacks
    if (!courseTitle) courseTitle = 'Course Title';
    if (!studentName) studentName = 'Student Name';

    document.getElementById('courseTitle').innerText = courseTitle;
    // page uses #nameInput as the editable input and #studentName as the display
    const nameInput = document.getElementById('nameInput') || document.getElementById('studentName');
    const display = document.getElementById('studentName') || document.getElementById('displayName');
    if (nameInput) nameInput.value = studentName;
    if (display) display.innerText = studentName;
    // focus input so user can edit before printing (if editable input present)
    try { if (nameInput && nameInput.focus) { nameInput.focus(); nameInput.select(); } } catch (e) { /* ignore */ }
}

function updateName() {
    const nameInput = document.getElementById('nameInput') || document.getElementById('studentName');
    const display = document.getElementById('studentName') || document.getElementById('displayName');
    const name = nameInput ? nameInput.value : '';
    if (display) display.innerText = name;
}

resolveData();
