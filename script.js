function addAccountRow() {
  const tableBody = document.getElementById('accountTableBody');
  const row = document.createElement('tr');

  row.innerHTML = `
  <td><input type="text" class="accountNameInput" /></td>
  <td><input type="text" class="accountIdInput" /></td>
  <td><input type="text" class="crmAccountNameInput" /></td>
  <td><button onclick="this.parentElement.parentElement.remove()">Remove</button></td>
  `;


  tableBody.appendChild(row);
  }
document.getElementById('addRowBtn').addEventListener('click', addAccountRow);

function buildAccountLookupFromTable() {
  const lookup = {};
  const rows = document.querySelectorAll('#accountTableBody tr');

  rows.forEach(row => {
    const key = row.querySelector('.accountNameInput')?.value.trim().toLowerCase();
    const accountId = row.querySelector('.accountIdInput')?.value.trim();
    const crmName = row.querySelector('.crmAccountNameInput')?.value.trim();

    if (key) {
      lookup[key] = {
        accountId,
        accountName: crmName || key // fallback to the original name if CRM name not given
      };
    }
  });

  return lookup;
}


document.getElementById('pasteCompanyBtn').addEventListener('click', () => {
  const input = document.getElementById('bulkCompanyPaste').value;
  const lines = input.split('\n').map(line => line.trim()).filter(Boolean);

  const existingCompanies = new Set(
    Array.from(document.querySelectorAll('.accountNameInput'))
      .map(input => input.value.trim().toLowerCase())
  );

  lines.forEach(company => {
    const normalized = company.toLowerCase();
    if (!existingCompanies.has(normalized)) {
      const tableBody = document.getElementById('accountTableBody');
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="text" class="accountNameInput" value="${company}" /></td>
        <td><input type="text" class="accountIdInput" /></td>
        <td><input type="text" class="crmAccountNameInput" /></td>
        <td><button onclick="this.parentElement.parentElement.remove()">Remove</button></td>
      `;
      tableBody.appendChild(row);
      existingCompanies.add(normalized);
    }
  });

  document.getElementById('bulkCompanyPaste').value = ''; // Clear after paste
});


document.getElementById('processBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('csvFileInput');
  const file = fileInput.files[0];
  if (!file) return alert('Please upload a CSV file.');

  // Get static inputs
  const stagingOwnerId = document.getElementById('ownerId').value;
  const salesGroup = document.getElementById('salesGroup').value;
  const inputSource = document.getElementById('inputSource').value;
  const origin = document.getElementById('origin').value;
  const originDate = document.getElementById('originDate').value;
  const countryCode = document.getElementById('countryCode').value;

  const reader = new FileReader();
  
  function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentValue || currentRow.length > 0) {
        currentRow.push(currentValue);
        rows.push(currentRow);
        currentRow = [];
        currentValue = '';
      }
      if (char === '\r' && nextChar === '\n') i++; // handle \r\n
    } else {
      currentValue += char;
    }
  }

  // Push last row
  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}



  reader.onload = function (e) {
    const csvText = e.target.result;
    const rows = parseCSV(csvText.trim());
    const headers = rows[0].map(h => h.trim().replace(/\r/g, '')); // Clean headers
    const dataRows = rows.slice(1);

    const accountLookup = buildAccountLookupFromTable();

    const stagedRows = dataRows.map(row => {
      const rowObj = Object.fromEntries(row.map((val, i) => [headers[i], val.trim()]));
      const companyName = rowObj['Company Name']?.trim() || '';
      const match = accountLookup[companyName.toLowerCase()] || {};

      return {
        'Staging Owner ID': stagingOwnerId,
        'Contact ID':'',
        'Sales Group': salesGroup,
        'Contact Input Source': inputSource,
        'Origin': origin,
        "Origin Date ('yyyy-mm-dd)": originDate,
        'Prefix': '', // Empty for now
        'First Name': rowObj['First Name'] || '',
        'Middle Name': rowObj['Middle Name'] || '',
        'Last Name': rowObj['Last Name'] || '',
        'Suffix': '',
        'Job Title 1': rowObj['Job Title'] || '',
        'Job Title 2': '',
        'Hierarchy Level': '',
        'Functional Domain': '',
        'LinkedIn': '',
        'Include in Gainsight (Yes/No)': '',
        
        'Account ID': match.accountId || '',
        'Account Name': match.accountName || companyName,
        'Department': '',
        'Country Code': countryCode,
        'Address 1': '',
        'Address 2': '',
        'Address 3': '',
        'Address 4': '',
        'Address Type': '',
        'City': '',
        'State': '',
        'Postal Code': '',
        'Business Phone': rowObj['Direct Phone Number'] || '',
        'Home Phone': '',
        'Pager Phone': '',
        'Mobile Phone': rowObj['Mobile phone'] || '',
        'Fax Phone': '',
        'Business E-mail': rowObj['Email Address'] || '',
        'Alternate E-mail': '',
        'No Mail Reason': '',
        'Language': '',
        'Gender': '',
        "Assistant's Name": '',
        "Assistant's Phone Number": '',
        "Assistant's E-mail": '',
        'Contact Note': '',
        'Interested Party ID(s)': '',
        'Job Function': ''
      };
    });

    const stagedHeaders = Object.keys(stagedRows[0]);
    const stagedCsv = [stagedHeaders.join(',')].concat(
      stagedRows.map(row => stagedHeaders.map(h => `"${row[h] || ''}"`).join(','))
    ).join('\n');

    downloadCSV(stagedCsv);
  };

  reader.readAsText(file);
});

function downloadCSV(csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.getElementById('downloadLink');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'staged_contacts.csv');
  link.style.display = 'inline';
  link.textContent = 'Download Staged CSV';
}


window.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedDate = `('${yyyy}-${mm}-${dd})`; // include leading '

  document.getElementById('originDate').value = formattedDate;
});

