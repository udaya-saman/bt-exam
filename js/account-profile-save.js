/* Pizza Arena account updates. No credentials are stored; Firebase Auth owns passwords. */
(function(global){
 'use strict';
 const normalized=(name)=>String(name||'').trim().toLowerCase();
 const validName=(name)=>/^[A-Za-z0-9._-]{3,24}$/.test(name);
 function validate(input){
   const {name,avatar,changePassword,currentPassword,newPassword}=input;
   if(!validName(name))throw Error('Use 3–24 letters, numbers, dots, dashes or underscores.');
   if(typeof avatar!=='string'||avatar.length>24000||(avatar!==''&&!avatar.startsWith('data:image/png;base64,'))){
     throw Error('Please choose a PNG picture smaller than 24 KB.');
   }
   if(changePassword){
     if(!currentPassword||!newPassword||newPassword.length<8)throw Error('Enter your current password and a new password with at least 8 characters.');
     if(newPassword===currentPassword)throw Error('Choose a new password different from your current password.');
   }
 }
 async function save(input){
   validate(input);
   const {F,A,db,user,profile,admins,name,avatar,changePassword,currentPassword,newPassword,reserved}=input;
   if(!F||!A||!db||!user?.uid||!user?.email||!profile)throw Error('Account is not ready. Please sign in again.');
   if(!global.navigator?.onLine)throw Error('Connect to the internet before saving account changes.');
   const target=name.trim(),targetLower=normalized(target);
   const detailsChanged=target!==profile.username||avatar!==(profile.avatar||'');
   if(!detailsChanged&&!changePassword){
     return {changed:false,detailsSaved:false,passwordSaved:false,profile:profile};
   }
   // Reauthenticate *before* writing account data, so an incorrect current
   // password cannot lead to a partial profile update.
   if(changePassword){
     await A.reauthenticateWithCredential(user,A.EmailAuthProvider.credential(user.email,currentPassword));
   }
   let detailsSaved=false;
   let savedProfile=profile;
   try{
     if(detailsChanged){
       savedProfile=await F.runTransaction(db,async tx=>{
         const userRef=F.doc(db,'users',user.uid);
         const publicRef=F.doc(db,'publicRanks',user.uid);
         const userSnapshot=await tx.get(userRef);
         if(!userSnapshot.exists())throw Error('Account information could not be found.');
         const current=userSnapshot.data();
         const oldLower=normalized(current.usernameLower||current.username);
         // A second device may have renamed the account after these fields opened.
         if(oldLower!==normalized(profile.usernameLower||profile.username)){
           throw Error('Your account was changed elsewhere. Reopen Account Settings and try again.');
         }
         const oldRef=F.doc(db,'usernames',oldLower);
         const nextRef=F.doc(db,'usernames',targetLower);
         // Firestore requires all reads to precede the first write.
         const [oldReg,nextReg,rankSnapshot]=await Promise.all([
           tx.get(oldRef),
           oldLower===targetLower?Promise.resolve(null):tx.get(nextRef),
           tx.get(publicRef)
         ]);
         if(oldReg.exists()&&oldReg.data().uid!==user.uid){
           throw Error('Your username information needs refreshing. Reopen the app and try again.');
         }
         if(nextReg?.exists()&&nextReg.data().uid!==user.uid){
           throw Error('Username already taken.');
         }
         // Repair profiles created before the username registry was introduced.
         if(oldLower===targetLower){
           if(!oldReg.exists())tx.set(oldRef,{uid:user.uid,authEmail:user.email});
         }else{
           if(!nextReg?.exists())tx.set(nextRef,{uid:user.uid,authEmail:user.email});
           if(oldReg.exists())tx.delete(oldRef);
         }
         tx.update(userRef,{username:target,usernameLower:targetLower,avatar,updatedAt:F.serverTimestamp()});
         if(rankSnapshot.exists()){
           if(current.outlet==='Other'||reserved?.has(targetLower)||admins){
             tx.delete(publicRef);
           }else{
             tx.update(publicRef,{name:target,avatar,updatedAt:F.serverTimestamp()});
           }
         }
         return {...current,username:target,usernameLower:targetLower,avatar};
       });
       detailsSaved=true;
     }
     if(changePassword)await A.updatePassword(user,newPassword);
     return {changed:true,detailsSaved,passwordSaved:!!changePassword,profile:savedProfile};
   }catch(error){
     if(detailsSaved){
       error.detailsSaved=true;
       error.savedProfile=savedProfile;
     }
     throw error;
   }
 }
 global.BTProfileSave=Object.freeze({validate,save});
})(window);
