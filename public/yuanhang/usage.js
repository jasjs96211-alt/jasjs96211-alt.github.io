/* Shortcuts log import. No network requests; the user chooses the source file. */
'use strict';
const YuanhangUsage = (() => {
  const LIMIT = 10000, MAX_BYTES = 2 * 1024 * 1024;
  function timestamp(text) {
    if (typeof text !== 'string') return NaN;
    const m = text.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);
    if (!m || +m[2] > 23 || +m[3] > 59 || +m[4] > 59) return NaN;
    const day = new Date(m[1] + 'T00:00:00Z');
    if (!Number.isFinite(+day) || day.toISOString().slice(0,10) !== m[1]) return NaN;
    if (m[6] !== 'Z' && (+m[6].slice(1,3) > 14 || +m[6].slice(4) > 59 || (+m[6].slice(1,3) === 14 && +m[6].slice(4) !== 0))) return NaN;
    return Date.parse(text);
  }
  function key(app, start) { return app + '@' + new Date(start).toISOString(); }
  function validRecord(x) {
    return !!x && x.app === '三角洲行动' && Number.isFinite(timestamp(x.start)) &&
      Number.isFinite(x.minutes) && x.minutes >= 0 && x.minutes <= 1440 &&
      x.id === key(x.app, x.start) && (x.excluded === undefined || typeof x.excluded === 'boolean');
  }
  function validRecords(rows) {
    return Array.isArray(rows) && rows.length <= LIMIT && rows.every(validRecord) && new Set(rows.map(x=>x.id)).size === rows.length;
  }
  function parse(text, now = Date.now()) {
    if (typeof text !== 'string' || text.length > MAX_BYTES) throw Error('文件过大，请选择不超过 2 MB 的记录文件。');
    const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
    const rows = [], errors = [];
    let nonempty = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      if (++nonempty > LIMIT) throw Error('记录超过 10000 行，请分批整理后导入。');
      const parts = lines[i].trim().split(/[|｜]/).map(x=>x.trim());
      const duration = parts[2]?.match(/^(\d+(?:[.,]\d+)?)\s*分钟$/);
      const start = timestamp(parts[1]), minutes = duration ? Number(duration[1].replace(',', '.')) : NaN;
      if (parts.length !== 3 || parts[0] !== '三角洲行动' || !Number.isFinite(start) ||
          !Number.isFinite(minutes) || minutes < 0 || minutes > 1440 || start + minutes * 60000 > now + 300000) {
        errors.push({line:i+1, reason:'需为三角洲行动、含时区的开始时间和 0–1440 分钟，且不能在未来'});
        continue;
      }
      rows.push({id:key(parts[0],start), app:parts[0], start:new Date(start).toISOString(), minutes});
    }
    return {rows, errors};
  }
  // Keep the first duration for the same launch; a later manual rerun must not inflate it.
  function merge(existing, incoming) {
    const records = [...existing], seen = new Map(existing.map(x=>[x.id,x]));
    let added = 0, duplicates = 0, conflicts = 0;
    for (const row of incoming) {
      const old = seen.get(row.id);
      if (old) { if (Math.abs(old.minutes-row.minutes) > 0.000001) conflicts++; else duplicates++; continue; }
      if (records.length >= LIMIT) throw Error('已达 10000 条记录上限，请先导出备份。');
      records.push(row); seen.set(row.id,row); added++;
    }
    return {records, added, duplicates, conflicts};
  }
  // Intersect with Beijing calendar days and union overlapping intervals.
  function minutesBetween(rows, firstDay, lastDay = firstDay) {
    const lo = Date.parse(firstDay+'T00:00:00+08:00'), hi = Date.parse(lastDay+'T00:00:00+08:00')+86400000;
    const intervals = rows.filter(x=>!x.excluded).map(x=>[Math.max(lo,Date.parse(x.start)), Math.min(hi,Date.parse(x.start)+x.minutes*60000)])
      .filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
    let end = -Infinity, total = 0;
    for (const [a,b] of intervals) { if (b>end) { total += b-Math.max(a,end); end=b; } }
    return Math.round(total/6000)/10;
  }
  function touchesDay(x, day) {
    const lo=Date.parse(day+'T00:00:00+08:00'), hi=lo+86400000, start=Date.parse(x.start);
    return start<hi && (x.minutes===0 ? start>=lo : start+x.minutes*60000>lo);
  }
  function fromFragment(hash, now = Date.now()) {
    if (typeof hash !== 'string' || !hash.startsWith('#usage=')) return null;
    if (hash.length > 4096) throw Error('链接过长，请用 TXT 文件导入历史记录。');
    let text;
    try {
      const encoded = decodeURIComponent(hash.slice(7)).replace(/\s/g,'').replace(/-/g,'+').replace(/_/g,'/');
      if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw Error();
      const bytes = Uint8Array.from(atob(encoded), c=>c.charCodeAt(0));
      text = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    } catch { throw Error('链接内容无法解码，请检查 Base64 编码操作及 URL 中的变量。'); }
    const parsed = parse(text, now);
    if (parsed.errors.length || parsed.rows.length !== 1) throw Error('链接需携带一条完整的本次记录；历史记录请用 TXT 文件导入。');
    return parsed;
  }
  return {MAX_BYTES, parse, merge, validRecords, minutesBetween, touchesDay, fromFragment};
})();
