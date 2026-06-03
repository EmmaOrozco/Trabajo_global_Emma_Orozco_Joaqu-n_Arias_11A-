
function syncSliderAndInput(sliderId,inputId){

    const s=document.getElementById(sliderId);
    const i=document.getElementById(inputId);

    if(!s || !i) return;

    s.addEventListener('input',()=>{
        i.value=s.value;
        manualCalc();
    });

    i.addEventListener('input',()=>{
        s.value=i.value;
        manualCalc();
    });
}

function erf(x){const s=x<0?-1:1;x=Math.abs(x);const a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911;const t=1/(1+p*x);const y=1-(((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x));return s*y}
const cdf=x=>0.5*(1+erf(x/Math.sqrt(2)));
const critical={0.01:2.576,0.05:1.96,0.10:1.645};

document.addEventListener('DOMContentLoaded',()=>{

syncSliderAndInput('mu0Slider','mu0');
syncSliderAndInput('xbarSlider','xbar');
syncSliderAndInput('sdSlider','sd');
syncSliderAndInput('nSlider','n');

syncSliderAndInput('p0Slider','p0');
syncSliderAndInput('phatSlider','phat');
syncSliderAndInput('pnSlider','pn');

testType.onchange=()=>{
meanInputs.style.display=testType.value==='mean'?'block':'none';
propInputs.style.display=testType.value==='prop'?'block':'none';
};
calcBtn.onclick=manualCalc;
csvFile.onchange=loadCSV;
manualCalc();
});

function pval(z,t){
if(t==='left') return cdf(z);
if(t==='right') return 1-cdf(z);
return 2*(1-cdf(Math.abs(z)));
}

function manualCalc(){
let z;
if(testType.value==='mean'){
z=(+xbar.value-+mu0.value)/(+sd.value/Math.sqrt(+n.value));
}else{
z=(+phat.value-+p0.value)/Math.sqrt((+p0.value*(1-+p0.value))/(+pn.value));
}
showResults(z,'results');
draw(z);
}

function showResults(z,target){
const a=+alpha.value,p=pval(z,tail.value);
document.getElementById(target).innerHTML=`
<h3>Results</h3>
<p><b>Z Statistic:</b> ${z.toFixed(4)}</p>
<p><b>P Value:</b> ${p.toFixed(6)}</p>
<p><b>Critical Value:</b> ±${critical[a]}</p>
<p><b>Decision:</b> ${p<a?'Reject H₀':'Fail to Reject H₀'}</p>
<p><b>Type I Error:</b> Rejecting a true H₀</p>
<p><b>Type II Error:</b> Failing to reject a false H₀</p>`;
}

function draw(z){
const c=graph,ctx=c.getContext('2d');
ctx.clearRect(0,0,c.width,c.height);
ctx.beginPath();
for(let x=-4;x<=4;x+=0.01){
const y=Math.exp(-(x*x)/2);
const px=(x+4)/8*c.width;
const py=280-y*200;
if(x===-4)ctx.moveTo(px,py); else ctx.lineTo(px,py);
}
ctx.strokeStyle='#ff4fa3';ctx.lineWidth=3;ctx.stroke();
const zx=(z+4)/8*c.width;
ctx.beginPath();ctx.moveTo(zx,30);ctx.lineTo(zx,280);ctx.strokeStyle='red';ctx.stroke();
}

function loadCSV(e){
Papa.parse(e.target.files[0],{
header:true,dynamicTyping:true,
complete:r=>{
window.dataRows=r.data;
const cols=Object.keys(r.data[0]||{});
csvControls.innerHTML=`
<select id="groupCol">${cols.map(c=>`<option>${c}</option>`).join('')}</select>
<select id="valueCol">${cols.map(c=>`<option>${c}</option>`).join('')}</select>
<button onclick="analyzeCSV()">Analyze CSV</button>`;
}
});
}

function analyzeCSV(){
const g=groupCol.value,v=valueCol.value;
const groups={};
dataRows.forEach(r=>{

    if(
        r[g] == null ||
        r[v] == null ||
        r[v] === '' ||
        r[v] === 'NA' ||
        isNaN(Number(r[v]))
    ){
        return;
    }

    (groups[r[g]] ??= []).push(Number(r[v]));
});
const names=Object.keys(groups);
if(names.length<2){csvResults.innerHTML='Need at least two groups';return;}
const a=groups[names[0]],b=groups[names[1]];
if(a.length < 2 || b.length < 2){
    csvResults.innerHTML =
        'Each group must contain at least 2 observations.';
    return;
}
const ma=a.reduce((s,x)=>s+x,0)/a.length;
const mb=b.reduce((s,x)=>s+x,0)/b.length;
const sda=Math.sqrt(a.reduce((s,x)=>s+(x-ma)**2,0)/(a.length-1));
const sdb=Math.sqrt(b.reduce((s,x)=>s+(x-mb)**2,0)/(b.length-1));
const z=(mb-ma)/Math.sqrt((sda*sda/a.length)+(sdb*sdb/b.length));
const p=2*(1-cdf(Math.abs(z)));
csvResults.innerHTML=`
<table><tr><th>Group</th><th>N</th><th>Mean</th><th>SD</th></tr>
<tr><td>${names[0]}</td><td>${a.length}</td><td>${ma.toFixed(2)}</td><td>${sda.toFixed(2)}</td></tr>
<tr><td>${names[1]}</td><td>${b.length}</td><td>${mb.toFixed(2)}</td><td>${sdb.toFixed(2)}</td></tr></table>
<p><b>Z:</b> ${z.toFixed(4)}</p>
<p><b>P:</b> ${p.toFixed(6)}</p>
<p><b>Decision:</b> ${p<0.05?'Reject H₀':'Fail to Reject H₀'}</p>`;
draw(z);
}
