/* B版的完整详情共用一个视图，手册、选卡、规则总览和比赛均可进入。 */
detail=function(id,activation=null){
  const s=skill(id),selected=S.cards[S.team].includes(id);
  let controls='';
  if(activation){
    controls=action('确认发动 · 剩余'+activation.remaining+'次','activate',false,'primary',`data-team="${activation.team}" data-id="${id}"`);
  }else if(S.page==='library'){
    controls=selected?action('移出手牌','choose',false,'secondary',`data-id="${id}"`):S.cards[S.team].length<2?action('加入'+team(S.team)+'手牌','choose',false,'primary',`data-id="${id}"`):`<p>已经选满，选择一张替换：</p>${S.cards[S.team].map((x,j)=>action('替换「'+skill(x).name+'」','replace',false,'secondary',`data-id="${id}" data-slot="${j}"`)).join('')}`;
  }
  $('modal').innerHTML=`<div class="overlay detail-overlay" role="dialog" aria-modal="true" aria-label="${s.name}技能详情"><section class="phone detail-screen"><div class="system"><b>9:41</b><span>▮▮▮　100%</span></div>${nav('技能详情','close')}<div class="detail-body"><section class="detail-hero ${s.rarity}"><div class="detail-number"><span>${s.rarity}</span><span>${s.number}</span></div><h2>${esc(s.name)}</h2><p>${esc(s.effect)}</p></section><section class="detail-rules"><dl><dt>发动时机</dt><dd>${esc(s.triggerTime)}</dd><dt>触发条件</dt><dd>${esc(s.triggerCondition)}</dd><dt>技能类型</dt><dd>${esc(s.typeLabel)}</dd></dl></section><section class="detail-description"><h3>详细说明</h3><p>${esc(s.description)}</p></section><p class="detail-tips">使用提示 / ${esc(s.tips)}</p></div><footer class="detail-footer">${controls}${action(activation?'暂不发动':S.page==='book'?'返回技能手册':'返回上一步','close',false,'secondary')}</footer></section></div>`;
};
matchSkill=function(i,id){
  const m=S.match,s=skill(id),used=m.used[i+'-'+id]||0,limit=id===18?2:[19,22].includes(id)?3:1;
  if(id===17&&m.regret?.team===i){regret();return;}
  S.team=i;
  const canActivate=s.type==='active'&&id!==17&&used<limit&&!m.regret;
  detail(id,canActivate?{team:i,remaining:limit-used}:null);
};
