"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface DemoCssItem {
  text: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  lineHeight: number | null;
  letterSpacing: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Issue {
  id: number;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  demoX: number;
  demoY: number;
  demoW: number;
  demoH: number;
}

interface ReportData {
  designImage: string;
  demoScreenshot: string | null;
  demoViewport: { w: number; h: number } | null;
  demoCss: DemoCssItem[];
  createdAt: string;
}

function cssColorToHex(c: string): string {
  const m = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return c.toLowerCase().replace(/\s/g, "");
  const h = (n: string) => parseInt(n).toString(16).padStart(2, "0");
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

const SEVERITY_LABEL = { high: "🔴 높음", medium: "🟡 중간", low: "⚪ 낮음" };
const SEVERITY_COLOR = { high: "#ef4444", medium: "#f59e0b", low: "#9ca3af" };

function ReportContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [report, setReport] = useState<ReportData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [hoveredIssue, setHoveredIssue] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const raw = localStorage.getItem(`qa-report-${id}`);
    if (!raw) return;
    const data: ReportData = JSON.parse(raw);
    setReport(data);

    // 간단 비교: 데모 CSS 내에서 일반적인 이슈 패턴 감지
    // (Figma 스펙 없이도 데모 자체의 일관성 체크)
    const found: Issue[] = [];
    let idx = 0;
    const css = data.demoCss;

    // 같은 텍스트가 다른 스타일을 가진 경우 감지
    const textMap = new Map<string, DemoCssItem[]>();
    for (const item of css) {
      const key = item.text.trim();
      if (!textMap.has(key)) textMap.set(key, []);
      textMap.get(key)!.push(item);
    }

    // 폰트 크기 불일치 감지 (동일 텍스트, 다른 크기)
    for (const [text, items] of textMap) {
      if (items.length < 2) continue;
      const sizes = new Set(items.map(i => i.fontSize));
      if (sizes.size > 1) {
        found.push({
          id: idx++,
          title: `"${text.slice(0, 15)}": 폰트 크기 불일치`,
          description: `같은 텍스트에 ${[...sizes].join("px, ")}px 혼용`,
          severity: "medium",
          demoX: items[0].x, demoY: items[0].y,
          demoW: items[0].w, demoH: items[0].h,
        });
      }
    }

    // 모든 데모 요소를 이슈 목록에 추가 (스펙 비교용 참고 데이터)
    setIssues(found);
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!report) return (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      리포트를 찾을 수 없어요
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <a href="/" className="text-lg font-bold text-gray-900">🔍 Design QA</a>
          <span className="text-xs text-gray-400">
            {new Date(report.createdAt).toLocaleDateString("ko")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            {issues.length}개 이슈
          </span>
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
          >
            {copied ? "✅ 복사됨!" : "🔗 링크 복사"}
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">

        {/* 좌측: 디자인 시안 */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-gray-100">
          <div className="px-4 py-2 bg-white border-b border-gray-200 text-sm font-semibold text-gray-700">
            📐 디자인 시안
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            <img
              src={report.designImage}
              alt="design"
              className="max-w-full shadow-lg rounded-lg"
            />
          </div>
        </div>

        {/* 우측: 데모 구현 */}
        <div className="flex-1 flex flex-col bg-gray-100">
          <div className="px-4 py-2 bg-white border-b border-gray-200 text-sm font-semibold text-gray-700">
            🖥️ 데모 구현 {issues.length > 0 && <span className="text-red-500 ml-1">({issues.length}개 이슈)</span>}
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            {report.demoScreenshot ? (
              <div className="relative inline-block">
                <img
                  src={report.demoScreenshot}
                  alt="demo"
                  className="max-w-full shadow-lg rounded-lg"
                />
                {/* 이슈 오버레이 */}
                {issues.map((issue) => {
                  const color = SEVERITY_COLOR[issue.severity];
                  return (
                    <div
                      key={issue.id}
                      className="absolute cursor-pointer transition-all"
                      style={{
                        left: issue.demoX,
                        top: issue.demoY,
                        width: issue.demoW,
                        height: issue.demoH,
                        border: `2px solid ${color}`,
                        backgroundColor: hoveredIssue === issue.id ? `${color}22` : `${color}11`,
                        borderRadius: 3,
                        zIndex: hoveredIssue === issue.id ? 10 : 1,
                      }}
                      onMouseEnter={() => setHoveredIssue(issue.id)}
                      onMouseLeave={() => setHoveredIssue(null)}
                    >
                      <span
                        className="absolute -top-5 left-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: color }}
                      >
                        #{issue.id + 1}
                      </span>
                      {hoveredIssue === issue.id && (
                        <div className="absolute top-full left-0 mt-1 bg-gray-900 text-white text-xs p-2 rounded-lg shadow-lg max-w-[200px] z-20">
                          <div className="font-bold mb-1">{issue.title}</div>
                          <div className="opacity-80">{issue.description}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-20">
                스크린샷이 없어요<br />
                <span className="text-xs">북마클릿에서 스크린샷 포함 버전을 사용해주세요</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단: 이슈 목록 */}
      {issues.length > 0 && (
        <div className="h-48 bg-white border-t border-gray-200 overflow-auto">
          <div className="px-6 py-3">
            <h3 className="text-sm font-bold text-gray-700 mb-2">이슈 목록</h3>
            <div className="flex flex-wrap gap-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${hoveredIssue === issue.id ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  style={{ borderLeftColor: SEVERITY_COLOR[issue.severity], borderLeftWidth: 3 }}
                  onMouseEnter={() => setHoveredIssue(issue.id)}
                  onMouseLeave={() => setHoveredIssue(null)}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-800">#{issue.id + 1} {issue.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{issue.description}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{SEVERITY_LABEL[issue.severity]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">로딩 중...</div>}>
      <ReportContent />
    </Suspense>
  );
}
