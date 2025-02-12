/* ================================
   Global Variables & Defaults
=============================== */
var currentChild = "";
var currentTestId = "";
var currentTestPdf = "";
var teacherCredentials = { username: "teacher", password: "teacher123" };

// Predefined tests (if any); otherwise, leave empty.
var availableTests = [];

/* ================================
   Parent Users Utility
=============================== */
function getParentUsers() {
  var users = localStorage.getItem("parentUsers");
  return users ? JSON.parse(users) : [];
}
function setParentUsers(users) {
  localStorage.setItem("parentUsers", JSON.stringify(users));
}

/* ================================
   Child Users Utility
=============================== */
function getChildUsers() {
  var users = localStorage.getItem("childUsers");
  return users ? JSON.parse(users) : [];
}
function setChildUsers(users) {
  localStorage.setItem("childUsers", JSON.stringify(users));
}

/* ================================
   Uploaded Tests (Teacher Uploaded)
=============================== */
function getUploadedTests() {
  var tests = localStorage.getItem("uploadedTests");
  return tests ? JSON.parse(tests) : [];
}
function setUploadedTests(tests) {
  localStorage.setItem("uploadedTests", JSON.stringify(tests));
}

/* ================================
   Uploaded Study Materials (Teacher Uploaded)
=============================== */
function getUploadedMaterials() {
  var materials = localStorage.getItem("uploadedMaterials");
  return materials ? JSON.parse(materials) : [];
}
function setUploadedMaterials(materials) {
  localStorage.setItem("uploadedMaterials", JSON.stringify(materials));
}

/* ================================
   Announcements (For Notifications)
=============================== */
function getAnnouncements() {
  var anns = localStorage.getItem("announcements");
  return anns ? JSON.parse(anns) : [];
}
function setAnnouncements(anns) {
  localStorage.setItem("announcements", JSON.stringify(anns));
}
function addAnnouncement(message) {
  let anns = getAnnouncements();
  let today = new Date().toISOString().split("T")[0];
  anns.push({ date: today, message: message });
  setAnnouncements(anns);
}

/* ================================
   Test Time Limit & Timer Variables
=============================== */
const testTimeLimit = 600; // Default 10 minutes (in seconds)
var pdfTestTimerInterval, pdfTestTimeRemaining;

/* ================================
   Attendance Utilities
=============================== */
function getAttendanceRecords(child) {
  let rec = localStorage.getItem("attendanceRecords_" + child);
  return rec ? JSON.parse(rec) : {};
}
function setAttendanceRecords(child, records) {
  localStorage.setItem("attendanceRecords_" + child, JSON.stringify(records));
}

