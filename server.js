const path = require("path");
const http = require("http");
const express = require("express");
const router = express.Router();

const redis = require("redis");
require("dotenv").config();
const body_parser = require('body-parser');
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

const api = 'http://157.245.151.65:5000';

/* app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://157.245.151.65");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
}); */

app.use((req, res, next) => {
  /* const allowedOrigins = ["http://157.245.151.65", "https://autodepositor.com", 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
       res.setHeader('Access-Control-Allow-Origin', origin);
  } */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: '*', // ["http://157.245.151.65", "https://autodepositor.com"], // "http://localhost:3000", //"http://157.245.151.65", // "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "OPTIONS"]
  }
});
const baseUrl = 'https://game.pokertime.one';
// const io = socketio(server);
require("./models/Message");
require("./models/ErrorLog");

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
const ErrorLog = mongoose.model("ErrorLog");
// const User = mongoose.model("User");
// app.use(cors())
// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const {
  userJoin,
  getCurrentUser,
  userLeave,
} = require("./utils/users");
const { errorMonitor } = require("events");

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
    if(room == 'one'){
      updateOneList();
    }else{
      updateList();
    }
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", msg);
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
    Message.find({status: 1}).then(messages => {
      res.json({msg: 'success', messages});
    });
  });

  app.get('/api/refresh/time', async function (req, res, next) {
    updateList();
    res.json({msg: 'success'});
  });

  app.get('/api/refresh/one', async function (req, res, next) {
    updateOneList();
    res.json({msg: 'success'});
  });

  app.post('/api/search', async function (req, res, next) {
    const { username, app } = req.body
    let searchList =[];
    if(app == 'one'){
      searchList = await Message.find({sender: "onepoker", username});
    }else{
      searchList = await Message.find({sender: {$ne: "onepoker"}, username});
    }
    res.json({msg: 'success', searchList});
  });

  app.post('/api/delete/success', async function (req, res, next) {
    const { token, app } = req.body
    if(token === '4523bbb27f114137a4169da1c5e7fda0') {
      if(app == 'one'){
        Message.find({sender: "onepoker", status: 2}).deleteMany({}, (err, col) => {
          if(err) throw err;
          console.log(col);
        });
        updateOneList();
      }else{
        Message.find({sender: {$ne: "onepoker"}, status: 2}).deleteMany({}, (err, col) => {
          if(err) throw err;
          console.log(col);
        });
        updateList();
      }
      
      res.json({msg: 'success'});
    }else{
      res.json({msg: 'invalid token'});
    }
  });

  function updateList() {
    console.log('UpdateList called')
    try {
      Message.find({status: 2, sender: {$ne : "onepoker"}}).sort({ "timestamp": -1}).limit(30)
        .then(messages => {
          socket.broadcast
            .to('time')
            .emit(
              "successList",
              messages
            );
        });
      Message.find({status: 1, sender: {$ne : "onepoker"}}).sort({ "timestamp": -1 }).limit(30)
        .then(messages => {
          socket.broadcast
            .to('time')
            .emit(
              "failedList",
              messages
            );
        });
    } catch (error) {
      console.log('UpdateList catch error', Object.keys(error.response))
    }
  }

  function updateOneList() {
    console.log('UpdateList called')
    try {
      Message.find({status: 2, sender: "onepoker"}).sort({ "timestamp": -1}).limit(30)
        .then(messages => {
          socket.broadcast
            .to('one')
            .emit(
              "successList",
              messages
            );
        });
      Message.find({status: 1, sender: "onepoker"}).sort({ "timestamp": -1 }).limit(30)
        .then(messages => {
          socket.broadcast
            .to('one')
            .emit(
              "failedList",
              messages
            );
        });
    } catch (error) {
      console.log('UpdateList catch error', Object.keys(error.response))
    }
  }

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
  });

});
app.get('/', async function (req, res, next) {
  updateList();
  return res.json({msg: 'success'});
});

app.post('/api/webhook', async function (req, res) {
  const data = req.body;
  //console.log('Webhook', data);
  if(!data.username){
    return res.json({result: 'empty'});
  }
  const doc = new Message();
  await doc.save(); 
  doc.ConfirmationId = '';
  doc.amount = data.amount;
  doc.username = data.username;
  doc.errorText = data.error ? data.error : '';
  doc.status = data.status;
  doc.sender = data.app;
  doc.body = data.smsBody;
  doc.timestamp = data.timestamp;
  await doc.save();
  try {
    await axios.get(`${api}/api/refresh/one`)
  } catch (error) {
    console.log('webhook refresh error')
  }
  return res.json({result: 'success'});
});

