'use strict';

/* VEYRA Task Center — layered onto the stable workspace app */
const veyraTaskLocalDate = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const veyraTaskView = () => safeLoad('taskViewMode','list');

taskRow = function(t){
 const overdue=t.dueDate&&!t.done&&new Date(t.dueDate+'T'+(t.dueTime||'23:59')+':00')<new Date();
 const subs=Array.isArray(t.subtasks)?t.subtasks:[],finished=subs.filter(x=>x.done).length;
 const due=t.dueDate?new Date(t.dueDate+'T12:00:00').toLocaleDateString([],{month:'short',day:'numeric'})+(t.dueTime?' · '+new Date('2000-01-01T'+t.dueTime).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):''):'No deadline';
 return '<article class="task task-card '+(t.done?'done':'')+(overdue?' task-overdue':'')+'"><input type="checkbox" data-task="'+esc(t.id)+'" '+(t.done?'checked':'')+' aria-label="Complete '+esc(t.title)+'"><div class="task-copy"><b>'+esc(t.title)+'</b><small>'+esc(t.detail||'')+(t.detail?' · ':'')+esc(t.category||'Personal')+' · '+esc(due)+'</small>'+(subs.length?'<div class="task-subprogress"><span>'+finished+'/'+subs.length+' steps</span><i><b style="width:'+(finished/subs.length*100)+'%"></b></i></div><div class="task-subtask-list">'+subs.map(x=>'<label><input type="checkbox" data-subtask-task="'+esc(t.id)+'" data-subtask-id="'+esc(x.id)+'" '+(x.done?'checked':'')+'><span class="'+(x.done?'is-done':'')+'">'+esc(x.text)+'</span></label>').join('')+'</div>':'')+(t.reminderEnabled?'<small class="task-reminder-label">◷ Browser reminder on</small>':'')+'</div><span class="tag '+(overdue||t.priority==='High'?'high':t.priority==='Low'?'low':'')+'">'+(t.done?'DONE':overdue?'OVERDUE':esc(t.priority||'NORMAL').toUpperCase())+'</span><div class="task-actions"><button type="button" class="task-mini" data-task-status="'+esc(t.id)+'" title="Move between To Do and In Progress">'+(t.inProgress?'↶':'⇢')+'</button><button type="button" class="task-mini" data-task-focus="'+esc(t.id)+'" title="Focus on task">◷</button><button type="button" class="task-mini" data-task-calendar="'+esc(t.id)+'" title="Open deadline in calendar">▦</button><button type="button" class="task-mini" data-task-edit="'+esc(t.id)+'" title="Edit task">✎</button><button type="button" class="task-mini danger" data-task-delete="'+esc(t.id)+'" title="Delete task">×</button></div></article>';
};

