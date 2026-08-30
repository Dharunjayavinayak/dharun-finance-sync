// Sheet IDs
// (Ensure your EXPENSES_SHEET_ID and INVESTMENTS_SHEET_ID definitions are at the top)

const EXPENSE_MAP = {
  "Hdfc": "HDFC",
  "Iob": "IOB",
  "Canara": "Canara"
};
const INVESTMENT_TABS = ["Stocks", "SIP", "GoldSilver"];

// NORMALIZE ANY DATE TO STRICT DD-MM-YYYY
function formatToDDMMYYYY(cellValue) {
  if (!cellValue) return "";

  // 1. Native Date object
  if (cellValue instanceof Date) {
    return Utilities.formatDate(cellValue, Session.getScriptTimeZone(), "dd-MM-yyyy");
  }

  var dateStr = String(cellValue).trim();
  var parts = dateStr.split(/[-/]/);

  if (parts.length === 3) {
    // If format is YYYY-MM-DD
    if (parts[0].length === 4) {
      var year = parts[0];
      var month = parts[1].padStart(2, '0');
      var day = parts[2].padStart(2, '0');
      return day + "-" + month + "-" + year;
    }
    // If format is DD-MM-YYYY
    var day = parts[0].padStart(2, '0');
    var month = parts[1].padStart(2, '0');
    var year = parts[2];
    return day + "-" + month + "-" + year;
  }

  return dateStr;
}

