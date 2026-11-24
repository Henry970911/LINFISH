import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="not-found">
    <span>404</span>
    <div>🐟</div>
    <h1>這條魚游到別的地方了</h1>
    <p>你找的頁面不存在，或是已經被移動。</p>
    <a class="btn btn--dark" routerLink="/">回到首頁</a>
  </section>`,
})
export class NotFoundPageComponent {}
