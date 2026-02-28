const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 9999;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/v1/webrtc-stats', (req, res) => {
  // console.log('Received body:');
  // console.log(JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});