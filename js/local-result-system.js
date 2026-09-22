(function(){
  "use strict";
  function rootUrl(rel){ return new URL(rel, document.baseURI).href; }
  async function init(){
    const q=new URLSearchParams(location.search);
    const id=(q.get("id")||"").trim();
    if(!id){ location.replace("index.html"); return; }
    let data;
    try{
      const r=await fetch(rootUrl("data/"+encodeURIComponent(id)+".json"),{cache:"no-store"});
      if(!r.ok) throw new Error("data");
      data=await r.json();
    }catch(e){ location.replace("index.html"); return; }
    if(Number(data.returnCode)!==0 || !data.pdfFile){ location.replace("index.html"); return; }
    const alert=document.querySelector(".alert.alert-success");
    if(alert){
      const spans=alert.querySelectorAll("span");
      if(spans.length) spans[0].textContent=data.message||"The certificate is active. Please wait until the e-Certificate is shown below.";
      const dl=alert.querySelector("a.btn-large");
      if(dl){
        dl.setAttribute("href",rootUrl("data/"+data.pdfFile));
        dl.setAttribute("download",data.pdfFile);
        dl.addEventListener("click",function(ev){
          // Native anchor download is intentional; no server call.
        });
      }
    }
    const again=[...document.querySelectorAll("a.btn")].find(a=>a.textContent.includes("تحقق من خطاب آخر"));
    if(again){ again.setAttribute("href","index.html"); again.addEventListener("click",e=>{e.preventDefault();location.href="index.html";}); }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
