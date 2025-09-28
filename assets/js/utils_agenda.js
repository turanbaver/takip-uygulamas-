/* Ajanda için yardımcı fonksiyonlar */
(function(global){

    // Tarih yardımcıları
    function pad(n){ return String(n).padStart(2,"0"); }
    function todayKey(d=new Date()){
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }
    function fmtDateHuman(iso){
      const [y,m,d] = iso.split("-");
      return `${d}.${m}.${y}`;
    }
  
    // Tablo üretici
    function buildTable(headers, rows){
      const table = document.createElement("table");
      table.className = "table table-dark table-striped table-hover align-middle mb-0";
      const thead = document.createElement("thead");
      const trh = document.createElement("tr");
      headers.forEach(h=>{
        const th = document.createElement("th");
        th.textContent = h;
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);
  
      const tbody = document.createElement("tbody");
      rows.forEach(r=>{
        const tr = document.createElement("tr");
        r.forEach(c=>{
          const td = document.createElement("td");
          td.textContent = c===undefined?"":String(c);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
  
      return table;
    }
  
    // Takvim üretici (aylık grid)
    function buildCalendar(year, month, agendaData){
      // month: 0-11
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month+1, 0);
      const weeks = [];
      let week = [];
  
      // boş kutular (ayın başına kadar)
      for(let i=0;i<firstDay.getDay();i++){
        week.push(null);
      }
  
      for(let d=1; d<=lastDay.getDate(); d++){
        const dateObj = new Date(year, month, d);
        const iso = todayKey(dateObj);
        const tasks = agendaData[iso] || [];
        week.push({ day:d, iso, tasks });
        if(week.length===7){
          weeks.push(week);
          week=[];
        }
      }
      if(week.length){
        while(week.length<7) week.push(null);
        weeks.push(week);
      }
      return weeks; // [[{}, {}, ...7], ...]
    }
  
    // --- CSV yardımcıları ---
    function toCsv(rows){
      return rows.map(r=> r.map(c=> `"${String(c??"").replace(/"/g,'""')}"`).join(",") ).join("\n");
    }
    function parseCsv(text){
      const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
      const rows = [];
      for(const line of lines){
        const cells = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
        rows.push(cells.map(x=>{
          let v = x.trim();
          if(v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1).replace(/""/g,'"');
          return v;
        }));
      }
      return rows;
    }
  
    // --- Dosya indirme/yükleme ---
    function downloadText(filename, text){
      const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href=url; a.download=filename; document.body.appendChild(a);
      a.click(); a.remove();
      URL.revokeObjectURL(url);
    }
    function downloadCSV(filename, rows){
      downloadText(filename, toCsv(rows));
    }
    function readFileAsText(file){
      return new Promise((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload = e=> resolve(e.target.result);
        reader.onerror = e=> reject(e);
        reader.readAsText(file, "utf-8");
      });
    }
  
    global.UtilsAgenda = {
      pad, todayKey, fmtDateHuman,
      buildTable, buildCalendar,
      toCsv, parseCsv,
      downloadText, downloadCSV, readFileAsText
    };
  
  })(window);
  