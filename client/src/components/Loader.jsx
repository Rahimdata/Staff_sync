/**
 * Spinner. Use `fullscreen` while the app decides whether you are signed in.
 * @param {{ fullscreen?: boolean, label?: string, size?: number }} props
 */
export default function Loader({ fullscreen = false, label = 'Loading', size = 28 }) {
  const spinner = (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader__ring" style={{ width: size, height: size }} />
      <span className="sr-only">{label}</span>
    </div>
  );
  return fullscreen ? <div className="loader-screen">{spinner}</div> : spinner;
}