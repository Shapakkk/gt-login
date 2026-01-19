const express = require('express');
const app = express();
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

// Middleware
app.use(compression({ level: 5 }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('trust proxy', 1);
app.use(cors());

// Rate Limiter
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

// Serve Public Files (Untuk Gambar & Favicon)
app.use(express.static(path.join(__dirname, 'public')));

// Logging
app.use(function (req, res, next) {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
  next();
});

// --- ROUTES ---

app.all('/player/login/dashboard', function (req, res) {
  const tData = {};
  try {
    if (req.body && JSON.stringify(req.body).includes('"')) {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n');
        if (uData[0]) {
            const uName = uData[0].split('|');
            const uPass = uData[1] ? uData[1].split('|') : [];
            for (let i = 0; i < uData.length - 1; i++) {
                const d = uData[i].split('|');
                if (d.length >= 2) tData[d[0]] = d[1];
            }
            if (uName[1] && uPass[1]) {
                return res.redirect('/player/growid/login/validate');
            }
        }
    }
  } catch (error) {
    console.log(`Error parsing body: ${error}`);
  }

  // BACA FILE HTML (Jalur Root / Sejajar dengan index.js)
  const dashboardPath = path.join(__dirname, 'dashboard.html');
  
  if (fs.existsSync(dashboardPath)) {
      let html = fs.readFileSync(dashboardPath, 'utf8');
      const modifiedHtml = html.replace('{{ data._token }}', JSON.stringify(tData));
      res.send(modifiedHtml);
  } else {
      res.status(500).send("Error: dashboard.html not found in root directory.");
  }
});

app.all('/player/growid/login/validate', (req, res) => {
  try {
    const _token = req.body._token || "";
    const growId = req.body.growId || "";
    const password = req.body.password || "";

    const token = Buffer.from(
      `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    res.send(
      `{"status":"success", "message":"Account Validated.", "token":"${token}", "url":"", "accountType":"growtopia"}`
    );
  } catch (error) {
    console.log(error);
    res.send(
      `{"status":"error", "message":"Account not valid.", "token":"", "accountType":"growtopia"}`
    );
  }
});

app.post('/player/growid/checkToken', (req, res) => {
  try {
    const { refreshToken, clientData } = req.body;
    if (!refreshToken || !clientData) {
      return res.status(400).send({ status: 'error', message: 'Missing Data' });
    }
    let decodeRefreshToken = Buffer.from(refreshToken, 'base64').toString('utf-8');
    const token = Buffer.from(
      decodeRefreshToken.replace(
        /(_token=)[^&]*/,
        `$1${Buffer.from(clientData).toString('base64')}`,
      ),
    ).toString('base64');

    res.send({ status: 'success', message: 'Token is valid.', token: token, url: '', accountType: 'growtopia' });
  } catch (error) {
    res.status(500).send({ status: 'error', message: 'Internal Server Error' });
  }
});

app.get('/', function (req, res) {
  res.send('Server is running properly.');
});

module.exports = app;