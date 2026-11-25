import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [FormsModule],
  template: `<section class="contact-page">
    <div class="container contact-grid">
      <div>
        <span class="eyebrow eyebrow--light">LET'S TALK</span>
        <h1>有問題，<br />就一起把它弄懂。</h1>
        <p>選魚、設備、訂單或到貨狀況，都可以把目前的資訊告訴我們。</p>
        <div class="contact-method">
          <span>LINE</span>
          <div><b>加入官方 LINE</b><small>線上客服與諮詢</small></div>
          <a href="https://lin.ee/lXZexVN" target="_blank" rel="noopener noreferrer">開始對話 →</a>
        </div>
        <div class="contact-method">
          <span>MAIL</span>
          <div><b>Email 客服</b><small>hello&#64;linfish.tw</small></div>
        </div>
        <div class="service-hours">
          <b>營業時間</b>
          <span>
            週一至週六早上 11:00～晚上 9:00<br />
            週日早上 11:00～晚上 6:00
          </span>
        </div>
        <div class="service-hours">
          <b>宅配時間</b>
          <span>
            週一至週五（六日訂單順延到下週一配送）<br />
            颱風天、連假停止宅配服務
          </span>
        </div>
      </div>
      <form id="contact-form" class="contact-form">
        <span class="eyebrow">CONTACT FORM</span>
        <h2>留下你的問題</h2>
        <label>
          怎麼稱呼你？
          <input name="name" placeholder="姓名" />
        </label>
        <label>
          聯絡方式
          <input name="contact" placeholder="Email 或手機" />
        </label>
        <label>
          問題類型
          <select name="type">
            <option>商品與飼養建議</option>
            <option>訂單與付款</option>
            <option>配送與到貨</option>
            <option>其他問題</option>
          </select>
        </label>
        <label>
          想詢問的內容
          <textarea
            name="message"
            rows="6"
            placeholder="如果是魚缸問題，可以附上尺寸、設備與現有魚種。"
          ></textarea>
        </label>
        <button class="btn btn--dark btn--block" type="button">送出訊息</button>
        <small>此為前端展示表單，串接 API 後才會真正送出。</small>
      </form>
    </div>
  </section>`,
})
export class ContactPageComponent {}
