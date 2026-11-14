(()=>{var We={_currentStackMode:!0,_showSankey:!0,_hideOpenTabs:!0,get currentStackMode(){return this._currentStackMode},set currentStackMode(e){this._currentStackMode=e},get showSankey(){return this._showSankey},set showSankey(e){this._showSankey=e},get hideOpenTabs(){return this._hideOpenTabs},set hideOpenTabs(e){this._hideOpenTabs=e}},g=We;function F(e){g.showSankey=!!e;let t=document.getElementById("foxesscloud-sankey-container"),o=document.querySelector(".eenery_stat_r");o&&(o.style.display=g.showSankey?"none":""),t&&(t.style.display=g.showSankey?"block":"none")}function ae(e){let t=document.querySelector(".eenery_stat_r"),o=document.getElementById("foxesscloud-sankey-container");if(!o){if(!t)return;o=document.createElement("div"),o.id="foxesscloud-sankey-container",o.style.width="30%",o.style.margin="0",t.parentNode.insertBefore(o,t),F(g.showSankey)}function r(s,m){if(!s||isNaN(parseFloat(s)))return 0;let p=parseFloat(s);return m?.toUpperCase()==="MWH"?p*1e3:p}let n=r(e.production?.selfConsumption?.generation,e.production?.selfConsumption?.unit),a=r(e.production?.gridExport?.generation,e.production?.gridExport?.unit),c=r(e.production?.disCharge?.generation,e.production?.disCharge?.unit),l=r(e.consumption?.gridImport?.generation,e.consumption?.gridImport?.unit),i=r(e.consumption?.consumption?.generation,e.consumption?.consumption?.unit),u=r(e.consumption?.charge?.generation,e.consumption?.charge?.unit),f="kWh",d=(n||0)+(a||0),h={Imported:l,Solar:d,Discharged:c,Exported:a,Consumed:i,Charged:u},E={Imported:{color:"rgb(198, 158, 255)",labelBg:"rgb(213, 183, 255)"},Solar:{color:"rgb(8, 151, 156)",labelBg:"rgb(4, 171, 177)"},Discharged:{color:"rgb(105, 177, 255)",labelBg:"rgb(149, 200, 255)"},Exported:{color:"rgb(130, 27, 121)",labelBg:"rgb(178, 24, 165)"},Consumed:{color:"rgb(250, 140, 22)",labelBg:"rgb(255, 163, 24)"},Charged:{color:"rgb(235, 47, 150)",labelBg:"rgb(218, 3, 121)"}},y=[];n>0&&y.push({source:"Solar",target:"Consumed",value:n}),a>0&&y.push({source:"Solar",target:"Exported",value:a}),u>0&&y.push({source:"Solar",target:"Charged",value:u}),l>0&&y.push({source:"Imported",target:"Consumed",value:l}),c>0&&y.push({source:"Discharged",target:"Consumed",value:c});let w={};y.forEach(s=>{w[s.target]=(w[s.target]||0)+s.value}),y.forEach(s=>{let m=h[s.target],p=w[s.target]||0;if(m>0&&p>0){let R=m/p;s.value=s.value*R}});let W=new Set;y.forEach(s=>{W.add(s.source),W.add(s.target)});let H={};y.forEach(s=>{H[s.source]=(H[s.source]||0)+s.value,H[s.target]=(H[s.target]||0)+s.value});let _t=Object.values(h).reduce((s,m)=>s+m,0)||1,Ne=(h.Imported||0)+(h.Solar||0)+(h.Discharged||0)||1,Re=(h.Consumed||0)+(h.Exported||0)+(h.Charged||0)||1,Fe=Array.from(W).map(s=>({name:s,itemStyle:{color:E[s].color,shadowColor:"rgba(0,0,0,0.25)",shadowBlur:10},label:{backgroundColor:E[s].labelBg,width:70,show:!0,position:"insideTopLeft",fontWeight:"bold",color:"inherit",padding:5,shadowColor:"rgba(0,0,0,0.25)",shadowBlur:10,shadowOffsetY:2,borderRadius:2,borderWidth:1,borderColor:"rgba(0,0,0,0.25)",formatter:function(m){let p=h[m.name]||0;return p>0?`${m.name}
${p.toFixed(2)} ${f}`:m.name}}}));function Be(s){if(window.echarts?.init)return s(window.echarts);let m=document.createElement("script");m.src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js",m.onload=()=>s(window.echarts),document.head.appendChild(m)}Be(s=>{let m={tooltip:{trigger:"item",formatter:function(p){if(p.dataType==="edge"){let $e=H[p.data.source]||1,Le=(p.data.value/$e*100).toFixed(1);return`${p.data.source} \u2192 ${p.data.target}<br/>${p.data.value.toFixed(2)} ${f} (${Le}%)`}let R=h[p.name]||0,Me=["Imported","Solar","Discharged"].includes(p.name)?Ne:Re,De=(R/Math.max(Me,1)*100).toFixed(1);return`${p.name}<br/>${R.toFixed(2)} ${f} (${De}%)`}},series:[{type:"sankey",top:0,right:0,left:0,bottom:40,nodeWidth:90,nodeGap:16,layoutIterations:32,orient:"horizontal",nodeAlign:"justify",data:Fe,links:y,emphasis:{focus:"adjacency"},lineStyle:{color:"gradient",curveness:.5,opacity:.5}}]};if(o.__sankeyChart)o.__sankeyChart.setOption(m,!0);else{let p=s.init(o);o.__sankeyChart=p,p.setOption(m)}})}var ie="solar-history-fade",B="rgb(0,205,212)",S=[],le=!1,q=0,b={showGauge:!0,showCapacity:!0,showPercent:!0,showHistory:!0},v={showEstimate:!0,capacityKwh:Number(window.__foxessBatteryCapacity??parseFloat(localStorage.getItem("foxess_battery_capacity")||"0"))||0};function se(e){let t=Math.round(e*60);if(t===0)return"<1m";let o=Math.floor(t/60),r=t%60;return o>0?`${o}h${r>0?` ${r}m`:""}`:`${r}m`}function Ge(){let e=document.querySelector(".tip_bat .tip_value_box");if(!e)return null;let o=(e.textContent?.trim()||"").match(/([-+]?\d+(?:[.,]\d+)?)\s*([kK]?W)\b/);if(!o)return null;let[,r,n]=o,a=parseFloat(r.replace(",","."));return Number.isFinite(a)?{valueKw:n.toLowerCase()==="kw"?a:a/1e3,rawValue:a,rawUnit:n.toUpperCase()}:null}function Pe(){let e=document.querySelector(".tip_bat .tip_value_box");if(!e)return null;let r=[...(e.textContent?.trim()||"").replace(/%/g,"").trim().matchAll(/([-+]?[0-9]+(?:[.,][0-9]+)?)/g)];if(!r.length)return null;let n=parseFloat(r[r.length-1][1].replace(",","."));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null}function Ye(){let e=document.querySelector(".tip_bat .tip_value_box");if(!e)return null;let t=e.closest(".tip_bat");if(!t)return null;let o=t.firstElementChild;if(!o)return null;let r=o.textContent?.trim()||"";return r.includes("Charging")?"charging":r.includes("Discharging")?"discharging":null}function O(){let e=document.getElementById("battery-estimate-label");if(!e)return;if(!v.showEstimate){_(e,!1);return}let t=Number(v.capacityKwh)||0,o=v.showEstimate,r=Ge(),n=Pe(),a=Ye(),c=r?.valueKw;if(!Number.isFinite(t)||t<=0){let w=parseFloat(localStorage.getItem("foxess_battery_capacity")||"0");Number.isFinite(w)&&w>0&&(t=w)}let l=a==="charging"?!0:a==="discharging"?!1:c>0,i=Number.isFinite(n)?t*(l?(100-n)/100:n/100):t,u=Number.isFinite(n)?t*(n/100):null,f=Number.isFinite(n)?l?`: ${i.toFixed(1)} kWh`:`: ${u.toFixed(1)} kWh`:"";if(!Number.isFinite(t)||t<=0||!r||!Number.isFinite(c)||c===0){T(e,"Battery estimate unavailable"),_(e,!0);return}if(Number.isFinite(n)&&i<=0){T(e,l?"Battery already full":"Battery already empty"),_(e,!0);return}let d=l?"full":"empty",h=i/Math.abs(c),E=t*.01/Math.abs(c),y=l?"charge":"discharge";T(e,`~${se(h)} til ${d}${f}<br/>~${se(E)} per 1% ${y}`),_(e,!0)}function ue(e){document.querySelectorAll(".power_flow .flow_dot .fl_tips4").forEach(t=>{t.style.width=e?"180px":""})}function U(e){let t=Number(e)||0;if(v.capacityKwh=t,window.__foxessBatteryCapacity=t,t>0)try{localStorage.setItem("foxess_battery_capacity",String(t))}catch(o){console.warn("[FoxESS] failed to save battery capacity to page localStorage",o)}else try{localStorage.removeItem("foxess_battery_capacity")}catch{}O()}function K(e){v.showEstimate=e,ue(e),O()}function T(e,t){e&&e.innerHTML!==t&&(e.innerHTML=t)}function _(e,t){if(!e)return;let o=t?"":"none";e.style.display!==o&&(e.style.display=o)}function qe(e){let t=document.getElementById("solar-percent-marker"),o=document.getElementById("vertical-progress-bar");if(!t||!o)return;if(e===null||!Number.isFinite(Number(e))){T(t,"<b>--</b> %"),t.style.top="100%";return}let r=Math.max(0,Math.min(100,Number(e)));T(t,`<b>${r.toFixed(1)}</b> %`),t.style.top=`${100-r}%`}function k(){let e=b.showGauge;_(document.getElementById("vertical-progress-bar"),e),_(document.getElementById("solar-gauge-label"),e&&b.showCapacity),_(document.getElementById("solar-percent-marker"),e&&b.showPercent),_(document.getElementById("solar-history-wrapper"),e&&b.showHistory)}function Ue(e){b.showCapacity=e,k()}function Ke(e){b.showPercent=e,k()}function Ve(e){b.showHistory=e,k(),e&&V()}function ze(){let e=document.getElementById("vertical-progress-bar");if(!e)return!1;let t=document.getElementById("solar-history-wrapper");if(t?t.parentElement!==e&&e.appendChild(t):(t=document.createElement("div"),t.id="solar-history-wrapper",t.style.cssText=`
        position: absolute;
        left: -125px;
        top: 0;
        width: 110px;
        height: 80px;
        pointer-events: none;
      `,e.appendChild(t)),document.getElementById("solar-history-svg"))return!1;let o=document.createElementNS("http://www.w3.org/2000/svg","svg");return o.id="solar-history-svg",o.setAttribute("viewBox","0 0 110 80"),o.style.cssText=`
      width: 100%;
      height: 100%;
      overflow: visible;
    `,t.appendChild(o),!0}function Xe(e=Date.now()){let t=e-6e4,o=0;for(;o<S.length&&S[o].t<t;)o++;o&&S.splice(0,o);let r=S.length-240;r>0&&S.splice(0,r)}function G(e){return 80-Math.max(0,Math.min(100,e))/100*80}function V(e=Date.now()){let t=document.getElementById("solar-history-svg");if(!t)return;Xe(e);let o=S;if(o.length===0){t.innerHTML!==""&&(t.innerHTML="");return}let r=o[o.length-1],n=110,a=d=>n-(r.t-d)/6e4*110;if(o.length===1){t.innerHTML=`<circle cx="${n}" cy="${G(o[0].v)}" r="2" fill="${B}" />`;return}let c=o.map(d=>`${a(d.t).toFixed(1)},${G(d.v).toFixed(1)}`).join(" "),l=G(r.v),i=`${n+6},${l.toFixed(1)} ${n-1},${(l-4).toFixed(1)} ${n-1},${(l+4).toFixed(1)}`,u=Math.min(a(o[0].t),n-1),f=u+Math.max(1,(n-u)*.45);t.innerHTML=`
      <defs>
        <linearGradient
          id="${ie}"
          gradientUnits="userSpaceOnUse"
          x1="${u.toFixed(1)}" y1="0" x2="${f.toFixed(1)}" y2="0"
        >
          <stop offset="0" stop-color="${B}" stop-opacity="0" />
          <stop offset="1" stop-color="${B}" stop-opacity="1" />
        </linearGradient>
      </defs>
      <polyline
        points="${c}"
        fill="none"
        stroke="url(#${ie})"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polygon
        points="${i}"
        fill="${B}"
      />
    `}function je(e,t=Date.now()){let o=Number(e);if(!Number.isFinite(o))return!1;let r=Math.max(0,Math.min(100,o));r>0&&(le=!0);let n=S[S.length-1];return n&&n.v===r&&t-n.t<1e3?!1:(S.push({t,v:r}),V(t),!0)}function Je(e=window.__foxessSolarState){if(!e)return null;let t=parseFloat(e.value)||0,o=e.unit==="W"?t/1e3:t,r=Number(window.pvCapacity);return!Number.isFinite(r)||r<=0?null:o/r*100}function Ze(e){let t=Number(e);return!Number.isFinite(t)||t<=0&&!q&&!le?!1:je(t)}function Qe(){return b.showGauge&&b.showHistory}var x=null;function et(){let e=document.querySelector(".tip_bat"),t=document.getElementById("battery-estimate-label");t||(t=document.createElement("div"),t.id="battery-estimate-label",t.style.cssText=`
        display: block;
        width: 100%;
        flex-basis: 100%;
        clear: both;
        font-size: 12px;
        color: var(--color-text-label);
        line-height: 1.2;
        pointer-events: none;
        margin-top: 4px;
      `);let o=e||document.querySelector(".fl_tips2");return o&&t.parentElement!==o&&o.appendChild(t),t}function ce(e){x&&x.disconnect(),x=new MutationObserver(()=>{O()}),x.observe(e,{childList:!0,subtree:!0,characterData:!0})}var P=null;function tt(){let e=document.querySelector(".tip_bat");if(!e)return;let t=document.querySelector(".tip_bat .tip_value_box"),o=t||e;if(P!==o){if(P=o,t){ce(t);return}x&&x.disconnect(),x=new MutationObserver(()=>{let r=document.querySelector(".tip_bat .tip_value_box");r&&(P=r,ce(r),O())}),x.observe(e,{childList:!0,subtree:!0})}}function ot(){let e=document.getElementById("solar-gauge-label");if(!e)return;let t=Number(window.pvCapacity),o=Number.isFinite(t)&&t>0?`${t.toFixed(3)} kW`:"-- kW";T(e,o)}function rt(){let e=document.createElement("div");e.id="vertical-progress-bar",e.style.cssText=`
      position: absolute;
      width: 14px;
      height: 80px;
      background: #4d4d4e;
      border: 2px solid #000;
      border-radius: 9999px;
      overflow: visible;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
      z-index: 10;
      left: -23px;
      top: 38px;
      transform: translateY(-50%);
    `;let t=document.createElement("div");t.id="progress-fill",t.style.cssText=`
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 0%;
          background: linear-gradient(to top, 
          rgb(8, 151, 156),
          rgb(0, 178, 184), 
          rgb(0, 205, 212));
          transition: height 0.4s ease-out;
          border-radius: 9999px;
      `;let o=document.createElement("div");o.style.cssText=`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
      `,[25,50,75].forEach(n=>{let a=document.createElement("div");a.style.cssText=`
              position: absolute;
              width: 100%;
              height: 1px;
              background: rgba(255,255,255,0.35);
              left: 0;
              top: ${100-n}%;
          `,o.appendChild(a)});let r=document.createElement("div");return r.id="solar-percent-marker",r.innerHTML="<b>--</b> %",r.style.cssText=`
      position: absolute;
      left: -80px;
      width: 68px;
      text-align: right;
      pointer-events: none;
      transform: translateY(-110%);
      font-weight: bold;
      z-index: 20;
    `,e.appendChild(t),e.appendChild(o),e.appendChild(r),e}function nt(){let e=document.getElementById("solar-gauge-label");e||(e=document.createElement("div"),e.id="solar-gauge-label",e.style.cssText=`
        font-size: 12px;
        color: var(--color-text-label);
        line-height: 1;
        pointer-events: none;
      `);let t=document.querySelector(".tip_common.tip_solar")||document.querySelector(".fl_tips2");return t&&e.parentElement!==t&&t.appendChild(e),e}function Y(e){let t=document.querySelector(".fl_tips2");if(!t)return null;let o=document.getElementById("vertical-progress-bar");o||(o=rt()),o.parentElement!==t&&t.appendChild(o);let r=ze();if(nt(),et(),k(),r&&V(),e!==void 0){let n=e===null?null:Number(e),a=n===null||!Number.isFinite(n)?null:Math.max(0,Math.min(100,n)),c=document.getElementById("progress-fill");if(c){let l=a===null?"0%":`${a}%`;c.style.height!==l&&(c.style.height=l)}qe(a),a!==null&&Qe()&&Ze(a)}return ot(),O(),ue(v.showEstimate),tt(),o}function M(){return window.__foxessSolarState?Y(Je()):Y(void 0)}function I(e,t="W",o=window.pvCapacity){let r=parseFloat(e)||0,n=t==="W"?r/1e3:r,a=Number(o),c=Number.isFinite(a)&&a>0?n/a*100:null;return window.__foxessSolarState={value:e,unit:t},Y(c),c}function de(){q=Date.now()}function at(){let e=document.querySelector(".tip_solar .tip_value_box");if(!e)return null;let o=(e.textContent?.trim()||"").match(/([-+]?\d+(?:[.,]\d+)?)\s*([kK]?W)\b/);if(!o)return null;let r=parseFloat(o[1].replace(",","."));return Number.isFinite(r)?{value:r,unit:o[2].toUpperCase()}:null}function pe(e=15e3){if(!b.showGauge||Date.now()-q<e)return;let t=at();t&&t.value!==0&&I(t.value,t.unit,window.pvCapacity)}function z(e){b.showGauge=!!e,k()}function X(e){Ue(e)}function j(e){Ke(e)}function J(e){Ve(e)}function fe(){if(window.__foxessWebSocketPatched)return;window.__foxessWebSocketPatched=!0;let e=window.WebSocket;if(!e)return;let t=null,o=null;class r extends e{constructor(a,c){super(a,c),typeof a=="string"&&a.includes("/dew/v0/wsmaitian")&&(t&&o&&t.removeEventListener("message",o),o=l=>{try{let i=JSON.parse(l.data),u=i?.result?.node?.solar?.power;i.errno===0&&u?.value!==void 0&&(de(),I(u.value,u.unit))}catch{}},this.addEventListener("message",o),t=this,this.addEventListener("close",()=>{t===this&&(t=null,o=null)}))}}window.WebSocket=r}var Z=new WeakMap;function D(e,t){if(!e)return;let o=e.getOption();if(!o?.series)return;let r=Z.get(e),n=!!r?.some(i=>Array.isArray(i)&&i.length>0),a=o.series.some(i=>Array.isArray(i.data)&&i.data.length>0);if(!r||a&&!n){let i=o.series.map(u=>Array.isArray(u.data)?u.data.map(f=>Array.isArray(f)?[...f]:f):u.data);Z.set(e,i)}let c=Z.get(e),l=!1;if(o.series.forEach((i,u)=>{if(!Array.isArray(i.data))return;let f=c?.[u];if(f&&(i.data=i.data.map((d,h)=>{if(Array.isArray(d)&&d.length>=2){let E=f[h],y=Array.isArray(E)?parseFloat(E[1]):NaN;if(!isNaN(y)){let w=t?y:Math.abs(y);d[1]!==w&&(d[1]=w,l=!0)}}return d}),i.type==="bar")){let d=t?"customStack":null,h=t?"20%":"35%";(i.stack!==d||i.barGap!==h)&&(i.stack=d,i.barGap=h,l=!0)}}),o.yAxis?.[0]){let i=t?null:0;o.yAxis[0].min!==i&&(o.yAxis[0].min=i,l=!0)}l&&(e.setOption(o,{replaceMerge:["series","yAxis"]}),e.resize())}function Q(){let e=document.querySelectorAll(".echart");e.length!==0&&e.forEach(t=>{let o=window.echarts?.getInstanceByDom(t);o&&D(o,g.currentStackMode)})}var it=300;function st(e){!e||e.__foxessHooked||(e.__foxessHooked=!0,e.on("rendered",()=>{e.__foxessRenderTimer&&clearTimeout(e.__foxessRenderTimer),e.__foxessRenderTimer=setTimeout(()=>{e.__foxessRenderTimer=null,D(e,g.currentStackMode)},it)}))}function he(){let e=window.echarts;e?.getInstanceByDom&&document.querySelectorAll(".echart").forEach(t=>{let o=e.getInstanceByDom(t);if(!o)return;let r=!!o.__foxessHooked;st(o),r||D(o,g.currentStackMode)})}var ct="#e6e6e6",me="__axes_overlay",lt="__axes_overlay_line",ut=".infoItemContentSide .echart";function dt(e){if(!e||!(e instanceof Element))return;let t=Math.round(e.clientHeight||e.getBoundingClientRect().height),o=Math.round(e.clientWidth||e.getBoundingClientRect().width);if(!t||!o)return;let r=`${o}x${t}`,n=e.querySelector(`.${me}`);if(n&&n.dataset.size===r)return;n?n.innerHTML="":(getComputedStyle(e).position==="static"&&(e.style.position="relative"),n=document.createElement("div"),n.className=me,Object.assign(n.style,{position:"absolute",inset:"0 0 0 0",pointerEvents:"none",zIndex:9999}),e.appendChild(n)),n.dataset.size=r;let a=2,c=a,l=(t-a*2)/2,i=Math.round(c+l),u=Math.round(c+l*2);[c,i,u].forEach(f=>{let d=document.createElement("div");d.className=lt,Object.assign(d.style,{position:"absolute",left:"0px",right:"0px",height:"0px",top:`${f}px`,borderTop:`1px dashed ${ct}`,boxSizing:"border-box",pointerEvents:"none"}),n.appendChild(d)})}function ye(){document.querySelectorAll(ut).forEach(e=>dt(e))}var te=".fl_tips2, .tip_solar, .tip_bat",oe=".echart",$t=`${te}, ${oe}`,ge="#vertical-progress-bar, #battery-estimate-label, #solar-gauge-label, #solar-history-wrapper, .__axes_overlay",C=1,A=2,N=C|A,pt=150,be=null,ee=null,L=0,we=!1;function $(e){return e instanceof Element?e.matches(ge)||!!e.closest(ge):!1}function _e(e){if(!(e instanceof Element))return 0;let t=0;return e.closest(te)&&(t|=C),e.closest(oe)&&(t|=A),t}function ft(e){if(!(e instanceof Element))return 0;let t=_e(e);return t===N||(!(t&C)&&e.querySelector(te)&&(t|=C),!(t&A)&&e.querySelector(oe)&&(t|=A)),t}function ht(e){let t=e.target;if(t instanceof Element&&$(t)||t?.parentElement&&$(t.parentElement))return 0;if(e.type==="characterData")return t.parentElement?.closest(".tip_solar")?C:0;if(e.type!=="childList")return 0;let o=[...e.addedNodes,...e.removedNodes].filter(n=>n.nodeType===Node.ELEMENT_NODE||n.nodeType===Node.TEXT_NODE);if(o.length&&o.every($))return 0;let r=_e(t);for(let n of e.addedNodes)$(n)||(r|=ft(n));return r}function xe(){ee=null;let e=L;L=0,e&C&&(M(),pe()),e&A&&(he(),ye())}function Se(e=N){L|=e,!ee&&(ee=setTimeout(xe,pt))}function re(){if(we)return;let e=document.documentElement;e&&(we=!0,be=new MutationObserver(t=>{let o=0;for(let r of t)if(o|=ht(r),o===N)break;o&&Se(o)}),be.observe(e,{childList:!0,subtree:!0,characterData:!0}),window.addEventListener("resize",()=>Se(N),{passive:!0}))}function Ee(){L=N,xe()}var ve="/dew/w/plant/energy/info",Te="/dew/v0/plant/detail";function Ce(e){e?.result?.production&&e?.result?.consumption&&ae(e.result)}function He(e){e?.result?.info?.pvCapacity&&(window.pvCapacity=e.result.info.pvCapacity,window.plantID=e.result.plantID,window.__foxessSolarState?.value&&I(window.__foxessSolarState.value,window.__foxessSolarState.unit,window.pvCapacity))}var mt=window.fetch;window.fetch=async function(...e){let t=await mt.apply(this,e);try{let o=typeof e[0]=="string"?e[0]:e[0]?.url||"",n=await t.clone().json().catch(()=>null);if(!n)return t;o.includes(ve)?Ce(n):o.includes(Te)&&He(n)}catch(o){console.debug("Fetch interceptor error (non-fatal)",o)}return t};var yt=XMLHttpRequest.prototype.open,gt=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(...e){let t=e[1];return typeof t=="string"&&(this._requestType=t.includes(ve)?"energy":t.includes(Te)?"plant":null),yt.apply(this,e)};XMLHttpRequest.prototype.send=function(...e){return this._requestType&&this.addEventListener("load",function(){try{if(this.responseText){let t=JSON.parse(this.responseText);this._requestType==="energy"?Ce(t):this._requestType==="plant"&&He(t)}}catch(t){console.debug("XHR parse error",t)}}),gt.apply(this,e)};var Ie="foxesscloud-extension",Oe="foxesscloud-styles";fe();function bt(){if(document.getElementById(Oe))return;let e=document.createElement("style");e.id=Oe,e.textContent=`
    html.foxess-hide-bloat .tab-wrap,
    html.foxess-hide-bloat .overviewTitle,
    html.foxess-hide-bloat .cookie-consent-wrapper,
    html.foxess-hide-bloat .backv1-btn {
      display: none !important;
    }

    html.foxess-hide-bloat .overview {
      height: 100% !important;
      padding-top: 20px !important;
      padding-bottom: 20px !important;
    }

    html.foxess-hide-bloat .overview .overviewContent .overviewRight {
      flex: 5 !important;
    }
  `,(document.head||document.documentElement)?.appendChild(e)}function wt(e){bt(),document.documentElement?.classList.toggle("foxess-hide-bloat",!!e)}function ne(){wt(g.hideOpenTabs)}function St(e){!e||typeof e!="object"||(typeof e.hideOpenTabs=="boolean"&&(g.hideOpenTabs=e.hideOpenTabs),ne(),typeof e.unstackCharts=="boolean"&&(g.currentStackMode=!e.unstackCharts,Q()),typeof e.showSankey=="boolean"&&F(e.showSankey),typeof e.showSolarGauge=="boolean"&&z(e.showSolarGauge),typeof e.showSolarCapacity=="boolean"&&X(e.showSolarCapacity),typeof e.showSolarPercent=="boolean"&&j(e.showSolarPercent),typeof e.showSolarHistory=="boolean"&&J(e.showSolarHistory),typeof e.showBatteryEstimate=="boolean"&&K(e.showBatteryEstimate),e.batteryCapacityKwh!==void 0&&e.batteryCapacityKwh!==null&&U(e.batteryCapacityKwh),M())}function Ae(){window.postMessage({source:Ie,type:"FOXESS_READY"},"*")}window.addEventListener("message",e=>{if(e.data?.source!==Ie)return;let t=e.data;switch(t.type){case"APPLY_SETTINGS":St(t.settings);break;case"SET_UNSTACKED":g.currentStackMode=t.value,Q();break;case"SHOW_SANKEY":F(t.value);break;case"HIDE_OPEN_TABS":g.hideOpenTabs=t.value,ne();break;case"SHOW_SOLAR_GAUGE":z(t.value);break;case"SHOW_SOLAR_CAPACITY":X(t.value);break;case"SHOW_SOLAR_PERCENT_LABEL":j(t.value);break;case"SHOW_SOLAR_HISTORY":J(t.value);break;case"SHOW_BATTERY_ESTIMATE":K(t.value);break;case"SET_BATTERY_CAPACITY":U(t.value);break;case"FOXESS_READY":break;default:console.warn("Unknown message type:",t.type)}});function ke(){ne(),re(),Ee(),Ae()}re();document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ke,{once:!0}):ke();Ae();})();