// CLEAN NUMERIC VALUES
function cleanNumber(val) {
  if (val === "" || val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  var cleaned = String(val).replace(/[^0-9.-]+/g, "");
  return Number(cleaned) || 0;
}

// 1. FETCH & PROCESS DATA (GET REQUEST)
function doGet(e) {
  var result = { 
    expenses: { HDFC: [], IOB: [], Canara: [] }, 
    investments: { Stocks: [], SIP: [], GoldSilver: [] }
  };
  
  // ---- PROCESS EXPENSES ----
  var expSS = SpreadsheetApp.openById(EXPENSES_SHEET_ID);
  Object.keys(EXPENSE_MAP).forEach(function(realTabName) {
    var sheet = expSS.getSheetByName(realTabName);
    if (sheet) {
      var rawValues = sheet.getDataRange().getValues();
      var rows = rawValues.slice(1);
      var frontendKey = EXPENSE_MAP[realTabName];
      
      result.expenses[frontendKey] = rows.filter(function(row) { return row[0]; }).map(function(row, idx) {
        return {
          id: frontendKey.toLowerCase() + "-row-" + idx,
          date: formatToDDMMYYYY(row[0]),
          category: String(row[1] || "").trim(),
          reason: String(row[2] || "").trim(),
          credit: cleanNumber(row[3]),
          cost: cleanNumber(row[4]),
          balance: cleanNumber(row[5])
        };
      });
    }
  });
  
  // ---- PROCESS INVESTMENTS ----
  var invSS = SpreadsheetApp.openById(INVESTMENTS_SHEET_ID);
  
  // Stocks Sheet
  var stockSheet = invSS.getSheetByName("Stocks");
  if (stockSheet) {
    var rows = stockSheet.getDataRange().getValues().slice(1);
    result.investments.Stocks = rows.filter(function(row) { return row[0]; }).map(function(row, idx) {
      var buyPrice = cleanNumber(row[3]);
      return {
        id: "stock-" + idx,
        date: formatToDDMMYYYY(row[0]),
        group: String(row[1] || "").trim(),
        name: String(row[2] || "").trim(),
        price: buyPrice,
        qty: cleanNumber(row[4]),
        amount: cleanNumber(row[5] || (buyPrice * cleanNumber(row[4]))),
        currentPrice: cleanNumber(row[5] || buyPrice)
      };
    });
  }
  
  // SIP Sheet
  var sipSheet = invSS.getSheetByName("SIP");
  if (sipSheet) {
    var rows = sipSheet.getDataRange().getValues().slice(1);
    result.investments.SIP = rows.filter(function(row) { return row[0]; }).map(function(row, idx) {
      var amount = cleanNumber(row[3]);
      return {
        id: "sip-" + idx,
        date: formatToDDMMYYYY(row[0]),
        group: String(row[1] || "").trim(),
        name: String(row[2] || "").trim(),
        amount: amount,
        currentValue: cleanNumber(row[4] || amount)
      };
    });
  }

  // Gold & Silver Sheet
  var gsSheet = invSS.getSheetByName("GoldSilver");
  if (gsSheet) {
    var rows = gsSheet.getDataRange().getValues().slice(1);
    result.investments.GoldSilver = rows.filter(function(row) { return row[0]; }).map(function(row, idx) {
      var buyPrice = cleanNumber(row[3]);
      return {
        id: "gs-" + idx,
        date: formatToDDMMYYYY(row[0]),
        group: String(row[1] || "").trim(),
        name: String(row[2] || "").trim(),
        price: buyPrice,
        qty: cleanNumber(row[4]),
        amount: cleanNumber(row[5] || (buyPrice * cleanNumber(row[4]))),
        currentPrice: cleanNumber(row[5] || buyPrice)
      };
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
                       .setMimeType(ContentService.MimeType.JSON);
}

// 2. REMOTE INSERT & DELETE OPERATIONS (POST REQUEST)
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    
    var targetTabName = params.sheetName;
    if (targetTabName === "HDFC") targetTabName = "Hdfc";
    if (targetTabName === "IOB") targetTabName = "Iob";
    
    var isExpense = (targetTabName === "Hdfc" || targetTabName === "Iob" || targetTabName === "Canara");
    var ss = SpreadsheetApp.openById(isExpense ? EXPENSES_SHEET_ID : INVESTMENTS_SHEET_ID);
    var sheet = ss.getSheetByName(targetTabName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Sheet not found"}))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // DELETE RECORD
    if (params.action === "delete") {
      var data = sheet.getDataRange().getValues();
      var targetDateStr = formatToDDMMYYYY(params.date);
      var targetIdentifier = String(params.reason || params.name).trim();
      
      for (var i = data.length - 1; i >= 1; i--) {
        var currentRowDateStr = formatToDDMMYYYY(data[i][0]);
        var currentRowIdentifier = String(isExpense ? data[i][2] : data[i][2]).trim();
        
        if (currentRowDateStr === targetDateStr && currentRowIdentifier === targetIdentifier) {
          sheet.deleteRow(i + 1);
          break; 
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ADD RECORD
    if (params.action === "add") {
      var nativeSheetDate = formatToDDMMYYYY(params.date);
      var rowData = [];
      
      if (isExpense) {
        // Date | Category | Reason | Credit | Cost | Balance
        rowData = [
          nativeSheetDate,
          params.category || "General",
          params.reason || "Expense",
          cleanNumber(params.credit) || "",
          cleanNumber(params.cost) || "",
          cleanNumber(params.balance) || ""
        ];
      } else {
        var groupVal = params.group ? String(params.group).trim() : "General";
        var nameVal = params.name ? String(params.name).trim() : "";

        if (targetTabName === "SIP") {
          var sipAmt = cleanNumber(params.amount);
          // Date | Group | Name | Amount | CurrentValue
          rowData = [nativeSheetDate, groupVal, nameVal, sipAmt, sipAmt];
        } else {
          // Stocks and GoldSilver: Date | Group | Name | Price | Qty | Amount
          var unitPrice = cleanNumber(params.price);
          var quantity = cleanNumber(params.qty);
          var totalAmount = unitPrice * quantity;
          rowData = [nativeSheetDate, groupVal, nameVal, unitPrice, quantity, totalAmount];
        }
      }
      
      sheet.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
                           .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", error: err.toString()}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}