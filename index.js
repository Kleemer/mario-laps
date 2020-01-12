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

    await redisUtils.createRoom(socket, roomId, username)
    await joinRoom(socket, roomId, username)
  })
  socket.on('joinRoom', async ({ roomId, username }) => {
    console.log(`Join Room. ID: ${roomId}`)
    console.log('Username: ', username)
    await joinRoom(socket, roomId, username)
  })
  socket.on('leaveRoom', async (roomId) => {
    await leaveRoom(socket, roomId)
  })
  socket.on('disconnect', async () => {
    console.log('Client disconnected.')
    await redisUtils.removeUser(socket.roomId, userUtils.getUser(socket))
  })
})

const joinRoom = async (socket, roomId, username) => {
  const roomExists = await redisUtils.roomExists(roomId)
    if (!roomExists) {
      console.log('Room does not exist')
      return 'noRoom'
    }

    const usernames = userUtils.getUsernames(redisUtils.getUsers(roomId))
    if (usernames.includes(username)) {
      console.log('Alread in the room')
      return 'alreadyInRoom'
    }

    socket.username = username
    const user = userUtils.getUser(socket)
    await redisUtils.addUser(roomId, user)
    // @todo see if can emit to only the roomId
    // io.to(roomId).emit('addUser', user)
    io.emit('addUser', user)
    socket.join(roomId)
    socket.roomId = roomId

    return await redisUtils.getRoom(roomId)
}

const leaveRoom = async (socket, roomId) => {
    const user = userUtils.getUser(socket)
    await redisUtils.addUser(roomId, user)
    // @todo see if can emit to only the roomId
    // io.to(roomId).emit('addUser', user)
    io.emit('removeUser', user)
    socket.leave(roomId)
    delete socket.roomId
    delete socket.username

    return roomId
}