tasksPage = function(){
 const open=tasks.filter(t=>!t.done),done=tasks.filter(t=>t.done),now=new Date(),today=veyraTaskLocalDate(now);
 const overdue=open.filter(t=>t.dueDate&&new Date(t.dueDate+'T'+(t.dueTime||'23:59')+':00')<now);
 const dueToday=open.filter(t=>t.dueDate===today),rate=tasks.length?Math.round(done.length/tasks.length*100):0;
 const days=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-6+i);return {key:veyraTaskLocalDate(d),label:d.toLocaleDateString([],{weekday:'short'}),count:0}});
 done.forEach(t=>{if(t.completedAt){const day=days.find(x=>x.key===veyraTaskLocalDate(new Date(t.completedAt)));if(day)day.count++}});
 const max=Math.max(1,...days.map(d=>d.count));
 const chart=days.map(d=>'<div class="task-chart-col"><div class="task-chart-value">'+d.count+'</div><div class="task-chart-track"><span style="height:'+Math.max(4,d.count/max*100)+'%"></span></div><small>'+d.label+'</small></div>').join('');
 const next=open.filter(t=>t.dueDate&&t.dueDate>=today).sort((a,b)=>(a.dueDate+(a.dueTime||'23:59')).localeCompare(b.dueDate+(b.dueTime||'23:59'))).slice(0,4);
 const list=tasks.map(taskRow).join('')||'<div class="empty">Your task list is clear. Add your first task below.</div>';
 const lane=(label,items)=>'<section class="task-kanban-lane"><div class="task-lane-head"><b>'+label+'</b><span>'+items.length+'</span></div><div class="task-lane-body">'+(items.map(taskRow).join('')||'<div class="empty">Nothing here yet.</div>')+'</div></section>';
 const board=lane('TO DO',tasks.filter(t=>!t.done&&!t.inProgress))+lane('IN PROGRESS',tasks.filter(t=>!t.done&&t.inProgress))+lane('COMPLETED',done);
 const view=veyraTaskView();
 return '<div class="subpage task-dashboard">'+head('YOUR PRODUCTIVITY','Task Center','Plan your work, manage deadlines, and turn big goals into clear next steps.')+
 '<div class="task-stat-grid"><div class="stat"><small>Completed</small><strong>'+done.length+'</strong><span>All-time finished</span></div><div class="stat"><small>Still to do</small><strong>'+open.length+'</strong><span>Tasks remaining</span></div><div class="stat"><small>Due today</small><strong>'+dueToday.length+'</strong><span>Keep these moving</span></div><div class="stat"><small>Overdue</small><strong>'+overdue.length+'</strong><span>Needs attention</span></div></div>'+
 '<section class="panel task-progress-panel"><div class="panel-head"><div><h2>Productivity analytics</h2><p>Completed tasks over the last seven days</p></div><span class="tag">'+rate+'% complete</span></div><div class="task-chart">'+chart+'</div><div class="progress"><span style="width:'+rate+'%"></span></div><div class="progress-meta"><span>'+done.length+' completed</span><span>'+tasks.length+' total tasks</span></div><p class="task-chart-note">Your chart updates as you complete tasks. History begins when you mark a task complete.</p></section>'+
 '<div class="task-columns"><section class="panel"><div class="panel-head"><div><h2>Today’s focus</h2><p>Deadlines that need attention</p></div></div>'+(overdue.length?'<div class="task-focus-label overdue-label">OVERDUE</div>'+overdue.slice(0,3).map(taskRow).join(''):'')+(dueToday.length?'<div class="task-focus-label">DUE TODAY</div>'+dueToday.slice(0,3).map(taskRow).join(''):'')+(!overdue.length&&!dueToday.length?'<div class="empty">Nothing overdue or due today. You’re all caught up!</div>':'')+'</section>'+
 '<section class="panel"><div class="panel-head"><div><h2>Coming up</h2><p>Your next deadlines</p></div><button class="btn" type="button" data-goto="calendar">Open calendar ↗</button></div>'+(next.map(t=>'<div class="task-upcoming-row"><span class="task-upcoming-date">'+esc(new Date(t.dueDate+'T12:00:00').toLocaleDateString([],{month:'short',day:'numeric'}))+'</span><b>'+esc(t.title)+'</b><small>'+esc(t.priority||'Normal')+'</small></div>').join('')||'<div class="empty">No upcoming deadlines. Add a due date to a task.</div>')+'</section></div>'+
 '<section class="panel task-create-panel"><div class="panel-head"><div><h2>Create a task</h2><p>Add a deadline, subtasks, and an optional reminder.</p></div><span class="tag">QUICK CAPTURE</span></div><form id="veyraTaskCreate" class="task-create-grid"><label>Task title<input class="field" id="vtTitle" maxlength="120" required placeholder="What needs doing?"></label><label>Details<input class="field" id="vtDetail" maxlength="180" placeholder="Instructions or notes"></label><label>Due date<input class="field" id="vtDate" type="date" min="'+today+'"></label><label>Due time<input class="field" id="vtTime" type="time"></label><label>Priority<select class="field" id="vtPriority"><option>Normal</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Category<select class="field" id="vtCategory"><option>Personal</option><option>School</option><option>Projects</option><option>Other</option></select></label><label>Repeat<select class="field" id="vtRepeat"><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label class="task-reminder-check"><input id="vtReminder" type="checkbox"> Enable browser reminder<small>Alerts 10 minutes before the due time while VEYRA is open.</small></label><label class="task-subtask-field">Subtasks<textarea class="field" id="vtSubtasks" rows="3" maxlength="1200" placeholder="One step per line"></textarea></label><div class="task-create-actions"><button class="btn primary" type="submit">＋ Add task</button><button class="btn" type="button" data-goto="focus">Open Focus Timer</button></div></form></section>'+
 '<section class="panel"><div class="panel-head"><div><h2>All tasks</h2><p>'+open.length+' open · '+done.length+' completed</p></div><button class="btn" data-action="clear-done">Clear completed</button></div><div class="task-tools"><input class="field" id="veyraTaskSearch" type="search" placeholder="Search tasks…" aria-label="Search tasks"><select class="field" id="veyraTaskFilter"><option value="all">All tasks</option><option value="open">To do</option><option value="progress">In progress</option><option value="done">Completed</option><option value="overdue">Overdue</option><option value="high">High priority</option></select><div class="task-view-switch"><button type="button" data-task-view="list" class="'+(view==='list'?'active':'')+'">☷ List</button><button type="button" data-task-view="kanban" class="'+(view==='kanban'?'active':'')+'">▦ Board</button></div></div><div id="veyraTaskList" class="task-list" '+(view==='kanban'?'hidden':'')+'>'+list+'</div><div id="veyraTaskBoard" class="task-kanban" '+(view!=='kanban'?'hidden':'')+'>'+board+'</div></section></div>';
};

