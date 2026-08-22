using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CsvHelper;

namespace Infrastructure.Csv;

/// <summary>
/// Reads/writes one file inside a secret GitHub Gist via the GitHub REST
/// API, standing in for a real database on Render's free tier (which wipes
/// local disk on every restart/spin-down). Eventually-consistent and not
/// built for concurrent writes under real load — acceptable at hobby scale,
/// and cheap to replace with a real DB later since Application only ever
/// sees this through <c>ICsvTableStore&lt;T&gt;</c>.
///
/// The gist is read into an in-memory cache on first use and refreshed
/// after every write, so repeat reads within a process lifetime don't hit
/// the GitHub API.
/// </summary>
public sealed class GitHubGistCsvTableStore<T> : ICsvTableStore<T>
{
    private readonly HttpClient _httpClient;
    private readonly string _gistId;
    private readonly string _fileName;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private IReadOnlyList<T>? _cache;

    public GitHubGistCsvTableStore(HttpClient httpClient, string gistId, string fileName)
    {
        _httpClient = httpClient;
        _gistId = gistId;
        _fileName = fileName;
    }

    public async Task<IReadOnlyList<T>> ReadAllAsync()
    {
        if (_cache is not null)
        {
            return _cache;
        }

        await _lock.WaitAsync();
        try
        {
            _cache ??= await FetchFromGistAsync();
            return _cache;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task WriteAllAsync(IEnumerable<T> records)
    {
        var list = records.ToList();

        await _lock.WaitAsync();
        try
        {
            await PushToGistAsync(list);
            _cache = list;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<IReadOnlyList<T>> FetchFromGistAsync()
    {
        var gist = await _httpClient.GetFromJsonAsync<GistResponse>($"gists/{_gistId}");
        var file = gist?.Files?.GetValueOrDefault(_fileName);

        if (file?.Content is null || string.IsNullOrWhiteSpace(file.Content))
        {
            return [];
        }

        using var reader = new StringReader(file.Content);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        var records = new List<T>();
        await foreach (var record in csv.GetRecordsAsync<T>())
        {
            records.Add(record);
        }

        return records;
    }

    private async Task PushToGistAsync(IReadOnlyList<T> records)
    {
        using var writer = new StringWriter();
        using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
        {
            await csv.WriteRecordsAsync(records);
        }

        var payload = new GistUpdateRequest
        {
            Files = new Dictionary<string, GistFileContent>
            {
                [_fileName] = new GistFileContent { Content = writer.ToString() },
            },
        };

        using var response = await _httpClient.PatchAsJsonAsync($"gists/{_gistId}", payload);
        response.EnsureSuccessStatusCode();
    }

    private sealed class GistResponse
    {
        [JsonPropertyName("files")]
        public Dictionary<string, GistFileContent>? Files { get; set; }
    }

    private sealed class GistFileContent
    {
        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }

    private sealed class GistUpdateRequest
    {
        [JsonPropertyName("files")]
        public Dictionary<string, GistFileContent> Files { get; set; } = new();
    }
}
