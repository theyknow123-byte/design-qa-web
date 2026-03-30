"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function parseFigmaUrl(url: string) {
  // https://www.figma.com/design/{fileKey}/{name}?node-id={nodeId}
  const fileMatch = url.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
  const nodeMatch = url.match(/node-id=([^&]+)/);
  if (!fileMatch) return null;
  return {
    fileKey: fileMatch[1],
    nodeId: nodeMatch ? nodeMatch[1].replace("-", ":") : null,
  };
}

interface FigmaTextSpec {
  id: string;
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number | null;
  fontWeight: number | null;
  color: string | null;
  lineHeight: number | null;
}

function figmaColorToHex(fills: any[]): string | null {
  if (!fills || fills.length === 0) return null;
  const fill = fills[0];
  if (fill.type !== "SOLID") return null;
  const r = Math.round(fill.color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(fill.color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(fill.color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function extractTextNodes(node: any, rootX: number, rootY: number, specs: FigmaTextSpec[]) {
  if (!node.visible && node.visible !== undefined) return;

  if (node.type === "TEXT") {
    const ax = node.absoluteBoundingBox?.x ?? 0;
    const ay = node.absoluteBoundingBox?.y ?? 0;
    const style = node.style || {};
    specs.push({
      id: node.id,
      name: node.name,
      text: node.characters || "",
      x: ax - rootX,
      y: ay - rootY,
      width: node.absoluteBoundingBox?.width ?? 0,
      height: node.absoluteBoundingBox?.height ?? 0,
      fontSize: style.fontSize ?? null,
      fontWeight: style.fontWeight ?? null,
      color: figmaColorToHex(node.fills),
      lineHeight: style.lineHeightPx ?? null,
    });
  }

  if (node.children) {
    for (const child of node.children) {
      extractTextNodes(child, rootX, rootY, specs);
    }
  }
}

function cssColorToHex(c: string): string {
  const m = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return c.toLowerCase().replace(/\s/g, "");
  const h = (n: string) => parseInt(n).toString(16).padStart(2, "0");
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

export default function Home() {
  const router = useRouter();
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaToken, setFigmaToken] = useState("");
  const [demoData, setDemoData] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("figma-token");
    if (saved) setFigmaToken(saved);
  }, []);

  const handleRun = async () => {
    if (!figmaUrl || !demoData || !figmaToken) return;
    setLoading(true);

    try {
      // 1. Figma URL 파싱
      const parsed = parseFigmaUrl(figmaUrl);
      if (!parsed) { setStatus("❌ 올바른 Figma 링크가 아니에요"); setLoading(false); return; }

      localStorage.setItem("figma-token", figmaToken);

      // 2. Figma API: 노드 상세 정보
      setStatus("📋 Figma 스펙 추출 중...");
      const nodeRes = await fetch(
        `https://api.figma.com/v1/files/${parsed.fileKey}/nodes?ids=${parsed.nodeId}`,
        { headers: { "X-Figma-Token": figmaToken } }
      );
      if (!nodeRes.ok) { setStatus("❌ Figma API 오류: " + nodeRes.status); setLoading(false); return; }
      const nodeData = await nodeRes.json();
      const nodeDoc = nodeData.nodes[parsed.nodeId!]?.document;
      if (!nodeDoc) { setStatus("❌ 노드를 찾을 수 없어요"); setLoading(false); return; }

      const rootX = nodeDoc.absoluteBoundingBox?.x ?? 0;
      const rootY = nodeDoc.absoluteBoundingBox?.y ?? 0;
      const figmaSpecs: FigmaTextSpec[] = [];
      extractTextNodes(nodeDoc, rootX, rootY, figmaSpecs);
      setStatus(`✅ Figma: ${figmaSpecs.length}개 텍스트 노드`);

      // 3. Figma API: 썸네일 이미지
      setStatus("🖼️ Figma 썸네일 가져오는 중...");
      const imgRes = await fetch(
        `https://api.figma.com/v1/images/${parsed.fileKey}?ids=${parsed.nodeId}&format=png&scale=2`,
        { headers: { "X-Figma-Token": figmaToken } }
      );
      const imgData = await imgRes.json();
      const figmaImageUrl = imgData.images?.[parsed.nodeId!] || null;

      // 4. 데모 데이터 파싱
      const demoParsed = JSON.parse(demoData);
      const demoCss = Array.isArray(demoParsed) ? demoParsed : demoParsed.css;
      const demoScreenshot = Array.isArray(demoParsed) ? null : demoParsed.screenshot;
      const demoViewport = Array.isArray(demoParsed) ? null : demoParsed.viewport;

      // 5. 비교
      setStatus("🔍 비교 중...");
      interface Issue {
        id: number;
        title: string;
        description: string;
        severity: "high" | "medium" | "low";
        figmaX: number;
        figmaY: number;
        figmaW: number;
        figmaH: number;
        demoX: number;
        demoY: number;
        demoW: number;
        demoH: number;
      }
      const issues: Issue[] = [];
      let idx = 0;

      for (const spec of figmaSpecs) {
        if (!spec.text || spec.text.trim().length < 2) continue;
        const match = demoCss.find((d: any) => d.text?.trim() === spec.text.trim());
        if (!match) continue;

        // 폰트 크기
        if (spec.fontSize !== null && match.fontSize !== null) {
          const diff = Math.abs(spec.fontSize - match.fontSize);
          if (diff > 1) {
            issues.push({
              id: idx++,
              title: `${spec.name}: 폰트 크기`,
              description: `Figma: ${spec.fontSize}px → 데모: ${match.fontSize}px (${diff.toFixed(0)}px 차이)`,
              severity: "high",
              figmaX: spec.x, figmaY: spec.y, figmaW: spec.width, figmaH: spec.height,
              demoX: match.x, demoY: match.y, demoW: match.w, demoH: match.h,
            });
          }
        }

        // 폰트 굵기
        if (spec.fontWeight !== null && match.fontWeight) {
          const demoFw = parseFloat(match.fontWeight);
          if (Math.abs(spec.fontWeight - demoFw) > 50) {
            issues.push({
              id: idx++,
              title: `${spec.name}: 폰트 굵기`,
              description: `Figma: ${spec.fontWeight} → 데모: ${demoFw}`,
              severity: "medium",
              figmaX: spec.x, figmaY: spec.y, figmaW: spec.width, figmaH: spec.height,
              demoX: match.x, demoY: match.y, demoW: match.w, demoH: match.h,
            });
          }
        }

        // 색상
        if (spec.color && match.color) {
          const demoHex = cssColorToHex(match.color);
          if (spec.color.toLowerCase() !== demoHex.toLowerCase()) {
            issues.push({
              id: idx++,
              title: `${spec.name}: 텍스트 색상`,
              description: `Figma: ${spec.color} → 데모: ${demoHex}`,
              severity: "high",
              figmaX: spec.x, figmaY: spec.y, figmaW: spec.width, figmaH: spec.height,
              demoX: match.x, demoY: match.y, demoW: match.w, demoH: match.h,
            });
          }
        }

        // 줄간격
        if (spec.lineHeight !== null && match.lineHeight !== null) {
          const diff = Math.abs(spec.lineHeight - match.lineHeight);
          if (diff > 1) {
            issues.push({
              id: idx++,
              title: `${spec.name}: 줄간격`,
              description: `Figma: ${spec.lineHeight.toFixed(1)}px → 데모: ${match.lineHeight}px`,
              severity: "medium",
              figmaX: spec.x, figmaY: spec.y, figmaW: spec.width, figmaH: spec.height,
              demoX: match.x, demoY: match.y, demoW: match.w, demoH: match.h,
            });
          }
        }
      }

      // 6. 리포트 저장
      const reportId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      localStorage.setItem(`qa-report-${reportId}`, JSON.stringify({
        figmaImageUrl,
        figmaSpecs,
        demoScreenshot,
        demoViewport,
        demoCss,
        issues,
        createdAt: new Date().toISOString(),
        frameWidth: nodeDoc.absoluteBoundingBox?.width ?? 390,
        frameHeight: nodeDoc.absoluteBoundingBox?.height ?? 844,
      }));

      setStatus(`✅ ${issues.length}개 이슈 발견! 리포트로 이동...`);
      router.push(`/report?id=${reportId}`);

    } catch (err: any) {
      setStatus("❌ " + (err.message || "알 수 없는 오류"));
    } finally {
      setLoading(false);
    }
  };

  const demoCount = (() => {
    try { const p = JSON.parse(demoData); return Array.isArray(p) ? p.length : p.css?.length || 0; } catch { return 0; }
  })();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Design QA</h1>
          <p className="text-gray-500">디자인과 구현을 자동 비교하고, 링크로 공유하세요</p>
        </div>

        {/* Figma 링크 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white">1</span>
            <h2 className="font-semibold text-gray-900">Figma 링크</h2>
          </div>
          <input
            value={figmaUrl}
            onChange={e => setFigmaUrl(e.target.value)}
            placeholder="https://www.figma.com/design/... (프레임 선택 후 링크 복사)"
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mb-3"
          />
          <div className="flex items-center gap-2">
            <input
              type={showToken ? "text" : "password"}
              value={figmaToken}
              onChange={e => setFigmaToken(e.target.value)}
              placeholder="Figma API Token (figd_...)"
              className="flex-1 border border-gray-300 rounded-lg p-2 text-xs focus:border-blue-500 outline-none"
            />
            <button onClick={() => setShowToken(!showToken)} className="text-xs text-gray-400 hover:text-gray-600">
              {showToken ? "숨기기" : "보기"}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Figma → Settings → Security → Personal Access Token 발급
          </p>
        </div>

        {/* 데모 데이터 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white">2</span>
            <h2 className="font-semibold text-gray-900">데모 데이터</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            데모 페이지에서 <a href="/bookmarklet" className="text-blue-600 underline" target="_blank">북마클릿</a>을 클릭 → 여기에 Ctrl+V
          </p>
          <textarea
            value={demoData}
            onChange={e => setDemoData(e.target.value)}
            placeholder="북마클릿 데이터를 여기에 붙여넣기..."
            className="w-full h-24 border border-gray-300 rounded-lg p-3 text-xs font-mono resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          {demoCount > 0 && (
            <p className="text-xs text-green-600 mt-2">✅ {demoCount}개 요소 감지됨</p>
          )}
        </div>

        {/* 상태 메시지 */}
        {status && (
          <div className={`text-sm mb-3 px-4 py-2 rounded-lg ${status.startsWith("❌") ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
            {status}
          </div>
        )}

        {/* 실행 버튼 */}
        <button
          onClick={handleRun}
          disabled={!figmaUrl || !demoData || !figmaToken || loading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "⏳ 분석 중..." : "🚀 QA 실행"}
        </button>
      </div>
    </div>
  );
}
