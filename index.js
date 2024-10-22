const axios = require('axios')
const bodyParser = require('body-parser')
const express = require('express')
const fs = require('fs')
const QRCode = require('qrcode')
const whatsapp = require('velixs-md')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

process.on('uncaughtException', (error) => {
  console.error(error)
})

const app = express()
const PORT = process.env.PORT || 3000

app.use(bodyParser.json())
app.use(express.static('public'))

whatsapp.loadSessionsFromStorage()

whatsapp.onConnected(async (sessionId) => {
  const owner = '6282116568127'
  const infoin = () => `${sessionId} is Active`

  console.log(infoin())

  whatsapp.sendTextMessage({
    sessionId: sessionId,
    to: owner,
    text: infoin()
  })
})

whatsapp.onMessageReceived(async (msg) => {
  const jsonData = fs.readFileSync('./handler/fhz.json')
  const data = JSON.parse(jsonData)
  const text = msg.message?.extendedTextMessage?.text || msg.message?.conversation
  if (data[text]) {
    await whatsapp.sendTextMessage({
      sessionId: msg.sessionId,
      to: msg.key.remoteJid,
      text: data[text]
    });
  }
})

// SEND MESSAGE
app.post('/send-message', async (req, res) => {
  const { sessionId, type, to, text, media, filename } = req.body

  const success = () => `success sending ${type} to ${to}`
  const failed = () => `failed sending ${type} to ${to}`

  switch (type) {
    case 'image': {
      try {
        const result = await whatsapp.sendImage({
          sessionId: sessionId,
          to: to,
          text: text,
          media: media
        })
        if (result) {
          res.json({
            message: success()
          })
        }
      } catch (error) {
        res.json({
          message: failed()
        })
      }
      break
    }
    case 'video': {
      try {
        const result = await whatsapp.sendVideo({
          sessionId: sessionId,
          to: to,
          text: text,
          media: media
        })
        if (result) {
          res.json({
            message: success()
          })
        }
      } catch (error) {
        res.json({
          message: failed()
        })
      }
      break
    }
    case 'document': {
      try {
        const response = await axios.get(media, {
          responseType: 'arraybuffer'
        })
        const buffer = Buffer.from(response.data)
        const result = await whatsapp.sendDocument({
          sessionId: sessionId,
          to: to,
          text: text,
          media: buffer,
          filename: filename,
        })
        if (result) {
          res.json({
            message: success()
          })
        }
      } catch (error) {
        res.json({
          message: failed()
        })
      }
      break
    }
    default: {
      try {
        const result = await whatsapp.sendTextMessage({
          sessionId: sessionId,
          to: to,
          text: text
        })
        if (result) {
          res.json({
            message: success()
          })
        }
      } catch (error) {
        res.json({
          message: failed()
        })
      }
    }
  }
})

// START SESSION
app.get('/start/:id', async (req, res) => {
  const { id } = req.params
  const session = await whatsapp.getSession(id)
  if (session?.user) {
    res.json({
      message: `${id} is Active`
    })
  } else {
    whatsapp.startSession(id, { printQR: false })
    whatsapp.onQRUpdated(async ({ sessionId, qr }) => {
      if (sessionId == id) {
        const buffer = await QRCode.toBuffer(qr)
        res.set('Content-Type', 'image/png')
        res.send(buffer)
      }
    })
  }
})

// DELETE SESSION
app.get('/delete/:id', async (req, res) => {
  const { id } = req.params
  whatsapp.deleteSession(id)
  res.json({
    message: `session ${id} deleted`
  })
})

// GET ALL SESSION
app.get('/session', async (req, res) => {
  const sessions = await whatsapp.getAllSession()
  res.json({
    session: sessions
  })
})

// Jalankan server
app.listen(PORT, () => {
  console.log(`>>> server running at\n[1] http://localhost:${PORT}`)
})