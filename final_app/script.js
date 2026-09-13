const products=[
{id:1,name:'Sculpted Relaxed Shirt',cat:'women',price:1899,cls:'p1',sizes:['S','M','L','XL'],desc:'A relaxed everyday shirt with a sculpted silhouette and soft-touch finish.'},
{id:2,name:'Nova Utility Overshirt',cat:'men',price:2299,cls:'p2',sizes:['M','L','XL'],desc:'Structured utility layering with clean lines and functional pockets.'},
{id:3,name:'Soft Form Co-ord',cat:'women',price:2499,cls:'p3',sizes:['XS','S','M','L'],desc:'A coordinated set made for effortless movement from day to night.'},
{id:4,name:'Everyday Cargo',cat:'men',price:1799,cls:'p4',sizes:['30','32','34','36'],desc:'Relaxed cargo trousers with a modern tapered fit.'},
{id:5,name:'Studio Knit',cat:'women',price:2099,cls:'p5',sizes:['S','M','L'],desc:'Textured knitwear with a minimal studio-inspired finish.'},
{id:6,name:'Mono Street Tee',cat:'men',price:999,cls:'p6',sizes:['S','M','L','XL','XXL'],desc:'A heavyweight essential tee for clean everyday styling.'},
{id:7,name:'Orbit Mini Bag',cat:'accessories',price:1499,cls:'p7',sizes:['One Size'],desc:'Compact statement bag with an easy shoulder-to-crossbody shape.'},
{id:8,name:'NOVA Frame Shades',cat:'accessories',price:1299,cls:'p8',sizes:['One Size'],desc:'Bold geometric frames designed to finish the NOVA look.'},
{id:9,name:'NOVA Kids Hoodie',cat:'kids',price:1299,cls:'p9',sizes:['6Y','8Y','10Y','12Y'],desc:'Soft everyday hoodie with playful oversized proportions.'},
{id:10,name:'Glow Lip Tint',cat:'beauty',price:799,cls:'p10',sizes:['One Size'],desc:'Buildable colour with a comfortable glossy finish.'},
{id:11,name:'Mini Utility Crossbody',cat:'accessories',price:1199,cls:'p11',sizes:['One Size'],desc:'Hands-free compact storage for everyday essentials.'},
{id:12,name:'Cloud Lounge Set',cat:'kids',price:1599,cls:'p12',sizes:['6Y','8Y','10Y','12Y'],desc:'Soft lounge coordinates made for relaxed weekends.'}
];

let state={bag:JSON.parse(localStorage.getItem('novaBag')||'[]'),wish:JSON.parse(localStorage.getItem('novaWish')||'[]'),category:'all',query:''};

const money=n=>'₹'+Number(n).toLocaleString('en-IN');
const byId=id=>products.find(p=>p.id===id);

function save(){localStorage.setItem('novaBag',JSON.stringify(state.bag));localStorage.setItem('novaWish',JSON.stringify(state.wish));updateCounts();updateBag();updateWishlist();}
function updateCounts(){document.getElementById('bagCount').textContent=state.bag.reduce((s,x)=>s+x.qty,0);document.getElementById('wishCount').textContent=state.wish.length;}

function getFiltered(){
 let list=products.filter(p=>(state.category==='all'||p.cat===state.category)&&(p.name+' '+p.cat).toLowerCase().includes(state.query));
 const sort=document.getElementById('sort').value;
 if(sort==='low')list.sort((a,b)=>a.price-b.price); if(sort==='high')list.sort((a,b)=>b.price-a.price); if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
 return list;
}
function renderProducts(){
 const list=getFiltered(); document.getElementById('resultInfo').textContent=`${list.length} ${list.length===1?'style':'styles'} available`;
 document.getElementById('productGrid').innerHTML=list.map(p=>`
 <article class="product">
  <div class="pic ${p.cls}" onclick="openProduct(${p.id})"><div class="shape"></div><button class="heart ${state.wish.includes(p.id)?'liked':''}" onclick="event.stopPropagation();toggleWish(${p.id})">${state.wish.includes(p.id)?'♥':'♡'}</button><span class="quick">VIEW</span></div>
  <h3>${p.name}</h3><p>Novazova · ${p.cat}</p><p class="price">${money(p.price)}</p>
  <button class="add-mini" onclick="addBag(${p.id},'M')">ADD TO BAG +</button>
 </article>`).join('')||'<div class="empty">No styles found. Try another search or category.</div>';
}
function setCategory(cat){state.category=cat;document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat));renderProducts();document.getElementById('products').scrollIntoView({behavior:'smooth'});}
function filterSearch(){state.query=document.getElementById('search').value.toLowerCase().trim();renderProducts();}
document.getElementById('search').addEventListener('input',filterSearch);

