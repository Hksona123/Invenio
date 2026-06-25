import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, Trash2, Eye } from 'lucide-react';
import { api } from '../api';
import './Orders.css';

const AVATAR_COLORS = ['#3cffd0','#5200ff','#d4a017','#3860be','#ff4444','#9b59b6'];
const getAvatarColor = n => AVATAR_COLORS[(n||'A').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = n => (n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();

function Avatar({ name, size=36 }) {
  const color = getAvatarColor(name);
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:`${color}18`,border:`1px solid ${color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-mono)',fontSize:Math.floor(size*.36),fontWeight:600,color,flexShrink:0}}>
      {getInitials(name)}
    </div>
  );
}

function useDebounce(v,d=250){const[s,set]=useState(v);useEffect(()=>{const t=setTimeout(()=>set(v),d);return()=>clearTimeout(t)},[v,d]);return s;}

function fmtINR(n){return `₹${Number(n).toLocaleString('en-IN',{minimumFractionDigits:2})}`;}
function fmtDate(iso){if(!iso)return{date:'—',time:'—'};const d=new Date(iso);const day=String(d.getDate()).padStart(2,'0');const mon=d.toLocaleString('en-US',{month:'short'}).toUpperCase();const yr=d.getFullYear();const t=d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false});return{date:`${day} ${mon} ${yr}`,time:t};}
function padId(id){return `#${String(id).padStart(4,'0')}`;}

function SkeletonRow(){return(<tr>{[70,200,100,120,140,90].map((w,i)=>(<td key={i} style={{padding:16}}>{i===1?<div><div className="skeleton" style={{width:140,height:14,borderRadius:3}}/><div className="skeleton" style={{width:180,height:10,borderRadius:3,marginTop:6}}/></div>:<div className="skeleton" style={{width:w,height:14,borderRadius:3}}/>}</td>))}</tr>);}

function Toast({toast,onDismiss}){if(!toast)return null;return(<div className={`ord-toast ${toast.type}`}><span className="ord-toast-icon">{toast.type==='success'?'✓':'✕'}</span><span className="ord-toast-msg">{toast.msg}</span><button className="ord-toast-dismiss" onClick={onDismiss}>Dismiss</button></div>);}

function StepIndicator({step}){
  return(
    <div className="step-indicator">
      {[1,2].map((s,i)=>(
        <>{i>0&&<div className={`step-connector ${step>1?'active':'inactive'}`}/>}<div className={`step-dot ${step>=s?'active':'inactive'}`}>{step>s?'✓':s}</div></>
      ))}
      <span className="step-label">STEP {step} OF 2 — {step===1?'SELECT CUSTOMER':'ADD ITEMS'}</span>
    </div>
  );
}

function CreateOrderModal({onClose,onCreated,onToast}){
  const [step,setStep]=useState(1);
  const [customers,setCustomers]=useState([]);
  const [custSearch,setCustSearch]=useState('');
  const [selCust,setSelCust]=useState(null);
  const [products,setProducts]=useState([]);
  const [lines,setLines]=useState([{id:1,product:null,qty:'1'}]);
  const [submitting,setSubmitting]=useState(false);
  const [stockErrs,setStockErrs]=useState([]);

  useEffect(()=>{
    api.getCustomers().then(d=>setCustomers(d.items||[])).catch(()=>{});
    api.getProducts().then(d=>setProducts((d.items||[]).filter(p=>p.quantity>0))).catch(()=>{});
  },[]);

  useEffect(()=>{
    const h=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[onClose]);

  const filtCust=customers.filter(c=>c.full_name.toLowerCase().includes(custSearch.toLowerCase())||c.email.toLowerCase().includes(custSearch.toLowerCase()));
  const addLine=()=>setLines(p=>[...p,{id:Date.now(),product:null,qty:'1'}]);
  const removeLine=id=>setLines(p=>p.filter(l=>l.id!==id));
  const updateLine=(id,patch)=>setLines(p=>p.map(l=>l.id===id?{...l,...patch}:l));
  const usedIds=(curId)=>lines.filter(l=>l.id!==curId&&l.product).map(l=>l.product.id);
  const avail=(curId)=>products.filter(p=>!usedIds(curId).includes(p.id));
  const total=lines.reduce((s,l)=>s+(l.product?l.product.price*(parseInt(l.qty)||0):0),0);
  const valid=lines.length>0&&lines.every(l=>l.product&&parseInt(l.qty)>=1);

  async function place(){
    setStockErrs([]);setSubmitting(true);
    try{
      await api.createOrder({customer_id:selCust.id,items:lines.filter(l=>l.product).map(l=>({product_id:l.product.id,quantity:parseInt(l.qty)}))});
      onToast('success',`Order placed for ${selCust.full_name}`);
      onClose();onCreated();
    }catch(err){
      try{const p=JSON.parse(err.message);if(p.errors){setStockErrs(p.errors);return;}}catch(_){}
      onToast('error',err.message||'Failed to place order');
    }finally{setSubmitting(false);}
  }

  return(
    <div className="ord-modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="ord-modal">
        <div className="ord-modal-header">
          <span className="ord-modal-title">Create Order</span>
          <button className="ord-modal-close" onClick={onClose}><X size={16}/></button>
        </div>
        <StepIndicator step={step}/>

        {step===1&&(
          <>
            <input className="ord-field-input" placeholder="Search customer..." value={custSearch} onChange={e=>setCustSearch(e.target.value)} style={{marginBottom:0}}/>
            <div className="customer-list">
              {filtCust.length===0?<div style={{padding:24,textAlign:'center',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)'}}>NO CUSTOMERS FOUND</div>
                :filtCust.map(c=>(
                  <div key={c.id} className={`customer-list-item ${selCust?.id===c.id?'selected':''}`} onClick={()=>setSelCust(c)}>
                    <Avatar name={c.full_name} size={32}/>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{c.full_name}</div><div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)',marginTop:2}}>{c.email}</div></div>
                    {selCust?.id===c.id&&<span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--accent-mint)'}}>✓</span>}
                  </div>
                ))
              }
            </div>
            <div className="ord-modal-footer">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={()=>setStep(2)} disabled={!selCust} style={{opacity:selCust?1:0.4}}>Next: Add Items →</button>
            </div>
          </>
        )}

        {step===2&&(
          <>
            <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-secondary)',letterSpacing:'1px',marginBottom:16}}>CUSTOMER: <span style={{color:'var(--text-primary)',fontWeight:600}}>{selCust?.full_name}</span></div>
            {lines.map((li)=>(
              <div key={li.id} className="line-item-row">
                <div>
                  <select className="ord-field-input" value={li.product?.id??''} onChange={e=>{const p=products.find(p=>p.id===parseInt(e.target.value));updateLine(li.id,{product:p??null,qty:'1'});}}>
                    <option value="">Select product...</option>
                    {avail(li.id).map(p=><option key={p.id} value={p.id}>{p.name} — {p.sku}</option>)}
                  </select>
                  {li.product&&<div style={{fontFamily:'var(--font-mono)',fontSize:10,color:li.product.quantity<10?'var(--warning)':'var(--text-secondary)',marginTop:4}}>{li.product.quantity} IN STOCK</div>}
                </div>
                <div>
                  <input type="number" className={`ord-field-input${li.product&&parseInt(li.qty)>li.product.quantity?' has-error':''}`} min="1" max={li.product?.quantity??9999} value={li.qty} onChange={e=>updateLine(li.id,{qty:e.target.value})} disabled={!li.product} style={{textAlign:'center'}}/>
                  {li.product&&parseInt(li.qty)>li.product.quantity&&<div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--danger)',marginTop:4}}>EXCEEDS STOCK</div>}
                </div>
                <div style={{fontWeight:600,fontSize:14,color:li.product?'var(--text-primary)':'var(--text-secondary)',textAlign:'right',paddingTop:8}}>{li.product?fmtINR(li.product.price*(parseInt(li.qty)||0)):'—'}</div>
                <button onClick={()=>removeLine(li.id)} disabled={lines.length===1} style={{background:'transparent',border:'1px solid rgba(255,68,68,0.3)',borderRadius:6,color:lines.length===1?'var(--border-hairline)':'var(--danger)',cursor:lines.length===1?'not-allowed':'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>✕</button>
              </div>
            ))}
            <button className="btn-ghost" onClick={addLine} disabled={lines.some(l=>!l.product)} style={{width:'100%',marginBottom:20}}>+ Add Another Item</button>

            {lines.some(l=>l.product)&&(
              <div className="order-summary-panel">
                <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-secondary)',letterSpacing:'1.5px',marginBottom:12}}>ORDER SUMMARY</div>
                {lines.filter(l=>l.product).map(l=>(
                  <div key={l.id} className="order-summary-line">
                    <div><span style={{fontFamily:'var(--font-body)',fontSize:13,color:'var(--text-primary)'}}>{l.product.name}</span><span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)',marginLeft:8}}>× {l.qty||0}</span></div>
                    <div style={{textAlign:'right'}}><div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)'}}>{fmtINR(l.product.price)} each</div><div style={{fontWeight:600,fontSize:14}}>{fmtINR(l.product.price*(parseInt(l.qty)||0))}</div></div>
                  </div>
                ))}
                <div className="order-summary-total">
                  <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)',letterSpacing:'1.5px'}}>TOTAL</span>
                  <span style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:'var(--accent-mint)'}}>{fmtINR(total)}</span>
                </div>
              </div>
            )}

            {stockErrs.length>0&&(
              <div className="stock-error-panel">
                <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--danger)',letterSpacing:'1.5px',marginBottom:8}}>INSUFFICIENT STOCK</div>
                {stockErrs.map((e,i)=><div key={i} style={{fontFamily:'var(--font-body)',fontSize:12,color:'var(--danger)',marginBottom:4}}>• {e}</div>)}
              </div>
            )}

            <div className="ord-modal-footer">
              <button className="btn-ghost" onClick={()=>setStep(1)}>← Back</button>
              <button className="btn-primary" onClick={place} disabled={!valid||submitting} style={{opacity:valid&&!submitting?1:0.4}}>{submitting?'Placing Order…':'Place Order →'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OrderDrawer({order,onClose,onDelete}){
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[onClose]);
  const{date,time}=fmtDate(order.created_at);
  return(
    <>
      <div className="ord-drawer-overlay" onClick={onClose}/>
      <div className="ord-drawer">
        <div style={{padding:'24px 24px 20px',borderBottom:'1px solid var(--border-hairline)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--accent-mint)',letterSpacing:'1.5px',marginBottom:4}}>ORDER DETAILS</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'var(--text-primary)'}}>{padId(order.id)}</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'var(--text-secondary)',fontSize:20,cursor:'pointer',padding:4}}>✕</button>
        </div>

        <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border-hairline)'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-secondary)',letterSpacing:'1.5px',marginBottom:12}}>CUSTOMER</div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Avatar name={order.customer_name}/>
            <div>
              <div style={{fontWeight:600,fontSize:15,color:'var(--text-primary)'}}>{order.customer_name}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-secondary)',marginTop:2}}>{order.customer_email}</div>
            </div>
          </div>
        </div>

        <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border-hairline)'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-secondary)',letterSpacing:'1.5px',marginBottom:6}}>PLACED</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:13,color:'var(--text-muted)'}}>{date} · {time}</div>
        </div>

        <div style={{padding:'20px 24px',flex:1}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-secondary)',letterSpacing:'1.5px',marginBottom:16}}>ORDER ITEMS — {order.line_count} {order.line_count===1?'PRODUCT':'PRODUCTS'}</div>
          {order.items.map(item=>(
            <div key={item.id} style={{borderBottom:'1px solid var(--border-hairline)',paddingBottom:16,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:'var(--text-primary)'}}>{item.product_name}</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)',marginTop:3}}>{item.product_sku}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)'}}>× {item.quantity} @ {fmtINR(item.unit_price)}</div>
                  <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)',marginTop:3}}>{fmtINR(item.subtotal)}</div>
                </div>
              </div>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:4}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)',letterSpacing:'1.5px'}}>GRAND TOTAL</span>
            <span style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'var(--accent-mint)'}}>{fmtINR(order.total_amount)}</span>
          </div>
        </div>

        <div style={{padding:'16px 24px',borderTop:'1px solid var(--border-hairline)',flexShrink:0}}>
          <button onClick={()=>{onDelete(order);onClose();}} style={{width:'100%',background:'rgba(255,68,68,0.08)',border:'1px solid rgba(255,68,68,0.3)',borderRadius:24,color:'var(--danger)',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'1.5px',padding:'12px',cursor:'pointer'}}>
            🗑 DELETE ORDER
          </button>
        </div>
      </div>
    </>
  );
}

