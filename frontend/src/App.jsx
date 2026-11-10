import { useEffect, useState } from "react";

function localNow() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function App() {
  const [animal, setAnimal] = useState("");
  const [stream, setStream] = useState("");
  const [date, setDate] = useState(localNow);
  const [observations, setObservations] = useState([]);
  const [worker, setWorker] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [obsResponse, workerResponse] = await Promise.all([
        fetch("/api/observations"), fetch("/api/worker")
      ]);
      if (!obsResponse.ok || !workerResponse.ok) throw new Error("Unable to load observations. Please try again.");
      setObservations(await obsResponse.json());
      setWorker((await workerResponse.json()).worker);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load observations.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  async function addObservation(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/observations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animal, stream, observed_at: new Date(date).toISOString() })
      });
      if (!response.ok) throw new Error("Unable to save. Check the animal, stream, and date, then try again.");
      setAnimal(""); setStream(""); setDate(localNow());
      await loadData();
      setNotice("Observation saved.");
    } catch (err) { setError(err.message || "Unable to save observation."); }
    finally { setSaving(false); }
  }

  return (
    <main className="shell">
      <header className="masthead">
        <a className="brand" href="/" aria-label="NERDS Wildlife Logger home"><span className="brand-mark" aria-hidden="true">N</span><span>NERDS <small>WILDLIFE OBSERVATORY</small></span></a>
        <a className="docs-link" href="/docs/">Documentation <span aria-hidden="true">&#8599;</span></a>
      </header>
      <section className="intro">
        <p className="eyebrow">FIELD NOTES / LIVE CAMERA OBSERVATIONS</p>
        <h1>Every sighting tells a story.</h1>
        <p>Record which animals appear in a stream, and when. Keep your observations in one shared log.</p>
      </section>
      <section className="panel entry-panel" aria-labelledby="entry-heading">
        <div className="section-heading"><span className="section-number">01</span><div><h2 id="entry-heading">Record a sighting</h2><p>A few details to remember the moment.</p></div></div>
        <form onSubmit={addObservation}>
          <label>Animal<input name="animal" placeholder="e.g. Red fox" value={animal} onChange={e => setAnimal(e.target.value)} maxLength={200} required /></label>
          <label>Camera or stream<input name="stream" placeholder="e.g. Forest clearing cam" value={stream} onChange={e => setStream(e.target.value)} maxLength={200} required /></label>
          <label>Observed at<input name="observed_at" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required /><span className="hint">Your local time</span></label>
          <button className="primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save observation"}</button>
        </form>
        {error && <p className="message error" role="alert">{error}</p>}
        {notice && <p className="message success" role="status">{notice}</p>}
      </section>
      <section className="panel log-panel" aria-labelledby="log-heading" aria-busy={loading}>
        <div className="log-header"><div className="section-heading"><span className="section-number">02</span><div><h2 id="log-heading">Observation log</h2><p>{observations.length} {observations.length === 1 ? "sighting" : "sightings"} recorded, newest first</p></div></div><div className="log-actions"><button type="button" onClick={loadData} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button><button type="button" onClick={() => window.print()}>Print log</button></div></div>
        <div className="table-scroll"><table><caption className="visually-hidden">All recorded animal sightings</caption><thead><tr><th scope="col">Animal</th><th scope="col">Camera / stream</th><th scope="col">Observed at</th></tr></thead><tbody>
          {observations.map(obs => <tr key={obs.id}><td className="animal-cell">{obs.animal}</td><td>{obs.stream}</td><td><time dateTime={obs.observed_at}>{new Date(obs.observed_at).toLocaleString()}</time></td></tr>)}
          {!observations.length && <tr><td className="empty-state" colSpan={3}>{loading ? "Loading observations..." : "The field notebook is open. Add your first sighting above."}</td></tr>}
        </tbody></table></div>
      </section>
      <footer><span>Nature Exploration by Radio and Data Streams Unlimited</span><span>{worker ? "Served by " + worker : "Connecting..."}</span></footer>
    </main>
  );
}
