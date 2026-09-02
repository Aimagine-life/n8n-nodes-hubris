// Requires a running `npm run dev` (local n8n on :5678). Creates a throwaway owner account.
const BASE='http://localhost:5678'; let cookie='';
async function api(m,p,b){const r=await fetch(BASE+p,{method:m,headers:{'Content-Type':'application/json',cookie,'browser-id':'smoke'},body:b?JSON.stringify(b):undefined});const s=r.headers.get('set-cookie');if(s)cookie=s.split(';')[0];return {status:r.status,json:await r.json().catch(()=>null)};}
function unflat(str){const arr=JSON.parse(str);const seen=new Map();const rev=(i)=>{const v=arr[i];if(typeof v!=='object'||v===null)return v;if(seen.has(i))return seen.get(i);const out=Array.isArray(v)?[]:{};seen.set(i,out);for(const [k,val] of Object.entries(v))out[k]=typeof val==='string'?rev(Number(val)):val;return out;};return rev(0);}
await api('POST','/rest/login',{emailOrLdapLoginId:'smoke@example.com',password:'SmokeTest12345'});
const wfId=process.argv[2];
const wf=(await api('GET',`/rest/workflows/${wfId}`)).json.data;
for(let attempt=1;attempt<=4;attempt++){
  const r=await api('POST',`/rest/workflows/${wfId}/run`,{workflowData:wf,startNodes:[{name:'Start',sourceData:null}],triggerToStartFrom:{name:'Start'}});
  const execId=r.json?.data?.executionId; let e; if(!execId){console.log('run failed',r.status,JSON.stringify(r.json).slice(0,300));continue;}
  for(let i=0;i<80;i++){await new Promise(res=>setTimeout(res,3000));e=(await api('GET',`/rest/executions/${execId}?unflattedResponse=true`)).json?.data;if(e&&!['running','new','waiting'].includes(e.status))break;}
  const rd=(typeof e.data==='string'?unflat(e.data):e.data).resultData;
  console.log(`attempt ${attempt}: ${e.status} lastNode=${rd.lastNodeExecuted} ${rd.error?.message??''}`);
  for(const [n,runs] of Object.entries(rd.runData??{})){const f=runs[runs.length-1];const out=f?.data?.main?.[0]?.[0];console.log(`   ${n}: ${f.executionStatus}${f.error?' '+f.error.message:''} json=${JSON.stringify(out?.json??{}).slice(0,150)} binary=${out?.binary?Object.entries(out.binary).map(([k,b])=>k+':'+b.mimeType+':'+b.fileSize).join(','):'-'}`)}
  if(e.status==='success')break;
}