function DeleteModal({target,onClose,onDeleted,onToast}){
  const [deleting,setDeleting]=useState(false);
  const [err,setErr]=useState(null);
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[onClose]);
  async function handleDelete(){
    setDeleting(true);setErr(null);
    try{await api.deleteOrder(target.id);onToast('success',`Order ${padId(target.id)} deleted`);onClose();onDeleted();}
    catch(e){setErr(e.message);}
    finally{setDeleting(false);}
  }
  const{date}=fmtDate(target.created_at);
  return(
    <div className="ord-modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="ord-modal" style={{maxWidth:440}}>
        <div className="ord-modal-header">
          <span className="ord-modal-title danger">Delete Order</span>
          <button className="ord-modal-close" onClick={onClose}><X size={16}/></button>
        </div>
        <div style={{background:'var(--surface-card)',border:'1px solid var(--border-card)',borderRadius:8,padding:'12px 16px',marginBottom:20}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--accent-mint)',marginBottom:4}}>{padId(target.id)}</div>
          <div style={{fontWeight:600,fontSize:15,color:'var(--text-primary)'}}>{target.customer_name}</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)',marginTop:4}}>{fmtINR(target.total_amount)} · {target.line_count} {target.line_count===1?'product':'products'} · {target.item_count} {target.item_count===1?'unit':'units'} · {date}</div>
        </div>
        {err&&<div style={{background:'rgba(255,68,68,0.08)',border:'1px solid rgba(255,68,68,0.3)',borderLeft:'3px solid var(--danger)',borderRadius:6,padding:'12px 16px',marginBottom:16,fontFamily:'var(--font-body)',fontSize:13,color:'var(--danger)'}}>{err}</div>}
        <p style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--text-muted)',lineHeight:1.6,marginBottom:8}}>This order will be permanently deleted.</p>
        <p className="delete-stock-warning">⚠ Stock will NOT be restocked — goods are considered dispatched.</p>
        <div className="ord-modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={deleting}>{err?'Got It':'Cancel'}</button>
          {!err&&<button className="btn-ord-delete" onClick={handleDelete} disabled={deleting}>{deleting?'Deleting…':'Delete Order'}</button>}
        </div>
      </div>
    </div>
  );
}

