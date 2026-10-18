/** StaffSync logo mark: two overlapping squares, one solid, one faded (people in sync). */
export default function BrandMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--accent)" />
      <rect x="7" y="7" width="12" height="12" rx="4" fill="#fff" fillOpacity="0.95" />
      <rect x="13" y="13" width="12" height="12" rx="4" fill="#fff" fillOpacity="0.45" />
    </svg>
  );
}