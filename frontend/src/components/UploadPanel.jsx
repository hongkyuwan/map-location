import { useState } from "react";
import * as XLSX from "xlsx";
import { api } from "../api/client";

/* v1(index.html)의 헤더 행 자동 추정 + 컬럼 미리보기 로직을 그대로 이식.
   헤더가 1행이 아닌 엑셀(빈 행, 제목 행이 앞서 있는 경우)에 대응하기 위해
   원본을 2차원 배열로 읽고 사용자가 지정한 행을 헤더로 재구성한다. */
export default function UploadPanel({ onDatasetCreated }) {
  const [rawRows, setRawRows] = useState([]);
  const [headerRow, setHeaderRow] = useState(1);
  const [sheetRows, setSheetRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [addrCol, setAddrCol] = useState("");
  const [nameCol, setNameCol] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState([]);
  const [converting, setConverting] = useState(false);

  function buildSheetRows(rows, headerRowNum) {
    const idx = headerRowNum - 1;
    if (idx < 0 || idx >= rows.length) return { headers: [], data: [] };
    const hdrs = rows[idx].map((h, i) => {
      const text = String(h ?? "").trim();
      return text || `컬럼${i + 1}`;
    });
    const data = rows
      .slice(idx + 1)
      .filter((r) => r.some((cell) => String(cell ?? "").trim() !== ""))
      .map((r) => {
        const obj = {};
        hdrs.forEach((h, i) => (obj[h] = r[i] ?? ""));
        return obj;
      });
    return { headers: hdrs, data };
  }

  function applyHeaderRow(rows, headerRowNum) {
    const { headers: hdrs, data } = buildSheetRows(rows, headerRowNum);
    setHeaders(hdrs);
    setSheetRows(data);

    if (data.length === 0) {
      setStatus("이 행 아래에 데이터가 없습니다. 헤더 행 번호를 확인해주세요.");
      return;
    }

    const addrGuess = hdrs.find((h) => h.includes("주소"));
    const nameGuess = hdrs.find((h) => /이름|명칭|거래처|상호|현장/.test(h));
    setAddrCol(addrGuess || hdrs[0]);
    setNameCol(nameGuess || "");
    setStatus(`${data.length}개 행을 읽었습니다. (헤더: ${headerRowNum}행)`);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setDatasetName(file.name.replace(/\.[^./]+$/, ""));

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (rows.length === 0) {
        alert("데이터가 없습니다.");
        return;
      }
      setRawRows(rows);

      let guessRow = 1;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        if (rows[i].some((cell) => String(cell).includes("주소"))) {
          guessRow = i + 1;
          break;
        }
      }
      setHeaderRow(guessRow);
      applyHeaderRow(rows, guessRow);
    };
    reader.readAsBinaryString(file);
  }

  function handleHeaderRowChange(e) {
    const num = parseInt(e.target.value, 10) || 1;
    setHeaderRow(num);
    applyHeaderRow(rawRows, num);
  }

  function preview(col) {
    if (!col || sheetRows.length === 0) return "";
    return sheetRows
      .slice(0, 3)
      .map((r) => String(r[col] || "(빈 값)"))
      .join(" / ");
  }

  async function handleConvert() {
    if (sheetRows.length === 0) {
      alert("먼저 엑셀 파일을 업로드해주세요.");
      return;
    }
    setConverting(true);
    setProgress(0);
    setStatus("변환 요청 중... (서버에서 지오코딩 처리)");
    setFailed([]);

    const rows = sheetRows.map((r) => ({
      address: String(r[addrCol] || "").trim(),
      label: nameCol ? String(r[nameCol] || "") : "",
    }));

    const name = datasetName.trim() || fileName || `문서_${new Date().toLocaleString()}`;
    setDatasetName(name);

    try {
      const dataset = await api.createDataset(name, rows);
      const okCount = dataset.items.filter((i) => i.ok).length;
      const failItems = dataset.items.filter((i) => !i.ok);
      setFailed(failItems);
      setProgress(100);
      setStatus(`변환 완료: ${okCount}개 표시, ${failItems.length}개 실패 · "${name}"로 저장됨`);
      onDatasetCreated(dataset);
    } catch (err) {
      setStatus(`변환 실패: ${err.message}`);
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="card">
      <h2>2. 엑셀 업로드</h2>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />

      <label className="hint">헤더(제목)가 있는 행 번호</label>
      <input type="number" min="1" value={headerRow} onChange={handleHeaderRowChange} />
      {rawRows[headerRow - 1] && (
        <div className="hint" style={{ marginBottom: 8 }}>
          <b>이 행 내용</b>: {rawRows[headerRow - 1].map((c) => String(c || "(빈칸)")).join(" | ")}
        </div>
      )}

      <label className="hint">주소 컬럼</label>
      <select value={addrCol} onChange={(e) => setAddrCol(e.target.value)}>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      {addrCol && (
        <div className="hint" style={{ marginBottom: 8 }}>
          <b>미리보기</b>: {preview(addrCol)}
        </div>
      )}

      <label className="hint">표시 이름 컬럼 (선택)</label>
      <select value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
        <option value="">(없음)</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      {nameCol && (
        <div className="hint" style={{ marginBottom: 8 }}>
          <b>미리보기</b>: {preview(nameCol)}
        </div>
      )}

      <label className="hint">데이터셋 이름</label>
      <input
        type="text"
        placeholder="예: 8월 방문지 목록"
        value={datasetName}
        onChange={(e) => setDatasetName(e.target.value)}
      />

      <button onClick={handleConvert} disabled={converting || sheetRows.length === 0}>
        지도에 표시 (자동 저장)
      </button>
      <div className="progress-bar">
        <div style={{ width: `${progress}%` }} />
      </div>
      <div className="status">{status}</div>

      {failed.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="hint">
            <b>❌ 변환 실패 주소</b>
          </div>
          <div className="fail-list">
            {failed.map((f, i) => (
              <div key={i}>
                {f.label ? `${f.label} - ` : ""}
                {f.address}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
