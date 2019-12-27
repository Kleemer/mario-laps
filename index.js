const express = require('express')
const app = new express()
const cors = require('cors')
const bodyParser = require('body-parser')

app.use(bodyParser.json())
app.use(cors())

const server = require('http').createServer(app)
const io = require('socket.io')(server)

const port = process.env.PORT || 5000

server.listen(port, function () {
    console.log(`listening on port ${port}`)
})

app.get('/', function (_, res) {
    res.sendFile(__dirname + '/index.html')
})

io.on('connection', function (socket) {
    console.log(`Client connected. socketID: ${socket.id}`)
    socket.on('choose user', (input) => console.log(`Player: ${input}`))
    socket.on('new game', (input) => console.log(`New Game. Room ID: ${input}`))
    socket.on('disconnect', () => console.log('Client disconnected.'))
})

setInterval(() => io.emit('time', new Date().toTimeString()), 1000)

