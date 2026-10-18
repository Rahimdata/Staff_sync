import { useEffect, useState } from 'react';

/** Live digital clock. Isolated in its own component so the per-second tick re-renders only this. */
export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [time, meridiem] = now
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    .split(' ');

  return (
    <time className="clock" dateTime={now.toISOString()}>
      <span className="clock__time">{time}</span>
      <span className="clock__meridiem">{meridiem}</span>
    </time>
  );
}