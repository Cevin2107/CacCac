import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TOKEN = process.env.FRIENDSHOUSE_TOKEN;

// ESM helpers for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());

// Maintenance Mode Middleware
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'TRUE') {
    return res.status(503).send(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <title>Bảo trì hệ thống</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background: #080B11; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: rgba(22, 29, 48, 0.45); border: 1px solid rgba(255, 255, 255, 0.08); padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); max-width: 500px; width: 90%; }
            h2 { color: #EF4444; margin-bottom: 16px; font-size: 24px;}
            p { color: #94A3B8; font-size: 16px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⛔ Đã Khóa</h2>
            <p>Hiện tại web đã dừng hoạt động, user không thể truy cập gì nữa.</p>
          </div>
        </body>
      </html>
    `);
  }
  next();
});

// Enable CORS for development mode if running on different ports
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static frontend files from 'dist' in production mode
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy Endpoint: Fetch list of Netflix projects
app.get('/api/netflix-free/links', async (req, res) => {
  try {
    if (!TOKEN) {
      return res.status(500).json({ success: false, error: 'Chưa cấu hình FRIENDSHOUSE_TOKEN trên server.' });
    }

    const response = await fetch('https://friendshouse.io.vn/api/netflix-free/links', {
      headers: {
        'Authorization': TOKEN
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ success: false, error: 'Không thể kết nối tới máy chủ nguồn.' });
  }
});

// Proxy Endpoint: Claim/create a Netflix session link
app.post('/api/netflix-free/claim', async (req, res) => {
  try {
    if (!TOKEN) {
      return res.status(500).json({ success: false, error: 'Chưa cấu hình FRIENDSHOUSE_TOKEN trên server.' });
    }

    const { cookie_id } = req.body;
    if (!cookie_id) {
      return res.status(400).json({ success: false, error: 'Thiếu tham số cookie_id.' });
    }

    const response = await fetch('https://friendshouse.io.vn/api/netflix-free/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
      },
      body: JSON.stringify({ cookie_id })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error claiming link:', error);
    res.status(500).json({ success: false, error: 'Không thể xử lý yêu cầu tạo link trên server.' });
  }
});

// Proxy Endpoint: Release/return a Netflix session link
app.post('/api/netflix-free/release', async (req, res) => {
  try {
    if (!TOKEN) {
      return res.status(500).json({ success: false, error: 'Chưa cấu hình FRIENDSHOUSE_TOKEN trên server.' });
    }

    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Thiếu tham số token của link hoạt động.' });
    }

    const response = await fetch('https://friendshouse.io.vn/api/netflix-free/release', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error releasing link:', error);
    res.status(500).json({ success: false, error: 'Không thể xử lý yêu cầu giải phóng link trên server.' });
  }
});

// Proxy Endpoint: Smart TV Login
app.post('/api/external/tv-login', async (req, res) => {
  try {
    if (!TOKEN) {
      return res.status(500).json({ success: false, error: 'Chưa cấu hình FRIENDSHOUSE_TOKEN trên server.' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Thiếu mã TV code.' });
    }

    // Auto decode user_id (sub claim) from JWT token on the server-side
    let userId;
    try {
      const payloadPart = TOKEN.split(' ')[1].split('.')[1];
      const payloadJson = Buffer.from(payloadPart, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      userId = parseInt(payload.sub);
    } catch (jwtErr) {
      console.error('Failed to parse userId from token:', jwtErr);
      return res.status(500).json({ success: false, error: 'Token cấu hình không đúng định dạng JWT.' });
    }

    if (!userId) {
      return res.status(500).json({ success: false, error: 'Không thể xác định user_id từ token.' });
    }

    // Clean code if it contains dash (e.g. 1234-5678 -> 12345678)
    const cleanCode = code.replace(/-/g, '').trim();

    const response = await fetch('https://friendshouse.io.vn/api/external/tv-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
      },
      body: JSON.stringify({ user_id: userId, code: cleanCode })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in tv-login proxy:', error);
    res.status(500).json({ success: false, error: 'Lỗi kết nối tới máy chủ Netflix TV login.' });
  }
});

// Fallback to index.html for single-page routing in production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Server
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`[Server Ready] Backend proxy server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless Function
export default app;
