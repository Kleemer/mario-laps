const express = require('express')
const app = new express()
const cors = require('cors')
const bodyParser = require('body-parser')

app.use(bodyParser.json())
app.use(cors())

var server = require('http').createServer(app)
var io = require('socket.io')(server)

server.listen(5000, function () {
    console.log('listening on *:5000')
})

app.get('/', function (_, res) {
    res.sendFile(__dirname + '/index.html')
})

io.on('connection', function (socket) {
    console.log('Client connected. socketID: ', socket.id)
    socket.on('choose user', (input) => console.log('Player: ', input))
    socket.on('new game', (input) => console.log('New Game. Room ID: ', input))
    socket.on('disconnect', () => console.log('Client disconnected.'))
})

setInterval(() => io.emit('time', new Date().toTimeString()), 1000)

