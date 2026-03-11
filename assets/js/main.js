import { initApp } from './app-init.js';

initApp().catch((error) => {
  console.error(error);
  document.body.innerHTML = '<div style="padding:24px;font-family:sans-serif">앱 초기화 실패</div>';
});
