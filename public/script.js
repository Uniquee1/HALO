const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbx_RcsAdBewQY_jWkQ9dknhcoH7ram5hvT_T9aQK9j_iEzuzQQl21aGnY40QQTuNKPM/exec";
let html5QrCode;

async function handleCreateEvent() {
  const data = {
    action: "CREATE_EVENT",
    name: document.getElementById("event-name").value,
    date: document.getElementById("event-date").value,
    venue: document.getElementById("event-venue").value,
  };

  const response = await fetch(WEB_APP_URL, {
    method: "POST",
    mode: "no-cors", // Note: Apps Script requires careful CORS handling
    body: JSON.stringify(data),
  });
  alert("Event Created! (Check Google Drive)");
  location.reload();
}

let allEvents = []; // Global variable to store event details

async function loadEvents() {
  const resp = await fetch(WEB_APP_URL);
  allEvents = await resp.json(); // Store the array here
  const dropdown = document.getElementById("event-dropdown");
  dropdown.innerHTML = '<option value="">Select an Event</option>';

  allEvents.forEach((ev) => {
    let opt = document.createElement("option");
    opt.value = ev.id; // This is the Spreadsheet ID
    opt.text = `${ev.name} (${ev.date})`;
    dropdown.add(opt);
  });
}

function toggleScannerBtn() {
  const btn = document.getElementById("open-cam-btn");
  btn.className = document.getElementById("event-dropdown").value
    ? ""
    : "hidden";
}

function startScanner() {
  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    onScanSuccess
  );
}

async function onScanSuccess(decodedText) {
  const eventId = document.getElementById("event-dropdown").value;
  if (!eventId) return;

  await html5QrCode.stop();
  const msgDiv = document.getElementById("status-msg");

  // Find the event details from our local list
  const selectedEvent = allEvents.find((ev) => ev.id === eventId);

  // Build the URL carefully
  // We use encodeURIComponent to handle spaces in Venue or Event Names
  const url =
    `${WEB_APP_URL}?action=SCAN_ATTENDANCE` +
    `&email=${encodeURIComponent(decodedText)}` +
    `&eventId=${eventId}` +
    `&eventName=${encodeURIComponent(selectedEvent.name)}` +
    `&venue=${encodeURIComponent(selectedEvent.venue)}` +
    `&date=${encodeURIComponent(selectedEvent.date)}`;

  console.log("Sending to Google:", url); // Check your console to see if this looks right!

  try {
    const resp = await fetch(url);
    const result = await resp.json();

    if (result.status === "duplicate") {
      msgDiv.innerHTML = "⚠️ Already checked in";
      msgDiv.className = "error";
    } else {
      msgDiv.innerHTML = "✅ Attendance Confirmed";
      msgDiv.className = "success";
    }
  } catch (error) {
    msgDiv.innerHTML = "❌ Error. Check Console.";
    console.error(error);
  }

  setTimeout(() => {
    msgDiv.innerHTML = "";
    startScanner();
  }, 3000);
}

function showTab(tab) {
  document
    .getElementById("create-section")
    .classList.toggle("hidden", tab !== "create");
  document
    .getElementById("scan-section")
    .classList.toggle("hidden", tab !== "scan");
  if (tab === "scan") loadEvents();
}
