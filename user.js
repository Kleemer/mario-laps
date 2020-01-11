const getUsernames = (userList) => {
  if (!Array.isArray(userList)) {
    return []
  }

  return userList
    .map((user) => {
      if (!user || !user.username) {
        return ''
      }

      return user.username
    })
    .filter(Boolean)
}

const getUser = (socket) => {
  return {
    username: socket.username,
    userId: socket.id
  }
}

module.exports = {
  getUsernames,
  getUser
}