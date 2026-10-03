const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const url = process.env.MONGO_URL;
let col = null;
let memory = [];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('join', async () => {
    let list = memory;
    if (col) {
      try {
        list = (await col.find().sort({ time: -1 }).limit(200).toArray()).reverse();
      } catch (e) {
        console.log('Oqish xatosi:', e.message);
      }
    }
    list.forEach((m) => {
      socket.emit('chat message', { name: m.name, text: m.text, time: m.time });
    });
  });

  socket.on('chat message', async (data) => {
    const msg = {
      name: String(data.name || 'Nomalum').slice(0, 20),
      text: String(data.text || '').slice(0, 500),
      time: Date.now()
    };
    if (col) {
      try {
        await col.insertOne({ ...msg });
      } catch (e) {
        console.log('Yozish xatosi:', e.message);
      }
    } else {
      memory.push(msg);
      if (memory.length > 200) memory.shift();
    }
    io.emit('chat message', msg);
  });
});

async function start() {
  if (url) {
    try {
      const client = new MongoClient(url);
      await client.connect();
      col = client.db('sinfchat').collection('messages');
      console.log('Baza ulandi');
    } catch (e) {
      console.log('Baza xatosi:', e.message);
    }
  } else {
    console.log('MONGO_URL yoq: xabarlar vaqtincha xotirada saqlanadi');
  }
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log('Server ishlayapti: http://localhost:' + PORT);
  });
}
start();