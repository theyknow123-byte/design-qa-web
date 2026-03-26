export default function BookmarkletPage() {
  const bookmarkletCode = `javascript:void(function(){var badge=document.createElement('div');badge.textContent='⏳ CSS + 스크린샷 추출 중...';badge.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:%231a1a1a;color:%23fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:999999;font-family:-apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);';document.body.appendChild(badge);var results=[];var all=document.querySelectorAll('*');for(var i=0;i<all.length;i++){var el=all[i];var direct='';var kids=el.childNodes;for(var j=0;j<kids.length;j++){if(kids[j].nodeType===3)direct+=kids[j].textContent.trim();}if(direct.length<2||direct.length>200)continue;var s=window.getComputedStyle(el);var rect=el.getBoundingClientRect();if(rect.width===0||rect.height===0)continue;results.push({text:direct,fontSize:parseFloat(s.fontSize),fontWeight:s.fontWeight,color:s.color,lineHeight:s.lineHeight==='normal'?null:parseFloat(s.lineHeight),letterSpacing:parseFloat(s.letterSpacing)||0,x:Math.round(rect.x),y:Math.round(rect.y),w:Math.round(rect.width),h:Math.round(rect.height)});}var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';sc.onload=function(){html2canvas(document.body,{useCORS:true,scale:1,height:window.innerHeight,windowHeight:window.innerHeight}).then(function(canvas){var img=canvas.toDataURL('image/jpeg',0.7);var data=JSON.stringify({css:results,screenshot:img,viewport:{w:window.innerWidth,h:window.innerHeight}});navigator.clipboard.writeText(data).then(function(){badge.textContent='✅ '+results.length+'개 요소 + 스크린샷 복사!';setTimeout(function(){badge.remove();},3000);});}).catch(function(){var data=JSON.stringify({css:results,screenshot:null,viewport:{w:window.innerWidth,h:window.innerHeight}});navigator.clipboard.writeText(data);badge.textContent='✅ '+results.length+'개 요소 복사 (스크린샷 실패)';setTimeout(function(){badge.remove();},3000);});};sc.onerror=function(){var data=JSON.stringify({css:results,screenshot:null});navigator.clipboard.writeText(data);badge.textContent='✅ '+results.length+'개 복사됨';setTimeout(function(){badge.remove();},3000);};document.head.appendChild(sc);})()`;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-4 block">← 돌아가기</a>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">📋 북마클릿 설치</h1>
        <p className="text-gray-500 mb-8">데모 페이지의 CSS + 스크린샷을 자동 추출합니다</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Step 1. 북마크바로 드래그</h2>
          <p className="text-sm text-gray-500 mb-4">아래 버튼을 브라우저 북마크바로 끌어다 놓으세요</p>
          <a
            href={bookmarkletCode}
            onClick={(e) => e.preventDefault()}
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg cursor-grab hover:bg-blue-700"
          >
            📋 CSS + 스크린샷 추출
          </a>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Step 2. 데모 페이지에서 클릭</h2>
          <p className="text-sm text-gray-500">
            QA할 데모 페이지를 열고 북마크바의 버튼을 클릭하세요.<br />
            CSS 데이터 + 스크린샷이 클립보드에 자동 복사됩니다.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">Step 3. Design QA에 붙여넣기</h2>
          <p className="text-sm text-gray-500">
            <a href="/" className="text-blue-600 underline">메인 페이지</a>에서 디자인 시안 업로드 + Ctrl+V → QA 실행!
          </p>
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          💡 북마크바가 안 보이면: <strong>Cmd+Shift+B</strong> (Mac) / <strong>Ctrl+Shift+B</strong> (Windows)
        </div>
      </div>
    </div>
  );
}
