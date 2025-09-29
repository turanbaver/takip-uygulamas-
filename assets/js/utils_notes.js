/* assets/js/utils_notes.js
   Notlar için yardımcı fonksiyonlar:
   - Tarih formatlama
   - CSV parse & build
   - Dosya indirme & okuma
   - Kartlarda özetleme, highlight
*/
(function(global){
    "use strict";
  
    // -----------------------------
    // Tarih formatlama
    // -----------------------------
    function fmtDateHuman(isoOrTs){
      let d;
      if(!isoOrTs) return "";
      if(typeof isoOrTs === "number"){
        d = new Date(isoOrTs);
      } else {
        d = new Date(String(isoOrTs));
      }
      if(isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2,"0");
      const mon = String(d.getMonth()+1).padStart(2,"0");
      const y = d.getFullYear();
      return `${day}.${mon}.${y}`;
    }
  
    function fmtDateTimeHuman(ts){
      const d = new Date(ts);
      if(isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2,"0");
      const mon = String(d.getMonth()+1).padStart(2,"0");
      const y = d.getFullYear();
      const hh = String(d.getHours()).padStart(2,"0");
      const mm = String(d.getMinutes()).padStart(2,"0");
      return `${day}.${mon}.${y} ${hh}:${mm}`;
    }
  
    // -----------------------------
    // CSV yardımcıları
    // -----------------------------
    function toCsv(rows){
      return rows.map(r=>
        r.map(c=> `"${String(c??"").replace(/"/g,'""')}"`).join(",")
      ).join("\n");
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
  
    // -----------------------------
    // Dosya indirme / yükleme
    // -----------------------------
    function downloadText(filename, text){
      const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
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
  
    // -----------------------------
    // Kart özetleme
    // -----------------------------
    function summarizeText(text, maxLen=120){
      if(!text) return "";
      let s = text.trim().replace(/\s+/g," ");
      if(s.length > maxLen) s = s.slice(0,maxLen-3) + "...";
      return s;
    }
  
    // -----------------------------
    // Highlight arama kelimesi
    // -----------------------------
    function highlight(text, query){
      if(!query) return text;
      const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); // regex escape
      if(!q) return text;
      const regex = new RegExp(`(${q})`,"gi");
      return text.replace(regex, "<mark>$1</mark>");
    }
  
    // -----------------------------
    // Public API
    // -----------------------------
    global.UtilsNotes = {
      fmtDateHuman,
      fmtDateTimeHuman,
      toCsv,
      parseCsv,
      downloadText,
      downloadCSV,
      readFileAsText,
      summarizeText,
      highlight
    };
  
  })(window);
  