/* Ajanda için localStorage tabanlı veri katmanı */
(function(global){
    const KEY = "takip_programi_agenda_v1";
  
    // Yükleme & Kaydetme
    function load(){
      try {
        return JSON.parse(localStorage.getItem(KEY)) || { agenda: {} };
      } catch {
        return { agenda: {} };
      }
    }
    function save(db){
      localStorage.setItem(KEY, JSON.stringify(db));
    }
  
    let db = load();
  
    // Yardımcılar
    const todayKey = (d=new Date())=>{
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
      return `${y}-${m}-${day}`;
    };
    const uid = ()=> "a"+Math.random().toString(36).slice(2,10);
  
    // ---- Günlük görevler ----
    function listAgenda(dateKey){
      return (db.agenda[dateKey] || []).map(x=>({...x}));
    }
  
    function addAgenda(dateKey, item){
      const it = {
        id: uid(),
        title: String(item.title||"").trim(),
        time: item.time || "",
        note: item.note || "",
        priority: item.priority || "normal", // düşük / normal / yüksek
        done: !!item.done,
        created: Date.now()
      };
      if(!db.agenda[dateKey]) db.agenda[dateKey] = [];
      db.agenda[dateKey].push(it);
      save(db);
      return it.id;
    }
  
    function toggleAgenda(dateKey, itemId, done){
      const arr = db.agenda[dateKey] || [];
      const it = arr.find(x=>x.id===itemId); if(!it) return;
      it.done = (done===undefined) ? !it.done : !!done;
      save(db);
    }
  
    function updateAgenda(dateKey, itemId, patch){
      const arr = db.agenda[dateKey] || [];
      const it = arr.find(x=>x.id===itemId); if(!it) return;
      Object.assign(it, patch||{});
      save(db);
    }
  
    function removeAgenda(dateKey, itemId){
      const arr = db.agenda[dateKey] || [];
      db.agenda[dateKey] = arr.filter(x=>x.id!==itemId);
      save(db);
    }
  
    // ---- Tüm günler / tablo için ----
    function getAllAgenda(){
      return db.agenda;
    }
  
    // ---- Export / Import ----
    function exportAgendaJSON(){
      return JSON.stringify({ agenda: db.agenda }, null, 2);
    }
  
    function importAgendaJSON(text){
      const obj = JSON.parse(text);
      if(obj.agenda && typeof obj.agenda==="object"){
        Object.entries(obj.agenda).forEach(([day, items])=>{
          if(!db.agenda[day]) db.agenda[day] = [];
          (items||[]).forEach(item=>{
            const exist = db.agenda[day].find(x=>x.id===item.id);
            if(exist) Object.assign(exist, item);
            else db.agenda[day].push(item);
          });
        });
        save(db);
      }
    }
  
    function exportAgendaCSV(){
      // sütunlar: date, time, title, note, priority, done
      const rows = [["date","time","title","note","priority","done"]];
      Object.keys(db.agenda).sort().forEach(day=>{
        (db.agenda[day]||[]).forEach(it=>{
          rows.push([day, it.time||"", it.title||"", it.note||"", it.priority||"", it.done?1:0]);
        });
      });
      return rows;
    }
  
    function importAgendaCSV(rows){
      if(!rows || rows.length<2) return;
      const header = rows[0].map(x=>String(x||"").toLowerCase());
      const cDate = header.indexOf("date");
      const cTime = header.indexOf("time");
      const cTitle = header.indexOf("title");
      const cNote = header.indexOf("note");
      const cPriority = header.indexOf("priority");
      const cDone = header.indexOf("done");
  
      for(let i=1;i<rows.length;i++){
        const r = rows[i]; if(!r || !r.length) continue;
        const day = r[cDate];
        const item = {
          id: uid(),
          title: r[cTitle]||"",
          time: cTime>=0 ? (r[cTime]||"") : "",
          note: cNote>=0 ? (r[cNote]||"") : "",
          priority: cPriority>=0 ? (r[cPriority]||"normal") : "normal",
          done: cDone>=0 ? (String(r[cDone]).trim()=="1") : false
        };
        if(!db.agenda[day]) db.agenda[day] = [];
        db.agenda[day].push(item);
      }
      save(db);
    }
  
    global.StoreAgenda = {
      todayKey,
      listAgenda,
      addAgenda,
      toggleAgenda,
      updateAgenda,
      removeAgenda,
      getAllAgenda,
  
      exportAgendaJSON,
      importAgendaJSON,
      exportAgendaCSV,
      importAgendaCSV,
    };
  
  })(window);
  