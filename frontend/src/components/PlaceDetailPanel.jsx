import { useEffect, useRef, useState } from "react";
import { api, fetchAuthedBlob } from "../api/client";

/* 사진은 JWT 인증이 필요해서 <img src> 로 바로 못 불러온다 (브라우저가 img 요청엔 커스텀 헤더를 못 붙임).
   fetch로 인증 후 blob URL을 만들어 사용한다. */
function PhotoThumb({ photo, onDelete }) {
  const [url, setUrl] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl;
    fetchAuthedBlob(api.photoUrl(photo.id)).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id]);

  return (
    <>
      <div className="photo-thumb">
        {url && <img src={url} onClick={() => setShowLightbox(true)} alt="" />}
        <button className="del-btn" onClick={() => onDelete(photo.id)} title="삭제">
          ✕
        </button>
      </div>
      {showLightbox && url && (
        <div className="lightbox" onClick={() => setShowLightbox(false)}>
          <img src={url} alt="" />
        </div>
      )}
    </>
  );
}

export default function PlaceDetailPanel({ address, label, onClose, onChanged }) {
  const [memo, setMemo] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getPlace(address).then((place) => {
      if (!active) return;
      setMemo(place.memo || "");
      setPhotos(place.photos || []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [address]);

  function handleMemoChange(e) {
    const value = e.target.value;
    setMemo(value);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.updateMemo(address, value);
      onChanged();
    }, 400);
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    e.target.value = "";
    for (const file of files) {
      const photo = await api.uploadPhoto(address, file);
      setPhotos((prev) => [...prev, photo]);
    }
    onChanged();
  }

  async function handleDeletePhoto(id) {
    await api.deletePhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    onChanged();
  }

  return (
    <div className="card">
      <div className="detail-header">
        <h2>📍 장소 상세</h2>
        <button className="secondary" onClick={onClose}>
          ✕ 닫기
        </button>
      </div>
      <div className="detail-title">{label || "(이름 없음)"}</div>
      <div className="hint detail-address">{address}</div>

      <label className="hint">메모</label>
      <textarea
        rows="4"
        placeholder="현장 메모를 입력하세요"
        value={memo}
        onChange={handleMemoChange}
        disabled={loading}
      />

      <label className="hint">현장 사진</label>
      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} disabled={loading} />
      <div className="photo-grid">
        {photos.map((p) => (
          <PhotoThumb key={p.id} photo={p} onDelete={handleDeletePhoto} />
        ))}
      </div>

      <div className="hint" style={{ marginTop: 8 }}>
        모바일에서는 촬영 또는 갤러리에서 선택할 수 있습니다. 메모와 사진은 서버에 저장되어 어느 기기에서나 동일하게 보입니다.
      </div>
    </div>
  );
}