/* ================================
   Render Attendance Calendar
=============================== */
function renderAttendanceCalendar(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  let childKey = currentChild || "default";
  const records = getAttendanceRecords(childKey);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let table = document.createElement("table");
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let headerRow = document.createElement("tr");
  daysOfWeek.forEach(day => {
    let th = document.createElement("th");
    th.textContent = day;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  
  let date = 1;
  for (let i = 0; i < 6; i++) {
    let row = document.createElement("tr");
    for (let j = 0; j < 7; j++) {
      let cell = document.createElement("td");
      if (i === 0 && j < firstDay) {
        cell.textContent = "";
      } else if (date > daysInMonth) {
        cell.textContent = "";
      } else {
        cell.textContent = date;
        let dateStr = `${year}-${(month+1).toString().padStart(2, "0")}-${date.toString().padStart(2, "0")}`;
        let cellDate = new Date(year, month, date);
        cell.style.backgroundColor = cellDate > now ? "#eee" : (records[dateStr] ? "#c6f6d5" : "#fed7d7");
        date++;
      }
      row.appendChild(cell);
    }
    table.appendChild(row);
    if (date > daysInMonth) break;
  }
  container.appendChild(table);
}

/* ================================
   Persistent Login for Child
=============================== */
window.addEventListener("load", function() {
  var storedChild = localStorage.getItem("loggedInChild");
  if (storedChild) {
    currentChild = storedChild;
    document.getElementById("loginContainer").classList.add("hidden");
    document.getElementById("childDashboard").classList.remove("hidden");
    switchChildTab("attendance");
    var now = new Date();
    var todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
    var records = getAttendanceRecords(currentChild);
    if (records[todayStr]) {
      document.getElementById("attendanceMsg").textContent = "Attendance marked at " + records[todayStr];
      document.getElementById("attendanceBtn").disabled = true;
    }
    loadStudyMaterials();
    renderAttendanceCalendar("attendanceCalendar");
    loadNotifications();
    loadTestList();
    loadResults();
    loadProfile();
  }
});

/* ================================
   Login Screen Switching
=============================== */
function switchLogin(type) {
  document.getElementById("childLoginForm").classList.add("hidden");
  document.getElementById("childRegisterForm").classList.add("hidden");
  document.getElementById("parentLoginForm").classList.add("hidden");
  document.getElementById("parentRegisterForm").classList.add("hidden");
  document.getElementById("teacherLoginForm").classList.add("hidden");
  
  document.getElementById("childLoginTab").classList.remove("active");
  document.getElementById("parentLoginTab").classList.remove("active");
  document.getElementById("teacherLoginTab").classList.remove("active");
  
  if (type === "child") {
    document.getElementById("childLoginForm").classList.remove("hidden");
    document.getElementById("childLoginTab").classList.add("active");
  } else if (type === "parent") {
    document.getElementById("parentLoginForm").classList.remove("hidden");
    document.getElementById("parentLoginTab").classList.add("active");
  } else if (type === "teacher") {
    document.getElementById("teacherLoginForm").classList.remove("hidden");
    document.getElementById("teacherLoginTab").classList.add("active");
  }
}
function showRegisterForm() {
  document.getElementById("childLoginForm").classList.add("hidden");
  document.getElementById("childRegisterForm").classList.remove("hidden");
}
function showLoginForm() {
  document.getElementById("childRegisterForm").classList.add("hidden");
  document.getElementById("childLoginForm").classList.remove("hidden");
}
function showParentRegisterForm() {
  document.getElementById("parentLoginForm").classList.add("hidden");
  document.getElementById("parentRegisterForm").classList.remove("hidden");
}
function showParentLoginForm() {
  document.getElementById("parentRegisterForm").classList.add("hidden");
  document.getElementById("parentLoginForm").classList.remove("hidden");
}

/* ================================
   Child Login & Registration
=============================== */
function childLogin() {
  const email = document.getElementById("childEmail").value.trim();
  const password = document.getElementById("childPassword").value;
  var users = getChildUsers();
  let valid = false;
  for (let user of users) {
    if (user.username === email && user.password === password) {
      valid = true;
      currentChild = email;
      break;
    }
  }
  if (valid) {
    localStorage.setItem("loggedInChild", currentChild);
    document.getElementById("loginContainer").classList.add("hidden");
    document.getElementById("childDashboard").classList.remove("hidden");
    switchChildTab("attendance");
    var now = new Date();
    var todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
    var records = getAttendanceRecords(currentChild);
    if (records[todayStr]) {
      document.getElementById("attendanceMsg").textContent = "Attendance marked at " + records[todayStr];
      document.getElementById("attendanceBtn").disabled = true;
    }
    loadStudyMaterials();
    renderAttendanceCalendar("attendanceCalendar");
    loadNotifications();
    loadTestList();
    loadResults();
    loadProfile();
  } else {
    alert("Invalid credentials. Please register if you do not have an account.");
  }
}
function childRegister() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const passwordConfirm = document.getElementById("regPasswordConfirm").value;
  const parentEmail = document.getElementById("regParent").value.trim();
  if (!name || !email || !password || !passwordConfirm) {
    alert("Please fill in all required fields.");
    return;
  }
  if (!email.includes("@") || !email.includes(".")) {
    alert("Please enter a valid email address.");
    return;
  }
  if (password !== passwordConfirm) {
    alert("Passwords do not match.");
    return;
  }
  var users = getChildUsers();
  for (let user of users) {
    if (user.username === email) {
      alert("User already registered. Please login.");
      return;
    }
  }
  users.push({ username: email, password: password, name: name, parent: parentEmail });
  setChildUsers(users);
  alert("Registration successful! Please login.");
  showLoginForm();
}

/* ================================
   Parent Registration & Login
=============================== */
function parentRegister() {
  const email = document.getElementById("parentRegEmail").value.trim();
  const password = document.getElementById("parentRegPassword").value;
  const passwordConfirm = document.getElementById("parentRegPasswordConfirm").value;
  if (!email || !password || !passwordConfirm) {
    alert("Please fill in all fields.");
    return;
  }
  if (!email.includes("@") || !email.includes(".")) {
    alert("Please enter a valid email address.");
    return;
  }
  if (password !== passwordConfirm) {
    alert("Passwords do not match.");
    return;
  }
  var users = getParentUsers();
  for (let user of users) {
    if (user.username === email) {
      alert("Parent already registered. Please login.");
      return;
    }
  }
  users.push({ username: email, password: password });
  setParentUsers(users);
  alert("Parent registration successful! Please login.");
  showParentLoginForm();
}
function parentLogin() {
  const email = document.getElementById("parentEmail").value.trim();
  const password = document.getElementById("parentPassword").value;
  var users = getParentUsers();
  let valid = false;
  for (let user of users) {
    if (user.username === email && user.password === password) {
      valid = true;
      break;
    }
  }
  if (valid) {
    localStorage.setItem("loggedInParent", email);
    document.getElementById("loginContainer").classList.add("hidden");
    document.getElementById("parentDashboard").classList.remove("hidden");
    switchParentTab("profiles");
  } else {
    alert("Invalid parent credentials.");
  }
}

/* ================================
   Teacher Login
=============================== */
function teacherLogin() {
  const username = document.getElementById("teacherUsername").value;
  const password = document.getElementById("teacherPassword").value;
  if (username === teacherCredentials.username && password === teacherCredentials.password) {
    document.getElementById("loginContainer").classList.add("hidden");
    document.getElementById("teacherDashboard").classList.remove("hidden");
    switchTeacherTab("attendance");
  } else {
    alert("Invalid teacher credentials.");
  }
}

/* ================================
   Dashboard Tab Switching
=============================== */
function switchChildTab(tab) {
  document.querySelectorAll(".dashboard-nav ul li[data-tab]").forEach(li => {
    li.classList.remove("active");
    if (li.dataset.tab === tab) li.classList.add("active");
  });
  // Hide all child sections
  document.getElementById("childAttendanceTab").classList.add("hidden");
  document.getElementById("childMaterialsTab").classList.add("hidden");
  document.getElementById("childTestsTab").classList.add("hidden");
  document.getElementById("childResultsTab").classList.add("hidden");
  document.getElementById("childProfileTab").classList.add("hidden");
  if (tab === "attendance") {
    document.getElementById("childAttendanceTab").classList.remove("hidden");
    renderAttendanceCalendar("attendanceCalendar");
    loadNotifications();
  } else if (tab === "materials") {
    document.getElementById("childMaterialsTab").classList.remove("hidden");
    loadStudyMaterials();
  } else if (tab === "tests") {
    document.getElementById("childTestsTab").classList.remove("hidden");
    loadTestList();
  } else if (tab === "results") {
    document.getElementById("childResultsTab").classList.remove("hidden");
    loadResults();
  } else if (tab === "profile") {
    document.getElementById("childProfileTab").classList.remove("hidden");
    loadProfile();
  }
}
function switchTeacherTab(tab) {
  document.querySelectorAll(".teacher-nav ul li[data-tab]").forEach(li => {
    li.classList.remove("active");
    if (li.dataset.tab === tab) li.classList.add("active");
  });
  if (tab === "attendance") {
    loadTeacherAttendance();
  } else if (tab === "reviewTests") {
    loadTeacherReview();
  } else if (tab === "uploadTest") {
    showTestUploadForm();
  } else if (tab === "uploadMaterial") {
    showMaterialUploadForm();
  }
}
function switchParentTab(tab) {
  document.querySelectorAll(".parent-nav ul li[data-tab]").forEach(li => {
    li.classList.remove("active");
    if (li.dataset.tab === tab) li.classList.add("active");
  });
  if (tab === "profiles") {
    loadParentProfiles();
  } else if (tab === "progress") {
    loadParentProgress();
  }
}

/* ================================
   Child Profile Functions
=============================== */
function loadProfile() {
  const profileDiv = document.getElementById("profileInfo");
  profileDiv.innerHTML = "";
  let users = getChildUsers();
  let user = users.find(u => u.username === currentChild);
  if (user) {
    profileDiv.innerHTML = `
      <p><strong>Name:</strong> ${user.name}</p>
      <p><strong>Email:</strong> ${user.username}</p>
      <p><strong>Parent Email:</strong> ${user.parent ? user.parent : "Not provided"}</p>
    `;
  }
}
function editProfile() {
  let users = getChildUsers();
  let userIndex = users.findIndex(u => u.username === currentChild);
  if (userIndex === -1) return;
  let newName = prompt("Enter your new display name:", users[userIndex].name || "");
  let newParent = prompt("Enter your new parent email (or leave blank):", users[userIndex].parent || "");
  if (newName !== null) {
    users[userIndex].name = newName.trim();
  }
  if (newParent !== null) {
    users[userIndex].parent = newParent.trim();
  }
  setChildUsers(users);
  loadProfile();
  alert("Profile updated!");
}

/* ================================
   Teacher & Parent: Attendance, Materials, Tests, Results
=============================== */
function markAttendance() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  const records = getAttendanceRecords(currentChild);
  if (records[todayStr]) {
    alert("Attendance already marked for today.");
    return;
  }
  records[todayStr] = now.toLocaleTimeString();
  setAttendanceRecords(currentChild, records);
  document.getElementById("attendanceMsg").textContent = "Attendance marked at " + records[todayStr];
  document.getElementById("attendanceBtn").disabled = true;
  renderAttendanceCalendar("attendanceCalendar");
}

