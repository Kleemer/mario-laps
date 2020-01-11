require('dotenv').config()

const express = require('express')
const app = new express()
const cors = require('cors')
const bodyParser = require('body-parser')
const redisUtils = require('./redis')
const userUtils = require('./user')

app.use(bodyParser.json())
app.use(cors())

const server = require('http').createServer(app)
const io = require('socket.io')(server)

const port = process.env.PORT || 5000

const redisAdapter = require('socket.io-redis')
io.adapter(redisAdapter(redisUtils.redisOptions))

redisUtils.flushDb()

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

app.get('/', (_, res) => {
  res.sendFile(__dirname + '/index.html')
})

io.on('connection', (socket) => {
  console.log(`Client connected. socketID: ${socket.id}`)
  socket.on('createRoom', async ({ roomId, username }) => {
    console.log(`New Room. ID: ${roomId}`)
    console.log('Username: ', username)

    await redisUtils.createRoom(socket, username, roomId)
    socket.join(roomId)
  })
  socket.on('joinRoom', async ({ roomId, username }) => {
    console.log(`Joining Room. ID: ${roomId}`)
    console.log('Username: ', username)

    const roomExists = await redisUtils.roomExists(roomId)
    if (!roomExists) {
      return 'noRoom'
    }

    const usernames = userUtils.getUsernames(redisUtils.getUsers(roomId))
    if (usernames.includes(username)) {
      return 'alreadyInRoom'
    }

    const user = userUtils.getUser(socket)
    await redisUtils.addUser(roomId, user)
    io.to(roomId).emit('addUser', user)
    socket.join(roomId)
  })
  socket.on('leaveRoom', async (roomId) => {
    socket.leave(roomId)
  })
  socket.on('disconnect', async () => {
    console.log('Client disconnected.')
    socket.rooms.forEach(async (room) => {
      await redisUtils.removeUser(room.id, userUtils.getUser(socket))
    })
  })
})

setInterval(() => io.emit('time', new Date().toTimeString()), 1000)

