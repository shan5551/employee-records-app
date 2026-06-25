const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'employees.json');

function readEmployees() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeEmployees(employees) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(employees, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    default: return 'text/plain; charset=utf-8';
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/employees') {
    sendJson(res, 200, readEmployees());
    return;
  }

  if (req.method === 'POST' && req.url === '/api/employees') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { mode = 'create', ...employee } = JSON.parse(body);
        const employees = readEmployees();
        const existingIndex = employees.findIndex((item) => item.id === employee.id);

        if (mode === 'create' && existingIndex >= 0) {
          sendJson(res, 409, { success: false, message: 'Employee ID already exists. Use a different ID for a new record.' });
          return;
        }

        if (mode === 'update' && existingIndex >= 0) {
          employees[existingIndex] = { ...employees[existingIndex], ...employee };
        } else if (mode === 'update') {
          sendJson(res, 404, { success: false, message: 'Employee not found for update.' });
          return;
        } else {
          employees.push(employee);
        }

        writeEmployees(employees);
        sendJson(res, 200, { success: true, employee });
      } catch (error) {
        sendJson(res, 400, { success: false, message: 'Invalid employee data' });
      }
    });
    return;
  }

  if (req.method === 'DELETE' && req.url.startsWith('/api/employees/')) {
    const id = req.url.split('/').pop();
    const employees = readEmployees().filter((employee) => employee.id !== id);
    writeEmployees(employees);
    sendJson(res, 200, { success: true });
    return;
  }

  const requestPath = req.url === '/' ? '/employee-form.html' : req.url;
  const safePath = path.normalize(requestPath).replace(/^\.(?=\/)/, '');
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    sendJson(res, 403, { success: false, message: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { success: false, message: 'Not found' });
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