/* ================================
   Load Study Materials (Teacher-Uploaded Only)
=============================== */
// Removed static materials; only teacher-uploaded materials are shown.
function loadStudyMaterials() {
  let uploaded = getUploadedMaterials();
  // Group the materials by grade and subject
  let materials = {};
  uploaded.forEach(function(item) {
    if (!materials[item.grade]) {
      materials[item.grade] = {};
    }
    if (!materials[item.grade][item.subject]) {
      materials[item.grade][item.subject] = [];
    }
    materials[item.grade][item.subject].push({ chapter: item.chapter, pdf: item.pdf });
  });
  const accordion = document.getElementById("materialsAccordion");
  accordion.innerHTML = "";
  // If no materials are uploaded, show a message
  if (Object.keys(materials).length === 0) {
    accordion.innerHTML = "<p style='text-align:center;'>No study materials available.</p>";
    return;
  }
  // Render each grade and subject as blocks in an accordion
  for (let grade in materials) {
    let gradeBlock = document.createElement("div");
    gradeBlock.className = "grade-block";
    let gradeTitle = document.createElement("h3");
    gradeTitle.textContent = grade;
    gradeBlock.appendChild(gradeTitle);
    for (let subject in materials[grade]) {
      let detailsEl = document.createElement("details");
      let summaryEl = document.createElement("summary");
      summaryEl.textContent = subject;
      detailsEl.appendChild(summaryEl);
      let ulEl = document.createElement("ul");
      materials[grade][subject].forEach(chapterObj => {
        let liEl = document.createElement("li");
        liEl.innerHTML = `<a href="${chapterObj.pdf}" target="_blank">${chapterObj.chapter}</a>`;
        ulEl.appendChild(liEl);
      });
      detailsEl.appendChild(ulEl);
      gradeBlock.appendChild(detailsEl);
    }
    accordion.appendChild(gradeBlock);
  }
}

