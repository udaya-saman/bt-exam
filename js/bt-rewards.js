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
    const weeklyPoints=Math.max(0,Number(p.weeklyPoints?.[weekKey]||0));
    const outletAnswers=(p.outlet && p.outlet!=='Other') ? Math.max(0,Number(p.outletWeeklyAnswers?.[weekKey+'__'+p.outlet]||0)) : 0;
    const a=[
      ['first-slice','🍕','First Slice',100,points],
      ['rising-star','🌟','Rising Star',1500,points],
      ['legend','🏆','Pizza Legend',10000,points],
      ['sharp-mind','🎯','Sharp Mind',50,correct],
      ['super-student','📘','Super Student',500,correct],
      ['centurion','💯','100 Correct Club',100,correct],
      ['streak-3','🔥','3-Day Streak',3,currentStreak],
      ['streak-7','⚡','7-Day Streak',7,currentStreak],
      ['streak-14','👑','14-Day Streak',14,currentStreak],
      ['weekly-50','🚀','Weekly Warrior',2000,weeklyPoints],
      ['outlet-drive','🍕','Outlet Challenger',25,outletAnswers],
      ['outlet-crown','👑','Crown Squad',1,outletCrown?1:0]
    ];
    return a.map(([id,icon,label,target,current])=>{
      const unlocked=current>=target;
      // Rounded progress must never look completed while the target is still locked.
      return {id,icon,label,target,current,unlocked,
        percent:unlocked?100:Math.min(99,Math.max(0,Math.round(100*current/target)))};
    });
  }
  // Each requirement applies to the transition FROM the current level.
  // 1–9: 500; 10–24: 1,000; 25–49: 1,500; 50–99: 2,000.
  // From 100: fifty-level bands, starting at 2,500 and increasing 500 per band.
  // Levels are derived from lifetime points; no stored scores or records are changed.
  function level(points){
    const raw=Number(points);
    const score=Number.isFinite(raw)?Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(raw))):0;
    let number=1, start=0;

    function result(required){
      const current=score-start;
      const next=start+required;
      // Rounded display cannot report 100% before crossing the next level.
      const percent=Math.min(99,Math.max(0,Math.round(current/required*100)));
      return {number,points:score,next,current,percent,required,remaining:required-current,start};
    }

    for(const [end,required] of [[10,500],[25,1000],[50,1500],[100,2000]]){
      const bandCost=(end-number)*required;
      if(score-start<bandCost){
        const completed=Math.floor((score-start)/required);
        number+=completed;start+=completed*required;
        return result(required);
      }
      start+=bandCost;number=end;
    }

    let end=150,required=2500;
    // Whole-band arithmetic avoids looping through individual levels.
    while(score-start>=(end-number)*required){
      start+=(end-number)*required;number=end;
      end+=50;required+=500;
    }
    const completed=Math.floor((score-start)/required);
    number+=completed;start+=completed*required;
    return result(required);
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
