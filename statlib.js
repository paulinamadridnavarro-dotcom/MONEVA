// Motor estadístico de Moneva. Sin dependencias.
// Convenciones: s = desviación estándar muestral (n − 1); cuantiles con el método 7 (Excel PERCENTIL.INC, R type 7, NumPy por defecto).
const St={
sum:a=>a.reduce((s,x)=>s+x,0),
mean:a=>a.length?St.sum(a)/a.length:NaN,
sorted:a=>a.slice().sort((x,y)=>x-y),
q(a,p){const s=St.sorted(a),h=(s.length-1)*p,lo=Math.floor(h),hi=Math.ceil(h);return s[lo]+(h-lo)*(s[hi]-s[lo])},
median:a=>St.q(a,.5),
sd(a){const m=St.mean(a);return Math.sqrt(St.sum(a.map(x=>(x-m)**2))/(a.length-1))},
cv(a){return St.sd(a)/St.mean(a)},
// Asimetría de Fisher-Pearson ajustada (Excel COEFICIENTE.ASIMETRIA, SciPy bias=False)
skew(a){const n=a.length,m=St.mean(a),s=St.sd(a);return n/((n-1)*(n-2))*St.sum(a.map(x=>((x-m)/s)**3))},
mad(a){const me=St.median(a);return St.median(a.map(x=>Math.abs(x-me)))},
// Normal estándar
ncdf(z){const t=1/(1+.2316419*Math.abs(z)),d=.3989422804014327*Math.exp(-z*z/2),p=d*t*(.31938153+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return z>0?1-p:p},
ninv(p){// Algoritmo de Acklam (error relativo < 1.2e-9)
const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
const pl=.02425;let q,r;if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
q=p-.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)},
// Beta incompleta regularizada (fracción continua, Numerical Recipes)
lgamma(x){const g=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,.1208650973866179e-2,-.5395239384953e-5];let y=x,t=x+5.5;t-=(x+.5)*Math.log(t);let s=1.000000000190015;for(const v of g)s+=v/++y;return-t+Math.log(2.5066282746310005*s/x)},
betacf(a,b,x){let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap;if(Math.abs(d)<1e-30)d=1e-30;d=1/d;let h=d;
for(let m=1;m<=300;m++){const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;h*=d*c;
aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-14)break}return h},
ibeta(x,a,b){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(St.lgamma(a+b)-St.lgamma(a)-St.lgamma(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*St.betacf(a,b,x)/a:1-bt*St.betacf(b,a,1-x)/b},
// t de Student: p bilateral y valor crítico
tp2(t,df){return St.ibeta(df/(df+t*t),df/2,.5)},
tinv(p,df){// cuantil superior: P(T > t) = p
let lo=0,hi=1000;for(let i=0;i<200;i++){const m=(lo+hi)/2;if(St.tp2(m,df)/2>p)lo=m;else hi=m}return(lo+hi)/2},
// Regresión lineal simple por mínimos cuadrados
linreg(x,y){const n=x.length,mx=St.mean(x),my=St.mean(y),sxx=St.sum(x.map(v=>(v-mx)**2)),sxy=St.sum(x.map((v,i)=>(v-mx)*(y[i]-my))),syy=St.sum(y.map(v=>(v-my)**2));
const b=sxy/sxx,a=my-b*mx,sse=St.sum(y.map((v,i)=>(v-a-b*x[i])**2)),se=Math.sqrt(sse/(n-2)/sxx),t=b/se,r2=1-sse/syy;return{a,b,r2,se,t,df:n-2,p:St.tp2(t,n-2)}},
pearson(x,y){const mx=St.mean(x),my=St.mean(y),sxy=St.sum(x.map((v,i)=>(v-mx)*(y[i]-my))),sxx=St.sum(x.map(v=>(v-mx)**2)),syy=St.sum(y.map(v=>(v-my)**2));
const r=sxy/Math.sqrt(sxx*syy),n=x.length,t=Math.abs(r)>=1?Infinity:r*Math.sqrt((n-2)/(1-r*r));return{r,t,df:n-2,p:isFinite(t)?St.tp2(t,n-2):0}},
ranks(a){const idx=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]),r=new Array(a.length);for(let i=0;i<idx.length;){let j=i;while(j+1<idx.length&&idx[j+1][0]===idx[i][0])j++;const avg=(i+j)/2+1;for(let k=i;k<=j;k++)r[idx[k][1]]=avg;i=j+1}return r},
spearman(x,y){return St.pearson(St.ranks(x),St.ranks(y))},
rcrit(n,alpha=.05){const t=St.tinv(alpha/2,n-2);return t/Math.sqrt(t*t+n-2)},
welch(a,b){const ma=St.mean(a),mb=St.mean(b),va=St.sd(a)**2/a.length,vb=St.sd(b)**2/b.length,t=(mb-ma)/Math.sqrt(va+vb),df=(va+vb)**2/(va*va/(a.length-1)+vb*vb/(b.length-1));return{ma,mb,t,df,p:St.tp2(t,df)}},
// Generador reproducible (mulberry32) y normal por Box-Muller
rng(seed){let s=seed>>>0;const u=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};let spare=null;
return{u,n(){if(spare!==null){const v=spare;spare=null;return v}let x,y,r;do{x=2*u()-1;y=2*u()-1;r=x*x+y*y}while(r>=1||r===0);const f=Math.sqrt(-2*Math.log(r)/r);spare=y*f;return x*f}}}
};
