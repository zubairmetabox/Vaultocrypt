export function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Unknown browser";
  let os = "Unknown OS";

  if (/Edg\//.test(ua)) browser = "Microsoft Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/MSIE|Trident/.test(ua)) browser = "Internet Explorer";

  if (/iPhone/.test(ua)) os = "iOS (iPhone)";
  else if (/iPad/.test(ua)) os = "iOS (iPad)";
  else if (/Android/.test(ua)) {
    const m = ua.match(/Android ([\d.]+)/);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/Windows NT/.test(ua)) {
    const v: Record<string, string> = {
      "10.0": "Windows 10/11", "6.3": "Windows 8.1",
      "6.2": "Windows 8",     "6.1": "Windows 7",
    };
    const m = ua.match(/Windows NT ([\d.]+)/);
    os = m ? (v[m[1]] ?? `Windows NT ${m[1]}`) : "Windows";
  } else if (/Macintosh/.test(ua)) {
    const m = ua.match(/Mac OS X ([\d_]+)/);
    os = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  return { browser, os };
}
