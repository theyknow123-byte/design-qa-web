"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

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

interface ReportData {
  figmaImageUrl: string | null;
  demoScreenshot: string | null;
  demoViewport: { w: number; h: number } | null;
  issues: Issue[];
  createdAt: string;
  frameWidth: number;
  frameHeight: number;
}

const SEV_LABEL: Record<string, string> = { high: "🔴 높음", medium: "🟡 중간", low: "⚪ 낮음" };
const SEV_COLOR: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#9ca3af" };

function ReportContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [report, setReport] = useState<ReportData | null>(null);
  const [hoveredIssue, setHoveredIssue] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const [demoScreenshot, setDemoScreenshot] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const raw = localStorage.getItem(`qa-report-${id}`);
    if (!raw) return;
    setReport(JSON.parse(raw));
    try {
      const ss = sessionStorage.getItem(`qa-screenshot-${id}`);
      if (ss) setDemoScreenshot(ss);
    } catch {}
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

  const issues = report.issues || [];

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
          <span className="text-sm font-medium text-gray-600">{issues.length}개 이슈</span>
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

        {/* 좌측: Figma 디자인 */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-gray-100">
          <div className="px-4 py-2 bg-white border-b border-gray-200 text-sm font-semibold text-gray-700">
            📐 Figma 디자인
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            {report.figmaImageUrl ? (
              <div className="relative inline-block">
                <img src={report.figmaImageUrl} alt="figma" className="max-w-full shadow-lg rounded-lg" />
                {issues.map((issue) => {
                  const color = SEV_COLOR[issue.severity];
                  const scaleX = 1;
                  const scaleY = 1;
                  return (
                    <div
                      key={`f-${issue.id}`}
                      className="absolute cursor-pointer transition-all"
                      style={{
                        left: issue.figmaX * scaleX,
                        top: issue.figmaY * scaleY,
                        width: Math.max(issue.figmaW * scaleX, 20),
                        height: Math.max(issue.figmaH * scaleY, 12),
                        border: `2px solid ${color}`,
                        backgroundColor: hoveredIssue === issue.id ? `${color}33` : `${color}11`,
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-20">Figma 이미지 없음</div>
            )}
          </div>
        </div>

        {/* 우측: 데모 구현 */}
        <div className="flex-1 flex flex-col bg-gray-100">
          <div className="px-4 py-2 bg-white border-b border-gray-200 text-sm font-semibold text-gray-700">
            🖥️ 데모 구현 {issues.length > 0 && <span className="text-red-500 ml-1">({issues.length}개 이슈)</span>}
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            {demoScreenshot ? (
              <div className="relative inline-block">
                <img src={demoScreenshot} alt="demo" className="max-w-full shadow-lg rounded-lg" />
                {issues.map((issue) => {
                  const color = SEV_COLOR[issue.severity];
                  return (
                    <div
                      key={`d-${issue.id}`}
                      className="absolute cursor-pointer transition-all"
                      style={{
                        left: issue.demoX,
                        top: issue.demoY,
                        width: Math.max(issue.demoW, 20),
                        height: Math.max(issue.demoH, 12),
                        border: `2px solid ${color}`,
                        backgroundColor: hoveredIssue === issue.id ? `${color}33` : `${color}11`,
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
                        <div className="absolute top-full left-0 mt-1 bg-gray-900 text-white text-xs p-2 rounded-lg shadow-lg max-w-[220px] z-20 whitespace-pre-line">
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
        <div className="h-52 bg-white border-t border-gray-200 overflow-auto">
          <div className="px-6 py-3">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              이슈 목록 <span className="text-gray-400 font-normal">({issues.length})</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    hoveredIssue === issue.id ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={{ borderLeftColor: SEV_COLOR[issue.severity], borderLeftWidth: 3 }}
                  onMouseEnter={() => setHoveredIssue(issue.id)}
                  onMouseLeave={() => setHoveredIssue(null)}
                >
                  <div className="text-sm font-semibold text-gray-800">#{issue.id + 1} {issue.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{issue.description}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{SEV_LABEL[issue.severity]}</div>
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
