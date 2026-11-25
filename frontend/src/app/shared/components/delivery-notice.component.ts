import { Component } from '@angular/core';

@Component({
  selector: 'app-delivery-notice',
  standalone: true,
  template: `
    <section class="delivery-notice" aria-labelledby="delivery-notice-title">
      <span class="delivery-notice__eyebrow">宅配須知</span>
      <h3 id="delivery-notice-title">運送風險，魚軒負責</h3>
      <p class="delivery-notice__highlight">開箱請全程錄影！</p>
      <p>收到貨後請從未拆封外箱開始全程錄影。如無法提供開箱影片，本店將不提供賠償。</p>
      <p>
        如有任何問題，請於收到貨 <strong>一小時內</strong> 立即聯繫官方 LINE
        客服，我們將為您處理。<strong>超時自負。</strong>
      </p>
      <a href="https://lin.ee/lXZexVN" target="_blank" rel="noopener noreferrer"
        >聯繫官方 LINE 客服 →</a
      >
    </section>
  `,
  styleUrl: '../../css/shared/delivery-notice.component.scss',
})
export class DeliveryNoticeComponent {}
