namespace Infrastructure.Csv;

/// <summary>
/// A CSV-shaped table of <typeparamref name="T"/> rows. Two implementations
/// exist — <see cref="LocalFileCsvTableStore{T}"/> for local dev and
/// <see cref="GitHubGistCsvTableStore{T}"/> for production, where Render's
/// free tier wipes local disk on every restart — chosen by config, never by
/// anything above Infrastructure.
/// </summary>
public interface ICsvTableStore<T>
{
    Task<IReadOnlyList<T>> ReadAllAsync();

    Task WriteAllAsync(IEnumerable<T> records);
}