function loadNotifications() {
  const notifSection = document.getElementById("notificationsSection");
  notifSection.innerHTML = "";
  let anns = getAnnouncements();
  if (anns.length === 0) {
    notifSection.innerHTML = "<p style='text-align:center;'>No announcements available.</p>";
  } else {
    anns.forEach(ann => {
      const div = document.createElement("div");
      div.innerHTML = `<strong>${ann.date}</strong>: ${ann.message}`;
      notifSection.appendChild(div);
    });
  }
}

function loadTestList() {
  const testListDiv = document.getElementById("testList");
  testListDiv.innerHTML = "";
  let tests = availableTests.concat(getUploadedTests());
  let today = new Date().toISOString().split("T")[0];
  tests.forEach(test => {
    if (!test.date || today >= test.date) {
      let keyAttempted = "childTestAttempted_" + currentChild + "_" + test.id;
      let attempted = localStorage.getItem(keyAttempted);
      let btn = document.createElement("button");
      btn.className = "btn";
      if (attempted) {
        btn.textContent = test.name + " (Attempted)";
        btn.disabled = true;
      } else {
        btn.textContent = "Take " + test.name;
        btn.onclick = function() {
          currentTestId = test.id;
          currentTestPdf = test.pdf;
          pdfTestTimeRemaining = test.timer ? test.timer : testTimeLimit;
          goToTestPage();
        };
      }
      testListDiv.appendChild(btn);
    }
  });
}

function loadResults() {
  const tbody = document.getElementById("resultsTableBody");
  tbody.innerHTML = "";
  let tests = availableTests.concat(getUploadedTests());
  tests.forEach(test => {
    let keyAttempted = "childTestAttempted_" + currentChild + "_" + test.id;
    let keyGraded = "childTestGraded_" + currentChild + "_" + test.id;
    let keyScore = "childTestScore_" + currentChild + "_" + test.id;
    let attempted = localStorage.getItem(keyAttempted);
    let graded = localStorage.getItem(keyGraded);
    let score = localStorage.getItem(keyScore);
    let tr = document.createElement("tr");
    let tdTest = document.createElement("td");
    tdTest.textContent = test.name;
    let tdStatus = document.createElement("td");
    let tdGrade = document.createElement("td");
    if (!attempted) {
      tdStatus.textContent = "Not Attempted";
      tdGrade.textContent = "-";
    } else if (attempted && graded !== "true") {
      tdStatus.textContent = "Submitted (Pending Grading)";
      tdGrade.textContent = "-";
    } else if (graded === "true") {
      tdStatus.textContent = "Graded";
      tdGrade.textContent = score;
    }
    tr.appendChild(tdTest);
    tr.appendChild(tdStatus);
    tr.appendChild(tdGrade);
    tbody.appendChild(tr);
  });
}

