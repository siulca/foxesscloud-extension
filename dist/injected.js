(()=>{var K={_currentStackMode:!0,_showSankey:!1,_lastApplyTime:0,_applyTimeout:null,_originalDataCache:new Map,get currentStackMode(){return this._currentStackMode},set currentStackMode(e){this._currentStackMode=e},get showSankey(){return this._showSankey},set showSankey(e){this._showSankey=e},get lastApplyTime(){return this._lastApplyTime},set lastApplyTime(e){this._lastApplyTime=e},get applyTimeout(){return this._applyTimeout},set applyTimeout(e){this._applyTimeout=e},get originalDataCache(){return this._originalDataCache}},u=K;function O(e){u.showSankey=!!e;let t=document.getElementById("foxesscloud-sankey-container"),o=document.querySelector(".eenery_stat_r");t&&(t.style.display=u.showSankey?"block":"none",o.style.display=u.showSankey?"none":"block")}function R(e){let t=document.querySelector(".eenery_stat_r"),o=document.getElementById("foxesscloud-sankey-container");if(!o){if(!t)return;o=document.createElement("div"),o.id="foxesscloud-sankey-container",o.style.width="30%",o.style.margin="0",t.parentNode.insertBefore(o,t),t.style.display=u.showSankey?"block":"none"}function n(r,g){if(!r||isNaN(parseFloat(r)))return 0;let d=parseFloat(r);return g?.toUpperCase()==="MWH"?d*1e3:d}let a=n(e.production?.selfConsumption?.generation,e.production?.selfConsumption?.unit),c=n(e.production?.gridExport?.generation,e.production?.gridExport?.unit),l=n(e.production?.disCharge?.generation,e.production?.disCharge?.unit),s=n(e.consumption?.gridImport?.generation,e.consumption?.gridImport?.unit),i=n(e.consumption?.consumption?.generation,e.consumption?.consumption?.unit),h=n(e.consumption?.charge?.generation,e.consumption?.charge?.unit),p="kWh",y=(a||0)+(c||0),m={Imported:s,Solar:y,Discharged:l,Exported:c,Consumed:i,Charged:h},b={Imported:{color:"rgb(198, 158, 255)",labelBg:"rgb(213, 183, 255)"},Solar:{color:"rgb(8, 151, 156)",labelBg:"rgb(4, 171, 177)"},Discharged:{color:"rgb(105, 177, 255)",labelBg:"rgb(149, 200, 255)"},Exported:{color:"rgb(130, 27, 121)",labelBg:"rgb(178, 24, 165)"},Consumed:{color:"rgb(250, 140, 22)",labelBg:"rgb(255, 163, 24)"},Charged:{color:"rgb(235, 47, 150)",labelBg:"rgb(218, 3, 121)"}},f=[];a>0&&f.push({source:"Solar",target:"Consumed",value:a}),c>0&&f.push({source:"Solar",target:"Exported",value:c}),h>0&&f.push({source:"Solar",target:"Charged",value:h}),s>0&&f.push({source:"Imported",target:"Consumed",value:s}),l>0&&f.push({source:"Discharged",target:"Consumed",value:l});let w={};f.forEach(r=>{w[r.target]=(w[r.target]||0)+r.value}),f.forEach(r=>{let g=m[r.target],d=w[r.target]||0;if(g>0&&d>0){let x=g/d;r.value=r.value*x}});let T=new Set;f.forEach(r=>{T.add(r.source),T.add(r.target)});let S={};f.forEach(r=>{S[r.source]=(S[r.source]||0)+r.value,S[r.target]=(S[r.target]||0)+r.value});let k=Object.values(m).reduce((r,g)=>r+g,0)||1,_=(m.Imported||0)+(m.Solar||0)+(m.Discharged||0)||1,v=(m.Consumed||0)+(m.Exported||0)+(m.Charged||0)||1,F=Array.from(T).map(r=>({name:r,itemStyle:{color:b[r].color,shadowColor:"rgba(0,0,0,0.25)",shadowBlur:10},label:{backgroundColor:b[r].labelBg,width:70,show:!0,position:"insideTopLeft",fontWeight:"bold",color:"inherit",padding:5,shadowColor:"rgba(0,0,0,0.25)",shadowBlur:10,shadowOffsetY:2,borderRadius:2,borderWidth:1,borderColor:"rgba(0,0,0,0.25)",formatter:function(g){let d=m[g.name]||0;return d>0?`${g.name}
${d.toFixed(2)} ${p}`:g.name}}}));function z(r){if(window.echarts?.init)return r(window.echarts);let g=document.createElement("script");g.src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js",g.onload=()=>r(window.echarts),document.head.appendChild(g)}z(r=>{let g={tooltip:{trigger:"item",formatter:function(d){if(d.dataType==="edge"){let j=S[d.data.source]||1,X=(d.data.value/j*100).toFixed(1);return`${d.data.source} \u2192 ${d.data.target}<br/>${d.data.value.toFixed(2)} ${p} (${X}%)`}let x=m[d.name]||0,V=["Imported","Solar","Discharged"].includes(d.name)?_:v,U=(x/Math.max(V,1)*100).toFixed(1);return`${d.name}<br/>${x.toFixed(2)} ${p} (${U}%)`}},series:[{type:"sankey",top:0,right:0,left:0,bottom:40,nodeWidth:90,nodeGap:16,layoutIterations:32,orient:"horizontal",nodeAlign:"justify",data:F,links:f,emphasis:{focus:"adjacency"},lineStyle:{color:"gradient",curveness:.5,opacity:.5}}]};if(o.__sankeyChart)o.__sankeyChart.setOption(g,!0);else{let d=r.init(o);o.__sankeyChart=d,d.setOption(g)}})}var M="rgb(0,205,212)",E=[];function J(e=0){let t=document.getElementById("solar-percent-marker"),o=document.getElementById("vertical-progress-bar");if(!t||!o)return;let n=Math.max(0,Math.min(100,Number(e)||0));t.innerHTML=`<b>${n.toFixed(1)}</b> %`;let a=o.getBoundingClientRect();t.style.top=`${100-n}%`}function N(){let e=document.getElementById("vertical-progress-bar");if(!e)return;let t=document.getElementById("solar-history-wrapper");if(t)return;t=document.createElement("div"),t.id="solar-history-wrapper",t.style.cssText=`
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
    `,t.appendChild(o),e.appendChild(t)}function Q(){let e=document.getElementById("solar-history-svg");if(!e)return;let t=E.slice(-12);if(t.length<2){e.innerHTML="";return}let n=110-(t.length-1)*10,a=t.map((h,p)=>{let y=n+p*10,m=80-h/100*80;return`${y},${m}`}).join(" "),c=t[t.length-1],l=n+(t.length-1)*10,s=80-c/100*80,i=`${l+6},${s} ${l-1},${s-4} ${l-1},${s+4}`;e.innerHTML=`
      <polyline
        points="${a}"
        fill="none"
        stroke="${M}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polygon
        points="${i}"
        fill="${M}"
      />
    `}function Z(e){let t=Math.max(0,Math.min(100,Number(e)||0));E.push(t),E.length>12&&E.shift(),Q()}function ee(){let e=document.getElementById("solar-gauge-label");if(!e)return;let t=Number(window.pvCapacity??0),o=`${Number.isFinite(t)?t.toFixed(1):"0.0"} kW`;e.innerHTML=o}function H(e=0){let t=document.querySelector(".fl_tips2");if(!t)return console.warn("[ProgressBar] .fl_tips2 not found"),null;let o=document.getElementById("vertical-progress-bar");if(!o){o=document.createElement("div"),o.id="vertical-progress-bar",o.style.cssText=`
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
      `,o.appendChild(c),o.appendChild(l),o.appendChild(s),t.appendChild(o),N();let i=document.querySelector(".tip_common.tip_solar");i?i.appendChild(a):t.appendChild(a)}N();let n=document.getElementById("progress-fill");if(n){let a=Math.max(0,Math.min(100,e));n.style.height=`${a}%`}return J(e),Z(e),ee(),o}function C(e,t="W",o=window.pvCapacity){let n=parseFloat(e)||0,a=t==="W"?n/1e3:n,c=Number(o)||1,l=c>0?a/c*100:0;return window.__foxessSolarState={value:e,unit:t},H(l),l}function G(e){let t=document.getElementById("vertical-progress-bar"),o=document.getElementById("solar-gauge-label"),n=e?"":"none";t&&(t.style.display=n),o&&(o.style.display=n)}function $(){let e=null,t=null,o=window.WebSocket;window.WebSocket=function(n,a){let c=new o(n,a);return n&&n.includes("/dew/v0/wsmaitian")&&(e&&t&&e.removeEventListener("message",t),t=function(l){try{let s=JSON.parse(l.data);if(s.errno===0&&s.result?.node?.solar?.power?.value){let i=s.result.node.solar.power;C(i.value,i.unit)}}catch{}},c.addEventListener("message",t),e=c,c.addEventListener("close",()=>{e===c&&(e=null,t=null)})),c}}function A(e,t){if(!e)return;let o=Date.now();if(o-u.lastApplyTime<300)return;u.lastApplyTime=o;let n=e.getOption();if(!n?.series)return;let a=e.id||`chart_${Math.random().toString(36).substr(2,9)}`;if(!u.originalDataCache.has(a)){let s=n.series.map(i=>Array.isArray(i.data)?i.data.map(h=>Array.isArray(h)?[...h]:h):i.data);u.originalDataCache.set(a,s)}let c=u.originalDataCache.get(a),l=!1;if(n.series.forEach((s,i)=>{if(!Array.isArray(s.data))return;let h=c?.[i];if(h&&(s.data=s.data.map((p,y)=>{if(Array.isArray(p)&&p.length>=2){let m=h[y],b=Array.isArray(m)?parseFloat(m[1]):NaN;if(!isNaN(b)){let f=t?b:Math.abs(b);p[1]!==f&&(p[1]=f,l=!0)}}return p}),s.type==="bar")){let p=t?"customStack":null,y=t?"20%":"35%";(s.stack!==p||s.barGap!==y)&&(s.stack=p,s.barGap=y,l=!0)}}),n.yAxis?.[0]){let s=t?void 0:0;n.yAxis[0].min!==s&&(n.yAxis[0].min=s,l=!0)}l&&(e.setOption(n,{notMerge:!0,replaceMerge:["series","yAxis"]}),e.resize())}function I(){let e=document.querySelectorAll(".echart");if(e.length===0){console.warn("\u26A0\uFE0F No .echart elements found on page!");return}e.forEach(t=>{let o=window.echarts?.getInstanceByDom(t);o&&A(o,u.currentStackMode)})}function L(e){!e||e.__foxessHooked||(e.__foxessHooked=!0,e.on("rendered",()=>{setTimeout(()=>{A(e,u.currentStackMode)},500)}))}var te=new MutationObserver(()=>{u.applyTimeout&&clearTimeout(u.applyTimeout),u.applyTimeout=setTimeout(()=>{I(),document.querySelectorAll(".echart").forEach(e=>{let t=window.echarts?.getInstanceByDom(e);t&&L(t)})},250)});function P(){document.querySelectorAll(".echart").forEach(e=>{e.dataset.observed||(te.observe(e,{childList:!0,subtree:!0}),e.dataset.observed="true")})}var oe=new MutationObserver(()=>{P()});oe.observe(document.body,{childList:!0,subtree:!0});setTimeout(()=>{P(),document.querySelectorAll(".echart").forEach(e=>{let t=window.echarts?.getInstanceByDom(e);t&&L(t)}),I()},1500);var B="/dew/w/plant/energy/info",Y="/dew/v0/plant/detail";function W(e){e?.result?.production&&e?.result?.consumption&&R(e.result)}function D(e){e?.result?.info?.pvCapacity&&(window.pvCapacity=e.result.info.pvCapacity,window.plantID=e.result.plantID,window.__foxessSolarState?.value&&C(window.__foxessSolarState.value,window.__foxessSolarState.unit,window.pvCapacity))}var ne=window.fetch;window.fetch=async function(...e){let t=await ne.apply(this,e);try{let o=typeof e[0]=="string"?e[0]:e[0]?.url||"",a=await t.clone().json().catch(()=>null);if(!a)return t;o.includes(B)?W(a):o.includes(Y)&&D(a)}catch(o){console.debug("Fetch interceptor error (non-fatal)",o)}return t};var re=XMLHttpRequest.prototype.open,se=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(...e){let t=e[1];return typeof t=="string"&&(this._requestType=t.includes(B)?"energy":t.includes(Y)?"plant":null),re.apply(this,e)};XMLHttpRequest.prototype.send=function(...e){return this._requestType&&this.addEventListener("load",function(){try{if(this.responseText){let t=JSON.parse(this.responseText);this._requestType==="energy"?W(t):this._requestType==="plant"&&D(t)}}catch(t){console.debug("XHR parse error",t)}}),se.apply(this,e)};(()=>{let e="#e6e6e6",t="__axes_overlay",o="__axes_overlay_line";function n(i){if(!i||!(i instanceof Element))return;i.querySelectorAll(`.${t}`).forEach(_=>_.remove()),getComputedStyle(i).position==="static"&&(i.style.position="relative");let y=i.clientHeight||i.getBoundingClientRect().height,m=i.clientWidth||i.getBoundingClientRect().width;if(!y||!m)return;let b=document.createElement("div");b.className=t,Object.assign(b.style,{position:"absolute",inset:"0 0 0 0",pointerEvents:"none",zIndex:9999});let f=2,w=f,T=(y-f*2)/2,S=Math.round(w+T),k=Math.round(w+T*2);[w,S,k].forEach(_=>{let v=document.createElement("div");v.className=o,Object.assign(v.style,{position:"absolute",left:"0px",right:"0px",height:"0px",top:`${_}px`,borderTop:`1px dashed ${e}`,boxSizing:"border-box",pointerEvents:"none"}),b.appendChild(v)}),i.appendChild(b)}function a(){Array.from(document.querySelectorAll(".echart")).concat(Array.from(document.querySelectorAll(".infoItemContentSide .echart"))).forEach(h=>n(h))}let c=null;function l(){clearTimeout(c),c=setTimeout(a,120)}let s=new MutationObserver(l);try{s.observe(document.body,{childList:!0,subtree:!0})}catch{}window.addEventListener("resize",l),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(a,50)):setTimeout(a,50)})();window.addEventListener("message",e=>{if(e.data?.source!=="foxesscloud-extension")return;let t=e.data;switch(t.type){case"SET_UNSTACKED":u.currentStackMode=t.value,I();break;case"SHOW_SANKEY":O(t.value);break;case"SHOW_SOLAR_GAUGE":G(t.value);break;default:console.warn("Unknown message type:",t.type)}});function q(){H(0),$()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",q):q();})();
