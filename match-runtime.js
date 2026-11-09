/* 统一桥接所有得分、修改比分、主动发动、15分和比赛结束入口。 */
function matchReady(){const m=S.match;if(m&&!m.cards){const fresh=CourtMatch.create(S.cards,m.scores,S.targets);Object.assign(fresh,m,{cards:clone(S.cards),timingReached:m.scores.some(x=>x>=15)});S.match=fresh;}if(S.match)S.match.manualCourt=true;return S.match;}
let matchTickOwner=null;
function matchSync(){
 const m=matchReady();if(!m)return;
 if(m.finished){if(!m.counted){S.wins||=[0,0];S.wins[m.winner]++;m.counted=true;}clearInterval(timer);matchTickOwner=null;$('modal').innerHTML='';S.page='result';render();return;}
 if(m.phase==='review'&&!m.review.deadline)m.review.deadline=Date.now()+3000;
 if(m.phase==='review'&&matchTickOwner!==m){clearInterval(timer);matchTickOwner=m;timer=setInterval(()=>{if(S.match!==m||m.phase!=='review'){clearInterval(timer);matchTickOwner=null;return;}const left=Math.ceil((m.review.deadline-Date.now())/1000);if(left<=0)CourtMatch.expireReview(m);else{m.review.count=left;if(m.regret)m.regret.count=left;}matchSync();},1000);}
 if(m.phase!=='review'){clearInterval(timer);matchTickOwner=null;}
 if(S.page==='match')render();
 if(['resurrection','timing','clap','prediction'].includes(m.phase))showMatchPending();
}
start=function(){if(!getReport().ok||!S.agreed.every(Boolean))return;clearInterval(timer);clearTimeout(passiveTimer);S.match=CourtMatch.create(S.cards,getReport().opening,S.targets);S.match.manualCourt=true;const reminders=[];S.cards.forEach((cards,t)=>cards.filter(id=>[5,13].includes(id)).forEach(id=>reminders.push(team(t)+'「'+skill(id).name+'」已生效，请在场上指定对方队员')));S.match.passive=reminders.join('；');S.page='match';$('modal').innerHTML='';render();};
score=function(i,options={}){const error=CourtMatch.beginRally(matchReady(),i,options);if(error)toast(error);else matchSync();};
afterScore=function(){CourtMatch.settle(matchReady());matchSync();};
regret=function(t){const m=matchReady(),owner=t??m.review?.eligible17[0];const error=CourtMatch.undo(m,owner);if(error)toast(error);else{$('modal').innerHTML='';matchSync();}};
function skillStatus(m,t,id){
 const n=CourtMatch.used(m,t,id),remaining=CourtMatch.limit(id)-n;
 if(id===24&&m.manualCourt)return '场上执行 · 前5次发球';
 if(id===24)return m.serves[t]>=5?'前5次发球已完成':`闭眼发球 · 剩余${5-m.serves[t]}次`;
 if(id===25)return m.scores[t]-m.scores[1-t]>=3?'光环生效 · 暂不加分':'被动待命 · 领先3分触发';
 if(id===15&&m.effects.praise[t])return m.scores[t]>m.scores[1-t]?'持续生效 · 对方发球前夸奖':'持续待命 · 领先时生效';
 if(id===16&&m.effects.squat[t])return '本回合深蹲要求生效';
 if(id===18&&m.prediction?.team===t)return '已预言 · 等待回合确认';
 if(id===20&&m.effects.shared[t])return `双方加分 · 剩余${m.effects.shared[t]}回合`;
 if(id===21&&m.effects.mirror[t])return `交换站位 · 剩余${m.effects.mirror[t]}回合`;
 if(id===22&&m.effects.line[t])return '接发限制 · 本回合有效';
 if(id===17)return m.review?.eligible17.includes(t)?`可撤销 · ${m.review.count}秒`:n?'已用完':'等待对方得分';
 if(id===19)return m.review?.eligible19.includes(t)?`可改判 · ${m.review.count}秒`:remaining>0?`我方出界后 · 剩余${remaining}次`:'已用完';
 if([1,3,5,8,10,13].includes(id))return [5,13].includes(id)?'场上指定对象 · 整局有效':'场上规则 · 整局有效';
 if([2,11,23].includes(id))return '开局已生效';
 if(id===12)return m.swap?'已触发 · 交换一次':'等待首次达到15分';
 if([4,6].includes(id))return n?'已触发 · 场上调整':'等待首次达到15分';
 if([7,9].includes(id))return n?'已触发':'败方结算时检查';
 if(id===14)return n?'已触发':'20:20自动触发';
 if(remaining<=0)return '已用完';
 const unavailable=CourtMatch.activation(m,t,id);return unavailable?`暂不可用 · 剩余${remaining}次`:`可发动 · 剩余${remaining}次`;
}
const previousMatchPage=matchPage;
matchPage=function(){const m=matchReady();let html=previousMatchPage();
 html=html.replace(/<button class="mini[\s\S]*?<\/button>/g,button=>{const t=Number(button.match(/data-team="(\d)"/)[1]),id=Number(button.match(/data-id="(\d+)"/)[1]);button=button.replace(/ available/g,'');if(!CourtMatch.activation(m,t,id))button=button.replace('class="mini ','class="mini available ');return button.replace(/<small>[\s\S]*?<\/small>/,`<small>${esc(skillStatus(m,t,id))}</small>`);});
 html=html.replace(/<button class="timeout"[\s\S]*?<\/button>/g,'');
 const isPlaying=['playing','golden'].includes(m.phase)&&!m.review;
 html=html.replace(/<button data-act="(score|minus)"/g,(x)=>isPlaying?x:x+' disabled');
 html=html.replace('21分制 · ',m.golden?'金球加赛 · ':'21分制 · ');
 let pending='';
 if(m.phase==='review')pending=`<div class="review-window"><b>本回合确认 · ${m.review.count}秒</b>${m.review.eligible17.map(t=>action(team(t)+'后悔药 · 撤销整回合','match-undo',false,'secondary',`data-team="${t}"`)).join('')}${m.review.eligible19.map(t=>action(team(t)+'出界时改判 · 我方得分','match-boundary',false,'secondary',`data-team="${t}"`)).join('')}</div>`;
 if(m.golden)pending+='<div class="match-banner">金球一球定胜负，结束技能不再连锁。</div>';
 if(['resurrection','timing','clap','prediction'].includes(m.phase))pending+=action('继续处理当前结算','match-pending',false,'secondary');
 html=html.replace('<p class="match-note">',pending+'<p class="match-note">');
 html=html.replace(/<p class="match-note">[\s\S]*?<\/p>/,'');
 return html;
};
function matchSheet(title,body,buttons){$('modal').innerHTML=`<div class="overlay" role="dialog" aria-modal="true" aria-label="${title}"><section class="sheet match-sheet"><h2>${title}</h2>${body}${buttons}</section></div>`;}
function showMatchPending(){const m=matchReady();
 if(m.phase==='resurrection')matchSheet(team(m.resurrectionTeam)+'复活甲',`<p>${team(m.candidate.winner)}暂胜，比分 ${m.scores.join(' : ')}。败方满足分差≤5，可发动复活甲。</p><p>发动后金球一球定胜负，不再触发平分秋色、逆转护符或复活甲。现在不会记录胜场。</p>`,action('发动复活甲 · 金球加赛','match-resurrect')+action('放弃复活甲 · 确认结果','match-decline',false,'secondary'));
 if(m.phase==='clap')matchSheet('确认击掌buff',`<p>${team(m.clapTeam)}本回合获得分数，是否已与搭档击掌？未击掌则本回合无效，不消耗持续回合。</p>`,action('已击掌 · 计入本回合','match-round-yes')+action('未击掌 · 此分无效','match-round-no',false,'secondary'));
 if(m.phase==='prediction')matchSheet('确认神算子预言',`<p>本回合预言：${esc(m.prediction.text)}</p><p>由双方确认是否命中，成功额外加1分；奖励不翻倍。</p>`,action('预言成功 · 额外加1分','match-round-yes')+action('预言失败 · 不加奖励','match-round-no',false,'secondary'));
}

const completeDetail=detail;
matchSkill=function(t,id){const m=matchReady();if(m.phase==='review'&&Date.now()>=m.review.deadline){CourtMatch.expireReview(m);matchSync();return;}S.team=t;
 if(id===17&&m.review?.eligible17.includes(t)){regret(t);return;}
 if(id===19&&m.review?.eligible19.includes(t)){CourtMatch.boundary(m,t);matchSync();return;}
 const error=CourtMatch.activation(m,t,id);
 completeDetail(id,!error?{team:t,remaining:CourtMatch.limit(id)-CourtMatch.used(m,t,id)}:null);
 if(error)$('modal').querySelector('.detail-footer').insertAdjacentHTML('afterbegin',`<p>${esc(skillStatus(m,t,id))} · ${esc(error)}</p>`);
};
function activateInMatch(t,id){const m=matchReady();
 if(id===18){matchSheet('神算子 · 记录预言','<label>预言本回合如何结束<input id="match-prediction" aria-label="本回合预言" maxlength="60" placeholder="例如：对方挂网"></label>',action('确认预言并发动','match-predict',false,'primary',`data-team="${t}"`)+action('暂不发动','close',false,'secondary'));return;}
 const error=CourtMatch.activate(m,t,id);if(error){toast(error);return;}$('modal').innerHTML='';matchSync();
}
function requestFinish(){const m=matchReady();if(!['playing','golden'].includes(m.phase)){showMatchPending();if(m.phase==='review')toast('请先等待回合撤销窗口结束');return;}
 const lead=m.scores[0]===m.scores[1]?null:m.scores[0]>m.scores[1]?0:1;
 matchSheet('提前结束本局',`<p>当前比分 ${m.scores.join(' : ')}。提前结束需双方现场确认；仍会检查逆转护符与复活甲。</p>`,(lead!==null?action('按当前领先方结算','match-end',false,'primary',`data-team="${lead}"`):'<p>比分持平，无法按比分结算。</p>')+action('继续比赛','close',false,'secondary'));
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const a=b.dataset.act,t=Number(b.dataset.team),id=Number(b.dataset.id);
 if(a==='reset-wins'){e.stopImmediatePropagation();S.wins=[0,0];render();toast('双方胜局已重置');return;}
 const actions=['activate','finish','finish-winner','minus','save-score','match-pending','match-resurrect','match-decline','match-round-yes','match-round-no','match-undo','match-boundary','match-predict','match-end'];
 if(!actions.includes(a))return;e.stopImmediatePropagation();const m=matchReady();if(!m||m.finished)return;
 if(m.phase==='review'&&Date.now()>=m.review.deadline){CourtMatch.expireReview(m);matchSync();toast('回合确认窗口已结束');return;}
 if(a==='activate'){activateInMatch(t,id);return;}
 if(a==='finish'){requestFinish();return;}
 if(a==='match-pending'){showMatchPending();return;}
 let error='';
 switch(a){
 case'match-resurrect':CourtMatch.resurrection(m,true);break;
 case'match-decline':CourtMatch.resurrection(m,false);break;
 case'match-round-yes':CourtMatch.confirmRound(m,true);break;
 case'match-round-no':CourtMatch.confirmRound(m,false);break;
 case'match-undo':error=CourtMatch.undo(m,t);break;
 case'match-boundary':error=CourtMatch.boundary(m,t);break;
 case'match-predict':error=CourtMatch.activate(m,t,18,{prediction:$('match-prediction').value});break;
 case'match-end':case'finish-winner':error=CourtMatch.end(m,t);break;
 case'minus':{const scores=m.scores.slice();scores[t]=Math.max(0,scores[t]-1);error=CourtMatch.adjust(m,scores);break;}
 case'save-score':error=CourtMatch.adjust(m,[Number($('score-0').value),Number($('score-1').value)]);break;
 }
 if(error){toast(error);return;}$('modal').innerHTML='';matchSync();
},true);

const previousAdjust=adjust;adjust=function(){const m=matchReady();if(!['playing','golden'].includes(m.phase)){toast('请先完成当前回合或结算');return;}previousAdjust();for(const id of ['score-0','score-1'])$(id).max=30;};
