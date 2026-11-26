import { describe, expect, it } from 'vitest';
import { youtubeVideoId } from './product-detail.page';

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
