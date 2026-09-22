(function(){
  "use strict";
  var currentScript=document.currentScript;
  var siteRoot=new URL('../', currentScript.src);
  function U(rel){ return new URL(rel, siteRoot).href; }
  function lang(){ return /\/en\/VerifyECertificate\/Establishment\/?$/i.test(location.pathname)?'en':'ar'; }
  function clean(v){ return String(v==null?'':v).trim(); }
  function stripTrailingSlash(){
    if(location.pathname.endsWith('/')) history.replaceState(null,'',location.pathname.slice(0,-1)+location.search+location.hash);
  }
  function setLanguageLink(){
    var a=document.getElementById('btn-change-language'); if(!a) return;
    var target=lang()==='ar'?'en':'ar';
    a.href=U(target+'/VerifyECertificate/Establishment');
    a.onclick=function(e){ e.preventDefault(); location.href=this.href; };
  }
  async function routes(){
    var r=await fetch(U('data/routes.json'),{cache:'no-store'}); if(!r.ok) throw new Error('routes'); return r.json();
  }
  async function record(id){
    var r=await fetch(U('data/'+encodeURIComponent(id)+'.json'),{cache:'no-store'}); if(!r.ok) throw new Error('record'); return r.json();
  }
  function errorText(type){
    var ar=lang()==='ar';
    if(type==='empty') return ar?'الرجاء إدخال رقم اشتراك المنشأة ورمز الشهادة':'Please enter the Establishment Registration Number and Certificate Code';
    if(type==='missing') return ar?'لا توجد شهادة مطابقة للبيانات المدخلة':'No certificate matches the entered information';
    return ar?'تعذر قراءة بيانات الشهادات المحلية':'Unable to read local certificate data';
  }
  function showError(msg){
    var box=document.getElementById('localVerifyError');
    if(!box){
      box=document.createElement('div'); box.id='localVerifyError';
      box.style.cssText='max-width:640px;margin:14px auto 0;padding:12px 16px;border-radius:6px;background:#fff3f3;color:#a40000;text-align:center;font-weight:500;';
      var btn=document.querySelector('.verifyECertificateControlBtn');
      if(btn&&btn.parentElement) btn.parentElement.appendChild(box);
    }
    box.textContent=msg;
  }
  function clearError(){ var x=document.getElementById('localVerifyError'); if(x) x.remove(); }
  async function renderResult(data){
    var l=lang();
    var r=await fetch(U('templates/result-'+l+'.html'),{cache:'no-store'}); if(!r.ok) throw new Error('template');
    var html=await r.text(); var doc=new DOMParser().parseFromString(html,'text/html');
    document.body.innerHTML=doc.body.innerHTML;
    document.documentElement.dir=l==='ar'?'rtl':'ltr'; document.documentElement.lang=l;
    setLanguageLink();
    var alert=document.getElementById('localCertificateSuccess');
    if(alert){
      var spans=alert.querySelectorAll('span');
      if(spans.length){
        spans[0].textContent=(data.messageEn||data.message||'The certificate is active. Please wait until the e-Certificate is shown below.');
      }
    }
    var dl=document.getElementById('localCertificateDownload');
    if(dl){ dl.href=U('data/'+data.pdfFile); dl.setAttribute('download',data.pdfFile); }
    var again=document.getElementById('localCertificateAgain');
    if(again) again.onclick=function(e){ e.preventDefault(); history.replaceState(null,'',location.pathname); location.reload(); };
    window.scrollTo({top:0,behavior:'instant'});
  }
  async function preview(e){
    if(e) e.preventDefault(); clearError();
    var stakeholder=clean(document.getElementById('StakeholderValue')?.value);
    var cert=clean(document.getElementById('CertificateNumber')?.value);
    if(!stakeholder||!cert){ showError(errorText('empty')); return; }
    try{
      var map=await routes(); var id=map[stakeholder+'|'+cert];
      if(!id){ showError(errorText('missing')); return; }
      var data=await record(id);
      if(Number(data.returnCode)!==0 || !data.pdfFile){ showError(errorText('missing')); return; }
      await renderResult(data);
    }catch(err){ showError(errorText('read')); }
  }
  async function directRoutes(){
    var r=await fetch(U('data/direct-routes.json'),{cache:'no-store'});
    if(!r.ok) throw new Error('direct-routes');
    return r.json();
  }
  async function openDirectResultFromUrl(){
    var raw=String(location.search||'').replace(/^\?/, '').trim();
    var q=new URLSearchParams(location.search);
    var shortCode=/^\d{2,3}$/.test(raw)?raw:clean(q.get('id'));
    try{
      if(shortCode){
        var shortMap=await directRoutes();
        var shortId=shortMap[shortCode];
        if(!shortId) return false;
        var shortData=await record(shortId);
        if(Number(shortData.returnCode)!==0 || !shortData.pdfFile) return false;
        await renderResult(shortData);
        return true;
      }
      if(q.get('direct')!=='1') return false;
      var stakeholder=clean(q.get('stakeholderValue'));
      var cert=clean(q.get('certificateNumber'));
      if(!stakeholder||!cert) return false;
      var map=await routes(); var id=map[stakeholder+'|'+cert];
      if(!id) return false;
      var data=await record(id);
      if(Number(data.returnCode)!==0 || !data.pdfFile) return false;
      await renderResult(data);
      return true;
    }catch(err){ return false; }
  }
  async function init(){
    stripTrailingSlash(); setLanguageLink();
    if(await openDirectResultFromUrl()) return;
    var btn=document.querySelector('.verifyECertificateControlBtn');
    var a=document.getElementById('StakeholderValue'), b=document.getElementById('CertificateNumber');
    if(btn){ btn.href='#'; btn.onclick=preview; }
    [a,b].forEach(function(el){
      if(!el) return; el.value=''; el.removeAttribute('readonly'); el.removeAttribute('disabled');
      el.addEventListener('input',clearError); el.addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault();preview(e);} });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