export default function Orders(){
  const [orders,setOrders]=useState([]);
  const [summary,setSummary]=useState(null);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [showCreate,setShowCreate]=useState(false);
  const [drawer,setDrawer]=useState(null);
  const [delTarget,setDelTarget]=useState(null);
  const [toast,setToast]=useState(null);
  const db=useDebounce(search,250);

  function showToast(type,msg){setToast({type,msg});setTimeout(()=>setToast(null),3500);}

  const fetchOrders=useCallback(async()=>{
    setLoading(true);
    try{const d=await api.getOrders(db);setOrders(d.items);setSummary({total:d.total,total_revenue:d.total_revenue,orders_today:d.orders_today});}
    catch{showToast('error','Failed to load orders');}
    finally{setLoading(false);}
  },[db]);

  useEffect(()=>{fetchOrders();},[fetchOrders]);

  return(
    <div className="orders-page">
      <div>
        <div className="ord-breadcrumb">Invenio / Orders</div>
        <div className="ord-header">
          <div><h1 className="ord-title">Orders</h1><p className="ord-subtitle">Track and manage customer orders</p></div>
          <button className="btn-primary" onClick={()=>setShowCreate(true)}><Plus size={14}/> Create Order</button>
        </div>
      </div>

      <div className="ord-summary-strip">
        <div className="ord-summary-item"><span className="ord-summary-value">{summary?.total??'—'}</span><span className="ord-summary-label">Total Orders</span></div>
        <div className="ord-summary-item revenue"><span className="ord-summary-value">{summary?fmtINR(summary.total_revenue):'—'}</span><span className="ord-summary-label">Total Revenue</span></div>
        <div className={`ord-summary-item${(summary?.orders_today??0)>0?' highlight':''}`}><span className="ord-summary-value">{summary?.orders_today??'—'}</span><span className="ord-summary-label">Today</span></div>
      </div>

      <div className="ord-search-wrap">
        <div className="ord-search-bar">
          <span className="ord-search-icon"><Search size={16}/></span>
          <input className="ord-search-input" placeholder="Search by order # or customer name / email..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button className="ord-search-clear" onClick={()=>setSearch('')}><X size={14}/></button>}
        </div>
        {search&&!isNaN(search.trim())&&search.trim()&&<div className="ord-search-hint">SEARCHING FOR ORDER #{search.trim()}</div>}
      </div>

      <div className="ord-table-container">
        <table className="ord-table">
          <thead><tr>
            <th>Order #</th><th>Customer</th><th className="center">Items</th><th className="right">Total</th><th>Date</th><th className="center">Actions</th>
          </tr></thead>
          <tbody>
            {loading?Array.from({length:8},(_,i)=><SkeletonRow key={i}/>)
              :orders.length===0?(
                <tr><td colSpan={6} className="ord-empty-cell">
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                    {search?(<><div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:'var(--text-secondary)',textTransform:'uppercase'}}>No Results</div><div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'1px',color:'var(--text-secondary)'}}>No orders match "{search}"</div><button className="btn-ghost" style={{marginTop:8}} onClick={()=>setSearch('')}>Clear Search</button></>)
                      :(<><div style={{fontSize:32}}>🛒</div><div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:'var(--text-secondary)',textTransform:'uppercase'}}>No Orders Yet</div><div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'1px',color:'var(--text-secondary)'}}>Create your first order to get started</div><button className="btn-primary" style={{marginTop:8}} onClick={()=>setShowCreate(true)}><Plus size={13}/> Create Order</button></>)}
                  </div>
                </td></tr>
              ):orders.map(o=>{
                const{date,time}=fmtDate(o.created_at);
                return(
                  <tr key={o.id} onClick={()=>setDrawer(o)}>
                    <td><span style={{fontFamily:'var(--font-mono)',fontSize:13,color:'var(--accent-mint)',fontWeight:600}}>{padId(o.id)}</span></td>
                    <td><div style={{fontWeight:600,fontSize:14,color:'var(--text-primary)'}}>{o.customer_name}</div><div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-secondary)',marginTop:2}}>{o.customer_email}</div></td>
                    <td className="center"><div style={{fontWeight:600,fontSize:14}}>{o.line_count} {o.line_count===1?'product':'products'}</div><div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-secondary)',marginTop:2}}>{o.item_count} {o.item_count===1?'unit':'units'}</div></td>
                    <td className="right"><span style={{fontWeight:700,fontSize:16}}>{fmtINR(o.total_amount)}</span></td>
                    <td><div style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-muted)'}}>{date}</div><div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-secondary)',marginTop:2}}>{time}</div></td>
                    <td className="center" onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                        <button className="btn-icon" title="View order" onClick={e=>{e.stopPropagation();setDrawer(o);}}><Eye size={14}/></button>
                        <button className="btn-icon danger" title="Delete order" onClick={e=>{e.stopPropagation();setDelTarget(o);}}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {showCreate&&<CreateOrderModal onClose={()=>setShowCreate(false)} onCreated={fetchOrders} onToast={showToast}/>}
      {drawer&&<OrderDrawer order={drawer} onClose={()=>setDrawer(null)} onDelete={o=>{setDelTarget(o);setDrawer(null);}}/>}
      {delTarget&&<DeleteModal target={delTarget} onClose={()=>setDelTarget(null)} onDeleted={fetchOrders} onToast={showToast}/>}
      <Toast toast={toast} onDismiss={()=>setToast(null)}/>
    </div>
  );
}
