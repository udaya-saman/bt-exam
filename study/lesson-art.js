/* Mascot illustrations are mapped explicitly to the curriculum. */
(function(root){
 const cues={
 "t01": [
  "First red-roof restaurant model and old family coin purse",
  "What links the first restaurant, the family loan and Union Place?"
 ],
 "t02": [
  "Offering a better pizza to a guest",
  "How do value, taste and guest experience support the mission?"
 ],
 "t03": [
  "Choosing between eat-in table, carry bag and delivery scooter",
  "Which outlet types offer delivery, carryout and dine-in service?"
 ],
 "t04": [
  "Guiding a guest to an order counter",
  "When does a DELCO guest order and pay?"
 ],
 "t05": [
  "Pulling out a dining chair for a guest",
  "What comes between seating an RBD guest and serving the main course?"
 ],
 "t06": [
  "Handing over a closed takeaway box",
  "Which steps distinguish table service from takeaway?"
 ],
 "v05": [
  "Two colleagues lifting a large puzzle piece together",
  "How should a team respond when someone makes a mistake?"
 ],
 "v06": [
  "Consulting a policy binder with checkmarks",
  "How does a policy help people make consistent decisions?"
 ],
 "v07": [
  "Connecting a compass and teamwork puzzle pieces",
  "How would the four values guide one decision on shift?"
 ],
 "v08": [
  "Considering two conflicting paths at a fork",
  "When could a personal interest conflict with a work decision?"
 ],
 "v09": [
  "Supporting a colleague reporting bullying",
  "How would you support someone reporting inappropriate conduct?"
 ],
 "v10": [
  "Posting a sealed report into a confidential reporting box",
  "How can a genuine concern be reported confidentially?"
 ],
 "v11": [
  "Protecting private laptop data with a lock",
  "What should stay private when using devices and social media?"
 ],
 "v12": [
  "Reconciling a register receipt with a ledger",
  "How do records support fair distribution of service charges?"
 ],
 "h01": [
  "Welcoming a new colleague with an open handbook",
  "What does the handbook tell a new team member about Gamma?"
 ],
 "h02": [
  "Placing a restaurant pin on a Sri Lanka map",
  "What happened at Getuwana, and what does inclusion mean for the community?"
 ],
 "h03": [
  "Supporting a miniature strategy house with pillars",
  "Can you distinguish the purpose, vision and mission in the strategy house?"
 ],
 "h04": [
  "Pairing a compass with the policy handbook",
  "Which policies put the RIIT values into practice?"
 ],
 "h05": [
  "Comparing a payslip with a shift clock",
  "Which parts of a payslip depend on the shift or hours worked?"
 ],
 "h06": [
  "Showing a stepped sales chart with a bonus coin",
  "How do sales tiers change the example incentive?"
 ],
 "h07": [
  "Marking work shifts and leave on a calendar",
  "How do shift arrangements and leave categories differ?"
 ],
 "h08": [
  "Handing in a resignation letter and clearance checklist",
  "What needs to be handed over before final settlement?"
 ],
 "h09": [
  "Presenting a graduation cap and gift voucher",
  "Which benefits support employees and their families?"
 ],
 "h10": [
  "Filing medical claim documents with a medical cross",
  "What documentation supports a medical or accident claim?"
 ],
 "h11": [
  "Indicating safety goggles and safety boots",
  "How should you respond to unsafe conditions at work?"
 ],
 "h12": [
  "Talking to a supervisor about a concern",
  "Who is the first person to approach about a grievance?"
 ],
 "h13": [
  "Reviewing a letter of explanation at a desk",
  "Where do investigation, explanation and inquiry fit in the procedure?"
 ],
 "h14": [
  "Sharing equal pizza slices at an accessible table",
  "How does an equal slice represent inclusion?"
 ],
 "h15": [
  "Comparing a vintage restaurant photo to a present-day restaurant",
  "Which dates, founders and outlet types connect the history to today?"
 ],
 "h16": [
  "Welcoming and guiding a guest to their table",
  "How does the guest journey change between the three service formats?"
 ],
 "h17": [
  "Checking a clean uniform next to a training manual",
  "Which uniform, hygiene and training checks apply before a shift?"
 ],
 "h18": [
  "Displaying a finished pizza next to its ingredients",
  "Can you reconstruct the five pizza stages in order?"
 ],
 "h19": [
  "Displaying a finished taco next to its ingredients",
  "Can you reconstruct the five taco stages in order?"
 ],
 "h20": [
  "Comparing an accurate service ticket with a stopwatch",
  "How do accuracy and speed fit into CHAMPS and H2OP?"
 ],
 "h21": [
  "Listening empathetically to a dissatisfied guest",
  "What comes after listening in BLAST?"
 ],
 "h22": [
  "Demonstrating handwashing at a sink",
  "How does handwashing fit into the five food safety rules?"
 ],
 "h23": [
  "Placing a caution sign beside a spill",
  "Which prevention rule applies when you see a spill?"
 ],
 "h24": [
  "Showing a fire triangle diagram of heat fuel and oxygen without text, beside a stored extinguisher",
  "How do the three elements of fire differ from the four PASS actions?"
 ],
 "h25": [
  "Holding a closed first aid kit with three simple heart icons",
  "What are the three aims of first aid?"
 ],
 "academy": [
  "Studying an illustrated workbook, red bookmark, attentive expression",
  ""
 ],
 "sauce": [
  "Spreading red base sauce on a bare pizza base using ladle",
  ""
 ],
 "cheese": [
  "Adding shredded cheese over red sauce",
  ""
 ],
 "toppings": [
  "Adding vegetable toppings over cheese",
  ""
 ],
 "oven": [
  "Sliding topped pizza into oven on peel",
  ""
 ],
 "pizza": [
  "Presenting a baked pizza",
  ""
 ],
 "shell": [
  "Showing empty taco shell",
  ""
 ],
 "protein": [
  "Adding cooked protein inside a taco shell",
  ""
 ],
 "taco-sauce": [
  "Adding sauce over the protein in a taco",
  ""
 ],
 "cold-filling": [
  "Adding cold lettuce filling to taco",
  ""
 ],
 "taco": [
  "Presenting the finished taco",
  ""
 ],
 "t07": [
  "Listening attentively to a concerned guest with a colleague",
  "How would you use BLAST with a guest who is unhappy?"
 ],
 "t08": [
  "Checking a clean service tray and order ticket",
  "Which service standards do CHAMPS and CARE stand for?"
 ],
 "t09": [
  "Pointing to a handwash sink with soap",
  "Can you recall all five food safety rules from a handwashing sink?"
 ],
 "t10": [
  "A team building a hilltop flag together",
  "How does the team build know-how and recognise progress?"
 ],
 "t11": [
  "Comparing a chiller thermometer and oven dial, no readings",
  "Which equipment needs chilling, freezing, proofing or heating?"
 ],
 "t12": [
  "Holding a safety helmet beside a parked scooter",
  "What should a rider check before setting off?"
 ],
 "t13": [
  "Matching a pizza and beverage to a stopwatch",
  "Which items have different service-time targets?"
 ],
 "t14": [
  "Checking a delivery order at a guest’s doorway",
  "What do you verify with the guest at the door?"
 ],
 "t15": [
  "Comparing prepared vegetable strips and cubes against a ruler",
  "Which toppings are cut into strips, cubes or slices?"
 ],
 "t16": [
  "Comparing three sizes of pizza pan and dough on a scale",
  "How do the pan size, dough weight and oil amount change together?"
 ],
 "t17": [
  "Distinguishing soap and sanitizer dispensers stored away from food",
  "Which approved product belongs to each cleaning task?"
 ],
 "t18": [
  "Indicating a marked emergency exit",
  "What are the danger zone, fire triangle and emergency response steps?"
 ],
 "t19": [
  "Checking uniform and cap in a mirror",
  "What should you check about your appearance before a shift?"
 ],
 "t20": [
  "Matching abbreviation flashcards to restaurant icons",
  "Can you expand each abbreviation and name its function?"
 ],
 "v01": [
  "Four interlocking puzzle pieces",
  "Can you match each RIIT value to a workplace action?"
 ],
 "v02": [
  "Listening respectfully to a colleague",
  "What would respectful listening sound like?"
 ],
 "v03": [
  "Politely declining a wrapped supplier gift",
  "What should you do when a supplier offers a personal gift?"
 ],
 "v04": [
  "Presenting a bright new lightbulb idea",
  "How can a new idea become a practical improvement?"
 ]
};

 const stages={h18:['sauce','cheese','toppings','oven','pizza'],h19:['shell','protein','taco-sauce','cold-filling','taco']};
 function image(point,heading,id,className='pa-study-illustration',index){
   const key=stages[id]?.[index]||id;
   const node=document.createElement('img');node.className=className;node.dataset.concept=key;
   node.alt='Pizza mascot: '+cues[key][0];node.src='./study/art/'+key+'.jpg';node.width=256;node.height=256;node.decoding='async';
   if(className==='pa-study-card-picture')node.loading='lazy';
   return node;
 }
 root.PizzaStudyArt=Object.freeze({image,cue:id=>cues[id][1]});
})(window);
