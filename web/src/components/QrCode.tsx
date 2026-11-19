"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: "#1b1714", light: "#ffffff" } }).then(setSrc);
  }, [value, size]);

  return (
    <div className="rounded-3xl border border-line bg-white p-3" style={{ width: size + 26, height: size + 26 }}>
      {src && <img src={src} alt="QR code" width={size} height={size} />}
    </div>
  );
}
