import { describe, expect, it } from 'vitest';
import { ProductDetailPageComponent, youtubeVideoId } from './product-detail.page';

describe('商品規格顯示', () => {
  it('合併舊型號欄位並選到正確的商品規格', () => {
    const page = Object.create(ProductDetailPageComponent.prototype) as ProductDetailPageComponent;
    Object.assign(page, { product: () => ({ skus: [{ id: 1, attributes: { singleHole: 1000 } }, { id: 2, attributes: { doubleHole: 3500 } }] }), selectedAttributes: { modelChoice: 'doubleHole|3500' } });
    expect(page.attributeKeys()).toEqual(['modelChoice']);
    expect(page.attributeValues('modelChoice').map(v => page.attributeValue('modelChoice', v))).toEqual(['1000型', '3500型']);
    expect(page.matchingSkus().map(s => s.id)).toEqual([2]);
  });
  it('合併公克與公斤選項，保留原本規格', () => {
    const page = Object.create(ProductDetailPageComponent.prototype) as ProductDetailPageComponent;
    Object.assign(page, { product: () => ({ skus: [{ id: 1, attributes: { g: 50 } }, { id: 2, attributes: { kg: 1 } }] }), selectedAttributes: { weightChoice: 'kg|1' } });
    expect(page.attributeKeys()).toEqual(['weightChoice']);
    expect(page.attributeValues('weightChoice').map(v => page.attributeValue('weightChoice', v))).toEqual(['50g', '1kg']);
    expect(page.matchingSkus().map(s => s.id)).toEqual([2]);
  });
});

describe('商品影片連結', () => {
  it('辨識 YouTube 分享、觀看及短影片網址', () => {
    expect(youtubeVideoId('https://youtu.be/wxGvbY3i5ck')).toBe('wxGvbY3i5ck');
    expect(youtubeVideoId('https://www.youtube.com/watch?v=wxGvbY3i5ck&t=2')).toBe('wxGvbY3i5ck');
    expect(youtubeVideoId('https://youtube.com/shorts/wxGvbY3i5ck')).toBe('wxGvbY3i5ck');
  });
  it('拒絕非 YouTube 網址及無效影片編號', () => {
    expect(youtubeVideoId('https://youtube.com.example.com/watch?v=wxGvbY3i5ck')).toBeNull();
    expect(youtubeVideoId('http://youtu.be/wxGvbY3i5ck')).toBeNull();
    expect(youtubeVideoId('https://youtu.be/invalid')).toBeNull();
  });
});