/* ================================
   Test Page Navigation & Interface
=============================== */
function goToTestPage() {
  document.getElementById("childDashboard").classList.add("hidden");
  document.getElementById("testPage").classList.remove("hidden");
  updateTestPageInterface();
}
function returnToDashboard() {
  document.getElementById("testPage").classList.add("hidden");
  document.getElementById("childDashboard").classList.remove("hidden");
  loadTestList();
  loadResults();
}
function updateTestPageInterface() {
  let keyAttempted = "childTestAttempted_" + currentChild + "_" + currentTestId;
  if (localStorage.getItem(keyAttempted)) {
    if (localStorage.getItem("childTestGraded_" + currentChild + "_" + currentTestId) === "true") {
      document.getElementById("testInterface").innerHTML = "<p>Your test has been graded.</p>";
    } else {
      document.getElementById("testInterface").innerHTML = "<p>Your test has been submitted. Waiting for teacher grading.</p>";
    }
    document.getElementById("returnBtn").classList.remove("hidden");
  } else {
    document.getElementById("testInterface").innerHTML = `
      <div id="testNotAttempted">
        <button class="btn" onclick="startPDFTest()">Start Test</button>
      </div>
    `;
    document.getElementById("returnBtn").classList.add("hidden");
  }
}
function startPDFTest() {
  let keyAttempted = "childTestAttempted_" + currentChild + "_" + currentTestId;
  if (localStorage.getItem(keyAttempted)) {
    alert("Test already attempted.");
    return;
  }
  const testInterface = document.getElementById("testInterface");
  testInterface.innerHTML = `
    <div id="pdfTestContainer">
      <div id="pdfTimer">--:--</div>
      <iframe id="pdfViewer" src="${currentTestPdf}"></iframe>
    </div>
    <button class="btn" id="finishTestBtn" onclick="finishPDFTest()">Finish Test</button>
  `;
  updatePDFTimerDisplay();
  pdfTestTimerInterval = setInterval(() => {
    pdfTestTimeRemaining--;
    updatePDFTimerDisplay();
    if (pdfTestTimeRemaining <= 0) {
      clearInterval(pdfTestTimerInterval);
      finishPDFTest();
    }
  }, 1000);
}
function updatePDFTimerDisplay() {
  const timerDisplay = document.getElementById("pdfTimer");
  const minutes = Math.floor(pdfTestTimeRemaining / 60);
  const seconds = pdfTestTimeRemaining % 60;
  timerDisplay.textContent =
    (minutes < 10 ? "0" + minutes : minutes) + ":" +
    (seconds < 10 ? "0" + seconds : seconds);
}
function finishPDFTest() {
  clearInterval(pdfTestTimerInterval);
  const pdfContainer = document.getElementById("pdfTestContainer");
  const finishBtn = document.getElementById("finishTestBtn");
  if (pdfContainer) pdfContainer.style.display = "none";
  if (finishBtn) finishBtn.style.display = "none";
  showUploadSectionTestPage();
}
function showUploadSectionTestPage() {
  const testInterface = document.getElementById("testInterface");
  testInterface.innerHTML = `
    <div id="uploadSection">
      <p>Please upload a photo(s) of your answer copy (max 2 images):</p>
      <input type="file" id="uploadInput" accept="image/*" multiple />
      <button class="btn" onclick="submitUploadedTest()">Submit Test</button>
    </div>
  `;
}
function submitUploadedTest() {
  const input = document.getElementById("uploadInput");
  const files = input.files;
  if (!files || files.length === 0) {
    alert("Please select at least one image.");
    return;
  }
  if (files.length > 2) {
    alert("You can upload a maximum of 2 images.");
    return;
  }
  const readerPromises = [];
  for (let i = 0; i < files.length; i++) {
    readerPromises.push(new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.onerror = function() { reject("Error reading file."); };
      reader.readAsDataURL(files[i]);
    }));
  }
  Promise.all(readerPromises)
    .then((base64Images) => {
      let keyImages = "childTestSubmissionImages_" + currentChild + "_" + currentTestId;
      let keyAttempted = "childTestAttempted_" + currentChild + "_" + currentTestId;
      let keyGraded = "childTestGraded_" + currentChild + "_" + currentTestId;
      localStorage.setItem(keyImages, JSON.stringify(base64Images));
      localStorage.setItem(keyAttempted, "true");
      localStorage.setItem(keyGraded, "false");
      document.getElementById("testInterface").innerHTML = "<p>Your test has been submitted. Waiting for teacher grading.</p>";
      document.getElementById("returnBtn").classList.remove("hidden");
    })
    .catch(err => {
      alert("There was an error processing your images.");
    });
}

/* ================================
   Teacher Test Upload Feature
=============================== */
function showTestUploadForm() {
  const container = document.getElementById("teacherContent");
  container.innerHTML = `
    <h3 style="text-align:center; margin-bottom:20px;">Upload New Test</h3>
    <form id="testUploadForm">
      <input type="text" id="testName" placeholder="Test Name" required /><br><br>
      <input type="file" id="testPdf" accept="application/pdf" required /><br><br>
      <input type="number" id="testTimer" placeholder="Time Limit (seconds)" required /><br><br>
      <input type="date" id="testDate" required /><br><br>
      <button class="btn" type="submit">Upload Test</button>
    </form>
  `;
  document.getElementById("testUploadForm").addEventListener("submit", function(e) {
    e.preventDefault();
    uploadTest();
  });
}
function uploadTest() {
  const testName = document.getElementById("testName").value.trim();
  const testTimer = parseInt(document.getElementById("testTimer").value);
  const testDate = document.getElementById("testDate").value;
  const fileInput = document.getElementById("testPdf");
  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Please select a PDF file.");
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const pdfData = e.target.result;
    let newTest = {
      id: "uploaded_" + new Date().getTime(),
      name: testName,
      pdf: pdfData,
      timer: testTimer,
      date: testDate
    };
    let uploadedTests = getUploadedTests();
    uploadedTests.push(newTest);
    setUploadedTests(uploadedTests);
    addAnnouncement(`New Test Uploaded: ${testName} (Scheduled on ${testDate})`);
    alert("Test uploaded successfully!");
    switchTeacherTab("attendance");
  };
  reader.readAsDataURL(file);
}

