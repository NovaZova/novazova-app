const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const url=require('url');

const BREVO_API_KEY=process.env.BREVO_API_KEY||'';
const BREVO_SENDER_EMAIL=process.env.BREVO_SENDER_EMAIL||'';
const BREVO_SENDER_NAME=process.env.BREVO_SENDER_NAME||'Novazova';

async function sendOtpEmail(to,otp,purpose){
 const subject=purpose==='reset'?'Novazova password reset code':'Novazova signup verification code';
 const text=`Your Novazova ${purpose==='reset'?'password reset':'signup verification'} code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`;
 const html=`<p>Your Novazova ${purpose==='reset'?'password reset':'signup verification'} code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`;
 if(BREVO_API_KEY&&BREVO_SENDER_EMAIL){
  const r=await fetch('https://api.brevo.com/v3/smtp/email',{
   method:'POST',
   headers:{'api-key':BREVO_API_KEY,'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify({sender:{email:BREVO_SENDER_EMAIL,name:BREVO_SENDER_NAME},to:[{email:to}],subject,htmlContent:html,textContent:text})
  });
  if(!r.ok){const errBody=await r.text().catch(()=>'');throw new Error(`Brevo API error ${r.status}: ${errBody}`);}
 }else{
  console.log(`\n[DEV MODE - no email credentials set] OTP for ${to} (${purpose}): ${otp}\n`);
 }
}
function genOtp(){return String(crypto.randomInt(100000,1000000));}
const pendingSignups=new Map();
const pendingResets=new Map();
const OTP_TTL_MS=10*60*1000;

const ROOT=__dirname;
const DATA=path.join(ROOT,'data');
const CSV=path.join(DATA,'users.csv');
if(!fs.existsSync(DATA)) fs.mkdirSync(DATA,{recursive:true});
if(!fs.existsSync(CSV)) fs.writeFileSync(CSV,'id,name,email,age,created_at\n');

const sessions=new Map();
const ADMIN_USER=process.env.ADMIN_USER||'admin';
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'Nova03Zova24';
function checkAdminAuth(req){
 const header=req.headers['authorization']||'';
 if(!header.startsWith('Basic '))return false;
 let decoded;try{decoded=Buffer.from(header.slice(6),'base64').toString('utf8');}catch(e){return false;}
 const idx=decoded.indexOf(':');if(idx===-1)return false;
 const user=decoded.slice(0,idx),pass=decoded.slice(idx+1);
 const uBuf=Buffer.from(user),euBuf=Buffer.from(ADMIN_USER),pBuf=Buffer.from(pass),epBuf=Buffer.from(ADMIN_PASSWORD);
 const userOk=uBuf.length===euBuf.length&&crypto.timingSafeEqual(uBuf,euBuf);
 const passOk=pBuf.length===epBuf.length&&crypto.timingSafeEqual(pBuf,epBuf);
 return userOk&&passOk;
}
function requireAdminAuth(req,res){
 if(checkAdminAuth(req))return true;
 res.writeHead(401,{'WWW-Authenticate':'Basic realm="Novazova Admin"','Content-Type':'text/plain; charset=utf-8'});
 res.end('Authentication required.');
 return false;
}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Credentials':'true'});res.end(JSON.stringify(obj));}
function body(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e6)req.destroy();});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'));}catch(e){reject(e);}});req.on('error',reject);});}
function esc(v){return '"'+String(v??'').replace(/"/g,'""')+'"';}
function readUsers(){
 const lines=fs.readFileSync(CSV,'utf8').trim().split(/\r?\n/).slice(1).filter(Boolean);
 return lines.map(line=>{const a=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){a.push(cur);cur='';}else cur+=c;}a.push(cur);return {id:a[0],name:a[1],email:a[2],age:a[3],created_at:a[4]};});
}
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){return new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,k)=>e?reject(e):resolve(`${salt}:${k.toString('hex')}`)));}
async function verifyPassword(password,stored){const [salt,key]=stored.split(':');return new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,k)=>{if(e)return reject(e);resolve(key.length===k.toString('hex').length&&crypto.timingSafeEqual(Buffer.from(key,'hex'),k));}));}
function setCookie(res,name,value){res.setHeader('Set-Cookie',`${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);}
function cleanUser(u){return {id:u.id,name:u.name,email:u.email,age:u.age,created_at:u.created_at};}
async function api(req,res){
 try{
  const pathname=url.parse(req.url).pathname;
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Credentials':'true'});return res.end();}
  if(req.method==='GET'&&pathname==='/api/health') return json(res,200,{ok:true,service:'novazova'});
  if(req.method==='POST'&&pathname==='/api/register/start'){
   const {name,email,age,password}=await body(req);
   if(!name||!email||!age||!password) return json(res,400,{error:'Please fill all fields.'});
   if(password.length<8)return json(res,400,{error:'Password must be at least 8 characters.'});
   if(!/^\S+@\S+\.\S+$/.test(email))return json(res,400,{error:'Enter a valid email address.'});
   const users=readUsers();if(users.some(u=>u.email.toLowerCase()===email.toLowerCase()))return json(res,409,{error:'An account with this email already exists.'});
   const otp=genOtp();const hash=await hashPassword(password);
   pendingSignups.set(email.toLowerCase(),{otp,expiresAt:Date.now()+OTP_TTL_MS,name,email,age,hash});
   try{await sendOtpEmail(email,otp,'signup');}catch(e){console.error('Email send failed:',e.message);return json(res,500,{error:'Could not send verification email. Try again shortly.'});}
   return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&pathname==='/api/register/verify'){
   const {email,otp}=await body(req);
   const pending=pendingSignups.get(String(email||'').toLowerCase());
   if(!pending) return json(res,400,{error:'No pending signup for this email. Please start again.'});
   if(Date.now()>pending.expiresAt){pendingSignups.delete(email.toLowerCase());return json(res,400,{error:'Code expired. Please start signup again.'});}
   if(String(otp)!==pending.otp) return json(res,400,{error:'Incorrect code. Please try again.'});
   const id=crypto.randomUUID();const created=new Date().toISOString();
   const authFile=path.join(DATA,'auth.json');let auth={};if(fs.existsSync(authFile))auth=JSON.parse(fs.readFileSync(authFile,'utf8')||'{}');auth[id]=pending.hash;fs.writeFileSync(authFile,JSON.stringify(auth,null,2));
   fs.appendFileSync(CSV,[id,pending.name,pending.email,pending.age,created].map(esc).join(',')+'\n');
   pendingSignups.delete(email.toLowerCase());
   const user={id,name:pending.name,email:pending.email,age:pending.age,created_at:created};const token=crypto.randomBytes(32).toString('hex');sessions.set(token,user);setCookie(res,'nova_session',token);return json(res,201,{user});
  }
  if(req.method==='POST'&&pathname==='/api/login'){
   const {email,password}=await body(req);const users=readUsers();const u=users.find(x=>x.email.toLowerCase()===String(email||'').toLowerCase());
   const authFile=path.join(DATA,'auth.json');const auth=fs.existsSync(authFile)?JSON.parse(fs.readFileSync(authFile,'utf8')||'{}'):{};
   if(!u||!auth[u.id]||!(await verifyPassword(password,auth[u.id])))return json(res,401,{error:'Incorrect email or password.'});
   const token=crypto.randomBytes(32).toString('hex');sessions.set(token,u);setCookie(res,'nova_session',token);return json(res,200,{user:cleanUser(u)});
  }
  if(req.method==='POST'&&pathname==='/api/reset-password/start'){
   const {email}=await body(req);
   const users=readUsers();const u=users.find(x=>x.email.toLowerCase()===String(email||'').toLowerCase());
   if(!u)return json(res,404,{error:'No account found with that email.'});
   const otp=genOtp();
   pendingResets.set(email.toLowerCase(),{otp,expiresAt:Date.now()+OTP_TTL_MS,userId:u.id});
   try{await sendOtpEmail(email,otp,'reset');}catch(e){console.error('Email send failed:',e.message);return json(res,500,{error:'Could not send reset email. Try again shortly.'});}
   return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&pathname==='/api/reset-password/verify'){
   const {email,otp,newPassword}=await body(req);
   if(!newPassword||newPassword.length<8)return json(res,400,{error:'Password must be at least 8 characters.'});
   const pending=pendingResets.get(String(email||'').toLowerCase());
   if(!pending) return json(res,400,{error:'No pending reset for this email. Please start again.'});
   if(Date.now()>pending.expiresAt){pendingResets.delete(email.toLowerCase());return json(res,400,{error:'Code expired. Please start again.'});}
   if(String(otp)!==pending.otp) return json(res,400,{error:'Incorrect code. Please try again.'});
   const authFile=path.join(DATA,'auth.json');let auth=fs.existsSync(authFile)?JSON.parse(fs.readFileSync(authFile,'utf8')||'{}'):{};
   auth[pending.userId]=await hashPassword(newPassword);fs.writeFileSync(authFile,JSON.stringify(auth,null,2));
   pendingResets.delete(email.toLowerCase());
   return json(res,200,{ok:true});
  }
  if(req.method==='GET'&&pathname==='/api/users'){
   if(!requireAdminAuth(req,res))return;
   return json(res,200,{users:readUsers()});
  }
  if(req.method==='GET'&&pathname==='/api/me'){
   const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('nova_session='));const token=cookie?.split('=')[1];return json(res,200,{user:token&&sessions.get(token)?cleanUser(sessions.get(token)):null});
  }
  json(res,404,{error:'Not found'});
 }catch(e){console.error(e);json(res,500,{error:'Server error. Please try again.'});}
}
function serve(req,res){
 const pathname=url.parse(req.url).pathname;
 if(pathname==='/api/users.csv'){
  if(!requireAdminAuth(req,res))return;
  if(!fs.existsSync(CSV)) fs.writeFileSync(CSV,'id,name,email,phone,age,created_at\n'); res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename=novazova_users.csv','Cache-Control':'no-store'}); return res.end(fs.readFileSync(CSV));
 }
 if(pathname.startsWith('/api/'))return api(req,res);
 let file=pathname==='/'?'/index.html':pathname;
 if(file==='/admin'||file==='/admin.html'){ if(!requireAdminAuth(req,res))return; file='/admin.html'; }
 const full=path.normalize(path.join(ROOT,file));if(!full.startsWith(ROOT))return json(res,403,{error:'Forbidden'});
 fs.readFile(full,(err,data)=>{if(err)return json(res,404,{error:'Page not found'});res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});res.end(data);});
}
const PORT=process.env.PORT||3000;
http.createServer(serve).listen(PORT,'0.0.0.0',()=>console.log(`Novazova running at http://localhost:${PORT}`));
