// Requires a running `npm run dev` (local n8n on :5678). Creates a throwaway owner account.
const BASE='http://localhost:5678'; let cookie='';
async function api(m,p,b){const r=await fetch(BASE+p,{method:m,headers:{'Content-Type':'application/json',cookie,'browser-id':'smoke'},body:b?JSON.stringify(b):undefined});const s=r.headers.get('set-cookie');if(s)cookie=s.split(';')[0];return {status:r.status,json:await r.json().catch(()=>null)};}
function unflat(str){const arr=JSON.parse(str);const seen=new Map();const rev=(i)=>{const v=arr[i];if(typeof v!=='object'||v===null)return v;if(seen.has(i))return seen.get(i);const out=Array.isArray(v)?[]:{};seen.set(i,out);for(const [k,val] of Object.entries(v))out[k]=typeof val==='string'?rev(Number(val)):val;return out;};return rev(0);}
await api('POST','/rest/login',{emailOrLdapLoginId:'smoke@example.com',password:'SmokeTest12345'});
const creds=(await api('GET','/rest/credentials')).json.data; const cred=creds.find(c=>c.type==='hubrisApi'); const credRef={hubrisApi:{id:cred.id,name:cred.name}};
const agentVersions=(await api('GET','/types/nodes.json')).json.filter(n=>n.name==='@n8n/n8n-nodes-langchain.agent').map(n=>n.version); const agentV=Math.max(...agentVersions.flat()); console.log('agent versions',JSON.stringify(agentVersions),'use',agentV);
const nodes=[
 {parameters:{},name:'Start',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,0]},
 {parameters:{promptType:'define',text:'What is 17*3? Answer with the number only.',options:{}},name:'Agent',type:'@n8n/n8n-nodes-langchain.agent',typeVersion:agentV,position:[300,0]},
 {parameters:{model:{__rl:true,mode:'id',value:'anthropic/claude-haiku-4.5'},options:{maxTokens:50,timeout:60000,maxRetries:2}},name:'Hubris Chat Model',type:'CUSTOM.lmChatHubris',typeVersion:1,position:[300,200],credentials:credRef},
 {parameters:{resource:'audio',operation:'speech',model:{__rl:true,mode:'id',value:'microsoft/mai-voice-2-flash'},input:'={{ "The answer is " + $json.output }}',voice:'en-US-Harper:MAI-Voice-2',options:{}},name:'Speech',type:'CUSTOM.hubris',typeVersion:1,position:[600,0],credentials:credRef,retryOnFail:true,maxTries:3,waitBetweenTries:3000},
 {parameters:{resource:'audio',operation:'transcribe',model:{__rl:true,mode:'id',value:'openai/whisper-1'},binaryPropertyName:'data',options:{language:'en'}},name:'Transcribe',type:'CUSTOM.hubris',typeVersion:1,position:[900,0],credentials:credRef,retryOnFail:true,maxTries:3,waitBetweenTries:3000},
 {parameters:{resource:'embeddings',operation:'embed',model:{__rl:true,mode:'id',value:'openai/text-embedding-3-small'},input:'={{ $json.text }}',options:{dimensions:16}},name:'Embed',type:'CUSTOM.hubris',typeVersion:1,position:[1200,0],credentials:credRef,retryOnFail:true,maxTries:3,waitBetweenTries:3000},
];
const connections={
 Start:{main:[[{node:'Agent',type:'main',index:0}]]},
 'Hubris Chat Model':{ai_languageModel:[[{node:'Agent',type:'ai_languageModel',index:0}]]},
 Agent:{main:[[{node:'Speech',type:'main',index:0}]]},
 Speech:{main:[[{node:'Transcribe',type:'main',index:0}]]},
 Transcribe:{main:[[{node:'Embed',type:'main',index:0}]]},
};
const wf=(await api('POST','/rest/workflows',{name:'Hubris agent smoke',nodes,connections,settings:{executionOrder:'v1'},active:false})).json.data; console.log('workflow',wf?.id);
for(let attempt=1;attempt<=4;attempt++){
  const r=await api('POST',`/rest/workflows/${wf.id}/run`,{workflowData:wf,startNodes:[{name:'Start',sourceData:null}],triggerToStartFrom:{name:'Start'}});
  const execId=r.json?.data?.executionId; if(!execId){console.log('run failed',r.status,JSON.stringify(r.json).slice(0,300));continue;}
  let e; for(let i=0;i<80;i++){await new Promise(res=>setTimeout(res,3000));e=(await api('GET',`/rest/executions/${execId}?unflattedResponse=true`)).json?.data;if(e&&!['running','new','waiting'].includes(e.status))break;}
  const rd=(typeof e.data==='string'?unflat(e.data):e.data).resultData;
  console.log(`attempt ${attempt}: ${e.status} lastNode=${rd.lastNodeExecuted} ${rd.error?.message??''}`);
  for(const [n,runs] of Object.entries(rd.runData??{})){const f=runs[runs.length-1];const out=f?.data?.main?.[0]?.[0]??f?.data?.ai_languageModel?.[0]?.[0];console.log(`   ${n}: ${f.executionStatus}${f.error?' '+f.error.message:''} json=${JSON.stringify(out?.json??{}).slice(0,160)} binary=${out?.binary?Object.entries(out.binary).map(([k,b])=>k+':'+b.mimeType+':'+b.fileSize).join(','):'-'}`)}
  if(e.status==='success')break;
}