/* ================================
   Teacher Study Material Upload Feature
=============================== */
function showMaterialUploadForm() {
  const container = document.getElementById("teacherContent");
  container.innerHTML = `
    <h3 style="text-align:center; margin-bottom:20px;">Upload Study Material</h3>
    <form id="materialUploadForm">
      <select id="materialGrade" required>
        <option value="">Select Grade</option>
        <option value="11th Grade">11th Grade</option>
        <option value="12th Grade">12th Grade</option>
      </select><br><br>
      <select id="materialSubject" required>
        <option value="">Select Subject</option>
        <option value="Chemistry">Chemistry</option>
        <option value="Physics">Physics</option>
        <option value="Biology">Biology</option>
      </select><br><br>
      <input type="text" id="materialChapter" placeholder="Enter Chapter Name" required /><br><br>
      <input type="file" id="materialPdf" accept="application/pdf" required /><br><br>
      <button class="btn" type="submit">Upload Material</button>
    </form>
  `;
  document.getElementById("materialUploadForm").addEventListener("submit", function(e) {
    e.preventDefault();
    uploadMaterial();
  });
}
function uploadMaterial() {
  const grade = document.getElementById("materialGrade").value;
  const subject = document.getElementById("materialSubject").value;
  const chapter = document.getElementById("materialChapter").value.trim();
  const fileInput = document.getElementById("materialPdf");
  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Please select a PDF file.");
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const pdfData = e.target.result;
    let newMaterial = {
      id: "material_" + new Date().getTime(),
      grade: grade,
      subject: subject,
      chapter: chapter,
      pdf: pdfData
    };
    let materials = getUploadedMaterials();
    materials.push(newMaterial);
    setUploadedMaterials(materials);
    addAnnouncement(`New Study Material Uploaded: ${grade} ${subject} - ${chapter}`);
    alert("Study material uploaded successfully!");
    switchTeacherTab("attendance");
  };
  reader.readAsDataURL(file);
}

/* ================================
   Teacher Attendance View
=============================== */
function loadTeacherAttendance() {
  const container = document.getElementById("teacherContent");
  container.innerHTML = "<h3 style='text-align:center; margin-bottom:20px;'>Attendance Calendar</h3>";
  let childSelect = document.createElement("select");
  getChildUsers().forEach(user => {
    let opt = document.createElement("option");
    opt.value = user.username;
    opt.textContent = user.name ? user.name : user.username;
    childSelect.appendChild(opt);
  });
  container.appendChild(childSelect);
  container.appendChild(document.createElement("br"));
  container.appendChild(document.createElement("br"));
  if (!currentChild) { currentChild = childSelect.value; }
  let loadBtn = document.createElement("button");
  loadBtn.className = "btn";
  loadBtn.textContent = "Load Attendance";
  loadBtn.onclick = function() {
    let selectedChild = childSelect.value;
    currentChild = selectedChild;
    renderAttendanceCalendar("teacherAttendanceCalendar");
  };
  container.appendChild(loadBtn);
  container.appendChild(document.createElement("br"));
  container.appendChild(document.createElement("br"));
  let calDiv = document.createElement("div");
  calDiv.id = "teacherAttendanceCalendar";
  container.appendChild(calDiv);
  renderAttendanceCalendar("teacherAttendanceCalendar");
}

/* ================================
   Teacher Test Review & Grading
=============================== */
function loadTeacherReview() {
  const container = document.getElementById("teacherContent");
  container.innerHTML = "<h3 style='text-align:center; margin-bottom:20px;'>Review Test Submission</h3>";
  let childSelect = document.createElement("select");
  getChildUsers().forEach(user => {
    let opt = document.createElement("option");
    opt.value = user.username;
    opt.textContent = user.name ? user.name : user.username;
    childSelect.appendChild(opt);
  });
  let testSelect = document.createElement("select");
  let tests = availableTests.concat(getUploadedTests());
  tests.forEach(test => {
    let opt = document.createElement("option");
    opt.value = test.id;
    opt.textContent = test.name;
    testSelect.appendChild(opt);
  });
  let loadBtn = document.createElement("button");
  loadBtn.className = "btn";
  loadBtn.textContent = "Load Submission";
  loadBtn.onclick = function() {
    let selectedChild = childSelect.value;
    let selectedTest = testSelect.value;
    showTeacherReviewSubmission(selectedChild, selectedTest);
  };
  container.appendChild(childSelect);
  container.appendChild(document.createElement("br"));
  container.appendChild(document.createElement("br"));
  container.appendChild(testSelect);
  container.appendChild(document.createElement("br"));
  container.appendChild(document.createElement("br"));
  container.appendChild(loadBtn);
}
function showTeacherReviewSubmission(child, testId) {
  const container = document.getElementById("teacherContent");
  container.innerHTML = "<h3 style='text-align:center; margin-bottom:20px;'>Review Submission</h3>";
  let keyImages = "childTestSubmissionImages_" + child + "_" + testId;
  let submissionStr = localStorage.getItem(keyImages);
  if (!submissionStr) {
    container.innerHTML += "<p>No submission available for this test.</p>";
    return;
  }
  let images = JSON.parse(submissionStr);
  images.forEach((imgData) => {
    let div = document.createElement("div");
    div.style.marginBottom = "20px";
    let img = document.createElement("img");
    img.src = imgData;
    img.style.maxWidth = "100%";
    img.style.border = "1px solid #ccc";
    img.style.borderRadius = "4px";
    div.appendChild(img);
    container.appendChild(div);
  });
  let gradeLabel = document.createElement("label");
  gradeLabel.textContent = "Enter Grade: ";
  let gradeInput = document.createElement("input");
  gradeInput.type = "number";
  gradeInput.id = "gradeInput";
  gradeInput.style.marginRight = "10px";
  let gradeBtn = document.createElement("button");
  gradeBtn.className = "btn";
  gradeBtn.textContent = "Grade Test";
  gradeBtn.onclick = function() { gradeTest(child, testId); };
  container.appendChild(gradeLabel);
  container.appendChild(gradeInput);
  container.appendChild(gradeBtn);
}
function gradeTest(child, testId) {
  let grade = document.getElementById("gradeInput").value;
  if (grade === "") {
    alert("Please enter a grade.");
    return;
  }
  localStorage.setItem("childTestScore_" + child + "_" + testId, grade);
  localStorage.setItem("childTestGraded_" + child + "_" + testId, "true");
  document.getElementById("teacherContent").innerHTML = `<p>Test graded. Score: ${grade}.</p>`;
}

