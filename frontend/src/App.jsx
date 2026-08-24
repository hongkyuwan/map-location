import { useEffect, useState } from "react";
import { api, getToken } from "./api/client";
import LoginForm from "./components/LoginForm";
import UploadPanel from "./components/UploadPanel";
import DatasetList from "./components/DatasetList";
import EvCheckPanel from "./components/EvCheckPanel";
import MapView from "./components/MapView";
import PlaceDetailPanel from "./components/PlaceDetailPanel";

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [naverClientId, setNaverClientId] = useState("");
  const [configLoaded, setConfigLoaded] = useState(false);
  const [currentDataset, setCurrentDataset] = useState(null);
  const [notedAddresses, setNotedAddresses] = useState(new Set());
  const [selected, setSelected] = useState(null); // { address, label }
  const [globalStatus, setGlobalStatus] = useState("");
  const [datasetRefreshKey, setDatasetRefreshKey] = useState(0);

  useEffect(() => {
    if (!authed) return;
    api.getConfig().then((cfg) => {
      setNaverClientId(cfg.naverClientId);
      setConfigLoaded(true);
    });
  }, [authed]);

  async function refreshNoted(dataset) {
    if (!dataset) {
      setNotedAddresses(new Set());
      return;
    }
    const addresses = dataset.items.filter((i) => i.ok).map((i) => i.address);
    if (addresses.length === 0) {
      setNotedAddresses(new Set());
      return;
    }
    const { addresses: noted } = await api.bulkHasNotes(addresses);
    setNotedAddresses(new Set(noted));
  }

  function handleDatasetCreated(dataset) {
    setCurrentDataset(dataset);
    setSelected(null);
    refreshNoted(dataset);
    setDatasetRefreshKey((k) => k + 1);
  }

  function handleDatasetLoaded(dataset, statusMsg) {
    setCurrentDataset(dataset);
    setSelected(null);
    setGlobalStatus(statusMsg);
    refreshNoted(dataset);
  }

  function handleMarkerClick(address, label) {
    setSelected({ address, label });
  }

  function handleDetailChanged() {
    refreshNoted(currentDataset);
  }

  function handleEvChecked(updatedDataset) {
    setCurrentDataset(updatedDataset);
  }

  if (!authed) {
    return <LoginForm onLoggedIn={() => setAuthed(true)} />;
  }

  return (
    <>
      <header className="app-header">
        <h1>📍 주소 지도 표시기</h1>
      </header>
      <div className="layout">
        <div className="sidebar">
          <UploadPanel onDatasetCreated={handleDatasetCreated} />
          <DatasetList refreshKey={datasetRefreshKey} onDatasetLoaded={handleDatasetLoaded} />
          <EvCheckPanel currentDataset={currentDataset} onChecked={handleEvChecked} />
          {selected && (
            <PlaceDetailPanel
              address={selected.address}
              label={selected.label}
              onClose={() => setSelected(null)}
              onChanged={handleDetailChanged}
            />
          )}
          {globalStatus && <div className="hint">{globalStatus}</div>}
        </div>
        {configLoaded && (
          <MapView
            naverClientId={naverClientId}
            items={currentDataset ? currentDataset.items : []}
            notedAddresses={notedAddresses}
            onMarkerClick={handleMarkerClick}
          />
        )}
      </div>
    </>
  );
}
