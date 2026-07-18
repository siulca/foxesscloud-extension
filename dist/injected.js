(()=>{var ee={_currentStackMode:!0,_showSankey:!1,_lastApplyTime:0,_applyTimeout:null,_originalDataCache:new Map,get currentStackMode(){return this._currentStackMode},set currentStackMode(e){this._currentStackMode=e},get showSankey(){return this._showSankey},set showSankey(e){this._showSankey=e},get lastApplyTime(){return this._lastApplyTime},set lastApplyTime(e){this._lastApplyTime=e},get applyTimeout(){return this._applyTimeout},set applyTimeout(e){this._applyTimeout=e},get originalDataCache(){return this._originalDataCache}},u=ee;function R(e){u.showSankey=!!e;let t=document.getElementById("foxesscloud-sankey-container"),o=document.querySelector(".eenery_stat_r");t&&(t.style.display=u.showSankey?"block":"none",o.style.display=u.showSankey?"none":"block")}function L(e){let t=document.querySelector(".eenery_stat_r"),o=document.getElementById("foxesscloud-sankey-container");if(!o){if(!t)return;o=document.createElement("div"),o.id="foxesscloud-sankey-container",o.style.width="30%",o.style.margin="0",t.parentNode.insertBefore(o,t),t.style.display=u.showSankey?"block":"none"}function n(r,m){if(!r||isNaN(parseFloat(r)))return 0;let d=parseFloat(r);return m?.toUpperCase()==="MWH"?d*1e3:d}let a=n(e.production?.selfConsumption?.generation,e.production?.selfConsumption?.unit),c=n(e.production?.gridExport?.generation,e.production?.gridExport?.unit),l=n(e.production?.disCharge?.generation,e.production?.disCharge?.unit),s=n(e.consumption?.gridImport?.generation,e.consumption?.gridImport?.unit),i=n(e.consumption?.consumption?.generation,e.consumption?.consumption?.unit),h=n(e.consumption?.charge?.generation,e.consumption?.charge?.unit),p="kWh",y=(a||0)+(c||0),g={Imported:s,Solar:y,Discharged:l,Exported:c,Consumed:i,Charged:h},b={Imported:{color:"rgb(198, 158, 255)",labelBg:"rgb(213, 183, 255)"},Solar:{color:"rgb(8, 151, 156)",labelBg:"rgb(4, 171, 177)"},Discharged:{color:"rgb(105, 177, 255)",labelBg:"rgb(149, 200, 255)"},Exported:{color:"rgb(130, 27, 121)",labelBg:"rgb(178, 24, 165)"},Consumed:{color:"rgb(250, 140, 22)",labelBg:"rgb(255, 163, 24)"},Charged:{color:"rgb(235, 47, 150)",labelBg:"rgb(218, 3, 121)"}},f=[];a>0&&f.push({source:"Solar",target:"Consumed",value:a}),c>0&&f.push({source:"Solar",target:"Exported",value:c}),h>0&&f.push({source:"Solar",target:"Charged",value:h}),s>0&&f.push({source:"Imported",target:"Consumed",value:s}),l>0&&f.push({source:"Discharged",target:"Consumed",value:l});let S={};f.forEach(r=>{S[r.target]=(S[r.target]||0)+r.value}),f.forEach(r=>{let m=g[r.target],d=S[r.target]||0;if(m>0&&d>0){let x=m/d;r.value=r.value*x}});let T=new Set;f.forEach(r=>{T.add(r.source),T.add(r.target)});let w={};f.forEach(r=>{w[r.source]=(w[r.source]||0)+r.value,w[r.target]=(w[r.target]||0)+r.value});let O=Object.values(g).reduce((r,m)=>r+m,0)||1,_=(g.Imported||0)+(g.Solar||0)+(g.Discharged||0)||1,v=(g.Consumed||0)+(g.Exported||0)+(g.Charged||0)||1,j=Array.from(T).map(r=>({name:r,itemStyle:{color:b[r].color,shadowColor:"rgba(0,0,0,0.25)",shadowBlur:10},label:{backgroundColor:b[r].labelBg,width:70,show:!0,position:"insideTopLeft",fontWeight:"bold",color:"inherit",padding:5,shadowColor:"rgba(0,0,0,0.25)",shadowBlur:10,shadowOffsetY:2,borderRadius:2,borderWidth:1,borderColor:"rgba(0,0,0,0.25)",formatter:function(m){let d=g[m.name]||0;return d>0?`${m.name}
${d.toFixed(2)} ${p}`:m.name}}}));function X(r){if(window.echarts?.init)return r(window.echarts);let m=document.createElement("script");m.src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js",m.onload=()=>r(window.echarts),document.head.appendChild(m)}X(r=>{let m={tooltip:{trigger:"item",formatter:function(d){if(d.dataType==="edge"){let Q=w[d.data.source]||1,Z=(d.data.value/Q*100).toFixed(1);return`${d.data.source} \u2192 ${d.data.target}<br/>${d.data.value.toFixed(2)} ${p} (${Z}%)`}let x=g[d.name]||0,K=["Imported","Solar","Discharged"].includes(d.name)?_:v,J=(x/Math.max(K,1)*100).toFixed(1);return`${d.name}<br/>${x.toFixed(2)} ${p} (${J}%)`}},series:[{type:"sankey",top:0,right:0,left:0,bottom:40,nodeWidth:90,nodeGap:16,layoutIterations:32,orient:"horizontal",nodeAlign:"justify",data:j,links:f,emphasis:{focus:"adjacency"},lineStyle:{color:"gradient",curveness:.5,opacity:.5}}]};if(o.__sankeyChart)o.__sankeyChart.setOption(m,!0);else{let d=r.init(o);o.__sankeyChart=d,d.setOption(m)}})}var P="rgb(0,205,212)",E=[],C={showCapacity:!0,showPercent:!0,showHistory:!0};function te(e=0){let t=document.getElementById("solar-percent-marker"),o=document.getElementById("vertical-progress-bar");if(!t||!o)return;let n=Math.max(0,Math.min(100,Number(e)||0));t.innerHTML=`<b>${n.toFixed(1)}</b> %`,t.style.top=`${100-n}%`}function oe(e){C.showCapacity=e;let t=document.getElementById("solar-gauge-label");t&&(t.style.display=e?"":"none")}function ne(e){C.showPercent=e;let t=document.getElementById("solar-percent-marker");t&&(t.style.display=e?"":"none")}function re(e){C.showHistory=e;let t=document.getElementById("solar-history-wrapper");t&&(t.style.display=e?"":"none")}function M(){let e=document.getElementById("vertical-progress-bar");if(!e)return;let t=document.getElementById("solar-history-wrapper");if(t)return;t=document.createElement("div"),t.id="solar-history-wrapper",t.style.cssText=`
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
    `,t.appendChild(o),e.appendChild(t)}function se(){let e=document.getElementById("solar-history-svg");if(!e)return;let t=E.slice(-12);if(t.length<2){e.innerHTML="";return}let n=110-(t.length-1)*10,a=t.map((h,p)=>{let y=n+p*10,g=80-h/100*80;return`${y},${g}`}).join(" "),c=t[t.length-1],l=n+(t.length-1)*10,s=80-c/100*80,i=`${l+6},${s} ${l-1},${s-4} ${l-1},${s+4}`;e.innerHTML=`
      <polyline
        points="${a}"
        fill="none"
        stroke="${P}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polygon
        points="${i}"
        fill="${P}"
      />
    `}function ae(e){let t=Math.max(0,Math.min(100,Number(e)||0));E.push(t),E.length>12&&E.shift(),se()}function ie(){let e=document.getElementById("solar-gauge-label");if(!e)return;let t=Number(window.pvCapacity??0),o=`${Number.isFinite(t)?t.toFixed(1):"0.0"} kW`;e.innerHTML=o}function A(e=0){let t=document.querySelector(".fl_tips2");if(!t)return console.warn("[ProgressBar] .fl_tips2 not found"),null;let o=document.getElementById("vertical-progress-bar");if(!o){o=document.createElement("div"),o.id="vertical-progress-bar",o.style.cssText=`
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
        `,[25,50,75].forEach(h=>{let p=document.createElement("div");p.style.cssText=`
                position: absolute;
                width: 100%;
                height: 1px;
                background: rgba(255,255,255,0.35);
                left: 0;
                top: ${100-h}%;
            `,l.appendChild(p)});let s=document.createElement("div");s.id="solar-percent-marker",s.style.cssText=`
        position: absolute;
        left: -80px;
        width: 68px;
        text-align: right;
        pointer-events: none;
        transform: translateY(-110%);
        font-weight: bold;
        z-index: 20;
      `,o.appendChild(c),o.appendChild(l),o.appendChild(s),t.appendChild(o),M();let i=document.querySelector(".tip_common.tip_solar");i?i.appendChild(a):t.appendChild(a)}M();let n=document.getElementById("progress-fill");if(n){let a=Math.max(0,Math.min(100,e));n.style.height=`${a}%`}return te(e),ae(e),ie(),o}function H(e,t="W",o=window.pvCapacity){let n=parseFloat(e)||0,a=t==="W"?n/1e3:n,c=Number(o)||1,l=c>0?a/c*100:0;return window.__foxessSolarState={value:e,unit:t},A(l),l}function N(e){let t=document.getElementById("vertical-progress-bar"),o=document.getElementById("solar-gauge-label"),n=e?"":"none";t&&(t.style.display=n),o&&(o.style.display=n)}function G(e){oe(e)}function $(e){ne(e)}function B(e){re(e)}function Y(){let e=null,t=null,o=window.WebSocket;window.WebSocket=function(n,a){let c=new o(n,a);return n&&n.includes("/dew/v0/wsmaitian")&&(e&&t&&e.removeEventListener("message",t),t=function(l){try{let s=JSON.parse(l.data);if(s.errno===0&&s.result?.node?.solar?.power?.value){let i=s.result.node.solar.power;H(i.value,i.unit)}}catch{}},c.addEventListener("message",t),e=c,c.addEventListener("close",()=>{e===c&&(e=null,t=null)})),c}}function k(e,t){if(!e)return;let o=Date.now();if(o-u.lastApplyTime<300)return;u.lastApplyTime=o;let n=e.getOption();if(!n?.series)return;let a=e.id||`chart_${Math.random().toString(36).substr(2,9)}`;if(!u.originalDataCache.has(a)){let s=n.series.map(i=>Array.isArray(i.data)?i.data.map(h=>Array.isArray(h)?[...h]:h):i.data);u.originalDataCache.set(a,s)}let c=u.originalDataCache.get(a),l=!1;if(n.series.forEach((s,i)=>{if(!Array.isArray(s.data))return;let h=c?.[i];if(h&&(s.data=s.data.map((p,y)=>{if(Array.isArray(p)&&p.length>=2){let g=h[y],b=Array.isArray(g)?parseFloat(g[1]):NaN;if(!isNaN(b)){let f=t?b:Math.abs(b);p[1]!==f&&(p[1]=f,l=!0)}}return p}),s.type==="bar")){let p=t?"customStack":null,y=t?"20%":"35%";(s.stack!==p||s.barGap!==y)&&(s.stack=p,s.barGap=y,l=!0)}}),n.yAxis?.[0]){let s=t?void 0:0;n.yAxis[0].min!==s&&(n.yAxis[0].min=s,l=!0)}l&&(e.setOption(n,{notMerge:!0,replaceMerge:["series","yAxis"]}),e.resize())}function I(){let e=document.querySelectorAll(".echart");if(e.length===0){console.warn("\u26A0\uFE0F No .echart elements found on page!");return}e.forEach(t=>{let o=window.echarts?.getInstanceByDom(t);o&&k(o,u.currentStackMode)})}function W(e){!e||e.__foxessHooked||(e.__foxessHooked=!0,e.on("rendered",()=>{setTimeout(()=>{k(e,u.currentStackMode)},500)}))}var ce=new MutationObserver(()=>{u.applyTimeout&&clearTimeout(u.applyTimeout),u.applyTimeout=setTimeout(()=>{I(),document.querySelectorAll(".echart").forEach(e=>{let t=window.echarts?.getInstanceByDom(e);t&&W(t)})},250)});function D(){document.querySelectorAll(".echart").forEach(e=>{e.dataset.observed||(ce.observe(e,{childList:!0,subtree:!0}),e.dataset.observed="true")})}var le=new MutationObserver(()=>{D()});le.observe(document.body,{childList:!0,subtree:!0});setTimeout(()=>{D(),document.querySelectorAll(".echart").forEach(e=>{let t=window.echarts?.getInstanceByDom(e);t&&W(t)}),I()},1500);var q="/dew/w/plant/energy/info",F="/dew/v0/plant/detail";function V(e){e?.result?.production&&e?.result?.consumption&&L(e.result)}function z(e){e?.result?.info?.pvCapacity&&(window.pvCapacity=e.result.info.pvCapacity,window.plantID=e.result.plantID,window.__foxessSolarState?.value&&H(window.__foxessSolarState.value,window.__foxessSolarState.unit,window.pvCapacity))}var de=window.fetch;window.fetch=async function(...e){let t=await de.apply(this,e);try{let o=typeof e[0]=="string"?e[0]:e[0]?.url||"",a=await t.clone().json().catch(()=>null);if(!a)return t;o.includes(q)?V(a):o.includes(F)&&z(a)}catch(o){console.debug("Fetch interceptor error (non-fatal)",o)}return t};var ue=XMLHttpRequest.prototype.open,pe=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(...e){let t=e[1];return typeof t=="string"&&(this._requestType=t.includes(q)?"energy":t.includes(F)?"plant":null),ue.apply(this,e)};XMLHttpRequest.prototype.send=function(...e){return this._requestType&&this.addEventListener("load",function(){try{if(this.responseText){let t=JSON.parse(this.responseText);this._requestType==="energy"?V(t):this._requestType==="plant"&&z(t)}}catch(t){console.debug("XHR parse error",t)}}),pe.apply(this,e)};(()=>{let e="#e6e6e6",t="__axes_overlay",o="__axes_overlay_line";function n(i){if(!i||!(i instanceof Element))return;i.querySelectorAll(`.${t}`).forEach(_=>_.remove()),getComputedStyle(i).position==="static"&&(i.style.position="relative");let y=i.clientHeight||i.getBoundingClientRect().height,g=i.clientWidth||i.getBoundingClientRect().width;if(!y||!g)return;let b=document.createElement("div");b.className=t,Object.assign(b.style,{position:"absolute",inset:"0 0 0 0",pointerEvents:"none",zIndex:9999});let f=2,S=f,T=(y-f*2)/2,w=Math.round(S+T),O=Math.round(S+T*2);[S,w,O].forEach(_=>{let v=document.createElement("div");v.className=o,Object.assign(v.style,{position:"absolute",left:"0px",right:"0px",height:"0px",top:`${_}px`,borderTop:`1px dashed ${e}`,boxSizing:"border-box",pointerEvents:"none"}),b.appendChild(v)}),i.appendChild(b)}function a(){Array.from(document.querySelectorAll(".infoItemContentSide .echart")).concat(Array.from(document.querySelectorAll(".infoItemContentSide .echart"))).forEach(h=>n(h))}let c=null;function l(){clearTimeout(c),c=setTimeout(a,120)}let s=new MutationObserver(l);try{s.observe(document.body,{childList:!0,subtree:!0})}catch{}window.addEventListener("resize",l),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(a,50)):setTimeout(a,50)})();window.addEventListener("message",e=>{if(e.data?.source!=="foxesscloud-extension")return;let t=e.data;switch(t.type){case"SET_UNSTACKED":u.currentStackMode=t.value,I();break;case"SHOW_SANKEY":R(t.value);break;case"SHOW_SOLAR_GAUGE":N(t.value);break;case"SHOW_SOLAR_CAPACITY":G(t.value);break;case"SHOW_SOLAR_PERCENT_LABEL":$(t.value);break;case"SHOW_SOLAR_HISTORY":B(t.value);break;default:console.warn("Unknown message type:",t.type)}});function U(){A(0),Y()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",U):U();})();
