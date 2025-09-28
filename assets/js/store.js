/* Basit localStorage veri katmanı (sayaçlar) */
(function (global) {
    const KEY = "takip_programi_v1";
  
    function load() {
      try {
        return JSON.parse(localStorage.getItem(KEY)) || { tasks: {}, counts: {} };
      } catch {
        return { tasks: {}, counts: {} };
      }
    }
    function save(db) {
      localStorage.setItem(KEY, JSON.stringify(db));
    }
  
    let db = load();
  
    // yardımcılar
    const todayKey = (d = new Date()) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const uid = () => "t" + Math.random().toString(36).slice(2, 10);
  
    // görevler
    function addTask(name, min = 0) {
      const id = uid();
      db.tasks[id] = { 
        name: String(name || "").trim(), 
        min: Number(min) || 0,   // günlük minimum hedef
        created: Date.now() 
      };
      save(db);
      return id;
    }
    function listTasks() {
      return Object.entries(db.tasks)
        .map(([id, t]) => ({ id, ...t }))
        .sort((a, b) => a.created - b.created);
    }
    function getTask(id) {
      return db.tasks[id] || null;
    }
    
    function removeTask(id){
        // görev sözlüğünden sil
        delete db.tasks[id];
        // tüm günlerdeki sayaçlardan sil
        Object.keys(db.counts).forEach(date=>{
          if(db.counts[date] && db.counts[date][id] !== undefined){
            delete db.counts[date][id];
          }
        });
        save(db);
      }
    // sayaç (günlük)
    function getTodayCount(id) {
      return db.counts[todayKey()]?.[id] || 0;
    }
    function setTodayCount(id, val) {
      const k = todayKey();
      if (!db.counts[k]) db.counts[k] = {};
      db.counts[k][id] = Math.max(0, Number(val) || 0);
      save(db);
    }
    function incToday(id, delta = 1) {
      setTodayCount(id, getTodayCount(id) + delta);
    }
  
    // export/import
    function exportCountersJSON() {
      return JSON.stringify({ tasks: db.tasks, counts: db.counts }, null, 2);
    }
    function importCountersJSON(text) {
      const obj = JSON.parse(text);
      if (obj.tasks && typeof obj.tasks === "object") {
        // eski görevlerde min yoksa ekleyelim
        Object.entries(obj.tasks).forEach(([id, t])=>{
          if(typeof t.min === "undefined") t.min = 0;
        });
        db.tasks = { ...db.tasks, ...obj.tasks };
      }
      if (obj.counts && typeof obj.counts === "object") {
        db.counts = { ...db.counts, ...obj.counts };
      }
      save(db);
    }
    function exportCountersCSV() {
      const ids = Object.keys(db.tasks);
      const header = ["date", ...ids.map((id) => db.tasks[id].name)];
      const dates = Object.keys(db.counts).sort();
      const rows = [header];
      dates.forEach((date) => {
        const row = [date];
        ids.forEach((id) =>
          row.push(db.counts[date]?.[id] ? db.counts[date][id] : 0)
        );
        rows.push(row);
      });
      return rows;
    }
    function importCountersCSV(rows) {
      if (!rows || !rows.length) return;
      const header = rows[0];
      if ((header[0] || "").toLowerCase() !== "date") {
        throw new Error("CSV ilk sütun 'date' olmalı");
      }
      const names = header.slice(1);
  
      // eksik görev adlarını yarat
      names.forEach((n) => {
        const exists = Object.values(db.tasks).some((t) => t.name === n);
        if (!exists) {
          const id = uid();
          db.tasks[id] = { name: n, min: 0, created: Date.now() };
        }
      });
  
      const nameToId = {};
      Object.entries(db.tasks).forEach(([id, t]) => (nameToId[t.name] = id));
  
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.length) continue;
        const date = r[0];
        if (!db.counts[date]) db.counts[date] = {};
        for (let c = 1; c < r.length; c++) {
          const name = names[c - 1];
          const id = nameToId[name];
          const val = Number(r[c]) || 0;
          db.counts[date][id] = val;
        }
      }
      save(db);
    }
  
    global.Store = {
      addTask,
      listTasks,
      getTask,
      removeTask, 
      getTodayCount,
      setTodayCount,
      incToday,
      exportCountersJSON,
      importCountersJSON,
      exportCountersCSV,
      importCountersCSV,
    };
  })(window);
  