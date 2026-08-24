import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function DatasetList({ refreshKey, onDatasetLoaded }) {
  const [datasets, setDatasets] = useState([]);
  const [busyId, setBusyId] = useState(null);

  async function refresh() {
    try {
      const list = await api.listDatasets();
      setDatasets(list);
    } catch {
      // 목록 갱신 실패는 조용히 무시 (다음 갱신 때 재시도)
    }
  }

  useEffect(() => {
    refresh();
  }, [refreshKey]);

  async function handleLoad(id) {
    setBusyId(id);
    try {
      const dataset = await api.getDataset(id);
      onDatasetLoaded(dataset, `"${dataset.name}" 불러옴 (재변환 없이 저장된 좌표 사용)`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReconvert(id) {
    setBusyId(id);
    try {
      const dataset = await api.reconvertDataset(id);
      onDatasetLoaded(dataset, `"${dataset.name}" 재변환 완료`);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`"${name}" 문서를 삭제하시겠습니까?\n(마커에 남긴 메모/사진은 삭제되지 않습니다)`)) return;
    setBusyId(id);
    try {
      await api.deleteDataset(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card">
      <h2>📂 저장된 문서</h2>
      {datasets.length === 0 ? (
        <div className="hint">저장된 문서가 없습니다.</div>
      ) : (
        datasets.map((ds) => (
          <div className="saved-item" key={ds.id}>
            <div className="saved-item-info">
              <b>{ds.name}</b>
              <div className="hint">
                {ds.okCount}/{ds.itemCount}개 표시 · {new Date(ds.updatedAt).toLocaleString()}
              </div>
            </div>
            <div className="saved-item-actions">
              <button className="load-btn" disabled={busyId === ds.id} onClick={() => handleLoad(ds.id)}>
                불러오기
              </button>
              <button className="update-btn" disabled={busyId === ds.id} onClick={() => handleReconvert(ds.id)}>
                재변환
              </button>
              <button className="delete-btn" disabled={busyId === ds.id} onClick={() => handleDelete(ds.id, ds.name)}>
                삭제
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
