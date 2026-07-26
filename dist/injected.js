(()=>{var te={_currentStackMode:!0,_showSankey:!1,_hideOpenTabs:!0,_lastApplyTime:0,_applyTimeout:null,_originalDataCache:new Map,get currentStackMode(){return this._currentStackMode},set currentStackMode(e){this._currentStackMode=e},get showSankey(){return this._showSankey},set showSankey(e){this._showSankey=e},get hideOpenTabs(){return this._hideOpenTabs},set hideOpenTabs(e){this._hideOpenTabs=e},get lastApplyTime(){return this._lastApplyTime},set lastApplyTime(e){this._lastApplyTime=e},get applyTimeout(){return this._applyTimeout},set applyTimeout(e){this._applyTimeout=e},get originalDataCache(){return this._originalDataCache}},d=te;function R(e){d.showSankey=!!e;let t=document.getElementById("foxesscloud-sankey-container"),o=document.querySelector(".eenery_stat_r");t&&(t.style.display=d.showSankey?"block":"none",o.style.display=d.showSankey?"none":"block")}function P(e){let t=document.querySelector(".eenery_stat_r"),o=document.getElementById("foxesscloud-sankey-container");if(!o){if(!t)return;o=document.createElement("div"),o.id="foxesscloud-sankey-container",o.style.width="30%",o.style.margin="0",t.parentNode.insertBefore(o,t),t.style.display=d.showSankey?"block":"none"}function n(r,m){if(!r||isNaN(parseFloat(r)))return 0;let p=parseFloat(r);return m?.toUpperCase()==="MWH"?p*1e3:p}let a=n(e.production?.selfConsumption?.generation,e.production?.selfConsumption?.unit),c=n(e.production?.gridExport?.generation,e.production?.gridExport?.unit),l=n(e.production?.disCharge?.generation,e.production?.disCharge?.unit),s=n(e.consumption?.gridImport?.generation,e.consumption?.gridImport?.unit),i=n(e.consumption?.consumption?.generation,e.consumption?.consumption?.unit),h=n(e.consumption?.charge?.generation,e.consumption?.charge?.unit),u="kWh",y=(a||0)+(c||0),g={Imported:s,Solar:y,Discharged:l,Exported:c,Consumed:i,Charged:h},b={Imported:{color:"rgb(198, 158, 255)",labelBg:"rgb(213, 183, 255)"},Solar:{color:"rgb(8, 151, 156)",labelBg:"rgb(4, 171, 177)"},Discharged:{color:"rgb(105, 177, 255)",labelBg:"rgb(149, 200, 255)"},Exported:{color:"rgb(130, 27, 121)",labelBg:"rgb(178, 24, 165)"},Consumed:{color:"rgb(250, 140, 22)",labelBg:"rgb(255, 163, 24)"},Charged:{color:"rgb(235, 47, 150)",labelBg:"rgb(218, 3, 121)"}},f=[];a>0&&f.push({source:"Solar",target:"Consumed",value:a}),c>0&&f.push({source:"Solar",target:"Exported",value:c}),h>0&&f.push({source:"Solar",target:"Charged",value:h}),s>0&&f.push({source:"Imported",target:"Consumed",value:s}),l>0&&f.push({source:"Discharged",target:"Consumed",value:l});let S={};f.forEach(r=>{S[r.target]=(S[r.target]||0)+r.value}),f.forEach(r=>{let m=g[r.target],p=S[r.target]||0;if(m>0&&p>0){let x=m/p;r.value=r.value*x}});let T=new Set;f.forEach(r=>{T.add(r.source),T.add(r.target)});let w={};f.forEach(r=>{w[r.source]=(w[r.source]||0)+r.value,w[r.target]=(w[r.target]||0)+r.value});let k=Object.values(g).reduce((r,m)=>r+m,0)||1,_=(g.Imported||0)+(g.Solar||0)+(g.Discharged||0)||1,v=(g.Consumed||0)+(g.Exported||0)+(g.Charged||0)||1,X=Array.from(T).map(r=>({name:r,itemStyle:{color:b[r].color,shadowColor:"rgba(0,0,0,0.25)",shadowBlur:10},label:{backgroundColor:b[r].labelBg,width:70,show:!0,position:"insideTopLeft",fontWeight:"bold",color:"inherit",padding:5,shadowColor:"rgba(0,0,0,0.25)",shadowBlur:10,shadowOffsetY:2,borderRadius:2,borderWidth:1,borderColor:"rgba(0,0,0,0.25)",formatter:function(m){let p=g[m.name]||0;return p>0?`${m.name}
${p.toFixed(2)} ${u}`:m.name}}}));function K(r){if(window.echarts?.init)return r(window.echarts);let m=document.createElement("script");m.src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js",m.onload=()=>r(window.echarts),document.head.appendChild(m)}K(r=>{let m={tooltip:{trigger:"item",formatter:function(p){if(p.dataType==="edge"){let Z=w[p.data.source]||1,ee=(p.data.value/Z*100).toFixed(1);return`${p.data.source} \u2192 ${p.data.target}<br/>${p.data.value.toFixed(2)} ${u} (${ee}%)`}let x=g[p.name]||0,J=["Imported","Solar","Discharged"].includes(p.name)?_:v,Q=(x/Math.max(J,1)*100).toFixed(1);return`${p.name}<br/>${x.toFixed(2)} ${u} (${Q}%)`}},series:[{type:"sankey",top:0,right:0,left:0,bottom:40,nodeWidth:90,nodeGap:16,layoutIterations:32,orient:"horizontal",nodeAlign:"justify",data:X,links:f,emphasis:{focus:"adjacency"},lineStyle:{color:"gradient",curveness:.5,opacity:.5}}]};if(o.__sankeyChart)o.__sankeyChart.setOption(m,!0);else{let p=r.init(o);o.__sankeyChart=p,p.setOption(m)}})}var L="rgb(0,205,212)",E=[],H={showCapacity:!0,showPercent:!0,showHistory:!0};function oe(e=0){let t=document.getElementById("solar-percent-marker"),o=document.getElementById("vertical-progress-bar");if(!t||!o)return;let n=Math.max(0,Math.min(100,Number(e)||0));t.innerHTML=`<b>${n.toFixed(1)}</b> %`,t.style.top=`${100-n}%`,console.log(t)}function ne(e){H.showCapacity=e;let t=document.getElementById("solar-gauge-label");t&&(t.style.display=e?"":"none")}function re(e){H.showPercent=e;let t=document.getElementById("solar-percent-marker");t&&(t.style.display=e?"":"none")}function se(e){H.showHistory=e;let t=document.getElementById("solar-history-wrapper");t&&(t.style.display=e?"":"none")}function N(){let e=document.getElementById("vertical-progress-bar");if(!e)return;let t=document.getElementById("solar-history-wrapper");if(t)return;t=document.createElement("div"),t.id="solar-history-wrapper",t.style.cssText=`
      position: absolute;
      left: -125px;
      top: 0;
      width: 110px;
      height: 80px;
      pointer-events: none;
    `;let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.id="solar-history-svg",o.setAttribute("viewBox","0 0 110 80"),o.style.cssText=`
      width: 100%;
      height: 100%;
      overflow: visible;
    `,t.appendChild(o),e.appendChild(t)}function ae(){let e=document.getElementById("solar-history-svg");if(!e)return;let t=E.slice(-12);if(t.length<2){e.innerHTML="";return}let n=110-(t.length-1)*10,a=t.map((h,u)=>{let y=n+u*10,g=80-h/100*80;return`${y},${g}`}).join(" "),c=t[t.length-1],l=n+(t.length-1)*10,s=80-c/100*80,i=`${l+6},${s} ${l-1},${s-4} ${l-1},${s+4}`;e.innerHTML=`
      <polyline
        points="${a}"
        fill="none"
        stroke="${L}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polygon
        points="${i}"
        fill="${L}"
      />
    `}function ie(e){let t=Math.max(0,Math.min(100,Number(e)||0));E.push(t),E.length>12&&E.shift(),ae()}function ce(){let e=document.getElementById("solar-gauge-label");if(!e)return;let t=Number(window.pvCapacity??0),o=`${Number.isFinite(t)?t.toFixed(1):"0.0"} kW`;e.innerHTML=o}function O(e=0){let t=document.querySelector(".fl_tips2");if(!t)return console.warn("[ProgressBar] .fl_tips2 not found"),null;let o=document.getElementById("vertical-progress-bar");if(!o){o=document.createElement("div"),o.id="vertical-progress-bar",o.style.cssText=`
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
      `;let a=document.createElement("div");a.id="solar-gauge-label",a.style.cssText=`
        font-size: 12px;
        color: var(--color-text-label);
        line-height: 1;
        pointer-events: none;
      `;let c=document.createElement("div");c.id="progress-fill",c.style.cssText=`
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
        `;let l=document.createElement("div");l.style.cssText=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `,[25,50,75].forEach(h=>{let u=document.createElement("div");u.style.cssText=`
                position: absolute;
                width: 100%;
                height: 1px;
                background: rgba(255,255,255,0.35);
                left: 0;
                top: ${100-h}%;
            `,l.appendChild(u)});let s=document.createElement("div");s.id="solar-percent-marker",s.style.cssText=`
        position: absolute;
        left: -80px;
        width: 68px;
        text-align: right;
        pointer-events: none;
        transform: translateY(-110%);
        font-weight: bold;
        z-index: 20;
      `,o.appendChild(c),o.appendChild(l),o.appendChild(s),t.appendChild(o),N();let i=document.querySelector(".tip_common.tip_solar");i?i.appendChild(a):t.appendChild(a)}N();let n=document.getElementById("progress-fill");if(n){let a=Math.max(0,Math.min(100,e));n.style.height=`${a}%`}return oe(e),ie(e),ce(),o}function C(e,t="W",o=window.pvCapacity){let n=parseFloat(e)||0,a=t==="W"?n/1e3:n,c=Number(o)||1,l=c>0?a/c*100:0;return window.__foxessSolarState={value:e,unit:t},O(l),l}function M(e){let t=document.getElementById("vertical-progress-bar"),o=document.getElementById("solar-gauge-label"),n=e?"":"none";t&&(t.style.display=n),o&&(o.style.display=n)}function G(e){ne(e)}function B(e){re(e)}function $(e){se(e)}function W(){let e=null,t=null,o=window.WebSocket;window.WebSocket=function(n,a){let c=new o(n,a);return n&&n.includes("/dew/v0/wsmaitian")&&(e&&t&&e.removeEventListener("message",t),t=function(l){try{let s=JSON.parse(l.data);if(s.errno===0&&s.result?.node?.solar?.power?.value){let i=s.result.node.solar.power;C(i.value,i.unit)}}catch{}},c.addEventListener("message",t),e=c,c.addEventListener("close",()=>{e===c&&(e=null,t=null)})),c}}function A(e,t){if(!e)return;let o=Date.now();if(o-d.lastApplyTime<300)return;d.lastApplyTime=o;let n=e.getOption();if(!n?.series)return;let a=e.id||`chart_${Math.random().toString(36).substr(2,9)}`;if(!d.originalDataCache.has(a)){let s=n.series.map(i=>Array.isArray(i.data)?i.data.map(h=>Array.isArray(h)?[...h]:h):i.data);d.originalDataCache.set(a,s)}let c=d.originalDataCache.get(a),l=!1;if(n.series.forEach((s,i)=>{if(!Array.isArray(s.data))return;let h=c?.[i];if(h&&(s.data=s.data.map((u,y)=>{if(Array.isArray(u)&&u.length>=2){let g=h[y],b=Array.isArray(g)?parseFloat(g[1]):NaN;if(!isNaN(b)){let f=t?b:Math.abs(b);u[1]!==f&&(u[1]=f,l=!0)}}return u}),s.type==="bar")){let u=t?"customStack":null,y=t?"20%":"35%";(s.stack!==u||s.barGap!==y)&&(s.stack=u,s.barGap=y,l=!0)}}),n.yAxis?.[0]){let s=t?void 0:0;n.yAxis[0].min!==s&&(n.yAxis[0].min=s,l=!0)}l&&(e.setOption(n,{notMerge:!0,replaceMerge:["series","yAxis"]}),e.resize())}function I(){let e=document.querySelectorAll(".echart");if(e.length===0){console.warn("\u26A0\uFE0F No .echart elements found on page!");return}e.forEach(t=>{let o=window.echarts?.getInstanceByDom(t);o&&A(o,d.currentStackMode)})}function Y(e){!e||e.__foxessHooked||(e.__foxessHooked=!0,e.on("rendered",()=>{setTimeout(()=>{A(e,d.currentStackMode)},500)}))}var le=new MutationObserver(()=>{d.applyTimeout&&clearTimeout(d.applyTimeout),d.applyTimeout=setTimeout(()=>{I(),document.querySelectorAll(".echart").forEach(e=>{let t=window.echarts?.getInstanceByDom(e);t&&Y(t)})},250)});function D(){document.querySelectorAll(".echart").forEach(e=>{e.dataset.observed||(le.observe(e,{childList:!0,subtree:!0}),e.dataset.observed="true")})}var de=new MutationObserver(()=>{D()});de.observe(document.body,{childList:!0,subtree:!0});setTimeout(()=>{D(),document.querySelectorAll(".echart").forEach(e=>{let t=window.echarts?.getInstanceByDom(e);t&&Y(t)}),I()},1500);var q="/dew/w/plant/energy/info",F="/dew/v0/plant/detail";function V(e){e?.result?.production&&e?.result?.consumption&&P(e.result)}function z(e){e?.result?.info?.pvCapacity&&(window.pvCapacity=e.result.info.pvCapacity,window.plantID=e.result.plantID,console.log("PV Capacity:",window.__foxessSolarState),window.__foxessSolarState?.value&&C(window.__foxessSolarState.value,window.__foxessSolarState.unit,window.pvCapacity))}var pe=window.fetch;window.fetch=async function(...e){let t=await pe.apply(this,e);try{let o=typeof e[0]=="string"?e[0]:e[0]?.url||"";console.log("Intercepted fetch request to:",o);let a=await t.clone().json().catch(()=>null);if(!a)return t;o.includes(q)?V(a):o.includes(F)&&z(a)}catch(o){console.debug("Fetch interceptor error (non-fatal)",o)}return t};var ue=XMLHttpRequest.prototype.open,he=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(...e){let t=e[1];return typeof t=="string"&&(this._requestType=t.includes(q)?"energy":t.includes(F)?"plant":null),ue.apply(this,e)};XMLHttpRequest.prototype.send=function(...e){return this._requestType&&this.addEventListener("load",function(){try{if(this.responseText){let t=JSON.parse(this.responseText);this._requestType==="energy"?V(t):this._requestType==="plant"&&z(t)}}catch(t){console.debug("XHR parse error",t)}}),he.apply(this,e)};(()=>{let e="#e6e6e6",t="__axes_overlay",o="__axes_overlay_line";function n(i){if(!i||!(i instanceof Element))return;i.querySelectorAll(`.${t}`).forEach(_=>_.remove()),getComputedStyle(i).position==="static"&&(i.style.position="relative");let y=i.clientHeight||i.getBoundingClientRect().height,g=i.clientWidth||i.getBoundingClientRect().width;if(!y||!g)return;let b=document.createElement("div");b.className=t,Object.assign(b.style,{position:"absolute",inset:"0 0 0 0",pointerEvents:"none",zIndex:9999});let f=2,S=f,T=(y-f*2)/2,w=Math.round(S+T),k=Math.round(S+T*2);[S,w,k].forEach(_=>{let v=document.createElement("div");v.className=o,Object.assign(v.style,{position:"absolute",left:"0px",right:"0px",height:"0px",top:`${_}px`,borderTop:`1px dashed ${e}`,boxSizing:"border-box",pointerEvents:"none"}),b.appendChild(v)}),i.appendChild(b)}function a(){Array.from(document.querySelectorAll(".infoItemContentSide .echart")).concat(Array.from(document.querySelectorAll(".infoItemContentSide .echart"))).forEach(h=>n(h))}let c=null;function l(){clearTimeout(c),c=setTimeout(a,120)}let s=new MutationObserver(l);try{s.observe(document.body,{childList:!0,subtree:!0})}catch{}window.addEventListener("resize",l),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(a,50)):setTimeout(a,50)})();function j(e){document.querySelectorAll(".tab-wrap, .overviewTitle, .cookie-consent-wrapper, .backv1-btn").forEach(o=>{o.style.display=e?"none":""}),document.querySelectorAll(".overview").forEach(o=>{o.style.height=e?"100%":"calc(100% - 75px)",o.style.paddingTop=e?"20px":void 0,o.style.paddingBottom=e?"20px":void 0});let t=document.querySelector(".overview .overviewContent .overviewRight");t&&(t.style.flex=e?"5":"7")}window.addEventListener("message",e=>{if(e.data?.source!=="foxesscloud-extension")return;let t=e.data;switch(t.type){case"SET_UNSTACKED":d.currentStackMode=t.value,I();break;case"SHOW_SANKEY":R(t.value);break;case"HIDE_OPEN_TABS":d.hideOpenTabs=t.value,j(d.hideOpenTabs);break;case"SHOW_SOLAR_GAUGE":M(t.value);break;case"SHOW_SOLAR_CAPACITY":G(t.value);break;case"SHOW_SOLAR_PERCENT_LABEL":B(t.value);break;case"SHOW_SOLAR_HISTORY":$(t.value);break;default:console.warn("Unknown message type:",t.type)}});function U(){O(0),j(d.hideOpenTabs),W()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",U):U();})();
