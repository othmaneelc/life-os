const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { run, get } = require('../db/database')
const logger = require('../services/logger')

const router = express.Router()

const RECEIPTS_DIR = path.join(__dirname, '../../data/receipts')
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECEIPTS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[/\\]/g, '_')}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

router.post('/receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No receipt image provided' })

    const imagePath = req.file.path
    const fileUrl = `/data/receipts/${req.file.filename}`

    // Run OCR
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng+ara')
    const { data } = await worker.recognize(imagePath)
    await worker.terminate()

    const text = data.text || ''

    // Parse receipt text for common fields
    const lines = text.split('\n').filter(l => l.trim())

    // Extract total (look for patterns like "Total", "TOTAL", "Amount", "AMOUNT", or a currency symbol + number)
    const totalMatch = text.match(/(?:total|amount|TOTAL|AMOUNT|مجموع|الإجمالي)\s*:?\s*([\d,]+\.?\d*)/i)
      || text.match(/([\d,]+\.\d{2})\s*$/m)
      || text.match(/(?:MAD|DH|د\.م\.|درهم)\s*([\d,]+\.?\d*)/i)
    const total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null

    // Extract store name (usually first non-empty line)
    const storeName = lines[0]?.replace(/^[#*•\-]\s*/, '').trim() || 'Unknown Store'

    // Extract date
    const dateMatch = text.match(/(\d{4}[-/]\d{2}[-/]\d{2})/) || text.match(/(\d{2}[-/]\d{2}[-/]\d{4})/)
    const date = dateMatch ? dateMatch[1].replace(/\//g, '-') : new Date().toISOString().split('T')[0]

    // Categorize based on keywords
    let category = 'other'
    const lower = text.toLowerCase()
    if (/\b(grocery|market|supermarket|épicerie|mart|food|épicerie|بيع| alimentation)\b/i.test(lower)) category = 'groceries'
    else if (/\b(restaurant|cafe|coffee|food|pizza|burger|مطعم|كافيه|طعام)\b/i.test(lower)) category = 'food'
    else if (/\b(gas|petrol|fuel|station|essence|car|voiture|بنزين|سيارة)\b/i.test(lower)) category = 'transport'
    else if (/\b(pharmacy|drug|med|pharmacie|صيدلية|دواء)\b/i.test(lower)) category = 'health'
    else if (/\b(electricit|water|internet|phone|elec|eau|كهرباء|ماء|نت)\b/i.test(lower)) category = 'utilities'
    else if (/\b(cloth|shop|store|boutique|mode|ملابس|متجر)\b/i.test(lower)) category = 'shopping'
    else if (/\b( hotel|travel|flight|ticket|voyage|avion|فندق|سفر|طيران)\b/i.test(lower)) category = 'travel'

    res.json({
      success: true,
      text: text.slice(0, 2000),
      parsed: { store: storeName, total, date, category },
      imageUrl: fileUrl,
    })
  } catch (err) {
    logger.error({ err }, 'OCR failed')
    handleError(res, err)
  }
})

module.exports = router
