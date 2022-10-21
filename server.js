const path = require("path");
const http = require("http");
const express = require("express");
const router = express.Router();

const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
require("dotenv").config();
const body_parser = require('body-parser');
// const { createClient } = redis;
const cors = require('cors');

const app = express().use(body_parser.json());
const corsOptions = {
  credentials: true, // This is important.
  origin: (origin, callback) => {
    return callback(null, true);
    if (whitelist.includes(origin)) return callback(null, true);

    callback(new Error('Not allowed by CORS'));
  },
};
var ObjectId = require('mongodb').ObjectID;
const axios = require('axios');
app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://157.245.151.65");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://157.245.151.65",
    methods: ["GET", "POST"]
  }
});
const baseUrl = 'https://game.pokertime.one';
// const io = socketio(server);
require("./models/Message");
require("./models/User");

const mongoose = require("mongoose");

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DATABASE, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

mongoose.connection.on("error", (err) => {
  console.log("Mongoose Connection ERROR: " + err.message);
});

mongoose.connection.once("open", () => {
  console.log("MongoDB Connected!");
});

const Message = mongoose.model("Message");
const User = mongoose.model("User");
// app.use(cors())
// Set static folder
// app.use(express.static(path.join(__dirname, "public")));

const {
  userJoin,
  getCurrentUser,
  userLeave,
} = require("./utils/users");

/* Message.find({}).deleteMany({}, (err, col) => {
  if(err) throw err;
  console.log(col);
}); */
/* const demouser = new User();
demouser.username = 'Aagii';
demouser.password = 'Pass#123';
demouser.save(); */
// Run when client connects
io.on("connection", (socket) => {

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);
    updateList();
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", msg);
  });

  app.post('/api/newmessage', async function (req, res, next) {
    const { sessionId } = req.body;
    const data = extractData(req.body)
    console.log('ExtractedData', data);
    if(data.status !== 2){
      const doc = new Message();
      await doc.save(); 
      doc.ConfirmationId = '';
      doc.amount = data.amount;
      doc.username = data.username;
      doc.errorText = data.error;
      doc.status = 1;
      doc.sender = data.sender;
      doc.body = data.body;
      doc.timestamp = data.timestamp;
      await doc.save();
      updateList();
      res.json({msg: 'success'})
    } else {
      const doc = new Message();
      await doc.save(); 
      try {
        const res = await axios.get(`${baseUrl}/Deposit?username=${data.username}&amount=${data.amount}&sessionId=${sessionId}`);
        if (res.data['ConfirmationId'] != null) {
          doc.ConfirmationId = res.data['ConfirmationId'];
          doc.amount = data.amount;
          doc.username = data.username;
          doc.errorText = '';
          doc.status = 2;
          doc.sender = data.sender;
          doc.body = data.body;
          doc.timestamp = data.timestamp;
          await doc.save();
        } else {
          doc.ConfirmationId = '';
          doc.amount = data.amount;
          doc.username = data.username;
          doc.errorText = res.data["Error"];
          doc.status = 1;
          doc.sender = data.sender;
          doc.body = data.body;
          doc.timestamp = data.timestamp;
          await doc.save();
        }
      } catch (error) {
        doc.ConfirmationId = '';
        doc.amount = data.amount;
        doc.username = data.username;
        doc.errorText = error.response.data["Error"];
        doc.status = 1;
        doc.sender = data.sender;
        doc.body = data.body;
        doc.timestamp = data.timestamp;
        await doc.save();
      } finally {
        updateList();
        res.json({msg: 'success'})
      }
    }
  });

  app.post('/api/delete', async function (req, res, next) {
    const {id} = req.body;
    Message.find({}).deleteOne({_id: id}, () => {
      console.log('deleted');
    });
    res.json({msg: 'success'});
  });

  app.get('/api/successlist', async function (req, res, next) {
    const {id} = req.body;
    Message.find({status: 2}).then(messages => {
      res.json({msg: 'success', messages});
    });
  });

  app.get('/api/failedlist', async function (req, res, next) {
    const {id} = req.body;
    Message.find({status: 1}).then(messages => {
      res.json({msg: 'success', messages});
    });
  });

  app.get('/api/refresh', async function (req, res, next) {
    updateList();
    res.json({msg: 'success'});
  });

  app.post('/api/search', async function (req, res, next) {
    const { username } = req.body
    const searchList = await Message.find({username});
    res.json({msg: 'success', searchList});
  });

  app.post('/api/delete/success', async function (req, res, next) {
    const { token } = req.body
    if(token !== '')
    Message.find({status: 2}).deleteMany({}, (err, col) => {
      if(err) throw err;
      console.log(col);
    });
    updateList();
    res.json({msg: 'success'});
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
  });

  function updateList() {
    Message.find({status: 2}).sort({ "timestamp": -1 }).limit(100).then(messages => {
      socket.broadcast
        .to('Javascript')
        .emit(
          "successList",
          messages
        );
    });
    Message.find({status: 1}).sort({ "timestamp": -1 }).limit(100).then(messages => {
      socket.broadcast
        .to('Javascript')
        .emit(
          "failedList",
          messages
        );
    });
  }
});

