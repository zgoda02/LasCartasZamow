
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'

const PORT = process.env.PORT || 3000
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'
const DB_FILE = process.env.DB_FILE || 'app.sqlite'

const db = new Database(DB_FILE)
db.pragma('journal_mode = WAL')

const app = express()
app.use(cors())
app.use(express.json())

// --- tiny auth (demo) ---
function requireAdmin(req, res, next){
  const token = req.headers.authorization?.replace('Bearer ', '') || ''
  if(token !== ADMIN_PASS) return res.status(401).json({error:'unauthorized'})
  next()
}

// --- DB helpers ---
db.exec(`
CREATE TABLE IF NOT EXISTS items(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT DEFAULT '',
  category TEXT NOT NULL,
  priceH INTEGER NOT NULL,
  priceS INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders(
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  tier TEXT NOT NULL,
  total INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items(
  order_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
`)

// --- Auth ---
app.post('/login', (req,res)=>{
  const { password } = req.body || {}
  if(password === ADMIN_PASS) return res.json({ token: ADMIN_PASS })
  res.status(401).json({ error:'invalid_credentials' })
})

// --- Items ---
app.get('/items', (req,res)=>{
  const rows = db.prepare('SELECT * FROM items ORDER BY category, name').all()
  res.json({ items: rows })
})
app.post('/items', requireAdmin, (req,res)=>{
  const { id, name, unit='', category, priceH, priceS } = req.body || {}
  if(!id || !name || !category || !Number.isInteger(priceH) || !Number.isInteger(priceS)){
    return res.status(400).json({error:'invalid_body'})
  }
  try{
    db.prepare('INSERT INTO items(id,name,unit,category,priceH,priceS) VALUES(?,?,?,?,?,?)')
      .run(id,name,unit,category,priceH,priceS)
    res.status(201).json({ ok:true })
  }catch(e){
    res.status(400).json({ error: e.message })
  }
})
app.put('/items/:id', requireAdmin, (req,res)=>{
  const id = req.params.id
  const exists = db.prepare('SELECT id FROM items WHERE id=?').get(id)
  if(!exists) return res.status(404).json({error:'not_found'})
  const { name, unit, category, priceH, priceS } = req.body || {}
  db.prepare('UPDATE items SET name=COALESCE(?,name), unit=COALESCE(?,unit), category=COALESCE(?,category), priceH=COALESCE(?,priceH), priceS=COALESCE(?,priceS) WHERE id=?')
    .run(name, unit, category, priceH, priceS, id)
  res.json({ ok:true })
})
app.delete('/items/:id', requireAdmin, (req,res)=>{
  const id=req.params.id
  db.prepare('DELETE FROM items WHERE id=?').run(id)
  res.json({ ok:true })
})

// --- Orders ---
app.get('/orders', (req,res)=>{
  const orders = db.prepare('SELECT * FROM orders ORDER BY datetime(at) DESC').all()
  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id=?')
  const withItems = orders.map(o=>({ ...o, items: itemsStmt.all(o.id) }))
  res.json({ orders: withItems })
})
app.post('/orders', (req,res)=>{
  const { lines, tier } = req.body || {}
  if(!Array.isArray(lines) || !['H','S'].includes(tier)){
    return res.status(400).json({error:'invalid_body'})
  }
  const findItem = db.prepare('SELECT * FROM items WHERE id=?')
  const insertOrder = db.prepare('INSERT INTO orders(id,at,tier,total) VALUES(?,?,?,?)')
  const insertLine = db.prepare('INSERT INTO order_items(order_id,item_id,name,qty,price,subtotal) VALUES(?,?,?,?,?,?)')

  const id = nanoid()
  const at = new Date().toISOString()

  let total = 0
  const prepared = lines.map(l=>{
    const it = findItem.get(l.id)
    if(!it) throw new Error(`item_not_found:${l.id}`)
    const price = (tier==='H'? it.priceH : it.priceS)
    const qty = Math.max(0, parseInt(l.qty||0,10))
    const subtotal = price * qty
    total += subtotal
    return { id: l.id, name: it.name, qty, price, subtotal }
  })

  const trx = db.transaction(()=>{
    insertOrder.run(id, at, tier, total)
    prepared.forEach(li=> insertLine.run(id, li.id, li.name, li.qty, li.price, li.subtotal))
  })
  try{
    trx()
  }catch(e){
    return res.status(400).json({error: e.message})
  }
  res.status(201).json({ id, at, tier, total, items: prepared })
})

app.delete('/orders/:id', requireAdmin, (req,res)=>{
  const id=req.params.id
  db.prepare('DELETE FROM orders WHERE id=?').run(id)
  db.prepare('DELETE FROM order_items WHERE order_id=?').run(id)
  res.json({ ok:true })
})

// --- Health ---
app.get('/', (req,res)=> res.json({ ok:true }))

app.listen(PORT, ()=>{
  console.log(`API listening on http://localhost:${PORT}`)
})
