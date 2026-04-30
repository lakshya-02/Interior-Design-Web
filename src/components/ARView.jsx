import Layout3D from './Layout3D.jsx';

export default function ARView({ rooms, styleState, active, onActivate }) {
  return (
    <section className="panel ar-panel" id="ar-view">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AR layout preview</p>
          <h2>Simple AR Preview</h2>
        </div>
        <button className="secondary-button" type="button" onClick={onActivate} disabled={active}>
          {active ? 'Preview active' : 'Start preview'}
        </button>
      </div>

      <div className="ar-stage">
        <div className="camera-fallback">Camera disabled for stability. This is a safe AR simulation view.</div>
        <div className="ar-reticle">
          <span />
          <strong>Generated layout</strong>
        </div>
        {active && (
          <div className="ar-model ar-model--simple">
            <Layout3D rooms={rooms} styleState={styleState} />
          </div>
        )}
      </div>

      <div className="ar-copy">This simple mode avoids camera and MindAR runtime loading so the demo stays responsive.</div>
    </section>
  );
}