function extractData(msg) {
  if (msg.sender != '131917' &&
      msg.sender != '133133' &&
      msg.sender != 'Khanbank' &&
      msg.sender != '80102053') return;
  // MM: ХААНА
  let username = '';
  let amount = 0;
  let str = msg.body.toLowerCase();
  let data = {
    sender: msg.sender,
    body: str,
    timestamp: msg.timestamp,
    status: 0,
    username: '',
    amount: 0,
    error: '',
  };
  // Khanbank
  if (msg.sender == '131917' ||
      msg.sender == '80102053' ||
      msg.sender == 'Khanbank') {
        try {
          // Get Amount
          let expAmount = /orlogo:(.*?)[.][\d]+mnt/g;
          let amountMatch = str.match(expAmount);
          if (!amountMatch || !amountMatch[0]) {
            data.status = 1;
            data.error = 'Цэнэглэх дүн олдсонгүй';
            return data;
          }
          let amountStr = amountMatch[0].replace(',', '');
          amountStr = amountStr.replace('orlogo:', '');
          amountStr = amountStr.replace('.00mnt', '');
          amount = parseInt(amountStr);
          //amount = parseInt(amountMatch[0].replaceAll(',', '').replaceAll('orlogo:', '').replaceAll('.00mnt', ''));
          // Get Username
          let expUser = /(?<=utga:).*$/;
          let userMatch = str.match(expUser);
          if (!userMatch) {
            data.status = 1;
            data.error = 'Нэр нь олдсонгүй';
            return data;
          }
          username = userMatch[0];
          if (username.indexOf('(') > -1) {
            username = username.split('(')[0];
          }
          username = username.trim()
              .replace(' ', '')
              .replace('mm:', '')
              .replace('eb-', '');
        } catch (error) {
          data.status = 1;
          data.error = error;
          return data;
        }
  }
  // TDB
  if (msg.sender == '133133' || msg.sender == '98950575') {
    try {
      let expAmount = /dansand(.*?)[.][\d]+mnt/g;
      let matchAmount = str.match(expAmount);
      if (!matchAmount || !matchAmount[0]) {
        data.status = 1;
        data.error = 'Цэнэглэх дүн олдсонгүй';
        return data;
      }
      amount = parseInt(matchAmount[0].replace(',', '').replace('dansand', '').replace('.00mnt', ''));
      // Username
      username = str.match(/(.*)(?=(\n.*){1}$)/g);
      if (!username || !username[0]) {
        data.status = 1;
        data.error = 'Нэр нь олдсонгүй';
        return data;
      }
      username = username[0].replace('utga:', '');
      if (username.indexOf('(') > -1) {
        username = username.split('(')[0];
      }
      if (username.indexOf('/') > -1) {
        username = username.split('/')[0];
      }
      username = username.trim()
          .replace(' ', '')
          .replace('eb-', '')
          .replace('mm:', '');
      username = username.replace(/\s?\d{2}\/\d{2}\/\d{2}\s\d{2}\:\d{2}\:\d{2}/g, '');
    } catch (error) {
      data.status = 1;
      data.error = error;
      return data;
    }
  }
  if (username == '' || amount == 0) {
    data.status = 1;
    data.error = 'Нэр эсвэл дүн нь олдсонгүй';
    return data;
  };
  data.status = 2;
  data.username = username;
  data.amount = amount;
  return data;
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
