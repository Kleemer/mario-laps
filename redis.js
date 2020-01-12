const redisOptions = {
  host: process.env.REDIS_HOST,
  auth_pass: process.env.REDIS_PASSWORD,
  port: process.env.REDIS_PORT,
}

const redisServer = require('promise-redis')()
const redisClient = redisServer.createClient(redisOptions)

const flushDb = async () => {
  return await redisClient.flushdb()
}

const getRoom = async (roomId) => {
  const hostId = await redisClient.get(`room_${roomId}_hostId`)
  const users = await getUsers(roomId)

  return { roomId, hostId, users }
}

const createRoom = async (socket, roomId, username) => {
  socket.username = username
  await setHostId(roomId, socket.id)

  return roomId
}

const destroyRoom = async (roomId) => {
  const keys = await redisClient.keys(`room_${roomId}*`)
  keys.forEach((key) => redisClient.del(key))

  return true
}

const roomExists = async (roomId) => {
  return !!await redisClient.exists(`room_${roomId}_hostId`)
}

const getHostId = async (roomId) => {
  return await redisClient.get(`room_${roomId}_hostId`)
}

const setHostId = async (roomId, hostId) => {
  await redisClient.set(`room_${roomId}_hostId`, hostId)

  return hostId
}

const getUsers = async (roomId) => {
  const users = await redisClient.lrange(`room_${roomId}_users`, 0, -1)

  return users.map(u => JSON.parse(u))
}

const addUser = async (roomId, user) => {
  await redisClient.rpush(`room_${roomId}_users`, JSON.stringify(user))

  return user
}

const removeUser = async (roomId, user) => {
  await redisClient.lrem(`room_${roomId}_users`, 0, JSON.stringify(user))
  if (!await getUsers(roomId).length) {
    await destroyRoom(roomId)
  }
}

module.exports = {
  redisOptions,
  flushDb,
  getRoom,
  createRoom,
  destroyRoom,
  roomExists,
  getHostId,
  setHostId,
  getUsers,
  addUser,
  removeUser
}
