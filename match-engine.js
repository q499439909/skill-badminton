/* 所有选卡方式共用的回合与赛后结算。场上动作须由双方确认。 */
(function(root){
const copy=x=>JSON.parse(JSON.stringify(x));
const has=(m,t,id)=>m.cards[t].includes(id),key=(t,id)=>`${t}-${id}`;
const limit=id=>id===18?2:[19,22].includes(id)?3:1;
const used=(m,t,id)=>m.used[key(t,id)]||0;
function create(cards,opening=[0,0],targets={}){
 const m={cards:copy(cards),scores:opening.slice(),targets:copy(targets),used:{},phase:'playing',finished:false,swap:false,timingReached:false,regret:null,history:[],server:0,serveLocked:false,serves:[0,0],effects:{shared:[0,0],mirror:[0,0],squat:[false,false],line:[false,false],praise:[false,false]},prediction:null,roster:[['A1','A2'],['B1','B2']],log:[],passive:'',golden:false};
 for(let t=0;t<2;t++)for(const id of [2,5,11,13,23])if(has(m,t,id))m.used[key(t,id)]=1;
 return m;
}
function log(m,msg){m.log.push(msg);m.passive=msg;}
function snapshot(m){const r=copy(m);delete r.history;delete r.review;delete r.round;delete r.regret;return r;}
function restore(m,before){const history=m.history;for(const k of Object.keys(m))delete m[k];Object.assign(m,copy(before),{history,regret:null});}
function activation(m,t,id){
 if(!has(m,t,id))return '未持有这张技能';
 if(m.finished||m.phase!=='playing'||m.review)return '请先完成当前回合或结算';
 if(m.golden)return '金球期间不再发动新技能';
 if(used(m,t,id)>=limit(id))return '技能次数已用完';
 if(![15,16,18,20,21,22].includes(id))return '等待对应触发时机';
 if(m.serveLocked&&id!==20)return '当前回合已开始，请等待下一回合';
 if(id===15&&m.scores[t]<=m.scores[1-t])return '仅我方领先时可发动';
 if(!m.manualCourt&&[18,21,22].includes(id)&&m.server!==t)return '仅我方发球前可发动';
 if(id===18&&m.prediction)return '当前回合已有预言';
 return '';
}
function activate(m,t,id,options={}){
 const error=activation(m,t,id);if(error)return error;
 if(id===18&&!String(options.prediction||'').trim())return '请先填写预言';
 m.used[key(t,id)]=used(m,t,id)+1;
 if(id===15)m.effects.praise[t]=true;
 if(id===16)m.effects.squat[t]=true;
 if(id===18)m.prediction={team:t,text:options.prediction};
 if(id===20)m.effects.shared[t]=3;
 if(id===21)m.effects.mirror[t]=5;
 if(id===22)m.effects.line[t]=true;
 log(m,`${t===0?'A':'B'}队技能已发动`);return '';
}
function deltas(m,r){
 const shared=m.effects.shared.some(x=>x>0),base=shared?[1,1]:[0,0];
 if(!shared)base[r.winner]=has(m,r.winner,2)?2:1;
 if(r.golden)return [r.winner===0?1:0,r.winner===1?1:0];
 if(m.prediction&&r.options.predictionSuccess)base[m.prediction.team]++;
 return base.map((n,t)=>has(m,t,25)&&m.scores[t]-m.scores[1-t]>=3?0:n);
}
function checkClaps(m){
 const r=m.round,approved=r.options.clappedTeams||[];
 if(r.options.clapped===true&&!approved.includes(r.winner))approved.push(r.winner);
 r.options.clappedTeams=approved;
 const need=[0,1].filter(t=>has(m,t,8)&&deltas(m,r)[t]>0&&!approved.includes(t));
 if(need.length){m.clapTeam=need[0];m.phase='clap';return;}
 commitRally(m);
}
function beginRally(m,t,options={}){
 if(m.finished||!['playing','golden'].includes(m.phase)||m.review)return '请先完成当前结算';
 if(![0,1].includes(t))return '队伍无效';
 m.serveLocked=true;m.round={winner:t,options:copy(options),golden:m.golden};
 if(has(m,t,8)&&options.clapped===false){cancelRound(m);return '';}
 if(m.prediction&&options.predictionSuccess===undefined){m.phase='prediction';return '';}
 checkClaps(m);return '';
}
function cancelRound(m){m.phase=m.golden?'golden':'playing';m.round=null;m.serveLocked=false;log(m,'未击掌，此分无效，重新打本回合');}
function confirmRound(m,value){
 if(!m.round)return;
 if(m.phase==='clap'){
  if(!value){cancelRound(m);return;}
  m.round.options.clappedTeams.push(m.clapTeam);checkClaps(m);
 }else if(m.phase==='prediction'){m.round.options.predictionSuccess=Boolean(value);checkClaps(m);}
}
function commitRally(m){
 const r=m.round,before=snapshot(m);before.phase=r.golden?'golden':'playing';before.serveLocked=false;const w=r.winner;
 const gains=deltas(m,r);
 for(let t=0;t<2;t++){
  m.scores[t]=Math.min(30,m.scores[t]+gains[t]);
  m.effects.shared[t]=Math.max(0,m.effects.shared[t]-1);m.effects.mirror[t]=Math.max(0,m.effects.mirror[t]-1);
  m.effects.squat[t]=false;m.effects.line[t]=false;
 }
 m.serves[before.server]++;m.server=w;m.serveLocked=false;m.prediction=null;m.round=null;m.phase=r.golden?'golden':'playing';
 const eligible17=[0,1].filter(t=>has(m,t,17)&&!used(m,t,17)&&m.scores[1-t]>before.scores[1-t]);
 const eligible19=!r.golden&&(r.options.out||m.manualCourt)&&!r.options.reviewed19&&has(m,1-w,19)&&used(m,1-w,19)<3?[1-w]:[];
 m.history.push(before);
 m.review={before,winner:w,options:r.options,golden:r.golden,count:3,eligible17,eligible19};
 if(eligible17.length||eligible19.length){m.phase='review';m.regret=eligible17.length?{team:eligible17[0],count:3}:null;}
 else expireReview(m);
}
function undo(m,t){
 if(m.phase!=='review'||!m.review.eligible17.includes(t))return '当前不能使用后悔药';
 const b=m.review.before;restore(m,b);m.used[key(t,17)]=used(m,t,17)+1;m.phase=m.golden?'golden':'playing';m.serveLocked=false;log(m,'后悔药已撤销整个回合，重新发球');return '';
}
function boundary(m,t){
 if(m.phase!=='review'||!m.review.eligible19.includes(t))return '当前没有我方出界的改判窗口';
 const r=copy(m.review);restore(m,r.before);m.used[key(t,19)]=used(m,t,19)+1;
 m.phase=m.golden?'golden':'playing';beginRally(m,t,{...r.options,out:false,reviewed19:true,clapped:has(m,t,8)?undefined:true,predictionSuccess:r.options.predictionSuccess});return '';
}
function tick(m){if(m.phase!=='review')return;m.review.count--;if(m.regret)m.regret.count=m.review.count;if(m.review.count<=0)expireReview(m);}
function expireReview(m){
 const r=m.review;m.review=null;m.regret=null;if(!r)return;
 if(r.golden){finalize(m,r.winner,'金球加赛 · 一球定胜负');return;}
 m.phase='playing';settle(m);
}
function settle(m){
 if(m.finished||m.review||m.golden||m.phase!=='playing')return;
 if(!m.timingReached&&m.scores.some(s=>s>=15)){
  m.timingReached=true;
  if(m.cards.some(c=>c.includes(12))){m.scores.reverse();m.swap=true;for(let t=0;t<2;t++)if(has(m,t,12))m.used[key(t,12)]=1;log(m,'分数交换生效，同一节点仅交换一次');}
  m.timingQueue=[];for(let t=0;t<2;t++)for(const id of [4,6])if(has(m,t,id)&&!used(m,t,id))m.timingQueue.push({team:t,id});
  if(m.timingQueue.length&&m.manualCourt){
   const reminders=m.timingQueue.map(task=>{m.used[key(task.team,task.id)]=1;return `${task.team===0?'A':'B'}队「${task.id===4?'3V1':'临时换队友'}」已触发，请在场上调整人员`;});
   if(m.swap)reminders.unshift('分数交换已生效');log(m,reminders.join('；'));m.timingQueue=[];
  }else if(m.timingQueue.length){m.phase='timing';return;}
 }
 let winner=null,reason='';
 if(m.scores[0]===20&&m.scores[1]===20){const owners=[0,1].filter(t=>has(m,t,14));if(owners.length===1){winner=owners[0];m.used[key(winner,14)]=1;reason='平分秋色触发 · 20:20直接获胜';}}
 if(winner===null){for(let t=0;t<2;t++)if(m.scores[t]>=21&&(m.scores[t]-m.scores[1-t]>=2||m.scores[t]===30&&m.scores[t]>m.scores[1-t])){winner=t;reason='达到本局获胜条件';break;}}
 if(winner!==null){end(m,winner,reason);return;}
 if(m.scores[0]===30&&m.scores[1]===30){m.golden=true;m.phase='golden';m.goldenBase=m.scores.slice();log(m,'双方同时封顶，进入一球决胜');}
}
function timing(m,accept,own,opponent){
 if(m.phase!=='timing')return '当前没有人员变更';const task=m.timingQueue[0],t=task.team;
 if(accept){
  if(!m.roster[1-t].includes(opponent))return '请选择对方场上队员';
  if(task.id===6&&!m.roster[t].includes(own))return '请选择我方场上队员';
  m.roster[1-t]=m.roster[1-t].filter(p=>p!==opponent);
  if(task.id===6){m.roster[t]=m.roster[t].filter(p=>p!==own);m.roster[1-t].push(own);}
  m.roster[t].push(opponent);m.used[key(t,task.id)]=1;
 }else m.used[key(t,task.id)]=1;
 m.timingQueue.shift();if(!m.timingQueue.length){m.phase='playing';settle(m);}return '';
}
function end(m,winner,reason='双方确认提前结算'){
 if(m.finished||m.review)return '请先完成当前结算';
 if(!['playing','golden'].includes(m.phase))return '请先处理当前回合或技能';
 if(m.golden){finalize(m,winner,'金球加赛 · 一球定胜负');return '';}
 let loser=1-winner;const gap=Math.abs(m.scores[0]-m.scores[1]);
 if(has(m,loser,9)&&!used(m,loser,9)&&gap<=3){m.used[key(loser,9)]=1;m.scores.reverse();winner=loser;loser=1-winner;reason+='；逆转护符生效，胜负反转';}
 m.candidate={winner,reason};
 if(has(m,loser,7)&&!used(m,loser,7)&&gap<=5){m.phase='resurrection';m.resurrectionTeam=loser;log(m,'等待败方确认是否发动复活甲');return '';}
 finalize(m,winner,reason);return '';
}
function resurrection(m,accept){
 if(m.phase!=='resurrection')return;const t=m.resurrectionTeam;
 if(!accept){finalize(m,m.candidate.winner,m.candidate.reason+'；败方放弃复活甲');return;}
 m.used[key(t,7)]=1;m.goldenBase=m.scores.slice();m.golden=true;m.phase='golden';m.review=null;m.regret=null;log(m,'复活甲已发动 · 金球一球定胜负，结束技能不再连锁');
}
function finalize(m,winner,reason){if(m.finished)return;m.winner=winner;m.resultReason=reason;m.finished=true;m.phase='finished';m.review=null;m.regret=null;}
function adjust(m,scores){
 if(m.finished||!['playing','golden'].includes(m.phase)||m.review)return '请先完成当前回合或结算';
 if(!scores.every(x=>Number.isInteger(x)&&x>=0&&x<=30))return '请输入0至30的整数';
 m.scores=scores.slice();settle(m);return '';
}
function setServer(m,t){if(!['playing','golden'].includes(m.phase)||m.review||m.serveLocked||m.prediction||m.effects.squat.some(Boolean)||m.effects.line.some(Boolean))return '当前回合已发动发球技能，不能更换发球方';m.server=t;return '';}
function praiseViolation(m,t){if(!m.effects.praise[t]||m.scores[t]<=m.scores[1-t]||m.server!==1-t||m.phase!=='playing')return '当前不满足商业互吹条件';m.server=t;log(m,'对方未完成夸奖，发球权转移，不加减分');return '';}
const api={create,has,used,limit,activation,activate,beginRally,confirmRound,tick,undo,boundary,expireReview,settle,timing,end,resurrection,adjust,setServer,praiseViolation};root.CourtMatch=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
