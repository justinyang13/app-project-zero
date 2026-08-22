using System.Globalization;
using CsvHelper;

namespace Infrastructure.Csv;

/// <summary>
/// Plain CSV file on local disk. Used for local dev, where the filesystem
/// is persistent across restarts.
/// </summary>
public sealed class LocalFileCsvTableStore<T> : ICsvTableStore<T>
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _writeLock = new(1, 1);

    public LocalFileCsvTableStore(string filePath)
    {
        _filePath = filePath;
    }

    public async Task<IReadOnlyList<T>> ReadAllAsync()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        using var reader = new StreamReader(_filePath);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        var records = new List<T>();
        await foreach (var record in csv.GetRecordsAsync<T>())
        {
            records.Add(record);
        }

        return records;
    }

    public async Task WriteAllAsync(IEnumerable<T> records)
    {
        await _writeLock.WaitAsync();
        try
        {
            var directory = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            await using var writer = new StreamWriter(_filePath, append: false);
            await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            await csv.WriteRecordsAsync(records);
        }
        finally
        {
            _writeLock.Release();
        }
    }
}
