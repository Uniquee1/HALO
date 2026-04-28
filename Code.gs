// --- CONFIGURATION ---
const MASTER_SHEET_ID = "13pmDAQleG1QiO6-F6HLrCeL4yjv4LVEsBO5xY0YEll4";
const USER_DB_ID = "1SdqolNyk0uYApJElgTio1ZtyFd__JCphkBz7_XXiHiQ"; 

function doGet(e) {
  const action = e.parameter.action;
  
  if (!action) {
    try {
      const master = SpreadsheetApp.openById(MASTER_SHEET_ID).getSheets()[0];
      const data = master.getDataRange().getValues();
      const events = data.slice(1)
        .filter(row => row[3]) 
        .map(row => ({
          name: String(row[0]),
          date: String(row[1]),
          venue: String(row[2]),
          id: String(row[3])
        }));
      return ContentService.createTextOutput(JSON.stringify(events)).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (action === "SCAN_ATTENDANCE") {
    try {
      const eventId = e.parameter.eventId;
      const email = e.parameter.email.toLowerCase().trim();
      const eventName = e.parameter.eventName || "";
      const venue = e.parameter.venue || "";
      const date = e.parameter.date || "";

      let department = "Not Found";
      try {
        const userDbSheet = SpreadsheetApp.openById(USER_DB_ID).getSheets()[0];
        const userData = userDbSheet.getDataRange().getValues();
        for (let i = 1; i < userData.length; i++) {
          if (String(userData[i][0]).toLowerCase().trim() === email) {
            department = userData[i][1]; 
            break;
          }
        }
      } catch (f) { department = "DB Error"; }

      const ss = SpreadsheetApp.openById(eventId);
      const sheet = ss.getSheets()[0];
      const lastRow = sheet.getLastRow();
      let emails = [];
      if (lastRow > 0) {
        emails = sheet.getRange(1, 1, lastRow, 1).getValues().flat().map(val => String(val).toLowerCase().trim());
      }
      
      if (emails.includes(email)) {
        return ContentService.createTextOutput(JSON.stringify({ status: "duplicate" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      sheet.appendRow([email, new Date(), eventName, venue, date, department]); 
      return ContentService.createTextOutput(JSON.stringify({ status: "checked-in" })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  if (params.action === "CREATE_EVENT") {
    return createEvent(params);
  }
}

function createEvent(data) {
  const eventDate = String(data.date || "");
  const eventName = String(data.name || "Untitled Event");
  const eventVenue = String(data.venue || "");
  const fileName = `Event - ${eventName} - ${eventDate}`;
  
  try {
    // Standard creation in My Drive Root
    const ss = SpreadsheetApp.create(fileName);
    const ssId = ss.getId();
    const sheet = ss.getSheets()[0];
    
    sheet.appendRow(["Email", "Timestamp", "Event Name", "Venue", "Date", "Department"]);
    
    const master = SpreadsheetApp.openById(MASTER_SHEET_ID).getSheets()[0];
    master.appendRow([eventName, eventDate, eventVenue, ssId]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", id: ssId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