/* ================================
   Parent Dashboard Functions
=============================== */
function loadParentProfiles() {
  const container = document.getElementById("parentContent");
  container.innerHTML = "<h3 style='text-align:center; margin-bottom:20px;'>My Child(ren) Profiles</h3>";
  let parentEmail = localStorage.getItem("loggedInParent");
  let users = getChildUsers();
  let myChildren = users.filter(user => user.parent && user.parent === parentEmail);
  if (myChildren.length === 0) {
    container.innerHTML += "<p>No child linked to this parent account.</p>";
  } else {
    myChildren.forEach(child => {
      container.innerHTML += `<p><strong>Name:</strong> ${child.name || child.username}<br>
                              <strong>Email:</strong> ${child.username}</p><hr>`;
    });
  }
}
function loadParentProgress() {
  const container = document.getElementById("parentContent");
  container.innerHTML = "<h3 style='text-align:center; margin-bottom:20px;'>Overall Progress</h3>";
  let parentEmail = localStorage.getItem("loggedInParent");
  let users = getChildUsers();
  let myChildren = users.filter(user => user.parent && user.parent === parentEmail);
  if (myChildren.length === 0) {
    container.innerHTML += "<p>No child linked to this parent account.</p>";
  } else {
    let totalAttendanceDays = 0, totalTests = 0, totalScore = 0, gradedTests = 0;
    myChildren.forEach(child => {
      let attendance = getAttendanceRecords(child.username);
      totalAttendanceDays += Object.keys(attendance).length;
      let tests = availableTests.concat(getUploadedTests());
      tests.forEach(test => {
        let keyAttempted = "childTestAttempted_" + child.username + "_" + test.id;
        if (localStorage.getItem(keyAttempted)) {
          totalTests++;
          let keyGraded = "childTestGraded_" + child.username + "_" + test.id;
          if (localStorage.getItem(keyGraded) === "true") {
            let keyScore = "childTestScore_" + child.username + "_" + test.id;
            let score = parseFloat(localStorage.getItem(keyScore));
            if (!isNaN(score)) {
              totalScore += score;
              gradedTests++;
            }
          }
        }
      });
    });
    let avgScore = gradedTests > 0 ? (totalScore / gradedTests).toFixed(2) : "N/A";
    container.innerHTML += `<p><strong>Total Attendance Days:</strong> ${totalAttendanceDays}</p>
                            <p><strong>Total Tests Attempted:</strong> ${totalTests}</p>
                            <p><strong>Average Test Score:</strong> ${avgScore}</p>`;
  }
}

/* ================================
   Teacher & Parent: Attendance View
=============================== */
function loadTeacherAttendance() {
  const container = document.getElementById("teacherContent");
  container.innerHTML = "<h3 style='text-align:center; margin-bottom:20px;'>Attendance Calendar</h3>";
  let childSelect = document.createElement("select");
  getChildUsers().forEach(user => {
    let opt = document.createElement("option");
    opt.value = user.username;
    opt.textContent = user.name ? user.name : user.username;
    childSelect.appendChild(opt);
  });
  container.appendChild(childSelect);
  container.appendChild(document.createElement("br"));
  container.appendChild(document.createElement("br"));
  if (!currentChild) { currentChild = childSelect.value; }
  let loadBtn = document.createElement("button");
  loadBtn.className = "btn";
  loadBtn.textContent = "Load Attendance";
  loadBtn.onclick = function() {
    let selectedChild = childSelect.value;
    currentChild = selectedChild;
    renderAttendanceCalendar("teacherAttendanceCalendar");
  };
  container.appendChild(loadBtn);
  container.appendChild(document.createElement("br"));
  container.appendChild(document.createElement("br"));
  let calDiv = document.createElement("div");
  calDiv.id = "teacherAttendanceCalendar";
  container.appendChild(calDiv);
  renderAttendanceCalendar("teacherAttendanceCalendar");
}

