const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('estoque', {
  dashboard: () => ipcRenderer.invoke('dashboard:get'),
  categories: () => ipcRenderer.invoke('categories:list'),
  addCategory: (name) => ipcRenderer.invoke('categories:add', name),
  products: (category) => ipcRenderer.invoke('products:list', category),
  saveProduct: (p) => ipcRenderer.invoke('products:save', p),
  deactivateProduct: (id) => ipcRenderer.invoke('products:deactivate', id),
  sellers: () => ipcRenderer.invoke('sellers:list'),
  addSeller: (name) => ipcRenderer.invoke('sellers:add', name),
  movements: (limit) => ipcRenderer.invoke('movements:list', limit),
  addMovement: (m) => ipcRenderer.invoke('movements:add', m),
  exportCsv: () => ipcRenderer.invoke('reports:csv'),
  backup: () => ipcRenderer.invoke('backup:save')
});
