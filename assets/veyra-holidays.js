(() => {
  'use strict';
  const themes = [
    {id:'newyear',name:'New Year Edition',tag:'JANUARY • FRESH START',icon:'✦',colors:['#07111f','#101f35','#172c45','#36516d','#55b9ff','#9be4ff','#7b9cff','#7edfc0'],glow:'rgba(68,151,255,.20)',note:'A fresh start, a fresh workspace.'},
    {id:'winter',name:'Winter Edition',tag:'FEBRUARY • WINTER GLOW',icon:'❄',colors:['#071522','#0d2436','#14334a','#315c75','#68c9ef','#b7edff','#8caaff','#9ee8dc'],glow:'rgba(91,194,255,.20)',note:'Cool colors for the winter season.'},
    {id:'spring',name:'Spring Edition',tag:'MARCH • SPRING BLOOM',icon:'✿',colors:['#10152a','#20213c','#2b2b49','#595078','#c18bff','#8ee8dc','#e6a0d5','#8de1bc'],glow:'rgba(177,117,255,.19)',note:'A little color as spring arrives.'},
    {id:'bloom',name:'Spring Bloom Edition',tag:'APRIL • SPRING BLOOM',icon:'🌷',colors:['#10182a','#1c2940','#293b51','#526b80','#e58cb8','#a7e6d0','#d6a5ff','#9de0b7'],glow:'rgba(224,133,180,.18)',note:'Fresh spring colors and soft blooms.'},
    {id:'sunshine',name:'Sunshine Edition',tag:'MAY • SUNNY DAYS',icon:'☀',colors:['#17172a','#292744','#39344e','#65566b','#f4ad55','#ffe19a','#e98b73','#a9dba8'],glow:'rgba(245,166,79,.20)',note:'Warm sunshine tones for May.'},
    {id:'summer',name:'Summer Edition',tag:'JUNE • SUMMER MODE',icon:'☼',colors:['#071a2a','#0c2a3d','#12394d','#2a6272','#32c5cf','#8be8d2','#63aaff','#b5e6a0'],glow:'rgba(44,201,202,.20)',note:'Bright ocean colors for summer.'},
    {id:'independence',name:'Summer Celebration Edition',tag:'JULY • SUMMER CELEBRATION',icon:'★',colors:['#170f20','#28152a','#3a1d35','#63364c','#ef6477','#ffb5a7','#73aaff','#f5d17a'],glow:'rgba(239,91,112,.19)',note:'A red, white, and blue summer celebration.'},
    {id:'backtoschool',name:'Back to School Edition',tag:'AUGUST • READY TO LEARN',icon:'✎',colors:['#11172a','#1d2942','#293a55','#4d6480','#5da7ff','#a5d8ff','#a78bfa','#7bd8c0'],glow:'rgba(79,149,255,.18)',note:'A fresh setup for a new school year.'},
    {id:'autumn',name:'Autumn Edition',tag:'SEPTEMBER • AUTUMN ARRIVES',icon:'🍁',colors:['#1b1515','#2b201c','#3a2b23','#655044','#d18a4c','#f2bd76','#c66c4b','#b7b77a'],glow:'rgba(211,132,65,.19)',note:'Warm autumn colors arrive at VEYRA.'},
    {id:'halloween',name:'Halloween Edition',tag:'OCTOBER • SPOOKY SEASON',icon:'🎃',colors:['#100d1b','#21152c','#30203d','#59406c','#b46bff','#ff9b4a','#e37bff','#8ed5b7'],glow:'rgba(167,88,255,.22)',note:'A little spooky, a lot of style.'},
    {id:'thanksgiving',name:'Thanksgiving Edition',tag:'NOVEMBER • THANKSGIVING',icon:'🍂',colors:['#1a1009','#29180d','#3b2414','#67432a','#e58a32','#ffc16b','#d56b37','#b7b66e'],glow:'rgba(229,126,42,.23)',note:'Warm autumn colors for the season of gratitude.'},
    {id:'christmas',name:'Christmas Edition',tag:'DECEMBER • CHRISTMAS SPECIAL',icon:'🎄',colors:['#07150f','#0d2419','#123424','#28543b','#e34d5b','#65d99a','#f0c66e','#a8e7c4'],glow:'rgba(44,184,111,.22)',note:'Festive evergreen, cranberry, and winter-gold accents.'}
  ];
  const root = document.documentElement;
  let active = '';
  const base = Object.fromEntries(['bg','panel','panel2','line','blue','cyan','purple','good'].map(k => [k, getComputedStyle(root).getPropertyValue('--'+k).trim()]));
  function apply() {
    const enabled = typeof settings !== 'undefined' && !!settings.holidaySpecial;
    if (!enabled) {
      if (!active) return;
      active = '';
      delete document.body.dataset.holiday;
      delete root.dataset.holiday;
      ['bg','panel','panel2','line','blue','cyan','purple','good'].forEach(k => root.style.setProperty('--'+k, base[k]));
      root.style.removeProperty('--holiday-glow');
      document.getElementById('holidayRibbon')?.remove();
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', base.bg);
      return;
    }
    const t = themes[new Date().getMonth()];
    if (!t) return;
    if (active === t.id) return;
    active = t.id;
    document.body.dataset.holiday = t.id;
    root.dataset.holiday = t.id;
    ['bg','panel','panel2','line','blue','cyan','purple','good'].forEach((k,i) => root.style.setProperty('--'+k, t.colors[i]));
    root.style.setProperty('--holiday-glow', t.glow);
    let ribbon = document.getElementById('holidayRibbon');
    if (!ribbon) {
      ribbon = document.createElement('div');
      ribbon.id = 'holidayRibbon';
      ribbon.className = 'holiday-ribbon';
      ribbon.setAttribute('role', 'status');
      const main = document.querySelector('.main');
      const page = document.getElementById('page');
      if (main && page) main.insertBefore(ribbon, page);
    }
    ribbon.innerHTML = '<span class="holiday-ribbon-icon" aria-hidden="true">' + t.icon + '</span><span class="holiday-ribbon-copy"><b>' + t.name + '</b><small>' + t.note + '</small></span><span class="holiday-ribbon-tag">' + t.tag + '</span>';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.colors[0]);
  }
  if (typeof render === 'function') {
    const originalRender = render;
    render = function(...args) { const result = originalRender.apply(this, args); apply(); return result; };
  }
  apply();
  window.setInterval(apply, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
})();