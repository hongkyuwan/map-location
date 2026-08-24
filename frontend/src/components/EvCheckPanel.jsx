import { useState } from "react";
import * as XLSX from "xlsx";
import { api } from "../api/client";

export default function EvCheckPanel({ currentDataset, onChecked }) {
  const [rawRows, setRawRows] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [encoding, setEncoding] = useState("utf8");
  const [headers, setHeaders] = useState([]);
  const [addrCol, setAddrCol] = useState("");
  const [nameCol, setNameCol] = useState("");
  const [loadStatus, setLoadStatus] = useState("");
  const [checkStatus, setCheckStatus] = useState("");
  const [checking, setChecking] = useState(false);

  function parseFile(data, enc) {
    const opts = { type: "binary" };
    if (enc === "949") opts.codepage = 949;
    const wb = XLSX.read(data, opts);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rows.length === 0) {
      setLoadStatus("데이터가 없습니다.");
      return;
    }
    const hdrs = Object.keys(rows[0]);
    setHeaders(hdrs);
    setRawRows(rows);

    const addrGuess = hdrs.find((h) => h.includes("주소"));
    const nameGuess = hdrs.find((h) => /충전소명|시설명|명칭|충전소/.test(h));
    setAddrCol(addrGuess || hdrs[0]);
    setNameCol(nameGuess || "");
    setLoadStatus(`${rows.length}행을 읽었습니다. 컬럼과 미리보기를 확인 후 "충전소 데이터로 저장"을 눌러주세요.`);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setRawData(evt.target.result);
      parseFile(evt.target.result, encoding);
    };
    reader.readAsBinaryString(file);
  }

  function handleEncodingChange(e) {
    const enc = e.target.value;
    setEncoding(enc);
    if (rawData) parseFile(rawData, enc);
  }

  function preview(col) {
    if (!col || rawRows.length === 0) return "(없음)";
    return rawRows
      .slice(0, 2)
      .map((r) => String(r[col] ?? ""))
      .join(" / ");
  }

  async function handleSave() {
    if (rawRows.length === 0) {
      alert("먼저 충전소 CSV/엑셀 파일을 업로드해주세요.");
      return;
    }
    if (!addrCol) {
      alert("충전소 주소 컬럼을 선택해주세요.");
      return;
    }
    const stations = rawRows
      .map((r) => ({ address: String(r[addrCol] || "").trim(), name: nameCol ? String(r[nameCol] || "") : "" }))
      .filter((s) => s.address);

    if (stations.length === 0) {
      setLoadStatus("유효한 주소 값을 찾지 못했습니다. 컬럼 선택 또는 인코딩을 확인해주세요.");
      return;
    }

    const { count } = await api.replaceEvStations(stations);
    setLoadStatus(`충전소 ${count}건 저장 완료 (예: ${stations[0].name || "이름 없음"} - ${stations[0].address})`);
  }

  async function handleCheck() {
    if (!currentDataset) {
      setCheckStatus("지도에 표시된 현장이 없습니다. 먼저 변환하거나 문서를 불러와주세요.");
      return;
    }
    setChecking(true);
    try {
      const result = await api.evCheckDataset(currentDataset.id);
      setCheckStatus(
        `충전소 ${result.totalStations}건 기준 · ${result.checkedItems}개 현장 중 ${result.matched}곳 동일 도로명 인근 충전소 있음`
      );
      const updated = await api.getDataset(currentDataset.id);
      onChecked(updated);
    } catch (err) {
      setCheckStatus(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="card">
      <h2>⚡ 전기차 충전소 확인</h2>
      <div className="hint" style={{ marginBottom: 8 }}>
        <a href="https://www.data.go.kr/data/15013115/standard.do" target="_blank" rel="noreferrer">
          공공데이터포털
        </a>
        에서 내려받은 전기차 충전소 CSV(또는 엑셀) 파일을 업로드하세요.
      </div>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />

      <label className="hint">파일 인코딩 (미리보기 글자가 깨지면 변경)</label>
      <select value={encoding} onChange={handleEncodingChange}>
        <option value="utf8">UTF-8 (기본)</option>
        <option value="949">EUC-KR / CP949</option>
      </select>

      <label className="hint">충전소 주소 컬럼</label>
      <select value={addrCol} onChange={(e) => setAddrCol(e.target.value)}>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      <label className="hint">충전소명 컬럼 (선택)</label>
      <select value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
        <option value="">(없음)</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      {headers.length > 0 && (
        <div className="hint" style={{ marginBottom: 8 }}>
          <b>미리보기</b> 주소: {preview(addrCol)} · 이름: {preview(nameCol)}
        </div>
      )}

      <button onClick={handleSave}>충전소 데이터로 저장</button>
      <div className="hint" style={{ margin: "6px 0 10px" }}>{loadStatus}</div>

      <button onClick={handleCheck} disabled={checking}>
        지도에 표시된 현장 충전소 확인
      </button>
      <div className="status">{checkStatus}</div>
      <div className="hint" style={{ marginTop: 8 }}>
        좌표 대신 주소 텍스트(동·도로명·건물번호)로 근접 여부를 판정합니다.
      </div>
    </div>
  );
}
