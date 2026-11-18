import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-info-page',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="page-hero page-hero--info"><div class="container"><div><span class="eyebrow">{{ eyebrow }}</span><h1>{{ title }}</h1><p>{{ intro }}</p></div><span class="info-symbol">{{ symbol }}</span></div></section><section class="section"><div class="container info-layout"><aside><b>資訊導覽</b><a routerLink="/info/about">關於 LINFISH</a><a routerLink="/info/shipping">付款與配送</a><a routerLink="/info/returns">到貨與售後</a><a routerLink="/info/vip">會員權益</a><a routerLink="/contact">聯絡我們</a></aside><article class="prose">@if (kind === 'about') { <h2>讓每個人都能安心開始水族生活</h2><p>LINFISH 是為水族零售品牌準備的示範商城。我們把複雜的飼養資訊整理得清楚、可理解，讓選購不再只靠運氣。</p><blockquote>好的水族店，不只是把商品放上架，而是把「適不適合」說清楚。</blockquote><h3>我們在意的三件事</h3><div class="value-grid"><div><span>01</span><b>透明</b><p>尺寸、難度、庫存與照護條件清楚呈現。</p></div><div><span>02</span><b>穩定</b><p>經過觀察再上架，依季節安排出貨。</p></div><div><span>03</span><b>陪伴</b><p>到貨不是結束，有問題都能找到人。</p></div></div> } @else if (kind === 'shipping') { <h2>付款與配送方式</h2><p>以下內容為前端展示文字，正式營運前需依實際物流、金流與活體配送政策確認。</p><h3>配送時程</h3><ol><li><b>一般用品</b><span>付款確認後 1–3 個工作天寄出。</span></li><li><b>活體商品</b><span>固定每週三、六出貨，遇極端氣候將延後。</span></li><li><b>合併訂單</b><span>活體與用品可能依包裝需求分箱寄送。</span></li></ol><h3>付款方式</h3><p>第一階段可提供 ATM 虛擬帳號；正式串接後再加入信用卡與第三方支付。</p> } @else if (kind === 'returns') { <h2>到貨檢查與售後協助</h2><p>收到包裹後請先確認外箱與袋內狀況，活體商品請勿立即拆袋入缸。</p><ol><li><b>拍攝開箱</b><span>從未拆封外箱開始連續錄影。</span></li><li><b>聯絡客服</b><span>發現異常請在到貨後兩小時內提供影片與訂單編號。</span></li><li><b>保持原狀</b><span>等待客服協助判斷，再進行後續處理。</span></li></ol><div class="notice-box">活體並非一般商品，實際退換貨規範需依營業地區法規與物流條件制定。</div> } @else { <h2>會員分級與權益</h2><p>免費加入即可查看會員價格、保存訂單紀錄與收藏商品。</p><div class="tier-grid"><div><small>LEVEL 01</small><h3>一般會員</h3><p>免費加入</p><ul><li>查看會員價</li><li>訂單與收件資料</li><li>照護內容收藏</li></ul></div><div class="featured"><small>LEVEL 02</small><h3>VIP 會員</h3><p>年度消費達門檻</p><ul><li>一般會員所有權益</li><li>指定商品優先預訂</li><li>會員專屬活動</li></ul></div></div> }</article></div></section>`,
})
export class InfoPageComponent {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly kind = this.data['kind'];
  readonly title = this.data['title'];
  readonly eyebrow = this.data['eyebrow'];
  readonly intro = this.data['intro'];
  readonly symbol = this.data['symbol'];
}

