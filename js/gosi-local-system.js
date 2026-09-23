(function(){
  "use strict";

  var currentScript=document.currentScript;
  var siteRoot=new URL('../', currentScript.src);
  var directAttempted=false;
  var normalizeQueued=false;
  var currentVerificationType=null;
  var platformsCache=null;
  var errorScrollPosition=null;
  var loginPopupRequestId=0;
  var footerDataCache=null;
  var footerWiredElement=null;
  var restoredGlobalBehaviorsBound=false;
  var ACTIVE_CERT_MESSAGE='The certificate is active. Please wait until the e-Certificate is shown below.';
  var VALID_TYPES=['Contributor','Beneficiary','CivilMilitaryPension','Establishment'];

  function U(rel){ return new URL(rel, siteRoot).href; }
  function lang(){ return /\/en(?:\/|$)/i.test(location.pathname)?'en':'ar'; }
  function clean(v){ return String(v==null?'':v).trim(); }

  function stripTrailingSlash(){
    if(location.pathname.endsWith('/') && location.pathname!=='/'){
      history.replaceState(null,'',location.pathname.slice(0,-1)+location.search+location.hash);
    }
  }

  function replaceOwnText(el,text){
    if(!el) return;
    var done=false;
    Array.prototype.forEach.call(el.childNodes,function(n){
      if(!done && n.nodeType===Node.TEXT_NODE && clean(n.nodeValue)){
        n.nodeValue=' '+text+' ';
        done=true;
      }
    });
    if(!done) el.appendChild(document.createTextNode(' '+text+' '));
  }

  function setLanguageLink(){
    var a=document.getElementById('btn-change-language');
    if(a){
      a.href='#';
      a.setAttribute('role','button');
      a.setAttribute('aria-haspopup','true');
      a.setAttribute('aria-expanded',document.querySelector('#topLinks #langsList[data-local-language-list="1"]')?'true':'false');
      a.dataset.localAction='desktop-language';
      replaceOwnText(a, lang()==='ar'?'English':'العربية');
    }

    /* The live compact drawer uses the generic Language label and opens the
       full five-language selector. It does not immediately switch to EN/AR. */
    var compact=document.querySelector('li.language .mobileHasSub');
    if(compact){
      replaceOwnText(compact,'Language');
      compact.setAttribute('role','button');
      compact.setAttribute('tabindex','0');
      compact.setAttribute('aria-haspopup','true');
      compact.dataset.localAction='mobile-language';
    }
  }

  async function routes(){
    var r=await fetch(U('data/routes.json'),{cache:'no-store'});
    if(!r.ok) throw new Error('routes');
    return r.json();
  }

  async function record(id){
    var r=await fetch(U('data/'+encodeURIComponent(id)+'.json'),{cache:'no-store'});
    if(!r.ok) throw new Error('record');
    return r.json();
  }

  async function directRoutes(){
    var r=await fetch(U('data/direct-routes.json'),{cache:'no-store'});
    if(!r.ok) throw new Error('direct-routes');
    return r.json();
  }

  function errorText(type){
    var ar=lang()==='ar';
    if(type==='empty') return ar?'الرجاء إدخال رقم اشتراك المنشأة ورمز الشهادة':'Please enter the Establishment Registration Number and Certificate Code';
    /* The live verification page shows this lookup failure as a centered
       dialog (and the message itself is English on the Arabic page too). */
    if(type==='missing') return 'The certificate does not exist, please check the combination of the certificate code and/or the Establishment Registration Number';
    return ar?'تعذر قراءة بيانات التحقق المحلية':'Unable to read the local verification data';
  }

  function closeErrorDialog(){
    var modal=document.getElementById('localVerifyErrorModal');
    if(!modal) return;

    var popup=modal.querySelector('.swal2-popup');
    if(popup){
      popup.classList.remove('swal2-show','animate__fadeIn');
      popup.classList.add('swal2-hide','animate__fadeOut');
    }
    modal.classList.remove('swal2-backdrop-show');
    modal.classList.add('swal2-backdrop-hide');

    window.setTimeout(function(){
      if(modal.parentNode) modal.parentNode.removeChild(modal);
      document.body.classList.remove('swal2-shown','swal2-height-auto');
      /* Keep the document scrollbar exactly where it was. The original page
         does not jump sideways when the alert is opened or closed. */
      if(errorScrollPosition){
        try{ window.scrollTo(errorScrollPosition.x,errorScrollPosition.y); }catch(_){ }
        errorScrollPosition=null;
      }
    },120);
  }

  function showError(msg){
    /* Do not redraw the dialog with our own dimensions/styles. The captured
       page already contains GOSI's SweetAlert2 CSS and the Angular bundle's
       ShowMessage() uses SweetAlert2. Re-create the exact SweetAlert2 DOM
       structure here so the original styles in the files render it. */
    var old=document.getElementById('localVerifyErrorModal');
    if(old) old.remove();
    var oldInline=document.getElementById('localVerifyError');
    if(oldInline) oldInline.remove();

    var container=document.createElement('div');
    container.id='localVerifyErrorModal';
    container.className='swal2-container swal2-center swal2-backdrop-show';
    container.setAttribute('role','presentation');

    var popup=document.createElement('div');
    popup.className='swal2-popup swal2-modal swal2-icon-error swal2-show animate__animated animate__fadeIn';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-live','assertive');
    popup.setAttribute('aria-modal','true');
    popup.setAttribute('aria-labelledby','swal2-title');
    popup.setAttribute('aria-describedby','swal2-html-container');
    popup.tabIndex=-1;
    popup.style.display='grid';

    var closeX=document.createElement('button');
    closeX.type='button';
    closeX.className='swal2-close';
    closeX.setAttribute('aria-label','Close this dialog');
    closeX.textContent='×';
    closeX.style.display='none';

    var icon=document.createElement('div');
    icon.className='swal2-icon swal2-error swal2-icon-show';
    icon.setAttribute('aria-hidden','true');
    icon.style.display='flex';
    icon.innerHTML='<span class="swal2-x-mark"><span class="swal2-x-mark-line swal2-x-mark-line-left"></span><span class="swal2-x-mark-line swal2-x-mark-line-right"></span></span>';

    var title=document.createElement('h2');
    title.id='swal2-title';
    title.className='swal2-title';
    title.dir='ltr';
    title.style.display='block';
    title.textContent=msg;

    /* SweetAlert2 creates this element even when ShowMessage() only supplies
       title. Keeping it hidden gives the same layout as the original call. */
    var htmlContainer=document.createElement('div');
    htmlContainer.id='swal2-html-container';
    htmlContainer.className='swal2-html-container';
    htmlContainer.style.display='none';

    var actions=document.createElement('div');
    actions.className='swal2-actions';
    actions.style.display='flex';

    var loader=document.createElement('div');
    loader.className='swal2-loader';

    var confirm=document.createElement('button');
    confirm.type='button';
    confirm.className='swal2-confirm swal2-styled';
    confirm.setAttribute('aria-label','');
    confirm.style.display='inline-block';
    confirm.textContent=lang()==='ar'?'إغلاق':'Close';
    confirm.addEventListener('click',closeErrorDialog,{once:true});

    var deny=document.createElement('button');
    deny.type='button';
    deny.className='swal2-deny swal2-styled';
    deny.style.display='none';

    var cancel=document.createElement('button');
    cancel.type='button';
    cancel.className='swal2-cancel swal2-styled';
    cancel.style.display='none';

    actions.appendChild(loader);
    actions.appendChild(confirm);
    actions.appendChild(deny);
    actions.appendChild(cancel);

    popup.appendChild(closeX);
    popup.appendChild(icon);
    popup.appendChild(title);
    popup.appendChild(htmlContainer);
    popup.appendChild(actions);
    container.appendChild(popup);
    document.body.appendChild(container);

    /* SweetAlert's body class hides overflow in the captured stylesheet.
       Do not apply it here: on the live page the vertical scrollbar remains
       visible, so the page does not shift horizontally when validation fails. */
    errorScrollPosition={x:window.scrollX||0,y:window.scrollY||0};

    window.setTimeout(function(){
      try{ confirm.focus({preventScroll:true}); }
      catch(_){ confirm.focus(); }
    },0);
  }

  function clearError(){
    closeErrorDialog();
  }

  async function platformsList(){
    if(platformsCache) return platformsCache;
    var r=await fetch(U('api/SharePoint/GetPlatformsList--eedbbe33fe3b1570.json'),{cache:'no-store'});
    if(!r.ok) throw new Error('platforms');
    platformsCache=await r.json();
    return platformsCache;
  }

  function closeLoginPopup(){
    ++loginPopupRequestId;
    var model=document.getElementById('loginModel');
    if(!model) return;
    var popup=model.querySelector('.loginPopup');
    if(popup && typeof popup.animate==='function'){
      var a=popup.animate(
        [{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-8px) scale(.985)'}],
        {duration:130,easing:'ease-in',fill:'forwards'}
      );
      a.onfinish=function(){ if(model.parentNode) model.parentNode.removeChild(model); };
    }else if(model.parentNode){
      model.parentNode.removeChild(model);
    }
  }

  function loginPopupText(tab){
    if(lang()==='ar') return tab===1?'الدخول للأفراد':'الدخول لأصحاب الأعمال';
    return tab===1?'Login for Individuals':'Login for Business';
  }

  function makeLoginCloseButton(){
    var close=document.createElement('a');
    close.setAttribute('role','button');
    close.setAttribute('tabindex','0');
    close.setAttribute('href','#');
    close.setAttribute('aria-label','Close Login Popup');
    close.style.cursor='pointer';
    close.innerHTML='<svg role="img" aria-label="Close Login Popup" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M15.281 14.2198C15.3507 14.2895 15.406 14.3722 15.4437 14.4632C15.4814 14.5543 15.5008 14.6519 15.5008 14.7504C15.5008 14.849 15.4814 14.9465 15.4437 15.0376C15.406 15.1286 15.3507 15.2114 15.281 15.281C15.2114 15.3507 15.1286 15.406 15.0376 15.4437C14.9465 15.4814 14.849 15.5008 14.7504 15.5008C14.6519 15.5008 14.5543 15.4814 14.4632 15.4437C14.3722 15.406 14.2895 15.3507 14.2198 15.281L8.00042 9.06073L1.78104 15.281C1.64031 15.4218 1.44944 15.5008 1.25042 15.5008C1.05139 15.5008 0.860523 15.4218 0.719792 15.281C0.579062 15.1403 0.5 14.9494 0.5 14.7504C0.5 14.5514 0.579062 14.3605 0.719792 14.2198L6.9401 8.00042L0.719792 1.78104C0.579062 1.64031 0.5 1.44944 0.5 1.25042C0.5 1.05139 0.579062 0.860523 0.719792 0.719792C0.860523 0.579062 1.05139 0.5 1.25042 0.5C1.44944 0.5 1.64031 0.579062 1.78104 0.719792L8.00042 6.9401L14.2198 0.719792C14.3605 0.579062 14.5514 0.5 14.7504 0.5C14.9494 0.5 15.1403 0.579062 15.281 0.719792C15.4218 0.860523 15.5008 1.05139 15.5008 1.25042C15.5008 1.44944 15.4218 1.64031 15.281 1.78104L9.06073 8.00042L15.281 14.2198Z" fill="#334157"></path></svg>';
    close.addEventListener('click',function(e){ e.preventDefault(); closeLoginPopup(); });
    close.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); closeLoginPopup(); } });
    return close;
  }

  async function showLoginPopup(tab){
    if(tab!==1 && tab!==2) return;
    var requestId=++loginPopupRequestId;
    var old=document.getElementById('loginModel');
    if(old && old.parentNode) old.parentNode.removeChild(old);

    var data;
    try{ data=await platformsList(); }
    catch(_){ return; }
    if(requestId!==loginPopupRequestId) return;

    var sub=(data.SubCategories||[]).find(function(x){ return Number(x.ID)===tab; });
    if(!sub) return;

    var platforms=(sub.Platforms||[]).slice();
    /* The original header popup intentionally shows only the first Individuals
       platform, while the Business tab shows its business platform(s). */
    if(tab===1) platforms=platforms.slice(0,1);

    var model=document.createElement('div');
    model.id='loginModel';
    model.setAttribute('role','presentation');

    var popup=document.createElement('div');
    popup.className='loginPopup';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-modal','true');
    popup.setAttribute('aria-label',loginPopupText(tab));

    var header=document.createElement('div');
    header.className='loginPopupHeader';
    header.appendChild(makeLoginCloseButton());

    var body=document.createElement('div');
    body.className='loginPopupBody';

    var heading=document.createElement('h4');
    heading.className='loginPopUpMessage';
    heading.setAttribute('aria-label',tab===1?'login To Individual title':'login To Business title');
    heading.textContent=loginPopupText(tab);
    body.appendChild(heading);

    var category=document.createElement('div');
    category.className='col s12';
    category.id='loginTabCategory'+String(sub.ID);

    var list=document.createElement('ul');
    list.className='listOfLoginItems popupLoginItems';

    platforms.forEach(function(item){
      var li=document.createElement('li');
      var a=document.createElement('a');
      a.href=item.RouterLink||'#';
      var icon=document.createElement('span');
      icon.className='loginItemIcon '+clean(item.Icon);
      var desc=document.createElement('span');
      desc.className='loginItemDesc';
      desc.textContent=clean(item.Description)||clean(item.Title);
      a.appendChild(icon);
      a.appendChild(desc);
      li.appendChild(a);
      list.appendChild(li);
    });

    category.appendChild(list);
    body.appendChild(category);
    popup.appendChild(header);
    popup.appendChild(body);
    model.appendChild(popup);
    document.body.appendChild(model);

    /* Keep the page still underneath the popup. No scrollbar removal and no
       layout-width change. */
    if(typeof popup.animate==='function'){
      popup.animate(
        [{opacity:0,transform:'translateY(-8px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],
        {duration:180,easing:'ease-out'}
      );
    }

    var close=header.querySelector('[role="button"]');
    if(close){ try{ close.focus({preventScroll:true}); }catch(_){ close.focus(); } }
  }

  function mainVerificationRadios(){
    return Array.prototype.filter.call(
      document.querySelectorAll('.radio-container input[type="radio"]'),
      function(r){ return VALID_TYPES.indexOf(r.value)!==-1; }
    );
  }

  function typeFromPath(){
    var p=location.pathname.toLowerCase();
    if(/\/civilmilitary(?:\/|$)/.test(p)) return 'CivilMilitaryPension';
    if(/\/beneficiary(?:\/|$)/.test(p)) return 'Beneficiary';
    if(/\/establishment(?:\/|$)/.test(p)) return 'Establishment';
    return 'Contributor';
  }

  function setLabelText(label,text){
    if(!label) return;
    var textNode=null;
    Array.prototype.forEach.call(label.childNodes,function(n){
      if(!textNode && n.nodeType===Node.TEXT_NODE && clean(n.nodeValue)) textNode=n;
    });
    if(textNode) textNode.nodeValue=text;
    else label.appendChild(document.createTextNode(text));
  }

  function applyVerificationType(type,clearValues){
    if(VALID_TYPES.indexOf(type)===-1) type='Establishment';
    currentVerificationType=type;

    var radios=mainVerificationRadios();
    radios.forEach(function(r){
      r.name='verificationStakeholderType';
      r.checked=(r.value===type);
      r.setAttribute('aria-checked',r.checked?'true':'false');
    });

    var stakeholder=document.getElementById('StakeholderValue');
    var cert=document.getElementById('CertificateNumber');
    var stakeholderLabel=document.querySelector('label[for="StakeholderValue"]');
    var isEstablishment=type==='Establishment';
    var ar=lang()==='ar';

    if(stakeholder){
      stakeholder.removeAttribute('readonly');
      stakeholder.removeAttribute('disabled');
      stakeholder.setAttribute('autocomplete','off');
      stakeholder.setAttribute('maxlength',isEstablishment?'50':'10');
      stakeholder.setAttribute('inputmode',isEstablishment?'text':'numeric');
      stakeholder.placeholder=isEstablishment
        ? (ar?'الرجاء إدخال رقم إشتراك المنشأة':'Please Enter Establishment Registration Number')
        : (ar?'الرجاء إدخال رقم الهوية / الإقامة':'Please Enter National ID Or Iqama Number');
      if(clearValues) stakeholder.value='';
    }

    if(stakeholderLabel){
      setLabelText(stakeholderLabel,isEstablishment
        ? (ar?'رقم إشتراك المنشأة':'Establishment Registration Number')
        : (ar?'رقم الهوية / الإقامة':'National ID Or Iqama Number'));
    }

    if(cert){
      cert.removeAttribute('readonly');
      cert.removeAttribute('disabled');
      cert.setAttribute('autocomplete','off');
      if(clearValues) cert.value='';
    }

    if(clearValues) clearError();
  }


  function officialBase(){
    return 'https://www.gosi.gov.sa/'+lang();
  }

  function officialUrl(route){
    route=clean(route);
    if(!route) return officialBase()+'/';
    if(/^(?:https?:|tel:|mailto:)/i.test(route)) return route;
    route=route.replace(/^\/+/, '');
    if(/^(?:ar|en)\//i.test(route)) route=route.replace(/^(?:ar|en)\//i,'');
    return officialBase()+'/'+route;
  }

  function normalizeCapturedGosiLinks(){
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'),function(a){
      var href=a.getAttribute('href')||'';
      if(!href) return;

      /* The HTML capture duplicated /VerifyECertificate/ar// inside most
         header/mobile menu links. Those anchors looked clickable but led to
         invalid pages. Rebuild them against the official current language. */
      var m=href.match(/^https?:\/\/(?:www\.)?gosi\.gov\.sa\/(?:ar|en)\/VerifyECertificate\/(?:ar|en)\/\/(.*)$/i);
      if(m){
        a.href=officialUrl('/'+m[1]);
        return;
      }

      /* Some captures kept an Arabic absolute URL in the English snapshot.
         Only rewrite links that clearly belong to the GOSI navigation tree;
         leave external/auth/download links untouched. */
      if(lang()==='en' && /^https?:\/\/(?:www\.)?gosi\.gov\.sa\/ar\/(AboutGOSI|SystemsAndRegulations|Services|IndividualsServices|BusinessServices|MediaCenter|StatisticsAndData|Taqdeer|CommunityParticipation|ContactUs|SiteMap|Pages)(?:\/|$)/i.test(href)){
        try{
          var u=new URL(href);
          a.href='https://www.gosi.gov.sa/en'+u.pathname.replace(/^\/ar/i,'')+u.search+u.hash;
        }catch(_){ }
      }
    });
  }

  function applyStoredAccessibility(){
    var html=document.documentElement;
    var size='';
    var theme='light';
    try{
      size=localStorage.getItem('htmlSize')||'';
      theme=localStorage.getItem('theme')||'light';
    }catch(_){ }
    html.classList.remove('htmlLarge','htmlSmall');
    if(size==='htmlLarge' || size==='htmlSmall') html.classList.add(size);
    html.classList.toggle('grayScale',theme!=='light');
  }

  function closePortalSettings(){
    Array.prototype.forEach.call(document.querySelectorAll('.portalSettings'),function(x){
      if(x.getAttribute('data-local-accessibility-panel')==='1'){
        x.remove();
        return;
      }
      x.classList.remove('local-mobile-accessibility');
      x.style.display='none';
    });
    var btn=document.getElementById('btn-panel-settings');
    if(btn) btn.setAttribute('aria-expanded','false');
  }

  function togglePortalSettings(){
    var menu=document.querySelector('#topLinks .portalSettings');
    if(!menu) return;
    var open=window.getComputedStyle(menu).display!=='none';
    menu.style.display=open?'none':'block';
    var btn=document.getElementById('btn-panel-settings');
    if(btn) btn.setAttribute('aria-expanded',open?'false':'true');
  }

  function setFontSize(mode){
    var html=document.documentElement;
    html.classList.remove('htmlLarge','htmlSmall');
    try{
      if(mode===1){ html.classList.add('htmlLarge'); localStorage.setItem('htmlSize','htmlLarge'); }
      else if(mode===-1){ html.classList.add('htmlSmall'); localStorage.setItem('htmlSize','htmlSmall'); }
      else localStorage.removeItem('htmlSize');
    }catch(_){ }
    closePortalSettings();
  }

  function toggleThemeMode(){
    var dark=false;
    try{
      dark=(localStorage.getItem('theme')||'light')==='light';
      localStorage.setItem('theme',dark?'dark':'light');
    }catch(_){ dark=!document.documentElement.classList.contains('grayScale'); }
    document.documentElement.classList.toggle('grayScale',dark);
    closePortalSettings();
  }

  function scopeHeaderNode(el){
    if(el) el.setAttribute('_ngcontent-jkt-c6','');
    return el;
  }

  var LANGUAGE_OPTIONS=[
    {code:'ar',title:'عربي'},
    {code:'en',title:'English'},
    {code:'ur',title:'اردو'},
    {code:'bn',title:'বাংলা'},
    {code:'tl',title:'Filipino (Tagalog)'}
  ];

  function scopeHeaderTree(root){
    if(!root) return root;
    scopeHeaderNode(root);
    Array.prototype.forEach.call(root.querySelectorAll('*'),scopeHeaderNode);
    return root;
  }

  function closeMobileNav(){
    if(window.GosiLocalMobileNav && typeof window.GosiLocalMobileNav.close==='function'){
      window.GosiLocalMobileNav.close();
      return;
    }
    var drawer=document.getElementById('slide-out');
    if(drawer) drawer.classList.remove('demo-mobile-menu-open');
    var header=document.querySelector('header');
    if(header) header.classList.remove('headerStyle');
  }

  function removeLanguageLists(){
    Array.prototype.forEach.call(document.querySelectorAll('#langsList[data-local-language-list="1"]'),function(x){ x.remove(); });
    var desktop=document.getElementById('btn-change-language');
    if(desktop) desktop.setAttribute('aria-expanded','false');
    var mobile=document.querySelector('li.language .mobileHasSub');
    if(mobile) mobile.setAttribute('aria-expanded','false');
  }

  function localLanguageUrl(code){
    var rest=location.pathname.replace(/^.*?\/(?:ar|en)(?=\/|$)/i,'');
    if(!rest || rest===location.pathname) rest='/VerifyECertificate/Establishment';
    return new URL(code+rest+location.search+location.hash,siteRoot).href;
  }

  function chooseLanguage(code){
    removeLanguageLists();
    if(code==='ar' || code==='en'){
      try{
        document.cookie='Language='+encodeURIComponent(code)+';path=/;SameSite=Lax';
        localStorage.setItem('locale',code);
      }catch(_){ }
      location.href=localLanguageUrl(code);
      return;
    }
    if(code==='ur' || code==='bn' || code==='tl')
      window.open('https://taminaty.gosi.gov.sa/#/do-login?lang='+encodeURIComponent(code),'_blank','noopener');
  }

  function buildLanguageList(mobile){
    removeLanguageLists();
    var trigger=mobile?document.querySelector('li.language .mobileHasSub'):document.getElementById('btn-change-language');
    if(!trigger) return;

    var ul=scopeHeaderNode(document.createElement('ul'));
    ul.id='langsList';
    ul.setAttribute('data-local-language-list','1');
    if(mobile) ul.className='langsMobileList';

    LANGUAGE_OPTIONS.forEach(function(item){
      var li=scopeHeaderNode(document.createElement('li'));
      var a=scopeHeaderNode(document.createElement('a'));
      a.href='#';
      a.title=item.title;
      a.dataset.localLanguage=item.code;
      if(item.code===lang()) a.classList.add('activeLang');
      a.appendChild(document.createTextNode(' '+item.title+' '));
      if(item.code===lang()) {
        var svg=scopeHeaderNode(document.createElementNS('http://www.w3.org/2000/svg','svg'));
        svg.setAttribute('viewBox','0 0 24 24');
        svg.setAttribute('width','18');
        svg.setAttribute('height','18');
        svg.setAttribute('aria-hidden','true');
        var path=scopeHeaderNode(document.createElementNS('http://www.w3.org/2000/svg','path'));
        path.setAttribute('d','M20.285 6.709a1 1 0 0 0-1.414-1.418L9 15.16l-3.871-3.87a1 1 0 1 0-1.414 1.414l4.578 4.578a1 1 0 0 0 1.414 0L20.285 6.71Z');
        path.setAttribute('fill','currentColor');
        svg.appendChild(path);
        a.appendChild(svg);
      }
      li.appendChild(a);
      ul.appendChild(li);
    });

    if(mobile){
      trigger.parentNode.insertBefore(ul,trigger.nextSibling);
      ul.style.display='block';
    }else{
      trigger.parentNode.appendChild(ul);
    }
    trigger.setAttribute('aria-expanded','true');
  }

  function toggleLanguageList(mobile){
    var existing=document.querySelector('#langsList[data-local-language-list="1"]');
    if(existing){ removeLanguageLists(); return; }
    buildLanguageList(!!mobile);
  }

  function removeMobileSearchList(){
    var old=document.querySelector('.search-box-mobile .ac-list[data-local-mobile-search-list="1"]');
    if(old) old.remove();
  }

  function closeMobileSearch(clearValue){
    var box=document.querySelector('.search-box-mobile');
    if(!box) return;
    var input=box.querySelector('input');
    if(input && clearValue) input.value='';
    var close=box.querySelector('[data-local-mobile-search-close="1"]');
    if(close) close.remove();
    removeMobileSearchList();
  }

  function mobileSearchCandidates(){
    var seen={};
    var out=[];
    Array.prototype.forEach.call(document.querySelectorAll('#slide-out a[href]'),function(a){
      var title=clean(a.textContent).replace(/\s+/g,' ');
      var href=a.href;
      if(!title || !href || href==='#' || seen[title+'|'+href]) return;
      seen[title+'|'+href]=true;
      out.push({title:title,href:href});
    });
    return out;
  }

  function updateMobileSearch(input){
    var box=input && input.closest('.search-box-mobile');
    if(!box) return;
    var query=clean(input.value);
    var close=box.querySelector('[data-local-mobile-search-close="1"]');
    if(query && !close){
      close=scopeHeaderNode(document.createElement('i'));
      close.className='icon-s-multiply11 close-in-mobile';
      close.setAttribute('aria-hidden','true');
      close.setAttribute('role','button');
      close.setAttribute('tabindex','0');
      close.setAttribute('data-local-mobile-search-close','1');
      box.appendChild(close);
    }else if(!query && close){ close.remove(); }

    removeMobileSearchList();
    if(!query) return;
    var q=query.toLocaleLowerCase();
    var matches=mobileSearchCandidates().filter(function(x){ return x.title.toLocaleLowerCase().indexOf(q)!==-1; }).slice(0,8);

    var ul=scopeHeaderNode(document.createElement('ul'));
    ul.className='ac-list';
    ul.setAttribute('data-local-mobile-search-list','1');
    if(!matches.length){
      var empty=scopeHeaderNode(document.createElement('li'));
      empty.className='no-suggestion';
      empty.textContent=lang()==='ar'?'لم يتم العثور على اقتراحات':'No suggestions found';
      ul.appendChild(empty);
      box.appendChild(ul);
      return;
    }
    matches.forEach(function(item){
      var li=scopeHeaderNode(document.createElement('li'));
      li.className='ac-item';
      li.textContent=item.title;
      li.setAttribute('role','option');
      li.setAttribute('tabindex','0');
      li.dataset.localSearchSuggestion=item.href;
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function closeHeaderSearch(){
    var box=document.querySelector('.header-search .search-box[data-local-restored-search="1"]');
    if(box) box.remove();
    var btn=document.getElementById('btn-panel-search');
    if(btn) btn.style.removeProperty('display');
  }

  function runOfficialSearch(value){
    value=clean(value);
    if(!value) return;
    window.location.href=officialBase()+'/Search/'+encodeURIComponent(value);
  }

  function openHeaderSearch(){
    var host=document.querySelector('#topLinks .header-search');
    if(!host) return;
    var existing=host.querySelector('.search-box[data-local-restored-search="1"]');
    if(existing){
      var oldInput=existing.querySelector('input');
      if(oldInput) oldInput.focus();
      return;
    }

    var btn=document.getElementById('btn-panel-search');
    if(btn) btn.style.display='none';

    var box=scopeHeaderNode(document.createElement('div'));
    box.className='search-box';
    box.setAttribute('data-local-restored-search','1');

    var icon=scopeHeaderNode(document.createElement('i'));
    icon.className='icon-search-1 search-in';
    icon.setAttribute('aria-hidden','true');

    var input=scopeHeaderNode(document.createElement('input'));
    input.id='searchInput';
    input.type='text';
    input.autocomplete='off';
    input.className='autocomplete';
    input.placeholder=lang()==='ar'?'بحث':'Search';
    input.title=input.placeholder;

    var close=scopeHeaderNode(document.createElement('i'));
    close.className='icon-s-multiply11 close-in';
    close.setAttribute('aria-hidden','true');
    close.setAttribute('role','button');
    close.setAttribute('tabindex','0');
    close.setAttribute('data-local-search-close','1');

    box.appendChild(icon);
    box.appendChild(input);
    box.appendChild(close);
    host.appendChild(box);
    window.setTimeout(function(){ try{ input.focus({preventScroll:true}); }catch(_){ input.focus(); } },20);
  }


  function toggleLocalAccessibilityPanel(){
    var existing=document.querySelector('.portalSettings[data-local-accessibility-panel="1"]');
    if(existing){ existing.remove(); return; }
    var source=document.querySelector('#topLinks .portalSettings');
    if(!source) return;
    var menu=source.cloneNode(true);
    menu.removeAttribute('style');
    menu.classList.add('local-mobile-accessibility');
    menu.setAttribute('data-local-accessibility-panel','1');
    menu.setAttribute('role','menu');
    Array.prototype.forEach.call(menu.querySelectorAll('span'),function(x){ x.setAttribute('role','menuitem'); x.setAttribute('tabindex','0'); });
    document.body.appendChild(menu);
  }

  function closeMobileLoginChoices(){
    ++loginPopupRequestId;
    document.body.classList.remove('bodyHideScroll');
    var panel=document.getElementById('loginPopUpBtns');
    if(!panel) return;
    var box=panel.firstElementChild;
    if(box && typeof box.animate==='function'){
      var a=box.animate(
        [{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-8px) scale(.985)'}],
        {duration:130,easing:'ease-in',fill:'forwards'}
      );
      a.onfinish=function(){ if(panel.parentNode) panel.parentNode.removeChild(panel); };
    }else if(panel.parentNode){
      panel.parentNode.removeChild(panel);
    }
  }

  async function showMobileLoginChoices(){
    closeMobileNav();
    removeLanguageLists();
    /* The Angular bundle already contains a dedicated mobile-login template:
       #loginPopUpBtns. Use that exact DOM structure instead of reusing the
       desktop #loginModel/platform-card popup. This lets the captured site's
       original CSS draw the same green Individuals / blue Business buttons. */
    var requestId=++loginPopupRequestId;
    var oldDesktop=document.getElementById('loginModel');
    if(oldDesktop && oldDesktop.parentNode) oldDesktop.parentNode.removeChild(oldDesktop);
    var old=document.getElementById('loginPopUpBtns');
    if(old && old.parentNode) old.parentNode.removeChild(old);

    var data;
    try{ data=await platformsList(); }catch(_){ return; }
    if(requestId!==loginPopupRequestId) return;

    function platformUrl(id){
      var sub=(data.SubCategories||[]).find(function(x){ return Number(x.ID)===id; });
      var item=sub && (sub.Platforms||[])[0];
      return item && item.RouterLink ? item.RouterLink : '#';
    }

    var panel=document.createElement('div');
    panel.id='loginPopUpBtns';
    panel.setAttribute('role','presentation');

    var box=document.createElement('div');
    box.setAttribute('role','dialog');
    box.setAttribute('aria-modal','true');
    box.setAttribute('aria-label',lang()==='ar'?'تسجيل الدخول':'Login');

    var close=document.createElement('a');
    close.href='#';
    close.setAttribute('role','button');
    close.setAttribute('aria-label',lang()==='ar'?'إغلاق':'Close');
    var closeIcon=document.createElement('span');
    closeIcon.className='icon-s-multiply11';
    close.appendChild(closeIcon);
    close.addEventListener('click',function(e){ e.preventDefault(); closeMobileLoginChoices(); });

    var heading=document.createElement('h4');
    heading.setAttribute('aria-label','Login title');
    heading.textContent=lang()==='ar'?'تسجيل الدخول':'Login';

    var list=document.createElement('ul');
    var entries=[
      {id:1,text:lang()==='ar'?'دخول الأفراد':'Individuals Login'},
      {id:2,text:lang()==='ar'?'دخول الأعمال':'Business Login'}
    ];
    entries.forEach(function(entry){
      var li=document.createElement('li');
      var a=document.createElement('a');
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.href=platformUrl(entry.id);
      a.title=entry.text;
      a.textContent=entry.text;
      li.appendChild(a);
      list.appendChild(li);
    });

    box.appendChild(close);
    box.appendChild(heading);
    box.appendChild(list);
    panel.appendChild(box);
    scopeHeaderTree(panel);
    document.body.appendChild(panel);
    document.body.classList.add('bodyHideScroll');

    if(typeof box.animate==='function'){
      box.animate(
        [{opacity:0,transform:'translateY(-8px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],
        {duration:180,easing:'ease-out'}
      );
    }
    try{ close.focus({preventScroll:true}); }catch(_){ close.focus(); }
  }

  function openAmeen(){
    var u='https://gosi-labeeb.masdr.sa/'+lang()+'/Welcome';
    window.open(u,'_blank','noopener');
  }

  function openTaminaty(){
    if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) window.location.href='https://app.gosi.gov.sa';
    else window.location.href=officialBase()+'/TaminatyApp';
  }

  async function footerData(){
    if(footerDataCache) return footerDataCache;
    var r=await fetch(U('assets/json/footer.json'),{cache:'no-store'});
    if(!r.ok) throw new Error('footer');
    var j=await r.json();
    footerDataCache=j[lang()==='ar'?'prodArFooter':'prodEnFooter']||j[lang()==='ar'?'uatArFooter':'uatEnFooter'];
    return footerDataCache;
  }

  async function wireFooterActions(){
    var footer=document.querySelector('footer');
    if(!footer || footerWiredElement===footer) return;
    footerWiredElement=footer;

    try{
      var data=await footerData();
      if(footerWiredElement!==footer || !document.documentElement.contains(footer)) return;
      var cats=data && data.FooterMenuList || [];
      var about=cats.find(function(x){ return Number(x.ID)===9; });
      var support=cats.find(function(x){ return Number(x.ID)===10; });
      var localItems=(about?about.MenuList:[]).concat(support?support.MenuList:[]);
      var inert=footer.querySelectorAll('span.hoverEffect');
      Array.prototype.forEach.call(inert,function(el,i){
        var item=localItems[i];
        if(!item || !item.RouterLink) return;
        el.dataset.localHref=officialUrl(item.RouterLink);
        el.dataset.localTarget=(item.RouterLink.indexOf('http')===0 && /(?:career|careers)/i.test(item.RouterLink))?'_blank':'_self';
        el.setAttribute('role','link');
        el.setAttribute('tabindex','0');
      });

      var mobile=cats.find(function(x){ return Number(x.ID)===13; });
      var apps=mobile && mobile.MenuList || [];
      Array.prototype.forEach.call(footer.querySelectorAll('.mobileApp'),function(el,i){
        var item=apps[i];
        if(item && item.RouterLink){
          el.dataset.localHref=officialUrl(item.RouterLink);
          el.setAttribute('role','link');
        }
      });
    }catch(_){ }
  }

  function makeBackToTop(){
    var span=document.createElement('span');
    span.className='back-to-top d-flex justify-content-center';
    span.setAttribute('_ngcontent-jkt-c8','');
    span.setAttribute('data-local-back-top','1');
    span.setAttribute('role','button');
    span.setAttribute('tabindex','0');
    span.setAttribute('aria-label',lang()==='ar'?'العودة إلى أعلى الصفحة':'Back to top');
    span.innerHTML='<svg _ngcontent-jkt-c8="" aria-hidden="true" width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path _ngcontent-jkt-c8="" d="M25.7075 17.2925C25.8004 17.3854 25.8741 17.4957 25.9244 17.6171C25.9747 17.7385 26.0006 17.8686 26.0006 18C26.0006 18.1314 25.9747 18.2615 25.9244 18.3829C25.8741 18.5043 25.8004 18.6146 25.7075 18.7075C25.6146 18.8004 25.5043 18.8741 25.3829 18.9244C25.2615 18.9747 25.1314 19.0006 25 19.0006C24.8686 19.0006 24.7385 18.9747 24.6171 18.9244C24.4957 18.8741 24.3854 18.8004 24.2925 18.7075L17 11.4138L17 28C17 28.2652 16.8946 28.5196 16.7071 28.7071C16.5196 28.8946 16.2652 29 16 29C15.7348 29 15.4804 28.8946 15.2929 28.7071C15.1054 28.5196 15 28.2652 15 28L15 11.4138L7.7075 18.7075C7.61461 18.8004 7.50433 18.8741 7.38291 18.9244C7.2615 18.9747 7.13135 19.0006 7 19.0006C6.86866 19.0006 6.73851 18.9747 6.6171 18.9244C6.49568 18.8741 6.3854 18.8004 6.2925 18.7075C6.19961 18.6146 6.12593 18.5043 6.07565 18.3829C6.02538 18.2615 5.9995 18.1314 5.9995 18C5.9995 17.8686 6.02538 17.7385 6.07565 17.6171C6.12593 17.4957 6.19961 17.3854 6.2925 17.2925L15.2925 8.2925C15.3854 8.1995 15.4957 8.1257 15.6171 8.0754C15.7385 8.0251 15.8686 7.9992 16 7.9992C16.1314 7.9992 16.2615 8.0251 16.3829 8.0754C16.5043 8.1257 16.6146 8.1995 16.7075 8.2925L25.7075 17.2925Z" fill="#334157"/></svg>';
    return span;
  }

  function syncBackToTop(){
    var existing=document.querySelector('[data-local-back-top="1"]');
    var footer=document.querySelector('footer');
    if(window.scrollY>300 && footer){
      if(!existing) footer.appendChild(makeBackToTop());
    }else if(existing){
      existing.remove();
    }
  }

  function wireRestoredControls(){
    normalizeCapturedGosiLinks();
    applyStoredAccessibility();

    var logo=document.getElementById('logo');
    if(logo){ logo.setAttribute('role','link'); logo.setAttribute('tabindex','0'); logo.dataset.localAction='home'; }
    var footLogo=document.querySelector('.logoFooter');
    if(footLogo){ footLogo.setAttribute('role','link'); footLogo.setAttribute('tabindex','0'); footLogo.dataset.localAction='home'; }
    var seal=document.querySelector('.sealLogo');
    if(seal){ seal.setAttribute('role','link'); seal.setAttribute('tabindex','0'); seal.dataset.localHref='https://raqmi.dga.gov.sa/platforms/DigitalStamp/ShowCertificate/261'; }

    var settings=document.getElementById('btn-panel-settings');
    if(settings){ settings.setAttribute('aria-haspopup','true'); if(!settings.hasAttribute('aria-expanded')) settings.setAttribute('aria-expanded','false'); }
    var mobileAccessibility=document.querySelector('.grayScaleTopButton > span');
    if(mobileAccessibility){ mobileAccessibility.setAttribute('role','button'); mobileAccessibility.setAttribute('tabindex','0'); mobileAccessibility.dataset.localAction='accessibility'; }
    var muneer=document.getElementById('muneer-trigger-button');
    if(muneer) muneer.dataset.localAction='accessibility';
    var mobileLogin=document.querySelector('.mobileLoginHeader');
    if(mobileLogin){ mobileLogin.setAttribute('role','button'); mobileLogin.setAttribute('tabindex','0'); mobileLogin.dataset.localAction='mobile-login'; }
    var mobileLanguage=document.querySelector('li.language .mobileHasSub');
    if(mobileLanguage){ mobileLanguage.setAttribute('role','button'); mobileLanguage.setAttribute('tabindex','0'); mobileLanguage.setAttribute('aria-haspopup','true'); mobileLanguage.dataset.localAction='mobile-language'; }
    Array.prototype.forEach.call(document.querySelectorAll('.portalSettings li span'),function(x){ x.setAttribute('role','button'); x.setAttribute('tabindex','0'); });

    var ameen=document.getElementById('btn-ameen');
    if(ameen){ ameen.href='https://gosi-labeeb.masdr.sa/'+lang()+'/Welcome'; ameen.target='_blank'; ameen.rel='noopener'; }
    var chat=document.getElementById('showhide_chatbubble');
    if(chat){ chat.setAttribute('role','link'); chat.setAttribute('tabindex','0'); chat.dataset.localAction='ameen'; }

    var banner=document.querySelector('.TaminatyMessage');
    if(banner){
      var cta=banner.querySelector('span');
      if(cta){ cta.setAttribute('role','link'); cta.setAttribute('tabindex','0'); cta.dataset.localAction='taminaty'; }
      try{ if(localStorage.getItem('removeTaminatyBanner')==='true' && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) banner.style.display='none'; }catch(_){ }
    }

    var mobileSearch=document.querySelector('.search-box-mobile input');
    if(mobileSearch){
      if(!mobileSearch.placeholder) mobileSearch.placeholder=lang()==='ar'?'بحث':'Search';
      mobileSearch.setAttribute('aria-autocomplete','list');
      mobileSearch.setAttribute('autocomplete','off');
    }

    wireFooterActions();
    syncBackToTop();
  }

  function initRestoredGlobalBehaviors(){
    if(restoredGlobalBehaviorsBound) return;
    restoredGlobalBehaviorsBound=true;
    window.addEventListener('scroll',syncBackToTop,{passive:true});
  }

  function normalizeForm(){
    setLanguageLink();
    wireRestoredControls();
    if(!currentVerificationType) currentVerificationType=typeFromPath();
    applyVerificationType(currentVerificationType,false);
  }

  /* Restore the header's original Angular scroll reaction. The compiled
     header component already contains this exact behavior and all of the
     matching .sticky CSS is present in the captured stylesheet; it simply
     was no longer being initialized after we neutralized <app-root>. */
  function syncHeaderStickyState(){
    var navbar=document.getElementById('navbar');
    if(!navbar) return;

    if(window.innerWidth>1024 && window.scrollY>195){
      navbar.classList.add('sticky');
      var header=document.querySelector('header');
      if(header){
        header.classList.remove('animate__animated');
        header.classList.remove('animate__fadeInDown');
      }
    }else{
      navbar.classList.remove('sticky');
      document.body.style.paddingTop='0';
    }
  }

  function initHeaderScrollBehavior(){
    if(window.__gosiLocalHeaderScrollBound) return;
    window.__gosiLocalHeaderScrollBound=true;
    window.addEventListener('scroll',syncHeaderStickyState,{passive:true});
    window.addEventListener('resize',syncHeaderStickyState,{passive:true});
    syncHeaderStickyState();
  }

  function queueNormalize(){
    if(normalizeQueued) return;
    normalizeQueued=true;
    requestAnimationFrame(function(){
      normalizeQueued=false;
      normalizeForm();
    });
  }

  function neutralizeAngularRoot(doc){
    var root=doc.querySelector('app-root');
    if(!root) return;
    var safe=doc.createElement('div');
    Array.prototype.forEach.call(root.attributes,function(a){
      if(a.name!=='id') safe.setAttribute(a.name,a.value);
    });
    safe.id='local-static-root';
    safe.setAttribute('data-angular-static-snapshot','true');
    while(root.firstChild) safe.appendChild(root.firstChild);
    root.parentNode.replaceChild(safe,root);
  }

  async function renderResult(data){
    var l=lang();
    var r=await fetch(U('templates/result-'+l+'.html'),{cache:'no-store'});
    if(!r.ok) throw new Error('template');
    var html=await r.text();
    var doc=new DOMParser().parseFromString(html,'text/html');

    /* Important: never re-introduce <app-root> while Angular's initial
       bootstrap is still settling. That was the reason ?23 flashed once and
       then disappeared after F5. Angular remains loaded; the local snapshot
       simply uses a neutral root element. */
    neutralizeAngularRoot(doc);

    document.body.innerHTML=doc.body.innerHTML;
    document.documentElement.dir=l==='ar'?'rtl':'ltr';
    document.documentElement.lang=l;
    setLanguageLink();

    var alert=document.getElementById('localCertificateSuccess');
    if(alert){
      var spans=alert.querySelectorAll('span');
      if(spans.length){
        /* Keep this sentence in English even on /ar, as in the requested
           reference behavior. */
        spans[0].textContent=ACTIVE_CERT_MESSAGE;
      }
    }

    var dl=document.getElementById('localCertificateDownload');
    if(dl){
      dl.href=U('data/'+data.pdfFile);
      dl.setAttribute('download',data.pdfFile);
    }

    try{ window.scrollTo({top:0,behavior:'instant'}); }
    catch(_){ window.scrollTo(0,0); }
  }

  async function preview(e){
    if(e){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      if(typeof e.stopPropagation==='function') e.stopPropagation();
    }
    clearError();

    var stakeholder=clean(document.getElementById('StakeholderValue')?.value);
    var cert=clean(document.getElementById('CertificateNumber')?.value);
    if(!stakeholder||!cert){ showError(errorText('empty')); return; }

    try{
      var map=await routes();
      var id=map[stakeholder+'|'+cert];
      if(!id){ showError(errorText('missing')); return; }
      var data=await record(id);
      if(Number(data.returnCode)!==0 || !data.pdfFile){ showError(errorText('missing')); return; }
      await renderResult(data);
    }catch(err){
      showError(errorText('read'));
    }
  }

  async function openDirectResultFromUrl(){
    if(directAttempted) return false;
    directAttempted=true;

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

      var map=await routes();
      var id=map[stakeholder+'|'+cert];
      if(!id) return false;
      var data=await record(id);
      if(Number(data.returnCode)!==0 || !data.pdfFile) return false;
      await renderResult(data);
      return true;
    }catch(err){
      return false;
    }
  }

  function resetToForm(e){
    if(e){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      if(typeof e.stopPropagation==='function') e.stopPropagation();
    }
    history.replaceState(null,'',location.pathname);
    location.reload();
  }

  /* Capture-phase delegation keeps local verification authoritative even when
     the restored Angular bundle also has handlers on the same controls. */
  document.addEventListener('click',function(e){
    var t=e.target;
    if(!t || !t.closest) return;

    var settingsBtn=t.closest('#btn-panel-settings');
    if(settingsBtn){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      togglePortalSettings();
      return;
    }

    var portalItem=t.closest('.portalSettings li span');
    if(portalItem){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      var icon=portalItem.querySelector('i');
      var cls=icon?icon.className:'';
      if(cls.indexOf('increaseFontSize')!==-1) setFontSize(1);
      else if(cls.indexOf('reqularFontSize')!==-1) setFontSize(0);
      else if(cls.indexOf('decreaseFontSize')!==-1) setFontSize(-1);
      else if(cls.indexOf('moon1')!==-1) toggleThemeMode();
      return;
    }

    if(t.closest('#btn-panel-search')){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      openHeaderSearch();
      return;
    }

    if(t.closest('[data-local-search-close="1"]')){
      e.preventDefault();
      closeHeaderSearch();
      return;
    }

    if(t.closest('#btn-ameen') || t.closest('#showhide_chatbubble')){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      openAmeen();
      return;
    }

    if(t.closest('.TaminatyMessage .remove-icon')){
      e.preventDefault();
      var b=t.closest('.TaminatyMessage');
      if(b) b.style.setProperty('display','none','important');
      try{ localStorage.setItem('removeTaminatyBanner','true'); }catch(_){ }
      return;
    }

    if(t.closest('.TaminatyMessage [data-local-action="taminaty"]')){
      e.preventDefault();
      openTaminaty();
      return;
    }

    var langChoice=t.closest('[data-local-language]');
    if(langChoice){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      chooseLanguage(langChoice.dataset.localLanguage);
      return;
    }

    var mobileSearchClose=t.closest('[data-local-mobile-search-close="1"]');
    if(mobileSearchClose){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      var mobileBox=mobileSearchClose.closest('.search-box-mobile');
      closeMobileSearch(true);
      var mobileInput=mobileBox && mobileBox.querySelector('input');
      if(mobileInput) mobileInput.focus();
      return;
    }

    var searchSuggestion=t.closest('[data-local-search-suggestion]');
    if(searchSuggestion){
      e.preventDefault();
      closeMobileNav();
      window.location.href=searchSuggestion.dataset.localSearchSuggestion;
      return;
    }

    var localAction=t.closest('[data-local-action]');
    if(localAction && localAction.dataset.localAction==='accessibility'){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      closeMobileNav();
      toggleLocalAccessibilityPanel();
      return;
    }
    if(localAction && localAction.dataset.localAction==='mobile-login'){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      showMobileLoginChoices();
      return;
    }
    if(localAction && localAction.dataset.localAction==='mobile-language'){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      toggleLanguageList(true);
      return;
    }
    if(localAction && localAction.dataset.localAction==='desktop-language'){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      toggleLanguageList(false);
      return;
    }
    if(localAction && localAction.dataset.localAction==='home'){
      e.preventDefault();
      window.location.href=officialBase()+'/';
      return;
    }

    var localHref=t.closest('[data-local-href]');
    if(localHref){
      e.preventDefault();
      var href=localHref.dataset.localHref;
      if(href){
        if(localHref.dataset.localTarget==='_blank') window.open(href,'_blank','noopener');
        else window.location.href=href;
      }
      return;
    }

    if(t.closest('[data-local-back-top="1"]')){
      e.preventDefault();
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }

    if(t.closest('#localCertificateAgain')){
      resetToForm(e);
      return;
    }

    if(t.closest('.verifyECertificateControlBtn')){
      preview(e);
      return;
    }

    /* Restore the original header login controls from the static Angular
       snapshot. In the compiled header these map to selectedTab 1 and 2. */
    if(t.closest('#btn-business') || t.closest('#btn-individual-banner')){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      showLoginPopup(1);
      return;
    }
    if(t.closest('#btn-individual') || t.closest('#btn-business-banner')){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      showLoginPopup(2);
      return;
    }

    var langBtn=t.closest('#btn-change-language');
    if(langBtn){
      e.preventDefault();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      toggleLanguageList(false);
      return;
    }

    if(!t.closest('#langsList') && !t.closest('#btn-change-language') && !t.closest('li.language')) removeLanguageLists();
    if(!t.closest('.portalSettings') && !t.closest('#btn-panel-settings')) closePortalSettings();
  },true);

  var verificationTransitionId=0;

  function transitionVerificationType(type){
    if(VALID_TYPES.indexOf(type)===-1) return;

    /* The live page destroys and re-creates the verification component when
       the stakeholder type changes. Visually this produces the short blank /
       fade reaction seen in the reference recording. Because this local copy
       deliberately keeps a static Angular snapshot, reproduce that component
       transition here instead of changing the labels instantly. */
    if(type===currentVerificationType){
      applyVerificationType(type,false);
      return;
    }

    var section=document.querySelector('section.pageContent');
    if(!section || typeof section.animate!=='function'){
      applyVerificationType(type,true);
      return;
    }

    var transitionId=++verificationTransitionId;

    try{
      section.getAnimations().forEach(function(a){ a.cancel(); });
    }catch(_){ }

    section.style.pointerEvents='none';
    section.style.opacity='1';

    var fadeOut=section.animate(
      [{opacity:1},{opacity:0}],
      {duration:125,easing:'ease-in',fill:'forwards'}
    );

    fadeOut.onfinish=function(){
      if(transitionId!==verificationTransitionId) return;

      /* Update the selected type while the component is visually absent,
         matching Angular's destroy -> create cycle. */
      applyVerificationType(type,true);
      section.style.opacity='0';
      try{ fadeOut.cancel(); }catch(_){ }

      window.setTimeout(function(){
        if(transitionId!==verificationTransitionId) return;

        var fadeIn=section.animate(
          [{opacity:0},{opacity:1}],
          {duration:285,easing:'ease-out',fill:'forwards'}
        );

        fadeIn.onfinish=function(){
          if(transitionId!==verificationTransitionId) return;
          try{ fadeIn.cancel(); }catch(_){ }
          section.style.removeProperty('opacity');
          section.style.removeProperty('pointer-events');
        };
      },70);
    };
  }

  document.addEventListener('change',function(e){
    var t=e.target;
    if(!t || t.type!=='radio' || VALID_TYPES.indexOf(t.value)===-1) return;
    if(!t.closest('.radio-container')) return;

    /* One selection at a time, with the same brief component re-render
       reaction shown by the original Angular page. */
    transitionVerificationType(t.value);
  },true);

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && document.getElementById('localVerifyErrorModal')){
      e.preventDefault();
      closeErrorDialog();
      return;
    }
    if(e.key==='Escape' && document.getElementById('loginPopUpBtns')){
      e.preventDefault();
      closeMobileLoginChoices();
      return;
    }
    if(e.key==='Escape' && document.getElementById('loginModel')){
      e.preventDefault();
      closeLoginPopup();
      return;
    }
    if(e.key==='Escape' && document.querySelector('#langsList[data-local-language-list="1"]')){
      e.preventDefault();
      removeLanguageLists();
      return;
    }
    if(e.key==='Escape' && document.querySelector('.header-search .search-box[data-local-restored-search="1"]')){
      e.preventDefault();
      closeHeaderSearch();
      return;
    }
    if(e.key==='Escape' && document.querySelector('.portalSettings.local-mobile-accessibility')){
      e.preventDefault();
      closePortalSettings();
      return;
    }
    if(e.key==='Escape' && e.target && e.target.closest && e.target.closest('.search-box-mobile')){
      e.preventDefault();
      removeMobileSearchList();
      return;
    }
    if(e.key!=='Enter') return;
    var t=e.target;
    if(!t) return;
    if(t.id==='StakeholderValue' || t.id==='CertificateNumber'){ preview(e); return; }
    if(t.id==='searchInput' || (t.closest && t.closest('.search-box-mobile'))){
      e.preventDefault();
      if(t.closest && t.closest('.search-box-mobile')) closeMobileNav();
      runOfficialSearch(t.value);
      return;
    }
    if(t.matches && t.matches('[data-local-href],[data-local-action],[data-local-back-top],[data-local-language],[data-local-search-suggestion],.portalSettings li span')) t.click();
  },true);

  document.addEventListener('input',function(e){
    var t=e.target;
    if(t && (t.id==='StakeholderValue' || t.id==='CertificateNumber')) clearError();
    if(t && t.closest && t.closest('.search-box-mobile')) updateMobileSearch(t);
  },true);

  document.addEventListener('focusout',function(e){
    var t=e.target;
    if(t && t.closest && t.closest('.search-box-mobile')){
      window.setTimeout(removeMobileSearchList,120);
    }
  },true);

  async function init(){
    stripTrailingSlash();
    initHeaderScrollBehavior();
    initRestoredGlobalBehaviors();
    normalizeForm();
    if(await openDirectResultFromUrl()) return;
    normalizeForm();

    var mo=new MutationObserver(queueNormalize);
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