function addBag(id,size='M'){
 const p=byId(id), existing=state.bag.find(x=>x.id===id&&x.size===size);
 if(existing)existing.qty++;else state.bag.push({id,size,qty:1});
 save();toast(`${p.name} added to your bag ✦`);
}
function changeQty(id,size,delta){
 const item=state.bag.find(x=>x.id===id&&x.size===size); if(!item)return;
 item.qty+=delta;if(item.qty<=0)state.bag=state.bag.filter(x=>!(x.id===id&&x.size===size));save();
}
function removeBag(id,size){state.bag=state.bag.filter(x=>!(x.id===id&&x.size===size));save();toast('Item removed');}
function updateBag(){
 const el=document.getElementById('bagItems');
 if(!state.bag.length){el.innerHTML='<div class="empty">Your bag is waiting for its first find.</div>';document.getElementById('bagTotal').textContent='₹0';return;}
 let total=0; el.innerHTML=state.bag.map(x=>{const p=byId(x.id);total+=p.price*x.qty;return `<div class="bagitem"><div class="bagpic ${p.cls}"></div><div class="baginfo"><b>${p.name}</b><small>Size: ${x.size}</small><strong>${money(p.price)}</strong><div class="qty"><button onclick="changeQty(${p.id},'${x.size}',-1)">−</button><span>${x.qty}</span><button onclick="changeQty(${p.id},'${x.size}',1)">+</button><button class="remove" onclick="removeBag(${p.id},'${x.size}')">Remove</button></div></div></div>`}).join('');
 document.getElementById('bagTotal').textContent=money(total);
}
function openBag(){document.getElementById('bag').classList.add('open');updateBag();}
function closeDrawer(id){document.getElementById(id).classList.remove('open');}
function toggleWish(id){const p=byId(id);state.wish.includes(id)?state.wish=state.wish.filter(x=>x!==id):(state.wish.push(id),toast(`${p.name} saved ♥`));save();renderProducts();}
function updateWishlist(){
 const el=document.getElementById('wishItems'); if(!state.wish.length){el.innerHTML='<div class="empty">Nothing saved yet.</div>';return;}
 el.innerHTML=state.wish.map(id=>{const p=byId(id);return `<div class="wishitem"><div class="wishpic ${p.cls}"></div><div><b>${p.name}</b><p>${money(p.price)}</p><button class="add-mini" onclick="addBag(${p.id},'${p.sizes[0]}')">ADD TO BAG</button></div></div>`}).join('');
}
function openWishlist(){document.getElementById('wishlist').classList.add('open');updateWishlist();}

