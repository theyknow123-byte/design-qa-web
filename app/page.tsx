"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [designImage, setDesignImage] = useState<string | null>(null);
  const [demoData, setDemoData] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDesignImage(reader.result as string);
      setStep(2);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDemoData(e.target.value);
  };

  const handleRun = async () => {
    if (!designImage || !demoData) return;
    setLoading(true);

    try {
      const parsed = JSON.parse(demoData);
      const css = Array.isArray(parsed) ? parsed : parsed.css;
      const screenshot = Array.isArray(parsed) ? null : parsed.screenshot;
      const viewport = Array.isArray(parsed) ? null : parsed.viewport;

      // 리포트 데이터를 localStorage에 저장
      const reportId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const reportData = {
        designImage,
        demoScreenshot: screenshot,
        demoViewport: viewport,
        demoCss: css,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(`qa-report-${reportId}`, JSON.stringify(reportData));
      router.push(`/report?id=${reportId}`);
    } catch {
      alert("데이터 형식이 올바르지 않아요. 북마클릿으로 추출한 데이터를 붙여넣어주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Design QA</h1>
          <p className="text-gray-500">디자인과 구현을 비교하고, 링크로 공유하세요</p>
        </div>

        {/* Step 1: 디자인 업로드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>1</span>
            <h2 className="font-semibold text-gray-900">디자인 시안 업로드</h2>
          </div>
          {designImage ? (
            <div className="relative">
              <img src={designImage} alt="design" className="w-full rounded-lg border border-gray-200 max-h-48 object-contain bg-gray-50" />
              <button onClick={() => { setDesignImage(null); setStep(1); }} className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">변경</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
              <span className="text-2xl mb-1">📎</span>
              <span className="text-sm text-gray-500">Figma에서 프레임 캡처해서 업로드</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG 지원</span>
              <input type="file" accept="image/*" onChange={handleDesignUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Step 2: 데모 데이터 */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4 transition-opacity ${step >= 2 ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>2</span>
            <h2 className="font-semibold text-gray-900">데모 데이터 붙여넣기</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            데모 페이지에서 <a href="/bookmarklet" className="text-blue-600 underline" target="_blank">북마클릿</a>을 클릭한 후 여기에 Ctrl+V
          </p>
          <textarea
            value={demoData}
            onChange={handlePaste}
            placeholder="북마클릿 데이터를 여기에 붙여넣기..."
            className="w-full h-24 border border-gray-300 rounded-lg p-3 text-xs font-mono resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          {demoData && (
            <p className="text-xs text-green-600 mt-2">
              ✅ {(() => { try { const p = JSON.parse(demoData); return Array.isArray(p) ? p.length : p.css?.length || 0; } catch { return 0; } })()}개 요소 감지됨
            </p>
          )}
        </div>

        {/* Step 3: 실행 */}
        <button
          onClick={handleRun}
          disabled={!designImage || !demoData || loading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "⏳ 분석 중..." : "🚀 QA 실행"}
        </button>
      </div>
    </div>
  );
}
