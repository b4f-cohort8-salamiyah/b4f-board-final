import { ImageResponse } from 'next/og';

// Next.js App Router icon convention - generates favicon.ico/icon.png at
// build/request time from JSX, so no binary asset needs to live in the repo.
// Simple brand treatment per the Phase A audit (§6): a single bold "B" mark,
// not a logo system - this is a teaching preview, not a branding exercise.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb',
          borderRadius: 7,
          color: 'white',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        B
      </div>
    ),
    { ...size },
  );
}
