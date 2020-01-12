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
    id: socket.id,
    username: socket.username,
  }
}

module.exports = {
  getUsernames,
  getUser
}