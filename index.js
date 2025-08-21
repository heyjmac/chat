import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { WebSocketServer } from 'ws'
import { toolExecutors, tools } from './tools.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const clientDistPath = path.join(__dirname, 'client', 'dist')
app.use(express.static(clientDistPath))
app.use('/downloads', express.static(path.join(process.cwd(), 'downloads')))
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

const server = app.listen(3000, () => console.log('http://localhost:3000'))
const wss = new WebSocketServer({ server })
const connectionStatus = new Map()

const sendChunks = (ws, obj, basePath = 'payload', accumulate = false) => {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => sendChunks(ws, v, `${basePath}[${i}]`))
  } 
  else if (obj && typeof obj === 'object') {
    for (const key in obj) {
      sendChunks(ws, obj[key], `${basePath}.${key}`, accumulate)
    }
  } 
  else {
    ws.send(JSON.stringify({ position: basePath, [accumulate ? 'accumulate' : 'set']: obj }))
  }
}

export const handlePromptAndEmit = async (ws, prompt, cancelledRef) => {
  const systemInstructions = `You're a helpful assistant that does all you can to help without asking questions. 
You have tools. 
You can use multiple tools. 
Decide on what tools you will call. 
Then use informUser to tell the user what you will do. 
Use informUser again to tell the user when the other functions are done. 
Never promise and forget calling the function. 
Answer in the user's language.`

  const userPrompt = `User request: ${prompt}`

  const body = {
    systemInstruction: {
      role: "system",
      parts: [
        {
          text: systemInstructions
        }
      ]
    },
    contents: [{
      role: 'user',
      parts: [
        { text: userPrompt }
      ]
    }],
    tools: [{ functionDeclarations: tools }]
  }

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + process.env.GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  )

  if (cancelledRef()) return

  const data = await response.json()
  const parts = data?.candidates?.[0]?.content?.parts || []

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    const base = `payload[${i}]`

    if (cancelledRef()) return

    if (p.functionCall) {
      const { name, args } = p.functionCall
      sendChunks(ws, name, `${base}.tool`)

      if (toolExecutors[name]) {
        const sendSubChunks = (add, subpath) => sendChunks(ws, add, `${base}.output.${subpath}`, true);
        const output = await toolExecutors[name](sendSubChunks, args || {})
        if (cancelledRef()) return
        if (output) sendChunks(ws, output, `${base}.output`)
      }
    } else if (p.text) {
      sendChunks(ws, { message: p.text }, `${base}.output`)
    }

    ws.send(JSON.stringify({ status: 'done' }))
  }

  if (!parts.some(p => p.functionCall)) {
    ws.send(JSON.stringify({ status: 'done' }))
  }
}

wss.on('connection', ws => {
  connectionStatus.set(ws, { cancelled: false })

  ws.on('message', async message => {
    const { prompt, type } = JSON.parse(message)

    if (type === 'cancel') {
      connectionStatus.set(ws, { cancelled: true })
      return
    }

    connectionStatus.set(ws, { cancelled: false })

    await handlePromptAndEmit(ws, prompt, () => connectionStatus.get(ws)?.cancelled)
  })

  ws.on('close', () => {
    connectionStatus.delete(ws)
  })
})