/* Keep the existing workspace handlers, then attach Task Center-only controls. */
const veyraOriginalWire = wire;
wire = function(){
 veyraOriginalWire();
 const form=$('#veyraTaskCreate');
 if(form)form.onsubmit=async e=>{
  e.preventDefault();
  const reminder=$('#vtReminder').checked;
  if(reminder&&'Notification'in window&&Notification.permission==='default'){
   const permission=await Notification.requestPermission();
   if(permission!=='granted')toast('Notifications were not enabled; the task will still be saved.');
  }
  const title=$('#vtTitle').value.trim();if(!title)return;
  const lines=$('#vtSubtasks').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,30);
  const subtasks=lines.map((text,i)=>({id:String(Date.now())+'-'+i,text,done:false}));
  tasks.unshift({id:Date.now()+Math.random(),title,detail:$('#vtDetail').value.trim(),dueDate:$('#vtDate').value,dueTime:$('#vtTime').value,priority:$('#vtPriority').value,category:$('#vtCategory').value,repeat:$('#vtRepeat').value,reminderEnabled:reminder,reminderSentAt:null,subtasks,done:false,inProgress:false,completedAt:null,tag:'TASK'});
  save('tasks',tasks);log('Added task: '+title);render();toast('Task added.');
 };
 const search=$('#veyraTaskSearch'),filter=$('#veyraTaskFilter');
 const apply=()=>{
  const q=(search?.value||'').trim().toLowerCase(),mode=filter?.value||'all';
  const match=t=>{const overdue=t.dueDate&&!t.done&&new Date(t.dueDate+'T'+(t.dueTime||'23:59')+':00')<new Date();return (mode==='all'||(mode==='open'&&!t.done&&!t.inProgress)||(mode==='progress'&&!t.done&&t.inProgress)||(mode==='done'&&t.done)||(mode==='overdue'&&overdue)||(mode==='high'&&t.priority==='High'))&&(t.title+' '+(t.detail||'')+' '+(t.category||'')).toLowerCase().includes(q)};
  ['veyraTaskList','veyraTaskBoard'].forEach(id=>{const root=document.getElementById(id);if(!root)return;root.querySelectorAll('.task').forEach(el=>{const t=tasks.find(x=>String(x.id)===el.querySelector('[data-task]')?.dataset.task);el.style.display=t&&match(t)?'flex':'none'})});
 };
 if(search)search.oninput=apply;if(filter)filter.onchange=apply;
 $$('[data-task-view]').forEach(b=>b.onclick=()=>{save('taskViewMode',b.dataset.taskView);render()});
 $$('[data-task-status]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>String(x.id)===b.dataset.taskStatus);if(!t)return;t.inProgress=!t.inProgress;save('tasks',tasks);log((t.inProgress?'Started: ':'Moved back to To Do: ')+t.title);render()});
 $$('[data-task-focus]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>String(x.id)===b.dataset.taskFocus);if(!t)return;focusState.goal=String(t.id);focusState.plan=t.title;save('focus',focusState);go('focus');toast('Focus task selected.')});
 $$('[data-task-calendar]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>String(x.id)===b.dataset.taskCalendar);if(!t?.dueDate){toast('Add a due date to this task first.');return}calendarSelectedDate=t.dueDate;const d=new Date(t.dueDate+'T12:00:00');calendarViewDate=new Date(d.getFullYear(),d.getMonth(),1);calendarViewMode='day';save('calendarViewMode',calendarViewMode);go('calendar')});
 $$('[data-subtask-task]').forEach(c=>c.onchange=()=>{const t=tasks.find(x=>String(x.id)===c.dataset.subtaskTask),sub=t?.subtasks?.find(x=>String(x.id)===c.dataset.subtaskId);if(!sub)return;sub.done=c.checked;save('tasks',tasks);log((sub.done?'Finished step: ':'Reopened step: ')+sub.text);render()});
 $$('[data-task-edit]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>String(x.id)===b.dataset.taskEdit);if(!t)return;const title=prompt('Task title:',t.title);if(title===null)return;if(!title.trim())return toast('Task title cannot be empty.');const detail=prompt('Details:',t.detail||'');if(detail===null)return;const date=prompt('Due date (YYYY-MM-DD, blank for none):',t.dueDate||'');if(date===null)return;if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return toast('Use YYYY-MM-DD for the date.');const time=prompt('Due time (HH:MM, blank for none):',t.dueTime||'');if(time===null)return;if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return toast('Use 24-hour time such as 15:30.');const priority=prompt('Priority (Low, Medium, Normal, High):',t.priority||'Normal');if(priority===null)return;const repeat=prompt('Repeat: none, daily, weekly, monthly:',t.repeat||'none');if(repeat===null)return;if(!['none','daily','weekly','monthly'].includes(repeat.toLowerCase()))return toast('Choose none, daily, weekly, or monthly.');t.title=title.trim().slice(0,120);t.detail=detail.trim().slice(0,180);t.dueDate=date;t.dueTime=time;t.priority=priority;t.repeat=repeat.toLowerCase();save('tasks',tasks);log('Edited task: '+t.title);render();toast('Task updated.')});
 $$('[data-task]').forEach(c=>c.onchange=()=>{const t=tasks.find(x=>String(x.id)===c.dataset.task);if(!t)return;t.done=c.checked;t.completedAt=t.done?new Date().toISOString():null;if(t.done&&t.repeat&&t.repeat!=='none'&&t.dueDate){const d=new Date(t.dueDate+'T12:00:00');if(t.repeat==='daily')d.setDate(d.getDate()+1);if(t.repeat==='weekly')d.setDate(d.getDate()+7);if(t.repeat==='monthly')d.setMonth(d.getMonth()+1);tasks.unshift({...t,id:Date.now()+Math.random(),dueDate:veyraTaskLocalDate(d),done:false,inProgress:false,completedAt:null,reminderSentAt:null,subtasks:(t.subtasks||[]).map(x=>({...x,done:false}))});toast('Next recurring task created.')}save('tasks',tasks);log((t.done?'Completed: ':'Reopened: ')+t.title);render()});
};

/* Browser reminders are checked only while this workspace tab is open. */
function veyraCheckTaskReminders(){
 if(!('Notification'in window)||Notification.permission!=='granted')return;
 const now=Date.now();let changed=false;
 tasks.forEach(t=>{
  if(!t.done&&t.reminderEnabled&&t.dueDate&&!t.reminderSentAt){
   const due=new Date(t.dueDate+'T'+(t.dueTime||'09:00')+':00').getTime(),alertAt=due-10*60*1000;
   if(now>=alertAt&&now<=due+60*60*1000){try{new Notification('VEYRA task reminder',{body:t.title+(t.dueTime?' · Due at '+t.dueTime:' · Due today')});t.reminderSentAt=new Date().toISOString();changed=true}catch{}}
  }
 });
 if(changed)save('tasks',tasks);
}
setInterval(veyraCheckTaskReminders,30000);
