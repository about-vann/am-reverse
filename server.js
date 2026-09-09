const express = require('express')
const path = require('path')
const apiRoutes = require('./app/api/route')

const app = express()

app.use(require('cors')())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate')
    }
  }
}))

// API routes: support both /api prefix and direct subpaths (if Vercel rewrites strip prefix)
app.use('/api', apiRoutes)
app.use(apiRoutes)

// Fallback for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Vercel runs this file as a serverless function through api/index.js.
// Keep a local start method for traditional Node hosting/development.
if (require.main === module) {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`server jalan di http://0.0.0.0:${PORT}`)
  })
}

module.exports = app