function openProduct(id){
 const p=byId(id);
 document.getElementById('productDetail').innerHTML=`<div class="detail-grid"><div class="detail-pic pic ${p.cls}"><div class="shape"></div></div><div class="detail-copy"><p class="eyebrow">${p.cat.toUpperCase()}</p><h2>${p.name}</h2><div class="detail-price">${money(p.price)}</div><p>${p.desc}</p><hr><label>SELECT SIZE</label><div class="sizes" id="sizes">${p.sizes.map((s,i)=>`<button class="${i===0?'selected':''}" onclick="selectSize(this)">${s}</button>`).join('')}</div><button class="checkout" onclick="addDetailToBag(${p.id})">ADD TO BAG ↗</button><button class="text-btn" onclick="toggleWish(${p.id});closeModal('productModal')">${state.wish.includes(id)?'♥ SAVED':'♡ SAVE TO WISHLIST'}</button></div></div>`;
 openModal('productModal');
}
function selectSize(btn){document.querySelectorAll('#sizes button').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');}
function addDetailToBag(id){const size=document.querySelector('#sizes .selected')?.textContent||'M';addBag(id,size);closeModal('productModal');openBag();}
function openModal(id){document.getElementById(id).classList.add('show');}
function closeModal(id){document.getElementById(id).classList.remove('show');}
document.querySelectorAll('.modal-backdrop').forEach(x=>x.addEventListener('click',e=>{if(e.target===x)x.classList.remove('show');}));

function openCheckout(){
 if(!state.bag.length){toast('Your bag is empty');return;}
 openModal('checkoutModal');
}
function placeOrder(e){e.preventDefault();const name=document.getElementById('checkoutName').value.trim();state.bag=[];save();closeModal('checkoutModal');closeDrawer('bag');toast(`Order confirmed, ${name.split(' ')[0]}! 🎉`);setTimeout(()=>alert('NOVAZOVA DEMO ORDER\\n\\nThank you for shopping!\\nOrder ID: NOVA-'+Date.now().toString().slice(-6)+'\\n\\nNo real payment was processed.'),300);}
function subscribe(e){e.preventDefault();e.target.reset();toast('Welcome to Novazova ✨ You are on the list.');}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window._toast);window._toast=setTimeout(()=>t.classList.remove('show'),2200);}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal-backdrop').forEach(x=>x.classList.remove('show'));document.querySelectorAll('.drawer').forEach(x=>x.classList.remove('open'));}});
renderProducts();save();
let currentUser = JSON.parse(localStorage.getItem('novaUser') || 'null');
const isLocalDevOnOtherPort = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '3000' && location.port !== '';
const API_BASE = isLocalDevOnOtherPort ? 'http://localhost:3000' : '';
async function apiFetch(path, options={}){
  try{
    return await fetch(API_BASE + path, {...options, credentials:'include', cache:'no-store'});
  }catch(err){
    throw new Error('Cannot connect to the Novazova server. Start START_APP.bat and try again.');
  }
}

function hideWelcome(){
  const m=document.getElementById('welcomeModal');
  if(m)m.classList.remove('show');
}
function continueGuest(){
  currentUser=null; localStorage.removeItem('novaUser'); hideWelcome(); toast('Continuing as guest ✨');
}
function showLoginFromWelcome(){
  hideWelcome(); setTimeout(()=>openModal('loginModal'),120);
}
async function register(e){
  e.preventDefault();
  const name=document.getElementById('regName').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const phone=document.getElementById('regPhone').value.trim();
  const age=Number(document.getElementById('regAge').value);
  const password=document.getElementById('regPassword').value;
  const confirm=document.getElementById('regConfirm').value;
  if(password!==confirm){toast('Passwords do not match');return;}
  try{
    const r=await apiFetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,phone,age,password})});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||'Registration failed');
    currentUser=data.user; localStorage.setItem('novaUser',JSON.stringify(data.user)); hideWelcome(); toast(`Welcome, ${data.user.name.split(' ')[0]}! Account created ✨`);
  }catch(err){toast(err.message);}
}
async function login(e){
  e.preventDefault();
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  try{
    const r=await apiFetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||'Login failed');
    currentUser=data.user; localStorage.setItem('novaUser',JSON.stringify(data.user)); closeModal('loginModal'); toast(`Welcome back, ${data.user.name.split(' ')[0]} ✨`);
  }catch(err){toast(err.message);}
}

function updateProfileButton(){
 const btn=document.querySelector('.actions button[aria-label="Profile"]');
 if(!btn)return;
 btn.innerHTML=currentUser?`♙<small>${currentUser.name.split(' ')[0]}</small>`:'♙<small>Profile</small>';
}

document.addEventListener('DOMContentLoaded',()=>{updateProfileButton();renderProducts();updateCounts();updateBag();updateWishlist();});
