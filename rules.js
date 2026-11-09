/* C 版规则模型：仅用于独立体验，不修改小程序和 Figma B 版。 */
(function (root) {
  const has = (list, id) => list.includes(id);
  function check(a, b) {
    const all = [...a, ...b], blocks = [], warnings = [], notes = [];
    const count = id => all.filter(x => x === id).length;
    if (a.length !== 2 || b.length !== 2) blocks.push({key:'count',title:'双方各需两张技能',body:'请补齐双方手牌后再检查。'});
    if (new Set(a).size !== a.length || new Set(b).size !== b.length) blocks.push({key:'duplicate',title:'同队不能重复选择',body:'请保留两张不同的技能。'});
    if (has(a,14) && has(b,14)) blocks.push({key:'tie',title:'双方不能同时持有平分秋色',body:'20:20 时会同时判胜。请更换其中一张。',ids:[14]});
    if (has(a,9) && has(b,9)) blocks.push({key:'reverse',title:'双方逆转护符暂不支持同场',body:'反转后可能再次符合对方条件。第一版请更换其中一张。',ids:[9]});
    if (count(4)>1 || (count(4)>0 && count(6)>0)) blocks.push({key:'roster',title:'人员变更效果无法同时执行',body:'两个3V1，或3V1与临时换队友同场，尚未定义人员调整顺序。请更换相关技能。',ids:[4,6]});
    for (const [i, s] of [a,b].entries()) {
      const team = i===0?'A队':'B队';
      if (has(s,11) && has(s,2)) warnings.push({key:'power'+i,title:team+'的开局与得分加成叠加',body:'以5分优势开局，普通得分回合增加2分。允许选择，不做强度限制。'});
      if (has(s,9) && has(s,7)) notes.push({key:'end'+i,title:team+'结束技能的触发顺序',body:'先检查逆转护符；未反转且仍输球时，再检查复活甲。金球只进行一次，不再触发结束技能。'});
      if (s.some(id=>[23,24,25,8].includes(id))) warnings.push({key:'challenge'+i,title:team+'包含自我限制技能',body:'效果会作用于持有方。请确认是主动接受的挑战，不会因不利而自动替换。'});
    }
    if (count(2) && count(18)) notes.push({key:'double',title:'基础分与预言奖励分别结算',body:'基础得分先翻倍，神算子成功奖励另加1分；普通获胜且预言成功合计3分。'});
    if (count(17)) notes.push({key:'undo',title:'后悔药撤销整个得分回合',body:'在3秒内恢复该回合前的比分和本回合相关状态，保留此前回合已经消耗的技能次数。最后一分也先等待撤销窗口。'});
    if (count(20)) notes.push({key:'shared',title:'共同富裕覆盖基础得分',body:'生效期间，每个有效得分回合双方基础分各加1，不叠加双倍得分；额外奖励另算，圣母光环仍可阻止持有方加分。双方同时发动不重复加分，各自剩余回合同时减少。'});
    if (count(12)>1) notes.push({key:'swap',title:'分数交换同一节点只执行一次',body:'双方同时持有时，首次跨过15分只交换一次，并将双方的分数交换均标记为已触发。'});
    if (all.some(id=>[4,6,12].includes(id))) notes.push({key:'15',title:'首次达到或跨过15分时触发',body:'例如14分直接变16分也触发；同一节点不重复触发，先分数交换，再处理人员变化。'});
    const opening = [0,0];
    [a,b].forEach((s,i)=>{if(has(s,11)) opening[i]+=5; if(has(s,23)) opening[1-i]+=2;});
    return {blocks,warnings,notes,opening,ok:blocks.length===0};
  }
  function weightedOne(pool, rng) {
    const tiers = ['SSR','SR','R','N'], weights=[.05,.15,.4,.4];
    const available=tiers.map((r,i)=>({r,w:weights[i],items:pool.filter(s=>s.rarity===r)})).filter(t=>t.items.length);
    let x=rng()*available.reduce((n,t)=>n+t.w,0), tier=available[available.length-1];
    for(const t of available){x-=t.w;if(x<0){tier=t;break;}}
    return tier.items[Math.min(tier.items.length-1,Math.floor(rng()*tier.items.length))].id;
  }
  function pair(skills,rng){const first=weightedOne(skills,rng);return [first,weightedOne(skills.filter(s=>s.id!==first),rng)];}
  function draw(skills, a, b, modes, rng=Math.random) {
    for(let tries=0;tries<2000;tries++){
      const aa=modes[0]==='random'?pair(skills,rng):a.slice();
      const bb=modes[1]==='random'?pair(skills,rng):b.slice();
      if(check(aa,bb).ok) return {a:aa,b:bb};
    }
    // 有界回退仍检查完整组合，避免无限重抽；原型可达卡池下不会耗尽。
    const pairs=[];for(let i=0;i<skills.length;i++)for(let j=i+1;j<skills.length;j++)pairs.push([skills[i].id,skills[j].id]);
    const aa=modes[0]==='random'?pairs:[a],bb=modes[1]==='random'?pairs:[b],valid=[];
    for(const x of aa)for(const y of bb)if(check(x,y).ok)valid.push({a:x,b:y});
    return valid.length?valid[Math.floor(rng()*valid.length)]:null;
  }
  const api={check,draw}; root.CourtRules=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
