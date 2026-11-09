const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db;
function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'estoque-atualize.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE);
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Outros',
      unit TEXT NOT NULL DEFAULT 'un',
      units_per_box INTEGER,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS sellers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      type TEXT NOT NULL CHECK(type IN ('entrada','saida','perda','ajuste')),
      quantity INTEGER NOT NULL,
      seller_id INTEGER REFERENCES sellers(id),
      note TEXT,
      unit_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);
  const addCategory = db.prepare('INSERT OR IGNORE INTO categories(name) VALUES (?)');
  ['Sorvetes','Lubrificantes','Outros'].forEach(name => addCategory.run(name));
  db.prepare('INSERT OR IGNORE INTO categories(name) SELECT DISTINCT category FROM products').run();
  const sellerCount = db.prepare('SELECT COUNT(*) n FROM sellers').get().n;
  if (!sellerCount) {
    const addSeller = db.prepare('INSERT INTO sellers(name) VALUES (?)');
    addSeller.run('Rayane'); addSeller.run('Bruno');
  }
  const productCount = db.prepare('SELECT COUNT(*) n FROM products').get().n;
  if (!productCount) seedProducts();
}
function seedProducts() {
  const rows = [
    ['51421','Cremosinho sabor leite condensado','Sorvetes','un',10,10],
    ['51452','Cremosinho sabor maracujá','Sorvetes','un',10,10],
    ['51438','Cremosinho sabor morango','Sorvetes','un',10,10],
    ['50240','Picolé cobertura Quy Lack','Sorvetes','un',22,22],
    ['50684','Picolé cobertura Tentação','Sorvetes','un',22,22],
    ['50134','Picolé Milk Chocolate','Sorvetes','un',26,26],
    ['50141','Picolé Milk Coco','Sorvetes','un',26,26],
    ['50172','Picolé Milk Leite Condensado','Sorvetes','un',26,26],
    ['50295','Picolé Sublime Mousse Maracujá','Sorvetes','un',null,0],
    ['50097','Picolé Suco Morango','Sorvetes','un',26,26],
    ['50073','Picolé Suco Uva','Sorvetes','un',26,26],
    ['50332','Sorvete pote 2L Napolitano','Sorvetes','un',1,1],
    ['50356','Sorvete pote 2L Passas','Sorvetes','un',1,1],
    ['50745','Sorvete Quy Copão Napolitano','Sorvetes','un',null,0]
  ];
  const insert = db.prepare(`INSERT INTO products(code,name,category,unit,units_per_box,stock)
    VALUES (?,?,?,?,?,?)`);
  const tx = db.transaction(() => rows.forEach(r => insert.run(...r)));
  tx();
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    backgroundColor: '#f4f7fb',
    webPreferences: { preload: path.join(__dirname,'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname,'index.html'));
}
app.whenReady().then(() => { initDb(); createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('dashboard:get', () => {
  const products = db.prepare('SELECT COUNT(*) n FROM products WHERE active=1').get().n;
  const units = db.prepare('SELECT COALESCE(SUM(stock),0) n FROM products WHERE active=1').get().n;
  const low = db.prepare('SELECT COUNT(*) n FROM products WHERE active=1 AND stock<=min_stock').get().n;
  const today = db.prepare("SELECT COALESCE(SUM(quantity),0) n FROM movements WHERE type='saida' AND date(created_at)=date('now','localtime')").get().n;
  const sales = db.prepare("SELECT COALESCE(SUM(quantity*unit_price),0) n FROM movements WHERE type='saida' AND date(created_at)=date('now','localtime')").get().n;
  const stockValue = db.prepare('SELECT COALESCE(SUM(stock*purchase_price),0) n FROM products WHERE active=1').get().n;
  const totalOut = db.prepare("SELECT COALESCE(SUM(quantity),0) n FROM movements WHERE type IN ('saida','perda')").get().n;
  const totalSales = db.prepare("SELECT COALESCE(SUM(quantity*unit_price),0) n FROM movements WHERE type='saida'").get().n;
  const totalLoss = db.prepare("SELECT COALESCE(SUM(quantity),0) n FROM movements WHERE type='perda'").get().n;
  const monthOut = db.prepare("SELECT COALESCE(SUM(quantity),0) n FROM movements WHERE type='saida' AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now','localtime')").get().n;
  const daily = db.prepare(`SELECT date(created_at) day, COALESCE(SUM(quantity),0) qty
    FROM movements WHERE type='saida' AND date(created_at)>=date('now','localtime','-6 days')
    GROUP BY date(created_at) ORDER BY day`).all();
  const categoryOut = db.prepare(`SELECT p.category, COALESCE(SUM(m.quantity),0) qty
    FROM categories c LEFT JOIN products p ON p.category=c.name
    LEFT JOIN movements m ON m.product_id=p.id AND m.type='saida'
    GROUP BY c.name ORDER BY c.id`).all();
  const attention = db.prepare('SELECT id,name,category,stock,min_stock FROM products WHERE active=1 AND (stock<=0 OR (min_stock>0 AND stock<=min_stock)) ORDER BY stock,name').all();
  const allProducts = db.prepare('SELECT * FROM products WHERE active=1 ORDER BY category,name').all();
  return { products, units, low, today, sales, stockValue, totalOut, totalSales, totalLoss, monthOut, daily, categoryOut, attention, allProducts };
});
ipcMain.handle('categories:list', () => db.prepare('SELECT name FROM categories ORDER BY id').all());
ipcMain.handle('categories:add', (_, name) => {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Informe o nome da categoria.');
  if (clean.length > 40) throw new Error('Use até 40 caracteres.');
  try { db.prepare('INSERT INTO categories(name) VALUES (?)').run(clean); }
  catch (e) { if (String(e.message).includes('UNIQUE')) throw new Error('Essa categoria já existe.'); throw e; }
  return true;
});
ipcMain.handle('products:list', (_, category='Todos') => {
  if (category === 'Todos') return db.prepare('SELECT * FROM products WHERE active=1 ORDER BY category,name').all();
  return db.prepare('SELECT * FROM products WHERE active=1 AND category=? ORDER BY name').all(category);
});
ipcMain.handle('products:save', (_, p) => {
  if (!p.name?.trim()) throw new Error('Informe o nome do produto.');
  if (p.id) {
    db.prepare(`UPDATE products SET code=?,name=?,category=?,unit=?,units_per_box=?,min_stock=?,purchase_price=?,sale_price=? WHERE id=?`)
      .run(p.code||null,p.name.trim(),p.category,p.unit||'un',p.units_per_box||null,Number(p.min_stock)||0,Number(p.purchase_price)||0,Number(p.sale_price)||0,p.id);
    return p.id;
  }
  const result = db.prepare(`INSERT INTO products(code,name,category,unit,units_per_box,stock,min_stock,purchase_price,sale_price)
    VALUES (?,?,?,?,?,0,?,?,?)`).run(p.code||null,p.name.trim(),p.category,p.unit||'un',p.units_per_box||null,Number(p.min_stock)||0,Number(p.purchase_price)||0,Number(p.sale_price)||0);
  return result.lastInsertRowid;
});
ipcMain.handle('products:deactivate', (_, id) => db.prepare('UPDATE products SET active=0 WHERE id=?').run(id).changes);
ipcMain.handle('sellers:list', () => db.prepare('SELECT * FROM sellers WHERE active=1 ORDER BY name').all());
ipcMain.handle('sellers:add', (_, name) => {
  if (!name?.trim()) throw new Error('Informe o nome do vendedor.');
  return db.prepare('INSERT INTO sellers(name) VALUES (?)').run(name.trim()).lastInsertRowid;
});
ipcMain.handle('movements:list', (_, limit=100) => db.prepare(`
  SELECT m.*,p.name product_name,p.code,s.name seller_name
  FROM movements m JOIN products p ON p.id=m.product_id LEFT JOIN sellers s ON s.id=m.seller_id
  ORDER BY m.id DESC LIMIT ?`).all(Math.min(Number(limit)||100,1000)));
ipcMain.handle('movements:add', (_, m) => {
  const qty = Math.floor(Number(m.quantity));
  if (!m.product_id || !qty || qty < 1) throw new Error('Selecione um produto e informe uma quantidade válida.');
  if (m.type === 'saida' && !m.seller_id) throw new Error('Selecione o vendedor.');
  const product = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(m.product_id);
  if (!product) throw new Error('Produto não encontrado.');
  const signed = m.type === 'entrada' ? qty : -qty;
  if (m.type !== 'entrada' && product.stock < qty) throw new Error('Estoque insuficiente. Disponível: '+product.stock);
  const tx = db.transaction(() => {
    db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(signed,product.id);
    db.prepare(`INSERT INTO movements(product_id,type,quantity,seller_id,note,unit_price)
      VALUES (?,?,?,?,?,?)`).run(product.id,m.type,qty,m.seller_id||null,m.note||'',Number(m.unit_price ?? product.sale_price)||0);
  });
  tx(); return true;
});
ipcMain.handle('reports:csv', async () => {
  const rows = db.prepare(`SELECT m.id,m.created_at,m.type,p.code,p.name product,m.quantity,
    COALESCE(s.name,'—') seller,m.unit_price,(m.quantity*m.unit_price) total,m.note
    FROM movements m JOIN products p ON p.id=m.product_id LEFT JOIN sellers s ON s.id=m.seller_id ORDER BY m.id DESC`).all();
  const header = ['ID','Data','Tipo','Código','Produto','Quantidade','Vendedor','Preço unitário','Total','Observação'];
  const esc = v => '"'+String(v ?? '').replace(/"/g,'""')+'"';
  const csv = '\uFEFF'+[header,...rows.map(r=>[r.id,r.created_at,r.type,r.code,r.product,r.quantity,r.seller,r.unit_price,r.total,r.note])].map(r=>r.map(esc).join(';')).join('\r\n');
  const { filePath } = await dialog.showSaveDialog({ title:'Salvar relatório de movimentações', defaultPath:'relatorio-estoque-atualize.csv', filters:[{name:'Planilha CSV',extensions:['csv']}] });
  if (!filePath) return false;
  fs.writeFileSync(filePath,csv,'utf8'); return filePath;
});
ipcMain.handle('backup:save', async () => {
  const { filePath } = await dialog.showSaveDialog({ title:'Salvar backup do estoque', defaultPath:'backup-estoque-atualize.db', filters:[{name:'Banco SQLite',extensions:['db']}] });
  if (!filePath) return false;
  db.backup(filePath); return filePath;
});
ipcMain.handle('app:openExternal', (_, url) => shell.openExternal(url));
