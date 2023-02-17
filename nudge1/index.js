const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server, Socket } = require("socket.io");
const io = new Server(server);
const path = require('path');
const cors = require('cors');
var port = process.env.PORT || 2001

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.engine('html', require('ejs').renderFile);

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Get teacher rooms (Dynamically created)
app.get('/room/', (req,res) => {
  var name = req.query.name;
  res.render(path.join(__dirname,'/','teacherside.html'),{rooms: name});
})

// Get student rooms
app.get('/student/', (req,res) => {
  var code = req.query.code;
  res.render(path.join(__dirname,'/','studentRooms.html'),{studentRooms: code});
})

const adminNameSpace = io.of('/admin'); 

// Create to hold room data
// I think I will need better way to do this
let roomClicks = {};
let roomConnections = {};

adminNameSpace.on('connection', (socket) => {

  const _id = socket.id //JZHAO
  var myMap = {};
 
  socket.on('join', (data)=>{
    socket.join(data.room);
    console.log(data.room);
    myMap[_id]=data.room; //JZHAO
    // Make new var to hold data for clicks in room
    if (!roomClicks[data.room]) {
        roomClicks[data.room] = 0;
    }
    if (!roomConnections[data.room]) {
      roomConnections[data.room] = 0;
    }
    // Make new var to hold data for connected users in room
  });

  socket.on('student join', (data)=>{
    const teacher_room = data.room.substring(0, data.room.length-6);
    roomConnections[teacher_room]++;
    adminNameSpace.in(data.room).emit('chat message', `New Person joined the ${data.room} room`);
    adminNameSpace.in(teacher_room).emit('student join', roomClicks[teacher_room], roomConnections[teacher_room]);
  });
  
  socket.on('disconnect', () => {
    console.log(`disconnected from the ${myMap[_id]}`);
    const teacher_room = myMap[_id].substring(0, myMap[_id].length-6);
    roomConnections[teacher_room]--;
    adminNameSpace.in(teacher_room).emit('student unjoin', roomClicks[teacher_room], roomConnections[teacher_room]);    
  });


  // Track number of clicks
  socket.on('clicked', (data) => {
    
    // Taking student name that the data is coming from and translating to teacher room name
    const teacher_room = data.room.substring(0, data.room.length-6);
    roomClicks[teacher_room]++;
  
    // Sending info to teacher side
    adminNameSpace.in(teacher_room).emit('student join', roomClicks[teacher_room], roomConnections[teacher_room]);
  });

  socket.on('unclicked', (data) => {
    const teacher_room = data.room.substring(0, data.room.length-6);
    roomClicks[teacher_room]--;
    adminNameSpace.in(teacher_room).emit('unclicked', roomClicks[teacher_room], roomConnections[teacher_room]);
  })
  
  socket.on('chat message', (data) => {
    adminNameSpace.in(data.room).emit('chat message', data.msg);
    console.log('chatted');
  });
  
});

server.listen(port, () => {
  console.log('listening on *:2001');
});
