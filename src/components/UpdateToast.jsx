import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAUpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) { /* console.log('SW registered:', swUrl); */ },
    onRegisterError(err) { console.error('SW registration error:', err); },
  });

  const close = () => { setOfflineReady(false); setNeedRefresh(false); };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="pwa-toast" role="status" aria-live="polite">
      <div className="pwa-toast__msg">
        {needRefresh ? '새 버전이 준비됐어요.' : '오프라인에서도 사용할 수 있어요.'}
      </div>
      <div className="pwa-toast__actions">
        {needRefresh && (
          <button className="pwa-btn" onClick={() => updateServiceWorker(true)}>
            업데이트
          </button>
        )}
        <button className="pwa-btn pwa-btn--ghost" onClick={close}>닫기</button>
      </div>
    </div>
  );
}