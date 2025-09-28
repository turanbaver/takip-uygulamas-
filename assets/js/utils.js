/* Tarih formatı, tablo oluşturma, CSV/JSON indirme-yükleme */
(function (global) {
    function fmtDateHuman(iso) {
      // "YYYY-MM-DD" -> "DD.MM.YYYY"
      const [y, m, d] = iso.split("-");
      return `${d}.${m}.${y}`;
    }
  
    // CSV yardımcıları
    function toCsv(rows) {
      return rows
        .map((r) =>
          r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");
    }
    function parseCsv(text) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rows = [];
      for (const line of lines) {
        const cells = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
        rows.push(
          cells.map((x) => {
            let v = x.trim();
            if (v.startsWith('"') && v.endsWith('"'))
              v = v.slice(1, -1).replace(/""/g, '"');
            return v;
          })
        );
      }
      return rows;
    }
  
    // Dosya indirme/yükleme
    function downloadText(filename, text) {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    const downloadCSV = (filename, rows) => downloadText(filename, toCsv(rows));
  
    function readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, "utf-8");
      });
    }
  
    // Basit table builder (Bootstrap .table ile kullanılacak)
    function buildTable(headers, rows) {
      const table = document.createElement("table");
      table.className = "table table-dark table-striped table-hover align-middle mb-0";
  
      const thead = document.createElement("thead");
      const trh = document.createElement("tr");
      headers.forEach((h) => {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = h;
        trh.appendChild(th);
      });
      thead.appendChild(trh);
  
      const tbody = document.createElement("tbody");
      rows.forEach((r) => {
        const tr = document.createElement("tr");
        r.forEach((c) => {
          const td = document.createElement("td");
          td.textContent = c ?? "";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
  
      table.appendChild(thead);
      table.appendChild(tbody);
      return table;
    }
  
    global.Utils = {
      fmtDateHuman,
      toCsv,
      parseCsv,
      downloadText,
      downloadCSV,
      readFileAsText,
      buildTable,
    };
  })(window);
  