/* ================================
   Test Page Navigation & Interface
=============================== */
function goToTestPage() {
  document.getElementById("childDashboard").classList.add("hidden");
  document.getElementById("testPage").classList.remove("hidden");
  updateTestPageInterface();
}
function returnToDashboard() {
  document.getElementById("testPage").classList.add("hidden");
  document.getElementById("childDashboard").classList.remove("hidden");
  loadTestList();
  loadResults();
}
function updateTestPageInterface() {
  let keyAttempted = "childTestAttempted_" + currentChild + "_" + currentTestId;
  if (localStorage.getItem(keyAttempted)) {
    if (localStorage.getItem("childTestGraded_" + currentChild + "_" + currentTestId) === "true") {
      document.getElementById("testInterface").innerHTML = "<p>Your test has been graded.</p>";
    } else {
      document.getElementById("testInterface").innerHTML = "<p>Your test has been submitted. Waiting for teacher grading.</p>";
    }
    document.getElementById("returnBtn").classList.remove("hidden");
  } else {
    document.getElementById("testInterface").innerHTML = `
      <div id="testNotAttempted">
        <button class="btn" onclick="startPDFTest()">Start Test</button>
      </div>
    `;
    document.getElementById("returnBtn").classList.add("hidden");
  }
}
function startPDFTest() {
  let keyAttempted = "childTestAttempted_" + currentChild + "_" + currentTestId;
  if (localStorage.getItem(keyAttempted)) {
    alert("Test already attempted.");
    return;
  }
  const testInterface = document.getElementById("testInterface");
  testInterface.innerHTML = `
    <div id="pdfTestContainer">
      <div id="pdfTimer">--:--</div>
      <iframe id="pdfViewer" src="${currentTestPdf}"></iframe>
    </div>
    <button class="btn" id="finishTestBtn" onclick="finishPDFTest()">Finish Test</button>
  `;
  updatePDFTimerDisplay();
  pdfTestTimerInterval = setInterval(() => {
    pdfTestTimeRemaining--;
    updatePDFTimerDisplay();
    if (pdfTestTimeRemaining <= 0) {
      clearInterval(pdfTestTimerInterval);
      finishPDFTest();
    }
  }, 1000);
}
function updatePDFTimerDisplay() {
  const timerDisplay = document.getElementById("pdfTimer");
  const minutes = Math.floor(pdfTestTimeRemaining / 60);
  const seconds = pdfTestTimeRemaining % 60;
  timerDisplay.textContent =
    (minutes < 10 ? "0" + minutes : minutes) + ":" +
    (seconds < 10 ? "0" + seconds : seconds);
}
function finishPDFTest() {
  clearInterval(pdfTestTimerInterval);
  const pdfContainer = document.getElementById("pdfTestContainer");
  const finishBtn = document.getElementById("finishTestBtn");
  if (pdfContainer) pdfContainer.style.display = "none";
  if (finishBtn) finishBtn.style.display = "none";
  showUploadSectionTestPage();
}
function showUploadSectionTestPage() {
  const testInterface = document.getElementById("testInterface");
  testInterface.innerHTML = `
    <div id="uploadSection">
      <p>Please upload a photo(s) of your answer copy (max 2 images):</p>
      <input type="file" id="uploadInput" accept="image/*" multiple />
      <button class="btn" onclick="submitUploadedTest()">Submit Test</button>
    </div>
  `;
}
function submitUploadedTest() {
  const input = document.getElementById("uploadInput");
  const files = input.files;
  if (!files || files.length === 0) {
    alert("Please select at least one image.");
    return;
  }
  if (files.length > 2) {
    alert("You can upload a maximum of 2 images.");
    return;
  }
  const readerPromises = [];
  for (let i = 0; i < files.length; i++) {
    readerPromises.push(new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.onerror = function() { reject("Error reading file."); };
      reader.readAsDataURL(files[i]);
    }));
  }
  Promise.all(readerPromises)
    .then((base64Images) => {
      let keyImages = "childTestSubmissionImages_" + currentChild + "_" + currentTestId;
      let keyAttempted = "childTestAttempted_" + currentChild + "_" + currentTestId;
      let keyGraded = "childTestGraded_" + currentChild + "_" + currentTestId;
      localStorage.setItem(keyImages, JSON.stringify(base64Images));
      localStorage.setItem(keyAttempted, "true");
      localStorage.setItem(keyGraded, "false");
      document.getElementById("testInterface").innerHTML = "<p>Your test has been submitted. Waiting for teacher grading.</p>";
      document.getElementById("returnBtn").classList.remove("hidden");
    })
    .catch(err => {
      alert("There was an error processing your images.");
    });
}

/* ================================
   Logout Functions
=============================== */
function childLogout() {
  document.getElementById("childDashboard").classList.add("hidden");
  document.getElementById("testPage").classList.add("hidden");
  document.getElementById("loginContainer").classList.remove("hidden");
  document.getElementById("childEmail").value = "";
  document.getElementById("childPassword").value = "";
  localStorage.removeItem("loggedInChild");
  currentChild = "";
}
function teacherLogout() {
  document.getElementById("teacherDashboard").classList.add("hidden");
  document.getElementById("loginContainer").classList.remove("hidden");
  document.getElementById("teacherUsername").value = "";
  document.getElementById("teacherPassword").value = "";
}
function parentLogout() {
  document.getElementById("parentDashboard").classList.add("hidden");
  document.getElementById("loginContainer").classList.remove("hidden");
  document.getElementById("parentEmail").value = "";
  document.getElementById("parentPassword").value = "";
  localStorage.removeItem("loggedInParent");
}
