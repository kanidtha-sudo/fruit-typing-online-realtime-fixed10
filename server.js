const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;
const TEACHER_PIN = '2516'; // รหัสครู
const DATA_FILE = path.join(__dirname, 'records.json');

let records = [];
try {
  if (fs.existsSync(DATA_FILE)) records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
} catch (e) {
  console.error('อ่าน records.json ไม่สำเร็จ:', e.message);
  records = [];
}

function saveRecords() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf8'); }
  catch (e) { console.error('บันทึกคะแนนไม่สำเร็จ:', e.message); }
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req,res) => res.json({ok:true, records:records.length}));

io.on('connection', socket => {
  socket.emit('recordsSnapshot', records);

  socket.on('teacherLogin', ({pin}, reply) => {
    const ok = String(pin || '') === String(TEACHER_PIN);
    socket.data.isTeacher = ok;
    if (ok) socket.emit('recordsSnapshot', records);
    if (typeof reply === 'function') reply(ok);
  });

  socket.on('submitRecord', record => {
    if (!record || !record.name || !record.dept) return;
    const clean = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      dept: String(record.dept).slice(0,100),
      code: String(record.code || '').slice(0,2),
      no: String(record.no || '').slice(0,3),
      name: String(record.name).slice(0,120),
      score: Number(record.score) || 0,
      caught: Number(record.caught) || 0,
      lives: Number(record.lives) || 0,
      time: String(record.time || '').slice(0,80)
    };
    records.push(clean);
    saveRecords();
    io.emit('recordAdded', clean);
  });

  socket.on('clearRecords', () => {
    if (!socket.data.isTeacher) return;
    records = [];
    saveRecords();
    io.emit('recordsCleared');
  });
});

server.listen(PORT, () => console.log(`Fruit typing server running on port ${PORT}`));
