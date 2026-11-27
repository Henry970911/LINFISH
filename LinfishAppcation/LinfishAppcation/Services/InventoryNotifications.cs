using System.Collections.Concurrent;
using System.Threading.Channels;

namespace LinfishAppcation.Services;

// 2026-11-27：付款交易完成後通知連線中的前後台重新讀取庫存。
public sealed class InventoryNotifications
{
    private readonly ConcurrentDictionary<Guid, Channel<byte>> subscribers = new();
    public (Guid Id, ChannelReader<byte> Reader) Subscribe()
    {
        var id = Guid.NewGuid();
        var channel = Channel.CreateBounded<byte>(new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });
        subscribers[id] = channel;
        return (id, channel.Reader);
    }
    public void Unsubscribe(Guid id) { if (subscribers.TryRemove(id, out var channel)) channel.Writer.TryComplete(); }
    public void Publish() { foreach (var channel in subscribers.Values) channel.Writer.TryWrite(1); }
}