app.get('/api/callback/:username/:amount/:id/:mnt', async function (req, res) {
  const {username, amount, id, mnt} = req.params;
  //console.log('callback: ', username, amount, id, mnt);
  const d = new Date();
  const doc = new Message();
  await doc.save(); 
  doc.ConfirmationId = 0;
  doc.amount = amount;
  doc.username = username;
  doc.errorText = '';
  doc.status = 2;
  doc.sender = 'pokertime';
  doc.body = id;
  doc.timestamp = d.getTime();
  await doc.save();
  try {
    await axios.get(`${api}/api/refresh/time`)
  } catch (error) {
    console.log('callback refresh error')
  }
  return res.json({result: 'success'});
});

app.post('/api/newmessage', async function (req, res) {
  const data = extractData(req.body);
  //console.log('ExtractedData', data);
  //return res.json({result: data});
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
    try {
      await axios.get(`${api}/api/refresh/time`)
    } catch (error) {
      console.log('socket is offline')
      const err = new ErrorLog();
      err.amount = data.amount;
      err.username = data.username;
      err.body = data.body;
      err.sender = data.sender;
      err.timestamp = data.timestamp;
      err.location = '#1';
      err.errorText = 'socket is offline';
      await err.save();
    }
    return res.json({msg: 'success'})
  } else {
    console.log('Amjilttai');
    setTimeout(async () => {
      const now = new Date();
      const end = now.getTime() + 10000;
      const start = end - 1000 * 60 * 5;
      var regex = new RegExp(["^", data.username, "$"].join(""), "i");
      console.log('regex', regex);
      await Message.find({sender: {$ne: "onepoker"}, username: regex, amount: data.amount, timestamp: {$gte: start, $lte: end}})
        .sort({ "timestamp": -1 }).then(async messages => {
          console.log('SuccessCheck', messages);
          console.log('username: ', data.username, 'amount:', data.amount, '$gte:', start, '$lte:', end);
          if(messages.length > 0){
            messages[messages.length - 1].body = data.body;
            messages[messages.length - 1].save();
            try {
              await axios.get(`${api}/api/refresh/time`);
            } catch (error) {
              console.log('344', error)
            }
          } else {
            const doc = new Message();
            await doc.save(); 
            doc.ConfirmationId = '';
            doc.amount = data.amount;
            doc.username = data.username;
            doc.errorText = 'Амжилтгүй';
            doc.status = 1;
            doc.sender = data.sender;
            doc.body = data.body;
            doc.timestamp = data.timestamp;
            await doc.save();
            try {
              await axios.get(`${api}/api/refresh/time`);
            } catch (error) {
              console.log('348', error)
            }
          }
        });
    }, 5000);
  }
  
});

app.get('/api/delete/:from/:to', async function (req, res) {
  const {from, to} = req.params;
  console.log('delete api');
  Message.find({sender: {$ne: "onepoker"}, status: 1, timestamp: {$gte: from, $lte: to}}).deleteMany({}, (err, col) => {
    if(err) throw err;
    console.log(col);
  });

  res.json({msg: 'success'});  
});

app.get('/api/report/:start/:end/:app', async function (req, res) {
  const {start, end, app} = req.params;
  /* const messages = await  */
  let messages = [];
  if(app == 'one'){
    messages = await Message.find({sender: "onepoker", timestamp: {$gte: start, $lte: end}}).sort({ "timestamp": -1 });
  } else {
    messages = await Message.find({sender: {$ne: "onepoker"}, timestamp: {$gte: start, $lte: end}}).sort({ "timestamp": -1 });
  }
  res.json({msg: 'success', messages});  
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
          amountStr = amountMatch[0].replace(',', '');
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
          username = username
              .replace('mm:', '')
              .replace('eb-', '')
              .replace('eb -', '')
              .trim();
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
      amount = parseInt(matchAmount[0].replace(',', '').replace(',', '').replace('dansand', '').replace('.00mnt', ''));
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
      username = username
          .replace('eb-', '')
          .replace('eb -', '')
          .replace('mm:', '')
          .trim();
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
