const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbx_RcsAdBewQY_jWkQ9dknhcoH7ram5hvT_T9aQK9j_iEzuzQQl21aGnY40QQTuNKPM/exec";
let html5QrCode;
let isScannerRunning = false;
let allEvents = [];
let isProcessing = false;
/**
 * FEATURE 1: CREATE EVENT
 * Includes "Creating..." status to prevent duplicate clicks
 */
async function handleCreateEvent() {
  const btn = document.querySelector("#create-section .main-btn");
  const originalText = btn.innerHTML;

  // Disable button and show processing state
  btn.disabled = true;
  btn.innerHTML = "Creating Event...";
  btn.style.opacity = "0.7";

  const data = {
    action: "CREATE_EVENT",
    name: document.getElementById("event-name").value,
    date: document.getElementById("event-date").value,
    venue: document.getElementById("event-venue").value,
  };

  try {
    // We use no-cors for the POST request to Apps Script
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data),
    });

    alert(
      "✅ Event Created Successfully!\nCheck your Google Drive for the new spreadsheet."
    );
    location.reload();
  } catch (error) {
    alert("❌ Error creating event. Please check your connection.");
    btn.disabled = false;
    btn.innerHTML = originalText;
    btn.style.opacity = "1";
  }
}

/**
 * DROPDOWN DATA FETCHING
 */
async function loadEvents() {
  try {
    const resp = await fetch(WEB_APP_URL);
    allEvents = await resp.json();
    const dropdown = document.getElementById("event-dropdown");
    dropdown.innerHTML = '<option value="">Select an Event</option>';

    allEvents.forEach((ev) => {
      let opt = document.createElement("option");
      opt.value = ev.id;
      opt.text = `${ev.name} (${ev.date})`;
      dropdown.add(opt);
    });
  } catch (e) {
    console.error("Error loading events:", e);
  }
}

/**
 * CAMERA TOGGLE LOGIC
 */
function toggleScannerBtn() {
  const btn = document.getElementById("open-cam-btn");
  const eventSelected = document.getElementById("event-dropdown").value;

  if (eventSelected) {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
    if (isScannerRunning) stopScanner();
  }
}

function handleScannerToggle() {
  if (!isScannerRunning) {
    startScanner();
  } else {
    stopScanner();
  }
}

function startScanner() {
  const btn = document.getElementById("open-cam-btn");
  html5QrCode = new Html5Qrcode("reader");

  html5QrCode
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess
    )
    .then(() => {
      isScannerRunning = true;
      btn.innerHTML = "Stop Camera";
      btn.style.background = "#e74c3c"; // Red for "Off" state
    })
    .catch((err) => {
      alert("Camera Error: " + err);
    });
}

function stopScanner() {
  const btn = document.getElementById("open-cam-btn");
  if (html5QrCode) {
    html5QrCode
      .stop()
      .then(() => {
        isScannerRunning = false;
        btn.innerHTML = "Open Camera";
        btn.style.background = "#91c11e"; // Back to Lime
        document.getElementById("reader").innerHTML = ""; // Clear visual artifacts
      })
      .catch((err) => console.error("Error stopping scanner:", err));
  }
}

/**
 * FEATURE 2: SCANNER & POPUP ALERT
 */
async function onScanSuccess(decodedText) {
  // 1. Check if we are already handling a scan
  if (isProcessing || !isScannerRunning) return;

  const eventId = document.getElementById("event-dropdown").value;
  if (!eventId) return;

  // 2. Lock the scanner immediately
  isProcessing = true;

  const msgDiv = document.getElementById("status-msg");
  msgDiv.innerHTML = "Verifying...";
  msgDiv.className = "active-process";

  const selectedEvent = allEvents.find((ev) => ev.id === eventId);
  const url =
    `${WEB_APP_URL}?action=SCAN_ATTENDANCE` +
    `&email=${encodeURIComponent(decodedText)}` +
    `&eventId=${eventId}` +
    `&eventName=${encodeURIComponent(selectedEvent.name)}` +
    `&venue=${encodeURIComponent(selectedEvent.venue)}` +
    `&date=${encodeURIComponent(selectedEvent.date)}`;

  try {
    const resp = await fetch(url);
    const result = await resp.json();

    // 3. Trigger the auto-closing modal
    showAutoModal(result.status, decodedText);
  } catch (error) {
    showAutoModal("error", "Network Error");
  } finally {
    msgDiv.innerHTML = "";
    msgDiv.className = "";
  }
}

function showAutoModal(status, email) {
  const overlay = document.getElementById("modal-overlay");
  const icon = document.getElementById("modal-icon");
  const title = document.getElementById("modal-title");
  const userText = document.getElementById("modal-user");

  overlay.classList.remove("hidden");
  userText.innerHTML = email;

  // Set visual styles based on response
  if (status === "checked-in") {
    icon.innerHTML = "✅";
    title.innerHTML = "CONFIRMED";
    title.style.color = "#91c11e"; // Your HALO Lime
  } else if (status === "duplicate") {
    icon.innerHTML = "⚠️";
    title.innerHTML = "ALREADY IN";
    title.style.color = "#ef6c00";
  } else {
    icon.innerHTML = "❌";
    title.innerHTML = "ERROR";
    title.style.color = "#c0392b";
  }

  // 4. AUTOMATIC TIMER (3 Seconds)
  setTimeout(() => {
    overlay.classList.add("hidden");

    // Small extra delay before allowing the next scan
    // This prevents the camera from re-reading the SAME QR code immediately
    setTimeout(() => {
      isProcessing = false;
    }, 500);
  }, 3000);
}

/**
 * TAB NAVIGATION
 */
function showTab(tab, btn) {
  document
    .getElementById("create-section")
    .classList.toggle("hidden", tab !== "create");
  document
    .getElementById("scan-section")
    .classList.toggle("hidden", tab !== "scan");

  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));

  if (btn) {
    btn.classList.add("active");
  } else {
    document
      .getElementById(tab === "create" ? "btn-create" : "btn-scan")
      .classList.add("active");
  }

  if (tab === "scan") loadEvents();

  // Auto-stop camera if user leaves scanner tab
  if (tab === "create" && isScannerRunning) stopScanner();
}
