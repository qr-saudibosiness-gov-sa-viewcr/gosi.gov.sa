(function(){
  "use strict";
  function rootUrl(rel){ return new URL(rel, document.baseURI).href; }
  function clean(v){ return String(v == null ? "" : v).trim(); }
  async function loadRoutes(){
    const r=await fetch(rootUrl("data/routes.json"),{cache:"no-store"});
    if(!r.ok) throw new Error("routes");
    return r.json();
  }
  function showError(msg){
    let box=document.getElementById("localVerifyError");
    if(!box){
      box=document.createElement("div");
      box.id="localVerifyError";
      box.style.cssText="max-width:640px;margin:14px auto 0;padding:12px 16px;border-radius:6px;background:#fff3f3;color:#a40000;text-align:center;font-weight:500;";
      const btn=document.querySelector(".verifyECertificateControlBtn");
      if(btn && btn.parentElement) btn.parentElement.appendChild(box);
    }
    box.textContent=msg;
  }
  async function preview(ev){
    if(ev) ev.preventDefault();
    const stakeholder=clean(document.getElementById("StakeholderValue")?.value);
    const certificate=clean(document.getElementById("CertificateNumber")?.value);
    if(!stakeholder || !certificate){ showError("الرجاء إدخال رقم اشتراك المنشأة ورمز الشهادة"); return; }
    try{
      const routes=await loadRoutes();
      const id=routes[stakeholder+"|"+certificate];
      if(!id){ showError("لا توجد شهادة مطابقة للبيانات المدخلة"); return; }
      location.href="result.html?id="+encodeURIComponent(id);
    }catch(e){ showError("تعذر قراءة بيانات الشهادات المحلية"); }
  }
  function init(){
    const btn=document.querySelector(".verifyECertificateControlBtn");
    const a=document.getElementById("StakeholderValue");
    const b=document.getElementById("CertificateNumber");
    if(btn){ btn.setAttribute("href","#"); btn.addEventListener("click",preview); }
    [a,b].forEach(el=>{
      if(!el) return;
      el.value="";
      el.removeAttribute("readonly");
      el.removeAttribute("disabled");
      el.classList.remove("ng-invalid");
      el.addEventListener("input",()=>{ const x=document.getElementById("localVerifyError"); if(x) x.remove(); });
      el.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); preview(e); }});
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
