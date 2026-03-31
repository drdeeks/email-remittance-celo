<script>
const API = 'https://email-remittance-pro.up.railway.app';
const COINGECKO_IDS = { celo:'celo', base:'ethereum', monad:'monad-network' };
let chain='celo', chainSym='CELO', walletAddr=null, walletProof=null;
let usdMode=false, tokenPrice=null, priceTimer=null;
let recipientToken='CELO'; // store selected token

// ── Token registry (match backend token addresses)
const TOKEN_REGISTRY = {
  celo: [{sym:'CELO',name:'Celo',addr:'NATIVE'},{sym:'cUSD',name:'Celo Dollar',addr:'0x765de816845861e75a25fca122bb6898b8b1282a'},{sym:'USDC',name:'USD Coin',addr:'0xceba9300f2b948710d2653dd7b07f33a8b32118c'}],
  base: [{sym:'ETH',name:'Ethereum',addr:'NATIVE'},{sym:'USDC',name:'USD Coin',addr:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'},{sym:'USDT',name:'Tether',addr:'0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'}],
  monad:[{sym:'MON',name:'Monad',addr:'NATIVE'}]
};

// ── Price fetch ─────────────────────────────────────────────
async function fetchPrice(){
  try{
    const id = COINGECKO_IDS[chain] || 'celo';
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    const d = await r.json();
    tokenPrice = d[id]?.usd || null;
    updateHint();
  }catch(e){ tokenPrice=null; }
}

function updateHint(){
  const hint = document.getElementById('price-hint');
  const val  = parseFloat(document.getElementById('amount').value)||0;
  if(!val){ hint.textContent=''; return; }
  let token = recipientToken || chainSym;
  if(usdMode && tokenPrice){
    const tokens = (val/tokenPrice).toFixed(6);
    hint.textContent = `≈ ${tokens} ${token} will be sent`;
  } else if(!usdMode && tokenPrice){
    const usd = (val*tokenPrice).toFixed(2);
    hint.textContent = `≈ $${usd} USD`;
  } else {
    hint.textContent = '';
  }
}

function onAmountInput(){ updateHint(); }

function toggleMode(){
  usdMode = !usdMode;
  const btn = document.getElementById('mode-btn');
  const lbl = document.getElementById('mode-label');
  const inp = document.getElementById('amount');
  if(usdMode){
    btn.textContent = (recipientToken||chainSym);
    btn.classList.add('usd');
    lbl.innerHTML = `enter in <strong>USD $</strong>`;
    inp.placeholder = '10.00';
    inp.step = '0.01';
  } else {
    btn.textContent = '$ USD';
    btn.classList.remove('usd');
    lbl.innerHTML = `enter in <span id="sym">${chainSym}</span>`;
    inp.placeholder = '0.01';
    inp.step = 'any';
  }
  document.getElementById('amount').value='';
  document.getElementById('price-hint').textContent='';
  updateHint();
}

function setChain(c,s){
  chain=c; chainSym=s;
  document.getElementById('sym') && (document.getElementById('sym').textContent=s);
  document.getElementById('chain-name').textContent=c.charAt(0).toUpperCase()+c.slice(1);
  ['celo','base','monad'].forEach(x=>document.getElementById('c-'+x).classList.toggle('active',x===c));
  // Update mode button label
  if(!usdMode) document.getElementById('mode-btn').textContent='$ USD';
  else document.getElementById('mode-btn').textContent=s;
  tokenPrice=null;
  // Update token selector
  updateTokenSelector();
  fetchPrice();
  updateHint();
}

// ── Token selector ───────────────────────────────────────────-
function updateTokenSelector(){
  const container=document.getElementById('token-selector');
  const tokens=TOKEN_REGISTRY[chain]||[];
  container.innerHTML='';
  tokens.forEach((t,i)=>{
    const btn=document.createElement('div');
    btn.className='chain'+(i===0?' active':'');
    btn.setAttribute('token',t.sym);
    btn.onclick=()=>selectToken(t.sym,btn);
    btn.innerHTML=`<div class="token-btn">${t.sym}</div>`;
    container.appendChild(btn);
  });
  recipientToken=tokens[0]?.sym||'';
}

function selectToken(sym,el){
  recipientToken=sym;
  const parent=document.getElementById('token-selector');
  [...parent.children].forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  if(usdMode) document.getElementById('mode-btn').textContent=sym;
  updateHint();
}

// ── Wallet detection ────────────────────────────────────────
function getProvider(){
  // EIP-6963 multi-wallet flow
  if(window.ethereum && Array.isArray(window.ethereum.providers) && window.ethereum.providers.length) return window.ethereum.providers[0];
  if(window.ethereum && window.ethereum.isMetaMask) return window.ethereum;
  if(window.ethereum) return window.ethereum;
  if(window.web3?.currentProvider) return window.web3.currentProvider;
  return null;
}

// ── Wallet ──────────────────────────────────────────────────
async function connectWallet(){
  const btn=document.getElementById('btn-w');
  try{
    let p=getProvider();
    if(!p){ await new Promise(r=>setTimeout(r,500)); p=getProvider(); }
    if(!p){ throw new Error('no_wallet'); }

    // User flow
    btn.textContent='Connecting…'; btn.disabled=true;
    const accs=await p.request({method:'eth_requestAccounts'});
    walletAddr=accs[0];
    btn.textContent='Sign to verify…';
    const nonce=Date.now()+'';
    const msg=`Email Remittance Pro\nProve wallet ownership\n${walletAddr}\nNonce:${nonce}\n\nNo funds moved.`;
    const sig=await p.request({method:'personal_sign',params:[msg,walletAddr]});
    walletProof={message:msg,signature:sig,nonce,address:walletAddr};
    document.getElementById('w-label').textContent='✓ Verified';
    document.getElementById('w-addr').textContent=walletAddr.slice(0,6)+'…'+walletAddr.slice(-4);
    btn.textContent='✓ Verified'; btn.classList.add('ok'); btn.disabled=false;
    document.getElementById('btn-send').disabled=false;
    document.getElementById('btn-send').textContent='Send →';
  }catch(e){
    walletAddr=null; walletProof=null;
    btn.textContent='Connect Wallet'; btn.disabled=false;
    document.getElementById('btn-send').disabled=true;
    document.getElementById('btn-send').textContent='Connect wallet to send';
    if(e==='no_wallet') showError('No wallet detected.\n\nInstall MetaMask, Coinbase Wallet, Rainbow, or any EIP-1193 wallet and refresh.\n\nRecipients never need a wallet — only senders do.');
    else if(e?.code===4001) showError('You must sign to verify wallet ownership.\nNo funds are moved.');
    else showError('Connection failed: '+e.message);
  }
}

// ── Send ────────────────────────────────────────────────────
async function send(){
  const email=document.getElementById('email').value.trim();
  const senderEmail=document.getElementById('sender-email').value.trim();
  const raw=parseFloat(document.getElementById('amount').value)||0;
  if(!email||!/\S+@\S+\.\S+/.test(email)){alert('Enter a valid recipient email');return;}
  if(!raw||raw<=0){alert('Enter a valid amount');return;}

  // Convert USD → token if in USD mode
  let tokenAmount = raw;
  if(usdMode){
    if(!tokenPrice){ alert('Price not loaded yet — try again in a moment.'); return; }
    tokenAmount = raw / tokenPrice;
  }
  const amountStr = tokenAmount.toFixed(8);

  show('loading');
  try{
    const r=await fetch(API+'/api/remittance/send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        senderEmail: senderEmail || (walletAddr?walletAddr.slice(0,6)+'@wallet.eth':'sender@remittance.app'),
        recipientEmail:email, amount:amountStr, chain,
        requireAuth:false, feeModel:'standard',
        senderWallet:walletAddr||'', walletProof,
        currency: recipientToken // pass token to backend (fallback to native; backend may swap if different from source)
      })
    });
    const d=await r.json();
    if(!r.ok||!d.success) throw new Error(d?.error?.message||d?.message||'Send failed');
    document.getElementById('claim-url').textContent=d.data.claimUrl;
    const usdNote = usdMode && tokenPrice ? ` ($${raw.toFixed(2)} USD)` : '';
    const swapNote = recipientToken!==chainSym ? ` → ${recipientToken}` : '';
    document.getElementById('s-sub').textContent=`${amountStr} ${swapNote?chainSym+swapNote:recipientToken}${usdNote} to ${email}`;
    show('success');
  }catch(e){ showError(e.message); }
}

function show(v){
  document.getElementById('view-form').style.display    = (v==='form')    ? 'block' : 'none';
  document.getElementById('view-success').style.display = (v==='success') ? 'block' : 'none';
  document.getElementById('view-error').style.display   = (v==='error')   ? 'block' : 'none';
  document.getElementById('view-loading').style.display = (v==='loading') ? 'block' : 'none';
}
function showForm(){show('form');}
function showError(m){document.getElementById('err-msg').textContent=m;show('error');}
function reset(){document.getElementById('email').value='';document.getElementById('amount').value='';show('form');}

// Init
show('form');
updateTokenSelector();
fetchPrice();
setInterval(fetchPrice, 30000);

</script>