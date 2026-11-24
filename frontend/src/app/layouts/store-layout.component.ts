import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SiteFooterComponent } from '../shared/components/site-footer.component';
import { SiteHeaderComponent } from '../shared/components/site-header.component';

@Component({
  selector: 'app-store-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, SiteFooterComponent, SiteHeaderComponent],
  template: `
    <app-site-header />
    <main><router-outlet /></main>
    <app-site-footer />
    <a class="floating-line" routerLink="/contact" aria-label="LINE 客服"
      ><b>LINE</b><span>有問題？問我們</span></a
    >
  `,
})
export class StoreLayoutComponent {}
