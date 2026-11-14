/* BT Exam Prep: rewards derived from Firestore-validated progress fields. */
(function (root) {
  'use strict';
  const toDay = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value||'')) ? String(value) : null;
  const shiftDay = (date,offset) => {
    const d = new Date(date+'T00:00:00Z');
    d.setUTCDate(d.getUTCDate()+offset);
    return d.toISOString().slice(0,10);
  };
  function streak(activity, today) {
    const days=activity||{}, date=toDay(today);
    if(!date)return 0;
    let current=Number(days[date]||0)>0?date:shiftDay(date,-1);
    let count=0;
    for(let i=0;i<3650 && Number(days[current]||0)>0;i++){
      count++;current=shiftDay(current,-1);
    }
    return count;
  }
  function achievements(profile,today,weekKey,outletCrown=false){
    const p=profile||{},points=Math.max(0,Number(p.totalPoints||0)),correct=Math.max(0,Number(p.correctAnswers||0));
    const currentStreak=streak(p.dailyActivity||{},today);
    const weeklyAnswers=Object.entries(p.outletWeeklyAnswers||{}).filter(([key])=>key.startsWith(weekKey+'__')).reduce((t,[,v])=>t+Math.max(0,Number(v)||0),0);
    const outletAnswers=(p.outlet && p.outlet!=='Other') ? Math.max(0,Number(p.outletWeeklyAnswers?.[weekKey+'__'+p.outlet]||0)) : 0;
    const a=[
      ['first-slice','🍕','First Slice',100,points],
      ['rising-star','🌟','Rising Star',1500,points],
      ['legend','🏆','Pizza Legend',6000,points],
      ['sharp-mind','🎯','Sharp Mind',50,correct],
      ['super-student','📘','Super Student',150,correct],
      ['centurion','💯','100 Correct Club',100,correct],
      ['streak-3','🔥','3-Day Streak',3,currentStreak],
      ['streak-7','⚡','7-Day Streak',7,currentStreak],
      ['streak-14','👑','14-Day Streak',14,currentStreak],
      ['weekly-50','🚀','Weekly Warrior',200,weeklyAnswers],
      ['outlet-drive','🍕','Outlet Challenger',25,outletAnswers],
      ['outlet-crown','👑','Crown Squad',1,outletCrown?1:0]
    ];
    return a.map(([id,icon,label,target,current])=>({
      id,icon,label,target,current,unlocked:current>=target,
      percent:Math.max(0,Math.min(100,Math.round(100*current/target)))
    }));
  }
  function level(points){
    const score=Math.max(0,Number(points||0));
    const number=Math.floor(score/500)+1;
    return {number,points:score,next:(number*500),current:score%500,percent:Math.round((score%500)/5)};
  }
  function season(date){
    const iso=toDay(date);if(!iso)return null;
    const current=new Date(iso+'T00:00:00Z');
    const weekday=(current.getUTCDay()+6)%7;
    const start=shiftDay(iso,-weekday),end=shiftDay(start,6);
    return {start,end,daysRemaining:7-weekday};
  }
  root.BTRewards={achievements,streak,level,season,shiftDay};
})(typeof window!=='undefined'?window:globalThis);
