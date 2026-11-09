const $ = s => document.querySelector(s);
let currentPage='inicio', cacheProducts=[], cacheSellers=[];
const names={inicio:'Visão geral',sorvetes:'Sorvetes',lubrificantes:'Lubrificantes',outros:'Outros produtos',movimentacoes:'Movimentações',vendedores:'Vendedores',relatorios:'Relatórios e backup'};
const money=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function dateText(){return new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
$('#today').textContent=dateText();
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
function go(page){currentPage=page;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#pageTitle').textContent=names[page];render()}
async function render(){if(currentPage==='inicio')return dashboard();if(['sorvetes','lubrificantes','outros'].includes(currentPage))return productsPage();if(currentPage==='movimentacoes')return movementsPage();if(currentPage==='vendedores')return sellersPage();if(currentPage==='relatorios')return reportsPage()}
async function dashboard(){
 const d=await window.estoque.dashboard(); const p=await window.estoque.products('Todos');
 $('#content').innerHTML=`<div class="cards">
 <div class="card"><div class="metric-label">Produtos cadastrados</div><div class="metric">${d.products}</div><div class="metric-sub">Itens ativos no sistema</div></div>
 <div class="card"><div class="metric-label">Unidades em estoque</div><div class="metric">${d.units}</div><div class="metric-sub">Quantidade total disponível</div></div>
 <div class="card"><div class="metric-label">Saídas hoje</div><div class="metric">${d.today}</div><div class="metric-sub">Unidades registradas como venda</div></div>
 <div class="card"><div class="metric-label">Vendas registradas hoje</div><div class="metric">${money(d.sales)}</div><div class="metric-sub">${d.low} produto(s) no mínimo ou abaixo</div></div></div>
 <div class="panel"><div class="panel-head"><h2>Bem-vindo ao Estoque Grupo Atualize</h2><span class="pill good">Sistema local</span></div><p class="muted">Controle de produtos, entradas, saídas e vendedores em um só lugar.</p><div class="quick-grid">
 <div class="quick"><b>❄ Sorvetes</b><span class="muted">Estoque individual por unidade.</span></div><div class="quick"><b>◉ Lubrificantes</b><span class="muted">Categoria separada para os óleos.</span></div><div class="quick"><b>⇄ Movimentações</b><span class="muted">Registre vendas, entradas e perdas.</span></div></div></div>
 <div class="panel"><div class="panel-head"><h2>Estoque atual</h2><button class="btn secondary" id="goProducts">Ver produtos</button></div>${productTable(p.slice(0,8))}</div>`;
 $('#goProducts').onclick=()=>go('sorvetes');
}
function productTable(list){if(!list.length)return '<div class="empty">Nenhum produto cadastrado nesta categoria.</div>';return `<div class="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>PRODUTO</th><th>CATEGORIA</th><th>ESTOQUE</th><th>MÍNIMO</th><th>STATUS</th><th></th></tr></thead><tbody>${list.map(p=>`<tr><td>${p.code||'—'}</td><td><strong>${esc(p.name)}</strong></td><td>${p.category}</td><td><b>${p.stock} ${p.unit}</b></td><td>${p.min_stock}</td><td>${p.units_per_box==null?'<span class="pill warn">Qtd. por caixa pendente</span>':p.stock<=p.min_stock?'<span class="pill warn">Estoque baixo</span>':'<span class="pill good">Disponível</span>'}</td><td><button class="btn secondary edit" data-id="${p.id}">Editar</button></td></tr>`).join('')}</tbody></table></div>`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function productsPage(){
 const category=currentPage==='sorvetes'?'Sorvetes':currentPage==='lubrificantes'?'Lubrificantes':'Outros';
 cacheProducts=await window.estoque.products(category);
 $('#content').innerHTML=`<div class="panel"><div class="panel-head"><div><h2>${category}</h2><span class="muted">${cacheProducts.length} produto(s) cadastrado(s)</span></div><button class="btn green" id="addProduct">＋ Adicionar produto</button></div><div class="toolbar"><input class="search" id="search" placeholder="Buscar por nome ou código..."><button class="btn secondary" id="entry">＋ Registrar entrada</button><button class="btn secondary" id="sale">− Registrar saída</button></div><div id="productTable">${productTable(cacheProducts)}</div></div>`;
 $('#addProduct').onclick=()=>productModal();$('#entry').onclick=()=>movementModal('entrada',category);$('#sale').onclick=()=>movementModal('saida',category);
 $('#search').oninput=e=>{$('#productTable').innerHTML=productTable(cacheProducts.filter(p=>(p.name+' '+p.code).toLowerCase().includes(e.target.value.toLowerCase())));bindEdit()};
 bindEdit();
}
function bindEdit(){document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>productModal(cacheProducts.find(p=>p.id===Number(b.dataset.id))))}
function openModal(title,html){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden')}
$('#closeModal').onclick=closeModal;$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function productModal(p=null){
 openModal(p?'Editar produto':'Adicionar produto',`<form id="productForm"><div class="form-grid">
 <div class="field"><label>Nome do produto *</label><input name="name" required value="${esc(p?.name||'')}" placeholder="Ex.: Óleo 20W50"></div>
 <div class="field"><label>Categoria *</label><select name="category"><option ${p?.category==='Sorvetes'?'selected':''}>Sorvetes</option><option ${p?.category==='Lubrificantes'?'selected':''}>Lubrificantes</option><option ${p?.category==='Outros'?'selected':''}>Outros</option></select></div>
 <div class="field"><label>Código / SKU</label><input name="code" value="${esc(p?.code||'')}"></div>
 <div class="field"><label>Unidades por caixa</label><input name="units_per_box" type="number" min="1" value="${p?.units_per_box??''}" placeholder="Preencher quando souber"></div>
 <div class="field"><label>Estoque mínimo (unidades)</label><input name="min_stock" type="number" min="0" value="${p?.min_stock??0}"></div>
 <div class="field"><label>Preço de compra (R$)</label><input name="purchase_price" type="number" min="0" step=".01" value="${p?.purchase_price??0}"></div>
 <div class="field"><label>Preço de venda por unidade (R$)</label><input name="sale_price" type="number" min="0" step=".01" value="${p?.sale_price??0}"></div>
 </div><p class="muted">Produto novo começa com estoque zero. Registre a quantidade inicial em “Registrar entrada”.</p><div class="modal-actions"><button type="button" class="btn secondary" id="cancel">Cancelar</button><button class="btn" type="submit">Salvar produto</button></div></form>`);
 $('#cancel').onclick=closeModal;
 $('#productForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const data=Object.fromEntries(f.entries());data.id=p?.id;data.units_per_box=data.units_per_box?Number(data.units_per_box):null;try{await window.estoque.saveProduct(data);closeModal();toast('Produto salvo com sucesso.');render()}catch(err){toast(err.message)}};
}
async function movementModal(type,category=null){
 const products=await window.estoque.products(category||'Todos');cacheSellers=await window.estoque.sellers();
 openModal(type==='entrada'?'Registrar entrada':type==='saida'?'Registrar saída':'Registrar perda',`<form id="movementForm"><div class="form-grid">
 <div class="field full"><label>Produto *</label><select name="product_id" required><option value="">Selecione</option>${products.map(p=>`<option value="${p.id}" data-price="${p.sale_price||0}">${esc(p.name)} — estoque: ${p.stock}</option>`).join('')}</select></div>
 <div class="field"><label>Quantidade em unidades *</label><input name="quantity" type="number" min="1" step="1" required placeholder="Ex.: 10"></div>
 ${type==='saida'?`<div class="field"><label>Vendedor *</label><select name="seller_id" required><option value="">Selecione</option>${cacheSellers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>`:''}
 <div class="field"><label>Valor por unidade (R$)</label><input name="unit_price" type="number" min="0" step=".01" value="0"></div>
 <div class="field full"><label>Observação</label><input name="note" placeholder="Opcional"></div>
 </div><p class="muted">A quantidade informada será somada ou descontada do estoque automaticamente.</p><div class="modal-actions"><button type="button" class="btn secondary" id="cancel">Cancelar</button><button class="btn" type="submit">Confirmar ${type}</button></div></form>`);
 $('#cancel').onclick=closeModal;
 const productSelect=$('#movementForm select[name="product_id"]');
 productSelect.onchange=()=>{const selected=productSelect.selectedOptions[0];const priceField=$('#movementForm input[name="unit_price"]');if(selected && priceField)priceField.value=selected.dataset.price||0};
 $('#movementForm').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());data.type=type;data.product_id=Number(data.product_id);data.quantity=Number(data.quantity);data.seller_id=data.seller_id?Number(data.seller_id):null;try{await window.estoque.addMovement(data);closeModal();toast('Movimentação registrada.');render()}catch(err){toast(err.message)}};
}
async function movementsPage(){
 const rows=await window.estoque.movements(250);
 $('#content').innerHTML=`<div class="panel"><div class="panel-head"><div><h2>Histórico de movimentações</h2><span class="muted">Últimos 250 registros</span></div><div class="actions"><button class="btn green" id="newSale">Registrar saída</button><button class="btn secondary" id="newEntry">Registrar entrada</button></div></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th>DATA</th><th>TIPO</th><th>PRODUTO</th><th>QTD.</th><th>VENDEDOR</th><th>VALOR</th><th>OBSERVAÇÃO</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${esc(m.created_at)}</td><td><span class="pill ${m.type==='entrada'?'good':m.type==='saida'?'':'warn'}">${m.type}</span></td><td><strong>${esc(m.product_name)}</strong></td><td>${m.quantity}</td><td>${esc(m.seller_name||'—')}</td><td>${money(m.quantity*m.unit_price)}</td><td>${esc(m.note||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Ainda não há movimentações registradas.</div>'}</div>`;
 $('#newSale').onclick=()=>movementModal('saida');$('#newEntry').onclick=()=>movementModal('entrada');
}
async function sellersPage(){
 const sellers=await window.estoque.sellers();
 $('#content').innerHTML=`<div class="panel"><div class="panel-head"><div><h2>Vendedores</h2><span class="muted">Funcionários vinculados às saídas</span></div><button class="btn green" id="addSeller">＋ Adicionar vendedor</button></div><div class="quick-grid">${sellers.map(s=>`<div class="quick"><b>♙ ${esc(s.name)}</b><span class="muted">Vendedor ativo</span></div>`).join('')}</div></div>`;
 $('#addSeller').onclick=()=>{openModal('Adicionar vendedor',`<form id="sellerForm"><div class="field"><label>Nome do vendedor</label><input name="name" required></div><div class="modal-actions"><button type="button" class="btn secondary" id="cancel">Cancelar</button><button class="btn">Salvar</button></div></form>`);$('#cancel').onclick=closeModal;$('#sellerForm').onsubmit=async e=>{e.preventDefault();try{await window.estoque.addSeller(new FormData(e.target).get('name'));closeModal();toast('Vendedor cadastrado.');render()}catch(err){toast(err.message)}}};
}
function reportsPage(){
 $('#content').innerHTML=`<div class="panel"><div class="panel-head"><div><h2>Relatórios e segurança</h2><span class="muted">Exporte os registros ou salve uma cópia completa do banco.</span></div></div><div class="quick-grid"><div class="quick"><b>▤ Relatório Excel / CSV</b><span class="muted">Exporta todas as entradas, saídas, vendedores, datas e valores.</span><p><button class="btn" id="csv">Exportar movimentações</button></p></div><div class="quick"><b>◈ Backup completo</b><span class="muted">Cópia do banco SQLite com produtos, estoque e histórico.</span><p><button class="btn green" id="backup">Salvar backup</button></p></div><div class="quick"><b>☁ Consulta fora do posto</b><span class="muted">Sem sincronização online nesta versão. Leve o relatório ou backup para consultar em outro local.</span></div></div></div><div class="hint">Importante: mantenha cópias de backup em um pendrive ou armazenamento separado. O banco principal fica neste computador.</div>`;
 $('#csv').onclick=async()=>{const r=await window.estoque.exportCsv();if(r)toast('Relatório exportado.')};
 $('#backup').onclick=async()=>{const r=await window.estoque.backup();if(r)toast('Backup salvo com sucesso.')};
}
render();
