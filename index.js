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

  socket.on('createRoom', async ({ roomId, username }, callback) => {
    console.log(`New Room. ID: ${roomId}`)
    console.log('Username: ', username)

    await redisUtils.createRoom(socket, roomId, username)
    const room = await joinRoom(socket, roomId, username)
    if (typeof callback === 'function') {
      callback(room)
    }
  })

  socket.on('joinRoom', async ({ roomId, username }, callback) => {
    console.log(`Join Room. ID: ${roomId}`)
    console.log('Username: ', username)

    const room = await joinRoom(socket, roomId, username)
    if (typeof callback === 'function') {
      callback(room)
    }
  })

  socket.on('leaveRoom', async (roomId, callback) => {
    console.log(`Leave Room. ID: ${roomId}`)
    await leaveRoom(socket, roomId)
  })

  socket.on('disconnect', async () => {
    console.log('Client disconnected.')
    await redisUtils.removeUser(socket.roomId, userUtils.getUser(socket))
  })
})

const joinSocket = (socket, roomId) => {
  socket.join(roomId)
  socket.roomId = roomId
}

const leaveSocket = (socket, roomId) => {
  socket.leave(roomId)
  delete socket.roomId
  delete socket.username
}

const joinRoom = async (socket, roomId, username) => {
  const roomExists = await redisUtils.roomExists(roomId)
    if (!roomExists) {
      console.log('Room does not exist')
      return 'noRoom'
    }

    const usernames = userUtils.getUsernames(await redisUtils.getUsers(roomId))
    if (usernames.includes(username)) {
      console.log('Already in the room')
      return 'alreadyInRoom'
    }

    socket.username = username
    const user = userUtils.getUser(socket)
    await redisUtils.addUser(roomId, user)

    joinSocket(socket, roomId)
    io.to(roomId).emit('addUser', user)

    return await redisUtils.getRoom(roomId)
}

const leaveRoom = async (socket, roomId) => {
    const user = userUtils.getUser(socket)
    await redisUtils.removeUser(roomId, user)

    io.to(roomId).emit('removeUser', user)
    leaveSocket(socket, roomId)

    const users = await redisUtils.getUsers(roomId)
    if (users.length) {
      const wasHost = (await redisUtils.getHostId(roomId)) === user.id
      if (wasHost) {
        await redisUtils.setHostId(roomId, users[0].id)
        io.to(roomId).emit('updateHostId', users[0].id)
      }
    } else {
      await redisUtils.destroyRoom(roomId)
    }

    return roomId
}