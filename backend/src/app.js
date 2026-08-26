import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDB } from './database.js'
import dataRoutes from './routes/dataRoutes.js'
import wechatRoutes from './routes/wechatRoutes.js'
import authRoutes from './routes/authRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.set('trust proxy', true)
app.use(cors())
app.use(express.json())

app.use('/api', dataRoutes)
app.use('/api/wechat', wechatRoutes)
app.use('/api/auth', authRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Kakarotte API is running' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ code: 1, data: null, message: err.message || '服务器内部错误' })
})

const startServer = async () => {
  try {
    await initDB()
    console.log('Database initialized successfully')
    app.listen(PORT, () => {
      console.log(`Kakarotte API server is running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

startServer()
